# Orisus CFO Dashboard

Interne CFO-Dashboard-App fuer die Orisus Zahnmedizin MVZ GmbH.

Die App liest den bestaetigten Excel-Import aus der Orisus-Arbeitsmappe und kann den bestaetigten Import lokal oder zentral ueber Supabase speichern. CFO-/BWA-Import und Personal-Import werden getrennt gespeichert.

- Next.js, TypeScript, Tailwind CSS
- shadcn/ui-inspirierte lokale Komponenten
- Recharts Visualisierungen
- Login per E-Mail/Passwort, mobiler Face-ID-Komfortzugang
- CFO Cockpit, Standorte, Standortdetail, Analysen, BWA, Cashflow, Darlehen & Earn-Out, Personalmodul, Uploads und Reports
- Excel-Import mit Plausibilitaetspruefung und zentraler Supabase-Vorbereitung

## Supabase Live-Speicherung

In Vercel muessen fuer die zentrale Speicherung diese Environment Variables gesetzt werden:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
# Alternativ akzeptiert die App auch:
SUPABASE_SECRET_KEY=<server-only-secret-key>
```

`SUPABASE_SERVICE_ROLE_KEY` bzw. `SUPABASE_SECRET_KEY` darf niemals als `NEXT_PUBLIC_...` Variable angelegt werden. Der Key wird nur serverseitig fuer die Admin-Zugangsverwaltung genutzt.

In Supabase werden zwei Importtabellen benoetigt:

- `orisus_confirmed_imports` fuer CFO/BWA/Finanzdaten
- `orisus_personal_imports` fuer Personaldaten

Jeder bestaetigte Import wird als eigener Historienstand gespeichert; der aktuell genutzte Stand hat `active = true`.

```sql
create table if not exists public.orisus_confirmed_imports (
  id text primary key,
  active boolean not null default true,
  file_name text,
  imported_at timestamptz,
  schema_version text,
  report jsonb not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orisus_confirmed_imports enable row level security;

create table if not exists public.orisus_personal_imports (
  id text primary key,
  active boolean not null default true,
  file_name text,
  imported_at timestamptz,
  schema_version text,
  report jsonb not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orisus_personal_imports enable row level security;
```

Rollenlogik live:

- `admin`: darf CFO- und Personal-Uploads bestaetigen/zuruecksetzen, KPI-Regeln sehen/aendern und alle Bereiche nutzen.
- `info`: darf die App lesen, aber keine Uploads bestaetigen, keine Daten zuruecksetzen und keine Regeln aendern.

Die Schreibrechte werden nicht nur in der App-Oberflaeche, sondern ueber Supabase Row Level Security abgesichert. Die App-Zugaenge stehen in `public.orisus_user_roles`; nur aktive Nutzer duerfen Importdaten lesen, und nur Admins duerfen Importdaten schreiben, aktualisieren oder loeschen. Neue App-Nutzer werden ausschliesslich im Admin-Bereich angelegt und per Einladung aktiviert; eine Selbstregistrierung ueber die Startseite ist deaktiviert.

Solange Supabase nicht konfiguriert ist, nutzt die App weiterhin den lokalen persistenten Browser-Speicher.

## Entwicklung

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
