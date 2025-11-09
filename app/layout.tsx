import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
