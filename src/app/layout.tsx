import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStateProvider } from "@/state/AppState";

export const metadata: Metadata = {
  title: "AcuityCheck — Distance Visual Acuity Self-Screening",
  description:
    "Calibrated, at-home distance visual acuity self-screening using the Tumbling E chart. Indicative LogMAR and Snellen results for each eye.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans antialiased">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
