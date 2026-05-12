"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
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
import { NAV_PREFS_EVENT, readShowAkquise, readShowProjekte } from "@/lib/navPreferences";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  slug: "cockpit" | "woche" | "akquise" | "projekte" | "dashboard" | "sites" | "einstellungen";
};

const NAV_BASE: readonly NavItem[] = [
  { href: "/", label: "Cockpit", Icon: IconCockpit, slug: "cockpit" },
  { href: "/woche", label: "Woche", Icon: IconWoche, slug: "woche" },
  { href: "/akquise", label: "Akquise", Icon: IconAkquise, slug: "akquise" },
  { href: "/projekte", label: "Projekte", Icon: IconProjekte, slug: "projekte" },
  { href: "/dashboard", label: "Dashboard", Icon: IconTv, slug: "dashboard" },
  { href: "/websites", label: "Sites", Icon: IconSites, slug: "sites" },
  { href: "/einstellungen", label: "Einst.", Icon: IconEinstellungen, slug: "einstellungen" },
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

function useNavItems(): NavItem[] {
  const [akquise, setAkquise] = useState(true);
  const [projekte, setProjekte] = useState(true);

  useEffect(() => {
    function read() {
      setAkquise(readShowAkquise());
      setProjekte(readShowProjekte());
    }
    read();
    window.addEventListener("storage", read);
    window.addEventListener(NAV_PREFS_EVENT, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(NAV_PREFS_EVENT, read);
    };
  }, []);

  return useMemo(
    () =>
      NAV_BASE.filter((item) => {
        if (item.slug === "akquise" && !akquise) return false;
        if (item.slug === "projekte" && !projekte) return false;
        return true;
      }),
    [akquise, projekte]
  );
}

function CockpitNavLinks({
  variant,
  sitesIndicator,
  items,
}: {
  variant: "side" | "bottom";
  sitesIndicator: SitesIndicator;
  items: NavItem[];
}) {
  const pathname = usePathname();

  const sitesDot =
    sitesIndicator === "none" ? null : (
      <span
        className="pointer-events-none absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-bg"
        style={{
          backgroundColor:
            sitesIndicator === "down" ? "var(--accent)" : "var(--green)",
        }}
        aria-hidden
      />
    );

  if (variant === "side") {
    return (
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          const showSitesDot = label === "Sites" && sitesIndicator !== "none";
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={[
                "tap-scale flex items-center gap-2 rounded-md px-2 py-1.5 font-sans text-[13px] font-medium tracking-tight transition-colors duration-150 ease-out",
                active ? "text-accent" : "text-fg-muted hover:text-fg",
              ].join(" ")}
            >
              <span className="relative inline-flex shrink-0 text-current">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
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
      {items.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        const showSitesDot = label === "Sites" && sitesIndicator !== "none";
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={[
              "tap-scale flex min-h-[60px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 transition-[color,opacity] duration-150 ease-out",
              active ? "text-accent" : "text-fg-subtle",
            ].join(" ")}
          >
            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
              <Icon className="h-5 w-5" aria-hidden />
              {showSitesDot ? sitesDot : null}
            </span>
            <span
              className={[
                "max-w-full truncate text-center font-sans text-[10px] font-medium tracking-wide transition-opacity duration-150 ease-out",
                active ? "opacity-100" : "sr-only",
              ].join(" ")}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CockpitChrome({ children }: { children: React.ReactNode }) {
  const [sitesIndicator, setSitesIndicator] = useState<SitesIndicator>("none");
  const navItems = useNavItems();

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
    <div className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden bg-bg md:h-auto md:max-h-none md:min-h-[100dvh] md:flex-row md:overflow-y-auto">
      <aside className="hidden w-[188px] shrink-0 flex-col border-r border-border-subtle bg-bg-elevated md:flex">
        <div className="border-b border-border-subtle px-4 pb-4 pt-8">
          <SaraciLogo height={28} priority className="max-w-[9rem]" />
        </div>
        <div className="px-1.5 py-2">
          <CockpitNavLinks variant="side" sitesIndicator={sitesIndicator} items={navItems} />
        </div>
      </aside>

      <div className="ui-tab-transition flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain max-md:min-h-0 md:min-h-[100dvh] md:overflow-y-auto">
        {children}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        style={{
          background: "rgba(8,8,8,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <div className="flex h-[60px] w-full max-w-full items-stretch">
          <CockpitNavLinks variant="bottom" sitesIndicator={sitesIndicator} items={navItems} />
        </div>
      </div>
    </div>
  );
}
