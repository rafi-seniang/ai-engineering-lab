import projectList from "./projects.json";

export type ProjectStatus = "built" | "planned";

export interface Project {
  id: string;
  name: string;
  port: number;
  status: ProjectStatus;
  group: string;
  engine: string;
  route: string;
  summary: string;
  picture: string;
  caption: string;
}

export const PROJECTS = projectList as Project[];

/** Where a backend answers: VITE_<ID>_URL at build time, else its port on this machine. Public, never a secret. */
export function backendUrl(project: Pick<Project, "id" | "port">): string {
  const configured = import.meta.env[`VITE_${project.id.toUpperCase()}_URL`] as string | undefined;
  return (configured || `http://localhost:${project.port}`).replace(/\/$/, ""); // an empty build arg means unset
}

export function projectById(id: string): Project {
  const project = PROJECTS.find((candidate) => candidate.id === id);
  if (!project) throw new Error(`Unknown project ${id}`);
  return project;
}

export function mediaUrl(picture: string): string {
  return `/media/${picture}.webp`;
}
