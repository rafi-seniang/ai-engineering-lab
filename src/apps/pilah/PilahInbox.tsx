import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { type ChoiceOption, type EngineOption, pilah, type SortedItem, unwrap } from "../../api/pilah";
import { AppShell } from "../shared/AppShell";
import "./inbox.css";

interface EditableChoice extends ChoiceOption {
  key: string;
}

interface RulePreset {
  id: string;
  name: string;
  instructions: string;
  gate: number;
  choices: ChoiceOption[];
  samples: { label: string; text: string }[];
}

interface SortRun {
  id: string;
  at: string;
  text: string;
  engine: string;
  latencyMs: number;
  gate: number;
  choices: ChoiceOption[];
  result: SortedItem;
}

const DEFAULT_ENGINES: EngineOption[] = [
  {
    id: "laya",
    name: "Laya",
    provider: "Convai Innovations (Apache 2.0, local GPU)",
    available: true,
    status_label: "Active",
    detail: "ModernBERT-large for English and mmBERT-base for 100+ languages.",
  },
  {
    id: "jev",
    name: "Jev",
    provider: "TypeSafe AI (hosted System One API)",
    available: false,
    status_label: "Needs key",
    detail: "Add JEV_API_KEY to the secrets file to enable Jev.",
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

export function PilahInbox() {
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET.id);
  const [sampleIndex, setSampleIndex] = useState<number>(0);
  const [selectedEngine, setSelectedEngine] = useState<"laya" | "jev">("laya");
  const [instructions, setInstructions] = useState<string>(DEFAULT_PRESET.instructions);
  const [confidenceGate, setConfidenceGate] = useState<number>(DEFAULT_PRESET.gate);
  const [choices, setChoices] = useState<EditableChoice[]>(() => toEditableChoices(DEFAULT_PRESET.choices));
  const [draftText, setDraftText] = useState<string>(DEFAULT_PRESET.samples[0]?.text ?? "");
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
  const selectedEngineName = engines.find((engineOption) => engineOption.id === selectedEngine)?.name ?? "Laya";

  const sortItems = useCallback(
    async (
      items: string[],
      rule: {
        engine: "laya" | "jev";
        instructions: string;
        choices: EditableChoice[];
        gate: number;
      },
    ) => {
      const nonEmptyItems = items.map((item) => item.trim()).filter((item) => item.length > 0);
      if (nonEmptyItems.length === 0) {
        setError("Enter a paragraph to sort.");
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
              items: nonEmptyItems,
            },
          }),
        );
        const stamp = clockNow();
        const perItemLatency = response.latency_ms / Math.max(response.results.length, 1);
        const created: SortRun[] = response.results.map((result, index) => {
          const runNumber = nextCounter.current++;
          return {
            id: `run-${runNumber}`,
            at: stamp,
            text: nonEmptyItems[index] ?? "",
            engine: response.engine,
            latencyMs: perItemLatency,
            gate: response.confidence_gate,
            choices: clean,
            result,
          };
        });
        setRuns((previous) => [...created, ...previous].slice(0, 24));
        if (created[0]) {
          setSelectedRunId(created[0].id);
        }
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Dispatch did not answer on port 8010.");
      } finally {
        setSorting(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const firstSample = DEFAULT_PRESET.samples[0]?.text;
    if (firstSample) {
      void sortItems([firstSample], {
        engine: "laya",
        instructions: DEFAULT_PRESET.instructions,
        choices: toEditableChoices(DEFAULT_PRESET.choices),
        gate: DEFAULT_PRESET.gate,
      });
    }
  }, [sortItems]);

  function applyPreset(preset: RulePreset) {
    const nextChoices = toEditableChoices(preset.choices);
    const firstSample = preset.samples[0]?.text ?? "";
    setPresetId(preset.id);
    setSampleIndex(0);
    setInstructions(preset.instructions);
    setConfidenceGate(preset.gate);
    setChoices(nextChoices);
    setDraftText(firstSample);
    if (firstSample) {
      void sortItems([firstSample], {
        engine: selectedEngine,
        instructions: preset.instructions,
        choices: nextChoices,
        gate: preset.gate,
      });
    }
  }

  function applySample(index: number) {
    const sample = activePreset.samples[index];
    if (!sample) return;
    setSampleIndex(index);
    setDraftText(sample.text);
    void sortItems([sample.text], {
      engine: selectedEngine,
      instructions,
      choices,
      gate: confidenceGate,
    });
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
    void sortItems([draftText], {
      engine: selectedEngine,
      instructions,
      choices,
      gate: confidenceGate,
    });
  }

  function handleRunSamples() {
    void sortItems(
      activePreset.samples.map((sample) => sample.text),
      {
        engine: selectedEngine,
        instructions,
        choices,
        gate: confidenceGate,
      },
    );
  }

  const activeRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const subtitle = error
    ? error
    : activeRun
      ? `Last prediction: ${activeRun.result.choice} (${probability(activeRun.result.top_probability)}) in ${Math.round(activeRun.latencyMs)} ms via ${activeRun.engine} (${activeRun.result.checkpoint}).`
      : "Write your own prompt and choices, then sort any paragraph with a calibrated System 1 model.";

  return (
    <AppShell
      product="Dispatch"
      mark={<Mark size={20} />}
      scope={{ line: "System 1 model", detail: "Custom prompt and choices" }}
      nav={[
        { label: "System 1 model", to: "/dispatch", icon: MODEL_ICON, count: runs.length || undefined, current: true },
      ]}
    >
      <div className="title-row">
        <div>
          <h1>System 1 Model</h1>
          <p className="sub">{subtitle}</p>
        </div>
        <div className="title-actions">
          <fieldset className="segmented pilah-engines" aria-label="System 1 model">
            <legend className="visually-hidden">System 1 model</legend>
            {engines.map((engineOption) => (
              <button
                key={engineOption.id}
                type="button"
                aria-pressed={selectedEngine === engineOption.id}
                disabled={!engineOption.available}
                title={engineOption.detail}
                onClick={() => {
                  if (engineOption.available) setSelectedEngine(engineOption.id);
                }}
              >
                {engineOption.available ? engineOption.name : `${engineOption.name} · ${engineOption.status_label}`}
              </button>
            ))}
          </fieldset>
        </div>
      </div>

      <div className="pilah-workbench">
        <section className="panel pilah-rule" aria-label="Sorting rule">
          <header>
            <h2>Rule and choices</h2>
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
          <form className="panel pilah-test" onSubmit={handleSubmit} aria-label="Test paragraph">
            <header>
              <h2>Test input</h2>
              <label className="pilah-select-wrap">
                <span>Sample</span>
                <select
                  className="input pilah-select"
                  aria-label="Sample input"
                  value={sampleIndex}
                  onChange={(event) => applySample(Number(event.target.value))}
                >
                  {activePreset.samples.map((sample, index) => (
                    <option key={sample.label} value={index}>
                      {sample.label}
                    </option>
                  ))}
                </select>
              </label>
            </header>

            <textarea
              id="pilah-input"
              className="pilah-textarea"
              aria-label="Paragraph to sort"
              rows={3}
              maxLength={4000}
              placeholder="Write or paste a paragraph in English or Indonesian..."
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
            />

            <div className="pilah-actions">
              <button type="submit" className="btn primary" disabled={sorting}>
                {sorting ? "Sorting..." : `Sort with ${selectedEngineName}`}
              </button>
              <button type="button" className="btn" disabled={sorting} onClick={handleRunSamples}>
                Sort {activePreset.samples.length} samples
              </button>
              {error && (
                <span className="pilah-error" role="alert">
                  {error}
                </span>
              )}
            </div>
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
                <p className="pilah-quote">{activeRun.text}</p>
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
                      onClick={() => {
                        setSelectedRunId(run.id);
                        setDraftText(run.text);
                      }}
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
