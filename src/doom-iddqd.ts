/**
 * IDDQD Easter Egg — global key sequence listener.
 *
 * Listens for the classic DOOM cheat code "iddqd" typed anywhere in
 * Home Assistant. To avoid interfering with the HA quick-search shortcut
 * (the "d" key), tracking only begins once "i" is pressed and expires
 * after a short timeout.
 *
 * When triggered, opens a native HA dialog with DOOM via the
 * show-dialog event system.
 */

import type { DoomIddqdDialogParams } from "./doom-iddqd-dialog";

const CHEAT_CODE = "iddqd";
const SEQUENCE_TIMEOUT_MS = 3000;

let buffer = "";
let timer: ReturnType<typeof setTimeout> | null = null;
let dialogOpen = false;

function reset(): void {
  buffer = "";
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function findHaTarget(): Element | null {
  const ha = document.querySelector("home-assistant");
  if (!ha?.shadowRoot) return null;
  return ha.shadowRoot.querySelector("home-assistant-main") || ha;
}

function activate(): void {
  if (dialogOpen) return;
  dialogOpen = true;

  const target = findHaTarget();
  if (!target) return;

  // Listen for dialog-closed to reset our flag
  const onClosed = (ev: Event) => {
    const detail = (ev as CustomEvent).detail;
    if (detail?.dialog === "doom-iddqd-dialog") {
      dialogOpen = false;
      target.removeEventListener("dialog-closed", onClosed);
    }
  };
  target.addEventListener("dialog-closed", onClosed);

  target.dispatchEvent(
    new CustomEvent("show-dialog", {
      bubbles: true,
      composed: true,
      detail: {
        dialogTag: "doom-iddqd-dialog",
        dialogImport: () => import("./doom-iddqd-dialog"),
        dialogParams: {} as DoomIddqdDialogParams,
      },
    })
  );
}

function handleKeyDown(ev: KeyboardEvent): void {
  if (dialogOpen) return;

  // Ignore key events when the user is typing in an input field.
  // Check the composed path (shadow DOM aware) for any editable element.
  const path = ev.composedPath();
  for (const el of path) {
    if (!(el instanceof HTMLElement)) continue;
    const tag = el.tagName;
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable
    ) {
      return;
    }
  }

  const key = ev.key.toLowerCase();

  // Only start tracking on "i"
  if (buffer === "" && key !== "i") return;

  buffer += key;

  // Reset the timeout on each valid keystroke
  if (timer) clearTimeout(timer);
  timer = setTimeout(reset, SEQUENCE_TIMEOUT_MS);

  // Check if we're still on the right track
  if (!CHEAT_CODE.startsWith(buffer)) {
    reset();
    return;
  }

  // Once we're past the initial "i", swallow subsequent keys so HA
  // shortcuts (like "d" for quick search) don't fire. The "i" itself
  // passes through since it doesn't conflict with any HA shortcut.
  if (buffer.length > 1) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  // Full match!
  if (buffer === CHEAT_CODE) {
    reset();
    activate();
  }
}

// Install the global listener
document.addEventListener("keydown", handleKeyDown, true);
