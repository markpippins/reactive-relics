import { Link } from "@tanstack/react-router";
import { WidgetSandbox } from "./WidgetSandbox";
import { defaultProps } from "@/lib/widget-props";
import type { Widget } from "@/lib/widget-types";
import { useHydrated } from "@/hooks/use-hydrated";

export function WidgetCard({ widget }: { widget: Widget }) {
  const hydrated = useHydrated();
  const endpoint = widget.endpoints[0];

  return (
    <Link
      to="/widget/$id"
      params={{ id: widget.id }}
      className="panel group flex flex-col overflow-hidden transition-colors hover:border-primary/50"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="label-mono truncate">{endpoint ? endpoint.signature : "no api detected"}</span>
        <span className="live-dot shrink-0" aria-hidden />
      </div>
      <div className="flex min-h-44 items-center justify-center bg-background/40 p-5">
        {hydrated ? (
          <WidgetSandbox widget={widget} props={defaultProps(widget)} className="w-full" />
        ) : (
          <span className="label-mono">booting sandbox…</span>
        )}
      </div>
      <div className="border-t border-border p-4">
        <h3 className="font-semibold group-hover:text-primary">{widget.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{widget.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {widget.inputs.map((i) => (
            <span
              key={i.name}
              className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {i.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
