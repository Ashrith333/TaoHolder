import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "taoholder", template: "%s · taoholder" },
  description: "See what you hold. Stake or invest in subnets. Sell back. One confirm.",
};
export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1 };

// Theme is set before paint from the saved choice to avoid a flash.
const themeBoot = `try{var s=JSON.parse(localStorage.getItem("th.settings")||"{}").state||{};var t=s.theme||document.documentElement.dataset.theme||"dark";if(t==="auto")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body style={{ fontFamily: "var(--font-inter), var(--font)" }}>{children}</body>
    </html>
  );
}
