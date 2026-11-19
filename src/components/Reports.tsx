import { Deal } from "../types";
import { money } from "../lib/ids";
import { byAgent, byScore, forecastByMonth, funnel, staleDeals, STAGE_PROBABILITY, weightedValue, STALE_DAYS } from "../lib/forecast";
import { isOpen } from "../lib/metrics";

interface Props {
  deals: Deal[];
  onOpen: (id: string) => void;
}

const pct = (n: number | null) => (n === null ? "–" : n + "%");

export default function Reports({ deals, onOpen }: Props) {
  const months = forecastByMonth(deals);
  const peak = Math.max(1, ...months.map(m => m.won + m.expected));
  const steps = funnel(deals);
  const scores = byScore(deals);
  const agents = byAgent(deals);
  const stale = staleDeals(deals);
  const openValue = deals.filter(isOpen).reduce((s, d) => s + d.price, 0);
  const weighted = Math.round(weightedValue(deals));

  return (
    <div className="reports">
      <section className="panel panel-wide" aria-labelledby="forecast-title">
        <header className="panel-head">
          <div>
            <h2 id="forecast-title">Revenue forecast</h2>
            <p className="hint">Won deals in full, open deals at their chance of booking. A deal counts in the month of its pickup date.</p>
          </div>
          <div className="panel-kpis">
            <div><span className="metric-label">Weighted pipeline</span><strong>{money(weighted)}</strong></div>
            <div><span className="metric-label">Open, unweighted</span><strong>{money(openValue)}</strong></div>
          </div>
        </header>
        <div className="bars" role="img" aria-label={"Forecast by month: " + months.map(m => m.label + " " + money(m.won + m.expected)).join(", ")}>
          {months.map(m => (
            <div className="bar-col" key={m.month}>
              <span className="bar-total">{m.won + m.expected ? money(m.won + m.expected) : ""}</span>
              <div className="bar-track">
                <div className="bar bar-expected" style={{ height: (100 * m.expected) / peak + "%" }} title={"Expected " + money(m.expected)} />
                <div className="bar bar-won" style={{ height: (100 * m.won) / peak + "%" }} title={"Won " + money(m.won)} />
              </div>
              <span className="bar-label">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i className="swatch swatch-won" /> Won</span>
          <span><i className="swatch swatch-expected" /> Expected from open deals</span>
          <span className="hint">Odds by stage: New {STAGE_PROBABILITY.new * 100}%, Quoted {STAGE_PROBABILITY.quoted * 100}%, Negotiating {STAGE_PROBABILITY.negotiating * 100}%, adjusted by score.</span>
        </div>
      </section>

      <section className="panel" aria-labelledby="funnel-title">
        <h2 id="funnel-title">Funnel</h2>
        <p className="hint">How far deals got, including ones that were lost later.</p>
        <ol className="funnel">
          {steps.map(s => (
            <li key={s.stage}>
              <div className="funnel-row">
                <span>{s.label}</span>
                <span className="num">{s.reached}{s.stage !== "new" ? <em> · {s.fromPrevious}%</em> : null}</span>
              </div>
              <div className="funnel-track"><div className={"funnel-fill stage-fill-" + s.stage} style={{ width: (steps[0].reached ? (100 * s.reached) / steps[0].reached : 0) + "%" }} /></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel" aria-labelledby="score-title">
        <h2 id="score-title">Do the lead scores hold up?</h2>
        <p className="hint">Win rate by the score a lead came in with, from AI Lead Qualifier or set by hand.</p>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Score</th><th className="num">Deals</th><th className="num">Won</th><th className="num">Lost</th><th className="num">Win rate</th><th className="num">Avg won</th></tr></thead>
          <tbody>
            {scores.map(r => (
              <tr key={r.score}>
                <td><span className={"score score-" + r.score.toLowerCase()}>{r.score}</span></td>
                <td className="num">{r.total}</td>
                <td className="num">{r.won}</td>
                <td className="num">{r.lost}</td>
                <td className="num"><strong>{pct(r.winRate)}</strong></td>
                <td className="num">{r.avgWonPrice ? money(r.avgWonPrice) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className="panel panel-wide" aria-labelledby="agents-title">
        <h2 id="agents-title">Agents</h2>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Agent</th><th className="num">Open</th><th className="num">Open value</th><th className="num">Weighted</th><th className="num">Won</th><th className="num">Won value</th><th className="num">Win rate</th><th className="num">Overdue</th></tr></thead>
          <tbody>
            {agents.map(r => (
              <tr key={r.agent}>
                <td>{r.agent}</td>
                <td className="num">{r.open}</td>
                <td className="num">{money(r.openValue)}</td>
                <td className="num">{money(r.weighted)}</td>
                <td className="num">{r.won}</td>
                <td className="num"><strong>{money(r.wonValue)}</strong></td>
                <td className="num">{pct(r.winRate)}</td>
                <td className={"num" + (r.overdue ? " alert-text" : "")}>{r.overdue}</td>
              </tr>
            ))}
            {agents.length === 0 ? <tr><td colSpan={8} className="hint">No deals match the filters.</td></tr> : null}
          </tbody>
        </table></div>
      </section>

      <section className="panel" aria-labelledby="stale-title">
        <h2 id="stale-title">Going cold</h2>
        <p className="hint">Open deals with no call, email or note for {STALE_DAYS}+ days.</p>
        {stale.length === 0 ? <p className="empty">Every open deal was touched this week.</p> : (
          <ul className="stale">
            {stale.map(({ deal, days }) => (
              <li key={deal.id}>
                <button type="button" className="stale-item" onClick={() => onOpen(deal.id)}>
                  <span><strong>{deal.customer || "Unnamed deal"}</strong> <span className="hint">{deal.vehicle}</span></span>
                  <span className="alert-text">{days} days</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
