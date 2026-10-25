import { useQueries } from "@tanstack/react-query";
import { backendUrl, PROJECTS, type Project } from "./projects";

/** live: /health answered. offline: built but not answering. planned: no backend yet. checking: first call pending. */
export type ServiceStatus = "live" | "offline" | "planned" | "checking";

const POLL_MILLISECONDS = 10_000;
const HEALTH_TIMEOUT_MILLISECONDS = 2_500;

async function isAnswering(project: Project): Promise<boolean> {
  try {
    const response = await fetch(`${backendUrl(project)}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MILLISECONDS),
    });
    return response.ok;
  } catch {
    return false; // an offline service is an expected state here, shown on the board
  }
}

/** The status of every project, polled every 10 seconds while the page is open. */
export function useServiceStatus(): Record<string, ServiceStatus> {
  const builtProjects = PROJECTS.filter((project) => project.status === "built");
  const results = useQueries({
    queries: builtProjects.map((project) => ({
      queryKey: ["health", project.id],
      queryFn: () => isAnswering(project),
      refetchInterval: POLL_MILLISECONDS,
      retry: false,
    })),
  });
  const statusById: Record<string, ServiceStatus> = Object.fromEntries(
    PROJECTS.map((project) => [project.id, "planned"]),
  );
  builtProjects.forEach((project, index) => {
    const answered = results[index]?.data;
    statusById[project.id] = answered === undefined ? "checking" : answered ? "live" : "offline";
  });
  return statusById;
}

export const STATUS_WORDS: Record<ServiceStatus, string> = {
  live: "On",
  offline: "Off",
  planned: "Off",
  checking: "Checking",
};
