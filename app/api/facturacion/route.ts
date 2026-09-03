import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_URL =
  process.env.RECAUDAMAS_API_URL ??
  "https://www.recaudamas.com.co/api/controllers/facturacion/consultTotalFacturas";

const API_TOKEN = process.env.RECAUDAMAS_API_TOKEN ?? "";

type MonthlyResult = {
  month: string;
  label: string;
  startDate: string;
  endDate: string;
  totalConsultas: number;
  error?: string;
};

function parseDateISO(value: string): Date | null {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const years = new Date().getFullYear();
  const prefix = y === years ? "" : ` ${y}`;
  return `${MONTHS_ES[m - 1]}${prefix}`;
}

async function fetchMonth(startDate: string, endDate: string): Promise<number> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ startDate, endDate }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data && typeof data.totalConsultas === "number") {
    return data.totalConsultas;
  }
  throw new Error("Respuesta inesperada de la API");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startRaw = searchParams.get("startDate") ?? "2023-11-01";
  const endRaw = searchParams.get("endDate") ?? "2025-12-30";

  const start = parseDateISO(startRaw);
  const end = parseDateISO(endRaw);

  if (!start || !end) {
    return NextResponse.json(
      { success: false, error: "Fechas inválidas (formato YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  if (end < start) {
    return NextResponse.json(
      { success: false, error: "endDate debe ser posterior a startDate" },
      { status: 400 },
    );
  }

  const results: MonthlyResult[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const stopMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= stopMonth) {
    const startDate = isoMonth(cursor) + "-01";
    const endDate = isoMonth(cursor) + "-" + String(lastDayOfMonth(cursor)).padStart(2, "0");
    const label = monthLabel(isoMonth(cursor));

    try {
      const total = await fetchMonth(startDate, endDate);
      results.push({ month: isoMonth(cursor), label, startDate, endDate, totalConsultas: total });
    } catch (e) {
      results.push({
        month: isoMonth(cursor),
        label,
        startDate,
        endDate,
        totalConsultas: 0,
        error: e instanceof Error ? e.message : "Error desconocido",
      });
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  const total = results.reduce((acc, r) => acc + r.totalConsultas, 0);
  const errors = results.filter((r) => r.error);

  return NextResponse.json({
    success: true,
    total,
    from: startRaw,
    to: endRaw,
    count: results.length,
    months: results,
    errors: errors.length,
  });
}