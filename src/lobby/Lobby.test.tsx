import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test, vi } from "vitest";
import { Lobby } from "./Lobby";

function renderLobby() {
  const router = createMemoryRouter([{ path: "/", element: <Lobby /> }]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function projectCard(name: string): HTMLElement {
  const board = screen.getByRole("region", { name: "Projects" });
  const title = within(board).getByText(name, { selector: "strong" });
  const card = title.closest(".lb-card");
  if (!card) throw new Error(`no card for ${name}`);
  return card as HTMLElement;
}

test("projects whose backend answers /health show On and link to their route", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("8050")) return Promise.reject(new TypeError("connection refused"));
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }),
  );
  renderLobby();

  await vi.waitFor(() => {
    expect(within(projectCard("Dispatch")).getByText("On")).toBeInTheDocument();
    expect(within(projectCard("Lens")).getByText("On")).toBeInTheDocument();
    expect(within(projectCard("Footfall")).getByText("Off")).toBeInTheDocument();
  });
  expect(projectCard("Dispatch").tagName).toBe("A");
  expect(projectCard("Footfall").tagName).toBe("DIV");
  expect(projectCard("Footfall")).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByText("4 of 5 on")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Contact" }));
  const dialog = screen.getByRole("dialog", { name: "Contact details" });
  expect(within(dialog).getByText("rafiseniangwangsa@gmail.com")).toBeInTheDocument();
  expect(within(dialog).getByText("+62 896-3522-5253")).toBeInTheDocument();
  expect(within(dialog).getByText("github.com/rafi-seniang")).toBeInTheDocument();
  expect(within(dialog).getByText("linkedin.com/in/seniang-wangsa")).toBeInTheDocument();
});
