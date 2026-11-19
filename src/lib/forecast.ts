import { AGENTS, Deal, SCORES, Score, Stage, STAGES } from "../types";
import { today } from "./ids";
import { isOpen, isOverdue } from "./metrics";

// Rough chance that a deal in each stage ends up booked. Booked and delivered are won.
export const STAGE_PROBABILITY: Record<Stage, number> = {
  new: 0.1,
  quoted: 0.3,
  negotiating: 0.6,
  booked: 1,
  delivered: 1,
  lost: 0
};

// The lead score moves the stage odds: a Hot lead in Quoted is likelier to book than a Cold one.
export const SCORE_FACTOR: Record<Score, number> = { Hot: 1.25, Warm: 1, Cold: 0.5 };

export function isWon(d: Deal): boolean {
  return d.stage === "booked" || d.stage === "delivered";
}

export function winProbability(d: Deal): number {
  const p = STAGE_PROBABILITY[d.stage];
  if (p === 0 || p === 1) return p;
  return Math.min(0.95, p * SCORE_FACTOR[d.score]);
}

export function weightedValue(deals: Deal[]): number {
  return deals.filter(isOpen).reduce((s, d) => s + d.price * winProbability(d), 0);
}

const monthOf = (iso: string) => iso.slice(0, 7);
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** The month a deal is expected to turn into revenue: its pickup date, else the next follow-up, else when it came in. */
export function expectedMonth(d: Deal): string {
  if (validDate(d.pickupDate)) return monthOf(d.pickupDate);
  if (validDate(d.followUp)) return monthOf(d.followUp);
  return monthOf(d.createdAt);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export interface MonthForecast {
  month: string;
  label: string;
  won: number;
  expected: number;
}

/**
 * Revenue by month from two months back to three months ahead.
 * Won deals count in full. Open deals count at their win probability; an open deal whose month
 * has already passed has slipped, so it is counted in the current month.
 */
export function forecastByMonth(deals: Deal[], ref = today(), before = 2, after = 3): MonthForecast[] {
  const current = monthOf(ref);
  const months = Array.from({ length: before + after + 1 }, (_, i) => shiftMonth(current, i - before));
  const rows = new Map(months.map(m => [m, { month: m, label: monthLabel(m), won: 0, expected: 0 }]));
  for (const d of deals) {
    if (isWon(d)) {
      const row = rows.get(expectedMonth(d));
      if (row) row.won += d.price;
    } else if (isOpen(d)) {
      const m = expectedMonth(d);
      const row = rows.get(m < current ? current : m);
      if (row) row.expected += d.price * winProbability(d);
    }
  }
  return months.map(m => {
    const r = rows.get(m)!;
    return { ...r, won: Math.round(r.won), expected: Math.round(r.expected) };
  });
}

const FUNNEL: Stage[] = ["new", "quoted", "negotiating", "booked"];
const stageIndex = (s: Stage) => (s === "delivered" ? 3 : FUNNEL.indexOf(s));
const labelToStage = new Map(STAGES.map(s => [s.label, s.id]));

/** Furthest stage a deal got to, reading the stage log for deals that were later lost. */
export function furthestStage(d: Deal): number {
  let best = d.stage === "lost" ? 0 : stageIndex(d.stage);
  for (const a of d.activities) {
    if (a.type !== "stage") continue;
    const stage = labelToStage.get(a.text.replace(/^Moved to /, ""));
    if (stage && stage !== "lost") best = Math.max(best, stageIndex(stage));
  }
  return best;
}

export interface FunnelStep {
  stage: Stage;
  label: string;
  reached: number;
  /** Share of the previous step that got this far, in percent. */
  fromPrevious: number;
}

export function funnel(deals: Deal[]): FunnelStep[] {
  const reached = FUNNEL.map((_, i) => deals.filter(d => furthestStage(d) >= i).length);
  return FUNNEL.map((stage, i) => ({
    stage,
    label: stage === "booked" ? "Booked or delivered" : STAGES.find(s => s.id === stage)!.label,
    reached: reached[i],
    fromPrevious: i === 0 ? 100 : reached[i - 1] ? Math.round((100 * reached[i]) / reached[i - 1]) : 0
  }));
}

export interface ScoreRow {
  score: Score;
  total: number;
  won: number;
  lost: number;
  open: number;
  /** Won out of decided (won + lost), in percent; null when nothing is decided yet. */
  winRate: number | null;
  avgWonPrice: number;
}

/** Do the AI scores hold up? Win rate by the score a lead came in with. */
export function byScore(deals: Deal[]): ScoreRow[] {
  return SCORES.map(score => {
    const group = deals.filter(d => d.score === score);
    const won = group.filter(isWon);
    const lost = group.filter(d => d.stage === "lost").length;
    const decided = won.length + lost;
    return {
      score,
      total: group.length,
      won: won.length,
      lost,
      open: group.filter(isOpen).length,
      winRate: decided ? Math.round((100 * won.length) / decided) : null,
      avgWonPrice: won.length ? Math.round(won.reduce((s, d) => s + d.price, 0) / won.length) : 0
    };
  });
}

export interface AgentRow {
  agent: string;
  open: number;
  openValue: number;
  weighted: number;
  won: number;
  wonValue: number;
  winRate: number | null;
  overdue: number;
}

export function byAgent(deals: Deal[], ref = today()): AgentRow[] {
  const names = Array.from(new Set([...AGENTS, ...deals.map(d => d.agent)]));
  return names
    .map(agent => {
      const group = deals.filter(d => d.agent === agent);
      const open = group.filter(isOpen);
      const won = group.filter(isWon);
      const decided = won.length + group.filter(d => d.stage === "lost").length;
      return {
        agent,
        open: open.length,
        openValue: open.reduce((s, d) => s + d.price, 0),
        weighted: Math.round(weightedValue(group)),
        won: won.length,
        wonValue: won.reduce((s, d) => s + d.price, 0),
        winRate: decided ? Math.round((100 * won.length) / decided) : null,
        overdue: group.filter(d => isOverdue(d, ref)).length
      };
    })
    .filter(r => r.open + r.won + r.overdue > 0)
    .sort((a, b) => b.wonValue + b.weighted - (a.wonValue + a.weighted));
}

export function lastTouch(d: Deal): string {
  return d.activities.reduce((latest, a) => (a.at > latest ? a.at : latest), d.createdAt);
}

export function daysBetween(fromIso: string, toDay: string): number {
  const from = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const to = Date.UTC(+toDay.slice(0, 4), +toDay.slice(5, 7) - 1, +toDay.slice(8, 10));
  return Math.round((to - from) / 86400000);
}

export const STALE_DAYS = 7;

/** Open deals nobody has touched for a week, the most neglected first. */
export function staleDeals(deals: Deal[], ref = today()): { deal: Deal; days: number }[] {
  return deals
    .filter(isOpen)
    .map(deal => ({ deal, days: daysBetween(lastTouch(deal), ref) }))
    .filter(r => r.days >= STALE_DAYS)
    .sort((a, b) => b.days - a.days);
}
