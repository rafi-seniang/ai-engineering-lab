import createClient from "openapi-fetch";
import { backendUrl, projectById } from "../lab/projects";
import type { components, paths } from "./generated/tiketa";

const baseUrl = backendUrl(projectById("tiketa"));

let guestSession: Promise<void> | null = null;

/**
 * The browser's guest session: a signed HttpOnly cookie the backend sets, which scripts here never see. It stands in
 * for an API key, which a browser must never hold. Started once, and again if the backend no longer accepts it.
 */
function ensureGuest(): Promise<void> {
  guestSession ??= globalThis
    .fetch(`${baseUrl}/auth/guest`, { method: "POST", credentials: "include" })
    .then((response) => {
      if (!response.ok) throw new Error(`Tiketa refused a guest session (${response.status})`);
    })
    .catch((error: unknown) => {
      guestSession = null; // the next request tries again
      throw error;
    });
  return guestSession;
}

/** Sends a request with the guest cookie, starting the session first and once more if it has expired. */
async function withGuest(send: () => Promise<Response>): Promise<Response> {
  await ensureGuest();
  const response = await send();
  if (response.status !== 401) return response;
  guestSession = null;
  await ensureGuest();
  return send();
}

/** Typed client for the Tiketa backend. Paths, bodies and responses come from its OpenAPI schema. */
export const tiketa = createClient<paths>({
  baseUrl,
  credentials: "include",
  fetch: (request) => withGuest(() => globalThis.fetch(request.clone())),
});

export type Movie = components["schemas"]["Movie"];
export type Showtime = components["schemas"]["Showtime"];
export type SeatMap = components["schemas"]["SeatMap"];
export type Booking = components["schemas"]["Booking"];
export type BookingSummary = components["schemas"]["BookingSummary"];
export type SessionView = components["schemas"]["SessionView"];
export type TokenUsage = components["schemas"]["TokenUsageView"];
/** One server-sent event of a chat turn, as app/features/chat/schemas.py ChatEvent writes it. */
export interface ChatEvent {
  type: "token" | "tool" | "confirmation" | "booking" | "message" | "error" | "end";
  text?: string;
  name?: string;
  data?: Record<string, unknown>;
}

/** An answer the service refused, with its own words and, for a limit, when to try again. */
export class TiketaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Raises with the service's own detail when it gave one, so a screen can say what failed. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data;
  throw new TiketaError(detailOf(result.error, result.response.status), result.response.status);
}

function detailOf(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  return status === 429 ? "Too many requests. Try again in a minute." : `Tiketa answered ${status}`;
}

/**
 * Posts to a chat endpoint and hands each server-sent event to `onEvent` as it arrives. A refusal before the stream
 * starts (another turn running, the day's tokens used up) raises a TiketaError with the service's detail.
 */
export async function streamTurn(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await withGuest(() =>
    globalThis.fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      credentials: "include",
      signal,
    }),
  );
  if (!response.ok || !response.body) {
    const error = await response.json().catch(() => undefined);
    throw new TiketaError(detailOf(error, response.status), response.status);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) onEvent(JSON.parse(data) as ChatEvent);
      boundary = buffer.indexOf("\n\n");
    }
  }
}
