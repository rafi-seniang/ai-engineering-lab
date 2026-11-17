import createClient from "openapi-fetch";
import { backendUrl, projectById } from "../lab/projects";
import type { components, paths } from "./generated/pilah";

/** Typed client for the Pilah backend. Paths, bodies and responses come from its OpenAPI schema. */
export const pilah = createClient<paths>({
  baseUrl: backendUrl(projectById("pilah")),
  fetch: (request) => globalThis.fetch(request),
});

export type ChoiceOption = components["schemas"]["ChoiceOption"];
export type EngineOption = components["schemas"]["EngineOption"];
export type ImageItemInput = components["schemas"]["ImageItemInput"];
export type SortImagesRequest = components["schemas"]["SortImagesRequest"];
export type SortRequest = components["schemas"]["SortRequest"];
export type SortedItem = components["schemas"]["SortedItem"];
export type SortResponse = components["schemas"]["SortResponse"];
export type TriageDecision = components["schemas"]["TriageDecision"];
export type TriagedMessage = components["schemas"]["TriagedMessage"];

type ValidationIssue = { loc?: (string | number)[]; msg?: string };

/** A 422 detail is a list of issues: each becomes "field: message". */
function describe(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (detail as ValidationIssue[])
      .map((issue) => `${issue.loc?.slice(1).join(".") ?? ""}: ${issue.msg ?? "invalid"}`)
      .join(". ");
  }
  return `Dispatch answered ${status}`;
}

/** Raises with the service's own message, so a screen can say what failed. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data === undefined) {
    const detail = (result.error as { detail?: unknown } | undefined)?.detail;
    throw new Error(describe(detail, result.response.status));
  }
  return result.data;
}
