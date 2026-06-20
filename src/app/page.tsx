"use client";

import { useMemo, useState } from "react";
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
import { monthly, standorte, Status, uploadTypes } from "@/data/dashboard";

type Page =
  | "cockpit"
  | "standorte"
  | "standort-detail"
  | "analysen"
  | "bwa"
  | "cashflow"
  | "plan"
  | "darlehen"
  | "uploads"
  | "reports";

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

const comparisonOptions = ["Ist", "Plan", "Vorjahr", "Abweichung in EUR", "Abweichung in %"];

const statusMap: Record<Status, { label: string; dot: string; tone: "green" | "yellow" | "red" }> = {
  green: { label: "Stabil", dot: "bg-emerald-500", tone: "green" },
  yellow: { label: "Beobachten", dot: "bg-amber-500", tone: "yellow" },
  red: { label: "Handlungsbedarf", dot: "bg-red-500", tone: "red" }
};

const desktopNav = [
  { id: "cockpit", label: "Cockpit", icon: Home },
  { id: "standorte", label: "Standorte", icon: Building2 },
  { id: "bwa", label: "BWA", icon: FileBarChart },
  { id: "cashflow", label: "Cashflow", icon: Wallet },
  { id: "plan", label: "Plan/Ist", icon: BarChart3 },
  { id: "darlehen", label: "Darlehen & Earn-Out", icon: Landmark },
  { id: "uploads", label: "Uploads", icon: FileUp },
  { id: "reports", label: "Reports", icon: FileBarChart }
] as const;

const mobileNav = [
  { id: "cockpit", label: "Cockpit", icon: Home },
  { id: "standorte", label: "Standorte", icon: Building2 },
  { id: "analysen", label: "Analysen", icon: BarChart3 },
  { id: "darlehen", label: "Darlehen", icon: Landmark },
  { id: "uploads", label: "Uploads", icon: FileUp }
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

export default function HomePage() {
  const [authStep, setAuthStep] = useState<AuthStep>("welcome");
  const [page, setPage] = useState<Page>("cockpit");
  const [selectedSite, setSelectedSite] = useState("kirchberg");
  const [period, setPeriod] = useState("YTD");
  const [comparison, setComparison] = useState("Plan");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pin, setPin] = useState("");

  const selected = useMemo(
    () => standorte.find((site) => site.id === selectedSite) ?? standorte[0],
    [selectedSite]
  );

  if (authStep !== "app") {
    return <AuthFlow step={authStep} setStep={setAuthStep} pin={pin} setPin={setPin} />;
  }

  const go = (target: Page) => {
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
          </div>
        </div>
      )}

      <main className="w-full px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <TopFilters period={period} setPeriod={setPeriod} comparison={comparison} setComparison={setComparison} />
          {page === "cockpit" && <Cockpit setPage={go} />}
          {page === "standorte" && (
            <Standorte
              onOpen={(id) => {
                setSelectedSite(id);
                setPage("standort-detail");
              }}
            />
          )}
          {page === "standort-detail" && <StandortDetail site={selected} />}
          {page === "analysen" && <Analysen />}
          {page === "bwa" && <Bwa />}
          {page === "cashflow" && <Cashflow />}
          {page === "plan" && <PlanIst />}
          {page === "darlehen" && <Darlehen />}
          {page === "uploads" && <Uploads />}
          {page === "reports" && <Reports />}
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
                  "bg-cyan-50 text-primary"
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
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden shadow-soft">
        <div className="border-b border-border bg-slate-950 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-500/20 ring-1 ring-white/15">
              <Gauge className="h-6 w-6 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-100">Orisus</p>
              <h1 className="text-xl font-bold">Orisus CFO Dashboard</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Wirtschaftliche Steuerung der Orisus-Gruppe. Konsolidierte Kennzahlen,
            Standortvergleiche, Cashflow, BWA, PVS-Umsätze, offene Forderungen,
            Darlehen, Earn-Outs und Liquidität auf einen Blick.
          </p>
        </div>
        <div className="space-y-4 p-6">
          {step === "welcome" && (
            <>
              <Button className="w-full" onClick={() => setStep("login")}>
                Anmelden
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => setStep("forgot")}>
                Passwort vergessen
              </Button>
            </>
          )}
          {step === "login" && (
            <FormShell title="Anmelden" text="Dummy-Zugang für Svend Neumann.">
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
      </Card>
    </main>
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
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
        <Gauge className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold leading-tight">Orisus</p>
        {!compact && <p className="text-xs text-muted-foreground">CFO Dashboard</p>}
      </div>
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
        active && "bg-cyan-50 text-primary"
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

function Cockpit({ setPage }: { setPage: (page: Page) => void }) {
  const kpis = [
    { label: "Gesamtleistung gem. BWA", value: total("gesamtleistung"), delta: "+4,2 % ggü. Plan", icon: TrendingUp, status: "green" as Status },
    { label: "Gesamtumsatz nach PVS", value: total("pvsUmsatz"), delta: "+3,6 % ggü. Plan", icon: BadgeEuro, status: "green" as Status },
    { label: "EBITDA", value: total("ebitda"), delta: "+21 TEUR ggü. Plan", icon: Banknote, status: "green" as Status },
    { label: "EBITDA-Marge", value: 13.8, percent: true, delta: "+0,9 PP", icon: Gauge, status: "yellow" as Status },
    { label: "Offene Forderungen", value: total("forderungen"), delta: "+7,1 % zum Vormonat", icon: FileBarChart, status: "yellow" as Status },
    { label: "Cashflow", value: total("cashflow"), delta: "+34 TEUR netto", icon: Wallet, status: "green" as Status },
    { label: "Kontostand konsolidiert", value: total("kontostand"), delta: "Liquidität stabil", icon: CircleDollarSign, status: "green" as Status }
  ];

  return (
    <section className="space-y-5">
      <PageTitle title="CFO Konzern Cockpit" text="Konsolidierte Steuerung der Orisus-Gruppe mit Phase-1-Dummy-Daten." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartCard title="Honorarumsatz vs. Eigenlaborumsatz" icon={PieIcon}>
          <RevenueSplit />
        </ChartCard>
        <ChartCard title="EBITDA vs. Gesamtleistung" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => (typeof v === "number" ? eur(v) : v)} />
              <Bar dataKey="leistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line type="monotone" dataKey="ebitda" stroke="#0369a1" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <CostRatios />
        <Ranking title="EBITDA je Standort" metric="ebitda" />
        <Ranking title="Gesamtleistung je Standort" metric="gesamtleistung" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <CashflowBlock />
        <AccountsBlock />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <TrafficLights />
        <Insights setPage={setPage} />
      </div>
    </section>
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
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-primary">
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

function RevenueSplit() {
  const honorar = total("honorar");
  const eigenlabor = total("eigenlabor");
  const data = [
    { name: "Honorar", value: honorar, color: "#0f766e" },
    { name: "Eigenlabor", value: eigenlabor, color: "#0891b2" }
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} innerRadius={64} outerRadius={92} paddingAngle={4} dataKey="value">
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => eur(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3 self-center">
        {data.map((item) => (
          <div key={item.name} className="rounded-md bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-3 w-3 rounded-sm" style={{ background: item.color }} />
                {item.name}
              </span>
              <span className="font-bold">{eur(item.value)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pct((item.value / (honorar + eigenlabor)) * 100)} Anteil am PVS-Umsatz
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostRatios() {
  const rows = [
    { label: "Materialquote", value: 9.9, target: 10.0, status: "green" as Status },
    { label: "Fremdlaborquote", value: 15.6, target: 14.5, status: "yellow" as Status },
    { label: "Sonstige Kostenquote", value: 37.8, target: 36.0, status: "yellow" as Status },
    { label: "Gesamtkostenquote", value: 69.4, target: 68.0, status: "yellow" as Status }
  ];
  return (
    <Card className="p-4">
      <h2 className="font-bold">Kostenquoten</h2>
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

function Ranking({ title, metric }: { title: string; metric: "ebitda" | "gesamtleistung" }) {
  const rows = [...standorte].sort((a, b) => b[metric] - a[metric]);
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

function CashflowBlock() {
  const rows = [
    ["Praxiseingänge", 2962000],
    ["Praxiskosten", -2014000],
    ["Annuitäten", -251000],
    ["Umbuchungen MVZ", -104000],
    ["Netto-Cashflow", total("cashflow")]
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

function AccountsBlock() {
  return (
    <Card className="p-4">
      <h2 className="font-bold">Kontostände</h2>
      <p className="mt-1 text-sm text-muted-foreground">Konsolidiert: {eur(total("kontostand"))}</p>
      <div className="mt-4 space-y-3">
        {standorte.map((site) => (
          <div key={site.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
            <span className="font-semibold">{site.name}</span>
            <span className="font-bold">{eur(site.kontostand)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TrafficLights() {
  const rows = [
    ["EBITDA-Marge Konzern", "13,8 %", "yellow"],
    ["Cashflow Konzern", eur(total("cashflow")), "green"],
    ["Offene Forderungen", eur(total("forderungen")), "yellow"],
    ["Kostenquote", "69,4 %", "yellow"],
    ["Kontostände", eur(total("kontostand")), "green"],
    ["Planabweichung", "+2,4 %", "green"]
  ] as const;
  return (
    <Card className="p-4">
      <h2 className="font-bold">Ampel-Center</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value, status]) => (
          <div key={label} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{label}</p>
              <StatusDot status={status as Status} />
            </div>
            <p className="mt-2 text-lg font-bold">{value}</p>
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
    "Gesamtleistung Konzern liegt 4,2 % über Plan.",
    "Kostenquote Kehl über Zielwert; Fremdlaborquote prüfen."
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

function Standorte({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="space-y-5">
      <PageTitle title="Standorte" text="Alle Standorte mit Zeiträumen ab jeweiligem Praxisstart." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {standorte.map((site) => (
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

function StandortDetail({ site }: { site: (typeof standorte)[number] }) {
  return (
    <section className="space-y-5">
      <PageTitle title={site.name} text={`Standortdetail ab Praxisstart ${site.start}.`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Gesamtleistung" value={site.gesamtleistung} delta={`${site.planAbweichung > 0 ? "+" : ""}${pct(site.planAbweichung)}`} icon={TrendingUp} status={site.status} />
        <KpiCard label="PVS-Umsatz" value={site.pvsUmsatz} delta="Plausibel zur BWA" icon={BadgeEuro} status={site.status} />
        <KpiCard label="EBITDA" value={site.ebitda} delta={`${pct(site.ebitdaMarge)} Marge`} icon={Banknote} status={site.status} />
        <KpiCard label="Cashflow" value={site.cashflow} delta="Netto nach Annuitäten" icon={Wallet} status={site.status} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <CostRatios />
        <ChartCard title="Entwicklung über Zeit" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Area dataKey="leistung" stroke="#0f766e" fill="#ccfbf1" strokeWidth={3} />
              <Area dataKey="plan" stroke="#0369a1" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <PlanIst siteName={site.name} />
    </section>
  );
}

function Analysen() {
  return (
    <section className="space-y-5">
      <PageTitle title="Analysen" text="EBITDA, Gesamtleistung, Cashflow, Standortvergleich, Zeitvergleich und Plan/Ist-Abweichungen." />
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
        <AnalysisTile title="Plan/Ist-Abweichung" value="+2,4 %" text="Konzern kumuliert YTD." />
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

function Bwa() {
  return (
    <section className="space-y-5">
      <PageTitle title="BWA" text="Gesamtleistung, Kostenquoten und EBITDA aus Dummy-BWA-Struktur." />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <ChartCard title="Gesamtleistungsentwicklung" icon={FileBarChart}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => eur(Number(v), true)} />
              <Tooltip formatter={(v) => eur(Number(v))} />
              <Bar dataKey="leistung" fill="#0f766e" radius={[5, 5, 0, 0]} />
              <Line dataKey="plan" stroke="#0369a1" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <CostRatios />
      </div>
    </section>
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

function PlanIst({ siteName = "Konzern" }: { siteName?: string }) {
  return (
    <section className="space-y-5">
      <PageTitle title={`Plan/Ist ${siteName}`} text="Gesamtleistung, EBITDA und Cashflow mit Abweichungen in EUR und Prozent." />
      <div className="grid gap-4 lg:grid-cols-3">
        {["Gesamtleistung", "EBITDA", "Cashflow"].map((label, index) => (
          <Card key={label} className="p-4">
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{eur([total("gesamtleistung"), total("ebitda"), total("cashflow")][index], true)}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">+{[2.4, 4.8, 1.7][index].toLocaleString("de-DE")} % vs. Plan</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-5 gap-2 border-b border-border bg-slate-50 p-3 text-xs font-bold uppercase text-muted-foreground">
          <span>Standort</span><span>Ist</span><span>Plan</span><span>Abw. EUR</span><span>Abw. %</span>
        </div>
        {standorte.map((site) => (
          <div key={site.id} className="grid grid-cols-5 gap-2 border-b border-border p-3 text-sm last:border-0">
            <span className="font-semibold">{site.name}</span>
            <span>{eur(site.gesamtleistung, true)}</span>
            <span>{eur(site.gesamtleistung / (1 + site.planAbweichung / 100), true)}</span>
            <span>{eur(site.gesamtleistung - site.gesamtleistung / (1 + site.planAbweichung / 100), true)}</span>
            <span className={cn(site.planAbweichung < 0 ? "text-red-700" : "text-emerald-700", "font-semibold")}>{pct(site.planAbweichung)}</span>
          </div>
        ))}
      </Card>
    </section>
  );
}

function Darlehen() {
  const restschuld = standorte.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
  const earnOut = standorte.reduce((sum, site) => sum + site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt, 0);
  return (
    <section className="space-y-5">
      <PageTitle title="Darlehen & Earn-Out" text="Kaufpreise, Restschulden, Zins, Tilgung und Earn-Out-Fortschritt je Standort." />
      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard label="Gesamte Restschuld" value={restschuld} delta="Konsolidiert" icon={Landmark} status="yellow" />
        <KpiCard label="Earn-Out offen" value={earnOut} delta="Verpflichtungen offen" icon={BadgeEuro} status="yellow" />
        <KpiCard label="Tilgung YTD" value={251000} delta="Planmäßig" icon={ShieldCheck} status="green" />
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

function Uploads() {
  const checks = ["Datei erkannt", "Zeitraum erkannt", "Standorte erkannt", "Pflichtfelder vorhanden", "Keine Dubletten", "Keine Leerwerte", "Summen plausibel"];
  return (
    <section className="space-y-5">
      <PageTitle title="Uploads" text="UI-Prototyp für die spätere konsolidierte Orisus-Power-Query-Exportdatei." />
      <Card className="p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Der echte Import wird in Phase 2 umgesetzt. Die spätere Datenbasis ist eine konsolidierte Power-Query-Exportdatei aus dem Orisus-Controlling.
        </p>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4">
          <h2 className="font-bold">Uploadablauf</h2>
          <div className="mt-4 space-y-3">
            {["Datei auswählen", "Importtyp auswählen", "Zeitraum erkennen", "Enthaltene Standorte erkennen", "Vorschau anzeigen", "Plausibilitätsprüfung anzeigen", "Import bestätigen"].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</span>
                <span className="font-semibold">{step}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-bold">Importtyp</h2>
          <Select className="mt-4 w-full">
            {uploadTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
          <div className="mt-4 rounded-lg border-2 border-dashed border-border bg-slate-50 p-8 text-center">
            <FileUp className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-3 font-bold">Datei auswählen</p>
            <p className="mt-1 text-sm text-muted-foreground">Excel oder CSV, in Phase 1 nur simuliert.</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <div key={check} className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {check}
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full">Import bestätigen</Button>
        </Card>
      </div>
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
