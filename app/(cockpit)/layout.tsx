import { CockpitChrome } from "@/components/CockpitChrome";

export default function CockpitLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <CockpitChrome>{children}</CockpitChrome>;
}
