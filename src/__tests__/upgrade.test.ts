import { describe, it, expect } from "vitest";
import { historyReducer, initHistory, HISTORY_LIMIT } from "../lib/history";
import { applyRemote, diffDeals } from "../lib/sync";
import { byScore, expectedMonth, forecastByMonth, funnel, furthestStage, shiftMonth, staleDeals, weightedValue, winProbability } from "../lib/forecast";
import { itemsByDay, monthGrid } from "../lib/calendar";
import { sampleDeals } from "../data/sample";
import { addDays, today } from "../lib/ids";
import { Deal } from "../types";

function deal(over: Partial<Deal> = {}): Deal {
  return {
    id: "d1", customer: "Ann", email: "", phone: "", vehicle: "Civic", origin: "", destination: "",
    pickupDate: "", price: 1000, score: "Warm", stage: "new", agent: "Teodor Ninkov", followUp: "2026-11-20",
    createdAt: "2026-11-01T09:00:00.000Z", activities: [], ...over
  };
}

describe("history", () => {
  const set = <T,>(update: (prev: T) => T, key?: string, now = 0) => ({ type: "set" as const, update, key, now });

  it("undoes and redoes", () => {
    let h = initHistory(0);
    h = historyReducer(h, set(n => n + 1));
    h = historyReducer(h, set(n => n + 1));
    expect(h.present).toBe(2);
    h = historyReducer(h, { type: "undo" });
    expect(h.present).toBe(1);
    h = historyReducer(h, { type: "redo" });
    expect(h.present).toBe(2);
    h = historyReducer(h, { type: "undo" });
    h = historyReducer(h, set(n => n + 10));
    expect(h.future).toHaveLength(0);
  });

  it("merges edits with the same key while they keep coming", () => {
    let h = initHistory("");
    h = historyReducer(h, set(() => "a", "edit:1", 0));
    h = historyReducer(h, set(() => "ab", "edit:1", 500));
    h = historyReducer(h, set(() => "abc", "edit:1", 1000));
    expect(h.past).toEqual([""]);
    h = historyReducer(h, set(() => "abcd", "edit:1", 9000));
    expect(h.past).toEqual(["", "abc"]);
  });

  it("ignores no-op changes and caps the history", () => {
    let h = initHistory(0);
    expect(historyReducer(h, set(n => n))).toBe(h);
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) h = historyReducer(h, set(n => n + 1));
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });

  it("applies remote changes to every snapshot", () => {
    let h = initHistory([1]);
    h = historyReducer(h, set(a => [...a, 2]));
    h = historyReducer(h, { type: "remote", update: a => a.map(x => x * 10) });
    expect(h.present).toEqual([10, 20]);
    expect(historyReducer(h, { type: "undo" }).present).toEqual([10]);
  });
});

describe("sync helpers", () => {
  it("finds changed, new and deleted deals", () => {
    const a = deal({ id: "a" });
    const b = deal({ id: "b" });
    const c = deal({ id: "c" });
    const b2 = { ...b, price: 5 };
    const blank = deal({ id: "x", customer: "" });
    const diff = diffDeals([a, b, c], [a, b2, blank, deal({ id: "n" })]);
    expect(diff.upserts.map(d => d.id)).toEqual(["b", "n"]);
    expect(diff.deletes).toEqual(["c"]);
  });

  it("applies remote events and keeps the array when nothing changed", () => {
    const list = [deal({ id: "a" }), deal({ id: "b" })];
    expect(applyRemote(list, { type: "upsert", deal: deal({ id: "a" }) })).toBe(list);
    expect(applyRemote(list, { type: "upsert", deal: deal({ id: "a", price: 9 }) })[0].price).toBe(9);
    expect(applyRemote(list, { type: "upsert", deal: deal({ id: "z" }) })[0].id).toBe("z");
    expect(applyRemote(list, { type: "delete", id: "b" }).map(d => d.id)).toEqual(["a"]);
    expect(applyRemote(list, { type: "delete", id: "nope" })).toBe(list);
  });
});

describe("forecast", () => {
  it("weights open deals by stage and score", () => {
    expect(winProbability(deal({ stage: "quoted", score: "Warm" }))).toBeCloseTo(0.3);
    expect(winProbability(deal({ stage: "quoted", score: "Hot" }))).toBeCloseTo(0.375);
    expect(winProbability(deal({ stage: "negotiating", score: "Cold" }))).toBeCloseTo(0.3);
    expect(winProbability(deal({ stage: "booked" }))).toBe(1);
    expect(winProbability(deal({ stage: "lost" }))).toBe(0);
    expect(weightedValue([deal({ stage: "quoted", price: 1000 }), deal({ stage: "booked", price: 500 })])).toBeCloseTo(300);
  });

  it("puts deals in months and moves slipped open deals into the current month", () => {
    expect(expectedMonth(deal({ pickupDate: "2026-12-05" }))).toBe("2026-12");
    expect(expectedMonth(deal({ pickupDate: "January" }))).toBe("2026-11");
    expect(shiftMonth("2026-01", -2)).toBe("2025-11");
    const rows = forecastByMonth([
      deal({ id: "w", stage: "booked", price: 800, pickupDate: "2026-10-10" }),
      deal({ id: "o", stage: "negotiating", price: 1000, pickupDate: "2026-12-01" }),
      deal({ id: "s", stage: "quoted", price: 1000, pickupDate: "2026-09-01" })
    ], "2026-11-19");
    expect(rows.map(r => r.month)).toEqual(["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(rows[1].won).toBe(800);
    expect(rows[2].expected).toBe(300);
    expect(rows[3].expected).toBe(600);
    expect(rows[0].expected).toBe(0);
  });

  it("builds the funnel from the stage log, counting lost deals as far as they got", () => {
    const lostLate = deal({ stage: "lost", activities: [{ id: "1", type: "stage", text: "Moved to Negotiating", at: "" }, { id: "2", type: "stage", text: "Moved to Lost", at: "" }] });
    expect(furthestStage(lostLate)).toBe(2);
    expect(furthestStage(deal({ stage: "delivered" }))).toBe(3);
    const steps = funnel([lostLate, deal({ stage: "delivered" }), deal({ stage: "new" }), deal({ stage: "quoted" })]);
    expect(steps.map(s => s.reached)).toEqual([4, 3, 2, 1]);
    expect(steps[3].fromPrevious).toBe(50);
  });

  it("reports win rate by score", () => {
    const rows = byScore(sampleDeals());
    const hot = rows.find(r => r.score === "Hot")!;
    expect(hot.won).toBe(3);
    expect(hot.winRate).toBe(100);
    expect(rows.find(r => r.score === "Cold")!.winRate).toBe(0);
    expect(rows.find(r => r.score === "Warm")!.winRate).toBeNull();
  });

  it("lists open deals with no recent activity", () => {
    const old = deal({ id: "old", createdAt: "2026-11-01T09:00:00.000Z" });
    const touched = deal({ id: "new", createdAt: "2026-11-01T09:00:00.000Z", activities: [{ id: "1", type: "call", text: "", at: "2026-11-18T10:00:00.000Z" }] });
    const closed = deal({ id: "closed", stage: "delivered" });
    expect(staleDeals([old, touched, closed], "2026-11-19")).toEqual([{ deal: old, days: 18 }]);
  });
});

describe("dates", () => {
  it("adds days without the time zone moving the date", () => {
    expect(addDays("2026-11-19", 0)).toBe("2026-11-19");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("uses the local date for today", () => {
    expect(today(new Date(2026, 10, 19, 0, 30))).toBe("2026-11-19");
    expect(today(new Date(2026, 10, 19, 23, 30))).toBe("2026-11-19");
  });
});

describe("calendar", () => {
  it("builds a Monday-first six-week grid", () => {
    const grid = monthGrid("2026-11");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ date: "2026-10-26", inMonth: false });
    expect(grid[6].date).toBe("2026-11-01");
    expect(grid.filter(d => d.inMonth)).toHaveLength(30);
  });

  it("groups follow-ups and pickups by day", () => {
    const map = itemsByDay([
      deal({ id: "a", followUp: "2026-11-20", pickupDate: "2026-11-25", score: "Cold" }),
      deal({ id: "b", followUp: "2026-11-20", score: "Hot" }),
      deal({ id: "c", stage: "booked", followUp: "2026-11-20", pickupDate: "2026-11-25" }),
      deal({ id: "d", stage: "lost", pickupDate: "2026-11-25" })
    ]);
    expect(map.get("2026-11-20")!.map(i => i.deal.id)).toEqual(["b", "a"]);
    expect(map.get("2026-11-25")!.map(i => i.deal.id + ":" + i.kind)).toEqual(["c:pickup", "a:pickup"]);
  });
});
