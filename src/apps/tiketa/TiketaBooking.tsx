import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Booking,
  type BookingSummary,
  type Movie,
  type SeatMap as SeatMapData,
  type Showtime,
  TiketaError,
  tiketa,
  unwrap,
} from "../../api/tiketa";
import { AppShell } from "../shared/AppShell";
import { ChatPanel } from "./ChatPanel";
import { FilmRail } from "./FilmRail";
import { cinemaDay, cinemaDays, clockTime, posterAt, rupiah, whenLabel } from "./format";
import { SeatMap, SeatMapPlaceholder } from "./SeatMap";
import { useChat } from "./useChat";
import "./tiketa.css";

const MAX_SEATS = 8; // the backend's MAX_SEATS_PER_BOOKING: it refuses more either way
const SEAT_REFRESH_MS = 10_000;
const BOOKINGS_SHOWN = 6;
const NAME_KEY = "tiketa.name";

const keys = {
  movies: ["tiketa", "movies"] as const,
  showtimes: (day: string) => ["tiketa", "showtimes", day] as const,
  seats: (showtimeId: number) => ["tiketa", "seats", showtimeId] as const,
  bookings: ["tiketa", "bookings"] as const,
  usage: ["tiketa", "usage"] as const,
};

const fetchShowtimes = async (day: string) => unwrap(await tiketa.GET("/v1/showtimes", { params: { query: { day } } }));
const fetchSeats = async (showtimeId: number) =>
  unwrap(await tiketa.GET("/v1/showtimes/{showtime_id}/seats", { params: { path: { showtime_id: showtimeId } } }));

function storedName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // private window: the name is asked again next time
  }
}

const freeSeats = (map: SeatMapData) => map.rows.flatMap((row) => row.seats).filter((seat) => !seat.is_taken);

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 4h14v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V4Z" />
      <path d="M8 7h4v1.5H8zM8 11.5h4V13H8z" fill="#fff" />
    </svg>
  );
}

const SEATS_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M3.5 9V4.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V9M2.5 9h11v2.5h-11zM4 11.5V13M12 11.5V13" />
  </svg>
);

function CinemaPhoto() {
  return (
    <figure className="tk-photo">
      <img
        src="/media/tiketa-cinema-batavia-1930s.webp"
        alt="A full cinema hall in Batavia in the 1930s, the audience seated on both sides of one central aisle"
        width={1600}
        height={701}
        loading="lazy"
      />
      <figcaption>
        Bioscoop Globe or Rex, Batavia, 1930s.{" "}
        <a href="https://commons.wikimedia.org/w/index.php?curid=103672528" target="_blank" rel="noreferrer">
          KITLV 115145
        </a>
        , CC BY 4.0
      </figcaption>
    </figure>
  );
}

function Poster({ movie }: { movie: Movie }) {
  const [failed, setFailed] = useState(false);
  const source = posterAt(movie, 160);
  if (!source || failed) {
    return (
      <span className="tk-poster tk-poster-type" aria-hidden="true">
        {movie.title}
      </span>
    );
  }
  return (
    <img
      className="tk-poster"
      src={source}
      alt=""
      width={80}
      height={120}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function BookingsTable({ bookings }: { bookings: Booking[] }) {
  const [all, setAll] = useState(false);
  const fromChat = bookings.filter((booking) => booking.channel === "chat").length;
  const shown = all ? bookings : bookings.slice(0, BOOKINGS_SHOWN);
  return (
    <section className="panel tk-bookings" aria-labelledby="tk-bookings-title">
      <header>
        <h2 id="tk-bookings-title">Your bookings</h2>
        <span className="meta num">
          {bookings.length === 0
            ? "None yet"
            : `${bookings.length} latest, ${fromChat} from the chat, ${bookings.length - fromChat} from the form`}
        </span>
      </header>
      {bookings.length === 0 ? (
        <p className="empty">Bookings from the form and from the chat both land here, with their code.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Film</th>
              <th>When</th>
              <th className="num">Seats</th>
              <th className="num">Total</th>
              <th>Via</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((booking) => (
              <tr key={booking.code}>
                <td className="tk-code">{booking.code}</td>
                <td className="tk-film-cell">
                  {booking.showtime.movie_title}
                  <span>{booking.customer_name}</span>
                </td>
                <td>{whenLabel(booking.showtime.starts_at)}</td>
                <td className="num">{booking.seats.join(", ")}</td>
                <td className="num">{rupiah(booking.total_price_idr)}</td>
                <td>
                  <span className="pill">{booking.channel === "chat" ? "Chat" : "Form"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {bookings.length > BOOKINGS_SHOWN && (
        <button type="button" className="btn ghost tk-more" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${bookings.length}`}
        </button>
      )}
    </section>
  );
}

type Notice = { kind: "booked"; booking: Booking } | { kind: "refused"; text: string };

/** The booking screen: a form and a chat agent side by side, booking from one seat map. */
export function TiketaBooking() {
  const queryClient = useQueryClient();
  const days = useMemo(() => cinemaDays(), []);
  const [day, setDay] = useState(() => days[0]?.day ?? "");
  const [movieId, setMovieId] = useState<number | null>(null);
  const [showtimeId, setShowtimeId] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState(storedName);
  const [view, setView] = useState<"form" | "chat">("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [zoomed, setZoomed] = useState(false); // phones only: seats at thumb size, the room scrolls sideways
  const attempt = useRef({ signature: "", key: "" });

  const movies = useQuery({
    queryKey: keys.movies,
    queryFn: async () => unwrap(await tiketa.GET("/v1/movies")),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const showtimes = useQuery({ queryKey: keys.showtimes(day), queryFn: () => fetchShowtimes(day), staleTime: 30_000 });
  const seats = useQuery({
    queryKey: keys.seats(showtimeId ?? 0),
    queryFn: () => fetchSeats(showtimeId ?? 0),
    enabled: showtimeId !== null,
    staleTime: 5_000,
    refetchInterval: SEAT_REFRESH_MS,
  });
  const bookings = useQuery({
    queryKey: keys.bookings,
    queryFn: async () => unwrap(await tiketa.GET("/v1/bookings")),
  });
  const usage = useQuery({ queryKey: keys.usage, queryFn: async () => unwrap(await tiketa.GET("/v1/usage")) });

  const movie = movies.data?.find((candidate) => candidate.id === movieId) ?? movies.data?.[0];
  const filmShowtimes = useMemo(
    () => showtimes.data?.filter((showtime) => showtime.movie_id === movie?.id) ?? [],
    [showtimes.data, movie?.id],
  );
  const map = seats.data?.showtime.id === showtimeId ? seats.data : undefined;

  // Every day's showtimes load in the background, so switching days is instant
  useEffect(() => {
    for (const { day: other } of days.slice(1)) {
      void queryClient.prefetchQuery({
        queryKey: keys.showtimes(other),
        queryFn: () => fetchShowtimes(other),
        staleTime: 30_000,
      });
    }
  }, [days, queryClient]);

  // A film and day with showtimes always shows a seat map: the first showtime unless one is chosen
  useEffect(() => {
    if (!showtimes.data) return;
    if (!filmShowtimes.some((showtime) => showtime.id === showtimeId)) {
      setShowtimeId(filmShowtimes[0]?.id ?? null);
      setSelected([]);
    }
  }, [showtimes.data, filmShowtimes, showtimeId]);

  // Seats someone else took while they were selected here leave the selection, with a word about it
  useEffect(() => {
    if (!map || selected.length === 0) return;
    const taken = new Set(map.rows.flatMap((row) => row.seats.filter((seat) => seat.is_taken).map((seat) => seat.id)));
    const lost = selected.filter((seatId) => taken.has(seatId));
    if (lost.length === 0) return;
    setSelected(selected.filter((seatId) => !taken.has(seatId)));
    setNotice({ kind: "refused", text: `${lost.join(", ")} just went to someone else.` });
  }, [map, selected]);

  const refreshAfterBooking = useCallback(
    (booking: Booking) => {
      void queryClient.invalidateQueries({ queryKey: keys.seats(booking.showtime.id) });
      void queryClient.invalidateQueries({ queryKey: keys.showtimes(cinemaDay(booking.showtime.starts_at)) });
      void queryClient.invalidateQueries({ queryKey: keys.bookings });
    },
    [queryClient],
  );

  const showOnMap = useCallback(
    (summary: BookingSummary) => {
      if (summary.showtime_id == null) return;
      const film = movies.data?.find((candidate) => candidate.title === summary.movie_title);
      setDay(cinemaDay(summary.starts_at));
      if (film) setMovieId(film.id);
      setShowtimeId(summary.showtime_id);
      setSelected([]);
    },
    [movies.data],
  );

  const chat = useChat({
    onBooked: refreshAfterBooking,
    onTurnEnd: () => void queryClient.invalidateQueries({ queryKey: keys.usage }),
  });

  // A new summary from the chat moves the map to its showtime, unless seats are being chosen on the form
  const followed = useRef<BookingSummary | null>(null);
  const selectingOnForm = selected.length > 0;
  useEffect(() => {
    if (!chat.pending || chat.pending === followed.current) return;
    followed.current = chat.pending;
    if (!selectingOnForm) showOnMap(chat.pending);
  }, [chat.pending, selectingOnForm, showOnMap]);

  const book = useMutation({
    mutationFn: async (key: string) =>
      unwrap(
        await tiketa.POST("/v1/bookings", {
          body: { showtime_id: showtimeId ?? 0, seats: selected, customer_name: name.trim() },
          params: { header: { "idempotency-key": key } },
        }),
      ),
    onSuccess: (booking) => {
      setNotice({ kind: "booked", booking });
      setSelected([]);
      rememberName(name.trim());
      queryClient.setQueryData<SeatMapData>(keys.seats(booking.showtime.id), (old) =>
        old
          ? {
              ...old,
              rows: old.rows.map((row) => ({
                ...row,
                seats: row.seats.map((seat) => (booking.seats.includes(seat.id) ? { ...seat, is_taken: true } : seat)),
              })),
            }
          : old,
      );
      refreshAfterBooking(booking);
    },
    onError: (error) => {
      setNotice({ kind: "refused", text: error instanceof TiketaError ? error.message : "Tiketa did not answer." });
      if (showtimeId !== null) void queryClient.invalidateQueries({ queryKey: keys.seats(showtimeId) });
    },
  });

  const toggle = (seatId: string) => {
    setNotice(null);
    setSelected((current) =>
      current.includes(seatId)
        ? current.filter((id) => id !== seatId)
        : current.length >= MAX_SEATS
          ? current
          : [...current, seatId],
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected.length === 0 || name.trim() === "" || book.isPending) return;
    // A retry of the same choice reuses its key, so a lost response can never book twice
    const signature = `${showtimeId}|${selected.join(",")}|${name.trim()}`;
    if (attempt.current.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    book.mutate(attempt.current.key);
  };

  const prefetchSeats = (showtime: Showtime) =>
    void queryClient.prefetchQuery({
      queryKey: keys.seats(showtime.id),
      queryFn: () => fetchSeats(showtime.id),
      staleTime: 5_000,
    });

  const heldByChat = chat.pending && chat.pending.showtime_id === showtimeId ? chat.pending.seats : ([] as string[]);
  const free = map ? freeSeats(map).length : 0;
  const total = map ? map.rows.reduce((sum, row) => sum + row.seats.length, 0) : 0;
  const price = map?.showtime.price_idr ?? 0;
  const finding = map
    ? `${map.showtime.movie_title}, ${whenLabel(map.showtime.starts_at)}, studio ${map.showtime.studio_number}. ${free} of ${total} seats free.`
    : "Choose a film, a day and a time, or ask the agent in Indonesian or English.";

  return (
    <AppShell
      product="Tiketa"
      mark={<Mark size={20} />}
      scope={{ line: "Tiketa Cinema", detail: "Jakarta, times in WIB" }}
      nav={[{ label: "Book seats", to: "/tiketa", icon: SEATS_ICON, current: true }]}
      sidebarFooter={<CinemaPhoto />}
      className="tiketa"
    >
      <div className="tk-layout" data-view={view}>
        <div className="title-row">
          <div>
            <h1>Book seats</h1>
            <p className="sub">{finding}</p>
          </div>
          <div className="title-actions">
            <span className="stamp">Seats refresh every 10 seconds</span>
          </div>
        </div>

        <div className="segmented tk-switch" role="tablist" aria-label="Book with">
          {(["form", "chat"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
            >
              {option === "form" ? "Seat map" : chat.pending ? "Chat, 1 to confirm" : "Chat"}
            </button>
          ))}
        </div>

        <div className="tk-form">
          <section className="tk-films" aria-labelledby="tk-films-title">
            <header className="tk-films-head">
              <h2 id="tk-films-title">Film</h2>
            </header>
            {movies.isError ? (
              <p className="error">Films could not load: {movies.error.message}</p>
            ) : movies.isPending ? (
              <div className="tk-film-rail tk-film-rail-loading" aria-hidden="true" />
            ) : (
              <FilmRail
                movies={movies.data}
                selectedId={movie?.id}
                renderFilm={(candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="tk-film"
                    aria-pressed={candidate.id === movie?.id}
                    onClick={() => {
                      setMovieId(candidate.id);
                      setNotice(null);
                    }}
                  >
                    <Poster movie={candidate} />
                    <span className="tk-film-title">{candidate.title}</span>
                    <span className="tk-film-meta" title={candidate.genres.join(", ")}>
                      {candidate.release_year}
                    </span>
                  </button>
                )}
              />
            )}
          </section>

          <section className="tk-when" aria-labelledby="tk-when-title">
            <div className="tk-when-head">
              <h2 id="tk-when-title">Day and time</h2>
              <div className="segmented tk-days">
                {days.map((option) => (
                  <button
                    key={option.day}
                    type="button"
                    aria-pressed={option.day === day}
                    onClick={() => {
                      setDay(option.day);
                      setNotice(null);
                    }}
                  >
                    <span>{option.weekday}</span>
                    <span className="num">{option.date}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="tk-times">
              {filmShowtimes.map((showtime) => (
                <button
                  key={showtime.id}
                  type="button"
                  className="tk-time"
                  aria-pressed={showtime.id === showtimeId}
                  onPointerEnter={() => prefetchSeats(showtime)}
                  onFocus={() => prefetchSeats(showtime)}
                  onClick={() => {
                    setShowtimeId(showtime.id);
                    setSelected([]);
                    setNotice(null);
                  }}
                >
                  <strong className="num">{clockTime(showtime.starts_at)}</strong>
                  <span className="num">
                    {rupiah(showtime.price_idr)} · {showtime.seats_left} left
                  </span>
                </button>
              ))}
              {showtimes.data && filmShowtimes.length === 0 && (
                <p className="empty">
                  No more showtimes of {movie?.title ?? "this film"} on this day.{" "}
                  {day !== days.at(-1)?.day && (
                    <button
                      type="button"
                      className="tk-link"
                      onClick={() => setDay(days[days.findIndex((option) => option.day === day) + 1]?.day ?? day)}
                    >
                      See the next day
                    </button>
                  )}
                </p>
              )}
              {showtimes.isPending && <span className="tk-time tk-time-loading" aria-hidden="true" />}
            </div>
          </section>

          <section className="panel tk-seats" aria-labelledby="tk-seats-title">
            <header>
              <h2 id="tk-seats-title">Seats</h2>
              <button type="button" className="btn tk-zoom" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>
                {zoomed ? "Fit to screen" : "Zoom in"}
              </button>
              <ul className="tk-legend">
                <li data-state="free">Free</li>
                <li data-state="taken">Taken</li>
                <li data-state="mine">Yours</li>
                {heldByChat.length > 0 && <li data-state="held">In the chat's summary</li>}
              </ul>
            </header>
            {map ? (
              <SeatMap
                zoomed={zoomed}
                map={map}
                selected={selected}
                heldByChat={heldByChat}
                full={selected.length >= MAX_SEATS}
                onToggle={toggle}
              />
            ) : showtimeId === null ? (
              <p className="empty">Choose a showtime to see its seats.</p>
            ) : seats.isError ? (
              <div className="error">
                <p>The seats could not load: {seats.error.message}</p>
                <button type="button" className="btn" onClick={() => void seats.refetch()}>
                  Retry
                </button>
              </div>
            ) : (
              <SeatMapPlaceholder />
            )}

            <form className="tk-checkout" data-active={selected.length > 0} onSubmit={submit}>
              <div className="tk-choice">
                <span className="tk-choice-seats num">
                  {selected.length === 0 ? "No seats chosen" : selected.join(", ")}
                </span>
                <span className="tk-choice-total num">
                  {selected.length === 0
                    ? `Up to ${MAX_SEATS} seats, ${price ? rupiah(price) : "-"} each`
                    : `${selected.length} x ${rupiah(price)} = `}
                  {selected.length > 0 && <b>{rupiah(selected.length * price)}</b>}
                </span>
              </div>
              <div className="field tk-name">
                <label htmlFor="tk-name">Name on the booking</label>
                <input
                  id="tk-name"
                  className="input"
                  value={name}
                  maxLength={80}
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn primary tk-book"
                disabled={selected.length === 0 || name.trim() === "" || book.isPending}
              >
                {book.isPending
                  ? "Booking"
                  : selected.length > 0
                    ? `Book ${selected.length} ${selected.length === 1 ? "seat" : "seats"}`
                    : "Book"}
              </button>
            </form>
            {notice?.kind === "booked" && (
              <p className="tk-notice" data-kind="booked" role="status">
                Booked <strong className="tk-code">{notice.booking.code}</strong>: {notice.booking.seats.join(", ")} for{" "}
                {notice.booking.showtime.movie_title}, {whenLabel(notice.booking.showtime.starts_at)}. Pay{" "}
                {rupiah(notice.booking.total_price_idr)} at the counter with the code.
              </p>
            )}
            {notice?.kind === "refused" && (
              <p className="tk-notice" data-kind="refused" role="alert">
                {notice.text}
              </p>
            )}
          </section>

          {bookings.data ? (
            <BookingsTable bookings={bookings.data} />
          ) : (
            <section className="panel tk-bookings" aria-labelledby="tk-bookings-title">
              <header>
                <h2 id="tk-bookings-title">Your bookings</h2>
              </header>
              {bookings.isError ? (
                <p className="error">Bookings could not load: {bookings.error.message}</p>
              ) : (
                <div className="skeleton" style={{ height: 96 }} />
              )}
            </section>
          )}
        </div>

        <ChatPanel
          lines={chat.lines}
          pending={chat.pending}
          activity={chat.activity}
          busy={chat.busy}
          ready={chat.ready}
          startError={chat.startError}
          usage={usage.data}
          onSend={(text) => void chat.send(text)}
          onAnswer={(approved) => void chat.answer(approved)}
          onShowOnMap={(summary) => {
            showOnMap(summary);
            setView("form");
          }}
          onRestart={() => void chat.restart()}
        />
      </div>
    </AppShell>
  );
}
