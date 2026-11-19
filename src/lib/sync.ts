import { useEffect, useRef, useState } from "react";
import { Deal } from "../types";

// The board keeps working on a plain Deal[] in memory. A RemoteStore (Supabase today) is told
// what changed since the last successful save, and pushes teammates' changes back in.

export type RemoteEvent = { type: "upsert"; deal: Deal } | { type: "delete"; id: string };

export interface DealDiff {
  upserts: Deal[];
  deletes: string[];
}

export interface RemoteStore {
  load(): Promise<Deal[]>;
  apply(diff: DealDiff): Promise<void>;
  subscribe(onEvent: (e: RemoteEvent) => void): () => void;
}

export type SyncStatus = "saved" | "saving" | "error";

export const SYNC_DELAY_MS = 600;
export const RETRY_DELAY_MS = 5000;

/** A deal someone opened with New deal and has not filled in yet. It is not worth saving. */
export function isBlank(d: Deal): boolean {
  return d.customer.trim() === "" && d.activities.length === 0;
}

/** Deals are immutable, so a changed deal is a new object: comparing references is enough. */
export function diffDeals(prev: Deal[], next: Deal[]): DealDiff {
  const before = new Map(prev.map(d => [d.id, d]));
  const kept = new Set<string>();
  const upserts: Deal[] = [];
  for (const d of next) {
    kept.add(d.id);
    if (before.get(d.id) !== d && !isBlank(d)) upserts.push(d);
  }
  const deletes = prev.filter(d => !kept.has(d.id) && !isBlank(d)).map(d => d.id);
  return { upserts, deletes };
}

export function isEmptyDiff(diff: DealDiff): boolean {
  return diff.upserts.length === 0 && diff.deletes.length === 0;
}

export function sameDeal(a: Deal, b: Deal): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function applyRemote(deals: Deal[], e: RemoteEvent): Deal[] {
  if (e.type === "delete") {
    return deals.some(d => d.id === e.id) ? deals.filter(d => d.id !== e.id) : deals;
  }
  const i = deals.findIndex(d => d.id === e.deal.id);
  if (i === -1) return [e.deal, ...deals];
  if (sameDeal(deals[i], e.deal)) return deals;
  const copy = deals.slice();
  copy[i] = e.deal;
  return copy;
}

/**
 * Saves local changes to the store a moment after they stop coming in, and applies remote changes.
 * A remote change to a deal with unsaved local edits is ignored: the local edit is saved next and wins.
 * Our own writes come back through the subscription too; they equal what we sent and are ignored.
 */
export function useRemoteSync(
  deals: Deal[],
  store: RemoteStore | undefined,
  applyRemoteChange: (update: (prev: Deal[]) => Deal[]) => void
): SyncStatus {
  const synced = useRef(deals);
  const latest = useRef(deals);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    latest.current = deals;
    if (!store || isEmptyDiff(diffDeals(synced.current, deals))) return;
    setStatus(s => (s === "error" ? s : "saving"));
    let retry: ReturnType<typeof setTimeout> | undefined;
    let live = true;
    const timer = setTimeout(() => {
      const target = latest.current;
      const diff = diffDeals(synced.current, target);
      store.apply(diff).then(
        () => {
          synced.current = target;
          if (live) setStatus(isEmptyDiff(diffDeals(target, latest.current)) ? "saved" : "saving");
        },
        () => {
          if (!live) return;
          setStatus("error");
          retry = setTimeout(() => setAttempt(n => n + 1), RETRY_DELAY_MS);
        }
      );
    }, SYNC_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
      clearTimeout(retry);
    };
  }, [deals, store, attempt]);

  useEffect(() => {
    if (!store) return;
    return store.subscribe(e => {
      const id = e.type === "delete" ? e.id : e.deal.id;
      const local = latest.current.find(d => d.id === id);
      const base = synced.current.find(d => d.id === id);
      if (local !== base) return;
      if (e.type === "upsert" && base && sameDeal(base, e.deal)) return;
      synced.current = applyRemote(synced.current, e);
      applyRemoteChange(prev => applyRemote(prev, e));
    });
  }, [store, applyRemoteChange]);

  return status;
}
