import createClient from "openapi-fetch";
import { backendUrl, projectById } from "../lab/projects";
import type { components, paths } from "./generated/gatekeeper";

/** Typed client for the Gatekeeper backend. Paths, bodies and responses come from its OpenAPI schema. */
export const gatekeeper = createClient<paths>({ baseUrl: backendUrl(projectById("gatekeeper")) });

export type GateDecision = components["schemas"]["GateDecision"];
export type GateEvent = components["schemas"]["GateEvent"];
export type GateStats = components["schemas"]["GateStats"];

export interface GateAnswer {
  choices: { message: { content: string } }[];
  gate: GateDecision & { model: string; upstream_ms: number; cached: boolean };
}

/** The 403 body when the guard blocks a request: problem details plus the gate's decision. */
export interface GateRefusal {
  detail: string;
  gate: GateDecision;
}
