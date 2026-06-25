"use client";

import { useSyncExternalStore } from "react";

// Режим отображения полей анкеты: по вкладкам либо сплошным списком.
export type SheetLayout = "tabs" | "continuous";

const STORAGE_KEY = "gob:sheet-layout";
const DEFAULT: SheetLayout = "tabs";

const listeners = new Set<() => void>();

function read(): SheetLayout {
  if (typeof window === "undefined") return DEFAULT;
  return window.localStorage.getItem(STORAGE_KEY) === "continuous" ? "continuous" : "tabs";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function setSheetLayout(layout: SheetLayout) {
  window.localStorage.setItem(STORAGE_KEY, layout);
  listeners.forEach((cb) => { cb(); });
}

export function useSheetLayout(): SheetLayout {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
