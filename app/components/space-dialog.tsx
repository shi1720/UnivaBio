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
  version?: number;
};
export function SpaceDialog({
  spaces,
  active,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onRefresh,
}: {
  spaces: SpaceSummary[];
  active: string | undefined;
  onClose: () => void;
  onSelect: (id: string) => Promise<void>;
  onNew: () => void;
  onDelete: (space: SpaceSummary) => Promise<void>;
  onRefresh: () => Promise<SpaceSummary[]>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [failedId, setFailedId] = useState<string | null>(null),
    [confirmation, setConfirmation] = useState("");
  const failed = spaces.find((space) => space.id === failedId);
  const canDelete =
    failed && Number.isSafeInteger(failed.version) && failed.version! > 0;
  return (
    <Modal title="Your saved care spaces" onClose={onClose} busy={busy}>
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
                setError("");
                setFailedId(null);
                setConfirmation("");
                try {
                  await onSelect(s.id);
                  onClose();
                } catch (e) {
                  setFailedId(s.id);
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
        {failed && (
          <div className="delete-section">
            <h3>Recover access to {failed.patientName}’s care space</h3>
            <p>
              Try opening it again after reconnecting. You can also select
              another care space above. If this record changed, refresh the list
              before retrying.
            </p>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setConfirmation("");
                try {
                  await onRefresh();
                  setError("");
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not refresh your saved spaces.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Refresh saved spaces
            </button>
            {canDelete && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy || confirmation !== "DELETE") return;
                  setBusy(true);
                  setError("");
                  try {
                    await onDelete(failed);
                    setFailedId(null);
                    setConfirmation("");
                  } catch (e) {
                    setConfirmation("");
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Could not delete this care space.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p>
                  If you no longer need this record, you can permanently delete
                  its source, plan, and history from the app database without
                  opening it. An unreadable record cannot be exported here.
                  Provider backups may follow the provider’s retention policy.
                </p>
                <label>
                  Type DELETE to remove {failed.patientName}’s care space
                  <input
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>
                <button
                  className="danger-button"
                  disabled={busy || confirmation !== "DELETE"}
                >
                  <Trash2 size={16} /> Delete this care space
                </button>
              </form>
            )}
          </div>
        )}
        <button
          className="primary-button full-width"
          onClick={onNew}
          disabled={busy}
        >
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
  onSignIn,
  onOpenSpaces,
  onSignOut,
  localInference = false,
}: {
  user: UserInfo;
  episode: Episode | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
  saved: boolean;
  onSignIn?: () => void;
  onOpenSpaces?: () => void;
  onSignOut?: () => Promise<void>;
  localInference?: boolean;
}) {
  const [deleting, setDeleting] = useState(false),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={saved ? "Your account & data" : "About this demo"}
      onClose={onClose}
      busy={busy}
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
              : "Demo text and edits stay in this tab. Sign in to save a copy of the current care space, including your edits, across sessions."}
          </p>
          <h4>Where the AI runs</h4>
          <p>
            {localInference
              ? "The trained model runs on your device, including signed-in analysis. "
              : "The trained model runs on your device for the demo and on the app server for saved analysis. "}
            No external AI API receives your notes. Original PDF files are read
            locally and are not retained.
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
        {!saved && onOpenSpaces && (
          <button
            className="secondary-button full-width"
            onClick={onOpenSpaces}
          >
            <FolderHeart size={17} /> Open my saved spaces
          </button>
        )}
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
          {saved && onSignOut ? (
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSignOut();
                } catch {
                  setError("Could not sign out. Please retry.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LogOut size={16} /> Sign out
            </button>
          ) : !saved && onSignIn ? (
            <button className="primary-button" onClick={onSignIn}>
              Save this care space
            </button>
          ) : saved ? (
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
