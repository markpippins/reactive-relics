import * as React from "react";
import { transform } from "@babel/standalone";
import { generateMock } from "@/lib/schema";
import type { Widget } from "@/lib/widget-types";

function normalize(url: string): string {
  let host = "";
  let path = url;
  const abs = /^https?:\/\/([^/?#]+)([^?#]*)/i.exec(url);
  if (abs) {
    host = abs[1]!.toLowerCase();
    path = abs[2] || "/";
  } else {
    path = url.split("?")[0] || "/";
  }
  path = path.replace(/\/\d+(?=\/|$)/g, "/:param").replace(/\/+$/, "");
  if (!path.startsWith("/")) path = "/" + path;
  return `${host}${path}`;
}

/** Build a fetch replacement that answers from the widget's mock schemas. */
function makeMockFetch(widget: Widget, tickRef: { current: number }, log: (line: string) => void) {
  const keys = Object.keys(widget.mocks);
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const sig = normalize(url);
    let key = keys.find((k) => k === sig);
    if (!key) key = keys.find((k) => sig.endsWith(k) || k.endsWith(sig));
    if (!key) key = keys[0];
    const entry = key ? widget.mocks[key] : undefined;
    const body = entry?.schema ? generateMock(entry.schema, tickRef.current) : (entry?.sample ?? {});
    log(`${(init?.method ?? "GET").toUpperCase()} ${sig} → 200 (mock)`);
    await new Promise((r) => setTimeout(r, 60));
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => body,
      text: async () => JSON.stringify(body),
      clone() {
        return this;
      },
    } as unknown as Response;
  };
}

function compile(code: string, componentName: string): React.ComponentType<Record<string, unknown>> {
  const stripped = code
    .replace(/^\s*import\s[\s\S]*?from\s*["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/export\s+default\s+function/g, "function")
    .replace(/export\s+default\s+/g, "const __default = ")
    .replace(/export\s+(const|function|class)/g, "$1");

  const out = transform(stripped, {
    filename: "widget.tsx",
    presets: [["react", { runtime: "classic" }], "typescript"],
  }).code;

  const factory = new Function(
    "React",
    "useState",
    "useEffect",
    "useMemo",
    "useRef",
    "useCallback",
    "fetch",
    `${out}\n;return typeof ${componentName} !== "undefined" ? ${componentName} : (typeof __default !== "undefined" ? __default : null);`,
  );

  const mod = factory(
    React,
    React.useState,
    React.useEffect,
    React.useMemo,
    React.useRef,
    React.useCallback,
    // fetch is injected per-instance below via closure rebinding
    (globalThis as { fetch?: typeof fetch }).fetch,
  );
  if (typeof mod !== "function") throw new Error(`No component named "${componentName}" was found.`);
  return mod as React.ComponentType<Record<string, unknown>>;
}

class Boundary extends React.Component<
  { children: React.ReactNode; onError: (e: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  override render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

interface Props {
  widget: Widget;
  props?: Record<string, unknown>;
  /** milliseconds between mock data frames */
  intervalMs?: number;
  onLog?: (line: string) => void;
  className?: string;
}

export function WidgetSandbox({ widget, props = {}, intervalMs = 900, onLog, className }: Props) {
  const tickRef = React.useRef(0);
  const [error, setError] = React.useState<string | null>(null);
  const logRef = React.useRef(onLog);
  logRef.current = onLog;

  const Component = React.useMemo(() => {
    try {
      setError(null);
      const mockFetch = makeMockFetch(widget, tickRef, (l) => logRef.current?.(l));
      const Raw = compileWithFetch(widget.code, widget.componentName, mockFetch);
      return Raw;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [widget]);

  React.useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  if (error) {
    return (
      <div className={className}>
        <pre className="whitespace-pre-wrap rounded-md border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs text-destructive-foreground">
          {error}
        </pre>
      </div>
    );
  }
  if (!Component) return null;

  return (
    <div className={className}>
      <Boundary onError={(e) => setError(e.message)}>
        <Component {...props} />
      </Boundary>
    </div>
  );
}

/** Same as compile(), but binds the sandboxed fetch into the module scope. */
function compileWithFetch(
  code: string,
  componentName: string,
  mockFetch: typeof fetch,
): React.ComponentType<Record<string, unknown>> {
  const Component = compileFactory(code, componentName, mockFetch);
  return Component;
}

function compileFactory(
  code: string,
  componentName: string,
  mockFetch: typeof fetch,
): React.ComponentType<Record<string, unknown>> {
  const stripped = code
    .replace(/^\s*import\s[\s\S]*?from\s*["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/export\s+default\s+function/g, "function")
    .replace(/export\s+default\s+/g, "const __default = ")
    .replace(/export\s+(const|function|class)/g, "$1");

  const out = transform(stripped, {
    filename: "widget.tsx",
    presets: [["react", { runtime: "classic" }], "typescript"],
  }).code;

  const factory = new Function(
    "React",
    "useState",
    "useEffect",
    "useMemo",
    "useRef",
    "useCallback",
    "fetch",
    "axios",
    `"use strict";${out}\n;return typeof ${componentName} !== "undefined" ? ${componentName} : (typeof __default !== "undefined" ? __default : null);`,
  );

  const axios = {
    get: async (url: string) => ({ data: await (await mockFetch(url)).json() }),
    post: async (url: string) => ({ data: await (await mockFetch(url)).json() }),
    put: async (url: string) => ({ data: await (await mockFetch(url)).json() }),
    patch: async (url: string) => ({ data: await (await mockFetch(url)).json() }),
    delete: async (url: string) => ({ data: await (await mockFetch(url)).json() }),
  };

  const mod = factory(
    React,
    React.useState,
    React.useEffect,
    React.useMemo,
    React.useRef,
    React.useCallback,
    mockFetch,
    axios,
  );
  if (typeof mod !== "function") throw new Error(`No component named "${componentName}" was found.`);
  return mod as React.ComponentType<Record<string, unknown>>;
}

export { compile };
