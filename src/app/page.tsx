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
import {
  ebitdaTakeover,
  monthly,
  receivablesTrend,
  standorte,
  Status,
  topBehandlerHonorar,
  uploadTypes
} from "@/data/dashboard";

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

const comparisonOptions = ["Ist", "Vorjahr", "Abweichung in EUR", "Abweichung in %"];

const bwaPeriodOptions = ["Geschäftsjahr 2024", "Geschäftsjahr 2025", "Geschäftsjahr 2026", "Gesamte Periode"];

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
  const [comparison, setComparison] = useState("Vorjahr");
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
          {page === "kennzahlen" && <KennzahlenEntwicklung />}
          {page === "performance" && <OrisusPerformance />}
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
    { label: "Gesamtleistung gem. BWA", value: total("gesamtleistung"), delta: "+4,2 % ggü. Vorjahr", icon: TrendingUp, status: "green" as Status },
    { label: "Gesamtumsatz nach PVS", value: total("pvsUmsatz"), delta: "+3,6 % ggü. Vorjahr", icon: BadgeEuro, status: "green" as Status },
    { label: "EBITDA", value: total("ebitda"), delta: "+21 TEUR ggü. Vorjahr", icon: Banknote, status: "green" as Status },
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

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Ist EBITDA vs. EBITDA bei Übernahme" icon={TrendingUp}>
          <EbitdaTakeoverChart />
        </ChartCard>
        <ChartCard title="Kostenquoten am Umsatz" icon={PieIcon}>
          <CostShareDonut />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Standortvergleich Gesamtleistung & EBITDA" icon={BarChart3}>
          <SitePerformanceChart />
        </ChartCard>
        <ChartCard title="Top Behandler nach Honorarumsatz" icon={BadgeEuro}>
          <TopBehandlerChart />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <ChartCard title="Offene Forderungen je Standort" icon={FileBarChart}>
          <ReceivablesChart />
        </ChartCard>
        <AccountsBlock />
      </div>

      <DebtCapitalBlock />

      <div className="grid gap-5 xl:grid-cols-3">
        <CostRatios />
        <Ranking title="EBITDA je Standort" metric="ebitda" />
        <Ranking title="Gesamtleistung je Standort" metric="gesamtleistung" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <CashflowBlock />
        <ChartCard title="Honorarumsatz vs. Eigenlaborumsatz" icon={PieIcon}>
          <RevenueSplit />
        </ChartCard>
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

function CostShareDonut() {
  const revenue = total("pvsUmsatz");
  const data = [
    { name: "Personal", value: Math.round(revenue * 0.278), color: "#0369a1" },
    { name: "Material", value: Math.round(revenue * 0.099), color: "#0f766e" },
    { name: "Fremdlabor", value: Math.round(revenue * 0.156), color: "#0891b2" },
    { name: "Weitere operative Kosten", value: Math.round(revenue * 0.161), color: "#64748b" },
    { name: "EBITDA", value: total("ebitda"), color: "#16a34a" }
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
      </div>
    </div>
  );
}

function SitePerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={standorte}>
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

function CostRatios({ site }: { site?: (typeof standorte)[number] }) {
  const material = site?.materialquote ?? 9.9;
  const fremdlabor = site?.fremdlaborquote ?? 15.6;
  const sonstige = site?.sonstigeKostenquote ?? 37.8;
  const rows = [
    { label: "Materialquote", value: material, target: 10.0, status: (material <= 10 ? "green" : "yellow") as Status },
    { label: "Fremdlaborquote", value: fremdlabor, target: 14.5, status: (fremdlabor <= 14.5 ? "green" : "yellow") as Status },
    { label: "Sonstige Kostenquote", value: sonstige, target: 36.0, status: (sonstige <= 36 ? "green" : "yellow") as Status },
    { label: "Gesamtkostenquote", value: material + fremdlabor + sonstige, target: 68.0, status: (material + fremdlabor + sonstige <= 68 ? "green" : "yellow") as Status }
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

function DebtCapitalBlock() {
  const aufgenommen = standorte.reduce((sum, site) => sum + site.darlehen.darlehen, 0);
  const rest = standorte.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
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
        {standorte.map((site) => {
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

function TrafficLights() {
  const rows = [
    ["EBITDA-Marge Konzern", "13,8 %", "yellow"],
    ["Cashflow Konzern", eur(total("cashflow")), "green"],
    ["Offene Forderungen", eur(total("forderungen")), "yellow"],
    ["Kostenquote", "69,4 %", "yellow"],
    ["Kontostände", eur(total("kontostand")), "green"],
    ["Vorjahresabweichung", "+2,4 %", "green"]
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

function BwaStatement({ title, siteId }: { title: string; siteId?: string }) {
  const [period, setPeriod] = useState("Geschäftsjahr 2026");
  if (!siteId) {
    return <ConsolidatedBwaMatrix title={title} period={period} setPeriod={setPeriod} />;
  }

  const rows = buildBwaRows(period, siteId);
  const activeSites = siteId ? standorte.filter((site) => site.id === siteId) : standorte;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enthält Dummy-Werte ab jeweiligem Praxisstart; Kassel erscheint erst ab Geschäftsjahr 2026.
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
                row.emphasis && "bg-cyan-50/55 font-bold",
                row.kind === "cashflow" && "bg-emerald-50/45"
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
        <Mini label="Datenstatus" value="Dummy / Phase 1" />
      </div>
    </Card>
  );
}

function ConsolidatedBwaMatrix({
  title,
  period,
  setPeriod
}: {
  title: string;
  period: string;
  setPeriod: (value: string) => void;
}) {
  const groups = [
    { id: "konzern", label: "Konzern", rows: buildBwaRows(period) },
    ...standorte.map((site) => ({
      id: site.id,
      label: site.name,
      rows: buildBwaRows(period, site.id)
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
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-64 border-b border-r border-border bg-slate-950 p-3 text-left text-xs font-bold uppercase text-white">
                BWA-Position
              </th>
              {groups.map((group) => (
                <th
                  key={group.id}
                  colSpan={2}
                  className="border-b border-r border-border bg-slate-950 p-3 text-center text-xs font-bold uppercase text-white"
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-border bg-slate-900 p-2 text-left text-xs font-semibold text-white">
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
                    row.emphasis && "bg-cyan-50 text-slate-950",
                    row.kind === "cashflow" && "bg-emerald-50"
                  )}
                >
                  {row.label}
                </td>
                {groups.map((group) => {
                  const groupRow = group.rows[rowIndex];
                  const performance = group.rows[0]?.actual || 0;
                  const quote = groupRow.percent ? groupRow.actual : performance ? (groupRow.actual / performance) * 100 : 0;
                  return (
                    <FragmentCells
                      key={`${group.id}-${row.label}`}
                      row={groupRow}
                      quote={quote}
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
      <th className="w-32 border-b border-r border-border bg-slate-900 p-2 text-right text-xs font-semibold text-white">
        Ist
      </th>
      <th className="w-24 border-b border-r border-border bg-slate-900 p-2 text-right text-xs font-semibold text-white">
        % GL
      </th>
    </>
  );
}

function FragmentCells({
  row,
  quote
}: {
  row: ReturnType<typeof buildBwaRows>[number];
  quote: number;
}) {
  return (
    <>
      <td
        className={cn(
          "border-b border-r border-border bg-white p-2 text-right font-semibold tabular-nums",
          row.actual < 0 && "text-red-700",
          row.emphasis && "bg-cyan-50 text-slate-950",
          row.kind === "cashflow" && "bg-emerald-50"
        )}
      >
        {row.percent ? pct(row.actual) : eur(row.actual)}
      </td>
      <td
        className={cn(
          "border-b border-r border-border bg-white p-2 text-right text-muted-foreground tabular-nums",
          row.emphasis && "bg-cyan-50 font-bold text-slate-950",
          row.kind === "cashflow" && "bg-emerald-50"
        )}
      >
        {pct(quote)}
      </td>
    </>
  );
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

function SiteMonthlyBwa({ site }: { site: (typeof standorte)[number] }) {
  const [year, setYear] = useState("2026");
  const rows = buildSiteMonthlyBwa(site, Number(year));
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
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-72 border-b border-r border-border bg-slate-950 p-3 text-left text-xs font-bold uppercase text-white">
                BWA-Position
              </th>
              {bwaMonths.map((month) => (
                <th key={month} className="w-24 border-b border-r border-border bg-slate-950 p-3 text-right text-xs font-bold uppercase text-white">
                  {month}
                </th>
              ))}
              <th className="w-28 border-b border-r border-border bg-slate-950 p-3 text-right text-xs font-bold uppercase text-white">
                Gesamt
              </th>
              <th className="w-32 border-b border-r border-border bg-slate-950 p-3 text-right text-xs font-bold uppercase text-white">
                Durchschnitt
              </th>
              <th className="w-40 border-b border-r border-border bg-slate-950 p-3 text-right text-xs font-bold uppercase text-white">
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
                      row.section && "bg-slate-900 text-white",
                      row.emphasis && "bg-cyan-50 text-slate-950",
                      row.kind === "cashflow" && "bg-emerald-50"
                    )}
                  >
                    {row.label}
                  </td>
                  {row.months.map((value, index) => (
                    <td
                      key={`${row.label}-${bwaMonths[index]}`}
                      className={cn(
                        "border-b border-r border-border bg-white p-2 text-right tabular-nums",
                        row.section && "bg-slate-900 text-white",
                        row.emphasis && "bg-cyan-50 font-bold text-slate-950",
                        row.kind === "cashflow" && "bg-emerald-50",
                        Number(value) < 0 && "text-red-700"
                      )}
                    >
                      {formatBwaCell(value, row.percent)}
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

function formatBwaCell(value: number | null, percent?: boolean) {
  if (value === null) return "";
  return percent ? pct(value) : eur(value);
}

function StandortDetail({ site }: { site: (typeof standorte)[number] }) {
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
      <SiteMonthlyBwa site={site} />
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
        <div className="bg-slate-950 p-3 text-lg font-bold text-white">Standort-Performance | BWA-Kennzahlen je Standort</div>
        <div className="border-b border-border bg-slate-50 p-3 text-sm italic text-muted-foreground">
          Auswertung: 2026 | Periodenende 30.06.2026 | Alle freigegebenen Standorte inkl. Ulmet | Quelle: Konzern_Konsolidierung_STD
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3 xl:grid-cols-6">
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
      <p className="text-xs font-bold uppercase text-slate-950">{label}</p>
      <p className="mt-5 text-2xl font-bold text-blue-950">{value}</p>
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
                <th key={head} className="border-b border-r border-border bg-blue-950 p-2 text-center font-bold text-white">
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
      <div className="bg-blue-950 p-3 font-bold text-white">MONATLICHE EBITDA-ÜBERSICHT JE STANDORT</div>
      <div className="border-b border-border bg-slate-50 p-2 text-sm italic text-muted-foreground">
        Auswertung: 2026 | Ist-EBITDA je Monat und Standort | Zielabweichung kumuliert gegen Übernahme und Bank/KV
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1280px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Monat</th>
              {activeSites.map((site) => (
                <th key={site.id} className="border-b border-r border-border bg-blue-950 p-2 text-white">{site.name}</th>
              ))}
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">EBITDA gesamt</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">EBITDA kum.</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Ziel Übernahme kum.</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Abw. ÜN kum.</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Ziel Bank/KV kum.</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Abw. Bank/KV kum.</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Zielerreichung ÜN</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Zielerreichung Bank/KV</th>
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
  return (
    <section className="space-y-5">
      <PageTitle
        title="Orisus Performance"
        text="Behandlerumsatz, PVS-Umsatz und Bank-/Geldbewegungen im CFO-Format, angepasst an das Dashboard-Design."
      />
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
      <div className="bg-blue-950 p-3 font-bold text-white">{title}</div>
      <div className="border-b border-border bg-slate-50 p-2 text-sm italic text-muted-foreground">{subtitle}</div>
      <div className="grid gap-px bg-border md:grid-cols-5">
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
                <th key={head} className="border-b border-r border-border bg-blue-950 p-2 text-center font-bold text-white">
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
      <div className="bg-blue-950 p-3 font-bold text-white">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Standort</th>
              {bwaMonths.map((month) => (
                <th key={month} className="border-b border-r border-border bg-blue-950 p-2 text-white">{month}</th>
              ))}
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Gesamt</th>
              <th className="border-b border-r border-border bg-blue-950 p-2 text-white">Ø Monat</th>
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
      <div className="bg-blue-950 p-3 font-bold text-white">Bank / Geldbewegungen aus Input_Finanzen</div>
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="border-b border-r border-border bg-blue-900 p-2 text-white">Position</th>
              {bwaMonths.map((month) => (
                <th key={month} className="border-b border-r border-border bg-blue-900 p-2 text-white">{month}</th>
              ))}
              <th className="border-b border-r border-border bg-blue-900 p-2 text-white">Gesamt</th>
              <th className="border-b border-r border-border bg-blue-900 p-2 text-white">Ø Monat</th>
              <th className="border-b border-r border-border bg-blue-900 p-2 text-white">Gesamte Vertragsperiode</th>
              <th className="border-b border-r border-border bg-blue-900 p-2 text-white">Ø Vertragsperiode</th>
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

function Bwa() {
  return (
    <section className="space-y-5">
      <PageTitle title="BWA" text="Konsolidierte BWA bis zum Cashflow, dynamisch nach Jahren und gesamter Periode auswählbar." />
      <BwaStatement title="Konsolidierte BWA bis Cashflow" />
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

function Darlehen() {
  const restschuld = standorte.reduce((sum, site) => sum + site.darlehen.restschuld, 0);
  const earnOut = standorte.reduce((sum, site) => sum + site.darlehen.earnOutGesamt - site.darlehen.earnOutGezahlt, 0);
  return (
    <section className="space-y-5">
      <PageTitle title="Darlehen & Earn-Out" text="Kaufpreise, Restschulden, Zins, Tilgung und Earn-Out-Fortschritt je Standort." />
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
