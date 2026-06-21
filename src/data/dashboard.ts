export type Status = "green" | "yellow" | "red";

export type Standort = {
  id: string;
  name: string;
  start: string;
  gesamtleistung: number;
  pvsUmsatz: number;
  honorar: number;
  eigenlabor: number;
  ebitda: number;
  ebitdaMarge: number;
  cashflow: number;
  cashflowDetails?: {
    vorlaeufigesErgebnis: number;
    abschreibungen: number;
    investitionsausgaben: number;
    tilgung: number;
    umbuchungZmvz: number;
    sonstigeRueckstellungenBestandsminderungen: number;
  };
  kontostand: number;
  forderungen: number;
  materialquote: number;
  fremdlaborquote: number;
  personalquote?: number;
  sonstigeKostenquote: number;
  status: Status;
  vorjahrAbweichung: number;
  darlehen: {
    kaufpreis: number;
    darlehen: number;
    restschuld: number;
    tilgung: number;
    zins: number;
    earnOutGesamt: number;
    earnOutGezahlt: number;
    earnOutFaelligAm: string;
    zielEbitda: number;
    zielEbitdaKaufvertrag?: number;
    zielEbitdaUebernahme?: number;
    istEbitda: number;
  };
};

export const standorte: Standort[] = [
  {
    id: "kirchberg",
    name: "Kirchberg",
    start: "01.07.2024",
    gesamtleistung: 1184000,
    pvsUmsatz: 1138000,
    honorar: 1014000,
    eigenlabor: 124000,
    ebitda: 213000,
    ebitdaMarge: 18.0,
    cashflow: 82000,
    kontostand: 246000,
    forderungen: 168000,
    materialquote: 8.8,
    fremdlaborquote: 13.6,
    sonstigeKostenquote: 33.1,
    status: "green",
    vorjahrAbweichung: 4.8,
    darlehen: {
      kaufpreis: 1365000,
      darlehen: 860000,
      restschuld: 704000,
      tilgung: 96000,
      zins: 36000,
      earnOutGesamt: 735000,
      earnOutGezahlt: 0,
      earnOutFaelligAm: "30.06.2029",
      zielEbitda: 205000,
      istEbitda: 213000
    }
  },
  {
    id: "essen",
    name: "Essen",
    start: "01.01.2025",
    gesamtleistung: 944000,
    pvsUmsatz: 912000,
    honorar: 844000,
    eigenlabor: 68000,
    ebitda: 96000,
    ebitdaMarge: 10.2,
    cashflow: -18000,
    kontostand: 104000,
    forderungen: 142000,
    materialquote: 10.4,
    fremdlaborquote: 15.9,
    sonstigeKostenquote: 39.2,
    status: "yellow",
    vorjahrAbweichung: -3.7,
    darlehen: {
      kaufpreis: 727200,
      darlehen: 710000,
      restschuld: 642000,
      tilgung: 62000,
      zins: 31000,
      earnOutGesamt: 391600,
      earnOutGezahlt: 0,
      earnOutFaelligAm: "31.12.2029",
      zielEbitda: 124000,
      istEbitda: 96000
    }
  },
  {
    id: "kehl",
    name: "Kehl",
    start: "01.04.2025",
    gesamtleistung: 752000,
    pvsUmsatz: 724000,
    honorar: 657000,
    eigenlabor: 67000,
    ebitda: 79000,
    ebitdaMarge: 10.5,
    cashflow: 21000,
    kontostand: 132000,
    forderungen: 121000,
    materialquote: 11.6,
    fremdlaborquote: 18.4,
    sonstigeKostenquote: 41.7,
    status: "yellow",
    vorjahrAbweichung: -1.8,
    darlehen: {
      kaufpreis: 601250,
      darlehen: 610000,
      restschuld: 574000,
      tilgung: 44000,
      zins: 27000,
      earnOutGesamt: 323750,
      earnOutGezahlt: 0,
      earnOutFaelligAm: "30.03.2029",
      zielEbitda: 92000,
      istEbitda: 79000
    }
  },
  {
    id: "ulmet",
    name: "Ulmet",
    start: "01.07.2025",
    gesamtleistung: 684000,
    pvsUmsatz: 662000,
    honorar: 578000,
    eigenlabor: 84000,
    ebitda: 129000,
    ebitdaMarge: 18.9,
    cashflow: 54000,
    kontostand: 188000,
    forderungen: 76000,
    materialquote: 7.9,
    fremdlaborquote: 12.7,
    sonstigeKostenquote: 31.8,
    status: "green",
    vorjahrAbweichung: 7.6,
    darlehen: {
      kaufpreis: 1852500,
      darlehen: 520000,
      restschuld: 493000,
      tilgung: 31000,
      zins: 23000,
      earnOutGesamt: 997500,
      earnOutGezahlt: 0,
      earnOutFaelligAm: "31.12.2030",
      zielEbitda: 108000,
      istEbitda: 129000
    }
  },
  {
    id: "huettenberg",
    name: "Hüttenberg",
    start: "01.01.2026",
    gesamtleistung: 428000,
    pvsUmsatz: 411000,
    honorar: 374000,
    eigenlabor: 37000,
    ebitda: 36000,
    ebitdaMarge: 8.4,
    cashflow: 12000,
    kontostand: 94000,
    forderungen: 69000,
    materialquote: 12.1,
    fremdlaborquote: 17.6,
    sonstigeKostenquote: 44.2,
    status: "red",
    vorjahrAbweichung: -8.4,
    darlehen: {
      kaufpreis: 552500,
      darlehen: 500000,
      restschuld: 486000,
      tilgung: 18000,
      zins: 19000,
      earnOutGesamt: 297500,
      earnOutGezahlt: 0,
      earnOutFaelligAm: "31.12.2030",
      zielEbitda: 64000,
      istEbitda: 36000
    }
  },
  {
    id: "kassel",
    name: "Kassel",
    start: "01.07.2026",
    gesamtleistung: 0,
    pvsUmsatz: 0,
    honorar: 0,
    eigenlabor: 0,
    ebitda: 0,
    ebitdaMarge: 0,
    cashflow: 0,
    kontostand: 0,
    forderungen: 0,
    materialquote: 0,
    fremdlaborquote: 0,
    sonstigeKostenquote: 0,
    status: "yellow",
    vorjahrAbweichung: 0,
    darlehen: {
      kaufpreis: 940000,
      darlehen: 690000,
      restschuld: 690000,
      tilgung: 0,
      zins: 0,
      earnOutGesamt: 170000,
      earnOutGezahlt: 0,
      earnOutFaelligAm: "31.12.2031",
      zielEbitda: 0,
      istEbitda: 0
    }
  }
];

export const monthly = [
  { month: "Jan", leistung: 480000, ebitda: 52000, marge: 10.8, cashflow: 18000 },
  { month: "Feb", leistung: 522000, ebitda: 68000, marge: 13.0, cashflow: 24000 },
  { month: "Mrz", leistung: 558000, ebitda: 76000, marge: 13.6, cashflow: 37000 },
  { month: "Apr", leistung: 602000, ebitda: 88000, marge: 14.6, cashflow: 44000 },
  { month: "Mai", leistung: 646000, ebitda: 93000, marge: 14.4, cashflow: 38000 },
  { month: "Jun", leistung: 684000, ebitda: 101000, marge: 14.8, cashflow: 51000 }
];

export const ebitdaTakeover = [
  { name: "Kirchberg", ebitda: 213000, uebernahmeEbitda: 172000 },
  { name: "Essen", ebitda: 96000, uebernahmeEbitda: 128000 },
  { name: "Kehl", ebitda: 79000, uebernahmeEbitda: 86000 },
  { name: "Ulmet", ebitda: 129000, uebernahmeEbitda: 101000 },
  { name: "Hüttenberg", ebitda: 36000, uebernahmeEbitda: 62000 },
  { name: "Kassel", ebitda: 0, uebernahmeEbitda: 0 }
];

export const topBehandlerHonorar = [
  { name: "Behandler A", standort: "Kirchberg", honorar: 318000 },
  { name: "Behandler B", standort: "Essen", honorar: 286000 },
  { name: "Behandler C", standort: "Ulmet", honorar: 241000 },
  { name: "Behandler D", standort: "Kehl", honorar: 214000 },
  { name: "Behandler E", standort: "Hüttenberg", honorar: 166000 }
];

export const receivablesTrend = [
  { month: "Jan", kirchberg: 132000, essen: 98000, kehl: 0, ulmet: 0, huettenberg: 0 },
  { month: "Feb", kirchberg: 141000, essen: 113000, kehl: 0, ulmet: 0, huettenberg: 0 },
  { month: "Mrz", kirchberg: 152000, essen: 124000, kehl: 0, ulmet: 0, huettenberg: 0 },
  { month: "Apr", kirchberg: 158000, essen: 133000, kehl: 94000, ulmet: 0, huettenberg: 0 },
  { month: "Mai", kirchberg: 161000, essen: 137000, kehl: 108000, ulmet: 65000, huettenberg: 52000 },
  { month: "Jun", kirchberg: 168000, essen: 142000, kehl: 121000, ulmet: 76000, huettenberg: 69000 }
];

export const uploadTypes = [
  "Konsolidierte Orisus-Exportdatei",
  "BWA",
  "PVS-Umsätze",
  "Honorarumsätze",
  "Eigenlaborumsätze",
  "Offene Forderungen",
  "Cashflow",
  "Kontostände",
  "Darlehen",
  "Earn-Out"
];
