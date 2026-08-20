import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { WidgetCard } from "@/components/WidgetCard";
import { useCatalog } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Widget Bench — Live React Widget Catalog" },
      {
        name: "description",
        content:
          "Paste a React component that calls a REST API, auto-generate animated mock data, and find widgets that share the same API and input scheme.",
      },
      { property: "og:title", content: "Widget Bench — Live React Widget Catalog" },
      {
        property: "og:description",
        content: "A catalog of live React widgets animated by mock data derived from their REST APIs.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { widgets, ready, reset } = useCatalog();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return widgets;
    return widgets.filter((w) =>
      [w.name, w.description, ...w.tags, ...w.inputs.map((i) => i.name), ...w.endpoints.map((e) => e.signature)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [widgets, q]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="panel mb-8 overflow-hidden">
          <div className="grid gap-6 p-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="label-mono">catalog / sandboxed previews</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                Every widget, running live on mock data.
              </h1>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Paste a component that talks to a REST API. Widget Bench detects the endpoints,
                turns a sample response into an animated mock source, and renders the widget in an
                isolated sandbox — then finds siblings that consume the same API with the same
                input scheme.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/new"
                  className="rounded-md bg-primary px-4 py-2.5 font-mono text-xs font-semibold tracking-wider uppercase text-primary-foreground"
                >
                  Paste a component
                </Link>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 font-mono text-xs tracking-wider uppercase text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" /> Reset examples
                </button>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3">
              {[
                { k: "widgets", v: widgets.length },
                { k: "apis", v: new Set(widgets.flatMap((w) => w.endpoints.map((e) => e.signature))).size },
                { k: "inputs", v: new Set(widgets.flatMap((w) => w.inputs.map((i) => i.name))).size },
              ].map((s) => (
                <div key={s.k} className="rounded-md border border-border bg-background/50 p-4">
                  <dd className="font-mono text-3xl font-bold text-primary">{s.v}</dd>
                  <dt className="label-mono mt-1">{s.k}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <div className="mb-6 flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search widgets, props, endpoints…"
            className="w-full bg-transparent py-1 font-mono text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {!ready ? (
          <p className="label-mono">loading catalog…</p>
        ) : filtered.length === 0 ? (
          <div className="panel p-12 text-center">
            <p className="text-muted-foreground">No widgets match that search.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((w) => (
              <WidgetCard key={w.id} widget={w} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
