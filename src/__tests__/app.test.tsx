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

  it("undoes a delete from the toast and with Ctrl+Z, and redoes it", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Michael Turner/ }));
    fireEvent.click(screen.getByText("Delete deal"));
    fireEvent.click(screen.getByText("Yes, delete"));
    expect(screen.queryByRole("button", { name: /Michael Turner/ })).toBeNull();
    fireEvent.click(within(screen.getByRole("status")).getByText("Undo"));
    expect(screen.getByRole("button", { name: /Michael Turner/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(screen.queryByRole("button", { name: /Michael Turner/ })).toBeNull();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByRole("button", { name: /Michael Turner/ })).toBeTruthy();
  });

  it("undoes a whole round of typing in one step", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Megan Clark/ }));
    const name = screen.getByLabelText("Customer name");
    for (const v of ["Megan C", "Megan Cl", "Megan Clarke"]) fireEvent.change(name, { target: { value: v } });
    fireEvent.click(screen.getByLabelText("Close"));
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(screen.getByRole("button", { name: /Megan Clark,/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Megan Clarke/ })).toBeNull();
  });

  it("moves a focused card with Shift and the arrow keys", () => {
    render(<App />);
    const card = screen.getByRole("button", { name: /Megan Clark/ });
    fireEvent.keyDown(card, { key: "ArrowRight", shiftKey: true });
    const quoted = screen.getByRole("heading", { name: "Quoted" }).closest(".column") as HTMLElement;
    expect(within(quoted).getByRole("button", { name: /Megan Clark/ })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Megan Clark moved to Quoted");
  });

  it("switches to reports and calendar", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(screen.getByRole("heading", { name: "Revenue forecast" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Do the lead scores hold up?" })).toBeTruthy();
    expect(localStorage.getItem("deal-pipeline:view")).toBe("reports");

    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByLabelText("Follow-up calendar")).toBeTruthy();
    const overdue = screen.getByRole("heading", { name: /Overdue/ }).closest("aside") as HTMLElement;
    const before = within(overdue).getAllByText("Move to today").length;
    fireEvent.click(within(overdue).getAllByText("Move to today")[0]);
    expect(within(overdue).queryAllByText("Move to today").length).toBe(before - 1);
  });

  it("opens a deal from the calendar", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    fireEvent.click(screen.getAllByTitle(/Follow up: Michael Turner/)[0]);
    expect(screen.getByRole("dialog", { name: "Deal: Michael Turner" })).toBeTruthy();
  });

  it("cycles the theme and remembers it", () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText("Theme: system"));
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(screen.getByLabelText("Theme: light"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("deal-pipeline:theme")).toBe("dark");
    fireEvent.click(screen.getByLabelText("Theme: dark"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
