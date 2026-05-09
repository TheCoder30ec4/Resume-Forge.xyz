"use client";

import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    id: "free",
    price: "₹0",
    period: "forever",
    label: "Free",
    cta: "Current plan",
    ctaVariant: "outline" as const,
    isCurrent: true,
    features: [
      "3 résumés / month",
      "2 themes",
      "ATS scoring",
      "GitHub integration",
      "LinkedIn integration",
      "PDF export",
    ],
    missing: ["YAML export", "Priority model", "Bulk export"],
  },
  {
    id: "pro",
    price: "₹50",
    period: "/month",
    label: "Pro",
    badge: "most pop.",
    cta: "Upgrade →",
    ctaVariant: "default" as const,
    isCurrent: false,
    features: [
      "Unlimited résumés",
      "All themes",
      "ATS scoring",
      "GitHub integration",
      "LinkedIn integration",
      "PDF + YAML export",
      "Sonnet 4.6 default",
      "Opus 4.7 access",
      "Priority support",
    ],
    missing: [],
  },
  {
    id: "credits",
    price: "₹250",
    period: "one-time",
    label: "Credits",
    cta: "Buy credits",
    ctaVariant: "outline" as const,
    isCurrent: false,
    features: [
      "100 run credits",
      "Never expires",
      "All themes",
      "ATS scoring",
      "PDF + YAML export",
      "Mix any model",
    ],
    missing: [],
    note: "~₹2.50 per run",
  },
];

export default function PricingPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] px-6 py-12 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tighter mb-2">
            Pick what fits.
          </h1>
          <p className="text-sm text-muted-foreground">
            Switch any time. Cancel any time.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col border rounded p-6 transition-colors duration-150 ${
                plan.id === "pro"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:border-foreground/50"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground text-[10px] font-mono">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              {/* Plan label */}
              <p className={`text-xs uppercase tracking-widest mb-4 ${plan.id === "pro" ? "text-background/60" : "text-muted-foreground"}`}>
                {plan.label}
              </p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tighter">{plan.price}</span>
                <span className={`text-xs ml-1 ${plan.id === "pro" ? "text-background/60" : "text-muted-foreground"}`}>
                  {plan.period}
                </span>
                {plan.note && (
                  <p className={`text-[10px] mt-1 ${plan.id === "pro" ? "text-background/50" : "text-muted-foreground"}`}>
                    {plan.note}
                  </p>
                )}
              </div>

              {/* CTA */}
              <Button
                variant={plan.isCurrent ? "outline" : plan.id === "pro" ? "secondary" : "outline"}
                disabled={plan.isCurrent}
                onClick={() => !plan.isCurrent && router.push("/onboarding")}
                className={`h-10 font-bold text-xs mb-6 cursor-pointer transition-colors duration-150 ${
                  plan.isCurrent
                    ? "opacity-50 cursor-not-allowed"
                    : plan.id === "pro"
                    ? "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "border-border hover:border-foreground"
                }`}
              >
                {plan.cta}
              </Button>

              {/* Features */}
              <ul className="flex flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs">
                    <svg viewBox="0 0 12 12" className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-xs ${plan.id === "pro" ? "opacity-0" : "opacity-40 line-through"}`}>
                    <svg viewBox="0 0 12 12" className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ strip */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 pt-8 border-t border-border">
          {[
            { q: "What's a run?", a: "One JD → one PDF. Credits consumed per run based on model used." },
            { q: "Can I BYOK?", a: "Yes. Bring your own Anthropic or Groq API key — runs cost ~₹0.50." },
            { q: "Is data stored?", a: "YAMLs stored encrypted. Delete anytime from settings." },
          ].map((faq) => (
            <div key={faq.q}>
              <p className="text-xs font-bold mb-1">{faq.q}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
