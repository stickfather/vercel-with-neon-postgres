import Link from "next/link";

const tabs = [
  { slug: "overview", label: "Resumen general" },
  { slug: "progress", label: "Progreso & aprendizaje" },
  { slug: "engagement", label: "Compromiso & comportamiento" },
  { slug: "risk", label: "Riesgo & retención" },
  { slug: "ops", label: "Operaciones & personal" },
  { slug: "exams", label: "Exámenes & preparación" },
] as const;

type TabSlug = (typeof tabs)[number]["slug"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type TabsProps = {
  activeTab: TabSlug;
};

export function isValidTabSlug(value: string | undefined | null): value is TabSlug {
  if (!value) return false;
  return tabs.some((tab) => tab.slug === value);
}

export function getTabs() {
  return tabs;
}

export default function Tabs({ activeTab }: TabsProps) {
  return (
    <nav className="overflow-x-auto">
      <ul className="flex min-w-full gap-2 border-b border-brand-ink/10 pb-1">
        {tabs.map((tab) => {
          const isActive = tab.slug === activeTab;
          return (
            <li key={tab.slug}>
              <Link
                href={`/panel-gerencial/${tab.slug}`}
                className={cx(
                  "inline-flex min-w-[180px] items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition",
                  isActive
                    ? "bg-brand-deep text-white shadow"
                    : "bg-white text-brand-deep shadow-sm hover:-translate-y-[1px]",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export type { TabSlug };
