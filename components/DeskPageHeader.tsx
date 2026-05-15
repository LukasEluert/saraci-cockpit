"use client";

import { DataExportButtons } from "@/components/DataExportButtons";
import { LogoutButton } from "@/components/LogoutButton";
import { SaraciLogo } from "@/components/SaraciLogo";
import type { DeskSyncState } from "@/hooks/useDeskTasks";

function SyncDot({ status }: { status: DeskSyncState }) {
  const color =
    status === "ok"
      ? "bg-green"
      : status === "syncing"
        ? "bg-amber"
        : "bg-accent";
  const label =
    status === "ok"
      ? "Verbunden"
      : status === "syncing"
        ? "Sync …"
        : "Fehler";

  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <span
        className={[
          "inline-block h-[5px] w-[5px] shrink-0 rounded-full",
          color,
          status === "syncing" ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

type Props = {
  sync: DeskSyncState;
  datumMobile: string;
  busy: boolean;
  /** „…“-Menü mit Export / KI-Import */
  showExportMenu?: boolean;
  onKiImport?: () => void;
};

export function DeskPageHeader({
  sync,
  datumMobile,
  busy,
  showExportMenu = false,
  onKiImport,
}: Props) {
  return (
    <header className="shrink-0 bg-bg">
      <div className="border-b border-border-subtle pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex h-12 max-w-full items-center gap-2 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          <SaraciLogo
            height={26}
            priority
            className="max-h-[26px] shrink-0 object-contain"
          />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <SyncDot status={sync} />
            <time
              dateTime={new Date().toISOString()}
              className="whitespace-nowrap font-mono text-xs tabular-nums text-fg-subtle"
            >
              {datumMobile}
            </time>
            {showExportMenu ? (
              <DataExportButtons
                variant="menu"
                disabled={busy}
                onKiImport={onKiImport}
              />
            ) : null}
            <LogoutButton variant="compact" />
          </div>
        </div>
      </div>

      <div className="hidden h-12 max-w-full items-center border-b border-border-subtle px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:flex">
        <SaraciLogo
          height={26}
          priority
          className="max-h-[26px] shrink-0 object-contain"
        />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <SyncDot status={sync} />
          <time
            dateTime={new Date().toISOString()}
            className="whitespace-nowrap font-mono text-xs tabular-nums text-fg-subtle"
          >
            {datumMobile}
          </time>
          {showExportMenu ? (
            <DataExportButtons
              variant="menu"
              disabled={busy}
              onKiImport={onKiImport}
            />
          ) : null}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
