"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Check, Plus, ArrowUpRight, Search } from "lucide-react";
import { formatDate } from "../../lib/dates";
import { useDraft, clearDraft } from "../../lib/drafts";
import type { Episode, ActionCommand } from "../../lib/types";
const labels = {
  follow_up: "Follow-up",
  pending_result: "Pending result",
  medication: "Medication · source only",
  safety: "Safety · source only",
  context: "Context",
  unknown: "Review manually",
};
export default function SourceView({
  episode,
  highlight,
  onCommand,
  onLoop,
}: {
  episode: Episode;
  highlight: string | null;
  onCommand: (c: ActionCommand) => Promise<void>;
  onLoop: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const draftKey = `${episode.id}:manual`;
  const [adding, setAdding] = useDraft<string | null>(`${draftKey}:source`, null);
  const [title, setTitle] = useDraft(`${draftKey}:title`, "");
  const [category, setCategory] = useDraft<"follow_up" | "pending_result">(`${draftKey}:category`, "follow_up");
  const focusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight) {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);
  const sentences = episode.sentences.filter(
    (s) =>
      (filter === "all" ||
        (filter === "unproposed" &&
          !episode.loops.some((loop) => loop.sourceId === s.id)) ||
        filter === s.category) &&
      s.text.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE ORIGINAL WORDS MATTER</div>
          <h1>Nothing without a source.</h1>
          <p>
            Check every sentence, including the ones the AI did not turn into
            tasks.
          </p>
        </div>
      </div>
      <div className="source-summary">
        <div className="type-icon blue">
          <FileText size={23} />
        </div>
        <div>
          <h2>{episode.documentTitle}</h2>
          <p>
            {episode.patientName} · Discharged{" "}
            {formatDate(episode.dischargeDate)} · {episode.sentences.length}{" "}
            source segments
          </p>
        </div>
        <span className="source-complete">
          <Check size={16} /> Original text retained
        </span>
      </div>
      <div className="notice neutral">
        <FileText size={18} />
        <p>
          Only this document is analyzed. Instructions missing from the document
          cannot be recovered. Medication and urgent-care instructions stay here
          in their original wording; confirm them with your care team.
        </p>
      </div>
      <div className="source-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search source sentences"
            placeholder="Find a word in the source"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter source sentences"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All source sentences</option>
          <option value="unproposed">No task proposed</option>
          <option value="safety">Safety instructions</option>
          <option value="medication">Medication instructions</option>
          <option value="unknown">Needs manual review</option>
        </select>
      </div>
      <div className="source-sentences">
        {sentences.map((s) => {
          const linked = episode.loops.filter((l) => l.sourceId === s.id);
          return (
            <div
              key={s.id}
              ref={highlight === s.id ? focusRef : null}
              className={
                "source-sentence " + (highlight === s.id ? "highlighted" : "")
              }
            >
              <div className="sentence-number">{s.id.toUpperCase()}</div>
              <div className="sentence-body">
                <div className="sentence-label">{labels[s.category]}</div>
                <p className="verbatim">{s.text}</p>
                <p className="sentence-reason">{s.reason}</p>
                <div className="sentence-actions">
                  {linked.map((l) => (
                    <button
                      key={l.id}
                      className="text-button"
                      onClick={() => onLoop(l.id)}
                    >
                      View{" "}
                      {l.status === "dismissed"
                        ? "dismissed suggestion"
                        : "follow-up"}{" "}
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                  <button
                    className="text-button"
                    onClick={() => {
                      if (busy) return;
                      setAdding(s.id);
                      if (adding !== s.id) setTitle(s.text.slice(0, 160));
                      setError("");
                    }}
                  >
                    <Plus size={15} />{" "}
                    {linked.length
                      ? "Add another action"
                      : "Add a missed follow-up"}
                  </button>
                </div>
                {adding === s.id && (
                  <form
                    className="manual-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      try {
                        await onCommand({
                          type: "manual",
                          sentenceId: s.id,
                          title,
                          category,
                        });
                        setAdding(null);
                        clearDraft(`${draftKey}:source`);
                        clearDraft(`${draftKey}:title`);
                        clearDraft(`${draftKey}:category`);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not add the follow-up.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      Title
                      <input
                        value={title}
                        required
                        maxLength={160}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as typeof category)
                        }
                      >
                        <option value="follow_up">Follow-up action</option>
                        <option value="pending_result">Pending result</option>
                      </select>
                    </label>
                    <p className="field-help">
                      The original sentence remains attached. Confirm details on
                      the care board before tracking.
                    </p>
                    <div className="button-row">
                      <button className="primary-button" disabled={busy}>
                        Add for review
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setAdding(null)}
                      >
                        Cancel
                      </button>
                    </div>
                    {error && (
                      <p role="alert" className="error-text">
                        {error}
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {!sentences.length && (
          <div className="empty-state">
            <Search size={28} />
            <h3>No matching sentences</h3>
            <p>Try another word or choose All source sentences.</p>
          </div>
        )}
      </div>
      <details className="raw-source">
        <summary>Read the complete source text</summary>
        <pre>{episode.sourceText}</pre>
      </details>
    </>
  );
}
