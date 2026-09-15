"use client";
import {
  Plus,
  ChevronRight,
  FolderHeart,
  ShieldCheck,
  Download,
  Trash2,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import Modal from "./modal";
import { downloadText } from "../../lib/exports";
import type { Episode, UserInfo } from "../../lib/types";
export type SpaceSummary = {
  id: string;
  patientName: string;
  documentTitle: string;
  updatedAt: string;
};
export function SpaceDialog({
  spaces,
  active,
  onClose,
  onSelect,
  onNew,
}: {
  spaces: SpaceSummary[];
  active: string | undefined;
  onClose: () => void;
  onSelect: (id: string) => Promise<void>;
  onNew: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Your saved care spaces" onClose={onClose}>
      <div className="modal-body">
        <p className="lead">
          Each discharge has its own source, follow-ups, and history.
        </p>
        <div className="space-list">
          {spaces.map((s) => (
            <button
              key={s.id}
              className={"space-option " + (s.id === active ? "active" : "")}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSelect(s.id);
                  onClose();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not load the care space.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <span className="type-icon blue">
                <FolderHeart size={21} />
              </span>
              <span>
                <strong>{s.patientName}</strong>
                <small>{s.documentTitle}</small>
              </span>
              <ChevronRight size={19} />
            </button>
          ))}
        </div>
        {!spaces.length && (
          <p>No saved care spaces yet. Start with a discharge summary.</p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button full-width" onClick={onNew}>
          <Plus size={17} /> Create a care space
        </button>
      </div>
    </Modal>
  );
}
export function AccountDialog({
  user,
  episode,
  onClose,
  onDelete,
  saved,
}: {
  user: UserInfo;
  episode: Episode | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
  saved: boolean;
}) {
  const [deleting, setDeleting] = useState(false),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={saved ? "Your account & data" : "About this demo"}
      onClose={onClose}
    >
      <div className="modal-body">
        <div className="account-heading">
          <ShieldCheck size={29} />
          <h3>
            {saved
              ? user?.displayName
              : "A fictional family. A working workflow."}
          </h3>
          <p>
            {saved
              ? user?.email
              : "Anita and Maya are fictional. Demo changes reset when the page reloads."}
          </p>
        </div>
        <div className="privacy-copy">
          <h4>What is saved</h4>
          <p>
            {saved
              ? "Your source text, care plan, and activity history are stored in an account-scoped database. You can export or delete the current care space below."
              : "Demo text and edits stay in the current browser session. Sign in to save a separate care space across sessions."}
          </p>
          <h4>Where the AI runs</h4>
          <p>
            The trained model runs on your device for the demo and on the app
            server for saved analysis. No external AI API receives your notes.
            Original PDF files are read locally and are not retained.
          </p>
          <h4>A research prototype</h4>
          <p>
            Use fictional or de-identified records. Looplight has not been
            clinically validated or cleared for medical decision-making.
            Production use with identifiable health data needs a security,
            privacy, and clinical governance review.
          </p>
          <h4>Access</h4>
          <p>
            Saved care spaces belong to one signed-in account. Naming a
            caregiver tracks responsibility within that record; it does not
            invite another user or grant them access.
          </p>
        </div>
        {episode && (
          <button
            className="secondary-button full-width"
            onClick={() =>
              downloadText(
                JSON.stringify(
                  {
                    format: "looplight-export-v1",
                    exportedAt: new Date().toISOString(),
                    episode,
                  },
                  null,
                  2,
                ),
                "looplight-care-space.json",
                "application/json",
              )
            }
          >
            <Download size={17} /> Export this care space (JSON)
          </button>
        )}
        {saved && episode && (
          <div className="delete-section">
            {!deleting ? (
              <button
                className="text-button danger"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={16} /> Delete the current care space
              </button>
            ) : (
              <>
                <p>
                  This permanently removes{" "}
                  <strong>{episode.patientName}</strong>’s source text, plan,
                  and history from the app database. Download an export first if
                  you need it. Provider backups may follow the hosting
                  provider’s retention policy.
                </p>
                <label>
                  Type DELETE to confirm
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <button
                  className="danger-button"
                  disabled={confirm !== "DELETE" || busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onDelete();
                      onClose();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Delete failed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete care space
                </button>
              </>
            )}
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="account-bottom">
          {saved ? (
            <a
              className="text-button"
              href="/signout-with-chatgpt?return_to=%2F"
              target="_top"
            >
              <LogOut size={16} /> Sign out
            </a>
          ) : (
            <a className="primary-button" href="/space" target="_top">
              Open a saved care space
            </a>
          )}
          <span>Looplight · Shivam Gupta</span>
        </div>
      </div>
    </Modal>
  );
}
