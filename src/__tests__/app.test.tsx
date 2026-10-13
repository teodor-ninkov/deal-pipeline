// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("renders the board with sample deals and filters them", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Deal Pipeline" })).toBeTruthy();
    const cards = screen.getAllByRole("button", { name: /Michael Turner|Jennifer Lopez|Robert Wilson/ });
    expect(cards.length).toBe(3);
    fireEvent.change(screen.getByLabelText("Search deals"), { target: { value: "mustang" } });
    expect(screen.getByText("Showing 1 of 14 deals")).toBeTruthy();
    fireEvent.click(screen.getByText("Clear"));
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it("opens a deal, logs a call and moves it by stage select", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Michael Turner/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Activity type"), { target: { value: "call" } });
    fireEvent.change(within(dialog).getByLabelText("Activity text"), { target: { value: "Agreed on $1,120" } });
    fireEvent.click(within(dialog).getByText("Log"));
    expect(within(dialog).getByText("Agreed on $1,120")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Stage"), { target: { value: "booked" } });
    expect(within(dialog).getByText("Moved to Booked")).toBeTruthy();
    fireEvent.click(within(dialog).getByLabelText("Close"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(JSON.parse(localStorage.getItem("deal-pipeline:v1")!).find((d: { customer: string }) => d.customer === "Michael Turner").stage).toBe("booked");
  });

  it("creates a new deal and discards it if left empty", () => {
    render(<App />);
    fireEvent.click(screen.getByText("New deal"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(JSON.parse(localStorage.getItem("deal-pipeline:v1")!)).toHaveLength(14);
  });

  it("supports drag and drop between columns", () => {
    render(<App />);
    const card = screen.getByRole("button", { name: /Emily Davis/ });
    const data: Record<string, string> = {};
    const dt = { setData: (k: string, v: string) => { data[k] = v; }, getData: (k: string) => data[k], effectAllowed: "", dropEffect: "" };
    fireEvent.dragStart(card, { dataTransfer: dt });
    const lost = screen.getByRole("heading", { name: "Lost" }).closest(".column")!;
    fireEvent.dragOver(lost, { dataTransfer: dt });
    fireEvent.drop(lost, { dataTransfer: dt });
    expect(within(lost as HTMLElement).getByRole("button", { name: /Emily Davis/ })).toBeTruthy();
  });
});
