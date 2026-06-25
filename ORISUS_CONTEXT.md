# Orisus Steuerungsboard - Projektuebergabe

Stand: 24.06.2026, fortlaufend aktualisiert im aktuellen `main`-Stand

Dieses Dokument fasst den Projektstand, fachliche Entscheidungen, Datenlogiken, Architektur und offene Punkte aus dem bisherigen Chat zusammen. Es dient als Startpunkt fuer neue Codex-/Entwicklungs-Chats.

## 1. Repository und Deployment

- Lokaler Pfad: `/Users/svendneumann/Documents/Orisus CFO App`
- GitHub-Repository: `SvendNeumann/Orisus_Dashboard`
- Vercel-Projekt: `orisus-cfo-dashboard`
- Produktiv-URL: `https://orisus-cfo-dashboard.vercel.app`
- Supabase-Projekt-URL: `https://algrgqxoeobgrhpugcqm.supabase.co`
- Branch: `main`
- Deployment laeuft ueber GitHub -> Vercel.
- Der letzte gepruefte Stand war buildfaehig mit `pnpm exec next build`.
- Diese Kontextdatei soll als verbindliche Projektuebergabe aktuell gehalten und mit relevanten App-Aenderungen ebenfalls gepusht werden.

Wichtige Regel: Veraenderungen sollen immer committed und gepusht werden, wenn sie live gehen sollen. Vercel deployed dann automatisch.
Der Nutzer erwartet, dass umgesetzte Aenderungen nicht nur lokal bleiben, sondern nach erfolgreichem Check auf `main` gepusht werden.

## 2. Tech-Stack

- Next.js App Router
- React/TypeScript
- Tailwind CSS
- Recharts fuer Charts
- Supabase fuer Auth, Rollen, Importhistorie und persistente Importdaten
- Excel-Import erfolgt clientseitig/serverseitig aus hochgeladenen Arbeitsmappen, je nach implementiertem Bereich.

Wichtige Dateien:

- `src/app/page.tsx`: Haupt-App, grosse Teile der UI, Datenlogik und Tabellen
- `src/app/api/access-users/route.ts`: Nutzer-/Zugangsverwaltung via Supabase Service Role
- `src/app/globals.css`: globale Styles
- `src/app/layout.tsx`: Metadaten, Manifest, PWA/Icon-Bezug
- `public/orisus-logo.png`: Logo
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/manifest.webmanifest`: PWA/Home-Screen-Icons

## 3. Grundprinzip der App

Die App ist eine interne Steuerungs-/Management-Plattform fuer Orisus Zahnmedizin MVZ GmbH. Ziel ist eine zentrale Steuerung einer wachsenden Healthcare-/MVZ-Gruppe mit mehreren Standorten.

Kernmodule:

- Orisus Board
- Standorte mit Standortdetails
- BWA
- Kennzahlen / Entwicklung
- Cashflow
- Orisus Performance
- Benchmarking
- Darlehen & Earn-Out
- Board-Pack / Bankenreporting
- Patienten-Auswertungen
- Personal-Cockpit
- Krankheit / Fehlzeiten
- Mitarbeiteruebersicht
- Personalmassnahmen
- Uploads
- Admin / KPI-Regeln

Die App ist bewusst keine oeffentliche Registrierungsplattform. Zugriff wird ausschliesslich durch Admins angelegt.

## 4. Rollen- und Rechtekonzept

Aktuelle Rollen:

- `admin`
- `info`
- `praxismanagement`

Admin:

- Darf alles sehen und bearbeiten.
- Darf CFO- und Personal-Uploads bestaetigen/zuruecksetzen.
- Darf KPI-Regeln und App-Zugaenge verwalten.
- Darf Reports ziehen.
- Fest angelegter Admin:
  - Name: Svend Neumann
  - E-Mail/Login: `Svend.neumann@orisus.de`
  - Dieser Admin soll nicht loeschbar sein.

Info-Rolle:

- Darf App lesen.
- Darf keine Daten aendern.
- Darf keine Uploads bestaetigen oder zuruecksetzen.
- Darf keine KPI-Regeln oder Nutzer verwalten.
- Soll keine irrelevanten Admin-/Uploadbereiche sehen.

Praxismanagement:

- Darf nur personalbezogene operative Bereiche sehen:
  - Krankheit / Fehlzeiten
  - Personalmaßnahmen
  - Mitarbeiteruebersicht
- Darf keine CFO-, BWA-, Finanz-, Upload-, Admin- oder Reportingbereiche sehen.
- CFO-/Finanzimportdaten werden fuer Praxismanagement app-seitig nicht geladen und beim Rollenwechsel auf Praxismanagement aus dem lokalen Geraetecache entfernt.
- In der Mitarbeiteruebersicht duerfen keine Gehalts-/Arbeitgeberkosten sichtbar sein:
  - keine KPI-Kachel Arbeitgeberaufwand
  - keine Spalten Fixgehalt
  - keine Spalten Stundenlohn Fixgehalt
  - keine Spalten Arbeitgeberaufwand / AG-Kosten

Hinweis: Es gab zuletzt Probleme bei Rollenwechseln, weil `praxismanagement` nicht in einem Supabase Check Constraint zugelassen war. In Supabase muss der Constraint fuer `orisus_user_roles.role` alle erlaubten Rollen enthalten.

## 5. Login- und Auth-Entscheidungen

Gewuenschte finale Logik:

- Keine freie Registrierung auf der Startseite.
- Admin legt Nutzer in der App an.
- Admin vergibt Login-Namen und Erstpasswort.
- Beim Erstlogin muss der Nutzer ein neues Passwort vergeben.
- Admin kann Passwort zuruecksetzen / neu vergeben.
- Einladung per E-Mail wurde als problematisch bewertet, weil Links teils im Spam landen und Passwortvergabe nicht sauber ausgeloest wurde.
- Face-ID-Login soll fuer mobile Nutzung optional moeglich sein.
- Desktop: Login mit Login/E-Mail und Passwort.
- Automatischer Logout nach 5 Minuten Inaktivitaet wurde wieder rueckgaengig gemacht.
- Nutzer sollen nicht mehr unbegrenzt angemeldet bleiben:
  - Pro Geraet/Browser wird die letzte Aktivitaet lokal gespeichert.
  - Nach 2 Tagen ohne Aktivitaet wird der Nutzer auf diesem Geraet automatisch abgemeldet.
  - Andere Geraete/Sessions sind davon unabhaengig.

Wichtig: Supabase Service Role Key muss in Vercel gesetzt sein, sonst funktioniert Nutzeranlage/Loeschen/Rollenverwaltung nicht.

## 6. Navigation und Struktur

Navigation wurde gruppiert:

- Zusammenfassung
  - Orisus Board
  - Personal-Cockpit
- Standorte & BWA
  - Standorte
  - BWA
  - Kennzahlen / Entwicklung
  - Cashflow
- Performance & Benchmarking
  - Orisus Performance
  - Fruehwarnsystem
  - Personalproduktivitaet
  - Benchmarking
- Finanzierung & Reporting
  - Darlehen & Earn-Out
  - Board-Pack
  - Bankenreporting
- Patienten
  - Auswertungen
- Personal
  - Personal-Cockpit je nach finaler Platzierung
  - Krankheit / Fehlzeiten
  - Mitarbeiteruebersicht
  - Personalmaßnahmen
- Administration
  - CFO-Upload
  - Personal-Upload
  - Reports
  - Admin / KPI-Regeln
- Christian Henrici
  - Allgemeine Informationen
  - Abrufdarlehen

Aktuelle wichtige Live-Ergaenzungen:

- Standortleiter-PMR als dynamischer druckbarer Report je Standort.
- PMR-Report mit Standortauswahl, Zeitraumfilter, Vergleichsjahr und Hoch-/Querformat.
- Personalkosten-/Honorar-Gegenueberstellung je Behandler in PMR und Standortdetails.
- Benchmarking mit dynamischem Standortnamen und Standardzeitraum `Gesamte Periode`.
- Benchmarking-Tab ist auf Standortleiter-Lesbarkeit verdichtet:
  - Oben direkte Tabelle `Standort vs. Orisus-Durchschnitt`.
  - Fokus auf wesentliche Kennzahlen: EBITDA-Marge, Kostenquoten, durchschnittlicher Monats-Gesamtumsatz je Zahnarzt-FTE/Zimmer, durchschnittliche Monats-Patienten je Zimmer, Neupatientenquote, Terminwahrnehmung, Terminausfallquote.
  - Kapazitaets-/Produktivitaetskennzahlen werden vor Division durch FTE/Zimmer/Stunden auf einen durchschnittlichen Monatswert normalisiert. Grundlage sind die aktiven Ist-BWA-Monate im ausgewaehlten Zeitraum seit jeweiligem Vertragsstart. Dadurch werden Standorte mit unterschiedlich langer Vertragslaufzeit vergleichbar.
  - Quoten wie EBITDA-Marge, Kostenquoten, Neupatientenquote, Terminwahrnehmung und Terminausfallquote bleiben reine Quoten und werden nicht durch Monate geteilt.
  - Terminwahrnehmung und Terminausfall im Benchmarking nur berechnen, wenn eine echte Ausfall-/Absagebasis vorhanden ist (`Nicht wahrgenommene Termine` oder `Absagequote`). Wenn ein Softwarehersteller diese Daten nicht liefert, muessen beide Werte `n. v.` bleiben.
  - Doppelte Index-Kachelgruppen und redundante Rankingbloecke sind aus der Hauptansicht entfernt.
  - Detail-Herleitungen sind einklappbar und standardmaessig geschlossen.
- Benchmarking-Reports und PMR-Benchmarking-Anlage laufen mit derselben verdichteten Logik:
  - oben `Standort vs. Orisus-Durchschnitt`
  - Spalten: Standortwert, Orisus-Durchschnitt, Abweichung, Einordnung; keine technische Quellen-Spalte im Report
  - Seite 2 nutzt freie Flaeche mit kompakten Kosten-, Patienten-/Termin- sowie Produktivitaets-/Ergebnis-Benchmarkwerten
  - keine doppelte Index-/Ranking-Ueberladung in den Reports
- KPI-Regeln im Admin-Bereich editierbar, mit verbessertem Kontrast der Eingabefelder.
- Mobile Menues koennen ueber die abgedunkelte Flaeche geschlossen werden.
- Orisus Board Earn-Out-/Wachstums-KPI-Logik ist fachlich getrennt:
  - erwarteter Earn-Out Run-Rate
  - erwartete Wachstumszahlung Run-Rate
  - erwartete Gesamtzahlung nach Vertragsende
- Orisus Board Aufraeumung:
  - Das fruehere `Status-Center | aktueller Stand` ist entfernt.
  - Kostenquote und Kapitaldienstfaehigkeit werden als normale KPI-Kacheln oben im Orisus Board angezeigt.
  - Die KPI-Kacheln `Cashflow gem. BWA` und `EBITDA` haben eigene Zeitraumfilter. Titel, Wert, Status und Info-Herleitung muessen immer dem jeweils gewaehlten Zeitraum folgen.
  - Die Zeitraumfilter in den kompakten Orisus-Board-KPI-Kacheln sollen desktop-tauglich klein und dezent bleiben.
  - Orisus Insights stehen im unteren Analysebereich neben dem Kostenquoten-Donut.
  - Im Management-Fokus `Was gerade steuerungsrelevant ist` bezieht sich die Kachel `Zielabweichung` strikt auf Ziel-EBITDA gemaess Uebernahme. Kein Kaufvertrags-Fallback in dieser Kachel; ohne berechenbares Uebernahmeziel wird `n. v.` gezeigt.
- Orisus Board Diagramm `Ist EBITDA vs. Ziel-EBITDA Kaufvertrag & Uebernahme`:
  - Ist-EBITDA und Ziel-Linien laufen nur ueber aktive Ist-BWA-Monate mit echtem Wert seit jeweiligem Vertragsstart bis zum aktuellen BWA-Datenstand.
  - Ziel-Linien duerfen nicht als gesamte Vertragsperiode oder voller Zukunftszielwert gezeigt werden.
  - Kaufvertrag und Uebernahmeziel werden beide als p.a.-Ziele behandelt und zeitanteilig ueber die aktiven Ist-BWA-Monate gerechnet.
  - Uebernahmeziel nicht ueber die volle Earn-Out-/Vertragsperiode verteilen, sonst wird die gestrichelte Linie zu niedrig dargestellt.
  - Fuer das Uebernahmeziel im Orisus Board hat der importierte BWA-Monatswert `ziel_ebitda_uebernahme` Vorrang vor statischen Standort-/Fallbackwerten. Beispiel Kehl: Monatsziel 20.901 EUR; anteilige Linie = 20.901 EUR mal aktive Ist-BWA-Monate.
  - Tooltip/Erklaerung muss zwischen `Ziel-EBITDA Uebernahme p.a.` und `Ziel-EBITDA Uebernahme anteilig bis Datenstand` unterscheiden. Beispiel Essen: Basis p.a. 245.268 EUR; bei 16 aktiven Ist-BWA-Monaten anteilig ca. 327.024 EUR.
  - Sichtbare Chart-Beschriftung/Tooltip soll schlank bleiben: Balken = Ist-EBITDA kumuliert, blaue Linie = Ziel Kaufvertrag, gelbe gestrichelte Linie = Ziel Uebernahme. Monats-/p.a.-Hilfswerte gehoeren nicht prominent in den Tooltip.
- Layout-/Visualisierungsregel:
  - Bestehende Diagramme, KPI-Kacheln, Scorecards und Tabellen duerfen visuell moderner und klarer gestaltet werden, ohne fachliche Werte- oder Importlogik zu veraendern.
  - Keine zusaetzlichen grossen Diagrammbloecke nur zur Dekoration. Neue Visualisierung nur, wenn sie eine vorhandene Auswertung ersetzt, verdichtet oder direkt in einer bestehenden KPI/Kachel sinnvoll erklaert.
  - Sparklines sind nur gezielt in vorhandenen Haupt-KPIs einzusetzen, wenn ein echter Zeitverlauf fachlich hilft. Statische Werte wie Abrufdarlehen, Stammdaten oder einmalige Vertragswerte bekommen keine Sparklines.
  - Tabellen sollen appweit kompakter, mit klarer Kopfzeile, ruhiger Zeilenstruktur und deutlicher Summenzeile dargestellt werden; Inhalte und Reihenfolge bleiben fachlich erhalten.
- PMR-Export enthaelt Seite 1 Standortleiter-PMR und Seite 2 den passenden Benchmarking-Auszug fuer denselben Standort.
- Bankenreporting wurde analytischer aufgebaut; KPI-Kacheln muessen weiter streng im App-Kachelstil bleiben.
- Orisus Performance hat oben KPI-Kacheln im einheitlichen App-Kachelstil mit Info-Buttons/Herleitungen.
- Orisus Performance: Diagramm `Operative Entwicklung` hat Zeitraumfilter und Soll-EBITDA-Linie gemaess Uebernahme.
- Orisus Performance: Bankbewegungen unten reagieren auf die Zeitraumwahl.
- Cashflow-Tab enthaelt zusaetzlich einen Abweichungsmonitor Bank vs. BWA ueber die gesamte Vertragsperiode je Standort.
- Performance & Benchmarking enthaelt ein Fruehwarnsystem als eigenes Tab:
  - Oben kompakter Warnradar mit Jahresfilter, Gesamtstatus, Anzahl Auffaellig/Beobachten und Fokus-Standorten.
  - Standardjahr fuer den Jahresfilter ist 2026, wenn 2026 im bestaetigten Import vorhanden ist.
  - Darunter Fokus nach Standort, Leselogik je Datenwelt und priorisierte Befunde.
  - Detailtabelle bleibt erhalten und nennt Signal, Standort, Zeitraum, Datenwelt, Befund, Quelle und naechsten Schritt.
- Performance & Benchmarking enthaelt eine Standort-Scorecard als Benchmarking-Block.
- Performance & Benchmarking enthaelt ein eigenes Tab `Personalproduktivitaet`.
- Personal-Cockpit:
  - Die Diagramme `Aktive Mitarbeiter je Standort` und `Krankheitstage je Standort` zeigen die Werte direkt lesbar in den Balken, damit die Zahl nicht erst per Hover/Touch-Tooltip sichtbar wird.
- Administration:
  - CFO-Upload enthaelt Datenqualitaets-/Plausibilitaetschecks.
  - Personal-Upload enthaelt Datenqualitaets-/Plausibilitaetschecks.
  - Admin / KPI-Regeln enthaelt ein dezentes zentrales Vergleichsregelwerk `Wer darf verglichen werden?`.
  - Dieses Regelwerk ist technisch zentral im App-Code hinterlegt und soll fuer Benchmarking, Fruehwarnsystem, PMR, Kennzahlen und Standortvergleiche genutzt werden.
  - Admin / KPI-Regeln enthaelt zusaetzlich zentrale `Ziel-EBITDA-Stammdaten` je Standort:
    - Kaufvertrag monatlich
    - Uebernahme monatlich
    - Beide Zielwerte werden im Admin einheitlich monatlich gepflegt. Die App rechnet daraus bei Bedarf p.a.-Werte oder zeitanteilige Periodenwerte.
    - Leere Felder verwenden weiterhin den Importwert.
    - Gepflegte Werte ueberschreiben den Import app-weit fuer BWA, Orisus Board, Standortdetails, Kennzahlen, Darlehen/Earn-Out, Board/Bankenreporting und Reports.
    - Kehl ist standardmaessig mit Ziel-EBITDA Uebernahme 20.901 EUR pro Monat hinterlegt.
- Statussprache wurde vereinheitlicht:
  - Sichtbare Labels: `Stabil`, `Beobachten`, `Auffaellig`.
  - `Handlungsbedarf` soll nicht mehr verwendet werden.
  - `Kritische Standorte` heissen sichtbar `Fokus-Standorte`.
  - Das fruehere `Status-Center` im Orisus Board wurde entfernt; Statussignale bleiben in KPI-Kacheln und Fachreitern sichtbar.
  - In Reports wird von `Status` bzw. `Statusfarben` gesprochen.

Mobile Bottom-Navigation, gewuenschte Reihenfolge:

1. Orisus Board
2. Personalcockpit
3. Standorte
4. BWA
5. Mitarbeiteruebersicht

Verhalten:

- Beim Wechsel eines Tabs soll die neue Seite immer oben starten.
- Mobile Menues muessen scrollbar sein.
- Accordion-Gruppen sollen beim Wechsel automatisch einklappen und nur die relevante Hauptgruppe offen halten.
- Unter dem Zurueck-Button soll keine zusaetzliche Tab-Leiste mehr erscheinen.

## 7. Design- und UI-Grundsaetze

Oeffentliche Landing Page:

- Dunkles Premium-Layout
- Navy / Dark Blue / Teal
- Split-Screen
- Orisus-Logo transparent ohne weissen Kasten
- Login-Karte dunkel
- Modul-Karten und Dashboard-Mockup
- Keine Aenderung an Auth-Logik durch Landing-Page-Arbeiten

App nach Login:

- An Landing Page angelehnt, aber etwas heller und dauerhaft gut lesbar.
- Der globale Ansichtsmodus `Management/Analyse` wurde wieder entfernt. Es gibt keinen Umschalter oben mehr.
- Alle vorhandenen Detailtabellen, Herleitungen, Importpruefungen und Pruefebenen sind standardmaessig sichtbar; `analysis-only` darf nicht mehr global ausgeblendet werden.
- Die Modernisierung erfolgt ueber zentrale UI-Bausteine, damit die App konsistent wirkt:
  - KPI-Karten mit ruhiger Premium-Optik, klareren Icons und besserer Wert-Hierarchie.
  - Chart-Karten mit eigener Chart-Flaeche, dezenter Tiefe und modernisierten Recharts-Farbverlaeufen.
  - Orisus Board zusaetzlich mit `Management-Fokus` als kurzer Lesestrecke fuer Ergebnisqualitaet, Zielabweichung, Forderungen und Cashflow-Fokus.
  - Modernisierte Chart-Optik ist auf zentrale Dashboard-Charts ausgeweitet: Orisus Board, Standortdetails, BWA, Orisus Performance, Bankenreporting und Personal-/Produktivitaetsdiagramme.
  - Zentrale Tabs erhalten einen kurzen `Startueberblick` oberhalb der Detailbereiche. Dieser zeigt 3-4 wesentliche Steuerungswerte; Detailtabellen bleiben darunter unveraendert erhalten.
  - Ausnahme: Bereich `Christian Henrici` bleibt in seiner bestehenden Detailstruktur unangetastet, damit alle Investorinformationen wie bisher voll sichtbar bleiben.
- Letzter UI-Durchgang:
  - App-weite Optik wurde ueber `src/components/ui.tsx` und `src/app/globals.css` modernisiert.
  - Geaendert wurden nur Layout, Kartenoptik, Tabellenrahmen, Chart-Flaechen, Badges, Buttons und visuelle Hierarchie.
  - Keine Wertebezuege, Importlogiken, Ziel-EBITDA-Logiken, Rollenrechte oder Reportberechnungen wurden fachlich veraendert.
  - Desktop-Ansichten sollen durch staerkere Container, bessere Chart-Flaechen und einheitlichere Tabellenkoepfe ruhiger wirken; mobile Ansichten bleiben kompakt.
  - Nachschaerfung fuer sichtbaren Dashboard-Effekt:
    - Haupt-KPIs im Orisus Board werden groesser und Neben-KPIs kompakter dargestellt.
    - Desktop-Inhalt nutzt eine breitere Flaeche (`max-w-[96rem]`) und zentrale Dashboard-Charts verwenden asymmetrische Spalten statt reiner 50/50-Aufteilung.
    - Chart-Flaechen, Recharts-Linien, Balken, Legenden und Tooltips wurden app-weit kraeftiger gestaltet.
    - Zentrale Finanz-/Performance-/BWA-/Banking-/Produktivitaetsdiagramme haben groessere Diagrammhoehen, staerkere Balken und klarere Legenden.
    - Tabellen wurden app-weit kompakter gemacht; Kopfbereiche und Summenzeilen sind staerker hervorgehoben.
- Ziel der UI-Ordnung:
  - oben Entscheidungsebene
  - darunter Hauptdiagramm/Haupttabelle
  - Detail-/Pruefebene darunter voll sichtbar
- Tabellen sollen einheitliche Header haben.
- Zeitraumfilter muessen hell/lesbar sein, sowohl Desktop als auch Mobile.
- KPI-Kacheln sollen optisch zentriert und nicht in die Ecke gedrueckt wirken.
- Info-Popovers/Modals muessen lesbar sein und duerfen nicht hinter anderen Kacheln verschwinden.
- Alle Gesamt-/Summenzeilen in Tabellen:
  - dezent hinterlegt
  - fett
- Negative Werte in BWA-/Finanztabellen:
  - rot
- Quotenzeilen:
  - dezente eigene Hintergrundfarbe
  - etwas kleinere Schrift, wenn noetig
- Donut-Labels in Personal-Cockpit sollen nicht im Chart selbst stehen, wenn Legende vorhanden ist.
- Diagramme:
  - Y-Achsenbeschriftungen meist ausblenden, wenn sie keinen Mehrwert bieten.
  - Ausnahmen: echte Saeulen-/Vergleichsdiagramme, wenn Achse fuer Interpretation noetig ist.
  - Fachliche Erklaerungen zu Diagrammen sollen nicht in die Chartflaeche gelegt werden, sondern dezent per klickbarem `!` in der Diagramm-Kopfzeile erscheinen.
- Desktop-Layouts muessen rahmen- und kachelbuendig sein. Diagrammkarten sollen in der Breite konsistent wirken.
- Mobile Layouts muessen mit App-Abstaenden arbeiten; keine nahtlosen Uebergaenge zwischen Kachel- und Tabellenbereichen.
- Mobile KPI-/Chart-Kacheln muessen kompakter skalieren, lange Werte umbrechen duerfen, Status-Badges nicht ueberlappen und Chartflaechen muessen ohne horizontales Layoutchaos stabil bleiben.
- Status-Badges in KPI-Kacheln duerfen nicht ins Logo/Icon oder in den Kachelrand laufen.
- Statussprache:
  - Gruen = `Stabil`
  - Gelb = `Beobachten`
  - Rot = `Auffaellig`
  - Keine sichtbare Bezeichnung `Handlungsbedarf` verwenden.
  - Bei Quoten-/Vorjahresvergleichen lieber konkret formulieren, z. B. `erhoeht ggü. Vorjahr`, `unter Vergleich`, `unter Soll`, statt pauschal streng zu wirken.
  - Interne technische Typen duerfen weiter `green/yellow/red` heissen, sichtbare Texte muessen aber fachlich weich bleiben.
- Top-Behandler-Saeulendiagramm im Orisus Board:
  - X-Achsenbeschriftung unten ausblenden.
  - Werte dezent innerhalb der Balken anzeigen.
  - Swipe-Modus auf Mobile trotzdem behalten.

## 8. CFO-Import / Excel-Datei

Hauptdatei:

- `+BWA_Controlling_Orisus_Dashboard+.xlsx`

Die App soll weiterhin die komplette Excel-Arbeitsmappe importieren, nicht nur ein einzelnes Exportblatt. Grund: Mehrere Blaetter und Exportbereiche werden gebraucht.

Wichtige Blaetter/Quellen:

- Konsolidierungsblaetter
- Standort-Exporttabs, z. B. `Kehl_Export`, `Export_Ulmet`, `Essen_Patienten_Export`
- Personalkosten-Exporttabs je Standort, z. B. `Essen_Personalkosten_Export`, `Huettenberg_Personalkosten_Export`, `Kirchberg_Personalkosten_Export`, `Kehl_Personalkosten_Export`, `Ulmet_Personalkosten_Export`
- Finanz-/Bankbewegungsbereiche
- Stammdatenbereiche
- Dashboard-/Performancebereiche

Import soll persistent in Supabase gespeichert bleiben:

- Upload bleibt aktiv, bis neuer Import bestaetigt oder Import zurueckgesetzt wird.
- Ausloggen oder Browser schliessen darf den bestaetigten Import nicht loeschen.
- Nach Bestaetigung soll die App automatisch refreshen bzw. Daten neu laden.
- Im Uploadablauf soll `Importbericht freigegeben` abgehakt werden, sobald bestaetigt.
- Nach erfolgreicher Bestaetigung von CFO- oder Personal-Import muss ein klares Popup erscheinen, dass der Import eingelesen und als aktive Datenbasis freigegeben wurde.

## 9. BWA-Logik

BWA ist streng entlang der definierten BWA-Struktur aufzubauen, ohne Honorarumsatz/PVS-Logik.

Positionen:

1. Umsatz
- KZV-Umsatz
- Privatumsatz
- Bestandsveraenderung
- Material- und Laborumsaetze
- Sonstige betriebliche Erloese
- AAG / Erstattungen
- Summe Umsatz
- Gesamtleistungsquote

2. Variable Kosten / Praxisleistung
- Fremdlabor gesamt
- Materialkosten gesamt
- Gesamtleistung abzueglich Fremdlabor/Material
- Praxisleistungsquote

3. Operative Kosten / Deckungsbeitrag
- Personalkosten gesamt
- Reparatur und Instandhaltung
- Praxisleistung abzueglich operative Kosten
- Deckungsbeitragsquote

4. Sachkosten / EBITDA
- Miete / Nebenkosten
- Reise / Fortbildung / Seminare
- Kfz / Praxiseinrichtung
- Versicherungen/Beitraege
- KZV Verwaltungskosten
- BFS Factoring
- EC-Terminal
- Nicht abziehbare Vorsteuer
- Sonstige Kosten
- Summe sonstige Kosten
- EBITDA
- EBITDA-Marge
- EBITDA Vorjahr Ist
- Soll-EBITDA gemaess Kaufvertrag
- Soll-EBITDA gemaess Uebernahme
- Abweichung Ziel-EBITDA Kaufvertrag
- Abweichung Ziel-EBITDA Uebernahme
- Operative Praxiskosten bis EBITDA

5. Unter EBITDA / Vorlaeufiges Ergebnis
- Abschreibungen
- Zinsen & neutraler Aufwand
- Zinsertrag Abzinsung Rueckstellungen
- Steuern vom Einkommen und Ertrag
- Vorlaeufiges Ergebnis
- Ergebnisquote

6. Cashflow-Adjustments
- + Abschreibungen
- Investitionsausgaben
- Tilgung
- Umbuchung ZMVZ
- Sonstige Rueckstellungen / Bestandsminderungen
- CashFlow Gesamt
- CashFlow-Quote

Wichtig:

- Abschnittsueberschriften wie `4. Sachkosten / EBITDA` duerfen keine Werte zeigen.
- Wenn fuer einen Monat keine Werte vorliegen, Zelle leer lassen.
- Nur echte Nullwerte in befuellten Perioden als `0` anzeigen.
- BWA-Tab:
  - konsolidierte BWA mit Standorten nebeneinander
  - Standortreihenfolge nach Vertragsstart
  - Zeitraumfilter: Jahre, einzelne Monate, YTD bis aktuell vorhandenem Monat
  - Kopfzeile sticky/fixiert
- Standortdetails:
  - nur Werte des jeweiligen Standortes
  - BWA mit Zeitraumspalte und ganz rechter statischer Spalte `gesamte Vertragsperiode / seit Vertragsstart`
  - Monatliche BWA Jan-Dez, Gesamt, Vorjahr, Durchschnitt, gesamte Vertragsperiode
  - Tabellenkopf sticky/fixiert
- Unter `Abw. Ziel-EBITDA Uebernahme %` und vor Abschnitt `5. Unter EBITDA / Vorlaeufiges Ergebnis` muss die Zeile `Operative Praxiskosten bis EBITDA` erscheinen.
- `Operative Praxiskosten bis EBITDA` ist fachlich immer `Summe Umsatz / Gesamtleistung - EBITDA`.
  - Beispiel Kirchberg Januar 2026: 232.496,67 EUR - 78.277,86 EUR = 154.218,81 EUR, gerundet 154.219 EUR.
  - Nicht einzelne Kostenkonten aufsummieren, weil sonst doppelte/abweichende Praxiskosten entstehen koennen.
- `Summe sonstige Kosten` ist eine normale Sachkostenzeile und darf nicht als farbig hervorgehobene Summen-/EBITDA-Zeile formatiert werden.
- PMR/Standortleiter-Report soll die BWA nur bis inkl. `Abw. EBITDA gg. Uebernahme` bzw. dem fachlich vereinbarten Block bis EBITDA zeigen, nicht den gesamten Ergebnis-/Cashflow-Block.

## 10. Cashflow-Definitionen

Es gibt zwei unterschiedliche Cashflow-Begriffe:

1. Cashflow gemaess BWA
   - Rechenlogik:
     - Vorlaeufiges Ergebnis
     - + Abschreibungen
     - - Investitionsausgaben
     - - Tilgung
     - - Umbuchung ZMVZ
     - - Sonstige Rueckstellungen / Bestandsminderungen
     - = CashFlow Gesamt
   - Das ist nicht zwingend der echte Bank-Cashflow, sondern betriebswirtschaftlich nach BWA.

2. Bank-Cashflow gemaess Bankbewegungen / Input_Finanzen
   - Geldeingang Bank gesamt
   - davon Praxisumsatz
   - davon sonstiges
   - Geldausgang Bank inkl. Kredit
   - davon Praxisausgaben
   - davon Tilgung + Zins
   - davon Umbuchungen an Orisus ZMVZ
   - Bank-Cashflow vor Intercompany
   - Bank-Cashflow gesamt im Monat
   - Kontostand Monatsende

Wichtig:

- Alle Diagramme/Tabellen muessen eindeutig beschriften, ob `Cashflow gem. BWA` oder `Bank-Cashflow` gemeint ist.
- Tab Cashflow soll eher kompakt als eine gefilterte Gesamttabelle funktionieren:
  - Filter Standort: Gesamt/konsolidiert oder einzelner Standort
  - Filter Zeitraum
  - Tabelle zeigt gesamte Bankbewegung, nicht nur die letzten Summenzeilen
- Standortdetails sollen am Ende auch Bankbewegungen fuer den jeweiligen Standort mit Zeitraumfilter enthalten.
- Abweichungsmonitor im Tab Cashflow:
  - Immer ueber die gesamte Vertragsperiode je Standort darstellen.
  - Grund: KZV-/PVS-Zahlungen koennen zeitversetzt eingehen; Monats-/YTD-Vergleiche koennen verzerren.
  - Einnahmenseite:
    - Bank-Praxisumsatz aus Bankbewegungen gegen BWA-Umsatz.
    - Primaere Importbasis ist `davon Praxisumsatz` bzw. `IST Geldeingang Bank`; `Geldeingang Bank gesamt` ist nur Fallback fuer Altimporte.
    - Keine Tilgung, Zinsen, Intercompany oder sonstigen Bankeingaenge einbeziehen.
  - Kostenseite:
    - Praxisausgaben gemaess Bankbewegung gegen operative BWA-Kosten plus Investitionen.
    - Keine Tilgung, Zinsen oder Intercompany einbeziehen.
  - Fix hinterlegte interne Bereinigung:
    - Ulmet: 100.000 EUR von Bank-Praxisumsatz/Bankeingaengen abziehen, weil operativer Kredit von Kirchberg.
    - Kirchberg: 100.000 EUR aus Praxisausgaben herausrechnen, weil interner Kredit an Ulmet und keine operativen Kosten.
  - Diese Bereinigung muss sichtbar kommentiert bleiben.

## 11. Offene Forderungen

Offene Forderungen werden aus dem Import gezogen, nicht manuell gesetzt.

Gewuenschte Logik:

- Grundsaetzlich:
  - SOLL Forderung PVS minus IST Cash geflossen PVS
- Ausnahme Ulmet:
  - Aus `Export_Ulmet`, Zeile `Offene Forderungen gesamt`

Zuletzt genannte Vergleichswerte nach neuem Import:

- Kirchberg: 179.095,71 EUR
- Essen: 152.583,04 EUR
- Kehl: 141.263,25 EUR
- Huettenberg: 227.764,00 EUR
- Ulmet: 181.130,83 EUR
- Gesamt: 881.836,83 EUR

Die App hatte zeitweise 915.724 EUR gezeigt. Das galt als veraltet/falsch.

PVS-Gesamtumsatz / Orisus Performance:

- `PVS-Gesamtumsatz inkl. FL + MAT` darf nicht mit BWA-Gesamtleistung verwechselt werden.
- Primäre Quelle ist eine direkte Importzeile `Gesamtumsatz inkl. FL + MAT` bzw. `SOLL Forderung PVS`.
- Wenn eine direkte Gesamtumsatz-/SOLL-Zeile fuer einen Standort/Monat fehlt, aber die Excel-Mappe PVS-Bausteine enthaelt, wird der PVS-Gesamtumsatz ersatzweise hergeleitet:
  - `IST Cash geflossen PVS + Noch nicht geflossen`
  - alternativ `IST Cash geflossen PVS + Noch ausstehend vs. Bank`
- Diese Fallback-Logik wurde zuletzt fuer Ulmet/Mai relevant, weil der Mai im Export als PVS-Cash plus offener Anteil vorlag, aber nicht als direkte Gesamtumsatzzeile in der Performance-Uebersicht erschien.
- Nach Aenderungen an Importlogik muss der CFO-Upload neu importiert/bestaetigt werden, damit persistierte Importdaten die neue Logik enthalten.

## 12. Kontostaende

Kontostaende sollen aus Import/Export gezogen werden:

- Kehl wurde beispielhaft in `Kehl_Export!R1190` gefunden.
- Andere Standorte kommen aus Konsolidierungs-/Exporttabs.
- Kontostaende sind aktuelle Werte, nicht seit Vertragsstart.

## 13. Darlehen, Fremdkapital, Earn-Out, Wachstumszahlung

Kaufpreise und Earn-Out-Potenziale sind teils statisch hinterlegt, da sie sich nicht aendern.

Statische Kaufpreise und Earn-Outs:

- Kirchberg:
  - Kaufpreis Upfront: 1.365.000 EUR
  - Earn-Out max.: 735.000 EUR
  - Fremdkapital Bank plus zusaetzliches Verkäuferdarlehen 100.000 EUR
  - Aufgenommenes Fremdkapital soll daher 1.530.000 EUR statt 1.430.000 EUR sein
- Essen:
  - Kaufpreis Upfront: 727.200 EUR
  - Earn-Out max.: 391.600 EUR
- Kehl:
  - Kaufpreis Upfront: 601.250 EUR
  - Earn-Out max.: 323.750 EUR
- Ulmet:
  - Kaufpreis Upfront: 1.852.500 EUR
  - Earn-Out max.: 997.500 EUR
- Huettenberg:
  - Kaufpreis Upfront: 552.500 EUR
  - Earn-Out max.: 297.500 EUR
- Kassel:
  - Kaufpreis Upfront: 1.575.000 EUR
  - Earn-Out max.: 675.000 EUR
  - Gesamtkaufpreis inkl. Earn-Out-Potenzial: 2.250.000 EUR
  - Aufgenommenes Fremdkapital: 1.851.400 EUR

Earn-Out-Logik:

- Earn-Out wird erst nach Ende der Vertragsperiode faellig.
- Aktuell faellig ist bis dahin 0 EUR.
- Erwartete Verpflichtung soll auf Basis aktueller Run-Rate berechnet werden.
- Run-Rate:
  - EBITDA seit Vertragsstart / bisher beruecksichtigte Monate
  - hochgerechnet auf p.a. oder komplette Vertragslaufzeit, je nach Kennzahl
- Entscheidend ist Ziel-EBITDA gemaess Kaufvertrag.
- Unterjaehriger Start muss immer anteilig beruecksichtigt werden.

Wachstumszahlung:

- Auch potenzielle Wachstumszahlung ist erwartete Verpflichtung.
- Muss in Darlehen & Earn-Out und Orisus Board ausgewiesen werden.
- Logik:
  - durchschnittliches EBITDA seit Vertragsstart
  - hochrechnen auf komplette Vertragslaufzeit
  - minus Ziel-EBITDA gemaess Kaufvertrag ueber komplette Vertragslaufzeit
  - positive Differenz mal Wachstumsfaktor
- Faktoren/Logiken sind im Export/Stammdaten hinterlegt, Beispiele:
  - Kehl: 2,5x Mehr-EBITDA
  - Essen: 30 % vom Mehr-EBITDA
  - Huettenberg: 30 % vom Mehr-EBITDA
  - Ulmet: 30 % vom Mehr-EBITDA
  - Kirchberg hat eine eigene Logik, im Export/Stammdaten pruefen

Faelligkeitsdaten:

- Kehl endet z. B. 30.03.2029
- Kirchberg endet z. B. 30.06.2029
- Ulmet endet z. B. 31.12.2030
- Exakte Werte im Export/Stammdaten suchen.

## 14. Orisus Board

Gewuenschte KPI-Kachelanordnung:

Erste Reihe:

1. Gesamtumsatz gem. BWA mit Zeitraumfilter
2. Aktuelle Liquiditaet
3. Offene Forderungen

Zweite Reihe:

1. Cashflow gem. BWA seit Vertragsstart
2. EBITDA seit Vertragsstart
3. Fremdkapital seit Vertragsstart

Zusaetzlich gewuenscht:

- Kachel erwarteter Earn-Out mit Info-Button
- Kachel erwartete Wachstumszahlung mit Info-Button
- Jede KPI-Kachel soll oben ein `i` haben, mit Herleitung der Werte.
- Aktuelle Liquiditaet: Info zeigt Kontostaende je Standort.
- Gesamtumsatz gem. BWA: Info zeigt BWA-Zeile `Summe Umsatz` je Standort fuer den gewaehlten Zeitraum; nicht PVS-/Behandlerumsatz.
- Offene Forderungen: Info zeigt Zusammensetzung je Standort.
- Fremdkapital: Info zeigt aufgenommenes Fremdkapital, Tilgung, Restschuld je Standort.
- Fokus-Standorte-Kachel ist aus der oberen KPI-Reihe entfernt.

Fokus-Standorte Logik:

- Standort im Fokus, wenn Bank-/BWA-Cashflow negativ oder eine relevante Orisus-Regel auffaellig ist, je nach Kachelkontext klar beschriften.
- Zusaetzlich im Fokus, wenn Standort in durchschnittlicher Vertragslaufzeit beim Ziel-EBITDA gemaess Kaufvertrag mehr als 15 % unter Ziel liegt.
- Unterjaehrige Vertragsstarts muessen anteilig beruecksichtigt werden.

Entfernte/zu entfernende Doppelungen im Orisus Board:

- Kontostaende-Auflistung als separates Element raus, weil in Info-Button enthalten.
- Kostenquoten-Kachel/Block raus, wenn Donut vorhanden.
- EBITDA je Standort und Gesamtleistung je Standort koennen raus, wenn diese Information an anderer Stelle redundant ist.

Diagramme:

- Orisus Board Diagramm `Ist EBITDA vs. Ziel-EBITDA` zeigt:
  - Ist-EBITDA seit Vertragsstart als Balken
  - Ziel-EBITDA gemaess Kaufvertrag als Linie
  - Ziel-EBITDA gemaess Uebernahme als gestrichelte Linie
- Offene Forderungen je Standort soll neben/unter EBITDA-vs-Ziel-Diagramm oben stehen.
- Top Behandler nach Honorarumsatz:
  - nur Honorarumsatz, kein Eigenlabor
  - Zeitraum: aktuelles Jahr bis zum neuesten vorhandenen Monat, nicht starr bis April
  - Ueberschrift mit Zeitraum
  - Y-Achsen-Labels kleiner
  - Werte dezent innerhalb der Balken anzeigen.
  - Untere X-Achsenbeschriftung ausblenden, damit die mobile Ansicht nicht unnoetig gescrollt werden muss.

## 15. Standortdetails

Standortdetails sollen die zentrale Detailseite je Praxis bleiben und sind fachlich sehr gut.

Inhalte:

- KPI-Kacheln seit Vertragsstart
  - Kacheln sollen Info-Button `i` mit Herleitung und Datenquelle haben.
  - Info muss klar nennen, ob BWA-, Bank-, PVS-/Performance- oder Personaldaten verwendet werden.
- BWA Standort
- monatliche BWA
- PVS-Gesamtumsatz monatlich
- Behandlerumsatz je Behandler:
  - Honorarumsatz
  - Eigenlaborumsatz
  - Gesamt = Honorar + Eigenlabor
  - monatlich mit Zeitraumfilter
- Bankbewegungen je Standort mit Zeitraumfilter
- Diagramm `Entwicklung ueber Zeit`:
  - mit Zeitraumfilter.
  - Klar beschreiben, was gemessen wird.
  - Gemessen werden BWA-Gesamtleistung, BWA-EBITDA und Cashflow gem. BWA fuer den Standort.
  - Bank-Cashflow und Kontostand separat im Bankbewegungsbereich ausweisen.
- Personalkosten je Behandler / Mitarbeiter:
  - unten in den Standortdetails je Standort eingebunden
  - Daten aus den Personalkosten-Exporttabs
  - Honorarumsatz aus Behandlerdetails gematcht
  - alle Mitarbeiter aufnehmen, die im Personalkosten-Tab des jeweiligen Standortes vorkommen, nicht nur reine Behandler
  - Spalten: Mitarbeiter, Typ, Personalkosten, Honorarumsatz, PK-Quote
  - keine technischen Hinweise wie Datenstatus oder `Honorarumsatz automatisch` anzeigen
  - Standardzeitraum: gesamte Vertragsperiode / seit Vertragsbeginn
  - PK-Quote immer mit einer Nachkommastelle darstellen
  - `MVZ` und `Unbekannt` nie anzeigen, nie mitzählen und nicht erwaehnen, obwohl sie importiert werden.
  - Inaktive Mitarbeiter sollen mit Hinweis auf Inaktivitaet und Austrittsdatum erkennbar sein, wenn vorhanden.
  - Inaktiv-Hinweis kommt entweder direkt aus der CFO-Personalkostenzeile oder aus eindeutigem Match mit dem Personal-Upload; gekuerzte CFO-Namen duerfen per eindeutigem Nachnamen je Standort gematcht werden.

Wichtig:

- Standortdetails zeigen nur den angeklickten Standort, keine anderen.
- Kumulierte Werte seit Vertragsstart.
- Kontostand und Forderungen als aktueller Stand.
- PVS-Umsatz muss aus Export gezogen werden, nicht BWA-Gesamtleistung.
- Die Personalkosten-/Honorarquote in Standortdetails muss dieselbe dynamische Datenbasis wie der PMR-Report nutzen, keine Fantasiewerte.
- Bei Kirchberg gab es doppelte Behandlerbezeichnungen aus Import-/Exporttabs, z. B. `PZR Pomsel`/`S. Pomsel`, `F. Paaatsch`/`PZR Paaatsch`, `P. Heinz`/`Assi Patrizia Heinz`, `S. Gräfe`/`PZR Gräfe`, `N. Orsós`/`ZA Nicole Orsós`, `S. Dietrich`/`PZR Dietrich`.
- Wichtig: Deduplizierung darf echte doppelte Importzeilen nicht einfach addieren, wenn es fachlich dieselbe Leistung/Person doppelt im Export ist. Honorar- und Eigenlaborumsaetze muessen aus den korrekten Umsatzquellen gezogen und je fachlicher Person eindeutig ausgewiesen werden.
- Fuer PMR Kirchberg sollen aus der Personalkosten-/Honorar-Gegenueberstellung und aus dem Behandler-Umsatzboard nicht relevante Eintraege ausgeblendet werden:
  - Samira Pomsel
  - Prophylaxe / unregelmaessige Behandler
  - PZR Dietrich
  - S. Dietrich
  - Schreibvarianten wie `S. Pomsel`/`S. Pomsil` und `S. Dietrich`/`S. Dittrich` mit beruecksichtigen

## 16. Orisus Performance

Ziel:

- PVS-Gesamtumsatz je Standort
- Behandlerumsatz inkl. Eigenlabor
- Behandlerhonorarumsatz
- Monatsuebersichten
- Bank-/Geldbewegungen aus Input_Finanzen
- eigene Zeitraumfilter je Tabellenblock
- KPI-Kacheln oben im einheitlichen App-Kachelstil mit Rand und Info-Button.
- Info-Buttons muessen Herleitung und Datenquelle der Werte erklaeren.
- Diagramm `Operative Entwicklung`:
  - Zeitraumfilter vorhanden.
  - Zusaetzliche Linie `Soll-EBITDA gem. Uebernahme`, damit sichtbar ist, ob Ist-EBITDA darueber oder darunter liegt.
- Bankbewegungen unten muessen auf die Zeitraumwahl reagieren.

Wichtige Entscheidung:

- Behandlerumsatz inkl. Eigenlabor ist nicht BWA-Gesamtleistung.
- Behandlerumsatz inkl. Eigenlabor = Honorarumsatz + Eigenlaborumsatz.
- Honorarumsatz allein separat auswerten.

Beispielwerte aus Screenshot fuer Januar 2026 Behandlerumsatz inkl. Eigenlabor:

- Gesamt: 667.506
- Kirchberg: 222.025
- Essen: 84.673
- Kehl: 102.387
- Ulmet: 148.344
- Huettenberg: 110.076

## 17. Benchmarking

Tab wurde von `Analyse` in `Benchmarking` umbenannt.

Ziel:

- Standort-Benchmarking mit relativen Indexkennzahlen.
- Vergleich mit `Orisus-Durchschnitt`: Der ausgewertete Standort wird intern aus dem Durchschnitt der Vergleichsgruppe herausgerechnet, damit er seinen eigenen Benchmark nicht verwaessert. Sichtbar soll nur `Orisus-Durchschnitt` stehen.
- Standortleiter-Ansicht.
- In der App-Ansicht steht oben eine klare Tabelle `Standort vs. Orisus-Durchschnitt`, damit Standortleiter sofort sehen, ob z. B. Personalquote, Kostenquoten, Patienten je Behandlungszimmer oder Neupatientenquote ueber/unter Vergleich liegen.
- Kapazitaetswerte in dieser Tabelle sind Monatsdurchschnitte: erst Umsatz/Leistung/Patientenzahl durch aktive Ist-BWA-Monate seit Vertragsstart, danach durch Zahnarzt-FTE, Behandlungszimmer oder Oeffnungsstunden. Keine kumulierten Gesamtperiodenwerte fuer FTE-/Zimmervergleiche verwenden.
- Die Hauptansicht soll nicht mit vielen doppelten Indexkacheln ueberladen sein; Detailtabellen/Rechenbasis bleiben einklappbar bzw. nachgelagert.
- PDF-Export sauber, farbig, druckfaehig, nicht nur Screenshot der App.
- Oben in der Ansicht muss immer `Standort-Benchmarking: <Standortname>` stehen, nicht `ausgewaehlter Standort`.
- Standardzeitraum ist `Gesamte Periode`.
- `Gesamte Periode` bedeutet je Standort: seit jeweiligem Vertragsstart, nicht pauschal derselbe Zeitraum fuer alle.
- Der ausgewaehlte Standort darf im Benchmarking im Klartext genannt und visuell markiert werden.
- Vergleichsstandorte duerfen nicht im Klartext erscheinen, sondern anonymisiert als Peer-/Standort-Vergleich.
- In Basis-Tabellen, Kacheln, Heatmaps und PDF-Reports muss der Vergleich sichtbar als `Orisus-Durchschnitt` beschriftet werden.
- Nicht sichtbar machen, dass die Gruppe nur aus einer bestimmten Anzahl Standorten besteht. Formulierungen wie `Peer-Auszug`, `Top-Peer-Auszug` oder `anonymisierte Vergleichsgruppe` verwenden, nicht `Standort A-E` als vollstaendige Gruppenliste.
- Forderungsquote soll aus den oberen Benchmark-Kacheln entfernt bleiben.
- Benchmarking-Report fuer Standortleiter/PMR:
  - wird als Seite 2 an den Standortleiter-PMR angehaengt
  - Querformat
  - muss auf genau eine Seite passen
  - keine uebergrossen Kacheln oder weissen Leerflaechen
  - oben kompakte Tabelle `Standort vs. Orisus-Durchschnitt`
  - keine doppelten Index-Kacheln oder redundanten Rankingbloecke
  - ergaenzende Kosten-, Patienten-/Termin- und Rechenbasis-Tabellen bleiben kompakt darunter
  - keine horizontal verschobenen Inhalte im Druckfenster

Wichtige Kennzahlen:

- Ø mtl. Gesamtumsatz je Zahnarzt-FTE
- Ø mtl. Gesamtleistung je Zahnarzt-FTE
- Ø mtl. EBITDA je Zahnarzt-FTE
- Ø mtl. Gesamtumsatz je Behandlungszimmer
- Ø mtl. Gesamtleistung je Behandlungszimmer
- Ø mtl. EBITDA je Behandlungszimmer
- EBITDA-Marge
- Forderungsquote
- Kostenquoten
- Patientendaten / Termindaten, soweit vorhanden

Behandlungszimmer statisch hinterlegt:

- Kirchberg: 4
- Essen: 5
- Kehl: 5
- Ulmet: 12
- Huettenberg: 4

Praxisoeffnungszeiten statisch, aber im Admin editierbar:

- Kirchberg: 53
- Essen: 39
- Kehl: 56
- Ulmet / Hangx: 84
- Grauhausen: 52,5

Zahnarzt-FTE-Logik:

- Nicht nur Anzahl Behandler zaehlen.
- Zahnarztstunden aus Mitarbeiterliste beruecksichtigen.
- Behandler mit unterschiedlichen Wochenstunden muessen anteilig in Zahnarzt-FTE einfliessen.
- FTE-Basis: 40 Stunden/Woche.
- Inaktive Behandler in historischen Zeitraeumen duerfen nicht pauschal entfernt werden.
- Wenn ein Behandler 2025 aktiv war, 2026 aber inaktiv, muss er fuer 2025 beruecksichtigt werden.
- Mitarbeiterliste nach Eintritt/Austritt/Status und Wochenstunden je Zeitraum auswerten.
- Aktuelle Implementierung rechnet FTE je ausgewaehlter Periode:
  - Monate der Auswahl werden bestimmt.
  - je Monat werden aktive Zahnaerzte anhand Eintritt/Austritt/Status geprueft.
  - Wochenstunden werden ueber die Monate gemittelt.
  - FTE = durchschnittliche Wochenstunden / 40.
  - Dadurch sind unterjaehrige Eintritte/Austritte und historische Zeitraeume anteilig abgebildet.

Unterjaehrige Standortstarts:

- Muss fuer 2025/2026 usw. beruecksichtigt werden.
- Kehl z. B. ab 01.04.2025, also nicht volles Jahr 2025.

Eigene Rechenbasis:

- Soll einklappbar sein.
- Soll Info-Buttons mit Herleitung je Wert haben.
- Soll zeigen, was die eigenen 100 %-Werte sind.
- Wichtig, damit Indexwerte deutbar sind.

Patientendaten:

- Es gibt neue Datei/Bereich `Essen_Patienten_Export`.
- Dieser Tab wurde spaeter in die CFO-Excel aufgenommen.
- App soll diesen Tab beim Import erkennen und fuer Essen-Patientendaten nutzen.
- Wenn Patient-/Termindaten fuer einen Standort fehlen, darf nicht 100 % oder falscher Wert gerechnet werden.
- Fehlende Basis = `n. v.` / keine Berechnung.
- Terminwahrnehmungsquote muss logisch begrenzt werden:
  - nie ueber 100 %
  - wenn Terminausfallquote vorhanden ist, maximal `100 % - Terminausfallquote`
  - Beispiel: 13,6 % Ausfall => Wahrnehmung maximal 86,4 %, nicht 123,2 %.
  - Das gilt auch fuer den `Orisus-Durchschnitt`: Wenn die Durchschnitts-Ausfallquote 8,7 % ist, darf die Durchschnitts-Terminwahrnehmung maximal 91,3 % sein.
- Kirchberg-Patientendaten sind in der aktuellen CFO-Arbeitsmappe vorhanden und der Parser ist vorbereitet.
- Wenn Patientendaten in der Live-App leer bleiben, ist zuerst zu pruefen, ob nach Parser-/Schema-Aenderung ein neuer CFO-Import bestaetigt wurde.

PDF-Export:

- Muss ueber mehrere Seiten sauber laufen.
- Quer-/Hochformat sinnvoll waehlen.
- Farbige Ausgabe inklusive Heatmap.
- Nicht einfach App herunterrendern.
- Seitenumbrueche und Lesbarkeit beachten.

## 18. Patienten-Modul

Neuer Menuebereich:

- Patienten
  - Auswertungen

Ziel:

- Patientendaten und Termindaten je Standort auswerten.
- Essen-Daten aus `Essen_Patienten_Export` einbinden.
- Fuer Essen zunaechst Platz lassen, falls Daten nachgereicht werden.
- Metriken moeglich:
  - Neupatienten
  - behandelte Patienten
  - wahrgenommene Termine
  - abgesagte Termine
  - Terminausfallquote
  - Patientenzahl je Standort
  - Patienten-/Terminquoten pro Behandlungszimmer
- Patienten-/Terminquoten pro Zahnarzt-FTE
- Umsatz je Patient / je Termin, wenn Datenbasis sinnvoll

Standort-Scorecard:

- Unter Performance & Benchmarking integriert.
- Ziel: Management-Radar je Standort.
- Scorebereiche:
  - Finanzen
  - Cashflow
  - Bank/PVS
  - Produktivitaet
  - Personal
  - Patienten
  - Datenbasis
- Bank/PVS-Abgleich in der Scorecard immer auf gesamter Vertragsperiode, nicht nur aktuellem Filter.
- Score-Status:
  - ab 75: Stabil
  - ab 55: Beobachten
  - darunter: unter Zielniveau / auffaellig
- Fokus-Spalte nennt die schwachen Dimensionen, nicht pauschal `Handlungsbedarf`.

Personalproduktivitaet:

- Eigenes Tab unter Performance & Benchmarking.
- Standortvergleich mit Zeitraumfilter.
- Finanzwerte:
  - Gesamtleistung aus BWA
  - PVS-Umsatz aus Performance-/PVS-Import
  - EBITDA aus BWA
  - Personalkosten aus BWA, keine offengelegten Gehaltsdetails
- Kapazitaet:
  - Personalimport
  - durchschnittlich aktive Mitarbeiter im Zeitraum
  - FTE = Wochenstunden / 40, monatsgenau gemittelt
  - Zahnarzt-FTE nur fuer Mitarbeiter mit Behandler-/Zahnarztkennzeichnung
  - Inaktive Mitarbeiter historisch beruecksichtigen, wenn sie im ausgewerteten Zeitraum aktiv waren
- Auswertungen:
  - Gesamtleistung je FTE
  - PVS je FTE
  - EBITDA je FTE
  - Personalkosten je FTE
  - PVS je Zahnarzt-FTE
  - EBITDA je Zahnarzt-FTE
  - Personalkostenquote
  - EBITDA-Marge
- Tab muss erklaeren, welche Datenquelle verwendet wird und dass keine Gehaltsdetails offengelegt werden.

Fruehwarnsystem:

- Eigenes Tab unter Performance & Benchmarking.
- Ziel: fruehe Abweichungen nach Jahr/Zeitraum erkennen.
- Signale werden als `Stabil`, `Beobachten`, `Auffaellig` gefuehrt.
- Beispiele:
  - Kostenquote erhoeht ggü. Vorjahr
  - Personalkostenquote erhoeht ggü. Vorjahr
  - PVS-/Umsatzrueckgang
  - Terminausfallquote erhoeht ggü. Vorjahr
  - Ziel-EBITDA-Abweichung
- Fehlende Datenbasis nicht als 0 werten.

## 19. Personal-Import

Separate Datei:

- `++Orisus_Personalübersicht_Dashboard++.xlsx`

Ziel:

- Personalmodul wird durch Upload dieser Datei befuellt.
- Import soll persistieren wie CFO-Import.
- Personal-Upload liegt unter Administration.

Wichtige Inhalte:

- Mitarbeiterstamm
- Status aktiv/inaktiv/Elternzeit/Mutterschutz/etc.
- Eintritt/Austritt
- Standort
- Wochenstunden
- Fixgehalt
- Stundenlohn Fixgehalt
- Arbeitgeberaufwand
- Bemerkungen
- Krankheitstage
- Personalmassnahmen
- AG-Kosten
- Teamkosten
- Fluktuation

## 20. Personal-Cockpit

Wichtige Anforderungen:

- Zeitraumfilter startet bei 2024.
- Tabellen/Charts muessen mit Zeitraumfilter verbunden sein.
- Fuer historische Jahre zaehlen Mitarbeiter, die in diesem Zeitraum aktiv waren.
- Inaktive aktuell duerfen fuer alte Zeitraeume nicht verloren gehen.
- Gleichzeitig wurde fuer bestimmte Ansichten gewuenscht:
  - Mitarbeiteruebersicht und manche Kacheln nur aktuell aktive Mitarbeiter zeigen.

KPI-Kacheln:

- Aktive Mitarbeiter
- FTE gesamt
- Fluktuationsquote je Standort / max. Standort
- Neueinstellungen
- Wochenstunden
- AG-Aufwand
- Krankheitstage

Korrektur:

- Personal-Cockpit und Mitarbeiteruebersicht hatten teils abweichende Werte.
- Mitarbeiteruebersicht wurde als plausibler bewertet.
- Kacheln im Personal-Cockpit sollen auf dieselbe Logik wie Mitarbeiteruebersicht gebracht werden, wenn es um aktuelle aktive Mitarbeiter geht.

Tabellen:

- Personalstruktur je Standort
  - Gesamt ohne Inaktive, aber inkl. Elternzeit/Mutterschutz/sonstige nicht inaktive Status
  - neben Aktiv auch FTE
- Kosten & operative Kennzahlen
- Kostenuebersicht je Standort
- AG-Kosten je Standort als Chart/Donut, kleiner, nicht ueber volle Breite
- Neben/unter dem AG-Kosten-Donut soll eine Top-10-Aufstellung der Mitarbeiter mit den meisten Krankheitstagen im laufenden Jahr erscheinen.
- Fluktuation-/Status-Badges muessen im Raster buendig bleiben, duerfen nicht ins Icon/Logo laufen und muessen die neue Statussprache nutzen, also nicht `Handlungsbedarf`.

## 21. Krankheit / Fehlzeiten

Anforderungen:

- Monatliche Krankheitstage je Standort.
- Zellen ohne Wert, wenn in anderen Standorten der Monat Werte hat, sollen als 0 angezeigt werden, weil dann niemand krank war.
- Tage je aktivem Mitarbeiter einheitlich mit 1 Nachkommastelle.
- Vergleichbar: Krankheitstage je aktivem Mitarbeiter
  - Quote pro Monat auf aktive Mitarbeiter in diesem Monat beziehen, nicht pauschale Jahreszahl.
- Fuer historische Jahre: Mitarbeiter, die damals aktiv waren, muessen mitzaehlen.
- Top 10 kranke Mitarbeiter:
  - Name
  - Standort
  - Krankheitstage
  - Quote am Jahr / Anteil, sinnvoll formuliert
- Heatmap `Vergleichbar: Krankheitstage je aktivem Mitarbeiter`:
  - Nullwerte duerfen nicht weiss/leergelassen wirken.
  - 0-Monate bekommen eine dezente dunkle/teal Hintergrundfarbe passend zum App-Layout.
  - Fehlende Datenbasis muss weiter von echter 0 unterscheidbar bleiben.

## 22. Mitarbeiteruebersicht

Anforderungen:

- Oben KPI-Kachel: absolute Anzahl aktiver Mitarbeiter.
- Freitextsuche nach Name.
- Freitextfeld muss lesbar sein, insbesondere mobile.
- Tabelle mit Spalten:
  - nach Wochenstunden: Fixgehalt
  - Stundenlohn Fixgehalt
  - nach AG-Aufwand: Bemerkungen
- Export des gerade gefilterten Ergebnisses als PDF.
- Praxismanagement-Rolle darf keine Gehalts-/AG-Kosten-Spalten sehen.

## 23. Reports

Reports waren als Phase 2 geplant, werden aber nun live-faehig umgesetzt.

Reports sollen:

- Farbig sein.
- Nicht einfach die App abdrucken.
- Saubere Seitenformate haben.
- Seitenumbrueche beachten.
- Direkt fuer Bank/Investor/Board verwendbar sein.
- Hoch-/Querformat je Report sinnvoll waehlen.
- Nutzer kann je Report Hochformat oder Querformat auswaehlen.
- Drucklayout muss sich an das Format anpassen, ohne Ueberschneidungen oder unbuendige Tabellen.
- Report-Header duerfen keine internen Arbeitstitel wie `Orisus Steuerungsboard` verwenden.
- Stattdessen klare externe Titel verwenden, z. B. `Monatsreport`, `Management-Report`, `Standortleiter-PMR`, inkl. Zeitraum/Standort.
- PDF-Reports duerfen nicht wie die App wirken, sondern sollen druckfertig und professionell fuer Empfaenger sein.
- PMR-/Benchmarking-Reports sollen optisch an die modernisierte App angelehnt sein, aber als professionelle Management-Unterlage wirken: klarer Kopfbereich, ruhige KPI-Karten, strukturierte Abschnittskoepfe, weniger Tabellenblatt-Anmutung.

Aktuell sichtbare Report-Auswahl:

- Standortleiter-PMR

Aus der sichtbaren Report-Auswahl vorerst entfernt:

- Monatsreport
- YTD- / Management-Report
- Bankenreport
- Standortreport

Weitere Reports/Exports:

- Benchmarking-PDF existiert im Benchmarking-Bereich.
- Mitarbeiteruebersicht-PDF existiert in der Mitarbeiteruebersicht.

Standortleiter-PMR:

- Zweck: monatlicher Standortleiter-/PMR-Report je Standort, automatisiert aus App-/Importdaten.
- Auswahl:
  - Standorte flexibel auswaehlen
  - Zeitraum flexibel auswaehlen, z. B. auch rueckwirkend Mai im August
  - Vergleichsjahr auswaehlen
  - Hoch-/Querformat auswaehlen
- Aktuelle UI:
  - Filter sauber gruppiert: Zeitraum, Vergleichsjahr, Druckformat, `PMR oeffnen`
  - Standortauswahl direkt in der PMR-Karte sichtbar
  - Buttons `Alle` und `Keine`
  - Standard-Speichername soll automatisch sinnvoll erzeugt werden: `PMR Report <Standort> <Zeitraum>`
  - Standorte bleiben auswaehlbar, auch wenn gerade kein bestaetigter Import aktiv ist; Werte brauchen aber natuerlich einen bestaetigten Import
- Inhalt:
  - Orisus-Logo passend im Report
  - BWA-Ueberblick des Standorts bis EBITDA inkl. wichtiger Unterpositionen
  - BWA-Ueberblick mit Spalten:
    - aktuellster Monat des gewaehlten Zeitraums, z. B. Apr 26
    - Vorjahresmonat, z. B. Apr 25
    - YTD aktuelles Jahr bis aktueller Monat
    - YTD Vorjahr bis gleicher Monat
    - Abweichung
    - Status
  - Quoten & Kennzahlen
  - Earn-Out-/Wachstumszahlungslogik als indikative Hochrechnung
    - Sonderfall Ulmet: Earn-Out-/Wachstumszahlung nur zeigen, wenn tatsaechlich etwas verdient ist; wenn 0, den Block im Ulmet-PMR weglassen.
  - Monatsentwicklung EBITDA/Gesamtleistung/Marge/Abweichungen
    - Noch nicht vorliegende Monate leer lassen, nicht als 0 werten.
  - Behandler-Umsatzboard mit Vorjahresvergleich
  - Personalkosten je Behandler/Mitarbeiter mit Honorarumsatz und PK-Quote
- BWA im PMR:
  - soll sich an der detaillierten Excel-Aufstellung orientieren
  - bis zum vereinbarten EBITDA-/Abweichungsblock, nicht die kompletten unteren Cashflow-Adjustments fuer Standortleiter
  - dynamisch aus derselben BWA-Importlogik wie die App, keine separaten manuell gesetzten Werte
- Personalkostenlogik:
  - alle Mitarbeiter aus den Personalkosten-Exporttabs aufnehmen
  - Honorarumsatz hinzumatchen, wenn vorhanden
  - Mitarbeiter ohne Honorarumsatz trotzdem zeigen
  - `MVZ` und `Unbekannt` nicht anzeigen und nicht mitzaehlen.
  - Inaktive Mitarbeiter mit Statushinweis/Austrittsdatum ausweisen, wenn vorhanden.
  - PK-Quote nur berechnen, wenn Honorarumsatz sinnvoll vorhanden ist
  - immer seit Vertragsbeginn / gesamte Vertragsperiode ausweisen, nicht nach PMR-Zeitraum oder Standortdetail-Filter
  - Grund: Umsatzbeteiligungen koennen monatsverschoben oder gesammelt ausgezahlt werden; Monats-/YTD-Sichten wuerden die PK-Quote verzerren
- Statuslogik:
  - fuer BWA/Quoten & Kennzahlen an Entwicklung/Vorjahresvergleich orientieren
  - im PMR-BWA-Ueberblick Status nur auf Steuerungs-/Gesamtzeilen, nicht auf jeder Detailkontozeile
  - relevante PMR-Statuszeilen: Summe Umsatz, Gesamtleistung abzueglich Fremdlabor/Material, Praxisleistung abzueglich operative Kosten, Operative Praxiskosten bis EBITDA, EBITDA
  - bei Personalkosten-Gegenueberstellung keine uebernommene BWA-Statuslogik erzwingen, sondern neutral/kennzahlenorientiert ausweisen
  - Statt `Handlungsbedarf` konkrete Abweichung nennen, z. B. `erhoeht ggü. Vorjahr`, `unter VJ`, `unter Ziel`.
- PMR-Personalkostentabelle ist fuer Standortleiter gedacht: keine technischen Spalten wie Datenstatus anzeigen.
- Fehlende Vorjahreswerte in PMR-BWA oder Quoten/Kennzahlen leer lassen, nicht als 0 anzeigen.

## 24. Admin / KPI-Regeln

Admin-Bereich:

- App-Zugaenge anlegen, bearbeiten, loeschen.
- Rollen aendern.
- Letzter Login je Nutzer anzeigen.
- Fester Admin nicht loeschbar.
- Nutzer koennen komplett geloescht werden, nicht nur deaktiviert.
- KPI-Regeln / Statuslogik administrierbar.
- Praxisoeffnungszeiten je Standort editierbar.
- Behandlungszimmer optional editierbar, auch wenn aktuell statisch hinterlegt.
- KPI-Regel-Eingabefelder muessen hohen Kontrast haben; Schrift in editierbaren Kacheln darf nicht im dunklen Hintergrund untergehen.

Bekannte Themen:

- Rollenwechsel auf `praxismanagement` braucht Supabase Constraint-Anpassung.
- Nutzeranlage hatte zeitweise `Unexpected end of JSON input`, meist wenn API keinen sauberen JSON-Body zurueckgibt oder Service Role fehlt.
- `email rate limit exceeded` kam bei Supabase-Einladungen. Da E-Mail-Einladungsflow nicht final gewuenscht ist, soll Login-Name/Erstpasswort-Flow bevorzugt werden.
- `Neu laden` im Admin-Bereich darf nicht auf Orisus Board springen, sondern aktuelle Seite/Tab refreshen.

## 25. Sicherheit / Datenschutz

Die App enthaelt vertrauliche Daten:

- Namen
- Gehaelter
- Mitarbeiterdaten
- Krankheitsdaten
- Finanzdaten
- Standortkennzahlen

Sicherheitsanforderungen:

- Keine freie Registrierung.
- Nur Admin kann Zugriffe anlegen.
- Rollenbasierte Sichtbarkeit, nicht nur Buttons deaktivieren.
- Admin-/Uploadbereiche fuer Nicht-Admins ausblenden.
- Supabase RLS/Policies pruefen.
- Service Role niemals im Client.
- Vercel Environment Variables sicher setzen.
- Passwort-/Auth-Flow absichern.
- Kein Demo-Daten-Fallback in Live-Ansichten.
- Keine sensiblen Daten in Console Logs.
- Dateien/Uploads nur autorisiert.

## 26. Bekannte offene oder sensible Pruefpunkte

Diese Punkte sind nicht zwingend offen, aber bei zukuenftigen Aenderungen besonders zu beachten:

1. CFO-/Personal-Import nach Parser-Aenderungen
   - Importlogik-Aenderungen werden erst sichtbar, wenn der CFO- bzw. Personal-Upload neu bestaetigt wurde.
   - Nach Importlogik-Aenderungen immer neuen Import oder Hinweis an Nutzer einplanen.

2. Ulmet PVS
   - Ulmet darf in PVS-/Performance-Ansichten nicht leer bleiben, wenn Werte im Export vorhanden sind.
   - Fallback fuer fehlende direkte PVS-Gesamtzeile: `IST Cash geflossen PVS + Noch nicht geflossen` bzw. `Noch ausstehend vs. Bank`.

3. Kirchberg Behandler-Deduplizierung
   - Doppelte Behandlerbezeichnungen duerfen nicht blind addiert werden.
   - Alias derselben Person vs. echte Zusatzumsatzzeile fachlich unterscheiden.

4. PMR-PDF
   - Immer mit echter Druck-/PDF-Vorschau pruefen.
   - Seite 1 PMR und Seite 2 Benchmarking muessen je sauber auf eine Seite passen.
   - Keine grossen Leerflaechen, keine horizontal verschobenen Inhalte.

5. Zeitraumfilter
   - Zeitraumfilter sollen auf neuesten sinnvollen Zeitraum/YTD zeigen.
   - Keine Future-Leerjahre wie 2033 als Default.
   - Fehlende Monate leer lassen, nicht als 0 werten.

6. Statussprache
   - Keine Rueckkehr zu `Handlungsbedarf`.
   - Sichtbar `Stabil`, `Beobachten`, `Auffaellig`, oder konkrete Trend-/Abweichungsformulierung.

7. Personal-/Behandlerkosten
   - `MVZ` und `Unbekannt` in Personalkosten-/Behandlerkostenansichten nicht anzeigen und nicht mitzaehlen.
   - Inaktive Mitarbeiter mit Austrittsdatum/Hinweis ausweisen, wenn sie historisch relevant sind.

8. Datenschutz
   - Praxismanagement-Rolle darf keine Gehalts-/AG-Kosten sehen.
   - Personalproduktivitaet nutzt aggregierte BWA-Personalkosten und FTE, keine offengelegten Gehaltsdetails.

9. Nutzeranlage
   - Ziel bleibt Login-Name + Erstpasswort, nicht E-Mail-Einladungslink.
   - Supabase Service Role muss in Vercel gesetzt sein.

## 27. Fachliche Grundsaetze fuer zukuenftige Arbeit

- Keine Werte manuell hart setzen, wenn sie im Import vorhanden sind.
- Statische Werte nur fuer Dinge, die nicht importiert werden und sich selten aendern:
  - Kaufpreise
  - Behandlungszimmer
  - Praxisoeffnungszeiten
  - ggf. spezielle Darlehenskorrekturen wie Kirchberg +100.000 EUR Verkäuferdarlehen
- Alle Auswertungen muessen Zeitraumlogik sauber abbilden:
  - Standortstart
  - Vertragsstart
  - YTD bis neuestem vorhandenen Monat
  - historische Jahre
  - keine Future-Leerjahre wie 2033 als Default
- Vorjahres-/Vergleichslogik:
  - Niemals einen Vergleichsmonat verwenden, der vor dem Vertragsstart des jeweiligen Standorts liegt.
  - Wenn der Vorjahresmonat vor Vertragsstart liegt, keinen `ggü. Vorjahr`-Befund erzeugen und den Wert nicht als 0 interpretieren.
  - Unterjaehrige Vertragsstarts muessen anteilig/periodengerecht bewertet werden.
  - Besonders im Fruehwarnsystem duerfen Kosten-, Personal-, Patienten- und Terminausfallwarnungen nur Vorjahresvergleiche zeigen, wenn der Vergleichsmonat innerhalb der Vertragsperiode liegt.
- Kein Plan/Ist-Vergleich, weil es keine klassischen Planwerte gibt.
- Ziel-EBITDA gemaess Kaufvertrag und Ziel-EBITDA gemaess Uebernahme sind importierte Zielwerte, aber keine klassischen Planwerte.
- EBITDA ist Kennzahl, keine Kostenposition.
- Honorarumsatz gehoert nicht in BWA.
- BWA, PVS, Behandlerumsatz, Bank-Cashflow und Personal sind fachlich unterschiedliche Datenwelten und muessen klar beschriftet bleiben.
- Standortlisten, Standortfilter, Standorttabellen und Standortkarten sollen grundsaetzlich nach Vertragsstart sortiert sein.
  - Ausnahmen sind echte Rankings, z. B. Top-/Flop-Listen oder Score-Sortierungen; dort bleibt die fachliche Ranking-Reihenfolge massgeblich.
- Statussignale sind Steuerungsindikatoren, keine Werturteile:
  - Sichtbar weich und konkret formulieren.
  - `Handlungsbedarf` vermeiden.
  - Wenn moeglich Abweichungsrichtung nennen: `erhoeht ggü. Vorjahr`, `unter Soll`, `ueber Vergleich`, `unter Vergleich`.

## 28. Aktueller Arbeitsstand 24.06.2026

Zuletzt umgesetzte / festgelegte Punkte:

- Git-/Deploy-Regel:
  - Aenderungen sollen nach erfolgreichem Build committed und auf `main` gepusht werden.
  - Vercel deployed dann automatisch.
  - `tsconfig.tsbuildinfo` ist lokale Build-Datei und soll nicht committed werden.
- Build:
  - `pnpm exec next build` laeuft durch.
  - Es gibt bekannte bestehende Warnungen zu ungenutzten Variablen und `<img>`, aber keine Build-Fehler.
  - Der alte Next-Lint-Befehl ist nicht mehr zeitgemaess; perspektivisch ESLint-CLI modernisieren.
- CFO-Upload:
  - CFO-Upload enthaelt eigenen Datenqualitaets-/Plausibilitaetsbereich.
  - Personal-Upload enthaelt eigenen Datenqualitaets-/Plausibilitaetsbereich.
  - Nach Bestaetigung eines CFO- oder Personalimports soll ein klares Popup/Feedback erscheinen, damit sichtbar ist, dass der Importbericht eingelesen/bestaetigt wurde.
  - Importlogik-Aenderungen wirken erst nach erneutem Import auf persistierte Importdaten.
- PVS / Ulmet:
  - Ulmet-Mai darf in Orisus Performance nicht leer bleiben, wenn PVS-Werte in `Export_Ulmet` vorhanden sind.
  - Fallback fuer fehlende direkte PVS-Gesamtzeile: `IST Cash geflossen PVS + Noch nicht geflossen`.
  - Bei Ulmet gibt es je Behandler keine separat erfassten Eigenlaborumsaetze; dort nur Honorarumsatz je Behandler verwenden.
- Kirchberg Behandlerumsaetze:
  - Doppelte Behandlerbezeichnungen duerfen nicht blind addiert werden.
  - Es muss zwischen Alias derselben Person und echten Zusatzumsatzzeilen unterschieden werden.
  - Honorar- und Eigenlaborumsaetze muessen aus den korrekten Export-/Importtabs hergeleitet werden.
- Mobile Verhalten:
  - Header/Menue soll auf Mobile gut erreichbar bleiben.
  - Mobile Sidebar muss ueber die abgedunkelte Flaeche ausserhalb des Menues geschlossen werden koennen.
  - iPad-/Tablet-Ansicht darf nicht horizontal ueberlaufen oder durch Menueleisten verdeckt werden.
  - App-Hintergrund darf beim Scrollen keine weissen Flaechen freilegen.
- Admin / KPI-Regeln:
  - Eingabefelder in dunklen Tabellen/Kacheln muessen helle, gut lesbare Schrift haben.
  - Das betrifft besonders Oeffnungszeiten/KPI-Regelwerte auf Mobile mit Tastatur.
  - Status-Schwellenwerte steuern Cockpit, Standortdetails, Bankenreporting und Board-Pack.
  - Zentrales Vergleichsregelwerk sichtbar halten:
    - Vertragsstart beachten.
    - gleiche Datenwelt vergleichen.
    - Peer-Vergleich sichtbar als `Orisus-Durchschnitt`.
    - `Gesamte Periode` je Standort seit Vertragsstart.
    - Vorjahre nur innerhalb der Vertragsperiode.
    - fehlende Werte nicht als 0 behandeln.
- Rollen-/Sicherheitspruefung:
  - Admin-Bereich enthaelt einen kompakten Rollen- und Sicherheitscheck.
  - Admin-API prueft aktive Admin-Rolle serverseitig, nutzt Service Role nur serverseitig und hat Same-Origin-/Rate-Limit-Schutz.
  - Praxismanagement bekommt nur Personalbereiche und keine CFO-/Finanzimportdaten in den App-State.
  - Menuebereich `Christian Henrici` steht als letzter Hauptbereich unter Administration und ist nur fuer Rollen `Admin` und `Info` vorgesehen; Praxismanagement darf diesen Bereich nicht sehen.
  - Untertab `Allgemeine Informationen` zeigt je Standort Vertragsstart, statisches Abrufdarlehen, Ziel-EBITDA Kaufvertrag p.a., Kaufpreis inkl. Earn-Out-Potenzial, direkt bezahlten Upfront-Kaufpreis, aufgenommenes Fremdkapital, bereits getilgte Betraege, Tilgung und Restschuld.
  - KPI-Kacheln im Untertab `Allgemeine Informationen` haben Info-Buttons mit Herleitung und Datenquelle.
  - Oben im Untertab `Allgemeine Informationen` stehen zwei zeitraumfilterbare KPI-Kacheln: `Gesamtumsatz gem. BWA` und `Kumuliertes EBITDA`. Standardauswahl ist `Geschaeftsjahr 2026`, wenn im Import vorhanden. Beide Werte werden aus den BWA-Zeilen `summe_umsatz` bzw. `ebitda` je Standort im gewaehlten Zeitraum innerhalb der jeweiligen Vertragsperiode summiert; Info-Buttons zeigen die Standort-Herleitung.
  - Die Kachel `Kumuliertes EBITDA` zeigt zusaetzlich direkt neben/unter dem Ist-EBITDA das periodengleiche `Ziel-EBITDA Uebernahme` aus der BWA-Zielzeile sowie die Abweichung Ist minus Ziel.
  - Zusaetzliche Jahresentwicklung im Untertab `Allgemeine Informationen` mit Jahresfilter fuer ganze Jahre: je Standort/Jahr EBITDA im Jahr, Ziel-EBITDA Kaufvertrag anteilig fuer aktive BWA-Monate ab Vertragsstart, Tilgung im Jahr, kumulierte Tilgung bis Jahresende und rechnerische Restschuld zum Jahresende. Restschuld Jahresende = aufgenommenes Fremdkapital minus kumulierte Tilgung bis Jahresende; Jahre ohne EBITDA-/Tilgungsdaten werden nicht kuenstlich als Nullzeile angezeigt.
  - Kassel startet erst am 01.07.2026 und ist bis dahin als `Noch nicht gestartet` zu behandeln: keine EBITDA-/Tilgungsentwicklung vor Vertragsstart, keine kuenstlichen Null-Jahreswerte, getilgt 0 EUR bis echte Tilgungsdaten vorliegen.
  - Abrufdarlehen Christian Henrici sind statisch im Code hinterlegt, nicht importiert: Kirchberg 125.000 EUR, Essen 80.000 EUR, Kehl 150.000 EUR, Ulmet 230.000 EUR, Huettenberg 100.000 EUR, Kassel 100.000 EUR; Gesamt 785.000 EUR.
  - Supabase-RLS/Policies bleiben als separate Datenbank-Pruefung relevant und duerfen nicht durch reine UI-Sichtbarkeit ersetzt werden.
- Statusueberarbeitung:
  - Sichtbare Statuslabels: `Stabil`, `Beobachten`, `Auffaellig`.
  - `Handlungsbedarf` wurde aus sichtbaren App-/Reporttexten entfernt.
  - Frueheres farbliches Center wurde zu `Status-Center`.
  - `Kritische Standorte` wurde sichtbar zu `Fokus-Standorte`.
  - PMR-/Benchmarking-Reports sprechen von `Status` bzw. `Statusfarben`.
- Cashflow:
  - Tab Cashflow enthaelt einen Abweichungsmonitor Bank vs. BWA.
  - Vergleich immer je Standort ueber gesamte Vertragsperiode.
  - Einnahmenseite: Bank-Praxisumsatz gegen BWA-Umsatz.
  - Primaere Bank-Umsatzbasis: `davon Praxisumsatz` bzw. `IST Geldeingang Bank`; `Geldeingang Bank gesamt` nur als Fallback fuer Altimporte.
  - Kostenseite: Praxisausgaben Bank gegen operative BWA-Kosten plus Investitionen.
  - Tilgung, Zins und Intercompany werden bewusst nicht einbezogen.
  - Fixe interne Bereinigung:
    - Ulmet: 100.000 EUR von Bank-Praxisumsatz/Bankeingaengen abziehen.
    - Kirchberg: 100.000 EUR aus Praxisausgaben herausrechnen.
- Bankenreporting:
  - Tab soll aus Bank-/Kreditgeberperspektive aufgebaut sein, analytischer als reine Datenablage.
  - KPI-Kacheln muessen im normalen App-Kachelstil bleiben, nicht als grosse flache Tabellenzellen.
  - Kacheln ohne eigenen Zeitraumfilter beziehen sich auf gesamte Vertragsperiode seit Standortstart.
  - Jede KPI-Kachel muss den betrachteten Zeitraum klar sichtbar ausweisen.
  - In Diagrammen `Gesamtleistung und EBITDA-Entwicklung` soll zusaetzlich `Soll-EBITDA gemaess Kaufvertrag` visualisiert werden.
  - Bankgeldbewegungen: Monate ohne Werte leer lassen, nicht mit 0 fuellen.
- Orisus Performance:
  - KPI-Kacheln oben im einheitlichen Kachelstil mit Info-Buttons/Herleitungen.
  - Diagramm `Operative Entwicklung` hat Zeitraumfilter.
  - Zusaetzliche Soll-EBITDA-Linie gemaess Uebernahme.
  - Bankbewegungen unten reagieren auf Zeitraumwahl.
- Kennzahlen / Entwicklung:
  - Mittlere Standort-Performance-Tabelle hat Zeitraumwahl.
  - VJ-/QTD-/Monat-VJ-Vergleiche werden je Standort nur aus Monaten innerhalb der Vertragsperiode gebildet; Vergleichswerte vor Vertragsstart bleiben leer.
  - Unter der monatlichen EBITDA-Uebersicht gibt es eine kompakte `EBITDA-Abweichungsanalyse nach Ursache`.
  - Diese Analyse ueberlagert keine Charts, sondern zeigt je Standort in einer Tabelle die EBITDA-Abweichung zum Ziel-EBITDA und den wichtigsten Treiber.
  - Ursachenlogik: Kostenquote des Standorts minus `Orisus-Durchschnitt` mal Gesamtleistung des Standorts. Datenbasis sind BWA-Umsatz, EBITDA, Ziel-EBITDA, Material, Fremdlabor, Personal und Sachkosten.
  - Ergaenzt ist eine Treiber-Matrix je Kostenblock: Material, Fremdlabor, Personal, Sachkosten, Restkosten und Netto-Kosteneffekt. Positive Werte belasten EBITDA, negative Werte entlasten.
  - Die `!`-Erklaerung nutzt das zentrale Vergleichsregelwerk.
- Standortdetails:
  - KPI-Kacheln sollen Info-Buttons mit Herleitung und Datenquelle haben.
  - Diagramm `Entwicklung ueber Zeit` hat Zeitraumfilter und erklaert BWA-Gesamtleistung, BWA-EBITDA und Cashflow gem. BWA.
  - BWA-Vorjahresspalten beruecksichtigen den Vertragsstart; Monate vor Vertragsstart werden nicht als Vorjahr/0 gewertet.
  - Personalkostentabelle blendet `MVZ` und `Unbekannt` aus.
  - Inaktive Mitarbeiter sollen mit Hinweis/Austrittsdatum sichtbar sein.
- Offene Forderungen:
  - Primaere Quelle ist der Management-Block in `Dashboard_Management`: Spalte `Offene Forderungen seit Start` plus direkte Wertspalte daneben.
  - Diese Werte werden beim CFO-Import als `receivablesBySite` gespeichert und beim Laden wieder auf die Standort-Kacheln angewendet.
  - Dadurch haben Dashboard, Orisus Board, Standortdetails, Boardpack und Reports denselben Forderungsbestand.
  - Neue Referenz aus Importdatei vom 25.06.2026: Essen `Dashboard_Management!EB39` = 99.818,6158 EUR, gerundet 99.819 EUR.
  - Wenn diese Logik angepasst wird, muss nach Deploy ein CFO-Reimport erfolgen, weil alte bestaetigte Payloads bereits berechnete Standortwerte enthalten koennen.
- Performance & Benchmarking:
  - Fruehwarnsystem als eigenes Tab.
  - `Maßnahmen` als eigenes Tab: automatische Arbeitsliste aus Auffaelligkeiten des Fruehwarnsystems. Status-Vorschlaege sind aus der Ampel abgeleitet, keine separate manuelle Schattenliste.
  - `Standort-Ranking` als eigenes Tab: Score 0-100 aus EBITDA-Marge, Kostenquote, Cashflow-Marge, Forderungen/PVS sowie monatlich normalisierten Produktivitaetswerten. Umsatz-/Produktivitaetswerte werden auf Ø Monat gerechnet; Quoten bleiben Quoten.
  - Standort-Scorecard im Benchmarking-Bereich.
  - Personalproduktivitaet als eigenes Tab.
  - Personalproduktivitaet vergleicht je Standort Gesamtleistung, PVS, EBITDA und BWA-Personalkosten je FTE/Zahnarzt-FTE.
  - Keine Gehaltsdetails in Personalproduktivitaet; nur aggregierte BWA-Personalkosten und FTE.
- Investor Boardpack:
  - `Akquisition und Integration seit Vertragsstart` bleibt.
  - Board-KPI-Entwicklung/Spike-Diagramm bleibt und braucht Zeitraumfilter.
  - Standortvergleich CFO-Kennzahlen seit Vertragsstart wurde als entbehrlich markiert.
  - Stattdessen tiefere Executive-/Investor-Analyse mit Standort- und Gruppenblick, Ableitungen und Gegenmassnahmen.
- PMR Standortleiter-Report:
  - Nur Standortleiter-PMR ist aktuell in Reports sichtbar.
  - Monatsreport, YTD-/Management-Report, Bankenreport und Standortreport sind in der Reportauswahl vorerst ausgeblendet.
  - PMR-Export soll im Querformat insgesamt zwei Seiten haben:
    - Seite 1: PMR Standortleiter-Report
    - Seite 2: Benchmarking-Auszug fuer denselben Standort
  - Beide Seiten muessen auf je eine Seite passen, ohne Ueberlauf, riesige Kacheln oder grosse Leerflaechen.
  - BWA im PMR bleibt detailliert bis zum vereinbarten EBITDA-/Abweichungsblock.
  - Auszahlungslogik im PMR:
    - `indikativ Earn-Out aktuell`
    - `indikativ Wachstumszahlung`
    - `indikativ gesamt erwartet`
  - Sonderfall Ulmet: Earn-Out-/Wachstumszahlung nur zeigen, wenn tatsaechlich etwas verdient ist.
  - Top-10-Krankheitstage sollen im PMR zur Nutzung freier Flaechen aufgenommen werden.
  - Personalkosten je Behandler im PMR immer seit Vertragsbeginn / gesamte Vertragsperiode.
  - `MVZ` und `Unbekannt` im PMR nicht anzeigen und nicht mitzaehlen.
  - Monatliche Entwicklung: noch nicht vorliegende Monate leer lassen, nicht 0.
  - Vorjahres-/Delta-Spalten in PMR-BWA, Quoten und Behandler-Umsatzboard nur fuellen, wenn der Vergleichszeitraum innerhalb der Vertragsperiode liegt.
  - Speichername automatisch nach Muster `PMR Report <Standort> <Zeitraum>`.
- Benchmarking im PMR:
  - Ausgewaehlter Standort darf im Klartext stehen.
  - Vergleichsstandorte anonymisieren als Peer-Auszug.
  - Ø-Orisus-/Vergleichswerte im PMR-Benchmarking muessen den ausgewaehlten Standort ausschliessen.
  - Seite 2 beginnt mit `Standort vs. Orisus-Durchschnitt` und zeigt Kernkennzahlen mit Standortwert, Orisus-Durchschnitt, Abweichung und Einordnung; keine Quellen-Spalte im Report.
  - Keine alte Index-/Ranking-Ueberladung; Details als kompakte Kosten-, Patienten-/Termin- und Produktivitaets-/Ergebnis-Tabellen.
  - Nicht offenlegen, wie viele Standorte die Gruppe insgesamt hat.
  - Seite 2 muss komprimiert und druckfaehig sein.
- Vergleichsregelwerk:
  - Die App fuehrt eine zentrale Regeldefinition fuer `Wer darf verglichen werden?`.
  - Sichtbar dezent im Admin-Bereich und erklaerbar per `!` in Auswertungen.
  - Fachliche Regeln: Vertragsstart, Datenwelt, Peer ohne Zielstandort, gesamte Vertragsperiode je Standort, Vorjahr nur innerhalb Vertragsperiode, fehlende Werte nicht als 0.
- Uploads:
  - CFO-Upload und Personal-Upload enthalten ein Datenqualitaets-Cockpit je Standort.
  - CFO-Datenqualitaet zeigt letzten Stand fuer BWA, Bank, PVS-Umsatz und Patienten/Termine.
  - Personal-Datenqualitaet zeigt Mitarbeiterstamm, aktive/inaktive Mitarbeiter und Massnahmen je Standort.
  - Wenn ein neuer Import geladen, aber noch nicht bestaetigt ist, zeigt ein Aenderungsprotokoll die wesentlichen Unterschiede gegenueber dem letzten bestaetigten Stand.
  - CFO-Aenderungsprotokoll: neue BWA-Monate, wesentliche Umsatz-/EBITDA-Deltas, Importwarnungen und Fehler.
  - Personal-Aenderungsprotokoll: Veraenderung Mitarbeiterbestand, aktive Mitarbeiter, Massnahmen, Importwarnungen und Fehler.
- Mobile/Tabellen:
  - Neue breite Auswertungstabellen erhalten horizontales Scrollen, feste Kopfzeilen innerhalb der Tabelle und Mindestbreiten, damit Spalten auf Smartphone nicht ineinander laufen.
  - Lange Detail-/Prueftabellen sollen optisch ruhig und mit Scroll-/Sticky-Hilfen lesbar bleiben, da sie standardmaessig sichtbar sind.

Aktuell besonders sensible Pruefpunkte:

- Nach jedem CFO-Import kontrollieren, ob Ulmet PVS Mai und Behandlerumsaetze korrekt eingelesen werden.
- Nach Kirchberg-Deduplizierung kontrollieren, dass keine Umsaetze doppelt addiert wurden.
- PMR-PDF immer mit echter Druck-/PDF-Vorschau pruefen, nicht nur in der App-Ansicht.
- Bei Layoutkorrekturen keine Werte-/Importlogik veraendern.

## 29. Empfohlener Start fuer einen neuen Chat

Wenn ein neuer Codex-Chat gestartet wird, diesen Text verwenden:

> Wir arbeiten an der Orisus Steuerungsboard App im Repo `/Users/svendneumann/Documents/Orisus CFO App`. Bitte lies zuerst `ORISUS_CONTEXT.md`, dann pruefe `src/app/page.tsx`, `src/app/api/access-users/route.ts` und `src/app/globals.css`. Die App ist live ueber Vercel und nutzt Supabase. Bitte keine Datenlogik aendern, ohne vorher die bestehende Importlogik und fachliche Definitionen in `ORISUS_CONTEXT.md` zu beachten.
