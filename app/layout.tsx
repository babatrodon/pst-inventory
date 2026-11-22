import type { Metadata, Viewport } from "next";
import { Inter, Nunito } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunito = Nunito({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "PST Inventory",
  description: "Power Source Trading Est. inventory system",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#12A14B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${nunito.variable}`}>{children}</body>
    </html>
  );
}
