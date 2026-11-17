import { useQuery } from "@tanstack/react-query";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  type ChoiceOption,
  type EngineOption,
  type ImageItemInput,
  pilah,
  type SortedItem,
  unwrap,
} from "../../api/pilah";
import { AppShell } from "../shared/AppShell";
import "./inbox.css";

interface EditableChoice extends ChoiceOption {
  key: string;
}

type InputMode = "text" | "images";

interface TextItem {
  id: string;
  text: string;
}

// The same batch size for texts and pictures
const MAX_BATCH = 10;

interface RulePreset {
  id: string;
  name: string;
  instructions: string;
  gate: number;
  choices: ChoiceOption[];
  samples: { label: string; text: string }[];
}

interface ImageRulePreset {
  id: string;
  name: string;
  instructions: string;
  gate: number;
  choices: ChoiceOption[];
}

interface QueuedImage {
  id: string;
  name: string;
  mimeType: "image/jpeg" | "image/png";
  dataBase64: string;
  previewUrl: string;
}

interface SortRun {
  id: string;
  at: string;
  text: string;
  imagePreviewUrl?: string;
  engine: string;
  latencyMs: number;
  gate: number;
  choices: ChoiceOption[];
  result: SortedItem;
}

type EngineId = EngineOption["id"];

const DEFAULT_ENGINES: EngineOption[] = [
  {
    id: "jev",
    name: "Jev",
    provider: "TypeSafe AI (hosted System One API)",
    available: false,
    status_label: "Needs key",
    detail: "Add JEV_API_KEY to the secrets file to enable Jev.",
  },
  {
    id: "gemini",
    name: "Gemini",
    provider: "Google AI Studio (gemini-decision-1, free tier)",
    available: false,
    status_label: "Needs key",
    detail: "Add GEMINI_API_KEY to the secrets file to enable Gemini Decision 1.",
  },
  {
    id: "laya",
    name: "Laya",
    provider: "Convai Innovations (Apache 2.0, local GPU)",
    available: true,
    status_label: "Active",
    detail: "ModernBERT-large for English and mmBERT-base for 100+ languages.",
  },
];

const PRESETS: RulePreset[] = [
  {
    id: "abc",
    name: "Topic A / B / C",
    instructions: "Read the paragraph and pick which choice (A, B, or C) matches its main topic.",
    gate: 0.7,
    choices: [
      { label: "A", description: "Software engineering, AI models, GPUs, or cloud infrastructure" },
      { label: "B", description: "Finance, supplier invoices, taxes, pricing, or bank transfers" },
      { label: "C", description: "Clinical care, hospital operations, lab results, or patient symptoms" },
    ],
    samples: [
      {
        label: "GPU weights (EN)",
        text: "Moving from 16-bit weights to 4-bit GGUF cut VRAM use on the 8 GB laptop GPU by half while keeping structured JSON tool calls accurate.",
      },
      {
        label: "Faktur pajak (ID)",
        text: "Tagihan bulan Oktober dari vendor kemasan selisih Rp 375.000 antara jumlah barang dikali harga satuan dengan angka total yang tercetak di faktur.",
      },
      {
        label: "Gejala pasien (ID)",
        text: "Pasien mengeluh sesak napas sejak pukul empat pagi disertai nyeri dada sebelah kiri dan meminta jadwal pemeriksaan dokter hari ini.",
      },
    ],
  },
  {
    id: "support",
    name: "Support queue",
    instructions: "Route the customer message to the desk that owns the next action.",
    gate: 0.7,
    choices: [
      { label: "Billing", description: "Invoices, duplicate charges, refunds, or tax receipts" },
      { label: "Technical", description: "API errors, login failures, bugs, or webhook timeouts" },
      { label: "Account", description: "Seat changes, workspace ownership, or plan upgrades" },
      { label: "Incident", description: "Production outage, security breach, or data loss" },
    ],
    samples: [
      {
        label: "Webhook 502",
        text: "Our production webhook started returning HTTP 502 every time an order payload contains more than twenty line items.",
      },
      {
        label: "Double charge",
        text: "Kartu perusahaan kami terpotong dua kali untuk langganan bulan Oktober. Mohon kirimkan bukti pengembalian dana.",
      },
      {
        label: "Add seats",
        text: "Please add four viewer seats to our Jakarta workspace before Monday morning and keep the current billing contact.",
      },
    ],
  },
  {
    id: "leads",
    name: "Lead intent",
    instructions: "Classify this inbound note by buying intent so sales knows who to call first.",
    gate: 0.65,
    choices: [
      { label: "Ready to buy", description: "Clear budget, timeline, or request for a contract or live pilot" },
      { label: "Exploring", description: "Asking technical questions or comparing options without a timeline" },
      { label: "Not a fit", description: "Job application, agency cold pitch, or unrelated message" },
    ],
    samples: [
      {
        label: "Pilot Q4",
        text: "We process 4,000 supplier invoices a month in Surabaya and have budget approved this quarter to run a two-week pilot.",
      },
      {
        label: "Architecture question",
        text: "Does your search service run on local embeddings or require an external API key? Just reading your docs for research.",
      },
      {
        label: "SEO pitch",
        text: "Hi team, we help SaaS founders rank number one on backlinks with our monthly guest post packages.",
      },
    ],
  },
  {
    id: "triage",
    name: "Hospital triage",
    instructions: "Pick the hospital desk that should handle this patient WhatsApp message.",
    gate: 0.7,
    choices: [
      { label: "IGD", description: "Chest pain, trouble breathing, heavy bleeding, fainting, or acute emergency" },
      { label: "Appointments", description: "Booking, rescheduling, or checking doctor clinic hours" },
      { label: "Results", description: "Lab blood work, radiology readings, or follow-up reports" },
      { label: "Billing", description: "BPJS referrals, insurance coverage letters, or hospital receipts" },
    ],
    samples: [
      {
        label: "Emergency (ID)",
        text: "Ayah saya tiba-tiba nyeri dada kiri menjalar ke lengan dan keluar keringat dingin sejak dua puluh menit lalu.",
      },
      {
        label: "Reschedule (EN)",
        text: "Could I move my Tuesday morning cardiology checkup with Dr. Hendra to Thursday afternoon instead?",
      },
      {
        label: "BPJS letter (ID)",
        text: "Apakah surat rujukan BPJS dari klinik tingkat pertama masih berlaku untuk kontrol ulang minggu depan?",
      },
    ],
  },
];

const DEFAULT_PRESET = PRESETS[0] as RulePreset;

const IMAGE_PRESETS: ImageRulePreset[] = [
  {
    id: "image-scenes",
    name: "Image scene A / B / C",
    instructions: "Inspect this image and decide which choice (A, B, or C) best matches its primary subject.",
    gate: 0.7,
    choices: [
      { label: "A", description: "Architecture, skyscrapers, bridges, or urban skylines" },
      { label: "B", description: "Ocean beaches, surfing, wildlife, mountains, or outdoor nature" },
      { label: "C", description: "Space, planets, rockets, robotics, or science laboratories" },
    ],
  },
  {
    id: "image-quality",
    name: "Visual safety & quality",
    instructions: "Classify whether this uploaded photo is sharp and publishable, blurry/occluded, or off-policy.",
    gate: 0.75,
    choices: [
      { label: "A", description: "Clear, well-lit photo suitable for catalogue publishing" },
      { label: "B", description: "Too dark, blurry, cropped, or unreadable subject" },
      { label: "C", description: "Text screenshot, blank slide, or unrelated non-photo graphic" },
    ],
  },
];

const DEFAULT_IMAGE_PRESET = IMAGE_PRESETS[0] as ImageRulePreset;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function normalizeImageMime(mime: string): "image/jpeg" | "image/png" {
  return mime === "image/png" ? mime : "image/jpeg";
}

// Dispatch takes names up to 120 characters, and downloaded files often have longer ones
function imageName(file: File, index: number): string {
  return (file.name || `image-${index + 1}.jpg`).slice(0, 120);
}

async function prepareImageFile(file: File, index: number): Promise<QueuedImage> {
  const rawBuffer = await file.arrayBuffer();
  const fallbackMime = normalizeImageMime(file.type);
  const fallbackBase64 = arrayBufferToBase64(rawBuffer);
  const fallbackPreview = `data:${fallbackMime};base64,${fallbackBase64}`;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1024;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width || 1, bitmap.height || 1));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
        const comma = dataUrl.indexOf(",");
        if (comma > 0) {
          bitmap.close();
          return {
            id: `img-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            name: imageName(file, index),
            mimeType: "image/jpeg",
            dataBase64: dataUrl.slice(comma + 1),
            previewUrl: dataUrl,
          };
        }
      }
      bitmap.close();
    } catch {
      // Fall back to raw encoded bytes when bitmap decode is unavailable.
    }
  }

  return {
    id: `img-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: imageName(file, index),
    mimeType: fallbackMime,
    dataBase64: fallbackBase64,
    previewUrl: fallbackPreview,
  };
}

function buildSampleSvg(kind: "skyline" | "ocean" | "planet"): string {
  if (kind === "skyline") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#fde047"/></linearGradient></defs>
      <rect width="480" height="360" fill="url(#g)"/>
      <circle cx="360" cy="95" r="42" fill="#fff7ed" opacity="0.9"/>
      <rect x="65" y="150" width="60" height="210" fill="#1e293b"/>
      <rect x="145" y="90" width="55" height="270" fill="#0f172a"/>
      <polygon points="232,25 256,140 264,360 200,360 208,140" fill="#1e293b"/>
      <rect x="285" y="125" width="70" height="235" fill="#334155"/>
      <rect x="370" y="175" width="55" height="185" fill="#1e293b"/>
    </svg>`;
  }
  if (kind === "ocean") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
      <rect width="480" height="220" fill="#38bdf8"/>
      <rect y="220" width="480" height="140" fill="#0284c7"/>
      <path d="M0 220 Q120 155 260 220 T480 215 L480 360 L0 360 Z" fill="#0369a1"/>
      <path d="M90 210 Q180 150 270 190" stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round"/>
      <ellipse cx="260" cy="235" rx="46" ry="12" transform="rotate(-18 260 235)" fill="#facc15"/>
      <circle cx="95" cy="75" r="32" fill="#fef08a"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
    <rect width="480" height="360" fill="#090d16"/>
    <circle cx="70" cy="65" r="2.5" fill="#f8fafc"/><circle cx="145" cy="40" r="2" fill="#93c5fd"/>
    <circle cx="380" cy="58" r="3" fill="#fde68a"/><circle cx="420" cy="290" r="2.5" fill="#f8fafc"/>
    <circle cx="90" cy="300" r="2" fill="#e2e8f0"/><circle cx="335" cy="310" r="2" fill="#cbd5e1"/>
    <circle cx="240" cy="180" r="78" fill="#dc2626"/>
    <circle cx="220" cy="160" r="56" fill="#ea580c" opacity="0.7"/>
    <ellipse cx="240" cy="182" rx="145" ry="30" transform="rotate(-14 240 182)" fill="none" stroke="#fed7aa" stroke-width="12"/>
  </svg>`;
}

async function createSampleImages(): Promise<QueuedImage[]> {
  const specs: Array<{ name: string; kind: "skyline" | "ocean" | "planet" }> = [
    { name: "skyline-tower.jpg", kind: "skyline" },
    { name: "ocean-surf.jpg", kind: "ocean" },
    { name: "planet-cosmos.jpg", kind: "planet" },
  ];
  return Promise.all(
    specs.map(async ({ name, kind }, index) => {
      const svgText = buildSampleSvg(kind);
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx && typeof Image !== "undefined") {
        try {
          const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
          const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = svgUrl;
          });
          ctx.drawImage(loaded, 0, 0, 480, 360);
          const jpegUrl = canvas.toDataURL("image/jpeg", 0.9);
          const comma = jpegUrl.indexOf(",");
          if (comma > 0) {
            return {
              id: `sample-${kind}-${index}`,
              name,
              mimeType: "image/jpeg",
              dataBase64: jpegUrl.slice(comma + 1),
              previewUrl: jpegUrl,
            };
          }
        } catch {
          // Fall through to compact solid-color PNG fallback if SVG rasterization fails.
        }
      }
      // Minimal 1x1 PNG fallback for headless test environments without Canvas 2D SVG rasterization.
      const fallbackPng =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      return {
        id: `sample-${kind}-${index}`,
        name: name.replace(".jpg", ".png"),
        mimeType: "image/png",
        dataBase64: fallbackPng,
        previewUrl: `data:image/png;base64,${fallbackPng}`,
      };
    }),
  );
}

const MODEL_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
    <path d="M2.5 4h11M2.5 8h7.5M2.5 12h4.5" />
  </svg>
);

const clockNow = () => new Date().toTimeString().slice(0, 5);
const probability = (value: number) => value.toFixed(2);

function toEditableChoices(choices: ChoiceOption[]): EditableChoice[] {
  return choices.map((choice, index) => ({
    key: `choice-${index}-${choice.label}`,
    label: choice.label,
    description: choice.description,
  }));
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="pilah-mark">
      <rect x="2" y="3" width="16" height="3" rx="1.5" />
      <rect x="2" y="8.5" width="11" height="3" rx="1.5" />
      <rect x="2" y="14" width="6" height="3" rx="1.5" />
    </svg>
  );
}

function Bar({
  label,
  description,
  value,
  chosen,
  tickAt,
}: {
  label: string;
  description: string;
  value: number;
  chosen: boolean;
  tickAt: number | null;
}) {
  return (
    <li className={chosen ? "chosen" : ""}>
      <div className="bar-label">
        <span className="name">{label}</span>
        {description && <span className="criteria">{description}</span>}
      </div>
      <span className="value">{probability(value)}</span>
      <span className="track">
        <i style={{ width: `${(value * 100).toFixed(1)}%` }} />
        {tickAt !== null && (
          <b style={{ left: `${(tickAt * 100).toFixed(1)}%` }} title={`Gate ${probability(tickAt)}`} />
        )}
      </span>
    </li>
  );
}

function validateRule(
  instructions: string,
  choices: EditableChoice[],
): { clean: ChoiceOption[]; problem: string | null } {
  if (!instructions.trim()) {
    return { clean: [], problem: "Write a sorting prompt first." };
  }
  const clean = choices.map((choice) => ({
    label: choice.label.trim(),
    description: choice.description.trim(),
  }));
  if (clean.length < 2) {
    return { clean, problem: "Add at least two choices." };
  }
  if (clean.some((choice) => choice.label.length === 0)) {
    return { clean, problem: "Give every choice a short label, such as A, B, or C." };
  }
  const uniqueLabels = new Set(clean.map((choice) => choice.label));
  if (uniqueLabels.size !== clean.length) {
    return { clean, problem: "Give each choice a distinct label." };
  }
  return { clean, problem: null };
}

// Laya reads text only. Jev and Gemini Decision read pictures too
const readsImages = (engine: EngineId) => engine !== "laya";

function samplesAsTexts(preset: RulePreset): TextItem[] {
  return preset.samples
    .slice(0, MAX_BATCH)
    .map((sample, index) => ({ id: `${preset.id}-${index}`, text: sample.text }));
}

export function PilahInbox() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET.id);
  const [imagePresetId, setImagePresetId] = useState<string>(DEFAULT_IMAGE_PRESET.id);
  const [selectedEngine, setSelectedEngine] = useState<EngineId>("jev");
  const [instructions, setInstructions] = useState<string>(DEFAULT_PRESET.instructions);
  const [confidenceGate, setConfidenceGate] = useState<number>(DEFAULT_PRESET.gate);
  const [choices, setChoices] = useState<EditableChoice[]>(() => toEditableChoices(DEFAULT_PRESET.choices));
  const [texts, setTexts] = useState<TextItem[]>(() => samplesAsTexts(DEFAULT_PRESET));
  const [textResultsById, setTextResultsById] = useState<Record<string, SortRun>>({});
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const [imageResultsById, setImageResultsById] = useState<Record<string, SortRun>>({});
  const [runs, setRuns] = useState<SortRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const nextCounter = useRef(1);
  const booted = useRef(false);

  const enginesQuery = useQuery({
    queryKey: ["pilah", "engines"],
    queryFn: async () => unwrap(await pilah.GET("/v1/engines")),
  });
  const engines = enginesQuery.data?.engines ?? DEFAULT_ENGINES;
  const activePreset = PRESETS.find((preset) => preset.id === presetId) ?? DEFAULT_PRESET;
  const selectedEngineName = engines.find((engineOption) => engineOption.id === selectedEngine)?.name ?? "Jev";

  const sortItems = useCallback(
    async (
      items: TextItem[],
      rule: {
        engine: EngineId;
        instructions: string;
        choices: EditableChoice[];
        gate: number;
      },
    ) => {
      const nonEmptyItems = items
        .map((item) => ({ ...item, text: item.text.trim() }))
        .filter((item) => item.text.length > 0);
      if (nonEmptyItems.length === 0) {
        setError("Enter at least one text to sort.");
        return;
      }
      const { clean, problem } = validateRule(rule.instructions, rule.choices);
      if (problem) {
        setError(problem);
        return;
      }

      setSorting(true);
      setError(null);
      try {
        const response = unwrap(
          await pilah.POST("/v1/sort", {
            body: {
              engine: rule.engine,
              instructions: rule.instructions.trim(),
              choices: clean,
              confidence_gate: rule.gate,
              items: nonEmptyItems.map((item) => item.text),
            },
          }),
        );
        const stamp = clockNow();
        const perItemLatency = response.latency_ms / Math.max(response.results.length, 1);
        const nextMap: Record<string, SortRun> = {};
        const created: SortRun[] = response.results.map((result, index) => {
          const runNumber = nextCounter.current++;
          const item = nonEmptyItems[index];
          const run: SortRun = {
            id: `run-${runNumber}`,
            at: stamp,
            text: item?.text ?? "",
            engine: response.engine,
            latencyMs: perItemLatency,
            gate: response.confidence_gate,
            choices: clean,
            result,
          };
          if (item) nextMap[item.id] = run;
          return run;
        });
        setTextResultsById((previous) => ({ ...previous, ...nextMap }));
        setRuns((previous) => [...created, ...previous].slice(0, 24));
        if (created[0]) {
          setSelectedRunId(created[0].id);
        }
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Dispatch did not answer.");
      } finally {
        setSorting(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (booted.current || !enginesQuery.data) return;
    booted.current = true;
    const initialEngine =
      enginesQuery.data.default_engine ?? enginesQuery.data.engines.find((option) => option.available)?.id ?? "jev";
    setSelectedEngine(initialEngine);
    // One example answered on arrival, so the screen opens with a real prediction
    void sortItems(samplesAsTexts(DEFAULT_PRESET).slice(0, 1), {
      engine: initialEngine,
      instructions: DEFAULT_PRESET.instructions,
      choices: toEditableChoices(DEFAULT_PRESET.choices),
      gate: DEFAULT_PRESET.gate,
    });
  }, [enginesQuery.data, sortItems]);

  function applyPreset(preset: RulePreset) {
    setPresetId(preset.id);
    setInstructions(preset.instructions);
    setConfidenceGate(preset.gate);
    setChoices(toEditableChoices(preset.choices));
    setTexts(samplesAsTexts(preset));
    setTextResultsById({});
  }

  function applyImagePreset(preset: ImageRulePreset) {
    setImagePresetId(preset.id);
    setInstructions(preset.instructions);
    setConfidenceGate(preset.gate);
    setChoices(toEditableChoices(preset.choices));
  }

  const sortImages = useCallback(
    async (
      images: QueuedImage[],
      rule: { engine: EngineId; instructions: string; choices: EditableChoice[]; gate: number },
    ) => {
      if (images.length === 0) {
        setError("Add between 1 and 10 images to classify.");
        return;
      }
      const { clean, problem } = validateRule(rule.instructions, rule.choices);
      if (problem) {
        setError(problem);
        return;
      }
      setSorting(true);
      setError(null);
      try {
        const payloadImages: ImageItemInput[] = images.map((img) => ({
          name: img.name,
          mime_type: img.mimeType,
          data_base64: img.dataBase64,
        }));
        const response = unwrap(
          await pilah.POST("/v1/sort/images", {
            body: {
              engine: rule.engine,
              instructions: rule.instructions.trim(),
              choices: clean,
              confidence_gate: rule.gate,
              images: payloadImages,
            },
          }),
        );
        const stamp = clockNow();
        const perItemLatency = response.latency_ms / Math.max(response.results.length, 1);
        const nextMap: Record<string, SortRun> = {};
        const created: SortRun[] = response.results.map((result, index) => {
          const runNumber = nextCounter.current++;
          const img = images[index];
          const run: SortRun = {
            id: `run-${runNumber}`,
            at: stamp,
            text: img?.name ?? `Image ${index + 1}`,
            imagePreviewUrl: img?.previewUrl,
            engine: response.engine,
            latencyMs: perItemLatency,
            gate: response.confidence_gate,
            choices: clean,
            result,
          };
          if (img) nextMap[img.id] = run;
          return run;
        });
        setImageResultsById((prev) => ({ ...prev, ...nextMap }));
        setRuns((previous) => [...created, ...previous].slice(0, 24));
        if (created[0]) {
          setSelectedRunId(created[0].id);
        }
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Dispatch did not answer.");
      } finally {
        setSorting(false);
      }
    },
    [],
  );

  function switchInputMode(nextMode: InputMode) {
    if (nextMode === inputMode) return;
    setInputMode(nextMode);
    setError(null);
    if (nextMode === "images" && !readsImages(selectedEngine)) {
      setSelectedEngine(engines.find((option) => option.available && readsImages(option.id))?.id ?? "jev");
    }
    // Each input keeps its own rule: switching brings back the preset chosen for that input, and its test items stay
    const rule =
      nextMode === "images"
        ? (IMAGE_PRESETS.find((preset) => preset.id === imagePresetId) ?? DEFAULT_IMAGE_PRESET)
        : activePreset;
    setInstructions(rule.instructions);
    setConfidenceGate(rule.gate);
    setChoices(toEditableChoices(rule.choices));
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (picked.length === 0) return;
    const remainingSlots = Math.max(0, MAX_BATCH - queuedImages.length);
    const slice = picked.slice(0, remainingSlots);
    const prepared = await Promise.all(slice.map((file, idx) => prepareImageFile(file, idx)));
    setQueuedImages((prev) => [...prev, ...prepared].slice(0, MAX_BATCH));
    if (picked.length > remainingSlots) {
      setError("Up to 10 images can be queued in one batch.");
    } else {
      setError(null);
    }
  }

  async function handleLoadSampleImages() {
    const samples = await createSampleImages();
    setQueuedImages(samples);
    setImageResultsById({});
    setError(null);
  }

  function removeQueuedImage(id: string) {
    setQueuedImages((prev) => prev.filter((img) => img.id !== id));
  }

  function updateText(id: string, text: string) {
    setTexts((previous) => previous.map((item) => (item.id === id ? { ...item, text } : item)));
  }

  function addText() {
    if (texts.length >= MAX_BATCH) return;
    setTexts((previous) => [...previous, { id: `text-${nextCounter.current++}`, text: "" }]);
  }

  function removeText(id: string) {
    setTexts((previous) => (previous.length <= 1 ? previous : previous.filter((item) => item.id !== id)));
  }

  function updateChoice(key: string, field: "label" | "description", value: string) {
    setChoices((previous) => previous.map((choice) => (choice.key === key ? { ...choice, [field]: value } : choice)));
  }

  function addChoice() {
    if (choices.length >= 10) return;
    const nextLetter = String.fromCharCode(65 + choices.length);
    const label = choices.some((choice) => choice.label.trim().toUpperCase() === nextLetter)
      ? `Option ${choices.length + 1}`
      : nextLetter;
    const id = nextCounter.current++;
    setChoices((previous) => [...previous, { key: `added-${id}`, label, description: "" }]);
  }

  function removeChoice(key: string) {
    if (choices.length <= 2) return;
    setChoices((previous) => previous.filter((choice) => choice.key !== key));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inputMode === "images") {
      void sortImages(queuedImages, { engine: selectedEngine, instructions, choices, gate: confidenceGate });
      return;
    }
    void sortItems(texts, {
      engine: selectedEngine,
      instructions,
      choices,
      gate: confidenceGate,
    });
  }

  const activeRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const subtitle = error
    ? error
    : activeRun
      ? `Last prediction: ${activeRun.result.choice} (${probability(activeRun.result.top_probability)}) in ${Math.round(activeRun.latencyMs)} ms via ${activeRun.engine} (${activeRun.result.checkpoint}).`
      : "Write your own prompt and choices, then sort any paragraph or up to 10 images with calibrated probabilities.";

  return (
    <AppShell
      product="Dispatch"
      guide="dispatch"
      mark={<Mark size={20} />}
      scope={{ line: "System 1 model", detail: "Custom prompt and choices" }}
      nav={[
        { label: "System 1 model", to: "/dispatch", icon: MODEL_ICON, count: runs.length || undefined, current: true },
      ]}
      sidebar={
        <>
          <fieldset className="side-group">
            <legend>Input</legend>
            {(["text", "images"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="nav-item"
                aria-pressed={inputMode === mode}
                onClick={() => switchInputMode(mode)}
              >
                {mode === "text" ? "Text" : "Images"}
                <small>1 to {MAX_BATCH}</small>
              </button>
            ))}
          </fieldset>
          <fieldset className="side-group">
            <legend>Model</legend>
            {engines.map((engineOption) => {
              const textOnly = inputMode === "images" && !readsImages(engineOption.id);
              return (
                <button
                  key={engineOption.id}
                  type="button"
                  className="nav-item"
                  aria-pressed={selectedEngine === engineOption.id}
                  disabled={!engineOption.available || textOnly}
                  title={textOnly ? `${engineOption.name} reads text only` : engineOption.detail}
                  onClick={() => setSelectedEngine(engineOption.id)}
                >
                  {engineOption.name}
                  {!engineOption.available && <small>{engineOption.status_label}</small>}
                  {engineOption.available && textOnly && <small>Text only</small>}
                </button>
              );
            })}
          </fieldset>
        </>
      }
    >
      <div className="title-row">
        <div>
          <h1>System 1 Model</h1>
          <p className="sub">{subtitle}</p>
        </div>
      </div>

      <div className="pilah-workbench">
        <section className="panel pilah-rule" aria-label="Sorting rule">
          <header>
            <h2>Rule and choices</h2>
            {inputMode === "text" ? (
              <label className="pilah-select-wrap">
                <span>Preset</span>
                <select
                  className="input pilah-select"
                  aria-label="Rule preset"
                  value={presetId}
                  onChange={(event) => {
                    const chosenPreset = PRESETS.find((preset) => preset.id === event.target.value);
                    if (chosenPreset) applyPreset(chosenPreset);
                  }}
                >
                  {PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="pilah-select-wrap">
                <span>Preset</span>
                <select
                  className="input pilah-select"
                  aria-label="Rule preset"
                  value={imagePresetId}
                  onChange={(event) => {
                    const chosenPreset = IMAGE_PRESETS.find((preset) => preset.id === event.target.value);
                    if (chosenPreset) applyImagePreset(chosenPreset);
                  }}
                >
                  {IMAGE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </header>

          <div className="field">
            <label htmlFor="pilah-instructions">Prompt</label>
            <textarea
              id="pilah-instructions"
              className="pilah-textarea"
              rows={3}
              maxLength={2000}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="State the rule for sorting each input paragraph"
            />
          </div>

          <div className="pilah-choices-head">
            <span className="pilah-label">Choices ({choices.length} of 10)</span>
            <button type="button" className="btn" disabled={choices.length >= 10} onClick={addChoice}>
              Add choice
            </button>
          </div>

          <ul className="pilah-choices-list">
            {choices.map((choice, index) => (
              <li key={choice.key} className="pilah-choice-row">
                <input
                  type="text"
                  className="input pilah-choice-code"
                  aria-label={`Choice ${index + 1} label`}
                  placeholder="Label"
                  maxLength={80}
                  value={choice.label}
                  onChange={(event) => updateChoice(choice.key, "label", event.target.value)}
                />
                <input
                  type="text"
                  className="input pilah-choice-desc"
                  aria-label={`Choice ${index + 1} description`}
                  placeholder="Optional criteria so the model knows what belongs here"
                  maxLength={400}
                  value={choice.description}
                  onChange={(event) => updateChoice(choice.key, "description", event.target.value)}
                />
                <button
                  type="button"
                  className="btn ghost pilah-choice-remove"
                  disabled={choices.length <= 2}
                  aria-label={`Remove choice ${choice.label || index + 1}`}
                  onClick={() => removeChoice(choice.key)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="field pilah-gate-field">
            <div className="pilah-gate-row">
              <label htmlFor="pilah-gate">Confidence gate</label>
              <strong className="num">{probability(confidenceGate)}</strong>
            </div>
            <input
              id="pilah-gate"
              type="range"
              min="0.40"
              max="0.95"
              step="0.05"
              value={confidenceGate}
              onChange={(event) => setConfidenceGate(Number(event.target.value))}
            />
            <span className="hint">
              Below {probability(confidenceGate)} means low confidence and needs a human judge.
            </span>
          </div>
        </section>

        <div className="pilah-right">
          <form
            className="panel pilah-test"
            onSubmit={handleSubmit}
            aria-label={inputMode === "images" ? "Test images" : "Test paragraph"}
          >
            <header>
              <h2>{inputMode === "images" ? `Test images (1 to ${MAX_BATCH})` : `Test texts (1 to ${MAX_BATCH})`}</h2>
              {inputMode === "text" ? (
                <div className="pilah-image-toolbar">
                  <button type="button" className="btn" onClick={() => applyPreset(activePreset)}>
                    Load {Math.min(activePreset.samples.length, MAX_BATCH)} samples
                  </button>
                  <button type="button" className="btn" disabled={texts.length >= MAX_BATCH} onClick={addText}>
                    Add text
                  </button>
                </div>
              ) : (
                <div className="pilah-image-toolbar">
                  <button type="button" className="btn" onClick={() => void handleLoadSampleImages()}>
                    Load 3 sample images
                  </button>
                  <label className="btn pilah-upload-label">
                    Choose images
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      className="visually-hidden"
                      aria-label="Choose images to classify"
                      onChange={(event) => void handleFileSelection(event)}
                    />
                  </label>
                </div>
              )}
            </header>

            {inputMode === "text" ? (
              <ul className="pilah-text-list" aria-label="Texts to sort">
                {texts.map((item, index) => {
                  const run = textResultsById[item.id];
                  return (
                    <li key={item.id} className={run && activeRun?.id === run.id ? "is-selected" : undefined}>
                      <textarea
                        className="pilah-textarea"
                        aria-label={`Text ${index + 1}`}
                        rows={3}
                        maxLength={4000}
                        placeholder="Write or paste a text in English or Indonesian..."
                        value={item.text}
                        onChange={(event) => updateText(item.id, event.target.value)}
                        onFocus={() => {
                          if (run) setSelectedRunId(run.id);
                        }}
                      />
                      <div className="pilah-text-side">
                        {run && (
                          <button type="button" className="pill-button" onClick={() => setSelectedRunId(run.id)}>
                            <span className={`pill ${run.result.passed_gate ? "pos" : "warn"}`}>
                              {run.result.choice} · {probability(run.result.top_probability)}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={texts.length <= 1}
                          aria-label={`Remove text ${index + 1}`}
                          onClick={() => removeText(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : queuedImages.length === 0 ? (
              <div className="pilah-image-empty">
                <p>Upload 1 to {MAX_BATCH} images (JPEG or PNG) or load 3 sample images to classify into A, B, C...</p>
              </div>
            ) : (
              <ul className="pilah-image-grid" aria-label="Queued images">
                {queuedImages.map((img) => {
                  const run = imageResultsById[img.id];
                  const selected = run && activeRun?.id === run.id;
                  return (
                    <li key={img.id} className={selected ? "pilah-image-card is-selected" : "pilah-image-card"}>
                      <button
                        type="button"
                        className="pilah-image-select"
                        onClick={() => {
                          if (run) setSelectedRunId(run.id);
                        }}
                      >
                        <img src={img.previewUrl} alt={img.name} />
                        <span className="pilah-image-name">{img.name}</span>
                        {run && (
                          <span className={`pill ${run.result.passed_gate ? "pos" : "warn"}`}>
                            {run.result.choice} · {probability(run.result.top_probability)}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="pilah-image-remove"
                        aria-label={`Remove ${img.name}`}
                        onClick={() => removeQueuedImage(img.id)}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="pilah-actions">
              {inputMode === "text" ? (
                <button type="submit" className="btn primary" disabled={sorting}>
                  {sorting
                    ? "Sorting..."
                    : `Sort ${texts.length} ${texts.length === 1 ? "text" : "texts"} with ${selectedEngineName}`}
                </button>
              ) : (
                <>
                  <button type="submit" className="btn primary" disabled={sorting || queuedImages.length === 0}>
                    {sorting
                      ? "Sorting..."
                      : `Sort ${queuedImages.length || ""} ${queuedImages.length === 1 ? "image" : "images"} with ${selectedEngineName}`}
                  </button>
                  {queuedImages.length > 0 && (
                    <button
                      type="button"
                      className="btn"
                      disabled={sorting}
                      onClick={() => {
                        setQueuedImages([]);
                        setImageResultsById({});
                      }}
                    >
                      Clear images
                    </button>
                  )}
                </>
              )}
              {error && (
                <span className="pilah-error" role="alert">
                  {error}
                </span>
              )}
            </div>
            {selectedEngine === "gemini" && (
              <p className="hint">
                Note: Gemini runs on Google AI Studio's free tier (3-key rotation), so submitted inputs are sent to
                Google.
              </p>
            )}
          </form>

          <section className="well pilah-prediction" aria-label="Model prediction">
            <div className="pilah-verdict-head">
              <h3>Prediction</h3>
              {activeRun && (
                <span className={`pill ${activeRun.result.passed_gate ? "pos" : "warn"}`}>
                  {activeRun.result.passed_gate ? "Clears gate" : "Needs human judge"}
                </span>
              )}
            </div>

            {activeRun ? (
              <>
                {activeRun.imagePreviewUrl ? (
                  <div className="pilah-quote-image">
                    <img src={activeRun.imagePreviewUrl} alt={activeRun.text} />
                    <span>{activeRun.text}</span>
                  </div>
                ) : (
                  <p className="pilah-quote">{activeRun.text}</p>
                )}
                <ul className="bars">
                  {activeRun.choices.map((choice) => (
                    <Bar
                      key={choice.label}
                      label={choice.label}
                      description={choice.description}
                      value={activeRun.result.probabilities[choice.label] ?? 0}
                      chosen={choice.label === activeRun.result.choice}
                      tickAt={choice.label === activeRun.result.choice ? activeRun.gate : null}
                    />
                  ))}
                </ul>
                <dl className="pilah-run-meta">
                  <div>
                    <dt>Engine</dt>
                    <dd>{activeRun.engine}</dd>
                  </div>
                  <div>
                    <dt>Checkpoint</dt>
                    <dd>{activeRun.result.checkpoint}</dd>
                  </div>
                  <div>
                    <dt>Gate</dt>
                    <dd>{probability(activeRun.gate)}</dd>
                  </div>
                  <div>
                    <dt>Latency</dt>
                    <dd>{Math.round(activeRun.latencyMs)} ms</dd>
                  </div>
                </dl>
              </>
            ) : (
              <span className="skeleton" style={{ height: 140 }} />
            )}
          </section>

          {runs.length > 0 && (
            <section className="panel pilah-history" aria-label="Recent runs">
              <header>
                <h2>Session runs</h2>
                <span className="meta">{runs.length} sorted</span>
              </header>
              <ul className="pilah-run-list">
                {runs.slice(0, 6).map((run) => (
                  <li key={run.id}>
                    <button
                      type="button"
                      className="pilah-run-row"
                      aria-current={activeRun?.id === run.id}
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <span className="pilah-run-text">{run.text}</span>
                      <span className="pilah-run-right">
                        <span className={`pill ${run.result.passed_gate ? "pos" : "warn"}`}>
                          {run.result.choice} · {probability(run.result.top_probability)}
                        </span>
                        <span className="pilah-run-time">{run.at}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
