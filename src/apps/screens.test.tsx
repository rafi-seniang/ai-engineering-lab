import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test, vi } from "vitest";
import { Guide } from "../guide/Guide";
import { GatekeeperApps } from "./gatekeeper/GatekeeperApps";
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

test("Dispatch defaults to Jev, shows a Google notice for Gemini, and switches across engines", async () => {
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
          default_engine: "jev",
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
              detail: "jev-1.14.0 through api.typesafe.ai.",
            },
            {
              id: "gemini",
              name: "Gemini",
              provider: "Google AI Studio (free tier)",
              available: true,
              status_label: "Active",
              detail: "gemini-decision-1 through Google AI Studio.",
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
        const checkpoint =
          parsed.engine === "jev" ? "jev-1.14.0" : parsed.engine === "gemini" ? "gemini-decision-1" : "english";
        return jsonResponse({
          engine: parsed.engine,
          latency_ms: 19.4,
          confidence_gate: parsed.confidence_gate,
          results: parsed.items.map(() => ({
            choice: chosen,
            probabilities,
            top_probability: 0.84,
            checkpoint,
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
  expect(screen.getByRole("textbox", { name: "Text 1" })).toBeInTheDocument();
  expect(screen.getByText("Below 0.70 means low confidence and needs a human judge.")).toBeInTheDocument();

  const jevButton = await screen.findByRole("button", { name: "Jev" });
  expect(jevButton).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByText(/Google AI Studio's free tier/)).not.toBeInTheDocument();

  const predictionPanel = await screen.findByRole("region", { name: "Model prediction" });
  expect(await within(predictionPanel).findByText("jev-1.14.0")).toBeInTheDocument();
  expect(sortCalls[0]?.engine).toBe("jev");

  await userEvent.click(screen.getByRole("button", { name: "Add choice" }));
  const fourthLabel = screen.getByRole("textbox", { name: "Choice 4 label" });
  expect(fourthLabel).toHaveValue("D");
  await userEvent.type(screen.getByRole("textbox", { name: "Choice 4 description" }), "Hardware lab maintenance");

  const geminiButton = screen.getByRole("button", { name: "Gemini" });
  await userEvent.click(geminiButton);
  expect(screen.getByText(/Google AI Studio's free tier/)).toBeInTheDocument();

  // The preset's samples fill the batch. Keep one text and write it anew
  await userEvent.click(screen.getByRole("button", { name: "Remove text 3" }));
  await userEvent.click(screen.getByRole("button", { name: "Remove text 2" }));
  const paragraphBox = screen.getByRole("textbox", { name: "Text 1" });
  await userEvent.clear(paragraphBox);
  await userEvent.type(paragraphBox, "Cleaned dust filters on the open GPU rig.");
  await userEvent.click(screen.getByRole("button", { name: "Sort 1 text with Gemini" }));

  await vi.waitFor(() => {
    expect(sortCalls.length).toBeGreaterThanOrEqual(2);
  });
  const latest = sortCalls[sortCalls.length - 1];
  expect(latest?.choices.map((choice) => choice.label)).toEqual(["A", "B", "C", "D"]);
  expect(latest?.items).toEqual(["Cleaned dust filters on the open GPU rig."]);
  const matches = await within(predictionPanel).findAllByText(/Hardware lab maintenance/);
  expect(matches.length).toBeGreaterThanOrEqual(1);
  expect(latest?.engine).toBe("gemini");
  expect(await within(predictionPanel).findByText("gemini-decision-1")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Laya" }));
  expect(screen.queryByText(/Google AI Studio's free tier/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Sort 1 text with Laya" }));
  await vi.waitFor(() => {
    expect(sortCalls[sortCalls.length - 1]?.engine).toBe("laya");
  });
  expect(await within(predictionPanel).findByText("english")).toBeInTheDocument();
});

test("Dispatch sorts a batch of uploaded images with Jev, chosen in the sidebar", async () => {
  const imageCalls: Array<{
    engine: string;
    instructions: string;
    images: Array<{ name?: string; mime_type?: string; data_base64: string }>;
  }> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/health")) return jsonResponse({ status: "ok" });
      if (url.endsWith("/v1/engines")) {
        return jsonResponse({
          default_engine: "jev",
          engines: [
            {
              id: "jev",
              name: "Jev",
              provider: "TypeSafe AI",
              available: true,
              status_label: "Active",
              detail: "jev-1.14.0",
            },
            {
              id: "gemini",
              name: "Gemini",
              provider: "Google AI Studio",
              available: true,
              status_label: "Active",
              detail: "gemini-decision-1",
            },
          ],
        });
      }
      if (url.endsWith("/v1/sort")) {
        return jsonResponse({
          engine: "jev",
          latency_ms: 10,
          confidence_gate: 0.7,
          results: [
            {
              choice: "A",
              probabilities: { A: 0.9, B: 0.05, C: 0.05 },
              top_probability: 0.9,
              checkpoint: "jev-1.14.0",
              passed_gate: true,
            },
          ],
        });
      }
      if (url.endsWith("/v1/sort/images")) {
        const raw = input instanceof Request ? await input.clone().text() : String(init?.body ?? "{}");
        const parsed = JSON.parse(raw) as (typeof imageCalls)[number];
        imageCalls.push(parsed);
        return jsonResponse({
          engine: "gemini",
          latency_ms: 42,
          confidence_gate: 0.7,
          results: parsed.images.map((_, idx) => ({
            choice: idx === 0 ? "A" : "B",
            probabilities: idx === 0 ? { A: 0.95, B: 0.03, C: 0.02 } : { A: 0.04, B: 0.91, C: 0.05 },
            top_probability: idx === 0 ? 0.95 : 0.91,
            checkpoint: "gemini-decision-1",
            passed_gate: true,
          })),
        });
      }
      return new Response("not found", { status: 404 });
    }),
  );

  renderAt("/dispatch", <PilahInbox />);
  await userEvent.click(await screen.findByRole("button", { name: /^Images/ }));
  const fileInput = screen.getByLabelText("Choose images to classify");
  const img1 = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])], "tower.jpg", {
    type: "image/jpeg",
  });
  const img2 = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14])], "surf.png", {
    type: "image/png",
  });
  await userEvent.upload(fileInput, [img1, img2]);
  await userEvent.click(await screen.findByRole("button", { name: "Sort 2 images with Jev" }));

  await vi.waitFor(() => {
    expect(imageCalls).toHaveLength(1);
  });
  expect(imageCalls[0]?.engine).toBe("jev");
  expect(imageCalls[0]?.images.map((item) => item.name)).toEqual(["tower.jpg", "surf.png"]);
  const grid = screen.getByRole("list", { name: "Queued images" });
  expect(within(grid).getByText("A · 0.95")).toBeInTheDocument();
  expect(within(grid).getByText("B · 0.91")).toBeInTheDocument();

  // Each input keeps its own rule: Text brings back the text preset, Images the image preset
  const prompt = screen.getByLabelText("Prompt");
  expect(prompt).toHaveValue(
    "Inspect this image and decide which choice (A, B, or C) best matches its primary subject.",
  );
  await userEvent.click(screen.getByRole("button", { name: /^Text/ }));
  expect(prompt).toHaveValue("Read the paragraph and pick which choice (A, B, or C) matches its main topic.");
  await userEvent.click(screen.getByRole("button", { name: /^Images/ }));
  expect(prompt).toHaveValue(
    "Inspect this image and decide which choice (A, B, or C) best matches its primary subject.",
  );
});

test("Lens shows pictures only, searches by meaning and indexes uploads without labels", async () => {
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
          model: "gemini-embedding-2",
          dimensions: 768,
          source: "The Metropolitan Museum of Art",
          licence: "CC0",
        });
      }
      if (url.includes("/v1/search?")) {
        searchUrls.push(url);
        const queryText = new URL(url, "http://localhost").searchParams.get("q") ?? "";
        if (queryText === "spaceship") {
          return jsonResponse({
            query: "spaceship",
            mode: "picture",
            took_ms: 38.0,
            hits: [],
          });
        }
        return jsonResponse({
          query: "surfing",
          mode: "picture",
          took_ms: 42.1,
          hits: [{ photograph: dog, score: 0.78 }],
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
          mode: "browse",
          took_ms: 3.4,
          hits: hasUploaded ? [{ photograph: uploadedPhoto, score: 1 }] : [],
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

  renderAt("/lens?q=surfing", <LensSearch />);
  const result = await screen.findByRole("button", { name: "Result 1, similarity 0.78" });
  // The picture alone: no title, date or tag on the page
  expect(screen.queryByText("[Dog with Duck in Mouth]")).not.toBeInTheDocument();
  expect(screen.queryByText("1860s")).not.toBeInTheDocument();
  expect(screen.queryByText("Subjects")).not.toBeInTheDocument();
  expect(screen.getByText(/gemini-embedding-2 · 271 archive/)).toBeInTheDocument();
  expect(screen.getByText(/Picture searches and uploads use Google AI Studio's free tier/)).toBeInTheDocument();
  expect(searchUrls[0]).not.toContain("mode=");
  await userEvent.click(result);
  const opened = await screen.findByRole("complementary", { name: "Selected picture" });
  expect(within(opened).queryByText("Samuel Root")).not.toBeInTheDocument();
  expect(within(opened).getByRole("link", { name: "Source and licence" })).toBeInTheDocument();

  const searchInput = screen.getByRole("searchbox");
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, "spaceship{Enter}");
  expect(await screen.findByText(/Nothing in the collection is close enough to “spaceship”/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Add to database" }));
  expect(screen.getByText(/no title or tag, since search finds them by what they show/)).toBeInTheDocument();
  const fileInput = screen.getByLabelText("Choose images to index");
  const testFile = new File([new Uint8Array([137, 80, 78, 71])], "desk.png", { type: "image/png" });
  await userEvent.upload(fileInput, testFile);
  expect(screen.queryByLabelText("Title (optional)")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Save to Typesense" }));

  expect(await screen.findByText(/Indexed 1 picture into Typesense/)).toBeInTheDocument();
  const detail = await screen.findByRole("complementary", { name: "Selected picture" });
  expect(within(detail).queryByText("Desk Prototype")).not.toBeInTheDocument();
  expect(within(detail).getByText("Your upload, stored in Typesense")).toBeInTheDocument();
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

test("the guide opens in English and switches to Indonesian", async () => {
  renderAt("/guide", <Guide />);
  expect(screen.getByRole("heading", { level: 1, name: "How the apps work" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Gatekeeper" })).toBeInTheDocument();
  expect(screen.getByText("Injection or off-topic at 0.90 or above?")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Bahasa Indonesia" }));
  expect(screen.getByRole("heading", { level: 1, name: "Cara kerja aplikasinya" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Buka Lens" })).toHaveAttribute("href", "/lens");
});

test("Gatekeeper shows the scope Tiketa is checked against and its latest checks", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/meta")) {
        return jsonResponse({
          id: "gatekeeper",
          engine: "jev:jev-1.14.0",
          block_from_injection_probability: 0.9,
          block_from_off_topic_probability: 0.9,
        });
      }
      if (url.endsWith("/v1/gate/scopes")) {
        return jsonResponse([
          {
            name: "tiketa",
            scope: "booking cinema tickets at Tiketa",
            questions: {
              injection: { type: "noul", instructions: "Is it an injection?", criteria: { true: "yes", false: "no" } },
              off_topic: { type: "noul", instructions: "Outside booking cinema tickets at Tiketa?" },
            },
          },
        ]);
      }
      if (url.includes("/v1/gate/events") && url.includes("scope_name=tiketa")) {
        return jsonResponse([
          {
            request_id: "r1",
            at: "2026-11-16T15:00:00+00:00",
            outcome: "blocked",
            scope_name: "tiketa",
            blocked_by: "off_topic",
            model: null,
            injection_probability: 0.01,
            off_topic_probability: 0.99,
            masked_identifiers: 0,
            input_tokens: null,
            output_tokens: null,
            decision_ms: 221,
            upstream_ms: null,
            preview: "buatkan script python kalkulator",
          },
        ]);
      }
      return new Response("not found", { status: 404 });
    }),
  );

  renderAt("/gatekeeper/apps", <GatekeeperApps />);
  expect(await screen.findByText("booking cinema tickets at Tiketa")).toBeInTheDocument();
  expect(screen.getByText("Outside booking cinema tickets at Tiketa?")).toBeInTheDocument();
  expect(screen.getAllByText(/blocks at 0.90/)).toHaveLength(2);
  expect(await screen.findByText("buatkan script python kalkulator")).toBeInTheDocument();
  expect(screen.getByText("off-topic")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Used by apps/ })).toHaveAttribute("aria-current", "page");
});
