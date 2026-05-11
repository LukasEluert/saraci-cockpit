import { CockpitChrome } from "@/components/CockpitChrome";

export default function CockpitLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CockpitChrome>
      <div className="flex h-dvh w-full min-w-0 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </CockpitChrome>
  );
}
