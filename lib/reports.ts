import ExcelJS from "exceljs";
import { createCanvas } from "@napi-rs/canvas";
import { Chart, registerables } from "chart.js";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";
import type { AppUser } from "@/types";

Chart.register(...registerables);

// Brand-matched colors for chart PNGs — pulled from the same token
// values as app/globals.css (`--success` is actually gold in this
// app's palette, `--warn` a flux orange-red, not literal green/red).
export const REPORT_COLORS = {
  pass: "#E8B84B",
  fail: "#FF6B4A",
  attempted: "#D9824C",
  neutral: "#94A3B8",
};

/**
 * Every report endpoint needs the same "is this teacher/admin allowed
 * to see this class's data" check `getClassAuthorization` already
 * enforces everywhere else in the app — centralized here so a new
 * report type can't accidentally skip it. `classIds` is a list because
 * Aptitude tests can be assigned to more than one class; passes if the
 * caller is authorized on at least one.
 */
export async function requireReportAccess(classIds: string[]): Promise<AppUser | null> {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return null;
  const auths = await Promise.all(classIds.map((cid) => getClassAuthorization(cid, user.id, user.role)));
  if (!auths.some(isAuthorized)) return null;
  return user;
}

/**
 * Renders a pie chart to a PNG buffer entirely server-side, for
 * embedding as a static image at the top of a report sheet — this is
 * NOT a live/editable Excel chart object (those need paid tooling,
 * SheetJS Pro); an embedded image is the standard, practical approach
 * for a plain-JS stack and is what every report here uses.
 *
 * Uses `@napi-rs/canvas` (prebuilt binary, no native compilation)
 * instead of the `canvas` package `chartjs-node-canvas` normally
 * wraps — `canvas` requires a full C++ toolchain to build from source
 * and this environment has neither the Windows SDK nor prebuilt-binary
 * network access. Same Chart.js rendering, same visual output, just a
 * different (actually installable) canvas backend underneath.
 */
export async function renderPieChartPng({
  labels,
  data,
  colors,
  width = 480,
  height = 320,
}: {
  labels: string[];
  data: number[];
  colors: string[];
  width?: number;
  height?: number;
}): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const chart = new Chart(ctx as unknown as CanvasRenderingContext2D, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: "#ffffff", borderWidth: 2 }],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { position: "bottom", labels: { color: "#333333", font: { size: 13 } } },
      },
    },
  });
  chart.update();

  const buffer = canvas.toBuffer("image/png");
  chart.destroy();
  return buffer;
}

export function newReportWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Traversal";
  workbook.created = new Date();
  return workbook;
}

/** Bold white-on-dark header row — used for every table's first row
 * across all three report types, so they look like one system. */
export function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3A3A3A" } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

/** Adds a sheet with a chart image anchored at the top; returns the
 * sheet plus the first free row index below the image so the caller
 * knows where to start writing its table. */
export function addChartSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  chartPng: Buffer
): { sheet: ExcelJS.Worksheet; tableStartRow: number } {
  const sheet = workbook.addWorksheet(sheetName);
  const imageId = workbook.addImage({ buffer: chartPng as any, extension: "png" });
  sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 480, height: 320 } });
  // ~16px default row height -> 320px image spans about 17 rows; add
  // a 2-row gap before the table starts.
  return { sheet, tableStartRow: 19 };
}

export function safeFilenamePart(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "untitled";
}

export async function excelResponse(workbook: ExcelJS.Workbook, filename: string): Promise<NextResponse> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Hardcoded pass threshold — a score >= 50% of total_questions counts
 * as a pass for the Summary sheet's pie chart. Not currently
 * configurable per test; flagged here as the one place to change it
 * if that's ever needed. */
export const PASS_THRESHOLD_FRACTION = 0.5;
