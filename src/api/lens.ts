import createClient from "openapi-fetch";
import { backendUrl, projectById } from "../lab/projects";
import type { components, paths } from "./generated/lens";

const baseUrl = backendUrl(projectById("lens"));

/** Typed client for the Lens backend. Paths, parameters and responses come from its OpenAPI schema. */
export const lens = createClient<paths>({ baseUrl, fetch: (request) => globalThis.fetch(request) });

export type Photograph = components["schemas"]["Photograph"];
export type SearchResult = components["schemas"]["SearchResult"];
export type IngestResult = components["schemas"]["IngestResult"];
export type Mode = NonNullable<NonNullable<paths["/v1/search"]["get"]["parameters"]["query"]>["mode"]>;
export type OriginFilter = NonNullable<NonNullable<paths["/v1/search"]["get"]["parameters"]["query"]>["origin"]>;

/** The backend serves the photographs themselves next to its API. */
export const imageUrl = (photograph: Photograph) => `${baseUrl}/images/${photograph.image}`;

/** Raises with the status or problem detail, so a screen can say what failed. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data === undefined) {
    const detail =
      typeof result.error === "object" && result.error !== null && "detail" in result.error
        ? String((result.error as { detail: unknown }).detail)
        : `Lens answered ${result.response.status}`;
    throw new Error(detail);
  }
  return result.data;
}
