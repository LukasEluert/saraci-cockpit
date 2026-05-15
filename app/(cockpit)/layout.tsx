import { DeskChrome } from "@/components/DeskChrome";

export default function DeskLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DeskChrome>
      <div className="flex h-dvh w-full min-w-0 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </div>
    </DeskChrome>
  );
}
