"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New" },
  { href: "/history", label: "History" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b"
      style={{
        backgroundColor: "oklch(0.22 0.03 55)",   /* espresso brown #2C2218 */
        borderBottomColor: "oklch(0.28 0.03 55)",
      }}
    >
      <Link href="/" className="flex items-center gap-2 no-underline">
        <span
          className="font-extrabold text-xl tracking-tight"
          style={{ color: "oklch(0.96 0.005 80)" }}
        >
          Resume-Forge
        </span>
      </Link>

      {!isLanding && (
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs tracking-wide transition-colors duration-150 cursor-pointer"
              style={{
                color: pathname.startsWith(link.href)
                  ? "oklch(0.96 0.005 80)"
                  : "oklch(0.70 0.02 65)",
                fontWeight: pathname.startsWith(link.href) ? "700" : "400",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex items-center gap-3">
        {!isLanding ? (
          <>
            <Badge
              variant="outline"
              className="text-xs font-mono cursor-pointer transition-colors duration-150"
              style={{
                borderColor: "oklch(0.75 0.15 75)",
                color: "oklch(0.75 0.15 75)",
              }}
            >
              PRO · 3 credits
            </Badge>
            <Link href="/settings">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors duration-150"
                style={{
                  backgroundColor: "oklch(0.30 0.03 55)",
                  color: "oklch(0.96 0.005 80)",
                }}
              >
                A
              </span>
            </Link>
          </>
        ) : (
          <Link
            href="/signin"
            className="text-xs transition-colors duration-150 cursor-pointer"
            style={{ color: "oklch(0.70 0.02 65)" }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
    </>
  );
}
