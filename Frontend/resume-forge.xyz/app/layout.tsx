import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "résumé.build — tailored résumés in seconds",
  description: "One JD in. One ATS-clean PDF out. Backed by your real GitHub commits and LinkedIn history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
