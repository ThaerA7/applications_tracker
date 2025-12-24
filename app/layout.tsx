import "./globals.css";
import type { Metadata } from "next";
import { Merriweather } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import AuthProvider from "@/app/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Application Tracker",
  description: "Track your applications, interviews, offers, and notes.",
};

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full overflow-x-hidden overflow-y-hidden bg-ornate text-[115%] ${merriweather.variable}`}
    >
      <body className="h-full overflow-x-hidden overflow-y-auto bg-transparent text-neutral-900 antialiased font-display">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
