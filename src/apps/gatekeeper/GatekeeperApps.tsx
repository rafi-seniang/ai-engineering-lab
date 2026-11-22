import { useQuery } from "@tanstack/react-query";
import { gatekeeper, type NamedScope } from "../../api/gatekeeper";
import { AppShell } from "../shared/AppShell";
import { gatekeeperNav, Mark, milliseconds, NONE, OUTCOME_PILLS, POLL_MILLISECONDS, useGateMeta } from "./shared";
import "./gatekeeper.css";

const RECENT_CHECKS = 15;
const QUESTION_TITLES: Record<string, string> = {
  injection: "Is it a prompt injection?",
  off_topic: "Is it outside this scope?",
};

interface Question {
  type: string;
  instructions: string;
  criteria?: { true?: string; false?: string };
}

function QuestionCard({ id, question, cutoff }: { id: string; question: Question; cutoff: number | undefined }) {
  return (
    <article className="gate-question">
      <header>
        <h3>{QUESTION_TITLES[id] ?? id}</h3>
        <span className="pill">blocks at {cutoff == null ? NONE : cutoff.toFixed(2)}</span>
      </header>
      <p>{question.instructions}</p>
      {question.criteria && (
        <details className="gate-criteria">
          <summary>What counts as yes and no</summary>
          <dl>
            <div>
              <dt>Counts as yes</dt>
              <dd>{question.criteria.true}</dd>
            </div>
            <div>
              <dt>Counts as no</dt>
              <dd>{question.criteria.false}</dd>
            </div>
          </dl>
        </details>
      )}
    </article>
  );
}

function RecentChecks({ name }: { name: string }) {
  const checks = useQuery({
    queryKey: ["gate", "events", name],
    queryFn: async () => {
      const { data, error } = await gatekeeper.GET("/v1/gate/events", {
        params: { query: { limit: RECENT_CHECKS, scope_name: name } },
      });
      if (error || !data) throw new Error("Gatekeeper did not answer");
      return data;
    },
    refetchInterval: POLL_MILLISECONDS,
  });
  if (checks.isError) return <p className="empty">The checks could not be read.</p>;
  if ((checks.data ?? []).length === 0) return <p className="empty">No messages checked since the gate started.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Message</th>
          <th>Outcome</th>
          <th className="n">Injection</th>
          <th className="n">Off-topic</th>
          <th className="n">Gate time</th>
        </tr>
      </thead>
      <tbody>
        {(checks.data ?? []).map((event) => (
          <tr key={`${event.request_id}-${event.at}`}>
            <td className="truncate" title={event.preview}>
              {event.preview}
            </td>
            <td>
              <span className={`pill ${OUTCOME_PILLS[event.outcome]}`}>
                {event.blocked_by === "off_topic"
                  ? "off-topic"
                  : event.outcome === "checked"
                    ? "allowed"
                    : event.outcome}
              </span>
            </td>
            <td className="n num">{event.injection_probability?.toFixed(2) ?? NONE}</td>
            <td className="n num">{event.off_topic_probability?.toFixed(2) ?? NONE}</td>
            <td className="n num">{milliseconds(event.decision_ms)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScopePanel({ scope, cutoffs }: { scope: NamedScope; cutoffs: Record<string, number | undefined> }) {
  const questions = Object.entries(scope.questions) as [string, Question][];
  return (
    <section className="panel gate-app gate-events" aria-labelledby={`scope-${scope.name}`}>
      <header>
        <h2 id={`scope-${scope.name}`}>
          Scope <code>{scope.name}</code>
        </h2>
      </header>
      <blockquote className="gate-scope-text">{scope.scope}</blockquote>
      <h3 className="gate-sub">Latest messages checked</h3>
      <RecentChecks name={scope.name} />
      <h3 className="gate-sub">The two questions asked about every message, in one call</h3>
      <div className="gate-questions">
        {questions.map(([id, question]) => (
          <QuestionCard key={id} id={id} question={question} cutoff={cutoffs[id]} />
        ))}
      </div>
    </section>
  );
}

/** The scopes the lab's apps use by name, so a visitor sees the gate really guards something. */
export function GatekeeperApps() {
  const meta = useGateMeta();
  const scopes = useQuery({
    queryKey: ["gate", "scopes"],
    queryFn: async () => {
      const { data, error } = await gatekeeper.GET("/v1/gate/scopes");
      if (error || !data) throw new Error("Gatekeeper did not answer");
      return data;
    },
  });
  const cutoffs = {
    injection: meta.data?.block_from_injection_probability,
    off_topic: meta.data?.block_from_off_topic_probability,
  };
  return (
    <AppShell product="Gatekeeper" mark={<Mark size={20} />} guide="gatekeeper" nav={gatekeeperNav("apps")}>
      <div className="title-row">
        <div>
          <h1>Used by apps</h1>
          <p className="sub">
            Tiketa's chat assistant sends every visitor message here first. A blocked message never reaches a model.
          </p>
        </div>
      </div>
      {scopes.isError ? (
        <p className="empty">Gatekeeper is not responding.</p>
      ) : scopes.data?.length === 0 ? (
        <p className="empty">No app uses a named scope yet.</p>
      ) : (
        (scopes.data ?? []).map((scope) => <ScopePanel key={scope.name} scope={scope} cutoffs={cutoffs} />)
      )}
    </AppShell>
  );
}
