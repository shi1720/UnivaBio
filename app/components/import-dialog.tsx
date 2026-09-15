"use client";
import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  FlaskConical,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import Modal from "./modal";
import { inputSchema } from "../../lib/commands";
import { DEMO_TEXT, CHALLENGE_TEXT } from "../../lib/demo";
import { today, addDays } from "../../lib/dates";
import { readDocumentFile } from "../../lib/import-file";
export default function ImportDialog({
  onClose,
  onImport,
  saved,
}: {
  onClose: () => void;
  onImport: (
    input: {
      patientName: string;
      documentTitle: string;
      dischargeDate: string;
      sourceText: string;
    },
    requestId: string,
  ) => Promise<void>;
  saved: boolean;
}) {
  const [patientName, setName] = useState(""),
    [documentTitle, setTitle] = useState("Discharge summary"),
    [dischargeDate, setDate] = useState(today()),
    [sourceText, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fileBusy, setFileBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  function sample(challenge = false) {
    setName(challenge ? "Jordan Lee" : "Anita Rao");
    setTitle(
      challenge
        ? "Conflicting instructions · fictional"
        : "Anita’s discharge summary · fictional",
    );
    setDate(addDays(today(), -2));
    setText(challenge ? CHALLENGE_TEXT : DEMO_TEXT);
    setError("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = inputSchema.safeParse({
      patientName,
      documentTitle,
      dischargeDate,
      sourceText,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const fingerprint = JSON.stringify(parsed.data);
      if (lastRequest.current?.fingerprint !== fingerprint) {
        lastRequest.current = { fingerprint, id: crypto.randomUUID() };
      }
      await onImport(parsed.data, lastRequest.current.id);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Analysis failed. Your notes are still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Start with the instructions" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="modal-body">
          <p className="lead">
            Bring the original notes. Looplight will suggest the unfinished
            follow-ups for you to check.
          </p>
          <div className="notice neutral">
            <ShieldCheck size={18} />
            <p>
              Use fictional or de-identified notes in this research prototype.{" "}
              {saved
                ? "Extracted text and your care plan are saved privately to your account."
                : "Demo analysis runs in this browser and resets on refresh."}{" "}
              No document text is sent to an external AI service.
            </p>
          </div>
          <div className="sample-options">
            <button
              type="button"
              className="sample-button"
              onClick={() => sample()}
            >
              <FileText size={18} />
              <span>
                Anita’s discharge<small>Try the three-follow-up example</small>
              </span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="sample-button"
              onClick={() => sample(true)}
            >
              <FlaskConical size={18} />
              <span>
                Challenge the AI
                <small>Conflicting dates & unclear details</small>
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Patient display name
              <input
                value={patientName}
                maxLength={80}
                required
                placeholder="A name or nickname"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Discharge date
              <input
                type="date"
                required
                value={dischargeDate}
                onChange={(e) => setDate(e.target.value)}
              />
              <small>Relative dates use this day as their reference.</small>
            </label>
          </div>
          <label>
            Document title
            <input
              required
              maxLength={160}
              value={documentTitle}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="field-heading">
            <label htmlFor="source-notes">Original instructions</label>
            <button
              type="button"
              className="text-button"
              disabled={fileBusy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} />
              {fileBusy ? "Reading file…" : "Import PDF or text"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,text/plain,.pdf,.txt"
            aria-label="Import discharge document"
            className="visually-hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFileBusy(true);
              setError("");
              try {
                setText(await readDocumentFile(file));
                setTitle(file.name.replace(/\.(pdf|txt)$/i, ""));
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "We could not read that file.",
                );
              } finally {
                setFileBusy(false);
                e.target.value = "";
              }
            }}
          />
          <textarea
            id="source-notes"
            rows={9}
            maxLength={40000}
            required
            value={sourceText}
            placeholder="Paste the discharge instructions exactly as written…"
            onChange={(e) => setText(e.target.value)}
          />
          <div className="field-meta">
            <span>
              Text-based PDF or .txt · up to 5 MB / 20 pages · English
            </span>
            <span>{sourceText.length.toLocaleString()} / 40,000</span>
          </div>
          <p className="field-help">
            The PDF is read on your device; only extracted text is saved in a
            signed-in care space. Scanned images are not supported. Check the
            extracted text before continuing.
          </p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer className="modal-footer">
          <span className="muted">You confirm each suggestion.</span>
          <button
            className="primary-button"
            disabled={busy || fileBusy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <FlaskConical size={17} />
            )}{" "}
            {busy
              ? "Finding follow-ups…"
              : saved
                ? "Analyze & save care space"
                : "Find the open loops"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
