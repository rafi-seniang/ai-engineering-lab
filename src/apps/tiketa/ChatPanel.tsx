import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { BookingSummary, TokenUsage } from "../../api/tiketa";
import { rupiah, whenLabel } from "./format";
import type { ChatLine } from "./useChat";

const STARTERS = [
  "Dune besok malam, 2 kursi tengah sebelahan",
  "Film apa aja yang main hari ini?",
  "Interstellar lusa, 3 kursi paling belakang dekat lorong",
];

interface ChatPanelProps {
  lines: ChatLine[];
  pending: BookingSummary | null;
  activity: string | null;
  busy: boolean;
  ready: boolean;
  startError: string | null;
  usage: TokenUsage | undefined;
  onSend: (text: string) => void;
  onAnswer: (approved: boolean) => void;
  onShowOnMap: (summary: BookingSummary) => void;
  onRestart: () => void;
}

const tokens = new Intl.NumberFormat("en-US");

export function ChatPanel(props: ChatPanelProps) {
  const { lines, pending, activity, busy, ready, startError, usage } = props;
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const lastText = lines.at(-1)?.text;

  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the newest line and every streamed token
  useEffect(() => {
    log.current?.scrollTo?.({ top: log.current.scrollHeight });
  }, [lines.length, lastText, pending, activity]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy || !ready) return;
    props.onSend(text);
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) submit(event);
  };

  return (
    <section className="tk-chat" aria-labelledby="tk-chat-title">
      <header className="tk-chat-head">
        <div>
          <h2 id="tk-chat-title">Ask the agent</h2>
          <p className="tk-usage num">
            {usage
              ? `${tokens.format(usage.used_tokens)} of ${tokens.format(usage.daily_tokens)} tokens today`
              : "Tokens today -"}
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={props.onRestart} disabled={busy}>
          New chat
        </button>
      </header>

      <div className="tk-log" ref={log} aria-live="polite">
        {startError && (
          <div className="error">
            <p>The chat could not start: {startError}</p>
            <button type="button" className="btn" onClick={props.onRestart}>
              Retry
            </button>
          </div>
        )}
        {!startError && lines.length === 0 && (
          <div className="tk-starters">
            <div className="tk-intro">
              <p>
                Ask in Indonesian or English, all at once or one step at a time. The agent reads the same showtimes and
                seat map as the form, and works out dates like besok or malam minggu from today in Jakarta.
              </p>
              <p>Nothing is booked until you confirm the summary it shows. Pay at the counter with the booking code.</p>
            </div>
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                className="tk-starter"
                disabled={!ready}
                onClick={() => props.onSend(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        {lines.map((item) => {
          if (item.role === "booking" && item.booking) {
            const { booking } = item;
            return (
              <div key={item.id} className="tk-ticket" data-channel="chat">
                <strong className="tk-code">{booking.code}</strong>
                <span>
                  {booking.showtime.movie_title}, {whenLabel(booking.showtime.starts_at)}
                </span>
                <span className="num">
                  {booking.seats.join(", ")} · {rupiah(booking.total_price_idr)}
                </span>
              </div>
            );
          }
          return (
            <p key={item.id} className="tk-line" data-role={item.role}>
              {item.text}
            </p>
          );
        })}
        {activity && (
          <p className="tk-activity" role="status">
            {activity}
          </p>
        )}
      </div>

      {pending && (
        <section className="tk-summary" aria-label="Booking waiting for your answer">
          <div className="tk-summary-top">
            <strong>{pending.movie_title}</strong>
            {pending.showtime_id != null && (
              <button type="button" className="tk-link" onClick={() => props.onShowOnMap(pending)}>
                Show on map
              </button>
            )}
          </div>
          <dl>
            <div>
              <dt>When</dt>
              <dd>{whenLabel(pending.starts_at)}</dd>
            </div>
            <div>
              <dt>Studio</dt>
              <dd className="num">{pending.studio_number}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd className="num">{pending.seats.join(", ")}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{pending.customer_name}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd className="num">
                {pending.seats.length} x {rupiah(pending.price_per_seat_idr)} = <b>{rupiah(pending.total_price_idr)}</b>
              </dd>
            </div>
          </dl>
          <div className="tk-summary-actions">
            <button type="button" className="btn primary" disabled={busy} onClick={() => props.onAnswer(true)}>
              Confirm booking
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => props.onAnswer(false)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <form className="tk-composer" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="tk-message">
          Message to the agent
        </label>
        <textarea
          id="tk-message"
          rows={2}
          maxLength={2000}
          placeholder={pending ? "Or type a change, for example: ganti ke E7 dan E8" : "Mau nonton apa?"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="btn" disabled={!ready || busy || draft.trim() === ""}>
          Send
        </button>
      </form>
    </section>
  );
}
