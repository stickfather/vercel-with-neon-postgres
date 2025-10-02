import type { ReactNode } from "react";
import Image from "next/image";
import logo from "@/assets/logo.svg";
import logoDark from "@/assets/logo-dark.svg";
import Link from "next/link";
import arrow from "@/assets/arrow.svg";
import discord from "@/assets/discord.svg";
import docs from "@/assets/docs.svg";
import { fetchStudents, type Student } from "./db";

export default async function Home() {
  let students: Student[] = [];
  let statusMessage = "Database connected";

  try {
    students = await fetchStudents();
  } catch (error) {
    console.error("Error loading students:", error);
    statusMessage =
      error instanceof Error ? error.message : "Database not connected";
  }

  const isConnected = statusMessage === "Database connected";
  const studentColumns: Array<{
    label: string;
    render: (student: Student) => ReactNode;
  }> = [
    {
      label: "Full name",
      render: (student) => student.full_name,
    },
    {
      label: "Representative",
      render: (student) => student.representative_name ?? "—",
    },
    {
      label: "Phone",
      render: (student) => student.representative_phone ?? "—",
    },
    {
      label: "Status",
      render: (student) => student.status_text ?? "—",
    },
    {
      label: "Special needs",
      render: (student) =>
        student.special_needs === null
          ? "—"
          : student.special_needs
            ? "Yes"
            : "No",
    },
    {
      label: "Planned level",
      render: (student) => {
        const { planned_level_min_level_code: min, planned_level_max_level_code: max } = student;
        if (!min && !max) {
          return "—";
        }
        if (min && max && min !== max) {
          return `${min} – ${max}`;
        }
        return min ?? max ?? "—";
      },
    },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 md:max-w-lg md:px-0 lg:max-w-xl">
        <main className="flex flex-1 flex-col justify-center">
          <div className="mb-6 md:mb-7">
            <Image
              className="lg:h-7 lg:w-auto dark:hidden"
              src={logo}
              alt="Neon logo"
              width={88}
              height={24}
              priority
            />
            <Image
              className="hidden lg:h-7 lg:w-auto dark:block"
              src={logoDark}
              alt="Neon logo"
              width={88}
              height={24}
              priority
            />
          </div>
          <h1 className="text-3xl font-semibold leading-none tracking-tighter md:text-4xl md:leading-none lg:text-5xl lg:leading-none">
            Vercel with Neon Postgres
          </h1>
          <p className="mt-3.5 max-w-lg text-base leading-snug tracking-tight text-[#61646B] md:text-lg md:leading-snug lg:text-xl lg:leading-snug dark:text-[#94979E]">
            A minimal template for building full-stack React applications using
            Next.js, Vercel, and Neon.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5 md:mt-9 lg:mt-10">
            <Link
              className="rounded-full bg-[#00E599] px-5 py-2.5 font-semibold tracking-tight text-[#0C0D0D] transition-colors duration-200 hover:bg-[#00E5BF] lg:px-7 lg:py-3"
              href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneondatabase-labs%2Fvercel-marketplace-neon%2Ftree%2Fmain&project-name=my-vercel-neon-app&repository-name=my-vercel-neon-app&products=[{%22type%22:%22integration%22,%22integrationSlug%22:%22neon%22,%22productSlug%22:%22neon%22,%22protocol%22:%22storage%22}]"
              target="_blank"
            >
              Deploy to Vercel
            </Link>
            <Link
              className="group flex items-center gap-2 leading-none tracking-tight"
              href="https://github.com/neondatabase-labs/vercel-marketplace-neon"
              target="_blank"
            >
              View on GitHub
              <Image
                className="transition-transform duration-200 group-hover:translate-x-1 dark:invert"
                src={arrow}
                alt="arrow"
                width={16}
                height={10}
                priority
              />
            </Link>
          </div>
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Student roster</h2>
            <p className="mt-2 text-sm text-[#61646B] dark:text-[#94979E]">
              Data below is pulled live from the <code className="rounded bg-[#E4E5E7]/60 px-1.5 py-0.5 text-xs dark:bg-[#303236]">students</code> table in Neon.
            </p>
            <div className="mt-5 overflow-x-auto rounded-xl border border-[#E4E5E7] bg-white shadow-sm dark:border-[#303236] dark:bg-[#141517]">
              <table className="min-w-full divide-y divide-[#E4E5E7] text-left text-sm dark:divide-[#303236]">
                <thead className="bg-[#F7F8F9] text-xs font-semibold uppercase tracking-wide text-[#3B3E45] dark:bg-[#1B1C1F] dark:text-[#D4D6DB]">
                  <tr>
                    {studentColumns.map((column) => (
                      <th key={column.label} className="px-4 py-3">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E5E7] text-[#1F2124] dark:divide-[#303236] dark:text-[#E6E8EC]">
                  {students.map((student) => (
                    <tr key={student.id} className="even:bg-[#F7F8F9]/70 dark:even:bg-[#1B1C1F]">
                      {studentColumns.map((column) => (
                        <td key={column.label} className="px-4 py-3 align-top">
                          {column.render(student)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!students.length && isConnected && (
                <div className="px-4 py-6 text-sm text-[#3B3E45] dark:text-[#D4D6DB]">
                  No students found in the database.
                </div>
              )}
            </div>
            {!isConnected && (
              <p className="mt-3 text-sm text-red-500 dark:text-red-400">
                Unable to load students because: {statusMessage}
              </p>
            )}
          </section>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E5E7] py-5 sm:gap-2 sm:gap-6 md:pb-12 md:pt-10 dark:border-[#303236]">
          <ul className="flex items-center gap-4 sm:gap-6">
            {[
              {
                text: "Docs",
                href: "https://neon.tech/docs/",
                icon: docs,
              },
              {
                text: "Discord",
                href: "https://discord.com/invite/92vNTzKDGp",
                icon: discord,
              },
            ].map((link) => (
              <Link
                className="flex items-center gap-2 opacity-70 transition-opacity duration-200 hover:opacity-100"
                key={link.text}
                href={link.href}
                target="_blank"
              >
                <Image
                  className="dark:invert"
                  src={link.icon}
                  alt={link.text}
                  width={16}
                  height={16}
                  priority
                />
                <span className="text-sm tracking-tight">{link.text}</span>
              </Link>
            ))}
          </ul>
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isConnected
                ? "border-[#00E599]/20 bg-[#00E599]/10 text-[#1a8c66] dark:bg-[#00E599]/10 dark:text-[#00E599]"
                : "border-red-500/20 bg-red-500/10 text-red-500 dark:text-red-500"
            }`}
          >
            {statusMessage}
          </span>
        </footer>
      </div>
    </div>
  );
}
