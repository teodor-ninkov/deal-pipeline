import { useState } from "react";
import { Deal, Stage, STAGES } from "../types";
import DealCard from "./DealCard";
import { money } from "../lib/ids";

interface Props {
  deals: Deal[];
  onOpen: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
}

export default function Board({ deals, onOpen, onMove }: Props) {
  const [over, setOver] = useState<Stage | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <section className="board" aria-label="Pipeline board">
      {STAGES.map(stage => {
        const items = deals.filter(d => d.stage === stage.id);
        const value = items.reduce((s, d) => s + d.price, 0);
        return (
          <div
            key={stage.id}
            className={"column stage-" + stage.id + (over === stage.id ? " over" : "")}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== stage.id) setOver(stage.id); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
            onDrop={e => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragging;
              setOver(null);
              setDragging(null);
              if (id) onMove(id, stage.id);
            }}
          >
            <header className="column-head">
              <h2>{stage.label}</h2>
              <span className="count">{items.length}</span>
              <span className="column-value">{value ? money(value) : ""}</span>
            </header>
            <div className="column-body">
              {items.length === 0 ? <p className="empty">Drop a deal here</p> : null}
              {items.map(d => <DealCard key={d.id} deal={d} onOpen={onOpen} onDragStart={setDragging} />)}
            </div>
          </div>
        );
      })}
    </section>
  );
}
