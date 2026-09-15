"use client";
import { useState } from "react";
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
  const [title, setTitle] = useState(loop.title),
    [owner, setOwner] = useState(loop.owner),
    [dueDate, setDate] = useState(loop.dueDate ?? ""),
    [dueEnd, setEnd] = useState(loop.dueEnd ?? ""),
    [note, setNote] = useState(""),
    [reviewedBy, setReviewedBy] = useState(""),
    [completionDate, setCompletionDate] = useState(today()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState<"details" | "progress" | "history">("details"),
    [confirmed, setConfirmed] = useState(false);
  async function act(command: ActionCommand) {
    setBusy(true);
    setError("");
    try {
      await onCommand(command);
      setNote("");
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
          {(["details", "progress", "history"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
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
        {tab === "details" && (
          <div className="tab-content" role="tabpanel">
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
                    These flags describe the original text. Your corrections
                    below stay in the history.
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
                    value={title}
                    maxLength={160}
                    required
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Who will keep track of this?
                  <input
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
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDate(e.target.value);
                        if (!e.target.value) setEnd("");
                      }}
                    />
                  </label>
                  <label>
                    Window ends (optional)
                    <input
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
                      type="checkbox"
                      checked={confirmed}
                      required
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span>
                      I checked this suggestion against the original
                      instructions and any clarifications I received.
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
                {loop.status === "closed" ? "complete" : "dismissed"}. Use
                Record progress to reopen it. The history keeps previous
                decisions.
              </div>
            )}
          </div>
        )}
        {tab === "progress" && (
          <div className="tab-content" role="tabpanel">
            {suggested ? (
              <>
                <h4>Review this suggestion first</h4>
                <p>
                  Confirm the source and the tracking person in Check details.
                  If this is not a follow-up, dismiss the suggestion with a
                  reason.
                </p>
                <label>
                  Why is this not a follow-up?
                  <textarea
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
                  <span
                    className={loop.status === "received" ? "complete" : ""}
                  >
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
                      clinically reviewed. Record receipt first, then who
                      reviewed it.
                    </p>
                  </div>
                )}
                <label>
                  {loop.status === "received" || !needsReview
                    ? "What happened?"
                    : "Progress note"}
                  <textarea
                    rows={4}
                    maxLength={1500}
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
                        type="date"
                        value={completionDate}
                        max={today()}
                        onChange={(e) => setCompletionDate(e.target.value)}
                      />
                    </label>
                    <label className="checkbox-label">
                      <input
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
        )}
        {tab === "history" && (
          <div className="tab-content history-list" role="tabpanel">
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
                        : event.actor}
                    </strong>
                    <p>{event.detail}</p>
                    <small>{new Date(event.at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
          </div>
        )}
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
