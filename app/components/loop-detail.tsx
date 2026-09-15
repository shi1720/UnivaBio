"use client";
import { readableHistory } from "../../lib/history";
import { useId, useRef, useState } from "react";
import { useDraft, clearDraft } from "../../lib/drafts";
import {
  Check,
  Clock3,
  FileText,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  CornerUpLeft,
  LoaderCircle,
} from "lucide-react";
import Modal from "./modal";
import { formatDate, today } from "../../lib/dates";
import type { Episode, CareLoop, ActionCommand } from "../../lib/types";
export const STATUS_LABELS = {
  suggested: "Needs your review",
  open: "Ready to follow through",
  waiting: "Waiting for a reply",
  received: "Result received · review next",
  closed: "Reported complete",
  dismissed: "Suggestion dismissed",
};
const detailTabs = ["details", "progress", "history"] as const;
export default function LoopDetail({
  loop,
  episode,
  onClose,
  onCommand,
  onSource,
}: {
  loop: CareLoop;
  episode: Episode;
  onClose: () => void;
  onCommand: (command: ActionCommand) => Promise<void>;
  onSource: (id: string) => void;
}) {
  const tabGroupId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const draftKey = `${episode.id}:${loop.id}:`;
  const [title, setTitle] = useDraft(draftKey + "title", loop.title),
    [owner, setOwner] = useDraft(draftKey + "owner", loop.owner),
    [dueDate, setDate] = useDraft(draftKey + "dueDate", loop.dueDate ?? ""),
    [dueEnd, setEnd] = useDraft(draftKey + "dueEnd", loop.dueEnd ?? ""),
    [note, setNote] = useDraft(draftKey + "note", ""),
    [reviewedBy, setReviewedBy] = useDraft(draftKey + "reviewedBy", ""),
    [completionDate, setCompletionDate] = useDraft(
      draftKey + "completionDate",
      today(),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState<"details" | "progress" | "history">("details"),
    [confirmed, setConfirmed] = useState(false);
  async function act(command: ActionCommand) {
    setBusy(true);
    setError("");
    try {
      await onCommand(command);
      // A progress change must not discard unfinished detail edits, and vice versa.
      const fields =
        command.type === "confirm" || command.type === "update"
          ? ["title", "owner", "dueDate", "dueEnd"]
          : command.type === "close"
            ? ["note", "reviewedBy", "completionDate"]
            : ["note"];
      for (const field of fields) clearDraft(draftKey + field);
      if (fields.includes("note")) setNote("");
      if (command.type === "confirm" || command.type === "close")
        setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the change.");
    } finally {
      setBusy(false);
    }
  }
  const suggested = loop.status === "suggested",
    finished = loop.status === "closed" || loop.status === "dismissed",
    needsReview = loop.category === "pending_result";
  return (
    <Modal
      title={needsReview ? "Follow the result through" : "Follow-up details"}
      onClose={onClose}
      drawer
      busy={busy}
      draftHint
    >
      <div className="modal-body">
        <div
          className={
            "status detail-status " +
            (finished ? "green" : suggested ? "amber" : "blue")
          }
        >
          {STATUS_LABELS[loop.status]}
        </div>
        <h3 className="detail-title">{loop.title}</h3>
        <div className="source-evidence">
          <div>
            <FileText size={16} />
            <span>EXACT SOURCE · {loop.sourceId.toUpperCase()}</span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => onSource(loop.sourceId)}
            >
              View context <ArrowRight size={14} />
            </button>
          </div>
          <blockquote>{loop.sourceQuote}</blockquote>
          <p>{episode.documentTitle}</p>
        </div>
        <div
          className="tab-row"
          role="tablist"
          aria-label="Follow-up information"
        >
          {detailTabs.map((t, index) => (
            <button
              key={t}
              role="tab"
              id={`${tabGroupId}-${t}-tab`}
              aria-controls={`${tabGroupId}-${t}-panel`}
              tabIndex={tab === t ? 0 : -1}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              disabled={busy}
              aria-selected={tab === t}
              onKeyDown={(e) => {
                const next =
                  e.key === "ArrowRight"
                    ? (index + 1) % detailTabs.length
                    : e.key === "ArrowLeft"
                      ? (index + detailTabs.length - 1) % detailTabs.length
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? detailTabs.length - 1
                          : null;
                if (next === null || busy) return;
                e.preventDefault();
                setTab(detailTabs[next]);
                tabRefs.current[next]?.focus();
              }}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "details"
                ? "Check details"
                : t === "progress"
                  ? "Record progress"
                  : "History"}
            </button>
          ))}
        </div>
        <div
          className="tab-content"
          role="tabpanel"
          id={`${tabGroupId}-details-panel`}
          aria-labelledby={`${tabGroupId}-details-tab`}
          hidden={tab !== "details"}
          tabIndex={0}
        >
          <h4>The source says</h4>
          <div className="source-facts">
            <div>
              <span>Timing</span>
              <strong>{loop.dateText}</strong>
            </div>
            <div>
              <span>Care team mentioned</span>
              <strong>{loop.documentedOwner || "Not specified"}</strong>
            </div>
          </div>
          {loop.flags.length > 0 && (
            <div className="notice warning">
              <CircleNotice />
              <div>
                <strong>Details worth checking</strong>
                <ul>
                  {loop.flags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <p>
                  These flags describe the original text. Your corrections below
                  stay in the history.
                </p>
              </div>
            </div>
          )}
          {loop.questions.length > 0 && (
            <div className="questions-block">
              <h4>
                <MessageCircle size={17} /> Questions for the care team
              </h4>
              <ul>
                {loop.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {!finished && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act({
                  type: suggested ? "confirm" : "update",
                  loopId: loop.id,
                  title,
                  owner,
                  dueDate: dueDate || null,
                  dueEnd: dueEnd || dueDate || null,
                });
              }}
            >
              <label>
                Follow-up title
                <input
                  disabled={busy}
                  value={title}
                  maxLength={160}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Who will keep track of this?
                <input
                  disabled={busy}
                  value={owner}
                  maxLength={100}
                  required
                  placeholder="e.g. Maya (daughter)"
                  onChange={(e) => setOwner(e.target.value)}
                />
                <small>
                  This person tracks the task. It does not assign clinical
                  responsibility.
                </small>
              </label>
              <div className="form-grid">
                <label>
                  {loop.dateKind === "window"
                    ? "Window starts"
                    : "Confirmed date (optional)"}
                  <input
                    disabled={busy}
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!next || !dueEnd || dueEnd === dueDate) setEnd(next);
                      setDate(next);
                    }}
                  />
                </label>
                <label>
                  Window ends (optional)
                  <input
                    disabled={busy}
                    type="date"
                    value={dueEnd}
                    min={dueDate}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </div>
              <p className="field-help">
                Keep an uncertain date blank until the care team clarifies it.
                Relative dates are calculated from{" "}
                {formatDate(episode.dischargeDate)}.
              </p>
              {suggested && (
                <label className="checkbox-label">
                  <input
                    disabled={busy}
                    type="checkbox"
                    checked={confirmed}
                    required
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>
                    I checked this suggestion against the original instructions
                    and any clarifications I received.
                  </span>
                </label>
              )}
              <button
                className="primary-button full-width"
                disabled={busy || (suggested && !confirmed)}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Check size={17} />
                )}{" "}
                {suggested ? "Confirm this follow-up" : "Save details"}
              </button>
            </form>
          )}
          {finished && (
            <div className="notice neutral">
              This record is{" "}
              {loop.status === "closed" ? "complete" : "dismissed"}. Use Record
              progress to reopen it. The history keeps previous decisions.
            </div>
          )}
        </div>
        <div
          className="tab-content"
          role="tabpanel"
          id={`${tabGroupId}-progress-panel`}
          aria-labelledby={`${tabGroupId}-progress-tab`}
          hidden={tab !== "progress"}
          tabIndex={0}
        >
          {suggested ? (
            <>
              <h4>Review this suggestion first</h4>
              <p>
                Confirm the source and the tracking person in Check details. If
                this is not a follow-up, dismiss the suggestion with a reason.
              </p>
              <label>
                Why is this not a follow-up?
                <textarea
                  disabled={busy}
                  rows={3}
                  value={note}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. This sentence describes a completed test."
                />
              </label>
              <button
                className="secondary-button"
                disabled={busy || note.trim().length < 5}
                onClick={() =>
                  void act({ type: "dismiss", loopId: loop.id, note })
                }
              >
                Dismiss suggestion
              </button>
            </>
          ) : finished ? (
            <>
              <div className="completion-record">
                <ShieldCheck size={26} />
                <h4>
                  {loop.status === "closed"
                    ? "A recorded ending"
                    : "Suggestion reviewed"}
                </h4>
                {loop.closure && (
                  <>
                    <p>{loop.closure.note}</p>
                    <dl>
                      <dt>Reported by</dt>
                      <dd>{loop.closure.reporter}</dd>
                      <dt>Completion date</dt>
                      <dd>{formatDate(loop.closure.date)}</dd>
                      {loop.closure.reviewedBy && (
                        <>
                          <dt>Reviewed with</dt>
                          <dd>{loop.closure.reviewedBy}</dd>
                        </>
                      )}
                    </dl>
                  </>
                )}
                <small>
                  User-reported; not independently verified by Looplight.
                </small>
              </div>
              <label>
                Reason to reopen
                <textarea
                  disabled={busy}
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. We still need clarification from the care team."
                />
              </label>
              <button
                className="secondary-button"
                disabled={busy || note.trim().length < 5}
                onClick={() =>
                  void act({ type: "reopen", loopId: loop.id, note })
                }
              >
                <CornerUpLeft size={16} /> Reopen follow-up
              </button>
            </>
          ) : (
            <>
              <div className="progress-steps">
                <span className="complete">
                  <Check size={16} /> Confirmed
                </span>
                <span className={loop.status === "received" ? "complete" : ""}>
                  {needsReview ? "Result received" : "Action taken"}
                </span>
                <span>
                  {needsReview ? "Review reported" : "Completion recorded"}
                </span>
              </div>
              {needsReview && loop.status !== "received" && (
                <div className="notice warning">
                  <Clock3 size={19} />
                  <p>
                    A result being available does not mean it has been
                    clinically reviewed. Record receipt first, then who reviewed
                    it.
                  </p>
                </div>
              )}
              <label>
                {loop.status === "received" || !needsReview
                  ? "What happened?"
                  : "Progress note"}
                <textarea
                  disabled={busy}
                  rows={4}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    needsReview
                      ? "e.g. The care team confirmed the result is available."
                      : "e.g. Attended the appointment and discussed the discharge summary."
                  }
                />
              </label>
              <div className="button-row">
                <button
                  className="secondary-button"
                  disabled={busy || note.trim().length < 3}
                  onClick={() =>
                    void act({
                      type: "status",
                      loopId: loop.id,
                      status: loop.status === "waiting" ? "open" : "waiting",
                      note,
                    })
                  }
                >
                  {loop.status === "waiting"
                    ? "Return to active"
                    : "Waiting for a reply"}
                </button>
                {needsReview && loop.status !== "received" && (
                  <button
                    className="primary-button"
                    disabled={busy || note.trim().length < 3}
                    onClick={() =>
                      void act({
                        type: "status",
                        loopId: loop.id,
                        status: "received",
                        note,
                      })
                    }
                  >
                    Record result received
                  </button>
                )}
              </div>
              {(!needsReview || loop.status === "received") && (
                <div className="close-form">
                  <h4>Give this follow-up a recorded ending</h4>
                  <label>
                    {needsReview
                      ? "Clinician who reviewed the result"
                      : "Reviewed with (optional)"}
                    <input
                      disabled={busy}
                      value={reviewedBy}
                      maxLength={100}
                      onChange={(e) => setReviewedBy(e.target.value)}
                      placeholder={
                        needsReview
                          ? "Clinician name or care team"
                          : "Name or care team"
                      }
                    />
                  </label>
                  <label>
                    Date completed
                    <input
                      disabled={busy}
                      type="date"
                      value={completionDate}
                      max={today()}
                      onChange={(e) => setCompletionDate(e.target.value)}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      disabled={busy}
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span>
                      {needsReview
                        ? "I have recorded who reviewed the result and what they told us."
                        : "I have recorded what happened and who was involved."}{" "}
                      This is my report of the follow-up.
                    </span>
                  </label>
                  <button
                    className="primary-button full-width"
                    disabled={
                      busy ||
                      !confirmed ||
                      note.trim().length < 10 ||
                      (needsReview && reviewedBy.trim().length < 2)
                    }
                    onClick={() =>
                      void act({
                        type: "close",
                        loopId: loop.id,
                        note,
                        reviewedBy,
                        date: completionDate,
                      })
                    }
                  >
                    <ShieldCheck size={18} /> Record completion
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <div
          className="tab-content history-list"
          role="tabpanel"
          id={`${tabGroupId}-history-panel`}
          aria-labelledby={`${tabGroupId}-history-tab`}
          hidden={tab !== "history"}
          tabIndex={0}
        >
          {episode.events
            .filter((e) => e.actionId === loop.id || e.kind === "analyzed")
            .slice()
            .reverse()
            .map((event) => (
              <div className="history-item" key={event.id}>
                <span className="history-dot" />
                <div>
                  <strong>
                    {event.kind === "analyzed"
                      ? "Source analyzed"
                      : event.actor.includes("@") ? "Account holder" : event.actor}
                  </strong>
                  <p>{readableHistory(event.detail)}</p>
                  <small>{new Date(event.at).toLocaleString()}</small>
                </div>
              </div>
            ))}
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
function CircleNotice() {
  return <span className="notice-symbol">!</span>;
}
