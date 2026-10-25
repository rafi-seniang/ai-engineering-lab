import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  type Check,
  fileForm,
  type InvoicePayment,
  ledger,
  type PaymentMatch,
  pageUrl,
  type ReadInvoice,
  unwrap,
} from "../../api/ledger";
import { AppShell } from "../shared/AppShell";
import "./ledger.css";

type Tab = "invoices" | "statement";

const rupiah = (amount: number | null | undefined) =>
  amount == null ? "-" : `Rp ${Math.round(amount).toLocaleString("id-ID")}`;

const PAYMENT_PILLS: Record<InvoicePayment["status"], string> = {
  paid: "pos",
  "part paid": "warn",
  "paid twice": "neg",
  overpaid: "neg",
  unpaid: "",
  duplicate: "neg",
  "no total": "warn",
};

const CHECK_LABELS: Record<string, string> = {
  has_supplier: "Supplier read",
  has_invoice_number: "Invoice number read",
  has_invoice_date: "Invoice date read",
  invoice_date_is_a_date: "Invoice date is a date",
  due_date_is_a_date: "Due date is a date",
  due_after_invoice_date: "Due after the invoice date",
  lines_sum_to_subtotal: "Lines add up to the subtotal",
  tax_is_ppn: "PPN is 11% of the subtotal",
  total_adds_up: "Subtotal plus PPN is the total",
  not_a_duplicate: "Not already in the ledger",
};

function checkLabel(check: Check): string {
  const line = /^line_(\d+)_adds_up$/.exec(check.name);
  if (line) return `Line ${line[1]}: quantity times price`;
  const amount = /^(.+)_is_an_amount$/.exec(check.name);
  if (amount?.[1]) return `${amount[1].replaceAll("_", " ")} is a readable amount`;
  return CHECK_LABELS[check.name] ?? check.name;
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="2" opacity="0.35" />
      <rect x="6" y="6" width="8" height="2" rx="1" />
      <rect x="6" y="10" width="8" height="2" rx="1" />
      <rect x="10" y="14" width="4" height="2" rx="1" />
    </svg>
  );
}

const BOOK_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="3" y="2" width="10" height="12" rx="1.5" />
    <path d="M5.5 5.5h5M5.5 8h5M8 10.5h2.5" />
  </svg>
);

function PaymentPill({ payment }: { payment: InvoicePayment | undefined }) {
  if (!payment) return <span className="pill">checking</span>;
  return <span className={`pill ${PAYMENT_PILLS[payment.status]}`}>{payment.status}</span>;
}

function Detail({
  read,
  payment,
  matches,
  onClose,
}: {
  read: ReadInvoice;
  payment: InvoicePayment | undefined;
  matches: PaymentMatch[];
  onClose: () => void;
}) {
  const { invoice } = read;
  const failed = read.checks.filter((check) => !check.passed);
  const passed = read.checks.filter((check) => check.passed);
  return (
    <aside className="panel ledger-detail" aria-label="Selected invoice">
      <header>
        <div>
          <h2>{invoice.supplier_name ?? "Supplier not read"}</h2>
          <p className="meta">{invoice.invoice_number ?? "No number read"}</p>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </header>
      <a href={pageUrl(read)} target="_blank" rel="noreferrer" className="ledger-page">
        <img src={pageUrl(read)} alt={`Invoice ${invoice.invoice_number ?? read.file_name} as the model saw it`} />
      </a>

      <section aria-label="Checks">
        <h3>
          {failed.length
            ? `${failed.length} of ${read.checks.length} checks failed`
            : `All ${read.checks.length} checks pass`}
        </h3>
        <ul className="ledger-checks">
          {[...failed, ...passed].map((check) => (
            <li key={check.name} className={check.passed ? "is-pass" : "is-fail"}>
              <span className="ledger-check-mark" aria-hidden="true" />
              <span>
                {checkLabel(check)}
                {!check.passed && check.detail && <small>{check.detail}</small>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <dl className="facts">
        <div>
          <dt>Invoice date</dt>
          <dd>{invoice.invoice_date ?? "-"}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{invoice.due_date ?? "-"}</dd>
        </div>
        <div>
          <dt>Subtotal</dt>
          <dd>{rupiah(invoice.subtotal)}</dd>
        </div>
        <div>
          <dt>PPN</dt>
          <dd>{invoice.tax == null ? "none charged" : rupiah(invoice.tax)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{rupiah(invoice.total)}</dd>
        </div>
        <div>
          <dt>Read by</dt>
          <dd>
            {read.usage.model.split("/").pop()}, {(read.read_ms / 1000).toFixed(1)} s
          </dd>
        </div>
      </dl>

      <section aria-label="Lines">
        <h3>Lines as read</h3>
        <table className="ledger-lines">
          <thead>
            <tr>
              <th>Item</th>
              <th className="n">Qty</th>
              <th className="n">Price</th>
              <th className="n">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines ?? []).map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: printed lines have no identity but their order
              <tr key={index}>
                <td>{line.description}</td>
                <td className="n num">{line.quantity}</td>
                <td className="n num">{rupiah(line.unit_price)}</td>
                <td className="n num">{rupiah(line.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Payments">
        <h3>
          Payment <PaymentPill payment={payment} />
        </h3>
        {matches.length === 0 ? (
          <p className="meta">No debit on the statement pays this invoice.</p>
        ) : (
          <ul className="ledger-payments">
            {matches.map((match) => (
              <li key={match.line.position}>
                <span>
                  {match.line.date} <b>{match.line.description}</b>
                </span>
                <span className="num">{rupiah(match.line.debit)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

export function LedgerBook() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("view") === "statement" ? "statement" : "invoices";
  const selectedId = params.get("invoice");
  const [failure, setFailure] = useState<string | null>(null);

  const meta = useQuery({ queryKey: ["ledger", "meta"], queryFn: async () => unwrap(await ledger.GET("/meta")) });
  const invoices = useQuery({
    queryKey: ["ledger", "invoices"],
    queryFn: async () => unwrap(await ledger.GET("/v1/invoices")),
  });
  const reconciliation = useQuery({
    queryKey: ["ledger", "reconciliation"],
    queryFn: async () => unwrap(await ledger.GET("/v1/reconciliation")),
  });

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ["ledger"] });
  }
  const readInvoice = useMutation({
    mutationFn: async (file: File) =>
      unwrap(await ledger.POST("/v1/invoices", { body: { file: "" }, bodySerializer: () => fileForm(file) })),
    onMutate: () => setFailure(null),
    onSuccess: async (read) => {
      await refresh();
      update({ invoice: read.id, view: null });
    },
    onError: (error) => setFailure(error.message),
  });
  const putStatement = useMutation({
    mutationFn: async (file: File) =>
      unwrap(await ledger.PUT("/v1/statement", { body: { file: "" }, bodySerializer: () => fileForm(file) })),
    onMutate: () => setFailure(null),
    onSuccess: refresh,
    onError: (error) => setFailure(error.message),
  });

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  const reads = invoices.data ?? [];
  const book = reconciliation.data;
  const paymentById = new Map((book?.invoices ?? []).map((payment) => [payment.invoice_id, payment]));
  const readById = new Map(reads.map((read) => [read.id, read]));
  const selected = selectedId ? readById.get(selectedId) : undefined;
  const needLook = reads.filter((read) => read.status !== "clear").length;
  const offline = invoices.isError && meta.isError;

  let finding = "Reading the ledger.";
  if (offline) finding = "Ledger is not running on port 8040.";
  else if (invoices.data && reads.length === 0)
    finding = "No invoices yet. Read one, or run the eval to load the sample month.";
  else if (invoices.data && book) {
    const debits = book.unmatched_debits;
    finding = `${reads.length} invoices. ${needLook} need a look before payment, ${rupiah(book.open_amount)} is still open, and ${debits} debit${debits === 1 ? "" : "s"} pay no invoice.`;
  } else if (invoices.data)
    finding = `${reads.length} invoices. ${needLook} need a look before payment. Matching the statement.`;

  const tabs: { id: Tab; label: string; count: number | undefined }[] = [
    { id: "invoices", label: "Invoices", count: reads.length },
    { id: "statement", label: "Bank statement", count: book?.payments.length },
  ];

  return (
    <AppShell
      product="Ledger"
      mark={<Mark size={20} />}
      scope={{ line: "Kedai Kopi Senja", detail: "Accounts payable, Bandung" }}
      nav={[{ label: "Ledger", to: "/ledger", icon: BOOK_ICON, current: true, count: needLook || undefined }]}
      className={selected ? "show-detail" : undefined}
      sidebarFooter={
        <dl className="facts">
          <div>
            <dt>Model</dt>
            <dd>{meta.data?.engine.split("/").pop() ?? "-"}</dd>
          </div>
          <div>
            <dt>Checks</dt>
            <dd>in code</dd>
          </div>
        </dl>
      }
    >
      <div className="title-row">
        <div>
          <h1>Ledger</h1>
          <p className="sub">{finding}</p>
        </div>
        <div className="title-actions">
          {readInvoice.isPending && <span className="stamp">Reading with {meta.data?.engine ?? "the model"}</span>}
          <label className={`btn primary ledger-upload${readInvoice.isPending ? " is-busy" : ""}`}>
            {readInvoice.isPending ? "Reading" : "Read an invoice"}
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="visually-hidden"
              disabled={readInvoice.isPending || offline}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) readInvoice.mutate(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <section className="kpis ledger-kpis" aria-label="Totals">
        <div className="kpi">
          <div className="kpi-label">Invoices</div>
          <div className="kpi-value">{invoices.data ? reads.length : "-"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Need a look</div>
          <div className="kpi-value">{invoices.data ? needLook : "-"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Still open</div>
          <div className="kpi-value">{book ? rupiah(book.open_amount) : "-"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Debits for a person</div>
          <div className="kpi-value">{book ? book.unmatched_debits : "-"}</div>
        </div>
      </section>

      {failure && <p className="ledger-failure">That did not work: {failure}</p>}

      <div className="tabs ledger-tabs" role="tablist" aria-label="Views">
        {tabs.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            onClick={() => update({ view: option.id === "invoices" ? null : option.id })}
          >
            {option.label}
            {option.count !== undefined && <span className="ledger-tab-count">{option.count}</span>}
          </button>
        ))}
      </div>

      <div className="ledger-layout">
        {tab === "invoices" ? (
          <section className="panel ledger-table" aria-label="Invoices">
            {reads.length === 0 ? (
              <p className="empty">{offline ? finding : "No invoices yet."}</p>
            ) : (
              <table className="ledger-invoices-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th className="col-wide">Number</th>
                    <th className="col-wide">Date</th>
                    <th className="n">Total</th>
                    <th>Checks</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {reads.map((read) => {
                    const failedCount = read.checks.filter((check) => !check.passed).length;
                    return (
                      <tr key={read.id} className={read.id === selectedId ? "is-selected" : undefined}>
                        <td className="cell-primary">
                          <button
                            type="button"
                            className="ledger-row-button"
                            onClick={() => update({ invoice: read.id })}
                          >
                            {read.invoice.supplier_name ?? "Not read"}
                          </button>
                          <span className="ledger-subline num">
                            {read.invoice.invoice_number ?? "-"} · {read.invoice.invoice_date ?? "-"}
                          </span>
                        </td>
                        <td className="num col-wide">{read.invoice.invoice_number ?? "-"}</td>
                        <td className="num col-wide">{read.invoice.invoice_date ?? "-"}</td>
                        <td className="n num cell-amount">{rupiah(read.invoice.total)}</td>
                        <td className="cell-checks">
                          {failedCount === 0 ? (
                            <span className="ledger-clear">clear</span>
                          ) : (
                            <span className="pill neg">{failedCount} failed</span>
                          )}
                        </td>
                        <td className="cell-payment">
                          <PaymentPill payment={paymentById.get(read.id)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        ) : (
          <section className="panel ledger-table" aria-label="Bank statement">
            <header>
              <h2>Debits on the statement</h2>
              <label className="btn">
                {putStatement.isPending ? "Reading the statement" : "Replace statement (CSV)"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="visually-hidden"
                  disabled={putStatement.isPending || offline}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) putStatement.mutate(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </header>
            {!book ? (
              <p className="empty">
                {reconciliation.isError ? "The statement could not be matched." : "Matching the statement."}
              </p>
            ) : (
              <table className="ledger-statement-table">
                <thead>
                  <tr>
                    <th className="col-wide">Date</th>
                    <th>Description</th>
                    <th className="n">Debit</th>
                    <th>Pays</th>
                    <th className="col-wide">Matched by</th>
                  </tr>
                </thead>
                <tbody>
                  {book.payments.map((match) => {
                    const paid = match.invoice_id ? readById.get(match.invoice_id) : undefined;
                    const how =
                      match.method === "reference"
                        ? "reference"
                        : match.method === "payee"
                          ? `payee, p ${match.probability?.toFixed(2)}`
                          : match.probability != null
                            ? `model unsure, p ${match.probability.toFixed(2)}`
                            : "no invoice with this amount";
                    return (
                      <tr key={match.line.position}>
                        <td className="num col-wide">{match.line.date}</td>
                        <td className="cell-primary">
                          <span className="truncate" title={match.line.description}>
                            {match.line.description}
                          </span>
                          <span className="ledger-subline num">
                            {match.line.date} · {how}
                          </span>
                        </td>
                        <td className="n num cell-amount">{rupiah(match.line.debit)}</td>
                        <td className="cell-payment">
                          {paid ? (
                            <button
                              type="button"
                              className="ledger-row-button"
                              onClick={() => update({ invoice: paid.id, view: null })}
                            >
                              {paid.invoice.invoice_number}
                            </button>
                          ) : (
                            <span className="pill warn">for a person</span>
                          )}
                        </td>
                        <td className="meta col-wide">{how}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}
        {selected && (
          <Detail
            read={selected}
            payment={paymentById.get(selected.id)}
            matches={(book?.payments ?? []).filter((match) => match.invoice_id === selected.id)}
            onClose={() => update({ invoice: null })}
          />
        )}
      </div>
    </AppShell>
  );
}
