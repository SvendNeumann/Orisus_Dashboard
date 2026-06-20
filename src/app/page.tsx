"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  BadgeEuro,
  Banknote,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileBarChart,
  FileUp,
  Gauge,
  Home,
  Landmark,
  Lock,
  Menu,
  PieChart as PieIcon,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X
} from "lucide-react";
import { Badge, Button, Card, Input, Progress, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  ebitdaTakeover,
  monthly,
  receivablesTrend,
  standorte,
  Status,
  topBehandlerHonorar,
  uploadTypes
} from "@/data/dashboard";

type DashboardSite = (typeof standorte)[number];

type Page =
  | "cockpit"
  | "kennzahlen"
  | "performance"
  | "standorte"
  | "standort-detail"
  | "analysen"
  | "bwa"
  | "cashflow"
  | "darlehen"
  | "banken"
  | "board"
  | "uploads"
  | "reports"
  | "admin";

type AuthStep = "welcome" | "login" | "first-password" | "first-pin" | "pin" | "forgot" | "app";

const periodOptions = [
  "Aktueller Monat",
  "YTD",
  "Letzte 3 Monate",
  "Letzte 6 Monate",
  "Letzte 12 Monate",
  "Geschäftsjahr 2024",
  "Geschäftsjahr 2025",
  "Geschäftsjahr 2026",
  "Gesamt seit Praxisstart",
  "Freier Zeitraum"
];

const comparisonOptions = ["Ist", "Vorjahr", "Abweichung in EUR", "Abweichung in %"];

const bwaPeriodOptions = ["Geschäftsjahr 2024", "Geschäftsjahr 2025", "Geschäftsjahr 2026", "Gesamte Periode"];

const authStorageKey = "orisus-cfo-authenticated";
const importStorageKey = "orisus-cfo-import-report";
const importDashboardStorageKey = "orisus-cfo-import-dashboard-data";

type ImportStatus = "idle" | "reading" | "ready" | "warning" | "error";

type ImportReport = {
  status: ImportStatus;
  fileName: string;
  importedAt: string;
  totalRows: number;
  usableRows: number;
  excludedPlanRows: number;
  sheetCount: number;
  missingSheets: string[];
  presentSheets: string[];
  standorte: string[];
  jahre: number[];
  monate: number[];
  datenbereiche: string[];
  werttypen: string[];
  warnings: string[];
  errors: string[];
};

type ImportedDashboardData = {
  importedAt: string;
  fileName: string;
  sites: DashboardSite[];
  monthly: typeof monthly;
  bwaRows: ImportedBwaRow[];
  report: ImportReport;
};

type BwaLine = {
  label: string;
  actual: number;
  indent?: boolean;
  emphasis?: boolean;
  percent?: boolean;
  kind?: "cashflow";
};

type ImportedBwaRow = {
  siteId: string;
  siteName: string;
  metricKey: string;
  label: string;
  section: string;
  order: number;
  indent: boolean;
  emphasis: boolean;
  percent: boolean;
  kind?: "cashflow";
  valuesByYear: Record<string, number>;
  hasDataByYear: Record<string, boolean>;
  valuesByMonth: Record<string, number>;
  hasDataByMonth: Record<string, boolean>;
  contractValue: number;
};

const emptyImportReport: ImportReport = {
  status: "idle",
  fileName: "",
  importedAt: "",
  totalRows: 0,
  usableRows: 0,
  excludedPlanRows: 0,
  sheetCount: 0,
  missingSheets: [],
  presentSheets: [],
  standorte: [],
  jahre: [],
  monate: [],
  datenbereiche: [],
  werttypen: [],
  warnings: [],
  errors: []
};

const requiredImportSheets = [
  "Konzern_Konsolidierung_STD",
  "Konzern_Konsolidierung",
  "Konzern_Standard_Mapping",
  "Konzern_Konsolidierung_QS",
  "Performance_Audit",
  "Kontostand_Audit"
];

const requiredConsolidationColumns = [
  "Standort_ID",
  "Standortname",
  "Gesellschaft",
  "Datenbereich",
  "Kategorie",
  "Kennzahl",
  "Jahr",
  "Monat",
  "Wert",
  "Einheit",
  "Werttyp"
];

const bwaMetricDefinitions = [
  { key: "section_umsatz", label: "1. Umsatz", section: "1. Umsatz", order: 100, source: [], emphasis: true },
  { key: "kzv_umsatz", label: "KZV-Umsatz", section: "1. Umsatz", order: 110, source: ["erlose_kzv"] },
  { key: "privatumsatz", label: "Privatumsatz", section: "1. Umsatz", order: 120, source: ["erlose_privat"] },
  { key: "bestandsveraenderung", label: "Bestandsveränderung", section: "1. Umsatz", order: 130, source: ["unterfertige_erzeugnisse"] },
  { key: "material_und_laborumsaetze", label: "Material- und Laborumsätze", section: "1. Umsatz", order: 140, source: ["material_und_laborumsatze"] },
  { key: "sonstige_betriebliche_erloese", label: "Sonstige betriebliche Erlöse", section: "1. Umsatz", order: 150, source: ["sonstige_erlose"] },
  { key: "aag_erstattungen", label: "AAG / Erstattungen", section: "1. Umsatz", order: 160, source: ["erstattungen_aufwendungsausgleich"] },
  { key: "summe_umsatz", label: "Summe Umsatz", section: "1. Umsatz", order: 170, source: ["gesamtleistung"], emphasis: true },
  { key: "gesamtleistungsquote", label: "Gesamtleistungsquote", section: "1. Umsatz", order: 180, source: [], percent: true, emphasis: true, derived: "gesamtleistungsquote" },
  { key: "section_praxisleistung", label: "2. Variable Kosten / Praxisleistung", section: "2. Variable Kosten / Praxisleistung", order: 200, source: [], emphasis: true },
  { key: "fremdlabor_gesamt", label: "Fremdlabor gesamt", section: "2. Variable Kosten / Praxisleistung", order: 210, source: ["fremdlaborkosten"] },
  { key: "materialkosten_gesamt", label: "Materialkosten gesamt", section: "2. Variable Kosten / Praxisleistung", order: 220, source: ["materialkosten"] },
  { key: "gesamtleistung_abzueglich_fremdlabor_material", label: "Gesamtleistung abzüglich Fremdlabor/Material", section: "2. Variable Kosten / Praxisleistung", order: 230, source: ["praxisleistung"], emphasis: true },
  { key: "praxisleistungsquote", label: "Praxisleistungsquote", section: "2. Variable Kosten / Praxisleistung", order: 240, source: [], percent: true, emphasis: true, derived: "praxisleistungsquote" },
  { key: "section_deckungsbeitrag", label: "3. Operative Kosten / Deckungsbeitrag", section: "3. Operative Kosten / Deckungsbeitrag", order: 300, source: [], emphasis: true },
  { key: "personalkosten_gesamt", label: "Personalkosten gesamt", section: "3. Operative Kosten / Deckungsbeitrag", order: 310, source: ["personalkosten"] },
  { key: "reparatur_instandhaltung", label: "Reparatur und Instandhaltung", section: "3. Operative Kosten / Deckungsbeitrag", order: 320, source: ["reparatur_instandhaltungskosten"] },
  { key: "deckungsbeitrag", label: "Praxisleistung abzüglich operative Kosten", section: "3. Operative Kosten / Deckungsbeitrag", order: 330, source: ["deckungsbeitrag"], emphasis: true },
  { key: "deckungsbeitragsquote", label: "Deckungsbeitragsquote", section: "3. Operative Kosten / Deckungsbeitrag", order: 340, source: [], percent: true, emphasis: true, derived: "deckungsbeitragsquote" },
  { key: "section_ebitda", label: "4. Sachkosten / EBITDA", section: "4. Sachkosten / EBITDA", order: 400, source: [], emphasis: true },
  { key: "miete_nebenkosten", label: "Miete / Nebenkosten", section: "4. Sachkosten / EBITDA", order: 410, source: ["raum_energiekosten"] },
  { key: "reise_fortbildung_seminare", label: "Reise / Fortbildung / Seminare", section: "4. Sachkosten / EBITDA", order: 420, source: ["reise_fortbildungskosten"] },
  { key: "summe_sonstige_kosten", label: "Summe sonstige Kosten", section: "4. Sachkosten / EBITDA", order: 490, source: ["sach_sonstige_kosten", "sonstige_kosten"], emphasis: true },
  { key: "ebitda", label: "EBITDA", section: "4. Sachkosten / EBITDA", order: 500, source: ["ebitda"], emphasis: true },
  { key: "ebitda_marge", label: "EBITDA-Marge", section: "4. Sachkosten / EBITDA", order: 510, source: [], percent: true, derived: "ebitda_marge" },
  { key: "section_ergebnis", label: "5. Unter EBITDA / Vorläufiges Ergebnis", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 600, source: [], emphasis: true },
  { key: "abschreibungen", label: "Abschreibungen", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 610, source: ["abschreibungen"] },
  { key: "zinsen_neutraler_aufwand", label: "Zinsen & neutraler Aufwand", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 620, source: ["zinsen_neutraler_aufwand"] },
  { key: "zinsertrag_abzinsung_rueckstellungen", label: "Zinsertrag Abzinsung Rückstellungen", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 630, source: ["zinsertrag_abzinsung_ruckstellungen"] },
  { key: "steuern_einkommen_ertrag", label: "Steuern vom Einkommen und Ertrag", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 640, source: ["steuern_vom_einkommen_und_ertrag"] },
  { key: "vorlaeufiges_ergebnis", label: "Vorläufiges Ergebnis", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 650, source: ["vorlaufiges_ergebnis"], emphasis: true },
  { key: "ergebnisquote", label: "Ergebnisquote", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 660, source: [], percent: true, derived: "ergebnisquote" },
  { key: "section_cashflow", label: "6. Cashflow-Adjustments", section: "6. Cashflow-Adjustments", order: 700, source: [], emphasis: true, kind: "cashflow" as const },
  { key: "cf_abschreibungen", label: "+ Abschreibungen", section: "6. Cashflow-Adjustments", order: 710, source: ["plus_abschreibungen"], kind: "cashflow" as const },
  { key: "investitionsausgaben", label: "Investitionsausgaben", section: "6. Cashflow-Adjustments", order: 720, source: ["investitionsausgaben"], kind: "cashflow" as const },
  { key: "tilgung", label: "Tilgung", section: "6. Cashflow-Adjustments", order: 730, source: ["tilgung"], kind: "cashflow" as const },
  { key: "umbuchung_zmvz", label: "Umbuchung ZMVZ", section: "6. Cashflow-Adjustments", order: 740, source: ["umbuchung_zmvz"], kind: "cashflow" as const },
  { key: "sonstige_rueckstellungen_bestandsminderungen", label: "Sonstige Rückstellungen / Bestandsminderungen", section: "6. Cashflow-Adjustments", order: 750, source: ["sonstige_ruckstellungen_bestandsminderungen"], kind: "cashflow" as const },
  { key: "cashflow_gesamt", label: "CashFlow Gesamt", section: "6. Cashflow-Adjustments", order: 760, source: ["cashflow_gesamt"], emphasis: true, kind: "cashflow" as const },
  { key: "cashflow_quote", label: "CashFlow-Quote", section: "6. Cashflow-Adjustments", order: 770, source: [], percent: true, derived: "cashflow_quote", kind: "cashflow" as const }
] as const;

const statusMap: Record<Status, { label: string; dot: string; tone: "green" | "yellow" | "red" }> = {
  green: { label: "Stabil", dot: "bg-emerald-500", tone: "green" },
  yellow: { label: "Beobachten", dot: "bg-amber-500", tone: "yellow" },
  red: { label: "Handlungsbedarf", dot: "bg-red-500", tone: "red" }
};

const desktopNav = [
  { id: "cockpit", label: "Cockpit", icon: Home },
  { id: "kennzahlen", label: "Orisus Kennzahlen/Entwicklung", icon: BarChart3 },
  { id: "performance", label: "Orisus Performance", icon: TrendingUp },
  { id: "standorte", label: "Standorte", icon: Building2 },
  { id: "bwa", label: "BWA", icon: FileBarChart },
  { id: "cashflow", label: "Cashflow", icon: Wallet },
  { id: "darlehen", label: "Darlehen & Earn-Out", icon: Landmark },
  { id: "banken", label: "Bankenreporting", icon: ShieldCheck },
  { id: "board", label: "Board-Pack", icon: FileBarChart },
  { id: "uploads", label: "Uploads", icon: FileUp },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "admin", label: "Admin / KPI-Regeln", icon: Lock }
] as const;

const mobileNav = [
  { id: "cockpit", label: "Cockpit", icon: Home },
  { id: "standorte", label: "Standorte", icon: Building2 },
  { id: "analysen", label: "Analysen", icon: BarChart3 },
  { id: "darlehen", label: "Darlehen", icon: Landmark },
  { id: "uploads", label: "Uploads", icon: FileUp }
] as const;

const quickNav = [
  { id: "cockpit", label: "Cockpit" },
  { id: "standorte", label: "Standorte" },
  { id: "bwa", label: "BWA" },
  { id: "performance", label: "Performance" },
  { id: "banken", label: "Banken" },
  { id: "board", label: "Board" }
] as const;

function eur(value: number, compact = false) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard"
  }).format(value);
}

function pct(value: number) {
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
}

function total(key: keyof (typeof standorte)[number]) {
  return standorte.reduce((sum, site) => sum + Number(site[key] ?? 0), 0);
}

function totalForSites(sites: DashboardSite[], key: keyof DashboardSite) {
  return sites.reduce((sum, site) => sum + Number(site[key] ?? 0), 0);
}

function asText(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = asText(value).replace(/\./g, "").replace(",", ".");
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueSortedText(values: unknown[], fallback: string[] = []) {
  const normalized = values.map(asText).filter(Boolean);
  const result = Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b, "de"));
  return result.length ? result : fallback;
}

function uniqueSortedNumbers(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map(asNumber)
        .filter((value): value is number => value != null)
        .map((value) => Math.trunc(value))
    )
  ).sort((a, b) => a - b);
}

function isAllowedTargetValue(row: Record<string, unknown>) {
  const text = `${asText(row.Kennzahl)} ${asText(row.Detailbezeichnung)} ${asText(row.Kategorie)}`.toLowerCase();
  const relatesToEbitdaTarget =
    text.includes("ebitda") &&
    ["ziel", "soll", "kaufvertrag", "übernahme", "uebernahme"].some((term) => text.includes(term));
  return relatesToEbitdaTarget || text.includes("earn-out");
}

function isExcludedPlanRow(row: Record<string, unknown>) {
  const valueType = asText(row.Werttyp).toLowerCase();
  return valueType.includes("plan") && !isAllowedTargetValue(row);
}

function normalizeMetric(value: unknown) {
  return asText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rowMetric(row: Record<string, unknown>) {
  const originalMetric = asText(row.Kennzahl);
  const rawMetric = originalMetric.startsWith("+") ? originalMetric : asText(row.Standard_Kennzahl || row.Kennzahl || row.Detailbezeichnung);
  return `${rawMetric.trim().startsWith("+") ? "plus_" : ""}${normalizeMetric(rawMetric)}`;
}

function rowDomain(row: Record<string, unknown>) {
  return normalizeMetric(row.Standard_Datenbereich || row.Datenbereich);
}

function rowYear(row: Record<string, unknown>) {
  return asNumber(row.Standard_Jahr) ?? asNumber(row.Jahr);
}

function rowMonth(row: Record<string, unknown>) {
  return asNumber(row.Standard_Monat) ?? asNumber(row.Monat);
}

function metricMatches(metric: string, candidates: string[]) {
  return candidates.some((candidate) => {
    if (candidate.endsWith("*")) return metric.startsWith(candidate.slice(0, -1));
    return metric === candidate;
  });
}

function sumRows(rows: Record<string, unknown>[], site: string | null, metrics: string[], domains?: string[]) {
  return rows.reduce((sum, row) => {
    if (site && asText(row.Standortname) !== site) return sum;
    const metric = rowMetric(row);
    const domain = rowDomain(row);
    if (!metricMatches(metric, metrics)) return sum;
    if (domains?.length && !metricMatches(domain, domains)) return sum;
    return sum + (asNumber(row.Wert) ?? 0);
  }, 0);
}

function lastRowsValue(rows: Record<string, unknown>[], site: string | null, metrics: string[], domains?: string[]) {
  const candidates = rows
    .filter((row) => {
      if (site && asText(row.Standortname) !== site) return false;
      const metric = rowMetric(row);
      const domain = rowDomain(row);
      return metricMatches(metric, metrics) && (!domains?.length || metricMatches(domain, domains));
    })
    .sort((a, b) => {
      const yearDelta = (rowYear(b) ?? 0) - (rowYear(a) ?? 0);
      if (yearDelta) return yearDelta;
      return (rowMonth(b) ?? 0) - (rowMonth(a) ?? 0);
    });
  return asNumber(candidates[0]?.Wert) ?? 0;
}

function sumMetricForPeriod(rows: Record<string, unknown>[], siteName: string, sourceKeys: readonly string[], year?: number, month?: number) {
  return rows.reduce((sum, row) => {
    if (asText(row.Standortname) !== siteName) return sum;
    if (year && (rowYear(row) ?? 0) !== year) return sum;
    if (month && (rowMonth(row) ?? 0) !== month) return sum;
    if (!metricMatches(rowMetric(row), [...sourceKeys])) return sum;
    return sum + (asNumber(row.Wert) ?? 0);
  }, 0);
}

function ratio(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function derivedBwaValue(rows: Record<string, unknown>[], siteName: string, key: string, year?: number, month?: number) {
  const totalPerformance = sumMetricForPeriod(rows, siteName, ["gesamtleistung"], year, month);
  if (key === "gesamtleistungsquote") return totalPerformance ? 100 : 0;
  if (key === "praxisleistungsquote") {
    return ratio(sumMetricForPeriod(rows, siteName, ["praxisleistung"], year, month), totalPerformance);
  }
  if (key === "deckungsbeitragsquote") {
    return ratio(sumMetricForPeriod(rows, siteName, ["deckungsbeitrag"], year, month), totalPerformance);
  }
  if (key === "ebitda_marge") {
    return ratio(sumMetricForPeriod(rows, siteName, ["ebitda"], year, month), totalPerformance);
  }
  if (key === "ergebnisquote") {
    return ratio(sumMetricForPeriod(rows, siteName, ["vorlaufiges_ergebnis"], year, month), totalPerformance);
  }
  if (key === "cashflow_quote") {
    return ratio(sumMetricForPeriod(rows, siteName, ["cashflow_gesamt"], year, month), totalPerformance);
  }
  return 0;
}

function definitionDerivedKey(definition: (typeof bwaMetricDefinitions)[number]) {
  return "derived" in definition ? definition.derived : null;
}

function definitionFlag(definition: (typeof bwaMetricDefinitions)[number], flag: "percent" | "emphasis") {
  if (flag === "percent") return "percent" in definition ? Boolean(definition.percent) : false;
  return "emphasis" in definition ? Boolean(definition.emphasis) : false;
}

function definitionKind(definition: (typeof bwaMetricDefinitions)[number]) {
  return "kind" in definition ? definition.kind : undefined;
}

function buildImportedBwaRows(rows: Record<string, unknown>[], report: ImportReport): ImportedBwaRow[] {
  const bwaRows = rows.filter((row) => rowDomain(row) === "bwa" && !isExcludedPlanRow(row));
  const validYears = report.jahre.filter((year) => year > 1900);
  return report.standorte.flatMap((siteName) =>
    bwaMetricDefinitions.map((definition) => {
      const hasDataByYear = Object.fromEntries(
        validYears.map((year) => [
          String(year),
          bwaRows.some((row) => asText(row.Standortname) === siteName && (rowYear(row) ?? 0) === year)
        ])
      );
      const valuesByYear = Object.fromEntries(
        validYears.map((year) => {
          const derivedKey = definitionDerivedKey(definition);
          const value = definition.source.length
            ? sumMetricForPeriod(bwaRows, siteName, definition.source, year)
            : derivedKey
              ? derivedBwaValue(bwaRows, siteName, derivedKey, year)
              : 0;
          return [String(year), value];
        })
      );
      const hasDataByMonth = Object.fromEntries(
        validYears.flatMap((year) =>
          Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            return [
              `${year}-${month}`,
              bwaRows.some(
                (row) =>
                  asText(row.Standortname) === siteName &&
                  (rowYear(row) ?? 0) === year &&
                  (rowMonth(row) ?? 0) === month
              )
            ];
          })
        )
      );
      const valuesByMonth = Object.fromEntries(
        validYears.flatMap((year) =>
          Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const derivedKey = definitionDerivedKey(definition);
            const value = definition.source.length
              ? sumMetricForPeriod(bwaRows, siteName, definition.source, year, month)
              : derivedKey
                ? derivedBwaValue(bwaRows, siteName, derivedKey, year, month)
                : 0;
            return [`${year}-${month}`, value];
          })
        )
      );
      const isPercent = definitionFlag(definition, "percent");
      const isEmphasis = definitionFlag(definition, "emphasis");
      const contractValue = isPercent
        ? 0
        : definition.source.length
          ? sumMetricForPeriod(bwaRows, siteName, definition.source)
          : 0;

      return {
        siteId: normalizeMetric(siteName),
        siteName,
        metricKey: definition.key,
        label: definition.label,
        section: definition.section,
        order: definition.order,
        indent: !isEmphasis && !definition.key.startsWith("section_"),
        emphasis: isEmphasis,
        percent: isPercent,
        kind: definitionKind(definition),
        valuesByYear,
        hasDataByYear,
        valuesByMonth,
        hasDataByMonth,
        contractValue
      };
    })
  );
}

function buildImportedDashboardData(workbook: XLSX.WorkBook, fileName: string, report: ImportReport): ImportedDashboardData {
  const rows = XLSX.utils
    .sheet_to_json<Record<string, unknown>>(workbook.Sheets.Konzern_Konsolidierung_STD, {
      defval: null,
      raw: true
    })
    .filter((row) => !isExcludedPlanRow(row) && asText(row.Kennzahl) && asText(row.Standortname));
  const latestYear = report.jahre.filter((year) => year > 1900).at(-1) ?? new Date().getFullYear();
  const activeRows = rows.filter((row) => (rowYear(row) ?? latestYear) === latestYear);
  const fallbackByName = new Map(standorte.map((site) => [site.name, site]));

  const sites = report.standorte.map((siteName) => {
    const fallback = fallbackByName.get(siteName) ?? standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? standorte[0];
    const siteRows = activeRows.filter((row) => asText(row.Standortname) === siteName);
    const gesamtleistung = Math.round(
      sumRows(siteRows, null, ["gesamtleistung"], ["bwa"]) || fallback.gesamtleistung
    );
    const pvsUmsatz = Math.round(sumRows(siteRows, null, ["pvs_gesamtumsatz_inkl_fl_mat"], ["finanzen"]) || fallback.pvsUmsatz);
    const ebitda = Math.round(sumRows(siteRows, null, ["ebitda"], ["bwa"]) || fallback.ebitda);
    const cashflow = Math.round(sumRows(siteRows, null, ["cashflow_gesamt"], ["bwa", "finanzen"]) || fallback.cashflow);
    const kontostand = Math.round(lastRowsValue(siteRows, null, ["kontostand"], ["kontostand"]) || fallback.kontostand);
    const material = Math.abs(sumRows(siteRows, null, ["materialkosten"], ["bwa"]));
    const fremdlabor = Math.abs(sumRows(siteRows, null, ["fremdlaborkosten"], ["bwa"]));
    const personal = Math.abs(sumRows(siteRows, null, ["personalkosten"], ["bwa"]));
    const forderungen = Math.round(lastRowsValue(siteRows, null, ["soll_forderung_pvs", "noch_ausstehend_vs_bank"], ["finanzen"]) || fallback.forderungen);
    const darlehen = Math.round(sumRows(siteRows, null, ["darlehen*", "fremdkapital*"], ["finanzen", "darlehen"]) || fallback.darlehen.darlehen);
    const tilgung = Math.abs(Math.round(sumRows(siteRows, null, ["tilgung"], ["finanzen", "bwa"]) || fallback.darlehen.tilgung));
    const restschuld = Math.max(0, Math.round(lastRowsValue(siteRows, null, ["restschuld", "rest_fremdkapital"], ["finanzen", "darlehen"]) || Math.max(0, darlehen - tilgung)));
    const ebitdaMarge = gesamtleistung ? (ebitda / gesamtleistung) * 100 : fallback.ebitdaMarge;
    const materialquote = gesamtleistung ? (material / gesamtleistung) * 100 : fallback.materialquote;
    const fremdlaborquote = gesamtleistung ? (fremdlabor / gesamtleistung) * 100 : fallback.fremdlaborquote;
    const sonstigeKostenquote = gesamtleistung ? Math.max(0, 100 - ebitdaMarge - materialquote - fremdlaborquote - (personal / gesamtleistung) * 100) : fallback.sonstigeKostenquote;
    const status: Status = ebitdaMarge < 8 || cashflow < 0 ? "red" : ebitdaMarge < 12 ? "yellow" : "green";

    return {
      ...fallback,
      id: normalizeMetric(siteName) || fallback.id,
      name: siteName,
      gesamtleistung,
      pvsUmsatz,
      ebitda,
      ebitdaMarge,
      cashflow,
      kontostand,
      forderungen,
      materialquote,
      fremdlaborquote,
      sonstigeKostenquote,
      status,
      darlehen: {
        ...fallback.darlehen,
        darlehen,
        restschuld,
        tilgung,
        istEbitda: ebitda
      }
    };
  });

  const monthlyData = report.monate.map((monthNumber) => {
    const monthRows = activeRows.filter((row) => (rowMonth(row) ?? 0) === monthNumber);
    const leistung = Math.round(sumRows(monthRows, null, ["gesamtleistung"], ["bwa"]));
    const ebitda = Math.round(sumRows(monthRows, null, ["ebitda"], ["bwa"]));
    const cashflow = Math.round(sumRows(monthRows, null, ["cashflow_gesamt"], ["bwa", "finanzen"]));
    return {
      month: new Date(2026, monthNumber - 1, 1).toLocaleString("de-DE", { month: "short" }).replace(".", ""),
      leistung,
      ebitda,
      marge: leistung ? (ebitda / leistung) * 100 : 0,
      cashflow
    };
  });

  return {
    importedAt: new Date().toISOString(),
    fileName,
    sites: sites.length ? sites : standorte,
    monthly: monthlyData.length ? monthlyData : monthly,
    bwaRows: buildImportedBwaRows(rows, report),
    report
  };
}

function buildImportReport(workbook: XLSX.WorkBook, fileName: string): ImportReport {
  const sheetNames = workbook.SheetNames;
  const presentSheets = requiredImportSheets.filter((sheet) => sheetNames.includes(sheet));
  const missingSheets = requiredImportSheets.filter((sheet) => !sheetNames.includes(sheet));
  const errors: string[] = [];
  const warnings: string[] = [];

  const sourceSheet = workbook.Sheets.Konzern_Konsolidierung_STD;
  if (!sourceSheet) {
    errors.push("Das Pflichtblatt Konzern_Konsolidierung_STD fehlt. Ohne dieses Blatt kann die App die Excel-Datei nicht importieren.");
    return {
      ...emptyImportReport,
      status: "error",
      fileName,
      importedAt: new Date().toISOString(),
      sheetCount: sheetNames.length,
      missingSheets,
      presentSheets,
      errors
    };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sourceSheet, {
    defval: null,
    raw: true
  });
  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sourceSheet, {
    header: 1,
    blankrows: false,
    defval: null
  });
  const headers = (headerRows[0] ?? []).map(asText);
  const missingColumns = requiredConsolidationColumns.filter((column) => !headers.includes(column));
  const usableRows = rows.filter((row) => !isExcludedPlanRow(row) && asText(row.Kennzahl) && asText(row.Standortname));
  const excludedPlanRows = rows.filter(isExcludedPlanRow).length;

  if (!rows.length) errors.push("Konzern_Konsolidierung_STD enthält keine Datenzeilen.");
  if (missingColumns.length) errors.push(`In Konzern_Konsolidierung_STD fehlen Spalten: ${missingColumns.join(", ")}.`);
  if (missingSheets.length) warnings.push(`Nicht alle ergänzenden Prüfblätter wurden gefunden: ${missingSheets.join(", ")}.`);
  if (!usableRows.some((row) => asText(row.Datenbereich).toLowerCase().includes("bwa"))) warnings.push("Es wurden keine BWA-Daten im Konsolidierungsblatt erkannt.");
  if (!usableRows.some((row) => asText(row.Datenbereich).toLowerCase().includes("finanzen"))) warnings.push("Es wurden keine Finanzdaten im Konsolidierungsblatt erkannt.");
  if (excludedPlanRows > 0) warnings.push(`${excludedPlanRows.toLocaleString("de-DE")} klassische Planwert-Zeilen wurden erkannt und vom App-Import ausgeschlossen.`);

  const standorteList = uniqueSortedText(usableRows.map((row) => row.Standortname)).filter((site) => site.toLowerCase() !== "konzern");
  const jahre = uniqueSortedNumbers(usableRows.map(rowYear)).filter((year) => year >= 1900);
  const monate = uniqueSortedNumbers(usableRows.map(rowMonth)).filter((month) => month >= 1 && month <= 12);
  const datenbereiche = uniqueSortedText(usableRows.map((row) => row.Standard_Datenbereich || row.Datenbereich));
  const werttypen = uniqueSortedText(usableRows.map((row) => row.Standard_Werttyp || row.Werttyp));
  const latestBwaYear = Math.max(
    0,
    ...usableRows
      .filter((row) => rowDomain(row) === "bwa")
      .map((row) => rowYear(row) ?? 0)
      .filter((year) => year >= 1900)
  );
  const sitesMissingLatestBwa = latestBwaYear
    ? standorteList.filter(
        (site) =>
          !usableRows.some(
            (row) => asText(row.Standortname) === site && rowDomain(row) === "bwa" && (rowYear(row) ?? 0) === latestBwaYear
          )
      )
    : [];
  if (sitesMissingLatestBwa.length) {
    warnings.push(`Für ${sitesMissingLatestBwa.join(", ")} wurden keine BWA-Daten im neuesten BWA-Jahr ${latestBwaYear} gefunden.`);
  }

  if (!standorteList.length) errors.push("Es wurden keine Standorte erkannt.");
  if (!jahre.length) warnings.push("Es wurden keine Jahre erkannt. Monats- und Jahresfilter koennen dadurch nicht sauber arbeiten.");
  if (!monate.length) warnings.push("Es wurden keine Monatswerte erkannt.");

  return {
    status: errors.length ? "error" : warnings.length ? "warning" : "ready",
    fileName,
    importedAt: new Date().toISOString(),
    totalRows: rows.length,
    usableRows: usableRows.length,
    excludedPlanRows,
    sheetCount: sheetNames.length,
    missingSheets,
    presentSheets,
    standorte: standorteList,
    jahre,
    monate,
    datenbereiche,
    werttypen,
    warnings,
    errors
  };
}

function cfoMetrics(sites: DashboardSite[] = standorte, monthlyData: typeof monthly = monthly) {
  const activeSites = sites.filter((site) => site.gesamtleistung > 0);
  const gesamtleistung = totalForSites(sites, "gesamtleistung");
  const ebitda = totalForSites(sites, "ebitda");
  const cashflow = totalForSites(sites, "cashflow");
  const kontostand = totalForSites(sites, "kontostand");
  const forderungen = totalForSites(sites, "forderungen");
  const aufgenommen = sites.reduce((sum, site) => sum + site.darlehen.darlehen, 0);
  const restschuld = sites.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
  const getilgt = Math.max(0, aufgenommen - restschuld);
  const zins = sites.reduce((sum, site) => sum + site.darlehen.zins, 0);
  const tilgung = sites.reduce((sum, site) => sum + site.darlehen.tilgung, 0);
  const kapitaldienst = tilgung + zins;
  const kostenquote =
    activeSites.reduce(
      (sum, site) => sum + site.gesamtleistung * (site.materialquote + site.fremdlaborquote + site.sonstigeKostenquote),
      0
    ) / (gesamtleistung || 1);
  const ebitdaMarge = gesamtleistung ? (ebitda / gesamtleistung) * 100 : 0;
  const runRateEbitda = monthlyData.length ? (ebitda / monthlyData.length) * 12 : 0;
  const kapitaldienstfaehigkeit = kapitaldienst ? ebitda / kapitaldienst : 0;
  const kritisch = activeSites.filter(
    (site) => site.status === "red" || site.cashflow < 0 || site.ebitdaMarge < 10 || site.forderungen > site.gesamtleistung * 0.15
  );

  return {
    activeSites,
    gesamtleistung,
    ebitda,
    cashflow,
    kontostand,
    forderungen,
    aufgenommen,
    restschuld,
    getilgt,
    zins,
    tilgung,
    kapitaldienst,
    kostenquote,
    ebitdaMarge,
    runRateEbitda,
    kapitaldienstfaehigkeit,
    kritisch
  };
}

export default function HomePage() {
  const [authStep, setAuthStep] = useState<AuthStep>("welcome");
  const [page, setPage] = useState<Page>("cockpit");
  const [selectedSite, setSelectedSite] = useState("kirchberg");
  const [period, setPeriod] = useState("YTD");
  const [comparison, setComparison] = useState("Vorjahr");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [previousPage, setPreviousPage] = useState<Page | null>(null);
  const [importedData, setImportedData] = useState<ImportedDashboardData | null>(null);
  const dashboardSites = importedData?.sites ?? standorte;
  const dashboardMonthly = importedData?.monthly ?? monthly;

  const selected = useMemo(
    () => dashboardSites.find((site) => site.id === selectedSite) ?? dashboardSites[0],
    [dashboardSites, selectedSite]
  );

  useEffect(() => {
    if (window.localStorage.getItem(authStorageKey) === "true") {
      setAuthStep("app");
    }
    const savedImport = window.localStorage.getItem(importDashboardStorageKey);
    if (!savedImport) return;
    try {
      setImportedData(JSON.parse(savedImport) as ImportedDashboardData);
    } catch {
      window.localStorage.removeItem(importDashboardStorageKey);
    }
  }, []);

  const setPersistentAuthStep = (step: AuthStep) => {
    if (step === "app") {
      window.localStorage.setItem(authStorageKey, "true");
    }
    setAuthStep(step);
  };

  const logout = () => {
    window.localStorage.removeItem(authStorageKey);
    setPin("");
    setMenuOpen(false);
    setAuthStep("welcome");
  };

  if (authStep !== "app") {
    return <AuthFlow step={authStep} setStep={setPersistentAuthStep} pin={pin} setPin={setPin} />;
  }

  const go = (target: Page) => {
    if (target !== page) {
      setPreviousPage(page);
    }
    setPage(target);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-border bg-white/92 px-5 py-6 backdrop-blur lg:block">
        <Brand />
        <nav className="mt-8 space-y-1">
          {desktopNav.map((item) => (
            <NavButton
              key={item.id}
              active={page === item.id || (item.id === "standorte" && page === "standort-detail")}
              icon={item.icon}
              label={item.label}
              onClick={() => go(item.id as Page)}
            />
          ))}
        </nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-border bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Nutzer</p>
          <p className="mt-1 font-semibold">Svend Neumann</p>
          <p className="text-sm text-muted-foreground">Interner CFO-Zugang</p>
          <Button className="mt-4 w-full" variant="secondary" onClick={logout}>
            Abmelden
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-white/88 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Brand compact />
          <button
            aria-label="Menü öffnen"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden">
          <div className="ml-auto h-full w-80 max-w-[86vw] bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <Brand compact />
              <button
                aria-label="Menü schließen"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-7 space-y-1">
              {desktopNav.map((item) => (
                <NavButton
                  key={item.id}
                  active={page === item.id || (item.id === "standorte" && page === "standort-detail")}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => go(item.id as Page)}
                />
              ))}
            </nav>
            <div className="mt-6 rounded-lg border border-border bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Sitzung</p>
              <p className="mt-1 text-sm text-muted-foreground">Du bleibst angemeldet, bis du dich aktiv abmeldest.</p>
              <Button className="mt-4 w-full" variant="secondary" onClick={logout}>
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="w-full px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <TopFilters period={period} setPeriod={setPeriod} comparison={comparison} setComparison={setComparison} />
          <NavigationControls
            page={page}
            previousPage={previousPage}
            onBack={() => go(previousPage ?? "cockpit")}
            onGo={go}
          />
          {page === "cockpit" && <Cockpit setPage={go} sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {page === "kennzahlen" && <KennzahlenEntwicklung />}
          {page === "performance" && <OrisusPerformance />}
          {page === "standorte" && (
            <Standorte
              sites={dashboardSites}
              onOpen={(id) => {
                setSelectedSite(id);
                go("standort-detail");
              }}
            />
          )}
          {page === "standort-detail" && <StandortDetail site={selected} importedData={importedData} />}
          {page === "analysen" && <Analysen />}
          {page === "bwa" && <Bwa importedData={importedData} />}
          {page === "cashflow" && <Cashflow />}
          {page === "darlehen" && <Darlehen />}
          {page === "banken" && <Bankenreporting />}
          {page === "board" && <BoardPack />}
          {page === "uploads" && <Uploads onImportConfirmed={setImportedData} onImportReset={() => setImportedData(null)} />}
          {page === "reports" && <Reports />}
          {page === "admin" && <AdminKpiRules />}
        </div>
      </main>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNav.map((item) => (
            <button
              key={item.id}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-muted-foreground",
                (page === item.id || (item.id === "standorte" && page === "standort-detail")) &&
                  "table-total text-primary"
              )}
              onClick={() => go(item.id as Page)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function AuthFlow({
  step,
  setStep,
  pin,
  setPin
}: {
  step: AuthStep;
  setStep: (step: AuthStep) => void;
  pin: string;
  setPin: (pin: string) => void;
}) {
  return (
    <main className="min-h-screen bg-[#eef3f4] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.18fr_0.82fr]">
        <section className="overflow-hidden rounded-xl border border-[#153547] bg-[#071927] text-white shadow-soft">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="w-44 rounded-md bg-white px-3 py-2 sm:w-52">
              <img src="/orisus-logo.png" alt="Orisus Zahnmedizin" className="h-auto w-full" />
            </div>

            <div className="mt-7 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#30d5c8]">Interne Steuerungsplattform</p>
              <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Die zentrale Steuerungsplattform für die gesamte Orisus-Gruppe.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Alle wirtschaftlichen Kennzahlen, Standorte, Cashflow, BWA, Finanzierungsdaten und Performance-KPIs
                auf einer Zahlenbasis. Für fundierte Entscheidungen. In Echtzeit.
              </p>
            </div>

            <div className="hidden lg:block">
              <LandingFeatures />
              <LandingMockup />
            </div>
          </div>
        </section>

        <aside className="flex flex-col justify-center gap-5">
          <Card className="overflow-hidden rounded-xl border-white bg-white shadow-soft">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e3f5f4] text-primary">
                <Lock className="h-6 w-6" />
              </div>
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-primary">Geschützter Zugang</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Orisus CFO Dashboard</h2>
              <div className="mt-4 space-y-2 text-base leading-7 text-slate-600">
                <p>Interne Management-Plattform für Geschäftsführung und Controlling.</p>
                <p>Zugriff auf CFO-Cockpit, Cashflow, BWA, Standortsteuerung und Finanzierungsdaten.</p>
              </div>

              <div className="mt-8 space-y-4">
          {step === "welcome" && (
            <>
              <Input defaultValue="svend.neumann@orisus.de" type="email" aria-label="E-Mail" />
              <Input placeholder="Passwort eingeben" type="password" aria-label="Passwort" />
              <Button className="w-full" onClick={() => setStep("login")}>
                Anmelden
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => setStep("forgot")}>
                Passwort vergessen
              </Button>
            </>
          )}
          {step === "login" && (
            <FormShell title="Anmelden" text="Interner Demo-Zugang für Svend Neumann.">
              <Input defaultValue="svend.neumann@orisus.de" type="email" aria-label="E-Mail" />
              <Input placeholder="Passwort" type="password" aria-label="Passwort" />
              <Button className="w-full" onClick={() => setStep("first-password")}>
                Einloggen
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => setStep("forgot")}>
                Passwort vergessen
              </Button>
            </FormShell>
          )}
          {step === "first-password" && (
            <FormShell title="Erstlogin" text="Bitte neues Passwort für den Prototyp festlegen.">
              <Input placeholder="Neues Passwort" type="password" />
              <Input placeholder="Passwort bestätigen" type="password" />
              <Button className="w-full" onClick={() => setStep("first-pin")}>
                Weiter zur PIN
              </Button>
            </FormShell>
          )}
          {step === "first-pin" && (
            <FormShell title="PIN festlegen" text="6-stellige PIN für die reguläre Nutzung.">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button className="w-full" disabled={pin.length < 6} onClick={() => setStep("app")}>
                Dashboard öffnen
              </Button>
            </FormShell>
          )}
          {step === "pin" && (
            <FormShell title="PIN eingeben" text="Regulärer Login mit 6-stelliger PIN.">
              <Input inputMode="numeric" maxLength={6} placeholder="PIN" />
              <Button className="w-full" onClick={() => setStep("app")}>
                Dashboard öffnen
              </Button>
            </FormShell>
          )}
          {step === "forgot" && (
            <FormShell
              title="Passwort zurücksetzen"
              text="Perspektivisch wird ein Reset-Link an svend.neumann@orisus.de gesendet."
            >
              <Input defaultValue="svend.neumann@orisus.de" type="email" />
              <Button className="w-full" onClick={() => setStep("login")}>
                Reset-Link simulieren
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => setStep("welcome")}>
                Zurück
              </Button>
            </FormShell>
          )}
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { title: "Sicher & intern", text: "Geschützter Zugriff für autorisierte Nutzer.", icon: ShieldCheck },
              { title: "Daten auf einer Basis", text: "Ein Import. Alle Zahlen. Volle Konsistenz.", icon: CircleDollarSign },
              { title: "Entscheidungen beschleunigen", text: "Transparenz in Echtzeit für schnellere Entscheidungen.", icon: TrendingUp }
            ].map(({ title, text, icon: Icon }) => (
              <div key={title} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3f5f4] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-950">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-500 lg:text-right">
            © 2025 Orisus Zahnmedizin MVZ GmbH | Version 1.0 | Internal Use Only
          </p>
        </aside>

        <section className="rounded-xl border border-[#153547] bg-[#071927] p-5 text-white shadow-soft lg:hidden">
          <LandingFeatures />
          <LandingMockup />
        </section>
      </div>
    </main>
  );
}

function LandingFeatures() {
  const features = [
    {
      title: "Daily CFO Cockpit",
      text: "Alle wichtigen Kennzahlen auf einen Blick - täglich aktualisiert.",
      icon: Gauge
    },
    {
      title: "BWA bis Cashflow",
      text: "Von der BWA über Umsatz bis zum Cashflow - lückenlos integriert.",
      icon: FileBarChart
    },
    {
      title: "Banken & Board",
      text: "Reporting-ready für Banken, Investoren und die Geschäftsführung.",
      icon: Landmark
    },
    {
      title: "Standortsteuerung",
      text: "Vergleichen, steuern und entwickeln - jeden Standort im Blick.",
      icon: Building2
    }
  ];

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {features.map(({ title, text, icon: Icon }) => (
        <div key={title} className="rounded-lg border border-white/12 bg-white/[0.04] p-4 shadow-sm backdrop-blur">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#30d5c8]/45 bg-[#30d5c8]/10 text-[#30d5c8]">
            <Icon className="h-5 w-5" />
          </div>
          <p className="mt-4 font-bold text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
        </div>
      ))}
    </div>
  );
}

function LandingMockup() {
  const sideItems = ["Cockpit", "Standorte", "Analysen", "Cashflow", "Darlehen & Earn-Out", "Uploads", "Reports"];
  const kpis = [
    ["Gesamtleistung (BWA)", "24,58 Mio. EUR"],
    ["Gesamtumsatz (PVS)", "22,14 Mio. EUR"],
    ["EBITDA", "5,23 Mio. EUR"],
    ["EBITDA-Marge", "21,3 %"],
    ["Cashflow", "3,12 Mio. EUR"],
    ["Kontostand", "11,78 Mio. EUR"]
  ];
  const bars = [42, 52, 48, 64, 72, 84];
  const siteBars = [
    ["Kirchberg", 92],
    ["Essen", 78],
    ["Kehl", 63],
    ["Ulmet", 55],
    ["Kassel", 36]
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-[#30d5c8]/25 bg-[#061521] shadow-2xl">
      <div className="grid lg:grid-cols-[164px_1fr]">
        <div className="border-b border-white/10 bg-[#04111d] p-4 lg:border-b-0 lg:border-r">
          <img src="/orisus-logo.png" alt="Orisus Zahnmedizin" className="w-28 rounded bg-white px-2 py-1" />
          <div className="mt-5 space-y-1.5">
            {sideItems.map((item, index) => (
              <div
                key={item}
                className={cn(
                  "rounded-md px-3 py-2 text-xs font-semibold",
                  index === 0 ? "bg-white/10 text-white" : "text-slate-400"
                )}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="mt-6 text-xs text-slate-500">
            <p>Datenstand</p>
            <p className="mt-1 text-slate-300">20.06.2025</p>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold text-white">CFO Konzern Cockpit</h2>
            <div className="flex gap-2 text-[11px] text-slate-300">
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5">Zeitraum: YTD 2025</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5">Vergleich: Ist</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {kpis.map(([label, value]) => (
              <div key={label} className="rounded-md bg-white p-3 text-slate-950">
                <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-bold">{value}</p>
                <p className="mt-1 text-[10px] font-semibold text-emerald-700">+ 4,2 %</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-3 text-slate-950">
              <p className="text-xs font-bold">EBITDA vs. Gesamtleistung</p>
              <div className="mt-4 flex h-28 items-end gap-2">
                {bars.map((bar, index) => (
                  <div key={index} className="flex flex-1 items-end gap-1">
                    <span className="w-1/2 rounded-t bg-primary" style={{ height: `${bar}%` }} />
                    <span className="w-1/2 rounded-t bg-[#30d5c8]" style={{ height: `${Math.max(18, bar * 0.45)}%` }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 text-slate-950">
              <p className="text-xs font-bold">EBITDA je Standort</p>
              <div className="mt-4 space-y-3">
                {siteBars.map(([site, value], index) => (
                  <div key={site} className="grid grid-cols-[72px_1fr_8px] items-center gap-2 text-[11px]">
                    <span>{site}</span>
                    <span className="h-2 rounded-full bg-slate-100">
                      <span className="block h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
                    </span>
                    <span className={cn("h-2 w-2 rounded-full", index < 3 ? "bg-emerald-500" : "bg-amber-500")} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 text-slate-950">
              <p className="text-xs font-bold">Cashflow Entwicklung</p>
              <div className="mt-4 flex h-28 items-end gap-1.5">
                {[32, 58, 44, 64, 38, 82, 54, 72].map((value, index) => (
                  <span
                    key={index}
                    className={cn("flex-1 rounded-t", index % 3 === 0 ? "bg-red-400" : "bg-[#30d5c8]")}
                    style={{ height: `${value}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-white sm:grid-cols-4">
            {[
              ["6", "Standorte"],
              ["360°", "Transparenz"],
              ["1", "Datenbasis"],
              ["100 %", "Entscheidungsstärke"]
            ].map(([value, label]) => (
              <div key={label} className="text-center">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-slate-300">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormShell({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
      {children}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/orisus-logo.png"
        alt="Orisus Zahnmedizin"
        className={cn("h-auto object-contain", compact ? "w-32" : "w-44")}
      />
      {!compact && <span className="sr-only">Orisus CFO Dashboard</span>}
    </div>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground",
        active && "table-total text-primary"
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

function TopFilters({
  period,
  setPeriod,
  comparison,
  setComparison
}: {
  period: string;
  setPeriod: (value: string) => void;
  comparison: string;
  setComparison: (value: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-white/86 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Globaler Filter</p>
        <p className="text-sm font-semibold">Zeitraum und Vergleich gelten für die Hauptansichten.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
          {periodOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
        <Select value={comparison} onChange={(event) => setComparison(event.target.value)}>
          {comparisonOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function NavigationControls({
  page,
  previousPage,
  onBack,
  onGo
}: {
  page: Page;
  previousPage: Page | null;
  onBack: () => void;
  onGo: (page: Page) => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-lg border border-border bg-white/86 p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <button
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold",
          page === "cockpit" && !previousPage ? "cursor-not-allowed text-muted-foreground" : "bg-white hover:bg-slate-50"
        )}
        disabled={page === "cockpit" && !previousPage}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </button>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
        {quickNav.map((item) => (
          <button
            key={item.id}
            className={cn(
              "h-10 shrink-0 rounded-md px-3 text-sm font-semibold",
              page === item.id ? "bg-primary text-white" : "bg-slate-50 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            )}
            onClick={() => onGo(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Cockpit({
  setPage,
  sites,
  monthlyData,
  importedData
}: {
  setPage: (page: Page) => void;
  sites: DashboardSite[];
  monthlyData: typeof monthly;
  importedData: ImportedDashboardData | null;
}) {
  return (
    <section className="space-y-5">
      <PageTitle title="Daily CFO Cockpit" text="Konsolidierte Steuerung der Orisus-Gruppe: Liquidität, Ergebnis, Forderungen, Fremdkapital und Handlungsbedarf." />
      <DataStatusStrip importedData={importedData} />
      <DailyCfoCockpit sites={sites} monthlyData={monthlyData} />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Ist EBITDA vs. EBITDA bei Übernahme" icon={TrendingUp}>
          <EbitdaTakeoverChart />
        </ChartCard>
        <ChartCard title="Kostenquoten am Umsatz" icon={PieIcon}>
          <CostShareDonut sites={sites} />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Standortvergleich Gesamtleistung & EBITDA" icon={BarChart3}>
          <SitePerformanceChart sites={sites} />
        </ChartCard>
        <ChartCard title="Top Behandler nach Honorarumsatz" icon={BadgeEuro}>
          <TopBehandlerChart />
        </ChartCard>
      </div>

      <StandortCfoComparison sites={sites} />

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <ChartCard title="Offene Forderungen je Standort" icon={FileBarChart}>
          <ReceivablesChart />
        </ChartCard>
        <AccountsBlock sites={sites} />
      </div>

      <DebtCapitalBlock sites={sites} />

      <div className="grid gap-5 xl:grid-cols-3">
        <CostRatios sites={sites} />
        <Ranking title="EBITDA je Standort" metric="ebitda" sites={sites} />
        <Ranking title="Gesamtleistung je Standort" metric="gesamtleistung" sites={sites} />
      </div>

      <CashflowBlock sites={sites} />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <TrafficLights sites={sites} monthlyData={monthlyData} />
        <Insights setPage={setPage} />
      </div>
    </section>
  );
}

function DataStatusStrip({ importedData }: { importedData?: ImportedDashboardData | null }) {
  return (
    <Card className="grid gap-3 p-3 text-sm sm:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Datenstand</p>
        <p className="font-bold">
          {importedData ? new Date(importedData.importedAt).toLocaleString("de-DE") : "Demo-Daten | noch kein bestätigter Excel-Import"}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Datenqualität</p>
        <div className="mt-1"><Badge tone={importedData?.report.status === "warning" ? "yellow" : "green"}>{importedData ? "Import bestätigt" : "Demo-Modus"}</Badge></div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Quelle</p>
        <p className="font-bold">{importedData?.fileName ?? "Interne Demo-Daten"}</p>
      </div>
    </Card>
  );
}

function DailyCfoCockpit({ sites, monthlyData }: { sites: DashboardSite[]; monthlyData: typeof monthly }) {
  const metrics = cfoMetrics(sites, monthlyData);
  const riskLabel = metrics.kritisch.length ? metrics.kritisch.map((site) => site.name).join(", ") : "Keine roten Standorte";
  const criticalReceivables = [...metrics.activeSites].sort((a, b) => b.forderungen - a.forderungen).slice(0, 2);

  const kpis = [
    {
      label: "Aktuelle Liquidität",
      value: metrics.kontostand,
      delta: "Konsolidierter Kontostand",
      icon: CircleDollarSign,
      status: metrics.kontostand > 500000 ? "green" : "yellow"
    },
    {
      label: "Free Cashflow",
      value: metrics.cashflow,
      delta: "nach Tilgung, Investitionen, Umbuchungen",
      icon: Wallet,
      status: metrics.cashflow >= 0 ? "green" : "red"
    },
    {
      label: "EBITDA YTD",
      value: metrics.ebitda,
      delta: `${pct(metrics.ebitdaMarge)} Marge | Run-Rate ${eur(metrics.runRateEbitda, true)}`,
      icon: Banknote,
      status: metrics.ebitdaMarge >= 12 ? "green" : "yellow"
    },
    {
      label: "Kritische Standorte",
      value: metrics.kritisch.length,
      delta: riskLabel,
      icon: Building2,
      status: metrics.kritisch.length ? "yellow" : "green"
    },
    {
      label: "Offene Forderungen kritisch",
      value: metrics.forderungen,
      delta: criticalReceivables.map((site) => site.name).join(" / "),
      icon: FileBarChart,
      status: metrics.forderungen > metrics.gesamtleistung * 0.15 ? "yellow" : "green"
    },
    {
      label: "Fremdkapital",
      value: metrics.restschuld,
      delta: `${eur(metrics.aufgenommen, true)} aufgenommen | ${eur(metrics.getilgt, true)} getilgt`,
      icon: Landmark,
      status: metrics.kapitaldienstfaehigkeit >= 1.5 ? "green" : "yellow"
    }
  ] satisfies Array<{
    label: string;
    value: number;
    delta: string;
    icon: React.ComponentType<{ className?: string }>;
    status: Status;
  }>;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}

function PageTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  percent,
  delta,
  icon: Icon,
  status
}: {
  label: string;
  value: number;
  percent?: boolean;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  status: Status;
}) {
  const positive = !delta.startsWith("-");
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md table-total text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <StatusDot status={status} />
      </div>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{percent ? pct(value) : eur(value, true)}</p>
      <div className={cn("mt-3 flex items-center gap-1 text-sm font-semibold", positive ? "text-emerald-700" : "text-red-700")}>
        {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{delta}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Ampelstatus nach vorläufiger CFO-Logik.</p>
    </Card>
  );
}

function StatusDot({ status }: { status: Status }) {
  return (
    <Badge tone={statusMap[status].tone}>
      <span className={cn("h-2 w-2 rounded-full", statusMap[status].dot)} />
      {statusMap[status].label}
    </Badge>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function EbitdaTakeoverChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={ebitdaTakeover}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => eur(Number(v), true)} />
        <Tooltip formatter={(v) => eur(Number(v))} />
        <Bar dataKey="ebitda" name="Ist EBITDA" fill="#0f766e" radius={[5, 5, 0, 0]} />
        <Line
          type="monotone"
          dataKey="uebernahmeEbitda"
          name="EBITDA bei Übernahme"
          stroke="#0369a1"
          strokeWidth={3}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CostShareDonut({ sites = standorte }: { sites?: DashboardSite[] }) {
  const revenue = totalForSites(sites, "pvsUmsatz") || totalForSites(sites, "gesamtleistung") || 1;
  const metrics = cfoMetrics(sites);
  const data = [
    { name: "Personal", value: Math.round(revenue * 0.278), color: "#0369a1" },
    { name: "Material", value: Math.round(revenue * 0.099), color: "#0f766e" },
    { name: "Fremdlabor", value: Math.round(revenue * 0.156), color: "#0891b2" },
    { name: "Weitere operative Kosten", value: Math.round(revenue * 0.161), color: "#64748b" }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie data={data} innerRadius={64} outerRadius={94} paddingAngle={3} dataKey="value">
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => eur(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 self-center">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-3 w-3 rounded-sm" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="text-sm font-bold">{pct((item.value / revenue) * 100)}</span>
          </div>
        ))}
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <Mini label="Gesamtkostenquote" value={pct(metrics.kostenquote)} />
          <Mini label="EBITDA-Marge" value={pct(metrics.ebitdaMarge)} />
        </div>
      </div>
    </div>
  );
}

function SitePerformanceChart({ sites = standorte }: { sites?: DashboardSite[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sites}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => eur(Number(v), true)} />
        <Tooltip formatter={(v) => eur(Number(v))} />
        <Bar dataKey="gesamtleistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
        <Bar dataKey="ebitda" name="EBITDA" fill="#0891b2" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StandortCfoComparison({ sites = standorte }: { sites?: DashboardSite[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-bold">Standortvergleich CFO-Kennzahlen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Konsolidierte Steuerungssicht je Standort: Ergebnisqualität, Cashflow, Forderungen und Kostenquote.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {["Standort", "Gesamtleistung", "EBITDA", "EBITDA-Marge", "Cashflow", "Forderungen", "Kostenquote", "Ampel"].map((head) => (
                <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sites.filter((site) => site.gesamtleistung > 0).map((site) => {
              const kostenquote = site.materialquote + site.fremdlaborquote + site.sonstigeKostenquote;
              return (
                <tr key={site.id}>
                  <td className="border-b border-r border-border p-3 font-bold">{site.name}</td>
                  <td className="border-b border-r border-border p-3 text-right font-semibold">{eur(site.gesamtleistung)}</td>
                  <td className="border-b border-r border-border p-3 text-right font-semibold">{eur(site.ebitda)}</td>
                  <td className="border-b border-r border-border p-3 text-right font-semibold">{pct(site.ebitdaMarge)}</td>
                  <td className={cn("border-b border-r border-border p-3 text-right font-semibold", site.cashflow < 0 && "text-red-700")}>{eur(site.cashflow)}</td>
                  <td className="border-b border-r border-border p-3 text-right font-semibold">{eur(site.forderungen)}</td>
                  <td className="border-b border-r border-border p-3 text-right font-semibold">{pct(kostenquote)}</td>
                  <td className="border-b border-r border-border p-3"><StatusDot status={site.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TopBehandlerChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={topBehandlerHonorar} layout="vertical" margin={{ left: 16, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(v) => eur(Number(v), true)} />
        <YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => eur(Number(v))} labelFormatter={(label) => `${label} Honorarumsatz`} />
        <Bar dataKey="honorar" name="Honorarumsatz" fill="#0f766e" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ReceivablesChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={receivablesTrend}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => eur(Number(v), true)} />
        <Tooltip formatter={(v) => eur(Number(v))} />
        <Bar dataKey="kirchberg" name="Kirchberg" stackId="forderungen" fill="#0f766e" />
        <Bar dataKey="essen" name="Essen" stackId="forderungen" fill="#0891b2" />
        <Bar dataKey="kehl" name="Kehl" stackId="forderungen" fill="#0369a1" />
        <Bar dataKey="ulmet" name="Ulmet" stackId="forderungen" fill="#64748b" />
        <Bar dataKey="huettenberg" name="Hüttenberg" stackId="forderungen" fill="#94a3b8" radius={[5, 5, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CostRatios({ site, sites = standorte }: { site?: DashboardSite; sites?: DashboardSite[] }) {
  const material = site?.materialquote ?? 9.9;
  const fremdlabor = site?.fremdlaborquote ?? 15.6;
  const sonstige = site?.sonstigeKostenquote ?? 37.8;
  const aggregate = !site && sites.length;
  const weighted = (key: "materialquote" | "fremdlaborquote" | "sonstigeKostenquote") => {
    const performance = totalForSites(sites, "gesamtleistung");
    return performance ? sites.reduce((sum, current) => sum + current.gesamtleistung * current[key], 0) / performance : 0;
  };
  const actualMaterial = aggregate ? weighted("materialquote") : material;
  const actualFremdlabor = aggregate ? weighted("fremdlaborquote") : fremdlabor;
  const actualSonstige = aggregate ? weighted("sonstigeKostenquote") : sonstige;
  const rows = [
    { label: "Materialquote", value: actualMaterial, target: 10.0, status: (actualMaterial <= 10 ? "green" : "yellow") as Status },
    { label: "Fremdlaborquote", value: actualFremdlabor, target: 14.5, status: (actualFremdlabor <= 14.5 ? "green" : "yellow") as Status },
    { label: "Sonstige Kostenquote", value: actualSonstige, target: 36.0, status: (actualSonstige <= 36 ? "green" : "yellow") as Status },
    { label: "Gesamtkostenquote", value: actualMaterial + actualFremdlabor + actualSonstige, target: 68.0, status: (actualMaterial + actualFremdlabor + actualSonstige <= 68 ? "green" : "yellow") as Status }
  ];
  return (
    <Card className="p-4">
      <h2 className="font-bold">{site ? `Kostenquoten ${site.name}` : "Kostenquoten"}</h2>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">{row.label}</span>
              <span className="text-muted-foreground">Ziel {pct(row.target)}</span>
            </div>
            <Progress value={row.value} tone={statusMap[row.status].tone} />
            <p className="mt-1 text-sm font-bold">{pct(row.value)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Ranking({ title, metric, sites = standorte }: { title: string; metric: "ebitda" | "gesamtleistung"; sites?: DashboardSite[] }) {
  const rows = [...sites].sort((a, b) => b[metric] - a[metric]);
  return (
    <Card className="p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((site) => (
          <button key={site.id} className="w-full rounded-md bg-slate-50 p-3 text-left">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{site.name}</span>
              <StatusDot status={site.status} />
            </div>
            <div className="flex items-center gap-3">
              <Progress value={metric === "ebitda" ? site.ebitdaMarge * 4 : site.gesamtleistung / 13000} tone={statusMap[site.status].tone} />
              <span className="min-w-20 text-right text-sm font-bold">{eur(site[metric], true)}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function CashflowBlock({ sites = standorte }: { sites?: DashboardSite[] }) {
  const totalCashflow = totalForSites(sites, "cashflow");
  const rows = [
    ["Praxiseingänge", 2962000],
    ["Praxiskosten", -2014000],
    ["Annuitäten", -251000],
    ["Umbuchungen MVZ", -104000],
    ["Netto-Cashflow", totalCashflow]
  ];
  return (
    <Card className="p-4">
      <h2 className="font-bold">Cashflow</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("mt-1 text-xl font-bold", Number(value) < 0 && "text-red-700")}>{eur(Number(value))}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AccountsBlock({ sites = standorte }: { sites?: DashboardSite[] }) {
  return (
    <Card className="p-4">
      <h2 className="font-bold">Kontostände</h2>
      <p className="mt-1 text-sm text-muted-foreground">Konsolidiert: {eur(totalForSites(sites, "kontostand"))}</p>
      <div className="mt-4 space-y-3">
        {sites.map((site) => (
          <div key={site.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
            <span className="font-semibold">{site.name}</span>
            <span className="font-bold">{eur(site.kontostand)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DebtCapitalBlock({ sites = standorte }: { sites?: DashboardSite[] }) {
  const aufgenommen = sites.reduce((sum, site) => sum + site.darlehen.darlehen, 0);
  const rest = sites.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
  const getilgt = Math.max(0, aufgenommen - rest);
  const tilgungsquote = aufgenommen ? (getilgt / aufgenommen) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold">Fremdkapital & Tilgung</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aufgenommenes Fremdkapital, bereits getilgter Anteil und verbleibende Restschuld.
          </p>
        </div>
        <Badge tone={tilgungsquote >= 20 ? "green" : "yellow"}>{pct(tilgungsquote)} getilgt</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Mini label="Aufgenommenes Fremdkapital" value={eur(aufgenommen)} />
        <Mini label="Bereits getilgt" value={eur(getilgt)} />
        <Mini label="Rest-Fremdkapital" value={eur(rest)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <div className="flex h-4 bg-slate-100">
          <div className="bg-emerald-500" style={{ width: `${tilgungsquote}%` }} />
          <div className="bg-cyan-800" style={{ width: `${100 - tilgungsquote}%` }} />
        </div>
        <div className="grid gap-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-3 text-sm">
            <span className="inline-flex h-3 w-3 rounded-sm bg-emerald-500" />{" "}
            <span className="font-semibold">Getilgt:</span> {eur(getilgt)}
          </div>
          <div className="p-3 text-sm">
            <span className="inline-flex h-3 w-3 rounded-sm bg-cyan-800" />{" "}
            <span className="font-semibold">Rest:</span> {eur(rest)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => {
          const siteGetilgt = Math.max(0, site.darlehen.darlehen - site.darlehen.restschuld);
          const siteQuote = site.darlehen.darlehen ? (siteGetilgt / site.darlehen.darlehen) * 100 : 0;
          return (
            <div key={site.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{site.name}</span>
                <span className="text-sm font-bold text-muted-foreground">{pct(siteQuote)}</span>
              </div>
              <Progress value={siteQuote} tone={siteQuote >= 20 ? "green" : "yellow"} />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Getilgt {eur(siteGetilgt, true)}</span>
                <span>Rest {eur(site.darlehen.restschuld, true)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TrafficLights({ sites = standorte, monthlyData = monthly }: { sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  const metrics = cfoMetrics(sites, monthlyData);
  const rows = [
    {
      label: "EBITDA-Marge Konzern",
      value: pct(metrics.ebitdaMarge),
      status: metrics.ebitdaMarge >= 15 ? "green" : metrics.ebitdaMarge >= 10 ? "yellow" : "red",
      rule: "grün ab 15 %, gelb ab 10 %"
    },
    {
      label: "Cashflow Konzern",
      value: eur(metrics.cashflow),
      status: metrics.cashflow >= 0 ? "green" : "red",
      rule: "rot bei negativem Netto-Cashflow"
    },
    {
      label: "Offene Forderungen",
      value: eur(metrics.forderungen),
      status: metrics.forderungen <= metrics.gesamtleistung * 0.12 ? "green" : metrics.forderungen <= metrics.gesamtleistung * 0.18 ? "yellow" : "red",
      rule: "Schwelle relativ zur Gesamtleistung"
    },
    {
      label: "Kostenquote",
      value: pct(metrics.kostenquote),
      status: metrics.kostenquote <= 68 ? "green" : metrics.kostenquote <= 74 ? "yellow" : "red",
      rule: "Material, Fremdlabor und sonstige Kosten"
    },
    {
      label: "Aktuelle Liquidität",
      value: eur(metrics.kontostand),
      status: metrics.kontostand >= 500000 ? "green" : metrics.kontostand >= 250000 ? "yellow" : "red",
      rule: "konsolidierter Kontostand aus Import"
    },
    {
      label: "Kapitaldienstfähigkeit",
      value: `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`,
      status: metrics.kapitaldienstfaehigkeit >= 1.5 ? "green" : metrics.kapitaldienstfaehigkeit >= 1 ? "yellow" : "red",
      rule: "EBITDA / Tilgung plus Zins"
    }
  ] satisfies Array<{ label: string; value: string; status: Status; rule: string }>;
  return (
    <Card className="p-4">
      <h2 className="font-bold">Ampel-Center</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{row.label}</p>
              <StatusDot status={row.status} />
            </div>
            <p className="mt-2 text-lg font-bold">{row.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.rule}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Insights({ setPage }: { setPage: (page: Page) => void }) {
  const insights = [
    "Cashflow Essen negativ: Annuitäten und Forderungsaufbau drücken den Netto-Cashflow.",
    "EBITDA-Marge Ulmet liegt über Ziel und stabilisiert die Konzernmarge.",
    "Offene Forderungen sind konzernweit gestiegen; Fokus auf Essen und Kehl.",
    "Earn-Out Kirchberg bei 58 % Fortschritt.",
    "Gesamtleistung Konzern liegt 4,2 % über Vorjahr.",
    "Kostenquote Kehl auffällig; Fremdlaborquote prüfen."
  ];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">CFO Insights</h2>
        <Badge tone="blue">Regelbereit</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {insights.map((insight) => (
          <div key={insight} className="flex gap-3 rounded-md bg-slate-50 p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-6">{insight}</p>
          </div>
        ))}
      </div>
      <Button className="mt-4 w-full sm:w-auto" variant="secondary" onClick={() => setPage("analysen")}>
        Analysen öffnen
      </Button>
    </Card>
  );
}

function Standorte({ onOpen, sites = standorte }: { onOpen: (id: string) => void; sites?: DashboardSite[] }) {
  return (
    <section className="space-y-5">
      <PageTitle title="Standorte" text="Alle Standorte mit Zeiträumen ab jeweiligem Praxisstart." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => (
          <Card key={site.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{site.name}</h2>
                <p className="text-sm text-muted-foreground">Start in der Gruppe: {site.start}</p>
              </div>
              <StatusDot status={site.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Mini label="Gesamtleistung" value={eur(site.gesamtleistung, true)} />
              <Mini label="EBITDA" value={eur(site.ebitda, true)} />
              <Mini label="Marge" value={pct(site.ebitdaMarge)} />
              <Mini label="Cashflow" value={eur(site.cashflow, true)} />
              <Mini label="Kontostand" value={eur(site.kontostand, true)} />
              <Mini label="Forderungen" value={eur(site.forderungen, true)} />
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => onOpen(site.id)}>
              Standort öffnen
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function BwaStatement({ title, siteId, importedData }: { title: string; siteId?: string; importedData?: ImportedDashboardData | null }) {
  const [period, setPeriod] = useState("Geschäftsjahr 2026");
  if (!siteId) {
    return <ConsolidatedBwaMatrix title={title} period={period} setPeriod={setPeriod} importedData={importedData} />;
  }

  const rows = importedData?.bwaRows?.length ? buildImportedBwaLines(importedData.bwaRows, period, siteId) : buildBwaRows(period, siteId);
  const activeSites = siteId ? (importedData?.sites ?? standorte).filter((site) => site.id === siteId) : (importedData?.sites ?? standorte);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {importedData ? "Aus bestätigtem Excel-Import abgeleitet." : "Enthält Dummy-Werte ab jeweiligem Praxisstart; Kassel erscheint erst ab Geschäftsjahr 2026."}
          </p>
        </div>
        <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
          {bwaPeriodOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.4fr_1fr] gap-3 border-b border-border bg-slate-50 p-3 text-xs font-bold uppercase text-muted-foreground">
            <span>Position</span>
            <span className="text-right">Ist</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className={cn(
                "grid grid-cols-[1.4fr_1fr] gap-3 border-b border-border p-3 text-sm last:border-0",
                row.emphasis && "table-total font-bold",
                row.kind === "cashflow" && "table-cashflow"
              )}
            >
              <span className={cn(row.indent && "pl-5 text-muted-foreground")}>{row.label}</span>
              <span className="text-right font-semibold">{row.percent ? pct(row.actual) : eur(row.actual)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 border-t border-border bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <Mini label="Ausgewählte Standorte" value={activeSites.map((site) => site.name).join(", ")} />
        <Mini label="Periode" value={period} />
        <Mini label="Datenstatus" value={importedData ? "Excel-Import bestätigt" : "Dummy / Phase 1"} />
      </div>
    </Card>
  );
}

function ConsolidatedBwaMatrix({
  title,
  period,
  setPeriod,
  importedData
}: {
  title: string;
  period: string;
  setPeriod: (value: string) => void;
  importedData?: ImportedDashboardData | null;
}) {
  const sourceSites = importedData?.sites ?? standorte;
  const groups = importedData?.bwaRows?.length
    ? [
        { id: "konzern", label: "Konzern", rows: buildImportedBwaLines(importedData.bwaRows, period), hasData: true },
        ...sourceSites.map((site) => ({
          id: site.id,
          label: site.name,
          rows: buildImportedBwaLines(importedData.bwaRows, period, site.id),
          hasData: hasImportedBwaPeriodData(importedData.bwaRows, period, site.id)
        }))
      ]
    : [
        { id: "konzern", label: "Konzern", rows: buildBwaRows(period), hasData: true },
        ...sourceSites.map((site) => ({
          id: site.id,
          label: site.name,
          rows: buildBwaRows(period, site.id),
          hasData: true
        }))
      ];
  const rowTemplate = groups[0].rows;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Links stehen die BWA-Positionen, rechts Konzern und Standorte nebeneinander. Neue Standorte werden als weitere Spalten ergänzt.
          </p>
        </div>
        <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
          {bwaPeriodOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </div>
      <div className="max-h-[72vh] overflow-auto">
        <table className="min-w-[1180px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-64 border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                BWA-Position
              </th>
              {groups.map((group) => (
                <th
                  key={group.id}
                  colSpan={2}
                  className="sticky top-0 z-20 border-b border-r border-border table-head p-3 text-center text-xs font-bold uppercase text-white"
                >
                  {group.label}
                  {!group.hasData && <span className="block text-[10px] font-semibold normal-case text-cyan-100">keine Daten</span>}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 top-[45px] z-30 border-b border-r border-border table-subhead p-2 text-left text-xs font-semibold text-white">
                {period}
              </th>
              {groups.map((group) => (
                <FragmentHeaders key={group.id} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rowTemplate.map((row, rowIndex) => (
              <tr key={row.label}>
                <td
                  className={cn(
                    "sticky left-0 z-10 border-b border-r border-border bg-white p-2 font-semibold",
                    row.indent && "pl-6 font-medium text-muted-foreground",
                    row.emphasis && "table-total text-foreground",
                    row.kind === "cashflow" && "table-cashflow"
                  )}
                >
                  {row.label}
                </td>
                {groups.map((group) => {
                  const groupRow = group.rows[rowIndex];
                  const performance = group.rows.find((candidate) => candidate.label === "Summe Umsatz")?.actual || 0;
                  const quote = groupRow.emphasis && groupRow.actual === 0 ? 0 : groupRow.percent ? groupRow.actual : performance ? (groupRow.actual / performance) * 100 : 0;
                  return (
                    <FragmentCells
                      key={`${group.id}-${row.label}`}
                      row={groupRow}
                      quote={quote}
                      hasData={group.hasData}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-slate-50 p-4 text-sm text-muted-foreground">
        Mobile Ansicht: horizontal wischen; die BWA-Position bleibt links fixiert.
      </div>
    </Card>
  );
}

function FragmentHeaders() {
  return (
    <>
      <th className="sticky top-[45px] z-20 w-32 border-b border-r border-border table-subhead p-2 text-right text-xs font-semibold text-white">
        Ist
      </th>
      <th className="sticky top-[45px] z-20 w-24 border-b border-r border-border table-subhead p-2 text-right text-xs font-semibold text-white">
        % GL
      </th>
    </>
  );
}

function FragmentCells({
  row,
  quote,
  hasData = true
}: {
  row: BwaLine;
  quote: number;
  hasData?: boolean;
}) {
  if (!hasData) {
    return (
      <>
        <td className="border-b border-r border-border bg-slate-50 p-2 text-right text-muted-foreground">-</td>
        <td className="border-b border-r border-border bg-slate-50 p-2 text-right text-muted-foreground">-</td>
      </>
    );
  }
  const isSectionRow = row.emphasis && row.actual === 0 && !row.percent;
  if (isSectionRow) {
    return (
      <>
        <td className={cn("border-b border-r border-border bg-white p-2", row.kind === "cashflow" && "table-cashflow")} />
        <td className={cn("border-b border-r border-border bg-white p-2", row.kind === "cashflow" && "table-cashflow")} />
      </>
    );
  }
  return (
    <>
      <td
        className={cn(
          "border-b border-r border-border bg-white p-2 text-right font-semibold tabular-nums",
          row.actual < 0 && "text-red-700",
          row.emphasis && "table-total text-foreground",
          row.kind === "cashflow" && "table-cashflow"
        )}
      >
        {row.percent ? pct(row.actual) : eur(row.actual)}
      </td>
      <td
        className={cn(
          "border-b border-r border-border bg-white p-2 text-right text-muted-foreground tabular-nums",
          row.emphasis && "table-total font-bold text-foreground",
          row.kind === "cashflow" && "table-cashflow"
        )}
      >
        {pct(quote)}
      </td>
    </>
  );
}

function hasImportedBwaPeriodData(importedRows: ImportedBwaRow[], period: string, siteId: string) {
  const year = selectedBwaYear(period);
  const rows = importedRows.filter((row) => row.siteId === siteId);
  if (!year) return rows.some((row) => row.contractValue !== 0 || Object.values(row.hasDataByYear).some(Boolean));
  return rows.some((row) => row.hasDataByYear[year]);
}

function selectedBwaYear(period: string) {
  const match = period.match(/20\d{2}/);
  return match ? match[0] : null;
}

function buildImportedBwaLines(importedRows: ImportedBwaRow[], period: string, siteId?: string): BwaLine[] {
  const year = selectedBwaYear(period);
  const siteIds = siteId ? [siteId] : Array.from(new Set(importedRows.map((row) => row.siteId)));
  return bwaMetricDefinitions.map((definition) => {
    const sourceRows = importedRows.filter((row) => row.metricKey === definition.key && (!siteId || row.siteId === siteId));
    const isPercent = definitionFlag(definition, "percent");
    const isEmphasis = definitionFlag(definition, "emphasis");
    const quoteActual = isPercent
      ? calculateImportedQuote(importedRows, siteIds, definition.key, year ?? undefined)
      : 0;
    const actual = sourceRows.reduce((sum, row) => {
      if (definition.key.startsWith("section_")) return 0;
      if (year) return sum + (row.valuesByYear[year] ?? 0);
      return sum + (isPercent ? 0 : row.contractValue);
    }, 0);
    return {
      label: definition.label,
      actual: isPercent ? quoteActual : actual,
      indent: !isEmphasis && !definition.key.startsWith("section_"),
      emphasis: isEmphasis,
      percent: isPercent,
      kind: definitionKind(definition)
    };
  });
}

function calculateImportedQuote(importedRows: ImportedBwaRow[], siteIds: string[], key: string, year?: string) {
  const value = (metricKey: string) =>
    importedRows
      .filter((row) => siteIds.includes(row.siteId) && row.metricKey === metricKey)
      .reduce((sum, row) => sum + (year ? row.valuesByYear[year] ?? 0 : row.contractValue), 0);
  const performance = value("summe_umsatz");
  if (key === "gesamtleistungsquote") return performance ? 100 : 0;
  if (key === "praxisleistungsquote") return ratio(value("gesamtleistung_abzueglich_fremdlabor_material"), performance);
  if (key === "deckungsbeitragsquote") return ratio(value("deckungsbeitrag"), performance);
  if (key === "ebitda_marge") return ratio(value("ebitda"), performance);
  if (key === "ergebnisquote") return ratio(value("vorlaeufiges_ergebnis"), performance);
  if (key === "cashflow_quote") return ratio(value("cashflow_gesamt"), performance);
  return 0;
}

function buildBwaRows(period: string, siteId?: string) {
  const factor = period === "Geschäftsjahr 2024" ? 0.28 : period === "Geschäftsjahr 2025" ? 0.72 : period === "Gesamte Periode" ? 1 : 0.86;
  const sites = siteId ? standorte.filter((site) => site.id === siteId) : standorte;
  const base = (key: keyof (typeof standorte)[number]) =>
    Math.round(sites.reduce((sum, site) => sum + Number(site[key] ?? 0), 0) * factor);
  const weightedQuote = (key: "materialquote" | "fremdlaborquote" | "sonstigeKostenquote") => {
    const performance = base("gesamtleistung");
    if (!performance) return 0;
    return sites.reduce((sum, site) => sum + site.gesamtleistung * site[key], 0) / sites.reduce((sum, site) => sum + site.gesamtleistung, 0);
  };

  const gesamtleistung = base("gesamtleistung");
  const pvs = base("pvsUmsatz");
  const eigenlabor = base("eigenlabor");
  const material = Math.round(gesamtleistung * (weightedQuote("materialquote") / 100));
  const fremdlabor = Math.round(gesamtleistung * (weightedQuote("fremdlaborquote") / 100));
  const personal = Math.round(gesamtleistung * 0.278);
  const weitereKosten = Math.round(gesamtleistung * (weightedQuote("sonstigeKostenquote") / 100));
  const ebitda = base("ebitda");
  const cashflow = base("cashflow");
  const praxiseingaenge = Math.round(pvs * 0.96);
  const sonstigeEingaenge = Math.round(gesamtleistung * 0.018);
  const praxiskosten = -Math.round(material + fremdlabor + personal + weitereKosten);
  const umbuchen = -Math.round(gesamtleistung * 0.025);

  const row = (label: string, actual: number, options?: { indent?: boolean; emphasis?: boolean; percent?: boolean; kind?: "cashflow" }) => {
    return {
      label,
      actual,
      ...options
    };
  };

  return [
    row("1. Umsatz", 0, { emphasis: true }),
    row("KZV-Umsatz", Math.round(pvs * 0.47), { indent: true }),
    row("Privatumsatz", Math.round(pvs * 0.31), { indent: true }),
    row("Bestandsveränderung", Math.round(gesamtleistung * 0.05), { indent: true }),
    row("Material- und Laborumsätze", eigenlabor, { indent: true }),
    row("Sonstige betriebliche Erlöse", Math.round(gesamtleistung * 0.01), { indent: true }),
    row("AAG / Erstattungen", Math.round(gesamtleistung * 0.003), { indent: true }),
    row("Summe Umsatz", gesamtleistung, { emphasis: true }),
    row("Gesamtleistungsquote", 100, { percent: true, emphasis: true }),
    row("2. Variable Kosten / Praxisleistung", 0, { emphasis: true }),
    row("Fremdlabor gesamt", -fremdlabor, { indent: true }),
    row("Materialkosten gesamt", -material, { indent: true }),
    row("Gesamtleistung abzüglich Fremdlabor/Material", gesamtleistung - material - fremdlabor, { emphasis: true }),
    row("Praxisleistungsquote", gesamtleistung ? ((gesamtleistung - material - fremdlabor) / gesamtleistung) * 100 : 0, { percent: true, emphasis: true }),
    row("3. Operative Kosten / Deckungsbeitrag", 0, { emphasis: true }),
    row("Personalkosten gesamt", -personal, { indent: true }),
    row("Reparatur und Instandhaltung", -Math.round(gesamtleistung * 0.018), { indent: true }),
    row("Praxisleistung abzüglich operative Kosten", gesamtleistung - material - fremdlabor - personal - Math.round(gesamtleistung * 0.018), { emphasis: true }),
    row("Deckungsbeitragsquote", gesamtleistung ? ((gesamtleistung - material - fremdlabor - personal - Math.round(gesamtleistung * 0.018)) / gesamtleistung) * 100 : 0, { percent: true, emphasis: true }),
    row("4. Sachkosten / EBITDA", 0, { emphasis: true }),
    row("Miete / Nebenkosten", -Math.round(gesamtleistung * 0.04), { indent: true }),
    row("Reise / Fortbildung / Seminare", -Math.round(gesamtleistung * 0.006), { indent: true }),
    row("Kfz / Praxiseinrichtung", -Math.round(gesamtleistung * 0.005), { indent: true }),
    row("Versicherungen/Beiträge", -Math.round(gesamtleistung * 0.009), { indent: true }),
    row("KZV Verwaltungskosten", -Math.round(gesamtleistung * 0.004), { indent: true }),
    row("BFS Factoring", -Math.round(gesamtleistung * 0.012), { indent: true }),
    row("EC-Terminal", -Math.round(gesamtleistung * 0.001), { indent: true }),
    row("Nicht abziehbare Vorsteuer", -Math.round(gesamtleistung * 0.012), { indent: true }),
    row("Sonstige Kosten", -Math.max(0, weitereKosten - Math.round(gesamtleistung * 0.089)), { indent: true }),
    row("Summe sonstige Kosten", -weitereKosten, { emphasis: true }),
    row("EBITDA", ebitda, { emphasis: true }),
    row("EBITDA-Marge", gesamtleistung ? (ebitda / gesamtleistung) * 100 : 0, { percent: true }),
    row("EBITDA Vorjahr Ist", Math.round(ebitda * 0.72), { indent: true }),
    row("Soll-EBITDA gemäß Kaufvertrag", Math.round(ebitda * 0.84), { indent: true }),
    row("Soll-EBITDA gemäß Übernahme", Math.round(ebitda * 0.78), { indent: true }),
    row("Abw. Ziel-EBITDA Kaufvertrag", Math.round(ebitda * 0.16), { indent: true }),
    row("Abw. Ziel-EBITDA Übernahme", Math.round(ebitda * 0.22), { indent: true }),
    row("Operative Praxiskosten bis EBITDA", praxiskosten, { emphasis: true }),
    row("5. Unter EBITDA / Vorläufiges Ergebnis", 0, { emphasis: true }),
    row("Abschreibungen", -Math.round(gesamtleistung * 0.17), { indent: true }),
    row("Zinsen & neutraler Aufwand", -Math.round(gesamtleistung * 0.015), { indent: true }),
    row("Zinsertrag Abzinsung Rückstellungen", Math.round(gesamtleistung * 0.006), { indent: true }),
    row("Steuern vom Einkommen und Ertrag", -Math.round(Math.max(0, ebitda) * 0.18), { indent: true }),
    row("Vorläufiges Ergebnis", ebitda - Math.round(gesamtleistung * 0.17) - Math.round(gesamtleistung * 0.015) + Math.round(gesamtleistung * 0.006) - Math.round(Math.max(0, ebitda) * 0.18), { emphasis: true }),
    row("Ergebnisquote", gesamtleistung ? ((ebitda - Math.round(gesamtleistung * 0.17) - Math.round(gesamtleistung * 0.015) + Math.round(gesamtleistung * 0.006) - Math.round(Math.max(0, ebitda) * 0.18)) / gesamtleistung) * 100 : 0, { percent: true }),
    row("6. Cashflow-Adjustments", 0, { emphasis: true, kind: "cashflow" }),
    row("+ Abschreibungen", Math.round(gesamtleistung * 0.17), { kind: "cashflow", indent: true }),
    row("Investitionsausgaben", -Math.round(gesamtleistung * 0.035), { kind: "cashflow", indent: true }),
    row("Tilgung", -Math.round(sites.reduce((sum, site) => sum + site.darlehen.tilgung, 0) * factor), { kind: "cashflow", indent: true }),
    row("Umbuchung ZMVZ", umbuchen, { kind: "cashflow", indent: true }),
    row("Sonstige Rückstellungen / Bestandsminderungen", Math.round(gesamtleistung * 0.008), { kind: "cashflow", indent: true }),
    row("CashFlow Gesamt", cashflow, { emphasis: true, kind: "cashflow" }),
    row("CashFlow-Quote", gesamtleistung ? (cashflow / gesamtleistung) * 100 : 0, { percent: true, kind: "cashflow" })
  ];
}

const bwaMonths = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function SiteMonthlyBwa({ site, importedData }: { site: DashboardSite; importedData?: ImportedDashboardData | null }) {
  const [year, setYear] = useState("2026");
  const rows = importedData?.bwaRows?.length
    ? buildImportedSiteMonthlyBwa(importedData.bwaRows, site.id, Number(year))
    : buildSiteMonthlyBwa(site, Number(year));
  const activeMonthCount = rows[0].months.filter((value) => value !== null).length || 1;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Monatliche BWA bis Cashflow {site.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jan bis Dez, Gesamt, Durchschnitt und gesamte Vertragsperiode seit {site.start}.
          </p>
        </div>
        <Select value={year} onChange={(event) => setYear(event.target.value)}>
          <option>2024</option>
          <option>2025</option>
          <option>2026</option>
        </Select>
      </div>
      <div className="max-h-[72vh] overflow-auto">
        <table className="min-w-[1320px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-72 border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                BWA-Position
              </th>
              {bwaMonths.map((month) => (
                <th key={month} className="sticky top-0 z-20 w-24 border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                  {month}
                </th>
              ))}
              <th className="sticky top-0 z-20 w-28 border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                Gesamt
              </th>
              <th className="sticky top-0 z-20 w-32 border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                Durchschnitt
              </th>
              <th className="sticky top-0 z-20 w-40 border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                Vertragsperiode
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totalValue = row.months.reduce<number>((sum, value) => sum + (value ?? 0), 0);
              const average = totalValue / activeMonthCount;
              return (
                <tr key={row.label}>
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-b border-r border-border bg-white p-2 font-semibold",
                      row.indent && "pl-6 font-medium text-muted-foreground",
                      row.section && "table-section font-bold text-foreground",
                      row.emphasis && "table-total text-foreground",
                      row.kind === "cashflow" && "table-cashflow"
                    )}
                  >
                    {row.label}
                  </td>
                  {row.months.map((value, index) => (
                    <td
                      key={`${row.label}-${bwaMonths[index]}`}
                      className={cn(
                        "border-b border-r border-border bg-white p-2 text-right tabular-nums",
                        row.section && "table-section font-bold text-foreground",
                        row.emphasis && "table-total font-bold text-foreground",
                        row.kind === "cashflow" && "table-cashflow",
                        Number(value) < 0 && "text-red-700"
                      )}
                    >
                      {row.section ? "" : formatBwaCell(value, row.percent)}
                    </td>
                  ))}
                  <td className={cn("border-b border-r border-border bg-slate-50 p-2 text-right font-bold tabular-nums", totalValue < 0 && "text-red-700")}>
                    {row.section ? "" : formatBwaCell(totalValue, row.percent)}
                  </td>
                  <td className="border-b border-r border-border bg-slate-50 p-2 text-right text-muted-foreground tabular-nums">
                    {row.section ? "" : formatBwaCell(average, row.percent)}
                  </td>
                  <td className={cn("border-b border-r border-border bg-slate-50 p-2 text-right font-bold tabular-nums", row.contract < 0 && "text-red-700")}>
                    {row.section ? "" : formatBwaCell(row.contract, row.percent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-slate-50 p-4 text-sm text-muted-foreground">
        Mobile Ansicht: horizontal wischen; die BWA-Position bleibt links fixiert. Die Vertragsperiode bleibt unabhängig vom Jahresfilter immer seit Standortstart.
      </div>
    </Card>
  );
}

function buildSiteMonthlyBwa(site: (typeof standorte)[number], year: number) {
  const monthWeights = [0.076, 0.081, 0.087, 0.079, 0.086, 0.092, 0.083, 0.078, 0.086, 0.089, 0.084, 0.079];
  const startParts = site.start.split(".");
  const startMonth = Number(startParts[1]);
  const startYear = Number(startParts[2]);
  const active = bwaMonths.map((_, index) => year > startYear || (year === startYear && index + 1 >= startMonth));
  const activeWeight = active.reduce((sum, isActive, index) => sum + (isActive ? monthWeights[index] : 0), 0) || 1;
  const yearFactor = year === 2024 ? 0.28 : year === 2025 ? 0.72 : 0.86;
  const monthly = (annualValue: number) =>
    bwaMonths.map((_, index) => (active[index] ? Math.round(annualValue * yearFactor * (monthWeights[index] / activeWeight)) : null));
  const contract = (value: number) => value;
  const row = (
    label: string,
    annualValue: number,
    options?: { indent?: boolean; emphasis?: boolean; section?: boolean; percent?: boolean; kind?: "cashflow"; contractValue?: number }
  ) => ({
    label,
    months: options?.section ? bwaMonths.map(() => null) : monthly(annualValue),
    contract: options?.contractValue ?? contract(annualValue),
    ...options
  });

  const material = site.gesamtleistung * (site.materialquote / 100);
  const fremdlabor = site.gesamtleistung * (site.fremdlaborquote / 100);
  const personal = site.gesamtleistung * 0.278;
  const weitere = site.gesamtleistung * (site.sonstigeKostenquote / 100);
  const praxiskosten = -(material + fremdlabor + personal + weitere);

  return [
    row("1. Umsatz", 0, { section: true }),
    row("KZV-Umsatz", site.pvsUmsatz * 0.47, { indent: true }),
    row("Privatumsatz", site.pvsUmsatz * 0.31, { indent: true }),
    row("Bestandsveränderung", site.gesamtleistung * 0.04, { indent: true }),
    row("Material- und Laborumsätze", site.eigenlabor, { indent: true }),
    row("Sonstige betriebliche Erlöse", site.gesamtleistung * 0.01, { indent: true }),
    row("Gesamtleistung", site.gesamtleistung, { emphasis: true }),
    row("Gesamtleistungsquote", 100, { percent: true, emphasis: true, contractValue: 100 }),
    row("2. Variable Kosten / Praxisleistung", 0, { section: true }),
    row("Fremdlabor gesamt", -fremdlabor, { indent: true }),
    row("Materialkosten gesamt", -material, { indent: true }),
    row("Gesamtleistung abzüglich Fremdlabor/Material", site.gesamtleistung - fremdlabor - material, { emphasis: true }),
    row("Praxisleistungsquote", site.gesamtleistung ? ((site.gesamtleistung - fremdlabor - material) / site.gesamtleistung) * 100 : 0, { percent: true, emphasis: true }),
    row("3. Operative Kosten / Deckungsbeitrag", 0, { section: true }),
    row("Personalkosten aggregiert", -personal, { indent: true }),
    row("Reparatur und Instandhaltung", -site.gesamtleistung * 0.018, { indent: true }),
    row("Praxisleistung abzüglich operative Kosten", site.gesamtleistung - fremdlabor - material - personal - site.gesamtleistung * 0.018, { emphasis: true }),
    row("4. Sachkosten / EBITDA", 0, { section: true }),
    row("Miete / Nebenkosten", -site.gesamtleistung * 0.04, { indent: true }),
    row("Reise / Fortbildung / Seminare", -site.gesamtleistung * 0.006, { indent: true }),
    row("Kfz / Praxiseinrichtung", -site.gesamtleistung * 0.005, { indent: true }),
    row("Versicherungen / Beiträge", -site.gesamtleistung * 0.009, { indent: true }),
    row("KZV Verwaltungskosten", -site.gesamtleistung * 0.004, { indent: true }),
    row("BFS Factoring", -site.gesamtleistung * 0.012, { indent: true }),
    row("EC-Terminal", -site.gesamtleistung * 0.001, { indent: true }),
    row("Nicht abziehbare Vorsteuer", -site.gesamtleistung * 0.012, { indent: true }),
    row("Sonstige Kosten", -Math.max(0, weitere - site.gesamtleistung * 0.089), { indent: true }),
    row("Sonstige Kosten gesamt", -weitere, { emphasis: true }),
    row("EBITDA", site.ebitda, { emphasis: true }),
    row("EBITDA-Marge", site.ebitdaMarge, { percent: true, emphasis: true, contractValue: site.ebitdaMarge }),
    row("EBITDA Vorjahr Ist", site.ebitda * 0.72, { indent: true }),
    row("Soll-EBITDA gemäß Kaufvertrag", site.ebitda * 0.84, { indent: true }),
    row("Soll-EBITDA gemäß Übernahme", site.ebitda * 0.78, { indent: true }),
    row("Abw. Ziel-EBITDA Kaufvertrag", site.ebitda * 0.16, { indent: true }),
    row("Abw. Ziel-EBITDA Übernahme", site.ebitda * 0.22, { indent: true }),
    row("Operative Praxiskosten bis EBITDA", praxiskosten, { emphasis: true }),
    row("5. Unter EBITDA / Vorläufiges Ergebnis", 0, { section: true }),
    row("Abschreibungen", -site.gesamtleistung * 0.17, { indent: true }),
    row("Zinsen & neutraler Aufwand", -site.gesamtleistung * 0.015, { indent: true }),
    row("Zinsertrag Abzinsung Rückstellungen", site.gesamtleistung * 0.006, { indent: true }),
    row("Steuern vom Einkommen und Ertrag", -Math.max(0, site.ebitda) * 0.18, { indent: true }),
    row("Vorläufiges Ergebnis", site.ebitda - site.gesamtleistung * 0.17 - site.gesamtleistung * 0.015 + site.gesamtleistung * 0.006 - Math.max(0, site.ebitda) * 0.18, { emphasis: true }),
    row("Ergebnisquote", site.gesamtleistung ? ((site.ebitda - site.gesamtleistung * 0.17 - site.gesamtleistung * 0.015 + site.gesamtleistung * 0.006 - Math.max(0, site.ebitda) * 0.18) / site.gesamtleistung) * 100 : 0, { percent: true }),
    row("6. Cashflow-Adjustments", 0, { section: true, kind: "cashflow" }),
    row("+ Abschreibungen", site.gesamtleistung * 0.17, { indent: true, kind: "cashflow" }),
    row("Investitionsausgaben", -site.gesamtleistung * 0.035, { indent: true, kind: "cashflow" }),
    row("Tilgung", -site.darlehen.tilgung, { indent: true, kind: "cashflow" }),
    row("Umbuchung ZMVZ", -site.gesamtleistung * 0.025, { indent: true, kind: "cashflow" }),
    row("Sonstige Rückstellungen / Bestandsminderungen", site.gesamtleistung * 0.008, { indent: true, kind: "cashflow" }),
    row("CashFlow Gesamt", site.cashflow, { emphasis: true, kind: "cashflow" }),
    row("CashFlow-Quote", site.gesamtleistung ? (site.cashflow / site.gesamtleistung) * 100 : 0, { percent: true, kind: "cashflow" })
  ];
}

function buildImportedSiteMonthlyBwa(importedRows: ImportedBwaRow[], siteId: string, year: number) {
  return bwaMetricDefinitions.map((definition) => {
    const sourceRows = importedRows.filter((row) => row.siteId === siteId && row.metricKey === definition.key);
    const isPercent = definitionFlag(definition, "percent");
    const isEmphasis = definitionFlag(definition, "emphasis");
    const months = Array.from({ length: 12 }, (_, index) => {
      if (definition.key.startsWith("section_")) return null;
      if (isPercent) return calculateImportedMonthlyQuote(importedRows, siteId, definition.key, year, index + 1);
      return sourceRows.reduce((sum, row) => sum + (row.valuesByMonth[`${year}-${index + 1}`] ?? 0), 0);
    });
    const contractValue = isPercent
      ? calculateImportedQuote(importedRows, [siteId], definition.key)
      : sourceRows.reduce((sum, row) => sum + row.contractValue, 0);
    return {
      label: definition.label,
      months,
      contract: contractValue,
      indent: !isEmphasis && !definition.key.startsWith("section_"),
      emphasis: isEmphasis,
      section: definition.key.startsWith("section_"),
      percent: isPercent,
      kind: definitionKind(definition)
    };
  });
}

function calculateImportedMonthlyQuote(importedRows: ImportedBwaRow[], siteId: string, key: string, year: number, month: number) {
  const value = (metricKey: string) =>
    importedRows
      .filter((row) => row.siteId === siteId && row.metricKey === metricKey)
      .reduce((sum, row) => sum + (row.valuesByMonth[`${year}-${month}`] ?? 0), 0);
  const performance = value("summe_umsatz");
  if (key === "gesamtleistungsquote") return performance ? 100 : 0;
  if (key === "praxisleistungsquote") return ratio(value("gesamtleistung_abzueglich_fremdlabor_material"), performance);
  if (key === "deckungsbeitragsquote") return ratio(value("deckungsbeitrag"), performance);
  if (key === "ebitda_marge") return ratio(value("ebitda"), performance);
  if (key === "ergebnisquote") return ratio(value("vorlaeufiges_ergebnis"), performance);
  if (key === "cashflow_quote") return ratio(value("cashflow_gesamt"), performance);
  return 0;
}

function formatBwaCell(value: number | null, percent?: boolean) {
  if (value === null) return "";
  return percent ? pct(value) : eur(value);
}

function StandortDetail({ site, importedData }: { site: DashboardSite; importedData?: ImportedDashboardData | null }) {
  return (
    <section className="space-y-5">
      <PageTitle title={site.name} text={`Standortdetail ab Praxisstart ${site.start}.`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Gesamtleistung" value={site.gesamtleistung} delta={`${site.vorjahrAbweichung > 0 ? "+" : ""}${pct(site.vorjahrAbweichung)} ggü. Vorjahr`} icon={TrendingUp} status={site.status} />
        <KpiCard label="PVS-Umsatz" value={site.pvsUmsatz} delta="Plausibel zur BWA" icon={BadgeEuro} status={site.status} />
        <KpiCard label="EBITDA" value={site.ebitda} delta={`${pct(site.ebitdaMarge)} Marge`} icon={Banknote} status={site.status} />
        <KpiCard label="Cashflow" value={site.cashflow} delta="Netto nach Annuitäten" icon={Wallet} status={site.status} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <CostRatios site={site} />
        <ChartCard title="Entwicklung über Zeit" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Area dataKey="leistung" stroke="#0f766e" fill="#ccfbf1" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <BwaStatement title={`BWA bis Cashflow ${site.name}`} siteId={site.id} importedData={importedData} />
      <SiteMonthlyBwa site={site} importedData={importedData} />
    </section>
  );
}

function KennzahlenEntwicklung() {
  const targetBySite: Record<string, number> = {
    kirchberg: 150000,
    essen: 75000,
    kehl: 70000,
    ulmet: 170000,
    huettenberg: 63333,
    kassel: 0
  };
  const activeSites = standorte.filter((site) => site.gesamtleistung > 0);
  const totalPerformance = activeSites.reduce((sum, site) => sum + site.gesamtleistung, 0);
  const totalEbitda = activeSites.reduce((sum, site) => sum + site.ebitda, 0);
  const totalCashflow = activeSites.reduce((sum, site) => sum + site.cashflow, 0);
  const totalTarget = activeSites.reduce((sum, site) => sum + (targetBySite[site.id] ?? 0), 0);
  const averageTargetAchievement = totalTarget ? (totalEbitda / totalTarget) * 100 : 0;
  const weakest = activeSites
    .map((site) => ({ site, achievement: (site.ebitda / (targetBySite[site.id] || 1)) * 100 }))
    .sort((a, b) => a.achievement - b.achievement)[0];

  return (
    <section className="space-y-5">
      <PageTitle
        title="Orisus Kennzahlen/Entwicklung"
        text="Standort-Performance, Zielerreichung und monatliche EBITDA-Entwicklung im Format der CFO-Auswertung."
      />

      <Card className="overflow-hidden">
        <div className="table-head p-3 text-lg font-bold text-white">Standort-Performance | BWA-Kennzahlen je Standort</div>
        <div className="border-b border-border bg-slate-50 p-3 text-sm italic text-muted-foreground">
          Auswertung: 2026 | Periodenende 30.06.2026 | Alle freigegebenen Standorte inkl. Ulmet | Quelle: Konzern_Konsolidierung_STD
        </div>
        <div className="grid gap-px table-grid-bg md:grid-cols-3 xl:grid-cols-6">
          <KennzahlTile label="Gesamtleistung | 2026 bis 06.2026" value={eur(totalPerformance, true)} />
          <KennzahlTile label="EBITDA | 2026 bis 06.2026" value={eur(totalEbitda, true)} />
          <KennzahlTile label="EBITDA-Marge | 2026 bis 06.2026" value={pct((totalEbitda / totalPerformance) * 100)} />
          <KennzahlTile label="Cashflow | 2026 bis 06.2026" value={eur(totalCashflow, true)} />
          <KennzahlTile label="Ø Zielerreichung | 2026 bis 06.2026" value={pct(averageTargetAchievement)} />
          <KennzahlTile label="Schwächster Standort | 2026 bis 06.2026" value={`${weakest.site.name} (${pct(weakest.achievement)})`} />
        </div>
      </Card>

      <KennzahlenStandortTable targetBySite={targetBySite} />
      <MonthlyEbitdaTable targetBySite={targetBySite} />
    </section>
  );
}

function KennzahlTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 text-center">
      <p className="text-xs font-bold uppercase text-foreground">{label}</p>
      <p className="mt-5 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function KennzahlenStandortTable({ targetBySite }: { targetBySite: Record<string, number> }) {
  const activeSites = standorte.filter((site) => site.gesamtleistung > 0);

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1720px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              {[
                "Standort",
                "Gruppenbeitritt",
                "Monate im Zeitraum",
                "Gesamtleistung",
                "EBITDA",
                "EBITDA-Marge",
                "Personalkostenquote",
                "Materialquote",
                "Fremdlaborquote",
                "Cashflow",
                "Ziel-EBITDA",
                "EBITDA-Abw.",
                "Zielerreichung",
                "Status / Ampel",
                "EBITDA Zeitraum",
                "EBITDA Filterzeitraum",
                "Run-Rate EBITDA p.a.",
                "Ø EBITDA p.a. seit Beitritt",
                "Ø EBITDA / Monat seit Beitritt",
                "Ø Ziel-EBITDA p.a."
              ].map((head) => (
                <th key={head} className="border-b border-r border-border table-head p-2 text-center font-bold text-white">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSites.map((site) => {
              const target = targetBySite[site.id] ?? 0;
              const deviation = site.ebitda - target;
              const achievement = target ? (site.ebitda / target) * 100 : 0;
              const monthsInPeriod = monthly.length;
              const monthsSinceJoin = site.id === "kirchberg" ? 12 : site.id === "essen" ? 6 : site.id === "kehl" ? 3 : site.id === "ulmet" ? 1 : site.id === "huettenberg" ? 6 : 0;
              const runRate = monthsInPeriod ? (site.ebitda / monthsInPeriod) * 12 : 0;
              return (
                <tr key={site.id}>
                  <TableCell strong>{site.name}</TableCell>
                  <TableCell>{site.start}</TableCell>
                  <TableCell>{monthsInPeriod}</TableCell>
                  <TableCell>{eur(site.gesamtleistung)}</TableCell>
                  <TableCell>{eur(site.ebitda)}</TableCell>
                  <TableCell>{pct(site.ebitdaMarge)}</TableCell>
                  <TableCell>{pct(27.8 + site.sonstigeKostenquote * 0.38)}</TableCell>
                  <TableCell>{pct(site.materialquote)}</TableCell>
                  <TableCell>{pct(site.fremdlaborquote)}</TableCell>
                  <TableCell>{eur(site.cashflow)}</TableCell>
                  <TableCell>{eur(target)}</TableCell>
                  <TableCell tone={deviation < 0 ? "red" : "green"}>{eur(deviation)}</TableCell>
                  <TableCell>{pct(achievement)}</TableCell>
                  <TableCell tone={achievement >= 100 ? "green" : "red"}>{achievement >= 100 ? "● Ziel erreicht" : "● Ziel nicht erreicht"}</TableCell>
                  <TableCell>{eur(site.ebitda)}</TableCell>
                  <TableCell>{eur(site.ebitda)}</TableCell>
                  <TableCell>{eur(runRate)}</TableCell>
                  <TableCell>{eur(runRate)}</TableCell>
                  <TableCell>{eur(monthsSinceJoin ? site.ebitda / monthsSinceJoin : 0)}</TableCell>
                  <TableCell>{eur((site.darlehen.zielEbitda || target) * 2)}</TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MonthlyEbitdaTable({ targetBySite }: { targetBySite: Record<string, number> }) {
  const activeSites = standorte.filter((site) => site.gesamtleistung > 0);
  const rows = monthly.map((month, monthIndex) => {
    const siteValues = Object.fromEntries(
      activeSites.map((site, siteIndex) => {
        const weight = [0.18, 0.15, 0.24, 0.17, 0.14, 0.12][monthIndex] ?? 0.12;
        const modifier = 0.86 + siteIndex * 0.05;
        return [site.id, Math.round(site.ebitda * weight * modifier)];
      })
    ) as Record<string, number>;
    const totalValue = Object.values(siteValues).reduce((sum, value) => sum + value, 0);
    const targetTakeover = Math.round(Object.values(targetBySite).reduce((sum, value) => sum + value, 0) * ((monthIndex + 1) / monthly.length));
    const targetBank = Math.round(targetTakeover * 0.885);
    return {
      month: `${month.month} 26`,
      siteValues,
      totalValue,
      cumulative: 0,
      targetTakeover,
      targetBank
    };
  });

  let cumulative = 0;
  rows.forEach((row) => {
    cumulative += row.totalValue;
    row.cumulative = cumulative;
  });

  const ytdBySite = activeSites.map((site) => rows.reduce((sum, row) => sum + row.siteValues[site.id], 0));
  const ytdTotal = rows.reduce((sum, row) => sum + row.totalValue, 0);
  const ytdTarget = rows.at(-1)?.targetTakeover ?? 0;
  const ytdBankTarget = rows.at(-1)?.targetBank ?? 0;

  return (
    <Card className="overflow-hidden">
      <div className="table-head p-3 font-bold text-white">MONATLICHE EBITDA-ÜBERSICHT JE STANDORT</div>
      <div className="border-b border-border bg-slate-50 p-2 text-sm italic text-muted-foreground">
        Auswertung: 2026 | Ist-EBITDA je Monat und Standort | Zielabweichung kumuliert gegen Übernahme und Bank/KV
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1280px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="border-b border-r border-border table-head p-2 text-white">Monat</th>
              {activeSites.map((site) => (
                <th key={site.id} className="border-b border-r border-border table-head p-2 text-white">{site.name}</th>
              ))}
              <th className="border-b border-r border-border table-head p-2 text-white">EBITDA gesamt</th>
              <th className="border-b border-r border-border table-head p-2 text-white">EBITDA kum.</th>
              <th className="border-b border-r border-border table-head p-2 text-white">Ziel Übernahme kum.</th>
              <th className="border-b border-r border-border table-head p-2 text-white">Abw. ÜN kum.</th>
              <th className="border-b border-r border-border table-head p-2 text-white">Ziel Bank/KV kum.</th>
              <th className="border-b border-r border-border table-head p-2 text-white">Abw. Bank/KV kum.</th>
              <th className="border-b border-r border-border table-head p-2 text-white">Zielerreichung ÜN</th>
              <th className="border-b border-r border-border table-head p-2 text-white">Zielerreichung Bank/KV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <TableCell strong>{row.month}</TableCell>
                {activeSites.map((site) => (
                  <TableCell key={site.id}>{eur(row.siteValues[site.id])}</TableCell>
                ))}
                <TableCell strong>{eur(row.totalValue)}</TableCell>
                <TableCell strong>{eur(row.cumulative)}</TableCell>
                <TableCell>{eur(row.targetTakeover)}</TableCell>
                <TableCell tone={row.cumulative - row.targetTakeover < 0 ? "red" : "green"}>{eur(row.cumulative - row.targetTakeover)}</TableCell>
                <TableCell>{eur(row.targetBank)}</TableCell>
                <TableCell tone={row.cumulative - row.targetBank < 0 ? "red" : "green"}>{eur(row.cumulative - row.targetBank)}</TableCell>
                <TableCell>{pct((row.cumulative / row.targetTakeover) * 100)}</TableCell>
                <TableCell>{pct((row.cumulative / row.targetBank) * 100)}</TableCell>
              </tr>
            ))}
            <tr>
              <TableCell strong>YTD / Gesamt</TableCell>
              {ytdBySite.map((value, index) => (
                <TableCell key={activeSites[index].id} strong>{eur(value)}</TableCell>
              ))}
              <TableCell strong>{eur(ytdTotal)}</TableCell>
              <TableCell strong>{eur(ytdTotal)}</TableCell>
              <TableCell strong>{eur(ytdTarget)}</TableCell>
              <TableCell strong tone={ytdTotal - ytdTarget < 0 ? "red" : "green"}>{eur(ytdTotal - ytdTarget)}</TableCell>
              <TableCell strong>{eur(ytdBankTarget)}</TableCell>
              <TableCell strong tone={ytdTotal - ytdBankTarget < 0 ? "red" : "green"}>{eur(ytdTotal - ytdBankTarget)}</TableCell>
              <TableCell strong>{pct((ytdTotal / ytdTarget) * 100)}</TableCell>
              <TableCell strong>{pct((ytdTotal / ytdBankTarget) * 100)}</TableCell>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TableCell({
  children,
  strong,
  tone
}: {
  children: React.ReactNode;
  strong?: boolean;
  tone?: "green" | "red";
}) {
  return (
    <td
      className={cn(
        "border-b border-r border-border bg-white p-2 text-right tabular-nums",
        strong && "font-bold",
        tone === "green" && "text-emerald-700",
        tone === "red" && "text-red-700"
      )}
    >
      {children}
    </td>
  );
}

function OrisusPerformance() {
  const metrics = cfoMetrics();
  return (
    <section className="space-y-5">
      <PageTitle
        title="Orisus Performance"
        text="Operative Performance der Gruppe: Umsatzentwicklung, Standortleistung, PVS, Forderungen und Cashflow."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Gesamtleistung" value={eur(metrics.gesamtleistung)} />
        <Mini label="PVS-Umsatz" value={eur(total("pvsUmsatz"))} />
        <Mini label="EBITDA-Marge" value={pct(metrics.ebitdaMarge)} />
        <Mini label="Cashflow" value={eur(metrics.cashflow)} />
        <Mini label="Offene Forderungen" value={eur(metrics.forderungen)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Operative Entwicklung" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" name="EBITDA" stroke="#0369a1" strokeWidth={3} />
              <Line dataKey="cashflow" name="Cashflow" stroke="#64748b" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Forderungen nach Standort" icon={FileBarChart}>
          <ReceivablesChart />
        </ChartCard>
      </div>
      <OperationalPerformanceTable />
      <PerformanceRevenueBlock
        title="Behandlerumsatz je Standort"
        subtitle="Auswahl: YTD | Jahr 2026 | bis Mai 2026 | Vorjahr = gleicher Zeitraum / gleicher Monat / QTD"
        mode="honorar"
      />
      <PerformanceMonthlyTable
        title="Behandlerumsatz inkl. Eigenlabor | Monatsübersicht aktuelles Jahr"
        mode="honorar"
      />
      <PerformanceRevenueBlock
        title="PVS-Gesamtumsatz je Standort"
        subtitle="Auswahl: YTD | Jahr 2026 | bis Mai 2026 | Vorjahr = gleicher Zeitraum / gleicher Monat / QTD"
        mode="pvs"
      />
      <PerformanceMonthlyTable
        title="PVS-Gesamtumsatz inkl. FL + MAT | Monatsübersicht aktuelles Jahr"
        mode="pvs"
      />
      <BankMovementsTable />
    </section>
  );
}

function OperationalPerformanceTable() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-bold">Operative Standort-Performance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {["Standort", "Gesamtleistung", "PVS", "EBITDA", "Marge", "Cashflow", "Forderungen", "Kostenquote", "Status"].map((head) => (
                <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standorte.filter((site) => site.gesamtleistung > 0).map((site) => {
              const costs = site.materialquote + site.fremdlaborquote + site.sonstigeKostenquote;
              return (
                <tr key={site.id}>
                  <td className="border-b border-r border-border p-3 font-bold">{site.name}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.gesamtleistung)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.pvsUmsatz)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.ebitda)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{pct(site.ebitdaMarge)}</td>
                  <td className={cn("border-b border-r border-border p-3 text-right", site.cashflow < 0 && "text-red-700")}>{eur(site.cashflow)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.forderungen)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{pct(costs)}</td>
                  <td className="border-b border-r border-border p-3"><StatusDot status={site.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PerformanceRevenueBlock({
  title,
  subtitle,
  mode
}: {
  title: string;
  subtitle: string;
  mode: "honorar" | "pvs";
}) {
  const activeSites = standorte.filter((site) => site.gesamtleistung > 0);
  const current = activeSites.reduce((sum, site) => sum + performanceBase(site, mode), 0);
  const previous = Math.round(current * (mode === "honorar" ? 0.48 : 0.46));
  const qtd = Math.round(current * (mode === "honorar" ? 0.39 : 0.4));
  const qtdPrevious = Math.round(qtd * (mode === "honorar" ? 0.64 : 0.61));
  const sinceTakeover = Math.round(current * (mode === "honorar" ? 2.83 : 2.79));
  const lastMonth = Math.round(current * 0.185);

  return (
    <Card className="overflow-hidden">
      <div className="table-head p-3 font-bold text-white">{title}</div>
      <div className="border-b border-border bg-slate-50 p-2 text-sm italic text-muted-foreground">{subtitle}</div>
      <div className="grid gap-px table-grid-bg md:grid-cols-5">
        <KennzahlTile label={`${mode === "honorar" ? "Behandlerumsatz" : "PVS Umsatz"} Zeitraum`} value={eur(current)} />
        <KennzahlTile label="YoY Zeitraum" value={pct(((current - previous) / previous) * 100)} />
        <KennzahlTile label="QTD YoY" value={pct(((qtd - qtdPrevious) / qtdPrevious) * 100)} />
        <KennzahlTile label="Umsatz seit Übernahme" value={eur(sinceTakeover)} />
        <KennzahlTile label="Aktueller Gesamtkontostand" value={eur(total("kontostand"))} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              {[
                "Standort",
                "Praxisstart",
                "Akt. Zeitraum",
                "VJ Zeitraum",
                "Δ abs.",
                "Δ %",
                "QTD",
                "QTD VJ",
                "QTD Δ %",
                "Monat",
                "Monat VJ",
                "Monat Δ %",
                "Seit Übernahme",
                "Ø mtl. seit Übernahme"
              ].map((head) => (
                <th key={head} className="border-b border-r border-border table-head p-2 text-center font-bold text-white">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSites.map((site, index) => {
              const currentSite = performanceBase(site, mode);
              const prevSite = Math.round(currentSite * (0.72 - index * 0.06));
              const delta = currentSite - prevSite;
              const qtdSite = Math.round(currentSite * (0.36 + index * 0.02));
              const qtdPrev = Math.round(qtdSite * (0.8 - index * 0.04));
              const month = Math.round(currentSite * (0.17 + index * 0.01));
              const monthPrev = Math.round(month * (0.88 + index * 0.03));
              const takeover = Math.round(currentSite * (2.4 + index * 0.18));
              const monthsSince = site.id === "kirchberg" ? 18 : site.id === "essen" ? 12 : site.id === "kehl" ? 9 : site.id === "ulmet" ? 6 : site.id === "huettenberg" ? 6 : 1;
              return (
                <tr key={site.id}>
                  <TableCell strong>{site.name}</TableCell>
                  <TableCell>{site.start}</TableCell>
                  <TableCell>{eur(currentSite)}</TableCell>
                  <TableCell>{eur(prevSite)}</TableCell>
                  <TableCell tone={delta < 0 ? "red" : "green"}>{eur(delta)}</TableCell>
                  <TableCell tone={delta < 0 ? "red" : "green"}>{pct((delta / prevSite) * 100)}</TableCell>
                  <TableCell>{eur(qtdSite)}</TableCell>
                  <TableCell>{eur(qtdPrev)}</TableCell>
                  <TableCell tone={qtdSite - qtdPrev < 0 ? "red" : "green"}>{pct(((qtdSite - qtdPrev) / qtdPrev) * 100)}</TableCell>
                  <TableCell>{eur(month)}</TableCell>
                  <TableCell>{eur(monthPrev)}</TableCell>
                  <TableCell tone={month - monthPrev < 0 ? "red" : "green"}>{pct(((month - monthPrev) / monthPrev) * 100)}</TableCell>
                  <TableCell>{eur(takeover)}</TableCell>
                  <TableCell>{eur(takeover / monthsSince)}</TableCell>
                </tr>
              );
            })}
            <tr>
              <TableCell strong>Gesamt</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell strong>{eur(current)}</TableCell>
              <TableCell strong>{eur(previous)}</TableCell>
              <TableCell strong tone="green">{eur(current - previous)}</TableCell>
              <TableCell strong tone="green">{pct(((current - previous) / previous) * 100)}</TableCell>
              <TableCell strong>{eur(qtd)}</TableCell>
              <TableCell strong>{eur(qtdPrevious)}</TableCell>
              <TableCell strong tone="green">{pct(((qtd - qtdPrevious) / qtdPrevious) * 100)}</TableCell>
              <TableCell strong>{eur(lastMonth)}</TableCell>
              <TableCell strong>{eur(Math.round(lastMonth * 0.72))}</TableCell>
              <TableCell strong tone="green">{pct(38.8)}</TableCell>
              <TableCell strong>{eur(sinceTakeover)}</TableCell>
              <TableCell strong>{eur(sinceTakeover / 73)}</TableCell>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PerformanceMonthlyTable({ title, mode }: { title: string; mode: "honorar" | "pvs" }) {
  const activeSites = standorte.filter((site) => site.gesamtleistung > 0);
  const monthFactors = [0.192, 0.188, 0.228, 0.205, 0.186, 0, 0, 0, 0, 0, 0, 0];

  return (
    <Card className="overflow-hidden">
      <div className="table-head p-3 font-bold text-white">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="border-b border-r border-border table-head p-2 text-white">Standort</th>
              {bwaMonths.map((month) => (
                <th key={month} className="border-b border-r border-border table-head p-2 text-white">{month}</th>
              ))}
              <th className="border-b border-r border-border table-head p-2 text-white">Gesamt</th>
              <th className="border-b border-r border-border table-head p-2 text-white">Ø Monat</th>
            </tr>
          </thead>
          <tbody>
            <PerformanceMonthRow label="Gesamt" values={bwaMonths.map((_, index) => activeSites.reduce((sum, site) => sum + Math.round(performanceBase(site, mode) * monthFactors[index]), 0))} />
            {activeSites.map((site) => (
              <PerformanceMonthRow key={site.id} label={site.name} values={bwaMonths.map((_, index) => Math.round(performanceBase(site, mode) * monthFactors[index]))} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PerformanceMonthRow({ label, values }: { label: string; values: number[] }) {
  const totalValue = values.reduce((sum, value) => sum + value, 0);
  const activeMonths = values.filter((value) => value !== 0).length || 1;
  return (
    <tr>
      <TableCell strong={label === "Gesamt"}>{label}</TableCell>
      {values.map((value, index) => (
        <TableCell key={`${label}-${index}`}>{value ? eur(value) : ""}</TableCell>
      ))}
      <TableCell strong>{eur(totalValue)}</TableCell>
      <TableCell strong>{eur(totalValue / activeMonths)}</TableCell>
    </tr>
  );
}

function BankMovementsTable() {
  const rows = [
    { label: "Geldeingang Bank gesamt", values: [692723, 639715, 932514, 786139, 758133], contract: 10355654 },
    { label: "davon Praxisumsatz", values: [647483, 634414, 875494, 778864, 755615], contract: 10051134, indent: true },
    { label: "davon sonstiges", values: [45240, 5302, 57020, 7275, 2518], contract: 304520, indent: true },
    { label: "Geldausgang Bank inkl. Kredit", values: [-746265, -605887, -1048656, -845770, -650471], contract: -10163268 },
    { label: "davon Praxisausgaben", values: [-628743, -584887, -748587, -741998, -625971], contract: -8615161, indent: true },
    { label: "davon Tilgung + Zins", values: [-78522, 0, -280069, -85778, 0], contract: -1269060, indent: true },
    { label: "davon Umbuchungen an Orisus ZMVZ", values: [-39000, -21000, -20000, -18000, -24500], contract: -278500, indent: true },
    { label: "Cashflow gesamt im Monat", values: [-53542, 33828, -116142, -59631, 107662], contract: 192385 },
    { label: "Kontostand Monatsende", values: [1029641, 1063469, 947329, 887698, 995355], contract: 944338 }
  ];

  return (
    <Card className="overflow-hidden">
      <div className="table-head p-3 font-bold text-white">Bank / Geldbewegungen aus Input_Finanzen</div>
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="border-b border-r border-border table-subhead p-2 text-white">Position</th>
              {bwaMonths.map((month) => (
                <th key={month} className="border-b border-r border-border table-subhead p-2 text-white">{month}</th>
              ))}
              <th className="border-b border-r border-border table-subhead p-2 text-white">Gesamt</th>
              <th className="border-b border-r border-border table-subhead p-2 text-white">Ø Monat</th>
              <th className="border-b border-r border-border table-subhead p-2 text-white">Gesamte Vertragsperiode</th>
              <th className="border-b border-r border-border table-subhead p-2 text-white">Ø Vertragsperiode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fullValues = [...row.values, ...Array(7).fill(0)];
              const totalValue = row.values.reduce((sum, value) => sum + value, 0);
              return (
                <tr key={row.label}>
                  <TableCell strong={!row.indent}>{row.indent ? `  ${row.label}` : row.label}</TableCell>
                  {fullValues.map((value, index) => (
                    <TableCell key={`${row.label}-${index}`} tone={value < 0 ? "red" : undefined}>{value ? eur(value) : ""}</TableCell>
                  ))}
                  <TableCell strong tone={totalValue < 0 ? "red" : undefined}>{eur(totalValue)}</TableCell>
                  <TableCell strong tone={totalValue < 0 ? "red" : undefined}>{eur(totalValue / row.values.length)}</TableCell>
                  <TableCell strong tone={row.contract < 0 ? "red" : undefined}>{eur(row.contract)}</TableCell>
                  <TableCell strong tone={row.contract < 0 ? "red" : undefined}>{eur(row.contract / 114)}</TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function performanceBase(site: (typeof standorte)[number], mode: "honorar" | "pvs") {
  return mode === "honorar" ? site.honorar + site.eigenlabor : site.pvsUmsatz + site.eigenlabor + site.gesamtleistung * 0.06;
}

function Analysen() {
  return (
    <section className="space-y-5">
      <PageTitle title="Analysen" text="EBITDA, Gesamtleistung, Cashflow, Standortvergleich, Zeitvergleich und Vorjahresabweichungen." />
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="EBITDA-Entwicklung" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Area dataKey="ebitda" stroke="#0369a1" fill="#dbeafe" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Standortvergleich" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={standorte}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Bar dataKey="ebitda" fill="#0891b2" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AnalysisTile title="Zeitvergleich" value="+8,9 %" text="Leistung gegenüber Vorperiode." />
        <AnalysisTile title="Vorjahresabweichung" value="+2,4 %" text="Konzern kumuliert YTD." />
        <AnalysisTile title="Cashflow-Qualität" value="74 %" text="Praxiseingänge nach Annuitäten." />
      </div>
    </section>
  );
}

function AnalysisTile({ title, value, text }: { title: string; value: string; text: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}

function Bwa({ importedData }: { importedData?: ImportedDashboardData | null }) {
  return (
    <section className="space-y-5">
      <PageTitle title="BWA" text="Konsolidierte BWA bis zum Cashflow, dynamisch nach Jahren und gesamter Periode auswählbar." />
      <BwaStatement title="Konsolidierte BWA bis Cashflow" importedData={importedData} />
      <div className="grid gap-5 xl:grid-cols-2">
        <EbitdaBridge />
        <CashflowBridge />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <ChartCard title="Gesamtleistungsentwicklung" icon={FileBarChart}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" stroke="#0369a1" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <CostRatios />
      </div>
    </section>
  );
}

function EbitdaBridge() {
  const metrics = cfoMetrics();
  const personal = Math.round(metrics.gesamtleistung * 0.278);
  const material = Math.round(total("pvsUmsatz") * 0.099);
  const fremdlabor = Math.round(total("pvsUmsatz") * 0.156);
  const sonstige = Math.max(0, metrics.gesamtleistung - personal - material - fremdlabor - metrics.ebitda);
  const rows: BridgeRow[] = [
    { label: "Summe Umsatz", value: metrics.gesamtleistung, tone: "green" },
    { label: "Personal", value: -personal },
    { label: "Material", value: -material },
    { label: "Fremdlabor", value: -fremdlabor },
    { label: "Sonstige operative Kosten", value: -sonstige },
    { label: "EBITDA", value: metrics.ebitda, tone: "blue" }
  ];

  return <BridgeCard title="EBITDA-Brücke" rows={rows} />;
}

function CashflowBridge() {
  const metrics = cfoMetrics();
  const abschreibungen = Math.round(metrics.gesamtleistung * 0.17);
  const investitionen = -Math.round(metrics.gesamtleistung * 0.035);
  const umbuchen = -Math.round(metrics.gesamtleistung * 0.025);
  const sonstigeAdjustments = metrics.cashflow - metrics.ebitda - abschreibungen - investitionen + metrics.tilgung - umbuchen;
  const rows: BridgeRow[] = [
    { label: "EBITDA", value: metrics.ebitda, tone: "blue" },
    { label: "+ Abschreibungen", value: abschreibungen },
    { label: "Investitionsausgaben", value: investitionen },
    { label: "Tilgung", value: -metrics.tilgung },
    { label: "Umbuchung ZMVZ", value: umbuchen },
    { label: "Sonstige Adjustments", value: sonstigeAdjustments },
    { label: "CashFlow Gesamt", value: metrics.cashflow, tone: metrics.cashflow >= 0 ? "green" : "red" }
  ];

  return <BridgeCard title="Cashflow-Brücke" rows={rows} />;
}

type BridgeRow = { label: string; value: number; tone?: "green" | "blue" | "red" };

function BridgeCard({
  title,
  rows
}: {
  title: string;
  rows: BridgeRow[];
}) {
  const maxValue = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  return (
    <Card className="p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const width = Math.max(7, (Math.abs(row.value) / maxValue) * 100);
          return (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{row.label}</span>
                <span className={cn("font-bold", row.value < 0 && "text-red-700")}>{eur(row.value)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-2.5 rounded-full",
                    row.tone === "green" && "bg-emerald-500",
                    row.tone === "blue" && "bg-cyan-800",
                    row.tone === "red" && "bg-red-500",
                    !row.tone && (row.value < 0 ? "bg-red-400" : "bg-slate-400")
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Cashflow() {
  return (
    <section className="space-y-5">
      <PageTitle title="Cashflow" text="Praxiseingänge, Kosten, Annuitäten, Umbuchungen MVZ und Netto-Cashflow." />
      <div className="grid gap-5 xl:grid-cols-2">
        <CashflowBlock />
        <ChartCard title="Monatlicher Verlauf" icon={Wallet}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Area dataKey="cashflow" stroke="#0f766e" fill="#ccfbf1" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Ranking title="Standortvergleich Cashflow" metric="ebitda" />
    </section>
  );
}

function Bankenreporting() {
  const metrics = cfoMetrics();
  const bankKpis = [
    { label: "Gesamtleistung YTD", value: eur(metrics.gesamtleistung), detail: "+4,2 % ggü. Vorjahr" },
    { label: "EBITDA YTD", value: eur(metrics.ebitda), detail: `${pct(metrics.ebitdaMarge)} EBITDA-Marge` },
    { label: "Run-Rate EBITDA", value: eur(metrics.runRateEbitda), detail: "auf Basis aktueller Monate" },
    { label: "Cashflow", value: eur(metrics.cashflow), detail: "nach Tilgung und Adjustments" },
    { label: "Aufgenommenes Fremdkapital", value: eur(metrics.aufgenommen), detail: "konsolidiert über Vertragsperioden" },
    { label: "Restschuld", value: eur(metrics.restschuld), detail: `${eur(metrics.getilgt, true)} bereits getilgt` },
    { label: "Kapitaldienst", value: eur(metrics.kapitaldienst), detail: `${eur(metrics.tilgung, true)} Tilgung / ${eur(metrics.zins, true)} Zins` },
    {
      label: "Kapitaldienstfähigkeit",
      value: `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`,
      detail: "EBITDA / Kapitaldienst"
    }
  ];

  return (
    <section className="space-y-5">
      <PageTitle
        title="Bankenreporting"
        text="Kompakte Bankenübersicht mit Ergebnisentwicklung, Cashflow, Fremdkapital und Kapitaldienstfähigkeit."
      />
      <DataStatusStrip />
      <Card className="grid gap-px overflow-hidden table-grid-bg md:grid-cols-2 xl:grid-cols-4">
        {bankKpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{kpi.detail}</p>
          </div>
        ))}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Gesamtleistung & EBITDA Entwicklung" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" name="EBITDA" stroke="#0369a1" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="p-4">
          <h2 className="font-bold">Bankenampel</h2>
          <div className="mt-4 space-y-3">
            {[
              ["EBITDA-Marge", pct(metrics.ebitdaMarge), metrics.ebitdaMarge >= 12 ? "green" : "yellow"],
              ["Cashflow", eur(metrics.cashflow), metrics.cashflow >= 0 ? "green" : "red"],
              ["Kapitaldienstfähigkeit", `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`, metrics.kapitaldienstfaehigkeit >= 1.5 ? "green" : "yellow"],
              ["Restschuld-Entwicklung", `${pct((metrics.getilgt / (metrics.aufgenommen || 1)) * 100)} getilgt`, "yellow"]
            ].map(([label, value, status]) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
                <StatusDot status={status as Status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-bold">Standortbeitrag für Bankenreporting</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {["Standort", "Gesamtleistung", "EBITDA", "Marge", "Cashflow", "Restschuld", "Tilgung", "Zins"].map((head) => (
                  <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standorte.map((site) => (
                <tr key={site.id}>
                  <td className="border-b border-r border-border p-3 font-bold">{site.name}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.gesamtleistung)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.ebitda)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{pct(site.ebitdaMarge)}</td>
                  <td className={cn("border-b border-r border-border p-3 text-right", site.cashflow < 0 && "text-red-700")}>{eur(site.cashflow)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.restschuld)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.tilgung)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.zins)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function BoardPack() {
  const metrics = cfoMetrics();
  const summary = [
    `Gesamtleistung YTD liegt bei ${eur(metrics.gesamtleistung, true)}; die Gruppe bleibt auf Wachstumskurs.`,
    `EBITDA YTD beträgt ${eur(metrics.ebitda, true)} bei einer Marge von ${pct(metrics.ebitdaMarge)}.`,
    `Run-Rate EBITDA liegt bei ${eur(metrics.runRateEbitda, true)} und ist die wichtigste Exit-nahe Kennzahl.`,
    `Netto-Cashflow ist mit ${eur(metrics.cashflow, true)} positiv nach Tilgung und Adjustments.`,
    `${metrics.kritisch.length} Standort(e) benötigen Management-Fokus: ${metrics.kritisch.map((site) => site.name).join(", ") || "keine"}.`,
    `Fremdkapital ist mit ${eur(metrics.restschuld, true)} Restschuld transparent steuerbar; ${eur(metrics.getilgt, true)} wurden bereits getilgt.`
  ];

  return (
    <section className="space-y-5">
      <PageTitle
        title="Investor / Board-Pack"
        text="Monatliche Management-Übersicht für Gesellschafter: Executive Summary, KPI-Entwicklung, Standortbeiträge, Risiken und Akquisitionen."
      />
      <DataStatusStrip />

      <Card className="p-4">
        <h2 className="font-bold">Executive Summary</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {summary.map((item) => (
            <div key={item} className="rounded-md bg-slate-50 p-3 text-sm leading-6">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Mini label="Gesamtleistung YTD" value={eur(metrics.gesamtleistung)} />
        <Mini label="EBITDA / Marge" value={`${eur(metrics.ebitda, true)} / ${pct(metrics.ebitdaMarge)}`} />
        <Mini label="Run-Rate EBITDA" value={eur(metrics.runRateEbitda)} />
        <Mini label="Cashflow" value={eur(metrics.cashflow)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Board KPI Entwicklung" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" name="EBITDA" stroke="#0369a1" strokeWidth={3} />
              <Line dataKey="cashflow" name="Cashflow" stroke="#64748b" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="p-4">
          <h2 className="font-bold">Risiken & Fokus</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Forderungen", `${eur(metrics.forderungen, true)} offen`, metrics.forderungen > metrics.gesamtleistung * 0.15 ? "yellow" : "green"],
              ["Kostenquote", pct(metrics.kostenquote), metrics.kostenquote > 68 ? "yellow" : "green"],
              ["Kapitaldienstfähigkeit", `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`, metrics.kapitaldienstfaehigkeit >= 1.5 ? "green" : "yellow"],
              ["Kritische Standorte", `${metrics.kritisch.length} Standort(e)`, metrics.kritisch.length ? "yellow" : "green"]
            ].map(([label, value, status]) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
                <StatusDot status={status as Status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <StandortCfoComparison />
      <AcquisitionIntegration />
    </section>
  );
}

function AcquisitionIntegration() {
  const activeSites = standorte.filter((site) => site.gesamtleistung > 0);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-bold">Akquisitionen & Integration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kaufpreis, Startdatum, Übernahmeziele, Earn-Out und Zielerreichung je Standort.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {[
                "Standort",
                "Start",
                "Kaufpreis",
                "Darlehen",
                "Ziel-EBITDA KV",
                "Ist-EBITDA",
                "Zielerreichung",
                "Earn-Out offen",
                "Status"
              ].map((head) => (
                <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSites.map((site) => {
              const achievement = site.darlehen.zielEbitda ? (site.darlehen.istEbitda / site.darlehen.zielEbitda) * 100 : 0;
              const open = site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt;
              return (
                <tr key={site.id}>
                  <td className="border-b border-r border-border p-3 font-bold">{site.name}</td>
                  <td className="border-b border-r border-border p-3">{site.start}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.kaufpreis)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.darlehen)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.zielEbitda)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.istEbitda)}</td>
                  <td className={cn("border-b border-r border-border p-3 text-right font-semibold", achievement < 100 ? "text-red-700" : "text-emerald-700")}>{pct(achievement)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(open)}</td>
                  <td className="border-b border-r border-border p-3"><StatusDot status={achievement >= 100 ? "green" : "yellow"} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Darlehen() {
  const restschuld = standorte.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
  const earnOut = standorte.reduce((sum, site) => sum + site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt, 0);
  return (
    <section className="space-y-5">
      <PageTitle title="Darlehen & Earn-Out" text="Kaufpreise, Restschulden, Zins, Tilgung und Earn-Out-Fortschritt je Standort." />
      <DebtCapitalBlock />
      <EarnOutSummary />
      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard label="Gesamte Restschuld" value={restschuld} delta="Konsolidiert" icon={Landmark} status="yellow" />
        <KpiCard label="Earn-Out offen" value={earnOut} delta="Verpflichtungen offen" icon={BadgeEuro} status="yellow" />
        <KpiCard label="Tilgung YTD" value={251000} delta="Laufend bedient" icon={ShieldCheck} status="green" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {standorte.map((site) => {
          const progress = site.darlehen.earnOutGesamt ? (site.darlehen.earnOutGezahlt / site.darlehen.earnOutGesamt) * 100 : 0;
          return (
            <Card key={site.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold">{site.name}</h2>
                <StatusDot status={site.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Mini label="Kaufpreis" value={eur(site.darlehen.kaufpreis, true)} />
                <Mini label="Darlehen" value={eur(site.darlehen.darlehen, true)} />
                <Mini label="Restschuld" value={eur(site.darlehen.restschuld, true)} />
                <Mini label="Tilgung" value={eur(site.darlehen.tilgung, true)} />
                <Mini label="Zins" value={eur(site.darlehen.zins, true)} />
                <Mini label="Ziel/IST EBITDA" value={`${eur(site.darlehen.zielEbitda, true)} / ${eur(site.darlehen.istEbitda, true)}`} />
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold">Earn-Out Fortschritt</span>
                  <span>{pct(progress)}</span>
                </div>
                <Progress value={progress} tone={progress > 50 ? "green" : "yellow"} />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function EarnOutSummary() {
  const totalPotential = standorte.reduce((sum, site) => sum + site.darlehen.earnOutGesamt, 0);
  const paid = standorte.reduce((sum, site) => sum + site.darlehen.earnOutGezahlt, 0);
  const open = totalPotential - paid;
  const likely = standorte.reduce((sum, site) => {
    const achievement = site.darlehen.zielEbitda ? site.darlehen.istEbitda / site.darlehen.zielEbitda : 0;
    return sum + Math.max(0, site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt) * Math.min(1, achievement);
  }, 0);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold">Earn-Out konsolidiert</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gesamtpotenzial, bereits gezahlt, offen und voraussichtlich fällig.</p>
        </div>
        <Badge tone={open > totalPotential * 0.5 ? "yellow" : "green"}>{pct((paid / (totalPotential || 1)) * 100)} gezahlt</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Mini label="Earn-Out Potenzial" value={eur(totalPotential)} />
        <Mini label="Bereits gezahlt" value={eur(paid)} />
        <Mini label="Offen" value={eur(open)} />
        <Mini label="Voraussichtlich fällig" value={eur(likely)} />
      </div>
    </Card>
  );
}

function Uploads({
  onImportConfirmed,
  onImportReset
}: {
  onImportConfirmed?: (data: ImportedDashboardData) => void;
  onImportReset?: () => void;
}) {
  const [report, setReport] = useState<ImportReport>(emptyImportReport);
  const [confirmedReport, setConfirmedReport] = useState<ImportReport | null>(null);
  const [pendingDashboardData, setPendingDashboardData] = useState<ImportedDashboardData | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(importStorageKey);
    if (!saved) return;
    try {
      setConfirmedReport(JSON.parse(saved) as ImportReport);
    } catch {
      window.localStorage.removeItem(importStorageKey);
    }
  }, []);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setReport({ ...emptyImportReport, status: "reading", fileName: file.name });

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const workbook =
        extension === "csv"
          ? XLSX.read(await file.text(), { type: "string", cellDates: true })
          : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const nextReport = buildImportReport(workbook, file.name);
      setReport(nextReport);
      if (nextReport.status === "ready" || nextReport.status === "warning") {
        setPendingDashboardData(buildImportedDashboardData(workbook, file.name, nextReport));
      } else {
        setPendingDashboardData(null);
      }
    } catch (error) {
      setReport({
        ...emptyImportReport,
        status: "error",
        fileName: file.name,
        importedAt: new Date().toISOString(),
        errors: [
          error instanceof Error
            ? `Die Datei konnte nicht gelesen werden: ${error.message}`
            : "Die Datei konnte nicht gelesen werden."
        ]
      });
    }
  }

  function confirmImport() {
    if ((report.status !== "ready" && report.status !== "warning") || !pendingDashboardData) return;
    window.localStorage.setItem(importStorageKey, JSON.stringify(report));
    window.localStorage.setItem(importDashboardStorageKey, JSON.stringify(pendingDashboardData));
    setConfirmedReport(report);
    onImportConfirmed?.(pendingDashboardData);
  }

  function resetImport() {
    window.localStorage.removeItem(importStorageKey);
    window.localStorage.removeItem(importDashboardStorageKey);
    setReport(emptyImportReport);
    setConfirmedReport(null);
    setPendingDashboardData(null);
    onImportReset?.();
  }

  const activeReport = report.status === "idle" ? confirmedReport : report;
  const statusTone = activeReport?.status === "ready" ? "green" : activeReport?.status === "warning" ? "yellow" : activeReport?.status === "error" ? "red" : "neutral";
  const statusLabel =
    activeReport?.status === "ready"
      ? "Importfähig"
      : activeReport?.status === "warning"
        ? "Importfähig mit Warnungen"
        : activeReport?.status === "error"
          ? "Nicht importfähig"
          : report.status === "reading"
            ? "Datei wird gelesen"
            : "Noch kein Import";

  const importSteps = [
    { label: "Arbeitsmappe auswählen", done: report.status !== "idle" || Boolean(confirmedReport) },
    { label: "Pflichtblätter erkennen", done: Boolean(activeReport?.presentSheets.length) },
    { label: "Konzern_Konsolidierung_STD auslesen", done: Boolean(activeReport?.totalRows) },
    { label: "Planwerte filtern", done: Boolean(activeReport && activeReport.status !== "error") },
    { label: "Standorte, Jahre und Monate prüfen", done: Boolean(activeReport?.standorte.length && activeReport?.jahre.length) },
    { label: "Importbericht freigeben", done: Boolean(confirmedReport) }
  ];

  return (
    <section className="space-y-5">
      <PageTitle title="Uploads & Datenstand" text="Zentraler Excel-Import aus der konsolidierten Orisus-Arbeitsmappe mit Blatt-, Zeitraum-, Standort- und Plausibilitätsprüfung." />
      <DataStatusStrip />
      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Mini label="Aktueller Importstatus" value={statusLabel} />
        <Mini label="Letzte bestätigte Datei" value={confirmedReport?.fileName ?? "Noch keine Datei bestätigt"} />
        <Mini
          label="Datenstand"
          value={confirmedReport?.importedAt ? new Date(confirmedReport.importedAt).toLocaleString("de-DE") : "Noch offen"}
        />
      </Card>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4">
          <h2 className="font-bold">Uploadablauf</h2>
          <div className="mt-4 space-y-3">
            {importSteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                    step.done ? "bg-primary" : "bg-slate-300"
                  )}
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </span>
                <span className="font-semibold">{step.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold">Konsolidierte Orisus-Arbeitsmappe</h2>
              <p className="mt-1 text-sm text-muted-foreground">Lade die komplette Excel-Datei nach Power-Query-Refresh und Speichern hoch.</p>
            </div>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
          <Select className="mt-4 w-full">
            {uploadTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
          <label className="mt-4 block cursor-pointer rounded-lg border-2 border-dashed border-border bg-slate-50 p-8 text-center transition hover:border-primary hover:bg-cyan-50/60">
            <FileUp className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-3 font-bold">{report.status === "reading" ? "Datei wird gelesen ..." : "Excel-Datei auswählen"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Empfohlen: +BWA_Controlling_Orisus_Dashboard+.xlsx</p>
            <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          </label>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["Pflichtblätter", activeReport ? `${activeReport.presentSheets.length}/${requiredImportSheets.length} erkannt` : "Noch offen"],
              ["Datenzeilen", activeReport ? activeReport.totalRows.toLocaleString("de-DE") : "Noch offen"],
              ["Importfähige Zeilen", activeReport ? activeReport.usableRows.toLocaleString("de-DE") : "Noch offen"],
              ["Ausgeschlossene Planwerte", activeReport ? activeReport.excludedPlanRows.toLocaleString("de-DE") : "Noch offen"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md table-total p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button className="w-full" disabled={report.status !== "ready" && report.status !== "warning"} onClick={confirmImport}>
              Importbericht bestätigen
            </Button>
            <Button className="w-full" variant="secondary" disabled={!confirmedReport && report.status === "idle"} onClick={resetImport}>
              Import zurücksetzen
            </Button>
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-bold">Importbericht</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vorschau aus der hochgeladenen Arbeitsmappe. Nach Bestätigung nutzen Cockpit, BWA und Standortansichten diese Importdaten.
          </p>
        </div>
        <div className="grid gap-px table-grid-bg md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Jahre", activeReport?.jahre.length ? activeReport.jahre.join(", ") : "Noch nicht erkannt"],
            ["Monate", activeReport?.monate.length ? activeReport.monate.join(", ") : "Noch nicht erkannt"],
            ["Standorte", activeReport?.standorte.length ? activeReport.standorte.join(", ") : "Noch nicht erkannt"],
            ["Datenbereiche", activeReport?.datenbereiche.length ? activeReport.datenbereiche.slice(0, 8).join(", ") : "Noch nicht erkannt"]
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
              <p className="mt-2 font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <div className="rounded-md table-cashflow p-3 text-sm font-semibold text-emerald-800">
            {activeReport ? `${activeReport.presentSheets.length} relevante Blätter erkannt` : "Bereit für Upload"}
          </div>
          <div className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            {activeReport ? `${activeReport.warnings.length} Warnungen` : "Warnungen erscheinen nach Upload"}
          </div>
          <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
            {activeReport ? `${activeReport.errors.length} blockierende Fehler` : "Fehler erscheinen nach Upload"}
          </div>
        </div>
        {(activeReport?.warnings.length || activeReport?.errors.length) && (
          <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
            <div>
              <h3 className="font-bold text-amber-800">Warnungen</h3>
              <div className="mt-2 space-y-2">
                {(activeReport.warnings.length ? activeReport.warnings : ["Keine Warnungen erkannt."]).map((warning) => (
                  <div key={warning} className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    {warning}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-red-800">Fehler</h3>
              <div className="mt-2 space-y-2">
                {(activeReport.errors.length ? activeReport.errors : ["Keine blockierenden Fehler erkannt."]).map((error) => (
                  <div key={error} className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function Reports() {
  const reports = ["Monatsreport", "YTD-Report", "Standortreport", "Bankenreport", "PDF-Export später"];
  return (
    <section className="space-y-5">
      <PageTitle title="Reports" text="Platzhalter für spätere CFO- und Bankenberichte." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Card key={report} className="p-4">
            <FileBarChart className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-xl font-bold">{report}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Berichtsvorlage mit Dummy-Status. Exportlogik folgt in Phase 2.</p>
            <Button className="mt-4 w-full" variant="secondary">
              Vorschau öffnen
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function AdminKpiRules() {
  const rules = [
    { kpi: "EBITDA-Marge", green: ">= 15,0 %", yellow: "10,0 % bis 14,9 %", red: "< 10,0 %", owner: "CFO" },
    { kpi: "Cashflow Konzern", green: ">= 0 EUR", yellow: "n/a", red: "< 0 EUR", owner: "CFO" },
    { kpi: "Offene Forderungen", green: "<= 12 % der Gesamtleistung", yellow: "12 % bis 18 %", red: "> 18 %", owner: "Controlling" },
    { kpi: "Kostenquote", green: "<= 68,0 %", yellow: "68,1 % bis 74,0 %", red: "> 74,0 %", owner: "Controlling" },
    { kpi: "Aktuelle Liquidität", green: ">= 500 TEUR", yellow: "250 TEUR bis 499 TEUR", red: "< 250 TEUR", owner: "CFO" },
    { kpi: "Kapitaldienstfähigkeit", green: ">= 1,50x", yellow: "1,00x bis 1,49x", red: "< 1,00x", owner: "CFO / Bank" },
    { kpi: "Ziel-EBITDA Kaufvertrag", green: ">= 100 %", yellow: "85 % bis 99 %", red: "< 85 %", owner: "M&A" },
    { kpi: "Ziel-EBITDA Übernahme", green: ">= 100 %", yellow: "85 % bis 99 %", red: "< 85 %", owner: "M&A" }
  ];

  return (
    <section className="space-y-5">
      <PageTitle
        title="Admin / KPI-Regeln"
        text="Interner Einstellungsbereich für Ampel-Schwellenwerte und Zielerreichungslogik. In Phase 1 als Regelübersicht vorbereitet."
      />
      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-bold">Regelstatus</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Diese Schwellenwerte steuern die Ampeln für Cockpit, Bankenreporting, Standortdetails und Board-Pack.
            </p>
          </div>
          <Badge tone="yellow">Admin-konfigurierbar geplant</Badge>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {["KPI", "Grün", "Gelb", "Rot", "Verantwortlich"].map((head) => (
                  <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.kpi}>
                  <td className="border-b border-r border-border p-3 font-bold">{rule.kpi}</td>
                  <td className="border-b border-r border-border p-3 text-emerald-700">{rule.green}</td>
                  <td className="border-b border-r border-border p-3 text-amber-700">{rule.yellow}</td>
                  <td className="border-b border-r border-border p-3 text-red-700">{rule.red}</td>
                  <td className="border-b border-r border-border p-3">{rule.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <h2 className="font-bold">Ziel-EBITDA</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ziel-EBITDA gemäß Kaufvertrag und Übernahme sind Importwerte und keine separat geplanten Budgetwerte.
          </p>
        </Card>
        <Card className="p-4">
          <h2 className="font-bold">Geltungsbereich</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Regeln gelten konsolidiert und je Standort, sofern die Kennzahl standortbezogen vorhanden ist.
          </p>
        </Card>
        <Card className="p-4">
          <h2 className="font-bold">Änderungslogik</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Spätere Version: Werte bearbeiten, speichern, Änderungsdatum und verantwortliche Person anzeigen.
          </p>
        </Card>
      </div>
    </section>
  );
}
