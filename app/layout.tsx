import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Saraci Desk",
  description: "Persönliche Aufgaben und Fokus — Bereiche, Deadlines, Supabase",
  manifest: "/manifest.json",
  applicationName: "Saraci Desk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Desk",
  },
  icons: {
    icon: [{ url: "/icons/pwa-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/pwa-icon.svg", type: "image/svg+xml" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh] min-h-screen bg-bg font-sans text-fg antialiased">
        {children}
      </body>
    </html>
  );
}
