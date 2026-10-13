import { Deal } from "../types";
import { formatDate, money } from "../lib/ids";
import { isOverdue, isDueToday, isOpen } from "../lib/metrics";

interface Props {
  deal: Deal;
  onOpen: (id: string) => void;
  onDragStart: (id: string) => void;
}

function initials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function DealCard({ deal, onOpen, onDragStart }: Props) {
  const overdue = isOverdue(deal);
  const dueToday = isDueToday(deal);
  const followClass = overdue ? "due overdue" : dueToday ? "due today" : "due";
  const route = [deal.origin, deal.destination].filter(Boolean).join(" to ");
  return (
    <article
      className="card"
      draggable
      tabIndex={0}
      role="button"
      aria-label={deal.customer + ", " + deal.vehicle}
      onClick={() => onOpen(deal.id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(deal.id); } }}
      onDragStart={e => { e.dataTransfer.setData("text/plain", deal.id); e.dataTransfer.effectAllowed = "move"; onDragStart(deal.id); }}
    >
      <div className="card-top">
        <span className={"score score-" + deal.score.toLowerCase()}>{deal.score}</span>
        <span className="price">{deal.price ? money(deal.price) : "Quote needed"}</span>
      </div>
      <h3>{deal.customer}</h3>
      <p className="vehicle">{deal.vehicle}</p>
      {route ? <p className="route">{route}</p> : null}
      <div className="card-bottom">
        <span className="avatar" title={deal.agent}>{initials(deal.agent)}</span>
        {isOpen(deal) && deal.followUp ? (
          <span className={followClass}>{overdue ? "Overdue " : dueToday ? "Today" : formatDate(deal.followUp)}</span>
        ) : deal.pickupDate ? (
          <span className="due">Pickup {formatDate(deal.pickupDate)}</span>
        ) : null}
      </div>
    </article>
  );
}
