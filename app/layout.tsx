import type { Metadata } from "next";
import "./globals.css";
import { inter } from "./fonts";

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
    <html lang="es" className={inter.variable}>
      <body className="bg-app text-app-ink antialiased">{children}</body>
    </html>
  );
}
