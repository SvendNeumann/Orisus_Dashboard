import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Orisus CFO Dashboard", description: "Interner CFO-Dashboard-Prototyp fuer die Orisus-Gruppe" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
