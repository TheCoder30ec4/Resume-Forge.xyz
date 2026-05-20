"use client";

import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";

const history = [
  { id: 1, title: "Senior FE @ Linear", ats: 94, date: "May 5, 2026", time: "47s", cost: "₹3.40", attempts: 1 },
  { id: 2, title: "Staff Eng @ Vercel", ats: 88, date: "May 3, 2026", time: "52s", cost: "₹2.80", attempts: 2 },
  { id: 3, title: "Product Eng @ Ramp", ats: 91, date: "May 1, 2026", time: "41s", cost: "₹3.10", attempts: 1 },
  { id: 4, title: "FE Eng @ Notion", ats: 86, date: "Apr 27, 2026", time: "60s", cost: "₹4.20", attempts: 3 },
  { id: 5, title: "SWE @ Stripe", ats: 92, date: "Apr 22, 2026", time: "44s", cost: "₹3.20", attempts: 1 },
];

function atsColor(score: number) {
  if (score >= 90) return "text-accent";
  if (score >= 80) return "text-foreground";
  return "text-muted-foreground";
}

export default function HistoryPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">History</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{history.length} runs total</p>
          </div>
        </div>

        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Title", "ATS", "Time", "Cost", "Attempts", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors duration-150 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                  onClick={() => router.push("/shipped")}
                >
                  <td className="px-4 py-3 font-bold text-xs">{r.title}</td>
                  <td className={`px-4 py-3 text-xs font-bold tabular-nums ${atsColor(r.ats)}`}>{r.ats}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{r.time}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{r.cost}</td>
                  <td className="px-4 py-3 text-xs text-center">
                    <Badge variant="outline" className="text-[10px] font-mono">{r.attempts}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3 text-xs text-right text-muted-foreground hover:text-foreground">open ↗</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
