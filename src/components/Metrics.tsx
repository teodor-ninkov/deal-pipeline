import { Deal } from "../types";
import { metrics } from "../lib/metrics";
import { money } from "../lib/ids";

export default function Metrics({ deals }: { deals: Deal[] }) {
  const m = metrics(deals);
  const items = [
    { label: "Open pipeline", value: money(m.pipelineValue), sub: m.openCount + " open deals" },
    { label: "Won", value: money(m.wonValue), sub: m.wonCount + " booked or delivered" },
    { label: "Win rate", value: m.conversion + "%", sub: "won / decided" },
    { label: "Hot and open", value: String(m.hotOpen), sub: "call these first" },
    { label: "Follow-ups", value: String(m.dueToday + m.overdue), sub: m.overdue ? m.overdue + " overdue" : "none overdue", alert: m.overdue > 0 }
  ];
  return (
    <section className="metrics" aria-label="Pipeline summary">
      {items.map(i => (
        <div className={"metric" + (i.alert ? " alert" : "")} key={i.label}>
          <span className="metric-label">{i.label}</span>
          <span className="metric-value">{i.value}</span>
          <span className="metric-sub">{i.sub}</span>
        </div>
      ))}
    </section>
  );
}
