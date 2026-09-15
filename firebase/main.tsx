import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import {
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  Mail,
  Eye,
  EyeOff,
  HeartHandshake,
} from "lucide-react";
import { auth } from "./client";
import { firebaseApi, saveDemoCopy } from "./store";
import Looplight from "../app/looplight";
import Modal from "../app/components/modal";
import type { Episode } from "../lib/types";
import { clearDrafts } from "../lib/drafts";
import "../app/globals.css";

function authMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (
    code.includes("popup-closed-by-user") ||
    code.includes("cancelled-popup-request")
  )
    return "Sign-in was closed. Your care space is still here.";
  if (code.includes("popup-blocked"))
    return "The browser blocked the sign-in window. Allow pop-ups for Looplight, or use email sign-in below.";
  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  )
    return "The email or password was not accepted. Check both, or use Reset password.";
  if (code.includes("email-already-in-use"))
    return "An account already uses this email. Choose Sign in or Reset password.";
  if (code.includes("network-request-failed"))
    return "Connection interrupted. Your care space is still here; reconnect and retry.";
  if (code.includes("too-many-requests"))
    return "There have been too many attempts. Please wait a little and retry.";
  return error instanceof Error
    ? error.message
    : "Sign-in did not finish. Please retry.";
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false);
  const [workspace, setWorkspace] = useState(
    location.pathname.startsWith("/space"),
  );
  const [showAuth, setShowAuth] = useState(
    location.pathname.startsWith("/space"),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [create, setCreate] = useState(false),
    [reveal, setReveal] = useState(false);
  const [initialId, setInitialId] = useState<string>();
  const pendingDraft = useRef<Episode | undefined>(undefined);
  const previousUid = useRef<string | null>(null);
  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        if (previousUid.current && previousUid.current !== next?.uid) {
          clearDrafts();
          pendingDraft.current = undefined;
          setInitialId(undefined);
          setPassword("");
        }
        previousUid.current = next?.uid ?? null;
        setUser(next);
        setReady(true);
        if (next && !pendingDraft.current) setShowAuth(false);
      }),
    [],
  );
  function requestSignIn(episode?: Episode) {
    pendingDraft.current = episode;
    setError("");
    setMessage("");
    if (auth.currentUser) {
      void completeSignIn();
      return;
    }
    setShowAuth(true);
  }
  async function completeSignIn() {
    setBusy(true);
    setError("");
    try {
      if (pendingDraft.current) {
        const copy = await saveDemoCopy(pendingDraft.current);
        setInitialId(copy.id);
        pendingDraft.current = undefined;
      }
      setPassword("");
      setShowAuth(false);
      setWorkspace(true);
      history.replaceState({}, "", "/space");
    } catch (e) {
      setShowAuth(true);
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function login(google = false) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (google) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
      } else if (create)
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      await completeSignIn();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await signOut(auth);
    clearDrafts();
    pendingDraft.current = undefined;
    setInitialId(undefined);
    setWorkspace(false);
    setShowAuth(false);
    setPassword("");
    history.replaceState({}, "", "/");
  }
  if (!ready)
    return (
      <div className="app-loading">
        <span className="brand-mark">
          l<span>•</span>
        </span>
        <h1>Opening Looplight</h1>
        <p>Your next steps, together.</p>
        <LoaderCircle className="spin" size={24} />
      </div>
    );
  const saved = workspace && !!user;
  return (
    <>
      <Looplight
        key={saved ? user!.uid : "demo"}
        mode={saved ? "saved" : "demo"}
        user={
          user
            ? {
                displayName:
                  user.displayName ||
                  user.email?.split("@")[0] ||
                  "Your account",
                email: user.email ?? "",
              }
            : null
        }
        apiClient={firebaseApi}
        onSignIn={requestSignIn}
        onSignOut={logout}
        localInference
        initialEpisodeId={initialId}
      />
      {busy && !showAuth && (
        <div className="saving-overlay" role="status">
          <LoaderCircle className="spin" size={20} /> Saving your care space...
        </div>
      )}
      {showAuth && (
        <Modal
          title={user ? "Save your care space" : "Keep the next steps together"}
          busy={busy}
          onClose={() => {
            setShowAuth(false);
            if (!user) {
              setWorkspace(false);
              history.replaceState({}, "", "/");
            }
          }}
        >
          <div className="modal-body auth-body">
            <span className="auth-symbol">
              <HeartHandshake size={30} />
            </span>
            <h3>
              {user
                ? "You are signed in."
                : "Your care space, ready when you return."}
            </h3>
            <p className="lead">
              {pendingDraft.current
                ? "Save this source, your follow-ups, and the changes you have already made."
                : "Sign in to save discharge notes and follow-ups privately to your account."}
            </p>
            {user ? (
              <button
                className="primary-button full-width"
                disabled={busy}
                onClick={() => void completeSignIn()}
              >
                {busy ? "Saving..." : "Save and continue"}
                <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <button
                  className="google-button"
                  disabled={busy}
                  onClick={() => void login(true)}
                >
                  <span className="google-g" aria-hidden="true">
                    G
                  </span>
                  Continue with Google
                </button>
                <div className="auth-divider">
                  <span>or use email</span>
                </div>
                <div
                  className="auth-tabs"
                  role="group"
                  aria-label="Choose account action"
                >
                  <button
                    aria-pressed={!create}
                    onClick={() => {
                      setCreate(false);
                      setError("");
                    }}
                    disabled={busy}
                  >
                    Sign in
                  </button>
                  <button
                    aria-pressed={create}
                    onClick={() => {
                      setCreate(true);
                      setError("");
                    }}
                    disabled={busy}
                  >
                    Create account
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void login();
                  }}
                >
                  <label>
                    Email address
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      disabled={busy}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    Password
                    <span className="password-field">
                      <input
                        type={reveal ? "text" : "password"}
                        minLength={create ? 10 : 1}
                        maxLength={128}
                        autoComplete={
                          create ? "new-password" : "current-password"
                        }
                        required
                        value={password}
                        disabled={busy}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setReveal(!reveal)}
                        aria-label={reveal ? "Hide password" : "Show password"}
                      >
                        {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                    {create && (
                      <small>
                        Use at least 10 characters and a password you do not use
                        elsewhere.
                      </small>
                    )}
                  </label>
                  <button
                    className="primary-button full-width"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? (
                      <LoaderCircle size={18} className="spin" />
                    ) : (
                      <Mail size={18} />
                    )}
                    {create
                      ? "Create account and continue"
                      : "Sign in and continue"}
                  </button>
                </form>
                {!create && (
                  <button
                    className="text-button reset-password"
                    disabled={busy || !email.includes("@")}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await sendPasswordResetEmail(auth, email.trim());
                        setMessage(
                          "If this address has an account, a password reset email is on its way.",
                        );
                      } catch (e) {
                        setError(authMessage(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Reset password
                  </button>
                )}
              </>
            )}
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="notice neutral" role="status">
                {message}
              </div>
            )}
            <div className="auth-privacy">
              <ShieldCheck size={19} />
              <p>
                Only your signed-in account can open saved care spaces. Analysis
                runs on your device. Use fictional or de-identified notes in
                this research prototype.
              </p>
            </div>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setShowAuth(false);
                setWorkspace(false);
                history.replaceState({}, "", "/");
              }}
            >
              Continue exploring the demo <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="app-loading">
        <h1>Let’s reopen your care space.</h1>
        <p>
          The app could not display this page. Saved data stays in your account.
          Unsaved changes may need to be entered again.
        </p>
        <button className="primary-button" onClick={() => location.reload()}>
          Reload Looplight
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
