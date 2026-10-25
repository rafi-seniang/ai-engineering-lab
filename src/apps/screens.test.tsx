import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test, vi } from "vitest";
import { LedgerBook } from "./ledger/LedgerBook";
import { LensSearch } from "./lens/LensSearch";
import { PilahInbox } from "./pilah/PilahInbox";

function renderAt(path: string, element: ReactElement) {
  const route = path.split("?")[0];
  const router = createMemoryRouter([{ path: route, element }], { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("Dispatch sorts paragraphs with custom prompt and choices on Laya, then on Jev", async () => {
  const sortCalls: Array<{
    engine: string;
    instructions: string;
    choices: Array<{ label: string; description: string }>;
    items: string[];
  }> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.endsWith("/v1/engines")) {
        return jsonResponse({
          engines: [
            {
              id: "laya",
              name: "Laya",
              provider: "ConvAI Innovations (local CUDA)",
              available: true,
              status_label: "Active",
              detail: "Local System 1 router.",
            },
            {
              id: "jev",
              name: "Jev",
              provider: "TypeSafe AI (hosted System One API)",
              available: true,
              status_label: "Active",
              detail: "jev-latest through api.typesafe.ai.",
            },
          ],
        });
      }
      if (url.endsWith("/v1/sort")) {
        const rawBody = input instanceof Request ? await input.clone().text() : String(init?.body ?? "{}");
        const parsed = JSON.parse(rawBody) as {
          engine: string;
          instructions: string;
          choices: Array<{ label: string; description: string }>;
          confidence_gate: number;
          items: string[];
        };
        sortCalls.push(parsed);
        const labels = parsed.choices.map((choice) => choice.label);
        const chosen = labels[labels.length - 1] ?? "A";
        const probabilities = Object.fromEntries(
          labels.map((label) => [
            label,
            label === chosen ? 0.84 : Number((0.16 / Math.max(labels.length - 1, 1)).toFixed(2)),
          ]),
        );
        return jsonResponse({
          engine: parsed.engine,
          latency_ms: 19.4,
          confidence_gate: parsed.confidence_gate,
          results: parsed.items.map(() => ({
            choice: chosen,
            probabilities,
            top_probability: 0.84,
            checkpoint: parsed.engine === "jev" ? "jev-1.14.0" : "english",
            passed_gate: 0.84 >= parsed.confidence_gate,
          })),
        });
      }
      return new Response("not found", { status: 404 });
    }),
  );

  renderAt("/dispatch", <PilahInbox />);

  expect(screen.getByRole("link", { name: "Back to lobby" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "System 1 Model" })).toBeInTheDocument();
  expect(screen.getByLabelText("Rule preset")).toBeInTheDocument();
  expect(screen.getByLabelText("Sample input")).toBeInTheDocument();
  expect(screen.getByText("Below 0.70 means low confidence and needs a human judge.")).toBeInTheDocument();

  const jevButton = await screen.findByRole("button", { name: "Jev" });
  expect(jevButton).toBeEnabled();

  const predictionPanel = await screen.findByRole("region", { name: "Model prediction" });
  expect(await within(predictionPanel).findByText("0.84")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Add choice" }));
  const fourthLabel = screen.getByRole("textbox", { name: "Choice 4 label" });
  expect(fourthLabel).toHaveValue("D");
  await userEvent.type(screen.getByRole("textbox", { name: "Choice 4 description" }), "Hardware lab maintenance");

  const paragraphBox = screen.getByRole("textbox", { name: "Paragraph to sort" });
  await userEvent.clear(paragraphBox);
  await userEvent.type(paragraphBox, "Cleaned dust filters on the open GPU rig.");
  await userEvent.click(screen.getByRole("button", { name: "Sort with Laya" }));

  await vi.waitFor(() => {
    expect(sortCalls.length).toBeGreaterThanOrEqual(2);
  });
  const latest = sortCalls[sortCalls.length - 1];
  expect(latest?.choices.map((choice) => choice.label)).toEqual(["A", "B", "C", "D"]);
  expect(latest?.items).toEqual(["Cleaned dust filters on the open GPU rig."]);
  const matches = await within(predictionPanel).findAllByText(/Hardware lab maintenance/);
  expect(matches.length).toBeGreaterThanOrEqual(1);
  expect(latest?.engine).toBe("laya");

  await userEvent.click(jevButton);
  await userEvent.click(screen.getByRole("button", { name: "Sort with Jev" }));
  await vi.waitFor(() => {
    expect(sortCalls[sortCalls.length - 1]?.engine).toBe("jev");
  });
  expect(await within(predictionPanel).findByText("jev-1.14.0")).toBeInTheDocument();
});

test("Lens runs semantic Typesense search and indexes uploaded user pictures into the database", async () => {
  const dog = {
    id: "908149",
    title: "[Dog with Duck in Mouth]",
    artist: "Samuel Root",
    date: "1860s",
    medium: "Albumen silver print",
    tags: ["Ducks", "Dogs"],
    image: "908149.jpg",
    width: 600,
    height: 800,
    source_url: "https://www.metmuseum.org/art/collection/search/908149",
    licence: "CC0",
    origin: "met",
    created_at: 0,
  };
  const uploadedPhoto = {
    id: "upload-101",
    title: "Desk Prototype",
    artist: "Uploaded to lab",
    date: "2026-10-25",
    medium: "Digital upload",
    tags: ["prototype"],
    image: "uploads/upload-101.png",
    width: 800,
    height: 600,
    source_url: "",
    licence: "Local",
    origin: "upload",
    created_at: 1792920000000,
  };
  let hasUploaded = false;
  const searchUrls: string[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = input instanceof Request ? input.method : (init?.method ?? "GET");
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.endsWith("/v1/collection")) {
        return jsonResponse({
          photographs: hasUploaded ? 272 : 271,
          uploaded: hasUploaded ? 1 : 0,
          archive: 271,
          vector_store: "typesense",
          subjects: [{ subject: "Dogs", photographs: 19 }],
          model: "google/embeddinggemma-2",
          dimensions: 768,
          source: "The Metropolitan Museum of Art",
          licence: "CC0",
        });
      }
      if (url.includes("/v1/search?")) {
        searchUrls.push(url);
        return jsonResponse({
          query: "anjing",
          mode: "picture",
          took_ms: 42.1,
          hits: [{ photograph: dog, score: 0.78, in_caption: false }],
        });
      }
      if (url.endsWith("/v1/photographs") && method === "POST") {
        hasUploaded = true;
        return jsonResponse(
          {
            added: [uploadedPhoto],
            total_photographs: 272,
            took_ms: 51.3,
          },
          201,
        );
      }
      if (url.includes("/v1/photographs?") && method === "GET") {
        return jsonResponse({
          query: "*",
          mode: "recent",
          took_ms: 3.4,
          hits: hasUploaded ? [{ photograph: uploadedPhoto, score: 1, in_caption: false }] : [],
        });
      }
      if (url.includes("/similar")) {
        return jsonResponse({
          query: "similar",
          mode: "similar",
          took_ms: 1.2,
          hits: [],
        });
      }
      return new Response("not found", { status: 404 });
    }),
  );

  renderAt("/lens", <LensSearch />);
  expect(await screen.findByText(/1 photographs for “anjing”\. None names it in its caption/)).toBeInTheDocument();
  expect(searchUrls[0]).toContain("mode=picture");

  await userEvent.click(screen.getByRole("button", { name: "Add to database" }));
  const fileInput = screen.getByLabelText("Choose images to index");
  const testFile = new File([new Uint8Array([137, 80, 78, 71])], "desk.png", { type: "image/png" });
  await userEvent.upload(fileInput, testFile);
  await userEvent.type(screen.getByLabelText("Title (optional)"), "Desk Prototype");
  await userEvent.click(screen.getByRole("button", { name: "Save to Typesense" }));

  expect(await screen.findByText(/Indexed 1 picture into Typesense/)).toBeInTheDocument();
  const detail = await screen.findByRole("complementary", { name: "Selected photograph" });
  expect(within(detail).getByText("Desk Prototype")).toBeInTheDocument();
  expect(within(detail).getByText("Stored in Typesense")).toBeInTheDocument();
  expect(within(detail).getByRole("button", { name: "Remove from database" })).toBeInTheDocument();
});

test("Ledger flags arithmetic errors in code and switches to the bank statement", async () => {
  const invoice = {
    id: "inv-03",
    file_name: "inv-03.pdf",
    read_at: "2026-10-25T06:00:00Z",
    read_ms: 9100,
    printed: {},
    invoice: {
      supplier_name: "PT Kemasan Hijau Indonesia",
      invoice_number: "KHI.INV.2026.0146",
      invoice_date: "2026-10-09",
      due_date: "2026-11-08",
      subtotal: 11_315_000,
      tax: 1_244_650,
      total: 12_559_650,
      lines: [
        {
          description: "Kraft paper bag (500 pcs)",
          quantity: 8,
          unit_price: 375_000,
          line_total: 3_375_000,
        },
      ],
    },
    checks: [
      {
        name: "line_2_adds_up",
        passed: false,
        detail: "8 x 375,000 = 3,000,000, printed 3,375,000",
      },
      { name: "has_supplier", passed: true, detail: "" },
    ],
    usage: { model: "Qwen/Qwen3.5-2B", input_tokens: 900, output_tokens: 180, cost_usd: null },
    status: "needs a look",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/health")) return jsonResponse({ status: "ok" });
      if (url.endsWith("/meta")) {
        return jsonResponse({
          id: "ledger",
          name: "Ledger",
          summary: "Invoice reader",
          version: "0.1.0",
          engine: "Qwen/Qwen3.5-2B",
          own_ui_path: "/docs",
          docs_path: "/docs",
        });
      }
      if (url.endsWith("/v1/invoices")) return jsonResponse([invoice]);
      if (url.endsWith("/v1/reconciliation")) {
        return jsonResponse({
          payments: [
            {
              line: {
                position: 1,
                date: "2026-10-12",
                description: "TRF KE KEMASAN HIJAU",
                debit: 12_559_650,
                credit: 0,
              },
              invoice_id: "inv-03",
              method: "payee",
              probability: 0.94,
            },
          ],
          invoices: [
            {
              invoice_id: "inv-03",
              total: 12_559_650,
              paid: 12_559_650,
              outstanding: 0,
              status: "paid",
              payments: [1],
            },
          ],
          open_amount: 0,
          unmatched_debits: 0,
        });
      }
      return new Response("not found", { status: 404 });
    }),
  );

  renderAt("/ledger?invoice=inv-03", <LedgerBook />);
  expect(await screen.findByText("Line 2: quantity times price")).toBeInTheDocument();
  expect(screen.getByText("8 x 375,000 = 3,000,000, printed 3,375,000")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: /Bank statement/ }));
  const statement = await screen.findByRole("region", { name: "Bank statement" });
  expect(within(statement).getByText("TRF KE KEMASAN HIJAU")).toBeInTheDocument();
});
