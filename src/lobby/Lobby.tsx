import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PROJECTS, type Project } from "../lab/projects";
import { type ServiceStatus, STATUS_WORDS, useServiceStatus } from "../lab/useServiceStatus";
import { LAB_SPECS, LAB_SUBTITLE, OWNER } from "./content";
import "./lobby.css";

function LabMark() {
  return (
    <svg className="lb-mark" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect width="22" height="22" rx="6" fill="currentColor" />
      <path d="M6.5 15.5V6.5h4.2a2.6 2.6 0 0 1 0 5.2H6.5m4 0 4.5 3.8" stroke="#fff" strokeWidth="1.8" />
    </svg>
  );
}

function ProjectCardBody({ project, status }: { project: Project; status: ServiceStatus }) {
  const isOn = status === "live";
  return (
    <>
      <div className="lb-card-top">
        <div className="lb-card-title">
          <strong>{project.name}</strong>
          <span className="lb-card-engine">{project.engine}</span>
        </div>
        <div className="lb-card-right">
          <span className="lb-card-port">:{project.port}</span>
          <span className="lb-status" data-status={status}>
            <i aria-hidden="true" />
            {STATUS_WORDS[status]}
          </span>
          {isOn && <span className="lb-open">Open</span>}
        </div>
      </div>
      <p className="lb-card-summary">{project.summary}</p>
    </>
  );
}

export function Lobby() {
  const statusById = useServiceStatus();
  const [contactOpen, setContactOpen] = useState(false);
  const liveCount = PROJECTS.filter((project) => statusById[project.id] === "live").length;

  useEffect(() => {
    if (!contactOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContactOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [contactOpen]);

  return (
    <div className="lb">
      <header className="lb-header">
        <div className="lb-brand">
          <LabMark />
          <span>{OWNER.name}</span>
        </div>
        <nav className="lb-nav" aria-label="External links">
          <a href={OWNER.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={OWNER.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <button
            type="button"
            className="lb-contact-btn"
            aria-haspopup="dialog"
            aria-expanded={contactOpen}
            onClick={() => setContactOpen(true)}
          >
            Contact
          </button>
          <span className="lb-online-pill" aria-live="polite">
            <i aria-hidden="true" />
            {liveCount} of {PROJECTS.length} on
          </span>
        </nav>
      </header>

      <main className="lb-main">
        <section className="lb-intro" aria-labelledby="lab-title">
          <h1 id="lab-title">Rafi's AI Lab</h1>
          <p className="lb-lead">{LAB_SUBTITLE}</p>

          <figure className="lb-photo-card">
            <img
              src="/media/ai-lab-workbench.webp"
              alt="AI engineering workbench with an open aluminum GPU test rig, notebooks, and telemetry monitor in daylight"
              width={1200}
              height={896}
            />
            <figcaption className="lb-specs">
              {LAB_SPECS.map((spec) => (
                <div key={spec.label}>
                  <span>{spec.label}</span>
                  <strong>{spec.value}</strong>
                </div>
              ))}
            </figcaption>
          </figure>
        </section>

        <section className="lb-board" aria-labelledby="projects-heading">
          <div className="lb-board-head">
            <h2 id="projects-heading">Projects</h2>
            <span>Health checked every 10s</span>
          </div>

          <ul className="lb-list">
            {PROJECTS.map((project) => {
              const status = statusById[project.id] ?? "offline";
              const isOn = status === "live";
              return (
                <li key={project.id}>
                  {isOn ? (
                    <Link className="lb-card is-on" to={project.route}>
                      <ProjectCardBody project={project} status={status} />
                    </Link>
                  ) : (
                    <div className="lb-card is-off" aria-disabled="true">
                      <ProjectCardBody project={project} status={status} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      {contactOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click closes the dialog alongside Escape and the Close button
        // biome-ignore lint/a11y/useKeyWithClickEvents: Escape is handled by the window keydown listener
        <div
          className="lb-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setContactOpen(false);
          }}
        >
          <div className="lb-modal" role="dialog" aria-modal="true" aria-label="Contact details">
            <div className="lb-modal-head">
              <div>
                <h2 id="contact-title">{OWNER.name}</h2>
                <p>
                  {OWNER.role} · {OWNER.location}
                </p>
              </div>
              <button type="button" className="lb-modal-close" onClick={() => setContactOpen(false)}>
                Close
              </button>
            </div>
            <dl className="lb-contact-list">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
                </dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>
                  <a href={OWNER.whatsappUrl} target="_blank" rel="noreferrer">
                    {OWNER.whatsapp}
                  </a>
                </dd>
              </div>
              <div>
                <dt>GitHub</dt>
                <dd>
                  <a href={OWNER.github} target="_blank" rel="noreferrer">
                    {OWNER.githubLabel}
                  </a>
                </dd>
              </div>
              <div>
                <dt>LinkedIn</dt>
                <dd>
                  <a href={OWNER.linkedin} target="_blank" rel="noreferrer">
                    {OWNER.linkedinLabel}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
