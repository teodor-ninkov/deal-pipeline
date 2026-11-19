import { Deal } from "../types";
import { isOpen } from "./metrics";

export interface CalendarItem {
  deal: Deal;
  kind: "follow-up" | "pickup";
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());

/** Six weeks of days (Monday first) covering the given YYYY-MM month. */
export function monthGrid(month: string): { date: string; inMonth: boolean }[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(y, m - 1, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start + i * 86400000);
    return { date: iso(d), inMonth: d.getUTCMonth() === m - 1 };
  });
}

/** Follow-ups for open deals and pickups for deals that are not lost, by day. */
export function itemsByDay(deals: Deal[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  const add = (date: string, item: CalendarItem) => {
    const list = map.get(date);
    if (list) list.push(item);
    else map.set(date, [item]);
  };
  for (const deal of deals) {
    if (isOpen(deal) && deal.followUp) add(deal.followUp, { deal, kind: "follow-up" });
    if (deal.stage !== "lost" && /^\d{4}-\d{2}-\d{2}$/.test(deal.pickupDate)) add(deal.pickupDate, { deal, kind: "pickup" });
  }
  const rank = { Hot: 0, Warm: 1, Cold: 2 } as const;
  for (const list of map.values()) list.sort((a, b) => (a.kind === b.kind ? rank[a.deal.score] - rank[b.deal.score] : a.kind === "follow-up" ? -1 : 1));
  return map;
}
