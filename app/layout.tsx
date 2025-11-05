import type { Metadata } from "next";
import "./globals.css";

import { OfflineBanner } from "@/components/offline/offline-banner";
import { OfflineProvider } from "@/components/offline/offline-provider";
import { ServiceWorkerRegistration } from "@/components/offline/sw-registration";

export const metadata: Metadata = {
  title: "Inglés Rápido · Manta",
  description:
    "Bienvenida y registro de estudiantes para las clases de Inglés Rápido en Manta.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IR Manta",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#00bfa6" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-app text-app-ink antialiased">
        <OfflineProvider>
          <ServiceWorkerRegistration />
          <OfflineBanner />
          {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
