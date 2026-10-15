import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { Suspense } from "react";
import { FormPersistence } from "@/components/form-persistence";
import "./globals.css";

// Public Sans: tipografía diseñada para sitios de gobierno, clara en pantallas de oficina.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Para los códigos de expediente y oficio.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "DAI · Trazabilidad Documental",
  description: "Sistema de trazabilidad documental y BI — Dirección de Auditoría Interna, MINFIN",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Suspense fallback={null}>
          <FormPersistence />
        </Suspense>
      </body>
    </html>
  );
}
