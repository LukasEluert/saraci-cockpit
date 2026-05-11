import { CockpitChrome } from "@/components/CockpitChrome";

export default function CockpitLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CockpitChrome>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:overflow-visible">
        {children}
      </div>
    </CockpitChrome>
  );
}
