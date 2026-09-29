import { useMemo, useRef, useSyncExternalStore } from "react";
import { createPortal, flushSync } from "react-dom";
import { openPrintWindow } from "./openPrintWindow";

const PRINT_ROOT_ID = "print-root";

/**
 * Resolves the dedicated print layer that lives outside the application shell.
 * The node is declared in index.html so this never has to mutate the DOM.
 */
export function getPrintRoot() {
  if (typeof document === "undefined") return null;
  return document.getElementById(PRINT_ROOT_ID) || null;
}

/* --------------------------------------------------------------------------
   Single-occupant print layer
   --------------------------------------------------------------------------
   A list page mounts one <PrintDocument> per row. Without a guard, printing row
   3 while rows 1 and 2 still hold their lazily loaded payloads would send every
   retained sheet to the printer, so one invoice would come out as three.

   The layer therefore has exactly one owner. `claimPrintLayer` promotes a single
   sheet just before `window.print()`; every other sheet unmounts immediately and
   cannot contribute to the printed output.
   -------------------------------------------------------------------------- */

let layerOwner = null;
const subscribers = new Set();

function notify() {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

const getLayerOwner = () => layerOwner;

function getServerLayerOwner() {
  return null;
}

/**
 * Promotes `owner` to the only sheet allowed into the print layer.
 *
 * The commit is forced synchronously on purpose: `window.print()` blocks and
 * snapshots the DOM the moment it is called, so the layer has to be final before
 * the call returns control. A batched re-render would print an empty layer.
 */
export function claimPrintLayer(owner) {
  if (layerOwner === owner) return;
  flushSync(() => {
    layerOwner = owner;
    notify();
  });
}

/** Releases the layer, but only if `owner` still holds it. */
export function releasePrintLayer(owner) {
  if (layerOwner !== owner) return;
  flushSync(() => {
    layerOwner = null;
    notify();
  });
}

/**
 * Moves printable markup out of the app tree into the print layer.
 *
 * This is what makes printing correct: the app shell is removed from the printed
 * document with `display:none`, so it contributes zero height and therefore zero
 * phantom pages, while the sheet keeps its own natural flow.
 *
 * `persistent` keeps a sheet mounted while nothing is printing. Modals pass it
 * because they hand the payload in directly and also preview it on screen; the
 * preview lives in the modal body, and the portalled copy is hidden by CSS.
 */
export default function PrintPortal({ owner, persistent = false, children }) {
  const target = getPrintRoot();
  const currentOwner = useSyncExternalStore(subscribe, getLayerOwner, getServerLayerOwner);
  if (!target) return null;
  if (currentOwner !== owner && !(currentOwner === null && persistent)) return null;
  return createPortal(children, target);
}

/**
 * Print trigger for sheets whose payload is already in hand (modals).
 *
 * Returns the props to spread onto <PrintPortal> plus a `print()` that claims the
 * layer for the duration of the dialog, so any other loaded sheet is excluded
 * from the same print job.
 */
export function usePrintSheet() {
  const ownerRef = useRef(null);
  if (ownerRef.current === null) ownerRef.current = {};
  const owner = ownerRef.current;
  return useMemo(() => ({
    owner,
    persistent: true,
    print() {
      claimPrintLayer(owner);
      try {
        openPrintWindow();
      } finally {
        releasePrintLayer(owner);
      }
    },
  }), [owner]);
}
