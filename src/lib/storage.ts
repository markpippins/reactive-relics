import { useCallback, useEffect, useState } from "react";
import type { Widget } from "./widget-types";
import { seedWidgets } from "./seed";

const KEY = "widget-bench.catalog.v1";

function read(): Widget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(seedWidgets));
      return seedWidgets;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Widget[]) : [];
  } catch {
    return [];
  }
}

function write(widgets: Widget[]) {
  window.localStorage.setItem(KEY, JSON.stringify(widgets));
  window.dispatchEvent(new CustomEvent("widget-bench:change"));
}

/** Local-only catalog store (browser storage). */
export function useCatalog() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => setWidgets(read()), []);

  useEffect(() => {
    sync();
    setReady(true);
    window.addEventListener("widget-bench:change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("widget-bench:change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const save = useCallback((widget: Widget) => {
    const all = read();
    const idx = all.findIndex((w) => w.id === widget.id);
    if (idx >= 0) all[idx] = widget;
    else all.unshift(widget);
    write(all);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((w) => w.id !== id));
  }, []);

  const reset = useCallback(() => write(seedWidgets), []);

  return { widgets, ready, save, remove, reset };
}

export function getWidget(id: string): Widget | undefined {
  return read().find((w) => w.id === id);
}
