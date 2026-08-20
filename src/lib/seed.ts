import { inferSchema } from "./schema";
import { analyze } from "./analyze";
import type { Widget } from "./widget-types";

const metricsSample = {
  region: "us-east",
  series: [
    { t: "2026-01-01T00:00:00Z", value: 42.5, label: "requests" },
    { t: "2026-01-01T00:01:00Z", value: 51.2, label: "requests" },
    { t: "2026-01-01T00:02:00Z", value: 38.9, label: "requests" },
    { t: "2026-01-01T00:03:00Z", value: 61.4, label: "requests" },
    { t: "2026-01-01T00:04:00Z", value: 47.1, label: "requests" },
  ],
  healthy: true,
};

const sparklineCode = `function MetricsSparkline({ region, refreshMs }) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("https://api.acme.dev/v1/metrics/" + region)
        .then((r) => r.json())
        .then((d) => alive && setData(d));
    load();
    const id = setInterval(load, refreshMs || 1200);
    return () => { alive = false; clearInterval(id); };
  }, [region, refreshMs]);

  if (!data) return <div style={{ opacity: 0.5 }}>loading…</div>;
  const values = data.series.map((p) => p.value);
  const max = Math.max(...values, 1);

  return (
    <div>
      <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.6, textTransform: "uppercase" }}>
        {data.region} · {data.healthy ? "healthy" : "degraded"}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 96, marginTop: 12 }}>
        {values.map((v, i) => (
          <div key={i} style={{
            flex: 1,
            height: (v / max) * 100 + "%",
            background: "linear-gradient(180deg,#f0b429,#d97706)",
            borderRadius: 3,
            transition: "height .5s ease",
          }} />
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700 }}>
        {values[values.length - 1].toFixed(1)}
      </div>
    </div>
  );
}`;

const gaugeCode = `function MetricsGauge({ region, refreshMs }) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("https://api.acme.dev/v1/metrics/" + region)
        .then((r) => r.json())
        .then((d) => alive && setData(d));
    load();
    const id = setInterval(load, refreshMs || 1200);
    return () => { alive = false; clearInterval(id); };
  }, [region, refreshMs]);

  const latest = data ? data.series[data.series.length - 1].value : 0;
  const pct = Math.min(latest / 80, 1);

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 120 70" style={{ width: "100%", maxWidth: 240 }}>
        <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
        <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#2dd4bf" strokeWidth="10"
          strokeLinecap="round" strokeDasharray="157"
          strokeDashoffset={157 - 157 * pct} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: -8 }}>{latest.toFixed(1)}</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{region}</div>
    </div>
  );
}`;

const inventoryCode = `function InventoryTable({ warehouse }) {
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("https://api.acme.dev/v1/inventory")
        .then((r) => r.json())
        .then((d) => alive && setRows(d.items || []));
    load();
    const id = setInterval(load, 1500);
    return () => { alive = false; clearInterval(id); };
  }, [warehouse]);

  return (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <tbody>
        {rows.map((it, i) => (
          <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
            <td style={{ padding: "6px 4px" }}>{it.sku}</td>
            <td style={{ padding: "6px 4px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {it.qty}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}`;

const inventorySample = {
  items: [
    { sku: "WB-1001", qty: 128, bin: "A3" },
    { sku: "WB-1002", qty: 54, bin: "B1" },
    { sku: "WB-1003", qty: 302, bin: "C7" },
  ],
};

function build(
  id: string,
  name: string,
  description: string,
  tags: string[],
  code: string,
  sample: unknown,
): Widget {
  const { componentName, inputs, endpoints } = analyze(code);
  const mocks: Widget["mocks"] = {};
  for (const e of endpoints) {
    mocks[e.signature] = { schema: inferSchema(sample), sample };
  }
  return {
    id,
    name,
    description,
    tags,
    code,
    componentName,
    inputs,
    endpoints,
    mocks,
    createdAt: Date.now(),
  };
}

export const seedWidgets: Widget[] = [
  build(
    "seed-sparkline",
    "Metrics Sparkline",
    "Bar sparkline of the last five metric samples for a region.",
    ["metrics", "chart"],
    sparklineCode,
    metricsSample,
  ),
  build(
    "seed-gauge",
    "Metrics Gauge",
    "Radial gauge of the latest metric value — same API and inputs as the sparkline.",
    ["metrics", "gauge"],
    gaugeCode,
    metricsSample,
  ),
  build(
    "seed-inventory",
    "Inventory Table",
    "Live SKU quantities from the inventory endpoint.",
    ["inventory", "table"],
    inventoryCode,
    inventorySample,
  ),
];
