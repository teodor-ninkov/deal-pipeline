import { useEffect, useState } from "react";
import { Activity, ActivityType, Deal, SCORES, STAGES, Score, Stage } from "../types";
import { formatDateTime } from "../lib/ids";

interface Props {
  deal: Deal;
  agents: string[];
  onChange: (deal: Deal) => void;
  onAddActivity: (id: string, type: ActivityType, text: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const typeLabel: Record<ActivityType, string> = { note: "Note", call: "Call", email: "Email", stage: "Stage" };

export default function DealDrawer({ deal, agents, onChange, onAddActivity, onDelete, onClose }: Props) {
  const [text, setText] = useState("");
  const [type, setType] = useState<ActivityType>("note");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Deal>(key: K, value: Deal[K]) => onChange({ ...deal, [key]: value });

  const submit = () => {
    if (!text.trim()) return;
    onAddActivity(deal.id, type, text.trim());
    setText("");
  };

  const activities: Activity[] = [...deal.activities].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={"Deal: " + (deal.customer || "New deal")}>
        <header className="drawer-head">
          <input
            className="title-input"
            value={deal.customer}
            placeholder="Customer name"
            onChange={e => set("customer", e.target.value)}
            aria-label="Customer name"
          />
          <button type="button" className="icon" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="drawer-body">
          <div className="field-row">
            <label>Stage
              <select value={deal.stage} onChange={e => set("stage", e.target.value as Stage)}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label>Score
              <select value={deal.score} onChange={e => set("score", e.target.value as Score)}>
                {SCORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="field-row">
            <label>Price (USD)
              <input type="number" min="0" step="10" value={deal.price || ""} placeholder="0" onChange={e => set("price", Number(e.target.value) || 0)} />
            </label>
            <label>Agent
              <select value={deal.agent} onChange={e => set("agent", e.target.value)}>
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <label>Vehicle
            <input value={deal.vehicle} onChange={e => set("vehicle", e.target.value)} placeholder="2019 Honda Civic" />
          </label>
          <div className="field-row">
            <label>Pickup
              <input value={deal.origin} onChange={e => set("origin", e.target.value)} placeholder="Miami, FL" />
            </label>
            <label>Delivery
              <input value={deal.destination} onChange={e => set("destination", e.target.value)} placeholder="Chicago, IL" />
            </label>
          </div>
          <div className="field-row">
            <label>Pickup date
              <input type="date" value={deal.pickupDate.length === 10 ? deal.pickupDate : ""} onChange={e => set("pickupDate", e.target.value)} />
            </label>
            <label>Next follow-up
              <input type="date" value={deal.followUp} onChange={e => set("followUp", e.target.value)} />
            </label>
          </div>
          {deal.pickupDate && deal.pickupDate.length !== 10 ? <p className="hint">Requested timing: {deal.pickupDate}</p> : null}
          <div className="field-row">
            <label>Email
              <input type="email" value={deal.email} onChange={e => set("email", e.target.value)} />
            </label>
            <label>Phone
              <input value={deal.phone} onChange={e => set("phone", e.target.value)} />
            </label>
          </div>

          <h3 className="section-title">Activity</h3>
          <div className="activity-form">
            <select value={type} onChange={e => setType(e.target.value as ActivityType)} aria-label="Activity type">
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
            </select>
            <input
              value={text}
              placeholder="What happened?"
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              aria-label="Activity text"
            />
            <button type="button" className="primary" onClick={submit}>Log</button>
          </div>
          <ul className="timeline">
            {activities.length === 0 ? <li className="hint">No activity yet.</li> : null}
            {activities.map(a => (
              <li key={a.id} className={"activity type-" + a.type}>
                <span className="activity-type">{typeLabel[a.type]}</span>
                <span className="activity-text">{a.text}</span>
                <span className="activity-time">{formatDateTime(a.at)}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="drawer-foot">
          {confirm ? (
            <>
              <span>Delete this deal?</span>
              <button type="button" className="danger" onClick={() => onDelete(deal.id)}>Yes, delete</button>
              <button type="button" onClick={() => setConfirm(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" className="link danger-link" onClick={() => setConfirm(true)}>Delete deal</button>
          )}
        </footer>
      </aside>
    </>
  );
}
