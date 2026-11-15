import projectList from "./projects.json";

export type ProjectStatus = "built" | "planned";

export interface Project {
  id: string;
  name: string;
  port: number;
  status: ProjectStatus;
  group: string;
  engine: string;
  /** The screen inside this frontend. A project with its own site has `site_port` instead. */
  route?: string;
  /** The port of the project's own site on this machine, for a project that is not a screen here. */
  site_port?: number;
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

/**
 * A deployed build asks only the backends it was given an address for. Asking the fallback, a port on the visitor's
 * own computer, makes the browser show a permission prompt for local network access.
 */
export function hasAddress(project: Pick<Project, "id">): boolean {
  return import.meta.env.DEV || Boolean(import.meta.env[`VITE_${project.id.toUpperCase()}_URL`]);
}

/** Where a project's own site is: VITE_<ID>_SITE_URL at build time, else its port on this machine. */
export function siteUrl(project: Pick<Project, "id" | "site_port">): string | null {
  const configured = import.meta.env[`VITE_${project.id.toUpperCase()}_SITE_URL`] as string | undefined;
  if (configured) return configured;
  return project.site_port ? `http://localhost:${project.site_port}` : null;
}

export function projectById(id: string): Project {
  const project = PROJECTS.find((candidate) => candidate.id === id);
  if (!project) throw new Error(`Unknown project ${id}`);
  return project;
}

export function mediaUrl(picture: string): string {
  return `/media/${picture}.webp`;
}
