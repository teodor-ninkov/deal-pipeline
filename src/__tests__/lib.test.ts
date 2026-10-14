import { describe, it, expect } from "vitest";
import { parseCsv, dealsFromRows, dealsToCsv } from "../lib/csv";
import { metrics, isOverdue } from "../lib/metrics";
import { sampleDeals } from "../data/sample";

describe("csv", () => {
  it("parses quoted fields with commas and newlines", () => {
    const text = 'name,email,message,score,follow_up_email\nAnn Lee,a@x.com,"Ship my car, Miami to NYC",hot,"Hi Ann,\nthanks"\n';
    const rows = parseCsv(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].message).toBe("Ship my car, Miami to NYC");
    expect(rows[0].follow_up_email).toContain("\n");
    const deals = dealsFromRows(rows, "Teodor Ninkov");
    expect(deals[0].customer).toBe("Ann Lee");
    expect(deals[0].score).toBe("Hot");
    expect(deals[0].stage).toBe("new");
    expect(deals[0].activities.map(a => a.type)).toEqual(["email", "note"]);
  });
  it("round-trips export", () => {
    const deals = sampleDeals();
    const csv = dealsToCsv(deals);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(deals.length);
    expect(rows[0].customer).toBe(deals[0].customer);
    expect(Number(rows[0].activities)).toBe(deals[0].activities.length);
    expect(rows[0].lastactivity).not.toBe("");
  });
});

describe("metrics", () => {
  it("computes pipeline numbers", () => {
    const deals = sampleDeals();
    const m = metrics(deals);
    expect(m.openCount).toBe(deals.filter(d => ["new", "quoted", "negotiating"].includes(d.stage)).length);
    expect(m.wonCount).toBe(3);
    expect(m.conversion).toBe(75);
    expect(m.overdue).toBe(deals.filter(d => isOverdue(d)).length);
    expect(m.overdue).toBeGreaterThan(0);
  });
});
