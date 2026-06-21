# Orisus CFO Dashboard

Interne CFO-Dashboard-App fuer die Orisus Zahnmedizin MVZ GmbH.

Die App liest den bestaetigten Excel-Import aus der Orisus-Arbeitsmappe und kann den bestaetigten Import lokal oder zentral ueber Supabase speichern.

- Next.js, TypeScript, Tailwind CSS
- shadcn/ui-inspirierte lokale Komponenten
- Recharts Visualisierungen
- Login per E-Mail/Passwort, mobiler Face-ID-Komfortzugang
- CFO Cockpit, Standorte, Standortdetail, Analysen, BWA, Cashflow, Darlehen & Earn-Out, Uploads und Reports
- Excel-Import mit Plausibilitaetspruefung und zentraler Supabase-Vorbereitung

## Supabase Live-Speicherung

In Vercel muessen fuer die zentrale Speicherung diese Environment Variables gesetzt werden:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

In Supabase wird diese Tabelle benoetigt:

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

create policy "authenticated users can read imports"
on public.orisus_confirmed_imports
for select
to authenticated
using (true);

create policy "authenticated users can write imports"
on public.orisus_confirmed_imports
for insert
to authenticated
with check (true);

create policy "authenticated users can update imports"
on public.orisus_confirmed_imports
for update
to authenticated
using (true)
with check (true);

create policy "authenticated users can delete imports"
on public.orisus_confirmed_imports
for delete
to authenticated
using (true);
```

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
