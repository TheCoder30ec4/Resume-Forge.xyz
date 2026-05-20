"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { updateProfile, connectLinkedin, ApiError } from "@/lib/api";
import { toast } from "sonner";

const sections = ["Account", "Integrations", "Danger"];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [activeSection, setActiveSection] = useState("Account");

  // Account form
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // LinkedIn
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinMsg, setLinkedinMsg] = useState("");

  // GitHub repos allowlist (stored in localStorage during onboarding)
  const [repos, setRepos] = useState<string[]>([]);
  const [repoInput, setRepoInput] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setRepos(JSON.parse(localStorage.getItem("selected_repos") ?? "[]"));
    }
  }, [user]);

  async function handleSaveProfile() {
    setSaving(true);
    setSaveMsg("");
    try {
      await updateProfile({ full_name: name });
      await refresh();
      setSaveMsg("Saved.");
      toast.success("Profile saved.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed.";
      setSaveMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  async function handleConnectLinkedin() {
    if (!linkedinUrl.trim()) return;
    setLinkedinLoading(true);
    setLinkedinMsg("");
    try {
      const res = await connectLinkedin(linkedinUrl.trim());
      setLinkedinMsg(`✓ Connected: ${res.public_id}`);
      toast.success(`LinkedIn connected: ${res.public_id}`);
      setLinkedinUrl("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to connect.";
      setLinkedinMsg(msg);
      toast.error(msg);
    } finally {
      setLinkedinLoading(false);
    }
  }

  function addRepo() {
    const r = repoInput.trim();
    if (!r || repos.includes(r)) return;
    const updated = [...repos, r];
    setRepos(updated);
    localStorage.setItem("selected_repos", JSON.stringify(updated));
    setRepoInput("");
  }

  function removeRepo(r: string) {
    const updated = repos.filter((x) => x !== r);
    setRepos(updated);
    localStorage.setItem("selected_repos", JSON.stringify(updated));
  }

  if (authLoading) return null;

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex">
        {/* Left nav */}
        <div className="w-48 flex-shrink-0 border-r border-border py-8 px-4 flex flex-col gap-1">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`text-xs text-left px-3 py-2 rounded font-mono transition-colors duration-150 cursor-pointer ${
                activeSection === s ? "font-bold" : s === "Danger" ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              style={activeSection === s && s !== "Danger" ? { backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" } : {}}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 px-8 py-10 max-w-2xl">

          {/* Account */}
          {activeSection === "Account" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tighter mb-1">Account</h2>
                <p className="text-xs text-muted-foreground">Manage your profile.</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold">
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-bold">{user?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs uppercase tracking-widest">Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="font-mono text-sm h-10"
                    placeholder="Your name"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs uppercase tracking-widest">Email</Label>
                  <Input value={user?.email ?? ""} type="email" className="font-mono text-sm h-10" disabled />
                </div>
              </div>

              {saveMsg && <p className={`text-xs ${saveMsg.startsWith("✓") || saveMsg === "Saved." ? "text-accent" : "text-red-500"}`}>{saveMsg}</p>}

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="self-start h-9 font-bold text-xs cursor-pointer border-0 disabled:opacity-50"
                style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
              >
                {saving ? "Saving…" : "Save changes"}
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

              {/* LinkedIn */}
              <div className="border border-border rounded p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">LinkedIn</p>
                  <Badge variant="outline" className="text-[10px]">URL-based</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Paste your LinkedIn profile URL to pull your work history.</p>
                <div className="flex gap-2">
                  <Input
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/yourname"
                    className="font-mono text-xs h-9 flex-1"
                  />
                  <Button
                    onClick={handleConnectLinkedin}
                    disabled={linkedinLoading || !linkedinUrl.trim()}
                    className="h-9 text-xs font-bold border-0 disabled:opacity-50"
                    style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
                  >
                    {linkedinLoading ? "…" : "Connect"}
                  </Button>
                </div>
                {linkedinMsg && (
                  <p className={`text-xs ${linkedinMsg.startsWith("✓") ? "text-accent" : "text-red-500"}`}>{linkedinMsg}</p>
                )}
              </div>

              {/* GitHub repos allowlist */}
              <div className="border border-border rounded p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">GitHub repos</p>
                  <Badge variant="outline" className="text-[10px]">{repos.length} selected</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Add repos as owner/repo (e.g. TheCoder30ec4/ResumeBuilder). These are passed to the resume workflow.</p>
                <div className="flex gap-2">
                  <Input
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addRepo(); }}
                    placeholder="owner/repo"
                    className="font-mono text-xs h-9 flex-1"
                  />
                  <Button
                    onClick={addRepo}
                    disabled={!repoInput.trim()}
                    className="h-9 text-xs font-bold border-0 disabled:opacity-50"
                    style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
                  >
                    Add
                  </Button>
                </div>
                {repos.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {repos.map((r) => (
                      <div key={r} className="flex items-center justify-between text-xs border border-border rounded px-3 py-1.5 font-mono">
                        <span>{r}</span>
                        <button onClick={() => removeRepo(r)} className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  <p className="text-sm font-bold">Delete account</p>
                  <p className="text-xs text-muted-foreground">Cancel and delete all data.</p>
                </div>
                <Button variant="destructive" className="text-xs h-9 cursor-pointer">Delete account</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
