import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Activity, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  approve_admin: { label: "Setujui Admin", color: "text-[hsl(var(--status-available-fg))]" },
  reject_admin: { label: "Tolak Admin", color: "text-[hsl(var(--status-lost-fg))]" },
  suspend_admin: { label: "Nonaktifkan Admin", color: "text-[hsl(var(--status-minus-fg))]" },
  activate_admin: { label: "Aktifkan Admin", color: "text-[hsl(var(--status-available-fg))]" },
  role_change: { label: "Ubah Role", color: "text-[hsl(var(--status-coming-soon-fg))]" },
  create_admin: { label: "Buat Akun Admin", color: "text-[hsl(var(--status-reserved-fg))]" },
  reset_password: { label: "Reset Password", color: "text-muted-foreground" },
};

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function fetchLogs() {
    setLoading(true);
    const { data } = await db
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs((data as ActivityLog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.actor_email?.toLowerCase().includes(q) ||
      l.target_email?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout pageTitle="Log Aktivitas">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Log Aktivitas</h2>
            <p className="text-sm text-muted-foreground">
              Rekam jejak tindakan admin & super admin
            </p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan email atau aksi..."
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="space-y-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 border-b border-border animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Activity className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Belum ada log aktivitas</p>
              <p className="text-xs text-muted-foreground">Aktivitas akan tercatat di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Waktu</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pelaku</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const act = ACTION_LABELS[log.action] ?? { label: log.action, color: "text-foreground" };
                    return (
                      <tr key={log.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-xs font-medium text-foreground">{log.actor_email ?? "—"}</p>
                            {log.actor_role && (
                              <p className="text-[10px] text-muted-foreground capitalize">
                                {log.actor_role === "super_admin" ? "Super Admin" : "Admin"}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${act.color}`}>{act.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {log.target_email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.metadata
                            ? Object.entries(log.metadata)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Menampilkan {filtered.length} dari {logs.length} log · © 2026 Tim IT Ivalora Gadget
        </p>
      </div>
    </DashboardLayout>
  );
}
