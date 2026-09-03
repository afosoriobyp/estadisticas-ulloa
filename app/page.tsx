"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, Line } from "@/components/charts";
import type { FacturacionResponse, MonthDatum } from "@/lib/types";

const DEFAULT_FROM = "2023-11-01";
const DEFAULT_TO = "2025-12-30";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildUrl(from: string, to: string): string {
  const params = new URLSearchParams({ startDate: from, endDate: to });
  return `/api/facturacion?${params.toString()}`;
}

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(data: FacturacionResponse | null): boolean {
  if (!data || data.months.length === 0) return false;

  const header = ["Mes", "Inicio", "Fin", "Consultas", "Estado"];
  const rows = data.months.map((m) => [
    m.label,
    m.startDate,
    m.endDate,
    m.totalConsultas,
    m.error ? "Error" : "OK",
  ]);

  const totalRow = [
    "TOTAL",
    "",
    "",
    data.total,
    `${data.errors} error(es)`,
  ];

  const lines = [
    header,
    ...rows,
    totalRow,
  ]
    .map((row) => row.map(escapeCsv).join(";"))
    .join("\r\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consultas_${data.from}_${data.to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

type Status = "idle" | "loading" | "ready" | "error";

export default function DashboardPage() {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [data, setData] = useState<FacturacionResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (fromDate = from, toDate = to) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(buildUrl(fromDate, toDate), { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      const json = (await res.json()) as FacturacionResponse;
      setData(json);
      setStatus("ready");
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los datos");
      setStatus("error");
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const total = data?.total ?? 0;
  const months = data?.months ?? [];
  const errorsCount = data?.errors ?? 0;
  const monthsWithData = months.filter((m) => m.totalConsultas > 0).length;
  const avg =
    months.length > 0 ? Math.round((total / months.length) * 10) / 10 : 0;
  const maxMonth = months.reduce<MonthDatum | null>(
    (acc, m) => (acc === null || m.totalConsultas > acc.totalConsultas ? m : acc),
    null,
  );

  const labels = useMemo(() => months.map((m) => m.label), [months]);
  const values = useMemo(() => months.map((m) => m.totalConsultas), [months]);

  const barData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Consultas",
          data: values,
          backgroundColor: values.map((v) =>
            v > 0 ? "rgba(37, 99, 235, 0.85)" : "rgba(100, 116, 139, 0.35)",
          ),
          borderRadius: 6,
          borderSkipped: false as const,
        },
      ],
    }),
    [labels, values],
  );

  const lineData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Tendencia",
          data: values,
          borderColor: "rgba(16, 185, 129, 1)",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: "rgba(16, 185, 129, 1)",
        },
      ],
    }),
    [labels, values],
  );

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.y} consulta(s)`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "rgba(148, 163, 184, 0.15)" },
      },
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, autoSkip: true, autoSkipPadding: 20 },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.y} consulta(s)`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "rgba(148, 163, 184, 0.15)" },
      },
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, autoSkip: true, autoSkipPadding: 20 },
      },
    },
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3 13h4v8H3zM10 7h4v14h-4zM17 3h4v18h-4z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Dashboard de Consultas
              </h1>
              <p className="text-xs text-slate-500">Recaudamas · Facturación</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden text-xs text-slate-500 sm:block">
                Actualizado: {lastUpdated.toLocaleTimeString("es-CO")}
              </span>
            )}
            <button
              onClick={() => downloadCsv(data)}
              disabled={!data || data.months.length === 0}
              title="Exportar a CSV"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Exportar CSV
            </button>
            <button
              onClick={() => load()}
              disabled={status === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className={status === "loading" ? "animate-spin" : ""}
                aria-hidden
              >
                <path
                  d="M4 4v5h5M20 20v-5h-5M5.5 9A7 7 0 0 1 18 6.5L20 9M18.5 15A7 7 0 0 1 6 17.5L4 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {status === "loading" ? "Cargando…" : "Actualizar"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filtro de fechas */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Fecha inicio
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Fecha fin
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={() => load(from, to)}
            disabled={!from || !to || status === "loading"}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Aplicar rango
          </button>
        </div>

        {status === "error" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Tarjetas resumen */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total consultas"
            value={total.toLocaleString("es-CO")}
            icon="total"
            tone="blue"
            loading={status === "loading"}
          />
          <StatCard
            title="Promedio / mes"
            value={avg.toLocaleString("es-CO")}
            icon="avg"
            tone="emerald"
            loading={status === "loading"}
          />
          <StatCard
            title="Mes pico"
            value={maxMonth ? `${maxMonth.totalConsultas}` : "—"}
            sub={maxMonth?.label}
            icon="peak"
            tone="amber"
            loading={status === "loading"}
          />
          <StatCard
            title="Meses con actividad"
            value={`${monthsWithData} / ${months.length || 0}`}
            icon="months"
            tone="violet"
            loading={status === "loading"}
          />
        </div>

        {/* Gráfico de barras */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Consultas por mes</h2>
              <p className="text-xs text-slate-500">
                Desde {formatDate(from)} hasta {formatDate(to)}
              </p>
            </div>
            {errorsCount > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {errorsCount} mes(es) sin respuesta
              </span>
            )}
          </div>
          <div className="h-80">
            {status === "loading" ? (
              <Skeleton />
            ) : (
              <Bar data={barData} options={barOptions} />
            )}
          </div>
        </section>

        {/* Gráfico de línea */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Tendencia</h2>
            <p className="text-xs text-slate-500">
              Evolución mensual del volumen de consultas
            </p>
          </div>
          <div className="h-72">
            {status === "loading" ? (
              <Skeleton />
            ) : (
              <Line data={lineData} options={lineOptions} />
            )}
          </div>
        </section>

        {/* Detalle por mes */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Detalle mensual</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Mes</th>
                  <th className="py-2 pr-4 font-medium">Rango</th>
                  <th className="py-2 pr-4 text-right font-medium">Consultas</th>
                  <th className="py-2 text-right font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr
                    key={m.month}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-2.5 pr-4 font-medium">{m.label}</td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {formatDate(m.startDate)} → {formatDate(m.endDate)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                      {m.totalConsultas}
                    </td>
                    <td className="py-2.5 text-right">
                      {m.error ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {months.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Sin datos para el rango seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="text-center text-xs text-slate-400">
          Recaudamas · Dashboard de facturación
        </p>
      </footer>
    </main>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  tone,
  loading,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: "total" | "avg" | "peak" | "months";
  tone: "blue" | "emerald" | "amber" | "violet";
  loading: boolean;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };

  const paths: Record<string, React.ReactNode> = {
    total: (
      <path
        d="M3 13h4v8H3zM10 7h4v14h-4zM17 3h4v18h-4z"
        fill="currentColor"
      />
    ),
    avg: (
      <path
        d="M7 7h10v10H7z"
        fill="currentColor"
        opacity="0.6"
      />
    ),
    peak: (
      <path d="M4 20l6-8 4 4 6-10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
    months: (
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ),
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{title}</span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            {paths[icon]}
          </svg>
        </span>
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-200" />
      ) : (
        <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      )}
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex h-full w-full items-end justify-between gap-2 px-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-full animate-pulse rounded-t bg-slate-100"
          style={{ height: `${20 + (i * 37) % 80}%` }}
        />
      ))}
    </div>
  );
}