import type { Metadata } from "next";
import "./globals.css";

import { OfflineBanner } from "@/components/offline/offline-banner";
import { OfflineProvider } from "@/components/offline/offline-provider";

export const metadata: Metadata = {
  title: "Inglés Rápido · Manta",
  description:
    "Bienvenida y registro de estudiantes para las clases de Inglés Rápido en Manta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-app text-app-ink antialiased">
        <OfflineProvider>
          <OfflineBanner />
          {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
