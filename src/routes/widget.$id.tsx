import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { WidgetSandbox } from "@/components/WidgetSandbox";
import { useCatalog } from "@/lib/storage";
import { defaultProps } from "@/lib/widget-props";
import { schemaFields, generateMock } from "@/lib/schema";
import { findMatches } from "@/lib/matching";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Widget } from "@/lib/widget-types";

export const Route = createFileRoute("/widget/$id")({
  head: () => ({
    meta: [
      { title: "Widget Detail — Widget Bench" },
      {
        name: "description",
        content:
          "Inspect a catalog widget: live mocked preview, detected REST endpoints, input scheme, and matching widgets on the same API.",
      },
      { property: "og:title", content: "Widget Detail — Widget Bench" },
      {
        property: "og:description",
        content: "Live preview, mock schema and API-compatible siblings for a catalog widget.",
      },
    ],
  }),
  component: WidgetDetailPage,
});

function WidgetDetailPage() {
  const { id } = Route.useParams();
  const { widgets, ready, remove } = useCatalog();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  const widget = widgets.find((w) => w.id === id);
  const [props, setProps] = useState<Record<string, unknown>>({});
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (widget) setProps(defaultProps(widget));
  }, [widget?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!widget) return;
    const t = setInterval(() => setLogs((l) => l.slice(-6)), 4000);
    return () => clearInterval(t);
  }, [widget?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(
    () => (widget ? findMatches(widget, widgets) : []),
    [widget, widgets],
  );

  if (!ready) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="label-mono mx-auto max-w-7xl px-6 py-10">loading…</p>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold">Widget not found</h1>
          <Link to="/" className="mt-4 inline-block font-mono text-xs uppercase text-primary">
            back to catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-mono">widget · {widget.componentName}</p>
            <h1 className="mt-2 text-3xl font-bold">{widget.name}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{widget.description}</p>
          </div>
          <button
            onClick={() => {
              remove(widget.id);
              navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs uppercase text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" /> Remove
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="label-mono">sandbox · mock data stream</span>
              <span className="live-dot" aria-hidden />
            </div>
            <div className="flex min-h-72 items-center justify-center bg-background/40 p-8">
              {hydrated ? (
                <WidgetSandbox
                  widget={widget}
                  props={props}
                  onLog={(l) => setLogs((prev) => [...prev.slice(-5), l])}
                  className="w-full max-w-lg"
                />
              ) : (
                <span className="label-mono">booting sandbox…</span>
              )}
            </div>
            <div className="border-t border-border bg-background/60 p-4">
              <p className="label-mono">intercepted requests</p>
              <div className="mt-2 space-y-0.5 font-mono text-[11px] text-accent">
                {logs.length ? logs.map((l, i) => <div key={i}>{l}</div>) : <span className="text-muted-foreground">waiting…</span>}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="panel p-5">
              <p className="label-mono">input scheme</p>
              <div className="mt-3 space-y-3">
                {widget.inputs.length === 0 && (
                  <p className="text-sm text-muted-foreground">This widget takes no props.</p>
                )}
                {widget.inputs.map((i) => (
                  <label key={i.name} className="block">
                    <span className="label-mono">
                      {i.name} · {i.type}
                    </span>
                    <input
                      value={String(props[i.name] ?? "")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
                        setProps((p) => ({ ...p, [i.name]: val }));
                      }}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-primary"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <p className="label-mono">rest api → mock source</p>
              {widget.endpoints.map((e) => {
                const mock = widget.mocks[e.signature];
                return (
                  <div key={e.signature} className="mt-3 rounded-md border border-border bg-background/50 p-3">
                    <div className="font-mono text-xs">
                      <span className="text-primary">{e.method}</span>{" "}
                      <span className="text-accent">{e.signature}</span>
                    </div>
                    <div className="mt-2 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                      {schemaFields(mock?.schema ?? null).map((f) => (
                        <div key={f}>{f}</div>
                      ))}
                    </div>
                    <pre className="mt-2 max-h-40 overflow-auto rounded border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                      {JSON.stringify(generateMock(mock?.schema ?? null, 5), null, 2)}
                    </pre>
                  </div>
                );
              })}
            </section>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Matching widgets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Widgets on the same REST API, ranked by how closely their input scheme and response
            shape align.
          </p>
          {matches.length === 0 ? (
            <div className="panel mt-4 p-8 text-center text-sm text-muted-foreground">
              No other widget consumes this API yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {matches.map((m) => (
                <MatchCard key={m.widget.id} widget={m.widget} score={m.score} shared={m} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MatchCard({
  widget,
  score,
  shared,
}: {
  widget: Widget;
  score: number;
  shared: { sharedEndpoints: string[]; sharedInputs: string[]; sharedResponseFields: string[] };
}) {
  const hydrated = useHydrated();
  return (
    <Link
      to="/widget/$id"
      params={{ id: widget.id }}
      className="panel flex flex-col overflow-hidden transition-colors hover:border-primary/50"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="label-mono">match</span>
        <span className="font-mono text-xs font-bold text-primary">
          {Math.round(score * 100)}%
        </span>
      </div>
      <div className="flex min-h-36 items-center justify-center bg-background/40 p-4">
        {hydrated ? (
          <WidgetSandbox widget={widget} props={defaultProps(widget)} className="w-full" />
        ) : null}
      </div>
      <div className="border-t border-border p-4">
        <h3 className="font-semibold">{widget.name}</h3>
        <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
          <div>
            <span className="text-accent">api</span> {shared.sharedEndpoints.join(", ")}
          </div>
          <div>
            <span className="text-accent">props</span>{" "}
            {shared.sharedInputs.join(", ") || "none in common"}
          </div>
          <div>
            <span className="text-accent">fields</span> {shared.sharedResponseFields.length} shared
          </div>
        </div>
      </div>
    </Link>
  );
}
