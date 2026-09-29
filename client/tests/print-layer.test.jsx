import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PrintDocument from "@/shared/components/PrintDocument/PrintDocument";
import PrintPortal, { usePrintSheet } from "@/shared/components/PrintDocument/PrintPortal";

/**
 * The print layer lives outside the app shell in #print-root so the app can be
 * dropped with `display:none` during printing. These tests cover the three things
 * that arrangement can silently get wrong:
 *
 *  1. a list page mounts one PrintDocument per row, so the layer must never hold
 *     more than the document currently being printed;
 *  2. the layer is emptied after each job, so a later print cannot reuse a
 *     previously loaded payload;
 *  3. the flag that removes the app shell must be cleaned up, or the whole app
 *     disappears from the screen after the first print.
 */
let printedSheets = [];

function mountPrintRoot() {
  const root = document.createElement("div");
  root.id = "print-root";
  document.body.appendChild(root);
  return root;
}

beforeEach(() => {
  printedSheets = [];
  mountPrintRoot();
  // `window.print()` is synchronous in browsers, so the layer is still fully
  // populated while it runs - which is exactly what reaches the printer.
  window.print = vi.fn(() => {
    printedSheets.push(document.getElementById("print-root")?.textContent ?? "");
  });
});

afterEach(() => {
  document.getElementById("print-root")?.remove();
  document.body.classList.remove("is-printing-document");
});

describe("print layer isolation", () => {
  it("prints only the requested document on a list page", async () => {
    const loadFirst = vi.fn(async () => ({ orderNumber: "A-1" }));
    const loadSecond = vi.fn(async () => ({ orderNumber: "A-2" }));
    const renderSheet = (data) => <p>invoice-{data.orderNumber}</p>;

    render(<>
      <PrintDocument title="A-1" loadPrintData={loadFirst} render={renderSheet}/>
      <PrintDocument title="A-2" loadPrintData={loadSecond} render={renderSheet}/>
    </>);

    const buttons = screen.getAllByRole("button", { name: /طباعة/ });

    fireEvent.click(buttons[0]);
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    expect(printedSheets[0]).toContain("invoice-A-1");
    expect(printedSheets[0]).not.toContain("invoice-A-2");

    fireEvent.click(buttons[1]);
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(2));
    expect(printedSheets[1]).toContain("invoice-A-2");
    expect(printedSheets[1]).not.toContain("invoice-A-1");
  });

  it("empties the layer after a job so no stale document lingers", async () => {
    render(<PrintDocument title="A-1" loadPrintData={async () => ({ n: 1 })} render={(d) => <p>sheet-{d.n}</p>}/>);
    fireEvent.click(screen.getByRole("button", { name: /طباعة/ }));
    await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
    await waitFor(() => expect(document.getElementById("print-root")).toHaveTextContent(""));
  });

  it("raises and releases the print flag around the dialog", async () => {
    let flaggedDuringPrint = null;
    window.print = vi.fn(() => {
      flaggedDuringPrint = document.body.classList.contains("is-printing-document");
    });

    render(<PrintDocument title="A-1" loadPrintData={async () => ({ n: 1 })} render={(d) => <p>sheet-{d.n}</p>}/>);
    fireEvent.click(screen.getByRole("button", { name: /طباعة/ }));
    await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
    expect(flaggedDuringPrint).toBe(true);
    await waitFor(() => expect(document.body).not.toHaveClass("is-printing-document"));
  });

  it("does not render a sheet when the print layer is missing", () => {
    document.getElementById("print-root")?.remove();
    expect(() => render(<PrintPortal owner={{}}>sheet</PrintPortal>)).not.toThrow();
  });
});

describe("modal print sheets", () => {
  function ModalHarness({ orderNumber }) {
    const printSheet = usePrintSheet();
    const sheet = <p>modal-invoice-{orderNumber}</p>;
    return <>
      <button type="button" onClick={printSheet.print}>print now</button>
      <PrintPortal owner={printSheet.owner} persistent={printSheet.persistent}>{sheet}</PrintPortal>
    </>;
  }

  it("keeps a supplied sheet mounted and prints only that sheet", async () => {
    const loadStale = vi.fn(async () => ({ orderNumber: "STALE" }));
    render(<>
      <PrintDocument title="stale" loadPrintData={loadStale} render={(d) => <p>stale-{d.orderNumber}</p>}/>
      <ModalHarness orderNumber="M-9"/>
    </>);

    // A modal sheet is persistent, so it is ready before any print is requested.
    expect(document.getElementById("print-root")).toHaveTextContent("modal-invoice-M-9");

    fireEvent.click(screen.getByRole("button", { name: /طباعة/ }));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    expect(printedSheets[0]).toContain("stale-STALE");
    expect(printedSheets[0]).not.toContain("modal-invoice-M-9");

    fireEvent.click(screen.getByRole("button", { name: "print now" }));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(2));
    expect(printedSheets[1]).toContain("modal-invoice-M-9");
    expect(printedSheets[1]).not.toContain("stale-");
  });
});
