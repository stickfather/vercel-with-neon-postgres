import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paneles gerenciales · Inglés Rápido Manta",
};

export default function PanelGerencialPage() {
  redirect("/panel-gerencial/overview");
}
