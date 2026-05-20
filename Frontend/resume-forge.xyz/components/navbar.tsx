"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, needsOnboarding } from "@/lib/auth-context";
import { logout } from "@/lib/api";
import { RequireAuth } from "@/components/require-auth";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New" },
  { href: "/history", label: "History" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const isLanding = pathname === "/";

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";

  async function handleSignOut() {
    try { await logout(); } catch {}
    signOut();
    router.push("/signin");
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b"
      style={{ backgroundColor: "oklch(0.22 0.03 55)", borderBottomColor: "oklch(0.28 0.03 55)" }}
    >
      <Link href="/" className="flex items-center gap-2 no-underline">
        <span className="font-extrabold text-xl tracking-tight" style={{ color: "oklch(0.96 0.005 80)" }}>
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
                color: pathname.startsWith(link.href) ? "oklch(0.96 0.005 80)" : "oklch(0.70 0.02 65)",
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
          user ? (
            <>
              <Link href="/settings">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors duration-150 hover:opacity-80"
                  style={{ backgroundColor: "oklch(0.30 0.03 55)", color: "oklch(0.96 0.005 80)" }}
                  title={user.email}
                >
                  {initial}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="text-xs transition-colors duration-150 cursor-pointer"
                style={{ color: "oklch(0.70 0.02 65)" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/signin" className="text-xs transition-colors duration-150 cursor-pointer" style={{ color: "oklch(0.70 0.02 65)" }}>
              Sign in
            </Link>
          )
        ) : (
          <Link href="/signin" className="text-xs transition-colors duration-150 cursor-pointer" style={{ color: "oklch(0.70 0.02 65)" }}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && needsOnboarding()) {
      router.replace("/onboarding");
    }
  }, [user, loading, router]);

  return <>{children}</>;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <OnboardingGuard>
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
      </OnboardingGuard>
    </RequireAuth>
  );
}
