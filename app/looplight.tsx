"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  LayoutDashboard,
  FileText,
  FlaskConical,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Check,
  Clock3,
  Download,
  HeartHandshake,
  Circle,
  FolderHeart,
  RotateCcw,
  LoaderCircle,
  Search,
  X,
  ChevronDown,
  ListChecks,
} from "lucide-react";
import { makeDemo } from "../lib/demo";
import { analyzeDocument } from "../lib/engine";
import { applyCommand } from "../lib/commands";
import { formatDate, today } from "../lib/dates";
import { registerCareTools } from "../lib/webmcp";
import type { Episode, CareLoop, ActionCommand, UserInfo } from "../lib/types";
import ImportDialog from "./components/import-dialog";
import LoopDetail, { STATUS_LABELS } from "./components/loop-detail";
import SourceView from "./components/source-view";
import EvidenceView from "./components/evidence-view";
import BriefDialog from "./components/brief-dialog";
import {
  SpaceDialog,
  AccountDialog,
  type SpaceSummary,
} from "./components/space-dialog";
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw Error(
      "Connection interrupted. Your input is still here; reconnect and retry.",
    );
  }
  let payload: { error?: string };
  try {
    payload = (await response.json()) as { error?: string };
  } catch {
    throw Error("The app could not read the server response. Please retry.");
  }
  if (!response.ok)
    throw Error(payload.error || "The request did not complete. Please retry.");
  return payload as T;
}
export default function Looplight({
  mode = "demo",
  user = null,
}: {
  mode?: "demo" | "saved";
  user?: UserInfo;
}) {
  const saved = mode === "saved";
  const [episode, setEpisode] = useState<Episode | null>(() =>
    saved ? null : makeDemo(),
  );
  const episodeRef = useRef(episode);
  useEffect(() => {
    episodeRef.current = episode;
  }, [episode]);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]),
    [view, setView] = useState<"board" | "sources" | "evidence">("board"),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [showImport, setImport] = useState(false),
    [showBrief, setBrief] = useState(false),
    [showSpaces, setShowSpaces] = useState(false),
    [showAccount, setAccount] = useState(false),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [highlight, setHighlight] = useState<string | null>(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(saved);
  const loadSpace = useCallback(async (id: string) => {
    const result = await api<{ episode: Episode }>(
      `/api/episodes/${encodeURIComponent(id)}`,
    );
    setEpisode(result.episode);
    setView("board");
    setFilter("all");
    setQuery("");
    setSelectedId(null);
    setError("");
  }, []);
  const refreshList = useCallback(async () => {
    const result = await api<{ episodes: SpaceSummary[] }>("/api/episodes");
    setSpaces(result.episodes);
    return result.episodes;
  }, []);
  useEffect(() => {
    if (!saved) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await api<{ episodes: SpaceSummary[] }>("/api/episodes");
        if (cancelled) return;
        setSpaces(items.episodes);
        if (items.episodes[0]) {
          const result = await api<{ episode: Episode }>(
            `/api/episodes/${encodeURIComponent(items.episodes[0].id)}`,
          );
          if (!cancelled) setEpisode(result.episode);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Could not load your care spaces.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [saved]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(
    () =>
      registerCareTools(
        () => episodeRef.current,
        () => setImport(true),
      ),
    [],
  );
  async function onImport(
    input: {
      patientName: string;
      documentTitle: string;
      dischargeDate: string;
      sourceText: string;
    },
    requestId: string,
  ) {
    const next = saved
      ? (
          await api<{ episode: Episode }>("/api/episodes", {
            method: "POST",
            headers: { "Idempotency-Key": requestId },
            body: JSON.stringify(input),
          })
        ).episode
      : analyzeDocument(input, "demo-" + Date.now());
    setEpisode(next);
    setView("board");
    setFilter("all");
    setQuery("");
    setSelectedId(null);
    setToast(
      `${next.loops.length} suggestions ready to review.${saved ? " Care space saved." : " Demo changes reset on refresh."}`,
    );
    if (saved)
      try {
        await refreshList();
      } catch {
        setError(
          "Your new care space is saved. The care-space list could not refresh; use Retry to reload it.",
        );
      }
  }
  async function onCommand(command: ActionCommand) {
    const current = episodeRef.current;
    if (!current) throw Error("Choose a care space first.");
    const updated = saved
      ? (
          await api<{ episode: Episode }>(
            `/api/episodes/${encodeURIComponent(current.id)}`,
            {
              method: "PATCH",
              body: JSON.stringify({ version: current.version, command }),
            },
          )
        ).episode
      : applyCommand(current, command, "Maya · fictional demo");
    setEpisode(updated);
    episodeRef.current = updated;
    setToast(
      command.type === "confirm"
        ? "Follow-up confirmed. Its source stays attached."
        : command.type === "close"
          ? "Completion recorded. The report is saved in the history."
          : command.type === "manual"
            ? "Added for review. Confirm the details on the care board."
            : "Change recorded in the follow-up history.",
    );
  }
  const loops = episode?.loops ?? [],
    active = loops.filter((l) => !["closed", "dismissed"].includes(l.status)),
    needsReview = loops.filter((l) => l.status === "suggested"),
    closed = loops.filter((l) => l.status === "closed"),
    unproposed =
      episode?.sentences.filter(
        (s) => !loops.some((loop) => loop.sourceId === s.id),
      ).length ?? 0;
  const displayed = loops.filter(
    (l) =>
      (filter === "all"
        ? l.status !== "dismissed" && l.status !== "closed"
        : filter === "review"
          ? l.status === "suggested"
          : filter === "closed"
            ? l.status === "closed" || l.status === "dismissed"
            : filter === "waiting"
              ? l.status === "waiting" || l.status === "received"
              : l.status === "open") &&
      (l.title + " " + l.sourceQuote + " " + l.owner)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected = loops.find((l) => l.id === selectedId);
  const name = episode?.patientName ?? "Your care space";
  function source(id?: string) {
    setSelectedId(null);
    setHighlight(id ?? null);
    setView("sources");
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Looplight demo">
          <span className="brand-mark" aria-hidden="true">
            l<span>•</span>
          </span>
          looplight
        </Link>
        <div className="workspace-label">YOUR CARE SPACE</div>
        <nav aria-label="Main navigation">
          <button
            aria-current={view === "board" ? "page" : undefined}
            className={"nav-item " + (view === "board" ? "active" : "")}
            onClick={() => setView("board")}
            title="Care board"
          >
            <LayoutDashboard size={19} />
            <span className="nav-text">Care board</span>
            <span className="nav-count">{active.length}</span>
          </button>
          <button
            aria-current={view === "sources" ? "page" : undefined}
            className={"nav-item " + (view === "sources" ? "active" : "")}
            onClick={() => source()}
            title="Source documents"
          >
            <FileText size={19} />
            <span className="nav-text">Source documents</span>
          </button>
          <button
            aria-current={view === "evidence" ? "page" : undefined}
            className={"nav-item " + (view === "evidence" ? "active" : "")}
            onClick={() => setView("evidence")}
            title="Evidence and AI"
          >
            <FlaskConical size={19} />
            <span className="nav-text">Evidence & AI</span>
          </button>
        </nav>
        <div className="side-note">
          <HeartHandshake size={24} />
          <h3>A little less to carry.</h3>
          <p>
            Keep the next steps together, even when care happens in different
            places.
          </p>
        </div>
        <button className="profile" onClick={() => setAccount(true)}>
          <span className="avatar">
            {saved
              ? (user?.displayName.slice(0, 2).toUpperCase() ?? "ME")
              : "MR"}
          </span>
          <span>
            {saved ? "Your account" : "Maya’s care space"}
            <small>{saved ? "Account & data" : "Fictional demo"}</small>
          </span>
          <ChevronRight size={16} />
        </button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="space-switch"
            onClick={() => (saved ? setShowSpaces(true) : setAccount(true))}
          >
            <span>Care space</span>
            <ChevronRight size={14} />
            <strong>{name}</strong>
            {saved && <ChevronDown size={14} />}
          </button>
          <div>
            {!saved ? (
              <>
                <span className="demo-badge">FICTIONAL DEMO</span>
                <a className="text-button" href="/space" target="_top">
                  Sign in for saved spaces <ArrowUpRight size={15} />
                </a>
              </>
            ) : (
              <>
                <Link className="text-button" href="/">
                  Try the demo
                </Link>
                <button
                  className="top-account"
                  onClick={() => setAccount(true)}
                  aria-label="Account and data"
                >
                  <ShieldCheck size={18} />
                  <span>Private care space</span>
                </button>
              </>
            )}
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {error && (
            <div className="notice error" role="alert">
              <span>{error}</span>
              <button
                className="text-button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const list = await refreshList();
                    if (episode) await loadSpace(episode.id);
                    else if (list[0]) await loadSpace(list[0].id);
                    setError("");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Retry failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div className="empty-state loading-state">
              <LoaderCircle className="spin" size={30} />
              <h1>Opening your care space</h1>
              <p>Loading your saved source and follow-ups.</p>
            </div>
          ) : view === "evidence" ? (
            <EvidenceView onChallenge={() => setImport(true)} />
          ) : !episode ? (
            <div className="welcome-state">
              <span className="type-icon blue">
                <FolderHeart size={28} />
              </span>
              <div className="eyebrow">A PLACE FOR THE NEXT STEPS</div>
              <h1>Make the handoff complete.</h1>
              <p>
                Start a care space with a discharge summary. Review the
                follow-ups, choose who will track them, and keep a record of
                what happened.
              </p>
              <button
                className="primary-button"
                onClick={() => setImport(true)}
              >
                <Plus size={18} /> Add discharge notes
              </button>
              <Link href="/" className="text-button">
                Explore the fictional example <ArrowRight size={17} />
              </Link>
              <div className="notice neutral">
                <ShieldCheck size={20} />
                <p>
                  Signed in. Care spaces are saved to your account. Use
                  fictional or de-identified notes while this prototype is being
                  evaluated.
                </p>
              </div>
            </div>
          ) : view === "sources" ? (
            <SourceView
              key={`${episode.id}:${highlight ?? "all"}`}
              episode={episode}
              highlight={highlight}
              onCommand={onCommand}
              onLoop={setSelectedId}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">THE NEXT CHAPTER OF CARE</div>
                  <h1>Every follow-up. Followed through.</h1>
                  <p>A clear place for the things that still need to happen.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setImport(true)}
                >
                  <Plus size={18} /> Add discharge notes
                </button>
              </div>
              <section className="journey">
                <div>
                  <span className="pill">
                    <span className="tiny-ring" /> {name.split(" ")[0]}’s
                    handoff
                  </span>
                  <h2>
                    {active.length
                      ? "Home is the start of the next steps."
                      : closed.length
                        ? "A recorded ending for every next step."
                        : "Start by checking the original notes."}
                  </h2>
                  <p>
                    {active.length} open loop{active.length === 1 ? "" : "s"} ·{" "}
                    {closed.length} reported complete. <br />
                    {needsReview.length
                      ? `${needsReview.length} ${needsReview.length === 1 ? "suggestion needs" : "suggestions need"} your review.`
                      : "Every follow-up stays connected to its source."}
                  </p>
                  <button className="journey-link" onClick={() => source()}>
                    View the original notes <ArrowRight size={17} />
                  </button>
                </div>
                <div
                  className="journey-graphic"
                  aria-label={`${active.length} open follow-ups and ${closed.length} reported complete`}
                >
                  <div className="progress-path" />
                  <div className="journey-step">
                    <span className="step-node done">
                      <Check size={22} />
                    </span>
                    <b>Discharged</b>
                    <small>{formatDate(episode.dischargeDate)}</small>
                  </div>
                  <div className="journey-step">
                    <span className="step-node current">{active.length}</span>
                    <b>Follow through</b>
                    <small>Open loops to close</small>
                  </div>
                  <div className="journey-step">
                    <span
                      className={
                        "step-node " +
                        (!active.length && closed.length ? "done" : "")
                      }
                    >
                      <ShieldCheck size={23} />
                    </span>
                    <b>Record completion</b>
                    <small>{closed.length} user-reported</small>
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <div>
                  <h2>
                    Your follow-ups{" "}
                    <span className="count">{active.length}</span>
                  </h2>
                  <p>
                    Start with the missing details. Then take the next step.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => setBrief(true)}
                >
                  <Download size={16} /> Visit brief
                </button>
              </div>
              <div className="board-toolbar">
                <div
                  className="filter-tabs"
                  role="group"
                  aria-label="Filter follow-ups"
                >
                  {[
                    { id: "all", name: "Open loops", count: active.length },
                    {
                      id: "review",
                      name: "Needs review",
                      count: needsReview.length,
                    },
                    {
                      id: "waiting",
                      name: "Waiting",
                      count: loops.filter((l) =>
                        ["waiting", "received"].includes(l.status),
                      ).length,
                    },
                    {
                      id: "closed",
                      name: "History",
                      count: loops.filter((l) =>
                        ["closed", "dismissed"].includes(l.status),
                      ).length,
                    },
                  ].map((f) => (
                    <button
                      key={f.id}
                      aria-pressed={filter === f.id}
                      className={filter === f.id ? "active" : ""}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.name}
                      <span>{f.count}</span>
                    </button>
                  ))}
                </div>
                <div className="search-field compact">
                  <Search size={16} />
                  <input
                    aria-label="Search follow-ups"
                    placeholder="Find a follow-up"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="board-grid">
                {displayed.map((loop) => (
                  <LoopCard
                    key={loop.id}
                    loop={loop}
                    onClick={() => setSelectedId(loop.id)}
                  />
                ))}
              </div>
              {!displayed.length && (
                <div className="empty-state">
                  <ListChecks size={32} />
                  <h3>
                    {query
                      ? "No matching follow-ups"
                      : filter === "review"
                        ? "All suggestions have been reviewed"
                        : filter === "closed"
                          ? "No completed or dismissed follow-ups yet"
                          : filter === "waiting"
                            ? "No follow-ups are waiting for a reply"
                            : "No open follow-ups in this view"}
                  </h3>
                  <p>
                    {query
                      ? "Try another word or clear the search."
                      : "Check the source for anything the system may have missed."}
                  </p>
                  <button className="text-button" onClick={() => source()}>
                    Review the original notes <ArrowRight size={17} />
                  </button>
                </div>
              )}
              <section className="detail-preview">
                <div className="detail-label">
                  <FileText size={20} />
                  <span>CONNECTED TO THE SOURCE</span>
                </div>
                <div>
                  <blockquote>
                    “{loops[0]?.sourceQuote ?? episode.sourceText.slice(0, 200)}
                    ”
                  </blockquote>
                  <p>
                    {episode.documentTitle} · Original instructions retained
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => source(loops[0]?.sourceId)}
                >
                  Read source <ChevronRight size={17} />
                </button>
              </section>
              <button className="coverage-note" onClick={() => source()}>
                <span>
                  <FileText size={17} />
                  <strong>Check what wasn’t turned into a task.</strong>{" "}
                  {unproposed} source segments remain for review.
                </span>
                <ArrowRight size={17} />
              </button>
              {!saved && (
                <div className="demo-footer">
                  <span>Fictional demo · changes reset on refresh</span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setEpisode(makeDemo());
                      setFilter("all");
                      setQuery("");
                      setToast("Anita’s fictional example has been reset.");
                    }}
                  >
                    <RotateCcw size={14} /> Reset example
                  </button>
                </div>
              )}
            </>
          )}
          <div className="bottom-note">
            <ShieldCheck size={16} />
            <span>
              Looplight organizes existing instructions. Your care team confirms
              medical decisions.
            </span>
            <span className="made-by">Shivam Gupta · UnivaBio 2026</span>
          </div>
        </main>
      </div>
      {showImport && (
        <ImportDialog
          saved={saved}
          onClose={() => setImport(false)}
          onImport={onImport}
        />
      )}{" "}
      {selected && episode && (
        <LoopDetail
          key={selected.id}
          loop={selected}
          episode={episode}
          onClose={() => setSelectedId(null)}
          onCommand={onCommand}
          onSource={source}
        />
      )}{" "}
      {showBrief && episode && (
        <BriefDialog episode={episode} onClose={() => setBrief(false)} />
      )}{" "}
      {showSpaces && (
        <SpaceDialog
          spaces={spaces}
          active={episode?.id}
          onClose={() => setShowSpaces(false)}
          onSelect={loadSpace}
          onNew={() => {
            setShowSpaces(false);
            setImport(true);
          }}
        />
      )}{" "}
      {showAccount && (
        <AccountDialog
          saved={saved}
          user={user}
          episode={episode}
          onClose={() => setAccount(false)}
          onDelete={async () => {
            if (!episode) return;
            await api(`/api/episodes/${encodeURIComponent(episode.id)}`, {
              method: "DELETE",
              body: JSON.stringify({
                confirmation: "DELETE",
                version: episode.version,
              }),
            });
            const list = await refreshList();
            if (list[0]) await loadSpace(list[0].id);
            else setEpisode(null);
            setToast("Care space removed from the app database.");
          }}
        />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function LoopCard({ loop, onClick }: { loop: CareLoop; onClick: () => void }) {
  const color =
    loop.status === "closed"
      ? "green"
      : loop.status === "suggested"
        ? "amber"
        : "blue";
  const date = loop.dueEnd ?? loop.dueDate;
  const overdue =
    date &&
    date < today() &&
    !["suggested", "closed", "dismissed"].includes(loop.status);
  return (
    <button
      className={
        "loop-card " + (loop.status === "suggested" ? "suggestion" : "")
      }
      onClick={onClick}
    >
      <div className="card-top">
        <span className={"type-icon " + color}>
          {loop.category === "pending_result" ? (
            <FlaskConical size={21} />
          ) : (
            <HeartHandshake size={21} />
          )}
        </span>
        <span className="source-tag">SOURCE {loop.sourceId.toUpperCase()}</span>
      </div>
      <div className="card-type">
        {loop.category === "pending_result"
          ? "Pending result"
          : "Follow-up action"}
      </div>
      <h3>{loop.title}</h3>
      <p>
        {loop.category === "pending_result"
          ? "Track the result through receipt and a conversation with the care team."
          : loop.documentedOwner
            ? `Care team mentioned: ${loop.documentedOwner}`
            : "Confirm who will arrange this and review what happens next."}
      </p>
      <div className={"card-date " + (overdue ? "overdue" : "")}>
        <Clock3 size={15} />
        {date
          ? `${overdue ? "Date passed · " : ""}${formatDate(date)}${loop.dueDate !== loop.dueEnd ? " · window ends" : ""}`
          : "Timing needs confirmation"}
      </div>
      {loop.owner && (
        <div className="card-owner">
          <span>{loop.owner.slice(0, 1).toUpperCase()}</span>
          {loop.owner}
        </div>
      )}
      <div className="card-footer">
        <span className={"status " + color}>
          <Circle size={7} fill="currentColor" />
          {STATUS_LABELS[loop.status]}
        </span>
        <ArrowUpRight size={19} />
      </div>
    </button>
  );
}
