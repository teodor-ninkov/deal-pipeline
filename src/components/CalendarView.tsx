import { useMemo, useState } from "react";
import { Deal } from "../types";
import { formatDate, today } from "../lib/ids";
import { itemsByDay, monthGrid } from "../lib/calendar";
import { shiftMonth } from "../lib/forecast";
import { isOverdue } from "../lib/metrics";

interface Props {
  deals: Deal[];
  onOpen: (id: string) => void;
  onReschedule: (id: string, date: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView({ deals, onOpen, onReschedule }: Props) {
  const now = today();
  const [month, setMonth] = useState(now.slice(0, 7));
  const [over, setOver] = useState<string | null>(null);
  const days = useMemo(() => monthGrid(month), [month]);
  const items = useMemo(() => itemsByDay(deals), [deals]);
  const overdue = deals.filter(d => isOverdue(d, now)).sort((a, b) => (a.followUp < b.followUp ? -1 : 1));

  return (
    <div className="calendar-layout">
      <section className="panel calendar" aria-label="Follow-up calendar">
        <header className="calendar-head">
          <h2>{new Date(month + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
          <div className="calendar-nav">
            <button type="button" onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label="Previous month">‹</button>
            <button type="button" onClick={() => setMonth(now.slice(0, 7))}>Today</button>
            <button type="button" onClick={() => setMonth(m => shiftMonth(m, 1))} aria-label="Next month">›</button>
          </div>
          <p className="hint">Drag a follow-up to another day to reschedule it.</p>
        </header>
        <div className="calendar-grid">
          {WEEKDAYS.map(w => <div key={w} className="weekday">{w}</div>)}
          {days.map(day => {
            const list = items.get(day.date) ?? [];
            const cls = "day" + (day.inMonth ? "" : " outside") + (day.date === now ? " is-today" : "") + (day.date < now ? " past" : "") + (over === day.date ? " over" : "");
            return (
              <div
                key={day.date}
                className={cls}
                onDragOver={e => { e.preventDefault(); if (over !== day.date) setOver(day.date); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
                onDrop={e => {
                  e.preventDefault();
                  setOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) onReschedule(id, day.date);
                }}
              >
                <span className="day-num">{Number(day.date.slice(8))}</span>
                {list.map(({ deal, kind }) => (
                  <button
                    key={deal.id + kind}
                    type="button"
                    className={"event event-" + kind + " score-" + deal.score.toLowerCase()}
                    draggable={kind === "follow-up"}
                    onDragStart={e => { e.dataTransfer.setData("text/plain", deal.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={() => onOpen(deal.id)}
                    title={(kind === "pickup" ? "Pickup: " : "Follow up: ") + deal.customer + " · " + deal.vehicle}
                  >
                    {kind === "pickup" ? <span className="event-kind">Pickup</span> : null}
                    {deal.customer || "Unnamed deal"}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <aside className="panel agenda" aria-labelledby="overdue-title">
        <h2 id="overdue-title">Overdue <span className="count">{overdue.length}</span></h2>
        {overdue.length === 0 ? <p className="empty">Nothing overdue.</p> : (
          <ul className="stale">
            {overdue.map(d => (
              <li key={d.id}>
                <button type="button" className="stale-item" onClick={() => onOpen(d.id)}>
                  <span><strong>{d.customer || "Unnamed deal"}</strong> <span className="hint">{d.vehicle}</span></span>
                  <span className="alert-text">{formatDate(d.followUp)}</span>
                </button>
                <button type="button" className="link" onClick={() => onReschedule(d.id, now)}>Move to today</button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
