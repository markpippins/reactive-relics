import { Link } from "@tanstack/react-router";
import { Boxes, Plus } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </span>
          <span>
            <span className="block font-mono text-sm font-bold tracking-widest uppercase">
              Widget Bench
            </span>
            <span className="label-mono">live catalog · mocked apis</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/"
            className="rounded-md px-3 py-2 font-mono text-xs tracking-wider uppercase text-muted-foreground transition-colors hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
          >
            Catalog
          </Link>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 font-mono text-xs font-semibold tracking-wider uppercase text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> Add widget
          </Link>
        </nav>
      </div>
    </header>
  );
}
