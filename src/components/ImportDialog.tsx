import { useState } from "react";
import { parseCsv, dealsFromRows } from "../lib/csv";
import { Deal } from "../types";

interface Props {
  agents: string[];
  onImport: (deals: Deal[]) => void;
  onClose: () => void;
}

export default function ImportDialog({ agents, onImport, onClose }: Props) {
  const [agent, setAgent] = useState(agents[0]);
  const [preview, setPreview] = useState<Deal[] | null>(null);
  const [error, setError] = useState("");

  const read = (file: File) => {
    file.text().then(text => {
      const rows = parseCsv(text);
      const deals = dealsFromRows(rows, agent);
      if (!deals.length) {
        setError("No rows with a name or customer column were found.");
        setPreview(null);
        return;
      }
      setError("");
      setPreview(deals);
    });
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Import leads from CSV">
        <header className="drawer-head">
          <h2>Import leads from CSV</h2>
          <button type="button" className="icon" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="drawer-body">
          <p>Works with the results file from <a href="https://ai-lead-qualifier-mwbmqp4tzt6aifyytdgv8x.streamlit.app/" target="_blank" rel="noreferrer">AI Lead Qualifier</a> (name, vehicle, pickup_city, delivery_city, score, follow_up_email) or any CSV with at least a <code>name</code> column. Imported deals land in New with a follow-up date based on their score.</p>
          <label>Assign to agent
            <select value={agent} onChange={e => { setAgent(e.target.value); setPreview(p => p ? p.map(d => ({ ...d, agent: e.target.value })) : p); }}>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label>CSV file
            <input type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files?.[0]; if (f) read(f); }} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {preview ? (
            <div className="preview">
              <p>{preview.length} deals ready to import</p>
              <ul>
                {preview.slice(0, 6).map(d => <li key={d.id}>{d.customer}, {d.vehicle}, {d.score}</li>)}
                {preview.length > 6 ? <li>and {preview.length - 6} more</li> : null}
              </ul>
            </div>
          ) : null}
        </div>
        <footer className="drawer-foot">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" disabled={!preview} onClick={() => preview && onImport(preview)}>Import {preview ? preview.length : ""}</button>
        </footer>
      </div>
    </>
  );
}
