import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "HairdresserCalendar — terminarz salonu", description: "Prywatny terminarz wizyt salonu fryzjerskiego.", icons: { icon: "/favicon.svg" } };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <html lang="pl"><body>{children}</body></html>;
}
