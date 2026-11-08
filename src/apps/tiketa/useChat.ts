import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Booking,
  type BookingSummary,
  type ChatEvent,
  streamTurn,
  TiketaError,
  tiketa,
  unwrap,
} from "../../api/tiketa";

const SESSION_KEY = "tiketa.session";

/** What the agent is doing while the reply is still coming, in the words of the trade. */
const TOOL_WORDS: Record<string, string> = {
  find_showtimes: "Looking up showtimes",
  get_movie_details: "Reading about the film",
  get_seat_map: "Reading the seat map",
  update_booking: "Holding your choices",
  book_tickets: "Preparing the summary",
  list_my_bookings: "Checking your bookings",
};

export interface ChatLine {
  id: string;
  role: "user" | "assistant" | "booking" | "failure";
  text: string;
  booking?: Booking;
}

interface ChatHooks {
  onBooked: (booking: Booking) => void;
  onTurnEnd: () => void;
}

let lineCount = 0;
const line = (role: ChatLine["role"], text: string, booking?: Booking): ChatLine => ({
  id: `line-${++lineCount}`,
  role,
  text,
  booking,
});

function storedSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function storeSession(sessionId: string | null) {
  try {
    if (sessionId) window.localStorage.setItem(SESSION_KEY, sessionId);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // private window: the conversation simply starts fresh on the next visit
  }
}

async function newSession(): Promise<string> {
  const created = unwrap(await tiketa.POST("/v1/sessions"));
  storeSession(created.session_id);
  return created.session_id;
}

/** One conversation with the booking agent: restored on reload, streamed token by token, one turn at a time. */
export function useChat({ onBooked, onTurnEnd }: ChatHooks) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [pending, setPending] = useState<BookingSummary | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const hooks = useRef({ onBooked, onTurnEnd });
  hooks.current = { onBooked, onTurnEnd };
  const abort = useRef<AbortController | null>(null);

  const start = useCallback(async (fresh: boolean) => {
    setStartError(null);
    setLines([]);
    setPending(null);
    try {
      const saved = fresh ? null : storedSession();
      if (saved) {
        const view = await tiketa.GET("/v1/sessions/{session_id}", { params: { path: { session_id: saved } } });
        if (view.data) {
          setLines(view.data.turns.map((turn) => line(turn.role, turn.text)));
          setPending(view.data.pending_confirmation);
          setSessionId(saved);
          return;
        }
      }
      setSessionId(await newSession());
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "The chat could not start");
    }
  }, []);

  useEffect(() => {
    void start(false);
    return () => abort.current?.abort();
  }, [start]);

  const run = useCallback(async (path: string, body: Record<string, unknown>) => {
    const reply = line("assistant", ""); // joins the conversation with its first words, so after any ticket
    setBusy(true);
    setActivity("Thinking");
    const write = (text: string, append: boolean) =>
      setLines((current) =>
        current.some((item) => item.id === reply.id)
          ? current.map((item) => (item.id === reply.id ? { ...item, text: append ? item.text + text : text } : item))
          : [...current, { ...reply, text }],
      );
    const handle = (event: ChatEvent) => {
      if (event.type === "token" && event.text) {
        setActivity(null);
        write(event.text, true);
      } else if (event.type === "tool" && event.name) {
        setActivity(TOOL_WORDS[event.name] ?? "Working");
      } else if (event.type === "confirmation" && event.data) {
        setPending(event.data as unknown as BookingSummary);
      } else if (event.type === "booking" && event.data) {
        const booking = event.data as unknown as Booking;
        setPending(null);
        setLines((current) => [...current, line("booking", booking.code, booking)]);
        hooks.current.onBooked(booking);
      } else if (event.type === "message" && event.text !== undefined) {
        write(event.text, false); // the whole reply, the one to keep
      } else if (event.type === "error") {
        setLines((current) => [...current, line("failure", event.text ?? "The reply failed.")]);
      }
    };
    abort.current = new AbortController();
    try {
      await streamTurn(path, body, handle, abort.current.signal);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const text = error instanceof TiketaError ? error.message : "The connection to Tiketa dropped.";
        setLines((current) => [...current, line("failure", text)]);
      }
    } finally {
      setLines((current) => current.filter((item) => item.role !== "assistant" || item.text !== ""));
      setBusy(false);
      setActivity(null);
      hooks.current.onTurnEnd();
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!sessionId || busy) return;
      setPending(null); // a typed reply answers the waiting summary: the agent books, changes or drops it
      setLines((current) => [...current, line("user", text)]);
      await run(`/v1/sessions/${sessionId}/messages`, { message: text });
    },
    [sessionId, busy, run],
  );

  const answer = useCallback(
    async (approved: boolean) => {
      if (!sessionId || busy) return;
      setPending(null);
      await run(`/v1/sessions/${sessionId}/confirmation`, { approved });
    },
    [sessionId, busy, run],
  );

  return {
    ready: sessionId !== null,
    lines,
    pending,
    activity,
    busy,
    startError,
    send,
    answer,
    restart: () => start(true),
  };
}
