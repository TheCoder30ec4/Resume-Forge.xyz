"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMe, updateProfile, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Not logged in → back to signin.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [user, authLoading, router]);

  // Prefill from any existing account/profile data. If the profile is already
  // complete, this is not a new user — skip straight to onboarding.
  useEffect(() => {
    getMe()
      .then((me) => {
        const p = me.profile;
        if (p?.full_name && p?.location && p?.phone) {
          router.replace("/onboarding");
          return;
        }
        setEmail(me.email);
        setFullName(p?.full_name ?? me.name ?? "");
        setLocation(p?.location ?? "");
        setPhone(p?.phone ?? "");
        setPrefilled(true);
      })
      .catch(() => setPrefilled(true));
  }, [router]);

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Name is required.";
    if (!location.trim()) e.location = "Location is required.";
    if (!phone.trim()) e.phone = "Phone number is required.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        location: location.trim(),
        phone: phone.trim(),
      });
      toast.success("Details saved.");
      router.push("/onboarding");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not save details.";
      toast.error(msg);
      setLoading(false);
    }
  }

  if (authLoading || !prefilled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs text-muted-foreground font-mono motion-safe:animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Step 1 of 2
          </p>
          <h1 className="text-3xl font-bold tracking-tighter mb-2">Your details.</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use these directly on your résumé — your name, contact, and location
            are taken from here, never generated.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName" className="text-xs uppercase tracking-widest">
              Full name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setErrors((p) => ({ ...p, fullName: "" }));
              }}
              placeholder="Varun Chaduvula"
              className={`font-mono text-sm h-11 ${errors.fullName ? "border-red-500" : ""}`}
            />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-widest">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              className="font-mono text-sm h-11 bg-muted/40 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground">
              Your login email — used as the résumé contact.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location" className="text-xs uppercase tracking-widest">
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setErrors((p) => ({ ...p, location: "" }));
              }}
              placeholder="Bengaluru, IN"
              className={`font-mono text-sm h-11 ${errors.location ? "border-red-500" : ""}`}
            />
            {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="text-xs uppercase tracking-widest">
              Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((p) => ({ ...p, phone: "" }));
              }}
              placeholder="+91 98765 43210"
              className={`font-mono text-sm h-11 ${errors.phone ? "border-red-500" : ""}`}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 font-bold text-sm transition-colors duration-150 cursor-pointer border-0 mt-2 disabled:opacity-50"
            style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
          >
            {loading ? "Saving…" : "Continue to onboarding →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
