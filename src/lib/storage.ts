import { Deal } from "../types";

const KEY = "deal-pipeline:v1";

export function loadDeals(): Deal[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Deal[]) : null;
  } catch {
    return null;
  }
}

export function saveDeals(deals: Deal[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(deals));
  } catch {
    return;
  }
}

export function clearDeals(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
}
