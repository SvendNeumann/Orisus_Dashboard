"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
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
  ChevronDown,
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
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserRound,
  UserRoundPlus,
  Users,
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

type DashboardSite = (typeof standorte)[number] & { treatmentRooms?: number; openingHours?: number };
type TopBehandlerEntry = { name: string; standort: string; honorar: number };
type ImportedBehandlerDetailRow = {
  siteId: string;
  siteName: string;
  name: string;
  honorarByMonth: Record<string, number>;
  eigenlaborByMonth: Record<string, number>;
  totalByMonth: Record<string, number>;
};
type ImportedPersonnelCostRow = {
  siteId: string;
  siteName: string;
  employeeId: string;
  name: string;
  type: string;
  status: string;
  year: number;
  personnelCostByMonth: Record<string, number>;
  personnelCost: number;
  honorar: number;
  pkQuote: number;
  monthsMaintained: string;
};
type PatientMetricKey =
  | "treatedPatients"
  | "newPatients"
  | "bookedAppointments"
  | "attendedAppointments"
  | "missedAppointments"
  | "attendanceRate"
  | "cancellationRate"
  | "patientsPerRoom";
type ImportedPatientMetricRow = {
  siteId: string;
  siteName: string;
  metricKey: PatientMetricKey;
  label: string;
  unit: "count" | "percent" | "average";
  valuesByYear: Record<string, number>;
  valuesByMonth: Record<string, number>;
  contractValue: number;
};

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
  | "admin"
  | "personal-cockpit"
  | "personal-krankheit"
  | "personal-mitarbeiter"
  | "personal-massnahmen"
  | "personal-upload"
  | "patienten-auswertungen";

type AuthStep = "checking" | "welcome" | "forgot" | "set-password" | "app";
type UserRole = "admin" | "info" | "praxismanagement";
type AccessUser = {
  email: string;
  username?: string;
  name: string | null;
  role: UserRole;
  active: boolean;
  must_change_password?: boolean;
  last_sign_in_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

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
const authPasswordConfiguredKey = "orisus-cfo-password-configured";
const passkeyStorageKey = "orisus-cfo-passkey-id";
const importStorageKey = "orisus-cfo-import-report";
const importDashboardStorageKey = "orisus-cfo-import-dashboard-data";
const importPersistenceDbName = "orisus-cfo-dashboard";
const importPersistenceStoreName = "confirmed-import";
const importPersistenceReportKey = "report";
const importPersistenceDashboardKey = "dashboard";
const importDashboardSchemaVersion = "2026-06-23-bwa-praxiskosten-v16";
const importSourceSheetName = "Konzern_Konsolidierung_STD";
const personalImportPersistenceReportKey = "personal-report";
const personalImportPersistenceDashboardKey = "personal-dashboard";
const personalImportStorageKey = "orisus-personal-import-report";
const personalImportDashboardStorageKey = "orisus-personal-import-dashboard-data";
const personalImportSchemaVersion = "2026-06-21-personal-stage-one-v1";
const personalSupabaseImportTableName = "orisus_personal_imports";
const supabaseAccessTokenKey = "orisus-cfo-supabase-access-token";
const supabaseRefreshTokenKey = "orisus-cfo-supabase-refresh-token";
const supabaseUserEmailKey = "orisus-cfo-supabase-user-email";
const supabaseUserRoleKey = "orisus-cfo-supabase-user-role";
const supabaseUserNameKey = "orisus-cfo-supabase-user-name";
const activePageStorageKey = "orisus-cfo-active-page";
const activeSiteStorageKey = "orisus-cfo-active-site";
const kpiRulesSettingKey = "kpi_rules";
const kpiRulesStorageKey = "orisus-cfo-kpi-rules";
const kpiRulesChangedEventName = "orisus-cfo-kpi-rules-changed";
const permanentAdminEmail = "svend.neumann@orisus.de";
const adminEmails = [
  permanentAdminEmail,
  "sven.neumann@orisus.de",
  "sven.neumann@resos.de",
  "svend.neumann@resos.de"
];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const appLoginEmailDomain = "login.orisus.internal";

function normalizeAuthEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function normalizeLoginIdentifier(identifier: string) {
  return identifier.trim().toLowerCase().replace(/\s+/g, ".");
}

function authEmailForLoginIdentifier(identifier: string) {
  const normalized = normalizeLoginIdentifier(identifier);
  return normalized.includes("@") ? normalizeAuthEmail(normalized) : `${normalized}@${appLoginEmailDomain}`;
}

function loginNameFromAuthEmail(email: string | null | undefined) {
  const normalized = normalizeAuthEmail(email);
  return normalized.endsWith(`@${appLoginEmailDomain}`) ? normalized.replace(`@${appLoginEmailDomain}`, "") : normalized;
}

function isValidLoginIdentifier(identifier: string) {
  const normalized = normalizeLoginIdentifier(identifier);
  if (normalized.includes("@")) return normalized.length >= 5 && normalized.includes(".");
  return /^[a-z0-9._-]{3,64}$/.test(normalized);
}

function authUserMustChangePassword(user: SupabaseAuthResponse["user"] | { app_metadata?: Record<string, unknown> } | null | undefined) {
  return Boolean(user?.app_metadata?.must_change_password);
}
const supabaseImportTableName = "orisus_confirmed_imports";
const supabaseSettingsTableName = "orisus_app_settings";

type AcquisitionTerms = {
  kaufpreis: number;
  earnOutGesamt: number;
  earnOutFaelligAm: string;
  earnOutUntergrenze: number;
  earnOutReduktionsfaktor: number;
  wachstumsfaktor: number;
  zielEbitdaKaufvertragPa: number;
};

const emptyAcquisitionTerms: AcquisitionTerms = {
  kaufpreis: 0,
  earnOutGesamt: 0,
  earnOutFaelligAm: "",
  earnOutUntergrenze: 0,
  earnOutReduktionsfaktor: 0,
  wachstumsfaktor: 0,
  zielEbitdaKaufvertragPa: 0
};

const acquisitionTermsBySiteId: Record<string, AcquisitionTerms> = {
  kirchberg: {
    kaufpreis: 1365000,
    earnOutGesamt: 735000,
    earnOutFaelligAm: "30.06.2029",
    earnOutUntergrenze: 327500,
    earnOutReduktionsfaktor: 6,
    wachstumsfaktor: 0.25,
    zielEbitdaKaufvertragPa: 450000
  },
  essen: {
    kaufpreis: 727200,
    earnOutGesamt: 391600,
    earnOutFaelligAm: "31.12.2029",
    earnOutUntergrenze: 164753.85,
    earnOutReduktionsfaktor: 6.5,
    wachstumsfaktor: 0.3,
    zielEbitdaKaufvertragPa: 225000
  },
  kehl: {
    kaufpreis: 601250,
    earnOutGesamt: 323750,
    earnOutFaelligAm: "30.03.2029",
    earnOutUntergrenze: 0,
    earnOutReduktionsfaktor: 0,
    wachstumsfaktor: 2.5,
    zielEbitdaKaufvertragPa: 210000
  },
  ulmet: {
    kaufpreis: 1852500,
    earnOutGesamt: 997500,
    earnOutFaelligAm: "31.12.2030",
    earnOutUntergrenze: 366475,
    earnOutReduktionsfaktor: 6.95,
    wachstumsfaktor: 0.3,
    zielEbitdaKaufvertragPa: 510000
  },
  huettenberg: {
    kaufpreis: 552500,
    earnOutGesamt: 297500,
    earnOutFaelligAm: "31.12.2030",
    earnOutUntergrenze: 240833.33,
    earnOutReduktionsfaktor: 5.25,
    wachstumsfaktor: 0.3,
    zielEbitdaKaufvertragPa: 190000
  }
};

const additionalDebtBySiteId: Record<string, number> = {
  kirchberg: 100000
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
  topBehandlerPeriod?: string;
  bwaRows: ImportedBwaRow[];
  pvsRevenueRows?: ImportedPeriodValueRow[];
  behandlerHonorarRows?: ImportedPeriodValueRow[];
  behandlerTotalRows?: ImportedPeriodValueRow[];
  behandlerDetailRows?: ImportedBehandlerDetailRow[];
  personnelCostRows?: ImportedPersonnelCostRow[];
  bankMovementRows?: ImportedBankMovementRow[];
  patientRows?: ImportedPatientMetricRow[];
  report: ImportReport;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id?: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
  };
  error?: string;
  msg?: string;
};

type ImportHistoryEntry = {
  id: string;
  file_name: string | null;
  imported_at: string | null;
  schema_version: string | null;
  active: boolean;
  created_at: string | null;
};

type PersonalImportHistoryEntry = ImportHistoryEntry;

type BwaLine = {
  metricKey?: string;
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

type ImportedBankMovementRow = {
  siteId?: string;
  siteName?: string;
  label: string;
  indent: boolean;
  valuesByMonth: Record<string, number>;
  hasValueByMonth: Record<string, boolean>;
  total: number;
  averageMonth: number;
  contractValue: number;
  averageContract: number;
};

type PersonalImportStatus = "idle" | "reading" | "ready" | "warning" | "error";

type PersonalImportReport = {
  status: PersonalImportStatus;
  fileName: string;
  importedAt: string;
  presentSheets: string[];
  missingSheets: string[];
  employeeRows: number;
  activeEmployees: number;
  sicknessRows: number;
  salaryRows: number;
  actionRows: number;
  sites: string[];
  years: number[];
  warnings: string[];
  errors: string[];
  changes: {
    newEmployees: number;
    changedEmployees: number;
    inactiveEmployees: number;
    newSicknessEntries: number;
    changedSicknessEntries: number;
    newSalaryEntries: number;
    changedSalaryEntries: number;
    newActions: number;
    changedActions: number;
  };
};

type PersonalEmployee = {
  id: string;
  site: string;
  firstName: string;
  lastName: string;
  name: string;
  birthDate: string;
  functionName: string;
  area: string;
  employmentType: string;
  isDentist: boolean;
  isSiteLead: boolean;
  hasPersonnelResponsibility: boolean;
  entryDate: string;
  contractUntil: string;
  exitDate: string;
  status: string;
  weeklyHours: number;
  vacationDays: number;
  payModel: string;
  fixedSalary: number;
  hourlyWage: number;
  employerCost: number;
  note: string;
};

type PersonalSicknessEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  site: string;
  year: number;
  month: number;
  days: number;
  from: string;
  to: string;
};

type PersonalSalaryEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  site: string;
  date: string;
  oldSalary: number;
  newSalary: number;
  difference: number;
  reason: string;
  approvedBy: string;
};

type PersonalActionEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  site: string;
  date: string;
  action: string;
  details: string;
  status: string;
};

type PersonalDashboardData = {
  schemaVersion: string;
  importedAt: string;
  fileName: string;
  employees: PersonalEmployee[];
  sicknessEntries: PersonalSicknessEntry[];
  salaryEntries: PersonalSalaryEntry[];
  actionEntries: PersonalActionEntry[];
  settings: {
    sites: string[];
    statuses: string[];
    employmentTypes: string[];
    functions: string[];
    payModels: string[];
  };
  report: PersonalImportReport;
};

function openImportPersistenceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexedDB-unavailable"));
      return;
    }

    const request = window.indexedDB.open(importPersistenceDbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(importPersistenceStoreName)) {
        db.createObjectStore(importPersistenceStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB-error"));
  });
}

function readPersistentValue<T>(key: string): Promise<T | null> {
  return openImportPersistenceDb()
    .then(
      (db) =>
        new Promise<T | null>((resolve, reject) => {
          const transaction = db.transaction(importPersistenceStoreName, "readonly");
          const store = transaction.objectStore(importPersistenceStoreName);
          const request = store.get(key);
          request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
          request.onerror = () => reject(request.error ?? new Error("indexedDB-read-error"));
          transaction.oncomplete = () => db.close();
          transaction.onerror = () => db.close();
        })
    )
    .catch(() => null);
}

function writePersistentValue<T>(key: string, value: T): Promise<boolean> {
  return openImportPersistenceDb()
    .then(
      (db) =>
        new Promise<boolean>((resolve, reject) => {
          const transaction = db.transaction(importPersistenceStoreName, "readwrite");
          const store = transaction.objectStore(importPersistenceStoreName);
          const request = store.put(value, key);
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error ?? new Error("indexedDB-write-error"));
          transaction.oncomplete = () => db.close();
          transaction.onerror = () => db.close();
        })
    )
    .catch(() => false);
}

function deletePersistentValue(key: string): Promise<void> {
  return openImportPersistenceDb()
    .then(
      (db) =>
        new Promise<void>((resolve) => {
          const transaction = db.transaction(importPersistenceStoreName, "readwrite");
          const store = transaction.objectStore(importPersistenceStoreName);
          store.delete(key);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            resolve();
          };
        })
    )
    .catch(() => undefined);
}

function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function roleForEmail(email: string | null | undefined): UserRole {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  return adminEmails.includes(normalizedEmail) ? "admin" : "info";
}

function roleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "praxismanagement") return "Praxismanagement";
  return "Info";
}

function isPermanentAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === permanentAdminEmail;
}

type KpiRuleKey =
  | "ebitda_marge"
  | "cashflow_bwa"
  | "offene_forderungen"
  | "kostenquote"
  | "aktuelle_liquiditaet"
  | "kapitaldienstfaehigkeit"
  | "ziel_ebitda_kaufvertrag"
  | "ziel_ebitda_uebernahme";

type KpiRuleDirection = "higher" | "lower";

type KpiRule = {
  key: KpiRuleKey;
  label: string;
  owner: string;
  unit: "percent" | "currency" | "multiple";
  direction: KpiRuleDirection;
  green: number;
  yellow: number;
};

type KpiRules = Record<KpiRuleKey, KpiRule>;

const defaultKpiRules: KpiRules = {
  ebitda_marge: { key: "ebitda_marge", label: "EBITDA-Marge", owner: "CFO", unit: "percent", direction: "higher", green: 15, yellow: 10 },
  cashflow_bwa: { key: "cashflow_bwa", label: "Cashflow gem. BWA", owner: "CFO", unit: "currency", direction: "higher", green: 0, yellow: 0 },
  offene_forderungen: { key: "offene_forderungen", label: "Offene Forderungen", owner: "Controlling", unit: "percent", direction: "lower", green: 12, yellow: 18 },
  kostenquote: { key: "kostenquote", label: "Kostenquote", owner: "Controlling", unit: "percent", direction: "lower", green: 68, yellow: 74 },
  aktuelle_liquiditaet: { key: "aktuelle_liquiditaet", label: "Aktuelle Liquidität", owner: "CFO", unit: "currency", direction: "higher", green: 500000, yellow: 250000 },
  kapitaldienstfaehigkeit: { key: "kapitaldienstfaehigkeit", label: "Kapitaldienstfähigkeit", owner: "CFO / Bank", unit: "multiple", direction: "higher", green: 1.5, yellow: 1 },
  ziel_ebitda_kaufvertrag: { key: "ziel_ebitda_kaufvertrag", label: "Ziel-EBITDA Kaufvertrag", owner: "M&A", unit: "percent", direction: "higher", green: 100, yellow: 85 },
  ziel_ebitda_uebernahme: { key: "ziel_ebitda_uebernahme", label: "Ziel-EBITDA Übernahme", owner: "M&A", unit: "percent", direction: "higher", green: 100, yellow: 85 }
};

const kpiRuleOrder: KpiRuleKey[] = [
  "ebitda_marge",
  "cashflow_bwa",
  "offene_forderungen",
  "kostenquote",
  "aktuelle_liquiditaet",
  "kapitaldienstfaehigkeit",
  "ziel_ebitda_kaufvertrag",
  "ziel_ebitda_uebernahme"
];

function normalizeKpiRules(input: Partial<Record<KpiRuleKey, Partial<KpiRule>>> | null | undefined): KpiRules {
  const normalized = { ...defaultKpiRules } as KpiRules;
  kpiRuleOrder.forEach((key) => {
    const fallback = defaultKpiRules[key];
    const candidate = input?.[key];
    normalized[key] = {
      ...fallback,
      ...candidate,
      key,
      label: fallback.label,
      unit: fallback.unit,
      direction: fallback.direction,
      green: Number.isFinite(Number(candidate?.green)) ? Number(candidate?.green) : fallback.green,
      yellow: Number.isFinite(Number(candidate?.yellow)) ? Number(candidate?.yellow) : fallback.yellow,
      owner: asText(candidate?.owner || fallback.owner) || fallback.owner
    };
  });
  return normalized;
}

function readKpiRules() {
  if (typeof window === "undefined") return normalizeKpiRules(null);
  try {
    return normalizeKpiRules(JSON.parse(window.localStorage.getItem(kpiRulesStorageKey) ?? "null"));
  } catch {
    return normalizeKpiRules(null);
  }
}

function statusByRule(value: number, rule: KpiRule): Status {
  if (rule.direction === "lower") {
    if (value <= rule.green) return "green";
    if (value <= rule.yellow) return "yellow";
    return "red";
  }
  if (value >= rule.green) return "green";
  if (value >= rule.yellow) return "yellow";
  return "red";
}

function statusForSiteByRules(site: DashboardSite, rules: KpiRules): Status {
  if (statusByRule(site.cashflow, rules.cashflow_bwa) === "red") return "red";
  return statusByRule(site.ebitdaMarge, rules.ebitda_marge);
}

function formatKpiRuleValue(rule: KpiRule, value: number) {
  if (rule.unit === "currency") return eur(value);
  if (rule.unit === "multiple") return `${value.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`;
  return pct(value);
}

function kpiRuleText(rule: KpiRule, band: "green" | "yellow" | "red") {
  if (rule.direction === "lower") {
    if (band === "green") return `<= ${formatKpiRuleValue(rule, rule.green)}`;
    if (band === "yellow") return `${formatKpiRuleValue(rule, rule.green)} bis ${formatKpiRuleValue(rule, rule.yellow)}`;
    return `> ${formatKpiRuleValue(rule, rule.yellow)}`;
  }
  if (band === "green") return `>= ${formatKpiRuleValue(rule, rule.green)}`;
  if (band === "yellow") return `${formatKpiRuleValue(rule, rule.yellow)} bis ${formatKpiRuleValue(rule, rule.green)}`;
  return `< ${formatKpiRuleValue(rule, rule.yellow)}`;
}

function useKpiRules() {
  const [rules, setRules] = useState<KpiRules>(() => readKpiRules());

  useEffect(() => {
    let isMounted = true;
    loadSupabaseAppSetting<Partial<Record<KpiRuleKey, Partial<KpiRule>>>>(kpiRulesSettingKey)
      .then((setting) => {
        if (!isMounted || !setting) return;
        const normalized = normalizeKpiRules(setting);
        window.localStorage.setItem(kpiRulesStorageKey, JSON.stringify(normalized));
        setRules(normalized);
      })
      .catch(() => undefined);
    const handleRulesChanged = () => setRules(readKpiRules());
    window.addEventListener(kpiRulesChangedEventName, handleRulesChanged);
    return () => {
      isMounted = false;
      window.removeEventListener(kpiRulesChangedEventName, handleRulesChanged);
    };
  }, []);

  return rules;
}

async function saveKpiRules(nextRules: KpiRules) {
  const normalized = normalizeKpiRules(nextRules);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(kpiRulesStorageKey, JSON.stringify(normalized));
    window.dispatchEvent(new Event(kpiRulesChangedEventName));
  }
  return saveSupabaseAppSetting(kpiRulesSettingKey, normalized);
}

function currentUserEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(supabaseUserEmailKey) ?? "";
}

function currentUserRole() {
  if (typeof window === "undefined") return "info";
  const storedRole = window.localStorage.getItem(supabaseUserRoleKey);
  return storedRole === "admin" || storedRole === "info" || storedRole === "praxismanagement" ? storedRole : roleForEmail(currentUserEmail());
}

function currentUserName() {
  if (typeof window === "undefined") return "Svend Neumann";
  return window.localStorage.getItem(supabaseUserNameKey) ?? "Svend Neumann";
}

function canModifyData(role: UserRole) {
  return role === "admin";
}

function currentSupabaseAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(supabaseAccessTokenKey) ?? "";
}

function supabaseHeaders(token = currentSupabaseAccessToken()) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token || supabaseAnonKey}`,
    "Content-Type": "application/json"
  };
}

async function supabaseFetch<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      ...supabaseHeaders(token),
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed with ${response.status}`);
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

function rememberSupabaseSession(session: SupabaseAuthResponse, fallbackEmail: string, authenticated = true) {
  if (!session.access_token) return false;
  window.localStorage.setItem(supabaseAccessTokenKey, session.access_token);
  if (session.refresh_token) window.localStorage.setItem(supabaseRefreshTokenKey, session.refresh_token);
  window.localStorage.setItem(supabaseUserEmailKey, session.user?.email ?? fallbackEmail);
  if (authenticated) window.localStorage.setItem(authStorageKey, "true");
  return true;
}

async function refreshSupabaseSession() {
  const refreshToken = window.localStorage.getItem(supabaseRefreshTokenKey);
  if (!refreshToken) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: supabaseHeaders(""),
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) return null;
  const session = (await response.json()) as SupabaseAuthResponse;
  return rememberSupabaseSession(session, currentUserEmail(), false) ? session : null;
}

async function activeSupabaseAccessToken(forceRefresh = false) {
  if (forceRefresh) {
    const refreshed = await refreshSupabaseSession();
    return refreshed?.access_token ?? currentSupabaseAccessToken();
  }

  const token = currentSupabaseAccessToken();
  if (token) return token;
  const refreshed = await refreshSupabaseSession();
  return refreshed?.access_token ?? "";
}

async function signInSupabaseUser(identifier: string, password: string) {
  const authEmail = authEmailForLoginIdentifier(identifier);
  const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: supabaseHeaders(""),
    body: JSON.stringify({ email: authEmail, password })
  });

  if (loginResponse.ok) {
    const session = (await loginResponse.json()) as SupabaseAuthResponse;
    rememberSupabaseSession(session, authEmail);
    return session;
  }

  throw new Error("Login fehlgeschlagen.");
}

async function updateSupabaseUserPassword(password: string, token = currentSupabaseAccessToken()) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: supabaseHeaders(token),
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    throw new Error("Passwort konnte nicht gesetzt werden.");
  }
}

async function completeSupabasePasswordChange(token = currentSupabaseAccessToken()) {
  const response = await fetch("/api/access-users", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action: "complete-password-change" })
  });
  if (!response.ok) {
    throw new Error("Passwortstatus konnte nicht aktualisiert werden.");
  }
}

async function loadSupabaseAuthUser(token = currentSupabaseAccessToken()) {
  return supabaseFetch<{ id?: string; email?: string; app_metadata?: Record<string, unknown> }>("/auth/v1/user", undefined, token);
}

async function validateStoredSupabaseSession() {
  if (!isSupabaseConfigured()) return true;
  let token = currentSupabaseAccessToken();
  let user = token ? await loadSupabaseAuthUser(token).catch(() => null) : null;
  if (!user?.email) {
    const refreshed = await refreshSupabaseSession();
    token = refreshed?.access_token ?? "";
    user = token ? await loadSupabaseAuthUser(token).catch(() => null) : null;
  }
  if (!user?.email) return false;
  return loadAndRememberAccessProfile(user.email);
}

function authParamsFromCurrentUrl() {
  const sources = [
    window.location.search,
    window.location.hash,
    window.location.hash.replace(/^#\/?\??/, "?")
  ];
  const merged = new URLSearchParams();
  sources.forEach((source) => {
    const params = new URLSearchParams(source.replace(/^#/, "").replace(/^\?/, ""));
    params.forEach((value, key) => {
      if (!merged.has(key)) merged.set(key, value);
    });
  });
  return merged;
}

async function loadAndRememberAccessProfile(email: string) {
  if (!isSupabaseConfigured()) {
    window.localStorage.setItem(supabaseUserRoleKey, roleForEmail(email));
    window.localStorage.setItem(supabaseUserNameKey, email);
    return true;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rows = await supabaseFetch<Array<AccessUser>>(
    `/rest/v1/orisus_user_roles?select=email,name,role,active&email=eq.${encodeURIComponent(normalizedEmail)}&active=eq.true&limit=1`
  );
  const profile = rows[0];
  if (!profile || (profile.role !== "admin" && profile.role !== "info" && profile.role !== "praxismanagement")) {
    window.localStorage.removeItem(supabaseUserRoleKey);
    window.localStorage.removeItem(supabaseUserNameKey);
    return false;
  }
  window.localStorage.setItem(supabaseUserRoleKey, profile.role);
  window.localStorage.setItem(supabaseUserNameKey, profile.name || profile.email);
  return true;
}

function clearSupabaseSession() {
  window.localStorage.removeItem(supabaseAccessTokenKey);
  window.localStorage.removeItem(supabaseRefreshTokenKey);
  window.localStorage.removeItem(supabaseUserEmailKey);
  window.localStorage.removeItem(supabaseUserRoleKey);
  window.localStorage.removeItem(supabaseUserNameKey);
}

async function loadSupabaseConfirmedImport() {
  if (!isSupabaseConfigured()) return null;
  const token = currentSupabaseAccessToken();
  if (!token) return null;
  const rows = await supabaseFetch<Array<{ payload: ImportedDashboardData }>>(
    `/rest/v1/${supabaseImportTableName}?select=payload&active=eq.true&order=imported_at.desc&limit=1`,
    undefined,
    token
  );
  const importedData = rows[0]?.payload ?? null;
  if (!importedData) return null;
  if (importedData.schemaVersion !== importDashboardSchemaVersion) return null;
  return repairImportedCashflowData(importedData);
}

async function loadSupabaseImportHistory() {
  if (!isSupabaseConfigured()) return [];
  const token = currentSupabaseAccessToken();
  if (!token) return [];
  return supabaseFetch<ImportHistoryEntry[]>(
    `/rest/v1/${supabaseImportTableName}?select=id,file_name,imported_at,schema_version,active,created_at&order=created_at.desc&limit=8`,
    undefined,
    token
  ).catch(() => []);
}

function importHistoryId(fileName: string) {
  return `${Date.now()}-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "import"}`;
}

async function loadSupabaseConfirmedPersonalImport() {
  if (!isSupabaseConfigured()) return null;
  const token = currentSupabaseAccessToken();
  if (!token) return null;
  const rows = await supabaseFetch<Array<{ payload: PersonalDashboardData }>>(
    `/rest/v1/${personalSupabaseImportTableName}?select=payload&active=eq.true&order=imported_at.desc&limit=1`,
    undefined,
    token
  ).catch(() => []);
  const personalData = rows[0]?.payload ?? null;
  if (!personalData) return null;
  if (personalData.schemaVersion !== personalImportSchemaVersion) return null;
  return personalData;
}

async function loadSupabasePersonalImportHistory() {
  if (!isSupabaseConfigured()) return [];
  const token = currentSupabaseAccessToken();
  if (!token) return [];
  return supabaseFetch<PersonalImportHistoryEntry[]>(
    `/rest/v1/${personalSupabaseImportTableName}?select=id,file_name,imported_at,schema_version,active,created_at&order=created_at.desc&limit=8`,
    undefined,
    token
  ).catch(() => []);
}

async function saveSupabaseConfirmedPersonalImport(report: PersonalImportReport, dashboardData: PersonalDashboardData) {
  if (!canModifyData(currentUserRole())) return false;
  if (!isSupabaseConfigured()) return false;
  const token = currentSupabaseAccessToken();
  if (!token) return false;
  await supabaseFetch(
    `/rest/v1/${personalSupabaseImportTableName}?active=eq.true`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ active: false })
    },
    token
  ).catch(() => undefined);
  await supabaseFetch(
    `/rest/v1/${personalSupabaseImportTableName}`,
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: importHistoryId(dashboardData.fileName),
        active: true,
        file_name: dashboardData.fileName,
        imported_at: dashboardData.importedAt,
        schema_version: dashboardData.schemaVersion,
        report,
        payload: dashboardData
      })
    },
    token
  );
  return true;
}

async function clearSupabaseConfirmedPersonalImport() {
  if (!canModifyData(currentUserRole())) return;
  if (!isSupabaseConfigured()) return;
  const token = currentSupabaseAccessToken();
  if (!token) return;
  await supabaseFetch(
    `/rest/v1/${personalSupabaseImportTableName}?active=eq.true`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    },
    token
  ).catch(() => undefined);
}

async function saveSupabaseConfirmedImport(report: ImportReport, dashboardData: ImportedDashboardData) {
  if (!canModifyData(currentUserRole())) return false;
  if (!isSupabaseConfigured()) return false;
  const token = currentSupabaseAccessToken();
  if (!token) return false;
  await supabaseFetch(
    `/rest/v1/${supabaseImportTableName}?active=eq.true`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ active: false })
    },
    token
  ).catch(() => undefined);
  await supabaseFetch(
    `/rest/v1/${supabaseImportTableName}`,
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: importHistoryId(dashboardData.fileName),
        active: true,
        file_name: dashboardData.fileName,
        imported_at: dashboardData.importedAt,
        schema_version: dashboardData.schemaVersion,
        report,
        payload: dashboardData
      })
    },
    token
  );
  return true;
}

async function clearSupabaseConfirmedImport() {
  if (!canModifyData(currentUserRole())) return;
  if (!isSupabaseConfigured()) return;
  const token = currentSupabaseAccessToken();
  if (!token) return;
  await supabaseFetch(
    `/rest/v1/${supabaseImportTableName}?active=eq.true`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    },
    token
  ).catch(() => undefined);
}

async function loadSupabaseAppSetting<T>(key: string) {
  if (!isSupabaseConfigured()) return null;
  const token = currentSupabaseAccessToken();
  if (!token) return null;
  const rows = await supabaseFetch<Array<{ value: T }>>(
    `/rest/v1/${supabaseSettingsTableName}?select=value&key=eq.${encodeURIComponent(key)}&limit=1`,
    undefined,
    token
  ).catch(() => []);
  return rows[0]?.value ?? null;
}

async function saveSupabaseAppSetting(key: string, value: unknown) {
  if (!canModifyData(currentUserRole())) return false;
  if (!isSupabaseConfigured()) return false;
  const token = currentSupabaseAccessToken();
  if (!token) return false;
  await supabaseFetch(
    `/rest/v1/${supabaseSettingsTableName}?on_conflict=key`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: currentUserEmail() || currentUserName()
      })
    },
    token
  );
  return true;
}

async function accessUsersApi<T>(method = "GET", body?: unknown, retriedAfterRefresh = false): Promise<T> {
  const token = await activeSupabaseAccessToken(retriedAfterRefresh);
  const response = await fetch("/api/access-users", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if ((response.status === 401 || response.status === 403) && !retriedAfterRefresh) {
    return accessUsersApi<T>(method, body, true);
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Zugangsverwaltung konnte nicht aktualisiert werden.");
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : { ok: true }) as T;
}

async function loadConfirmedImportData() {
  const supabaseDashboard = await loadSupabaseConfirmedImport().catch(() => null);
  if (supabaseDashboard) {
    const repairedImport = repairImportedCashflowData(supabaseDashboard);
    await saveLocalConfirmedImport(repairedImport.report, repairedImport);
    return repairedImport;
  }
  const persistentDashboard = await readPersistentValue<ImportedDashboardData>(importPersistenceDashboardKey);
  const localDashboard = !persistentDashboard ? window.localStorage.getItem(importDashboardStorageKey) : null;
  const parsedDashboard = persistentDashboard ?? (localDashboard ? (JSON.parse(localDashboard) as ImportedDashboardData) : null);
  if (!parsedDashboard) return null;
  if (parsedDashboard.schemaVersion !== importDashboardSchemaVersion) {
    await clearLocalConfirmedImport();
    return null;
  }

  const repairedImport = repairImportedCashflowData(parsedDashboard);
  await saveConfirmedImport(repairedImport.report, repairedImport);
  return repairedImport;
}

async function saveLocalConfirmedImport(report: ImportReport, dashboardData: ImportedDashboardData) {
  const savedReport = await writePersistentValue(importPersistenceReportKey, report);
  const savedDashboard = await writePersistentValue(importPersistenceDashboardKey, dashboardData);
  window.localStorage.setItem(importStorageKey, JSON.stringify(report));
  if (savedReport && savedDashboard) {
    window.localStorage.removeItem(importDashboardStorageKey);
    return;
  }
  window.localStorage.setItem(importDashboardStorageKey, JSON.stringify(dashboardData));
}

async function saveConfirmedImport(report: ImportReport, dashboardData: ImportedDashboardData) {
  await saveLocalConfirmedImport(report, dashboardData);
  await saveSupabaseConfirmedImport(report, dashboardData).catch(() => false);
}

async function clearLocalConfirmedImport() {
  await Promise.all([
    deletePersistentValue(importPersistenceReportKey),
    deletePersistentValue(importPersistenceDashboardKey)
  ]);
  window.localStorage.removeItem(importStorageKey);
  window.localStorage.removeItem(importDashboardStorageKey);
}

async function clearConfirmedImport() {
  await clearSupabaseConfirmedImport();
  await clearLocalConfirmedImport();
}

async function loadConfirmedPersonalImportData() {
  const supabaseDashboard = await loadSupabaseConfirmedPersonalImport().catch(() => null);
  if (supabaseDashboard) {
    await saveLocalConfirmedPersonalImport(supabaseDashboard.report, supabaseDashboard);
    return supabaseDashboard;
  }
  const persistentDashboard = await readPersistentValue<PersonalDashboardData>(personalImportPersistenceDashboardKey);
  const localDashboard = !persistentDashboard ? window.localStorage.getItem(personalImportDashboardStorageKey) : null;
  const parsedDashboard = persistentDashboard ?? (localDashboard ? (JSON.parse(localDashboard) as PersonalDashboardData) : null);
  if (!parsedDashboard) return null;
  if (parsedDashboard.schemaVersion !== personalImportSchemaVersion) {
    await clearLocalConfirmedPersonalImport();
    return null;
  }
  return parsedDashboard;
}

async function saveLocalConfirmedPersonalImport(report: PersonalImportReport, dashboardData: PersonalDashboardData) {
  const savedReport = await writePersistentValue(personalImportPersistenceReportKey, report);
  const savedDashboard = await writePersistentValue(personalImportPersistenceDashboardKey, dashboardData);
  window.localStorage.setItem(personalImportStorageKey, JSON.stringify(report));
  if (savedReport && savedDashboard) {
    window.localStorage.removeItem(personalImportDashboardStorageKey);
    return;
  }
  window.localStorage.setItem(personalImportDashboardStorageKey, JSON.stringify(dashboardData));
}

async function saveConfirmedPersonalImport(report: PersonalImportReport, dashboardData: PersonalDashboardData) {
  await saveLocalConfirmedPersonalImport(report, dashboardData);
  await saveSupabaseConfirmedPersonalImport(report, dashboardData).catch(() => false);
}

async function clearLocalConfirmedPersonalImport() {
  await Promise.all([
    deletePersistentValue(personalImportPersistenceReportKey),
    deletePersistentValue(personalImportPersistenceDashboardKey)
  ]);
  window.localStorage.removeItem(personalImportStorageKey);
  window.localStorage.removeItem(personalImportDashboardStorageKey);
}

async function clearConfirmedPersonalImport() {
  await clearSupabaseConfirmedPersonalImport();
  await clearLocalConfirmedPersonalImport();
}

const requiredPersonalSheets = [
  "Input_Mitarbeiter",
  "Input_Krankheitstage",
  "Input_Personalmassnahmen",
  "Einstellungen"
];

const emptyPersonalImportReport: PersonalImportReport = {
  status: "idle",
  fileName: "",
  importedAt: "",
  presentSheets: [],
  missingSheets: [],
  employeeRows: 0,
  activeEmployees: 0,
  sicknessRows: 0,
  salaryRows: 0,
  actionRows: 0,
  sites: [],
  years: [],
  warnings: [],
  errors: [],
  changes: {
    newEmployees: 0,
    changedEmployees: 0,
    inactiveEmployees: 0,
    newSicknessEntries: 0,
    changedSicknessEntries: 0,
    newSalaryEntries: 0,
    changedSalaryEntries: 0,
    newActions: 0,
    changedActions: 0
  }
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
  { key: "summe_sonstige_kosten", label: "Summe sonstige Kosten", section: "4. Sachkosten / EBITDA", order: 490, source: ["sach_sonstige_kosten", "sonstige_kosten"] },
  { key: "ebitda", label: "EBITDA", section: "4. Sachkosten / EBITDA", order: 500, source: ["ebitda"], emphasis: true },
  { key: "ebitda_marge", label: "EBITDA-Marge", section: "4. Sachkosten / EBITDA", order: 510, source: [], percent: true, derived: "ebitda_marge" },
  { key: "ziel_ebitda_kaufvertrag", label: "Ziel-EBITDA gemäß Kaufvertrag", section: "4. Sachkosten / EBITDA", order: 520, source: [], derived: "target_kv" },
  { key: "abweichung_ziel_ebitda_kaufvertrag_abs", label: "Abw. Ziel-EBITDA Kaufvertrag", section: "4. Sachkosten / EBITDA", order: 530, source: [], derived: "abw_abs_kv" },
  { key: "abweichung_ziel_ebitda_kaufvertrag_pct", label: "Abw. Ziel-EBITDA Kaufvertrag %", section: "4. Sachkosten / EBITDA", order: 540, source: [], percent: true, derived: "abw_pct_kv" },
  { key: "ziel_ebitda_uebernahme", label: "Ziel-EBITDA gemäß Übernahme", section: "4. Sachkosten / EBITDA", order: 550, source: [], derived: "target_uebernahme" },
  { key: "abweichung_ziel_ebitda_uebernahme_abs", label: "Abw. Ziel-EBITDA Übernahme", section: "4. Sachkosten / EBITDA", order: 560, source: [], derived: "abw_abs_uebernahme" },
  { key: "abweichung_ziel_ebitda_uebernahme_pct", label: "Abw. Ziel-EBITDA Übernahme %", section: "4. Sachkosten / EBITDA", order: 570, source: [], percent: true, derived: "abw_pct_uebernahme" },
  { key: "operative_prozesskosten_bis_ebitda", label: "Operative Praxiskosten bis EBITDA", section: "4. Sachkosten / EBITDA", order: 580, source: [], emphasis: true, derived: "operative_prozesskosten_bis_ebitda" },
  { key: "section_ergebnis", label: "5. Unter EBITDA / Vorläufiges Ergebnis", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 600, source: [], emphasis: true },
  { key: "abschreibungen", label: "Abschreibungen", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 610, source: ["abschreibungen"] },
  { key: "zinsen_neutraler_aufwand", label: "Zinsen & neutraler Aufwand", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 620, source: ["zinsen_neutraler_aufwand"] },
  { key: "zinsertrag_abzinsung_rueckstellungen", label: "Zinsertrag Abzinsung Rückstellungen", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 630, source: ["zinsertrag_abzinsung_ruckstellungen"] },
  { key: "steuern_einkommen_ertrag", label: "Steuern vom Einkommen und Ertrag", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 640, source: ["steuern_vom_einkommen_und_ertrag"] },
  { key: "vorlaeufiges_ergebnis", label: "Vorläufiges Ergebnis", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 650, source: ["vorlaufiges_ergebnis"], emphasis: true },
  { key: "ergebnisquote", label: "Ergebnisquote", section: "5. Unter EBITDA / Vorläufiges Ergebnis", order: 660, source: [], percent: true, derived: "ergebnisquote" },
  { key: "section_cashflow", label: "6. Cashflow-Adjustments gem. BWA", section: "6. Cashflow-Adjustments gem. BWA", order: 700, source: [], emphasis: true, kind: "cashflow" as const },
  { key: "cf_abschreibungen", label: "+ Abschreibungen", section: "6. Cashflow-Adjustments gem. BWA", order: 710, source: ["plus_abschreibungen"], kind: "cashflow" as const },
  { key: "investitionsausgaben", label: "Investitionsausgaben", section: "6. Cashflow-Adjustments gem. BWA", order: 720, source: ["investitionsausgaben"], kind: "cashflow" as const },
  { key: "tilgung", label: "Tilgung", section: "6. Cashflow-Adjustments gem. BWA", order: 730, source: ["tilgung"], kind: "cashflow" as const },
  { key: "umbuchung_zmvz", label: "Umbuchung ZMVZ", section: "6. Cashflow-Adjustments gem. BWA", order: 740, source: ["umbuchung_zmvz"], kind: "cashflow" as const },
  { key: "sonstige_rueckstellungen_bestandsminderungen", label: "Sonstige Rückstellungen / Bestandsminderungen", section: "6. Cashflow-Adjustments gem. BWA", order: 750, source: ["sonstige_ruckstellungen_bestandsminderungen"], kind: "cashflow" as const },
  { key: "cashflow_gesamt", label: "CashFlow gem. BWA", section: "6. Cashflow-Adjustments gem. BWA", order: 760, source: ["cashflow_gesamt"], emphasis: true, kind: "cashflow" as const },
  { key: "cashflow_quote", label: "CashFlow-Quote gem. BWA", section: "6. Cashflow-Adjustments gem. BWA", order: 770, source: [], percent: true, derived: "cashflow_quote", kind: "cashflow" as const }
] as const;

const bwaDeductionMetricKeys = new Set([
  "fremdlabor_gesamt",
  "materialkosten_gesamt",
  "personalkosten_gesamt",
  "reparatur_instandhaltung",
  "miete_nebenkosten",
  "reise_fortbildung_seminare",
  "kfz_praxiseinrichtung",
  "versicherungen_beitraege",
  "kzv_verwaltungskosten",
  "bfs_factoring",
  "ec_terminal",
  "nicht_abziehbare_vorsteuer",
  "sonstige_kosten",
  "summe_sonstige_kosten",
  "operative_praxiskosten_bis_ebitda",
  "operative_prozesskosten_bis_ebitda",
  "abschreibungen",
  "zinsen_neutraler_aufwand",
  "steuern_einkommen_ertrag",
  "investitionsausgaben",
  "tilgung",
  "umbuchung_zmvz",
  "sonstige_rueckstellungen_bestandsminderungen"
]);

const bwaDeductionLabelKeys = new Set([
  "fremdlabor_gesamt",
  "materialkosten_gesamt",
  "personalkosten_gesamt",
  "personalkosten_aggregiert",
  "reparatur_und_instandhaltung",
  "miete_nebenkosten",
  "reise_fortbildung_seminare",
  "kfz_praxiseinrichtung",
  "versicherungen_beitraege",
  "versicherungen_beitrage",
  "kzv_verwaltungskosten",
  "bfs_factoring",
  "ec_terminal",
  "nicht_abziehbare_vorsteuer",
  "sonstige_kosten",
  "sonstige_kosten_gesamt",
  "summe_sonstige_kosten",
  "operative_praxiskosten_bis_ebitda",
  "operative_prozesskosten_bis_ebitda",
  "abschreibungen",
  "zinsen_neutraler_aufwand",
  "steuern_vom_einkommen_und_ertrag",
  "investitionsausgaben",
  "tilgung",
  "umbuchung_zmvz",
  "sonstige_ruckstellungen_bestandsminderungen"
]);

const statusMap: Record<Status, { label: string; dot: string; tone: "green" | "yellow" | "red" }> = {
  green: { label: "Stabil", dot: "bg-emerald-500", tone: "green" },
  yellow: { label: "Beobachten", dot: "bg-amber-500", tone: "yellow" },
  red: { label: "Handlungsbedarf", dot: "bg-red-500", tone: "red" }
};

const navSections = [
  {
    id: "management",
    label: "Zusammenfassung",
    items: [
      { id: "cockpit", label: "CFO Cockpit", icon: Home },
      { id: "personal-cockpit", label: "Personal-Cockpit", icon: Users }
    ]
  },
  {
    id: "site-finance",
    label: "Standorte & BWA",
    items: [
      { id: "standorte", label: "Standorte", icon: Building2 },
      { id: "bwa", label: "BWA", icon: FileBarChart },
      { id: "kennzahlen", label: "Kennzahlen / Entwicklung", icon: BarChart3 },
      { id: "cashflow", label: "Cashflow", icon: Wallet }
    ]
  },
  {
    id: "performance-analysis",
    label: "Performance & Benchmarking",
    items: [
      { id: "performance", label: "Orisus Performance", icon: TrendingUp },
      { id: "analysen", label: "Benchmarking", icon: BarChart3 }
    ]
  },
  {
    id: "financing-reporting",
    label: "Finanzierung & Reporting",
    items: [
      { id: "darlehen", label: "Darlehen & Earn-Out", icon: Landmark },
      { id: "board", label: "Board-Pack", icon: FileBarChart },
      { id: "banken", label: "Bankenreporting", icon: ShieldCheck }
    ]
  },
  {
    id: "patients",
    label: "Patienten",
    items: [{ id: "patienten-auswertungen", label: "Auswertungen", icon: Stethoscope }]
  },
  {
    id: "personal",
    label: "Personal",
    items: [
      { id: "personal-krankheit", label: "Krankheit / Fehlzeiten", icon: Stethoscope },
      { id: "personal-mitarbeiter", label: "Mitarbeiterübersicht", icon: UserRound },
      { id: "personal-massnahmen", label: "Personalmaßnahmen", icon: CheckCircle2 }
    ]
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { id: "uploads", label: "CFO-Upload", icon: FileUp },
      { id: "personal-upload", label: "Personal-Upload", icon: FileUp },
      { id: "reports", label: "Reports", icon: FileBarChart },
      { id: "admin", label: "Admin / KPI-Regeln", icon: Lock }
    ]
  }
] as const;

const mobileNav = [
  { id: "cockpit", label: "CFO Cockpit", icon: Home },
  { id: "personal-cockpit", label: "Personal", icon: Users },
  { id: "standorte", label: "Standorte", icon: Building2 },
  { id: "bwa", label: "BWA", icon: FileBarChart },
  { id: "personal-mitarbeiter", label: "Mitarbeiter", icon: UserRound }
] as const;

const appPageIds: Page[] = [
  "cockpit",
  "kennzahlen",
  "performance",
  "standorte",
  "standort-detail",
  "analysen",
  "bwa",
  "cashflow",
  "darlehen",
  "banken",
  "board",
  "uploads",
  "reports",
  "admin",
  "personal-cockpit",
  "personal-krankheit",
  "personal-mitarbeiter",
  "personal-massnahmen",
  "personal-upload",
  "patienten-auswertungen"
];

const praxisManagementPages: Page[] = ["personal-krankheit", "personal-mitarbeiter", "personal-massnahmen"];

function pagesForRole(role: UserRole): Page[] {
  if (role === "admin") return appPageIds;
  if (role === "praxismanagement") return praxisManagementPages;
  return appPageIds.filter((page) => !["uploads", "admin", "personal-upload"].includes(page));
}

function navSectionsForRole(role: UserRole) {
  const allowedPages = pagesForRole(role);
  return navSections
    .map((section) => {
      const items = section.items.filter((item) => allowedPages.includes(item.id as Page));
      if (role !== "admin" && section.id === "admin" && items.some((item) => item.id === "reports")) {
        return {
          ...section,
          label: "Berichte",
          items: items.filter((item) => item.id === "reports")
        };
      }
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

function defaultPageForRole(role: UserRole): Page {
  if (role === "praxismanagement") return "personal-mitarbeiter";
  return pagesForRole(role).includes("cockpit") ? "cockpit" : pagesForRole(role)[0] ?? "cockpit";
}

function mobileNavForRole(role: UserRole) {
  if (role === "praxismanagement") {
    return [
      { id: "personal-mitarbeiter", label: "Mitarbeiter", icon: UserRound },
      { id: "personal-krankheit", label: "Krankheit", icon: Stethoscope },
      { id: "personal-massnahmen", label: "Maßnahmen", icon: CheckCircle2 }
    ] as const;
  }
  const allowedPages = pagesForRole(role);
  return mobileNav.filter((item) => allowedPages.includes(item.id as Page));
}

function storedPage(): Page {
  if (typeof window === "undefined") return "cockpit";
  const savedPage = window.localStorage.getItem(activePageStorageKey) as Page | null;
  return savedPage && appPageIds.includes(savedPage) ? savedPage : "cockpit";
}

function storedSiteId() {
  if (typeof window === "undefined") return "kirchberg";
  return window.localStorage.getItem(activeSiteStorageKey) || "kirchberg";
}

function scrollAppToTop() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}

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

function pctOneDecimal(value: number) {
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
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

function displayDateTimeFromUnknown(value: unknown) {
  if (!value) return "Noch nie";
  const date = new Date(asText(value));
  if (Number.isNaN(date.getTime())) return "Noch nie";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

function normalizePersonalText(value: unknown) {
  return asText(value).replace(/\s+/g, " ").trim();
}

function yesNo(value: unknown) {
  return ["ja", "yes", "true", "1", "x"].includes(asText(value).toLowerCase());
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });
}

function objectFromHeaderRow(headers: unknown[], row: unknown[]) {
  return headers.reduce<Record<string, unknown>>((result, header, index) => {
    const key = asText(header);
    if (key) result[key] = row[index];
    return result;
  }, {});
}

function personalCompositeId(parts: unknown[]) {
  return parts.map((part) => normalizePersonalText(part).toLowerCase()).join("|");
}

function parsePersonalEmployees(workbook: XLSX.WorkBook): PersonalEmployee[] {
  const rows = readSheetRows(workbook, "Input_Mitarbeiter");
  const headers = rows[0] ?? [];
  return rows
    .slice(1)
    .map((row) => objectFromHeaderRow(headers, row))
    .filter((row) => asText(row.Mitarbeiter_ID))
    .map((row) => {
      const firstName = normalizePersonalText(row.Vorname);
      const lastName = normalizePersonalText(row.Nachname);
      return {
        id: asText(row.Mitarbeiter_ID),
        site: normalizePersonalText(row.Standort),
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        birthDate: displayDateFromUnknown(row.Geburtsdatum),
        functionName: normalizePersonalText(row.Funktion),
        area: normalizePersonalText(row.Bereich),
        employmentType: normalizePersonalText(row.Beschäftigungsart),
        isDentist: yesNo(row.Behandler),
        isSiteLead: yesNo(row.Standortleitung),
        hasPersonnelResponsibility: yesNo(row.Personalverantwortung),
        entryDate: displayDateFromUnknown(row.Eintrittsdatum),
        contractUntil: displayDateFromUnknown(row.Arbeitsvertrag_bis),
        exitDate: displayDateFromUnknown(row.Austrittsdatum),
        status: normalizePersonalText(row.Status) || "Nicht gesetzt",
        weeklyHours: asNumber(row.Wochenstunden) ?? 0,
        vacationDays: asNumber(row.Urlaubstage) ?? 0,
        payModel: normalizePersonalText(row.Vergütungsmodell),
        fixedSalary: asNumber(row.Fixgehalt) ?? 0,
        hourlyWage: asNumber(row.Stundenlohn_Fixgehalt) ?? 0,
        employerCost: asNumber(row.AG_Aufwand) ?? 0,
        note: normalizePersonalText(row.Bemerkung)
      };
    });
}

function parsePersonalSicknessEntries(workbook: XLSX.WorkBook): PersonalSicknessEntry[] {
  const rows = readSheetRows(workbook, "Input_Krankheitstage");
  const headers = rows[3] ?? [];
  return rows
    .slice(4)
    .map((row) => objectFromHeaderRow(headers, row))
    .filter((row) => asText(row.Mitarbeiter_ID) || asText(row.Mitarbeiter))
    .map((row) => {
      const employeeId = asText(row.Mitarbeiter_ID);
      const employeeName = normalizePersonalText(row.Mitarbeiter);
      const site = normalizePersonalText(row.Standort);
      const year = Math.trunc(asNumber(row.Jahr) ?? 0);
      const month = Math.trunc(asNumber(row.Monat) ?? 0);
      const from = displayDateFromUnknown(row.Von);
      const to = displayDateFromUnknown(row.Bis);
      const days = asNumber(row.Krankheitstage) ?? 0;
      return {
        id: personalCompositeId([employeeId, employeeName, site, year, month, from, to, days]),
        employeeId,
        employeeName,
        site,
        year,
        month,
        days,
        from,
        to
      };
    })
    .filter((entry) => entry.days || entry.year || entry.month);
}

function parsePersonalSalaryEntries(workbook: XLSX.WorkBook): PersonalSalaryEntry[] {
  const rows = readSheetRows(workbook, "Input_Gehaltshistorie");
  const headers = rows[3] ?? [];
  return rows
    .slice(4)
    .map((row) => objectFromHeaderRow(headers, row))
    .filter((row) => asText(row.Mitarbeiter_ID) || asText(row.Mitarbeiter))
    .map((row) => {
      const employeeId = asText(row.Mitarbeiter_ID);
      const employeeName = normalizePersonalText(row.Mitarbeiter);
      const date = displayDateFromUnknown(row.Datum);
      const oldSalary = asNumber(row.Gehalt_alt) ?? 0;
      const newSalary = asNumber(row.Gehalt_neu) ?? 0;
      return {
        id: personalCompositeId([employeeId, employeeName, date, row.Gehalt_alt, row.Gehalt_neu, row.Grund]),
        employeeId,
        employeeName,
        site: normalizePersonalText(row.Standort),
        date,
        oldSalary,
        newSalary,
        difference: asNumber(row.Differenz) ?? newSalary - oldSalary,
        reason: normalizePersonalText(row.Grund),
        approvedBy: normalizePersonalText(row.Freigegeben_von)
      };
    });
}

function parsePersonalActionEntries(workbook: XLSX.WorkBook): PersonalActionEntry[] {
  const rows = readSheetRows(workbook, "Input_Personalmassnahmen");
  const headers = rows[3] ?? [];
  return rows
    .slice(4)
    .map((row) => objectFromHeaderRow(headers, row))
    .filter((row) => asText(row.Mitarbeiter_ID) || asText(row.Mitarbeiter) || asText(row.Maßnahme))
    .map((row) => {
      const employeeId = asText(row.Mitarbeiter_ID);
      const employeeName = normalizePersonalText(row.Mitarbeiter);
      const date = displayDateFromUnknown(row.Datum);
      const action = normalizePersonalText(row.Maßnahme);
      return {
        id: personalCompositeId([employeeId, employeeName, date, action, row["Bemerkung / Details"]]),
        employeeId,
        employeeName,
        site: normalizePersonalText(row.Standort),
        date,
        action,
        details: normalizePersonalText(row["Bemerkung / Details"]),
        status: normalizePersonalText(row.Status) || "Offen"
      };
    });
}

function parsePersonalSettings(workbook: XLSX.WorkBook, employees: PersonalEmployee[]): PersonalDashboardData["settings"] {
  const rows = readSheetRows(workbook, "Einstellungen");
  const values = rows.flat();
  return {
    sites: uniqueSortedText([...employees.map((employee) => employee.site), ...values.filter((value) => ["Kirchberg", "Essen", "Kehl", "Ulmet", "Hüttenberg"].includes(asText(value)))]),
    statuses: uniqueSortedText(employees.map((employee) => employee.status), ["Aktiv", "Elternzeit", "Inaktiv"]),
    employmentTypes: uniqueSortedText(employees.map((employee) => employee.employmentType)),
    functions: uniqueSortedText(employees.map((employee) => employee.functionName)),
    payModels: uniqueSortedText(employees.map((employee) => employee.payModel))
  };
}

function countNewAndChanged<T extends { id: string }>(current: T[], previous: T[] = []) {
  const previousMap = new Map(previous.map((entry) => [entry.id, JSON.stringify(entry)]));
  return current.reduce(
    (result, entry) => {
      const previousValue = previousMap.get(entry.id);
      if (!previousValue) result.new += 1;
      else if (previousValue !== JSON.stringify(entry)) result.changed += 1;
      return result;
    },
    { new: 0, changed: 0 }
  );
}

function buildPersonalDashboardData(workbook: XLSX.WorkBook, fileName: string, previous?: PersonalDashboardData | null): PersonalDashboardData {
  const presentSheets = requiredPersonalSheets.filter((sheet) => workbook.SheetNames.includes(sheet));
  const missingSheets = requiredPersonalSheets.filter((sheet) => !workbook.SheetNames.includes(sheet));
  const employees = parsePersonalEmployees(workbook);
  const sicknessEntries = parsePersonalSicknessEntries(workbook);
  const salaryEntries = parsePersonalSalaryEntries(workbook);
  const actionEntries = parsePersonalActionEntries(workbook);
  const settings = parsePersonalSettings(workbook, employees);
  const years = uniqueSortedNumbers(sicknessEntries.map((entry) => entry.year));
  const sites = uniqueSortedText(employees.map((employee) => employee.site));
  const employeeChanges = countNewAndChanged(employees, previous?.employees);
  const sicknessChanges = countNewAndChanged(sicknessEntries, previous?.sicknessEntries);
  const salaryChanges = countNewAndChanged(salaryEntries, previous?.salaryEntries);
  const actionChanges = countNewAndChanged(actionEntries, previous?.actionEntries);
  const warnings = [
    ...(!actionEntries.length ? ["Personalmaßnahmen enthalten aktuell keine offenen Datensätze."] : []),
    ...(!years.length ? ["Krankheitsjahre konnten nicht eindeutig erkannt werden."] : [])
  ];
  const errors = [
    ...missingSheets.map((sheet) => `Pflichtblatt fehlt: ${sheet}`),
    ...(!employees.length ? ["Input_Mitarbeiter enthält keine Mitarbeiter_ID-Datensätze."] : [])
  ];
  const report: PersonalImportReport = {
    status: errors.length ? "error" : warnings.length ? "warning" : "ready",
    fileName,
    importedAt: new Date().toISOString(),
    presentSheets,
    missingSheets,
    employeeRows: employees.length,
    activeEmployees: employees.filter((employee) => employee.status.toLowerCase() === "aktiv").length,
    sicknessRows: sicknessEntries.length,
    salaryRows: salaryEntries.length,
    actionRows: actionEntries.length,
    sites,
    years,
    warnings,
    errors,
    changes: {
      newEmployees: employeeChanges.new,
      changedEmployees: employeeChanges.changed,
      inactiveEmployees: employees.filter((employee) => employee.status.toLowerCase() !== "aktiv").length,
      newSicknessEntries: sicknessChanges.new,
      changedSicknessEntries: sicknessChanges.changed,
      newSalaryEntries: salaryChanges.new,
      changedSalaryEntries: salaryChanges.changed,
      newActions: actionChanges.new,
      changedActions: actionChanges.changed
    }
  };

  return {
    schemaVersion: personalImportSchemaVersion,
    importedAt: report.importedAt,
    fileName,
    employees,
    sicknessEntries,
    salaryEntries,
    actionEntries,
    settings,
    report
  };
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

const providerNameAliasesBySite: Record<string, Record<string, string>> = {
  kirchberg: {
    pzr_pomsel_plus: "S. Pomsel",
    pzr_bomsel_plus: "S. Pomsel",
    samira_pomsel: "S. Pomsel",
    s_pomsel: "S. Pomsel",
    s_bomsel: "S. Pomsel",
    f_patsch: "F. Patsch",
    pzr_patsch: "F. Patsch",
    f_parch: "F. Patsch",
    pzr_parch: "F. Patsch",
    p_heinz: "P. Heinz",
    assi_patrizia_heinz: "P. Heinz",
    patrizia_heinz: "P. Heinz",
    s_grafe: "S. Gräfe",
    pzr_grafe: "S. Gräfe",
    n_orsos: "N. Orsós",
    nicole_n_orsos: "N. Orsós",
    n_orjus: "N. Orsós",
    nicole_n_orjus: "N. Orsós",
    za_nicole_orsos: "N. Orsós",
    zahnarztin_nicole_orsos: "N. Orsós",
    zahnarztin_nicole: "N. Orsós",
    pzr_dietrich: "S. Dietrich",
    s_dietrich: "S. Dietrich"
  }
};

function canonicalProviderName(siteId: string, name: string) {
  return providerNameAliasesBySite[siteId]?.[normalizeMetric(name)] ?? name;
}

const bankMovementKeyAliases: Record<string, string[]> = {
  cashflow_gesamt_im_monat: ["bank_cashflow_gesamt_im_monat"],
  cashflow_vor_intercompany: [
    "bank_cashflow_vor_intercompany",
    "cashflow_vor_umbuchungen_intercompany",
    "bank_cashflow_vor_umbuchungen_intercompany"
  ],
  davon_sonstiges_erstattungen_etc: [
    "davon_sonstiges_miete_ersattungen_etc",
    "davon_sonstiges_miete_erstattungen_etc"
  ]
};

function matchesBankMovementKey(label: unknown, key: string) {
  const normalizedLabel = normalizeMetric(label);
  const normalizedKey = normalizeMetric(key);
  const labelWithoutBankPrefix = normalizedLabel.replace(/^bank_/, "");
  const aliases = bankMovementKeyAliases[normalizedKey] ?? [];
  return (
    normalizedLabel === normalizedKey ||
    labelWithoutBankPrefix === normalizedKey ||
    aliases.includes(normalizedLabel) ||
    aliases.includes(labelWithoutBankPrefix)
  );
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

const treatmentRoomsBySiteId: Record<string, number> = {
  kirchberg: 4,
  essen: 5,
  kehl: 5,
  ulmet: 12,
  huettenberg: 4
};

function staticTreatmentRoomsForSite(siteName: string) {
  return treatmentRoomsBySiteId[siteIdForName(siteName)] ?? 0;
}

function parseGermanDisplayDate(value: unknown) {
  const text = asText(value).trim();
  if (!text) return null;
  const germanDate = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanDate) {
    const day = Number(germanDate[1]);
    const month = Number(germanDate[2]);
    const year = Number(germanDate[3]);
    const date = new Date(year, month - 1, day);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function yearFromPeriodLabel(period: string, fallback = 2026) {
  const match = period.match(/20\d{2}/);
  return match ? Number(match[0]) : fallback;
}

function monthDateRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999)
  };
}

function personalEmployeeActiveInDateRange(employee: PersonalEmployee, start: Date, end: Date) {
  const entryDate = parseGermanDisplayDate(employee.entryDate);
  const exitDate = parseGermanDisplayDate(employee.exitDate);
  if (entryDate && entryDate > end) return false;
  if (exitDate && exitDate < start) return false;
  if (!entryDate && !exitDate && employee.status.toLowerCase() !== "aktiv") return false;
  return true;
}

type DentistCapacityBasis = {
  headcount: number;
  weeklyHours: number;
  fte: number;
  months: number;
};

function dentistCapacityBySiteForPeriod(employees: PersonalEmployee[], period: string) {
  const months = Array.from(monthSelectionForPeriod(period));
  const monthCount = Math.max(months.length, 1);
  const year = yearFromPeriodLabel(period);
  const totals = new Map<string, { headcountMonths: number; weeklyHoursMonths: number }>();

  months.forEach((month) => {
    const { start, end } = monthDateRange(year, month);
    employees.forEach((employee) => {
      if (!employee.isDentist) return;
      if (!personalEmployeeActiveInDateRange(employee, start, end)) return;
      const siteId = siteIdForName(employee.site);
      if (!siteId) return;
      const existing = totals.get(siteId) ?? { headcountMonths: 0, weeklyHoursMonths: 0 };
      existing.headcountMonths += 1;
      existing.weeklyHoursMonths += employee.weeklyHours || 0;
      totals.set(siteId, existing);
    });
  });

  const result = new Map<string, DentistCapacityBasis>();
  totals.forEach((value, siteId) => {
    const weeklyHours = value.weeklyHoursMonths / monthCount;
    const headcount = value.headcountMonths / monthCount;
    result.set(siteId, {
      headcount,
      weeklyHours,
      fte: weeklyHours / 40,
      months: monthCount
    });
  });
  return result;
}

function dentistCapacityBasisLabel(capacity?: DentistCapacityBasis) {
  if (!capacity || !capacity.fte) return "keine Zahnarztstunden im Zeitraum";
  return `${capacity.fte.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Zahnarzt-FTE (${capacity.weeklyHours.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std./Woche Ø, ${capacity.headcount.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Köpfe Ø)`;
}

const defaultPracticeOpeningHoursBySiteId: Record<string, number> = {
  kirchberg: 53,
  essen: 39,
  kehl: 56,
  ulmet: 84,
  huettenberg: 52.5
};

const practiceOpeningHoursStorageKey = "orisus_practice_opening_hours_v1";
const practiceOpeningHoursChangedEvent = "orisus-practice-opening-hours-changed";
const practiceOpeningHoursSettingKey = "practice_opening_hours";

function practiceOpeningHoursForSite(siteName: string, openingHoursBySiteId = defaultPracticeOpeningHoursBySiteId) {
  return openingHoursBySiteId[siteIdForName(siteName)] ?? defaultPracticeOpeningHoursBySiteId[siteIdForName(siteName)] ?? 0;
}

function normalizePracticeOpeningHours(input: Record<string, unknown> | null | undefined) {
  const defaults = { ...defaultPracticeOpeningHoursBySiteId };
  Object.entries(input ?? {}).forEach(([siteId, value]) => {
    const numericValue = asNumber(value);
    if (numericValue != null && numericValue >= 0) defaults[siteIdForName(siteId)] = numericValue;
  });
  return defaults;
}

function readPracticeOpeningHours() {
  if (typeof window === "undefined") return normalizePracticeOpeningHours(null);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(practiceOpeningHoursStorageKey) ?? "{}") as Record<string, unknown>;
    return normalizePracticeOpeningHours(parsed);
  } catch {
    return normalizePracticeOpeningHours(null);
  }
}

function usePracticeOpeningHours() {
  const [openingHoursBySiteId, setOpeningHoursState] = useState<Record<string, number>>(() => ({ ...defaultPracticeOpeningHoursBySiteId }));

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const cached = readPracticeOpeningHours();
      setOpeningHoursState(cached);
      void loadSupabaseAppSetting<Record<string, unknown>>(practiceOpeningHoursSettingKey).then((setting) => {
        if (cancelled || !setting) return;
        const normalized = normalizePracticeOpeningHours(setting);
        setOpeningHoursState(normalized);
        window.localStorage.setItem(practiceOpeningHoursStorageKey, JSON.stringify(normalized));
      });
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener(practiceOpeningHoursChangedEvent, load);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", load);
      window.removeEventListener(practiceOpeningHoursChangedEvent, load);
    };
  }, []);

  const setOpeningHoursBySiteId = (next: Record<string, number>) => {
    const cleaned = normalizePracticeOpeningHours(next);
    setOpeningHoursState(cleaned);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(practiceOpeningHoursStorageKey, JSON.stringify(cleaned));
      window.dispatchEvent(new Event(practiceOpeningHoursChangedEvent));
    }
    return cleaned;
  };

  return { openingHoursBySiteId, setOpeningHoursBySiteId };
}

function acquisitionTermsForSite(siteName: string) {
  return acquisitionTermsBySiteId[siteIdForName(siteName)] ?? emptyAcquisitionTerms;
}

function additionalDebtForSite(siteName: string) {
  return additionalDebtBySiteId[siteIdForName(siteName)] ?? 0;
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

function latestRowsValueByTerms(
  rows: Record<string, unknown>[],
  site: string | null,
  termGroups: string[][],
  domains?: string[]
) {
  for (const terms of termGroups) {
    const normalizedTerms = terms.map(normalizeMetric).filter(Boolean);
    const candidates = rows
      .filter((row) => {
        const value = asNumber(row.Wert);
        if (value == null || value <= 0) return false;
        if (site && asText(row.Standortname) !== site) return false;
        const domain = rowDomain(row);
        if (domains?.length && !metricMatches(domain, domains)) return false;
        const searchable = [
          row.Kennzahl,
          row.Standard_Kennzahl,
          row.Detailbezeichnung,
          row.Kategorie,
          row.Standard_Kategorie,
          row.Datenbereich,
          row.Standard_Datenbereich
        ]
          .map(normalizeMetric)
          .join("_");
        return normalizedTerms.every((term) => searchable.includes(term));
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

function acquisitionTermsFromRows(siteName: string, rows: Record<string, unknown>[]) {
  const fallback = acquisitionTermsForSite(siteName);
  const maxEarnOut = lastRowsValue(rows, siteName, ["max_earn_out"], ["stammdaten"]) || fallback.earnOutGesamt;
  return {
    ...fallback,
    earnOutGesamt: maxEarnOut,
    earnOutUntergrenze: lastRowsValue(rows, siteName, ["untergrenze_earn_out"], ["stammdaten"]) || fallback.earnOutUntergrenze,
    earnOutReduktionsfaktor:
      lastRowsValue(rows, siteName, ["reduktionsfaktor_earn_out"], ["stammdaten"]) || fallback.earnOutReduktionsfaktor,
    wachstumsfaktor: lastRowsValue(rows, siteName, ["faktor_wachstumszahlung"], ["stammdaten"]) || fallback.wachstumsfaktor,
    zielEbitdaKaufvertragPa:
      lastRowsValue(rows, siteName, ["ziel_ebitda_kaufvertrag_p_a"], ["stammdaten"]) || fallback.zielEbitdaKaufvertragPa
  };
}

function treatmentRoomsFromRows(siteName: string, rows: Record<string, unknown>[]) {
  const staticRooms = staticTreatmentRoomsForSite(siteName);
  if (staticRooms > 0) return staticRooms;

  const value =
    latestRowsValueByTerms(
      rows,
      siteName,
      [
        ["behandlungszimmer"],
        ["anzahl", "behandlungszimmer"],
        ["behandlung", "zimmer"],
        ["zimmer"]
      ],
      ["stammdaten", "dashboard", "finanzen"]
    ) ||
    lastRowsValue(
      rows,
      siteName,
      ["behandlungszimmer", "anzahl_behandlungszimmer", "anzahl_zimmer", "behandlungszimmer_anzahl"],
      ["stammdaten", "dashboard", "finanzen"]
    );
  return value > 0 ? Math.round(value) : 0;
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

function isCurrentOpenReceivablesRow(row: Record<string, unknown>) {
  const sourceText = [row.Datenquelle, row.Unterkategorie, row.Kennzahl, row.Standard_Kennzahl, row.Detailbezeichnung]
    .map(normalizeMetric)
    .join(" ");
  const domain = rowDomain(row);
  return (
    domain === "finanzen" &&
    (sourceText.includes("noch_nicht_geflossen_gesamt") || sourceText.includes("offene_forderungen_gesamt"))
  );
}

function currentOpenReceivablesRowValue(row: Record<string, unknown>) {
  if (!isCurrentOpenReceivablesRow(row)) return null;
  const sourceText = [row.Datenquelle, row.Unterkategorie].map(normalizeMetric).join(" ");
  if (sourceText.includes("noch_nicht_geflossen_gesamt")) {
    return asNumber(row.Kategorie) ?? asNumber(row.Standard_Kategorie) ?? asNumber(row.Wert);
  }
  return asNumber(row.Wert) ?? asNumber(row.Kategorie) ?? asNumber(row.Standard_Kategorie);
}

function preferredCurrentOpenReceivablesValue(rows: Record<string, unknown>[]) {
  const candidates = rows
    .map((row) => ({ row, value: currentOpenReceivablesRowValue(row) }))
    .filter((entry): entry is { row: Record<string, unknown>; value: number } => entry.value != null && entry.value > 0)
    .sort((a, b) => {
      const yearDelta = (rowYear(b.row) ?? 0) - (rowYear(a.row) ?? 0);
      if (yearDelta) return yearDelta;
      return (rowMonth(b.row) ?? 0) - (rowMonth(a.row) ?? 0);
    });
  return candidates[0]?.value ?? 0;
}

function managementOpenReceivablesFromWorkbook(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets.Dashboard_Management;
  if (!sheet) return new Map<string, number>();

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });
  const headerRowIndex = rows.findIndex((row) => row.some((cell) => normalizeMetric(cell) === "offene_forderungen_seit_start"));
  if (headerRowIndex < 0) return new Map<string, number>();

  const headerRow = rows[headerRowIndex] ?? [];
  const siteColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "offene_forderungen_seit_start");
  const valueColumn = siteColumn + 1;
  const valuesBySite = new Map<string, number>();

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const siteName = asText(row[siteColumn]);
    const value = asNumber(row[valueColumn]);
    if (!siteName || value == null) continue;
    const siteKey = siteIdForName(siteName);
    if (!standorte.some((site) => site.id === siteKey)) continue;
    valuesBySite.set(siteKey, value);
  }

  return valuesBySite;
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

function kontostandEntriesFromInputSheet(workbook: XLSX.WorkBook, siteName: string) {
  const siteKey = normalizeSiteId(siteName);
  const sheetName = workbook.SheetNames.find((name) => {
    const key = normalizeSiteId(name.replace(/^Input_Kontostand_?/i, ""));
    return normalizeSiteId(name).startsWith("input_kontostand") && key === siteKey;
  });
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });
  const yearRowIndex = rows.findIndex((row) => normalizeMetric(row[0]) === "jahr");
  const monthRowIndex = rows.findIndex((row) => normalizeMetric(row[0]).includes("bankkonto") && normalizeMetric(row[0]).includes("monat"));
  if (yearRowIndex < 0 || monthRowIndex < 0) return [];

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

  return monthColumns
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
}

function kontostandEntriesFromExportSheets(workbook: XLSX.WorkBook, siteName: string) {
  const siteKey = normalizeSiteId(siteName);
  const valuesByPeriod = new Map<string, { year: number; month: number; value: number }>();

  workbook.SheetNames.filter((sheetName) => {
    const key = normalizeSiteId(sheetName);
    return key.endsWith("_export") || key.startsWith("export_");
  }).forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false
    });

    rows.forEach((row) => {
      const rowSiteName = asText(row[1]) || asText(row[0]);
      if (normalizeSiteId(rowSiteName) !== siteKey) return;
      if (!row.some((cell) => normalizeMetric(cell) === "kontostand_monatsende")) return;
      const year = asNumber(row[14]);
      const month = asNumber(row[15]);
      const value = asNumber(row[17]);
      if (!year || year < 1900 || !month || month < 1 || month > 12 || value == null) return;
      const periodKey = `${Math.trunc(year)}-${Math.trunc(month)}`;
      const existing = valuesByPeriod.get(periodKey);
      valuesByPeriod.set(periodKey, {
        year: Math.trunc(year),
        month: Math.trunc(month),
        value: (existing?.value ?? 0) + value
      });
    });
  });

  return [...valuesByPeriod.values()].sort((a, b) => b.year - a.year || b.month - a.month);
}

function kontostandEntriesFromWorkbook(workbook: XLSX.WorkBook, siteName: string) {
  const valuesByPeriod = new Map<string, { year: number; month: number; value: number }>();
  const merge = (entries: { year: number; month: number; value: number }[]) => {
    entries.forEach((entry) => {
      valuesByPeriod.set(`${entry.year}-${entry.month}`, entry);
    });
  };

  merge(kontostandEntriesFromInputSheet(workbook, siteName));
  merge(kontostandEntriesFromExportSheets(workbook, siteName));

  return [...valuesByPeriod.values()].sort((a, b) => b.year - a.year || b.month - a.month);
}

function latestKontostandFromWorkbook(workbook: XLSX.WorkBook, siteName: string) {
  const values = kontostandEntriesFromWorkbook(workbook, siteName);
  return values[0]?.value ?? null;
}

function openReceivablesSinceStart(
  siteName: string,
  siteRows: Record<string, unknown>[],
  allSiteRows: Record<string, unknown>[],
  managementReceivables?: number
) {
  const currentReceivables = preferredCurrentOpenReceivablesValue(allSiteRows) || preferredCurrentOpenReceivablesValue(siteRows);
  if (currentReceivables) return currentReceivables;
  if (managementReceivables) return managementReceivables;

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
        if (isCurrentOpenReceivablesRow(row)) return true;
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
  if (key === "operative_prozesskosten_bis_ebitda") {
    return totalPerformance - ebitda;
  }
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

function targetEbitdaForActiveRows(
  rows: Record<string, unknown>[],
  siteName: string,
  mode: "kv" | "uebernahme",
  activeRows: Record<string, unknown>[],
  start: string
) {
  const periods = new Set(
    activeRows
      .filter((row) => rowDomain(row) === "bwa" && isOnOrAfterStart(row, start) && Math.abs(asNumber(row.Wert) ?? 0) > 0)
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
  if (metric !== "honorarumsatz" && standardMetric !== "honorarumsatz") return false;
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
  if (metric !== "eigenlaborumsatz" && standardMetric !== "eigenlaborumsatz") return false;
  const combinedKey = normalizeMetric(
    [row.Kennzahl, row.Standard_Kennzahl, row.Kategorie, row.Standard_Kategorie, row.Objekt_Name, row.Werttyp, row.Standard_Werttyp]
      .map(asText)
      .join(" ")
  );
  if (["pvs", "gesamtumsatz", "gesamtleistung", "behandlerumsatz_inkl"].some((term) => combinedKey.includes(term))) return false;
  return true;
}

function isPureBehandlerTotalRow(row: Record<string, unknown>) {
  const datenbereich = normalizeMetric(row.Datenbereich);
  const kategorie = normalizeMetric([row.Kategorie, row.Standard_Kategorie].map(asText).join(" "));
  const metric = normalizeMetric(row.Kennzahl);
  const standardMetric = normalizeMetric(row.Standard_Kennzahl);
  const combinedKey = normalizeMetric(
    [row.Kennzahl, row.Standard_Kennzahl, row.Detailbezeichnung, row.Unterkategorie, row.Kategorie, row.Standard_Kategorie, row.Objekt_Name]
      .map(asText)
      .join(" ")
  );
  if (!datenbereich.startsWith("behandler")) return false;
  if (["ranking", "stamm"].some((term) => kategorie.includes(term))) return false;
  if (["pvs", "gesamtleistung"].some((term) => combinedKey.includes(term))) return false;
  return metric === "umsatz_gesamt" || standardMetric === "umsatz_gesamt" || combinedKey.includes("honorar_eigenlabor");
}

function behandlerTotalRevenueFromRows(rows: Record<string, unknown>[]) {
  return pureBehandlerHonorarFromRows(rows) + rows.filter(isPureBehandlerEigenlaborRow).reduce((sum, row) => sum + (asNumber(row.Wert) ?? 0), 0);
}

function latestBehandlerHonorarMonth(rows: Record<string, unknown>[], year: number) {
  return rows.reduce((latest, row) => {
    if ((rowYear(row) ?? 0) !== year) return latest;
    if (!isPureBehandlerHonorarRow(row)) return latest;
    const month = rowMonth(row);
    if (!month || month < 1 || month > 12) return latest;
    return Math.max(latest, month);
  }, 0);
}

function latestBehandlerHonorarMonthFromDetailRows(rows: ImportedBehandlerDetailRow[], year: number) {
  return rows.reduce((latest, row) => {
    Object.entries(row.honorarByMonth).forEach(([period, value]) => {
      const [periodYear, periodMonth] = period.split("-").map(Number);
      if (periodYear === year && periodMonth >= 1 && periodMonth <= 12 && Math.abs(value) > 0) {
        latest = Math.max(latest, periodMonth);
      }
    });
    return latest;
  }, 0);
}

function behandlerHonorarPeriodLabelFromDetailRows(rows: ImportedBehandlerDetailRow[], year: number) {
  const latestMonth = latestBehandlerHonorarMonthFromDetailRows(rows, year);
  return latestMonth ? `YTD ${year} bis ${bwaMonths[latestMonth - 1]}` : `Geschäftsjahr ${year}`;
}

function topBehandlerFromDetailRows(rows: ImportedBehandlerDetailRow[], latestYear: number, latestMonth = 12): TopBehandlerEntry[] {
  return rows
    .map((row) => ({
      name: row.name,
      standort: row.siteName,
      honorar: Object.entries(row.honorarByMonth).reduce((sum, [period, value]) => {
        const [year, month] = period.split("-").map(Number);
        if (year !== latestYear || month < 1 || month > latestMonth) return sum;
        return sum + value;
      }, 0)
    }))
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
  const managementReceivablesBySite = managementOpenReceivablesFromWorkbook(workbook);
  const exportRows = exportRowsFromWorkbook(workbook);
  const behandlerDetailRows = buildImportedBehandlerDetailRows(rows, exportRows, report);
  const personnelCostRows = buildImportedPersonnelCostRows(workbook);
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
    const forderungen = Math.round(openReceivablesSinceStart(siteName, siteRows, allSiteRows, managementReceivablesBySite.get(siteIdForName(siteName))));
    const additionalDebt = additionalDebtForSite(siteName);
    const importedDarlehen = Math.round(
      preferredRowsValue(
        allSiteRows,
        [["aufgenommenes_fremdkapital"], ["davon_aufgenommenes_fremdkapital_nicht_bankwirksam"], ["darlehen*"], ["fremdkapital*"]],
        ["stammdaten", "finanzen", "darlehen"]
      )
    );
    const darlehen = importedDarlehen + additionalDebt;
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
    const restschuld = Math.max(0, Math.round(explicitRestschuld ? explicitRestschuld + additionalDebt : Math.max(0, darlehen - tilgung)));
    const ebitdaMarge = gesamtleistung ? (ebitda / gesamtleistung) * 100 : 0;
    const materialquote = gesamtleistung ? (material / gesamtleistung) * 100 : 0;
    const fremdlaborquote = gesamtleistung ? (fremdlabor / gesamtleistung) * 100 : 0;
    const personalquote = gesamtleistung ? (personal / gesamtleistung) * 100 : 0;
    const sonstigeKostenquote = gesamtleistung ? Math.max(0, 100 - ebitdaMarge - materialquote - fremdlaborquote - personalquote) : 0;
    const zielEbitdaKaufvertrag = Math.round(targetEbitdaForActiveRows(rows, siteName, "kv", siteRows, fallback.start));
    const zielEbitdaUebernahme = Math.round(targetEbitdaForActiveRows(rows, siteName, "uebernahme", siteRows, fallback.start));
    const acquisitionTerms = acquisitionTermsFromRows(siteName, allSiteRows);
    const treatmentRooms = treatmentRoomsFromRows(siteName, allSiteRows);
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
      treatmentRooms,
      darlehen: {
        kaufpreis: acquisitionTerms.kaufpreis,
        darlehen,
        restschuld,
        tilgung,
        zins,
        earnOutGesamt: acquisitionTerms.earnOutGesamt,
        earnOutGezahlt: 0,
        earnOutFaelligAm,
        earnOutUntergrenze: acquisitionTerms.earnOutUntergrenze,
        earnOutReduktionsfaktor: acquisitionTerms.earnOutReduktionsfaktor,
        wachstumsfaktor: acquisitionTerms.wachstumsfaktor,
        zielEbitdaKaufvertragPa: acquisitionTerms.zielEbitdaKaufvertragPa,
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

  const latestBehandlerMonth = latestBehandlerHonorarMonthFromDetailRows(behandlerDetailRows, latestYear) || latestBehandlerHonorarMonth(rows, latestYear) || 12;
  const patientImportRows = [...rows, ...buildEssenPatientExportRows(workbook)];

  return {
    schemaVersion: importDashboardSchemaVersion,
    importedAt: new Date().toISOString(),
    fileName,
    sites,
    monthly: monthlyData,
    topBehandler: topBehandlerFromDetailRows(behandlerDetailRows, latestYear, latestBehandlerMonth),
    topBehandlerPeriod: behandlerHonorarPeriodLabelFromDetailRows(behandlerDetailRows, latestYear),
    bwaRows: buildImportedBwaRows(rows, report),
    pvsRevenueRows: buildImportedPvsRevenueRows(workbook, rows, report, latestYear),
    behandlerHonorarRows: buildImportedBehandlerHonorarRows(behandlerDetailRows, report),
    behandlerTotalRows: buildImportedBehandlerTotalRows(workbook, rows, report, latestYear),
    behandlerDetailRows,
    personnelCostRows,
    patientRows: buildImportedPatientRows(patientImportRows),
    bankMovementRows: buildImportedBankMovementRows(workbook, rows, latestYear, report),
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

function kvEbitdaAchievement(site: DashboardSite) {
  const target = site.darlehen.zielEbitdaKaufvertrag || site.darlehen.zielEbitda;
  if (!target || target <= 0) return null;
  return (site.ebitda / target) * 100;
}

function cfoMetrics(sites: DashboardSite[] = standorte, monthlyData: typeof monthly = monthly, rules: KpiRules = defaultKpiRules) {
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
  const kritisch = activeSites.filter((site) => {
    const receivablesRatio = site.gesamtleistung ? (site.forderungen / site.gesamtleistung) * 100 : 0;
    const kvAchievement = kvEbitdaAchievement(site);
    return (
      statusForSiteByRules(site, rules) === "red" ||
      statusByRule(receivablesRatio, rules.offene_forderungen) === "red" ||
      (kvAchievement !== null && statusByRule(kvAchievement, rules.ziel_ebitda_kaufvertrag) === "red")
    );
  });

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
  const [authStep, setAuthStep] = useState<AuthStep>("checking");
  const [page, setPageState] = useState<Page>(storedPage);
  const [selectedSite, setSelectedSiteState] = useState(storedSiteId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previousPage, setPreviousPage] = useState<Page | null>(null);
  const [importedData, setImportedData] = useState<ImportedDashboardData | null>(null);
  const [personalData, setPersonalData] = useState<PersonalDashboardData | null>(null);
  const [userDisplayName, setUserDisplayName] = useState("Svend Neumann");
  const [userRole, setUserRole] = useState<UserRole>("info");
  const [authProfileReady, setAuthProfileReady] = useState(false);
  const [importDataLoading, setImportDataLoading] = useState(false);
  const [personalDataLoading, setPersonalDataLoading] = useState(false);

  const setPage = (target: Page) => {
    setPageState(target);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(activePageStorageKey, target);
    }
    scrollAppToTop();
  };

  const setSelectedSite = (siteId: string) => {
    setSelectedSiteState(siteId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(activeSiteStorageKey, siteId);
    }
  };

  const reloadCurrentPage = () => {
    window.localStorage.setItem(activePageStorageKey, page);
    window.localStorage.setItem(activeSiteStorageKey, selectedSite);
    window.location.reload();
  };

  const dashboardSites = useMemo(() => sortSitesByContractStart(importedData?.sites ?? []), [importedData?.sites]);
  const dashboardMonthly = importedData?.monthly ?? [];
  const isAdmin = userRole === "admin";
  const allowedPages = useMemo(() => pagesForRole(userRole), [userRole]);
  const personalPages: Page[] = ["personal-cockpit", "personal-krankheit", "personal-mitarbeiter", "personal-massnahmen", "personal-upload"];
  const personalContentPages = personalPages.filter((item) => item !== "personal-upload") as Page[];
  const visibleMobileNav = useMemo(() => mobileNavForRole(userRole), [userRole]);
  const [openNavSections, setOpenNavSections] = useState<Record<string, boolean>>({
    management: true,
    "site-finance": false,
    "performance-analysis": false,
    "financing-reporting": false,
    patients: false,
    personal: false,
    admin: false
  });

  useEffect(() => {
    scrollAppToTop();
  }, [page, selectedSite]);
  const visibleNavSections = useMemo(() => navSectionsForRole(userRole), [userRole]);
  const selected = useMemo(
    () => dashboardSites.find((site) => site.id === selectedSite) ?? dashboardSites[0] ?? standorte[0],
    [dashboardSites, selectedSite]
  );

  const openOnlyActiveNavSection = (targetPage: Page) => {
    const activeSection = visibleNavSections.find((section) =>
      section.items.some((item) => item.id === targetPage || (item.id === "standorte" && targetPage === "standort-detail"))
    );
    if (!activeSection) return;
    setOpenNavSections(
      visibleNavSections.reduce<Record<string, boolean>>((next, section) => {
        next[section.id] = section.id === activeSection.id;
        return next;
      }, {})
    );
  };

  const toggleNavSection = (sectionId: string) => {
    setOpenNavSections((current) =>
      visibleNavSections.reduce<Record<string, boolean>>((next, section) => {
        next[section.id] = section.id === sectionId ? !current[section.id] : false;
        return next;
      }, {})
    );
  };

  useEffect(() => {
    if (window.localStorage.getItem(authStorageKey) !== "true") {
      setAuthStep("welcome");
      return;
    }
    let isMounted = true;
    validateStoredSupabaseSession()
      .then((isValid) => {
        if (!isMounted) return;
        if (!isValid) {
          window.localStorage.removeItem(authStorageKey);
          window.localStorage.removeItem(activePageStorageKey);
          window.localStorage.removeItem(activeSiteStorageKey);
          clearSupabaseSession();
          setUserDisplayName("Svend Neumann");
          setUserRole("info");
          setAuthProfileReady(false);
          setAuthStep("welcome");
          return;
        }
        setUserDisplayName(currentUserName());
        setUserRole(currentUserRole());
        setAuthProfileReady(true);
        setAuthStep("app");
      })
      .catch(() => {
        if (!isMounted) return;
        window.localStorage.removeItem(authStorageKey);
        clearSupabaseSession();
        setAuthProfileReady(false);
        setAuthStep("welcome");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (authStep !== "app" || !authProfileReady) return;
    if (!allowedPages.includes(page)) {
      setPage(defaultPageForRole(userRole));
    }
  }, [allowedPages, authProfileReady, authStep, page, userRole]);

  useEffect(() => {
    const activeSection = visibleNavSections.find((section) =>
      section.items.some((item) => item.id === page || (item.id === "standorte" && page === "standort-detail"))
    );
    if (!activeSection) return;
    setOpenNavSections(
      visibleNavSections.reduce<Record<string, boolean>>((next, section) => {
        next[section.id] = section.id === activeSection.id;
        return next;
      }, {})
    );
  }, [page, visibleNavSections]);

  useEffect(() => {
    if (authStep !== "app") return;
    let isMounted = true;
    setImportDataLoading(true);
    loadConfirmedImportData()
      .then((savedImport) => {
        if (isMounted && savedImport) setImportedData(savedImport);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setImportDataLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [authStep]);

  useEffect(() => {
    if (authStep !== "app") return;
    let isMounted = true;
    setPersonalDataLoading(true);
    loadConfirmedPersonalImportData()
      .then((savedImport) => {
        if (isMounted && savedImport) setPersonalData(savedImport);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setPersonalDataLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [authStep]);

  const setPersistentAuthStep = (step: AuthStep) => {
    if (step === "app") {
      window.localStorage.setItem(authStorageKey, "true");
      setUserDisplayName(currentUserName());
      setUserRole(currentUserRole());
      setAuthProfileReady(true);
    }
    setAuthStep(step);
  };

  const logout = () => {
    window.localStorage.removeItem(authStorageKey);
    window.localStorage.removeItem(activePageStorageKey);
    window.localStorage.removeItem(activeSiteStorageKey);
    clearSupabaseSession();
    setUserDisplayName("Svend Neumann");
    setUserRole("info");
    setAuthProfileReady(false);
    setMenuOpen(false);
    setAuthStep("welcome");
  };

  if (authStep === "checking") {
    return (
      <main className="app-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(48,213,200,0.12),transparent_34%),linear-gradient(135deg,#092331,#164c59)] p-4 text-white">
        <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
          <Card className="w-full max-w-sm p-6 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Orisus Zahnmedizin</p>
            <h1 className="mt-3 text-2xl font-extrabold">App wird geladen</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sitzung und Datenstand werden geprüft.</p>
          </Card>
        </div>
      </main>
    );
  }

  if (authStep !== "app") {
    return <AuthFlow step={authStep} setStep={setPersistentAuthStep} />;
  }

  const go = (target: Page) => {
    if (!allowedPages.includes(target)) {
      setMenuOpen(false);
      return;
    }
    if (target !== page) {
      setPreviousPage(page);
    }
    setPage(target);
    openOnlyActiveNavSection(target);
    setMenuOpen(false);
  };
  const requiresImport = !["uploads", "admin", "reports", ...personalPages].includes(page);
  const requiresPersonalImport = personalContentPages.includes(page);

  return (
    <div className="app-shell min-h-screen xl:flex">
      <aside className="app-sidebar fixed left-0 top-0 z-30 hidden h-screen w-72 flex-col border-r border-border px-5 py-6 xl:flex">
        <div className="shrink-0">
          <Brand onClick={() => go(defaultPageForRole(userRole))} />
        </div>
        <nav className="mt-8 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4 pr-1">
          {visibleNavSections.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              page={page}
              open={Boolean(openNavSections[section.id])}
              onToggle={() => toggleNavSection(section.id)}
              onGo={go}
            />
          ))}
        </nav>
        <div className="app-user-panel shrink-0 rounded-lg border border-border p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Nutzer</p>
          <p className="mt-1 font-semibold">{userDisplayName}</p>
          <p className="text-sm text-muted-foreground">{roleLabel(userRole)}-Zugang</p>
          <Button className="mt-4 w-full gap-2" variant="secondary" onClick={reloadCurrentPage}>
            <RefreshCw className="h-4 w-4" />
            Neu laden
          </Button>
          <Button className="mt-4 w-full" variant="secondary" onClick={logout}>
            Abmelden
          </Button>
        </div>
      </aside>

      <header className="app-mobile-header fixed left-0 right-0 top-0 z-50 border-b border-border px-4 py-3 xl:hidden">
        <div className="flex items-center justify-between">
          <Brand compact onClick={() => go(defaultPageForRole(userRole))} />
          <button
            aria-label="Menü öffnen"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/12 bg-white/5 text-white"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/55 backdrop-blur-sm xl:hidden">
          <div className="app-mobile-menu ml-auto flex h-dvh max-h-dvh w-80 max-w-[86vw] flex-col overflow-hidden p-5 shadow-soft">
            <div className="shrink-0 flex items-center justify-between">
              <Brand compact onClick={() => go(defaultPageForRole(userRole))} />
              <button
                aria-label="Menü schließen"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/12 bg-white/5 text-white"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-7 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24 pr-1">
              <nav className="space-y-3">
                {visibleNavSections.map((section) => (
                  <NavSection
                    key={section.id}
                    section={section}
                    page={page}
                    open={Boolean(openNavSections[section.id])}
                    onToggle={() => toggleNavSection(section.id)}
                    onGo={go}
                  />
                ))}
              </nav>
              <div className="app-user-panel mt-6 rounded-lg border border-border p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Sitzung</p>
                <p className="mt-1 text-sm text-muted-foreground">Du bleibst angemeldet, bis du dich aktiv abmeldest.</p>
                <Button className="mt-4 w-full gap-2" variant="secondary" onClick={reloadCurrentPage}>
                  <RefreshCw className="h-4 w-4" />
                  Neu laden
                </Button>
                <Button className="mt-4 w-full" variant="secondary" onClick={logout}>
                  Abmelden
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="app-main min-w-0 w-full overflow-x-hidden px-4 pb-28 pt-24 sm:px-6 xl:ml-72 xl:w-[calc(100%-18rem)] xl:px-8 xl:pb-10 xl:pt-5">
        <div className="mx-auto min-w-0 max-w-7xl">
          <NavigationControls
            page={page}
            previousPage={previousPage}
            onBack={() => go(previousPage ?? "cockpit")}
          />
          {requiresImport && !importDataLoading && !importedData && <NoImportState canUpload={isAdmin} onUpload={() => go("uploads")} />}
          {requiresPersonalImport && !personalDataLoading && !personalData && <NoPersonalImportState canUpload={isAdmin} onUpload={() => go("personal-upload")} />}
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
          {importedData && page === "analysen" && <Analysen sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} personalData={personalData} />}
          {importedData && page === "patienten-auswertungen" && <PatientenAuswertungen sites={dashboardSites} importedData={importedData} />}
          {importedData && page === "bwa" && <Bwa importedData={importedData} sites={dashboardSites} monthlyData={dashboardMonthly} />}
          {importedData && page === "cashflow" && <Cashflow sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {importedData && page === "darlehen" && <Darlehen sites={dashboardSites} importedData={importedData} />}
          {importedData && page === "banken" && <Bankenreporting sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} personalData={personalData} />}
          {importedData && page === "board" && <BoardPack sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} />}
          {page === "uploads" && isAdmin && (
            <Uploads
              userRole={userRole}
              onImportConfirmed={(data) => {
                setImportedData(repairImportedCashflowData(data));
                window.setTimeout(reloadCurrentPage, 150);
              }}
              onImportReset={() => {
                setImportedData(null);
                window.setTimeout(reloadCurrentPage, 150);
              }}
            />
          )}
          {personalData && page === "personal-cockpit" && <PersonalCockpit personalData={personalData} />}
          {personalData && page === "personal-krankheit" && <PersonalSickness personalData={personalData} />}
          {personalData && page === "personal-mitarbeiter" && <PersonalEmployees personalData={personalData} userRole={userRole} />}
          {personalData && page === "personal-massnahmen" && <PersonalActions personalData={personalData} />}
          {page === "personal-upload" && isAdmin && (
            <PersonalUpload
              userRole={userRole}
              onImportConfirmed={(data) => {
                setPersonalData(data);
                window.setTimeout(reloadCurrentPage, 150);
              }}
              onImportReset={() => {
                setPersonalData(null);
                window.setTimeout(reloadCurrentPage, 150);
              }}
            />
          )}
          {page === "reports" && <Reports sites={dashboardSites} monthlyData={dashboardMonthly} importedData={importedData} personalData={personalData} />}
          {page === "admin" && isAdmin && <AdminKpiRules />}
        </div>
      </main>

      <nav className="app-bottom-nav safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-border px-2 pt-2 xl:hidden">
        <div
          className={cn(
            "grid gap-1",
            visibleMobileNav.length === 5 ? "grid-cols-5" : visibleMobileNav.length === 3 ? "grid-cols-3" : "grid-cols-4"
          )}
        >
          {visibleMobileNav.map((item) => (
            <button
              key={item.id}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-muted-foreground",
                (page === item.id || (item.id === "standorte" && page === "standort-detail")) &&
                  "bg-[#30d5c8]/10 text-[#79eee7]"
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
  setStep
}: {
  step: AuthStep;
  setStep: (step: AuthStep) => void;
}) {
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [email, setEmail] = useState(() => (typeof window === "undefined" ? "" : currentUserEmail()));
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [inviteToken, setInviteToken] = useState("");

  useEffect(() => {
    setPasswordConfigured(window.localStorage.getItem(authPasswordConfiguredKey) === "true");
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const params = authParamsFromCurrentUrl();
    const token = params.get("access_token") || "";
    const refreshToken = params.get("refresh_token") || "";
    const type = params.get("type") || params.get("auth") || "";
    const urlEmail = params.get("email") || "";
    const errorDescription = params.get("error_description") || params.get("error") || "";
    if (urlEmail) setEmail(urlEmail);
    if (errorDescription) {
      setLoginMessage(`Einladungslink konnte nicht bestätigt werden: ${decodeURIComponent(errorDescription)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (!token || (type && !["invite", "recovery"].includes(type))) return;

    setInviteToken(token);
    window.localStorage.removeItem(authStorageKey);
    rememberSupabaseSession({ access_token: token, refresh_token: refreshToken }, urlEmail || email, false);
    loadSupabaseAuthUser(token)
      .then((user) => {
        if (user.email) {
          setEmail(user.email);
          window.localStorage.setItem(supabaseUserEmailKey, user.email);
        }
      })
      .catch(() => undefined);
    setLoginMessage("Einladung bestätigt. Bitte lege jetzt dein Passwort fest.");
    setStep("set-password");
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [email, setStep]);

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

  const handlePasswordLogin = async () => {
    setLoginMessage("");
    const loginIdentifier = email.trim();
    if (!isValidLoginIdentifier(loginIdentifier)) {
      setLoginMessage("Bitte einen gültigen Login-Namen eingeben.");
      return;
    }
    if (password.length < 6) {
      setLoginMessage("Bitte ein Passwort mit mindestens 6 Zeichen eingeben.");
      return;
    }

    if (step === "set-password") {
      try {
        const token = inviteToken || currentSupabaseAccessToken();
        await updateSupabaseUserPassword(password, token);
        await completeSupabasePasswordChange(token);
        const authUser = await loadSupabaseAuthUser(token).catch(() => null);
        const sessionEmail = authUser?.email || currentUserEmail() || authEmailForLoginIdentifier(loginIdentifier);
        window.localStorage.setItem(supabaseUserEmailKey, sessionEmail);
        const hasAppAccess = await loadAndRememberAccessProfile(sessionEmail);
        if (!hasAppAccess) {
          clearSupabaseSession();
          window.localStorage.removeItem(authStorageKey);
          setLoginMessage("Der Zugang wurde bestätigt, aber für diese E-Mail ist noch keine aktive App-Rolle angelegt.");
          return;
        }
        window.localStorage.setItem(authPasswordConfiguredKey, "true");
        setPasswordConfigured(true);
        setPassword("");
        setStep("app");
        return;
      } catch {
        setLoginMessage("Passwort konnte nicht gesetzt werden. Bitte Admin kontaktieren.");
        return;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const session = await signInSupabaseUser(loginIdentifier, password);
        if (!session.access_token) {
          setLoginMessage("Bitte Login-Daten prüfen.");
          return;
        }
        const authEmail = session.user?.email || authEmailForLoginIdentifier(loginIdentifier);
        if (authUserMustChangePassword(session.user)) {
          window.localStorage.removeItem(authStorageKey);
          window.localStorage.setItem(supabaseUserEmailKey, authEmail);
          setPassword("");
          setLoginMessage("Bitte lege jetzt dein persönliches Passwort fest.");
          setStep("set-password");
          return;
        }
        const hasAppAccess = await loadAndRememberAccessProfile(authEmail);
        if (!hasAppAccess) {
          clearSupabaseSession();
          window.localStorage.removeItem(authStorageKey);
          setLoginMessage("Für diesen Login-Namen ist noch kein App-Zugang angelegt.");
          return;
        }
        window.localStorage.setItem(authPasswordConfiguredKey, "true");
        setPasswordConfigured(true);
        setStep("app");
        return;
      } catch {
        setLoginMessage("Login nicht möglich. Bitte Login-Name oder Passwort prüfen.");
        return;
      }
    }

    if (!passwordConfigured) {
      window.localStorage.setItem(authPasswordConfiguredKey, "true");
      setPasswordConfigured(true);
    }
    setStep("app");
  };

  const resetMailHref = `mailto:sven.neumann@resos.de?subject=${encodeURIComponent("Orisus CFO Dashboard - Passwort zurücksetzen")}&body=${encodeURIComponent(
    `Bitte Passwort-Zugang zurücksetzen für Login: ${email.trim() || "svend.neumann"}`
  )}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#020b16] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(48,213,200,0.18),transparent_28%),radial-gradient(circle_at_88%_42%,rgba(9,128,146,0.16),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-6 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.48fr_0.72fr] lg:items-center">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#03101f]/88 p-5 shadow-2xl backdrop-blur sm:p-7 lg:p-8">
          <img
            src="/orisus-logo.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -left-28 top-6 hidden w-[42rem] max-w-none opacity-[0.055] sm:block"
          />
          <div className="relative">
            <img
              src="/orisus-logo.png"
              alt="Orisus Zahnmedizin"
              className="h-auto w-40 drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)] sm:w-48"
            />

            <div className="mx-auto mt-8 max-w-3xl text-left lg:mt-12 lg:text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#30d5c8]">Interne Steuerungsplattform</p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Die zentrale Steuerungsplattform
                <span className="block text-[#30d5c8]">für die gesamte Orisus-Gruppe.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                BWA, PVS-Umsätze, EBITDA, Cashflow, Liquidität, Standorte, Darlehen, Earn-Outs und
                Personalsteuerung auf einer Zahlenbasis.
              </p>
            </div>

            <div className="mt-7 lg:hidden">
              <LandingLoginCard
                step={step}
                email={email}
                password={password}
                isMobileDevice={isMobileDevice}
                passkeyBusy={passkeyBusy}
                loginMessage={loginMessage}
                passkeyMessage={passkeyMessage}
                resetMailHref={resetMailHref}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onPasswordLogin={handlePasswordLogin}
                onPasskeyLogin={handlePasskeyLogin}
                onForgot={() => setStep("forgot")}
                onWelcome={() => setStep("welcome")}
              />
            </div>

            <LandingFeatures />
            <LandingMockup />

            <p className="mt-7 text-xs text-slate-500">
              © Orisus Zahnmedizin MVZ GmbH <span className="mx-3 text-slate-700">|</span> Version 1.0
              <span className="mx-3 text-slate-700">|</span> Internal Use Only
            </p>
          </div>
        </section>

        <aside className="hidden lg:block">
          <LandingLoginCard
            step={step}
            email={email}
            password={password}
            isMobileDevice={isMobileDevice}
            passkeyBusy={passkeyBusy}
            loginMessage={loginMessage}
            passkeyMessage={passkeyMessage}
            resetMailHref={resetMailHref}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onPasswordLogin={handlePasswordLogin}
            onPasskeyLogin={handlePasskeyLogin}
            onForgot={() => setStep("forgot")}
            onWelcome={() => setStep("welcome")}
          />
        </aside>
      </div>
    </main>
  );
}

function LandingLoginCard({
  step,
  email,
  password,
  isMobileDevice,
  passkeyBusy,
  loginMessage,
  passkeyMessage,
  resetMailHref,
  onEmailChange,
  onPasswordChange,
  onPasswordLogin,
  onPasskeyLogin,
  onForgot,
  onWelcome
}: {
  step: AuthStep;
  email: string;
  password: string;
  isMobileDevice: boolean;
  passkeyBusy: boolean;
  loginMessage: string;
  passkeyMessage: string;
  resetMailHref: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordLogin: () => void;
  onPasskeyLogin: () => void;
  onForgot: () => void;
  onWelcome: () => void;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-white/12 bg-[#071827]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_70px_rgba(48,213,200,0.08)] backdrop-blur">
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#30d5c8]/35 bg-[#30d5c8]/10 text-[#30d5c8] shadow-[0_0_30px_rgba(48,213,200,0.13)]">
          <Lock className="h-7 w-7" />
        </div>
        <p className="mt-7 text-center text-xs font-bold uppercase tracking-[0.22em] text-[#30d5c8]">Geschützter Zugang</p>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">Orisus CFO Dashboard</h2>
        <div className="mx-auto mt-4 h-px w-10 bg-[#30d5c8]" />
        <div className="mx-auto mt-6 max-w-sm space-y-4 text-center text-sm leading-6 text-slate-300">
          <p>Interne Management-Plattform für Geschäftsführung und Controlling.</p>
          <p>Zugriff auf CFO-Cockpit, Standortsteuerung, Finanzierungsdaten und Personalübersicht.</p>
        </div>

        <div className="mt-8 space-y-4">
          {step === "welcome" && (
            <>
              <label className="block space-y-2 text-sm font-semibold text-slate-200">
                <span>Login-Name</span>
                <Input
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="z. B. svend.neumann"
                  type="text"
                  aria-label="Login-Name"
                  className="border-white/12 bg-[#061421] text-white placeholder:text-slate-500 focus:border-[#30d5c8] focus:ring-[#30d5c8]/10"
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-200">
                <span>Passwort</span>
                <Input
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Ihr Passwort"
                  type="password"
                  aria-label="Passwort"
                  className="border-white/12 bg-[#061421] text-white placeholder:text-slate-500 focus:border-[#30d5c8] focus:ring-[#30d5c8]/10"
                />
              </label>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#30d5c8]" />
                  Angemeldet bleiben
                </label>
                <button type="button" className="font-semibold text-[#30d5c8] hover:text-white" onClick={onForgot}>
                  Passwort vergessen?
                </button>
              </div>
              <Button
                className="h-12 w-full rounded-lg bg-gradient-to-r from-[#30d5c8] to-[#087b8c] text-white shadow-lg shadow-[#30d5c8]/15 hover:from-[#5fe1d8] hover:to-[#0a8fa1]"
                onClick={onPasswordLogin}
              >
                Anmelden
              </Button>
              {isMobileDevice && (
                <Button
                  className="w-full gap-2 border-white/12 bg-white/5 text-white hover:bg-white/10"
                  variant="secondary"
                  onClick={onPasskeyLogin}
                  disabled={passkeyBusy}
                >
                  <Fingerprint className="h-4 w-4" />
                  {passkeyBusy ? "Face ID wird geprüft ..." : "Mit Face ID anmelden"}
                </Button>
              )}
              {loginMessage && <p className="rounded-md border border-amber-400/25 bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">{loginMessage}</p>}
              {passkeyMessage && <p className="rounded-md border border-amber-400/25 bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">{passkeyMessage}</p>}
            </>
          )}
          {step === "set-password" && (
            <div className="space-y-4">
              <div className="rounded-md border border-[#30d5c8]/25 bg-[#30d5c8]/10 p-3 text-sm font-semibold text-[#b8fff8]">
                Erstlogin erkannt. Bitte lege jetzt dein persönliches Passwort fest.
              </div>
              <label className="block space-y-2 text-sm font-semibold text-slate-200">
                <span>Login-Name</span>
                <Input
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="z. B. svend.neumann"
                  type="text"
                  aria-label="Login-Name"
                  className="border-white/12 bg-[#061421] text-white placeholder:text-slate-500 focus:border-[#30d5c8] focus:ring-[#30d5c8]/10"
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-200">
                <span>Neues Passwort</span>
                <Input
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  type="password"
                  aria-label="Neues Passwort"
                  className="border-white/12 bg-[#061421] text-white placeholder:text-slate-500 focus:border-[#30d5c8] focus:ring-[#30d5c8]/10"
                />
              </label>
              <Button
                className="h-12 w-full rounded-lg bg-gradient-to-r from-[#30d5c8] to-[#087b8c] text-white shadow-lg shadow-[#30d5c8]/15 hover:from-[#5fe1d8] hover:to-[#0a8fa1]"
                onClick={onPasswordLogin}
              >
                Passwort speichern und anmelden
              </Button>
              {loginMessage && <p className="rounded-md border border-amber-400/25 bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">{loginMessage}</p>}
            </div>
          )}
          {step === "forgot" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Passwort zurücksetzen</h3>
                <p className="mt-1 text-sm text-slate-400">Eine Reset-Anfrage wird an den Admin gesendet.</p>
              </div>
              <Input
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="Login-Name oder E-Mail"
                type="text"
                className="border-white/12 bg-[#061421] text-white placeholder:text-slate-500 focus:border-[#30d5c8] focus:ring-[#30d5c8]/10"
              />
              <Button
                className="w-full rounded-lg bg-gradient-to-r from-[#30d5c8] to-[#087b8c] text-white hover:from-[#5fe1d8] hover:to-[#0a8fa1]"
                onClick={() => {
                  window.location.href = resetMailHref;
                }}
              >
                Anfrage an Admin senden
              </Button>
              <Button className="w-full text-slate-200 hover:bg-white/10" variant="ghost" onClick={onWelcome}>
                Zurück
              </Button>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <ShieldCheck className="h-4 w-4 text-[#30d5c8]" />
          Internal Use Only
        </div>
      </div>
    </Card>
  );
}

function LandingFeatures() {
  const features = [
    {
      title: "CFO Cockpit",
      text: "Konsolidierte Kennzahlen, EBITDA, Liquidität und Performance auf einen Blick.",
      icon: TrendingUp
    },
    {
      title: "Standortsteuerung",
      text: "Vergleich und Entwicklung aller Praxisstandorte seit Zugehörigkeit zur Gruppe.",
      icon: Building2
    },
    {
      title: "Cashflow & Konten",
      text: "Praxiseingänge, Praxiskosten, Annuitäten, Umbuchungen und aktuelle Kontostände.",
      icon: Wallet
    },
    {
      title: "Darlehen & Earn-Out",
      text: "Restschuld, Tilgung, Kaufpreise, Earn-Outs und Verpflichtungen je Standort.",
      icon: Landmark
    },
    {
      title: "Personal",
      text: "Mitarbeiterstatus, Gehaltsentwicklung, Maßnahmen und Personalstruktur.",
      icon: Users
    },
    {
      title: "Krankheit / Fehlzeiten",
      text: "Krankheitstage, Fehlzeitenentwicklung und Standortvergleich.",
      icon: Stethoscope
    }
  ];

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {features.map(({ title, text, icon: Icon }) => (
        <div
          key={title}
          className="min-w-0 rounded-xl border border-white/10 bg-white/[0.045] p-4 text-center shadow-sm backdrop-blur transition hover:border-[#30d5c8]/35 hover:bg-white/[0.075]"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#30d5c8]/35 bg-[#30d5c8]/10 text-[#30d5c8]">
            <Icon className="h-5 w-5" />
          </div>
          <p className="mt-4 break-words text-sm font-bold text-white">{title}</p>
          <p className="mt-2 break-words text-xs leading-5 text-slate-300">{text}</p>
        </div>
      ))}
    </div>
  );
}

function LandingMockup() {
  const kpis = [
    ["Gesamtleistung BWA", "24,78 Mio. €", "+ 12,0 % zum Vormonat", "green"],
    ["Gesamtumsatz PVS", "22,35 Mio. €", "+ 8,7 % zum Vormonat", "green"],
    ["EBITDA", "5,25 Mio. €", "+ 10,3 % zum Vormonat", "green"],
    ["Cashflow", "2,31 Mio. €", "+ 18,0 % zum Vormonat", "green"],
    ["Kontostand", "4,62 Mio. €", "+ 6,0 % zum Vormonat", "green"],
    ["Offene Forderungen", "1,12 Mio. €", "- 4,2 % zum Vormonat", "green"],
    ["Aktive Mitarbeiter", "156", "+ 6 zum Vormonat", "green"],
    ["Krankheitstage", "612", "+ 32 zum Vormonat", "red"]
  ];
  const lineA = [33, 41, 47, 52, 61, 66, 72, 79];
  const lineB = [21, 25, 31, 36, 43, 50, 57, 63];
  const siteBars = [
    ["Kirchberg", 68],
    ["Essen", 61],
    ["Kassel", 77],
    ["Ulm", 76],
    ["Hüttenberg", 69],
    ["Berlin", 84],
    ["Leipzig", 82]
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 backdrop-blur">
      <p className="text-sm font-bold text-white">Dashboard Vorschau</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value, trend, tone]) => (
          <div key={label} className="rounded-lg border border-white/8 bg-[#071827]/86 p-3 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-base font-bold text-white">{value}</p>
            <p className={cn("mt-1 text-[10px] font-semibold", tone === "red" ? "text-red-300" : "text-[#30d5c8]")}>{trend}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-[#071827]/86 p-4">
          <p className="text-sm font-bold text-white">EBITDA vs. Gesamtleistung</p>
          <div className="mt-4 grid h-40 grid-cols-8 items-end gap-2 border-b border-l border-white/10 px-2 pb-3">
            {lineA.map((value, index) => (
              <div key={index} className="relative flex h-full items-end">
                <span className="w-full rounded-t bg-gradient-to-t from-[#0d7b86] to-[#30d5c8]/85" style={{ height: `${value}%` }} />
                <span
                  className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#76e6df]"
                  style={{ bottom: `${lineB[index]}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#30d5c8]" /> Gesamtleistung</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#76e6df]" /> EBITDA</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-[#071827]/86 p-4">
          <p className="text-sm font-bold text-white">Standortvergleich EBITDA</p>
          <div className="mt-4 flex h-40 gap-2 border-b border-l border-white/10 px-2 pb-3">
            {siteBars.map(([site, value]) => (
              <div key={site} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="flex min-h-0 w-full flex-1 items-end">
                  <span
                    className="block w-full min-w-3 rounded-t bg-gradient-to-t from-[#108493] to-[#42ded4]"
                    style={{ height: `${value}%` }}
                  />
                </div>
                <span className="max-w-12 truncate text-[10px] text-slate-400">{site}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
        "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-muted-foreground transition hover:bg-white/8 hover:text-white",
        active && "border border-[#30d5c8]/24 bg-[#30d5c8]/10 text-[#79eee7] shadow-[0_0_28px_rgba(48,213,200,0.08)]"
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

function NavSection({
  section,
  page,
  open,
  onToggle,
  onGo
}: {
  section: {
    id: string;
    label: string;
    items: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  };
  page: Page;
  open: boolean;
  onToggle: () => void;
  onGo: (page: Page) => void;
}) {
  const hasActiveItem = section.items.some((item) => item.id === page || (item.id === "standorte" && page === "standort-detail"));

  return (
    <div className="rounded-lg border border-transparent">
      <button
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.055] px-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground transition hover:border-[#30d5c8]/25 hover:bg-[#30d5c8]/8 hover:text-[#79eee7]",
          hasActiveItem && "border-[#30d5c8]/30 bg-[#30d5c8]/10 text-[#79eee7] shadow-sm"
        )}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{section.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {section.items.map((item) => (
            <NavButton
              key={item.id}
              active={page === item.id || (item.id === "standorte" && page === "standort-detail")}
              icon={item.icon}
              label={item.label}
              onClick={() => onGo(item.id as Page)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavigationControls({
  page,
  previousPage,
  onBack
}: {
  page: Page;
  previousPage: Page | null;
  onBack: () => void;
}) {
  return (
    <div className="app-nav-controls mb-5 rounded-lg border border-border p-2 shadow-sm">
      <button
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold sm:w-auto",
          page === "cockpit" && !previousPage ? "cursor-not-allowed text-muted-foreground" : "bg-white/5 hover:bg-white/10"
        )}
        disabled={page === "cockpit" && !previousPage}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </button>
    </div>
  );
}

function NoImportState({ canUpload, onUpload }: { canUpload: boolean; onUpload: () => void }) {
  return (
    <Card className="p-6">
      <div className="max-w-2xl">
        <Badge tone="yellow">Kein bestätigter Import</Badge>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Noch keine Excel-Daten aktiv</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Die App zeigt keine Demo- oder Beispielwerte mehr. Lade zuerst die konsolidierte Orisus-Arbeitsmappe hoch und bestätige den Import.
          Danach werden Cockpit, BWA, Standorte, Cashflow, Darlehen, Bankenreporting und Board-Pack aus dieser Datenbasis befüllt.
        </p>
        {canUpload ? (
          <Button className="mt-5" onClick={onUpload}>
            Zum Upload
          </Button>
        ) : (
          <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm font-semibold text-muted-foreground">
            Bitte einen Admin bitten, den aktuellen Datenstand zu importieren.
          </p>
        )}
      </div>
    </Card>
  );
}

function NoPersonalImportState({ canUpload, onUpload }: { canUpload: boolean; onUpload: () => void }) {
  return (
    <Card className="p-6">
      <div className="max-w-2xl">
        <Badge tone="yellow">Kein bestätigter Personal-Import</Badge>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Noch keine Personal-Daten aktiv</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Lade die Personalübersicht-Arbeitsmappe hoch. Die Personal-Seiten lesen ausschließlich diese Datei und bleiben getrennt vom CFO-/BWA-Import.
        </p>
        {canUpload ? (
          <Button className="mt-5" onClick={onUpload}>
            Zum Personal-Upload
          </Button>
        ) : (
          <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm font-semibold text-muted-foreground">
            Bitte einen Admin bitten, den aktuellen Personal-Datenstand zu importieren.
          </p>
        )}
      </div>
    </Card>
  );
}

function personalDateFromDisplayDate(value: string) {
  const [day, month, year] = value.split(".").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day).getTime();
}

function personalWasEmployedInYear(employee: PersonalEmployee, year: number) {
  const periodStart = new Date(year, 0, 1).getTime();
  const periodEnd = new Date(year, 11, 31).getTime();
  const entryDate = personalDateFromDisplayDate(employee.entryDate) ?? -Infinity;
  const exitDate = personalDateFromDisplayDate(employee.exitDate) ?? Infinity;
  return entryDate <= periodEnd && exitDate >= periodStart;
}

function personalWasEmployedInMonth(employee: PersonalEmployee, year: number, month: number) {
  const periodStart = new Date(year, month - 1, 1).getTime();
  const periodEnd = new Date(year, month, 0).getTime();
  const entryDate = personalDateFromDisplayDate(employee.entryDate) ?? -Infinity;
  const exitDate = personalDateFromDisplayDate(employee.exitDate) ?? Infinity;
  return entryDate <= periodEnd && exitDate >= periodStart;
}

function PersonalCockpit({ personalData }: { personalData: PersonalDashboardData }) {
  const yearFromDisplayDate = (value: string) => {
    const parts = value.split(".");
    return Number(parts[2]) || 0;
  };
  const availableYears = uniqueSortedNumbers([
    ...personalData.report.years,
    ...personalData.employees.map((employee) => yearFromDisplayDate(employee.entryDate)),
    ...personalData.employees.map((employee) => yearFromDisplayDate(employee.exitDate))
  ]).filter((item) => item >= 2024);
  const latestSicknessYear = Math.max(...availableYears, new Date().getFullYear());
  const [year, setYear] = useState(String(latestSicknessYear));
  const selectedYear = Number(year);
  const periodLabel = `Geschäftsjahr ${selectedYear}`;
  const isActiveStatus = (employee: PersonalEmployee) => employee.status.toLowerCase() === "aktiv";
  const active = personalData.employees.filter(isActiveStatus);
  const sites = personalData.settings.sites.length ? personalData.settings.sites : uniqueSortedText(personalData.employees.map((employee) => employee.site));
  const siteRows = sites.map((site) => {
    const siteEmployees = personalData.employees.filter((employee) => employee.site === site && isActiveStatus(employee));
    return {
      site,
      employees: siteEmployees.length,
      active: siteEmployees.length,
      hours: siteEmployees.reduce((sum, employee) => sum + employee.weeklyHours, 0),
      employerCost: siteEmployees.reduce((sum, employee) => sum + employee.employerCost, 0),
      dentists: siteEmployees.filter((employee) => employee.isDentist).length
    };
  });
  const sicknessDays = personalData.sicknessEntries.reduce((sum, entry) => sum + entry.days, 0);
  const sicknessBySite = siteRows.map((site) => ({
    site: site.site,
    days: personalData.sicknessEntries.filter((entry) => entry.site === site.site && entry.year === selectedYear).reduce((sum, entry) => sum + entry.days, 0)
  }));
  const operationalRows = siteRows.map((site) => {
    const siteEmployees = personalData.employees.filter((employee) => employee.site === site.site);
    const activeEmployees = siteEmployees.filter(isActiveStatus);
    const exitsInLatestYear = siteEmployees.filter((employee) => {
      const status = employee.status.toLowerCase();
      const hasExitInYear = yearFromDisplayDate(employee.exitDate) === selectedYear;
      return hasExitInYear && ["inaktiv", "ausgetreten", "gekündigt", "gekuendigt"].some((term) => status.includes(term));
    }).length;
    const sicknessDaysLatestYear = sicknessBySite.find((row) => row.site === site.site)?.days ?? 0;
    return {
      site: site.site,
      personnelCosts: activeEmployees.reduce((sum, employee) => sum + employee.employerCost, 0),
      sicknessDays: sicknessDaysLatestYear,
      activeEmployees: activeEmployees.length,
      exitsInLatestYear,
      fluctuation: activeEmployees.length ? (exitsInLatestYear / activeEmployees.length) * 100 : 0
    };
  });
  const totalFte = active.reduce((sum, employee) => sum + employee.weeklyHours / 40, 0);
  const newHiresInSelectedYear = personalData.employees.filter((employee) => yearFromDisplayDate(employee.entryDate) === selectedYear);
  const highestFluctuationRow = operationalRows.reduce(
    (highest, row) => (row.fluctuation > highest.fluctuation ? row : highest),
    { site: "", personnelCosts: 0, sicknessDays: 0, activeEmployees: 0, exitsInLatestYear: 0, fluctuation: 0 }
  );
  const fluctuationStatus: Status = highestFluctuationRow.fluctuation <= 10 ? "green" : highestFluctuationRow.fluctuation <= 20 ? "yellow" : "red";
  const personnelCostRows = operationalRows
    .filter((row) => row.personnelCosts > 0)
    .map((row) => ({ name: row.site, value: Math.round(row.personnelCosts) }));
  const personnelCostTotal = personnelCostRows.reduce((sum, row) => sum + row.value, 0);
  const personnelCostColors = ["#0f766e", "#0891b2", "#0369a1", "#14b8a6", "#f59e0b", "#64748b"];
  const daysInSelectedYear = new Date(selectedYear, 1, 29).getMonth() === 1 ? 366 : 365;
  const topSickEmployees = Array.from(
    personalData.sicknessEntries
      .filter((entry) => entry.year === selectedYear)
      .reduce((map, entry) => {
        const key = entry.employeeId || `${entry.employeeName}-${entry.site}`;
        const existing = map.get(key) ?? {
          employee: entry.employeeName || entry.employeeId || "Unbekannt",
          site: entry.site,
          days: 0
        };
        existing.days += entry.days;
        if (!existing.site && entry.site) existing.site = entry.site;
        map.set(key, existing);
        return map;
      }, new Map<string, { employee: string; site: string; days: number }>())
      .values()
  )
    .sort((a, b) => b.days - a.days)
    .slice(0, 10);
  const costOverviewRows = siteRows.map((site) => {
    const activeEmployees = personalData.employees.filter((employee) => employee.site === site.site && isActiveStatus(employee));
    const teamEmployees = activeEmployees.filter((employee) => !employee.isDentist);
    const employerCost = activeEmployees.reduce((sum, employee) => sum + employee.employerCost, 0);
    const teamCost = teamEmployees.reduce((sum, employee) => sum + employee.employerCost, 0);
    const averageHourlyWage = teamEmployees.length ? teamEmployees.reduce((sum, employee) => sum + employee.hourlyWage, 0) / teamEmployees.length : 0;
    return {
      site: site.site,
      active: activeEmployees.length,
      team: teamEmployees.length,
      employerCost,
      averagePerEmployee: activeEmployees.length ? employerCost / activeEmployees.length : 0,
      teamCost,
      averagePerTeam: teamEmployees.length ? teamCost / teamEmployees.length : 0,
      averageHourlyWage,
      teamShare: employerCost ? (teamCost / employerCost) * 100 : 0
    };
  });
  const costOverviewTotals = {
    active: costOverviewRows.reduce((sum, row) => sum + row.active, 0),
    team: costOverviewRows.reduce((sum, row) => sum + row.team, 0),
    employerCost: costOverviewRows.reduce((sum, row) => sum + row.employerCost, 0),
    teamCost: costOverviewRows.reduce((sum, row) => sum + row.teamCost, 0),
    hourlyWageSum: costOverviewRows.reduce((sum, row) => {
      const teamEmployees = personalData.employees.filter((employee) => employee.site === row.site && isActiveStatus(employee) && !employee.isDentist);
      return sum + teamEmployees.reduce((subtotal, employee) => subtotal + employee.hourlyWage, 0);
    }, 0)
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle title="Personal-Cockpit" text="Stufe 1: zentrale Personalsteuerung aus der hochgeladenen Personalübersicht-Arbeitsmappe." />
        <CompactPersonalDataStatus personalData={personalData} />
      </div>
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-bold">Zeitraumauswahl Personal-Cockpit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aktive Mitarbeiter, FTE und Kosten basieren auf Status Aktiv; Krankheit, Neueinstellungen und Fluktuation folgen dem ausgewählten Geschäftsjahr.
          </p>
        </div>
        <Select className="w-full sm:w-56" value={year} onChange={(event) => setYear(event.target.value)}>
          {availableYears.map((item) => (
            <option key={item} value={item}>
              Geschäftsjahr {item}
            </option>
          ))}
        </Select>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aktive Mitarbeiter" value={active.length} plain delta="nur Status Aktiv" icon={Users} status="green" />
        <KpiCard label="FTE aktiv" value={Math.round(totalFte * 10) / 10} plain delta="Basis 40 Std./Woche" icon={Gauge} status="green" />
        <KpiCard label={`Neueinstellungen ${selectedYear}`} value={newHiresInSelectedYear.length} plain delta="Eintritte laut Mitarbeiterstamm" icon={UserRound} status="green" />
        <KpiCard
          label={`Fluktuation Standort max. ${selectedYear}`}
          value={highestFluctuationRow.fluctuation}
          percent
          delta={`${highestFluctuationRow.site || "Kein Standort"} | ${highestFluctuationRow.exitsInLatestYear} Austritte`}
          icon={TrendingUp}
          status={fluctuationStatus}
        />
        <KpiCard label="Wochenstunden aktiv" value={active.reduce((sum, employee) => sum + employee.weeklyHours, 0)} plain delta="Kapazität laut aktiven Verträgen" icon={Gauge} status="green" />
        <KpiCard label="AG-Aufwand aktiv" value={active.reduce((sum, employee) => sum + employee.employerCost, 0)} delta="monatlich laut Import" icon={BadgeEuro} status="yellow" />
        <KpiCard label={`Krankheitstage ${selectedYear}`} value={sicknessBySite.reduce((sum, row) => sum + row.days, 0)} plain delta={`${sicknessDays.toLocaleString("de-DE")} Tage gesamt im Import`} icon={Stethoscope} status="yellow" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Aktive Mitarbeiter je Standort | aktueller Stand" icon={Building2}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={siteRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="site" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={(value) => [`${value}`, "Aktive Mitarbeiter"]} />
              <Bar dataKey="active" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={`Krankheitstage je Standort | ${selectedYear}`} icon={Stethoscope}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sicknessBySite}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="site" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={(value) => [`${value} Tage`, "Krankheit"]} />
              <Bar dataKey="days" fill="#0891b2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card className="overflow-hidden">
        <div className="p-4">
          <h2 className="font-bold">Personalstruktur je Standort | {periodLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gezählt werden ausschließlich Mitarbeiter mit Status Aktiv.</p>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <TableHead>Standort</TableHead>
              <TableHead>Aktiv</TableHead>
              <TableHead>FTE</TableHead>
              <TableHead>Gesamt</TableHead>
              <TableHead>Wochenstunden</TableHead>
              <TableHead>Behandler</TableHead>
              <TableHead>AG-Aufwand</TableHead>
            </tr>
          </thead>
          <tbody>
            {siteRows.map((row) => (
              <tr key={row.site}>
                <TableCell strong>{row.site}</TableCell>
                <TableCell>{row.active}</TableCell>
                <TableCell>{(row.hours / 40).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                <TableCell>{row.employees}</TableCell>
                <TableCell>{row.hours.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</TableCell>
                <TableCell>{row.dentists}</TableCell>
                <TableCell>{eur(row.employerCost)}</TableCell>
              </tr>
            ))}
            <tr className="table-total font-bold">
              <TableCell>Gesamt</TableCell>
              <TableCell>{siteRows.reduce((sum, row) => sum + row.active, 0)}</TableCell>
              <TableCell>{(siteRows.reduce((sum, row) => sum + row.hours, 0) / 40).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
              <TableCell>{siteRows.reduce((sum, row) => sum + row.employees, 0)}</TableCell>
              <TableCell>{siteRows.reduce((sum, row) => sum + row.hours, 0).toLocaleString("de-DE", { maximumFractionDigits: 1 })}</TableCell>
              <TableCell>{siteRows.reduce((sum, row) => sum + row.dentists, 0)}</TableCell>
              <TableCell>{eur(siteRows.reduce((sum, row) => sum + row.employerCost, 0))}</TableCell>
            </tr>
          </tbody>
        </ResponsiveTable>
      </Card>
      <Card className="overflow-hidden">
        <div className="table-head p-4 text-white">
          <h2 className="font-bold">Kostenübersicht je Standort | aktive Mitarbeiter</h2>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <TableHead>Standort</TableHead>
              <TableHead>Aktive</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>AG-Kosten</TableHead>
              <TableHead>Ø / MA</TableHead>
              <TableHead>Teamkosten</TableHead>
              <TableHead>Ø / Team</TableHead>
              <TableHead>Ø Std.-Lohn AN-Brutto</TableHead>
              <TableHead>Team-Anteil</TableHead>
            </tr>
          </thead>
          <tbody>
            {costOverviewRows.map((row) => (
              <tr key={row.site}>
                <TableCell strong>{row.site}</TableCell>
                <TableCell>{row.active}</TableCell>
                <TableCell>{row.team}</TableCell>
                <TableCell>{eur(row.employerCost)}</TableCell>
                <TableCell>{row.averagePerEmployee ? eur(row.averagePerEmployee) : ""}</TableCell>
                <TableCell>{eur(row.teamCost)}</TableCell>
                <TableCell>{row.averagePerTeam ? eur(row.averagePerTeam) : ""}</TableCell>
                <TableCell>{row.averageHourlyWage ? eur(row.averageHourlyWage) : ""}</TableCell>
                <TableCell>{pct(row.teamShare)}</TableCell>
              </tr>
            ))}
            <tr className="summary-row">
              <TableCell strong summary>Gesamt</TableCell>
              <TableCell strong summary>{costOverviewTotals.active}</TableCell>
              <TableCell strong summary>{costOverviewTotals.team}</TableCell>
              <TableCell strong summary>{eur(costOverviewTotals.employerCost)}</TableCell>
              <TableCell strong summary>{costOverviewTotals.active ? eur(costOverviewTotals.employerCost / costOverviewTotals.active) : ""}</TableCell>
              <TableCell strong summary>{eur(costOverviewTotals.teamCost)}</TableCell>
              <TableCell strong summary>{costOverviewTotals.team ? eur(costOverviewTotals.teamCost / costOverviewTotals.team) : ""}</TableCell>
              <TableCell strong summary>{costOverviewTotals.team ? eur(costOverviewTotals.hourlyWageSum / costOverviewTotals.team) : ""}</TableCell>
              <TableCell strong summary>{costOverviewTotals.employerCost ? pct((costOverviewTotals.teamCost / costOverviewTotals.employerCost) * 100) : "0 %"}</TableCell>
            </tr>
          </tbody>
        </ResponsiveTable>
        <p className="border-t border-border bg-slate-50 p-3 text-xs text-muted-foreground">
          Basis: aktive Mitarbeitende; Team-MA = Mitarbeitende ohne Behandler; AG-Kosten = AG_Aufwand aus dem Personal-Upload.
        </p>
      </Card>
      <Card className="overflow-hidden">
        <div className="table-head p-4 text-white">
          <h2 className="font-bold">Kosten & operative Kennzahlen | aktive Kosten / {periodLabel}</h2>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <TableHead>Standort</TableHead>
              <TableHead>Personalkosten</TableHead>
              <TableHead>Krankheitstage</TableHead>
              <TableHead>Fluktuation Standort</TableHead>
            </tr>
          </thead>
          <tbody>
            {operationalRows.map((row) => (
              <tr key={row.site}>
                <TableCell strong>{row.site}</TableCell>
                <TableCell>{eur(row.personnelCosts)}</TableCell>
                <TableCell>{row.sicknessDays.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</TableCell>
                <TableCell>{pct(row.fluctuation)}</TableCell>
              </tr>
            ))}
            <tr className="summary-row">
              <TableCell strong summary>Gesamt</TableCell>
              <TableCell strong summary>{eur(operationalRows.reduce((sum, row) => sum + row.personnelCosts, 0))}</TableCell>
              <TableCell strong summary>{operationalRows.reduce((sum, row) => sum + row.sicknessDays, 0).toLocaleString("de-DE", { maximumFractionDigits: 1 })}</TableCell>
              <TableCell strong summary>
                {pct(
                  (operationalRows.reduce((sum, row) => sum + row.exitsInLatestYear, 0) /
                    Math.max(operationalRows.reduce((sum, row) => sum + row.activeEmployees, 0), 1)) *
                    100
                )}
              </TableCell>
            </tr>
          </tbody>
        </ResponsiveTable>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="AG-Kosten je Standort | aktive Mitarbeiter" icon={BadgeEuro}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={personnelCostRows}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={84}
                label={false}
                labelLine={false}
              >
                {personnelCostRows.map((_, index) => (
                  <Cell key={index} fill={personnelCostColors[index % personnelCostColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [eur(Number(value)), name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {personnelCostRows.map((row, index) => (
              <div key={row.name} className="rounded-md bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: personnelCostColors[index % personnelCostColors.length] }} />
                  <span className="text-sm font-semibold">{row.name}</span>
                </div>
                <p className="mt-1 text-lg font-bold">
                  {eur(row.value)}{" "}
                  <span className="text-xs font-semibold text-muted-foreground">
                    ({personnelCostTotal ? pct((row.value / personnelCostTotal) * 100) : "0 %"})
                  </span>
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
        <Card className="overflow-hidden">
          <div className="table-head p-4 text-white">
            <h2 className="font-bold">Top 10 Krankheitstage Mitarbeiter | {selectedYear}</h2>
          </div>
          <ResponsiveTable>
            <thead>
              <tr>
                <TableHead>Rang</TableHead>
                <TableHead>Mitarbeiter</TableHead>
                <TableHead>Standort</TableHead>
                <TableHead>Krankheitstage</TableHead>
                <TableHead>Anteil Jahr</TableHead>
              </tr>
            </thead>
            <tbody>
              {topSickEmployees.map((row, index) => (
                <tr key={`${row.employee}-${row.site}`}>
                  <TableCell strong>{index + 1}</TableCell>
                  <TableCell strong>{row.employee}</TableCell>
                  <TableCell>{row.site}</TableCell>
                  <TableCell>{row.days.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>{pct((row.days / daysInSelectedYear) * 100)}</TableCell>
                </tr>
              ))}
              {!topSickEmployees.length && (
                <tr>
                  <TableCell strong>Keine Daten</TableCell>
                  <TableCell>{""}</TableCell>
                  <TableCell>{""}</TableCell>
                  <TableCell>{""}</TableCell>
                  <TableCell>{""}</TableCell>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
          <p className="border-t border-border bg-slate-50 p-3 text-xs text-muted-foreground">
            Anteil Jahr = Krankheitstage des Mitarbeiters im ausgewählten Jahr geteilt durch {daysInSelectedYear} Kalendertage.
          </p>
        </Card>
      </div>
    </section>
  );
}

function CompactPersonalDataStatus({ personalData }: { personalData: PersonalDashboardData }) {
  return (
    <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-white/75 px-3 py-2 text-xs shadow-sm">
      <Badge tone="green">Personal-Import bestätigt</Badge>
      <span className="hidden max-w-[240px] truncate text-muted-foreground sm:inline">
        {new Date(personalData.importedAt).toLocaleDateString("de-DE")} · {personalData.fileName}
      </span>
    </div>
  );
}

function PersonalSickness({ personalData }: { personalData: PersonalDashboardData }) {
  const [year, setYear] = useState(String(personalData.report.years.at(-1) ?? new Date().getFullYear()));
  const selectedYear = Number(year);
  const formatOneDecimal = (value: number) =>
    value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const sites = personalData.settings.sites.length ? personalData.settings.sites : uniqueSortedText(personalData.employees.map((employee) => employee.site));
  const siteRows = sites.map((site) => {
    const employeesInYear = personalData.employees.filter((employee) => employee.site === site && personalWasEmployedInYear(employee, selectedYear));
    const entries = personalData.sicknessEntries.filter((entry) => entry.site === site && entry.year === selectedYear);
    return {
      site,
      days: entries.reduce((sum, entry) => sum + entry.days, 0),
      cases: entries.length,
      active: employeesInYear.length
    };
  });
  const monthRows = bwaMonths.map((month, index) => ({
    month,
    days: personalData.sicknessEntries.filter((entry) => entry.year === selectedYear && entry.month === index + 1).reduce((sum, entry) => sum + entry.days, 0)
  }));
  const monthlySiteRows = siteRows.map((site) => {
    const monthlyValues = bwaMonths.map((_, index) =>
      personalData.sicknessEntries
        .filter((entry) => entry.site === site.site && entry.year === selectedYear && entry.month === index + 1)
        .reduce((sum, entry) => sum + entry.days, 0)
    );
    return {
      site: site.site,
      monthlyValues,
      total: monthlyValues.reduce((sum, value) => sum + value, 0)
    };
  });
  const monthlyTotals = bwaMonths.map((_, index) => monthlySiteRows.reduce((sum, row) => sum + row.monthlyValues[index], 0));
  const relativeMonthlyRows = monthlySiteRows.map((row) => {
    const monthlyActiveEmployees = bwaMonths.map((_, index) =>
      personalData.employees.filter((employee) => employee.site === row.site && personalWasEmployedInMonth(employee, selectedYear, index + 1)).length
    );
    const activeMonths = monthlyActiveEmployees.filter((value, index) => value > 0 || row.monthlyValues[index] > 0);
    const averageActiveEmployees = activeMonths.length ? activeMonths.reduce((sum, value) => sum + value, 0) / activeMonths.length : 0;
    return {
      ...row,
      monthlyActiveEmployees,
      activeEmployees: averageActiveEmployees,
      relativeValues: row.monthlyValues.map((value, index) => (monthlyActiveEmployees[index] ? value / monthlyActiveEmployees[index] : 0)),
      relativeTotal: averageActiveEmployees ? row.total / averageActiveEmployees : 0
    };
  });
  const highestRelativeRow = relativeMonthlyRows.reduce(
    (highest, row) => (row.relativeTotal > highest.relativeTotal ? row : highest),
    { site: "", activeEmployees: 0, monthlyActiveEmployees: [], monthlyValues: [], relativeValues: [], total: 0, relativeTotal: 0 }
  );
  const maxRelativeMonth = Math.max(...relativeMonthlyRows.flatMap((row) => row.relativeValues), 0);
  const relativeHeatTone = (value: number) => {
    if (!value || !maxRelativeMonth) return "rgba(15, 118, 110, 0.10)";
    const intensity = Math.max(0.15, Math.min(value / maxRelativeMonth, 1));
    return `rgba(15, 118, 110, ${0.12 + intensity * 0.34})`;
  };
  const daysInSelectedYear = new Date(selectedYear, 1, 29).getMonth() === 1 ? 366 : 365;
  const topSickEmployees = Array.from(
    personalData.sicknessEntries
      .filter((entry) => entry.year === selectedYear)
      .reduce((map, entry) => {
        const key = entry.employeeId || `${entry.employeeName}-${entry.site}`;
        const existing = map.get(key) ?? {
          employee: entry.employeeName || entry.employeeId || "Unbekannt",
          site: entry.site,
          days: 0
        };
        existing.days += entry.days;
        if (!existing.site && entry.site) existing.site = entry.site;
        map.set(key, existing);
        return map;
      }, new Map<string, { employee: string; site: string; days: number }>())
      .values()
  )
    .sort((a, b) => b.days - a.days)
    .slice(0, 10);

  return (
    <section className="space-y-5">
      <PageTitle title="Krankheit / Fehlzeiten" text="Krankheitstage aus Input_Krankheitstage nach Standort, Jahr und Monat." />
      <Select className="w-full max-w-xs" value={year} onChange={(event) => setYear(event.target.value)}>
        {personalData.report.years.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </Select>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title={`Krankheitstage je Monat | ${selectedYear}`} icon={Stethoscope}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={(value) => [`${value} Tage`, "Krankheit"]} />
              <Bar dataKey="days" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={`Krankheitstage je Standort | ${selectedYear}`} icon={Building2}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={siteRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="site" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={(value) => [`${value} Tage`, "Krankheit"]} />
              <Bar dataKey="days" fill="#0891b2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card className="overflow-hidden">
        <div className="p-4">
          <h2 className="font-bold">Fehlzeiten je Standort | {selectedYear}</h2>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <TableHead>Standort</TableHead>
              <TableHead>Krankheitstage</TableHead>
              <TableHead>Einträge</TableHead>
              <TableHead>Aktive Mitarbeiter</TableHead>
              <TableHead>Tage je aktivem Mitarbeiter</TableHead>
            </tr>
          </thead>
          <tbody>
            {siteRows.map((row) => (
              <tr key={row.site}>
                <TableCell strong>{row.site}</TableCell>
                <TableCell>{row.days.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</TableCell>
                <TableCell>{row.cases}</TableCell>
                <TableCell>{row.active}</TableCell>
                <TableCell>{row.active ? formatOneDecimal(row.days / row.active) : ""}</TableCell>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      </Card>
      <Card className="overflow-hidden">
        <div className="table-head p-4 text-white">
          <h2 className="font-bold">Top 10 kranke Mitarbeiter | {selectedYear}</h2>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <TableHead>Rang</TableHead>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead>Standort</TableHead>
              <TableHead>Krankheitstage</TableHead>
              <TableHead>Anteil Jahr</TableHead>
            </tr>
          </thead>
          <tbody>
            {topSickEmployees.map((row, index) => (
              <tr key={`${row.employee}-${row.site}`}>
                <TableCell strong>{index + 1}</TableCell>
                <TableCell strong>{row.employee}</TableCell>
                <TableCell>{row.site}</TableCell>
                <TableCell>{formatOneDecimal(row.days)}</TableCell>
                <TableCell>{pct((row.days / daysInSelectedYear) * 100)}</TableCell>
              </tr>
            ))}
            {!topSickEmployees.length && (
              <tr>
                <TableCell strong>Keine Daten</TableCell>
                <TableCell>{""}</TableCell>
                <TableCell>{""}</TableCell>
                <TableCell>{""}</TableCell>
                <TableCell>{""}</TableCell>
              </tr>
            )}
          </tbody>
        </ResponsiveTable>
        <p className="border-t border-border bg-slate-50 p-3 text-xs text-muted-foreground">
          Anteil Jahr = Krankheitstage des Mitarbeiters im ausgewählten Jahr geteilt durch {daysInSelectedYear} Kalendertage.
        </p>
      </Card>
      <Card className="overflow-hidden">
        <div className="p-4">
          <h2 className="font-bold">Monatliche Krankheitstage je Standort | {selectedYear}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aufstellung aus Input_Krankheitstage nach Monat und Standort.</p>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <TableHead>Standort</TableHead>
              {bwaMonths.map((month) => (
                <TableHead key={month}>{month}</TableHead>
              ))}
              <TableHead>Gesamt</TableHead>
            </tr>
          </thead>
          <tbody>
            {monthlySiteRows.map((row) => (
              <tr key={row.site}>
                <TableCell strong>{row.site}</TableCell>
                {row.monthlyValues.map((value, index) => (
                  <TableCell key={`${row.site}-${bwaMonths[index]}`}>
                    {value || monthlyTotals[index] > 0 ? formatOneDecimal(value) : ""}
                  </TableCell>
                ))}
                <TableCell strong summary>{formatOneDecimal(row.total)}</TableCell>
              </tr>
            ))}
            <tr className="summary-row">
              <TableCell strong summary>Gesamt</TableCell>
              {monthlyTotals.map((value, index) => (
                <TableCell key={`gesamt-${bwaMonths[index]}`} strong summary>{value ? formatOneDecimal(value) : ""}</TableCell>
              ))}
              <TableCell strong summary>{formatOneDecimal(monthlyTotals.reduce((sum, value) => sum + value, 0))}</TableCell>
            </tr>
          </tbody>
        </ResponsiveTable>
      </Card>
      <Card className="overflow-hidden">
        <div className="table-head p-4 text-white">
          <h2 className="font-bold">Vergleichbar: Krankheitstage je aktivem Mitarbeiter | {selectedYear}</h2>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <TableHead>Standort</TableHead>
              <TableHead>Ø aktive MA</TableHead>
              {bwaMonths.map((month) => (
                <TableHead key={month}>{month}</TableHead>
              ))}
              <TableHead>Gesamt</TableHead>
            </tr>
          </thead>
          <tbody>
            {relativeMonthlyRows.map((row) => (
              <tr key={row.site}>
                <TableCell strong>{row.site}</TableCell>
                <TableCell>{row.activeEmployees ? formatOneDecimal(row.activeEmployees) : ""}</TableCell>
                {row.relativeValues.map((value, index) => (
                  <td
                    key={`${row.site}-relative-${bwaMonths[index]}`}
                    className="table-number-col border-b border-r border-border p-2 text-right tabular-nums"
                    style={{ backgroundColor: relativeHeatTone(value) }}
                  >
                    {value ? formatOneDecimal(value) : ""}
                  </td>
                ))}
                <TableCell strong summary>{row.relativeTotal ? formatOneDecimal(row.relativeTotal) : ""}</TableCell>
              </tr>
            ))}
            <tr className="summary-row">
              <TableCell strong summary>Höchster Standort vergleichbar</TableCell>
              <TableCell strong summary>{highestRelativeRow.site || ""}</TableCell>
              {bwaMonths.map((month) => (
                <TableCell key={`highest-relative-${month}`} summary>{""}</TableCell>
              ))}
              <TableCell strong summary>{highestRelativeRow.relativeTotal ? formatOneDecimal(highestRelativeRow.relativeTotal) : ""}</TableCell>
            </tr>
          </tbody>
        </ResponsiveTable>
      </Card>
    </section>
  );
}

type PersonalEmployeeColumn = {
  label: string;
  sensitive?: boolean;
  render: (employee: PersonalEmployee) => string | number;
};

function PersonalEmployees({ personalData, userRole }: { personalData: PersonalDashboardData; userRole: UserRole }) {
  const [site, setSite] = useState("Alle Standorte");
  const [status, setStatus] = useState("Alle Status");
  const [search, setSearch] = useState("");
  const canSeeCompensation = userRole !== "praxismanagement";
  const normalizedSearch = search.trim().toLowerCase();
  const activeEmployees = personalData.employees.filter((employee) => employee.status.toLowerCase() === "aktiv");
  const rows = personalData.employees.filter((employee) => {
    const siteMatch = site === "Alle Standorte" || employee.site === site;
    const statusMatch = status === "Alle Status" || employee.status === status;
    const searchable = [employee.name, employee.firstName, employee.lastName, employee.id, employee.site, employee.functionName]
      .join(" ")
      .toLowerCase();
    const searchMatch = !normalizedSearch || searchable.includes(normalizedSearch);
    return siteMatch && statusMatch && searchMatch;
  });
  const employeeColumns: PersonalEmployeeColumn[] = [
    { label: "Mitarbeiter", render: (employee) => employee.name || employee.id },
    { label: "Standort", render: (employee) => employee.site },
    { label: "Status", render: (employee) => employee.status },
    { label: "Funktion", render: (employee) => employee.functionName },
    { label: "Bereich", render: (employee) => employee.area },
    { label: "Eintritt", render: (employee) => employee.entryDate },
    { label: "Wochenstunden", render: (employee) => employee.weeklyHours.toLocaleString("de-DE", { maximumFractionDigits: 1 }) },
    { label: "Fixgehalt", sensitive: true, render: (employee) => (employee.fixedSalary ? eur(employee.fixedSalary) : "") },
    { label: "Stundenlohn Fixgehalt", sensitive: true, render: (employee) => (employee.hourlyWage ? eur(employee.hourlyWage) : "") },
    { label: "AG-Aufwand", sensitive: true, render: (employee) => (employee.employerCost ? eur(employee.employerCost) : "") },
    { label: "Bemerkungen", render: (employee) => employee.note }
  ];
  const visibleColumns = employeeColumns.filter((column) => canSeeCompensation || !column.sensitive);
  const exportTitle = `Mitarbeiterübersicht - ${site} - ${status}${search ? ` - Suche: ${search}` : ""}`;
  const exportDescription = `Export der aktuell gefilterten Ansicht. Zeilen: ${rows.length}. Rolle: ${roleLabel(userRole)}.`;
  const printEmployeeList = () => {
    window.setTimeout(() => window.print(), 50);
  };

  return (
    <section className="space-y-5">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          #employee-export-pdf,
          #employee-export-pdf * {
            visibility: visible !important;
          }
          #employee-export-pdf {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            padding: 0;
            background: white;
            color: #0f172a;
          }
          #employee-export-pdf table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          #employee-export-pdf th {
            background: #0f6f82;
            color: white;
            text-align: left;
          }
          #employee-export-pdf th,
          #employee-export-pdf td {
            border: 1px solid #d7dee8;
            padding: 6px;
            vertical-align: top;
          }
        }
      `}</style>
      <PageTitle title="Mitarbeiterübersicht" text="Stammdaten, Beschäftigungsart, Funktion und Vergütungsdaten aus Input_Mitarbeiter." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aktive Mitarbeiter" value={activeEmployees.length} plain delta="nur Status Aktiv" icon={Users} status="green" />
        <KpiCard
          label="FTE aktiv"
          value={Math.round(activeEmployees.reduce((sum, employee) => sum + employee.weeklyHours / 40, 0) * 10) / 10}
          plain
          delta="Basis 40 Std./Woche"
          icon={Gauge}
          status="green"
        />
        {canSeeCompensation && (
          <KpiCard
            label="AG-Aufwand aktiv"
            value={activeEmployees.reduce((sum, employee) => sum + employee.employerCost, 0)}
            delta="monatlich laut Import"
            icon={BadgeEuro}
            status="yellow"
          />
        )}
        <KpiCard label="Gefilterte Zeilen" value={rows.length} plain delta="aktuelle Tabellenansicht" icon={UserRound} status="green" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Mitarbeiter suchen..."
        />
        <Select value={site} onChange={(event) => setSite(event.target.value)}>
          <option>Alle Standorte</option>
          {personalData.settings.sites.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Alle Status</option>
          {personalData.settings.statuses.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Button className="gap-2" variant="secondary" onClick={printEmployeeList}>
          <FileBarChart className="h-4 w-4" />
          PDF exportieren
        </Button>
      </div>
      <Card className="overflow-hidden">
        <ResponsiveTable>
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <TableHead key={column.label}>{column.label}</TableHead>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((employee) => (
              <tr key={employee.id}>
                {visibleColumns.map((column, index) => (
                  <TableCell key={`${employee.id}-${column.label}`} strong={index === 0}>
                    {column.render(employee)}
                  </TableCell>
                ))}
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      </Card>
      <div id="employee-export-pdf" className="hidden">
        <h1 className="text-2xl font-bold">Orisus Mitarbeiterübersicht</h1>
        <p className="mt-2 text-sm text-slate-600">{exportTitle}</p>
        <p className="mt-1 text-sm text-slate-600">{exportDescription}</p>
        <table className="mt-5">
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th key={`export-${column.label}`}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((employee) => (
              <tr key={`export-${employee.id}`}>
                {visibleColumns.map((column) => (
                  <td key={`export-${employee.id}-${column.label}`}>{column.render(employee)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PersonalActions({ personalData }: { personalData: PersonalDashboardData }) {
  return (
    <section className="space-y-5">
      <PageTitle title="Personalmaßnahmen" text="Abgeschickte und erledigte Maßnahmen aus Input_Personalmassnahmen." />
      <Card className="overflow-hidden">
        {personalData.actionEntries.length ? (
          <ResponsiveTable>
            <thead>
              <tr>
                <TableHead>Datum</TableHead>
                <TableHead>Mitarbeiter</TableHead>
                <TableHead>Standort</TableHead>
                <TableHead>Maßnahme</TableHead>
                <TableHead>Details</TableHead>
              </tr>
            </thead>
            <tbody>
              {personalData.actionEntries.map((entry) => (
                <tr key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell strong>{entry.employeeName || entry.employeeId}</TableCell>
                  <TableCell>{entry.site}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.details}</TableCell>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        ) : (
          <div className="p-5 text-sm font-semibold text-muted-foreground">Noch keine Personalmaßnahmen in der Personal-Arbeitsmappe hinterlegt.</div>
        )}
      </Card>
    </section>
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
  const topBehandlerPeriod = importedData?.topBehandlerPeriod ?? cockpitPeriod;
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle title="Daily CFO Cockpit" text="Konsolidierte Steuerung der Orisus-Gruppe: Liquidität, Ergebnis, Forderungen, Fremdkapital und Handlungsbedarf." />
        <CompactDataStatus importedData={importedData} />
      </div>
      <DailyCfoCockpit sites={sites} monthlyData={monthlyData} period={cockpitPeriod} />

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Ist EBITDA vs. Ziel-EBITDA Kaufvertrag | seit Vertragsstart" icon={TrendingUp}>
          <EbitdaTargetChart sites={sites} />
        </ChartCard>
        <ChartCard title="Offene Forderungen je Standort | aktueller Stand" icon={FileBarChart}>
          <ReceivablesChart sites={sites} />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Standortvergleich Gesamtleistung & EBITDA | seit Vertragsstart" icon={BarChart3}>
          <SitePerformanceChart sites={sites} />
        </ChartCard>
        <ChartCard title={`Top Behandler nach Honorarumsatz | ${topBehandlerPeriod}`} icon={BadgeEuro}>
          <TopBehandlerChart data={importedData?.topBehandler ?? []} />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Kostenquoten am Umsatz | seit Vertragsstart" icon={PieIcon}>
          <CostShareDonut sites={sites} />
        </ChartCard>
        <TrafficLights sites={sites} monthlyData={monthlyData} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Insights setPage={setPage} />
        <Card className="h-full p-4">
          <h2 className="font-bold">Detailauswertungen</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Das CFO-Cockpit bleibt die verdichtete Management-Sicht. BWA, Standortdetails, Cashflow-Herleitungen,
            Darlehen, Earn-Outs und Benchmarking liegen in den jeweiligen Fachreitern.
          </p>
        </Card>
      </div>
    </section>
  );
}

function CompactDataStatus({ importedData }: { importedData?: ImportedDashboardData | null }) {
  const label = importedData ? "Import bestätigt" : "Kein Import";
  const tone = importedData?.report.status === "warning" ? "yellow" : importedData ? "green" : "red";
  const dateLabel = importedData ? new Date(importedData.importedAt).toLocaleDateString("de-DE") : "Daten offen";

  return (
    <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-white/75 px-3 py-2 text-xs shadow-sm">
      <Badge tone={tone}>{label}</Badge>
      <span className="hidden max-w-[220px] truncate text-muted-foreground sm:inline">
        {dateLabel}
        {importedData?.fileName ? ` · ${importedData.fileName}` : ""}
      </span>
    </div>
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

function DailyCfoCockpit({ sites, monthlyData, period }: { sites: DashboardSite[]; monthlyData: typeof monthly; period: string }) {
  const rules = useKpiRules();
  const metrics = cfoMetrics(sites, monthlyData, rules);
  const criticalSites = metrics.kritisch;
  const riskLabel = criticalSites.length ? criticalSites.map((site) => site.name).join(", ") : "Keine roten Standorte";
  const criticalReasons = criticalSites.map((site) => {
    const kvAchievement = kvEbitdaAchievement(site);
    const receivablesRatio = site.gesamtleistung ? (site.forderungen / site.gesamtleistung) * 100 : 0;
    const reasons = [
      statusForSiteByRules(site, rules) === "red" ? "Standortampel rot" : "",
      statusByRule(site.cashflow, rules.cashflow_bwa) === "red" ? `Cashflow gem. BWA kritisch (${eur(site.cashflow)})` : "",
      statusByRule(site.ebitdaMarge, rules.ebitda_marge) === "red" ? `EBITDA-Marge kritisch (${pct(site.ebitdaMarge)})` : "",
      statusByRule(receivablesRatio, rules.offene_forderungen) === "red"
        ? `Forderungen kritisch (${pct(receivablesRatio)} der Gesamtleistung)`
        : "",
      kvAchievement !== null && statusByRule(kvAchievement, rules.ziel_ebitda_kaufvertrag) === "red"
        ? `Ziel-EBITDA KV kritisch (${pct(kvAchievement)} Zielerreichung)`
        : ""
    ].filter(Boolean);
    return { site: site.name, reasons };
  });
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
  const earnOutRows = projectedEarnOutRows(sites, period);
  const expectedEarnOut = earnOutRows.reduce((sum, row) => sum + row.projection.projectedEarnOut, 0);
  const expectedGrowthPayment = earnOutRows.reduce((sum, row) => sum + row.projection.projectedGrowthPayment, 0);
  const expectedTotalPayment = expectedEarnOut + expectedGrowthPayment;
  const expectedEarnOutInfo = <ExpectedEarnOutInfo rows={earnOutRows} period={period} />;
  const expectedGrowthPaymentInfo = <ExpectedGrowthPaymentInfo rows={earnOutRows} period={period} />;
  const expectedObligationInfo = <ExpectedObligationInfo rows={earnOutRows} period={period} />;

  const kpis = [
    {
      label: "Aktuelle Liquidität | aktueller Stand",
      value: metrics.kontostand,
      delta: "Konsolidierter Kontostand",
      icon: CircleDollarSign,
      status: statusByRule(metrics.kontostand, rules.aktuelle_liquiditaet),
      info: (
        <div className="space-y-1">
          <p className="font-bold text-slate-900">Herleitung aktueller Stand</p>
          {sites.map((site) => (
            <InfoLine key={site.id} label={site.name} value={site.kontostand} />
          ))}
          <div className="mt-2 border-t border-border pt-2">
            <InfoLine label="= Konsolidierter Kontostand" value={metrics.kontostand} strong />
          </div>
        </div>
      )
    },
    {
      label: "Offene Forderungen | aktueller Stand",
      value: metrics.forderungen,
      delta: "Konsolidiert seit Vertragsstart",
      icon: FileBarChart,
      status: statusByRule(metrics.gesamtleistung ? (metrics.forderungen / metrics.gesamtleistung) * 100 : 0, rules.offene_forderungen),
      info: (
        <div className="space-y-1">
          <p className="font-bold text-slate-900">Zusammensetzung aktueller Stand</p>
          {sites.map((site) => (
            <InfoLine key={site.id} label={site.name} value={site.forderungen} />
          ))}
          <div className="mt-2 border-t border-border pt-2">
            <InfoLine label="= Offene Forderungen gesamt" value={metrics.forderungen} strong />
          </div>
        </div>
      )
    },
    {
      label: "Free Cashflow gem. BWA | seit Vertragsstart",
      value: metrics.cashflow,
      delta: "nach Tilgung, Investitionen, Umbuchungen",
      icon: Wallet,
      status: statusByRule(metrics.cashflow, rules.cashflow_bwa),
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
            <InfoLine label="= Free Cashflow gem. BWA" value={metrics.cashflow} strong />
          </div>
        </div>
      )
    },
    {
      label: "EBITDA | seit Vertragsstart",
      value: metrics.ebitda,
      delta: `${pct(metrics.ebitdaMarge)} Marge | Run-Rate ${eur(metrics.runRateEbitda, true)}`,
      icon: Banknote,
      status: statusByRule(metrics.ebitdaMarge, rules.ebitda_marge),
      info: (
        <div className="space-y-1">
          <p className="font-bold text-slate-900">Herleitung seit Vertragsstart</p>
          {sortSitesByContractStart(sites).map((site) => (
            <InfoLine key={site.id} label={site.name} value={site.ebitda} />
          ))}
          <div className="mt-2 border-t border-border pt-2">
            <InfoLine label="= EBITDA gesamt" value={metrics.ebitda} strong />
            <InfoLine label="Gesamtleistung" value={metrics.gesamtleistung} />
            <p className="mt-1 text-slate-700">
              EBITDA-Marge: <span className="font-bold">{pct(metrics.ebitdaMarge)}</span>
            </p>
            <p className="text-slate-700">
              Run-Rate: <span className="font-bold">{eur(metrics.runRateEbitda)}</span>
            </p>
          </div>
        </div>
      )
    },
    {
      label: "Fremdkapital | seit Vertragsstart",
      value: Math.max(0, metrics.aufgenommen - metrics.tilgung),
      delta: `${eur(metrics.aufgenommen, true)} aufgenommen | ${eur(metrics.tilgung, true)} getilgt`,
      icon: Landmark,
      status: statusByRule(metrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit),
      info: (
        <div className="space-y-2">
          <p className="font-bold text-slate-900">Herleitung seit Vertragsstart</p>
          <div className="space-y-1">
            {sortSitesByContractStart(sites).map((site) => (
              <div key={site.id} className="rounded border border-border bg-white/70 p-2 text-left">
                <p className="font-semibold text-slate-900">{site.name}</p>
                <InfoLine label="Aufgenommen" value={site.darlehen.darlehen} />
                <InfoLine label="- Tilgung" value={-site.darlehen.tilgung} />
                <InfoLine label="= Restschuld" value={site.darlehen.restschuld} strong />
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <InfoLine label="Aufgenommen gesamt" value={metrics.aufgenommen} />
            <InfoLine label="- Getilgt gesamt" value={-metrics.tilgung} />
            <InfoLine label="= Offenes Fremdkapital" value={Math.max(0, metrics.aufgenommen - metrics.tilgung)} strong />
            <p className="mt-1 text-slate-700">
              Kapitaldienstfähigkeit: <span className="font-bold">{metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x</span>
            </p>
          </div>
        </div>
      )
    },
    {
      label: "Erwarteter Earn-Out | Run-Rate",
      value: expectedEarnOut,
      delta: "Fälligkeit nach Vertragsperiode",
      icon: BadgeEuro,
      status: expectedEarnOut > 0 ? "yellow" : "green",
      info: expectedEarnOutInfo
    },
    {
      label: "Erwartete Wachstumszahlung | Run-Rate",
      value: expectedGrowthPayment,
      delta: "nur Mehr-EBITDA-Vertragslogik",
      icon: TrendingUp,
      status: expectedGrowthPayment > 0 ? "yellow" : "green",
      info: expectedGrowthPaymentInfo
    },
    {
      label: "Erwartete Gesamtzahlung | nach Vertragsende",
      value: expectedTotalPayment,
      delta: "Earn-Out plus Wachstumszahlung",
      icon: ReceiptText,
      status: expectedTotalPayment > 0 ? "yellow" : "green",
      info: expectedObligationInfo
    },
    {
      label: "Kritische Standorte | aktueller Stand",
      value: criticalSites.length,
      delta: riskLabel,
      icon: Building2,
      plain: true,
      status: criticalSites.length ? "yellow" : "green",
      info: (
        <div className="space-y-2">
          <p className="font-bold text-slate-900">Warum ein Standort kritisch ist</p>
          <p>
            Ein Standort wird hier gezählt, wenn mindestens eine CFO-Regel greift: rote Ampel, Cashflow gem. BWA negativ,
            EBITDA-Marge unter 10 %, offene Forderungen über 15 % der Gesamtleistung oder Ziel-EBITDA gemäß
            Kaufvertrag bis zum aktuellen Datenstand unter 85 % erreicht.
          </p>
          {criticalReasons.length ? (
            <div className="space-y-1">
              {criticalReasons.map((row) => (
                <p key={row.site}>
                  <span className="font-semibold">{row.site}:</span> {row.reasons.join(", ")}
                </p>
              ))}
            </div>
          ) : (
            <p>Aktuell greift bei keinem Standort eine dieser Regeln.</p>
          )}
        </div>
      )
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
    <Card className="relative flex min-h-[12.5rem] flex-col p-5 text-center">
      <div className="mb-3 flex min-h-8 items-start justify-between gap-3">
        <div className="w-8 shrink-0">
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
        </div>
        <div className="flex min-w-0 justify-end">
          <StatusDot status={status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-md table-total text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 max-w-full text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{plain ? value.toLocaleString("de-DE") : percent ? pct(value) : eur(value, true)}</p>
        <div className={cn("mt-3 flex max-w-full items-center justify-center gap-1 text-sm font-semibold", positive ? "text-emerald-700" : "text-red-700")}>
          {positive ? <ArrowUpRight className="h-4 w-4 shrink-0" /> : <ArrowDownRight className="h-4 w-4 shrink-0" />}
          <span className="min-w-0 break-words">{delta}</span>
        </div>
        {infoOpen && info ? (
          <InfoDialog title={label} onClose={() => setInfoOpen(false)}>
            {info}
          </InfoDialog>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">Ampelstatus nach vorläufiger CFO-Logik.</p>
      </div>
    </Card>
  );
}

function InfoDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-6 sm:items-center sm:pt-4">
      <button
        type="button"
        aria-label="Info schließen"
        className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="app-info-popover relative z-[201] max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white p-4 text-left text-sm leading-6 text-slate-900 shadow-2xl sm:max-h-[calc(100vh-8rem)]"
      >
        <div className="sticky top-0 z-10 mb-3 flex items-start justify-between gap-3 border-b border-slate-200 bg-white pb-3">
          <p className="text-base font-bold text-slate-950">{title}</p>
          <button
            type="button"
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>,
    document.body
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

function InfoTextLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", strong && "font-bold text-slate-950")}>
      <span>{label}</span>
      <span className="whitespace-nowrap text-right">{value}</span>
    </div>
  );
}

function StatusDot({ status, label }: { status: Status; label?: string }) {
  return (
    <Badge className="max-w-full whitespace-nowrap" tone={statusMap[status].tone}>
      <span className={cn("h-2 w-2 rounded-full", statusMap[status].dot)} />
      {label ?? statusMap[status].label}
    </Badge>
  );
}

function siteStatusLabel(site: DashboardSite) {
  if (site.status === "red" && site.cashflow < 0) return "Handlungsbedarf: Cashflow gem. BWA negativ";
  if (site.status === "red" && site.ebitdaMarge < 8) return "Handlungsbedarf: Marge niedrig";
  return statusMap[site.status].label;
}

function ChartCard({
  title,
  icon: Icon,
  children,
  action
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="h-full p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="font-bold">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </Card>
  );
}

type EbitdaTargetChartRow = {
  name: string;
  ebitda: number;
  zielEbitdaKaufvertrag: number;
  abweichung: number;
  abweichungPct: number;
};

function EbitdaTargetTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ payload?: EbitdaTargetChartRow }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-md border border-border bg-white p-3 text-sm shadow-lg">
      <p className="mb-2 font-bold text-slate-900">{label}</p>
      <p className="text-teal-700">Ist EBITDA: {eur(row.ebitda)}</p>
      <p className="text-sky-700">Ziel-EBITDA KV: {eur(row.zielEbitdaKaufvertrag)}</p>
      <p className={cn("font-bold", row.abweichung < 0 ? "text-red-700" : "text-emerald-700")}>
        Abw.: {eur(row.abweichung)} ({pct(row.abweichungPct)})
      </p>
    </div>
  );
}

function EbitdaTargetChart({ sites = standorte }: { sites?: DashboardSite[] }) {
  const chartData = sortSitesByContractStart(sites)
    .filter((site) => site.gesamtleistung > 0 || site.ebitda !== 0 || (site.darlehen.zielEbitdaKaufvertrag ?? site.darlehen.zielEbitda) !== 0)
    .map((site) => {
      const zielEbitdaKaufvertrag = site.darlehen.zielEbitdaKaufvertrag ?? site.darlehen.zielEbitda;
      const abweichung = site.ebitda - zielEbitdaKaufvertrag;
      return {
      name: site.name,
      ebitda: site.ebitda,
        zielEbitdaKaufvertrag,
        abweichung,
        abweichungPct: zielEbitdaKaufvertrag ? (abweichung / zielEbitdaKaufvertrag) * 100 : 0
      };
    });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
        <Tooltip content={<EbitdaTargetTooltip />} />
        <Bar dataKey="ebitda" name="Ist EBITDA seit Vertragsstart" fill="#0f766e" radius={[5, 5, 0, 0]} />
        <Line
          type="monotone"
          dataKey="zielEbitdaKaufvertrag"
          name="Ziel-EBITDA Kaufvertrag"
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
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={78}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickFormatter={(value) => String(value).length > 16 ? `${String(value).slice(0, 15)}…` : String(value)}
        />
        <Tooltip formatter={(v) => eur(Number(v))} labelFormatter={(label) => `${label} Honorarumsatz`} />
        <Bar dataKey="honorar" name="Honorarumsatz" fill="#0f766e" radius={[0, 5, 5, 0]}>
          <LabelList
            dataKey="honorar"
            position="insideRight"
            formatter={(value: number) => eur(Number(value), true)}
            fill="#ccfbf1"
            fontSize={11}
            fontWeight={700}
          />
        </Bar>
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

function CostRatios({ site, sites = standorte, periodLabel = "seit Vertragsstart" }: { site?: DashboardSite; sites?: DashboardSite[]; periodLabel?: string }) {
  const rules = useKpiRules();
  const material = site?.materialquote ?? 9.9;
  const fremdlabor = site?.fremdlaborquote ?? 15.6;
  const personal = site?.personalquote ?? 0;
  const sonstige = site?.sonstigeKostenquote ?? 37.8;
  const aggregate = !site && sites.length;
  const weighted = (key: "materialquote" | "fremdlaborquote" | "personalquote" | "sonstigeKostenquote") => {
    const performance = totalForSites(sites, "gesamtleistung");
    return performance ? sites.reduce((sum, current) => sum + current.gesamtleistung * (current[key] ?? 0), 0) / performance : 0;
  };
  const actualMaterial = aggregate ? weighted("materialquote") : material;
  const actualFremdlabor = aggregate ? weighted("fremdlaborquote") : fremdlabor;
  const actualPersonal = aggregate ? weighted("personalquote") : personal;
  const actualSonstige = aggregate ? weighted("sonstigeKostenquote") : sonstige;
  const totalCostRatio = actualMaterial + actualFremdlabor + actualPersonal + actualSonstige;
  const rows = [
    { label: "Personalkostenquote", value: actualPersonal, target: 43.0, status: (actualPersonal <= 43 ? "green" : "yellow") as Status },
    { label: "Materialquote", value: actualMaterial, target: 10.0, status: (actualMaterial <= 10 ? "green" : "yellow") as Status },
    { label: "Fremdlaborquote", value: actualFremdlabor, target: 14.5, status: (actualFremdlabor <= 14.5 ? "green" : "yellow") as Status },
    { label: "Sonstige Kostenquote", value: actualSonstige, target: 36.0, status: (actualSonstige <= 36 ? "green" : "yellow") as Status },
    { label: "Gesamtkostenquote", value: totalCostRatio, target: rules.kostenquote.green, status: statusByRule(totalCostRatio, rules.kostenquote) }
  ];
  return (
    <Card className="p-4">
      <h2 className="font-bold">{site ? `Kostenquoten ${site.name} | ${periodLabel}` : `Kostenquoten | ${periodLabel}`}</h2>
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
    ["Cashflow gem. BWA", totalCashflow]
  ];
  return (
    <Card className="p-4">
      <h2 className="font-bold">Cashflow gem. BWA | seit Vertragsstart</h2>
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
        <Mini
          label="Aufgenommenes Fremdkapital"
          value={eur(aufgenommen)}
          info={
            <div className="space-y-1">
              <p className="font-bold text-slate-900">Zusammensetzung seit Vertragsstart</p>
              {sortSitesByContractStart(sites).map((site) => (
                <InfoLine key={site.id} label={site.name} value={site.darlehen.darlehen} />
              ))}
              <div className="mt-2 border-t border-border pt-2">
                <InfoLine label="= Aufgenommenes Fremdkapital gesamt" value={aufgenommen} strong />
              </div>
            </div>
          }
        />
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
  const rules = useKpiRules();
  const metrics = cfoMetrics(sites, monthlyData, rules);
  const receivablesRatio = metrics.gesamtleistung ? (metrics.forderungen / metrics.gesamtleistung) * 100 : 0;
  const rows = [
    {
      label: "EBITDA-Marge Konzern",
      value: pct(metrics.ebitdaMarge),
      status: statusByRule(metrics.ebitdaMarge, rules.ebitda_marge),
      rule: `grün ${kpiRuleText(rules.ebitda_marge, "green")}, gelb ${kpiRuleText(rules.ebitda_marge, "yellow")}`
    },
    {
      label: "Cashflow gem. BWA",
      value: eur(metrics.cashflow),
      status: statusByRule(metrics.cashflow, rules.cashflow_bwa),
      rule: `grün ${kpiRuleText(rules.cashflow_bwa, "green")}, rot ${kpiRuleText(rules.cashflow_bwa, "red")}`
    },
    {
      label: "Offene Forderungen",
      value: eur(metrics.forderungen),
      status: statusByRule(receivablesRatio, rules.offene_forderungen),
      rule: `${pct(receivablesRatio)} der Gesamtleistung | grün ${kpiRuleText(rules.offene_forderungen, "green")}`
    },
    {
      label: "Kostenquote",
      value: pct(metrics.kostenquote),
      status: statusByRule(metrics.kostenquote, rules.kostenquote),
      rule: `Material, Fremdlabor und sonstige Kosten | grün ${kpiRuleText(rules.kostenquote, "green")}`
    },
    {
      label: "Aktuelle Liquidität",
      value: eur(metrics.kontostand),
      status: statusByRule(metrics.kontostand, rules.aktuelle_liquiditaet),
      rule: `konsolidierter Kontostand | grün ${kpiRuleText(rules.aktuelle_liquiditaet, "green")}`
    },
    {
      label: "Kapitaldienstfähigkeit",
      value: `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`,
      status: statusByRule(metrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit),
      rule: `EBITDA / Tilgung plus Zins | grün ${kpiRuleText(rules.kapitaldienstfaehigkeit, "green")}`
    }
  ] satisfies Array<{ label: string; value: string; status: Status; rule: string }>;
  return (
    <Card className="h-full p-4">
      <h2 className="font-bold">Ampel-Center | aktueller Stand</h2>
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
    "Cashflow gem. BWA Essen negativ: Annuitäten und Forderungsaufbau drücken den BWA-Cashflow.",
    "EBITDA-Marge Ulmet liegt über Ziel und stabilisiert die Konzernmarge.",
    "Offene Forderungen sind konzernweit gestiegen; Fokus auf Essen und Kehl.",
    "Earn-Out Kirchberg bei 58 % Fortschritt.",
    "Gesamtleistung Konzern liegt 4,2 % über Vorjahr.",
    "Kostenquote Kehl auffällig; Fremdlaborquote prüfen."
  ];
  return (
    <Card className="h-full p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">CFO Insights | aktueller Stand</h2>
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
        Benchmarking öffnen
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
              <Mini label="Cashflow gem. BWA seit Start" value={eur(site.cashflow, true)} />
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

function Mini({ label, value, info }: { label: string; value: string; info?: React.ReactNode }) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="relative flex min-h-24 flex-col items-center justify-center rounded-md bg-slate-50 p-4 text-center">
      <div className="flex items-start justify-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        {info ? (
          <button
            type="button"
            className="absolute right-3 top-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-white text-cyan-800 shadow-sm"
            aria-label={`${label} erklären`}
            onClick={() => setInfoOpen((open) => !open)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <p className="mt-2 break-words font-bold">{value}</p>
      {infoOpen && info ? (
        <InfoDialog title={label} onClose={() => setInfoOpen(false)}>
          {info}
        </InfoDialog>
      ) : null}
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
          const rawValue = pvsTotalRevenueFromRows(siteRows.filter((row) => (rowYear(row) ?? 0) === year && (rowMonth(row) ?? 0) === month));
          const value =
            dashboardValue != null && Math.abs(dashboardValue) > 0
              ? dashboardValue
              : rawValue;
          return [`${year}-${month}`, value];
        })
      )
    );
    if (dashboardValuesForSite) {
      valuesByYear[String(latestYear)] = Array.from({ length: 12 }, (_, index) => valuesByMonth[`${latestYear}-${index + 1}`] ?? 0).reduce((sum, value) => sum + value, 0);
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

function exportRowsFromWorkbook(workbook: XLSX.WorkBook) {
  const exportSheetNames = workbook.SheetNames.filter((sheetName) => /^export_/i.test(sheetName) || /_export$/i.test(sheetName));
  const orderedExportHeaders = [
    "Standort_ID",
    "Standortname",
    "Gesellschaft",
    "Datenquelle",
    "Quellblatt",
    "Quellzeile",
    "Quellspalte",
    "Datenbereich",
    "Kategorie",
    "Unterkategorie",
    "Kennzahl",
    "Detailbezeichnung",
    "Objekt_Typ",
    "Objekt_Name",
    "Jahr",
    "Monat",
    "Datum",
    "Wert",
    "Einheit",
    "Werttyp",
    "Aktivstatus_Monat",
    "Quelle_Zelle",
    "Kommentar",
    "Konsolidierungsregel",
    "Datenebene"
  ];
  const relevantHeaders = new Set([
    ...orderedExportHeaders,
    "Standard_Datenbereich",
    "Standard_Kategorie",
    "Standard_Kennzahl",
    "Standard_Jahr",
    "Standard_Monat",
    "Standard_Werttyp"
  ]);
  const records: Record<string, unknown>[] = [];
  const seenRecords = new Set<string>();
  const pushRecord = (record: Record<string, unknown>) => {
    const signature = orderedExportHeaders.map((header) => asText(record[header])).join("||");
    if (seenRecords.has(signature)) return;
    seenRecords.add(signature);
    records.push(record);
  };
  const supplementalRecordFromRow = (row: unknown[], startColumn: number) => {
    const siteName = asText(row[startColumn + 1]);
    const dataArea = asText(row[startColumn + 7]);
    const metric = asText(row[startColumn + 10]);
    const rawValue = row[startColumn + 17];
    if (!siteName || !dataArea || !metric || rawValue == null) return null;
    const siteId = siteIdForName(siteName);
    if (!siteId) return null;
    const firstCell = normalizeMetric(row[startColumn]);
    if (firstCell && firstCell !== normalizeMetric(siteId) && firstCell !== normalizeMetric(siteName)) return null;
    return Object.fromEntries(orderedExportHeaders.map((header, index) => [header, row[startColumn + index] ?? null]));
  };

  exportSheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false
    });

    sheetRows.forEach((headerRow, headerRowIndex) => {
      const blockStarts = headerRow
        .map((cell, column) => ({ column, key: normalizeMetric(cell) }))
        .filter((entry) => entry.key === "standort_id")
        .map((entry) => entry.column);

      blockStarts.forEach((startColumn) => {
        const headerMap = new Map<string, number>();
        const maxColumn = Math.min(headerRow.length, startColumn + 40);
        for (let column = startColumn; column < maxColumn; column += 1) {
          const header = asText(headerRow[column]);
          if (relevantHeaders.has(header)) headerMap.set(header, column);
        }

        if (!headerMap.has("Standortname") || !headerMap.has("Datenbereich") || !headerMap.has("Kennzahl") || !headerMap.has("Wert")) return;

        for (let rowIndex = headerRowIndex + 1; rowIndex < sheetRows.length; rowIndex += 1) {
          const row = sheetRows[rowIndex] ?? [];
          if (normalizeMetric(row[startColumn]) === "standort_id") break;

          const record: Record<string, unknown> = {};
          headerMap.forEach((column, header) => {
            record[header] = row[column] ?? null;
          });

          if (!asText(record.Standortname) || !asText(record.Datenbereich) || !asText(record.Kennzahl)) continue;
          pushRecord(record);
        }
      });
    });

    const maxColumnCount = sheetRows.reduce((max, row) => Math.max(max, row.length), 0);
    for (let startColumn = 0; startColumn <= maxColumnCount - orderedExportHeaders.length; startColumn += 1) {
      sheetRows.forEach((row) => {
        const supplementalRecord = supplementalRecordFromRow(row ?? [], startColumn);
        if (supplementalRecord) pushRecord(supplementalRecord);
      });
    }
  });

  return records;
}

function buildImportedBehandlerHonorarRows(detailRows: ImportedBehandlerDetailRow[], report: ImportReport): ImportedPeriodValueRow[] {
  const validYears = report.jahre.filter((year) => year > 1900);
  return report.standorte.map((siteName) => {
    const siteId = siteIdForName(siteName);
    const siteRows = detailRows.filter((row) => row.siteId === siteId);
    const valuesByYear = Object.fromEntries(
      validYears.map((year) => [
        String(year),
        siteRows.reduce(
          (sum, row) =>
            sum +
            Object.entries(row.honorarByMonth).reduce((monthSum, [period, value]) => {
              const [periodYear] = period.split("-").map(Number);
              return periodYear === year ? monthSum + value : monthSum;
            }, 0),
          0
        )
      ])
    );
    const valuesByMonth = Object.fromEntries(
      validYears.flatMap((year) =>
        Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const period = `${year}-${month}`;
          const value = siteRows.reduce((sum, row) => sum + (row.honorarByMonth[period] ?? 0), 0);
          return [`${year}-${month}`, value];
        })
      )
    );
    return {
      siteId,
      siteName,
      valuesByYear,
      valuesByMonth,
      contractValue: siteRows.reduce((sum, row) => sum + Object.values(row.honorarByMonth).reduce((monthSum, value) => monthSum + value, 0), 0)
    };
  });
}

const patientMetricDefinitions: Array<{
  key: PatientMetricKey;
  label: string;
  unit: ImportedPatientMetricRow["unit"];
  aggregate: "sum" | "average";
}> = [
  { key: "treatedPatients", label: "Behandelte Patienten", unit: "count", aggregate: "sum" },
  { key: "newPatients", label: "Neupatienten", unit: "count", aggregate: "sum" },
  { key: "bookedAppointments", label: "Gebuchte Termine", unit: "count", aggregate: "sum" },
  { key: "attendedAppointments", label: "Wahrgenommene Termine", unit: "count", aggregate: "sum" },
  { key: "missedAppointments", label: "Nicht wahrgenommene Termine", unit: "count", aggregate: "sum" },
  { key: "attendanceRate", label: "Wahrnehmungsquote", unit: "percent", aggregate: "average" },
  { key: "cancellationRate", label: "Absagequote", unit: "percent", aggregate: "average" },
  { key: "patientsPerRoom", label: "Ø Patienten je Zimmer/Monat", unit: "average", aggregate: "average" }
];

const essenPatientExportSheetName = "Essen_Patienten_Export";
const patientExportMonthColumns = [
  { index: 5, month: 1 },
  { index: 6, month: 2 },
  { index: 7, month: 3 },
  { index: 8, month: 4 },
  { index: 9, month: 5 },
  { index: 10, month: 6 },
  { index: 11, month: 7 },
  { index: 12, month: 8 },
  { index: 13, month: 9 },
  { index: 14, month: 10 },
  { index: 15, month: 11 },
  { index: 16, month: 12 }
];

function cfoWorkbookSheetsForImport(sheetNames: string[]) {
  const fixedSheets = new Set([
    ...requiredImportSheets,
    "Dashboard_Management",
    "Dashboard_Performance",
    essenPatientExportSheetName
  ]);
  return sheetNames.filter((sheetName) => {
    if (fixedSheets.has(sheetName)) return true;
    if (/^export_/i.test(sheetName) || /_export$/i.test(sheetName)) return true;
    if (/^Input_Kontostand/i.test(sheetName)) return true;
    if (/personalkosten/i.test(sheetName)) return true;
    return false;
  });
}

async function readCfoWorkbookFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    return XLSX.read(await file.text(), {
      type: "string",
      cellDates: true,
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false
    });
  }

  const buffer = await file.arrayBuffer();
  const catalog = XLSX.read(buffer, { type: "array", bookSheets: true });
  const importSheets = cfoWorkbookSheetsForImport(catalog.SheetNames);
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    dense: true,
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    sheetStubs: false,
    sheets: importSheets
  });
  workbook.SheetNames = catalog.SheetNames;
  return workbook;
}

function normalizePatientExportValue(value: unknown, unit: string, metric: string) {
  const numericValue = asNumber(value);
  if (numericValue == null) return null;
  const normalizedUnit = unit.toLowerCase();
  const normalizedMetric = normalizeMetric(metric);
  if ((normalizedUnit.includes("%") || normalizedMetric.includes("quote")) && Math.abs(numericValue) <= 1) {
    return numericValue * 100;
  }
  return numericValue;
}

function buildEssenPatientExportRows(workbook: XLSX.WorkBook): Record<string, unknown>[] {
  const sheet = workbook.Sheets[essenPatientExportSheetName];
  if (!sheet) return [];

  const matrixRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });

  return matrixRows.flatMap((row) => {
    const category = asText(row[0]);
    const metric = asText(row[1]);
    const unit = asText(row[3]);
    const year = asNumber(row[4]);
    if (!category || !metric || !year || year < 1900) return [];

    return patientExportMonthColumns.flatMap(({ index, month }) => {
      const value = normalizePatientExportValue(row[index], unit, metric);
      if (value == null) return [];
      return [
        {
          Datenbereich: "Operativ",
          Standard_Datenbereich: "Operativ",
          Kategorie: category,
          Standard_Kategorie: category,
          Kennzahl: metric,
          Standard_Kennzahl: metric,
          Einheit: unit,
          Standortname: "Essen",
          Jahr: year,
          Standard_Jahr: year,
          Monat: month,
          Standard_Monat: month,
          Wert: value,
          Quelle: essenPatientExportSheetName
        }
      ];
    });
  });
}

function patientMetricDefinitionForRow(row: Record<string, unknown>) {
  const metric = rowMetric(row);
  const category = rowCategory(row);
  const domain = rowDomain(row);
  const isPatientContext =
    category.includes("patienten") ||
    category.includes("kapazitat") ||
    category.includes("terminmanagement") ||
    domain.includes("operativ");
  if (!isPatientContext) return null;
  if (metric === "behandelte_patienten_im_monat" || metric === "behandelte_patienten") {
    return patientMetricDefinitions.find((definition) => definition.key === "treatedPatients") ?? null;
  }
  if (metric === "neupatienten" || metric === "neupatieten") return patientMetricDefinitions.find((definition) => definition.key === "newPatients") ?? null;
  if (metric === "alle_termine_gebucht" || metric === "gebuchte_termine") {
    return patientMetricDefinitions.find((definition) => definition.key === "bookedAppointments") ?? null;
  }
  if (
    metric === "davon_nicht_wahrgenommen" ||
    metric === "minus_davon_nicht_wahrgenommen" ||
    metric === "nicht_wahrgenommene_termine" ||
    metric === "abgesagte_termine"
  ) {
    return patientMetricDefinitions.find((definition) => definition.key === "missedAppointments") ?? null;
  }
  if (metric === "davon_wahrgenommen" || metric === "minus_davon_wahrgenommen" || metric === "wahrgenommene_termine") {
    return patientMetricDefinitions.find((definition) => definition.key === "attendedAppointments") ?? null;
  }
  if (metric === "quote_wahrgenommen") return patientMetricDefinitions.find((definition) => definition.key === "attendanceRate") ?? null;
  if (metric === "quote_abgesagt" || metric === "terminausfallquote" || metric === "quote_nicht_wahrgenommen") {
    return patientMetricDefinitions.find((definition) => definition.key === "cancellationRate") ?? null;
  }
  if (metric.includes("behandelte_patienten_pro_zimmer")) return patientMetricDefinitions.find((definition) => definition.key === "patientsPerRoom") ?? null;
  return null;
}

function buildImportedPatientRows(rows: Record<string, unknown>[]): ImportedPatientMetricRow[] {
  const grouped = new Map<
    string,
    {
      siteId: string;
      siteName: string;
      definition: (typeof patientMetricDefinitions)[number];
      yearSum: Record<string, number>;
      yearCount: Record<string, number>;
      monthSum: Record<string, number>;
      monthCount: Record<string, number>;
      contractSum: number;
      contractCount: number;
    }
  >();

  rows.forEach((row) => {
    const definition = patientMetricDefinitionForRow(row);
    if (!definition) return;
    const siteName = asText(row.Standortname);
    const fallback = standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? standorte[0];
    const year = rowYear(row);
    const month = rowMonth(row);
    const value = asNumber(row.Wert);
    if (!siteName || value == null || !year || !month || year < 1900 || month < 1 || month > 12) return;
    if (!isOnOrAfterStart(row, fallback.start)) return;

    const siteId = siteIdForName(siteName);
    const key = `${siteId}:${definition.key}`;
    const entry =
      grouped.get(key) ??
      {
        siteId,
        siteName,
        definition,
        yearSum: {},
        yearCount: {},
        monthSum: {},
        monthCount: {},
        contractSum: 0,
        contractCount: 0
      };
    const yearKey = String(year);
    const monthKey = `${year}-${month}`;
    entry.yearSum[yearKey] = (entry.yearSum[yearKey] ?? 0) + value;
    entry.yearCount[yearKey] = (entry.yearCount[yearKey] ?? 0) + 1;
    entry.monthSum[monthKey] = (entry.monthSum[monthKey] ?? 0) + value;
    entry.monthCount[monthKey] = (entry.monthCount[monthKey] ?? 0) + 1;
    entry.contractSum += value;
    entry.contractCount += 1;
    grouped.set(key, entry);
  });

  return [...grouped.values()]
    .map((entry) => {
      const aggregateValue = (sum: number, count: number) => (entry.definition.aggregate === "average" && count ? sum / count : sum);
      return {
        siteId: entry.siteId,
        siteName: entry.siteName,
        metricKey: entry.definition.key,
        label: entry.definition.label,
        unit: entry.definition.unit,
        valuesByYear: Object.fromEntries(
          Object.entries(entry.yearSum).map(([year, value]) => [year, aggregateValue(value, entry.yearCount[year] ?? 0)])
        ),
        valuesByMonth: Object.fromEntries(
          Object.entries(entry.monthSum).map(([month, value]) => [month, aggregateValue(value, entry.monthCount[month] ?? 0)])
        ),
        contractValue: aggregateValue(entry.contractSum, entry.contractCount)
      } satisfies ImportedPatientMetricRow;
    })
    .sort((a, b) => a.siteName.localeCompare(b.siteName, "de") || a.label.localeCompare(b.label, "de"));
}

function buildImportedBehandlerDetailRows(rows: Record<string, unknown>[], exportRows: Record<string, unknown>[], report: ImportReport): ImportedBehandlerDetailRow[] {
  const siteByName = new Map(standorte.map((site) => [site.name.toLowerCase(), site]));
  const grouped = new Map<string, ImportedBehandlerDetailRow>();
  const priorityByValue = new Map<string, number>();
  const contributionByValue = new Map<string, number>();
  const ensureEntry = (siteName: string, name: string) => {
    const site = siteByName.get(siteName.toLowerCase()) ?? standorte[0];
    const canonicalName = canonicalProviderName(site.id, name);
    const key = `${site.id}::${normalizeMetric(canonicalName)}`;
    const existing = grouped.get(key);
    if (existing) return existing;
    const next: ImportedBehandlerDetailRow = {
      siteId: site.id,
      siteName,
      name: canonicalName,
      honorarByMonth: {},
      eigenlaborByMonth: {},
      totalByMonth: {}
    };
    grouped.set(key, next);
    return next;
  };
  const setValue = (target: Record<string, number>, monthKey: string, priorityKey: string, value: number, priority: number) => {
    const currentPriority = priorityByValue.get(priorityKey) ?? 0;
    if (priority < currentPriority) return;
    const previousContribution = contributionByValue.get(priorityKey) ?? 0;
    target[monthKey] = (target[monthKey] ?? 0) - previousContribution + value;
    contributionByValue.set(priorityKey, value);
    priorityByValue.set(priorityKey, priority);
  };

  [
    ...rows.map((row) => ({ row, priority: 1 })),
    ...exportRows.map((row) => ({ row, priority: 2 }))
  ].forEach(({ row, priority }) => {
    if (isExcludedPlanRow(row)) return;
    const isHonorar = isPureBehandlerHonorarRow(row);
    const isEigenlabor = isPureBehandlerEigenlaborRow(row);
    const isTotal = isPureBehandlerTotalRow(row);
    if (!isHonorar && !isEigenlabor && !isTotal) return;

    const siteName = asText(row.Standortname);
    const name = asText(row.Objekt_Name || row.Behandler || row.Behandlername);
    const fallback = siteByName.get(siteName.toLowerCase()) ?? standorte[0];
    const year = rowYear(row);
    const month = rowMonth(row);
    const value = asNumber(row.Wert) ?? 0;
    if (!siteName || !name || normalizeMetric(name) === "standort" || !year || !month || year < 1900 || month < 1 || month > 12) return;
    if (!isOnOrAfterStart(row, fallback.start)) return;

    const entry = ensureEntry(siteName, name);
    const monthKey = `${year}-${month}`;
    const valueKey = `${entry.siteId}::${normalizeMetric(entry.name)}::${normalizeMetric(name)}::${monthKey}`;
    if (isHonorar) setValue(entry.honorarByMonth, monthKey, `${valueKey}::honorar`, value, priority);
    if (isEigenlabor) setValue(entry.eigenlaborByMonth, monthKey, `${valueKey}::eigenlabor`, value, priority);
    if (isTotal) setValue(entry.totalByMonth, monthKey, `${valueKey}::total`, value, priority);
  });

  grouped.forEach((entry) => {
    const monthKeys = new Set([...Object.keys(entry.honorarByMonth), ...Object.keys(entry.eigenlaborByMonth), ...Object.keys(entry.totalByMonth)]);
    monthKeys.forEach((monthKey) => {
      const honorar = entry.honorarByMonth[monthKey] ?? 0;
      const eigenlabor = entry.eigenlaborByMonth[monthKey] ?? 0;
      const total = entry.totalByMonth[monthKey];
      if (total != null && honorar && !eigenlabor && total > honorar) entry.eigenlaborByMonth[monthKey] = total - honorar;
      if (total == null || honorar || eigenlabor) entry.totalByMonth[monthKey] = (entry.honorarByMonth[monthKey] ?? 0) + (entry.eigenlaborByMonth[monthKey] ?? 0);
    });
  });

  const totalFor = (entry: ImportedBehandlerDetailRow) => Object.values(entry.totalByMonth).reduce((sum, value) => sum + value, 0);
  return [...grouped.values()]
    .filter((entry) => Math.abs(totalFor(entry)) > 0)
    .sort((a, b) => a.siteName.localeCompare(b.siteName, "de") || totalFor(b) - totalFor(a) || a.name.localeCompare(b.name, "de"));
}

function buildImportedPersonnelCostRows(workbook: XLSX.WorkBook): ImportedPersonnelCostRow[] {
  const monthHeaders = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const siteById = new Map(standorte.map((site) => [site.id, site.name]));
  const rows: ImportedPersonnelCostRow[] = [];

  workbook.SheetNames.filter((sheetName) => /personalkosten/i.test(sheetName)).forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false
    });
    const headerIndex = rawRows.findIndex((row) => row.some((cell) => asText(cell) === "Behandler_ID") && row.some((cell) => asText(cell) === "PK-Quote"));
    if (headerIndex < 0) return;
    const header = rawRows[headerIndex] ?? [];
    const indexOf = (label: string) => header.findIndex((cell) => asText(cell) === label);
    const employeeIdIndex = indexOf("Behandler_ID");
    const nameIndex = indexOf("Behandler");
    const typeIndex = indexOf("Typ");
    const statusIndex = indexOf("Status");
    const yearIndex = indexOf("Jahr");
    const personnelCostIndex = indexOf("Personalkosten Gesamt");
    const honorarIndex = indexOf("Honorarumsatz");
    const pkQuoteIndex = indexOf("PK-Quote");
    const monthsMaintainedIndex = indexOf("Datenstatus");
    const monthIndexes = monthHeaders.map((month) => indexOf(month));
    const sheetSiteName = sheetName.replace(/_?Personalkosten_Expor?t?$/i, "");
    const siteId = siteIdForName(sheetSiteName);
    const siteName = siteById.get(siteId) ?? sheetSiteName;

    rawRows.slice(headerIndex + 1).forEach((row) => {
      const year = Number(row[yearIndex]);
      const name = asText(row[nameIndex]).trim();
      if (!year || !name) return;
      const personnelCostByMonth = Object.fromEntries(
        monthIndexes.map((columnIndex, index) => [`${year}-${index + 1}`, columnIndex >= 0 ? asNumber(row[columnIndex]) ?? 0 : 0])
      );
      const personnelCost = asNumber(row[personnelCostIndex]) ?? Object.values(personnelCostByMonth).reduce((sum, value) => sum + value, 0);
      const honorar = asNumber(row[honorarIndex]) ?? 0;
      const pkQuoteRaw = asNumber(row[pkQuoteIndex]) ?? 0;
      if (!personnelCost && !honorar && !Object.values(personnelCostByMonth).some(Boolean)) return;

      rows.push({
        siteId,
        siteName,
        employeeId: asText(row[employeeIdIndex]),
        name,
        type: asText(row[typeIndex]),
        status: asText(row[statusIndex]),
        year,
        personnelCostByMonth,
        personnelCost,
        honorar,
        pkQuote: pkQuoteRaw > 1 ? pkQuoteRaw / 100 : pkQuoteRaw,
        monthsMaintained: asText(row[monthsMaintainedIndex])
      });
    });
  });

  return rows.sort((a, b) => a.siteName.localeCompare(b.siteName, "de") || a.year - b.year || b.personnelCost - a.personnelCost);
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

function dashboardBankMovementRows(workbook: XLSX.WorkBook, latestYear: number) {
  const sheet = workbook.Sheets["Dashboard_Performance"];
  if (!sheet) return new Map<string, ImportedBankMovementRow>();

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false
  });
  const titleRowIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeMetric(cell).includes("bank_geldbewegungen_aus_input_finanzen"))
  );
  if (titleRowIndex < 0) return new Map<string, ImportedBankMovementRow>();

  const headerRowIndex = rows.findIndex((row, index) => index > titleRowIndex && row.some((cell) => normalizeMetric(cell) === "position"));
  if (headerRowIndex < 0) return new Map<string, ImportedBankMovementRow>();

  const headerRow = rows[headerRowIndex] ?? [];
  const positionColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "position");
  const totalColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "gesamt");
  const averageMonthColumn = headerRow.findIndex((cell) => normalizeMetric(cell).includes("monat"));
  const contractColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "gesamte_vertragsperiode");
  const averageContractColumn = headerRow.findIndex((cell) => normalizeMetric(cell) === "vertragsperiode");
  const monthColumns = headerRow
    .map((cell, column) => ({ column, month: monthNumberFromHeader(cell) }))
    .filter((entry): entry is { column: number; month: number } => entry.month != null);
  if (positionColumn < 0 || !monthColumns.length) return new Map<string, ImportedBankMovementRow>();

  const result = new Map<string, ImportedBankMovementRow>();
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const label = asText(row[positionColumn]);
    if (!label) break;

    const valuesByMonth: Record<string, number> = {};
    const hasValueByMonth: Record<string, boolean> = {};
    monthColumns.forEach(({ column, month }) => {
      const value = asNumber(row[column]);
      if (value != null) {
        valuesByMonth[`${latestYear}-${month}`] = value;
        hasValueByMonth[`${latestYear}-${month}`] = true;
      }
    });

    result.set(normalizeMetric(label), {
      label,
      indent: normalizeMetric(label).startsWith("davon_"),
      valuesByMonth,
      hasValueByMonth,
      total: totalColumn >= 0 ? asNumber(row[totalColumn]) ?? 0 : Object.values(valuesByMonth).reduce((sum, value) => sum + value, 0),
      averageMonth: averageMonthColumn >= 0 ? asNumber(row[averageMonthColumn]) ?? 0 : 0,
      contractValue: contractColumn >= 0 ? asNumber(row[contractColumn]) ?? 0 : 0,
      averageContract: averageContractColumn >= 0 ? asNumber(row[averageContractColumn]) ?? 0 : 0
    });
  }

  return result;
}

function buildImportedBankMovementRows(
  workbook: XLSX.WorkBook,
  rows: Record<string, unknown>[],
  latestYear: number,
  report: ImportReport
): ImportedBankMovementRow[] {
  const definitions = [
    { label: "Geldeingang Bank gesamt", keys: ["geldeingang_bank_gesamt"] },
    { label: "davon Praxisumsatz", keys: ["davon_praxisumsatz"] },
    { label: "davon sonstiges (Erstattungen etc)", keys: ["davon_sonstiges_miete_ersattungen_etc", "davon_sonstiges_miete_erstattungen_etc", "davon_sonstiges_erstattungen_etc"] },
    { label: "Geldausgang Bank inkl. Kredit", keys: ["geldausgang_bank_inkl_kredit"] },
    { label: "davon Praxisausgaben", keys: ["davon_praxisausgaben"] },
    { label: "davon Tilgung + Zins", keys: ["davon_tilgung_zins"] },
    { label: "davon Umbuchungen an Orisus ZMVZ", keys: ["davon_umbuchungen_an_orisus_zmvz"] },
    { label: "Bank-Cashflow gesamt im Monat", keys: ["cashflow_gesamt_im_monat", "bank_cashflow_gesamt_im_monat"] },
    { label: "Bank-Cashflow vor Intercompany", keys: ["cashflow_vor_intercompany", "bank_cashflow_vor_intercompany", "cashflow_vor_umbuchungen_intercompany", "bank_cashflow_vor_umbuchungen_intercompany"] },
    { label: "Kontostand Monatsende", keys: ["kontostand_monatsende"], snapshot: true }
  ];
  const dashboardRows = dashboardBankMovementRows(workbook, latestYear);
  const keyForRow = (row: Record<string, unknown>) => normalizeMetric(row.Kennzahl || row.Standard_Kennzahl || row.Detailbezeichnung);
  const matches = (key: string, candidates: string[]) => candidates.some((candidate) => key === candidate || key.startsWith(`${candidate}_`));
  const siteNames = sortSitesByContractStart(
    report.standorte.map((siteName) => standorte.find((site) => site.name.toLowerCase() === siteName.toLowerCase()) ?? { ...standorte[0], id: siteIdForName(siteName), name: siteName })
  ).map((site) => site.name);
  const kontostandEntriesBySite = new Map(siteNames.map((siteName) => [siteName, kontostandEntriesFromWorkbook(workbook, siteName)]));
  const consolidatedKontostandEntries = (() => {
    const byPeriod = new Map<string, { year: number; month: number; value: number }>();
    kontostandEntriesBySite.forEach((entries) => {
      entries.forEach(({ year, month, value }) => {
        const key = `${year}-${month}`;
        const existing = byPeriod.get(key);
        byPeriod.set(key, { year, month, value: (existing?.value ?? 0) + value });
      });
    });
    return [...byPeriod.values()].sort((a, b) => b.year - a.year || b.month - a.month);
  })();

  const buildRowsForSite = (siteName?: string): ImportedBankMovementRow[] => {
    const yearsByMonth = new Map<string, { year: number; month: number; value: number; key: string }[]>();
    definitions.forEach((definition) => yearsByMonth.set(definition.label, []));

    rows.forEach((row) => {
      if (siteName && asText(row.Standortname) !== siteName) return;
      const year = rowYear(row);
      const month = rowMonth(row);
      const value = asNumber(row.Wert);
      if (!year || year < 1900 || !month || month < 1 || month > 12 || value == null) return;
      const metricKey = keyForRow(row);
      const definition = definitions.find((entry) => matches(metricKey, entry.keys));
      if (!definition) return;
      yearsByMonth.get(definition.label)?.push({ year, month, value, key: `${year}-${month}` });
    });

    return definitions.map((definition) => {
      const sourceValues = yearsByMonth.get(definition.label) ?? [];
      const valuesByMonth: Record<string, number> = {};
      const hasValueByMonth: Record<string, boolean> = {};
      sourceValues.forEach(({ key, value }) => {
        valuesByMonth[key] = (valuesByMonth[key] ?? 0) + value;
        hasValueByMonth[key] = true;
      });

      const dashboardRow = siteName ? undefined : dashboardRows.get(normalizeMetric(definition.label));
      if (dashboardRow) {
        Object.entries(dashboardRow.valuesByMonth).forEach(([key, value]) => {
          valuesByMonth[key] = value;
          hasValueByMonth[key] = true;
        });
      }

      if (definition.snapshot) {
        const entries = siteName ? kontostandEntriesBySite.get(siteName) ?? [] : consolidatedKontostandEntries;
        entries.forEach(({ year, month, value }) => {
          const key = `${year}-${month}`;
          valuesByMonth[key] = value;
          hasValueByMonth[key] = true;
        });
      }

      const activeValues = Object.entries(valuesByMonth).filter(([key]) => Boolean(hasValueByMonth[key]));
      const latestValue = activeValues
        .sort(([a], [b]) => {
          const [yearA, monthA] = a.split("-").map(Number);
          const [yearB, monthB] = b.split("-").map(Number);
          return yearA - yearB || monthA - monthB;
        })
        .at(-1)?.[1] ?? 0;
      const contractValue = definition.snapshot ? latestValue : Object.values(valuesByMonth).reduce((sum, value) => sum + value, 0);
      const activeMonthCount = Math.max(activeValues.length, 1);

      return {
        siteId: siteName ? siteIdForName(siteName) : "konzern",
        siteName: siteName ?? "Konzern",
        label: definition.label,
        indent: normalizeMetric(definition.label).startsWith("davon_"),
        valuesByMonth,
        hasValueByMonth,
        total: dashboardRow?.total ?? 0,
        averageMonth: dashboardRow?.averageMonth ?? 0,
        contractValue: dashboardRow?.contractValue ?? contractValue,
        averageContract: dashboardRow?.averageContract ?? contractValue / activeMonthCount
      };
    });
  };

  return [...buildRowsForSite(), ...siteNames.flatMap((siteName) => buildRowsForSite(siteName))];
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

function periodOptionsFromImportedRows(rows?: Pick<ImportedPeriodValueRow, "valuesByYear" | "valuesByMonth">[]) {
  if (!rows?.length) return bwaPeriodOptions;
  const years = Array.from(
    new Set(
      rows
        .flatMap((row) => [
          ...Object.keys(row.valuesByYear).map(Number),
          ...Object.keys(row.valuesByMonth).map((key) => Number(key.split("-")[0]))
        ])
        .filter((year) => Number.isFinite(year) && year >= 1900)
    )
  ).sort((a, b) => a - b);
  const options = years.flatMap((year) => {
    const activeMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
      rows.some((row) => Math.abs(row.valuesByMonth[`${year}-${month}`] ?? 0) > 0)
    );
    const latestMonth = activeMonths.at(-1);
    const hasYearValue = rows.some((row) => Math.abs(row.valuesByYear[String(year)] ?? 0) > 0);
    return [
      ...(hasYearValue || activeMonths.length ? [`Geschäftsjahr ${year}`] : []),
      ...(latestMonth ? [`YTD ${year} bis ${bwaMonths[latestMonth - 1]}`] : []),
      ...activeMonths.map((month) => `${bwaMonths[month - 1]} ${year}`)
    ];
  });
  return [...options, "Gesamte Periode"];
}

function periodOptionsFromBehandlerDetailRows(rows?: ImportedBehandlerDetailRow[]) {
  if (!rows?.length) return bwaPeriodOptions;
  const monthKeys = rows.flatMap((row) => [
    ...Object.keys(row.honorarByMonth),
    ...Object.keys(row.eigenlaborByMonth),
    ...Object.keys(row.totalByMonth)
  ]);
  const years = Array.from(
    new Set(
      monthKeys
        .map((key) => Number(key.split("-")[0]))
        .filter((year) => Number.isFinite(year) && year >= 1900)
    )
  ).sort((a, b) => a - b);
  const options = years.flatMap((year) => {
    const activeMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
      rows.some((row) => Math.abs(row.totalByMonth[`${year}-${month}`] ?? 0) > 0)
    );
    const latestMonth = activeMonths.at(-1);
    return [
      ...(activeMonths.length ? [`Geschäftsjahr ${year}`] : []),
      ...(latestMonth ? [`YTD ${year} bis ${bwaMonths[latestMonth - 1]}`] : []),
      ...activeMonths.map((month) => `${bwaMonths[month - 1]} ${year}`)
    ];
  });
  return [...options, "Gesamte Periode"];
}

function periodOptionsFromBankMovements(rows?: ImportedBankMovementRow[]) {
  if (!rows?.length) return bwaPeriodOptions;
  const years = Array.from(
    new Set(
      rows
        .flatMap((row) => Object.keys(row.hasValueByMonth).map((key) => Number(key.split("-")[0])))
        .filter((year) => Number.isFinite(year) && year >= 1900)
    )
  ).sort((a, b) => a - b);
  const options = years.flatMap((year) => {
    const activeMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
      rows.some((row) => row.hasValueByMonth[`${year}-${month}`])
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

function defaultPeriodFromOptions(options: string[]) {
  return (
    options.find((option) => option.startsWith("YTD 2026")) ??
    options.find((option) => option.startsWith("Geschäftsjahr 2026")) ??
    options.findLast((option) => option.startsWith("YTD ")) ??
    options[0]
  );
}

function defaultBwaPeriodFor(importedData?: ImportedDashboardData | null) {
  return defaultPeriodFromOptions(bwaPeriodOptionsFor(importedData));
}

function defaultBenchmarkPeriodFor(importedData?: ImportedDashboardData | null) {
  const options = importedData ? bwaPeriodOptionsFor(importedData) : ["Gesamte Periode"];
  return options.includes("Gesamte Periode") ? "Gesamte Periode" : defaultPeriodFromOptions(options);
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
                <span className={cn("text-right font-semibold", bwaValueToneClass(row.actual, row))}>
                  {isSectionRow ? "" : row.percent ? pct(row.actual) : eur(row.actual)}
                </span>
                <span className={cn("text-right font-semibold", bwaValueToneClass(contractRow.actual, contractRow))}>
                  {isSectionRow ? "" : contractRow.percent ? pct(contractRow.actual) : eur(contractRow.actual)}
                </span>
              </div>
            );
          })}
        </div>
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
          row.emphasis && "table-total font-bold text-foreground",
          row.kind === "cashflow" && "table-cashflow",
          bwaValueToneClass(row.actual, row)
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
          row.kind === "cashflow" && "table-cashflow",
          bwaValueToneClass(quote, row)
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

function importedBwaSelectionValue(
  importedRows: ImportedBwaRow[],
  siteIds: string[],
  metricKey: string,
  selection = { year: null as number | null, months: null as number[] | null }
) {
  return importedRows
    .filter((row) => siteIds.includes(row.siteId) && row.metricKey === metricKey)
    .reduce((sum, row) => {
      if (selection.year && selection.months?.length) {
        return sum + selection.months.reduce((monthSum, month) => monthSum + (row.valuesByMonth[`${selection.year}-${month}`] ?? 0), 0);
      }
      if (selection.year) return sum + (row.valuesByYear[String(selection.year)] ?? 0);
      return sum + row.contractValue;
    }, 0);
}

function importedPracticeCostsUntilEbitda(
  importedRows: ImportedBwaRow[],
  siteIds: string[],
  selection = { year: null as number | null, months: null as number[] | null }
) {
  return (
    importedBwaSelectionValue(importedRows, siteIds, "summe_umsatz", selection) -
    importedBwaSelectionValue(importedRows, siteIds, "ebitda", selection)
  );
}

function repairImportedCashflowData(importedData: ImportedDashboardData): ImportedDashboardData {
  if (!importedData.bwaRows?.length) return importedData;
  const rowsBySiteMetric = new Map(importedData.bwaRows.map((row) => [`${row.siteId}:${row.metricKey}`, row]));
  const rowFor = (siteId: string, metricKey: string) => rowsBySiteMetric.get(`${siteId}:${metricKey}`);
  const valueFromMetric = (siteId: string, metricKey: string, periodKey?: string) => {
    const row = rowFor(siteId, metricKey);
    if (!row) return 0;
    if (!periodKey) return row.contractValue;
    if (periodKey.includes("-")) return row.valuesByMonth[periodKey] ?? 0;
    return row.valuesByYear[periodKey] ?? 0;
  };
  const cashflowValue = (siteId: string, periodKey?: string) => {
    const valueFrom = (metricKey: string) => valueFromMetric(siteId, metricKey, periodKey);
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
  const practiceCostsValue = (siteId: string, periodKey?: string) =>
    valueFromMetric(siteId, "summe_umsatz", periodKey) - valueFromMetric(siteId, "ebitda", periodKey);

  const bwaRows = importedData.bwaRows.map((row) => {
    if (row.metricKey !== "cashflow_gesamt" && row.metricKey !== "operative_prozesskosten_bis_ebitda") return row;
    const repairedValue = row.metricKey === "cashflow_gesamt" ? cashflowValue : practiceCostsValue;
    const valuesByYear = Object.fromEntries(Object.keys(row.valuesByYear).map((periodKey) => [periodKey, repairedValue(row.siteId, periodKey)]));
    const valuesByMonth = Object.fromEntries(Object.keys(row.valuesByMonth).map((periodKey) => [periodKey, repairedValue(row.siteId, periodKey)]));
    return {
      ...row,
      valuesByYear,
      valuesByMonth,
      contractValue: repairedValue(row.siteId)
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

function bwaChartDataForPeriod(importedData: ImportedDashboardData | null | undefined, fallbackMonthlyData: typeof monthly, period: string) {
  if (!importedData?.bwaRows?.length) return fallbackMonthlyData;
  const siteIds = new Set(importedData.sites.map((site) => site.id));
  const rowsForMetric = (metricKey: string) => importedData.bwaRows.filter((row) => row.metricKey === metricKey && siteIds.has(row.siteId));
  const valueFor = (metricKey: string, periodKey: string, yearOnly = false) => {
    return rowsForMetric(metricKey).reduce((sum, row) => sum + (yearOnly ? row.valuesByYear[periodKey] ?? 0 : row.valuesByMonth[periodKey] ?? 0), 0);
  };
  const selection = selectedBwaPeriod(period);

  if (!selection.year) {
    return importedData.report.jahre
      .filter((year) => year >= 1900)
      .map((year) => ({
        month: String(year),
        leistung: valueFor("summe_umsatz", String(year), true),
        ebitda: valueFor("ebitda", String(year), true),
        zielEbitdaKaufvertrag: valueFor("ziel_ebitda_kaufvertrag", String(year), true),
        marge: 0,
        cashflow: valueFor("cashflow_gesamt", String(year), true)
      }))
      .filter((entry) => entry.leistung || entry.ebitda || entry.zielEbitdaKaufvertrag || entry.cashflow);
  }

  const months =
    selection.months?.length
      ? selection.months
      : Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
          importedData.bwaRows.some((row) => row.hasDataByMonth[`${selection.year}-${month}`])
        );

  return months.map((month) => {
    const periodKey = `${selection.year}-${month}`;
    const leistung = valueFor("summe_umsatz", periodKey);
    const ebitda = valueFor("ebitda", periodKey);
    return {
      month: bwaMonths[month - 1] ?? String(month),
      leistung,
      ebitda,
      zielEbitdaKaufvertrag: valueFor("ziel_ebitda_kaufvertrag", periodKey),
      marge: leistung ? (ebitda / leistung) * 100 : 0,
      cashflow: valueFor("cashflow_gesamt", periodKey)
    };
  });
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
  const zielEbitdaKaufvertrag = Math.round(importedBwaMetricValue(importedData.bwaRows, siteId, "ziel_ebitda_kaufvertrag", period));
  const zielEbitdaUebernahme = Math.round(importedBwaMetricValue(importedData.bwaRows, siteId, "ziel_ebitda_uebernahme", period));

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
    status,
    darlehen: {
      ...site.darlehen,
      zielEbitda: zielEbitdaKaufvertrag || site.darlehen.zielEbitda,
      zielEbitdaKaufvertrag: zielEbitdaKaufvertrag || site.darlehen.zielEbitdaKaufvertrag,
      zielEbitdaUebernahme: zielEbitdaUebernahme || site.darlehen.zielEbitdaUebernahme,
      istEbitda: ebitda
    }
  };
}

function buildImportedBwaLines(importedRows: ImportedBwaRow[], period: string, siteId?: string): BwaLine[] {
  const selection = selectedBwaPeriod(period);
  const siteIds = siteId ? [siteId] : Array.from(new Set(importedRows.map((row) => row.siteId))).filter((id) => id !== "konzern");
  return bwaMetricDefinitions.map((definition) => {
    const sourceRows = importedRows.filter((row) => row.metricKey === definition.key && (!siteId || row.siteId === siteId));
    const isPercent = definitionFlag(definition, "percent");
    const isEmphasis = definitionFlag(definition, "emphasis");
    const quoteActual = isPercent
      ? calculateImportedQuote(importedRows, siteIds, definition.key, selection)
      : 0;
    const actual =
      definition.key === "operative_prozesskosten_bis_ebitda"
        ? importedPracticeCostsUntilEbitda(importedRows, siteIds, selection)
        : sourceRows.reduce((sum, row) => {
            if (definition.key.startsWith("section_")) return 0;
            if (selection.year && selection.months?.length) {
              return sum + selection.months.reduce((monthSum, month) => monthSum + (row.valuesByMonth[`${selection.year}-${month}`] ?? 0), 0);
            }
            if (selection.year) return sum + (row.valuesByYear[String(selection.year)] ?? 0);
            return sum + (isPercent ? 0 : row.contractValue);
          }, 0);
    return {
      metricKey: definition.key,
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
  const praxiskosten = Math.round(gesamtleistung - ebitda);
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
    row("Summe sonstige Kosten", -weitereKosten, { indent: true }),
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
    row("6. Cashflow-Adjustments gem. BWA", 0, { emphasis: true, kind: "cashflow" }),
    row("+ Abschreibungen", Math.round(gesamtleistung * 0.17), { kind: "cashflow", indent: true }),
    row("Investitionsausgaben", -Math.round(gesamtleistung * 0.035), { kind: "cashflow", indent: true }),
    row("Tilgung", -Math.round(sites.reduce((sum, site) => sum + site.darlehen.tilgung, 0) * factor), { kind: "cashflow", indent: true }),
    row("Umbuchung ZMVZ", umbuchen, { kind: "cashflow", indent: true }),
    row("Sonstige Rückstellungen / Bestandsminderungen", Math.round(gesamtleistung * 0.008), { kind: "cashflow", indent: true }),
    row("CashFlow gem. BWA", cashflow, { emphasis: true, kind: "cashflow" }),
    row("CashFlow-Quote gem. BWA", gesamtleistung ? (cashflow / gesamtleistung) * 100 : 0, { percent: true, kind: "cashflow" })
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
          <h2 className="font-bold">Monatliche BWA bis Cashflow gem. BWA {site.name} | Geschäftsjahr {year}</h2>
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
  const praxiskosten = site.gesamtleistung - site.ebitda;

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
    row("Summe sonstige Kosten", -weitere, { indent: true }),
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
    row("6. Cashflow-Adjustments gem. BWA", 0, { section: true, kind: "cashflow" }),
    row("+ Abschreibungen", site.gesamtleistung * 0.17, { indent: true, kind: "cashflow" }),
    row("Investitionsausgaben", -site.gesamtleistung * 0.035, { indent: true, kind: "cashflow" }),
    row("Tilgung", -site.darlehen.tilgung, { indent: true, kind: "cashflow" }),
    row("Umbuchung ZMVZ", -site.gesamtleistung * 0.025, { indent: true, kind: "cashflow" }),
    row("Sonstige Rückstellungen / Bestandsminderungen", site.gesamtleistung * 0.008, { indent: true, kind: "cashflow" }),
    row("CashFlow gem. BWA", site.cashflow, { emphasis: true, kind: "cashflow" }),
    row("CashFlow-Quote gem. BWA", site.gesamtleistung ? (site.cashflow / site.gesamtleistung) * 100 : 0, { percent: true, kind: "cashflow" })
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
      metricKey: definition.key,
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

function hasImportedMetricPeriodValue(importedRows: ImportedBwaRow[], siteId: string, metricKey: string | undefined, period: string) {
  if (!metricKey) return false;
  const row = importedRows.find((candidate) => candidate.siteId === siteId && candidate.metricKey === metricKey);
  if (!row) return false;
  const selection = selectedBwaPeriod(period);
  if (selection.year && selection.months?.length) {
    return selection.months.some((month) => row.hasValueByMonth[`${selection.year}-${month}`]);
  }
  if (selection.year) {
    return Array.from({ length: 12 }, (_, index) => index + 1).some((month) => row.hasValueByMonth[`${selection.year}-${month}`]);
  }
  return row.hasDataByYear ? Object.values(row.hasDataByYear).some(Boolean) : Math.abs(row.contractValue) > 0;
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

function isBwaDeductionRow(rowOrLabel: string | { label: string; metricKey?: string; percent?: boolean; section?: boolean }) {
  if (typeof rowOrLabel !== "string" && (rowOrLabel.percent || rowOrLabel.section)) return false;
  const metricKey = typeof rowOrLabel === "string" ? "" : normalizeMetric(rowOrLabel.metricKey);
  const labelKey = normalizeMetric(typeof rowOrLabel === "string" ? rowOrLabel : rowOrLabel.label);
  return Boolean((metricKey && bwaDeductionMetricKeys.has(metricKey)) || bwaDeductionLabelKeys.has(labelKey));
}

function bwaValueToneClass(value: number | null | undefined, rowOrLabel: string | { label: string; metricKey?: string; percent?: boolean; section?: boolean }) {
  if (value == null || value === 0) return "";
  if (isBwaDeductionRow(rowOrLabel)) return "text-red-700";
  if (value < 0) return "text-red-700";
  const label = typeof rowOrLabel === "string" ? rowOrLabel : rowOrLabel.label;
  return isVarianceRow(label) ? "text-emerald-700" : "";
}

function bwaTableNumberClass(
  row: { label: string; metricKey?: string; percent?: boolean; emphasis?: boolean; section?: boolean; kind?: "cashflow" },
  value: number | null | undefined,
  options: { compact?: boolean; muted?: boolean; bold?: boolean } = {}
) {
  const tone = bwaValueToneClass(value, row);
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
  const rules = useKpiRules();
  const availablePeriods = bwaPeriodOptionsFor(importedData);
  const [period, setPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  useEffect(() => {
    if (!availablePeriods.includes(period)) {
      setPeriod(defaultBwaPeriodFor(importedData));
    }
  }, [availablePeriods, importedData, period]);
  const filteredSite = filteredSiteForPeriod(site, importedData, period);
  const filteredSiteStatus = statusForSiteByRules(filteredSite, rules);
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
        <KpiCard label="Gesamtleistung" value={filteredSite.gesamtleistung} delta={periodLabel} icon={TrendingUp} status={filteredSiteStatus} />
        <KpiCard label="PVS-Umsatz" value={filteredSite.pvsUmsatz} delta={periodLabel} icon={BadgeEuro} status={filteredSiteStatus} />
        <KpiCard label="EBITDA" value={filteredSite.ebitda} delta={`${pct(filteredSite.ebitdaMarge)} Marge`} icon={Banknote} status={statusByRule(filteredSite.ebitdaMarge, rules.ebitda_marge)} />
        <KpiCard label="Cashflow gem. BWA" value={filteredSite.cashflow} delta="gem. BWA nach vorläufigem Ergebnis" icon={Wallet} status={statusByRule(filteredSite.cashflow, rules.cashflow_bwa)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <CostRatios site={filteredSite} periodLabel={periodLabel} />
        <ChartCard title={`Entwicklung über Zeit | ${periodLabel}`} icon={TrendingUp}>
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
      <BwaStatement title={`BWA bis Cashflow gem. BWA | ${site.name}`} siteId={site.id} importedData={importedData} />
      <SiteMonthlyBwa site={site} importedData={importedData} />
      <SitePvsMonthlyRevenue site={site} importedData={importedData} monthlyData={monthlyData} />
      <SiteBehandlerMonthlyRevenue site={site} importedData={importedData} />
      <SiteBankMovementDetail site={site} importedData={importedData} />
      <SiteBehandlerPersonnelCosts site={site} importedData={importedData} />
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
  const monthlyPeriods = bwaPeriodOptionsFor(importedData);
  const [monthlyPeriod, setMonthlyPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  useEffect(() => {
    if (!monthlyPeriods.includes(monthlyPeriod)) {
      setMonthlyPeriod(defaultBwaPeriodFor(importedData));
    }
  }, [importedData, monthlyPeriod, monthlyPeriods]);
  const filteredMonthlyData = bwaChartDataForPeriod(importedData, monthlyData, monthlyPeriod);
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
        <div className="table-head p-3 text-lg font-bold text-white">Standort-Performance | BWA-Kennzahlen je Standort | seit Vertragsstart</div>
        <div className="border-b border-border bg-slate-50 p-3 text-sm italic text-muted-foreground">
          Auswertung: bestätigter Import | Standorte seit jeweiligem Vertragsstart | Quelle: {importedData?.fileName ?? "Kein Upload bestätigt"}
        </div>
        <div className="grid gap-px table-grid-bg md:grid-cols-3 xl:grid-cols-6">
          <KennzahlTile label="Gesamtleistung | Vertragsperioden" value={eur(totalPerformance, true)} />
          <KennzahlTile label="EBITDA | Vertragsperioden" value={eur(totalEbitda, true)} />
          <KennzahlTile label="EBITDA-Marge | Vertragsperioden" value={pct((totalEbitda / totalPerformance) * 100)} />
          <KennzahlTile label="Cashflow gem. BWA | Vertragsperioden" value={eur(totalCashflow, true)} />
          <KennzahlTile label="Ø Zielerreichung | Übernahme" value={pct(averageTargetAchievement)} />
          <KennzahlTile label="Schwächster Standort" value={weakest ? `${weakest.site.name} (${pct(weakest.achievement)})` : "n/a"} />
        </div>
      </Card>

      <KennzahlenStandortTable targetBySite={targetBySite} sites={activeSites} monthlyData={monthlyData} />
      <MonthlyEbitdaTable
        targetBySite={targetBySite}
        sites={activeSites}
        monthlyData={filteredMonthlyData}
        importedData={importedData}
        periodLabel={monthlyPeriod}
        availablePeriods={monthlyPeriods}
        period={monthlyPeriod}
        setPeriod={setMonthlyPeriod}
      />
    </section>
  );
}

function KennzahlTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center bg-white p-5 text-center">
      <p className="text-xs font-bold uppercase text-foreground">{label}</p>
      <p className="mt-4 text-2xl font-bold text-primary">{value}</p>
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
                "Cashflow gem. BWA",
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

function MonthlyEbitdaTable({
  targetBySite,
  sites = standorte,
  monthlyData = monthly,
  importedData,
  periodLabel,
  availablePeriods,
  period,
  setPeriod
}: {
  targetBySite: Record<string, number>;
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
  periodLabel: string;
  availablePeriods?: string[];
  period?: string;
  setPeriod?: (period: string) => void;
}) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  const selection = selectedBwaPeriod(periodLabel);
  const periodYear = selection.year;
  const targetTotal = activeSites.reduce((sum, site) => sum + (targetBySite[site.id] ?? 0), 0);
  const importedMetricRow = (siteId: string) => importedData?.bwaRows.find((row) => row.siteId === siteId && row.metricKey === "ebitda");
  const rowSource = importedData?.bwaRows?.length
    ? !selection.year
      ? importedData.report.jahre
          .filter((year) => year >= 1900)
          .map((year) => ({
            label: String(year),
            siteValues: Object.fromEntries(
              activeSites.map((site) => [site.id, Math.round(importedMetricRow(site.id)?.valuesByYear[String(year)] ?? 0)])
            ) as Record<string, number>
          }))
          .filter((row) => Object.values(row.siteValues).some((value) => value !== 0))
      : (
          selection.months?.length
            ? selection.months
            : Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
                activeSites.some((site) => importedMetricRow(site.id)?.hasDataByMonth[`${selection.year}-${month}`])
              )
        ).map((month) => ({
          label: `${bwaMonths[month - 1] ?? String(month)} ${String(selection.year).slice(-2)}`,
          siteValues: Object.fromEntries(
            activeSites.map((site) => [site.id, Math.round(importedMetricRow(site.id)?.valuesByMonth[`${selection.year}-${month}`] ?? 0)])
          ) as Record<string, number>
        }))
    : monthlyData.map((month) => {
        const totalPositiveEbitda = activeSites.reduce((sum, site) => sum + Math.max(0, site.ebitda), 0) || 1;
        return {
          label: periodYear ? `${month.month} ${String(periodYear).slice(-2)}` : month.month,
          siteValues: Object.fromEntries(
            activeSites.map((site) => [site.id, Math.round(month.ebitda * (Math.max(0, site.ebitda) / totalPositiveEbitda))])
          ) as Record<string, number>
        };
      });

  const rows = rowSource.map((source, monthIndex) => {
    const siteValues = source.siteValues;
    const totalValue = Object.values(siteValues).reduce((sum, value) => sum + value, 0);
    const targetTakeover = Math.round(targetTotal * ((monthIndex + 1) / Math.max(rowSource.length, 1)));
    const targetBank = Math.round(targetTakeover * 0.885);
    return {
      month: source.label,
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
      <div className="flex flex-col gap-3 table-head p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="font-bold">MONATLICHE EBITDA-ÜBERSICHT JE STANDORT | {periodLabel}</div>
        {availablePeriods?.length && period && setPeriod ? (
          <Select className="w-full sm:w-64" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {availablePeriods.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        ) : null}
      </div>
      <div className="border-b border-border bg-slate-50 p-2 text-sm italic text-muted-foreground">
        Auswertung: {periodLabel} | Ist-EBITDA je Monat und Standort | Zielabweichung kumuliert gegen Übernahme und Bank/KV
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

function ResponsiveTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table border-separate border-spacing-0 text-sm">{children}</table>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="table-head border-b border-r border-border p-3 text-right text-xs uppercase text-white">{children}</th>;
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

function patientMetricRow(rows: ImportedPatientMetricRow[] | undefined, siteId: string, metricKey: PatientMetricKey) {
  return rows?.find((row) => row.siteId === siteId && row.metricKey === metricKey);
}

function patientMetricPeriodValue(rows: ImportedPatientMetricRow[] | undefined, siteId: string, metricKey: PatientMetricKey, period: string) {
  return importedPeriodValue(patientMetricRow(rows, siteId, metricKey), period);
}

function patientMetricPeriodOptionalValue(rows: ImportedPatientMetricRow[] | undefined, siteId: string, metricKey: PatientMetricKey, period: string) {
  const row = patientMetricRow(rows, siteId, metricKey);
  if (!row) return null;
  const selection = selectedBwaPeriod(period);
  if (selection.year && selection.months?.length) {
    const values = selection.months
      .map((month) => `${selection.year}-${month}`)
      .filter((key) => Object.prototype.hasOwnProperty.call(row.valuesByMonth, key))
      .map((key) => row.valuesByMonth[key])
      .filter((value) => Number.isFinite(value));
    if (!values.length) return null;
    if (row.unit === "percent" || row.unit === "average") {
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    return values.reduce((sum, value) => sum + value, 0);
  }
  if (selection.year) {
    const key = String(selection.year);
    if (!Object.prototype.hasOwnProperty.call(row.valuesByYear, key)) return null;
    const value = row.valuesByYear[key];
    return Number.isFinite(value) ? value : null;
  }
  return Number.isFinite(row.contractValue) ? row.contractValue : null;
}

function formatPatientValue(value: number, unit: ImportedPatientMetricRow["unit"]) {
  if (!Number.isFinite(value)) return "–";
  if (unit === "percent") {
    const percentValue = Math.abs(value) <= 1.5 ? value * 100 : value;
    return `${percentValue.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  }
  if (unit === "average") return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return Math.round(value).toLocaleString("de-DE");
}

function normalizedPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) <= 1.5 ? value * 100 : value;
}

function PatientKpiCard({
  label,
  value,
  subline,
  icon: Icon,
  tone = "green"
}: {
  label: string;
  value: string;
  subline: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Status;
}) {
  return (
    <Card className="flex min-h-[10rem] flex-col items-center justify-center p-5 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-md table-total text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <div
        className={cn(
          "mt-3 flex items-center justify-center gap-1 text-sm font-semibold",
          tone === "red" ? "text-red-700" : tone === "yellow" ? "text-amber-700" : "text-emerald-700"
        )}
      >
        <ArrowUpRight className="h-4 w-4" />
        <span>{subline}</span>
      </div>
    </Card>
  );
}

function PatientenAuswertungen({ importedData, sites = standorte }: { importedData: ImportedDashboardData; sites?: DashboardSite[] }) {
  const patientRows = importedData.patientRows ?? [];
  const availablePeriods = periodOptionsFromImportedRows(patientRows);
  const [period, setPeriod] = useState(() => defaultPeriodFromOptions(availablePeriods));

  useEffect(() => {
    if (!availablePeriods.includes(period)) {
      setPeriod(defaultPeriodFromOptions(availablePeriods));
    }
  }, [availablePeriods, period]);

  const sortedSites = sortSitesByContractStart(sites);
  const selected = selectedBwaPeriod(period);
  const yearForMonths =
    selected.year ??
    Math.max(
      ...patientRows.flatMap((row) => Object.keys(row.valuesByMonth).map((key) => Number(key.split("-")[0]))).filter((year) => Number.isFinite(year)),
      new Date().getFullYear()
    );
  const visibleMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
    patientRows.some((row) => Math.abs(row.valuesByMonth[`${yearForMonths}-${month}`] ?? 0) > 0)
  );
  const monthsForTable = visibleMonths.length ? visibleMonths : Array.from({ length: 12 }, (_, index) => index + 1);

  const siteSummaries = sortedSites.map((site) => {
    const treated = patientMetricPeriodValue(patientRows, site.id, "treatedPatients", period);
    const newPatients = patientMetricPeriodValue(patientRows, site.id, "newPatients", period);
    const booked = patientMetricPeriodValue(patientRows, site.id, "bookedAppointments", period);
    const attended = patientMetricPeriodValue(patientRows, site.id, "attendedAppointments", period);
    const missed = patientMetricPeriodValue(patientRows, site.id, "missedAppointments", period);
    const attendanceRateSource = patientMetricPeriodValue(patientRows, site.id, "attendanceRate", period);
    const cancellationRateSource = patientMetricPeriodValue(patientRows, site.id, "cancellationRate", period);
    const rooms = staticTreatmentRoomsForSite(site.id);
    const attendanceRate = booked ? attended / booked : attendanceRateSource;
    const cancellationRate = booked ? missed / booked : cancellationRateSource;
    const patientsPerRoom = rooms ? treated / rooms : patientMetricPeriodValue(patientRows, site.id, "patientsPerRoom", period);
    const hasData = patientRows.some(
      (row) => row.siteId === site.id && (Math.abs(importedPeriodValue(row, period)) > 0 || Object.values(row.valuesByMonth).some((value) => Math.abs(value) > 0))
    );
    return { site, treated, newPatients, booked, attended, missed, attendanceRate, cancellationRate, rooms, patientsPerRoom, hasData };
  });

  const totals = siteSummaries.reduce(
    (sum, row) => ({
      treated: sum.treated + row.treated,
      newPatients: sum.newPatients + row.newPatients,
      booked: sum.booked + row.booked,
      attended: sum.attended + row.attended,
      missed: sum.missed + row.missed,
      rooms: sum.rooms + row.rooms
    }),
    { treated: 0, newPatients: 0, booked: 0, attended: 0, missed: 0, rooms: 0 }
  );
  const totalAttendanceRate = totals.booked ? totals.attended / totals.booked : 0;
  const totalCancellationRate = totals.booked ? totals.missed / totals.booked : 0;
  const totalPatientsPerRoom = totals.rooms ? totals.treated / totals.rooms : 0;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Patienten | Auswertungen"
        text="Patienten-, Termin- und Kapazitätskennzahlen aus dem bestätigten CFO-Import. Essen wird aus dem Blatt Essen_Patienten_Export ergänzt, sobald die Datei diese Daten enthält."
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Patientensteuerung | {period}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Auswertung nach Standort: behandelte Patienten, Neupatienten, Terminwahrnehmung und Kapazität je Behandlungszimmer.
            </p>
          </div>
          <Select className="w-full sm:w-64" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {availablePeriods.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PatientKpiCard label={`Behandelte Patienten | ${period}`} value={formatPatientValue(totals.treated, "count")} subline="konsolidiert" icon={Users} />
        <PatientKpiCard label={`Neupatienten | ${period}`} value={formatPatientValue(totals.newPatients, "count")} subline="aus Exportdaten" icon={UserRoundPlus} />
        <PatientKpiCard
          label={`Wahrnehmungsquote | ${period}`}
          value={formatPatientValue(totalAttendanceRate, "percent")}
          subline="wahrgenommen / gebucht"
          icon={CheckCircle2}
          tone={totalAttendanceRate >= 0.9 ? "green" : totalAttendanceRate >= 0.8 ? "yellow" : "red"}
        />
        <PatientKpiCard
          label={`Patienten je Zimmer | ${period}`}
          value={formatPatientValue(totalPatientsPerRoom, "average")}
          subline="Basis statische Zimmer"
          icon={Building2}
        />
      </div>

      <Card className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold">Standortvergleich Patienten & Termine | {period}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Essen wird automatisch aus Essen_Patienten_Export gelesen, wenn das Blatt im bestätigten CFO-Import enthalten ist.
          </p>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <th className="table-head border-b border-r border-border p-3 text-left text-xs uppercase text-white">Standort</th>
              <TableHead>Behandelte Patienten</TableHead>
              <TableHead>Neupatienten</TableHead>
              <TableHead>Gebuchte Termine</TableHead>
              <TableHead>Wahrgenommen</TableHead>
              <TableHead>Nicht wahrgenommen</TableHead>
              <TableHead>Wahrnehmungsquote</TableHead>
              <TableHead>Absagequote</TableHead>
              <TableHead>Zimmer</TableHead>
              <TableHead>Patienten je Zimmer</TableHead>
            </tr>
          </thead>
          <tbody>
            {siteSummaries.map((row) =>
              row.hasData ? (
                <tr key={row.site.id}>
                  <td className="border-b border-r border-border bg-white p-3 font-bold">{row.site.name}</td>
                  <TableCell strong>{formatPatientValue(row.treated, "count")}</TableCell>
                  <TableCell>{formatPatientValue(row.newPatients, "count")}</TableCell>
                  <TableCell>{formatPatientValue(row.booked, "count")}</TableCell>
                  <TableCell>{formatPatientValue(row.attended, "count")}</TableCell>
                  <TableCell tone={row.missed > 0 ? "red" : undefined}>{formatPatientValue(row.missed, "count")}</TableCell>
                  <TableCell tone={row.attendanceRate >= 0.9 ? "green" : row.attendanceRate < 0.8 ? "red" : undefined}>{formatPatientValue(row.attendanceRate, "percent")}</TableCell>
                  <TableCell tone={row.cancellationRate > 0.12 ? "red" : undefined}>{formatPatientValue(row.cancellationRate, "percent")}</TableCell>
                  <TableCell>{row.rooms}</TableCell>
                  <TableCell strong>{formatPatientValue(row.patientsPerRoom, "average")}</TableCell>
                </tr>
              ) : (
                <tr key={row.site.id}>
                  <td className="border-b border-r border-border bg-white p-3 font-bold">{row.site.name}</td>
                  <td className="table-total border-b border-r border-border p-3 text-left text-sm font-semibold text-muted-foreground" colSpan={9}>
                    Patientendaten folgen im Export. Zimmerbasis ist vorbereitet: {row.rooms} Behandlungszimmer.
                  </td>
                </tr>
              )
            )}
            <tr className="summary-row">
              <td className="border-b border-r border-border p-3 font-bold">Gesamt</td>
              <TableCell strong summary>{formatPatientValue(totals.treated, "count")}</TableCell>
              <TableCell strong summary>{formatPatientValue(totals.newPatients, "count")}</TableCell>
              <TableCell strong summary>{formatPatientValue(totals.booked, "count")}</TableCell>
              <TableCell strong summary>{formatPatientValue(totals.attended, "count")}</TableCell>
              <TableCell strong summary tone={totals.missed > 0 ? "red" : undefined}>{formatPatientValue(totals.missed, "count")}</TableCell>
              <TableCell strong summary>{formatPatientValue(totalAttendanceRate, "percent")}</TableCell>
              <TableCell strong summary tone={totalCancellationRate > 0.12 ? "red" : undefined}>{formatPatientValue(totalCancellationRate, "percent")}</TableCell>
              <TableCell strong summary>{totals.rooms}</TableCell>
              <TableCell strong summary>{formatPatientValue(totalPatientsPerRoom, "average")}</TableCell>
            </tr>
          </tbody>
        </ResponsiveTable>
      </Card>

      <Card className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold">Monatliche Patientenentwicklung | {yearForMonths}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Behandelte Patienten je Standort. Leere Monate bleiben leer, Essen wird aus Essen_Patienten_Export ergänzt.</p>
        </div>
        <ResponsiveTable>
          <thead>
            <tr>
              <th className="table-head border-b border-r border-border p-3 text-left text-xs uppercase text-white">Standort</th>
              {monthsForTable.map((month) => (
                <TableHead key={month}>{bwaMonths[month - 1]}</TableHead>
              ))}
              <TableHead>Gesamt</TableHead>
            </tr>
          </thead>
          <tbody>
            {siteSummaries.map(({ site, hasData }) => {
              const treatedRow = patientMetricRow(patientRows, site.id, "treatedPatients");
              const total = monthsForTable.reduce((sum, month) => sum + (treatedRow?.valuesByMonth[`${yearForMonths}-${month}`] ?? 0), 0);
              return (
                <tr key={site.id}>
                  <td className="border-b border-r border-border bg-white p-3 font-bold">{site.name}</td>
                  {monthsForTable.map((month) => {
                    const value = treatedRow?.valuesByMonth[`${yearForMonths}-${month}`];
                    return <TableCell key={month}>{value == null && !hasData ? "–" : value == null ? "" : formatPatientValue(value, "count")}</TableCell>;
                  })}
                  <TableCell strong summary>{hasData ? formatPatientValue(total, "count") : "Daten folgen"}</TableCell>
                </tr>
              );
            })}
          </tbody>
        </ResponsiveTable>
      </Card>
    </div>
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
  const bwaPeriods = bwaPeriodOptionsFor(importedData);
  const honorarPeriods = periodOptionsFromImportedRows(importedData?.behandlerTotalRows);
  const pvsPeriods = periodOptionsFromImportedRows(importedData?.pvsRevenueRows);
  const bankPeriods = periodOptionsFromBankMovements(importedData?.bankMovementRows);
  const performancePeriod = defaultPeriodFromOptions(bwaPeriods);
  const [operationalPeriod, setOperationalPeriod] = useState(() => defaultPeriodFromOptions(bwaPeriods));
  const [honorarPeriod, setHonorarPeriod] = useState(() => defaultPeriodFromOptions(honorarPeriods));
  const [honorarMonthlyPeriod, setHonorarMonthlyPeriod] = useState(() => defaultPeriodFromOptions(honorarPeriods));
  const [pvsPeriod, setPvsPeriod] = useState(() => defaultPeriodFromOptions(pvsPeriods));
  const [pvsMonthlyPeriod, setPvsMonthlyPeriod] = useState(() => defaultPeriodFromOptions(pvsPeriods));
  const [bankPeriod, setBankPeriod] = useState(() => defaultPeriodFromOptions(bankPeriods));
  useEffect(() => {
    if (!bwaPeriods.includes(operationalPeriod)) {
      setOperationalPeriod(defaultPeriodFromOptions(bwaPeriods));
    }
    if (!honorarPeriods.includes(honorarPeriod)) {
      setHonorarPeriod(defaultPeriodFromOptions(honorarPeriods));
    }
    if (!honorarPeriods.includes(honorarMonthlyPeriod)) {
      setHonorarMonthlyPeriod(defaultPeriodFromOptions(honorarPeriods));
    }
    if (!pvsPeriods.includes(pvsPeriod)) {
      setPvsPeriod(defaultPeriodFromOptions(pvsPeriods));
    }
    if (!pvsPeriods.includes(pvsMonthlyPeriod)) {
      setPvsMonthlyPeriod(defaultPeriodFromOptions(pvsPeriods));
    }
    if (!bankPeriods.includes(bankPeriod)) {
      setBankPeriod(defaultPeriodFromOptions(bankPeriods));
    }
  }, [bankPeriod, bankPeriods, bwaPeriods, honorarMonthlyPeriod, honorarPeriod, honorarPeriods, operationalPeriod, pvsMonthlyPeriod, pvsPeriod, pvsPeriods]);
  const operationalSites = importedData ? sites.map((site) => filteredSiteForPeriod(site, importedData, operationalPeriod)) : sites;
  return (
    <section className="space-y-5">
      <PageTitle
        title="Orisus Performance"
        text="Operative Performance der Gruppe: Umsatzentwicklung, Standortleistung, PVS, Forderungen und Cashflow gem. BWA."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Gesamtleistung" value={eur(metrics.gesamtleistung)} />
        <Mini label="PVS-Umsatz" value={eur(totalForSites(sites, "pvsUmsatz"))} />
        <Mini label="EBITDA-Marge" value={pct(metrics.ebitdaMarge)} />
        <Mini label="Cashflow gem. BWA" value={eur(metrics.cashflow)} />
        <Mini label="Offene Forderungen" value={eur(metrics.forderungen)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title={`Operative Entwicklung | ${performancePeriod}`} icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" name="EBITDA" stroke="#0369a1" strokeWidth={3} />
              <Line dataKey="cashflow" name="Cashflow gem. BWA" stroke="#64748b" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Forderungen nach Standort | aktueller Stand" icon={FileBarChart}>
          <ReceivablesChart sites={sites} />
        </ChartCard>
      </div>
      <OperationalPerformanceTable
        sites={operationalSites}
        period={operationalPeriod}
        setPeriod={setOperationalPeriod}
        availablePeriods={bwaPeriods}
      />
      <PerformanceRevenueBlock
        title="Behandlerumsatz inkl. Eigenlabor je Standort"
        period={honorarPeriod}
        setPeriod={setHonorarPeriod}
        availablePeriods={honorarPeriods}
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
        period={honorarMonthlyPeriod}
        setPeriod={setHonorarMonthlyPeriod}
        availablePeriods={honorarPeriods}
      />
      <PerformanceRevenueBlock
        title="PVS-Gesamtumsatz je Standort"
        period={pvsPeriod}
        setPeriod={setPvsPeriod}
        availablePeriods={pvsPeriods}
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
        period={pvsMonthlyPeriod}
        setPeriod={setPvsMonthlyPeriod}
        availablePeriods={pvsPeriods}
      />
      <BankMovementsTable
        sites={sites}
        monthlyData={monthlyData}
        importedData={importedData}
        period={bankPeriod}
        setPeriod={setBankPeriod}
        availablePeriods={bankPeriods}
      />
    </section>
  );
}

function OperationalPerformanceTable({
  sites = standorte,
  period,
  setPeriod,
  availablePeriods
}: {
  sites?: DashboardSite[];
  period: string;
  setPeriod: (period: string) => void;
  availablePeriods: string[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-bold">Operative Standort-Performance | {performancePeriodLabel(period)}</h2>
        <Select
          className="w-full sm:w-64"
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
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {["Standort", "Gesamtleistung", "PVS", "EBITDA", "Marge", "Cashflow gem. BWA", "Forderungen", "Kostenquote", "Status"].map((head) => (
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

function openingHoursBasisForPeriod(site: DashboardSite, period: string, weeklyOpeningHours: number) {
  if (!weeklyOpeningHours) return 0;
  return weeklyOpeningHours * monthsSinceStartForPeriod(site, period) * 4.33;
}

function monthSelectionForPeriod(period: string) {
  const selection = selectedBwaPeriod(period);
  return new Set(selection.months?.length ? selection.months : Array.from({ length: 12 }, (_, index) => index + 1));
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
  importedData,
  period,
  setPeriod,
  availablePeriods
}: {
  title: string;
  mode: "honorar" | "pvs";
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
  period: string;
  setPeriod: (period: string) => void;
  availablePeriods: string[];
}) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  const year = selectedBwaPeriod(period).year ?? importedData?.report.jahre.filter((entry) => entry >= 1900).at(-1) ?? new Date().getFullYear();
  const visibleMonths = monthSelectionForPeriod(period);
  const rowBySite = new Map((performanceMonthlyRows(importedData, mode) ?? []).map((row) => [row.siteId, row]));
  const monthlyValuesForSite = (site: DashboardSite) => {
    const importedRow = rowBySite.get(site.id);
    const values = importedRow
      ? fillTwelveMonths(Array.from({ length: 12 }, (_, index) => Math.round(importedRow.valuesByMonth[`${year}-${index + 1}`] ?? 0)))
      : allocateByMonthlyStructure(performanceBase(site, mode), monthlyData);
    return values.map((value, index) => (visibleMonths.has(index + 1) ? value : 0));
  };

  return (
    <Card className="overflow-hidden">
      <div className="table-head flex flex-col gap-3 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <span className="font-bold">{title} | {performancePeriodLabel(period)}</span>
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

function BankMovementsTable({
  sites = standorte,
  monthlyData = monthly,
  importedData,
  period,
  setPeriod,
  availablePeriods
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
  period: string;
  setPeriod: (period: string) => void;
  availablePeriods: string[];
}) {
  const visibleMonths = monthSelectionForPeriod(period);
  const selection = selectedBwaPeriod(period);
  const importedRows = (importedData?.bankMovementRows ?? []).filter((row) => !row.siteId || row.siteId === "konzern");
  const selectedMonthKeys = Array.from(visibleMonths).map((month) => `${selection.year ?? ""}-${month}`);
  const isSnapshotRow = (row: ImportedBankMovementRow) => matchesBankMovementKey(row.label, "kontostand_monatsende");
  const monthValueFor = (row: ImportedBankMovementRow, month: number) => {
    if (!selection.year) return null;
    const key = `${selection.year}-${month}`;
    return row.hasValueByMonth[key] ? row.valuesByMonth[key] ?? 0 : null;
  };
  const selectedTotalFor = (row: ImportedBankMovementRow) => {
    if (!selection.year) return row.contractValue;
    const hasSelectedValues = selectedMonthKeys.some((key) => row.hasValueByMonth[key]);
    if (!hasSelectedValues) return row.total;
    if (isSnapshotRow(row)) {
      return Array.from(visibleMonths)
        .map((month) => monthValueFor(row, month))
        .filter((value): value is number => value != null)
        .at(-1) ?? 0;
    }
    return Array.from(visibleMonths).reduce((sum, month) => sum + (monthValueFor(row, month) ?? 0), 0);
  };
  const selectedAverageFor = (row: ImportedBankMovementRow, totalValue: number) => {
    if (!selection.year) return row.averageContract;
    const activeMonthCount = selectedMonthKeys.filter((key) => row.hasValueByMonth[key]).length;
    return activeMonthCount ? totalValue / activeMonthCount : row.averageMonth;
  };
  const applyPeriod = (values: number[]) => fillTwelveMonths(values).map((value, index) => (visibleMonths.has(index + 1) ? value : 0));
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
    { label: "Geldeingang Bank gesamt", values: applyPeriod(monthlyPerformance), contract: totalForSites(sites, "gesamtleistung") },
    { label: "davon Praxisumsatz", values: applyPeriod(monthlyPerformance), contract: totalForSites(sites, "gesamtleistung"), indent: true },
    { label: "davon sonstiges", values: applyPeriod(monthlyPerformance.map(() => 0)), contract: 0, indent: true },
    {
      label: "Geldausgang Bank inkl. Kredit",
      values: applyPeriod(praxisCosts.map((value, index) => value + tilgungZins[index] + cashAdjustments[index])),
      contract: -Math.abs(totalForSites(sites, "gesamtleistung") - totalForSites(sites, "cashflow"))
    },
    { label: "davon Praxisausgaben", values: applyPeriod(praxisCosts), contract: praxisCosts.reduce((sum, value) => sum + value, 0), indent: true },
    { label: "davon Tilgung + Zins", values: applyPeriod(tilgungZins), contract: -totalTilgungZins, indent: true },
    { label: "davon Bank-Cashflow-Adjustments", values: applyPeriod(cashAdjustments), contract: cashAdjustments.reduce((sum, value) => sum + value, 0), indent: true },
    { label: "Bank-Cashflow gesamt im Monat", values: applyPeriod(monthlyCashflow), contract: totalForSites(sites, "cashflow") },
    { label: "Kontostand Monatsende", values: applyPeriod(kontostandMonths), contract: endingKontostand }
  ];
  const displayRows = importedRows.length
    ? importedRows.map((row) => {
        const values = Array.from({ length: 12 }, (_, index) => monthValueFor(row, index + 1));
        const total = selectedTotalFor(row);
        return {
          label: row.label,
          indent: row.indent,
          values,
          total,
          average: selectedAverageFor(row, total),
          contract: row.contractValue,
          contractAverage: row.averageContract
        };
      })
    : rows.map((row) => {
        const values = fillTwelveMonths(row.values).map((value) => (value ? value : null));
        const total = row.values.reduce((sum, value) => sum + value, 0);
        const activeMonths = row.values.filter((value) => value !== 0).length || 1;
        return {
          label: row.label,
          indent: Boolean(row.indent),
          values,
          total,
          average: total / activeMonths,
          contract: row.contract,
          contractAverage: row.contract / activeMonths
        };
      });

  return (
    <Card className="overflow-hidden">
      <div className="table-head flex flex-col gap-3 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <span className="font-bold">Bank / Geldbewegungen aus Input_Finanzen | {performancePeriodLabel(period)}</span>
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
            {displayRows.map((row) => {
              const totalValue = row.total;
              const isSummary = !row.indent;
              return (
                <tr key={row.label} className={cn(isSummary && "summary-row")}>
                  <TableCell strong={isSummary} summary={isSummary}>{row.indent ? `  ${row.label}` : row.label}</TableCell>
                  {row.values.map((value, index) => (
                    <TableCell key={`${row.label}-${index}`} summary={isSummary} tone={(value ?? 0) < 0 ? "red" : undefined}>
                      {value == null ? "" : eur(value)}
                    </TableCell>
                  ))}
                  <TableCell strong summary={isSummary} tone={totalValue < 0 ? "red" : undefined}>{eur(totalValue)}</TableCell>
                  <TableCell strong summary={isSummary} tone={row.average < 0 ? "red" : undefined}>{eur(row.average)}</TableCell>
                  <TableCell strong summary={isSummary} tone={row.contract < 0 ? "red" : undefined}>{eur(row.contract)}</TableCell>
                  <TableCell strong summary={isSummary} tone={row.contractAverage < 0 ? "red" : undefined}>{eur(row.contractAverage)}</TableCell>
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

function SitePvsMonthlyRevenue({
  site,
  importedData,
  monthlyData = monthly
}: {
  site: DashboardSite;
  importedData?: ImportedDashboardData | null;
  monthlyData?: typeof monthly;
}) {
  const availablePeriods = periodOptionsFromImportedRows(importedData?.pvsRevenueRows);
  const [period, setPeriod] = useState(() => defaultPeriodFromOptions(availablePeriods));
  useEffect(() => {
    if (!availablePeriods.includes(period)) {
      setPeriod(defaultPeriodFromOptions(availablePeriods));
    }
  }, [availablePeriods, period]);

  const pvsRow = importedData?.pvsRevenueRows?.find((row) => row.siteId === site.id);
  const selection = selectedBwaPeriod(period);
  const visibleMonths = monthSelectionForPeriod(period);
  const valueFor = (year: number, month: number) => Math.round(pvsRow?.valuesByMonth[`${year}-${month}`] ?? 0);
  const periodYears = Array.from(
    new Set(
      Object.keys(pvsRow?.valuesByMonth ?? {})
        .map((key) => Number(key.split("-")[0]))
        .filter((year) => Number.isFinite(year) && year >= 1900)
    )
  )
    .filter((year) => bwaMonths.some((_, index) => Math.abs(valueFor(year, index + 1)) > 0))
    .sort((a, b) => a - b);
  const years = selection.year ? [selection.year] : periodYears;
  const fallbackValues = allocateByMonthlyStructure(site.pvsUmsatz, monthlyData);
  const rows = years.map((year) => {
    const values = bwaMonths.map((_, index) => {
      const month = index + 1;
      if (selection.year && !visibleMonths.has(month)) return null;
      const importedValue = valueFor(year, month);
      if (pvsRow) return importedValue || null;
      return selection.year ? fallbackValues[index] || null : null;
    });
    return {
      label: selection.year ? "PVS-Gesamtumsatz" : `Geschäftsjahr ${year}`,
      values
    };
  });
  const totalByMonth = bwaMonths.map((_, index) =>
    rows.reduce((sum, row) => sum + (row.values[index] ?? 0), 0)
  );
  const hasRows = rows.some((row) => row.values.some((value) => value != null && value !== 0));

  return (
    <Card className="overflow-hidden">
      <div className="table-head flex flex-col gap-3 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <span className="font-bold">Monatliche PVS-Gesamtumsätze {site.name} | {performancePeriodLabel(period)}</span>
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
      <div className="border-b border-border bg-slate-50 p-3 text-sm text-muted-foreground">
        Monatliche Herleitung aus dem bestätigten Excel-Import. Bei gesamter Vertragsperiode werden die Jahre seit Praxisstart untereinander dargestellt.
      </div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-border table-head p-2 text-left text-white">Zeitraum</th>
              {bwaMonths.map((month) => (
                <th key={month} className="border-b border-r border-border table-head p-2 text-right text-white">{month}</th>
              ))}
              <th className="border-b border-r border-border table-head p-2 text-right text-white">Gesamt</th>
              <th className="border-b border-r border-border table-head p-2 text-right text-white">Ø Monat</th>
            </tr>
          </thead>
          <tbody>
            {hasRows ? (
              <>
                {rows.map((row) => (
                  <SitePvsMonthRow key={row.label} label={row.label} values={row.values} />
                ))}
                {!selection.year && <SitePvsMonthRow label="Gesamt" values={totalByMonth} summary />}
              </>
            ) : (
              <tr>
                <td className="border-b border-border bg-white p-4 text-sm text-muted-foreground" colSpan={15}>
                  Für {site.name} sind in diesem Zeitraum keine PVS-Monatswerte im bestätigten Import vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SitePvsMonthRow({ label, values, summary }: { label: string; values: (number | null)[]; summary?: boolean }) {
  const numericValues = values.filter((value): value is number => value != null);
  const totalValue = numericValues.reduce((sum, value) => sum + value, 0);
  const averageValue = totalValue / Math.max(numericValues.filter((value) => value !== 0).length, 1);
  return (
    <tr className={cn(summary && "summary-row")}>
      <td className={cn("sticky left-0 z-10 border-b border-r border-border bg-white p-2 font-bold", summary && "table-total")}>{label}</td>
      {values.map((value, index) => (
        <TableCell key={`${label}-${index}`} summary={summary}>{value ? eur(value) : ""}</TableCell>
      ))}
      <TableCell strong summary={summary}>{eur(totalValue)}</TableCell>
      <TableCell strong summary={summary}>{eur(averageValue)}</TableCell>
    </tr>
  );
}

function SiteBehandlerMonthlyRevenue({
  site,
  importedData
}: {
  site: DashboardSite;
  importedData?: ImportedDashboardData | null;
}) {
  const siteRows = (importedData?.behandlerDetailRows ?? []).filter((row) => row.siteId === site.id);
  const availablePeriods = periodOptionsFromBehandlerDetailRows(siteRows);
  const [period, setPeriod] = useState(() => defaultPeriodFromOptions(availablePeriods));
  useEffect(() => {
    if (!availablePeriods.includes(period)) {
      setPeriod(defaultPeriodFromOptions(availablePeriods));
    }
  }, [availablePeriods, period]);

  const selection = selectedBwaPeriod(period);
  const visibleMonths = monthSelectionForPeriod(period);
  const valueFor = (valuesByMonth: Record<string, number>, month: number) => {
    if (selection.year) {
      if (!visibleMonths.has(month)) return null;
      const value = valuesByMonth[`${selection.year}-${month}`];
      return value == null ? null : Math.round(value);
    }
    const value = Object.entries(valuesByMonth).reduce((sum, [key, value]) => {
      const entryMonth = Number(key.split("-")[1]);
      return entryMonth === month ? sum + value : sum;
    }, 0);
    return value ? Math.round(value) : null;
  };
  const rowValues = (row: ImportedBehandlerDetailRow, key: "honorarByMonth" | "eigenlaborByMonth" | "totalByMonth") =>
    bwaMonths.map((_, index) => valueFor(row[key], index + 1));
  const periodTotal = (row: ImportedBehandlerDetailRow) =>
    rowValues(row, "totalByMonth").reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const visibleRows = siteRows
    .map((row) => ({ row, total: periodTotal(row) }))
    .filter((entry) => Math.abs(entry.total) > 0)
    .sort((a, b) => b.total - a.total || a.row.name.localeCompare(b.row.name, "de"));
  const totals = {
    honorar: bwaMonths.map((_, index) => visibleRows.reduce((sum, entry) => sum + (valueFor(entry.row.honorarByMonth, index + 1) ?? 0), 0)),
    eigenlabor: bwaMonths.map((_, index) => visibleRows.reduce((sum, entry) => sum + (valueFor(entry.row.eigenlaborByMonth, index + 1) ?? 0), 0)),
    total: bwaMonths.map((_, index) => visibleRows.reduce((sum, entry) => sum + (valueFor(entry.row.totalByMonth, index + 1) ?? 0), 0))
  };

  return (
    <Card className="overflow-hidden">
      <div className="table-head flex flex-col gap-3 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <span className="font-bold">Behandler-Umsätze {site.name} | {performancePeriodLabel(period)}</span>
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
      <div className="border-b border-border bg-slate-50 p-3 text-sm text-muted-foreground">
        Monatliche Aufstellung je Behandler: Honorarumsatz plus Eigenlabor-Umsatz ergibt Gesamtumsatz. Quelle ist der bestätigte Excel-Import.
      </div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-border table-head p-2 text-left text-white">Behandler</th>
              <th className="border-b border-r border-border table-head p-2 text-left text-white">Umsatzart</th>
              {bwaMonths.map((month) => (
                <th key={month} className="border-b border-r border-border table-head p-2 text-right text-white">{month}</th>
              ))}
              <th className="border-b border-r border-border table-head p-2 text-right text-white">Gesamt</th>
              <th className="border-b border-r border-border table-head p-2 text-right text-white">Ø Monat</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? (
              <>
                {visibleRows.flatMap(({ row }) => {
                  const honorarValues = rowValues(row, "honorarByMonth");
                  const eigenlaborValues = rowValues(row, "eigenlaborByMonth");
                  const totalValues = rowValues(row, "totalByMonth");
                  return [
                    <SiteBehandlerRevenueRow key={`${row.name}-honorar`} name={row.name} rowSpan={3} label="Honorarumsatz" values={honorarValues} />,
                    <SiteBehandlerRevenueRow key={`${row.name}-eigenlabor`} label="Eigenlabor-Umsatz" values={eigenlaborValues} />,
                    <SiteBehandlerRevenueRow key={`${row.name}-gesamt`} label="Gesamtumsatz" values={totalValues} summary />
                  ];
                })}
                <SiteBehandlerRevenueRow name="Gesamt" rowSpan={3} label="Honorarumsatz" values={totals.honorar} summary />
                <SiteBehandlerRevenueRow label="Eigenlabor-Umsatz" values={totals.eigenlabor} summary />
                <SiteBehandlerRevenueRow label="Gesamtumsatz" values={totals.total} summary />
              </>
            ) : (
              <tr>
                <td className="border-b border-border bg-white p-4 text-sm text-muted-foreground" colSpan={16}>
                  Für {site.name} sind in diesem Zeitraum keine Behandler-Monatswerte im bestätigten Import vorhanden. Nach einem neuen Excel-Upload werden Honorarumsatz und Eigenlabor hier getrennt dargestellt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SiteBehandlerRevenueRow({
  name,
  rowSpan,
  label,
  values,
  summary
}: {
  name?: string;
  rowSpan?: number;
  label: string;
  values: (number | null)[];
  summary?: boolean;
}) {
  const numericValues = values.filter((value): value is number => value != null);
  const totalValue = numericValues.reduce((sum, value) => sum + value, 0);
  const averageValue = totalValue / Math.max(numericValues.filter((value) => value !== 0).length, 1);
  return (
    <tr className={cn(summary && "summary-row")}>
      {name ? (
        <td
          rowSpan={rowSpan}
          className={cn(
            "sticky left-0 z-10 border-b border-r border-border bg-white p-2 font-bold align-top",
            summary && "table-total"
          )}
        >
          {name}
        </td>
      ) : null}
      <td className={cn("border-b border-r border-border bg-white p-2 font-semibold", summary && "table-total")}>{label}</td>
      {values.map((value, index) => (
        <TableCell key={`${label}-${index}`} summary={summary}>{value ? eur(value) : ""}</TableCell>
      ))}
      <TableCell strong summary={summary}>{eur(totalValue)}</TableCell>
      <TableCell strong summary={summary}>{eur(averageValue)}</TableCell>
    </tr>
  );
}

function SiteBehandlerPersonnelCosts({
  site,
  importedData
}: {
  site: DashboardSite;
  importedData?: ImportedDashboardData | null;
}) {
  const visibleRows = personnelCostComparisonRows(importedData, site.id);
  const totals = visibleRows.reduce(
    (sum, row) => ({
      personnelCost: sum.personnelCost + row.personnelCost,
      honorar: sum.honorar + row.honorar
    }),
    { personnelCost: 0, honorar: 0 }
  );

  return (
    <Card className="overflow-hidden">
      <div className="table-head p-3 text-white">
        <span className="font-bold">Personalkosten je Behandler {site.name} | seit Vertragsbeginn</span>
      </div>
      <div className="border-b border-border bg-slate-50 p-3 text-sm text-muted-foreground">
        Quelle ist der bestätigte CFO-Import aus den Standort-Personalkosten-Tabs. Die Tabelle aggregiert Personalkosten und Honorarumsatz über die gesamte Vertragsperiode.
      </div>
      <ResponsiveTable>
        <thead>
          <tr>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Personalkosten</TableHead>
            <TableHead>Honorarumsatz</TableHead>
            <TableHead>PK-Quote</TableHead>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={`${row.employeeId}-${row.name}`}>
              <TableCell strong>{row.name}</TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>{eur(row.personnelCost)}</TableCell>
              <TableCell>{eur(row.honorar)}</TableCell>
              <TableCell>{pctOneDecimal(row.pkQuote * 100)}</TableCell>
            </tr>
          ))}
          {visibleRows.length ? (
            <tr className="summary-row">
              <TableCell strong summary>Gesamt</TableCell>
              <TableCell summary>{""}</TableCell>
              <TableCell strong summary>{eur(totals.personnelCost)}</TableCell>
              <TableCell strong summary>{eur(totals.honorar)}</TableCell>
              <TableCell strong summary>{pctOneDecimal(ratio(totals.personnelCost, totals.honorar))}</TableCell>
            </tr>
          ) : (
            <tr>
              <TableCell strong>Keine Personalkosten-Daten</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
              <TableCell>{""}</TableCell>
            </tr>
          )}
        </tbody>
      </ResponsiveTable>
    </Card>
  );
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

function anonymousBenchmarkSiteLabel(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return `Peer ${alphabet[index]}`;
  return `Peer ${index + 1}`;
}

function Analysen({
  sites = standorte,
  monthlyData = monthly,
  importedData,
  personalData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
  personalData?: PersonalDashboardData | null;
}) {
  const periodOptions = useMemo(() => importedData ? bwaPeriodOptionsFor(importedData) : ["Gesamte Periode"], [importedData]);
  const [period, setPeriod] = useState(() => defaultBenchmarkPeriodFor(importedData));
  const sortedSites = sortSitesByContractStart(
    sites
      .map((site) => filteredSiteForPeriod(site, importedData, period))
      .filter((site) => site.gesamtleistung || site.ebitda || site.pvsUmsatz || site.forderungen),
  );
  const [selectedSiteId, setSelectedSiteId] = useState(sortedSites[0]?.id ?? sites[0]?.id ?? "kirchberg");
  const [comparison, setComparison] = useState("Vergleichsniveau");
  const [viewMode, setViewMode] = useState<"Standortleiter" | "Intern">("Standortleiter");
  const { openingHoursBySiteId } = usePracticeOpeningHours();

  useEffect(() => {
    if (!periodOptions.includes(period)) {
      setPeriod(defaultBenchmarkPeriodFor(importedData));
    }
  }, [importedData, period, periodOptions]);

  useEffect(() => {
    if (sortedSites.length && !sortedSites.some((site) => site.id === selectedSiteId)) {
      setSelectedSiteId(sortedSites[0].id);
    }
  }, [selectedSiteId, sortedSites]);

  const selectedSite = sortedSites.find((site) => site.id === selectedSiteId) ?? sortedSites[0] ?? sites[0];
  const anonymousLabelsBySiteId = new Map(
    sortedSites
      .filter((site) => site.id !== selectedSite?.id)
      .map((site, index) => [site.id, anonymousBenchmarkSiteLabel(index)])
  );
  const benchmarkSiteLabel = (site: DashboardSite) =>
    site.id === selectedSite?.id ? site.name : anonymousLabelsBySiteId.get(site.id) ?? "Standort";
  const dentistCapacityBySite = useMemo(
    () => dentistCapacityBySiteForPeriod(personalData?.employees ?? [], period),
    [personalData, period]
  );

  const siteRows = sortedSites.map((site, index) => {
    const dentistCapacity = dentistCapacityBySite.get(site.id);
    const dentistFte = dentistCapacity?.fte ?? 0;
    const dentistWeeklyHours = dentistCapacity?.weeklyHours ?? 0;
    const dentistHeadcount = dentistCapacity?.headcount ?? 0;
    const importedRoomCount = asNumber(site.treatmentRooms);
    const roomCount = importedRoomCount && importedRoomCount > 0 ? importedRoomCount : staticTreatmentRoomsForSite(site.name);
    const pvsPerDentist = dentistFte ? site.pvsUmsatz / dentistFte : null;
    const performancePerDentist = dentistFte ? site.gesamtleistung / dentistFte : null;
    const ebitdaPerDentist = dentistFte ? site.ebitda / dentistFte : null;
    const pvsPerRoom = roomCount ? site.pvsUmsatz / roomCount : null;
    const performancePerRoom = roomCount ? site.gesamtleistung / roomCount : null;
    const ebitdaPerRoom = roomCount ? site.ebitda / roomCount : null;
    const weeklyOpeningHours = practiceOpeningHoursForSite(site.id, openingHoursBySiteId);
    const openingHoursBasis = openingHoursBasisForPeriod(site, period, weeklyOpeningHours);
    const pvsPerOpeningHour = openingHoursBasis ? site.pvsUmsatz / openingHoursBasis : null;
    const performancePerOpeningHour = openingHoursBasis ? site.gesamtleistung / openingHoursBasis : null;
    const ebitdaPerOpeningHour = openingHoursBasis ? site.ebitda / openingHoursBasis : null;
    return {
      site,
      label: benchmarkSiteLabel(site),
      dentists: dentistHeadcount,
      dentistCapacity,
      dentistFte,
      dentistWeeklyHours,
      rooms: roomCount,
      weeklyOpeningHours,
      openingHoursBasis,
      pvsPerDentist,
      performancePerDentist,
      ebitdaPerDentist,
      pvsPerRoom,
      performancePerRoom,
      ebitdaPerRoom,
      pvsPerOpeningHour,
      performancePerOpeningHour,
      ebitdaPerOpeningHour,
      ebitdaMargin: site.ebitdaMarge,
      receivablesRatio: site.pvsUmsatz ? (site.forderungen / site.pvsUmsatz) * 100 : 0,
      materialquote: site.materialquote,
      fremdlaborquote: site.fremdlaborquote,
      personalquote: site.personalquote ?? 0,
      sonstigeKostenquote: site.sonstigeKostenquote,
      gesamtkostenquote: site.materialquote + site.fremdlaborquote + (site.personalquote ?? 0) + site.sonstigeKostenquote
    };
  });
  const patientRows = importedData?.patientRows ?? [];
  const patientSiteRows = siteRows.map((row) => {
    const treatedPatients = patientMetricPeriodOptionalValue(patientRows, row.site.id, "treatedPatients", period);
    const newPatients = patientMetricPeriodOptionalValue(patientRows, row.site.id, "newPatients", period);
    const bookedAppointments = patientMetricPeriodOptionalValue(patientRows, row.site.id, "bookedAppointments", period);
    const attendedAppointments = patientMetricPeriodOptionalValue(patientRows, row.site.id, "attendedAppointments", period);
    const missedAppointments = patientMetricPeriodOptionalValue(patientRows, row.site.id, "missedAppointments", period);
    const attendanceRateSource = patientMetricPeriodOptionalValue(patientRows, row.site.id, "attendanceRate", period);
    const cancellationRateSource = patientMetricPeriodOptionalValue(patientRows, row.site.id, "cancellationRate", period);
    const importedPatientsPerRoom = patientMetricPeriodOptionalValue(patientRows, row.site.id, "patientsPerRoom", period);
    const hasAppointmentBase = bookedAppointments != null && bookedAppointments > 0;
    const attendanceRate =
      hasAppointmentBase && attendedAppointments != null
        ? (attendedAppointments / bookedAppointments) * 100
        : attendanceRateSource != null
          ? normalizedPercent(attendanceRateSource)
          : null;
    const cancellationRate =
      hasAppointmentBase && missedAppointments != null
        ? (missedAppointments / bookedAppointments) * 100
        : cancellationRateSource != null
          ? normalizedPercent(cancellationRateSource)
          : null;
    const newPatientRate = treatedPatients != null && treatedPatients > 0 && newPatients != null ? (newPatients / treatedPatients) * 100 : null;
    const patientsPerRoom = treatedPatients != null && row.rooms ? treatedPatients / row.rooms : importedPatientsPerRoom;
    const hasPatientData = [
      treatedPatients,
      newPatients,
      bookedAppointments,
      attendedAppointments,
      missedAppointments,
      attendanceRateSource,
      cancellationRateSource,
      importedPatientsPerRoom
    ].some((value) => value != null);
    return {
      ...row,
      treatedPatients,
      newPatients,
      bookedAppointments,
      attendedAppointments,
      missedAppointments,
      attendanceRate,
      cancellationRate,
      newPatientRate,
      patientsPerRoom,
      hasPatientData
    };
  });

  const selectedRow = siteRows.find((row) => row.site.id === selectedSite?.id) ?? siteRows[0];
  const selectedPatientRow = patientSiteRows.find((row) => row.site.id === selectedSite?.id) ?? patientSiteRows[0];
  const numericAverage = (selector: (row: (typeof siteRows)[number]) => number | null) => {
    const values = siteRows.map(selector).filter((value): value is number => value != null && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const patientAverage = (selector: (row: (typeof patientSiteRows)[number]) => number | null) => {
    const values = patientSiteRows
      .filter((row) => row.hasPatientData)
      .map(selector)
      .filter((value): value is number => value != null && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const indexFor = (value: number | null, average: number | null) => (value != null && average ? (value / average) * 100 : null);
  const benchmarkItems = [
    {
      label: "Gesamtumsatz je Zahnarzt-FTE",
      selected: indexFor(selectedRow?.pvsPerDentist ?? null, numericAverage((row) => row.pvsPerDentist)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.dentistFte
    },
    {
      label: "Gesamtleistung je Zahnarzt-FTE",
      selected: indexFor(selectedRow?.performancePerDentist ?? null, numericAverage((row) => row.performancePerDentist)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.dentistFte
    },
    {
      label: "EBITDA je Zahnarzt-FTE",
      selected: indexFor(selectedRow?.ebitdaPerDentist ?? null, numericAverage((row) => row.ebitdaPerDentist)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.dentistFte
    },
    {
      label: "Gesamtumsatz je Behandlungszimmer",
      selected: indexFor(selectedRow?.pvsPerRoom ?? null, numericAverage((row) => row.pvsPerRoom)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.rooms
    },
    {
      label: "Gesamtleistung je Behandlungszimmer",
      selected: indexFor(selectedRow?.performancePerRoom ?? null, numericAverage((row) => row.performancePerRoom)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.rooms
    },
    {
      label: "EBITDA je Behandlungszimmer",
      selected: indexFor(selectedRow?.ebitdaPerRoom ?? null, numericAverage((row) => row.ebitdaPerRoom)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.rooms
    },
    {
      label: "Gesamtumsatz je Öffnungsstunde",
      selected: indexFor(selectedRow?.pvsPerOpeningHour ?? null, numericAverage((row) => row.pvsPerOpeningHour)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.weeklyOpeningHours
    },
    {
      label: "Gesamtleistung je Öffnungsstunde",
      selected: indexFor(selectedRow?.performancePerOpeningHour ?? null, numericAverage((row) => row.performancePerOpeningHour)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.weeklyOpeningHours
    },
    {
      label: "EBITDA je Öffnungsstunde",
      selected: indexFor(selectedRow?.ebitdaPerOpeningHour ?? null, numericAverage((row) => row.ebitdaPerOpeningHour)),
      group: 100,
      higherIsBetter: true,
      unavailable: !selectedRow?.weeklyOpeningHours
    },
    {
      label: "EBITDA-Marge",
      selected: selectedRow?.ebitdaMargin ?? null,
      group: numericAverage((row) => row.ebitdaMargin) ?? 0,
      higherIsBetter: true,
      suffix: "%"
    }
  ];
  const selectedPatientsPerRoomIndex = indexFor(selectedPatientRow?.patientsPerRoom ?? null, patientAverage((row) => row.patientsPerRoom));
  const selectedNewPatientRate = selectedPatientRow?.newPatientRate ?? null;
  const newPatientRateGroup = patientAverage((row) => row.newPatientRate);
  const selectedAttendanceRate = selectedPatientRow?.attendanceRate ?? null;
  const attendanceRateGroup = patientAverage((row) => row.attendanceRate);
  const selectedCancellationRate = selectedPatientRow?.cancellationRate ?? null;
  const cancellationRateGroup = patientAverage((row) => row.cancellationRate);
  const patientBenchmarkItems = [
    {
      label: "Patienten je Behandlungszimmer",
      selected: selectedPatientsPerRoomIndex,
      group: 100,
      higherIsBetter: true,
      unavailable: selectedPatientsPerRoomIndex == null || !selectedPatientRow?.rooms
    },
    {
      label: "Neupatientenquote",
      selected: selectedNewPatientRate,
      group: newPatientRateGroup,
      higherIsBetter: true,
      suffix: "%",
      unavailable: selectedNewPatientRate == null || newPatientRateGroup == null
    },
    {
      label: "Terminwahrnehmungsquote",
      selected: selectedAttendanceRate,
      group: attendanceRateGroup,
      higherIsBetter: true,
      suffix: "%",
      unavailable: selectedAttendanceRate == null || attendanceRateGroup == null
    },
    {
      label: "Terminausfallquote",
      selected: selectedCancellationRate,
      group: cancellationRateGroup,
      higherIsBetter: false,
      suffix: "%",
      unavailable: selectedCancellationRate == null || cancellationRateGroup == null
    }
  ];
  const marginGroup = numericAverage((row) => row.ebitdaMargin) ?? 0;
  const costGroup = {
    materialquote: numericAverage((row) => row.materialquote) ?? 0,
    fremdlaborquote: numericAverage((row) => row.fremdlaborquote) ?? 0,
    personalquote: numericAverage((row) => row.personalquote) ?? 0,
    sonstigeKostenquote: numericAverage((row) => row.sonstigeKostenquote) ?? 0,
    gesamtkostenquote: numericAverage((row) => row.gesamtkostenquote) ?? 0
  };
  const marginGap = (selectedRow?.ebitdaMargin ?? 0) - marginGroup;
  const costDrivers = [
    { label: "Materialquote", value: (selectedRow?.materialquote ?? 0) - costGroup.materialquote },
    { label: "Fremdlaborquote", value: (selectedRow?.fremdlaborquote ?? 0) - costGroup.fremdlaborquote },
    { label: "Personalkostenquote", value: (selectedRow?.personalquote ?? 0) - costGroup.personalquote },
    { label: "Sonstige Kostenquote", value: (selectedRow?.sonstigeKostenquote ?? 0) - costGroup.sonstigeKostenquote }
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const displaySiteName = selectedSite?.name ?? "Standort";
  const describeBenchmarkGap = (label: string, selected: number | null | undefined, group: number | null | undefined, higherIsBetter: boolean, formatter = pct) => {
    if (selected == null || group == null || !Number.isFinite(selected) || !Number.isFinite(group)) {
      return `${displaySiteName}: ${label} kann mangels Datenbasis noch nicht bewertet werden.`;
    }
    const gap = selected - group;
    const better = higherIsBetter ? gap >= 0 : gap <= 0;
    const direction = better ? "besser" : "schwächer";
    const relation = higherIsBetter
      ? gap >= 0 ? "über" : "unter"
      : gap <= 0 ? "unter" : "über";
    return `${displaySiteName}: ${label} liegt ${formatter(selected)} ${relation} dem Vergleichsniveau (${formatter(group)}), Abweichung ${gap >= 0 ? "+" : ""}${pct(gap)}-Pkt. und damit ${direction}.`;
  };
  const selectedPvsPerDentistIndex = benchmarkItems[0].selected;
  const summaryItems = [
    describeBenchmarkGap("EBITDA-Marge", selectedRow?.ebitdaMargin, marginGroup, true),
    describeBenchmarkGap("Gesamtkostenquote", selectedRow?.gesamtkostenquote, costGroup.gesamtkostenquote, false),
    selectedPvsPerDentistIndex != null
      ? `${displaySiteName}: Gesamtumsatz je Zahnarzt-FTE liegt bei ${pct(selectedPvsPerDentistIndex)} des Vergleichsniveaus und damit ${selectedPvsPerDentistIndex >= 100 ? "über" : "unter"} Vergleich.`
      : `${displaySiteName}: Gesamtumsatz je Zahnarzt-FTE kann mangels Zahnarztstunden- oder Umsatzbasis noch nicht bewertet werden.`,
    selectedPatientRow?.attendanceRate != null && attendanceRateGroup != null
      ? describeBenchmarkGap("Terminwahrnehmungsquote", selectedPatientRow.attendanceRate, attendanceRateGroup, true)
      : "Patienten- und Termindaten fehlen für den ausgewählten Standort noch im Import."
  ];
  const hasMissingBasis = benchmarkItems.some((item) => item.unavailable);
  const basisRows = [
    {
      label: "Gesamtumsatz je Zahnarzt-FTE",
      own: selectedRow?.pvsPerDentist ?? null,
      comparison: numericAverage((row) => row.pvsPerDentist),
      type: "currency" as const,
      basis: dentistCapacityBasisLabel(selectedRow?.dentistCapacity)
    },
    {
      label: "Gesamtleistung je Zahnarzt-FTE",
      own: selectedRow?.performancePerDentist ?? null,
      comparison: numericAverage((row) => row.performancePerDentist),
      type: "currency" as const,
      basis: dentistCapacityBasisLabel(selectedRow?.dentistCapacity)
    },
    {
      label: "EBITDA je Zahnarzt-FTE",
      own: selectedRow?.ebitdaPerDentist ?? null,
      comparison: numericAverage((row) => row.ebitdaPerDentist),
      type: "currency" as const,
      basis: dentistCapacityBasisLabel(selectedRow?.dentistCapacity)
    },
    {
      label: "Gesamtumsatz je Behandlungszimmer",
      own: selectedRow?.pvsPerRoom ?? null,
      comparison: numericAverage((row) => row.pvsPerRoom),
      type: "currency" as const,
      basis: `${selectedRow?.rooms ?? 0} Behandlungszimmer`
    },
    {
      label: "Gesamtleistung je Behandlungszimmer",
      own: selectedRow?.performancePerRoom ?? null,
      comparison: numericAverage((row) => row.performancePerRoom),
      type: "currency" as const,
      basis: `${selectedRow?.rooms ?? 0} Behandlungszimmer`
    },
    {
      label: "EBITDA je Behandlungszimmer",
      own: selectedRow?.ebitdaPerRoom ?? null,
      comparison: numericAverage((row) => row.ebitdaPerRoom),
      type: "currency" as const,
      basis: `${selectedRow?.rooms ?? 0} Behandlungszimmer`
    },
    {
      label: "Gesamtumsatz je Öffnungsstunde",
      own: selectedRow?.pvsPerOpeningHour ?? null,
      comparison: numericAverage((row) => row.pvsPerOpeningHour),
      type: "currency" as const,
      basis: `${(selectedRow?.weeklyOpeningHours ?? 0).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std./Woche × Zeitraum`
    },
    {
      label: "Gesamtleistung je Öffnungsstunde",
      own: selectedRow?.performancePerOpeningHour ?? null,
      comparison: numericAverage((row) => row.performancePerOpeningHour),
      type: "currency" as const,
      basis: `${(selectedRow?.openingHoursBasis ?? 0).toLocaleString("de-DE", { maximumFractionDigits: 0 })} Öffnungsstunden`
    },
    {
      label: "EBITDA je Öffnungsstunde",
      own: selectedRow?.ebitdaPerOpeningHour ?? null,
      comparison: numericAverage((row) => row.ebitdaPerOpeningHour),
      type: "currency" as const,
      basis: `${(selectedRow?.openingHoursBasis ?? 0).toLocaleString("de-DE", { maximumFractionDigits: 0 })} Öffnungsstunden`
    },
    {
      label: "EBITDA-Marge",
      own: selectedRow?.ebitdaMargin ?? null,
      comparison: marginGroup,
      type: "percent" as const,
      basis: "EBITDA / Gesamtleistung"
    },
    {
      label: "Forderungsquote",
      own: selectedRow?.receivablesRatio ?? null,
      comparison: numericAverage((row) => row.receivablesRatio),
      type: "percent" as const,
      basis: "Forderungen / PVS-Umsatz"
    }
  ];
  const patientBasisRows = [
    {
      label: "Behandelte Patienten",
      value: selectedPatientRow?.treatedPatients ?? null,
      comparison: patientAverage((row) => row.treatedPatients),
      type: "count" as const,
      basis: "Summe im Zeitraum"
    },
    {
      label: "Neupatienten",
      value: selectedPatientRow?.newPatients ?? null,
      comparison: patientAverage((row) => row.newPatients),
      type: "count" as const,
      basis: "Summe im Zeitraum"
    },
    {
      label: "Patienten je Behandlungszimmer",
      value: selectedPatientRow?.patientsPerRoom ?? null,
      comparison: patientAverage((row) => row.patientsPerRoom),
      type: "average" as const,
      basis: `${selectedPatientRow?.rooms ?? 0} Behandlungszimmer`
    },
    {
      label: "Neupatientenquote",
      value: selectedPatientRow?.newPatientRate ?? null,
      comparison: patientAverage((row) => row.newPatientRate),
      type: "percent" as const,
      basis: "Neupatienten / behandelte Patienten"
    },
    {
      label: "Gebuchte Termine",
      value: selectedPatientRow?.bookedAppointments ?? null,
      comparison: patientAverage((row) => row.bookedAppointments),
      type: "count" as const,
      basis: "Alle gebuchten Termine"
    },
    {
      label: "Wahrgenommene Termine",
      value: selectedPatientRow?.attendedAppointments ?? null,
      comparison: patientAverage((row) => row.attendedAppointments),
      type: "count" as const,
      basis: "Wahrgenommen / durchgeführt"
    },
    {
      label: "Terminwahrnehmungsquote",
      value: selectedPatientRow?.attendanceRate ?? null,
      comparison: patientAverage((row) => row.attendanceRate),
      type: "percent" as const,
      basis: "Wahrgenommene Termine / gebuchte Termine"
    },
    {
      label: "Terminausfallquote",
      value: selectedPatientRow?.cancellationRate ?? null,
      comparison: patientAverage((row) => row.cancellationRate),
      type: "percent" as const,
      basis: "Nicht wahrgenommene Termine / gebuchte Termine"
    }
  ];

  const benchmarkReportValue = (value: number | null | undefined, suffix = "%", unavailable = false) => {
    if (unavailable || value == null || !Number.isFinite(value)) return "n. v.";
    return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })}${suffix}`;
  };

  const benchmarkReportTone = (
    selected: number | null | undefined,
    group: number | null | undefined,
    higherIsBetter = true,
    unavailable = false
  ): ReportTone => {
    if (unavailable || selected == null || group == null || !Number.isFinite(selected) || !Number.isFinite(group)) return "blue";
    const diff = selected - group;
    if (Math.abs(diff) < 2) return "yellow";
    const good = higherIsBetter ? diff >= 0 : diff <= 0;
    return good ? "green" : "red";
  };

  const formatBenchmarkBasisValue = (value: number | null | undefined, type: "currency" | "percent") => {
    if (value == null || !Number.isFinite(value)) return "n. v.";
    return type === "currency" ? eur(value) : pct(value);
  };

  const formatPatientBasisValue = (value: number | null | undefined, type: "count" | "average" | "percent") => {
    if (value == null || !Number.isFinite(value)) return "n. v.";
    if (type === "percent") return pct(value);
    return value.toLocaleString("de-DE", { maximumFractionDigits: type === "average" ? 1 : 0 });
  };

  const heatClassFor = (value: number | null | undefined, reference: number | null | undefined, higherIsBetter = false) => {
    if (value == null || reference == null || !Number.isFinite(value) || !Number.isFinite(reference)) return "heat-neutral";
    const diff = value - reference;
    if (Math.abs(diff) <= 0.5) return "heat-yellow";
    const good = higherIsBetter ? diff >= 0 : diff <= 0;
    return good ? "heat-green" : "heat-red";
  };

  const benchmarkingReportStyles = `<style>
    .benchmark-document {
      display: block;
      gap: 0;
      background: white;
    }
    .benchmark-document .hero {
      border-radius: 12px;
      padding: 9px 13px;
      margin-bottom: 5px;
    }
    .benchmark-document .eyebrow { font-size: 7px; }
    .benchmark-document h1 { margin: 3px 0 2px; font-size: 17px; }
    .benchmark-document .hero p { font-size: 8px; line-height: 1.25; }
    .benchmark-document .meta-line { margin-top: 5px; gap: 4px; font-size: 6.8px; }
    .benchmark-document .pill { padding: 2px 5px; }
    .benchmark-document .report-footer { display: none; }
    .benchmark-report-page {
      height: 196mm;
      overflow: hidden;
      display: grid;
      gap: 5px;
      align-content: start;
      break-after: page;
      page-break-after: always;
    }
    .benchmark-report-page:last-of-type {
      break-after: auto;
      page-break-after: auto;
    }
    .benchmark-document .kpi-grid {
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }
    .benchmark-document .kpi-card {
      min-height: 47px;
      border-radius: 8px;
      padding: 6px 7px;
      box-shadow: none;
    }
    .benchmark-document .kpi-label { font-size: 5.8px; line-height: 1.1; }
    .benchmark-document .kpi-value { margin-top: 3px; font-size: 11px; }
    .benchmark-document .kpi-detail { margin-top: 3px; font-size: 5.8px; line-height: 1.15; }
    .benchmark-document .section-head { padding: 5px 7px; }
    .benchmark-document .section-head h2 { font-size: 8.2px; }
    .benchmark-document .section-head p { margin-top: 2px; font-size: 6.4px; line-height: 1.2; }
    .benchmark-document .report-section {
      border-radius: 9px;
      box-shadow: none;
    }
    .benchmark-document .report-table.compact,
    .benchmark-document .report-table {
      font-size: 6.1px;
      line-height: 1.08;
    }
    .benchmark-document .report-table th,
    .benchmark-document .report-table td {
      padding: 2px 2px;
    }
    .benchmark-note {
      border-radius: 14px;
      padding: 12px 14px;
      background: #e9f7f6;
      border: 1px solid #b9dfdc;
      color: #12313c;
      font-size: 11px;
      line-height: 1.45;
      break-inside: avoid;
    }
    .benchmark-document .benchmark-note {
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 7.2px;
      line-height: 1.25;
    }
    .benchmark-note strong { color: #0a6f79; }
    .benchmark-two {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .benchmark-report-wide {
      display: grid;
      grid-template-columns: 0.92fr 1.08fr;
      gap: 6px;
    }
    .benchmark-report-triple {
      display: grid;
      grid-template-columns: 0.8fr 1.05fr 1.15fr;
      gap: 6px;
    }
    .benchmark-insights {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4px;
      padding: 6px;
    }
    .benchmark-insight {
      border-radius: 7px;
      border: 1px solid #d4e3e6;
      background: #f7fbfb;
      padding: 5px 6px;
      color: #142536;
      font-size: 6.4px;
      line-height: 1.25;
      min-height: auto;
    }
    .benchmark-insight strong {
      display: inline;
      margin-right: 4px;
      font-size: 6.7px;
      color: #0a6f79;
    }
    .heatmap-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.2px;
    }
    .benchmark-document .heatmap-table {
      font-size: 6.1px;
      line-height: 1.08;
    }
    .heatmap-table th {
      padding: 7px 6px;
      color: #ffffff;
      text-align: right;
      background: #075b69;
      border: 1px solid rgba(255,255,255,.25);
    }
    .benchmark-document .heatmap-table th {
      padding: 3px 3px;
    }
    .heatmap-table th:first-child,
    .heatmap-table td:first-child {
      text-align: left;
      font-weight: 800;
    }
    .heatmap-table td {
      padding: 7px 6px;
      text-align: right;
      border: 1px solid rgba(15, 42, 55, .18);
      font-weight: 750;
      color: #102435;
    }
    .benchmark-document .heatmap-table td {
      padding: 3px 3px;
    }
    .benchmark-document .bar-list { padding: 6px 7px; gap: 5px; }
    .benchmark-document .bar-row { gap: 3px; }
    .benchmark-document .bar-meta { font-size: 6.4px; }
    .benchmark-document .bar-track { height: 5px; }
    .heat-green { background: #bfeadf; }
    .heat-yellow { background: #fff0b8; }
    .heat-red { background: #f6b2ad; }
    .heat-neutral { background: #eef4f6; color: #607080; }
    @media print {
      .benchmark-note,
      .heatmap-table td,
      .heatmap-table th,
      .benchmark-insight {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>`;

  const openBenchmarkingReport = () => {
    const financialCards = benchmarkItems.map((item) => {
      const suffix = item.suffix ?? "%";
      const unavailable = item.unavailable ?? false;
      const diff = !unavailable && item.selected != null && item.group != null ? item.selected - item.group : null;
      return {
        label: item.label,
        value: benchmarkReportValue(item.selected, suffix, unavailable),
        detail: unavailable
          ? "Berechnungsbasis fehlt"
          : `Vergleich: ${benchmarkReportValue(item.group, suffix)} | Abw.: ${diff == null ? "n. v." : `${diff >= 0 ? "+" : ""}${diff.toLocaleString("de-DE", { maximumFractionDigits: 1 })}${suffix}`}`,
        tone: benchmarkReportTone(item.selected, item.group, item.higherIsBetter, unavailable)
      };
    });

    const patientCards = patientBenchmarkItems.map((item) => {
      const diff = item.selected != null && item.group != null ? item.selected - item.group : null;
      return {
        label: item.label,
        value: benchmarkReportValue(item.selected, item.suffix ?? "%", item.unavailable),
        detail: item.unavailable
          ? "Patientendaten fehlen"
          : `Vergleich: ${benchmarkReportValue(item.group, item.suffix ?? "%")} | Abw.: ${diff == null ? "n. v." : `${diff >= 0 ? "+" : ""}${diff.toLocaleString("de-DE", { maximumFractionDigits: 1 })}${item.suffix ?? "%"}`}`,
        tone: benchmarkReportTone(item.selected, item.group, item.higherIsBetter, item.unavailable)
      };
    });

    const basisTable = reportTable(
      ["Kennzahl", "Berechnungsbasis", "Eigener Wert", "Vergleichsniveau"],
      basisRows.map((row) => [
        row.label,
        row.basis,
        formatBenchmarkBasisValue(row.own, row.type),
        formatBenchmarkBasisValue(row.comparison, row.type)
      ]),
      { compact: true }
    );

    const patientBasisTable = reportTable(
      ["Kennzahl", "Berechnungsbasis", "Eigener Wert", "Vergleichsniveau"],
      patientBasisRows.map((row) => [
        row.label,
        row.basis,
        formatPatientBasisValue(row.value, row.type),
        formatPatientBasisValue(row.comparison, row.type)
      ]),
      { compact: true }
    );

    const pvsRankingRows = [...siteRows]
      .filter((row) => Number.isFinite(row.pvsPerDentist ?? NaN))
      .sort((a, b) => (b.pvsPerDentist ?? 0) - (a.pvsPerDentist ?? 0))
      .slice(0, 6);
    const marginRankingRows = [...siteRows]
      .filter((row) => Number.isFinite(row.ebitdaMargin ?? NaN))
      .sort((a, b) => (b.ebitdaMargin ?? 0) - (a.ebitdaMargin ?? 0))
      .slice(0, 6);
    const pvsRankingMax = Math.max(...pvsRankingRows.map((row) => row.pvsPerDentist ?? 0), 1);
    const marginRankingMax = Math.max(...marginRankingRows.map((row) => row.ebitdaMargin ?? 0), 1);

    const costHeatmap = `<table class="heatmap-table">
      <thead>
        <tr>
          <th>Benchmark-Peer</th>
          <th>Materialquote</th>
          <th>Fremdlaborquote</th>
          <th>Personalkostenquote</th>
          <th>Sonstige Kostenquote</th>
          <th>Gesamtkostenquote</th>
        </tr>
      </thead>
      <tbody>
        ${siteRows.map((row) => `<tr>
          <td>${reportEscape(row.label)}</td>
          <td class="${heatClassFor(row.materialquote, costGroup.materialquote)}">${reportEscape(pct(row.materialquote))}</td>
          <td class="${heatClassFor(row.fremdlaborquote, costGroup.fremdlaborquote)}">${reportEscape(pct(row.fremdlaborquote))}</td>
          <td class="${heatClassFor(row.personalquote, costGroup.personalquote)}">${reportEscape(pct(row.personalquote))}</td>
          <td class="${heatClassFor(row.sonstigeKostenquote, costGroup.sonstigeKostenquote)}">${reportEscape(pct(row.sonstigeKostenquote))}</td>
          <td class="${heatClassFor(row.gesamtkostenquote, costGroup.gesamtkostenquote)}">${reportEscape(pct(row.gesamtkostenquote))}</td>
        </tr>`).join("")}
        <tr>
          <td>Vergleichsniveau</td>
          <td class="heat-neutral">${reportEscape(pct(costGroup.materialquote))}</td>
          <td class="heat-neutral">${reportEscape(pct(costGroup.fremdlaborquote))}</td>
          <td class="heat-neutral">${reportEscape(pct(costGroup.personalquote))}</td>
          <td class="heat-neutral">${reportEscape(pct(costGroup.sonstigeKostenquote))}</td>
          <td class="heat-neutral">${reportEscape(pct(costGroup.gesamtkostenquote))}</td>
        </tr>
      </tbody>
    </table>`;

    const patientHeatmap = `<table class="heatmap-table">
      <thead>
        <tr>
          <th>Benchmark-Peer</th>
          <th>Behandelte Patienten</th>
          <th>Neupatientenquote</th>
          <th>Terminwahrnehmung</th>
          <th>Terminausfallquote</th>
          <th>Patienten je Zimmer</th>
        </tr>
      </thead>
      <tbody>
        ${patientSiteRows.map((row) => `<tr>
          <td>${reportEscape(row.label)}</td>
          <td class="${heatClassFor(row.treatedPatients, patientAverage((item) => item.treatedPatients), true)}">${reportEscape(formatPatientBasisValue(row.treatedPatients, "count"))}</td>
          <td class="${heatClassFor(row.newPatientRate, patientAverage((item) => item.newPatientRate), true)}">${reportEscape(formatPatientBasisValue(row.newPatientRate, "percent"))}</td>
          <td class="${heatClassFor(row.attendanceRate, patientAverage((item) => item.attendanceRate), true)}">${reportEscape(formatPatientBasisValue(row.attendanceRate, "percent"))}</td>
          <td class="${heatClassFor(row.cancellationRate, patientAverage((item) => item.cancellationRate), false)}">${reportEscape(formatPatientBasisValue(row.cancellationRate, "percent"))}</td>
          <td class="${heatClassFor(row.patientsPerRoom, patientAverage((item) => item.patientsPerRoom), true)}">${reportEscape(formatPatientBasisValue(row.patientsPerRoom, "average"))}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;

    const driverRows = costDrivers.map((driver) => [
      driver.label,
      `${driver.value >= 0 ? "+" : ""}${driver.value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %-Pkt.`,
      driver.value > 0 ? "über Vergleichsniveau" : "unter Vergleichsniveau"
    ]);

    const rankingSections = `<div class="benchmark-two">
      ${reportSection("Peer-Auszug Gesamtumsatz je Zahnarzt-FTE", reportBarList(pvsRankingRows.map((row) => ({
        label: row.label,
        value: row.pvsPerDentist ?? 0,
        max: pvsRankingMax,
        tone: row.site.id === selectedSite?.id ? "green" : "blue",
        suffix: eur(row.pvsPerDentist ?? 0)
      }))), `Anonymisierter Auszug nach normalisiertem PVS-Gesamtumsatz.`)}
      ${reportSection("Peer-Auszug EBITDA-Marge", reportBarList(marginRankingRows.map((row) => ({
        label: row.label,
        value: row.ebitdaMargin ?? 0,
        max: marginRankingMax,
        tone: row.site.id === selectedSite?.id ? "green" : "blue",
        suffix: pct(row.ebitdaMargin ?? 0)
      }))), `EBITDA-Marge im anonymisierten Vergleichsauszug.`)}
    </div>`;

    const body = `${benchmarkingReportStyles}
      <div class="benchmark-report-page">
        ${reportKpiGrid([...financialCards, ...patientCards])}
        <div class="benchmark-note">
          <strong>Leselogik:</strong> 100 % entspricht dem Vergleichsniveau im gewählten Zeitraum. Werte über 100 % liegen über dem Vergleich, Werte unter 100 % darunter. Bei Kostenquoten ist niedriger besser, bei Leistungs-, EBITDA- und Patientenkennzahlen höher besser.
        </div>
        <div class="benchmark-report-wide">
          ${rankingSections}
          ${reportSection("Standortleiter-Insights", `<div class="benchmark-insights">${summaryItems.map((item) => `<div class="benchmark-insight"><strong>Insight</strong>${reportEscape(item)}</div>`).join("")}</div>`, "Automatisch aus Benchmarking-Abweichungen und Patienten-/Termindaten abgeleitet.")}
        </div>
        ${reportSection("Kostenquoten im Peer-Auszug", costHeatmap, `Ampelfarben gegen Vergleichsniveau in ${period}; bei Kostenquoten ist niedriger besser.`)}
      </div>
      <div class="benchmark-report-page">
        <div class="benchmark-report-triple">
          ${reportSection("Patienten- und Terminindikatoren", patientHeatmap, `Patientenbasis, Neupatienten und Terminqualität für ${period}.`)}
          ${reportSection("EBITDA-Margen-Treiber", reportTable(["Treiber", "Abweichung", "Einordnung"], driverRows, { compact: true }), marginGap >= 0 ? "Die Marge liegt über dem Vergleichsniveau." : "Die Marge liegt unter dem Vergleichsniveau.")}
          ${reportSection("Rechenbasis kompakt", reportTable(["Kennzahl", "Eigener Wert", "Vergleichsniveau"], [
            ...basisRows.slice(0, 6).map((row) => [row.label, formatBenchmarkBasisValue(row.own, row.type), formatBenchmarkBasisValue(row.comparison, row.type)]),
            ...patientBasisRows.slice(0, 4).map((row) => [row.label, formatPatientBasisValue(row.value, row.type), formatPatientBasisValue(row.comparison, row.type)])
          ], { compact: true }), "Die vollständige Herleitung bleibt in der App über die Info-Buttons verfügbar.")}
        </div>
        <div class="benchmark-note">
          <strong>Ausgabe:</strong> Der Report zeigt einen anonymisierten Peer-Auszug. Der ausgewählte Standort bleibt markiert und im Klartext sichtbar.
        </div>
      </div>
    `;

    openPrintableReport(
      `Benchmarking-Report ${displaySiteName}`,
      buildReportDocument({
        title: `Benchmarking-Report ${displaySiteName}`,
        subtitle: `Zeitraum: ${period} | Vergleich: ${comparison} | Ansicht: ${viewMode}. Farbig aufbereiteter Report mit KPI-Übersicht, Rechenbasis, Rankings, Kosten-Heatmap, Patientenindikatoren und Handlungshinweisen.`,
        orientation: "landscape",
        body,
        documentClass: "benchmark-document",
        footerNote: "Benchmarking-Report | Vertraulich | Internal Use Only"
      })
    );
  };

  return (
    <section className="analysis-report w-full max-w-full overflow-hidden space-y-5">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body * {
            visibility: hidden !important;
          }

          .analysis-report,
          .analysis-report * {
            visibility: visible !important;
          }

          .analysis-report {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 100% !important;
            padding: 8mm !important;
            background:
              radial-gradient(circle at 15% 10%, rgba(20, 184, 166, 0.22), transparent 30%),
              linear-gradient(135deg, #061725 0%, #0b2232 52%, #0f3440 100%) !important;
            color: #f8fafc !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .analysis-report .analysis-no-print {
            display: none !important;
          }

          .analysis-report,
          .analysis-report div,
          .analysis-report section,
          .analysis-report label,
          .analysis-report p,
          .analysis-report span,
          .analysis-report strong,
          .analysis-report h1,
          .analysis-report h2,
          .analysis-report h3,
          .analysis-report table {
            color: #f8fafc !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          .analysis-report p,
          .analysis-report span,
          .analysis-report label {
            color: #dbeafe !important;
          }

          .analysis-report strong,
          .analysis-report h1,
          .analysis-report h2,
          .analysis-report h3 {
            color: #ffffff !important;
          }

          .analysis-report > div,
          .analysis-report .analysis-print-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .analysis-report .analysis-print-page {
            break-before: page;
            page-break-before: always;
          }

          .analysis-report .analysis-print-page:first-of-type {
            break-before: auto;
            page-break-before: auto;
          }

          .analysis-report .rounded-xl,
          .analysis-report .rounded-lg,
          .analysis-report .rounded-md {
            background: rgba(8, 31, 45, 0.92) !important;
            border: 1px solid rgba(125, 211, 252, 0.28) !important;
          }

          .analysis-report table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
          }

          .analysis-report th {
            background: #0f7285 !important;
            color: #ffffff !important;
          }

          .analysis-report th,
          .analysis-report td {
            border: 1px solid rgba(148, 163, 184, 0.28) !important;
            padding: 5px !important;
          }

          .analysis-report td {
            background: rgba(15, 23, 42, 0.5) !important;
            color: #f8fafc !important;
          }

          .analysis-report .bg-teal-500,
          .analysis-report .bg-teal-500\\/20,
          .analysis-report .bg-cyan-500,
          .analysis-report .bg-cyan-400,
          .analysis-report .bg-emerald-500,
          .analysis-report .bg-emerald-500\\/60 {
            background-color: #14b8a6 !important;
          }

          .analysis-report .bg-slate-400,
          .analysis-report .bg-slate-500,
          .analysis-report .bg-slate-600 {
            background-color: #64748b !important;
          }

          .analysis-report .bg-amber-400,
          .analysis-report .bg-amber-400\\/70 {
            background-color: #f59e0b !important;
          }

          .analysis-report .bg-red-500,
          .analysis-report .bg-red-500\\/70 {
            background-color: #ef4444 !important;
          }

          .analysis-report .text-emerald-300,
          .analysis-report .text-emerald-400,
          .analysis-report .text-green-400 {
            color: #5eead4 !important;
          }

          .analysis-report .text-amber-100,
          .analysis-report .text-amber-300,
          .analysis-report .text-amber-400 {
            color: #fde68a !important;
          }

          .analysis-report .text-red-300,
          .analysis-report .text-red-400,
          .analysis-report .text-red-500 {
            color: #fca5a5 !important;
          }

          .analysis-report .bg-emerald-500\\/60,
          .analysis-report .bg-amber-400\\/70,
          .analysis-report .bg-red-500\\/70 {
            color: #ffffff !important;
          }
        }
      `}</style>
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-3xl font-extrabold text-white">Benchmarking</h1>
            <p className="pb-1 text-sm font-semibold text-slate-300">Standort-Benchmarking</p>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Anonymisierte Standortleiter-Ansicht mit normalisierten Kennzahlen, Kostenquoten, Rankings und Handlungsschwerpunkten.
          </p>
        </div>
        <Button className="analysis-no-print w-full border border-teal-300/40 bg-teal-500/20 text-white shadow-[0_0_24px_rgba(20,184,166,0.22)] hover:bg-teal-500/30 sm:w-auto" onClick={openBenchmarkingReport}>
          <FileBarChart className="mr-2 h-4 w-4" />
          PDF exportieren
        </Button>
      </div>

      <div className="analysis-no-print grid min-w-0 gap-3 lg:grid-cols-4">
        <FilterShell label="Zeitraum">
          <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
            {periodOptions.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </FilterShell>
        <FilterShell label="Standort">
          <Select value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}>
            {sortedSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </Select>
        </FilterShell>
        <FilterShell label="Vergleich">
          <Select value={comparison} onChange={(event) => setComparison(event.target.value)}>
            {["Vergleichsniveau", "Top-Peer", "Plan", "Vorjahr"].map((item) => <option key={item}>{item}</option>)}
          </Select>
        </FilterShell>
        <FilterShell label="Ansicht">
          <Select value={viewMode} onChange={(event) => setViewMode(event.target.value as "Standortleiter" | "Intern")}>
            <option>Standortleiter</option>
            <option>Intern</option>
          </Select>
        </FilterShell>
      </div>

      <div className="analysis-print-block min-w-0 rounded-xl border border-white/15 bg-slate-950/55 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] lg:grid lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Standort-Benchmarking: {displaySiteName}</h2>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-200">
            <span>Zeitraum: <strong>{period}</strong></span>
            <span>Vergleich: <strong>{comparison}</strong></span>
            <span>Report: <strong>{viewMode}</strong></span>
          </div>
        </div>
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-100 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {summaryItems.map((item, index) => (
            <div key={item} className="flex gap-3">
              {index === 0 ? <TrendingUp className="mt-0.5 h-4 w-4 text-amber-300" /> : index === 1 ? <Gauge className="mt-0.5 h-4 w-4 text-amber-300" /> : <ArrowUpRight className="mt-0.5 h-4 w-4 text-emerald-300" />}
              <span>{item}</span>
            </div>
          ))}
          {hasMissingBasis && (
            <p className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-2 text-xs text-amber-100">
              Hinweis: Für diesen Standort ist noch keine Behandlungszimmer-Basis hinterlegt. Das Benchmarking nutzt in diesem Fall hinterlegte Stammdaten für die Vergleichslogik.
            </p>
          )}
        </div>
      </div>

      <div className="analysis-print-block min-w-0 rounded-xl border border-teal-200/20 bg-teal-400/10 p-4 text-sm leading-relaxed text-slate-200">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-semibold uppercase tracking-[0.18em] text-teal-200">Logik der Vergleichskacheln</p>
            <p className="mt-2">
              Die Werte werden als Index gegen den gewählten Vergleich berechnet. <strong>100 %</strong> entspricht dem Vergleichsniveau
              (z. B. Vergleichsniveau). Werte über 100 % bedeuten bei Umsatz-, Leistungs- und EBITDA-Kennzahlen eine bessere
              relative Performance; bei Forderungs- und Kostenquoten ist ein niedrigerer Wert besser, weil weniger Kapitalbindung
              bzw. geringere Kostenbelastung vorliegt.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-200 md:max-w-xs">
            Beispiel: 118 % bei „Gesamtumsatz je Zahnarzt-FTE“ heißt 18 % über Vergleich. 85 % bei „EBITDA je Behandlungszimmer“ heißt 15 % unter Vergleich.
          </div>
        </div>
      </div>

      <BenchmarkBasisTable
        rows={basisRows}
        siteName={selectedSite?.name ?? "Standort"}
        comparison={comparison}
        period={period}
      />

      <BenchmarkPatientBasisTable
        rows={patientBasisRows}
        siteName={selectedSite?.name ?? "Standort"}
        comparison={comparison}
        period={period}
      />

      <div className="analysis-print-block grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {benchmarkItems.map((item) => (
          <BenchmarkKpiCard key={item.label} {...item} />
        ))}
      </div>

      <div className="analysis-print-block grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {patientBenchmarkItems.map((item) => (
          <BenchmarkKpiCard key={item.label} {...item} />
        ))}
      </div>

      {viewMode === "Intern" && (
        <div className="analysis-print-block grid min-w-0 gap-3 rounded-xl border border-white/15 bg-slate-950/45 p-4 md:grid-cols-4">
          <Mini label={`${selectedSite?.name ?? "Standort"} Gesamtleistung`} value={eur(selectedSite?.gesamtleistung ?? 0)} />
          <Mini label={`${selectedSite?.name ?? "Standort"} PVS-Umsatz`} value={eur(selectedSite?.pvsUmsatz ?? 0)} />
          <Mini label={`${selectedSite?.name ?? "Standort"} EBITDA`} value={eur(selectedSite?.ebitda ?? 0)} />
          <Mini label={`${selectedSite?.name ?? "Standort"} Forderungen`} value={eur(selectedSite?.forderungen ?? 0)} />
        </div>
      )}

      <div className="analysis-print-page grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <BenchmarkPanel title="Peer-Auszug im Benchmarking">
          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <BenchmarkRanking
              title="Umsatz je Zahnarzt-FTE (Index)"
              rows={siteRows.map((row) => ({
                label: row.label,
                value: Math.round(indexFor(row.pvsPerDentist, numericAverage((item) => item.pvsPerDentist)) ?? 0),
                selected: row.site.id === selectedSite?.id
              }))}
              suffix="%"
              max={150}
            />
            <BenchmarkRanking
              title="EBITDA-Marge (%)"
              rows={siteRows.map((row) => ({
                label: row.label,
                value: row.ebitdaMargin,
                selected: row.site.id === selectedSite?.id
              }))}
              suffix="%"
              max={Math.max(30, ...siteRows.map((row) => row.ebitdaMargin))}
            />
          </div>
        </BenchmarkPanel>
        <BenchmarkPanel title="Kostenquoten im Peer-Auszug (%)">
          <BenchmarkHeatmap rows={siteRows} group={costGroup} viewMode={viewMode} selectedSiteId={selectedSite?.id} />
        </BenchmarkPanel>
      </div>

      <div className="analysis-print-page grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <BenchmarkPanel title={`Patienten- und Termin-Benchmarking | ${period}`} subtitle="Vergleich von Patientenvolumen, Termintreue und Kapazitätsnutzung im anonymisierten Peer-Auszug.">
          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <BenchmarkRanking
              title="Patienten je Behandlungszimmer (Index)"
              rows={patientSiteRows
                .map((row) => {
                  const value = indexFor(row.patientsPerRoom, patientAverage((item) => item.patientsPerRoom));
                  return value == null
                    ? null
                    : {
                        label: row.label,
                        value: Math.round(value),
                        selected: row.site.id === selectedSite?.id
                      };
                })
                .filter((row): row is { label: string; value: number; selected: boolean } => row != null)}
              suffix="%"
              max={150}
            />
            <BenchmarkRanking
              title="Terminwahrnehmungsquote"
              rows={patientSiteRows
                .filter((row) => row.attendanceRate != null)
                .map((row) => ({
                  label: row.label,
                  value: row.attendanceRate ?? 0,
                  selected: row.site.id === selectedSite?.id
                }))}
              suffix="%"
              max={100}
            />
          </div>
        </BenchmarkPanel>
        <BenchmarkPanel title="Patientenquoten im Peer-Auszug">
          <BenchmarkPatientHeatmap rows={patientSiteRows} viewMode={viewMode} selectedSiteId={selectedSite?.id} />
        </BenchmarkPanel>
      </div>

      <div className="analysis-print-page grid min-w-0 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <BenchmarkPanel title="EBITDA-Margen-Treiber" subtitle={`Warum liegt ${displaySiteName} ${marginGap >= 0 ? "über" : "unter"} dem Vergleichsniveau?`}>
          <div className="grid min-w-0 gap-4 md:grid-cols-[1fr_0.9fr]">
            <div className="space-y-2">
              {costDrivers.map((driver) => (
                <DriverLine key={driver.label} label={driver.label} value={driver.value} />
              ))}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
              <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border", marginGap >= 0 ? "border-emerald-300/40 text-emerald-300" : "border-amber-300/40 text-amber-300")}>
                <Info className="h-5 w-5" />
              </div>
              <p>
                Die EBITDA-Marge liegt {marginGap >= 0 ? "über" : "unter"} dem Vergleichsniveau.
                Die wichtigsten Treiber sind {costDrivers.slice(0, 2).map((item) => item.label).join(" und ")}.
              </p>
            </div>
          </div>
        </BenchmarkPanel>
        <BenchmarkPanel title="Standortleiter-Insights">
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            {summaryItems.map((item, index) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
                <div className={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border", index === 1 ? "border-amber-300/40 text-amber-300" : "border-emerald-300/40 text-emerald-300")}>
                  {index === 1 ? <Gauge className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </BenchmarkPanel>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-4 text-xs text-slate-400">
        <span>Orisus Zahnmedizin MVZ GmbH</span>
        <span>Internal Use Only</span>
        <span>Exportdatum: {new Date().toLocaleDateString("de-DE")}</span>
      </div>
    </section>
  );
}

function BenchmarkBasisTable({
  rows,
  siteName,
  comparison,
  period
}: {
  rows: { label: string; own: number | null; comparison: number | null; type: "currency" | "percent"; basis: string }[];
  siteName: string;
  comparison: string;
  period: string;
}) {
  const [open, setOpen] = useState(true);
  const formatBasisValue = (value: number | null, type: "currency" | "percent") => {
    if (value == null || !Number.isFinite(value)) return "n. v.";
    return type === "currency" ? eur(value) : pct(value);
  };

  return (
    <div className="analysis-print-block min-w-0 overflow-hidden rounded-xl border border-white/15 bg-slate-950/55 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        className="flex w-full flex-col gap-3 text-left md:flex-row md:items-end md:justify-between"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div>
          <span className="flex items-center gap-2 text-lg font-bold text-white">
            Eigene Rechenbasis | {siteName}
            <ChevronDown className={cn("h-4 w-4 text-teal-200 transition-transform", open && "rotate-180")} />
          </span>
          <p className="mt-1 text-sm text-slate-300">
            Absolute Werte, aus denen die Benchmarking-Indizes für {period} berechnet werden.
          </p>
        </div>
        <div className="rounded-lg border border-teal-200/20 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100">
          100 %-Vergleich: {comparison}
        </div>
      </button>
      {open && <div className="mt-4 max-w-full overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[680px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-white/10 bg-white/5 p-2 text-left text-slate-200">Kennzahl</th>
              <th className="border border-white/10 bg-white/5 p-2 text-left text-slate-200">Berechnungsbasis</th>
              <th className="border border-white/10 bg-white/5 p-2 text-right text-slate-200">Eigener Wert</th>
              <th className="border border-white/10 bg-white/5 p-2 text-right text-slate-200">100 %-Vergleichswert</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="border border-white/10 p-2 font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <span>{row.label}</span>
                    <BenchmarkBasisInfoButton
                      row={row}
                      siteName={siteName}
                      comparison={comparison}
                      period={period}
                      formatValue={formatBasisValue}
                      ownKey="own"
                    />
                  </div>
                </td>
                <td className="border border-white/10 p-2 text-slate-300">{row.basis}</td>
                <td className="border border-white/10 p-2 text-right font-bold text-teal-100">{formatBasisValue(row.own, row.type)}</td>
                <td className="border border-white/10 p-2 text-right font-semibold text-slate-100">{formatBasisValue(row.comparison, row.type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

function BenchmarkPatientBasisTable({
  rows,
  siteName,
  comparison,
  period
}: {
  rows: { label: string; value: number | null; comparison: number | null; type: "count" | "average" | "percent"; basis: string }[];
  siteName: string;
  comparison: string;
  period: string;
}) {
  const [open, setOpen] = useState(true);
  const formatPatientBasisValue = (value: number | null, type: "count" | "average" | "percent") => {
    if (value == null || !Number.isFinite(value)) return "n. v.";
    if (type === "percent") return pct(value);
    if (type === "average") return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
    return Math.round(value).toLocaleString("de-DE");
  };

  return (
    <div className="analysis-print-block min-w-0 overflow-hidden rounded-xl border border-teal-200/20 bg-teal-400/10 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        className="flex w-full flex-col gap-3 text-left md:flex-row md:items-end md:justify-between"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div>
          <span className="flex items-center gap-2 text-lg font-bold text-white">
            Patienten- & Terminbasis | {siteName}
            <ChevronDown className={cn("h-4 w-4 text-teal-200 transition-transform", open && "rotate-180")} />
          </span>
          <p className="mt-1 text-sm text-slate-300">
            Absolute Patientendaten und daraus abgeleitete Quoten für {period}. Dadurch ist klar, welche Werte hinter den Patienten-Benchmarks stehen.
          </p>
        </div>
        <div className="rounded-lg border border-teal-200/20 bg-slate-950/35 px-3 py-2 text-xs font-semibold text-teal-100">
          100 %-Vergleich: {comparison}
        </div>
      </button>
      {open && <div className="mt-4 max-w-full overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[680px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-white/10 bg-white/5 p-2 text-left text-slate-200">Kennzahl</th>
              <th className="border border-white/10 bg-white/5 p-2 text-left text-slate-200">Berechnungsbasis</th>
              <th className="border border-white/10 bg-white/5 p-2 text-right text-slate-200">Eigener Wert</th>
              <th className="border border-white/10 bg-white/5 p-2 text-right text-slate-200">100 %-Vergleichswert</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="border border-white/10 p-2 font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <span>{row.label}</span>
                    <BenchmarkBasisInfoButton
                      row={row}
                      siteName={siteName}
                      comparison={comparison}
                      period={period}
                      formatValue={formatPatientBasisValue}
                      ownKey="value"
                    />
                  </div>
                </td>
                <td className="border border-white/10 p-2 text-slate-300">{row.basis}</td>
                <td className="border border-white/10 p-2 text-right font-bold text-teal-100">{formatPatientBasisValue(row.value, row.type)}</td>
                <td className="border border-white/10 p-2 text-right font-semibold text-slate-100">{formatPatientBasisValue(row.comparison, row.type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

function BenchmarkBasisInfoButton<Row extends { label: string; comparison: number | null; basis: string; type: string }>({
  row,
  siteName,
  comparison,
  period,
  formatValue,
  ownKey
}: {
  row: Row & Record<string, number | string | null>;
  siteName: string;
  comparison: string;
  period: string;
  formatValue: (value: number | null, type: never) => string;
  ownKey: string;
}) {
  const [open, setOpen] = useState(false);
  const ownValue = typeof row[ownKey] === "number" ? row[ownKey] : null;
  const comparisonValue = row.comparison;
  const indexValue =
    ownValue != null && comparisonValue != null && Number.isFinite(ownValue) && Number.isFinite(comparisonValue) && comparisonValue !== 0
      ? (ownValue / comparisonValue) * 100
      : null;
  const deviationValue =
    ownValue != null && comparisonValue != null && Number.isFinite(ownValue) && Number.isFinite(comparisonValue)
      ? ownValue - comparisonValue
      : null;
  const type = row.type as never;

  return (
    <>
      <button
        type="button"
        aria-label={`${row.label} herleiten`}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-teal-200/30 bg-teal-400/10 text-teal-100 transition hover:bg-teal-300/20"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <InfoDialog title={`${row.label} | Herleitung`} onClose={() => setOpen(false)}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            <p className="font-semibold text-slate-950">Benchmarking-Basis</p>
            <p className="mt-1 text-slate-700">
              Standort: <strong>{siteName}</strong> · Zeitraum: <strong>{period}</strong> · Vergleich: <strong>{comparison}</strong>
            </p>
          </div>
          <InfoTextLine label="Berechnung / Quelle" value={row.basis} />
          <InfoTextLine label="Eigener Wert" value={formatValue(ownValue, type)} />
          <InfoTextLine label="100 %-Vergleichswert" value={formatValue(comparisonValue, type)} />
          <InfoTextLine
            label="Indexlogik"
            value={indexValue == null ? "Nicht berechenbar, weil Basis oder Vergleichswert fehlt." : `${formatValue(ownValue, type)} / ${formatValue(comparisonValue, type)} × 100 = ${pct(indexValue)}`}
            strong
          />
          <InfoTextLine
            label="Absolute Abweichung"
            value={deviationValue == null ? "n. v." : formatValue(deviationValue, type)}
          />
        </InfoDialog>
      )}
    </>
  );
}

function FilterShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="min-w-0 rounded-lg border border-white/15 bg-slate-950/50 p-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function BenchmarkKpiCard({
  label,
  selected,
  group,
  higherIsBetter,
  suffix = "%",
  unavailable = false
}: {
  label: string;
  selected: number | null;
  group: number | null;
  higherIsBetter: boolean;
  suffix?: string;
  unavailable?: boolean;
}) {
  const deviation = selected == null || group == null ? null : selected - group;
  const good = deviation == null ? false : higherIsBetter ? deviation >= 0 : deviation <= 0;
  const valueText = unavailable || selected == null ? "n. v." : `${selected.toLocaleString("de-DE", { maximumFractionDigits: 1 })}${suffix}`;
  const groupText = unavailable || selected == null || group == null ? "n. v." : `${group.toLocaleString("de-DE", { maximumFractionDigits: 1 })}${suffix}`;
  const deviationText = unavailable || deviation == null
    ? "Basis fehlt"
    : `${deviation > 0 ? "+" : ""}${deviation.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %-Pkt.`;
  return (
    <div className="min-w-0 rounded-xl border border-white/15 bg-slate-950/55 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-bold text-white">{label}</h3>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border", unavailable ? "border-slate-500/40 text-slate-400" : good ? "border-emerald-300/50 text-emerald-300" : "border-red-300/50 text-red-300")}>
          {unavailable ? <Info className="h-5 w-5" /> : good ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
        </div>
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-200">
        <div className="flex min-w-0 justify-between gap-3"><span className="min-w-0">Standortwert</span><strong className="shrink-0 text-right text-white">{valueText}</strong></div>
        <div className="flex min-w-0 justify-between gap-3"><span className="min-w-0">Vergleichsniveau</span><strong className="shrink-0 text-right text-white">{groupText}</strong></div>
        <div className="flex min-w-0 justify-between gap-3"><span className="min-w-0">Abweichung</span><strong className={cn("shrink-0 text-right", unavailable ? "text-slate-400" : good ? "text-emerald-300" : "text-red-300")}>{deviationText}</strong></div>
      </div>
    </div>
  );
}

function BenchmarkPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/15 bg-slate-950/55 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

function BenchmarkRanking({ title, rows, suffix, max }: { title: string; rows: { label: string; value: number; selected: boolean }[]; suffix: string; max: number }) {
  const sortedRows = [...rows].sort((a, b) => b.value - a.value);
  return (
    <div className="min-w-0">
      <p className="mb-3 text-sm font-semibold text-slate-100">{title}</p>
      <div className="space-y-2">
        {sortedRows.map((row) => (
          <div key={`${title}-${row.label}`} className="grid min-w-0 grid-cols-[minmax(68px,88px)_minmax(0,1fr)_52px] items-center gap-2 text-[11px] text-slate-200 sm:grid-cols-[88px_1fr_56px] sm:text-xs">
            <span className="truncate">{row.label}</span>
            <div className="min-w-0 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-3 rounded-full", row.selected ? "bg-cyan-400" : "bg-slate-400")} style={{ width: `${Math.max(4, Math.min(100, (row.value / (max || 1)) * 100))}%` }} />
            </div>
            <strong className="text-right text-white">{row.value.toLocaleString("de-DE", { maximumFractionDigits: 1 })}{suffix}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarkHeatmap({
  rows,
  group,
  viewMode,
  selectedSiteId
}: {
  rows: Array<{
    site: DashboardSite;
    label: string;
    materialquote: number;
    fremdlaborquote: number;
    personalquote: number;
    sonstigeKostenquote: number;
    gesamtkostenquote: number;
  }>;
  group: Record<string, number>;
  viewMode: "Standortleiter" | "Intern";
  selectedSiteId?: string;
}) {
  const columns = [
    ["materialquote", "Materialquote"],
    ["fremdlaborquote", "Fremdlaborquote"],
    ["personalquote", "Personalkostenquote"],
    ["sonstigeKostenquote", "Sonstige Kostenquote"],
    ["gesamtkostenquote", "Gesamtkostenquote"]
  ] as const;
  const heat = (value: number, basis: number) => {
    if (value <= basis) return "bg-emerald-500/60 text-white";
    if (value <= basis + 2) return "bg-amber-400/70 text-slate-950";
    return "bg-red-500/70 text-white";
  };
  return (
    <div className="max-w-full overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[560px] border-collapse text-[11px] sm:min-w-[620px] sm:text-xs">
        <thead>
          <tr>
            <th className="border border-white/10 bg-white/5 p-2 text-left text-slate-200">Benchmark-Peer</th>
            {columns.map(([, label]) => <th key={label} className="border border-white/10 bg-white/5 p-2 text-right text-slate-200">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.site.id} className={row.site.id === selectedSiteId ? "outline outline-1 outline-cyan-400/70" : ""}>
              <td className="border border-white/10 p-2 font-semibold text-white">{row.label}</td>
              {columns.map(([key]) => (
                <td key={key} className={cn("border border-white/10 p-2 text-right font-semibold", heat(row[key], group[key]))}>
                  {pct(row[key])}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="border border-white/10 bg-slate-900 p-2 font-bold text-white">Vergleichsniveau</td>
            {columns.map(([key]) => (
              <td key={key} className="border border-white/10 bg-slate-900 p-2 text-right font-bold text-white">{pct(group[key])}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BenchmarkPatientHeatmap({
  rows,
  viewMode,
  selectedSiteId
}: {
  rows: Array<{
    site: DashboardSite;
    label: string;
    treatedPatients: number | null;
    newPatients: number | null;
    patientsPerRoom: number | null;
    newPatientRate: number | null;
    attendanceRate: number | null;
    cancellationRate: number | null;
    hasPatientData: boolean;
  }>;
  viewMode: "Standortleiter" | "Intern";
  selectedSiteId?: string;
}) {
  const activeRows = rows.filter((row) => row.hasPatientData);
  const average = (selector: (row: (typeof rows)[number]) => number | null) => {
    const values = activeRows.map(selector).filter((value): value is number => value != null && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const group = {
    treatedPatients: average((row) => row.treatedPatients),
    patientsPerRoom: average((row) => row.patientsPerRoom),
    newPatientRate: average((row) => row.newPatientRate),
    attendanceRate: average((row) => row.attendanceRate),
    cancellationRate: average((row) => row.cancellationRate)
  };
  const columns = [
    ["treatedPatients", "Patienten", "count", true],
    ["patientsPerRoom", "Pat. / Zimmer", "average", true],
    ["newPatientRate", "Neupatientenquote", "percent", true],
    ["attendanceRate", "Wahrnehmungsquote", "percent", true],
    ["cancellationRate", "Ausfallquote", "percent", false]
  ] as const;
  const heat = (value: number | null, basis: number | null, higherIsBetter: boolean) => {
    if (value == null || basis == null || !Number.isFinite(value) || !basis) return "bg-slate-700/70 text-slate-200";
    const good = higherIsBetter ? value >= basis : value <= basis;
    const close = Math.abs(value - basis) <= Math.max(1, basis * 0.08);
    if (good) return "bg-emerald-500/60 text-white";
    if (close) return "bg-amber-400/70 text-slate-950";
    return "bg-red-500/70 text-white";
  };
  const formatHeatValue = (value: number | null | undefined, type: "count" | "average" | "percent") => {
    if (value == null || !Number.isFinite(value)) return "n. v.";
    if (type === "percent") return pct(value);
    if (type === "average") return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
    return Math.round(value).toLocaleString("de-DE");
  };

  return (
    <div className="max-w-full overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[620px] border-collapse text-[11px] sm:text-xs">
        <thead>
          <tr>
            <th className="border border-white/10 bg-white/5 p-2 text-left text-slate-200">Benchmark-Peer</th>
            {columns.map(([, label]) => (
              <th key={label} className="border border-white/10 bg-white/5 p-2 text-right text-slate-200">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.site.id} className={row.site.id === selectedSiteId ? "outline outline-1 outline-cyan-400/70" : ""}>
              <td className="border border-white/10 p-2 font-semibold text-white">{row.label}</td>
              {columns.map(([key, , type, higherIsBetter]) => (
                <td key={key} className={cn("border border-white/10 p-2 text-right font-semibold", heat(row[key], group[key], higherIsBetter))}>
                  {formatHeatValue(row[key], type)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="border border-white/10 bg-slate-900 p-2 font-bold text-white">Vergleichsniveau</td>
            {columns.map(([key, , type]) => (
              <td key={key} className="border border-white/10 bg-slate-900 p-2 text-right font-bold text-white">
                {formatHeatValue(group[key], type)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DriverLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
      <span className="font-semibold text-slate-100">{label}</span>
      <span className={value <= 0 ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
        {value > 0 ? "+" : ""}{value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %-Pkt. {value > 0 ? "über" : "unter"} Gruppe
      </span>
    </div>
  );
}

function Bwa({ importedData, sites = standorte, monthlyData = monthly }: { importedData?: ImportedDashboardData | null; sites?: DashboardSite[]; monthlyData?: typeof monthly }) {
  const chartPeriods = bwaPeriodOptionsFor(importedData);
  const [chartPeriod, setChartPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  useEffect(() => {
    if (!chartPeriods.includes(chartPeriod)) {
      setChartPeriod(defaultBwaPeriodFor(importedData));
    }
  }, [chartPeriod, chartPeriods, importedData]);
  const chartData = bwaChartDataForPeriod(importedData, monthlyData, chartPeriod);

  return (
    <section className="space-y-5">
      <PageTitle title="BWA" text="Konsolidierte BWA bis zum Cashflow gem. BWA, dynamisch nach Jahren und gesamter Periode auswählbar." />
      <BwaStatement title="Konsolidierte BWA bis Cashflow gem. BWA" importedData={importedData} />
      <div className="grid gap-5 xl:grid-cols-2">
        <EbitdaBridge sites={sites} />
        <CashflowBridge sites={sites} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <ChartCard title={`Gesamtleistungsentwicklung | ${chartPeriod}`} icon={FileBarChart}>
          <div className="mb-3">
            <Select value={chartPeriod} onChange={(event) => setChartPeriod(event.target.value)}>
              {chartPeriods.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" stroke="#0369a1" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <CostRatios sites={importedData ? sites.map((site) => filteredSiteForPeriod(site, importedData, chartPeriod)) : sites} periodLabel={chartPeriod === "Gesamte Periode" ? "seit Vertragsstart" : chartPeriod} />
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

  return <BridgeCard title="EBITDA-Brücke | seit Vertragsstart" rows={rows} />;
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
    { label: "CashFlow gem. BWA", value: metrics.cashflow, tone: metrics.cashflow >= 0 ? "green" : "red" }
  ];

  return <BridgeCard title="Cashflow-Brücke gem. BWA | seit Vertragsstart" rows={rows} />;
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

function Cashflow({
  sites = standorte,
  importedData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
}) {
  return (
    <section className="space-y-5">
      <PageTitle title="Cashflow" text="Cashflow gem. BWA sowie Bank-Cashflow aus Praxiseingängen, Kosten, Annuitäten und Umbuchungen MVZ." />
      <CashflowBlock sites={sites} />
      <BankCashflowControlTable sites={sites} importedData={importedData} />
    </section>
  );
}

function bankMovementValueForPeriod(row: ImportedBankMovementRow | undefined, period: string) {
  if (!row) return 0;
  const selection = selectedBwaPeriod(period);
  if (!selection.year) return row.contractValue;
  const months = selection.months?.length
    ? selection.months
    : Array.from({ length: 12 }, (_, index) => index + 1).filter((month) => row.hasValueByMonth[`${selection.year}-${month}`]);
  return months.reduce((sum, month) => sum + (row.valuesByMonth[`${selection.year}-${month}`] ?? 0), 0);
}

function bankMovementMonthlyValue(row: ImportedBankMovementRow | undefined, period: string, month: number) {
  if (!row) return null;
  const selection = selectedBwaPeriod(period);
  if (!selection.year) return null;
  const key = `${selection.year}-${month}`;
  return row.hasValueByMonth[key] ? row.valuesByMonth[key] ?? 0 : null;
}

function BankCashflowControlTable({ sites = standorte, importedData }: { sites?: DashboardSite[]; importedData?: ImportedDashboardData | null }) {
  const allRows = importedData?.bankMovementRows ?? [];
  const siteRows = allRows.filter((row) => row.siteId && row.siteId !== "konzern");
  const consolidatedRows = allRows.filter((row) => row.siteId === "konzern");
  const sitesWithRows = sortSitesByContractStart(
    sites.filter((site) => siteRows.some((row) => row.siteId === site.id && matchesBankMovementKey(row.label, "cashflow_gesamt_im_monat")))
  );
  const [siteFilter, setSiteFilter] = useState("gesamt");
  const selectedRows =
    siteFilter === "gesamt"
      ? consolidatedRows.length
        ? consolidatedRows
        : siteRows.filter((row) => sitesWithRows.some((site) => site.id === row.siteId))
      : siteRows.filter((row) => row.siteId === siteFilter);
  const availablePeriods = periodOptionsFromBankMovements(selectedRows);
  const [period, setPeriod] = useState(() => defaultPeriodFromOptions(availablePeriods));

  useEffect(() => {
    if (siteFilter !== "gesamt" && !sitesWithRows.some((site) => site.id === siteFilter)) {
      setSiteFilter("gesamt");
    }
  }, [siteFilter, sitesWithRows]);

  useEffect(() => {
    if (!availablePeriods.includes(period)) setPeriod(defaultPeriodFromOptions(availablePeriods));
  }, [availablePeriods, period]);

  if (!allRows.length) {
    return (
      <Card className="p-4">
        <h2 className="font-bold">Bankbewegungen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nach dem nächsten bestätigten Excel-Import werden hier die Bank-/Geldbewegungen aus Input_Finanzen dargestellt.
        </p>
      </Card>
    );
  }

  const selection = selectedBwaPeriod(period);
  const visibleMonths = monthSelectionForPeriod(period);
  const rowsByKey = (key: string) => selectedRows.filter((row) => matchesBankMovementKey(row.label, key));
  const valueForKey = (key: string, snapshot = false) => {
    const rows = rowsByKey(key);
    if (snapshot) return snapshotValueForRows(rows, period, visibleMonths);
    return rows.reduce((sum, row) => sum + bankMovementValueForPeriod(row, period), 0);
  };
  const monthlyValueForKey = (key: string, month: number) => {
    const rows = rowsByKey(key);
    if (!selection.year || !rows.length) return null;
    let hasValue = false;
    const value = rows.reduce((sum, row) => {
      const keyForMonth = `${selection.year}-${month}`;
      if (!row.hasValueByMonth[keyForMonth]) return sum;
      hasValue = true;
      return sum + (row.valuesByMonth[keyForMonth] ?? 0);
    }, 0);
    return hasValue ? value : null;
  };
  const contractValueForKey = (key: string) => rowsByKey(key).reduce((sum, row) => sum + row.contractValue, 0);
  const activeMonthsForKey = (key: string) =>
    selection.year
      ? Array.from(visibleMonths).filter((month) => rowsByKey(key).some((row) => row.hasValueByMonth[`${selection.year}-${month}`]))
      : [];

  const bankDetailRows = [
    { label: "Geldeingang Bank gesamt", key: "geldeingang_bank_gesamt", emphasis: true },
    { label: "davon Praxisumsatz", key: "davon_praxisumsatz", indent: true },
    { label: "davon sonstiges (Erstattungen etc)", key: "davon_sonstiges_erstattungen_etc", indent: true },
    { label: "Geldausgang Bank inkl. Kredit", key: "geldausgang_bank_inkl_kredit", emphasis: true },
    { label: "davon Praxisausgaben", key: "davon_praxisausgaben", indent: true },
    { label: "davon Tilgung + Zins", key: "davon_tilgung_zins", indent: true },
    { label: "davon Umbuchungen an Orisus ZMVZ", key: "davon_umbuchungen_an_orisus_zmvz", indent: true },
    { label: "Bank-Cashflow vor Intercompany", key: "cashflow_vor_intercompany", emphasis: true },
    { label: "Bank-Cashflow gesamt im Monat", key: "cashflow_gesamt_im_monat", emphasis: true },
    { label: "Kontostand Monatsende", key: "kontostand_monatsende", emphasis: true, snapshot: true }
  ].map((definition) => {
    const total = valueForKey(definition.key, definition.snapshot);
    const activeMonths = activeMonthsForKey(definition.key);
    const average = definition.snapshot ? 0 : activeMonths.length ? total / activeMonths.length : rowsByKey(definition.key).reduce((sum, row) => sum + row.averageContract, 0);
    return { ...definition, total, average, contractValue: contractValueForKey(definition.key) };
  });

  const cashflowTotal = valueForKey("cashflow_gesamt_im_monat");
  const eingangTotal = valueForKey("geldeingang_bank_gesamt");
  const ausgangTotal = valueForKey("geldausgang_bank_inkl_kredit");
  const kontostandTotal = valueForKey("kontostand_monatsende", true);
  const selectedSiteLabel = siteFilter === "gesamt" ? "Konsolidiert" : sitesWithRows.find((site) => site.id === siteFilter)?.name ?? "Standort";

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="table-head space-y-3 p-4 text-white">
          <div>
            <h2 className="text-xl font-bold">Bankbewegungen | {selectedSiteLabel} | {performancePeriodLabel(period)}</h2>
            <p className="mt-1 text-sm text-white/75">
              Vollständige Bank-Cashflow-Tabelle aus Input_Finanzen: Geldeingänge, Geldausgänge, Bank-Cashflow und Kontostände.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_minmax(220px,320px)]">
            <Select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
              <option value="gesamt">Gesamt / konsolidiert</option>
              {sitesWithRows.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
            <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {availablePeriods.map((option) => (
                <option key={option} value={option}>
                  {performancePeriodLabel(option)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
          <Mini label="Geldeingang Zeitraum" value={eur(eingangTotal)} />
          <Mini label="Geldausgang Zeitraum" value={eur(ausgangTotal)} />
          <Mini label="Bank-Cashflow Zeitraum" value={eur(cashflowTotal)} />
          <Mini label="Kontostand Monatsende" value={eur(kontostandTotal)} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-64 border-b border-r border-border table-subhead p-2 text-left text-white">Position</th>
              {bwaMonths.map((month) => (
                <th key={month} className="min-w-28 border-b border-r border-border table-subhead p-2 text-white">{month}</th>
              ))}
              <th className="min-w-32 border-b border-r border-border table-subhead p-2 text-white">Gesamt</th>
              <th className="min-w-32 border-b border-r border-border table-subhead p-2 text-white">Ø Monat</th>
              <th className="min-w-40 border-b border-r border-border table-subhead p-2 text-white">Gesamte Vertragsperiode</th>
            </tr>
          </thead>
          <tbody>
            {bankDetailRows.map((entry) => (
              <tr key={entry.label} className={cn(entry.emphasis && "summary-row")}>
                <TableCell strong={entry.emphasis} summary={entry.emphasis}>
                  <span className={cn("block text-left", entry.indent && "pl-4 font-medium text-muted-foreground")}>{entry.label}</span>
                </TableCell>
                {bwaMonths.map((month, index) => {
                  const value = monthlyValueForKey(entry.key, index + 1);
                  const visible = !selection.year || visibleMonths.has(index + 1);
                  return (
                    <TableCell key={`${entry.label}-${month}`} summary={entry.emphasis} tone={(value ?? 0) < 0 ? "red" : undefined}>
                      {visible && value != null ? eur(value) : ""}
                    </TableCell>
                  );
                })}
                <TableCell strong summary={entry.emphasis} tone={entry.total < 0 ? "red" : undefined}>{eur(entry.total)}</TableCell>
                <TableCell strong summary={entry.emphasis} tone={entry.average < 0 ? "red" : undefined}>{entry.snapshot ? "" : eur(entry.average)}</TableCell>
                <TableCell strong summary={entry.emphasis} tone={entry.contractValue < 0 ? "red" : undefined}>{eur(entry.contractValue)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function snapshotValueForRows(rows: ImportedBankMovementRow[], period: string, visibleMonths: Set<number>) {
  if (!rows.length) return 0;
  const selection = selectedBwaPeriod(period);
  if (!selection.year) return rows.reduce((sum, row) => sum + row.contractValue, 0);
  const latestMonth = Array.from(visibleMonths)
    .filter((month) => rows.some((row) => row.hasValueByMonth[`${selection.year}-${month}`]))
    .at(-1);
  if (!latestMonth) return rows.reduce((sum, row) => sum + row.contractValue, 0);
  return rows.reduce((sum, row) => sum + (row.valuesByMonth[`${selection.year}-${latestMonth}`] ?? 0), 0);
}

function SiteBankMovementDetail({ site, importedData }: { site: DashboardSite; importedData?: ImportedDashboardData | null }) {
  const rows = (importedData?.bankMovementRows ?? []).filter((row) => row.siteId === site.id);

  if (!rows.length) {
    return (
      <Card className="p-4">
        <h2 className="font-bold">Bankbewegungen {site.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Für diesen Standort wurden im bestätigten Excel-Import noch keine Bank-/Geldbewegungen erkannt.
        </p>
      </Card>
    );
  }

  return <SiteBankCashflowCard site={site} rows={rows} variant="detail" />;
}

function SiteBankCashflowCard({
  site,
  rows,
  variant = "summary"
}: {
  site: DashboardSite;
  rows: ImportedBankMovementRow[];
  variant?: "summary" | "detail";
}) {
  const availablePeriods = periodOptionsFromBankMovements(rows);
  const [period, setPeriod] = useState(() => defaultPeriodFromOptions(availablePeriods));
  useEffect(() => {
    if (!availablePeriods.includes(period)) setPeriod(defaultPeriodFromOptions(availablePeriods));
  }, [availablePeriods, period]);

  const selection = selectedBwaPeriod(period);
  const visibleMonths = monthSelectionForPeriod(period);
  const cashflowRow = rows.find((row) => matchesBankMovementKey(row.label, "cashflow_gesamt_im_monat"));
  const preIntercompanyRow = rows.find((row) => matchesBankMovementKey(row.label, "cashflow_vor_intercompany"));
  const kontostandRow = rows.find((row) => matchesBankMovementKey(row.label, "kontostand_monatsende"));
  const selectedCashflow = bankMovementValueForPeriod(cashflowRow, period);
  const selectedPreIntercompany = bankMovementValueForPeriod(preIntercompanyRow, period);
  const selectedMonthsFor = (row?: ImportedBankMovementRow) =>
    selection.year ? Array.from(visibleMonths).filter((month) => row?.hasValueByMonth[`${selection.year}-${month}`]) : [];
  const selectedMonths = selectedMonthsFor(cashflowRow);
  const selectedAverage = selectedMonths.length ? selectedCashflow / selectedMonths.length : cashflowRow?.averageContract ?? 0;
  const latestKontostand = selection.year
    ? Array.from(visibleMonths)
        .map((month) => bankMovementMonthlyValue(kontostandRow, period, month))
        .filter((value): value is number => value != null)
        .at(-1) ?? kontostandRow?.contractValue ?? 0
    : kontostandRow?.contractValue ?? 0;

  const rowByKey = (key: string) => rows.find((row) => matchesBankMovementKey(row.label, key));
  const bankDetailRows = [
    { label: "Geldeingang Bank gesamt", key: "geldeingang_bank_gesamt", emphasis: true },
    { label: "davon Praxisumsatz", key: "davon_praxisumsatz", indent: true },
    { label: "davon sonstiges (Erstattungen etc)", key: "davon_sonstiges_erstattungen_etc", indent: true },
    { label: "Geldausgang Bank inkl. Kredit", key: "geldausgang_bank_inkl_kredit", emphasis: true },
    { label: "davon Praxisausgaben", key: "davon_praxisausgaben", indent: true },
    { label: "davon Tilgung + Zins", key: "davon_tilgung_zins", indent: true },
    { label: "davon Umbuchungen an Orisus ZMVZ", key: "davon_umbuchungen_an_orisus_zmvz", indent: true },
    { label: "Bank-Cashflow vor Intercompany", key: "cashflow_vor_intercompany", emphasis: true },
    { label: "Bank-Cashflow gesamt im Monat", key: "cashflow_gesamt_im_monat", emphasis: true },
    { label: "Kontostand Monatsende", key: "kontostand_monatsende", emphasis: true, snapshot: true }
  ].map((definition) => {
    const row = rowByKey(definition.key);
    const total = definition.snapshot
      ? latestKontostand
      : bankMovementValueForPeriod(row, period);
    const rowMonths = selectedMonthsFor(row);
    const average = definition.snapshot
      ? row?.averageMonth ?? 0
      : rowMonths.length
        ? total / rowMonths.length
        : row?.averageContract ?? 0;
    return { ...definition, row, total, average };
  });

  const summaryRowsToDisplay = [
    { label: "Bank-Cashflow gesamt im Monat", row: cashflowRow, total: selectedCashflow, average: selectedAverage, emphasis: true },
    { label: "Bank-Cashflow vor Intercompany", row: preIntercompanyRow, total: selectedPreIntercompany, average: selectedMonths.length ? selectedPreIntercompany / selectedMonths.length : preIntercompanyRow?.averageContract ?? 0 },
    { label: "Kontostand Monatsende", row: kontostandRow, total: latestKontostand, average: kontostandRow?.averageMonth ?? 0, snapshot: true }
  ];
  const rowsToDisplay = variant === "detail" ? bankDetailRows : summaryRowsToDisplay;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="table-head flex flex-col gap-3 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">{site.name} | {variant === "detail" ? "Bankbewegungen" : "Bank-Cashflow"} | {performancePeriodLabel(period)}</span>
          <Select className="w-full sm:w-64" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {availablePeriods.map((option) => (
              <option key={option} value={option}>
                {performancePeriodLabel(option)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-3">
          <Mini label="Bank-Cashflow Zeitraum" value={eur(selectedCashflow)} />
          <Mini label="Ø Monat" value={eur(selectedAverage)} />
          <Mini label="Kontostand Monatsende" value={eur(latestKontostand)} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-border table-subhead p-2 text-left text-white">Position</th>
              {bwaMonths.map((month) => (
                <th key={month} className="border-b border-r border-border table-subhead p-2 text-white">{month}</th>
              ))}
              <th className="border-b border-r border-border table-subhead p-2 text-white">Gesamt</th>
              <th className="border-b border-r border-border table-subhead p-2 text-white">Ø Monat</th>
              <th className="border-b border-r border-border table-subhead p-2 text-white">Gesamte Vertragsperiode</th>
            </tr>
          </thead>
          <tbody>
            {rowsToDisplay.map((entry) => (
              <tr key={entry.label} className={cn(entry.emphasis && "summary-row")}>
                <TableCell strong={entry.emphasis} summary={entry.emphasis}>
                  <span className={cn("block text-left", "indent" in entry && entry.indent && "pl-4 font-medium text-muted-foreground")}>{entry.label}</span>
                </TableCell>
                {bwaMonths.map((month, index) => {
                  const value = bankMovementMonthlyValue(entry.row, period, index + 1);
                  const visible = !selection.year || visibleMonths.has(index + 1);
                  return (
                    <TableCell key={`${entry.label}-${month}`} summary={entry.emphasis} tone={(value ?? 0) < 0 ? "red" : undefined}>
                      {visible && value != null ? eur(value) : ""}
                    </TableCell>
                  );
                })}
                <TableCell strong summary={entry.emphasis} tone={entry.total < 0 ? "red" : undefined}>{eur(entry.total)}</TableCell>
                <TableCell strong summary={entry.emphasis} tone={entry.average < 0 ? "red" : undefined}>{entry.snapshot ? "" : eur(entry.average)}</TableCell>
                <TableCell strong summary={entry.emphasis} tone={(entry.row?.contractValue ?? 0) < 0 ? "red" : undefined}>{eur(entry.row?.contractValue ?? 0)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function BankKpiTile({
  label,
  value,
  detail,
  status,
  emphasis = false,
  info
}: {
  label: string;
  value: string;
  detail: string;
  status: Status;
  emphasis?: boolean;
  info: React.ReactNode;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className={cn("relative min-h-[9.5rem] bg-[#143f4d] p-4 text-white", emphasis && "bg-[#0f5160]")}>
      <div className="flex items-start justify-between gap-3">
        <p className="pr-14 text-xs font-bold uppercase tracking-wide text-slate-200">{label}</p>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            aria-label={`${label} erklären`}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 bg-white/10 text-slate-100 transition hover:border-teal-200 hover:bg-teal-300/20"
            onClick={() => setInfoOpen((open) => !open)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <StatusDot status={status} label="" />
        </div>
      </div>
      <p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-200">{detail}</p>
      {infoOpen ? (
        <InfoDialog title={label} onClose={() => setInfoOpen(false)}>
          {info}
        </InfoDialog>
      ) : null}
    </div>
  );
}

function BankAnalysisCard({
  title,
  status,
  children
}: {
  title: string;
  status: Status;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        <StatusDot status={status} />
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

function bankPersonnelSummary(personalData?: PersonalDashboardData | null) {
  if (!personalData) return null;
  const active = personalData.employees.filter((employee) => employee.status.toLowerCase() === "aktiv");
  const latestSicknessYear =
    personalData.sicknessEntries.reduce((latest, entry) => Math.max(latest, entry.year), 0) || new Date().getFullYear();
  const sicknessDays = personalData.sicknessEntries
    .filter((entry) => entry.year === latestSicknessYear)
    .reduce((sum, entry) => sum + entry.days, 0);
  const fte = active.reduce((sum, employee) => sum + employee.weeklyHours / 40, 0);
  const dentists = active.filter((employee) => employee.isDentist).length;
  return {
    activeCount: active.length,
    fte,
    dentists,
    sicknessYear: latestSicknessYear,
    sicknessDays,
    sicknessDaysPerFte: fte ? sicknessDays / fte : 0
  };
}

function bankPersonnelBySite(personalData?: PersonalDashboardData | null) {
  if (!personalData) return [];
  const latestSicknessYear =
    personalData.sicknessEntries.reduce((latest, entry) => Math.max(latest, entry.year), 0) || new Date().getFullYear();
  const sites = personalData.settings.sites.length ? personalData.settings.sites : uniqueSortedText(personalData.employees.map((employee) => employee.site));
  return sites.map((site) => {
    const active = personalData.employees.filter((employee) => employee.site === site && employee.status.toLowerCase() === "aktiv");
    const fte = active.reduce((sum, employee) => sum + employee.weeklyHours / 40, 0);
    const sicknessDays = personalData.sicknessEntries
      .filter((entry) => entry.site === site && entry.year === latestSicknessYear)
      .reduce((sum, entry) => sum + entry.days, 0);
    return {
      site,
      active: active.length,
      fte,
      dentists: active.filter((employee) => employee.isDentist).length,
      sicknessDays,
      sicknessDaysPerFte: fte ? sicknessDays / fte : 0
    };
  });
}

function statusForLower(value: number, green: number, yellow: number): Status {
  if (value <= green) return "green";
  if (value <= yellow) return "yellow";
  return "red";
}

function statusForHigher(value: number, green: number, yellow: number): Status {
  if (value >= green) return "green";
  if (value >= yellow) return "yellow";
  return "red";
}

function Bankenreporting({
  sites = standorte,
  monthlyData = monthly,
  importedData,
  personalData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
  personalData?: PersonalDashboardData | null;
}) {
  const rules = useKpiRules();
  const availablePeriods = bwaPeriodOptionsFor(importedData);
  const [bankChartPeriod, setBankChartPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  const [bankTablePeriod, setBankTablePeriod] = useState(() => defaultBwaPeriodFor(importedData));
  useEffect(() => {
    if (!availablePeriods.includes(bankChartPeriod)) {
      setBankChartPeriod(defaultBwaPeriodFor(importedData));
    }
    if (!availablePeriods.includes(bankTablePeriod)) {
      setBankTablePeriod(defaultBwaPeriodFor(importedData));
    }
  }, [availablePeriods, bankChartPeriod, bankTablePeriod, importedData]);
  const bankChartData = bwaChartDataForPeriod(importedData, monthlyData, bankChartPeriod);
  const bankTableSites = importedData ? sites.map((site) => filteredSiteForPeriod(site, importedData, bankTablePeriod)) : sites;
  const bankPeriodMetrics = cfoMetrics(bankTableSites, bankChartData, rules);
  const receivablesRatio = bankPeriodMetrics.gesamtleistung ? (bankPeriodMetrics.forderungen / bankPeriodMetrics.gesamtleistung) * 100 : 0;
  const cashflowConversion = bankPeriodMetrics.ebitda ? (bankPeriodMetrics.cashflow / bankPeriodMetrics.ebitda) * 100 : 0;
  const leverageRunRate = bankPeriodMetrics.runRateEbitda ? bankPeriodMetrics.restschuld / bankPeriodMetrics.runRateEbitda : 0;
  const repaymentProgress = bankPeriodMetrics.aufgenommen ? (bankPeriodMetrics.getilgt / bankPeriodMetrics.aufgenommen) * 100 : 0;
  const personnelSummary = bankPersonnelSummary(personalData);
  const personnelBySite = bankPersonnelBySite(personalData);
  const activeSites = sortSitesByContractStart(bankTableSites).filter((site) => site.gesamtleistung > 0);
  const criticalSites = activeSites.filter((site) => {
    const siteReceivablesRatio = site.gesamtleistung ? (site.forderungen / site.gesamtleistung) * 100 : 0;
    return (
      statusByRule(site.ebitdaMarge, rules.ebitda_marge) === "red" ||
      statusByRule(site.cashflow, rules.cashflow_bwa) === "red" ||
      statusByRule(siteReceivablesRatio, rules.offene_forderungen) === "red" ||
      statusByRule(boardCostRatio(site), rules.kostenquote) === "red"
    );
  });
  const bankKpis: Array<{ label: string; value: string; detail: string; status: Status; emphasis?: boolean; info: React.ReactNode }> = [
    {
      label: "Kapitaldienstfähigkeit",
      value: `${bankPeriodMetrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`,
      detail: "EBITDA / Tilgung + Zins",
      status: statusByRule(bankPeriodMetrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit),
      emphasis: true,
      info: <p>Zeigt, wie oft das EBITDA den Kapitaldienst deckt. Formel: EBITDA der ausgewählten Periode geteilt durch Tilgung plus Zins. Für Banken ist das die zentrale Tragfähigkeitskennzahl.</p>
    },
    {
      label: "Net Debt / Run-Rate EBITDA",
      value: `${leverageRunRate.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`,
      detail: "Restschuld im Verhältnis zur Ergebnis-Run-Rate",
      status: statusForLower(leverageRunRate, 2.5, 3.5),
      emphasis: true,
      info: <p>Setzt die aktuelle Restschuld ins Verhältnis zur EBITDA-Run-Rate. Formel: Restschuld geteilt durch annualisiertes EBITDA. Je niedriger der Wert, desto besser ist die Entschuldungsfähigkeit.</p>
    },
    {
      label: "Cashflow-Konversion",
      value: pct(cashflowConversion),
      detail: "Cashflow gem. BWA / EBITDA",
      status: statusForHigher(cashflowConversion, 50, 25),
      emphasis: true,
      info: <p>Zeigt, welcher Anteil des EBITDA als Cashflow gem. BWA ankommt. Formel: Cashflow gem. BWA geteilt durch EBITDA. Niedrige Werte weisen auf Tilgung, Investitionen, Forderungsaufbau oder Umbuchungen hin.</p>
    },
    {
      label: "Forderungsquote",
      value: pct(receivablesRatio),
      detail: "offene Forderungen / Gesamtleistung",
      status: statusByRule(receivablesRatio, rules.offene_forderungen),
      emphasis: true,
      info: <p>Misst die Kapitalbindung in offenen Forderungen. Formel: offene Forderungen geteilt durch Gesamtleistung der ausgewählten Periode. Für Banken ist eine hohe Quote ein Working-Capital-Risiko.</p>
    },
    {
      label: "Gesamtleistung",
      value: eur(bankPeriodMetrics.gesamtleistung),
      detail: performancePeriodLabel(bankTablePeriod),
      status: "green",
      info: <p>Summe der Gesamtleistung über alle berücksichtigten Standorte im ausgewählten Zeitraum. Die Werte kommen aus dem bestätigten CFO-/BWA-Import.</p>
    },
    {
      label: "EBITDA / Marge",
      value: `${eur(bankPeriodMetrics.ebitda, true)} / ${pct(bankPeriodMetrics.ebitdaMarge)}`,
      detail: "Ergebnisqualität der Periode",
      status: statusByRule(bankPeriodMetrics.ebitdaMarge, rules.ebitda_marge),
      info: <p>EBITDA absolut und als Marge. Formel Marge: EBITDA geteilt durch Gesamtleistung. Die Kennzahl zeigt, wie viel Ergebnisqualität aus der Leistung entsteht.</p>
    },
    {
      label: "Cashflow gem. BWA",
      value: eur(bankPeriodMetrics.cashflow),
      detail: "nach Tilgung, Investitionen, Umbuchungen",
      status: statusByRule(bankPeriodMetrics.cashflow, rules.cashflow_bwa),
      info: <p>Cashflow nach der BWA-Brücke. Enthält vorläufiges Ergebnis plus Abschreibungen abzüglich Investitionen, Tilgung, Umbuchungen und weitere Cashflow-Adjustments.</p>
    },
    {
      label: "Kostenquote",
      value: pct(bankPeriodMetrics.kostenquote),
      detail: "Material, Fremdlabor, Personal, sonstige Kosten",
      status: statusByRule(bankPeriodMetrics.kostenquote, rules.kostenquote),
      info: <p>Operative Kostenbelastung im Verhältnis zur Gesamtleistung. Enthalten sind Materialquote, Fremdlaborquote, Personalkostenquote und sonstige operative Kostenquote.</p>
    },
    {
      label: "Restschuld",
      value: eur(bankPeriodMetrics.restschuld),
      detail: `${pct(repaymentProgress)} der aufgenommenen Darlehen getilgt`,
      status: statusForHigher(repaymentProgress, 20, 8),
      info: <p>Aktuell offene Darlehensrestschuld über die Gruppe. Der Prozentwert zeigt den Tilgungsfortschritt: bisherige Tilgung geteilt durch ursprünglich aufgenommenes Fremdkapital.</p>
    },
    {
      label: "Kapitaldienst",
      value: eur(bankPeriodMetrics.kapitaldienst),
      detail: `${eur(bankPeriodMetrics.tilgung, true)} Tilgung / ${eur(bankPeriodMetrics.zins, true)} Zins`,
      status: statusByRule(bankPeriodMetrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit),
      info: <p>Summe aus Tilgung und Zins im betrachteten Datenstand. Diese Größe wird gegen EBITDA gespiegelt, um die Kapitaldienstfähigkeit zu berechnen.</p>
    },
    {
      label: "Personal-FTE",
      value: personnelSummary ? personnelSummary.fte.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : "n. v.",
      detail: personnelSummary ? `${personnelSummary.activeCount} aktive MA | ${personnelSummary.dentists} Zahnärzte` : "Personalimport noch nicht aktiv",
      status: personnelSummary ? "green" : "yellow",
      info: <p>FTE der aktiven Mitarbeiter aus dem Personalimport. Grundlage sind aktive Mitarbeiter und vertragliche Wochenstunden, um die operative Kapazität der Gruppe einzuordnen.</p>
    },
    {
      label: "Krankheit je FTE",
      value: personnelSummary ? personnelSummary.sicknessDaysPerFte.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : "n. v.",
      detail: personnelSummary ? `${personnelSummary.sicknessDays} Tage ${personnelSummary.sicknessYear}` : "Personalimport noch nicht aktiv",
      status: personnelSummary ? statusForLower(personnelSummary.sicknessDaysPerFte, 8, 14) : "yellow",
      info: <p>Krankheitstage je FTE aus dem Personalimport. Formel: Krankheitstage im ausgewählten Jahr geteilt durch aktive FTE. Niedrigere Werte sprechen für stabilere operative Kapazität.</p>
    }
  ];

  return (
    <section className="space-y-5">
      <PageTitle
        title="Bankenreporting"
        text="Kreditgeber-Sicht auf Rückzahlungsfähigkeit, Cashflow-Qualität, Working Capital, Margen, Standortstreuung und operative Stabilität."
      />
      <Card className="grid gap-px overflow-hidden table-grid-bg md:grid-cols-2 xl:grid-cols-4">
        {bankKpis.map((kpi) => (
          <BankKpiTile key={kpi.label} {...kpi} />
        ))}
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-bold">Kreditgeber-Einschätzung | Management View</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Banken achten primär auf nachhaltige Rückzahlungsfähigkeit, freie Liquidität nach Kapitaldienst,
              Working-Capital-Disziplin, stabile Margen und eine beherrschbare Standortstreuung.
            </p>
          </div>
          <Badge tone={criticalSites.length ? "yellow" : "green"}>{criticalSites.length ? `${criticalSites.length} Fokus-Standort(e)` : "Bankenfähig stabil"}</Badge>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <BankAnalysisCard title="Rückzahlungsfähigkeit" status={statusByRule(bankPeriodMetrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit)}>
            Die Kapitaldienstfähigkeit liegt bei <strong>{bankPeriodMetrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x</strong>.
            Kritisch aus Bankensicht wäre ein Absinken unter den Covenant-Puffer, weil dann Tilgung und Zins nicht mehr komfortabel aus EBITDA gedeckt sind.
          </BankAnalysisCard>
          <BankAnalysisCard title="Cashflow-Qualität" status={statusForHigher(cashflowConversion, 50, 25)}>
            Die Cashflow-Konversion beträgt <strong>{pct(cashflowConversion)}</strong>. Je stärker EBITDA in Bank-Cashflow und Kontostand übersetzt wird,
            desto belastbarer wirkt die Gruppe für weitere Finanzierungslinien.
          </BankAnalysisCard>
          <BankAnalysisCard title="Working Capital / Forderungen" status={statusByRule(receivablesRatio, rules.offene_forderungen)}>
            Forderungen liegen bei <strong>{eur(bankPeriodMetrics.forderungen, true)}</strong> bzw. <strong>{pct(receivablesRatio)}</strong> der Gesamtleistung.
            Eine hohe Forderungsquote ist für Banken ein Frühwarnsignal, weil Ergebnisqualität dann nicht vollständig liquiditätswirksam ist.
          </BankAnalysisCard>
          <BankAnalysisCard title="Standortstreuung & Integrationsrisiko" status={criticalSites.length ? "yellow" : "green"}>
            {criticalSites.length
              ? `Fokus auf ${criticalSites.map((site) => site.name).join(", ")}: dort treffen Margen-, Kosten-, Cashflow- oder Forderungsthemen zusammen.`
              : "Keine rote Standortkonzentration im aktuellen Datenstand. Die Gruppe wirkt diversifiziert und steuerbar."}
          </BankAnalysisCard>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard
          title={`Gesamtleistung, EBITDA, Soll-EBITDA & Cashflow | ${performancePeriodLabel(bankChartPeriod)}`}
          icon={TrendingUp}
          action={
            <Select
              value={bankChartPeriod}
              onChange={(event) => setBankChartPeriod(event.target.value)}
              className="w-full min-w-52 sm:w-auto"
            >
              {availablePeriods.map((option) => (
                <option key={option} value={option}>
                  {performancePeriodLabel(option)}
                </option>
              ))}
            </Select>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={bankChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" name="EBITDA" stroke="#0369a1" strokeWidth={3} />
              <Line dataKey="zielEbitdaKaufvertrag" name="Soll-EBITDA gem. Kaufvertrag" stroke="#f59e0b" strokeDasharray="7 5" strokeWidth={3} dot={false} />
              <Line dataKey="cashflow" name="Cashflow gem. BWA" stroke="#64748b" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="p-4">
          <h2 className="font-bold">Covenant- und Risikoprofil | {performancePeriodLabel(bankTablePeriod)}</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Kapitaldienstfähigkeit", `${bankPeriodMetrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`, statusByRule(bankPeriodMetrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit)],
              ["Net Debt / Run-Rate EBITDA", `${leverageRunRate.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`, statusForLower(leverageRunRate, 2.5, 3.5)],
              ["Cashflow-Konversion", pct(cashflowConversion), statusForHigher(cashflowConversion, 50, 25)],
              ["Forderungsquote", pct(receivablesRatio), statusByRule(receivablesRatio, rules.offene_forderungen)],
              ["Kostenquote", pct(bankPeriodMetrics.kostenquote), statusByRule(bankPeriodMetrics.kostenquote, rules.kostenquote)]
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

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title={`Kosten- und Margenqualität je Standort | ${performancePeriodLabel(bankTablePeriod)}`} icon={BarChart3}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={activeSites.map((site) => ({ name: site.name, marge: site.ebitdaMarge, kostenquote: boardCostRatio(site), personal: site.personalquote ?? 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => pct(Number(value))} />
              <Bar dataKey="marge" name="EBITDA-Marge" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Bar dataKey="kostenquote" name="Gesamtkostenquote" fill="#0891b2" radius={[5, 5, 0, 0]} />
              <Bar dataKey="personal" name="Personalkostenquote" fill="#f59e0b" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Forderungen und Restschuld je Standort" icon={FileBarChart}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={activeSites.map((site) => ({ name: site.name, forderungen: site.forderungen, restschuld: site.darlehen.restschuld }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={(value) => eur(Number(value), true)} />
              <YAxis type="category" dataKey="name" width={88} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => eur(Number(value))} />
              <Bar dataKey="forderungen" name="Forderungen" fill="#0f766e" radius={[0, 5, 5, 0]} />
              <Bar dataKey="restschuld" name="Restschuld" fill="#64748b" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Standort-Risikomatrix für Banken | {performancePeriodLabel(bankTablePeriod)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Kreditrelevante Standortbeiträge: Ergebnisqualität, Liquidität, Working Capital und Kostenstruktur.</p>
          </div>
          <Select
            className="w-full sm:w-64"
            value={bankTablePeriod}
            onChange={(event) => setBankTablePeriod(event.target.value)}
          >
            {availablePeriods.map((option) => (
              <option key={option} value={option}>
                {performancePeriodLabel(option)}
              </option>
            ))}
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {["Standort", "Gesamtleistung", "EBITDA", "Marge", "Cashflow gem. BWA", "Forderungsquote", "Kostenquote", "Personalquote", "Restschuld", "Bankenfokus"].map((head) => (
                  <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeSites.map((site) => {
                const siteReceivablesRatio = site.gesamtleistung ? (site.forderungen / site.gesamtleistung) * 100 : 0;
                const siteCostRatio = boardCostRatio(site);
                const focus = [
                  statusByRule(site.ebitdaMarge, rules.ebitda_marge) === "red" ? "Marge" : "",
                  statusByRule(site.cashflow, rules.cashflow_bwa) === "red" ? "Cashflow" : "",
                  statusByRule(siteReceivablesRatio, rules.offene_forderungen) === "red" ? "Forderungen" : "",
                  statusByRule(siteCostRatio, rules.kostenquote) === "red" ? "Kosten" : ""
                ].filter(Boolean);
                return (
                  <tr key={site.id}>
                    <td className="border-b border-r border-border p-3 font-bold">{site.name}</td>
                    <td className="border-b border-r border-border p-3 text-right">{eur(site.gesamtleistung)}</td>
                    <td className="border-b border-r border-border p-3 text-right">{eur(site.ebitda)}</td>
                    <td className="border-b border-r border-border p-3 text-right">{pct(site.ebitdaMarge)}</td>
                    <td className={cn("border-b border-r border-border p-3 text-right", site.cashflow < 0 && "text-red-700")}>{eur(site.cashflow)}</td>
                    <td className="border-b border-r border-border p-3 text-right">{pct(siteReceivablesRatio)}</td>
                    <td className="border-b border-r border-border p-3 text-right">{pct(siteCostRatio)}</td>
                    <td className="border-b border-r border-border p-3 text-right">{pct(site.personalquote ?? 0)}</td>
                    <td className="border-b border-r border-border p-3 text-right">{eur(site.darlehen.restschuld)}</td>
                    <td className="border-b border-r border-border p-3">
                      <StatusDot status={focus.length ? "yellow" : "green"} label={focus.length ? focus.join(", ") : "stabil"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-bold">Personal- und Kapazitätssignale für Banken</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operative Stabilität hinter der Kapitaldienstfähigkeit: aktive Mitarbeiter, FTE, Behandlerkapazität und Krankheitstage.
          </p>
        </div>
        {personnelBySite.length ? (
          <div className="overflow-x-auto">
            <table className="data-table border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {["Standort", "Aktive MA", "FTE", "Zahnärzte", "Krankheitstage", "Krankheit / FTE", "Signal"].map((head) => (
                    <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {personnelBySite.map((row) => {
                  const signal = statusForLower(row.sicknessDaysPerFte, 8, 14);
                  return (
                    <tr key={row.site}>
                      <td className="border-b border-r border-border p-3 font-bold">{row.site}</td>
                      <td className="border-b border-r border-border p-3 text-right">{row.active.toLocaleString("de-DE")}</td>
                      <td className="border-b border-r border-border p-3 text-right">{row.fte.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
                      <td className="border-b border-r border-border p-3 text-right">{row.dentists.toLocaleString("de-DE")}</td>
                      <td className="border-b border-r border-border p-3 text-right">{row.sicknessDays.toLocaleString("de-DE")}</td>
                      <td className="border-b border-r border-border p-3 text-right">{row.sicknessDaysPerFte.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
                      <td className="border-b border-r border-border p-3"><StatusDot status={signal} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">Personalimport noch nicht aktiv. Nach Import erscheinen hier FTE, aktive Mitarbeiter, Behandlerkapazität und Krankheitssignale je Standort.</div>
        )}
      </Card>

      <BankCashflowControlTable sites={sites} importedData={importedData} />
    </section>
  );
}

type BoardAnalysisItem = {
  title: string;
  status: Status;
  finding: string;
  implication: string;
  action: string;
};

function boardCostRatio(site: DashboardSite) {
  return site.materialquote + site.fremdlaborquote + (site.personalquote ?? 0) + site.sonstigeKostenquote;
}

function boardSiteAnalysis(site: DashboardSite, group: ReturnType<typeof cfoMetrics>, rules: KpiRules): BoardAnalysisItem {
  const costRatio = boardCostRatio(site);
  const receivablesRatio = site.gesamtleistung ? (site.forderungen / site.gesamtleistung) * 100 : 0;
  const cashflowConversion = site.ebitda ? (site.cashflow / site.ebitda) * 100 : 0;
  const targetAchievement = kvEbitdaAchievement(site);
  const status = statusForSiteByRules(site, rules);
  const pressurePoints = [
    statusByRule(site.ebitdaMarge, rules.ebitda_marge) === "red" ? "EBITDA-Marge unter Zielkorridor" : "",
    statusByRule(costRatio, rules.kostenquote) === "red" ? "Kostenquote erhöht" : "",
    statusByRule(receivablesRatio, rules.offene_forderungen) === "red" ? "Forderungsbestand bindet Liquidität" : "",
    site.cashflow < 0 ? "Cashflow gem. BWA negativ" : "",
    targetAchievement !== null && statusByRule(targetAchievement, rules.ziel_ebitda_kaufvertrag) === "red" ? "Ziel-EBITDA Kaufvertrag unter Sollpfad" : ""
  ].filter(Boolean);

  const positiveSignals = [
    site.ebitdaMarge >= group.ebitdaMarge ? "Marge über Gruppenschnitt" : "",
    site.cashflow >= 0 ? "Cashflow positiv" : "",
    targetAchievement !== null && targetAchievement >= 100 ? "Ziel-EBITDA übererfüllt" : ""
  ].filter(Boolean);

  const action =
    pressurePoints.length > 0
      ? [
          statusByRule(receivablesRatio, rules.offene_forderungen) === "red" ? "Forderungsmanagement wöchentlich nachhalten" : "",
          statusByRule(costRatio, rules.kostenquote) === "red" ? "Material-, Fremdlabor- und Personalkosten auf Behandler-/Leistungsebene prüfen" : "",
          site.cashflow < 0 ? "Bank-Cashflow mit Tilgung, Investitionen und Umbuchungen abstimmen" : "",
          statusByRule(site.ebitdaMarge, rules.ebitda_marge) === "red" ? "Umsatzmix, Auslastung und operative Kosten mit Standortleitung monatlich steuern" : ""
        ]
          .filter(Boolean)
          .join("; ")
      : "Stabilitätsniveau halten: Forecast, Kostenquote und Forderungen monatlich gegen Sollpfad spiegeln.";

  return {
    title: site.name,
    status,
    finding: pressurePoints.length ? pressurePoints.join("; ") : positiveSignals.join("; ") || "Keine wesentliche Auffälligkeit im aktuellen Boardpack-Kontext.",
    implication: `EBITDA-Marge ${pct(site.ebitdaMarge)}, Kostenquote ${pct(costRatio)}, Forderungsquote ${pct(receivablesRatio)}, Cashflow-Konversion ${pct(cashflowConversion)}.`,
    action
  };
}

function BoardManagementAnalysis({ sites, metrics, rules }: { sites: DashboardSite[]; metrics: ReturnType<typeof cfoMetrics>; rules: KpiRules }) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  const receivablesRatio = metrics.gesamtleistung ? (metrics.forderungen / metrics.gesamtleistung) * 100 : 0;
  const cashflowConversion = metrics.ebitda ? (metrics.cashflow / metrics.ebitda) * 100 : 0;
  const groupFindings = [
    {
      title: "Ergebnisqualität",
      status: statusByRule(metrics.ebitdaMarge, rules.ebitda_marge),
      text: `Die Gruppe erzielt ${pct(metrics.ebitdaMarge)} EBITDA-Marge. Investorenseitig ist das die zentrale Qualität des Umsatzes, weil sie Ziel-EBITDA, Earn-Out-Pfad und Verschuldungstragfähigkeit verbindet.`,
      action: metrics.ebitdaMarge < rules.ebitda_marge.green ? "Standorte mit unterdurchschnittlicher Marge in ein monatliches Maßnahmenreview nehmen." : "Marge über Forecast stabilisieren und Pre-/Mix-Effekte in der Planung absichern."
    },
    {
      title: "Liquidität & Cash Conversion",
      status: statusByRule(metrics.cashflow, rules.cashflow_bwa),
      text: `Cashflow gem. BWA liegt bei ${eur(metrics.cashflow, true)}; die Cashflow-Konversion auf EBITDA beträgt ${pct(cashflowConversion)}. Für Investoren zählt hier, ob EBITDA tatsächlich in Liquidität übersetzt wird.`,
      action: cashflowConversion < 40 ? "Tilgung, Investitionen, Forderungsaufbau und Umbuchungen als separate Cash-Brücke je Standort nachhalten." : "Cash-Brücke beibehalten und größere Abweichungen je Standort kommentieren."
    },
    {
      title: "Forderungen & Working Capital",
      status: statusByRule(receivablesRatio, rules.offene_forderungen),
      text: `Offene Forderungen betragen ${eur(metrics.forderungen, true)} bzw. ${pct(receivablesRatio)} der Gesamtleistung. Das ist der schnellste Hebel zwischen Ergebnis und Kontostand.`,
      action: receivablesRatio > rules.offene_forderungen.green ? "Standortbezogene Forderungslisten priorisieren, Altposten eskalieren und PVS-/KZV-Zahlungsläufe gegen Monatsabschluss prüfen." : "Forderungsquote weiter als Frühwarnindikator im Boardpack führen."
    },
    {
      title: "Kapitaldienst & Verschuldung",
      status: statusByRule(metrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit),
      text: `Kapitaldienstfähigkeit liegt bei ${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x; Restschuld ${eur(metrics.restschuld, true)}, Tilgung bisher ${eur(metrics.getilgt, true)}.`,
      action: metrics.kapitaldienstfaehigkeit < rules.kapitaldienstfaehigkeit.green ? "Banken-Covenant-Logik mit Forecast und Sensitivität auf EBITDA-Marge aktualisieren." : "Tragfähigkeit dokumentieren und Finanzierungsspielraum für Integrations-/Wachstumsinvestitionen bewerten."
    }
  ];
  const siteAnalyses = activeSites.map((site) => boardSiteAnalysis(site, metrics, rules));

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-bold">Executive Summary | CFO- und Investorensicht</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            Management-Lesart der aktuellen Kennzahlen: Was fällt auf, was bedeutet es für Ergebnisqualität, Liquidität und
            Finanzierungsfähigkeit, und welche Gegenmaßnahmen sind sinnvoll.
          </p>
        </div>
        <Badge tone={metrics.kritisch.length ? "yellow" : "green"}>{metrics.kritisch.length ? `${metrics.kritisch.length} Fokus-Standort(e)` : "Regelbereit"}</Badge>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {groupFindings.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold">{item.title}</h3>
              <StatusDot status={item.status} />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">Gegenmaßnahme: {item.action}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="font-bold">Standortbezogene Ableitungen</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {siteAnalyses.map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold">{item.title}</h4>
                <StatusDot status={item.status} />
              </div>
              <p className="mt-2 text-sm leading-6">{item.finding}</p>
              <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Einordnung</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.implication}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">Maßnahme: {item.action}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
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
  const rules = useKpiRules();
  const metrics = cfoMetrics(sites, monthlyData, rules);
  const boardPeriodOptions = importedData ? bwaPeriodOptionsFor(importedData) : bwaPeriodOptions;
  const [boardPeriod, setBoardPeriod] = useState(() => defaultPeriodFromOptions(boardPeriodOptions));
  useEffect(() => {
    if (!boardPeriodOptions.includes(boardPeriod)) setBoardPeriod(defaultPeriodFromOptions(boardPeriodOptions));
  }, [boardPeriod, boardPeriodOptions]);
  const boardChartData = bwaChartDataForPeriod(importedData, monthlyData, boardPeriod);

  return (
    <section className="space-y-5">
      <PageTitle
        title="Investor / Board-Pack"
        text="Monatliche Management-Übersicht für Gesellschafter: Executive Summary, KPI-Entwicklung, Standortbeiträge, Risiken und Akquisitionen."
      />

      <BoardManagementAnalysis sites={sites} metrics={metrics} rules={rules} />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard
          title={`Board KPI Entwicklung | ${boardPeriod}`}
          icon={TrendingUp}
          action={
            <Select value={boardPeriod} onChange={(event) => setBoardPeriod(event.target.value)} className="w-full min-w-52 sm:w-auto">
              {boardPeriodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={boardChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickLine={false} axisLine={false} tick={false} width={8} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" name="Gesamtleistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="ebitda" name="EBITDA" stroke="#0369a1" strokeWidth={3} />
              <Line dataKey="cashflow" name="Cashflow gem. BWA" stroke="#64748b" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="p-4">
          <h2 className="font-bold">Risiken & Fokus | aktueller Stand</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Forderungen", `${eur(metrics.forderungen, true)} offen`, statusByRule(metrics.gesamtleistung ? (metrics.forderungen / metrics.gesamtleistung) * 100 : 0, rules.offene_forderungen)],
              ["Kostenquote", pct(metrics.kostenquote), statusByRule(metrics.kostenquote, rules.kostenquote)],
              ["Kapitaldienstfähigkeit", `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`, statusByRule(metrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit)],
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

      <AcquisitionIntegration sites={sites} />
    </section>
  );
}

function AcquisitionIntegration({ sites = standorte }: { sites?: DashboardSite[] }) {
  const activeSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung > 0);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-bold">Akquisitionen & Integration | seit Vertragsstart</h2>
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

function germanDateParts(value: string) {
  const [day, month, year] = value.split(".").map((part) => Number(part));
  if (!day || !month || !year) return null;
  return { day, month, year };
}

function monthsBetweenGermanDates(startValue: string, endValue: string) {
  const start = germanDateParts(startValue);
  const end = germanDateParts(endValue);
  if (!start || !end) return 1;
  return Math.max(1, (end.year - start.year) * 12 + end.month - start.month + 1);
}

function contractMonthsForSite(site: DashboardSite, elapsedMonths: number) {
  if (site.start && site.darlehen.earnOutFaelligAm) {
    return monthsBetweenGermanDates(site.start, site.darlehen.earnOutFaelligAm);
  }
  return Math.max(elapsedMonths, 12);
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

function earnOutTermsForSite(site: DashboardSite) {
  const fallback = acquisitionTermsForSite(site.name);
  return {
    maxEarnOut: site.darlehen.earnOutGesamt || fallback.earnOutGesamt,
    untergrenze: site.darlehen.earnOutUntergrenze ?? fallback.earnOutUntergrenze,
    reduktionsfaktor: site.darlehen.earnOutReduktionsfaktor ?? fallback.earnOutReduktionsfaktor,
    wachstumsfaktor: site.darlehen.wachstumsfaktor ?? fallback.wachstumsfaktor,
    zielEbitdaKaufvertragPa: site.darlehen.zielEbitdaKaufvertragPa ?? fallback.zielEbitdaKaufvertragPa
  };
}

function projectedEarnOutForSite(site: DashboardSite, period: string) {
  const open = Math.max(0, site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt);
  const terms = earnOutTermsForSite(site);
  const target = terms.zielEbitdaKaufvertragPa;
  if (!open || !target || !site.darlehen.earnOutFaelligAm) {
    return {
      projectedEbitda: 0,
      averageMonthlyEbitda: 0,
      elapsedMonths: 0,
      projectedEarnOut: 0,
      projectedGrowthPayment: 0,
      growthFactor: terms.wachstumsfaktor || 0,
      excessEbitda: 0,
      contractMonths: 0,
      projectedContractEbitda: 0,
      contractTargetEbitda: 0,
      contractExcessEbitda: 0,
      achievement: 0,
      untergrenze: terms.untergrenze,
      target
    };
  }
  const elapsedMonths = monthsSinceStartForPeriod(site, period);
  const averageMonthlyEbitda = site.ebitda / Math.max(elapsedMonths, 1);
  const projectedEbitda = Math.round(averageMonthlyEbitda * 12);
  const contractMonths = contractMonthsForSite(site, elapsedMonths);
  const projectedContractEbitda = Math.round(averageMonthlyEbitda * contractMonths);
  const contractTargetEbitda = Math.round(target * (contractMonths / 12));
  const untergrenze = terms.untergrenze || 0;
  const reduktionsfaktor = terms.reduktionsfaktor || 0;
  const growthFactor = terms.wachstumsfaktor || 0;
  const excessEbitda = Math.max(0, projectedEbitda - target);
  const contractExcessEbitda = Math.max(0, projectedContractEbitda - contractTargetEbitda);
  const achievement = target ? projectedEbitda / target : 0;
  let projectedEarnOut = 0;

  if (projectedEbitda >= target) {
    projectedEarnOut = open;
  } else if (untergrenze && projectedEbitda <= untergrenze) {
    projectedEarnOut = 0;
  } else if (untergrenze && reduktionsfaktor && target > untergrenze) {
    projectedEarnOut = open - (target - projectedEbitda) * reduktionsfaktor;
  } else {
    projectedEarnOut = 0;
  }

  return {
    projectedEbitda,
    averageMonthlyEbitda,
    elapsedMonths,
    projectedEarnOut: Math.round(Math.min(open, Math.max(0, projectedEarnOut))),
    projectedGrowthPayment: Math.round(contractExcessEbitda * growthFactor),
    growthFactor,
    excessEbitda,
    contractMonths,
    projectedContractEbitda,
    contractTargetEbitda,
    contractExcessEbitda,
    achievement,
    untergrenze,
    target
  };
}

function growthFactorLabel(factor: number) {
  if (!factor) return "nicht hinterlegt";
  return factor < 1
    ? `${pct(factor * 100)} vom Mehr-EBITDA`
    : `${factor.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x Mehr-EBITDA`;
}

function GrowthPaymentInfo({ site, projection, period }: { site: DashboardSite; projection: ReturnType<typeof projectedEarnOutForSite>; period: string }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-slate-950">Herleitung potenzielle Wachstumszahlung</p>
      <p className="text-slate-600">
        Basis ist das durchschnittliche EBITDA seit Vertragsstart. Dieses wird auf die gesamte Vertragslaufzeit hochgerechnet und gegen
        das Ziel-EBITDA gemäß Kaufvertrag für dieselbe Vertragslaufzeit gespiegelt.
      </p>
      <div className="space-y-1">
        <InfoLine label={`${site.name}: EBITDA seit Start`} value={site.ebitda} />
        <InfoTextLine label={`÷ Monate seit Start (${period})`} value={projection.elapsedMonths.toLocaleString("de-DE")} />
        <InfoLine label="= Ø EBITDA je Monat" value={projection.averageMonthlyEbitda} />
        <InfoTextLine label="× Vertragslaufzeit" value={`${projection.contractMonths.toLocaleString("de-DE")} Monate`} />
        <InfoLine label="= Hochgerechnetes EBITDA Vertragslaufzeit" value={projection.projectedContractEbitda} strong />
        <InfoLine label="- Ziel-EBITDA Vertragslaufzeit" value={-projection.contractTargetEbitda} />
        <InfoLine label="= Mehr-EBITDA Vertragslaufzeit" value={projection.contractExcessEbitda} strong />
      </div>
      <div className="rounded-md bg-slate-50 p-2 text-slate-700">
        Wachstumslogik: {growthFactorLabel(projection.growthFactor)}
      </div>
      <InfoLine label="= Potenzielle Wachstumszahlung" value={projection.projectedGrowthPayment} strong />
    </div>
  );
}

type EarnOutProjectionRow = {
  site: DashboardSite;
  dueStatus: ReturnType<typeof earnOutDueStatus>;
  projection: ReturnType<typeof projectedEarnOutForSite>;
};

function projectedEarnOutRows(sites: DashboardSite[], period: string): EarnOutProjectionRow[] {
  return sortSitesByContractStart(sites).map((site) => ({
    site,
    dueStatus: earnOutDueStatus(site),
    projection: projectedEarnOutForSite(site, period)
  }));
}

function ExpectedEarnOutInfo({ rows, period }: { rows: EarnOutProjectionRow[]; period: string }) {
  const expectedEarnOut = rows.reduce((sum, row) => sum + row.projection.projectedEarnOut, 0);

  return (
    <div className="space-y-3">
      <p className="font-semibold text-slate-950">Herleitung erwarteter Earn-Out</p>
      <p className="text-slate-700">
        Zeitraum: {period}. Je Standort wird das bisherige EBITDA seit Praxisstart auf eine p.a.-Run-Rate hochgerechnet
        und ausschließlich gegen Ziel-EBITDA p.a., Untergrenze, maximalen Earn-Out und Reduktionsfaktor gespiegelt.
        Wachstumszahlungen sind hier nicht enthalten.
      </p>
      <div className="space-y-2">
        {rows.map(({ site, dueStatus, projection }) => (
          <div key={site.id} className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-3 font-semibold text-slate-950">
              <span>{site.name}</span>
              <span>{eur(projection.projectedEarnOut)}</span>
            </div>
            <div className="mt-2 grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
              <span>EBITDA seit Start: {eur(site.ebitda)}</span>
              <span>Monate seit Start: {projection.elapsedMonths.toLocaleString("de-DE")}</span>
              <span>Ø EBITDA je Monat: {eur(projection.averageMonthlyEbitda)}</span>
              <span>Run-Rate EBITDA p.a.: {eur(projection.projectedEbitda)}</span>
              <span>Ziel-EBITDA p.a.: {eur(projection.target)}</span>
              <span>Untergrenze Earn-Out: {projection.untergrenze ? eur(projection.untergrenze) : "nicht hinterlegt"}</span>
              <span>Fälligkeit: {site.darlehen.earnOutFaelligAm || "offen"}</span>
              <span>Status: {dueStatus.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-2 font-semibold text-slate-950">
        <InfoLine label="= Erwarteter Earn-Out gesamt" value={expectedEarnOut} strong />
      </div>
    </div>
  );
}

function ExpectedGrowthPaymentInfo({ rows, period }: { rows: EarnOutProjectionRow[]; period: string }) {
  const expectedGrowthPayment = rows.reduce((sum, row) => sum + row.projection.projectedGrowthPayment, 0);

  return (
    <div className="space-y-3">
      <p className="font-semibold text-slate-950">Herleitung erwartete Wachstumszahlung</p>
      <p className="text-slate-700">
        Zeitraum: {period}. Je Standort wird das bisherige EBITDA seit Praxisstart auf die jeweilige Vertragslaufzeit
        hochgerechnet. Nur das Mehr-EBITDA gegenüber dem Ziel-EBITDA der Vertragslaufzeit fließt in diese Kachel ein.
        Earn-Out-Beträge sind hier nicht enthalten.
      </p>
      <div className="space-y-2">
        {rows.map(({ site, projection }) => (
          <div key={site.id} className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-3 font-semibold text-slate-950">
              <span>{site.name}</span>
              <span>{eur(projection.projectedGrowthPayment)}</span>
            </div>
            <div className="mt-2 grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
              <span>Ø EBITDA je Monat: {eur(projection.averageMonthlyEbitda)}</span>
              <span>Vertragslaufzeit: {projection.contractMonths.toLocaleString("de-DE")} Monate</span>
              <span>Hochgerechnetes EBITDA Vertragslaufzeit: {eur(projection.projectedContractEbitda)}</span>
              <span>Ziel-EBITDA Vertragslaufzeit: {eur(projection.contractTargetEbitda)}</span>
              <span>Mehr-EBITDA Vertragslaufzeit: {eur(projection.contractExcessEbitda)}</span>
              <span>Wachstumslogik: {growthFactorLabel(projection.growthFactor)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-2 font-semibold text-slate-950">
        <InfoLine label="= Erwartete Wachstumszahlung gesamt" value={expectedGrowthPayment} strong />
      </div>
    </div>
  );
}

function ExpectedObligationInfo({ rows, period }: { rows: EarnOutProjectionRow[]; period: string }) {
  const expectedEarnOut = rows.reduce((sum, row) => sum + row.projection.projectedEarnOut, 0);
  const expectedGrowthPayment = rows.reduce((sum, row) => sum + row.projection.projectedGrowthPayment, 0);
  const totalExpected = expectedEarnOut + expectedGrowthPayment;

  return (
    <div className="space-y-3">
      <p className="font-semibold text-slate-950">Erwartete Verpflichtung inklusive Wachstumszahlung</p>
      <p className="text-slate-700">
        Zeitraum: {period}. Je Standort wird das bisherige EBITDA seit Praxisstart auf die jeweilige Vertragslaufzeit hochgerechnet.
        Daraus werden erwarteter Earn-Out und potenzielle Wachstumszahlung abgeleitet. Fällig wird die Zahlung erst nach Ablauf der
        jeweiligen Vertragsperiode.
      </p>
      <div className="space-y-2">
        {rows.map(({ site, dueStatus, projection }) => {
          const siteTotal = projection.projectedEarnOut + projection.projectedGrowthPayment;
          return (
            <div key={site.id} className="rounded-lg border border-border bg-white p-3">
              <div className="flex items-start justify-between gap-3 font-semibold text-slate-950">
                <span>{site.name}</span>
                <span>{eur(siteTotal)}</span>
              </div>
              <div className="mt-2 grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
                <span>Erwarteter Earn-Out: {eur(projection.projectedEarnOut)}</span>
                <span>Wachstumszahlung: {eur(projection.projectedGrowthPayment)}</span>
                <span>Fälligkeit: {site.darlehen.earnOutFaelligAm || "offen"}</span>
                <span>Status: {dueStatus.label}</span>
                <span>Ø EBITDA je Monat: {eur(projection.averageMonthlyEbitda)}</span>
                <span>Vertragslaufzeit: {projection.contractMonths.toLocaleString("de-DE")} Monate</span>
                <span>Ziel-EBITDA Vertragslaufzeit: {eur(projection.contractTargetEbitda)}</span>
                <span>Mehr-EBITDA Vertragslaufzeit: {eur(projection.contractExcessEbitda)}</span>
                <span>Wachstumslogik: {growthFactorLabel(projection.growthFactor)}</span>
                <span>Run-Rate EBITDA p.a.: {eur(projection.projectedEbitda)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-1 border-t border-border pt-2 font-semibold text-slate-950">
        <InfoLine label="Erwarteter Earn-Out gesamt" value={expectedEarnOut} />
        <InfoLine label="+ Erwartete Wachstumszahlung" value={expectedGrowthPayment} />
        <InfoLine label="= Erwartete Verpflichtung gesamt" value={totalExpected} strong />
      </div>
    </div>
  );
}

function Darlehen({ sites = standorte, importedData }: { sites?: DashboardSite[]; importedData?: ImportedDashboardData | null }) {
  const restschuld = sites.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
  const earnOut = sites.reduce((sum, site) => sum + site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt, 0);
  const earnOutDueNow = sites.reduce((sum, site) => sum + (isEarnOutDue(site) ? site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt : 0), 0);
  const tilgung = sites.reduce((sum, site) => sum + site.darlehen.tilgung, 0);
  const earnOutPeriod = importedData ? defaultBwaPeriodFor(importedData) : "aktueller Importzeitraum";
  const earnOutRows = projectedEarnOutRows(sites, earnOutPeriod);
  const expectedEarnOut = earnOutRows.reduce((sum, row) => sum + row.projection.projectedEarnOut, 0);
  const expectedGrowthPayment = earnOutRows.reduce((sum, row) => sum + row.projection.projectedGrowthPayment, 0);
  const expectedObligation = expectedEarnOut + expectedGrowthPayment;
  const expectedObligationInfo = <ExpectedObligationInfo rows={earnOutRows} period={earnOutPeriod} />;
  return (
    <section className="space-y-5">
      <PageTitle title="Darlehen & Earn-Out" text="Kaufpreise, Restschulden, Zins, Tilgung und Earn-Out-Fortschritt je Standort." />
      <DebtCapitalBlock sites={sites} />
      <EarnOutSummary sites={sites} period={earnOutPeriod} />
      <div className="grid gap-4 lg:grid-cols-4">
        <KpiCard label="Gesamte Restschuld" value={restschuld} delta="Konsolidiert" icon={Landmark} status="yellow" />
        <KpiCard label="Earn-Out offen" value={earnOut} delta={`Davon aktuell fällig: ${eur(earnOutDueNow)}`} icon={BadgeEuro} status={earnOutDueNow > 0 ? "yellow" : "green"} />
        <KpiCard
          label="Erwartete Verpflichtung | Run-Rate"
          value={expectedObligation}
          delta={`Earn-Out ${eur(expectedEarnOut, true)} | Wachstum ${eur(expectedGrowthPayment, true)}`}
          icon={TrendingUp}
          status={expectedObligation > 0 ? "yellow" : "green"}
          info={expectedObligationInfo}
        />
        <KpiCard label="Tilgung" value={tilgung} delta="Laufend bedient" icon={ShieldCheck} status="green" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {sortSitesByContractStart(sites).map((site) => {
          const dueStatus = earnOutDueStatus(site);
          const projectedEarnOut = projectedEarnOutForSite(site, earnOutPeriod);
          const achievement = projectedEarnOut.achievement * 100;
          return (
            <Card key={site.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold">{site.name} | seit Vertragsstart</h2>
                <StatusDot status={site.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Mini label="Kaufpreis" value={eur(site.darlehen.kaufpreis, true)} />
                <Mini label="Darlehen" value={eur(site.darlehen.darlehen, true)} />
                <Mini label="Restschuld" value={eur(site.darlehen.restschuld, true)} />
                <Mini label="Tilgung" value={eur(site.darlehen.tilgung, true)} />
                <Mini label="Zins" value={eur(site.darlehen.zins, true)} />
                <Mini label="Ziel EBITDA p.a." value={eur(projectedEarnOut.target, true)} />
                <Mini label="Run-Rate EBITDA p.a." value={eur(projectedEarnOut.projectedEbitda, true)} />
                <Mini label="Untergrenze Earn-Out" value={projectedEarnOut.untergrenze ? eur(projectedEarnOut.untergrenze, true) : "nicht hinterlegt"} />
                <Mini label="Earn-Out fällig am" value={site.darlehen.earnOutFaelligAm || "offen"} />
                <Mini label="Run-Rate Earn-Out" value={eur(projectedEarnOut.projectedEarnOut, true)} />
                <Mini
                  label="Potenzielle Wachstumszahlung"
                  value={eur(projectedEarnOut.projectedGrowthPayment, true)}
                  info={<GrowthPaymentInfo site={site} projection={projectedEarnOut} period={earnOutPeriod} />}
                />
                <Mini
                  label="Wachstumslogik"
                  value={growthFactorLabel(projectedEarnOut.growthFactor)}
                />
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold">Run-Rate Zielerreichung p.a.</span>
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

function EarnOutSummary({ sites = standorte, period }: { sites?: DashboardSite[]; period: string }) {
  const totalPotential = sites.reduce((sum, site) => sum + site.darlehen.earnOutGesamt, 0);
  const paid = sites.reduce((sum, site) => sum + site.darlehen.earnOutGezahlt, 0);
  const open = totalPotential - paid;
  const dueNow = sites.reduce((sum, site) => sum + (isEarnOutDue(site) ? site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt : 0), 0);
  const notYetDue = Math.max(0, open - dueNow);
  const earnOutBreakdown = projectedEarnOutRows(sites, period);
  const runRateProvision = earnOutBreakdown.reduce((sum, row) => sum + row.projection.projectedEarnOut, 0);
  const runRateGrowthProvision = earnOutBreakdown.reduce((sum, row) => sum + row.projection.projectedGrowthPayment, 0);
  const runRateObligation = runRateProvision + runRateGrowthProvision;
  const runRateAchievement = totalPotential ? (runRateProvision / totalPotential) * 100 : 0;
  const expectedObligationInfo = <ExpectedObligationInfo rows={earnOutBreakdown} period={period} />;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold">Earn-Out konsolidiert | Vertragsperioden</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gesamtpotenzial, Fälligkeit nach Vertragsperiode und Run-Rate-Vorsorge auf Basis {period}.
          </p>
        </div>
        <Badge tone={open > totalPotential * 0.5 ? "yellow" : "green"}>{pct((paid / (totalPotential || 1)) * 100)} gezahlt</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <Mini label="Earn-Out Potenzial" value={eur(totalPotential)} />
        <Mini label="Aktuell fällig" value={eur(dueNow)} />
        <Mini label="Noch nicht fällig" value={eur(notYetDue)} />
        <Mini label="Erwarteter Earn-Out" value={eur(runRateProvision)} />
        <Mini label="Erwartete Wachstumszahlung" value={eur(runRateGrowthProvision)} />
        <Mini label="Erwartete Verpflichtung gesamt" value={eur(runRateObligation)} info={expectedObligationInfo} />
        <Mini label="Vorsorgequote" value={pct(runRateAchievement)} />
      </div>
      <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-muted-foreground">
        Run-Rate-Logik: EBITDA seit Praxisstart geteilt durch die bisher berücksichtigten Monate mal 12. Diese p.a.-Run-Rate wird gegen Ziel-EBITDA p.a., Untergrenze, Max. Earn-Out und Reduktionsfaktor aus den Stammdaten gespiegelt. Aktuelle Vorsorgequote: {pct(runRateAchievement)} des Gesamtpotenzials.
      </p>
    </Card>
  );
}

function UploadSuccessDialog({
  title,
  text,
  onClose
}: {
  title: string;
  text: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#061725]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[#30d5c8]/35 bg-white p-5 text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{text}</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            onClick={onClose}
            aria-label="Popup schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Button className="mt-5 w-full" onClick={onClose}>
          Verstanden
        </Button>
      </div>
    </div>
  );
}

function PersonalUpload({
  userRole,
  onImportConfirmed,
  onImportReset
}: {
  userRole: UserRole;
  onImportConfirmed?: (data: PersonalDashboardData) => void;
  onImportReset?: () => void;
}) {
  const [report, setReport] = useState<PersonalImportReport>(emptyPersonalImportReport);
  const [confirmedReport, setConfirmedReport] = useState<PersonalImportReport | null>(null);
  const [pendingDashboardData, setPendingDashboardData] = useState<PersonalDashboardData | null>(null);
  const [importHistory, setImportHistory] = useState<PersonalImportHistoryEntry[]>([]);
  const [previousData, setPreviousData] = useState<PersonalDashboardData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{ title: string; text: string } | null>(null);
  const canEdit = canModifyData(userRole);

  const refreshImportHistory = () => {
    loadSupabasePersonalImportHistory().then(setImportHistory);
  };

  useEffect(() => {
    let isMounted = true;
    loadConfirmedPersonalImportData()
      .then((savedImport) => {
        if (!isMounted) return;
        setPreviousData(savedImport);
        if (savedImport) setConfirmedReport(savedImport.report);
      })
      .catch(() => {
        if (isMounted) setConfirmedReport(null);
      });
    refreshImportHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canEdit) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setReport({ ...emptyPersonalImportReport, status: "reading", fileName: file.name });
    try {
      await waitForBrowserPaint();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const dashboardData = buildPersonalDashboardData(workbook, file.name, previousData);
      setReport(dashboardData.report);
      setPendingDashboardData(dashboardData.report.status === "error" ? null : dashboardData);
    } catch (error) {
      setReport({
        ...emptyPersonalImportReport,
        status: "error",
        fileName: file.name,
        importedAt: new Date().toISOString(),
        errors: [
          error instanceof Error
            ? `Die Personal-Datei konnte nicht gelesen werden: ${error.message}`
            : "Die Personal-Datei konnte nicht gelesen werden."
        ]
      });
      setPendingDashboardData(null);
    }
  }

  async function confirmImport() {
    if (!canEdit) return;
    if ((report.status !== "ready" && report.status !== "warning") || !pendingDashboardData) return;
    setIsConfirming(true);
    try {
      await saveConfirmedPersonalImport(report, pendingDashboardData);
      setConfirmedReport(report);
      setPreviousData(pendingDashboardData);
      refreshImportHistory();
      onImportConfirmed?.(pendingDashboardData);
      setSuccessNotice({
        title: "Personal-Import bestätigt",
        text: `${report.fileName || "Die Personal-Arbeitsmappe"} wurde eingelesen und als aktive Datenbasis freigegeben.`
      });
    } finally {
      setIsConfirming(false);
    }
  }

  async function resetImport() {
    if (!canEdit) return;
    await clearConfirmedPersonalImport();
    setReport(emptyPersonalImportReport);
    setConfirmedReport(null);
    setPendingDashboardData(null);
    setPreviousData(null);
    refreshImportHistory();
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
            : "Noch kein Personal-Import";
  const importSteps = [
    { label: "Personal-Arbeitsmappe auswählen", done: report.status !== "idle" || Boolean(confirmedReport) },
    { label: "Pflichtblätter erkennen", done: Boolean(activeReport?.presentSheets.length) },
    { label: "Mitarbeiterstamm lesen", done: Boolean(activeReport?.employeeRows) },
    { label: "Krankheitsdaten prüfen", done: Boolean(activeReport?.sicknessRows) },
    { label: "Änderungen erkennen", done: Boolean(activeReport && activeReport.status !== "error") },
    { label: "Personal-Import freigeben", done: Boolean(confirmedReport) }
  ];

  return (
    <section className="space-y-5">
      {successNotice && (
        <UploadSuccessDialog
          title={successNotice.title}
          text={successNotice.text}
          onClose={() => setSuccessNotice(null)}
        />
      )}
      <PageTitle title="Personal-Upload" text="Eigener Import für die Personalübersicht-Arbeitsmappe. Diese Datenbasis ist vom CFO-/BWA-Import getrennt." />
      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Mini label="Aktueller Importstatus" value={statusLabel} />
        <Mini label="Letzte bestätigte Datei" value={confirmedReport?.fileName ?? "Noch keine Datei bestätigt"} />
        <Mini label="Datenstand" value={confirmedReport?.importedAt ? new Date(confirmedReport.importedAt).toLocaleString("de-DE") : "Noch offen"} />
      </Card>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4">
          <h2 className="font-bold">Uploadablauf</h2>
          <div className="mt-4 space-y-3">
            {importSteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white", step.done ? "bg-primary" : "bg-slate-300")}>
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
              <h2 className="font-bold">Orisus Personalübersicht</h2>
              <p className="mt-1 text-sm text-muted-foreground">Lade die komplette Personal-Excel-Datei hoch. Die App liest die Input-Blätter direkt.</p>
            </div>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
          <label className={cn("mt-4 block rounded-lg border-2 border-dashed border-border bg-slate-50 p-8 text-center transition", canEdit ? "cursor-pointer hover:border-primary hover:bg-cyan-50/60" : "cursor-not-allowed opacity-60")}>
            <FileUp className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-3 font-bold">{report.status === "reading" ? "Datei wird gelesen ..." : "Personal-Excel auswählen"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Empfohlen: ++Orisus_Personalübersicht_Dashboard++.xlsx</p>
            <input className="sr-only" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={!canEdit} />
          </label>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["Pflichtblätter", activeReport ? `${activeReport.presentSheets.length}/${requiredPersonalSheets.length} erkannt` : "Noch offen"],
              ["Mitarbeiter", activeReport ? activeReport.employeeRows.toLocaleString("de-DE") : "Noch offen"],
              ["Aktive Mitarbeiter", activeReport ? activeReport.activeEmployees.toLocaleString("de-DE") : "Noch offen"],
              ["Krankheitseinträge", activeReport ? activeReport.sicknessRows.toLocaleString("de-DE") : "Noch offen"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md table-total p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button className="w-full" disabled={!canEdit || isConfirming || (report.status !== "ready" && report.status !== "warning")} onClick={confirmImport}>
              {isConfirming ? "Personal-Import wird bestätigt ..." : "Personal-Import bestätigen"}
            </Button>
            <Button className="w-full" variant="secondary" disabled={!canEdit || (!confirmedReport && report.status === "idle")} onClick={resetImport}>
              Personal-Import zurücksetzen
            </Button>
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-bold">Personal-Importbericht</h2>
          <p className="mt-1 text-sm text-muted-foreground">Vorschau aus der Personal-Arbeitsmappe. Nach Bestätigung nutzen die Personal-Seiten diese Datenbasis.</p>
        </div>
        <div className="grid gap-px table-grid-bg md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Standorte", activeReport?.sites.length ? activeReport.sites.join(", ") : "Noch nicht erkannt"],
            ["Jahre Krankheit", activeReport?.years.length ? activeReport.years.join(", ") : "Noch nicht erkannt"],
            ["Aktive Mitarbeiter", activeReport ? activeReport.activeEmployees.toLocaleString("de-DE") : "Noch offen"],
            ["Maßnahmen", activeReport ? `${activeReport.actionRows} Einträge` : "Noch offen"]
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
      </Card>
    </section>
  );
}

function Uploads({
  userRole,
  onImportConfirmed,
  onImportReset
}: {
  userRole: UserRole;
  onImportConfirmed?: (data: ImportedDashboardData) => void;
  onImportReset?: () => void;
}) {
  const [report, setReport] = useState<ImportReport>(emptyImportReport);
  const [confirmedReport, setConfirmedReport] = useState<ImportReport | null>(null);
  const [pendingDashboardData, setPendingDashboardData] = useState<ImportedDashboardData | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{ title: string; text: string } | null>(null);
  const canEdit = canModifyData(userRole);

  const refreshImportHistory = () => {
    loadSupabaseImportHistory().then(setImportHistory);
  };

  useEffect(() => {
    let isMounted = true;
    loadConfirmedImportData()
      .then((savedImport) => {
        if (isMounted && savedImport) setConfirmedReport(savedImport.report);
      })
      .catch(() => {
        if (isMounted) setConfirmedReport(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    refreshImportHistory();
  }, []);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canEdit) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setReport({ ...emptyImportReport, status: "reading", fileName: file.name });

    try {
      await waitForBrowserPaint();
      const workbook = await readCfoWorkbookFromFile(file);
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
            ? `Die Datei konnte nicht gelesen werden: ${error.message}. Falls das auf iPhone/iPad passiert, bitte die Excel-Datei einmal vollständig speichern und erneut hochladen.`
            : "Die Datei konnte nicht gelesen werden. Falls das auf iPhone/iPad passiert, bitte die Excel-Datei einmal vollständig speichern und erneut hochladen."
        ]
      });
      setPendingDashboardData(null);
    } finally {
      event.target.value = "";
    }
  }

  async function confirmImport() {
    if (!canEdit) return;
    if ((report.status !== "ready" && report.status !== "warning") || !pendingDashboardData) return;
    const repairedDashboardData = repairImportedCashflowData(pendingDashboardData);
    setIsConfirming(true);
    try {
      await saveConfirmedImport(report, repairedDashboardData);
      setConfirmedReport(report);
      refreshImportHistory();
      onImportConfirmed?.(repairedDashboardData);
      setSuccessNotice({
        title: "CFO-Import bestätigt",
        text: `${report.fileName || "Die CFO-Arbeitsmappe"} wurde eingelesen und als aktive Datenbasis freigegeben.`
      });
    } finally {
      setIsConfirming(false);
    }
  }

  async function resetImport() {
    if (!canEdit) return;
    await clearConfirmedImport();
    setReport(emptyImportReport);
    setConfirmedReport(null);
    setPendingDashboardData(null);
    refreshImportHistory();
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
      {successNotice && (
        <UploadSuccessDialog
          title={successNotice.title}
          text={successNotice.text}
          onClose={() => setSuccessNotice(null)}
        />
      )}
      <PageTitle title="Uploads & Datenstand" text="Zentraler Excel-Import aus der konsolidierten Orisus-Arbeitsmappe mit Blatt-, Zeitraum-, Standort- und Plausibilitätsprüfung." />
      {!canEdit && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Info-Rolle: Du kannst Importstatus und Historie lesen, aber keine Dateien hochladen, bestätigen oder zurücksetzen.
        </Card>
      )}
      <DataStatusStrip />
      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Mini label="Aktueller Importstatus" value={statusLabel} />
        <Mini label="Letzte bestätigte Datei" value={confirmedReport?.fileName ?? "Noch keine Datei bestätigt"} />
        <Mini
          label="Datenstand"
          value={confirmedReport?.importedAt ? new Date(confirmedReport.importedAt).toLocaleString("de-DE") : "Noch offen"}
        />
      </Card>
      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Mini label="Zentrale Speicherung" value={isSupabaseConfigured() ? "Supabase verbunden" : "Lokal aktiv"} />
        <Mini label="Supabase-Sitzung" value={currentSupabaseAccessToken() ? "Angemeldet" : "Nicht aktiv"} />
        <Mini label="Import-Historie" value={importHistory.length ? `${importHistory.length} Einträge erkannt` : "Noch keine Historie"} />
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
          <label
            className={cn(
              "mt-4 block rounded-lg border-2 border-dashed border-border bg-slate-50 p-8 text-center transition",
              canEdit ? "cursor-pointer hover:border-primary hover:bg-cyan-50/60" : "cursor-not-allowed opacity-60"
            )}
          >
            <FileUp className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-3 font-bold">{report.status === "reading" ? "Datei wird gelesen ..." : "Excel-Datei auswählen"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Empfohlen: +BWA_Controlling_Orisus_Dashboard+.xlsx</p>
            <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={!canEdit} />
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
            <Button className="w-full" disabled={!canEdit || isConfirming || (report.status !== "ready" && report.status !== "warning")} onClick={confirmImport}>
              {isConfirming ? "Importbericht wird bestätigt ..." : "Importbericht bestätigen"}
            </Button>
            <Button className="w-full" variant="secondary" disabled={!canEdit || (!confirmedReport && report.status === "idle")} onClick={resetImport}>
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
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-bold">Import-Historie</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Supabase speichert bestätigte Importstände. Der aktive Stand ist die aktuell genutzte Datenbasis der App.
          </p>
        </div>
        {importHistory.length ? (
          <div className="overflow-x-auto">
            <table className="data-table border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {["Status", "Datei", "Bestätigt am", "Schema"].map((head) => (
                    <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importHistory.map((entry) => (
                  <tr key={entry.id} className={entry.active ? "table-total" : undefined}>
                    <td className="border-b border-r border-border p-3 font-bold">{entry.active ? "Aktiv" : "Historie"}</td>
                    <td className="border-b border-r border-border p-3">{entry.file_name ?? "Unbekannte Datei"}</td>
                    <td className="border-b border-r border-border p-3">
                      {entry.imported_at ? new Date(entry.imported_at).toLocaleString("de-DE") : "Ohne Zeitstempel"}
                    </td>
                    <td className="border-b border-r border-border p-3 text-xs">{entry.schema_version ?? "offen"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            Noch keine zentrale Historie erkannt. Nach dem nächsten bestätigten Import erscheint hier der aktive Supabase-Datenstand.
          </div>
        )}
      </Card>
    </section>
  );
}

type ReportTone = "green" | "yellow" | "red" | "blue" | "neutral";
type ReportOrientation = "portrait" | "landscape";

function reportEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function reportDateStamp() {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function reportKpiGrid(
  cards: Array<{
    label: string;
    value: string;
    detail?: string;
    tone?: ReportTone;
  }>
) {
  return `<div class="kpi-grid">${cards
    .map(
      (card) => `<div class="kpi-card ${card.tone ?? "neutral"}">
        <div class="kpi-label">${reportEscape(card.label)}</div>
        <div class="kpi-value">${reportEscape(card.value)}</div>
        ${card.detail ? `<div class="kpi-detail">${reportEscape(card.detail)}</div>` : ""}
      </div>`
    )
    .join("")}</div>`;
}

function reportTable(
  headers: string[],
  rows: Array<Array<string | number>>,
  options: { compact?: boolean; className?: string } = {}
) {
  return `<table class="report-table ${options.compact ? "compact" : ""} ${options.className ?? ""}">
    <thead><tr>${headers.map((header) => `<th>${reportEscape(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell, index) => `<td class="${index === 0 ? "label-cell" : ""}">${reportEscape(cell)}</td>`)
            .join("")}</tr>`
      )
      .join("")}</tbody>
  </table>`;
}

function reportSection(title: string, body: string, subtitle?: string) {
  return `<section class="report-section">
    <div class="section-head">
      <h2>${reportEscape(title)}</h2>
      ${subtitle ? `<p>${reportEscape(subtitle)}</p>` : ""}
    </div>
    ${body}
  </section>`;
}

function reportBarList(rows: Array<{ label: string; value: number; max: number; tone?: ReportTone; suffix?: string }>) {
  return `<div class="bar-list">${rows
    .map((row) => {
      const width = row.max ? Math.min(100, Math.max(2, (Math.abs(row.value) / row.max) * 100)) : 0;
      return `<div class="bar-row">
        <div class="bar-meta"><strong>${reportEscape(row.label)}</strong><span>${reportEscape(row.suffix ?? eur(row.value, true))}</span></div>
        <div class="bar-track"><span class="${row.tone ?? "green"}" style="width:${width.toFixed(1)}%"></span></div>
      </div>`;
    })
    .join("")}</div>`;
}

function buildReportDocument({
  title,
  subtitle,
  periodLabel,
  orientation,
  body,
  footerNote,
  hideHero = false,
  documentClass = ""
}: {
  title: string;
  subtitle: string;
  periodLabel?: string;
  orientation: ReportOrientation;
  body: string;
  footerNote?: string;
  hideHero?: boolean;
  documentClass?: string;
}) {
  const isPmrDocument = documentClass.includes("pmr-document");
  const isBenchmarkDocument = documentClass.includes("benchmark-document");
  const pageMargin = isPmrDocument ? "5mm" : isBenchmarkDocument ? "7mm" : "11mm";
  return `<!doctype html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>${reportEscape(title)}</title>
      <style>
        @page { size: A4 ${orientation}; margin: ${pageMargin}; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #12212f;
          background: #eef5f6;
          font-family: Inter, Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report-page { min-height: calc(100vh - 22mm); display: flex; flex-direction: column; gap: 12px; }
        .hero {
          border-radius: 18px;
          padding: 18px 22px;
          color: white;
          background: radial-gradient(circle at 18% 0%, rgba(34, 211, 197, .22), transparent 34%),
            linear-gradient(135deg, #061622 0%, #0b2d3a 48%, #0f6670 100%);
          border: 1px solid rgba(255,255,255,.18);
        }
        .eyebrow { color: #4de3d6; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        h1 { margin: 8px 0 6px; font-size: ${orientation === "landscape" ? "25px" : "22px"}; line-height: 1.1; }
        .hero p { margin: 0; max-width: 840px; color: rgba(255,255,255,.78); font-size: 12px; line-height: 1.45; }
        .meta-line { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; color: rgba(255,255,255,.74); font-size: 10.5px; }
        .pill { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 5px 9px; background: rgba(255,255,255,.08); }
        .kpi-grid { display: grid; grid-template-columns: repeat(${orientation === "landscape" ? 6 : 3}, 1fr); gap: 8px; }
        .kpi-card {
          min-height: 72px;
          border-radius: 13px;
          padding: 10px 12px;
          background: #ffffff;
          border: 1px solid #d5e0e5;
          box-shadow: 0 8px 22px rgba(9, 36, 47, .07);
        }
        .kpi-card.green { border-left: 4px solid #13b981; }
        .kpi-card.yellow { border-left: 4px solid #f59e0b; }
        .kpi-card.red { border-left: 4px solid #dc2626; }
        .kpi-card.blue { border-left: 4px solid #117989; }
        .kpi-label { color: #6b7a8b; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .kpi-value { margin-top: 7px; color: #0f1b2b; font-size: 18px; line-height: 1.05; font-weight: 900; }
        .kpi-detail { margin-top: 6px; color: #137667; font-size: 10px; font-weight: 750; }
        .report-section {
          border-radius: 16px;
          overflow: hidden;
          background: white;
          border: 1px solid #d5e0e5;
          box-shadow: 0 8px 22px rgba(9, 36, 47, .06);
          break-inside: avoid;
        }
        .section-head {
          padding: 10px 13px;
          background: linear-gradient(135deg, #0e4e5e, #107685);
          color: white;
        }
        .section-head h2 { margin: 0; font-size: 14px; }
        .section-head p { margin: 4px 0 0; color: rgba(255,255,255,.75); font-size: 10.5px; }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: ${orientation === "landscape" ? "10.2px" : "8.6px"};
        }
        .report-table.compact { font-size: ${orientation === "landscape" ? "9.3px" : "7.6px"}; }
        .report-table th {
          padding: ${orientation === "landscape" ? "7px 7px" : "5px 4px"};
          color: white;
          text-align: right;
          background: #0b6372;
          border: 1px solid rgba(255,255,255,.25);
          overflow-wrap: anywhere;
        }
        .report-table th:first-child, .report-table td:first-child { text-align: left; }
        .report-table td {
          padding: ${orientation === "landscape" ? "6px 7px" : "5px 4px"};
          text-align: right;
          border: 1px solid #d8e1e6;
          background: #ffffff;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .report-table tr:nth-child(even) td { background: #f4f8f9; }
        .report-table tr:last-child td { background: #e5f2f3; font-weight: 900; }
        .label-cell { font-weight: 750; color: #152234; }
        .two-col { display: grid; grid-template-columns: ${orientation === "landscape" ? "1fr 1fr" : "1fr"}; gap: 10px; }
        .bar-list { padding: 11px 13px; display: grid; gap: 9px; }
        .bar-row { display: grid; gap: 5px; }
        .bar-meta { display: flex; justify-content: space-between; gap: 12px; font-size: 10.5px; }
        .bar-track { height: 9px; border-radius: 999px; overflow: hidden; background: #e5edf0; }
        .bar-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #14b8a6, #0f8794); }
        .bar-track span.red { background: linear-gradient(90deg, #ef4444, #b91c1c); }
        .bar-track span.yellow { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .pmr-page { display: grid; gap: 8px; }
        .pmr-header {
          display: grid;
          grid-template-columns: 190px 1fr 150px;
          gap: 14px;
          align-items: center;
          border-radius: 16px;
          padding: 12px 16px;
          color: white;
          background: linear-gradient(135deg, #05254a 0%, #0b3556 52%, #0f6670 100%);
          border: 1px solid rgba(255,255,255,.18);
        }
        .pmr-logo img { width: 165px; max-height: 54px; object-fit: contain; filter: brightness(0) invert(1); }
        .pmr-header h1 { margin: 3px 0 3px; font-size: ${orientation === "landscape" ? "22px" : "19px"}; }
        .pmr-header p { margin: 0; color: rgba(255,255,255,.76); font-size: 10.5px; }
        .pmr-meta { display: grid; gap: 3px; justify-items: end; font-size: 10px; color: rgba(255,255,255,.82); }
        .pmr-meta strong { font-size: 16px; color: white; }
        .pmr-grid { display: grid; gap: 8px; align-items: start; }
        .pmr-grid.top { grid-template-columns: ${orientation === "landscape" ? "1.15fr .85fr" : "1fr"}; }
        .pmr-grid.bottom { grid-template-columns: ${orientation === "landscape" ? "1.15fr .85fr" : "1fr"}; }
        .pmr-stack { display: grid; gap: 8px; align-content: start; }
        .pmr-section {
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid #cbdce4;
          background: white;
          break-inside: avoid;
        }
        .pmr-section h2 {
          margin: 0;
          padding: 7px 9px;
          color: white;
          background: linear-gradient(135deg, #073e63, #0c7481);
          font-size: 11.5px;
        }
        .pmr-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: ${orientation === "landscape" ? "8.1px" : "7.1px"}; }
        .pmr-table.compact { font-size: ${orientation === "landscape" ? "7.7px" : "6.8px"}; }
        .pmr-table th {
          padding: 4px 3px;
          color: white;
          text-align: right;
          background: #083b63;
          border: 1px solid rgba(255,255,255,.28);
          overflow-wrap: anywhere;
        }
        .pmr-table th:first-child, .pmr-table td:first-child { text-align: left; }
        .pmr-table td {
          padding: 3px 3px;
          text-align: right;
          border: 1px solid #d8e6ed;
          background: #ffffff;
          overflow-wrap: anywhere;
        }
        .pmr-table.bwa-overview th:first-child,
        .pmr-table.bwa-overview td:first-child { width: 25%; }
        .pmr-table.bwa-overview th:last-child,
        .pmr-table.bwa-overview td:last-child { width: 9%; text-align: center; }
        .pmr-table tr:nth-child(even) td { background: #f5fafb; }
        .pmr-table tr.total td { background: #e1f1ea; font-weight: 900; }
        .pmr-table tr.quote-row td { background: #f8fbfc !important; color: #4d6574; font-size: 7px; font-weight: 700; }
        .pmr-table tr.section td { background: #d8ecf3; color: #07324f; font-weight: 900; text-align: left; }
        .pmr-table.monthly td, .pmr-table.monthly th { font-size: ${orientation === "landscape" ? "7.3px" : "6.5px"}; }
        .pmr-table td.positive { color: #15803d; font-weight: 900; }
        .pmr-table td.negative { color: #dc2626; font-weight: 900; }
        .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; vertical-align: middle; margin-right: 4px; }
        .status-label { font-weight: 800; font-size: 7.2px; vertical-align: middle; }
        .mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 9px; }
        .mini-grid div { border-radius: 9px; background: #e8f3f7; border: 1px solid #cce0e8; padding: 8px; }
        .mini-grid span { display: block; color: #376174; font-size: 8px; font-weight: 800; text-transform: uppercase; }
        .mini-grid strong { display: block; margin-top: 4px; color: #07324f; font-size: 15px; }
        .payout p { margin: 0; padding: 0 9px 9px; color: #496577; font-size: 8px; }
        .report-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          color: #5d6b7a;
          font-size: 9.5px;
          border-top: 1px solid #ccd8dd;
          padding-top: 7px;
        }
        .page-break { break-before: page; }
        .pmr-document {
          min-height: auto;
          gap: 0;
          background: white;
        }
        .pmr-document .pmr-page {
          height: 200mm;
          page-break-after: always;
          overflow: hidden;
          gap: 4px;
        }
        .pmr-document .pmr-benchmark-page:last-child { page-break-after: auto; }
        .pmr-document .pmr-header {
          grid-template-columns: 150px 1fr 95px;
          gap: 8px;
          border-radius: 10px;
          padding: 7px 10px;
        }
        .pmr-document .pmr-logo img { width: 130px; max-height: 39px; }
        .pmr-document .pmr-header h1 { font-size: 16px; margin: 1px 0; }
        .pmr-document .pmr-header p { font-size: 7.8px; }
        .pmr-document .pmr-meta { font-size: 7.2px; }
        .pmr-document .pmr-meta strong { font-size: 11px; }
        .pmr-document .eyebrow { font-size: 7px; }
        .pmr-document .pmr-grid { gap: 4px; }
        .pmr-document .pmr-grid.top { grid-template-columns: 1.22fr .78fr; }
        .pmr-document .pmr-grid.bottom { grid-template-columns: 1.08fr .92fr; }
        .pmr-document .pmr-stack { gap: 4px; }
        .pmr-document .pmr-section { border-radius: 8px; }
        .pmr-document .pmr-section h2 { padding: 4px 6px; font-size: 8.2px; }
        .pmr-document .pmr-table { font-size: 5.95px; line-height: 1.04; }
        .pmr-document .pmr-table.compact { font-size: 5.55px; }
        .pmr-document .pmr-table.monthly td,
        .pmr-document .pmr-table.monthly th { font-size: 5.15px; }
        .pmr-document .pmr-table th { padding: 1.75px 1.8px; }
        .pmr-document .pmr-table td { padding: 1.35px 1.8px; }
        .pmr-document .pmr-table tr.quote-row td { font-size: 5.75px; }
        .pmr-document .status-dot { width: 5px; height: 5px; margin-right: 2px; }
        .pmr-document .status-label { font-size: 5.2px; }
        .pmr-document .kpi-grid { grid-template-columns: repeat(5, 1fr); gap: 4px; }
        .pmr-document .kpi-card { min-height: 36px; border-radius: 8px; padding: 5px 7px; box-shadow: none; }
        .pmr-document .kpi-label { font-size: 6.3px; }
        .pmr-document .kpi-value { margin-top: 2px; font-size: 10.8px; }
        .pmr-document .kpi-detail { margin-top: 2px; font-size: 6.3px; }
        .pmr-document .mini-grid { grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 5px; }
        .pmr-document .mini-grid div { border-radius: 7px; padding: 5px; background: linear-gradient(180deg, #edf7fa, #e2f0f5); }
        .pmr-document .mini-grid span { font-size: 5.55px; }
        .pmr-document .mini-grid strong { margin-top: 2px; font-size: 9.4px; }
        .pmr-document .payout p { padding: 0 6px 5px; font-size: 5.55px; line-height: 1.18; }
        .pmr-document .monthly-section .pmr-table td,
        .pmr-document .monthly-section .pmr-table th { padding-top: 1.45px; padding-bottom: 1.45px; }
        .pmr-document .report-footer { display: none; }
        .pmr-benchmark-page {
          display: grid;
          gap: 6px;
          height: 200mm;
          overflow: hidden;
          page-break-after: always;
          background: white;
        }
        .pmr-benchmark-header {
          display: grid;
          grid-template-columns: 150px 1fr 110px;
          gap: 8px;
          align-items: center;
          border-radius: 10px;
          padding: 7px 10px;
          color: white;
          background: linear-gradient(135deg, #05254a 0%, #0b3556 52%, #0f6670 100%);
          border: 1px solid rgba(255,255,255,.18);
        }
        .pmr-benchmark-header img { width: 130px; max-height: 39px; object-fit: contain; filter: brightness(0) invert(1); }
        .pmr-benchmark-header h1 { margin: 1px 0; font-size: 16px; line-height: 1.05; }
        .pmr-benchmark-header p { margin: 0; color: rgba(255,255,255,.76); font-size: 7.8px; line-height: 1.2; }
        .pmr-benchmark-meta { display: grid; gap: 2px; justify-items: end; color: rgba(255,255,255,.82); font-size: 7.2px; }
        .pmr-benchmark-meta strong { color: white; font-size: 11px; }
        .pmr-benchmark-page .kpi-grid { grid-template-columns: repeat(6, 1fr); gap: 4px; }
        .pmr-benchmark-page .kpi-card { min-height: 39px; border-radius: 8px; padding: 5px 7px; box-shadow: none; }
        .pmr-benchmark-page .kpi-label { font-size: 5.8px; line-height: 1.1; }
        .pmr-benchmark-page .kpi-value { margin-top: 2px; font-size: 10.6px; }
        .pmr-benchmark-page .kpi-detail { margin-top: 2px; font-size: 5.9px; line-height: 1.12; }
        .pmr-benchmark-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          align-items: start;
        }
        .pmr-benchmark-grid.three {
          grid-template-columns: .86fr 1.07fr 1.07fr;
        }
        .pmr-benchmark-note {
          border-radius: 8px;
          padding: 6px 8px;
          background: #e9f7f6;
          border: 1px solid #b9dfdc;
          color: #12313c;
          font-size: 7px;
          line-height: 1.25;
        }
        .pmr-benchmark-note strong { color: #0a6f79; }
        .pmr-benchmark-page .report-section { border-radius: 8px; box-shadow: none; }
        .pmr-benchmark-page .section-head { padding: 5px 7px; }
        .pmr-benchmark-page .section-head h2 { font-size: 8.2px; }
        .pmr-benchmark-page .section-head p { margin-top: 2px; font-size: 6.2px; line-height: 1.18; }
        .pmr-benchmark-page .report-table,
        .pmr-benchmark-page .report-table.compact {
          font-size: 5.95px;
          line-height: 1.08;
        }
        .pmr-benchmark-page .report-table th,
        .pmr-benchmark-page .report-table td {
          padding: 2px 2px;
        }
        .pmr-benchmark-page .bar-list { padding: 6px 7px; gap: 5px; }
        .pmr-benchmark-page .bar-row { gap: 3px; }
        .pmr-benchmark-page .bar-meta { font-size: 6.2px; }
        .pmr-benchmark-page .bar-track { height: 5px; }
        .heatmap-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 6px;
          line-height: 1.08;
        }
        .heatmap-table th {
          padding: 3px 3px;
          color: #ffffff;
          text-align: right;
          background: #075b69;
          border: 1px solid rgba(255,255,255,.25);
          overflow-wrap: anywhere;
        }
        .heatmap-table th:first-child,
        .heatmap-table td:first-child {
          text-align: left;
          font-weight: 800;
        }
        .heatmap-table td {
          padding: 3px 3px;
          text-align: right;
          border: 1px solid rgba(15, 42, 55, .18);
          color: #102435;
          font-weight: 750;
          overflow-wrap: anywhere;
        }
        .heat-green { background: #bfeadf; }
        .heat-yellow { background: #fff0b8; }
        .heat-red { background: #f6b2ad; }
        .heat-neutral { background: #eef4f6; color: #607080; }
        @media print {
          body { background: white; }
          .report-section, .kpi-card, .hero { box-shadow: none; }
          .pmr-document .pmr-page,
          .pmr-document .pmr-benchmark-page { break-after: page; }
          .pmr-document .pmr-page:last-child,
          .pmr-document .pmr-benchmark-page:last-child { break-after: auto; }
        }
      </style>
    </head>
    <body>
      <main class="report-page ${reportEscape(documentClass)}">
        ${hideHero ? "" : `<header class="hero">
          <div class="eyebrow">Report</div>
          <h1>${reportEscape(title)}</h1>
          <p>${reportEscape(subtitle)}</p>
          <div class="meta-line">
            <span class="pill">Report: ${reportEscape(title)}</span>
            ${periodLabel ? `<span class="pill">Datenstand: ${reportEscape(periodLabel)}</span>` : ""}
            <span class="pill">Erstellt: ${reportEscape(reportDateStamp())}</span>
            <span class="pill">Vertraulich</span>
            <span class="pill">${orientation === "landscape" ? "A4 Querformat" : "A4 Hochformat"}</span>
          </div>
        </header>`}
        ${body}
        <footer class="report-footer">
          <span>© Orisus Zahnmedizin MVZ GmbH</span>
          <span>${reportEscape(footerNote ?? "Vertraulich | Nur für Geschäftsführung, Banken und autorisierte Empfänger")}</span>
          <span>Druckexport</span>
        </footer>
      </main>
    </body>
  </html>`;
}

function openPrintableReport(title: string, html: string) {
  if (typeof window === "undefined") return;
  const popup = window.open("", "_blank", "width=1280,height=900");
  if (!popup) {
    window.alert("Der Report konnte nicht geöffnet werden. Bitte Pop-ups für diese App erlauben.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 400);
}

function siteFinancialReportRows(sites: DashboardSite[]) {
  return sortSitesByContractStart(sites)
    .filter((site) => site.gesamtleistung || site.ebitda || site.cashflow || site.kontostand || site.forderungen)
    .map((site) => [
      site.name,
      site.start,
      eur(site.gesamtleistung),
      eur(site.pvsUmsatz),
      eur(site.ebitda),
      pct(site.ebitdaMarge),
      eur(site.cashflow),
      eur(site.forderungen),
      eur(site.kontostand)
    ]);
}

function debtReportRows(sites: DashboardSite[]) {
  return sortSitesByContractStart(sites).map((site) => [
    site.name,
    eur(site.darlehen.kaufpreis),
    eur(site.darlehen.darlehen),
    eur(site.darlehen.restschuld),
    eur(site.darlehen.tilgung),
    eur(site.darlehen.zins),
    eur(Math.max(0, (site.darlehen.earnOutGesamt ?? 0) - (site.darlehen.earnOutGezahlt ?? 0))),
    site.darlehen.earnOutFaelligAm ?? ""
  ]);
}

function bankMovementReportRows(importedData?: ImportedDashboardData | null) {
  const rows = (importedData?.bankMovementRows ?? []).filter((row) => row.siteId && row.siteId !== "konzern");
  const availablePeriods = periodOptionsFromBankMovements(rows);
  const period = defaultPeriodFromOptions(availablePeriods);
  const visibleMonths = monthSelectionForPeriod(period);
  const selection = selectedBwaPeriod(period);
  const definitions = [
    { label: "Geldeingang Bank gesamt", key: "geldeingang_bank_gesamt" },
    { label: "davon Praxisumsatz", key: "davon_praxisumsatz" },
    { label: "davon sonstiges", key: "davon_sonstiges_erstattungen_etc" },
    { label: "Geldausgang Bank inkl. Kredit", key: "geldausgang_bank_inkl_kredit" },
    { label: "davon Praxisausgaben", key: "davon_praxisausgaben" },
    { label: "davon Tilgung + Zins", key: "davon_tilgung_zins" },
    { label: "davon Umbuchungen an Orisus ZMVZ", key: "davon_umbuchungen_an_orisus_zmvz" },
    { label: "Bank-Cashflow vor Intercompany", key: "cashflow_vor_intercompany" },
    { label: "Bank-Cashflow gesamt", key: "cashflow_gesamt_im_monat" },
    { label: "Kontostand Monatsende", key: "kontostand_monatsende", snapshot: true }
  ];

  const valueForDefinition = (definition: (typeof definitions)[number]) => {
    const matchingRows = rows.filter((row) => matchesBankMovementKey(row.label, definition.key));
    if (definition.snapshot) return snapshotValueForRows(matchingRows, period, visibleMonths);
    return matchingRows.reduce((sum, row) => sum + bankMovementValueForPeriod(row, period), 0);
  };

  const monthlyValueForDefinition = (definition: (typeof definitions)[number], month: number) => {
    if (!selection.year) return "";
    const matchingRows = rows.filter((row) => matchesBankMovementKey(row.label, definition.key));
    const key = `${selection.year}-${month}`;
    if (!matchingRows.some((row) => row.hasValueByMonth[key])) return "";
    const value = matchingRows.reduce((sum, row) => sum + (row.valuesByMonth[key] ?? 0), 0);
    return eur(value);
  };

  return {
    period,
    headers: ["Position", ...bwaMonths, "Gesamt"],
    rows: definitions.map((definition) => [
      definition.label,
      ...bwaMonths.map((_, index) => (visibleMonths.has(index + 1) ? monthlyValueForDefinition(definition, index + 1) : "")),
      eur(valueForDefinition(definition))
    ])
  };
}

function reportStatusDot(status: Status | "neutral") {
  const color = status === "green" ? "#16a34a" : status === "yellow" ? "#f59e0b" : status === "red" ? "#dc2626" : "#94a3b8";
  const label = status === "green" ? "Stabil" : status === "yellow" ? "Beobachten" : status === "red" ? "Handlungsbedarf" : "n/a";
  return `<span class="status-dot" style="background:${color}"></span><span class="status-label">${reportEscape(label)}</span>`;
}

function reportStatusDotWithLabel(status: Status | "neutral", label: string) {
  if (status === "neutral") return "";
  const color = status === "green" ? "#16a34a" : status === "yellow" ? "#f59e0b" : "#dc2626";
  return `<span class="status-dot" style="background:${color}"></span><span class="status-label">${reportEscape(label)}</span>`;
}

function trendStatus(current: number, previous: number, higherIsBetter = true, tolerancePct = 2): Status | "neutral" {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return "neutral";
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) <= tolerancePct) return "yellow";
  const improved = higherIsBetter ? change > 0 : change < 0;
  return improved ? "green" : "red";
}

function quoteTrendStatus(current: number, previous: number, higherIsBetter = true, tolerancePp = 0.5): Status | "neutral" {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return "neutral";
  const diff = current - previous;
  if (Math.abs(diff) <= tolerancePp) return "yellow";
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  return improved ? "green" : "red";
}

function pmrTrendStatusLabel(status: Status | "neutral", higherIsBetter: boolean) {
  if (status === "neutral") return "";
  if (status === "yellow") return "nahe VJ";
  if (higherIsBetter) return status === "green" ? "über VJ" : "unter VJ";
  return status === "green" ? "unter VJ" : "erhöht ggü. VJ";
}

function pmrEbitdaTargetStatusLabel(status: Status | "neutral") {
  if (status === "green") return "Ziel erreicht";
  if (status === "yellow") return "Ziel beobachten";
  if (status === "red") return "unter Ziel";
  return "";
}

function comparisonPeriodFor(period: string, comparisonYear: number) {
  const selection = selectedBwaPeriod(period);
  if (selection.months?.length) {
    if (selection.months.length === 1) return `${bwaMonths[selection.months[0] - 1]} ${comparisonYear}`;
    return `YTD ${comparisonYear} bis ${bwaMonths[selection.months.at(-1)! - 1]}`;
  }
  return `Geschäftsjahr ${comparisonYear}`;
}

function currentYearFromPeriod(period: string) {
  return selectedBwaPeriod(period).year ?? new Date().getFullYear();
}

function latestMonthLabelFromPeriod(period: string) {
  const months = selectedBwaPeriod(period).months;
  return months?.length ? bwaMonths[months.at(-1)! - 1] : "Dez";
}

function shortYear(year: number) {
  return String(year).slice(-2);
}

function pmrLatestMonthFromPeriod(period: string) {
  const selection = selectedBwaPeriod(period);
  return selection.months?.at(-1) ?? 12;
}

function pmrMonthPeriodFor(period: string, year: number) {
  const month = pmrLatestMonthFromPeriod(period);
  return `${bwaMonths[month - 1]} ${year}`;
}

function pmrYtdPeriodFor(period: string, year: number) {
  const month = pmrLatestMonthFromPeriod(period);
  return `YTD ${year} bis ${bwaMonths[month - 1]}`;
}

function pmrMonthHeader(period: string, year: number) {
  const month = pmrLatestMonthFromPeriod(period);
  return `${bwaMonths[month - 1]} ${shortYear(year)}`;
}

function pmrYtdHeader(period: string, year: number) {
  const month = pmrLatestMonthFromPeriod(period);
  return `YTD ${shortYear(year)} bis ${bwaMonths[month - 1]}`;
}

function pmrBwaLines(importedData: ImportedDashboardData, siteId: string, period: string) {
  const allowedKeys = new Set(bwaMetricDefinitions.filter((definition) => definition.order <= 580).map((definition) => definition.key));
  return buildImportedBwaLines(importedData.bwaRows, period, siteId).filter((row) => row.metricKey && allowedKeys.has(row.metricKey as (typeof bwaMetricDefinitions)[number]["key"]));
}

function pmrBwaReportTable(importedData: ImportedDashboardData, siteId: string, period: string, comparisonYear: number) {
  const currentYear = currentYearFromPeriod(period);
  const currentMonthPeriod = pmrMonthPeriodFor(period, currentYear);
  const previousMonthPeriod = pmrMonthPeriodFor(period, comparisonYear);
  const currentYtdPeriod = pmrYtdPeriodFor(period, currentYear);
  const previousYtdPeriod = pmrYtdPeriodFor(period, comparisonYear);
  const currentRows = pmrBwaLines(importedData, siteId, currentYtdPeriod);
  const currentMonthRows = new Map(pmrBwaLines(importedData, siteId, currentMonthPeriod).map((row) => [row.metricKey, row]));
  const previousMonthRows = new Map(pmrBwaLines(importedData, siteId, previousMonthPeriod).map((row) => [row.metricKey, row]));
  const previousYtdRows = new Map(pmrBwaLines(importedData, siteId, previousYtdPeriod).map((row) => [row.metricKey, row]));
  const costKeys = new Set([
    "fremdlabor_gesamt",
    "materialkosten_gesamt",
    "personalkosten_gesamt",
    "reparatur_instandhaltung",
    "miete_nebenkosten",
    "reise_fortbildung_seminare",
    "summe_sonstige_kosten",
    "operative_prozesskosten_bis_ebitda"
  ]);
  const trafficLightKeys = new Set([
    "summe_umsatz",
    "gesamtleistung_abzueglich_fremdlabor_material",
    "deckungsbeitrag",
    "operative_prozesskosten_bis_ebitda",
    "ebitda"
  ]);
  const quoteRowKeys = new Set([
    "gesamtleistungsquote",
    "praxisleistungsquote",
    "deckungsbeitragsquote",
    "ebitda_marge",
    "abweichung_ziel_ebitda_kaufvertrag_pct",
    "abweichung_ziel_ebitda_uebernahme_pct"
  ]);
  const htmlRows = currentRows.map((row) => {
    const currentMonth = currentMonthRows.get(row.metricKey)?.actual ?? 0;
    const previousMonth = previousMonthRows.get(row.metricKey)?.actual ?? 0;
    const previousYtd = previousYtdRows.get(row.metricKey);
    const isSectionRow = row.emphasis && row.actual === 0 && !row.percent;
    const currentYtd = row.actual;
    const previousYtdValue = previousYtd?.actual ?? 0;
    const hasCurrentMonth = hasImportedMetricPeriodValue(importedData.bwaRows, siteId, row.metricKey, currentMonthPeriod);
    const hasPreviousMonth = hasImportedMetricPeriodValue(importedData.bwaRows, siteId, row.metricKey, previousMonthPeriod);
    const hasCurrentYtd = hasImportedMetricPeriodValue(importedData.bwaRows, siteId, row.metricKey, currentYtdPeriod);
    const hasPreviousYtd = hasImportedMetricPeriodValue(importedData.bwaRows, siteId, row.metricKey, previousYtdPeriod);
    const higherIsBetter = !costKeys.has(String(row.metricKey));
    const isEbitdaRow = row.metricKey === "ebitda";
    const status =
      isEbitdaRow
        ? (() => {
            const takeoverTarget = importedBwaMetricValue(importedData.bwaRows, siteId, "ziel_ebitda_uebernahme", currentYtdPeriod);
            return takeoverTarget ? statusByRule(ratio(currentYtd, takeoverTarget), defaultKpiRules.ziel_ebitda_uebernahme) : "neutral";
          })()
        : !isSectionRow && hasPreviousYtd && row.metricKey && trafficLightKeys.has(row.metricKey)
          ? row.percent
            ? quoteTrendStatus(currentYtd, previousYtdValue, higherIsBetter)
            : trendStatus(Math.abs(currentYtd), Math.abs(previousYtdValue), higherIsBetter)
          : "neutral";
    const statusLabel = isEbitdaRow ? pmrEbitdaTargetStatusLabel(status) : pmrTrendStatusLabel(status, higherIsBetter);
    const deviation = currentYtd - previousYtdValue;
    const deviationClass = !isSectionRow && hasPreviousYtd && deviation ? (deviation > 0 ? "positive" : "negative") : "";
    const valueClass = isVarianceRow(row.label) && currentYtd ? (currentYtd > 0 ? "positive" : "negative") : "";
    const formatted = (value: number) => row.percent ? pct(value) : eur(value);
    const rowClasses = [
      row.emphasis && !quoteRowKeys.has(String(row.metricKey)) ? "total" : "",
      quoteRowKeys.has(String(row.metricKey)) ? "quote-row" : "",
      isSectionRow ? "section" : ""
    ].filter(Boolean).join(" ");
    return `<tr class="${rowClasses}">
      <td>${reportEscape(row.label)}</td>
      <td class="${valueClass}">${isSectionRow || !hasCurrentMonth ? "" : reportEscape(formatted(currentMonth))}</td>
      <td>${isSectionRow || !hasPreviousMonth ? "" : reportEscape(formatted(previousMonth))}</td>
      <td class="${valueClass}">${isSectionRow || !hasCurrentYtd ? "" : reportEscape(formatted(currentYtd))}</td>
      <td>${isSectionRow || !hasPreviousYtd ? "" : reportEscape(formatted(previousYtdValue))}</td>
      <td class="${deviationClass}">${isSectionRow || !hasPreviousYtd ? "" : reportEscape(row.percent ? pct(deviation) : eur(deviation))}</td>
      <td>${status === "neutral" ? "" : reportStatusDotWithLabel(status, statusLabel)}</td>
    </tr>`;
  }).join("");
  return `<table class="pmr-table bwa-overview">
    <thead><tr><th>Position</th><th>${reportEscape(pmrMonthHeader(period, currentYear))}</th><th>${reportEscape(pmrMonthHeader(period, comparisonYear))}</th><th>${reportEscape(pmrYtdHeader(period, currentYear))}</th><th>${reportEscape(pmrYtdHeader(period, comparisonYear))}</th><th>Abw.</th><th>Ampel</th></tr></thead>
    <tbody>${htmlRows}</tbody>
  </table>`;
}

function pmrQuoteRows(importedData: ImportedDashboardData, siteId: string, period: string, comparisonYear: number) {
  const previousPeriod = comparisonPeriodFor(period, comparisonYear);
  const value = (metricKey: string, targetPeriod = period) => importedBwaMetricValue(importedData.bwaRows, siteId, metricKey, targetPeriod);
  const hasValue = (metricKey: string, targetPeriod = period) => hasImportedMetricPeriodValue(importedData.bwaRows, siteId, metricKey, targetPeriod);
  const quote = (numerator: string, denominator = "summe_umsatz", targetPeriod = period) => ratio(value(numerator, targetPeriod), value(denominator, targetPeriod));
  const definitions = [
    { label: "EBITDA-Marge", current: quote("ebitda"), previous: quote("ebitda", "summe_umsatz", previousPeriod), hasPrevious: hasValue("ebitda", previousPeriod) && hasValue("summe_umsatz", previousPeriod), higher: true },
    { label: "Personalkostenquote", current: ratio(Math.abs(value("personalkosten_gesamt")), value("summe_umsatz")), previous: ratio(Math.abs(value("personalkosten_gesamt", previousPeriod)), value("summe_umsatz", previousPeriod)), hasPrevious: hasValue("personalkosten_gesamt", previousPeriod) && hasValue("summe_umsatz", previousPeriod), higher: false },
    { label: "Materialquote", current: ratio(Math.abs(value("materialkosten_gesamt")), value("summe_umsatz")), previous: ratio(Math.abs(value("materialkosten_gesamt", previousPeriod)), value("summe_umsatz", previousPeriod)), hasPrevious: hasValue("materialkosten_gesamt", previousPeriod) && hasValue("summe_umsatz", previousPeriod), higher: false },
    { label: "Fremdlaborquote", current: ratio(Math.abs(value("fremdlabor_gesamt")), value("summe_umsatz")), previous: ratio(Math.abs(value("fremdlabor_gesamt", previousPeriod)), value("summe_umsatz", previousPeriod)), hasPrevious: hasValue("fremdlabor_gesamt", previousPeriod) && hasValue("summe_umsatz", previousPeriod), higher: false },
    { label: "Sachkostenquote", current: ratio(Math.abs(value("summe_sonstige_kosten")), value("summe_umsatz")), previous: ratio(Math.abs(value("summe_sonstige_kosten", previousPeriod)), value("summe_umsatz", previousPeriod)), hasPrevious: hasValue("summe_sonstige_kosten", previousPeriod) && hasValue("summe_umsatz", previousPeriod), higher: false },
    { label: "Deckungsbeitragsquote", current: quote("deckungsbeitrag"), previous: quote("deckungsbeitrag", "summe_umsatz", previousPeriod), hasPrevious: hasValue("deckungsbeitrag", previousPeriod) && hasValue("summe_umsatz", previousPeriod), higher: true }
  ];
  return `<table class="pmr-table compact">
    <thead><tr><th>Kennzahl</th><th>Aktuell</th><th>Vorjahr</th><th>Delta</th><th>Status</th></tr></thead>
    <tbody>${definitions.map((row) => {
      const delta = row.current - row.previous;
      return `<tr>
        <td>${reportEscape(row.label)}</td>
        <td>${reportEscape(pct(row.current))}</td>
        <td>${row.hasPrevious ? reportEscape(pct(row.previous)) : ""}</td>
        <td>${row.hasPrevious ? reportEscape(pct(delta)) : ""}</td>
        <td>${row.hasPrevious ? reportStatusDot(quoteTrendStatus(row.current, row.previous, row.higher)) : ""}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}

function periodValueFromMonths(valuesByMonth: Record<string, number>, period: string) {
  const selection = selectedBwaPeriod(period);
  if (selection.year && selection.months?.length) return selection.months.reduce((sum, month) => sum + (valuesByMonth[`${selection.year}-${month}`] ?? 0), 0);
  if (selection.year) return Array.from({ length: 12 }, (_, index) => valuesByMonth[`${selection.year}-${index + 1}`] ?? 0).reduce((sum, value) => sum + value, 0);
  return Object.values(valuesByMonth).reduce((sum, value) => sum + value, 0);
}

type PersonnelCostComparisonRow = {
  employeeId: string;
  name: string;
  type: string;
  status: string;
  personnelCost: number;
  honorar: number;
  pkQuote: number;
};

const pmrPersonnelCostExclusionsBySite: Record<string, Set<string>> = {
  kirchberg: new Set([
    "samira_pomsel",
    "s_pomsel",
    "prophylaxe_unregelmassige_behandler",
    "prophylaxe_unregelmaessige_behandler",
    "prophylaxe_unregelm_behandler",
    "pzr_dietrich",
    "s_dietrich"
  ])
};

function isExcludedFromPmrPersonnelCostReport(siteId: string, row: PersonnelCostComparisonRow) {
  const excludedNames = pmrPersonnelCostExclusionsBySite[siteId];
  if (!excludedNames) return false;
  return excludedNames.has(normalizeMetric(row.name));
}

function personnelCostComparisonRows(importedData: ImportedDashboardData | null | undefined, siteId: string): PersonnelCostComparisonRow[] {
  const providerRows = new Map((importedData?.behandlerDetailRows ?? []).filter((row) => row.siteId === siteId).map((row) => [normalizeMetric(row.name), row]));
  const grouped = new Map<string, PersonnelCostComparisonRow & { fallbackHonorar: number }>();

  (importedData?.personnelCostRows ?? [])
    .filter((row) => row.siteId === siteId)
    .forEach((row) => {
      const key = row.employeeId || normalizeMetric(row.name);
      const existing = grouped.get(key) ?? {
        employeeId: row.employeeId,
        name: row.name,
        type: row.type,
        status: row.status,
        personnelCost: 0,
        honorar: 0,
        fallbackHonorar: 0,
        pkQuote: 0
      };
      existing.personnelCost += periodValueFromMonths(row.personnelCostByMonth, "Gesamte Periode") || row.personnelCost;
      existing.fallbackHonorar += row.honorar;
      existing.type = existing.type || row.type;
      existing.status = row.status || existing.status;
      grouped.set(key, existing);
    });

  return Array.from(grouped.values())
    .map((row) => {
      const matchedProvider = providerRows.get(normalizeMetric(row.name));
      const honorar = matchedProvider ? periodValueFromMonths(matchedProvider.honorarByMonth, "Gesamte Periode") : row.fallbackHonorar;
      return {
        employeeId: row.employeeId,
        name: row.name,
        type: row.type,
        status: row.status,
        personnelCost: row.personnelCost,
        honorar,
        pkQuote: honorar ? row.personnelCost / honorar : 0
      };
    })
    .filter((row) => row.personnelCost || row.honorar || row.pkQuote)
    .sort((a, b) => b.personnelCost - a.personnelCost || a.name.localeCompare(b.name, "de"));
}

function pmrProviderRows(importedData: ImportedDashboardData, siteId: string, period: string, comparisonYear: number) {
  const comparisonPeriod = comparisonPeriodFor(period, comparisonYear);
  const rows = (importedData.behandlerDetailRows ?? [])
    .filter((row) => row.siteId === siteId)
    .map((row) => {
      const honorar = periodValueFromMonths(row.honorarByMonth, period);
      const eigenlabor = periodValueFromMonths(row.eigenlaborByMonth, period);
      const total = honorar + eigenlabor;
      const previousTotal = periodValueFromMonths(row.totalByMonth, comparisonPeriod);
      return { name: row.name, honorar, eigenlabor, total, previousTotal };
    })
    .filter((row) => Math.abs(row.total) > 0 || Math.abs(row.previousTotal) > 0)
    .sort((a, b) => b.total - a.total);
  const totalRevenue = rows.reduce((sum, row) => sum + row.total, 0);
  return `<table class="pmr-table compact">
    <thead><tr><th>Behandler</th><th>Honorar</th><th>Eigenlabor</th><th>Umsatz gesamt</th><th>Anteil</th><th>VJ</th><th>Delta</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${reportEscape(row.name)}</td>
      <td>${reportEscape(eur(row.honorar))}</td>
      <td>${reportEscape(eur(row.eigenlabor))}</td>
      <td>${reportEscape(eur(row.total))}</td>
      <td>${reportEscape(pct(ratio(row.total, totalRevenue)))}</td>
      <td>${reportEscape(eur(row.previousTotal))}</td>
      <td>${reportEscape(eur(row.total - row.previousTotal))}</td>
    </tr>`).join("")}
    <tr class="total"><td>Gesamt</td><td>${reportEscape(eur(rows.reduce((sum, row) => sum + row.honorar, 0)))}</td><td>${reportEscape(eur(rows.reduce((sum, row) => sum + row.eigenlabor, 0)))}</td><td>${reportEscape(eur(totalRevenue))}</td><td>100 %</td><td>${reportEscape(eur(rows.reduce((sum, row) => sum + row.previousTotal, 0)))}</td><td>${reportEscape(eur(rows.reduce((sum, row) => sum + row.total - row.previousTotal, 0)))}</td></tr>
    </tbody>
  </table>`;
}

function pmrPersonnelCostRows(importedData: ImportedDashboardData, siteId: string) {
  const rows = personnelCostComparisonRows(importedData, siteId).filter((row) => !isExcludedFromPmrPersonnelCostReport(siteId, row));
  return `<table class="pmr-table compact">
    <thead><tr><th>Mitarbeiter</th><th>Typ</th><th>Personalkosten</th><th>Honorarumsatz</th><th>PK-Quote</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${reportEscape(row.name)}</td>
      <td>${reportEscape(row.type)}</td>
      <td>${reportEscape(eur(row.personnelCost))}</td>
      <td>${reportEscape(eur(row.honorar))}</td>
      <td>${reportEscape(pctOneDecimal(row.pkQuote * 100))}</td>
    </tr>`).join("")}
    <tr class="total"><td>Gesamt</td><td></td><td>${reportEscape(eur(rows.reduce((sum, row) => sum + row.personnelCost, 0)))}</td><td>${reportEscape(eur(rows.reduce((sum, row) => sum + row.honorar, 0)))}</td><td>${reportEscape(pctOneDecimal(ratio(rows.reduce((sum, row) => sum + row.personnelCost, 0), rows.reduce((sum, row) => sum + row.honorar, 0))))}</td></tr>
    </tbody>
  </table>`;
}

function pmrMonthlyEbitdaTable(importedData: ImportedDashboardData, siteId: string, year: number) {
  const ebitdaRow = importedData.bwaRows.find((row) => row.siteId === siteId && row.metricKey === "ebitda");
  const performanceRow = importedData.bwaRows.find((row) => row.siteId === siteId && row.metricKey === "summe_umsatz");
  const margin = (month: number) => ratio(ebitdaRow?.valuesByMonth[`${year}-${month}`] ?? 0, performanceRow?.valuesByMonth[`${year}-${month}`] ?? 0);
  return `<table class="pmr-table compact monthly">
    <thead><tr><th>Monat</th>${bwaMonths.map((month) => `<th>${month}</th>`).join("")}<th>Gesamt</th></tr></thead>
    <tbody>
      <tr><td>Gesamtleistung</td>${bwaMonths.map((_, index) => `<td>${reportEscape(eur(performanceRow?.valuesByMonth[`${year}-${index + 1}`] ?? 0))}</td>`).join("")}<td>${reportEscape(eur(performanceRow?.valuesByYear[String(year)] ?? 0))}</td></tr>
      <tr><td>EBITDA</td>${bwaMonths.map((_, index) => `<td>${reportEscape(eur(ebitdaRow?.valuesByMonth[`${year}-${index + 1}`] ?? 0))}</td>`).join("")}<td>${reportEscape(eur(ebitdaRow?.valuesByYear[String(year)] ?? 0))}</td></tr>
      <tr><td>EBITDA-Marge</td>${bwaMonths.map((_, index) => `<td>${reportEscape(pct(margin(index + 1)))}</td>`).join("")}<td>${reportEscape(pct(ratio(ebitdaRow?.valuesByYear[String(year)] ?? 0, performanceRow?.valuesByYear[String(year)] ?? 0)))}</td></tr>
    </tbody>
  </table>`;
}

function pmrBenchmarkAverage(values: Array<number | null | undefined>) {
  const finiteValues = values.filter((value): value is number => value != null && Number.isFinite(value));
  return finiteValues.length ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : null;
}

function pmrBenchmarkIndex(value: number | null | undefined, basis: number | null | undefined) {
  return value != null && basis ? (value / basis) * 100 : null;
}

function pmrBenchmarkHeatClass(value: number | null | undefined, reference: number | null | undefined, higherIsBetter = false) {
  if (value == null || reference == null || !Number.isFinite(value) || !Number.isFinite(reference)) return "heat-neutral";
  const diff = value - reference;
  if (Math.abs(diff) <= 0.5) return "heat-yellow";
  const good = higherIsBetter ? diff >= 0 : diff <= 0;
  return good ? "heat-green" : "heat-red";
}

function pmrBenchmarkFormat(value: number | null | undefined, type: "currency" | "percent" | "index" | "number") {
  if (value == null || !Number.isFinite(value)) return "n. v.";
  if (type === "currency") return eur(value);
  if (type === "percent") return pct(value);
  if (type === "index") return `${value.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %`;
  return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function pmrBenchmarkRankingRows<T extends { label: string; value: number | null; siteId: string }>(rows: T[], selectedSiteId: string, count = 5) {
  const sortedRows = rows
    .filter((row) => row.value != null && Number.isFinite(row.value))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const topRows = sortedRows.slice(0, count);
  const selectedRow = sortedRows.find((row) => row.siteId === selectedSiteId);
  if (selectedRow && !topRows.some((row) => row.siteId === selectedSiteId)) return [...topRows.slice(0, Math.max(0, count - 1)), selectedRow];
  return topRows;
}

function buildPmrBenchmarkPage(
  site: DashboardSite,
  sites: DashboardSite[],
  importedData: ImportedDashboardData,
  personalData: PersonalDashboardData | null | undefined,
  period: string
) {
  const periodLabel = performancePeriodLabel(period);
  const benchmarkSites = sortSitesByContractStart(
    sites
      .map((candidate) => filteredSiteForPeriod(candidate, importedData, period))
      .filter((candidate) => candidate.gesamtleistung || candidate.ebitda || candidate.pvsUmsatz || candidate.forderungen)
  );
  const selectedSite = benchmarkSites.find((candidate) => candidate.id === site.id) ?? filteredSiteForPeriod(site, importedData, period);
  const siteMap = new Map<string, DashboardSite>();
  [...benchmarkSites, selectedSite].forEach((candidate) => siteMap.set(candidate.id, candidate));
  const visibleSites = Array.from(siteMap.values());
  const peerLabelsBySiteId = new Map(
    visibleSites
      .filter((candidate) => candidate.id !== selectedSite.id)
      .map((candidate, index) => [candidate.id, anonymousBenchmarkSiteLabel(index)])
  );
  const labelForSite = (candidate: DashboardSite) => candidate.id === selectedSite.id ? candidate.name : peerLabelsBySiteId.get(candidate.id) ?? "Peer";
  const dentistCapacityBySite = dentistCapacityBySiteForPeriod(personalData?.employees ?? [], period);
  const patientRows = importedData.patientRows ?? [];

  const rows = visibleSites.map((candidate) => {
    const dentistCapacity = dentistCapacityBySite.get(candidate.id);
    const dentistFte = dentistCapacity?.fte ?? 0;
    const importedRoomCount = asNumber(candidate.treatmentRooms);
    const rooms = importedRoomCount && importedRoomCount > 0 ? importedRoomCount : staticTreatmentRoomsForSite(candidate.name);
    const weeklyOpeningHours = practiceOpeningHoursForSite(candidate.id);
    const openingHoursBasis = openingHoursBasisForPeriod(candidate, period, weeklyOpeningHours);
    const treatedPatients = patientMetricPeriodOptionalValue(patientRows, candidate.id, "treatedPatients", period);
    const newPatients = patientMetricPeriodOptionalValue(patientRows, candidate.id, "newPatients", period);
    const bookedAppointments = patientMetricPeriodOptionalValue(patientRows, candidate.id, "bookedAppointments", period);
    const attendedAppointments = patientMetricPeriodOptionalValue(patientRows, candidate.id, "attendedAppointments", period);
    const missedAppointments = patientMetricPeriodOptionalValue(patientRows, candidate.id, "missedAppointments", period);
    const attendanceRateSource = patientMetricPeriodOptionalValue(patientRows, candidate.id, "attendanceRate", period);
    const cancellationRateSource = patientMetricPeriodOptionalValue(patientRows, candidate.id, "cancellationRate", period);
    const importedPatientsPerRoom = patientMetricPeriodOptionalValue(patientRows, candidate.id, "patientsPerRoom", period);
    const attendanceRate =
      bookedAppointments != null && bookedAppointments > 0 && attendedAppointments != null
        ? (attendedAppointments / bookedAppointments) * 100
        : attendanceRateSource != null
          ? normalizedPercent(attendanceRateSource)
          : null;
    const cancellationRate =
      bookedAppointments != null && bookedAppointments > 0 && missedAppointments != null
        ? (missedAppointments / bookedAppointments) * 100
        : cancellationRateSource != null
          ? normalizedPercent(cancellationRateSource)
          : null;
    const newPatientRate = treatedPatients != null && treatedPatients > 0 && newPatients != null ? (newPatients / treatedPatients) * 100 : null;
    const patientsPerRoom = treatedPatients != null && rooms ? treatedPatients / rooms : importedPatientsPerRoom;

    return {
      siteId: candidate.id,
      label: labelForSite(candidate),
      pvsPerDentist: dentistFte ? candidate.pvsUmsatz / dentistFte : null,
      ebitdaMargin: candidate.ebitdaMarge,
      pvsPerRoom: rooms ? candidate.pvsUmsatz / rooms : null,
      pvsPerOpeningHour: openingHoursBasis ? candidate.pvsUmsatz / openingHoursBasis : null,
      patientsPerRoom,
      attendanceRate,
      cancellationRate,
      newPatientRate,
      materialquote: candidate.materialquote,
      fremdlaborquote: candidate.fremdlaborquote,
      personalquote: candidate.personalquote ?? 0,
      sonstigeKostenquote: candidate.sonstigeKostenquote,
      gesamtkostenquote: boardCostRatio(candidate)
    };
  });

  const selectedRow = rows.find((row) => row.siteId === selectedSite.id) ?? rows[0];
  const averages = {
    pvsPerDentist: pmrBenchmarkAverage(rows.map((row) => row.pvsPerDentist)),
    ebitdaMargin: pmrBenchmarkAverage(rows.map((row) => row.ebitdaMargin)),
    pvsPerRoom: pmrBenchmarkAverage(rows.map((row) => row.pvsPerRoom)),
    pvsPerOpeningHour: pmrBenchmarkAverage(rows.map((row) => row.pvsPerOpeningHour)),
    patientsPerRoom: pmrBenchmarkAverage(rows.map((row) => row.patientsPerRoom)),
    attendanceRate: pmrBenchmarkAverage(rows.map((row) => row.attendanceRate)),
    cancellationRate: pmrBenchmarkAverage(rows.map((row) => row.cancellationRate)),
    newPatientRate: pmrBenchmarkAverage(rows.map((row) => row.newPatientRate)),
    materialquote: pmrBenchmarkAverage(rows.map((row) => row.materialquote)),
    fremdlaborquote: pmrBenchmarkAverage(rows.map((row) => row.fremdlaborquote)),
    personalquote: pmrBenchmarkAverage(rows.map((row) => row.personalquote)),
    sonstigeKostenquote: pmrBenchmarkAverage(rows.map((row) => row.sonstigeKostenquote)),
    gesamtkostenquote: pmrBenchmarkAverage(rows.map((row) => row.gesamtkostenquote))
  };
  const indexCards = [
    {
      label: "Umsatz je Zahnarzt-FTE",
      value: pmrBenchmarkIndex(selectedRow?.pvsPerDentist, averages.pvsPerDentist),
      group: 100,
      higherIsBetter: true,
      type: "index" as const
    },
    {
      label: "EBITDA-Marge",
      value: selectedRow?.ebitdaMargin ?? null,
      group: averages.ebitdaMargin,
      higherIsBetter: true,
      type: "percent" as const
    },
    {
      label: "Gesamtkostenquote",
      value: selectedRow?.gesamtkostenquote ?? null,
      group: averages.gesamtkostenquote,
      higherIsBetter: false,
      type: "percent" as const
    },
    {
      label: "Umsatz je Zimmer",
      value: pmrBenchmarkIndex(selectedRow?.pvsPerRoom, averages.pvsPerRoom),
      group: 100,
      higherIsBetter: true,
      type: "index" as const
    },
    {
      label: "Patienten je Zimmer",
      value: pmrBenchmarkIndex(selectedRow?.patientsPerRoom, averages.patientsPerRoom),
      group: 100,
      higherIsBetter: true,
      type: "index" as const
    },
    {
      label: "Terminwahrnehmung",
      value: selectedRow?.attendanceRate ?? null,
      group: averages.attendanceRate,
      higherIsBetter: true,
      type: "percent" as const
    }
  ];
  const kpiCards = reportKpiGrid(indexCards.map((card) => {
    const diff = card.value != null && card.group != null ? card.value - card.group : null;
    const tone = diff == null || !Number.isFinite(diff)
      ? "blue"
      : Math.abs(diff) < (card.type === "percent" ? 1 : 3)
        ? "yellow"
        : (card.higherIsBetter ? diff >= 0 : diff <= 0)
          ? "green"
          : "red";
    const suffix = card.type === "index" ? "Index" : "Vergleich";
    return {
      label: card.label,
      value: pmrBenchmarkFormat(card.value, card.type),
      detail: card.group == null ? "Vergleich n. v." : `${suffix}: ${pmrBenchmarkFormat(card.group, card.type)}`,
      tone
    };
  }));
  const pvsRanking = pmrBenchmarkRankingRows(rows.map((row) => ({ siteId: row.siteId, label: row.label, value: row.pvsPerDentist })), selectedSite.id);
  const marginRanking = pmrBenchmarkRankingRows(rows.map((row) => ({ siteId: row.siteId, label: row.label, value: row.ebitdaMargin })), selectedSite.id);
  const roomRanking = pmrBenchmarkRankingRows(rows.map((row) => ({ siteId: row.siteId, label: row.label, value: row.pvsPerRoom })), selectedSite.id);
  const pvsMax = Math.max(...pvsRanking.map((row) => row.value ?? 0), 1);
  const marginMax = Math.max(...marginRanking.map((row) => row.value ?? 0), 1);
  const roomMax = Math.max(...roomRanking.map((row) => row.value ?? 0), 1);
  const heatRows = rows.map((row) => `<tr>
    <td>${reportEscape(row.label)}</td>
    <td class="${pmrBenchmarkHeatClass(row.materialquote, averages.materialquote)}">${reportEscape(pmrBenchmarkFormat(row.materialquote, "percent"))}</td>
    <td class="${pmrBenchmarkHeatClass(row.fremdlaborquote, averages.fremdlaborquote)}">${reportEscape(pmrBenchmarkFormat(row.fremdlaborquote, "percent"))}</td>
    <td class="${pmrBenchmarkHeatClass(row.personalquote, averages.personalquote)}">${reportEscape(pmrBenchmarkFormat(row.personalquote, "percent"))}</td>
    <td class="${pmrBenchmarkHeatClass(row.sonstigeKostenquote, averages.sonstigeKostenquote)}">${reportEscape(pmrBenchmarkFormat(row.sonstigeKostenquote, "percent"))}</td>
    <td class="${pmrBenchmarkHeatClass(row.gesamtkostenquote, averages.gesamtkostenquote)}">${reportEscape(pmrBenchmarkFormat(row.gesamtkostenquote, "percent"))}</td>
  </tr>`).join("");
  const patientRowsHtml = rows.map((row) => `<tr>
    <td>${reportEscape(row.label)}</td>
    <td class="${pmrBenchmarkHeatClass(row.patientsPerRoom, averages.patientsPerRoom, true)}">${reportEscape(pmrBenchmarkFormat(row.patientsPerRoom, "number"))}</td>
    <td class="${pmrBenchmarkHeatClass(row.newPatientRate, averages.newPatientRate, true)}">${reportEscape(pmrBenchmarkFormat(row.newPatientRate, "percent"))}</td>
    <td class="${pmrBenchmarkHeatClass(row.attendanceRate, averages.attendanceRate, true)}">${reportEscape(pmrBenchmarkFormat(row.attendanceRate, "percent"))}</td>
    <td class="${pmrBenchmarkHeatClass(row.cancellationRate, averages.cancellationRate, false)}">${reportEscape(pmrBenchmarkFormat(row.cancellationRate, "percent"))}</td>
  </tr>`).join("");

  return `<div class="pmr-benchmark-page">
    <header class="pmr-benchmark-header">
      <div><img src="/orisus-logo.png" alt="Orisus Zahnmedizin" /></div>
      <div><div class="eyebrow">Benchmarking-Report</div><h1>Benchmark ${reportEscape(selectedSite.name)}</h1><p>${reportEscape(periodLabel)} | anonymisierter Peer-Auszug | Standortleiter-Anlage</p></div>
      <div class="pmr-benchmark-meta"><strong>Seite 2</strong><span>PMR-Anlage</span><span>Vertraulich</span></div>
    </header>
    ${kpiCards}
    <div class="pmr-benchmark-note">
      <strong>Leselogik:</strong> Der ausgewählte Standort bleibt im Klartext sichtbar. Alle Vergleichsstandorte werden anonymisiert. Index 100 % entspricht dem Vergleichsniveau im gewählten Zeitraum; bei Kostenquoten ist niedriger besser.
    </div>
    <div class="pmr-benchmark-grid three">
      ${reportSection("Peer-Auszug Umsatz je Zahnarzt-FTE", reportBarList(pvsRanking.map((row) => ({
        label: row.label,
        value: row.value ?? 0,
        max: pvsMax,
        tone: row.siteId === selectedSite.id ? "green" : "blue",
        suffix: pmrBenchmarkFormat(row.value, "currency")
      }))), "Normalisiert nach Zahnarzt-FTE im Zeitraum.")}
      ${reportSection("Peer-Auszug EBITDA-Marge", reportBarList(marginRanking.map((row) => ({
        label: row.label,
        value: row.value ?? 0,
        max: marginMax,
        tone: row.siteId === selectedSite.id ? "green" : "blue",
        suffix: pmrBenchmarkFormat(row.value, "percent")
      }))), "Ergebnisqualität im Vergleichsauszug.")}
      ${reportSection("Peer-Auszug Umsatz je Zimmer", reportBarList(roomRanking.map((row) => ({
        label: row.label,
        value: row.value ?? 0,
        max: roomMax,
        tone: row.siteId === selectedSite.id ? "green" : "blue",
        suffix: pmrBenchmarkFormat(row.value, "currency")
      }))), "Normalisiert nach Behandlungszimmern.")}
    </div>
    <div class="pmr-benchmark-grid">
      ${reportSection("Kostenquoten im Benchmark", `<table class="heatmap-table">
        <thead><tr><th>Peer</th><th>Material</th><th>Fremdlabor</th><th>Personal</th><th>Sonstige</th><th>Gesamt</th></tr></thead>
        <tbody>${heatRows}<tr><td>Vergleichsniveau</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.materialquote, "percent"))}</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.fremdlaborquote, "percent"))}</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.personalquote, "percent"))}</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.sonstigeKostenquote, "percent"))}</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.gesamtkostenquote, "percent"))}</td></tr></tbody>
      </table>`, "Ampelfarben gegen Vergleichsniveau; bei Kosten ist niedriger besser.")}
      ${reportSection("Patienten- und Terminindikatoren", `<table class="heatmap-table">
        <thead><tr><th>Peer</th><th>Pat./Zimmer</th><th>Neupatienten</th><th>Wahrnehmung</th><th>Ausfall</th></tr></thead>
        <tbody>${patientRowsHtml}<tr><td>Vergleichsniveau</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.patientsPerRoom, "number"))}</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.newPatientRate, "percent"))}</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.attendanceRate, "percent"))}</td><td class="heat-neutral">${reportEscape(pmrBenchmarkFormat(averages.cancellationRate, "percent"))}</td></tr></tbody>
      </table>`, "Patientenbasis aus dem bestätigten Import, soweit je Standort gepflegt.")}
    </div>
  </div>`;
}

function buildPmrSitePage(site: DashboardSite, importedData: ImportedDashboardData, period: string, comparisonYear: number) {
  const filteredSite = filteredSiteForPeriod(site, importedData, period);
  const projection = projectedEarnOutForSite(site, period);
  const year = currentYearFromPeriod(period);
  const periodLabel = performancePeriodLabel(period);
  const comparisonPeriod = comparisonPeriodFor(period, comparisonYear);
  const expectedPayout = projection.projectedEarnOut + projection.projectedGrowthPayment;
  const earnOutPotential = site.darlehen.earnOutGesamt ?? 0;
  const targetAchievement = ratio(filteredSite.ebitda, filteredSite.darlehen.zielEbitdaKaufvertrag || filteredSite.darlehen.zielEbitda);
  const targetAchievementTone: ReportTone = targetAchievement >= 100 ? "green" : targetAchievement >= 80 ? "yellow" : "red";
  return `<div class="pmr-page">
    <header class="pmr-header">
      <div class="pmr-logo"><img src="/orisus-logo.png" alt="Orisus Zahnmedizin" /></div>
      <div><div class="eyebrow">Standortleiter-Report</div><h1>PMR Standort ${reportEscape(site.name)}</h1><p>${reportEscape(periodLabel)} | Vergleich ${reportEscape(comparisonPeriod)}</p></div>
      <div class="pmr-meta"><strong>${reportEscape(year)}</strong><span>bis ${reportEscape(latestMonthLabelFromPeriod(period))}</span><span>Vertraulich</span></div>
    </header>
    <div class="pmr-grid top">
      <section class="pmr-section wide"><h2>BWA-Überblick bis EBITDA</h2>${pmrBwaReportTable(importedData, site.id, period, comparisonYear)}</section>
      <div class="pmr-stack">
        <section class="pmr-section"><h2>Quoten & Kennzahlen</h2>${pmrQuoteRows(importedData, site.id, period, comparisonYear)}</section>
        <section class="pmr-section payout"><h2>Auszahlungslogik Käufer - indikative Hochrechnung</h2>
          <div class="mini-grid">
            <div><span>Indikativ Earn-Out aktuell</span><strong>${reportEscape(eur(projection.projectedEarnOut, true))}</strong></div>
            <div><span>Indikative Wachstumszahlung</span><strong>${reportEscape(eur(projection.projectedGrowthPayment, true))}</strong></div>
            <div><span>Indikativ gesamt erwartet</span><strong>${reportEscape(eur(expectedPayout, true))}</strong></div>
          </div>
          <p>Earn-Out Potenzial: ${reportEscape(eur(earnOutPotential, true))} | Run-Rate EBITDA p.a.: ${reportEscape(eur(projection.projectedEbitda))} | SOLL EBITDA Vertragslaufzeit: ${reportEscape(eur(projection.contractTargetEbitda))} | EBITDA hochgerechnet: ${reportEscape(eur(projection.projectedContractEbitda))} | Wachstumslogik: ${reportEscape(growthFactorLabel(projection.growthFactor))}</p>
        </section>
      </div>
    </div>
    ${reportKpiGrid([
      { label: "Gesamtleistung kum.", value: eur(filteredSite.gesamtleistung), detail: periodLabel, tone: "green" },
      { label: "EBITDA kum.", value: eur(filteredSite.ebitda), detail: `${pct(filteredSite.ebitdaMarge)} Marge`, tone: filteredSite.ebitda >= 0 ? "green" : "red" },
      { label: "Honorarumsatz inkl. Eigenlabor", value: eur(importedPeriodValue(importedData.behandlerTotalRows?.find((row) => row.siteId === site.id), period)), detail: periodLabel, tone: "blue" },
      { label: "Deckungsbeitrag kum.", value: eur(importedBwaMetricValue(importedData.bwaRows, site.id, "deckungsbeitrag", period)), detail: "bis EBITDA", tone: "green" },
      { label: "Zielerreichung EBITDA", value: pct(targetAchievement), detail: "Kaufvertrag", tone: targetAchievementTone }
    ])}
    <section class="pmr-section monthly-section"><h2>Monatsentwicklung EBITDA ${reportEscape(String(year))}</h2>${pmrMonthlyEbitdaTable(importedData, site.id, year)}</section>
    <div class="pmr-grid bottom">
      <section class="pmr-section wide"><h2>Behandler-Umsatzboard | ${reportEscape(periodLabel)} | Vergleich ${reportEscape(String(comparisonYear))}</h2>${pmrProviderRows(importedData, site.id, period, comparisonYear)}</section>
      <section class="pmr-section"><h2>Personalkosten je Behandler | seit Vertragsbeginn</h2>${pmrPersonnelCostRows(importedData, site.id)}</section>
    </div>
  </div>`;
}

function buildPmrReport(
  selectedSites: DashboardSite[],
  allSites: DashboardSite[],
  importedData: ImportedDashboardData | null | undefined,
  personalData: PersonalDashboardData | null | undefined,
  period: string,
  comparisonYear: number
) {
  const printOrientation: ReportOrientation = "landscape";
  if (!importedData?.bwaRows?.length || !selectedSites.length) {
    return buildReportDocument({
      title: "PMR Standortleiter-Report",
      subtitle: "Für diesen Report werden ein bestätigter CFO-Import und mindestens ein Standort benötigt.",
      periodLabel: period,
      orientation: printOrientation,
      body: reportSection("Keine Daten", "<p style='padding:12px'>Bitte CFO-Import bestätigen und Standort auswählen.</p>")
    });
  }

  const pages = selectedSites.map((site) => [
    buildPmrSitePage(site, importedData, period, comparisonYear),
    buildPmrBenchmarkPage(site, allSites, importedData, personalData, period)
  ].join("")).join("");
  return buildReportDocument({
    title: "PMR Standortleiter-Report",
    subtitle: `Standortbezogener Monatsreport mit BWA bis EBITDA, Quoten, Earn-Out-Hochrechnung, Behandlerumsatz, Personalkosten und Benchmarking-Anlage. Zeitraum: ${performancePeriodLabel(period)}.`,
    periodLabel: performancePeriodLabel(period),
    orientation: printOrientation,
    hideHero: true,
    documentClass: "pmr-document",
    body: pages
  });
}

function reportOrientationLabel(orientation: ReportOrientation) {
  return orientation === "landscape" ? "A4 Querformat" : "A4 Hochformat";
}

function buildManagementReport(
  sites: DashboardSite[],
  monthlyData: typeof monthly,
  importedData?: ImportedDashboardData | null,
  rules: KpiRules = defaultKpiRules,
  orientation: ReportOrientation = "landscape"
) {
  const metrics = cfoMetrics(sites, monthlyData, rules);
  const period = importedData ? defaultBwaPeriodFor(importedData) : "aktueller Datenstand";
  const maxEbitda = Math.max(...sites.map((site) => site.ebitda), 1);
  const receivablesRatio = metrics.gesamtleistung ? (metrics.forderungen / metrics.gesamtleistung) * 100 : 0;
  const body = [
    reportKpiGrid([
      { label: "Aktuelle Liquidität", value: eur(metrics.kontostand), detail: "konsolidierter Kontostand", tone: statusMap[statusByRule(metrics.kontostand, rules.aktuelle_liquiditaet)].tone },
      { label: "Offene Forderungen", value: eur(metrics.forderungen), detail: "aktueller Stand", tone: statusMap[statusByRule(receivablesRatio, rules.offene_forderungen)].tone },
      { label: "Cashflow gem. BWA", value: eur(metrics.cashflow), detail: period, tone: statusMap[statusByRule(metrics.cashflow, rules.cashflow_bwa)].tone },
      { label: "EBITDA", value: eur(metrics.ebitda), detail: `${pct(metrics.ebitdaMarge)} Marge`, tone: statusMap[statusByRule(metrics.ebitdaMarge, rules.ebitda_marge)].tone },
      { label: "Fremdkapital", value: eur(metrics.restschuld), detail: "Restschuld konsolidiert", tone: "blue" },
      { label: "Kapitaldienstfähigkeit", value: `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`, detail: "EBITDA / Zins + Tilgung", tone: statusMap[statusByRule(metrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit)].tone }
    ]),
    `<div class="two-col">${reportSection(
      "Standortvergleich CFO-Kennzahlen",
      reportTable(
        ["Standort", "Start", "Gesamtleistung", "PVS-Umsatz", "EBITDA", "Marge", "Cashflow gem. BWA", "Forderungen", "Kontostand"],
        siteFinancialReportRows(sites),
        { compact: true }
      ),
      "Seit Vertragsstart bzw. aktueller Importdatenstand."
    )}${reportSection(
      "EBITDA je Standort",
      reportBarList(sortSitesByContractStart(sites).map((site) => ({ label: site.name, value: site.ebitda, max: maxEbitda, tone: site.ebitda >= 0 ? "green" : "red" }))),
      "Visueller Überblick der Ergebnisbeiträge."
    )}</div>`
  ].join("");

  return buildReportDocument({
    title: "Management-Report",
    subtitle: `Kompakter Überblick für Geschäftsführung, Board und interne Steuerung. Berichtszeitraum: ${period}.`,
    periodLabel: period,
    orientation,
    body
  });
}

function buildBankReport(
  sites: DashboardSite[],
  monthlyData: typeof monthly,
  importedData?: ImportedDashboardData | null,
  rules: KpiRules = defaultKpiRules,
  orientation: ReportOrientation = "landscape"
) {
  const metrics = cfoMetrics(sites, monthlyData, rules);
  const bankRows = bankMovementReportRows(importedData);
  const body = [
    reportKpiGrid([
      { label: "Liquidität", value: eur(metrics.kontostand), detail: "aktueller konsolidierter Kontostand", tone: "green" },
      { label: "Restschuld", value: eur(metrics.restschuld), detail: "konsolidiert", tone: "blue" },
      { label: "Tilgung", value: eur(metrics.getilgt), detail: "bereits getilgt", tone: "green" },
      { label: "Kapitaldienst", value: eur(metrics.kapitaldienst), detail: "Tilgung + Zins", tone: "blue" },
      { label: "Kapitaldienstfähigkeit", value: `${metrics.kapitaldienstfaehigkeit.toLocaleString("de-DE", { maximumFractionDigits: 2 })}x`, detail: "EBITDA / Kapitaldienst", tone: statusMap[statusByRule(metrics.kapitaldienstfaehigkeit, rules.kapitaldienstfaehigkeit)].tone },
      { label: "Offene Forderungen", value: eur(metrics.forderungen), detail: "aktueller Stand", tone: "yellow" }
    ]),
    reportSection(
      `Bankbewegungen | ${performancePeriodLabel(bankRows.period)}`,
      reportTable(bankRows.headers, bankRows.rows, { compact: true }),
      "Geldeingänge, Geldausgänge, Bank-Cashflow und Kontostände aus Input_Finanzen."
    ),
    reportSection("Finanzierung je Standort", reportTable(["Standort", "Kaufpreis", "Darlehen", "Restschuld", "Tilgung", "Zins", "Earn-Out offen", "Earn-Out fällig"], debtReportRows(sites), { compact: true }))
  ].join("");

  return buildReportDocument({
    title: "Bankenreport",
    subtitle: `Finanzierungs-, Kapitaldienst-, Liquiditäts- und Bank-Cashflow-Übersicht auf Basis des bestätigten Imports. Berichtszeitraum: ${performancePeriodLabel(bankRows.period)}.`,
    periodLabel: performancePeriodLabel(bankRows.period),
    orientation,
    body
  });
}

function buildMonthlyReport(
  sites: DashboardSite[],
  monthlyData: typeof monthly,
  importedData?: ImportedDashboardData | null,
  rules: KpiRules = defaultKpiRules,
  orientation: ReportOrientation = "portrait"
) {
  const metrics = cfoMetrics(sites, monthlyData, rules);
  const period = importedData ? defaultBwaPeriodFor(importedData) : "aktueller Datenstand";
  const body = [
    reportKpiGrid([
      { label: "Gesamtleistung", value: eur(metrics.gesamtleistung), detail: period, tone: "green" },
      { label: "EBITDA", value: eur(metrics.ebitda), detail: `${pct(metrics.ebitdaMarge)} Marge`, tone: statusMap[statusByRule(metrics.ebitdaMarge, rules.ebitda_marge)].tone },
      { label: "Cashflow gem. BWA", value: eur(metrics.cashflow), detail: period, tone: statusMap[statusByRule(metrics.cashflow, rules.cashflow_bwa)].tone },
      { label: "Kontostand", value: eur(metrics.kontostand), detail: "aktueller Stand", tone: "green" },
      { label: "Forderungen", value: eur(metrics.forderungen), detail: "aktueller Stand", tone: "yellow" },
      { label: "Kritische Standorte", value: String(metrics.kritisch.length), detail: metrics.kritisch.map((site) => site.name).join(", ") || "keine", tone: metrics.kritisch.length ? "yellow" : "green" }
    ]),
    reportSection(
      "Monatliche Ergebnisentwicklung",
      reportTable(
        ["Monat", "Gesamtleistung", "EBITDA", "EBITDA-Marge", "Cashflow gem. BWA"],
        monthlyData.map((entry) => [entry.month, eur(entry.leistung), eur(entry.ebitda), pct(entry.marge), eur(entry.cashflow)])
      ),
      "Monatliche Steuerungssicht aus dem aktuellen Import."
    ),
    reportSection(
      "Standortübersicht",
      reportTable(["Standort", "Start", "Gesamtleistung", "EBITDA", "Marge", "Cashflow gem. BWA", "Forderungen"], siteFinancialReportRows(sites).map((row) => [row[0], row[1], row[2], row[4], row[5], row[6], row[7]]), {
        compact: true
      })
    )
  ].join("");

  return buildReportDocument({
    title: "Monatsreport",
    subtitle: `Druckfertige Steuerungsübersicht mit Ergebnisentwicklung, Cashflow gem. BWA und Standortvergleich. Berichtszeitraum: ${period}.`,
    periodLabel: period,
    orientation,
    body
  });
}

function buildSiteReport(sites: DashboardSite[], monthlyData: typeof monthly, orientation: ReportOrientation = "landscape") {
  const sortedSites = sortSitesByContractStart(sites).filter((site) => site.gesamtleistung || site.ebitda);
  const body = sortedSites
    .map((site, index) => {
      const max = Math.max(site.gesamtleistung, site.ebitda, site.cashflow, 1);
      return `${index ? '<div class="page-break"></div>' : ""}${reportSection(
        `${site.name} | Standortreport`,
        [
          reportKpiGrid([
            { label: "Praxisstart", value: site.start, detail: "Start in der Gruppe", tone: "blue" },
            { label: "Gesamtleistung", value: eur(site.gesamtleistung), detail: "seit Vertragsstart", tone: "green" },
            { label: "PVS-Umsatz", value: eur(site.pvsUmsatz), detail: "seit Vertragsstart", tone: "green" },
            { label: "EBITDA", value: eur(site.ebitda), detail: `${pct(site.ebitdaMarge)} Marge`, tone: site.ebitda >= 0 ? "green" : "red" },
            { label: "Cashflow gem. BWA", value: eur(site.cashflow), detail: "seit Vertragsstart", tone: site.cashflow >= 0 ? "green" : "red" },
            { label: "Forderungen", value: eur(site.forderungen), detail: "aktueller Stand", tone: "yellow" }
          ]),
          reportBarList([
            { label: "Gesamtleistung", value: site.gesamtleistung, max, tone: "green" },
            { label: "EBITDA", value: site.ebitda, max, tone: site.ebitda >= 0 ? "green" : "red" },
            { label: "Cashflow gem. BWA", value: site.cashflow, max, tone: site.cashflow >= 0 ? "green" : "red" },
            { label: "Forderungen", value: site.forderungen, max, tone: "yellow" }
          ]),
          reportTable(
            ["Kennzahl", "Wert"],
            [
              ["Kontostand aktuell", eur(site.kontostand)],
              ["Restschuld", eur(site.darlehen.restschuld)],
              ["Tilgung", eur(site.darlehen.tilgung)],
              ["Ziel-EBITDA p.a.", eur(site.darlehen.zielEbitda)],
              ["Earn-Out offen", eur(Math.max(0, (site.darlehen.earnOutGesamt ?? 0) - (site.darlehen.earnOutGezahlt ?? 0)))]
            ]
          )
        ].join(""),
        "Finanzielle Kurzsicht je Standort für Ausdruck und Weitergabe."
      )}`;
    })
    .join("");

  return buildReportDocument({
    title: "Standortreport",
    subtitle: "Je Standort eine kompakte druckfertige Seite mit KPI-Deckblatt, Finanzierungsdaten und Forderungsstand. Datenstand: seit Vertragsstart bzw. aktueller Import.",
    periodLabel: "seit Vertragsstart / aktueller Import",
    orientation,
    body: body || reportSection("Keine Standortdaten", "<p style='padding:12px'>Noch keine Standortdaten verfügbar.</p>")
  });
}

function Reports({
  sites = standorte,
  monthlyData = monthly,
  importedData,
  personalData
}: {
  sites?: DashboardSite[];
  monthlyData?: typeof monthly;
  importedData?: ImportedDashboardData | null;
  personalData?: PersonalDashboardData | null;
}) {
  const rules = useKpiRules();
  const pmrPeriodOptions = useMemo(() => bwaPeriodOptionsFor(importedData), [importedData]);
  const [pmrPeriod, setPmrPeriod] = useState(() => defaultBwaPeriodFor(importedData));
  const currentPmrYear = currentYearFromPeriod(pmrPeriod);
  const pmrComparisonYears = (importedData?.report.jahre ?? [currentPmrYear - 1])
    .filter((year) => year >= 1900 && year !== currentPmrYear)
    .sort((a, b) => b - a);
  const [pmrComparisonYear, setPmrComparisonYear] = useState(String(pmrComparisonYears.find((year) => year < currentPmrYear) ?? currentPmrYear - 1));
  const activeReportSites = useMemo(() => {
    const sortedSites = sortSitesByContractStart(sites);
    const sitesWithReportData = sortedSites.filter((site) => site.gesamtleistung || importedData?.bwaRows?.some((row) => row.siteId === site.id));
    return sitesWithReportData.length ? sitesWithReportData : sortedSites;
  }, [importedData, sites]);
  const [pmrSelectedSiteIds, setPmrSelectedSiteIds] = useState<string[]>(() => activeReportSites.map((site) => site.id));
  const [reportOrientations, setReportOrientations] = useState<Record<string, ReportOrientation>>({
    pmr: "landscape",
    monthly: "portrait",
    management: "landscape"
  });
  useEffect(() => {
    if (!pmrPeriodOptions.includes(pmrPeriod)) setPmrPeriod(defaultBwaPeriodFor(importedData));
  }, [importedData, pmrPeriod, pmrPeriodOptions]);
  useEffect(() => {
    const availableIds = new Set(activeReportSites.map((site) => site.id));
    setPmrSelectedSiteIds((current) => {
      const next = current.filter((id) => availableIds.has(id));
      const resolved = next.length ? next : activeReportSites.map((site) => site.id);
      return resolved.length === current.length && resolved.every((id, index) => id === current[index]) ? current : resolved;
    });
  }, [activeReportSites]);
  const updateReportOrientation = (id: string, value: string) => {
    setReportOrientations((current) => ({
      ...current,
      [id]: value === "portrait" ? "portrait" : "landscape"
    }));
  };
  const togglePmrSite = (siteId: string) => {
    setPmrSelectedSiteIds((current) => current.includes(siteId) ? current.filter((id) => id !== siteId) : [...current, siteId]);
  };
  const selectedPmrSites = activeReportSites.filter((site) => pmrSelectedSiteIds.includes(site.id));

  return (
    <section className="space-y-5">
      <PageTitle
        title="Reports"
        text="Druckfertige farbige CFO- und Standortleiter-Reports. Die Ausgabe öffnet als eigenes Drucklayout und kann direkt als PDF gespeichert oder gedruckt werden."
      />
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Mini label="Datenbasis" value={importedData ? "Bestätigter Import" : "Noch offen"} />
          <Mini label="Standorte" value={String(activeReportSites.length)} />
          <Mini label="Format" value="A4 Querformat" />
          <Mini label="Ausgabe" value="PDF / Druck" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="grid gap-5">
          <div className="max-w-3xl">
            <FileBarChart className="h-8 w-8 text-primary" />
            <h2 className="mt-3 text-xl font-bold">Standortleiter-PMR</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Standortbezogener Report mit BWA bis EBITDA, Quoten, Earn-Out-Hochrechnung, Behandlerumsatz und Personalkosten je Behandler.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr_0.9fr_auto]">
            <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
              Zeitraum
              <Select value={pmrPeriod} onChange={(event) => setPmrPeriod(event.target.value)}>
                {pmrPeriodOptions.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
              Vergleichsjahr
              <Select value={pmrComparisonYear} onChange={(event) => setPmrComparisonYear(event.target.value)}>
                {[...new Set([Number(pmrComparisonYear), ...pmrComparisonYears])].filter(Boolean).map((year) => <option key={year} value={year}>{year}</option>)}
              </Select>
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
              Druckformat
              <Select value={reportOrientations.pmr} onChange={(event) => updateReportOrientation("pmr", event.target.value)}>
                <option value="landscape">A4 Querformat</option>
              </Select>
            </label>
            <Button
              className="self-end"
              variant="secondary"
              disabled={!selectedPmrSites.length}
              onClick={() => openPrintableReport(
                "PMR Standortleiter-Report",
                buildPmrReport(selectedPmrSites, activeReportSites, importedData, personalData, pmrPeriod, Number(pmrComparisonYear))
              )}
            >
              PMR öffnen
            </Button>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-white/12 bg-white/5 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold">Standorte auswählen</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedPmrSites.length} von {activeReportSites.length} Standorten für den PMR ausgewählt.
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="h-9 px-3 text-xs" variant="ghost" onClick={() => setPmrSelectedSiteIds(activeReportSites.map((site) => site.id))}>
                Alle
              </Button>
              <Button className="h-9 px-3 text-xs" variant="ghost" onClick={() => setPmrSelectedSiteIds([])}>
                Keine
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {activeReportSites.map((site) => {
              const checked = pmrSelectedSiteIds.includes(site.id);
              return (
                <label
                  key={site.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border p-2 text-sm font-semibold transition",
                    checked ? "border-[#30d5c8]/45 bg-[#30d5c8]/12 text-white" : "border-white/12 bg-white/6 text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#30d5c8]"
                    checked={checked}
                    onChange={() => togglePmrSite(site.id)}
                  />
                  {site.name}
                </label>
              );
            })}
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-bold">Hinweis zur Ausgabe</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Die Reports werden bewusst nicht als Bildschirmfoto erzeugt. Stattdessen wird ein eigenes, farbiges A4-Drucklayout erstellt, damit Tabellen,
          Kacheln und Seitenumbrüche sauber lesbar bleiben. Im Druckdialog bitte „Hintergrundgrafiken drucken“ aktiv lassen, falls der Browser danach fragt.
        </p>
      </Card>
    </section>
  );
}

function AdminKpiRules() {
  const persistedRules = useKpiRules();
  const [draft, setDraft] = useState<KpiRules>(() => persistedRules);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(persistedRules);
  }, [persistedRules]);

  const updateRule = (key: KpiRuleKey, field: "green" | "yellow" | "owner", value: string) => {
    setDraft((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: field === "owner" ? value : Number(value)
      }
    }));
  };

  const save = async () => {
    try {
      const saved = await saveKpiRules(draft);
      setMessage(saved ? "KPI-Regeln zentral gespeichert und live angewendet." : "KPI-Regeln lokal gespeichert. Zentrale Speicherung ist erst mit aktiver Admin-Sitzung verfügbar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "KPI-Regeln konnten nicht gespeichert werden.");
    }
  };

  const reset = async () => {
    const defaults = normalizeKpiRules(defaultKpiRules);
    setDraft(defaults);
    try {
      const saved = await saveKpiRules(defaults);
      setMessage(saved ? "KPI-Regeln zentral auf Standardwerte zurückgesetzt." : "KPI-Regeln lokal auf Standardwerte zurückgesetzt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "KPI-Regeln konnten nicht zurückgesetzt werden.");
    }
  };

  return (
    <section className="space-y-5">
      <PageTitle
        title="Admin / KPI-Regeln"
        text="Interner Einstellungsbereich für App-Zugänge, Rollen, Ampel-Schwellenwerte und Zielerreichungslogik."
      />
      <AccessUserManagement />
      <PracticeOpeningHoursSettings />
      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-bold">Regelstatus</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Diese Schwellenwerte steuern die Ampeln für Cockpit, Bankenreporting, Standortdetails und Board-Pack.
            </p>
          </div>
          <Badge tone="green">Admin-pflegbar</Badge>
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
              {kpiRuleOrder.map((key) => {
                const rule = draft[key];
                const greenLabel = rule.direction === "lower" ? "Max. grün" : "Min. grün";
                const yellowLabel = rule.direction === "lower" ? "Max. gelb" : "Min. gelb";
                return (
                <tr key={rule.key}>
                  <td className="border-b border-r border-border bg-white p-3 font-bold">{rule.label}</td>
                  <td className="border-b border-r border-border bg-white p-3 text-emerald-700">
                    <label className="block text-xs font-extrabold uppercase text-emerald-100">{greenLabel}</label>
                    <Input className="kpi-rule-input mt-1 min-w-28" type="number" step={rule.unit === "multiple" ? 0.1 : 1} value={String(rule.green)} onChange={(event) => updateRule(key, "green", event.target.value)} />
                    <p className="mt-1 text-xs font-extrabold text-emerald-100">{kpiRuleText(rule, "green")}</p>
                  </td>
                  <td className="border-b border-r border-border bg-white p-3 text-amber-700">
                    <label className="block text-xs font-extrabold uppercase text-amber-100">{yellowLabel}</label>
                    <Input className="kpi-rule-input mt-1 min-w-28" type="number" step={rule.unit === "multiple" ? 0.1 : 1} value={String(rule.yellow)} onChange={(event) => updateRule(key, "yellow", event.target.value)} />
                    <p className="mt-1 text-xs font-extrabold text-amber-100">{kpiRuleText(rule, "yellow")}</p>
                  </td>
                  <td className="border-b border-r border-border bg-white p-3 text-sm font-extrabold text-red-100">{kpiRuleText(rule, "red")}</td>
                  <td className="border-b border-r border-border bg-white p-3">
                    <Input className="kpi-rule-input min-w-36" value={rule.owner} onChange={(event) => updateRule(key, "owner", event.target.value)} />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Änderungen werden lokal sofort und bei aktiver Supabase-Admin-Sitzung zentral gespeichert.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void reset()}>Standardwerte</Button>
            <Button onClick={() => void save()}>Regeln speichern</Button>
          </div>
        </div>
        {message && <p className="border-t border-border p-4 text-sm font-semibold text-primary">{message}</p>}
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
            Werte bearbeiten, speichern und als zentrale App-Einstellung auf Cockpit, Bankenreporting, Standortdetails und Reports anwenden.
          </p>
        </Card>
      </div>
    </section>
  );
}

function PracticeOpeningHoursSettings() {
  const { openingHoursBySiteId, setOpeningHoursBySiteId } = usePracticeOpeningHours();
  const [draft, setDraft] = useState<Record<string, number>>(() => ({ ...defaultPracticeOpeningHoursBySiteId }));
  const [message, setMessage] = useState("");
  const sortedSites = sortSitesByContractStart(standorte);

  useEffect(() => {
    setDraft(openingHoursBySiteId);
  }, [openingHoursBySiteId]);

  const save = async () => {
    const cleaned = setOpeningHoursBySiteId(draft);
    try {
      const saved = await saveSupabaseAppSetting(practiceOpeningHoursSettingKey, cleaned);
      setMessage(
        saved
          ? "Praxisöffnungszeiten zentral gespeichert. Benchmarking und Kapazitätskennzahlen nutzen die aktualisierten Werte."
          : "Praxisöffnungszeiten lokal gespeichert. Zentrale Speicherung ist erst mit aktiver Admin-Sitzung verfügbar."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Praxisöffnungszeiten konnten nicht zentral gespeichert werden.");
    }
  };

  const reset = async () => {
    setDraft({ ...defaultPracticeOpeningHoursBySiteId });
    const cleaned = setOpeningHoursBySiteId(defaultPracticeOpeningHoursBySiteId);
    try {
      const saved = await saveSupabaseAppSetting(practiceOpeningHoursSettingKey, cleaned);
      setMessage(saved ? "Praxisöffnungszeiten zentral auf Standardwerte zurückgesetzt." : "Praxisöffnungszeiten lokal auf Standardwerte zurückgesetzt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Standardwerte konnten nicht zentral gespeichert werden.");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-bold">Praxisöffnungszeiten</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Statische Wochenöffnungszeiten je Standort. Diese Werte werden nicht importiert, sondern hier gepflegt und für Kennzahlen je Öffnungsstunde genutzt.
          </p>
        </div>
        <Badge tone="green">Admin-pflegbar</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="table-head border-b border-r border-border p-3 text-left text-xs uppercase text-white">Standort</th>
              <th className="table-head border-b border-r border-border p-3 text-left text-xs uppercase text-white">Praxisstart</th>
              <th className="table-head border-b border-r border-border p-3 text-right text-xs uppercase text-white">Öffnungsstunden / Woche</th>
              <th className="table-head border-b border-r border-border p-3 text-right text-xs uppercase text-white">Standardwert</th>
            </tr>
          </thead>
          <tbody>
            {sortedSites.map((site) => {
              const value = draft[site.id] ?? defaultPracticeOpeningHoursBySiteId[site.id] ?? 0;
              return (
                <tr key={site.id}>
                  <td className="border-b border-r border-border bg-white p-3 font-bold">{site.name}</td>
                  <td className="border-b border-r border-border bg-white p-3">{site.start}</td>
                  <td className="border-b border-r border-border bg-white p-3 text-right">
                    <Input
                      className="ml-auto w-32 text-right"
                      type="number"
                      min={0}
                      step={0.5}
                      value={String(value)}
                      onChange={(event) => setDraft((current) => ({ ...current, [site.id]: Number(event.target.value) || 0 }))}
                    />
                  </td>
                  <td className="border-b border-r border-border bg-white p-3 text-right font-semibold tabular-nums">
                    {(defaultPracticeOpeningHoursBySiteId[site.id] ?? 0).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Basis aktuell: Kirchberg 53, Essen 39, Kehl 56, Ulmet 84, Hüttenberg 52,5 Stunden pro Woche.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void reset()}>Standardwerte</Button>
          <Button onClick={() => void save()}>Öffnungszeiten speichern</Button>
        </div>
      </div>
      {message ? <div className="border-t border-border bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div> : null}
    </Card>
  );
}

function AccessUserManagement() {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [role, setRole] = useState<UserRole>("info");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await accessUsersApi<{ users: AccessUser[] }>();
      setUsers(data.users ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Zugänge konnten nicht geladen werden.");
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const createUser = async () => {
    setMessage("");
    setBusy(true);
    try {
      await accessUsersApi("POST", { name, username, password: initialPassword, role });
      setName("");
      setUsername("");
      setInitialPassword("");
      setRole("info");
      setMessage("Zugang angelegt. Die Person meldet sich mit Login-Name und Erstpasswort an und vergibt danach ein neues Passwort.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Zugang konnte nicht angelegt werden.");
    } finally {
      setBusy(false);
    }
  };

  const resetUserPassword = async (user: AccessUser) => {
    setMessage("");
    const newPassword = window.prompt(`Neues Erstpasswort für ${user.name || loginNameFromAuthEmail(user.email)} eingeben:`);
    if (!newPassword) return;
    if (newPassword.trim().length < 8) {
      setMessage("Bitte ein Erstpasswort mit mindestens 8 Zeichen eingeben.");
      return;
    }
    try {
      await accessUsersApi("PATCH", { email: user.email, password: newPassword.trim() });
      setMessage("Passwort gesetzt. Die Person muss beim nächsten Login ein eigenes Passwort vergeben.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Passwort konnte nicht gesetzt werden.");
    }
  };

  const updateUser = async (user: AccessUser, update: Partial<AccessUser>) => {
    setMessage("");
    try {
      await accessUsersApi("PATCH", { email: user.email, ...update });
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Zugang konnte nicht aktualisiert werden.");
    }
  };

  const deleteUser = async (user: AccessUser) => {
    setMessage("");
    if (isPermanentAdminEmail(user.email)) {
      setMessage("Der feste Admin-Zugang kann nicht gelöscht werden.");
      return;
    }
    const confirmed = window.confirm(`Zugang für ${user.name || user.email} wirklich vollständig löschen?`);
    if (!confirmed) return;
    try {
      const result = await accessUsersApi<{ ok: boolean; authDeleted?: number; authWarning?: string }>("DELETE", { email: user.email });
      setMessage(
        result.authWarning
          ? "App-Zugang gelöscht. Hinweis: Der Supabase-Auth-Benutzer konnte nicht automatisch entfernt werden, der App-Zugriff ist aber gesperrt."
          : "Zugang vollständig gelöscht."
      );
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Zugang konnte nicht gelöscht werden.");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-bold">App-Zugänge</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Für externe App-Nutzer: Name, Login-Name, Erstpasswort und Rolle anlegen. Beim Erstlogin wird ein neues Passwort verlangt.
            </p>
          </div>
          <Badge tone="blue">Admin verwaltet</Badge>
        </div>
      </div>
      <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[1fr_1fr_1fr_0.7fr_auto]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, z. B. Max Mustermann" />
        <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Login-Name, z. B. max.mustermann" />
        <Input
          value={initialPassword}
          onChange={(event) => setInitialPassword(event.target.value)}
          placeholder="Erstpasswort"
          type="password"
        />
        <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          <option value="info">Info-Rolle</option>
          <option value="praxismanagement">Praxismanagement</option>
          <option value="admin">Admin</option>
        </Select>
        <Button onClick={createUser} disabled={busy}>
          <UserRoundPlus className="h-4 w-4" />
          Zugang anlegen
        </Button>
      </div>
      {message && <p className="border-b border-border bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">{message}</p>}
      <div className="overflow-x-auto">
        <table className="data-table border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {["Name", "Login-Name", "Rolle", "Status", "Aktion", "Letzter Login"].map((head) => (
                <th key={head} className="border-b border-r border-border table-head p-3 text-left text-xs font-bold uppercase text-white">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isLockedAdmin = isPermanentAdminEmail(user.email);
              return (
                <tr key={user.email} className={!user.active ? "opacity-55" : undefined}>
                  <td className="border-b border-r border-border p-3 font-semibold">{user.name || "Ohne Namen"}</td>
                  <td className="border-b border-r border-border p-3">
                    <div className="flex flex-col gap-1">
                      <span>{user.username || loginNameFromAuthEmail(user.email)}</span>
                      {isLockedAdmin && <span className="text-xs font-semibold text-primary">Fester Admin-Zugang</span>}
                      {user.must_change_password && !isLockedAdmin && <span className="text-xs font-semibold text-amber-400">Passwortwechsel offen</span>}
                    </div>
                  </td>
                  <td className="border-b border-r border-border p-3">
                    <Select
                      value={isLockedAdmin ? "admin" : user.role}
                      onChange={(event) => updateUser(user, { role: event.target.value as UserRole })}
                      disabled={isLockedAdmin}
                    >
                      <option value="info">Info-Rolle</option>
                      <option value="praxismanagement">Praxismanagement</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </td>
                  <td className="border-b border-r border-border p-3">
                    <Badge tone={user.active || isLockedAdmin ? "green" : "neutral"}>{user.active || isLockedAdmin ? "Aktiv" : "Deaktiviert"}</Badge>
                  </td>
                  <td className="border-b border-r border-border p-3">
                    <div className="flex min-w-44 flex-col gap-2 sm:flex-row">
                      <Button
                        variant="secondary"
                        onClick={() => resetUserPassword(user)}
                      >
                        Passwort setzen
                      </Button>
                      <Button
                        variant={user.active ? "secondary" : "primary"}
                        onClick={() => updateUser(user, { active: !user.active })}
                        disabled={isLockedAdmin}
                      >
                        {isLockedAdmin ? "Nicht löschbar" : user.active ? "Zugriff entziehen" : "Reaktivieren"}
                      </Button>
                      {!isLockedAdmin && (
                        <Button variant="danger" onClick={() => deleteUser(user)}>
                          Löschen
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="border-b border-r border-border p-3 text-sm font-semibold text-muted-foreground">
                    {displayDateTimeFromUnknown(user.last_sign_in_at)}
                  </td>
                </tr>
              );
            })}
            {!users.length && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  Noch keine Zugänge geladen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 text-sm text-muted-foreground">
        Info-Rolle: lesen, keine Uploads, kein Zurücksetzen, keine Regeländerung. Praxismanagement: nur Krankheit,
        Personalmaßnahmen und Mitarbeiterübersicht ohne Gehalts- und AG-Kostenfelder. Admin: vollständiger Zugriff.
      </div>
    </Card>
  );
}
