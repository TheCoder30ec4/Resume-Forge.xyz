"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const sections = ["Account", "Integrations", "API Keys", "Billing", "Danger"];

const providers = [
  { id: "anthropic", label: "Anthropic", connected: false },
  { id: "openai", label: "OpenAI", connected: false },
  { id: "groq", label: "Groq", connected: false },
  { id: "google", label: "Google", connected: false },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("Account");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    anthropic: "",
    openai: "",
    groq: "",
    google: "",
  });
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  function toggleShowKey(id: string) {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex">
        {/* Left: Nav */}
        <div className="w-48 flex-shrink-0 border-r border-border py-8 px-4 flex flex-col gap-1">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`text-xs text-left px-3 py-2 rounded font-mono transition-colors duration-150 cursor-pointer ${
                activeSection === s
                  ? "font-bold"
                  : s === "Danger"
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              style={activeSection === s && s !== "Danger" ? { backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" } : {}}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Right: Content */}
        <div className="flex-1 px-8 py-10 max-w-2xl">
          {/* Account */}
          {activeSection === "Account" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tighter mb-1">Account</h2>
                <p className="text-xs text-muted-foreground">Manage your profile and preferences.</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold">
                  A
                </div>
                <div>
                  <p className="text-sm font-bold">Alex Morgan</p>
                  <p className="text-xs text-muted-foreground">alex@morg.dev</p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs uppercase tracking-widest">Name</Label>
                  <Input defaultValue="Alex Morgan" className="font-mono text-sm h-10" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs uppercase tracking-widest">Email</Label>
                  <Input defaultValue="alex@morg.dev" type="email" className="font-mono text-sm h-10" />
                </div>
              </div>

              <div className="flex items-center justify-between border border-border rounded p-4">
                <div>
                  <p className="text-sm font-bold">Pro · ₹50/mo</p>
                  <p className="text-xs text-muted-foreground">renews May 22 · cancel anytime</p>
                </div>
                <a
                  href="#"
                  className="text-xs text-accent hover:underline cursor-pointer"
                  onClick={(e) => { e.preventDefault(); router.push("/pricing"); }}
                >
                  Manage on Razorpay ↗
                </a>
              </div>

              <Button
                className="self-start h-9 font-bold text-xs cursor-pointer transition-colors duration-150 border-0"
                style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
              >
                Save changes
              </Button>
            </div>
          )}

          {/* Integrations */}
          {activeSection === "Integrations" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tighter mb-1">Integrations</h2>
                <p className="text-xs text-muted-foreground">Connect your evidence sources.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="border border-border rounded p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">GitHub</p>
                    <p className="text-xs text-muted-foreground">12 repos · synced 2h ago</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">connected</Badge>
                    <button className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      edit allowlist →
                    </button>
                  </div>
                </div>

                <div className="border border-border rounded p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">LinkedIn</p>
                    <p className="text-xs text-muted-foreground">Profile synced</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">connected</Badge>
                    <button className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      refresh →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeSection === "API Keys" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tighter mb-1">API Keys</h2>
                <p className="text-xs text-muted-foreground">
                  Bring your own keys. Stored encrypted, never logged.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {providers.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2">
                    <Label className="text-xs uppercase tracking-widest">{p.label}</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showKey[p.id] ? "text" : "password"}
                        placeholder={`sk-${p.id}-...`}
                        value={apiKeys[p.id]}
                        onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="font-mono text-xs h-9 flex-1"
                      />
                      <button
                        onClick={() => toggleShowKey(p.id)}
                        aria-label={showKey[p.id] ? "Hide key" : "Show key"}
                        className="px-3 border border-border rounded text-xs font-mono hover:border-foreground transition-colors cursor-pointer"
                      >
                        {showKey[p.id] ? "hide" : "show"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="self-start h-9 font-bold text-xs cursor-pointer transition-colors duration-150 border-0"
                style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
              >
                Save keys
              </Button>
            </div>
          )}

          {/* Billing */}
          {activeSection === "Billing" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tighter mb-1">Billing</h2>
                <p className="text-xs text-muted-foreground">Usage and payment history.</p>
              </div>

              <div className="border border-border rounded p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold">Pro Plan</p>
                    <p className="text-xs text-muted-foreground">₹50/month · renews May 22</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">active</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">3</span> credits remaining
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent charges</p>
                {[
                  { date: "May 5", desc: "Senior FE @ Linear", cost: "₹3.40" },
                  { date: "May 3", desc: "Staff Eng @ Vercel", cost: "₹2.80" },
                  { date: "May 1", desc: "Product Eng @ Ramp", cost: "₹3.10" },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between text-xs py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{row.date}</span>
                    <span>{row.desc}</span>
                    <span className="tabular-nums">{row.cost}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push("/pricing")}
                className="text-xs text-accent hover:underline cursor-pointer text-left"
              >
                Manage on Razorpay ↗
              </button>
            </div>
          )}

          {/* Danger */}
          {activeSection === "Danger" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tighter mb-1 text-destructive">Danger zone</h2>
                <p className="text-xs text-muted-foreground">Irreversible actions.</p>
              </div>

              <div className="border border-destructive/40 rounded p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Delete all résumés</p>
                  <p className="text-xs text-muted-foreground">Permanently delete all your résumés and YAMLs.</p>
                </div>
                <Button variant="destructive" className="text-xs h-9 cursor-pointer">
                  Delete all
                </Button>
              </div>

              <div className="border border-destructive/40 rounded p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Delete account</p>
                  <p className="text-xs text-muted-foreground">Cancel subscription and delete all data.</p>
                </div>
                <Button variant="destructive" className="text-xs h-9 cursor-pointer">
                  Delete account
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
