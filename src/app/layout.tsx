import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Sans geométrica para títulos (h1/h2/h3, sección "@layer base" de globals.css) — es la familia
// que más se acerca al wordmark real de MINFIN ("Ministerio de Finanzas Públicas"), que es sans,
// no serif. El resto de la interfaz (tablas, formularios, datos) se queda en Geist Sans.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DAI · Trazabilidad Documental",
  description: "Sistema de trazabilidad documental y BI — Dirección de Auditoría Interna, MINFIN",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
