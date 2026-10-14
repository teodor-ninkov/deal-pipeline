import { Deal, Score, SCORES } from "../types";
import { uid, today, addDays } from "./ids";

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c !== "")) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function pick(r: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) if (r[k]) return r[k];
  return "";
}

function toScore(value: string): Score {
  const s = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return (SCORES as string[]).includes(s) ? (s as Score) : "Warm";
}

export function dealsFromRows(rows: Record<string, string>[], agent: string): Deal[] {
  const now = new Date().toISOString();
  return rows
    .filter(r => pick(r, "name", "customer"))
    .map(r => {
      const score = toScore(pick(r, "score"));
      const activities = [];
      const reason = pick(r, "score_reason");
      if (reason) activities.push({ id: uid(), type: "note" as const, text: "AI score " + score + ": " + reason, at: now });
      const email = pick(r, "follow_up_email");
      if (email) activities.push({ id: uid(), type: "email" as const, text: "Suggested follow-up: " + email, at: now });
      const message = pick(r, "message");
      if (message) activities.push({ id: uid(), type: "note" as const, text: "Original request: " + message, at: now });
      return {
        id: uid(),
        customer: pick(r, "name", "customer"),
        email: pick(r, "email"),
        phone: pick(r, "phone"),
        vehicle: pick(r, "vehicle") || "Unknown",
        origin: pick(r, "pickup_city", "origin"),
        destination: pick(r, "delivery_city", "destination"),
        pickupDate: pick(r, "desired_date", "pickup_date"),
        price: Number(pick(r, "price", "quote_price")) || 0,
        score,
        stage: "new" as const,
        agent,
        followUp: score === "Hot" ? today() : addDays(today(), score === "Warm" ? 2 : 5),
        createdAt: now,
        activities
      };
    });
}

export function dealsToCsv(deals: Deal[]): string {
  const cols = ["customer", "email", "phone", "vehicle", "origin", "destination", "pickupDate", "price", "score", "stage", "agent", "followUp", "createdAt"] as const;
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lastActivity = (d: Deal) => {
    const latest = [...d.activities].sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    return latest ? latest.text : "";
  };
  const header = [...cols, "activities", "lastActivity"].join(",");
  const rows = deals.map(d => [...cols.map(c => esc(d[c])), d.activities.length, esc(lastActivity(d))].join(","));
  return [header, ...rows].join("\n");
}
