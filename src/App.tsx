import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityType, AGENTS, Deal, Filters, STAGES, Stage } from "./types";
import { sampleDeals } from "./data/sample";
import { loadDeals, saveDeals, clearDeals } from "./lib/storage";
import { dealsToCsv } from "./lib/csv";
import { isOverdue } from "./lib/metrics";
import { uid, today } from "./lib/ids";
import Metrics from "./components/Metrics";
import FilterBar from "./components/FilterBar";
import Board from "./components/Board";
import DealDrawer from "./components/DealDrawer";
import ImportDialog from "./components/ImportDialog";

const emptyFilters: Filters = { search: "", agent: "", scores: [], overdueOnly: false };

function blankDeal(): Deal {
  return {
    id: uid(), customer: "", email: "", phone: "", vehicle: "", origin: "", destination: "",
    pickupDate: "", price: 0, score: "Warm", stage: "new", agent: AGENTS[0], followUp: today(),
    createdAt: new Date().toISOString(), activities: []
  };
}

export default function App() {
  const [deals, setDeals] = useState<Deal[]>(() => loadDeals() ?? sampleDeals());
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { saveDeals(deals); }, [deals]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

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
    setDeals(prev => prev.map(d => {
      if (d.id !== deal.id) return d;
      if (d.stage !== deal.stage) {
        const label = STAGES.find(s => s.id === deal.stage)?.label ?? deal.stage;
        return { ...deal, activities: [...deal.activities, { id: uid(), type: "stage", text: "Moved to " + label, at: new Date().toISOString() }] };
      }
      return deal;
    }));
  }, []);

  const move = useCallback((id: string, stage: Stage) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== id || d.stage === stage) return d;
      const label = STAGES.find(s => s.id === stage)?.label ?? stage;
      return { ...d, stage, activities: [...d.activities, { id: uid(), type: "stage", text: "Moved to " + label, at: new Date().toISOString() }] };
    }));
  }, []);

  const addActivity = useCallback((id: string, type: ActivityType, text: string) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, activities: [...d.activities, { id: uid(), type, text, at: new Date().toISOString() }] } : d));
  }, []);

  const remove = useCallback((id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id));
    setSelected(null);
    setToast("Deal deleted");
  }, []);

  const create = () => {
    const d = blankDeal();
    setDeals(prev => [d, ...prev]);
    setSelected(d.id);
  };

  const exportCsv = () => {
    const blob = new Blob([dealsToCsv(deals)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deals-" + today() + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Exported " + deals.length + " deals");
  };

  const importDeals = (incoming: Deal[]) => {
    setDeals(prev => [...incoming, ...prev]);
    setImporting(false);
    setToast("Imported " + incoming.length + " deals into New");
  };

  const reset = () => {
    clearDeals();
    setDeals(sampleDeals());
    setSelected(null);
    setFilters(emptyFilters);
    setToast("Sample data restored");
  };

  const current = selected ? deals.find(d => d.id === selected) ?? null : null;
  const closeDrawer = useCallback(() => {
    setSelected(id => {
      if (id) setDeals(prev => prev.filter(d => d.id !== id || d.customer.trim() !== "" || d.activities.length > 0));
      return null;
    });
  }, []);

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Deal Pipeline</h1>
          <p>Vehicle transport sales, from first quote to delivery. Data stays in your browser.</p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => setImporting(true)}>Import CSV</button>
          <button type="button" onClick={exportCsv}>Export CSV</button>
          <button type="button" onClick={reset}>Reset sample</button>
          <button type="button" className="primary" onClick={create}>New deal</button>
        </div>
      </header>

      <Metrics deals={deals} />
      <FilterBar filters={filters} agents={agents} onChange={setFilters} />
      {visible.length !== deals.length ? <p className="showing">Showing {visible.length} of {deals.length} deals</p> : null}
      <Board deals={visible} onOpen={setSelected} onMove={move} />

      {current ? (
        <DealDrawer deal={current} agents={agents} onChange={update} onAddActivity={addActivity} onDelete={remove} onClose={closeDrawer} />
      ) : null}
      {importing ? <ImportDialog agents={agents} onImport={importDeals} onClose={() => setImporting(false)} /> : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}

      <footer className="foot">
        <span>Built with React and TypeScript by Teodor Ninkov. Imports the output of <a href="https://github.com/teodor-ninkov/ai-lead-qualifier">AI Lead Qualifier</a>.</span>
        <a href="https://github.com/teodor-ninkov/deal-pipeline">View source on GitHub</a>
      </footer>
    </div>
  );
}
