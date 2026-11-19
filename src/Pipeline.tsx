import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityType, AGENTS, Deal, Filters, STAGES, Stage } from "./types";
import { sampleDeals } from "./data/sample";
import { saveDeals, clearDeals } from "./lib/storage";
import { dealsToCsv } from "./lib/csv";
import { isOverdue } from "./lib/metrics";
import { uid, today } from "./lib/ids";
import { useHistory } from "./lib/history";
import { isBlank, RemoteStore, useRemoteSync } from "./lib/sync";
import { applyTheme, loadTheme, nextTheme, Theme } from "./lib/theme";
import Metrics from "./components/Metrics";
import FilterBar from "./components/FilterBar";
import Board from "./components/Board";
import CalendarView from "./components/CalendarView";
import Reports from "./components/Reports";
import DealDrawer from "./components/DealDrawer";
import ImportDialog from "./components/ImportDialog";

export type View = "board" | "calendar" | "reports";

const VIEWS: { id: View; label: string; key: string }[] = [
  { id: "board", label: "Board", key: "1" },
  { id: "calendar", label: "Calendar", key: "2" },
  { id: "reports", label: "Reports", key: "3" }
];

const VIEW_KEY = "deal-pipeline:view";
const emptyFilters: Filters = { search: "", agent: "", scores: [], overdueOnly: false };

function loadView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "calendar" || v === "reports" ? v : "board";
  } catch {
    return "board";
  }
}

function blankDeal(): Deal {
  return {
    id: uid(), customer: "", email: "", phone: "", vehicle: "", origin: "", destination: "",
    pickupDate: "", price: 0, score: "Warm", stage: "new", agent: AGENTS[0], followUp: today(),
    createdAt: new Date().toISOString(), activities: []
  };
}

function stageLog(stage: Stage) {
  const label = STAGES.find(s => s.id === stage)?.label ?? stage;
  return { id: uid(), type: "stage" as const, text: "Moved to " + label, at: new Date().toISOString() };
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

interface Toast {
  text: string;
  undo?: boolean;
}

interface Props {
  initialDeals: Deal[];
  /** "local" saves to this browser; "cloud" saves through the store and shares the board. */
  mode: "local" | "cloud";
  store?: RemoteStore;
  userEmail?: string;
  onSignOut?: () => void;
}

export default function Pipeline({ initialDeals, mode, store, userEmail, onSignOut }: Props) {
  const { state: deals, set: commit, remote, undo, redo, canUndo, canRedo } = useHistory<Deal[]>(() => initialDeals);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [view, setViewState] = useState<View>(loadView);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const searchRef = useRef<HTMLInputElement>(null);
  const syncStatus = useRemoteSync(deals, mode === "cloud" ? store : undefined, remote);

  useEffect(() => { if (mode === "local") saveDeals(deals); }, [deals, mode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const setView = useCallback((v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* per-viewer convenience only */ }
  }, []);

  const cycleTheme = () => {
    const t = nextTheme(theme);
    applyTheme(t);
    setTheme(t);
  };

  const agents = useMemo(() => Array.from(new Set([...AGENTS, ...deals.map(d => d.agent)])).sort(), [deals]);

  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return deals.filter(d => {
      if (filters.agent && d.agent !== filters.agent) return false;
      if (filters.scores.length && !filters.scores.includes(d.score)) return false;
      if (filters.overdueOnly && !isOverdue(d)) return false;
      if (q) {
        const hay = [d.customer, d.vehicle, d.origin, d.destination, d.email, d.phone].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deals, filters]);

  const update = useCallback((deal: Deal) => {
    commit(prev => prev.map(d => {
      if (d.id !== deal.id) return d;
      return d.stage !== deal.stage ? { ...deal, activities: [...deal.activities, stageLog(deal.stage)] } : deal;
    }), "edit:" + deal.id);
  }, [commit]);

  const move = useCallback((id: string, stage: Stage) => {
    const deal = deals.find(d => d.id === id);
    if (!deal || deal.stage === stage) return;
    commit(prev => prev.map(d => (d.id === id && d.stage !== stage ? { ...d, stage, activities: [...d.activities, stageLog(stage)] } : d)));
    setToast({ text: (deal.customer || "Deal") + " moved to " + (STAGES.find(s => s.id === stage)?.label ?? stage), undo: true });
  }, [commit, deals]);

  const reschedule = useCallback((id: string, date: string) => {
    commit(prev => prev.map(d => (d.id === id && d.followUp !== date ? { ...d, followUp: date } : d)));
  }, [commit]);

  const addActivity = useCallback((id: string, type: ActivityType, text: string) => {
    commit(prev => prev.map(d => d.id === id ? { ...d, activities: [...d.activities, { id: uid(), type, text, at: new Date().toISOString() }] } : d));
  }, [commit]);

  const remove = useCallback((id: string) => {
    commit(prev => prev.filter(d => d.id !== id));
    setSelected(null);
    setToast({ text: "Deal deleted", undo: true });
  }, [commit]);

  const create = useCallback(() => {
    const d = blankDeal();
    commit(prev => [d, ...prev], "edit:" + d.id);
    setSelected(d.id);
  }, [commit]);

  const exportCsv = () => {
    const blob = new Blob([dealsToCsv(deals)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deals-" + today() + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast({ text: "Exported " + deals.length + " deals" });
  };

  const importDeals = (incoming: Deal[]) => {
    commit(prev => [...incoming, ...prev]);
    setImporting(false);
    setToast({ text: "Imported " + incoming.length + " deals into New", undo: true });
  };

  const addSamples = () => {
    commit(prev => [...sampleDeals(), ...prev]);
    setToast({ text: "Sample deals added", undo: true });
  };

  const reset = () => {
    clearDeals();
    commit(() => sampleDeals());
    setSelected(null);
    setFilters(emptyFilters);
    setToast({ text: "Sample data restored", undo: true });
  };

  const doUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    setToast({ text: "Undone" });
  }, [canUndo, undo]);

  const doRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    setToast({ text: "Redone" });
  }, [canRedo, redo]);

  const current = selected ? deals.find(d => d.id === selected) ?? null : null;

  // A deal opened and closed without a name or any activity is thrown away (and leaves no undo step).
  const closeDrawer = useCallback(() => {
    const open = selected ? deals.find(d => d.id === selected) : undefined;
    if (open && isBlank(open)) remote(prev => prev.filter(d => d.id !== open.id));
    setSelected(null);
  }, [selected, deals, remote]);

  // An undo can take away the deal that is open in the drawer.
  useEffect(() => { if (selected && !current) setSelected(null); }, [selected, current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !isTyping(e.target)) {
        e.preventDefault();
        if (e.shiftKey) doRedo(); else doUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y" && !isTyping(e.target)) {
        e.preventDefault();
        doRedo();
        return;
      }
      if (mod || e.altKey || isTyping(e.target) || selected || importing) return;
      if (e.key === "n") { e.preventDefault(); create(); }
      else if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else {
        const v = VIEWS.find(x => x.key === e.key);
        if (v) setView(v.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo, doRedo, create, setView, selected, importing]);

  const statusText = syncStatus === "saving" ? "Saving…" : syncStatus === "error" ? "Not saved, retrying" : "Saved";

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Deal Pipeline</h1>
          <p>
            Vehicle transport sales, from first quote to delivery.{" "}
            {mode === "local" ? "Data stays in your browser." : <>Shared team board · <span className={"sync sync-" + syncStatus} role="status">{statusText}</span></>}
          </p>
        </div>
        <div className="actions">
          <div className="history-buttons">
            <button type="button" className="icon-btn" onClick={doUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">↶</button>
            <button type="button" className="icon-btn" onClick={doRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">↷</button>
          </div>
          <button type="button" className="icon-btn theme-btn" onClick={cycleTheme} aria-label={"Theme: " + theme} title={"Theme: " + theme}>
            {theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐"}
          </button>
          <button type="button" onClick={() => setImporting(true)}>Import CSV</button>
          <button type="button" onClick={exportCsv}>Export CSV</button>
          {mode === "local" ? <button type="button" onClick={reset}>Reset sample</button> : null}
          {onSignOut ? <button type="button" onClick={onSignOut} title={userEmail}>Sign out</button> : null}
          <button type="button" className="primary" onClick={create} title="Shortcut: N">New deal</button>
        </div>
      </header>

      <Metrics deals={deals} />

      <div className="toolbar">
        <nav className="views" aria-label="Views">
          {VIEWS.map(v => (
            <button key={v.id} type="button" className={"view-tab" + (view === v.id ? " on" : "")} aria-pressed={view === v.id} onClick={() => setView(v.id)} title={"Shortcut: " + v.key}>
              {v.label}
            </button>
          ))}
        </nav>
        <FilterBar filters={filters} agents={agents} onChange={setFilters} searchRef={searchRef} />
      </div>
      {visible.length !== deals.length ? <p className="showing">Showing {visible.length} of {deals.length} deals</p> : null}

      {deals.length === 0 ? (
        <div className="empty-board">
          <p>No deals yet. Import the output of AI Lead Qualifier, create one, or start with examples.</p>
          <button type="button" onClick={addSamples}>Add sample deals</button>
        </div>
      ) : null}

      {view === "board" ? <Board deals={visible} onOpen={setSelected} onMove={move} /> : null}
      {view === "calendar" ? <CalendarView deals={visible} onOpen={setSelected} onReschedule={reschedule} /> : null}
      {view === "reports" ? <Reports deals={visible} onOpen={setSelected} /> : null}

      {current ? (
        <DealDrawer deal={current} agents={agents} onChange={update} onAddActivity={addActivity} onDelete={remove} onClose={closeDrawer} />
      ) : null}
      {importing ? <ImportDialog agents={agents} onImport={importDeals} onClose={() => setImporting(false)} /> : null}
      {toast ? (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && canUndo ? <button type="button" onClick={doUndo}>Undo</button> : null}
        </div>
      ) : null}

      <footer className="foot">
        <span>Built with React and TypeScript by Teodor Ninkov. Imports the output of <a href="https://github.com/teodor-ninkov/ai-lead-qualifier">AI Lead Qualifier</a>.</span>
        <span className="shortcuts">Keys: <kbd>N</kbd> new · <kbd>/</kbd> search · <kbd>1</kbd>–<kbd>3</kbd> views · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd> move card</span>
        <a href="https://github.com/teodor-ninkov/deal-pipeline">View source on GitHub</a>
      </footer>
    </div>
  );
}
