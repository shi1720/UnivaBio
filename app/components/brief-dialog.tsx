"use client";
import { Printer, Download, CalendarDays } from "lucide-react";
import { useState } from "react";
import Modal from "./modal";
import { briefText, calendarText, downloadText } from "../../lib/exports";
import { formatDate } from "../../lib/dates";
import type { Episode } from "../../lib/types";
export default function BriefDialog({
  episode,
  onClose,
}: {
  episode: Episode;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const loops = episode.loops.filter((l) => l.status !== "dismissed");
  return (
    <Modal
      title="Bring the next steps to the next visit"
      onClose={onClose}
      wide
      print
    >
      <div className="modal-body">
        <div className="export-toolbar no-print">
          <button className="primary-button" onClick={() => window.print()}>
            <Printer size={17} /> Print / save PDF
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              downloadText(briefText(episode), "looplight-visit-brief.txt")
            }
          >
            <Download size={17} /> Text brief
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              const result = calendarText(episode);
              if (!result.count) {
                setMessage(
                  "Confirm a follow-up and its date before exporting calendar entries.",
                );
                return;
              }
              downloadText(
                result.text,
                "looplight-reminders.ics",
                "text/calendar;charset=utf-8",
              );
              setMessage(
                `Prepared ${result.count} calendar entr${result.count === 1 ? "y" : "ies"}. Import the file into your calendar. Notifications depend on your calendar settings. No appointment has been booked.`,
              );
            }}
          >
            <CalendarDays size={17} /> Calendar file
          </button>
        </div>
        <p className="field-help no-print">
          Calendar entries use the last day of each confirmed date window.
          Titles omit patient and medical details.
        </p>
        {message && (
          <div role="status" className="notice neutral no-print">
            {message}
          </div>
        )}
        <article className="brief-document">
          <div className="brief-brand">
            looplight <span>CARE HANDOFF BRIEF</span>
          </div>
          <h2>{episode.patientName}</h2>
          <p>
            Discharged {formatDate(episode.dischargeDate)} ·{" "}
            {episode.documentTitle}
          </p>
          <div className="brief-caveat">
            Patient / caregiver record. Completion is self-reported. Confirm
            medical decisions with the care team.
          </div>
          {loops.map((l, i) => (
            <section key={l.id} className="brief-item">
              <h3>
                {i + 1}. {l.title}
              </h3>
              <p>
                <strong>
                  {
                    {
                      suggested: "Not yet confirmed",
                      open: "Ready to follow through",
                      waiting: "Waiting for a reply",
                      received: "Result received; review next",
                      closed: "Reported complete",
                      dismissed: "Dismissed",
                    }[l.status]
                  }
                </strong>{" "}
                · Tracking: {l.owner || "Not assigned"}
                <br />
                Date:{" "}
                {l.dueDate
                  ? formatDate(l.dueDate) +
                    (l.dueEnd !== l.dueDate
                      ? " to " + formatDate(l.dueEnd)
                      : "")
                  : "Needs confirmation"}
              </p>
              <blockquote>{l.sourceQuote}</blockquote>
              {l.questions.length > 0 && (
                <ul>
                  {l.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              )}
              {l.closure && (
                <p>
                  <strong>Reported completion:</strong> {l.closure.note}
                  <br />
                  Reviewed with: {l.closure.reviewedBy || "Not specified"} ·
                  Reported by {l.closure.reporter} on{" "}
                  {formatDate(l.closure.date)}
                </p>
              )}
            </section>
          ))}
          {!loops.length && (
            <p>
              No follow-ups were proposed. Review the full source document for
              omissions.
            </p>
          )}
          <section className="brief-untracked">
            <h3>Source content without a linked follow-up</h3>
            <p>
              These original instructions were not converted into tracked tasks.
              They may still contain important next steps. Review them with the
              care team.
            </p>
            {episode.sentences
              .filter((s) => !episode.loops.some((l) => l.sourceId === s.id))
              .map((s) => (
                <blockquote key={s.id}>
                  <strong>{s.id.toUpperCase()}</strong> {s.text}
                </blockquote>
              ))}
          </section>
          <footer>
            Generated {formatDate(new Date().toISOString().slice(0, 10))}. This
            brief only reflects the supplied source and user updates. Keep the
            original discharge instructions.
          </footer>
        </article>
      </div>
    </Modal>
  );
}
