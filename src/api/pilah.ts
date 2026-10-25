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
export type SortRequest = components["schemas"]["SortRequest"];
export type SortedItem = components["schemas"]["SortedItem"];
export type SortResponse = components["schemas"]["SortResponse"];
export type TriageDecision = components["schemas"]["TriageDecision"];
export type TriagedMessage = components["schemas"]["TriagedMessage"];

/** Raises with the service's own message, so a screen can say what failed. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data === undefined) {
    const detail =
      typeof result.error === "object" && result.error !== null && "detail" in result.error
        ? String((result.error as { detail: unknown }).detail)
        : `Pilah answered ${result.response.status}`;
    throw new Error(detail);
  }
  return result.data;
}
