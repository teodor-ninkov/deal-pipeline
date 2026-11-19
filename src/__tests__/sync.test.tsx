// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react";
import Pipeline from "../Pipeline";
import { DealDiff, RemoteEvent, RemoteStore, SYNC_DELAY_MS } from "../lib/sync";
import { sampleDeals } from "../data/sample";

function fakeStore() {
  const applied: DealDiff[] = [];
  let listener: ((e: RemoteEvent) => void) | null = null;
  const store: RemoteStore = {
    load: async () => [],
    apply: async diff => { applied.push(diff); },
    subscribe: fn => { listener = fn; return () => { listener = null; }; }
  };
  return { store, applied, emit: (e: RemoteEvent) => act(() => listener?.(e)) };
}

describe("team sync", () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("saves a moved deal once the changes settle, not on every keystroke", async () => {
    const deals = sampleDeals();
    const { store, applied } = fakeStore();
    render(<Pipeline initialDeals={deals} mode="cloud" store={store} />);
    expect(screen.getByText("Saved")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Michael Turner/ }));
    const name = screen.getByLabelText("Customer name");
    fireEvent.change(name, { target: { value: "Michael T" } });
    fireEvent.change(name, { target: { value: "Michael Tu" } });
    expect(screen.getByText("Saving…")).toBeTruthy();
    expect(applied).toHaveLength(0);

    await act(async () => { vi.advanceTimersByTime(SYNC_DELAY_MS + 10); });
    expect(applied).toHaveLength(1);
    expect(applied[0].upserts.map(d => d.customer)).toEqual(["Michael Tu"]);
    expect(applied[0].deletes).toEqual([]);
    expect(screen.getByText("Saved")).toBeTruthy();
    // Cloud mode does not write the board to this browser.
    expect(localStorage.getItem("deal-pipeline:v1")).toBeNull();
  });

  it("shows teammates' changes and ignores the echo of its own save", async () => {
    const deals = sampleDeals();
    const { store, applied, emit } = fakeStore();
    render(<Pipeline initialDeals={deals} mode="cloud" store={store} />);

    const emily = deals.find(d => d.customer === "Emily Davis")!;
    emit({ type: "upsert", deal: { ...emily, customer: "Emily Davis-Brown" } });
    expect(screen.getByRole("button", { name: /Emily Davis-Brown/ })).toBeTruthy();

    emit({ type: "delete", id: deals.find(d => d.customer === "Robert Wilson")!.id });
    expect(screen.queryByRole("button", { name: /Robert Wilson/ })).toBeNull();

    // Applying a remote change must not be sent back to the server.
    await act(async () => { vi.advanceTimersByTime(SYNC_DELAY_MS + 10); });
    expect(applied).toHaveLength(0);
  });

  it("keeps a local edit that has not been saved yet over an incoming change", async () => {
    const deals = sampleDeals();
    const { store, applied, emit } = fakeStore();
    render(<Pipeline initialDeals={deals} mode="cloud" store={store} />);
    const michael = deals.find(d => d.customer === "Michael Turner")!;

    fireEvent.click(screen.getByRole("button", { name: /Michael Turner/ }));
    fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Mike Turner" } });
    emit({ type: "upsert", deal: { ...michael, customer: "Someone Else" } });
    expect((screen.getByLabelText("Customer name") as HTMLInputElement).value).toBe("Mike Turner");

    await act(async () => { vi.advanceTimersByTime(SYNC_DELAY_MS + 10); });
    expect(applied[0].upserts[0].customer).toBe("Mike Turner");
  });
});
