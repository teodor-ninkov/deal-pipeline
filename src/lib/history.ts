import { useCallback, useReducer } from "react";

// Undo / redo for the whole deal list. Every change is a snapshot; edits that share a key
// (typing in one deal's fields) are merged into one step while they keep coming in.

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  key: string | null;
  at: number;
}

export type HistoryAction<T> =
  | { type: "set"; update: (prev: T) => T; key?: string; now: number }
  | { type: "remote"; update: (prev: T) => T }
  | { type: "undo" }
  | { type: "redo" };

export const HISTORY_LIMIT = 50;
export const MERGE_WINDOW_MS = 2000;

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], key: null, at: 0 };
}

export function historyReducer<T>(h: History<T>, a: HistoryAction<T>): History<T> {
  switch (a.type) {
    case "set": {
      const next = a.update(h.present);
      if (next === h.present) return h;
      const merge = a.key != null && a.key === h.key && a.now - h.at < MERGE_WINDOW_MS && h.past.length > 0;
      if (merge) return { ...h, present: next, future: [], at: a.now };
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], key: a.key ?? null, at: a.now };
    }
    case "remote": {
      // A teammate's change is applied to every snapshot, so undo never brings back their old version.
      const present = a.update(h.present);
      if (present === h.present) return h;
      return { ...h, past: h.past.map(a.update), present, future: h.future.map(a.update) };
    }
    case "undo": {
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], key: null, at: 0 };
    }
    case "redo": {
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), key: null, at: 0 };
    }
  }
}

export function useHistory<T>(initial: () => T) {
  const [h, dispatch] = useReducer(historyReducer<T>, null, () => initHistory(initial()));
  const set = useCallback((update: (prev: T) => T, key?: string) => dispatch({ type: "set", update, key, now: Date.now() }), []);
  const remote = useCallback((update: (prev: T) => T) => dispatch({ type: "remote", update }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  return { state: h.present, set, remote, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
