"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Cockpit" },
  { href: "/woche", label: "Woche" },
  { href: "/akquise", label: "Akquise" },
  { href: "/projekte", label: "Projekte" },
  { href: "/einstellungen", label: "Einst." },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CockpitNavLinks({
  variant,
}: {
  variant: "side" | "bottom";
}) {
  const pathname = usePathname();
  const base =
    "rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-wide transition-colors";
  const active = "bg-[#1a0a0a] text-[#e63030]";
  const idle = "text-neutral-400 hover:bg-[#1a1a1a] hover:text-neutral-100";

  if (variant === "side") {
    return (
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={[base, isActive(pathname, href) ? active : idle].join(
              " "
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex max-w-full items-stretch justify-between gap-0.5 overflow-x-auto px-1">
      {NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={[
            "shrink-0 rounded-md px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wide transition-colors",
            isActive(pathname, href) ? active : idle,
          ].join(" ")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function CockpitChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-[#0a0a0a]">
      <aside className="hidden w-[12.5rem] shrink-0 flex-col border-r border-[#222222] bg-[#111111] md:flex">
        <div className="border-b border-[#222222] px-3 py-4">
          <p className="font-sans text-sm font-medium text-neutral-100">
            Saraci
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-neutral-500">
            Cockpit
          </p>
        </div>
        <div className="px-2 py-3">
          <CockpitNavLinks variant="side" />
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#222222] bg-[#111111]/95 backdrop-blur-sm md:hidden">
        <CockpitNavLinks variant="bottom" />
      </div>
    </div>
  );
}
