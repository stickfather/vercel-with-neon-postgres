import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  return <>{children}</>;
}
