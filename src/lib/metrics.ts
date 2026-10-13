import { Deal, STAGES } from "../types";
import { today } from "./ids";

const openStages = new Set(STAGES.filter(s => s.open).map(s => s.id));

export function isOpen(deal: Deal): boolean {
  return openStages.has(deal.stage);
}

export function isOverdue(deal: Deal, ref = today()): boolean {
  return isOpen(deal) && !!deal.followUp && deal.followUp < ref;
}

export function isDueToday(deal: Deal, ref = today()): boolean {
  return isOpen(deal) && deal.followUp === ref;
}

export function metrics(deals: Deal[], ref = today()) {
  const open = deals.filter(isOpen);
  const won = deals.filter(d => d.stage === "booked" || d.stage === "delivered");
  const lost = deals.filter(d => d.stage === "lost");
  const decided = won.length + lost.length;
  return {
    pipelineValue: open.reduce((s, d) => s + d.price, 0),
    openCount: open.length,
    wonValue: won.reduce((s, d) => s + d.price, 0),
    wonCount: won.length,
    conversion: decided ? Math.round((100 * won.length) / decided) : 0,
    overdue: deals.filter(d => isOverdue(d, ref)).length,
    dueToday: deals.filter(d => isDueToday(d, ref)).length,
    hotOpen: open.filter(d => d.score === "Hot").length
  };
}
