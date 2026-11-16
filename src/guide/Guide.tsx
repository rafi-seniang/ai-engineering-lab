import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { type AppGuide, type ExampleRow, GUIDE, type GuideText, type Lang } from "./content";
import "./guide.css";

const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
];

function Bars({ rows }: { rows: ExampleRow[] }) {
  return (
    <ul className="gd-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span>{row.label}</span>
          <span className="gd-bar" aria-hidden="true">
            <i style={{ width: `${Math.max(row.probability * 100, 1)}%` }} />
          </span>
          <b className="num">{row.probability.toFixed(2)}</b>
        </li>
      ))}
    </ul>
  );
}

/** One request through Gatekeeper: the guard first, and only an allowed request goes on to the router. */
function GateFlow({ flow }: { flow: GuideText["flow"] }) {
  return (
    <figure className="gd-flow" aria-label={flow.title}>
      <figcaption>{flow.title}</figcaption>
      <div className="gd-step">{flow.request}</div>
      <div className="gd-arrow" aria-hidden="true" />
      <div className="gd-step gd-key">
        <strong>{flow.guard}</strong>
        <span>{flow.guardDetail}</span>
      </div>
      <div className="gd-arrow" aria-hidden="true" />
      <div className="gd-step gd-question">{flow.question}</div>
      <div className="gd-arrow" aria-hidden="true" />
      <div className="gd-branches">
        <div className="gd-step gd-blocked">
          <strong>{flow.blocked}</strong>
          <span>{flow.blockedDetail}</span>
        </div>
        <div className="gd-branch">
          <div className="gd-step">
            <strong>{flow.allowed}</strong>
          </div>
          <div className="gd-arrow" aria-hidden="true" />
          <div className="gd-step">
            <strong>{flow.router}</strong>
            <span>{flow.routerDetail}</span>
          </div>
          <div className="gd-arrow" aria-hidden="true" />
          <div className="gd-outcomes">
            <div className="gd-step">
              <strong>{flow.small}</strong>
              <span>{flow.smallDetail}</span>
            </div>
            <div className="gd-step">
              <strong>{flow.strong}</strong>
              <span>{flow.strongDetail}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="gd-after">{flow.after}</p>
    </figure>
  );
}

function AppSection({ app, text }: { app: AppGuide; text: GuideText }) {
  return (
    <section className="gd-app" id={app.id} aria-labelledby={`${app.id}-title`}>
      <header className="gd-app-head">
        <div>
          <h2 id={`${app.id}-title`}>{app.name}</h2>
          <p className="gd-tagline">{app.tagline}</p>
        </div>
        <Link className="gd-open" to={app.route}>
          {text.open(app.name)}
        </Link>
      </header>

      <div className="gd-columns">
        <div className="gd-use">
          <h3>{text.sections.what}</h3>
          <p>{app.what}</p>
          <h3>{text.sections.how}</h3>
          <ol>
            {app.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="gd-example">
          <h3>
            {text.sections.example}: {app.example.title}
          </h3>
          <blockquote>{app.example.input}</blockquote>
          {app.example.rows && <Bars rows={app.example.rows} />}
          <p className="gd-outcome">{app.example.outcome}</p>
        </div>
      </div>

      <div className="gd-tech">
        <h3>{app.tech.title}</h3>
        {app.tech.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {app.id === "gatekeeper" && <GateFlow flow={text.flow} />}
        <p className="gd-measured">
          <b>{text.sections.measured}:</b> {app.measured}
        </p>
      </div>
    </section>
  );
}

/** How Dispatch, Lens and Gatekeeper work, in English (the default) or Indonesian. */
export function Guide() {
  const [params, setParams] = useSearchParams();
  const lang: Lang = params.get("lang") === "id" ? "id" : "en";
  const text = GUIDE[lang];
  const { hash } = useLocation();

  // The router does not scroll to a #section by itself
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const switchTo = (next: Lang) => {
    const changed = new URLSearchParams(params);
    if (next === "en") changed.delete("lang");
    else changed.set("lang", next);
    setParams(changed, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="gd" lang={lang}>
      <header className="gd-top">
        <Link to="/" className="gd-back">
          {text.back}
        </Link>
        <fieldset className="gd-langs">
          <legend className="visually-hidden">Language</legend>
          {LANGS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={lang === option.value}
              onClick={() => switchTo(option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      </header>

      <main className="gd-main">
        <h1>{text.title}</h1>
        <p className="gd-lead">{text.lead}</p>
        <nav className="gd-toc" aria-label={text.title}>
          {text.apps.map((app) => (
            <a key={app.id} href={`#${app.id}`}>
              {app.name}
            </a>
          ))}
        </nav>
        {text.apps.map((app) => (
          <AppSection key={app.id} app={app} text={text} />
        ))}
      </main>
    </div>
  );
}
