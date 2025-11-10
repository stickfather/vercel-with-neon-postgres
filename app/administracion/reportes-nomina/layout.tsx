import type { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
};

export default function ReportesNominaLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
