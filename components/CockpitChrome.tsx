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

type SitesIndicator = "none" | "up" | "down";

function deriveSitesIndicator(data: unknown): SitesIndicator {
  const d = data as {
    stat?: string;
    monitors?: Array<{ status?: number }>;
  };
  if (d.stat !== "ok" || !Array.isArray(d.monitors) || d.monitors.length === 0) {
    return "none";
  }
  const statuses = d.monitors.map((m) => Number(m.status));
  if (statuses.some((s) => s === 9)) return "down";
  if (statuses.every((s) => s === 2)) return "up";
  return "none";
}

function CockpitNavLinks({
  variant,
  sitesIndicator,
}: {
  variant: "side" | "bottom";
  sitesIndicator: SitesIndicator;
}) {
  const pathname = usePathname();

  const sitesDot =
    sitesIndicator === "none" ? null : (
      <span
        className="pointer-events-none absolute -right-0.5 -top-0.5 h-[8px] w-[8px] rounded-full border border-[#0a0a0a]"
        style={{
          backgroundColor:
            sitesIndicator === "down" ? "#e63030" : "#4caf7d",
        }}
        aria-hidden
      />
    );

  if (variant === "side") {
    return (
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          const showSitesDot = label === "SITES" && sitesIndicator !== "none";
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
                {showSitesDot ? sitesDot : null}
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
        const showSitesDot = label === "SITES" && sitesIndicator !== "none";
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
              {showSitesDot ? sitesDot : null}
            </span>
            <span className="max-w-full truncate text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CockpitChrome({ children }: { children: React.ReactNode }) {
  const [sitesIndicator, setSitesIndicator] = useState<SitesIndicator>("none");

  useEffect(() => {
    let cancelled = false;
    async function loadMonitors() {
      try {
        const res = await fetch("/api/monitors", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const raw: unknown = await res.json();
        if (cancelled) return;
        setSitesIndicator(deriveSitesIndicator(raw));
      } catch {
        if (!cancelled) setSitesIndicator("none");
      }
    }
    void loadMonitors();
    const id = window.setInterval(() => void loadMonitors(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

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
          <CockpitNavLinks variant="side" sitesIndicator={sitesIndicator} />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(100px+env(safe-area-inset-bottom))] max-md:min-h-0 md:min-h-[100dvh] md:overflow-y-auto md:pb-0">
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 min-h-[64px] border-t border-[#222222] bg-[#111111]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden">
        <div className="flex h-full min-h-[64px] w-full max-w-full items-stretch">
          <CockpitNavLinks variant="bottom" sitesIndicator={sitesIndicator} />
        </div>
      </div>
    </div>
  );
}
