"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { SaraciLogo } from "@/components/SaraciLogo";
import {
  IconAkquise,
  IconCockpit,
  IconEinstellungen,
  IconProjekte,
  IconTv,
  IconWoche,
} from "@/components/NavIcons";

const NAV: ReadonlyArray<{
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { href: "/", label: "Cockpit", Icon: IconCockpit },
  { href: "/woche", label: "Woche", Icon: IconWoche },
  { href: "/akquise", label: "Akquise", Icon: IconAkquise },
  { href: "/projekte", label: "Projekte", Icon: IconProjekte },
  { href: "/dashboard", label: "Dashboard", Icon: IconTv },
  { href: "/einstellungen", label: "Einst.", Icon: IconEinstellungen },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CockpitNavLinks({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "side") {
    return (
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "tap-scale flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-wide transition-colors duration-150",
                active
                  ? "bg-[#1a0a0a] text-[#e63030]"
                  : "text-[#666666] hover:bg-[#1a1a1a] hover:text-neutral-100",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex max-w-full items-stretch justify-between gap-0.5 px-0.5">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "tap-scale flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1.5 font-mono text-[11px] uppercase leading-none tracking-wide transition-colors duration-150",
              active ? "text-[#e63030]" : "text-[#666666]",
            ].join(" ")}
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden />
            <span className="max-w-full truncate text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CockpitChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden overflow-y-hidden bg-[#0a0a0a] md:h-auto md:max-h-none md:min-h-screen md:overflow-y-auto">
      <aside className="hidden w-[12.5rem] shrink-0 flex-col border-r border-[#222222] bg-[#111111] md:flex">
        <div className="border-b border-[#222222] px-3 py-4">
          <SaraciLogo height={40} priority className="max-w-[9rem]" />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
            Cockpit
          </p>
        </div>
        <div className="px-2 py-3">
          <CockpitNavLinks variant="side" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] md:min-h-[100dvh] md:overflow-y-visible md:pb-0">
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 min-h-[64px] border-t border-[#222222] bg-[#111111]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden">
        <div className="flex h-full min-h-[64px] max-w-full items-center">
          <CockpitNavLinks variant="bottom" />
        </div>
      </div>
    </div>
  );
}
