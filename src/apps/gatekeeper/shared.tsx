import { useQuery } from "@tanstack/react-query";
import { type GateEvent, gatekeeper } from "../../api/gatekeeper";
import type { NavItem } from "../shared/AppShell";

export const POLL_MILLISECONDS = 5_000;
export const NONE = "-";
export const OUTCOME_PILLS: Record<GateEvent["outcome"], string> = {
  answered: "",
  cached: "",
  checked: "pos",
  blocked: "neg",
  failed: "warn",
};

export const milliseconds = (value: number | null | undefined) => (value == null ? NONE : `${Math.round(value)} ms`);

export function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="2" y="4" width="3" height="14" rx="1" />
      <rect x="5" y="7" width="13" height="3" rx="1.5" />
    </svg>
  );
}

const GATE_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
    <path d="M2.5 13.5V2.5M2.5 5.5h11" />
  </svg>
);

const APPS_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="2.5" width="5" height="5" rx="1" />
    <rect x="9" y="2.5" width="5" height="5" rx="1" />
    <rect x="2" y="9.5" width="5" height="4" rx="1" />
    <path d="M9 11.5h5" />
  </svg>
);

/** The two screens of Gatekeeper: the console, and the scopes apps use by name. */
export function gatekeeperNav(current: "gate" | "apps"): NavItem[] {
  return [
    { label: "Gate", to: "/gatekeeper", icon: GATE_ICON, current: current === "gate" },
    { label: "Used by apps", to: "/gatekeeper/apps", icon: APPS_ICON, current: current === "apps" },
  ];
}

export function useGateMeta() {
  return useQuery({
    queryKey: ["gate", "meta"],
    queryFn: async () => {
      const { data, error } = await gatekeeper.GET("/meta");
      if (error || !data) throw new Error("Gatekeeper did not answer");
      return data;
    },
  });
}
