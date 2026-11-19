export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date where the user is (YYYY-MM-DD). Not UTC: at 1am in Sofia it is already tomorrow. */
export function today(now = new Date()): string {
  return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
}

/** Plain calendar arithmetic on YYYY-MM-DD, done in UTC so the time zone cannot shift the day. */
export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}
