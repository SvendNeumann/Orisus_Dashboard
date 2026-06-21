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
  Info,
  Landmark,
  Lock,
  Menu,
  PieChart as PieIcon,
  Fingerprint,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X
} from "lucide-react";
import { Badge, Button, Card, Input, Progress, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  monthly,
  standorte,
  Status,
  uploadTypes
} from "@/data/dashboard";

type DashboardSite = (typeof standorte)[number];
type TopBehandlerEntry = { name: string; standort: string; honorar: number };

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

const bwaPeriodOptions = [
  "Geschäftsjahr 2024",
  "YTD 2024 bis Dez",
  "Dez 2024",
  "Geschäftsjahr 2025",
  "YTD 2025 bis Dez",
  "Dez 2025",
  "Geschäftsjahr 2026",
  "YTD 2026 bis Apr",
  "Apr 2026",
  "Gesamte Periode"
];

const authStorageKey = "orisus-cfo-authenticated";
const passkeyStorageKey = "orisus-cfo-passkey-id";
const importStorageKey = "orisus-cfo-import-report";
const importDashboardStorageKey = "orisus-cfo-import-dashboard-data";
const importDashboardSchemaVersion = "2026-06-21-performance-behandler-total-v8";
const importSourceSheetName = "Konzern_Konsolidierung_STD";

const acquisitionTermsBySiteId: Record<string, { kaufpreis: number; earnOutGesamt: number; earnOutFaelligAm: string }> = {
  kirchberg: { kaufpreis: 1365000, earnOutGesamt: 735000, earnOutFaelligAm: "30.06.2029" },
  essen: { kaufpreis: 727200, earnOutGesamt: 391600, earnOutFaelligAm: "31.12.2029" },
  kehl: { kaufpreis: 601250, earnOutGesamt: 323750, earnOutFaelligAm: "30.03.2029" },
  ulmet: { kaufpreis: 1852500, earnOutGesamt: 997500, earnOutFaelligAm: "31.12.2030" },
  huettenberg: { kaufpreis: 552500, earnOutGesamt: 297500, earnOutFaelligAm: "31.12.2030" }
};

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
  schemaVersion: string;
  importedAt: string;
  fileName: string;
  sites: DashboardSite[];
  monthly: typeof monthly;
  topBehandler: TopBehandlerEntry[];
  bwaRows: ImportedBwaRow[];
  pvsRevenueRows?: ImportedPeriodValueRow[];
  behandlerHonorarRows?: ImportedPeriodValueRow[];
  behandlerTotalRows?: ImportedPeriodValueRow[];
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
  hasValueByMonth: Record<string, boolean>;
  contractValue: number;
};

type ImportedPeriodValueRow = {
  siteId: string;
  siteName: string;
  valuesByYear: Record<string, number>;
  valuesByMonth: Record<string, number>;
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
  { key: "ziel_ebitda_kaufvertrag", label: "Ziel-EBITDA gemäß Kaufvertrag", section: "4. Sachkosten / EBITDA", order: 520, source: [], derived: "target_kv" },
  { key: "abweichung_ziel_ebitda_kaufvertrag_abs", label: "Abw. Ziel-EBITDA Kaufvertrag", section: "4. Sachkosten / EBITDA", order: 530, source: [], derived: "abw_abs_kv" },
  { key: "abweichung_ziel_ebitda_kaufvertrag_pct", label: "Abw. Ziel-EBITDA Kaufvertrag %", section: "4. Sachkosten / EBITDA", order: 540, source: [], percent: true, derived: "abw_pct_kv" },
  { key: "ziel_ebitda_uebernahme", label: "Ziel-EBITDA gemäß Übernahme", section: "4. Sachkosten / EBITDA", order: 550, source: [], derived: "target_uebernahme" },
  { key: "abweichung_ziel_ebitda_uebernahme_abs", label: "Abw. Ziel-EBITDA Übernahme", section: "4. Sachkosten / EBITDA", order: 560, source: [], derived: "abw_abs_uebernahme" },
  { key: "abweichung_ziel_ebitda_uebernahme_pct", label: "Abw. Ziel-EBITDA Übernahme %", section: "4. Sachkosten / EBITDA", order: 570, source: [], percent: true, derived: "abw_pct_uebernahme" },
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
  if (compact && Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toLocaleString("de-DE", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    })} Mio. €`;
  }

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

function startDateValue(value: string) {
  const [day, month, year] = value.split(".").map((part) => Number(part));
  if (!day || !month || !year) return Number.MAX_SAFE_INTEGER;
  return new Date(year, month - 1, day).getTime();
}

function excelSerialDateToDisplay(value: number) {
  const date = XLSX.SSF.parse_date_code(value);
  if (!date?.y || !date?.m || !date?.d) return "";
  return `${String(date.d).padStart(2, "0")}.${String(date.m).padStart(2, "0")}.${date.y}`;
}

function displayDateFromUnknown(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toLocaleDateString("de-DE");
  }
  const numeric = asNumber(value);
  if (numeric && numeric > 20000) return excelSerialDateToDisplay(numeric);
  const text = asText(value);
  return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text) ? text : "";
}

function startPeriodValue(value: string) {
  const [day, month, year] = value.split(".").map((part) => Number(part));
  if (!day || !month || !year) return Number.MAX_SAFE_INTEGER;
  return year * 100 + month;
}

function sortSitesByContractStart<T extends { start: string; name: string }>(sites: T[]) {
  return [...sites].sort((a, b) => startDateValue(a.start) - startDateValue(b.start) || a.name.localeCompare(b.name, "de"));
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
  const isReceivablesSource = text.includes("soll") && text.includes("forderung") && text.includes("pvs");
  return relatesToEbitdaTarget || text.includes("earn-out") || isReceivablesSource;
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

function normalizeSiteId(value: unknown) {
  return asText(value)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function siteIdForName(siteName: string) {
  return standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase())?.id ?? normalizeSiteId(siteName);
}

function acquisitionTermsForSite(siteName: string) {
  return acquisitionTermsBySiteId[siteIdForName(siteName)] ?? { kaufpreis: 0, earnOutGesamt: 0, earnOutFaelligAm: "" };
}

function rowMetric(row: Record<string, unknown>) {
  const originalMetric = asText(row.Kennzahl);
  const rawMetric = originalMetric.startsWith("+") ? originalMetric : asText(row.Standard_Kennzahl || row.Kennzahl || row.Detailbezeichnung);
  return `${rawMetric.trim().startsWith("+") ? "plus_" : ""}${normalizeMetric(rawMetric)}`;
}

function rowDomain(row: Record<string, unknown>) {
  return normalizeMetric(row.Standard_Datenbereich || row.Datenbereich);
}

function rowCategory(row: Record<string, unknown>) {
  return normalizeMetric(row.Standard_Kategorie || row.Kategorie);
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

function sumRowsByCategory(rows: Record<string, unknown>[], metrics: string[], domains: string[], categories: string[]) {
  return rows.reduce((sum, row) => {
    const metric = rowMetric(row);
    const domain = rowDomain(row);
    const category = rowCategory(row);
    if (!metricMatches(metric, metrics)) return sum;
    if (domains.length && !metricMatches(domain, domains)) return sum;
    if (categories.length && !metricMatches(category, categories)) return sum;
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

function lastRowsDisplayDate(rows: Record<string, unknown>[], site: string | null, metrics: string[], domains?: string[]) {
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

  return displayDateFromUnknown(candidates[0]?.Wert);
}

function contractPeriodEndForSite(siteName: string, rows: Record<string, unknown>[], fallback: string) {
  return (
    lastRowsDisplayDate(rows, siteName, ["vertragsperiode_ende"], ["stammdaten"]) ||
    lastRowsDisplayDate(rows, siteName, ["vertragsperiode_ende"], ["stammdaten", "dashboard"]) ||
    fallback
  );
}

function preferredRowsValue(rows: Record<string, unknown>[], metricGroups: string[][], domains?: string[]) {
  for (const metrics of metricGroups) {
    const candidates = rows
      .filter((row) => {
        const value = asNumber(row.Wert);
        if (value == null || value === 0) return false;
        const metric = rowMetric(row);
        const domain = rowDomain(row);
        return metricMatches(metric, metrics) && (!domains?.length || metricMatches(domain, domains));
      })
      .sort((a, b) => {
        const yearDelta = (rowYear(b) ?? 0) - (rowYear(a) ?? 0);
        if (yearDelta) return yearDelta;
        return (rowMonth(b) ?? 0) - (rowMonth(a) ?? 0);
      });
    const value = asNumber(candidates[0]?.Wert);
    if (value != null) return value;
  }
  return 0;
}

function monthNumberFromHeader(value: unknown) {
  const key = normalizeMetric(value);
  const months: Record<string, number> = {
    jan: 1,
    januar: 1,
    feb: 2,
    februar: 2,
    mrz: 3,
    maerz: 3,
    marz: 3,
    apr: 4,
    april: 4,
    mai: 5,
    jun: 6,
    juni: 6,
    jul: 7,
    juli: 7,
    aug: 8,
    august: 8,
    sep: 9,
    september: 9,
    okt: 10,
    oktober: 10,
    nov: 11,
    november: 11,
    dez: 12,
    dezember: 12
  };
  return months[key] ?? null;
}

function latestKontostandFromWorkbook(workbook: XLSX.WorkBook, siteName: string) {
  const siteKey = normalizeSiteId(siteName);
  const sheetName = workbook.SheetNames.find((name) => {
    const key = normalizeSiteId(name.replace(/^Input_Kontostand_?/i, ""));
    return normalizeSiteId(name).startsWith("input_kontostand") && key === siteKey;
  });
  if (!sheetName) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });
  const yearRowIndex = rows.findIndex((row) => normalizeMetric(row[0]) === "jahr");
  const monthRowIndex = rows.findIndex((row) => normalizeMetric(row[0]).includes("bankkonto") && normalizeMetric(row[0]).includes("monat"));
  if (yearRowIndex < 0 || monthRowIndex < 0) return null;

  const yearRow = rows[yearRowIndex] ?? [];
  const monthRow = rows[monthRowIndex] ?? [];
  const monthColumns: { column: number; year: number; month: number }[] = [];
  let currentYear: number | null = null;
  const columnCount = Math.max(yearRow.length, monthRow.length);

  for (let column = 1; column < columnCount; column += 1) {
    const explicitYear = asNumber(yearRow[column]);
    if (explicitYear && explicitYear >= 1900) currentYear = Math.trunc(explicitYear);
    const month = monthNumberFromHeader(monthRow[column]);
    if (currentYear && month) monthColumns.push({ column, year: currentYear, month });
  }

  const values = monthColumns
    .map(({ column, year, month }) => {
      let sum = 0;
      let hasValue = false;

      for (let rowIndex = monthRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] ?? [];
        const label = normalizeMetric(row[0]);
        if (!label || ["struktur", "pruefung", "pflegehinweis"].includes(label) || label.startsWith("eine_zeile") || label.startsWith("helper")) continue;
        const value = asNumber(row[column]);
        if (value == null) continue;
        sum += value;
        hasValue = true;
      }

      return hasValue ? { year, month, value: sum } : null;
    })
    .filter((entry): entry is { year: number; month: number; value: number } => entry != null)
    .sort((a, b) => b.year - a.year || b.month - a.month);

  return values[0]?.value ?? null;
}

function openReceivablesSinceStart(siteName: string, siteRows: Record<string, unknown>[], allSiteRows: Record<string, unknown>[]) {
  if (normalizeSiteId(siteName) === "ulmet") {
    const ulmetReceivables = preferredRowsValue(allSiteRows, [["offene_forderungen_gesamt"]], ["dashboard", "bwa_dashboard"]);
    if (ulmetReceivables) return ulmetReceivables;
  }

  const sollForderung =
    sumRowsByCategory(siteRows, ["soll_forderung_pvs"], ["finanzen"], ["soll"]) ||
    sumRowsByCategory(siteRows, ["soll_forderung_pvs"], ["finanzen"], ["pvs"]);
  const istCashGeflossen = sumRows(siteRows, null, ["ist_cash_geflossen_pvs"], ["finanzen"]);
  const calculatedReceivables = sollForderung - istCashGeflossen;
  if (sollForderung || istCashGeflossen) return Math.max(0, calculatedReceivables);

  return preferredRowsValue(
    allSiteRows,
    [["offene_forderungen_gesamt"], ["noch_nicht_geflossen"], ["noch_ausstehend_vs_bank"], ["soll_forderung_pvs"]],
    ["finanzen", "dashboard", "bwa_dashboard"]
  );
}

function pvsTotalRevenueFromRows(rows: Record<string, unknown>[]) {
  return (
    sumRowsByCategory(rows, ["gesamtumsatz_inkl_fl_mat"], ["finanzen"], ["pvs_umsatzstatistik_honorare"]) ||
    sumRowsByCategory(rows, ["gesamtumsatz_inkl_fl_mat"], ["finanzen"], ["pvs"]) ||
    sumRowsByCategory(rows, ["soll_forderung_pvs"], ["finanzen"], ["pvs"])
  );
}

function consolidationRowsFromWorkbook(workbook: XLSX.WorkBook) {
  const sheetNames = Array.from(
    new Set([
      "Konzern_Konsolidierung",
      importSourceSheetName,
      ...workbook.SheetNames.filter((sheetName) => {
        const key = normalizeMetric(sheetName);
        return key.endsWith("_export") || key.startsWith("export_");
      })
    ])
  );

  return sheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils
      .sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
        raw: true
      })
      .filter((row) => {
        if (isExcludedPlanRow(row) || !asText(row.Kennzahl) || !asText(row.Standortname)) return false;
        return metricMatches(rowMetric(row), [
          "kontostand",
          "kontostand_monatsende",
          "kontostand_per_stichtag",
          "offene_forderungen_gesamt",
          "gesamtumsatz_inkl_fl_mat",
          "soll_forderung_pvs",
          "noch_nicht_geflossen",
          "noch_ausstehend_vs_bank",
          "aufgenommenes_fremdkapital",
          "davon_aufgenommenes_fremdkapital_nicht_bankwirksam",
          "darlehen*",
          "fremdkapital*",
          "restschuld",
          "rest_fremdkapital",
          "tilgung",
          "tilgung_kredit_zins",
          "davon_tilgung_zins",
          "zins*",
          "zinsen*",
          "zinsen_neutraler_aufwand"
        ]);
      });
  });
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
  const ebitda = sumMetricForPeriod(rows, siteName, ["ebitda"], year, month);
  const targetKv = targetEbitdaValue(rows, siteName, "kv", year, month);
  const targetUebernahme = targetEbitdaValue(rows, siteName, "uebernahme", year, month);
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
  if (key === "target_kv") return targetKv;
  if (key === "target_uebernahme") return targetUebernahme;
  if (key === "abw_abs_kv") return ebitda - targetKv;
  if (key === "abw_abs_uebernahme") return ebitda - targetUebernahme;
  if (key === "abw_pct_kv") return ratio(ebitda - targetKv, targetKv);
  if (key === "abw_pct_uebernahme") return ratio(ebitda - targetUebernahme, targetUebernahme);
  return 0;
}

function hasActiveBwaMonth(rows: Record<string, unknown>[], siteName: string, year: number | undefined, month: number) {
  if (!year) return false;
  return rows.some(
    (row) =>
      asText(row.Standortname) === siteName &&
      rowDomain(row) === "bwa" &&
      (rowYear(row) ?? 0) === year &&
      (rowMonth(row) ?? 0) === month &&
      metricMatches(rowMetric(row), ["gesamtleistung", "ebitda"]) &&
      Math.abs(asNumber(row.Wert) ?? 0) > 0
  );
}

function hasBwaSourceValue(rows: Record<string, unknown>[], siteName: string, sourceKeys: readonly string[], year: number, month: number) {
  return rows.some(
    (row) =>
      asText(row.Standortname) === siteName &&
      rowDomain(row) === "bwa" &&
      (rowYear(row) ?? 0) === year &&
      (rowMonth(row) ?? 0) === month &&
      metricMatches(rowMetric(row), [...sourceKeys])
  );
}

function latestActiveBwaYear(rows: Record<string, unknown>[], siteNames: string[]) {
  const years = uniqueSortedNumbers(rows.map(rowYear)).filter((year) => year >= 1900);
  return years.findLast((year) =>
    siteNames.some((siteName) => Array.from({ length: 12 }, (_, index) => index + 1).some((month) => hasActiveBwaMonth(rows, siteName, year, month)))
  );
}

function isOnOrAfterStart(row: Record<string, unknown>, start: string) {
  const year = rowYear(row);
  const month = rowMonth(row);
  if (!year || year < 1900) return false;
  return year * 100 + (month && month >= 1 ? month : 1) >= startPeriodValue(start);
}

function targetEbitdaValue(rows: Record<string, unknown>[], siteName: string, mode: "kv" | "uebernahme", year?: number, month?: number) {
  const monthlyMetric = mode === "kv" ? "ziel_ebitda_kv" : "ziel_ebitda_ubernahme";
  const annualMetric = mode === "kv" ? "ziel_ebitda_kaufvertrag_p_a" : "ziel_ebitda_ubernahme_p_a";
  const targetRows = rows.filter((row) => asText(row.Standortname) === siteName);
  if (month && !hasActiveBwaMonth(rows, siteName, year, month)) return 0;
  const monthlyTarget = sumMetricForPeriod(targetRows, siteName, [monthlyMetric], year, month);
  if (monthlyTarget) return monthlyTarget;

  const annualTarget = lastRowsValue(targetRows, siteName, [annualMetric], ["stammdaten"]);
  if (!annualTarget) return 0;
  if (month) return annualTarget / 12;
  if (!year) return annualTarget;

  const activeMonths = new Set(
    Array.from({ length: 12 }, (_, index) => index + 1).filter((activeMonth) => hasActiveBwaMonth(rows, siteName, year, activeMonth))
  );
  return activeMonths.size ? annualTarget * (activeMonths.size / 12) : 0;
}

function targetEbitdaForActiveRows(rows: Record<string, unknown>[], siteName: string, mode: "kv" | "uebernahme", activeRows: Record<string, unknown>[]) {
  const periods = new Set(
    activeRows
      .filter((row) => rowDomain(row) === "bwa" && Math.abs(asNumber(row.Wert) ?? 0) > 0)
      .map((row) => {
        const year = rowYear(row);
        const month = rowMonth(row);
        return year && month ? `${year}-${month}` : "";
      })
      .filter(Boolean)
  );

  return [...periods].reduce((sum, period) => {
    const [year, month] = period.split("-").map(Number);
    return sum + targetEbitdaValue(rows, siteName, mode, year, month);
  }, 0);
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

function waitForBrowserPaint() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function buildImportedBwaRows(rows: Record<string, unknown>[], report: ImportReport): ImportedBwaRow[] {
  const importRows = rows.filter((row) => !isExcludedPlanRow(row));
  const bwaRows = importRows.filter((row) => rowDomain(row) === "bwa");
  const validYears = report.jahre.filter((year) => year > 1900);
  return report.standorte.flatMap((siteName) =>
    bwaMetricDefinitions.map((definition) => {
      const isPercent = definitionFlag(definition, "percent");
      const isEmphasis = definitionFlag(definition, "emphasis");
      const derivedKey = definitionDerivedKey(definition);
      const hasDataByYear = Object.fromEntries(
        validYears.map((year) => [
          String(year),
          Array.from({ length: 12 }, (_, index) => index + 1).some((month) => hasActiveBwaMonth(importRows, siteName, year, month))
        ])
      );
      const valuesByYear = Object.fromEntries(
        validYears.map((year) => {
          const derivedKey = definitionDerivedKey(definition);
          const value = definition.source.length
            ? sumMetricForPeriod(bwaRows, siteName, definition.source, year)
            : derivedKey
              ? derivedBwaValue(importRows, siteName, derivedKey, year)
              : 0;
          return [String(year), value];
        })
      );
      const hasDataByMonth = Object.fromEntries(
        validYears.flatMap((year) =>
          Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            return [`${year}-${month}`, hasActiveBwaMonth(importRows, siteName, year, month)];
          })
        )
      );
      const hasValueByMonth = Object.fromEntries(
        validYears.flatMap((year) =>
          Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const hasValue = definition.key.startsWith("section_")
              ? false
              : definition.source.length
                ? hasBwaSourceValue(bwaRows, siteName, definition.source, year, month)
                : derivedKey
                  ? hasActiveBwaMonth(importRows, siteName, year, month)
                  : false;
            return [`${year}-${month}`, hasValue];
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
                ? derivedBwaValue(importRows, siteName, derivedKey, year, month)
                : 0;
            return [`${year}-${month}`, value];
          })
        )
      );
      const contractValue = isPercent
        ? 0
        : definition.key.startsWith("section_")
          ? 0
          : definition.source.length
            ? sumMetricForPeriod(bwaRows, siteName, definition.source)
            : derivedKey
              ? validYears.reduce(
                  (sum, year) =>
                    sum +
                    Array.from({ length: 12 }, (_, index) => index + 1).reduce(
                      (monthSum, month) => monthSum + derivedBwaValue(importRows, siteName, derivedKey, year, month),
                      0
                    ),
                  0
                )
              : 0;

      return {
        siteId: siteIdForName(siteName),
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
        hasValueByMonth,
        contractValue
      };
    })
  );
}

function isPureBehandlerHonorarRow(row: Record<string, unknown>) {
  const datenbereich = normalizeMetric(row.Datenbereich);
  const kategorie = normalizeMetric([row.Kategorie, row.Standard_Kategorie].map(asText).join(" "));
  const metric = normalizeMetric(row.Kennzahl);
  const standardMetric = normalizeMetric(row.Standard_Kennzahl);
  if (!datenbereich.startsWith("behandler")) return false;
  if (["ranking", "stamm"].some((term) => kategorie.includes(term))) return false;
  if (metric !== "honorarumsatz" || standardMetric !== "honorarumsatz") return false;
  const combinedKey = normalizeMetric(
    [row.Kennzahl, row.Standard_Kennzahl, row.Kategorie, row.Standard_Kategorie, row.Objekt_Name, row.Werttyp, row.Standard_Werttyp]
      .map(asText)
      .join(" ")
  );
  if (["eigenlabor", "labor", "material", "pvs", "gesamtumsatz", "gesamtleistung", "behandlerumsatz_inkl"].some((term) => combinedKey.includes(term))) return false;
  return true;
}

function pureBehandlerHonorarFromRows(rows: Record<string, unknown>[]) {
  return rows.filter(isPureBehandlerHonorarRow).reduce((sum, row) => sum + (asNumber(row.Wert) ?? 0), 0);
}

function isPureBehandlerEigenlaborRow(row: Record<string, unknown>) {
  const datenbereich = normalizeMetric(row.Datenbereich);
  const kategorie = normalizeMetric([row.Kategorie, row.Standard_Kategorie].map(asText).join(" "));
  const metric = normalizeMetric(row.Kennzahl);
  const standardMetric = normalizeMetric(row.Standard_Kennzahl);
  if (!datenbereich.startsWith("behandler")) return false;
  if (["ranking", "stamm"].some((term) => kategorie.includes(term))) return false;
  if (metric !== "eigenlaborumsatz" || standardMetric !== "eigenlaborumsatz") return false;
  const combinedKey = normalizeMetric(
    [row.Kennzahl, row.Standard_Kennzahl, row.Kategorie, row.Standard_Kategorie, row.Objekt_Name, row.Werttyp, row.Standard_Werttyp]
      .map(asText)
      .join(" ")
  );
  if (["pvs", "gesamtumsatz", "gesamtleistung", "behandlerumsatz_inkl"].some((term) => combinedKey.includes(term))) return false;
  return true;
}

function behandlerTotalRevenueFromRows(rows: Record<string, unknown>[]) {
  return pureBehandlerHonorarFromRows(rows) + rows.filter(isPureBehandlerEigenlaborRow).reduce((sum, row) => sum + (asNumber(row.Wert) ?? 0), 0);
}

function topBehandlerFromRows(rows: Record<string, unknown>[], latestYear: number): TopBehandlerEntry[] {
  const grouped = new Map<string, { name: string; standort: string; honorar: number }>();

  rows.forEach((row) => {
    if ((rowYear(row) ?? 0) !== latestYear) return;
    if (!isPureBehandlerHonorarRow(row)) return;

    const name = asText(row.Objekt_Name || row.Behandler || row.Behandlername);
    const standort = asText(row.Standortname);
    const honorar = asNumber(row.Wert) ?? 0;
    if (!name || !standort || !honorar || normalizeMetric(name) === "standort") return;

    const key = `${siteIdForName(standort)}::${normalizeMetric(name)}`;
    const current = grouped.get(key) ?? { name, standort, honorar: 0 };
    current.honorar += honorar;
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .filter((entry) => entry.honorar > 0)
    .sort((a, b) => b.honorar - a.honorar)
    .slice(0, 6);
}

function buildImportedDashboardData(workbook: XLSX.WorkBook, fileName: string, report: ImportReport): ImportedDashboardData {
  const rows = XLSX.utils
    .sheet_to_json<Record<string, unknown>>(workbook.Sheets[importSourceSheetName], {
      defval: null,
      raw: true
    })
    .filter((row) => !isExcludedPlanRow(row) && asText(row.Kennzahl) && asText(row.Standortname));
  const latestYear = latestActiveBwaYear(rows, report.standorte) ?? report.jahre.filter((year) => year > 1900).at(-1) ?? new Date().getFullYear();
  const activeRows = rows.filter((row) => (rowYear(row) ?? latestYear) === latestYear);
  const fallbackByName = new Map(sortSitesByContractStart(standorte).map((site) => [site.name, site]));
  const consolidationRows = consolidationRowsFromWorkbook(workbook);
  const periodSiteNames = report.standorte.filter((siteName) => {
    const fallback = fallbackByName.get(siteName) ?? standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? standorte[0];
    return rows.some(
      (row) =>
        asText(row.Standortname) === siteName &&
        rowDomain(row) === "bwa" &&
        isOnOrAfterStart(row, fallback.start) &&
        metricMatches(rowMetric(row), ["gesamtleistung", "ebitda"]) &&
        Math.abs(asNumber(row.Wert) ?? 0) > 0
    );
  });
  const siteNamesForCards = periodSiteNames.length ? periodSiteNames : report.standorte;

  const sites = sortSitesByContractStart(siteNamesForCards.map((siteName) => {
    const fallback = fallbackByName.get(siteName) ?? standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? standorte[0];
    const siteRows = rows.filter((row) => asText(row.Standortname) === siteName && isOnOrAfterStart(row, fallback.start));
    const allSiteRows = consolidationRows.filter(
      (row) => asText(row.Standortname) === siteName && ((rowYear(row) ?? 0) < 1900 || isOnOrAfterStart(row, fallback.start))
    );
    const gesamtleistung = Math.round(sumRows(siteRows, null, ["gesamtleistung"], ["bwa"]));
    const pvsUmsatz = Math.round(pvsTotalRevenueFromRows(siteRows) || pvsTotalRevenueFromRows(allSiteRows));
    const ebitda = Math.round(sumRows(siteRows, null, ["ebitda"], ["bwa"]));
    const importedCashflow = Math.round(sumRows(siteRows, null, ["cashflow_gesamt"], ["bwa", "finanzen"]));
    const vorlaeufigesErgebnis = Math.round(sumRows(siteRows, null, ["vorlaufiges_ergebnis"], ["bwa"]));
    const cashflowAbschreibungen = Math.abs(
      Math.round(
        sumRowsByCategory(siteRows, ["plus_abschreibungen"], ["bwa"], ["cashflow_adjustments"]) ||
          sumRowsByCategory(siteRows, ["abschreibungen"], ["bwa"], ["cashflow_adjustments"]) ||
          sumRowsByCategory(siteRows, ["abschreibungen"], ["bwa"], ["unter_ebitda"])
      )
    );
    const investitionsausgaben = Math.abs(
      Math.round(sumRowsByCategory(siteRows, ["investitionsausgaben"], ["bwa"], ["cashflow_adjustments"]))
    );
    const umbuchungZmvz = Math.abs(
      Math.round(sumRowsByCategory(siteRows, ["umbuchung_zmvz"], ["bwa"], ["cashflow_adjustments"]))
    );
    const sonstigeRueckstellungenBestandsminderungen = Math.abs(
      Math.round(sumRowsByCategory(siteRows, ["sonstige_ruckstellungen_bestandsminderungen"], ["bwa"], ["cashflow_adjustments"]))
    );
    const inputKontostand = latestKontostandFromWorkbook(workbook, siteName);
    const kontostand = Math.round(
      inputKontostand ??
        lastRowsValue(allSiteRows, null, ["kontostand", "kontostand_monatsende", "kontostand_per_stichtag"], ["kontostand", "dashboard", "finanzen", "input_kontostand", "bwa_dashboard"])
    );
    const material = Math.abs(sumRows(siteRows, null, ["materialkosten"], ["bwa"]));
    const fremdlabor = Math.abs(sumRows(siteRows, null, ["fremdlaborkosten"], ["bwa"]));
    const personal = Math.abs(sumRows(siteRows, null, ["personalkosten"], ["bwa"]));
    const forderungen = Math.round(openReceivablesSinceStart(siteName, siteRows, allSiteRows));
    const darlehen = Math.round(
      preferredRowsValue(
        allSiteRows,
        [["aufgenommenes_fremdkapital"], ["davon_aufgenommenes_fremdkapital_nicht_bankwirksam"], ["darlehen*"], ["fremdkapital*"]],
        ["stammdaten", "finanzen", "darlehen"]
      )
    );
    const bwaTilgung = Math.abs(Math.round(sumRowsByCategory(siteRows, ["tilgung"], ["bwa"], ["cashflow_adjustments"])));
    const fallbackTilgung = Math.abs(
      Math.round(sumRows(allSiteRows, null, ["tilgung_kredit_zins", "davon_tilgung_zins", "tilgung"], ["finanzen", "darlehen"]))
    );
    const tilgung = bwaTilgung || fallbackTilgung;
    const hasCashflowInputs = [
      vorlaeufigesErgebnis,
      cashflowAbschreibungen,
      investitionsausgaben,
      tilgung,
      umbuchungZmvz,
      sonstigeRueckstellungenBestandsminderungen
    ].some((value) => value !== 0);
    const cashflow = hasCashflowInputs
      ? Math.round(
          vorlaeufigesErgebnis +
            cashflowAbschreibungen -
            investitionsausgaben -
            tilgung -
            umbuchungZmvz -
            sonstigeRueckstellungenBestandsminderungen
        )
      : importedCashflow;
    const zins = Math.abs(Math.round(sumRows(siteRows, null, ["zinsen_neutraler_aufwand", "zins*", "zinsen*"], ["bwa"])));
    const explicitRestschuld = lastRowsValue(allSiteRows, null, ["restschuld", "rest_fremdkapital"], ["finanzen", "darlehen", "stammdaten"]);
    const restschuld = Math.max(0, Math.round(explicitRestschuld || Math.max(0, darlehen - tilgung)));
    const ebitdaMarge = gesamtleistung ? (ebitda / gesamtleistung) * 100 : 0;
    const materialquote = gesamtleistung ? (material / gesamtleistung) * 100 : 0;
    const fremdlaborquote = gesamtleistung ? (fremdlabor / gesamtleistung) * 100 : 0;
    const personalquote = gesamtleistung ? (personal / gesamtleistung) * 100 : 0;
    const sonstigeKostenquote = gesamtleistung ? Math.max(0, 100 - ebitdaMarge - materialquote - fremdlaborquote - personalquote) : 0;
    const zielEbitdaKaufvertrag = Math.round(targetEbitdaForActiveRows(rows, siteName, "kv", siteRows));
    const zielEbitdaUebernahme = Math.round(targetEbitdaForActiveRows(rows, siteName, "uebernahme", siteRows));
    const acquisitionTerms = acquisitionTermsForSite(siteName);
    const earnOutFaelligAm = contractPeriodEndForSite(siteName, rows, acquisitionTerms.earnOutFaelligAm);
    const status: Status = ebitdaMarge < 8 || cashflow < 0 ? "red" : ebitdaMarge < 12 ? "yellow" : "green";

    return {
      id: siteIdForName(siteName) || fallback.id,
      name: siteName,
      start: fallback.start,
      gesamtleistung,
      pvsUmsatz,
      honorar: 0,
      eigenlabor: 0,
      ebitda,
      ebitdaMarge,
      cashflow,
      cashflowDetails: {
        vorlaeufigesErgebnis,
        abschreibungen: cashflowAbschreibungen,
        investitionsausgaben,
        tilgung,
        umbuchungZmvz,
        sonstigeRueckstellungenBestandsminderungen
      },
      kontostand,
      forderungen,
      materialquote,
      fremdlaborquote,
      personalquote,
      sonstigeKostenquote,
      status,
      vorjahrAbweichung: 0,
      darlehen: {
        kaufpreis: acquisitionTerms.kaufpreis,
        darlehen,
        restschuld,
        tilgung,
        zins,
        earnOutGesamt: acquisitionTerms.earnOutGesamt,
        earnOutGezahlt: 0,
        earnOutFaelligAm,
        zielEbitda: zielEbitdaKaufvertrag,
        zielEbitdaKaufvertrag,
        zielEbitdaUebernahme,
        istEbitda: ebitda
      }
    };
  }));

  const activeMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
    siteNamesForCards.some((siteName) => hasActiveBwaMonth(rows, siteName, latestYear, month))
  );
  const monthlyData = (activeMonths.length ? activeMonths : report.monate).map((monthNumber) => {
    const monthRows = activeRows.filter((row) => (rowMonth(row) ?? 0) === monthNumber);
    const leistung = Math.round(sumRows(monthRows, null, ["gesamtleistung"], ["bwa"]));
    const ebitda = Math.round(sumRows(monthRows, null, ["ebitda"], ["bwa"]));
    const cashflow = Math.round(sumRows(monthRows, null, ["cashflow_gesamt"], ["bwa", "finanzen"]));
    return {
      month: new Date(latestYear, monthNumber - 1, 1).toLocaleString("de-DE", { month: "short" }).replace(".", ""),
      leistung,
      ebitda,
      marge: leistung ? (ebitda / leistung) * 100 : 0,
      cashflow
    };
  });

  return {
    schemaVersion: importDashboardSchemaVersion,
    importedAt: new Date().toISOString(),
    fileName,
    sites,
    monthly: monthlyData,
    topBehandler: topBehandlerFromRows(rows, latestYear),
    bwaRows: buildImportedBwaRows(rows, report),
    pvsRevenueRows: buildImportedPvsRevenueRows(workbook, rows, report, latestYear),
    behandlerHonorarRows: buildImportedBehandlerHonorarRows(rows, report),
    behandlerTotalRows: buildImportedBehandlerTotalRows(workbook, rows, report, latestYear),
    report
  };
}

function buildImportReport(workbook: XLSX.WorkBook, fileName: string, workbookSheetNames = workbook.SheetNames): ImportReport {
  const sheetNames = workbookSheetNames;
  const presentSheets = requiredImportSheets.filter((sheet) => sheetNames.includes(sheet));
  const missingSheets = requiredImportSheets.filter((sheet) => !sheetNames.includes(sheet));
  const errors: string[] = [];
  const warnings: string[] = [];

  const sourceSheet = workbook.Sheets[importSourceSheetName];
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
  const latestBwaYear = latestActiveBwaYear(usableRows, standorteList) ?? 0;
  const sitesMissingLatestBwa = latestBwaYear
    ? standorteList.filter((site) =>
        !Array.from({ length: 12 }, (_, index) => index + 1).some((month) =>
          hasActiveBwaMonth(usableRows, site, latestBwaYear, month)
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
      (sum, site) =>
        sum + site.gesamtleistung * (site.materialquote + site.fremdlaborquote + (site.personalquote ?? 0) + site.sonstigeKostenquote),
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [previousPage, setPreviousPage] = useState<Page | null>(null);
  const [importedData, setImportedData] = useState<ImportedDashboardData | null>(null);
  const dashboardSites = useMemo(() => sortSitesByContractStart(importedData?.sites ?? []), [importedData?.sites]);
  const dashboardMonthly = importedData?.monthly ?? [];

  const selected = useMemo(
    () => dashboardSites.find((site) => site.id === selectedSite) ?? dashboardSites[0] ?? standorte[0],
    [dashboardSites, selectedSite]
  );

  useEffect(() => {
    if (window.localStorage.getItem(authStorageKey) === "true") {
      setAuthStep("app");
    }
    const savedImport = window.localStorage.getItem(importDashboardStorageKey);
    if (!savedImport) return;
    try {
      const parsedImport = JSON.parse(savedImport) as ImportedDashboardData;
      if (parsedImport.schemaVersion !== importDashboardSchemaVersion) {
        window.localStorage.removeItem(importDashboardStorageKey);
        window.localStorage.removeItem(importStorageKey);
        return;
      }
      const repairedImport = repairImportedCashflowData(parsedImport);
      window.localStorage.setItem(importDashboardStorageKey, JSON.stringify(repairedImport));
      setImportedData(repairedImport);
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
  const requiresImport = !["uploads", "admin", "reports"].includes(page);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-border bg-white/92 px-5 py-6 backdrop-blur lg:block">
        <Brand onClick={() => go("cockpit")} />
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
          <Brand compact onClick={() => go("cockpit")} />
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
          <div className="ml-auto flex h-dvh max-h-dvh w-80 max-w-[86vw] flex-col overflow-hidden bg-white p-5 shadow-soft">
            <div className="shrink-0 flex items-center justify-between">
              <Brand compact onClick={() => go("cockpit")} />
              <button
                aria-label="Menü schließen"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-7 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24 pr-1">
              <nav className="space-y-1">
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
        </div>
      )}

      <main className="w-full px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <NavigationControls
            page={page}
            previousPage={previousPage}
            onBack={() => go(previousPage ?? "cockpit")}
            onGo={go}
          />
          {requiresImport && !importedData && <NoImportState onUpload={() => go("uploads")} />}
          {importedData && page === "cockpit" && <Cockpit setPage={go} sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {importedData && page === "kennzahlen" && <KennzahlenEntwicklung sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {importedData && page === "performance" && <OrisusPerformance sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {importedData && page === "standorte" && (
            <Standorte
              sites={dashboardSites}
              onOpen={(id) => {
                setSelectedSite(id);
                go("standort-detail");
              }}
            />
          )}
          {importedData && page === "standort-detail" && <StandortDetail site={selected} importedData={importedData} monthlyData={dashboardMonthly} />}
          {importedData && page === "analysen" && <Analysen sites={dashboardSites} monthlyData={dashboardMonthly} />}
          {importedData && page === "bwa" && <Bwa importedData={importedData} sites={dashboardSites} monthlyData={dashboardMonthly} />}
          {importedData && page === "cashflow" && <Cashflow sites={dashboardSites} monthlyData={dashboardMonthly} />}
          {importedData && page === "darlehen" && <Darlehen sites={dashboardSites} />}
          {importedData && page === "banken" && <Bankenreporting sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {importedData && page === "board" && <BoardPack sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {page === "uploads" && <Uploads onImportConfirmed={(data) => setImportedData(repairImportedCashflowData(data))} onImportReset={() => setImportedData(null)} />}
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

function randomChallenge(length = 32) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return window.btoa(String.fromCharCode(...Array.from(new Uint8Array(buffer))));
}

function base64ToArrayBuffer(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
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
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const updateDeviceMode = () => {
      const hasTouch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
      setIsMobileDevice(hasTouch && isSmallScreen);
    };

    updateDeviceMode();
    window.addEventListener("resize", updateDeviceMode);
    return () => window.removeEventListener("resize", updateDeviceMode);
  }, []);

  const handlePasskeyLogin = async () => {
    setPasskeyMessage("");
    if (!isMobileDevice) {
      setPasskeyMessage("Face ID ist nur für den mobilen Login vorgesehen.");
      return;
    }
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setPasskeyMessage("Face ID wird von diesem Browser oder Gerät nicht unterstützt.");
      return;
    }

    setPasskeyBusy(true);
    try {
      const existingCredentialId = window.localStorage.getItem(passkeyStorageKey);

      if (existingCredentialId) {
        const credential = (await navigator.credentials.get({
          publicKey: {
            challenge: randomChallenge(),
            allowCredentials: [
              {
                id: base64ToArrayBuffer(existingCredentialId),
                type: "public-key"
              }
            ],
            timeout: 60000,
            userVerification: "required"
          }
        })) as PublicKeyCredential | null;

        if (!credential) throw new Error("no-passkey");
        setStep("app");
        return;
      }

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge(),
          rp: {
            name: "Orisus CFO Dashboard"
          },
          user: {
            id: new TextEncoder().encode("svend.neumann@orisus.de"),
            name: "svend.neumann@orisus.de",
            displayName: "Svend Neumann"
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
          ],
          authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
        }
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error("no-passkey");
      window.localStorage.setItem(passkeyStorageKey, arrayBufferToBase64(credential.rawId));
      setStep("app");
    } catch {
      setPasskeyMessage("Face ID konnte nicht bestätigt werden. Bitte erneut versuchen oder normal anmelden.");
    } finally {
      setPasskeyBusy(false);
    }
  };

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
              {isMobileDevice && (
                <Button className="w-full gap-2" variant="secondary" onClick={handlePasskeyLogin} disabled={passkeyBusy}>
                  <Fingerprint className="h-4 w-4" />
                  {passkeyBusy ? "Face ID wird geprüft ..." : "Mit Face ID anmelden"}
                </Button>
              )}
              <Button className="w-full" variant="secondary" onClick={() => setStep("forgot")}>
                Passwort vergessen
              </Button>
              {passkeyMessage && <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{passkeyMessage}</p>}
            </>
          )}
          {step === "login" && (
            <FormShell title="Anmelden" text="Interner Zugang für Svend Neumann.">
              <Input defaultValue="svend.neumann@orisus.de" type="email" aria-label="E-Mail" />
              <Input placeholder="Passwort" type="password" aria-label="Passwort" />
              <Button className="w-full" onClick={() => setStep("first-password")}>
                Einloggen
              </Button>
              {isMobileDevice && (
                <Button className="w-full gap-2" variant="secondary" onClick={handlePasskeyLogin} disabled={passkeyBusy}>
                  <Fingerprint className="h-4 w-4" />
                  {passkeyBusy ? "Face ID wird geprüft ..." : "Mit Face ID anmelden"}
                </Button>
              )}
              <Button className="w-full" variant="ghost" onClick={() => setStep("forgot")}>
                Passwort vergessen
              </Button>
              {passkeyMessage && <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{passkeyMessage}</p>}
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

function Brand({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <img
        src="/orisus-logo.png"
        alt="Orisus Zahnmedizin"
        className={cn("h-auto object-contain", compact ? "w-32" : "w-44")}
      />
      {!compact && <span className="sr-only">Orisus CFO Dashboard</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="flex items-center gap-3 rounded-md text-left transition hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-primary/30"
        onClick={onClick}
        aria-label="Zum Cockpit"
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center gap-3">{content}</div>;
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

function NoImportState({ onUpload }: { onUpload: () => void }) {
  return (
    <Card className="p-6">
      <div className="max-w-2xl">
        <Badge tone="yellow">Kein bestätigter Import</Badge>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Noch keine Excel-Daten aktiv</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Die App zeigt keine Demo- oder Beispielwerte mehr. Lade zuerst die konsolidierte Orisus-Arbeitsmappe hoch und bestätige den Import.
          Danach werden Cockpit, BWA, Standorte, Cashflow, Darlehen, Bankenreporting und Board-Pack aus dieser Datenbasis befüllt.
        </p>
        <Button className="mt-5" onClick={onUpload}>
          Zum Upload
        </Button>
      </div>
    </Card>
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
  const cockpitPeriod = defaultBwaPeriodFor(importedData);
  return (
    <section className="space-y-5">
      <PageTitle title="Daily CFO Cockpit" text="Konsolidierte Steuerung der Orisus-Gruppe: Liquidität, Ergebnis, Forderungen, Fremdkapital und Handlungsbedarf." />
      <DataStatusStrip importedData={importedData} />
      <DailyCfoCockpit sites={sites} monthlyData={monthlyData} />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title={`Ist EBITDA vs. EBITDA bei Übernahme | ${cockpitPeriod}`} icon={TrendingUp}>
          <EbitdaTakeoverChart sites={sites} />
        </ChartCard>
        <ChartCard title="Kostenquoten am Umsatz | seit Vertragsstart" icon={PieIcon}>
          <CostShareDonut sites={sites} />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Standortvergleich Gesamtleistung & EBITDA | seit Vertragsstart" icon={BarChart3}>
          <SitePerformanceChart sites={sites} />
        </ChartCard>
        <ChartCard title={`Top Behandler nach Honorarumsatz | ${cockpitPeriod}`} icon={BadgeEuro}>
          <TopBehandlerChart data={importedData?.topBehandler ?? []} />
        </ChartCard>
      </div>

      <StandortCfoComparison sites={sites} />

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <ChartCard title="Offene Forderungen je Standort | aktueller Stand" icon={FileBarChart}>
          <ReceivablesChart sites={sites} />
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
          {importedData ? new Date(importedData.importedAt).toLocaleString("de-DE") : "Noch kein bestätigter Excel-Import"}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Datenqualität</p>
        <div className="mt-1"><Badge tone={importedData?.report.status === "warning" ? "yellow" : importedData ? "green" : "red"}>{importedData ? "Import bestätigt" : "Keine aktiven Daten"}</Badge></div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Quelle</p>
        <p className="font-bold">{importedData?.fileName ?? "Kein Upload bestätigt"}</p>
      </div>
    </Card>
  );
}

function DailyCfoCockpit({ sites, monthlyData }: { sites: DashboardSite[]; monthlyData: typeof monthly }) {
  const metrics = cfoMetrics(sites, monthlyData);
  const riskLabel = metrics.kritisch.length ? metrics.kritisch.map((site) => site.name).join(", ") : "Keine roten Standorte";
  const cashflowDetails = sites.reduce(
    (sum, site) => ({
      vorlaeufigesErgebnis: sum.vorlaeufigesErgebnis + (site.cashflowDetails?.vorlaeufigesErgebnis ?? 0),
      abschreibungen: sum.abschreibungen + (site.cashflowDetails?.abschreibungen ?? 0),
      investitionsausgaben: sum.investitionsausgaben + (site.cashflowDetails?.investitionsausgaben ?? 0),
      tilgung: sum.tilgung + (site.cashflowDetails?.tilgung ?? 0),
      umbuchungZmvz: sum.umbuchungZmvz + (site.cashflowDetails?.umbuchungZmvz ?? 0),
      sonstigeRueckstellungenBestandsminderungen:
        sum.sonstigeRueckstellungenBestandsminderungen + (site.cashflowDetails?.sonstigeRueckstellungenBestandsminderungen ?? 0)
    }),
    {
      vorlaeufigesErgebnis: 0,
      abschreibungen: 0,
      investitionsausgaben: 0,
      tilgung: 0,
      umbuchungZmvz: 0,
      sonstigeRueckstellungenBestandsminderungen: 0
    }
  );

  const kpis = [
    {
      label: "Aktuelle Liquidität | aktueller Stand",
      value: metrics.kontostand,
      delta: "Konsolidierter Kontostand",
      icon: CircleDollarSign,
      status: metrics.kontostand > 500000 ? "green" : "yellow"
    },
    {
      label: "Free Cashflow | seit Vertragsstart",
      value: metrics.cashflow,
      delta: "nach Tilgung, Investitionen, Umbuchungen",
      icon: Wallet,
      status: metrics.cashflow >= 0 ? "green" : "red",
      info: (
        <div className="space-y-1">
          <p className="font-bold text-slate-900">Herleitung seit Vertragsstart</p>
          <InfoLine label="Vorläufiges Ergebnis" value={cashflowDetails.vorlaeufigesErgebnis} />
          <InfoLine label="+ Abschreibungen" value={cashflowDetails.abschreibungen} />
          <InfoLine label="- Investitionsausgaben" value={-cashflowDetails.investitionsausgaben} />
          <InfoLine label="- Tilgung" value={-cashflowDetails.tilgung} />
          <InfoLine label="- Umbuchung ZMVZ" value={-cashflowDetails.umbuchungZmvz} />
          <InfoLine label="- Sonstige Rückstellungen / Bestandsminderungen" value={-cashflowDetails.sonstigeRueckstellungenBestandsminderungen} />
          <div className="mt-2 border-t border-border pt-2">
            <InfoLine label="= CashFlow Gesamt" value={metrics.cashflow} strong />
          </div>
        </div>
      )
    },
    {
      label: "EBITDA | seit Vertragsstart",
      value: metrics.ebitda,
      delta: `${pct(metrics.ebitdaMarge)} Marge | Run-Rate ${eur(metrics.runRateEbitda, true)}`,
      icon: Banknote,
      status: metrics.ebitdaMarge >= 12 ? "green" : "yellow"
    },
    {
      label: "Kritische Standorte | aktueller Stand",
      value: metrics.kritisch.length,
      delta: riskLabel,
      icon: Building2,
      plain: true,
      status: metrics.kritisch.length ? "yellow" : "green"
    },
    {
      label: "Offene Forderungen | aktueller Stand",
      value: metrics.forderungen,
      delta: "Konsolidiert seit Vertragsstart",
      icon: FileBarChart,
      status: metrics.forderungen > metrics.gesamtleistung * 0.15 ? "yellow" : "green"
    },
    {
      label: "Fremdkapital | seit Vertragsstart",
      value: Math.max(0, metrics.aufgenommen - metrics.tilgung),
      delta: `${eur(metrics.aufgenommen, true)} aufgenommen | ${eur(metrics.tilgung, true)} getilgt`,
      icon: Landmark,
      status: metrics.kapitaldienstfaehigkeit >= 1.5 ? "green" : "yellow"
    }
  ] satisfies Array<{
    label: string;
    value: number;
    delta: string;
    icon: React.ComponentType<{ className?: string }>;
    plain?: boolean;
    status: Status;
    info?: React.ReactNode;
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
  plain,
  delta,
  icon: Icon,
  status,
  info
}: {
  label: string;
  value: number;
  percent?: boolean;
  plain?: boolean;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  status: Status;
  info?: React.ReactNode;
}) {
  const positive = !delta.startsWith("-");
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md table-total text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          {info && (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
              type="button"
              aria-label={`${label} erklären`}
              onClick={() => setInfoOpen((open) => !open)}
            >
              <Info className="h-4 w-4" />
            </button>
          )}
          <StatusDot status={status} />
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{plain ? value.toLocaleString("de-DE") : percent ? pct(value) : eur(value, true)}</p>
      <div className={cn("mt-3 flex items-center gap-1 text-sm font-semibold", positive ? "text-emerald-700" : "text-red-700")}>
        {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{delta}</span>
      </div>
      {infoOpen && info && <div className="mt-3 rounded-md border border-border bg-slate-50 p-3 text-xs leading-5 text-slate-700">{info}</div>}
      <p className="mt-2 text-xs text-muted-foreground">Ampelstatus nach vorläufiger CFO-Logik.</p>
    </Card>
  );
}

function InfoLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", strong && "font-bold text-slate-950")}>
      <span>{label}</span>
      <span className={cn("whitespace-nowrap text-right", value < 0 && "text-red-700", value > 0 && strong && "text-emerald-700")}>{eur(value)}</span>
    </div>
  );
}

function StatusDot({ status, label }: { status: Status; label?: string }) {
  return (
    <Badge tone={statusMap[status].tone}>
      <span className={cn("h-2 w-2 rounded-full", statusMap[status].dot)} />
      {label ?? statusMap[status].label}
    </Badge>
  );
}

function siteStatusLabel(site: DashboardSite) {
  if (site.status === "red" && site.cashflow < 0) return "Handlungsbedarf: Cashflow negativ";
  if (site.status === "red" && site.ebitdaMarge < 8) return "Handlungsbedarf: Marge niedrig";
  return statusMap[site.status].label;
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

function EbitdaTakeoverChart({ sites = standorte }: { sites?: DashboardSite[] }) {
  const chartData = sites
    .filter((site) => site.gesamtleistung > 0 || site.ebitda !== 0 || (site.darlehen.zielEbitdaUebernahme ?? site.darlehen.zielEbitda) !== 0)
    .map((site) => ({
      name: site.name,
      ebitda: site.ebitda,
      uebernahmeEbitda: site.darlehen.zielEbitdaUebernahme ?? site.darlehen.zielEbitda
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
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
  const revenue = totalForSites(sites, "gesamtleistung") || totalForSites(sites, "pvsUmsatz") || 1;
  const metrics = cfoMetrics(sites);
  const weightedValue = (key: "materialquote" | "fremdlaborquote" | "personalquote" | "sonstigeKostenquote") =>
    sites.reduce((sum, site) => sum + (site.gesamtleistung * Number(site[key] ?? 0)) / 100, 0);
  const personal = weightedValue("personalquote");
  const material = weightedValue("materialquote");
  const fremdlabor = weightedValue("fremdlaborquote");
  const weitereKosten = Math.max(0, revenue - totalForSites(sites, "ebitda") - personal - material - fremdlabor);
  const data = [
    { name: "Personal", value: Math.round(personal), color: "#0369a1" },
    { name: "Material", value: Math.round(material), color: "#0f766e" },
    { name: "Fremdlabor", value: Math.round(fremdlabor), color: "#0891b2" },
    { name: "Weitere operative Kosten", value: Math.round(weitereKosten), color: "#64748b" }
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
        <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
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
        <h2 className="font-bold">Standortvergleich CFO-Kennzahlen | seit Vertragsstart</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Konsolidierte Steuerungssicht je Standort seit Vertragsstart: Ergebnisqualität, Cashflow, Forderungen und Kostenquote.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
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
              const kostenquote = site.materialquote + site.fremdlaborquote + (site.personalquote ?? 0) + site.sonstigeKostenquote;
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

function TopBehandlerChart({ data = [] }: { data?: TopBehandlerEntry[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-md bg-slate-50 text-center text-sm font-semibold text-muted-foreground">
        Keine Behandlerdaten im bestätigten Import erkannt.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(v) => eur(Number(v), true)} />
        <YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => eur(Number(v))} labelFormatter={(label) => `${label} Honorarumsatz`} />
        <Bar dataKey="honorar" name="Honorarumsatz" fill="#0f766e" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ReceivablesChart({ sites = standorte }: { sites?: DashboardSite[] }) {
  const chartData = sites
    .filter((site) => site.gesamtleistung > 0 || site.forderungen > 0)
    .map((site) => ({ name: site.name, forderungen: site.forderungen }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
        <Tooltip formatter={(v) => eur(Number(v))} />
        <Bar dataKey="forderungen" name="Offene Forderungen" fill="#0f766e" radius={[5, 5, 0, 0]} />
      </BarChart>
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
      <h2 className="font-bold">{site ? `Kostenquoten ${site.name} | seit Vertragsstart` : "Kostenquoten | seit Vertragsstart"}</h2>
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
  const ebitdaTarget = (site: DashboardSite) => site.darlehen.zielEbitdaKaufvertrag ?? site.darlehen.zielEbitda;
  const ebitdaRankingStatus = (site: DashboardSite): Status => {
    const target = ebitdaTarget(site);
    if (target > 0) {
      const achievement = (site.ebitda / target) * 100;
      if (achievement >= 100) return "green";
      if (achievement >= 85) return "yellow";
      return "red";
    }
    if (site.ebitdaMarge >= 12) return "green";
    if (site.ebitdaMarge >= 8) return "yellow";
    return "red";
  };
  const performanceRankingStatus = (site: DashboardSite): Status => {
    if (site.gesamtleistung > 0) return "green";
    if (site.gesamtleistung === 0) return "yellow";
    return "red";
  };

  return (
    <Card className="p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((site) => {
          const status = metric === "ebitda" ? ebitdaRankingStatus(site) : performanceRankingStatus(site);
          const target = ebitdaTarget(site);
          const ebitdaProgress = target > 0 ? (site.ebitda / target) * 100 : site.ebitdaMarge * 4;
          return (
            <button key={site.id} className="w-full rounded-md bg-slate-50 p-3 text-left">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{site.name}</span>
                <StatusDot status={status} />
              </div>
              <div className="flex items-center gap-3">
                <Progress value={metric === "ebitda" ? ebitdaProgress : site.gesamtleistung / 13000} tone={statusMap[status].tone} />
                <span className="min-w-20 text-right text-sm font-bold">{eur(site[metric], true)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function CashflowBlock({ sites = standorte }: { sites?: DashboardSite[] }) {
  const totalCashflow = totalForSites(sites, "cashflow");
  const hasImportedDetails = sites.some((site) => site.cashflowDetails);
  const abschreibungen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.abschreibungen ?? 0), 0)
    : Math.round(totalForSites(sites, "gesamtleistung") * 0.17);
  const investitionen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.investitionsausgaben ?? 0), 0)
    : Math.round(totalForSites(sites, "gesamtleistung") * 0.035);
  const tilgung = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.tilgung ?? site.darlehen.tilgung), 0)
    : sites.reduce((sum, site) => sum + site.darlehen.tilgung, 0);
  const umbuchen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.umbuchungZmvz ?? 0), 0)
    : Math.round(totalForSites(sites, "gesamtleistung") * 0.025);
  const sonstigeRueckstellungen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.sonstigeRueckstellungenBestandsminderungen ?? 0), 0)
    : 0;
  const vorlaeufigesErgebnis = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.vorlaeufigesErgebnis ?? 0), 0)
    : totalCashflow - abschreibungen + investitionen + tilgung + umbuchen + sonstigeRueckstellungen;
  const rows = [
    ["Vorläufiges Ergebnis", vorlaeufigesErgebnis],
    ["+ Abschreibungen", abschreibungen],
    ["Investitionsausgaben", -investitionen],
    ["Tilgung", -tilgung],
    ["Umbuchung ZMVZ", -umbuchen],
    ["Sonstige Rückstellungen / Bestandsminderungen", -sonstigeRueckstellungen],
    ["Cashflow Gesamt", totalCashflow]
  ];
  return (
    <Card className="p-4">
      <h2 className="font-bold">Cashflow Gesamt | seit Vertragsstart</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Herleitung: Vorläufiges Ergebnis + Abschreibungen - Investitionen - Tilgung - Umbuchung ZMVZ - sonstige Adjustments.
      </p>
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
      <h2 className="font-bold">Kontostände | aktueller Stand</h2>
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
          <h2 className="font-bold">Fremdkapital & Tilgung | seit Vertragsstart</h2>
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
      <PageTitle title="Standorte" text="Kumulierte Standortwerte seit jeweiligem Vertragsstart; Kontostand und Forderungen als aktueller Stand." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => (
          <Card key={site.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{site.name}</h2>
                <p className="text-sm text-muted-foreground">Start in der Gruppe: {site.start}</p>
              </div>
              <StatusDot status={site.status} label={siteStatusLabel(site)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Mini label="Gesamtleistung seit Start" value={eur(site.gesamtleistung, true)} />
              <Mini label="EBITDA seit Start" value={eur(site.ebitda, true)} />
              <Mini label="Marge" value={pct(site.ebitdaMarge)} />
              <Mini label="Cashflow seit Start" value={eur(site.cashflow, true)} />
              <Mini label="Kontostand aktuell" value={eur(site.kontostand, true)} />
              <Mini label="Forderungen aktuell" value={eur(site.forderungen, true)} />
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

function buildImportedPvsRevenueRows(workbook: XLSX.WorkBook, rows: Record<string, unknown>[], report: ImportReport, latestYear: number): ImportedPeriodValueRow[] {
  const validYears = report.jahre.filter((year) => year > 1900);
  const dashboardMonthlyValues = dashboardPerformanceMonthlyValues(workbook, ["pvs_gesamtumsatz_inkl_fl_mat", "monats"]);
  const dashboardContractValues = dashboardPerformanceContractValues(workbook, ["pvs_gesamtumsatz_je_standort"]);
  return report.standorte.map((siteName) => {
    const fallback = standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? standorte[0];
    const siteRows = rows.filter((row) => asText(row.Standortname) === siteName && isOnOrAfterStart(row, fallback.start));
    const siteId = siteIdForName(siteName);
    const dashboardValuesForSite = dashboardMonthlyValues.get(siteId);
    const valuesByYear = Object.fromEntries(
      validYears.map((year) => [String(year), pvsTotalRevenueFromRows(siteRows.filter((row) => (rowYear(row) ?? 0) === year))])
    );
    const valuesByMonth: Record<string, number> = Object.fromEntries(
      validYears.flatMap((year) =>
        Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const dashboardValue = year === latestYear ? dashboardValuesForSite?.[month] : undefined;
          const value =
            dashboardValue ??
            pvsTotalRevenueFromRows(siteRows.filter((row) => (rowYear(row) ?? 0) === year && (rowMonth(row) ?? 0) === month));
          return [`${year}-${month}`, value];
        })
      )
    );
    if (dashboardValuesForSite) {
      valuesByYear[String(latestYear)] = Object.values(dashboardValuesForSite).reduce((sum, value) => sum + value, 0);
    }
    return {
      siteId,
      siteName,
      valuesByYear,
      valuesByMonth,
      contractValue: dashboardContractValues.get(siteId) ?? pvsTotalRevenueFromRows(siteRows)
    };
  });
}

function buildImportedBehandlerHonorarRows(rows: Record<string, unknown>[], report: ImportReport): ImportedPeriodValueRow[] {
  const validYears = report.jahre.filter((year) => year > 1900);
  return report.standorte.map((siteName) => {
    const fallback = standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? standorte[0];
    const siteRows = rows.filter((row) => asText(row.Standortname) === siteName && isOnOrAfterStart(row, fallback.start));
    const valuesByYear = Object.fromEntries(
      validYears.map((year) => [String(year), pureBehandlerHonorarFromRows(siteRows.filter((row) => (rowYear(row) ?? 0) === year))])
    );
    const valuesByMonth = Object.fromEntries(
      validYears.flatMap((year) =>
        Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const value = pureBehandlerHonorarFromRows(siteRows.filter((row) => (rowYear(row) ?? 0) === year && (rowMonth(row) ?? 0) === month));
          return [`${year}-${month}`, value];
        })
      )
    );
    return {
      siteId: siteIdForName(siteName),
      siteName,
      valuesByYear,
      valuesByMonth,
      contractValue: pureBehandlerHonorarFromRows(siteRows)
    };
  });
}

function dashboardPerformanceMonthlyValues(workbook: XLSX.WorkBook, titleTerms: string[]) {
  const sheet = workbook.Sheets["Dashboard_Performance"];
  if (!sheet) return new Map<string, Record<number, number>>();

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });
  const titleRowIndex = rows.findIndex((row) =>
    row.some((cell) => {
      const key = normalizeMetric(cell);
      return titleTerms.every((term) => key.includes(normalizeMetric(term)));
    })
  );
  if (titleRowIndex < 0) return new Map<string, Record<number, number>>();

  const headerRowIndex = rows.findIndex((row, index) => index > titleRowIndex && row.some((cell) => normalizeMetric(cell) === "standort"));
  if (headerRowIndex < 0) return new Map<string, Record<number, number>>();

  const headerRow = rows[headerRowIndex] ?? [];
  const siteColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "standort");
  const monthColumns = headerRow
    .map((cell, column) => ({ column, month: monthNumberFromHeader(cell) }))
    .filter((entry): entry is { column: number; month: number } => entry.month != null);
  const valuesBySite = new Map<string, Record<number, number>>();

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const siteName = asText(row[siteColumn]);
    if (!siteName || normalizeMetric(siteName) === "gesamt") continue;
    if (!standorte.some((site) => site.name.toLowerCase() === siteName.toLowerCase())) break;
    const values = Object.fromEntries(
      monthColumns
        .map(({ column, month }) => [month, asNumber(row[column])])
        .filter((entry): entry is [number, number] => entry[1] != null)
    );
    valuesBySite.set(siteIdForName(siteName), values);
  }

  return valuesBySite;
}

function dashboardPerformanceBehandlerMonthlyValues(workbook: XLSX.WorkBook) {
  return dashboardPerformanceMonthlyValues(workbook, ["behandlerumsatz_inkl_eigenlabor", "monats"]);
}

function dashboardPerformanceContractValues(workbook: XLSX.WorkBook, titleTerms: string[]) {
  const sheet = workbook.Sheets["Dashboard_Performance"];
  if (!sheet) return new Map<string, number>();

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });
  const titleRowIndex = rows.findIndex((row) =>
    row.some((cell) => {
      const key = normalizeMetric(cell);
      return titleTerms.every((term) => key.includes(normalizeMetric(term)));
    })
  );
  if (titleRowIndex < 0) return new Map<string, number>();

  const headerRowIndex = rows.findIndex((row, index) => index > titleRowIndex && row.some((cell) => normalizeMetric(cell) === "standort"));
  if (headerRowIndex < 0) return new Map<string, number>();

  const headerRow = rows[headerRowIndex] ?? [];
  const siteColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "standort");
  const contractColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "seit_ubernahme" || normalizeMetric(cell) === "seit_uebernahme");
  if (siteColumn < 0 || contractColumn < 0) return new Map<string, number>();

  const valuesBySite = new Map<string, number>();
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const siteName = asText(row[siteColumn]);
    if (!siteName || normalizeMetric(siteName) === "gesamt") continue;
    if (!standorte.some((site) => site.name.toLowerCase() === siteName.toLowerCase())) break;
    const value = asNumber(row[contractColumn]);
    if (value != null) valuesBySite.set(siteIdForName(siteName), value);
  }

  return valuesBySite;
}

function buildImportedBehandlerTotalRows(workbook: XLSX.WorkBook, rows: Record<string, unknown>[], report: ImportReport, latestYear: number): ImportedPeriodValueRow[] {
  const validYears = report.jahre.filter((year) => year > 1900);
  const dashboardMonthlyValues = dashboardPerformanceBehandlerMonthlyValues(workbook);
  const dashboardContractValues = dashboardPerformanceContractValues(workbook, ["behandlerumsatz_je_standort"]);
  return report.standorte.map((siteName) => {
    const fallback = standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? standorte[0];
    const siteRows = rows.filter((row) => asText(row.Standortname) === siteName && isOnOrAfterStart(row, fallback.start));
    const siteId = siteIdForName(siteName);
    const dashboardValuesForSite = dashboardMonthlyValues.get(siteId);
    const valuesByYear = Object.fromEntries(
      validYears.map((year) => [String(year), behandlerTotalRevenueFromRows(siteRows.filter((row) => (rowYear(row) ?? 0) === year))])
    );
    const valuesByMonth: Record<string, number> = Object.fromEntries(
      validYears.flatMap((year) =>
        Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const dashboardValue = year === latestYear ? dashboardValuesForSite?.[month] : undefined;
          const value =
            dashboardValue ??
            behandlerTotalRevenueFromRows(siteRows.filter((row) => (rowYear(row) ?? 0) === year && (rowMonth(row) ?? 0) === month));
          return [`${year}-${month}`, value];
        })
      )
    );
    if (dashboardValuesForSite) {
      valuesByYear[String(latestYear)] = Object.values(dashboardValuesForSite).reduce((sum, value) => sum + value, 0);
    }
    return {
      siteId,
      siteName,
      valuesByYear,
      valuesByMonth,
      contractValue: dashboardContractValues.get(siteId) ?? behandlerTotalRevenueFromRows(siteRows)
    };
  });
}

function bwaPeriodOptionsFor(importedData?: ImportedDashboardData | null) {
  if (!importedData?.bwaRows?.length) return bwaPeriodOptions;
  const years = importedData.report.jahre.filter((year) => year >= 1900);
  const options = years.flatMap((year) => {
    const activeMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
      importedData.bwaRows.some((row) => row.hasDataByMonth[`${year}-${month}`])
    );
    const latestMonth = activeMonths.at(-1);
    return [
      `Geschäftsjahr ${year}`,
      ...(latestMonth ? [`YTD ${year} bis ${bwaMonths[latestMonth - 1]}`] : []),
      ...activeMonths.map((month) => `${bwaMonths[month - 1]} ${year}`)
    ];
  });
  return [...options, "Gesamte Periode"];
}

function defaultBwaPeriodFor(importedData?: ImportedDashboardData | null) {
  const options = bwaPeriodOptionsFor(importedData);
  return options.findLast((option) => option.startsWith("YTD ")) ?? options.find((option) => option.startsWith("Geschäftsjahr 2026")) ?? options[0];
}

function BwaStatement({ title, siteId, importedData }: { title: string; siteId?: string; importedData?: ImportedDashboardData | null }) {
  const availablePeriods = bwaPeriodOptionsFor(importedData);
  const [period, setPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  useEffect(() => {
    if (!availablePeriods.includes(period)) {
      setPeriod(defaultBwaPeriodFor(importedData));
    }
  }, [availablePeriods, importedData, period]);
  if (!siteId) {
    return <ConsolidatedBwaMatrix title={title} period={period} setPeriod={setPeriod} importedData={importedData} availablePeriods={availablePeriods} />;
  }

  const rows = importedData?.bwaRows?.length ? buildImportedBwaLines(importedData.bwaRows, period, siteId) : [];
  const contractRows = importedData?.bwaRows?.length ? buildImportedBwaLines(importedData.bwaRows, "Gesamte Periode", siteId) : [];
  const activeSites = siteId ? (importedData?.sites ?? []).filter((site) => site.id === siteId) : (importedData?.sites ?? []);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aus bestätigtem Excel-Import abgeleitet.
          </p>
        </div>
        <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
          {availablePeriods.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </div>
      <div className="max-h-[72vh] overflow-auto">
        <div className="min-w-[840px]">
          <div className="sticky top-0 z-20 grid grid-cols-[1.35fr_1fr_1fr] gap-3 border-b border-border bg-slate-50 p-3 text-xs font-bold uppercase text-muted-foreground shadow-sm">
            <span>Position</span>
            <span className="text-right">{period}</span>
            <span className="text-right">Vertragsperiode seit Start</span>
          </div>
          {rows.map((row, index) => {
            const contractRow = contractRows[index] ?? row;
            const isSectionRow = row.emphasis && row.actual === 0 && !row.percent;
            return (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-[1.35fr_1fr_1fr] gap-3 border-b border-border p-3 text-sm last:border-0",
                  row.emphasis && "table-total font-bold",
                  row.kind === "cashflow" && "table-cashflow"
                )}
              >
                <span className={cn(row.indent && "pl-5 text-muted-foreground")}>{row.label}</span>
                <span className={cn("text-right font-semibold", bwaValueToneClass(row.actual, row.label))}>
                  {isSectionRow ? "" : row.percent ? pct(row.actual) : eur(row.actual)}
                </span>
                <span className={cn("text-right font-semibold", bwaValueToneClass(contractRow.actual, contractRow.label))}>
                  {isSectionRow ? "" : contractRow.percent ? pct(contractRow.actual) : eur(contractRow.actual)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 border-t border-border bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <Mini label="Ausgewählte Standorte" value={activeSites.map((site) => site.name).join(", ")} />
        <Mini label="Periode" value={period} />
        <Mini label="Datenstatus" value={importedData ? "Excel-Import bestätigt" : "Kein Import aktiv"} />
      </div>
    </Card>
  );
}

function ConsolidatedBwaMatrix({
  title,
  period,
  setPeriod,
  importedData,
  availablePeriods
}: {
  title: string;
  period: string;
  setPeriod: (value: string) => void;
  importedData?: ImportedDashboardData | null;
  availablePeriods: string[];
}) {
  const sourceSites = sortSitesByContractStart(importedData?.sites ?? []);
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
    : [];
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
          {availablePeriods.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </div>
      <div className="max-h-[72vh] overflow-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 table-label-col border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
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
              <th className="sticky left-0 top-[45px] z-30 table-label-col border-b border-r border-border table-subhead p-2 text-left text-xs font-semibold text-white">
                {period}
              </th>
              {groups.map((group) => (
                <FragmentHeaders key={group.id} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rowTemplate.map((row, rowIndex) => (
              <tr key={row.label} className={cn(row.emphasis && "summary-row")}>
                <td
                  className={cn(
                    "sticky left-0 z-10 table-label-col border-b border-r border-border bg-white p-2 font-semibold",
                    row.indent && "pl-6 font-medium text-muted-foreground",
                    row.percent && "text-xs",
                    row.emphasis && "table-total font-bold text-foreground",
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
      <th className="sticky top-[45px] z-20 table-number-col border-b border-r border-border table-subhead p-2 text-right text-xs font-semibold text-white">
        Ist
      </th>
      <th className="sticky top-[45px] z-20 table-small-number-col border-b border-r border-border table-subhead p-2 text-right text-xs font-semibold text-white">
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
        <td className="table-number-col border-b border-r border-border bg-slate-50 p-2 text-right text-muted-foreground">-</td>
        <td className="table-small-number-col border-b border-r border-border bg-slate-50 p-2 text-right text-muted-foreground">-</td>
      </>
    );
  }
  const isSectionRow = row.emphasis && row.actual === 0 && !row.percent;
  if (isSectionRow) {
    return (
      <>
        <td className={cn("table-number-col border-b border-r border-border bg-white p-2", row.kind === "cashflow" && "table-cashflow")} />
        <td className={cn("table-small-number-col border-b border-r border-border bg-white p-2", row.kind === "cashflow" && "table-cashflow")} />
      </>
    );
  }
  return (
    <>
      <td
        className={cn(
          "table-number-col border-b border-r border-border bg-white p-2 text-right font-semibold tabular-nums",
          row.percent && "text-xs",
          row.percent && "table-ratio",
          bwaValueToneClass(row.actual, row.label),
          row.emphasis && "table-total font-bold text-foreground",
          row.kind === "cashflow" && "table-cashflow"
        )}
      >
        {row.percent ? pct(row.actual) : eur(row.actual)}
      </td>
      <td
        className={cn(
          "table-small-number-col border-b border-r border-border bg-white p-2 text-right text-muted-foreground tabular-nums",
          row.percent && "text-xs",
          row.percent && "table-ratio",
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
  const selection = selectedBwaPeriod(period);
  const rows = importedRows.filter((row) => row.siteId === siteId);
  if (!selection.year) return rows.some((row) => row.contractValue !== 0 || Object.values(row.hasDataByYear).some(Boolean));
  if (selection.months?.length) return rows.some((row) => selection.months?.some((month) => row.hasDataByMonth[`${selection.year}-${month}`]));
  return rows.some((row) => row.hasDataByYear[String(selection.year)]);
}

function selectedBwaPeriod(period: string) {
  const match = period.match(/20\d{2}/);
  const year = match ? Number(match[0]) : null;
  if (!year) return { year: null, months: null };
  const ytdMatch = period.match(/^YTD\s+20\d{2}\s+bis\s+([A-Za-zÄÖÜäöü]+)/);
  if (ytdMatch) {
    const monthIndex = bwaMonths.findIndex((month) => month.toLowerCase() === ytdMatch[1].toLowerCase());
    if (monthIndex >= 0) {
      return { year, months: Array.from({ length: monthIndex + 1 }, (_, index) => index + 1) };
    }
  }
  const monthMatch = period.match(/^([A-Za-zÄÖÜäöü]+)\s+20\d{2}$/);
  if (monthMatch) {
    const monthIndex = bwaMonths.findIndex((month) => month.toLowerCase() === monthMatch[1].toLowerCase());
    if (monthIndex >= 0) return { year, months: [monthIndex + 1] };
  }
  return { year, months: null };
}

function importedPeriodValue(row: Pick<ImportedBwaRow, "valuesByYear" | "valuesByMonth" | "contractValue"> | undefined, period: string) {
  if (!row) return 0;
  const selection = selectedBwaPeriod(period);
  if (selection.year && selection.months?.length) {
    return selection.months.reduce((sum, month) => sum + (row.valuesByMonth[`${selection.year}-${month}`] ?? 0), 0);
  }
  if (selection.year) return row.valuesByYear[String(selection.year)] ?? 0;
  return row.contractValue;
}

function importedBwaMetricValue(importedRows: ImportedBwaRow[] | undefined, siteId: string, metricKey: string, period: string) {
  return importedPeriodValue(importedRows?.find((row) => row.siteId === siteId && row.metricKey === metricKey), period);
}

function repairImportedCashflowData(importedData: ImportedDashboardData): ImportedDashboardData {
  if (!importedData.bwaRows?.length) return importedData;
  const rowsBySiteMetric = new Map(importedData.bwaRows.map((row) => [`${row.siteId}:${row.metricKey}`, row]));
  const rowFor = (siteId: string, metricKey: string) => rowsBySiteMetric.get(`${siteId}:${metricKey}`);
  const cashflowValue = (siteId: string, periodKey?: string) => {
    const valueFrom = (metricKey: string) => {
      const row = rowFor(siteId, metricKey);
      if (!row) return 0;
      if (!periodKey) return row.contractValue;
      if (periodKey.includes("-")) return row.valuesByMonth[periodKey] ?? 0;
      return row.valuesByYear[periodKey] ?? 0;
    };
    const abschreibungen = valueFrom("cf_abschreibungen") || valueFrom("abschreibungen");
    return (
      valueFrom("vorlaeufiges_ergebnis") +
      Math.abs(abschreibungen) -
      Math.abs(valueFrom("investitionsausgaben")) -
      Math.abs(valueFrom("tilgung")) -
      Math.abs(valueFrom("umbuchung_zmvz")) -
      Math.abs(valueFrom("sonstige_rueckstellungen_bestandsminderungen"))
    );
  };

  const bwaRows = importedData.bwaRows.map((row) => {
    if (row.metricKey !== "cashflow_gesamt") return row;
    const valuesByYear = Object.fromEntries(Object.keys(row.valuesByYear).map((periodKey) => [periodKey, cashflowValue(row.siteId, periodKey)]));
    const valuesByMonth = Object.fromEntries(Object.keys(row.valuesByMonth).map((periodKey) => [periodKey, cashflowValue(row.siteId, periodKey)]));
    return {
      ...row,
      valuesByYear,
      valuesByMonth,
      contractValue: cashflowValue(row.siteId)
    };
  });

  const sites = importedData.sites.map((site) => {
    const details = {
      vorlaeufigesErgebnis: Math.round(rowFor(site.id, "vorlaeufiges_ergebnis")?.contractValue ?? site.cashflowDetails?.vorlaeufigesErgebnis ?? 0),
      abschreibungen: Math.abs(
        Math.round(
          rowFor(site.id, "cf_abschreibungen")?.contractValue ??
            rowFor(site.id, "abschreibungen")?.contractValue ??
            site.cashflowDetails?.abschreibungen ??
            0
        )
      ),
      investitionsausgaben: Math.abs(Math.round(rowFor(site.id, "investitionsausgaben")?.contractValue ?? site.cashflowDetails?.investitionsausgaben ?? 0)),
      tilgung: Math.abs(Math.round(rowFor(site.id, "tilgung")?.contractValue ?? site.cashflowDetails?.tilgung ?? site.darlehen.tilgung ?? 0)),
      umbuchungZmvz: Math.abs(Math.round(rowFor(site.id, "umbuchung_zmvz")?.contractValue ?? site.cashflowDetails?.umbuchungZmvz ?? 0)),
      sonstigeRueckstellungenBestandsminderungen: Math.abs(
        Math.round(
          rowFor(site.id, "sonstige_rueckstellungen_bestandsminderungen")?.contractValue ??
            site.cashflowDetails?.sonstigeRueckstellungenBestandsminderungen ??
            0
        )
      )
    };
    const cashflow = Math.round(
      details.vorlaeufigesErgebnis +
        details.abschreibungen -
        details.investitionsausgaben -
        details.tilgung -
        details.umbuchungZmvz -
        details.sonstigeRueckstellungenBestandsminderungen
    );
    return { ...site, cashflow, cashflowDetails: details };
  });

  return { ...importedData, sites, bwaRows };
}

function filteredSiteForPeriod(site: DashboardSite, importedData: ImportedDashboardData | null | undefined, period: string): DashboardSite {
  if (!importedData?.bwaRows?.length) return site;
  const siteId = site.id;
  const gesamtleistung = Math.round(importedBwaMetricValue(importedData.bwaRows, siteId, "summe_umsatz", period));
  const ebitda = Math.round(importedBwaMetricValue(importedData.bwaRows, siteId, "ebitda", period));
  const cashflow = Math.round(importedBwaMetricValue(importedData.bwaRows, siteId, "cashflow_gesamt", period));
  const pvsRow = importedData.pvsRevenueRows?.find((row) => row.siteId === siteId);
  const pvsUmsatz = Math.round(pvsRow ? importedPeriodValue(pvsRow, period) : site.pvsUmsatz);
  const material = Math.abs(importedBwaMetricValue(importedData.bwaRows, siteId, "materialkosten_gesamt", period));
  const fremdlabor = Math.abs(importedBwaMetricValue(importedData.bwaRows, siteId, "fremdlabor_gesamt", period));
  const personal = Math.abs(importedBwaMetricValue(importedData.bwaRows, siteId, "personalkosten_gesamt", period));
  const ebitdaMarge = gesamtleistung ? (ebitda / gesamtleistung) * 100 : 0;
  const materialquote = gesamtleistung ? (material / gesamtleistung) * 100 : 0;
  const fremdlaborquote = gesamtleistung ? (fremdlabor / gesamtleistung) * 100 : 0;
  const personalquote = gesamtleistung ? (personal / gesamtleistung) * 100 : 0;
  const sonstigeKostenquote = gesamtleistung ? Math.max(0, 100 - ebitdaMarge - materialquote - fremdlaborquote - personalquote) : 0;
  const status: Status = ebitdaMarge < 8 || cashflow < 0 ? "red" : ebitdaMarge < 12 ? "yellow" : "green";

  return {
    ...site,
    gesamtleistung,
    pvsUmsatz,
    ebitda,
    ebitdaMarge,
    cashflow,
    materialquote,
    fremdlaborquote,
    personalquote,
    sonstigeKostenquote,
    status
  };
}

function buildImportedBwaLines(importedRows: ImportedBwaRow[], period: string, siteId?: string): BwaLine[] {
  const selection = selectedBwaPeriod(period);
  const siteIds = siteId ? [siteId] : Array.from(new Set(importedRows.map((row) => row.siteId)));
  return bwaMetricDefinitions.map((definition) => {
    const sourceRows = importedRows.filter((row) => row.metricKey === definition.key && (!siteId || row.siteId === siteId));
    const isPercent = definitionFlag(definition, "percent");
    const isEmphasis = definitionFlag(definition, "emphasis");
    const quoteActual = isPercent
      ? calculateImportedQuote(importedRows, siteIds, definition.key, selection)
      : 0;
    const actual = sourceRows.reduce((sum, row) => {
      if (definition.key.startsWith("section_")) return 0;
      if (selection.year && selection.months?.length) {
        return sum + selection.months.reduce((monthSum, month) => monthSum + (row.valuesByMonth[`${selection.year}-${month}`] ?? 0), 0);
      }
      if (selection.year) return sum + (row.valuesByYear[String(selection.year)] ?? 0);
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

function calculateImportedQuote(importedRows: ImportedBwaRow[], siteIds: string[], key: string, selection = { year: null as number | null, months: null as number[] | null }) {
  const value = (metricKey: string) =>
    importedRows
      .filter((row) => siteIds.includes(row.siteId) && row.metricKey === metricKey)
      .reduce((sum, row) => {
        if (selection.year && selection.months?.length) {
          return sum + selection.months.reduce((monthSum, month) => monthSum + (row.valuesByMonth[`${selection.year}-${month}`] ?? 0), 0);
        }
        if (selection.year) return sum + (row.valuesByYear[String(selection.year)] ?? 0);
        return sum + row.contractValue;
      }, 0);
  const performance = value("summe_umsatz");
  if (key === "gesamtleistungsquote") return performance ? 100 : 0;
  if (key === "praxisleistungsquote") return ratio(value("gesamtleistung_abzueglich_fremdlabor_material"), performance);
  if (key === "deckungsbeitragsquote") return ratio(value("deckungsbeitrag"), performance);
  if (key === "ebitda_marge") return ratio(value("ebitda"), performance);
  if (key === "ergebnisquote") return ratio(value("vorlaeufiges_ergebnis"), performance);
  if (key === "cashflow_quote") return ratio(value("cashflow_gesamt"), performance);
  if (key === "abweichung_ziel_ebitda_kaufvertrag_pct") {
    return ratio(value("abweichung_ziel_ebitda_kaufvertrag_abs"), value("ziel_ebitda_kaufvertrag"));
  }
  if (key === "abweichung_ziel_ebitda_uebernahme_pct") {
    return ratio(value("abweichung_ziel_ebitda_uebernahme_abs"), value("ziel_ebitda_uebernahme"));
  }
  return 0;
}

function buildBwaRows(period: string, siteId?: string) {
  const factor = period === "Geschäftsjahr 2024" ? 0.28 : period === "Geschäftsjahr 2025" ? 0.72 : period === "Gesamte Periode" ? 1 : 0.86;
  const sites = siteId ? sortSitesByContractStart(standorte).filter((site) => site.id === siteId) : sortSitesByContractStart(standorte);
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
  const activeMonthCount = rows.find((row) => !row.section)?.months.filter((value) => value !== null).length || 1;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Monatliche BWA bis Cashflow {site.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jan bis Dez, Gesamt, Vorjahr, Durchschnitt und gesamte Vertragsperiode seit {site.start}.
          </p>
        </div>
        <Select value={year} onChange={(event) => setYear(event.target.value)}>
          <option>2024</option>
          <option>2025</option>
          <option>2026</option>
        </Select>
      </div>
      <div className="max-h-[72vh] overflow-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 table-label-col border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                BWA-Position
              </th>
              {bwaMonths.map((month) => (
                <th key={month} className="sticky top-0 z-20 table-small-number-col border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                  {month}
                </th>
              ))}
              <th className="sticky top-0 z-20 table-number-col border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                Gesamt
              </th>
              <th className="sticky top-0 z-20 table-number-col border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                Vorjahr
              </th>
              <th className="sticky top-0 z-20 table-number-col border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                Durchschnitt
              </th>
              <th className="sticky top-0 z-20 table-number-col border-b border-r border-border table-head p-3 text-right text-xs font-bold uppercase text-white">
                Vertragsperiode
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totalValue = row.months.reduce<number>((sum, value) => sum + (value ?? 0), 0);
              const average = totalValue / activeMonthCount;
              return (
                <tr key={row.label} className={cn(row.emphasis && !row.section && "summary-row")}>
                  <td
                    className={cn(
                      "sticky left-0 z-10 table-label-col border-b border-r border-border bg-white p-2 font-semibold",
                      row.indent && "pl-6 font-medium text-muted-foreground",
                      row.section && "table-total font-bold text-foreground",
                      row.percent && "text-xs",
                      row.emphasis && "table-total font-bold text-foreground",
                      row.kind === "cashflow" && "table-cashflow"
                    )}
                  >
                    {row.label}
                  </td>
                  {row.months.map((value, index) => (
                    <td
                      key={`${row.label}-${bwaMonths[index]}`}
                      className={bwaTableNumberClass(row, value, { compact: true })}
                    >
                      {row.section ? "" : formatBwaCell(value, row.percent)}
                    </td>
                  ))}
                  <td className={bwaTableNumberClass(row, totalValue, { bold: true })}>
                    {row.section ? "" : formatBwaCell(totalValue, row.percent)}
                  </td>
                  <td className={bwaTableNumberClass(row, row.previousYear, { muted: true })}>
                    {row.section ? "" : formatBwaCell(row.previousYear ?? null, row.percent)}
                  </td>
                  <td className={bwaTableNumberClass(row, average, { muted: true })}>
                    {row.section ? "" : formatBwaCell(average, row.percent)}
                  </td>
                  <td className={bwaTableNumberClass(row, row.contract, { bold: true })}>
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
    previousYear: options?.section ? null : Math.round(annualValue * (year === 2024 ? 0 : year === 2025 ? 0.28 : 0.72)),
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
      const month = index + 1;
      if (definition.key.startsWith("section_")) return null;
      if (!hasImportedMetricMonthValue(importedRows, siteId, definition.key, year, month)) return null;
      if (isPercent) return calculateImportedMonthlyQuote(importedRows, siteId, definition.key, year, month);
      return sourceRows.reduce((sum, row) => sum + (row.valuesByMonth[`${year}-${month}`] ?? 0), 0);
    });
    const activeMonths = months
      .map((value, index) => (value === null ? null : index + 1))
      .filter((value): value is number => Boolean(value));
    const previousYear = year - 1;
    const hasPreviousYearData = activeMonths.some((month) => hasImportedMetricMonthValue(importedRows, siteId, definition.key, previousYear, month));
    const previousYearValue = hasPreviousYearData
      ? isPercent
        ? calculateImportedPeriodQuote(importedRows, [siteId], definition.key, previousYear, activeMonths)
        : sourceRows.reduce(
            (sum, row) =>
              sum +
              activeMonths.reduce((monthSum, month) => monthSum + (row.valuesByMonth[`${previousYear}-${month}`] ?? 0), 0),
            0
          )
      : null;
    const contractValue = isPercent
      ? calculateImportedQuote(importedRows, [siteId], definition.key)
      : sourceRows.reduce((sum, row) => sum + row.contractValue, 0);
    return {
      label: definition.label,
      months,
      previousYear: previousYearValue,
      contract: contractValue,
      indent: !isEmphasis && !definition.key.startsWith("section_"),
      emphasis: isEmphasis,
      section: definition.key.startsWith("section_"),
      percent: isPercent,
      kind: definitionKind(definition)
    };
  });
}

function hasImportedSiteMonthData(importedRows: ImportedBwaRow[], siteId: string, year: number, month: number) {
  return importedRows.some((row) => row.siteId === siteId && row.hasDataByMonth[`${year}-${month}`]);
}

function hasImportedMetricMonthValue(importedRows: ImportedBwaRow[], siteId: string, metricKey: string, year: number, month: number) {
  return importedRows.some((row) => row.siteId === siteId && row.metricKey === metricKey && row.hasValueByMonth[`${year}-${month}`]);
}

function calculateImportedPeriodQuote(importedRows: ImportedBwaRow[], siteIds: string[], key: string, year: number, months: number[]) {
  return calculateImportedQuote(importedRows, siteIds, key, { year, months });
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
  if (key === "abweichung_ziel_ebitda_kaufvertrag_pct") {
    return ratio(value("abweichung_ziel_ebitda_kaufvertrag_abs"), value("ziel_ebitda_kaufvertrag"));
  }
  if (key === "abweichung_ziel_ebitda_uebernahme_pct") {
    return ratio(value("abweichung_ziel_ebitda_uebernahme_abs"), value("ziel_ebitda_uebernahme"));
  }
  return 0;
}

function formatBwaCell(value: number | null, percent?: boolean) {
  if (value === null) return "";
  return percent ? pct(value) : eur(value);
}

function isVarianceRow(label: string) {
  const normalized = label.toLowerCase();
  return normalized.includes("abw.") || normalized.includes("abweichung") || normalized.includes("delta") || normalized.includes("Δ");
}

function valueToneClass(value: number | null | undefined, active = true) {
  if (!active || value == null || value === 0) return "";
  return value > 0 ? "text-emerald-700" : "text-red-700";
}

function bwaValueToneClass(value: number | null | undefined, label: string) {
  if (value == null || value === 0) return "";
  if (value < 0) return "text-red-700";
  return isVarianceRow(label) ? "text-emerald-700" : "";
}

function bwaTableNumberClass(
  row: { label: string; percent?: boolean; emphasis?: boolean; section?: boolean; kind?: "cashflow" },
  value: number | null | undefined,
  options: { compact?: boolean; muted?: boolean; bold?: boolean } = {}
) {
  const tone = bwaValueToneClass(value, row.label);
  return cn(
    options.compact ? "table-small-number-col" : "table-number-col",
    "border-b border-r border-border bg-white p-2 text-right tabular-nums",
    options.bold && "font-bold",
    options.muted && !tone && "text-muted-foreground",
    row.percent && "text-xs table-ratio",
    row.emphasis && !row.section && "table-total font-bold",
    row.emphasis && !row.section && !tone && "text-foreground",
    row.kind === "cashflow" && "table-cashflow",
    tone
  );
}

function StandortDetail({
  site,
  importedData,
  monthlyData = monthly
}: {
  site: DashboardSite;
  importedData?: ImportedDashboardData | null;
  monthlyData?: typeof monthly;
}) {
  const availablePeriods = bwaPeriodOptionsFor(importedData);
  const [period, setPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  useEffect(() => {
    if (!availablePeriods.includes(period)) {
      setPeriod(defaultBwaPeriodFor(importedData));
    }
  }, [availablePeriods, importedData, period]);
  const filteredSite = filteredSiteForPeriod(site, importedData, period);
  const periodLabel = period === "Gesamte Periode" ? `seit Vertragsstart ${site.start}` : period;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle title={site.name} text={`Standortdetail ${periodLabel}.`} />
        <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
          {availablePeriods.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Gesamtleistung" value={filteredSite.gesamtleistung} delta={periodLabel} icon={TrendingUp} status={filteredSite.status} />
        <KpiCard label="PVS-Umsatz" value={filteredSite.pvsUmsatz} delta={periodLabel} icon={BadgeEuro} status={filteredSite.status} />
        <KpiCard label="EBITDA" value={filteredSite.ebitda} delta={`${pct(filteredSite.ebitdaMarge)} Marge`} icon={Banknote} status={filteredSite.status} />
        <KpiCard label="Cashflow" value={filteredSite.cashflow} delta="nach vorläufigem Ergebnis" icon={Wallet} status={filteredSite.status} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <CostRatios site={filteredSite} />
        <ChartCard title="Entwicklung über Zeit" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
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

function KennzahlenEntwicklung({
  sites = standorte,
  monthlyData = monthly,
  importedData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
}) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  const targetBySite = Object.fromEntries(activeSites.map((site) => [site.id, site.darlehen.zielEbitda])) as Record<string, number>;
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
          Auswertung: bestätigter Import | Standorte seit jeweiligem Vertragsstart | Quelle: {importedData?.fileName ?? "Kein Upload bestätigt"}
        </div>
        <div className="grid gap-px table-grid-bg md:grid-cols-3 xl:grid-cols-6">
          <KennzahlTile label="Gesamtleistung | Vertragsperioden" value={eur(totalPerformance, true)} />
          <KennzahlTile label="EBITDA | Vertragsperioden" value={eur(totalEbitda, true)} />
          <KennzahlTile label="EBITDA-Marge | Vertragsperioden" value={pct((totalEbitda / totalPerformance) * 100)} />
          <KennzahlTile label="Cashflow | Vertragsperioden" value={eur(totalCashflow, true)} />
          <KennzahlTile label="Ø Zielerreichung | Übernahme" value={pct(averageTargetAchievement)} />
          <KennzahlTile label="Schwächster Standort" value={weakest ? `${weakest.site.name} (${pct(weakest.achievement)})` : "n/a"} />
        </div>
      </Card>

      <KennzahlenStandortTable targetBySite={targetBySite} sites={activeSites} monthlyData={monthlyData} />
      <MonthlyEbitdaTable targetBySite={targetBySite} sites={activeSites} monthlyData={monthlyData} />
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

function KennzahlenStandortTable({ targetBySite, sites = standorte, monthlyData = monthly }: { targetBySite: Record<string, number>; sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-xs">
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
              const monthsInPeriod = monthlyData.length;
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

function MonthlyEbitdaTable({ targetBySite, sites = standorte, monthlyData = monthly }: { targetBySite: Record<string, number>; sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  const rows = monthlyData.map((month, monthIndex) => {
    const totalPositiveEbitda = activeSites.reduce((sum, site) => sum + Math.max(0, site.ebitda), 0) || 1;
    const siteValues = Object.fromEntries(
      activeSites.map((site) => [site.id, Math.round(month.ebitda * (Math.max(0, site.ebitda) / totalPositiveEbitda))])
    ) as Record<string, number>;
    const totalValue = Object.values(siteValues).reduce((sum, value) => sum + value, 0);
    const targetTakeover = Math.round(Object.values(targetBySite).reduce((sum, value) => sum + value, 0) * ((monthIndex + 1) / Math.max(monthlyData.length, 1)));
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
        <table className="data-table border-separate border-spacing-0 text-xs">
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
            <tr className="summary-row">
              <TableCell strong summary>YTD / Gesamt</TableCell>
              {ytdBySite.map((value, index) => (
                <TableCell key={activeSites[index].id} strong summary>{eur(value)}</TableCell>
              ))}
              <TableCell strong summary>{eur(ytdTotal)}</TableCell>
              <TableCell strong summary>{eur(ytdTotal)}</TableCell>
              <TableCell strong summary>{eur(ytdTarget)}</TableCell>
              <TableCell strong summary tone={ytdTotal - ytdTarget < 0 ? "red" : "green"}>{eur(ytdTotal - ytdTarget)}</TableCell>
              <TableCell strong summary>{eur(ytdBankTarget)}</TableCell>
              <TableCell strong summary tone={ytdTotal - ytdBankTarget < 0 ? "red" : "green"}>{eur(ytdTotal - ytdBankTarget)}</TableCell>
              <TableCell strong summary>{pct((ytdTotal / ytdTarget) * 100)}</TableCell>
              <TableCell strong summary>{pct((ytdTotal / ytdBankTarget) * 100)}</TableCell>
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
  tone,
  summary
}: {
  children: React.ReactNode;
  strong?: boolean;
  tone?: "green" | "red";
  summary?: boolean;
}) {
  return (
    <td
      className={cn(
        "table-number-col border-b border-r border-border bg-white p-2 text-right tabular-nums",
        strong && "font-bold",
        summary && "table-total font-bold",
        tone === "green" && "text-emerald-700",
        tone === "red" && "text-red-700"
      )}
    >
      {children}
    </td>
  );
}

function OrisusPerformance({
  sites = standorte,
  monthlyData = monthly,
  importedData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
}) {
  const metrics = cfoMetrics(sites, monthlyData);
  const availablePeriods = bwaPeriodOptionsFor(importedData);
  const [honorarPeriod, setHonorarPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  const [pvsPeriod, setPvsPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  useEffect(() => {
    if (!availablePeriods.includes(honorarPeriod)) {
      setHonorarPeriod(defaultBwaPeriodFor(importedData));
    }
    if (!availablePeriods.includes(pvsPeriod)) {
      setPvsPeriod(defaultBwaPeriodFor(importedData));
    }
  }, [availablePeriods, honorarPeriod, importedData, pvsPeriod]);
  return (
    <section className="space-y-5">
      <PageTitle
        title="Orisus Performance"
        text="Operative Performance der Gruppe: Umsatzentwicklung, Standortleistung, PVS, Forderungen und Cashflow."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Gesamtleistung" value={eur(metrics.gesamtleistung)} />
        <Mini label="PVS-Umsatz" value={eur(totalForSites(sites, "pvsUmsatz"))} />
        <Mini label="EBITDA-Marge" value={pct(metrics.ebitdaMarge)} />
        <Mini label="Cashflow" value={eur(metrics.cashflow)} />
        <Mini label="Offene Forderungen" value={eur(metrics.forderungen)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Operative Entwicklung" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" name="EBITDA" stroke="#0369a1" strokeWidth={3} />
              <Line dataKey="cashflow" name="Cashflow" stroke="#64748b" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Forderungen nach Standort" icon={FileBarChart}>
          <ReceivablesChart sites={sites} />
        </ChartCard>
      </div>
      <OperationalPerformanceTable sites={sites} />
      <PerformanceRevenueBlock
        title="Behandlerumsatz inkl. Eigenlabor je Standort"
        period={honorarPeriod}
        setPeriod={setHonorarPeriod}
        availablePeriods={availablePeriods}
        mode="honorar"
        sites={sites}
        importedData={importedData}
      />
      <PerformanceMonthlyTable
        title="Behandlerumsatz inkl. Eigenlabor | Monatsübersicht aktuelles Jahr"
        mode="honorar"
        sites={sites}
        monthlyData={monthlyData}
        importedData={importedData}
      />
      <PerformanceRevenueBlock
        title="PVS-Gesamtumsatz je Standort"
        period={pvsPeriod}
        setPeriod={setPvsPeriod}
        availablePeriods={availablePeriods}
        mode="pvs"
        sites={sites}
        importedData={importedData}
      />
      <PerformanceMonthlyTable
        title="PVS-Gesamtumsatz inkl. FL + MAT | Monatsübersicht aktuelles Jahr"
        mode="pvs"
        sites={sites}
        monthlyData={monthlyData}
        importedData={importedData}
      />
      <BankMovementsTable sites={sites} monthlyData={monthlyData} />
    </section>
  );
}

function OperationalPerformanceTable({ sites = standorte }: { sites?: DashboardSite[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-bold">Operative Standort-Performance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
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
            {sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0).map((site) => {
              const costs = site.materialquote + site.fremdlaborquote + (site.personalquote ?? 0) + site.sonstigeKostenquote;
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

function performancePeriodRows(importedData: ImportedDashboardData | null | undefined, mode: "honorar" | "pvs") {
  return mode === "honorar" ? importedData?.behandlerTotalRows : importedData?.pvsRevenueRows;
}

function performanceMonthlyRows(importedData: ImportedDashboardData | null | undefined, mode: "honorar" | "pvs") {
  return mode === "honorar" ? importedData?.behandlerTotalRows : importedData?.pvsRevenueRows;
}

function performancePeriodLabel(period: string) {
  return period === "Gesamte Periode" ? "Seit Vertragsstart" : period;
}

function importedPreviousPeriodValue(row: ImportedPeriodValueRow | undefined, period: string) {
  if (!row) return 0;
  const selection = selectedBwaPeriod(period);
  if (!selection.year) return 0;
  const previousYear = selection.year - 1;
  if (selection.months?.length) {
    return selection.months.reduce((sum, month) => sum + (row.valuesByMonth[`${previousYear}-${month}`] ?? 0), 0);
  }
  return row.valuesByYear[String(previousYear)] ?? 0;
}

function importedQuarterToDateValue(row: ImportedPeriodValueRow | undefined, period: string, yearOffset = 0) {
  if (!row) return 0;
  const selection = selectedBwaPeriod(period);
  if (!selection.year) return 0;
  const latestMonth = selection.months?.at(-1) ?? 12;
  const quarterStart = Math.floor((latestMonth - 1) / 3) * 3 + 1;
  return Array.from({ length: latestMonth - quarterStart + 1 }, (_, index) => quarterStart + index).reduce(
    (sum, month) => sum + (row.valuesByMonth[`${selection.year + yearOffset}-${month}`] ?? 0),
    0
  );
}

function importedLatestMonthValue(row: ImportedPeriodValueRow | undefined, period: string, yearOffset = 0) {
  if (!row) return 0;
  const selection = selectedBwaPeriod(period);
  if (!selection.year) return 0;
  const latestMonth = selection.months?.at(-1) ?? 12;
  return row.valuesByMonth[`${selection.year + yearOffset}-${latestMonth}`] ?? 0;
}

function pctDelta(current: number, previous: number) {
  if (!previous) return current ? "100 %" : "0 %";
  return pct(((current - previous) / Math.abs(previous)) * 100);
}

function monthsSinceStartForPeriod(site: DashboardSite, period: string) {
  const selection = selectedBwaPeriod(period);
  const [day, month, year] = site.start.split(".").map(Number);
  const today = new Date();
  const endYear = selection.year ?? today.getFullYear();
  const endMonth = selection.months?.at(-1) ?? 12;
  return Math.max(1, (endYear - year) * 12 + endMonth - month + 1);
}

function PerformanceRevenueBlock({
  title,
  period,
  setPeriod,
  availablePeriods,
  mode,
  sites = standorte,
  importedData
}: {
  title: string;
  period: string;
  setPeriod: (period: string) => void;
  availablePeriods: string[];
  mode: "honorar" | "pvs";
  sites?: DashboardSite[];
  importedData?: ImportedDashboardData | null;
}) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  const subtitle = `Auswahl: ${performancePeriodLabel(period)} | Vorjahr = gleicher Zeitraum / gleicher Monat / QTD`;
  const periodRows = performancePeriodRows(importedData, mode) ?? [];
  const rowBySite = new Map(periodRows.map((row) => [row.siteId, row]));
  const valueForSite = (site: DashboardSite, reader: (row: ImportedPeriodValueRow | undefined) => number, fallback: number) => {
    const row = rowBySite.get(site.id);
    return Math.round(row ? reader(row) : fallback);
  };
  const periodValueForSite = (site: DashboardSite) => valueForSite(site, (row) => importedPeriodValue(row, period), performanceBase(site, mode));
  const previousValueForSite = (site: DashboardSite) => valueForSite(site, (row) => importedPreviousPeriodValue(row, period), 0);
  const qtdValueForSite = (site: DashboardSite) => valueForSite(site, (row) => importedQuarterToDateValue(row, period), 0);
  const qtdPreviousValueForSite = (site: DashboardSite) => valueForSite(site, (row) => importedQuarterToDateValue(row, period, -1), 0);
  const monthValueForSite = (site: DashboardSite) => valueForSite(site, (row) => importedLatestMonthValue(row, period), 0);
  const monthPreviousValueForSite = (site: DashboardSite) => valueForSite(site, (row) => importedLatestMonthValue(row, period, -1), 0);
  const takeoverValueForSite = (site: DashboardSite) => valueForSite(site, (row) => row?.contractValue ?? 0, performanceBase(site, mode));
  const current = activeSites.reduce((sum, site) => sum + periodValueForSite(site), 0);
  const previous = activeSites.reduce((sum, site) => sum + previousValueForSite(site), 0);
  const qtd = activeSites.reduce((sum, site) => sum + qtdValueForSite(site), 0);
  const qtdPrevious = activeSites.reduce((sum, site) => sum + qtdPreviousValueForSite(site), 0);
  const sinceTakeover = activeSites.reduce((sum, site) => sum + takeoverValueForSite(site), 0);
  const lastMonth = activeSites.reduce((sum, site) => sum + monthValueForSite(site), 0);
  const lastMonthPrevious = activeSites.reduce((sum, site) => sum + monthPreviousValueForSite(site), 0);

  return (
    <Card className="overflow-hidden">
      <div className="table-head flex flex-col gap-3 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <span className="font-bold">{title}</span>
        <Select
          className="w-full bg-white text-foreground sm:w-64"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          {availablePeriods.map((option) => (
            <option key={option} value={option}>
              {performancePeriodLabel(option)}
            </option>
          ))}
        </Select>
      </div>
      <div className="border-b border-border bg-slate-50 p-2 text-sm italic text-muted-foreground">{subtitle}</div>
      <div className="grid gap-px table-grid-bg md:grid-cols-5">
        <KennzahlTile label={`${mode === "honorar" ? "Behandlerumsatz inkl. Eigenlabor" : "PVS Umsatz"} Zeitraum`} value={eur(current)} />
        <KennzahlTile label="YoY Zeitraum" value={pctDelta(current, previous)} />
        <KennzahlTile label="QTD YoY" value={pctDelta(qtd, qtdPrevious)} />
        <KennzahlTile label="Umsatz seit Übernahme" value={eur(sinceTakeover)} />
        <KennzahlTile label="Aktueller Gesamtkontostand" value={eur(totalForSites(activeSites, "kontostand"))} />
      </div>
      <div className="mt-8 overflow-x-auto border-t border-border pt-5">
        <table className="data-table border-separate border-spacing-0 text-xs">
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
              const currentSite = periodValueForSite(site);
              const prevSite = previousValueForSite(site);
              const delta = currentSite - prevSite;
              const qtdSite = qtdValueForSite(site);
              const qtdPrev = qtdPreviousValueForSite(site);
              const month = monthValueForSite(site);
              const monthPrev = monthPreviousValueForSite(site);
              const takeover = takeoverValueForSite(site);
              const monthsSince = monthsSinceStartForPeriod(site, period);
              return (
                <tr key={site.id}>
                  <TableCell strong>{site.name}</TableCell>
                  <TableCell>{site.start}</TableCell>
                  <TableCell>{eur(currentSite)}</TableCell>
                  <TableCell>{eur(prevSite)}</TableCell>
                  <TableCell tone={delta < 0 ? "red" : "green"}>{eur(delta)}</TableCell>
                  <TableCell tone={delta < 0 ? "red" : "green"}>{pctDelta(currentSite, prevSite)}</TableCell>
                  <TableCell>{eur(qtdSite)}</TableCell>
                  <TableCell>{eur(qtdPrev)}</TableCell>
                  <TableCell tone={qtdSite - qtdPrev < 0 ? "red" : "green"}>{pctDelta(qtdSite, qtdPrev)}</TableCell>
                  <TableCell>{eur(month)}</TableCell>
                  <TableCell>{eur(monthPrev)}</TableCell>
                  <TableCell tone={month - monthPrev < 0 ? "red" : "green"}>{pctDelta(month, monthPrev)}</TableCell>
                  <TableCell>{eur(takeover)}</TableCell>
                  <TableCell>{eur(takeover / monthsSince)}</TableCell>
                </tr>
              );
            })}
            <tr className="summary-row">
              <TableCell strong summary>Gesamt</TableCell>
              <TableCell summary>{""}</TableCell>
              <TableCell strong summary>{eur(current)}</TableCell>
              <TableCell strong summary>{eur(previous)}</TableCell>
              <TableCell strong summary tone={current - previous < 0 ? "red" : "green"}>{eur(current - previous)}</TableCell>
              <TableCell strong summary tone={current - previous < 0 ? "red" : "green"}>{pctDelta(current, previous)}</TableCell>
              <TableCell strong summary>{eur(qtd)}</TableCell>
              <TableCell strong summary>{eur(qtdPrevious)}</TableCell>
              <TableCell strong summary tone={qtd - qtdPrevious < 0 ? "red" : "green"}>{pctDelta(qtd, qtdPrevious)}</TableCell>
              <TableCell strong summary>{eur(lastMonth)}</TableCell>
              <TableCell strong summary>{eur(lastMonthPrevious)}</TableCell>
              <TableCell strong summary tone={lastMonth - lastMonthPrevious < 0 ? "red" : "green"}>{pctDelta(lastMonth, lastMonthPrevious)}</TableCell>
              <TableCell strong summary>{eur(sinceTakeover)}</TableCell>
              <TableCell strong summary>{eur(sinceTakeover / Math.max(activeSites.reduce((sum, site) => sum + monthsSinceStartForPeriod(site, period), 0), 1))}</TableCell>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PerformanceMonthlyTable({
  title,
  mode,
  sites = standorte,
  monthlyData = monthly,
  importedData
}: {
  title: string;
  mode: "honorar" | "pvs";
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
}) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  const period = importedData ? defaultBwaPeriodFor(importedData) : "Gesamte Periode";
  const year = selectedBwaPeriod(period).year ?? importedData?.report.jahre.filter((entry) => entry >= 1900).at(-1) ?? new Date().getFullYear();
  const rowBySite = new Map((performanceMonthlyRows(importedData, mode) ?? []).map((row) => [row.siteId, row]));
  const monthlyValuesForSite = (site: DashboardSite) => {
    const importedRow = rowBySite.get(site.id);
    if (importedRow) {
      return fillTwelveMonths(Array.from({ length: 12 }, (_, index) => Math.round(importedRow.valuesByMonth[`${year}-${index + 1}`] ?? 0)));
    }
    return allocateByMonthlyStructure(performanceBase(site, mode), monthlyData);
  };

  return (
    <Card className="overflow-hidden">
      <div className="table-head p-3 font-bold text-white">{title}</div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-xs">
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
            <PerformanceMonthRow label="Gesamt" values={bwaMonths.map((_, index) => activeSites.reduce((sum, site) => sum + monthlyValuesForSite(site)[index], 0))} />
            {activeSites.map((site) => (
              <PerformanceMonthRow key={site.id} label={site.name} values={monthlyValuesForSite(site)} />
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
  const isSummary = label === "Gesamt";
  return (
    <tr className={cn(isSummary && "summary-row")}>
      <TableCell strong={isSummary} summary={isSummary}>{label}</TableCell>
      {values.map((value, index) => (
        <TableCell key={`${label}-${index}`} summary={isSummary}>{value ? eur(value) : ""}</TableCell>
      ))}
      <TableCell strong summary={isSummary}>{eur(totalValue)}</TableCell>
      <TableCell strong summary={isSummary}>{eur(totalValue / activeMonths)}</TableCell>
    </tr>
  );
}

function BankMovementsTable({ sites = standorte, monthlyData = monthly }: { sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  const monthlyPerformance = fillTwelveMonths(monthlyData.map((entry) => entry.leistung));
  const monthlyEbitda = fillTwelveMonths(monthlyData.map((entry) => entry.ebitda));
  const monthlyCashflow = fillTwelveMonths(monthlyData.map((entry) => entry.cashflow));
  const totalTilgungZins = sites.reduce((sum, site) => sum + site.darlehen.tilgung + site.darlehen.zins, 0);
  const tilgungZins = allocateByMonthlyStructure(totalTilgungZins, monthlyData).map((value) => -value);
  const praxisCosts = monthlyPerformance.map((value, index) => -(value - monthlyEbitda[index]));
  const cashAdjustments = monthlyCashflow.map((value, index) => value - monthlyEbitda[index] - tilgungZins[index]);
  const endingKontostand = totalForSites(sites, "kontostand");
  const cashflowAfterMonth = monthlyCashflow.map((_, index) => monthlyCashflow.slice(index + 1).reduce((sum, value) => sum + value, 0));
  const kontostandMonths = monthlyCashflow.map((value, index) => (value || index < monthlyData.length ? endingKontostand - cashflowAfterMonth[index] : 0));
  const rows = [
    { label: "Geldeingang Bank gesamt", values: monthlyPerformance, contract: totalForSites(sites, "gesamtleistung") },
    { label: "davon Praxisumsatz", values: monthlyPerformance, contract: totalForSites(sites, "gesamtleistung"), indent: true },
    { label: "davon sonstiges", values: monthlyPerformance.map(() => 0), contract: 0, indent: true },
    {
      label: "Geldausgang Bank inkl. Kredit",
      values: praxisCosts.map((value, index) => value + tilgungZins[index] + cashAdjustments[index]),
      contract: -Math.abs(totalForSites(sites, "gesamtleistung") - totalForSites(sites, "cashflow"))
    },
    { label: "davon Praxisausgaben", values: praxisCosts, contract: praxisCosts.reduce((sum, value) => sum + value, 0), indent: true },
    { label: "davon Tilgung + Zins", values: tilgungZins, contract: -totalTilgungZins, indent: true },
    { label: "davon Cashflow-Adjustments", values: cashAdjustments, contract: cashAdjustments.reduce((sum, value) => sum + value, 0), indent: true },
    { label: "Cashflow gesamt im Monat", values: monthlyCashflow, contract: totalForSites(sites, "cashflow") },
    { label: "Kontostand Monatsende", values: kontostandMonths, contract: endingKontostand }
  ];

  return (
    <Card className="overflow-hidden">
      <div className="table-head p-3 font-bold text-white">Bank / Geldbewegungen aus Input_Finanzen</div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-xs">
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
              const fullValues = fillTwelveMonths(row.values);
              const totalValue = row.values.reduce((sum, value) => sum + value, 0);
              const activeMonths = row.values.filter((value) => value !== 0).length || 1;
              const isSummary = !row.indent;
              return (
                <tr key={row.label} className={cn(isSummary && "summary-row")}>
                  <TableCell strong={isSummary} summary={isSummary}>{row.indent ? `  ${row.label}` : row.label}</TableCell>
                  {fullValues.map((value, index) => (
                    <TableCell key={`${row.label}-${index}`} summary={isSummary} tone={value < 0 ? "red" : undefined}>{value ? eur(value) : ""}</TableCell>
                  ))}
                  <TableCell strong summary={isSummary} tone={totalValue < 0 ? "red" : undefined}>{eur(totalValue)}</TableCell>
                  <TableCell strong summary={isSummary} tone={totalValue < 0 ? "red" : undefined}>{eur(totalValue / activeMonths)}</TableCell>
                  <TableCell strong summary={isSummary} tone={row.contract < 0 ? "red" : undefined}>{eur(row.contract)}</TableCell>
                  <TableCell strong summary={isSummary} tone={row.contract < 0 ? "red" : undefined}>{eur(row.contract / activeMonths)}</TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function performanceBase(site: DashboardSite, mode: "honorar" | "pvs") {
  return mode === "honorar" ? site.honorar + site.eigenlabor : site.pvsUmsatz + site.eigenlabor + site.gesamtleistung * 0.06;
}

function fillTwelveMonths(values: number[]) {
  return Array.from({ length: 12 }, (_, index) => Math.round(values[index] ?? 0));
}

function allocateByMonthlyStructure(totalValue: number, monthlyData: typeof monthly) {
  const activeMonthlyData = monthlyData.filter((entry) => entry.leistung || entry.ebitda || entry.cashflow);
  const basis = activeMonthlyData.reduce((sum, entry) => sum + Math.max(0, entry.leistung), 0);
  const activeValues = activeMonthlyData.map((entry) =>
    basis ? Math.round((totalValue * Math.max(0, entry.leistung)) / basis) : Math.round(totalValue / Math.max(activeMonthlyData.length, 1))
  );
  const delta = Math.round(totalValue - activeValues.reduce((sum, value) => sum + value, 0));
  if (activeValues.length) activeValues[activeValues.length - 1] += delta;
  return fillTwelveMonths(activeValues);
}

function Analysen({ sites = standorte, monthlyData = monthly }: { sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  const metrics = cfoMetrics(sites, monthlyData);
  return (
    <section className="space-y-5">
      <PageTitle title="Analysen" text="EBITDA, Gesamtleistung, Cashflow, Standortvergleich, Zeitvergleich und Vorjahresabweichungen." />
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="EBITDA-Entwicklung" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Area dataKey="ebitda" stroke="#0369a1" fill="#dbeafe" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Standortvergleich" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sites}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Bar dataKey="ebitda" fill="#0891b2" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AnalysisTile title="EBITDA-Marge" value={pct(metrics.ebitdaMarge)} text="Konzern über die aktuell importierte Datenbasis." />
        <DebtServiceCoverageTile value={metrics.kapitaldienstfaehigkeit} />
        <AnalysisTile title="Cashflow-Qualität" value={pct(metrics.gesamtleistung ? (metrics.cashflow / metrics.gesamtleistung) * 100 : 0)} text="Cashflow im Verhältnis zur Gesamtleistung." />
      </div>
    </section>
  );
}

function debtServiceStatus(value: number): { status: Status; tone: string; label: string; hint: string } {
  if (value >= 1.5) {
    return {
      status: "green",
      tone: "text-emerald-700",
      label: "Stabil",
      hint: "Komfortabler Puffer für Banken: EBITDA deckt Kapitaldienst deutlich."
    };
  }
  if (value >= 1) {
    return {
      status: "yellow",
      tone: "text-amber-700",
      label: "Beobachten",
      hint: "Kapitaldienst ist gedeckt, aber mit begrenztem Puffer."
    };
  }
  return {
    status: "red",
    tone: "text-red-700",
    label: "Kritisch",
    hint: "EBITDA reicht nicht aus, um Tilgung und Zins vollständig zu decken."
  };
}

function DebtServiceCoverageTile({ value }: { value: number }) {
  const [open, setOpen] = useState(false);
  const state = debtServiceStatus(value);
  return (
    <Card className="relative p-4">
      <button
        type="button"
        aria-label="Kapitaldienstfähigkeit erklären"
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm"
        onClick={() => setOpen((current) => !current)}
      >
        <Info className="h-4 w-4" />
      </button>
      <div className="pr-10">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-muted-foreground">Kapitaldienstfähigkeit</p>
          <StatusDot status={state.status} />
        </div>
        <p className={cn("mt-2 text-3xl font-bold", state.tone)}>{value.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x</p>
        <p className={cn("mt-2 text-sm font-semibold", state.tone)}>{state.label}: {state.hint}</p>
      </div>
      {open && (
        <div className="mt-4 rounded-lg border border-border bg-slate-50 p-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Was bedeutet das?</p>
          <p className="mt-1">
            EBITDA geteilt durch Tilgung plus Zins. 1,79x heißt: Das EBITDA deckt den Kapitaldienst 1,79-mal.
          </p>
          <p className="mt-2">Ampel: grün ab 1,50x, orange ab 1,00x, rot unter 1,00x.</p>
        </div>
      )}
    </Card>
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

function Bwa({ importedData, sites = standorte, monthlyData = monthly }: { importedData?: ImportedDashboardData | null; sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  return (
    <section className="space-y-5">
      <PageTitle title="BWA" text="Konsolidierte BWA bis zum Cashflow, dynamisch nach Jahren und gesamter Periode auswählbar." />
      <BwaStatement title="Konsolidierte BWA bis Cashflow" importedData={importedData} />
      <div className="grid gap-5 xl:grid-cols-2">
        <EbitdaBridge sites={sites} />
        <CashflowBridge sites={sites} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <ChartCard title="Gesamtleistungsentwicklung" icon={FileBarChart}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" stroke="#0369a1" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <CostRatios sites={sites} />
      </div>
    </section>
  );
}

function EbitdaBridge({ sites = standorte }: { sites?: DashboardSite[] }) {
  const metrics = cfoMetrics(sites);
  const personal = Math.round(sites.reduce((sum, site) => sum + (site.gesamtleistung * (site.personalquote ?? 0)) / 100, 0));
  const material = Math.round(sites.reduce((sum, site) => sum + (site.gesamtleistung * site.materialquote) / 100, 0));
  const fremdlabor = Math.round(sites.reduce((sum, site) => sum + (site.gesamtleistung * site.fremdlaborquote) / 100, 0));
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

function CashflowBridge({ sites = standorte }: { sites?: DashboardSite[] }) {
  const metrics = cfoMetrics(sites);
  const hasImportedDetails = sites.some((site) => site.cashflowDetails);
  const abschreibungen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.abschreibungen ?? 0), 0)
    : Math.round(metrics.gesamtleistung * 0.17);
  const investitionen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.investitionsausgaben ?? 0), 0)
    : Math.round(metrics.gesamtleistung * 0.035);
  const tilgung = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.tilgung ?? site.darlehen.tilgung), 0)
    : metrics.tilgung;
  const umbuchen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.umbuchungZmvz ?? 0), 0)
    : Math.round(metrics.gesamtleistung * 0.025);
  const sonstigeRueckstellungen = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.sonstigeRueckstellungenBestandsminderungen ?? 0), 0)
    : 0;
  const vorlaeufigesErgebnis = hasImportedDetails
    ? sites.reduce((sum, site) => sum + (site.cashflowDetails?.vorlaeufigesErgebnis ?? 0), 0)
    : metrics.cashflow - abschreibungen + investitionen + tilgung + umbuchen + sonstigeRueckstellungen;
  const rows: BridgeRow[] = [
    { label: "Vorläufiges Ergebnis", value: vorlaeufigesErgebnis, tone: vorlaeufigesErgebnis >= 0 ? "blue" : "red" },
    { label: "+ Abschreibungen", value: abschreibungen },
    { label: "Investitionsausgaben", value: -investitionen },
    { label: "Tilgung", value: -tilgung },
    { label: "Umbuchung ZMVZ", value: -umbuchen },
    { label: "Sonstige Rückstellungen / Bestandsminderungen", value: -sonstigeRueckstellungen },
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

function Cashflow({ sites = standorte, monthlyData = monthly }: { sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  return (
    <section className="space-y-5">
      <PageTitle title="Cashflow" text="Praxiseingänge, Kosten, Annuitäten, Umbuchungen MVZ und Netto-Cashflow." />
      <div className="grid gap-5 xl:grid-cols-2">
        <CashflowBlock sites={sites} />
        <ChartCard title="Monatlicher Verlauf" icon={Wallet}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Area dataKey="cashflow" stroke="#0f766e" fill="#ccfbf1" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Ranking title="Standortvergleich Cashflow" metric="ebitda" sites={sites} />
    </section>
  );
}

function Bankenreporting({
  sites = standorte,
  monthlyData = monthly,
  importedData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
}) {
  const metrics = cfoMetrics(sites, monthlyData);
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
      <DataStatusStrip importedData={importedData} />
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
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
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
          <table className="data-table border-separate border-spacing-0 text-sm">
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
              {sortSitesByContractStart(sites).map((site) => (
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

function BoardPack({
  sites = standorte,
  monthlyData = monthly,
  importedData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
}) {
  const metrics = cfoMetrics(sites, monthlyData);
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
      <DataStatusStrip importedData={importedData} />

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
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
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

      <StandortCfoComparison sites={sites} />
      <AcquisitionIntegration sites={sites} />
    </section>
  );
}

function AcquisitionIntegration({ sites = standorte }: { sites?: DashboardSite[] }) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-bold">Akquisitionen & Integration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kaufpreis, Startdatum, Übernahmeziele, Earn-Out und Zielerreichung je Standort.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
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
                "Earn-Out fällig",
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
              const dueStatus = earnOutDueStatus(site);
              return (
                <tr key={site.id}>
                  <td className="border-b border-r border-border p-3 font-bold">{site.name}</td>
                  <td className="border-b border-r border-border p-3">{site.start}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.kaufpreis)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.darlehen)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.zielEbitda)}</td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.istEbitda)}</td>
                  <td className={cn("border-b border-r border-border p-3 text-right font-semibold", achievement < 100 ? "text-red-700" : "text-emerald-700")}>{pct(achievement)}</td>
                  <td className="border-b border-r border-border p-3">
                    <span className="block font-semibold">{site.darlehen.earnOutFaelligAm || "offen"}</span>
                    <span className="text-xs text-muted-foreground">{dueStatus.label}</span>
                  </td>
                  <td className="border-b border-r border-border p-3 text-right">{eur(open)}</td>
                  <td className="border-b border-r border-border p-3"><StatusDot status={dueStatus.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function displayDateValue(value: string) {
  const [day, month, year] = value.split(".").map((part) => Number(part));
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day).getTime();
}

function isEarnOutDue(site: DashboardSite) {
  const dueDate = displayDateValue(site.darlehen.earnOutFaelligAm);
  return dueDate != null && dueDate <= Date.now();
}

function earnOutDueStatus(site: DashboardSite): { label: string; status: Status } {
  const dueDate = displayDateValue(site.darlehen.earnOutFaelligAm);
  if (!dueDate) return { label: "Fälligkeit offen", status: "yellow" };
  if (dueDate > Date.now()) return { label: "noch nicht fällig", status: "green" };
  return { label: "fällig", status: site.darlehen.earnOutGezahlt >= site.darlehen.earnOutGesamt ? "green" : "yellow" };
}

function Darlehen({ sites = standorte }: { sites?: DashboardSite[] }) {
  const restschuld = sites.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
  const earnOut = sites.reduce((sum, site) => sum + site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt, 0);
  const earnOutDueNow = sites.reduce((sum, site) => sum + (isEarnOutDue(site) ? site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt : 0), 0);
  const tilgung = sites.reduce((sum, site) => sum + site.darlehen.tilgung, 0);
  return (
    <section className="space-y-5">
      <PageTitle title="Darlehen & Earn-Out" text="Kaufpreise, Restschulden, Zins, Tilgung und Earn-Out-Fortschritt je Standort." />
      <DebtCapitalBlock sites={sites} />
      <EarnOutSummary sites={sites} />
      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard label="Gesamte Restschuld" value={restschuld} delta="Konsolidiert" icon={Landmark} status="yellow" />
        <KpiCard label="Earn-Out offen" value={earnOut} delta={`Davon aktuell fällig: ${eur(earnOutDueNow)}`} icon={BadgeEuro} status={earnOutDueNow > 0 ? "yellow" : "green"} />
        <KpiCard label="Tilgung" value={tilgung} delta="Laufend bedient" icon={ShieldCheck} status="green" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {sortSitesByContractStart(sites).map((site) => {
          const achievement = site.darlehen.zielEbitda ? (site.darlehen.istEbitda / site.darlehen.zielEbitda) * 100 : 0;
          const dueStatus = earnOutDueStatus(site);
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
                <Mini label="Earn-Out fällig am" value={site.darlehen.earnOutFaelligAm || "offen"} />
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold">Zielerreichung bis Fälligkeit</span>
                  <span>{dueStatus.label}</span>
                </div>
                <Progress value={achievement} tone={achievement >= 100 ? "green" : achievement >= 85 ? "yellow" : "red"} />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function EarnOutSummary({ sites = standorte }: { sites?: DashboardSite[] }) {
  const totalPotential = sites.reduce((sum, site) => sum + site.darlehen.earnOutGesamt, 0);
  const paid = sites.reduce((sum, site) => sum + site.darlehen.earnOutGezahlt, 0);
  const open = totalPotential - paid;
  const dueNow = sites.reduce((sum, site) => sum + (isEarnOutDue(site) ? site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt : 0), 0);
  const notYetDue = Math.max(0, open - dueNow);
  const likely = sites.reduce((sum, site) => {
    const achievement = site.darlehen.zielEbitda ? site.darlehen.istEbitda / site.darlehen.zielEbitda : 0;
    return sum + Math.max(0, site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt) * Math.min(1, achievement);
  }, 0);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold">Earn-Out konsolidiert</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gesamtpotenzial, Fälligkeit nach Vertragsperiode und erwartete Verpflichtung nach Zielerreichung.</p>
        </div>
        <Badge tone={open > totalPotential * 0.5 ? "yellow" : "green"}>{pct((paid / (totalPotential || 1)) * 100)} gezahlt</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Mini label="Earn-Out Potenzial" value={eur(totalPotential)} />
        <Mini label="Aktuell fällig" value={eur(dueNow)} />
        <Mini label="Noch nicht fällig" value={eur(notYetDue)} />
        <Mini label="Erwartete Verpflichtung" value={eur(likely)} />
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
      const savedDashboard = window.localStorage.getItem(importDashboardStorageKey);
      if (savedDashboard) {
        const parsedDashboard = JSON.parse(savedDashboard) as ImportedDashboardData;
        if (parsedDashboard.schemaVersion !== importDashboardSchemaVersion) {
          window.localStorage.removeItem(importStorageKey);
          window.localStorage.removeItem(importDashboardStorageKey);
          return;
        }
      }
      setConfirmedReport(JSON.parse(saved) as ImportReport);
    } catch {
      window.localStorage.removeItem(importStorageKey);
      window.localStorage.removeItem(importDashboardStorageKey);
    }
  }, []);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setReport({ ...emptyImportReport, status: "reading", fileName: file.name });

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      await waitForBrowserPaint();
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
    const repairedDashboardData = repairImportedCashflowData(pendingDashboardData);
    window.localStorage.setItem(importStorageKey, JSON.stringify(report));
    window.localStorage.setItem(importDashboardStorageKey, JSON.stringify(repairedDashboardData));
    setConfirmedReport(report);
    onImportConfirmed?.(repairedDashboardData);
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
            <p className="mt-2 text-sm text-muted-foreground">Berichtsvorlage ohne aktive Exportlogik. Exportlogik folgt in Phase 2.</p>
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
          <table className="data-table border-separate border-spacing-0 text-sm">
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
