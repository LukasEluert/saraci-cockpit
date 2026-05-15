"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { SaraciLogo } from "@/components/SaraciLogo";
import {
  IconAufgaben,
  IconBriefing,
  IconEinstellungen,
  IconHeute,
  IconImportExport,
  IconReview,
  IconTv,
  IconWoche,
} from "@/components/NavIcons";

type NavItem = {
  href: string;
  label: string;
  mobileShort?: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV_DESK: readonly NavItem[] = [
  { href: "/", label: "Heute", Icon: IconHeute },
  { href: "/aufgaben", label: "Aufgaben", Icon: IconAufgaben },
  { href: "/woche", label: "Woche", Icon: IconWoche },
  { href: "/briefing", label: "Briefing", Icon: IconBriefing },
  {
    href: "/review",
    label: "Review",
    mobileShort: "Review",
    Icon: IconReview,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileShort: "Board",
    Icon: IconTv,
  },
  {
    href: "/import-export",
    label: "Import / Export",
    mobileShort: "Import",
    Icon: IconImportExport,
  },
  {
    href: "/einstellungen",
    label: "Einstellungen",
    mobileShort: "Einst.",
    Icon: IconEinstellungen,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DeskNavLinks({
  variant,
  items,
}: {
  variant: "side" | "bottom";
  items: NavItem[];
}) {
  const pathname = usePathname();

  if (variant === "side") {
    return (
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
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
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex min-h-[56px] w-full flex-nowrap items-stretch gap-0 overflow-x-auto overflow-y-hidden px-1 [-webkit-overflow-scrolling:touch]">
      {items.map(({ href, label, mobileShort, Icon }) => {
        const active = isActive(pathname, href);
        const shown = mobileShort ?? label;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={[
              "tap-scale flex min-w-[3.35rem] shrink-0 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-[color] duration-150 ease-out",
              active ? "text-accent" : "text-fg-subtle",
            ].join(" ")}
          >
            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="max-w-[4rem] truncate text-center font-sans text-[9px] font-medium leading-tight tracking-wide">
              {shown}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DeskChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden bg-bg md:h-auto md:max-h-none md:min-h-[100dvh] md:flex-row md:overflow-y-auto">
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border-subtle bg-bg-elevated md:flex">
        <div className="border-b border-border-subtle px-4 pb-4 pt-8">
          <SaraciLogo height={28} priority className="max-w-[9rem]" />
        </div>
        <div className="px-1.5 py-2">
          <DeskNavLinks variant="side" items={[...NAV_DESK]} />
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
        <DeskNavLinks variant="bottom" items={[...NAV_DESK]} />
      </div>
    </div>
  );
}
