import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { TiketaBooking } from "./TiketaBooking";

const TOMORROW_EVENING = new Date(Date.now() + 86_400_000).toISOString();
const SHOWTIME = {
  id: 117,
  movie_id: 9,
  movie_title: "Dune: Part Two",
  studio_number: 9,
  starts_at: TOMORROW_EVENING,
  price_idr: 45000,
  seats_left: 7,
};
const MOVIE = {
  id: 9,
  title: "Dune: Part Two",
  synopsis: "Paul Atreides joins the Fremen.",
  release_year: 2024,
  genres: ["Science fiction"],
  studio_number: 9,
  poster_url: null,
  trailer_youtube_id: null,
};
const SEATS = {
  showtime: SHOWTIME,
  rows: [
    { row: "A", seats: ["A1", "A2", "A3", "A4"].map((id) => ({ id, is_taken: id === "A4" })) },
    { row: "B", seats: ["B1", "B2", "B3", "B4"].map((id) => ({ id, is_taken: false })) },
  ],
  aisle_after_seat: 2,
  walkway_before_row: "B",
};
const SUMMARY = {
  showtime_id: 117,
  movie_title: "Dune: Part Two",
  starts_at: TOMORROW_EVENING,
  starts_at_local: "Monday 09 November 2026, 18:00 WIB",
  studio_number: 9,
  seats: ["B1", "B2"],
  customer_name: "Rafi",
  price_per_seat_idr: 45000,
  total_price_idr: 90000,
};
const booking = (code: string, channel: "chat" | "web", seats: string[]) => ({
  code,
  channel,
  showtime: SHOWTIME,
  seats,
  customer_name: "Rafi",
  total_price_idr: 45000 * seats.length,
  created_at: new Date().toISOString(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const events = (...items: unknown[]) =>
  new Response(items.map((item) => `data: ${JSON.stringify(item)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });

interface Sent {
  method: string;
  path: string;
  body: unknown;
  headers: Headers;
}

function serve(handle: (call: Sent) => Response | undefined) {
  const sent: Sent[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(String(input), init);
      const text = await request.clone().text();
      const call = {
        method: request.method,
        path: new URL(request.url).pathname,
        body: text ? JSON.parse(text) : undefined,
        headers: request.headers,
      };
      sent.push(call);
      if (call.path === "/v1/movies") return json([MOVIE]);
      if (call.path === "/v1/showtimes") return json([SHOWTIME]);
      if (call.path === "/v1/usage") return json({ used_tokens: 0, daily_tokens: 400000, resets_in_seconds: 3600 });
      if (call.path === "/v1/sessions" && call.method === "POST") return json({ session_id: "s1" }, 201);
      return handle(call) ?? new Response("not found", { status: 404 });
    }),
  );
  return sent;
}

function renderScreen() {
  const router = createMemoryRouter([{ path: "/tiketa", element: <TiketaBooking /> }], { initialEntries: ["/tiketa"] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  window.localStorage.clear();
});

test("the form books the chosen seats once, with an idempotency key", async () => {
  let booked: string[] = [];
  const sent = serve((call) => {
    if (call.path === "/v1/showtimes/117/seats") return json(SEATS);
    if (call.path === "/v1/bookings" && call.method === "GET")
      return json(booked.length ? [booking("TKFORM0001", "web", booked)] : []);
    if (call.path === "/v1/bookings" && call.method === "POST") {
      booked = (call.body as { seats: string[] }).seats;
      return json(booking("TKFORM0001", "web", booked), 201);
    }
    return undefined;
  });
  renderScreen();

  await userEvent.click(await screen.findByRole("button", { name: "A1, free" }));
  await userEvent.click(screen.getByRole("button", { name: "A2, free" }));
  expect(screen.getByRole("button", { name: "A4, taken" })).toBeDisabled();
  await userEvent.type(screen.getByLabelText("Name on the booking"), "Rafi");
  await userEvent.click(screen.getByRole("button", { name: "Book 2 seats" }));

  expect(await screen.findByText(/Booked/)).toHaveTextContent("Booked TKFORM0001: A1, A2 for Dune: Part Two");
  const post = sent.find((call) => call.path === "/v1/bookings" && call.method === "POST");
  expect(post?.body).toEqual({ showtime_id: 117, seats: ["A1", "A2"], customer_name: "Rafi" });
  expect(post?.headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/);
  const table = await screen.findByRole("table");
  expect(await within(table).findByText("Form")).toBeInTheDocument();
});

test("the chat's summary shows on the map and books only after Confirm", async () => {
  const sent = serve((call) => {
    if (call.path === "/v1/showtimes/117/seats") return json(SEATS);
    if (call.path === "/v1/bookings") return json([]);
    if (call.path === "/v1/sessions/s1/messages") {
      return events(
        { type: "tool", name: "find_showtimes" },
        { type: "confirmation", data: SUMMARY },
        { type: "end", data: { model_calls: 2, input_tokens: 900, output_tokens: 40 } },
      );
    }
    if (call.path === "/v1/sessions/s1/confirmation") {
      return events(
        { type: "booking", data: booking("TKCHAT0001", "chat", ["B1", "B2"]) },
        { type: "message", text: "Sudah dipesan, kodenya TKCHAT0001." },
        { type: "end", data: { model_calls: 1, input_tokens: 300, output_tokens: 20 } },
      );
    }
    return undefined;
  });
  renderScreen();

  await userEvent.type(await screen.findByLabelText("Message to the agent"), "dune besok jam 6, B1 B2, Rafi{Enter}");
  const summary = await screen.findByRole("region", { name: "Booking waiting for your answer" });
  expect(within(summary).getByText("B1, B2")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "B1, in the chat's summary" })).toBeInTheDocument();
  expect(sent.some((call) => call.path === "/v1/sessions/s1/confirmation")).toBe(false);

  await userEvent.click(within(summary).getByRole("button", { name: "Confirm booking" }));
  expect(await screen.findByText("TKCHAT0001")).toBeInTheDocument();
  expect(screen.getByText("Sudah dipesan, kodenya TKCHAT0001.")).toBeInTheDocument();
  const confirmation = sent.find((call) => call.path === "/v1/sessions/s1/confirmation");
  expect(confirmation?.body).toEqual({ approved: true });
});
