import { Filters, SCORES, Score } from "../types";

interface Props {
  filters: Filters;
  agents: string[];
  onChange: (f: Filters) => void;
}

export default function FilterBar({ filters, agents, onChange }: Props) {
  const toggleScore = (s: Score) => {
    const scores = filters.scores.includes(s) ? filters.scores.filter(x => x !== s) : [...filters.scores, s];
    onChange({ ...filters, scores });
  };
  const active = filters.search || filters.agent || filters.scores.length || filters.overdueOnly;
  return (
    <section className="filters" aria-label="Filters">
      <input
        type="search"
        className="search"
        placeholder="Search customer, vehicle or route"
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        aria-label="Search deals"
      />
      <select value={filters.agent} onChange={e => onChange({ ...filters, agent: e.target.value })} aria-label="Agent">
        <option value="">All agents</option>
        {agents.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <div className="chips" role="group" aria-label="Score">
        {SCORES.map(s => (
          <button
            key={s}
            type="button"
            className={"chip score-" + s.toLowerCase() + (filters.scores.includes(s) ? " on" : "")}
            aria-pressed={filters.scores.includes(s)}
            onClick={() => toggleScore(s)}
          >{s}</button>
        ))}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={filters.overdueOnly} onChange={e => onChange({ ...filters, overdueOnly: e.target.checked })} />
        Overdue only
      </label>
      {active ? (
        <button type="button" className="link" onClick={() => onChange({ search: "", agent: "", scores: [], overdueOnly: false })}>Clear</button>
      ) : null}
    </section>
  );
}
