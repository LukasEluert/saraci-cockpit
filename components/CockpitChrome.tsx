"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { SaraciLogo } from "@/components/SaraciLogo";
import {
  IconAkquise,
  IconCockpit,
  IconEinstellungen,
  IconProjekte,
  IconTv,
  IconSites,
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
  { href: "/websites", label: "SITES", Icon: IconSites },
  { href: "/einstellungen", label: "Einst.", Icon: IconEinstellungen },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CockpitNavLinks({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const [sitesState, setSitesState] = useState<"none" | "up" | "down">("none");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/monitors", { cache: "no-store" });
        if (!res.ok) return;
        const data: { summary?: { up: number; down: number; total: number } } =
          await res.json();
        if (cancelled || !data.summary || data.summary.total === 0) {
          if (!cancelled) setSitesState("none");
          return;
        }
        if (data.summary.down > 0) {
          setSitesState("down");
        } else if (data.summary.up > 0) {
          setSitesState("up");
        } else {
          setSitesState("none");
        }
      } catch {
        if (!cancelled) setSitesState("none");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (variant === "side") {
    return (
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          const showSitesDot = label === "SITES" && sitesState !== "none";
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
              <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center opacity-90">
                <Icon className="h-5 w-5" />
                {showSitesDot ? (
                  <span
                    className={[
                      "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-black/60",
                      sitesState === "down" ? "bg-[#e63030]" : "bg-[#22c55e]",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex w-full max-w-full items-stretch justify-evenly gap-0 px-1">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        const showSitesDot = label === "SITES" && sitesState !== "none";
        return (
          <Link
            key={href}
            href={href}
            className={[
              "tap-scale flex min-h-[44px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 font-mono text-[10px] uppercase leading-none tracking-wide transition-colors duration-150 sm:text-[11px]",
              active ? "text-[#e63030]" : "text-[#666666]",
            ].join(" ")}
          >
            <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center">
              <Icon className="h-5 w-5" aria-hidden />
              {showSitesDot ? (
                <span
                  className={[
                    "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-black/60",
                    sitesState === "down" ? "bg-[#e63030]" : "bg-[#22c55e]",
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
            </span>
            <span className="max-w-full truncate text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CockpitChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden bg-[#0a0a0a] md:h-auto md:max-h-none md:min-h-[100dvh] md:flex-row md:overflow-y-auto">
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(100px+env(safe-area-inset-bottom))] max-md:min-h-0 md:min-h-[100dvh] md:overflow-y-auto md:pb-0">
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 min-h-[64px] border-t border-[#222222] bg-[#111111]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden">
        <div className="flex h-full min-h-[64px] w-full max-w-full items-stretch">
          <CockpitNavLinks variant="bottom" />
        </div>
      </div>
    </div>
  );
}
