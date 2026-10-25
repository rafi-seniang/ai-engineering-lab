import createClient from "openapi-fetch";
import { backendUrl, projectById } from "../lab/projects";
import type { components, paths } from "./generated/ledger";

const baseUrl = backendUrl(projectById("ledger"));

/** Typed client for the Ledger backend. Paths, bodies and responses come from its OpenAPI schema. */
export const ledger = createClient<paths>({ baseUrl, fetch: (request) => globalThis.fetch(request) });

export type ReadInvoice = components["schemas"]["ReadInvoice"];
export type Reconciliation = components["schemas"]["Reconciliation"];
export type InvoicePayment = components["schemas"]["InvoicePayment"];
export type PaymentMatch = components["schemas"]["PaymentMatch"];
export type Check = components["schemas"]["Check"];

/** The first page of an invoice, as the model saw it. */
export const pageUrl = (invoice: ReadInvoice) => `${baseUrl}/v1/invoices/${invoice.id}/pages/1`;

/** A file as the multipart body the upload endpoints take. */
export function fileForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  return form;
}

/** Raises with the service's own detail when it gave one, so a screen can say what failed. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data;
  const detail = (result.error as { detail?: unknown } | undefined)?.detail;
  throw new Error(typeof detail === "string" ? detail : `Ledger answered ${result.response.status}`);
}
