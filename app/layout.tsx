import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PST Inventory",
  description: "Power Source Trading Est. inventory system",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#12A14B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
