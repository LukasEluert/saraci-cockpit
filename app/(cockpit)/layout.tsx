import { CockpitChrome } from "@/components/CockpitChrome";

export default function CockpitLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CockpitChrome>
      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden md:overflow-visible">
        {children}
      </div>
    </CockpitChrome>
  );
}
