import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Deal, Stage, STAGES } from "../types";
import DealCard from "./DealCard";
import { money } from "../lib/ids";

interface Props {
  deals: Deal[];
  onOpen: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
}

const LONG_PRESS_MS = 280;
const MOVE_TOLERANCE_PX = 8;

interface TouchDrag {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  active: boolean;
  timer: ReturnType<typeof setTimeout>;
}

function stageAt(x: number, y: number): Stage | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-stage]");
  return (el?.dataset.stage as Stage | undefined) ?? null;
}

export default function Board({ deals, onOpen, onMove }: Props) {
  const [over, setOver] = useState<Stage | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const touch = useRef<TouchDrag | null>(null);
  const suppressClick = useRef(false);

  // HTML drag and drop does not fire on phones. A long press picks the card up instead,
  // and page scrolling is held off until it is dropped.
  useEffect(() => {
    const block = (e: TouchEvent) => { if (touch.current?.active) e.preventDefault(); };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  const endTouch = () => {
    if (touch.current) clearTimeout(touch.current.timer);
    touch.current = null;
    setDragging(null);
    setOver(null);
  };

  const onPointerDown = (e: PointerEvent, id: string) => {
    if (e.pointerType !== "touch") return;
    const { clientX: x, clientY: y, pointerId } = e;
    const timer = setTimeout(() => {
      if (!touch.current) return;
      touch.current.active = true;
      setDragging(id);
      navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
    touch.current = { id, pointerId, x, y, active: false, timer };
  };

  const onPointerMove = (e: PointerEvent) => {
    const t = touch.current;
    if (!t || t.pointerId !== e.pointerId) return;
    if (!t.active) {
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > MOVE_TOLERANCE_PX) endTouch();
      return;
    }
    setOver(stageAt(e.clientX, e.clientY));
  };

  const onPointerUp = (e: PointerEvent) => {
    const t = touch.current;
    if (!t || t.pointerId !== e.pointerId) return;
    if (t.active) {
      suppressClick.current = true;
      const stage = stageAt(e.clientX, e.clientY);
      if (stage) onMove(t.id, stage);
    }
    endTouch();
  };

  const open = (id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onOpen(id);
  };

  const step = (deal: Deal, by: number) => {
    const i = STAGES.findIndex(s => s.id === deal.stage);
    const next = STAGES[i + by];
    if (next) onMove(deal.id, next.id);
  };

  return (
    <section className="board" aria-label="Pipeline board" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={endTouch}>
      {STAGES.map(stage => {
        const items = deals.filter(d => d.stage === stage.id);
        const value = items.reduce((s, d) => s + d.price, 0);
        return (
          <div
            key={stage.id}
            data-stage={stage.id}
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
              {items.map(d => (
                <DealCard
                  key={d.id}
                  deal={d}
                  lifted={dragging === d.id}
                  onOpen={open}
                  onDragStart={setDragging}
                  onPointerDown={onPointerDown}
                  onStep={step}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
