import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Search, RefreshCw, Filter, LogIn, UserPlus,
  UserCheck, UserX, UserCog, KeyRound, ShieldAlert,
  Package, Archive, Trash2, Edit3, Eye,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ActivityLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_id: string | null;
  target_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ── Action catalog ─────────────────────────────────────────────────────────────
const ACTION_META: Record<string, {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
  category: string;
}> = {
  // Auth
  login:              { label: "Login",               color: "text-[hsl(var(--status-available-fg))]",    bg: "bg-[hsl(var(--status-available-bg))]",    icon: LogIn,       category: "auth" },
  logout:             { label: "Logout",              color: "text-muted-foreground",                      bg: "bg-muted/50",                              icon: LogIn,       category: "auth" },
  register:           { label: "Daftar Akun",         color: "text-[hsl(var(--status-reserved-fg))]",     bg: "bg-[hsl(var(--status-reserved-bg))]",     icon: UserPlus,    category: "auth" },
  reset_password:     { label: "Reset Password",      color: "text-muted-foreground",                      bg: "bg-muted/50",                              icon: KeyRound,    category: "auth" },
  // Admin management
  approve_admin:      { label: "Setujui Admin",       color: "text-[hsl(var(--status-available-fg))]",    bg: "bg-[hsl(var(--status-available-bg))]",    icon: UserCheck,   category: "admin" },
  reject_admin:       { label: "Tolak Admin",         color: "text-[hsl(var(--status-lost-fg))]",         bg: "bg-[hsl(var(--status-lost-bg))]",         icon: UserX,       category: "admin" },
  suspend_admin:      { label: "Nonaktifkan Admin",   color: "text-[hsl(var(--status-minus-fg))]",        bg: "bg-[hsl(var(--status-minus-bg))]",        icon: ShieldAlert, category: "admin" },
  activate_admin:     { label: "Aktifkan Admin",      color: "text-[hsl(var(--status-available-fg))]",    bg: "bg-[hsl(var(--status-available-bg))]",    icon: UserCheck,   category: "admin" },
  role_change:        { label: "Ubah Role",           color: "text-[hsl(var(--status-coming-soon-fg))]",  bg: "bg-[hsl(var(--status-coming-soon-bg))]",  icon: UserCog,     category: "admin" },
  create_admin:       { label: "Buat Akun Admin",     color: "text-[hsl(var(--status-reserved-fg))]",     bg: "bg-[hsl(var(--status-reserved-bg))]",     icon: UserPlus,    category: "admin" },
  // Products
  create_product:     { label: "Tambah Produk",       color: "text-[hsl(var(--status-available-fg))]",    bg: "bg-[hsl(var(--status-available-bg))]",    icon: Package,     category: "product" },
  update_product:     { label: "Edit Produk",         color: "text-[hsl(var(--status-coming-soon-fg))]",  bg: "bg-[hsl(var(--status-coming-soon-bg))]",  icon: Edit3,       category: "product" },
  deactivate_product: { label: "Nonaktifkan Produk",  color: "text-[hsl(var(--status-minus-fg))]",        bg: "bg-[hsl(var(--status-minus-bg))]",        icon: Archive,     category: "product" },
  activate_product:   { label: "Aktifkan Produk",     color: "text-[hsl(var(--status-available-fg))]",    bg: "bg-[hsl(var(--status-available-bg))]",    icon: Package,     category: "product" },
  delete_product:     { label: "Hapus Produk",        color: "text-[hsl(var(--status-lost-fg))]",         bg: "bg-[hsl(var(--status-lost-bg))]",         icon: Trash2,      category: "product" },
  // Stock
  create_stock:       { label: "Tambah Unit Stok",    color: "text-[hsl(var(--status-available-fg))]",    bg: "bg-[hsl(var(--status-available-bg))]",    icon: Archive,     category: "stock" },
  update_stock:       { label: "Edit Unit Stok",      color: "text-[hsl(var(--status-coming-soon-fg))]",  bg: "bg-[hsl(var(--status-coming-soon-bg))]",  icon: Edit3,       category: "stock" },
  // Catalog
  create_catalog:     { label: "Tambah ke Katalog",   color: "text-[hsl(var(--status-available-fg))]",    bg: "bg-[hsl(var(--status-available-bg))]",    icon: Eye,         category: "catalog" },
  update_catalog:     { label: "Edit Katalog",        color: "text-[hsl(var(--status-coming-soon-fg))]",  bg: "bg-[hsl(var(--status-coming-soon-bg))]",  icon: Edit3,       category: "catalog" },
  publish_catalog:    { label: "Publish Katalog",     color: "text-[hsl(var(--status-reserved-fg))]",     bg: "bg-[hsl(var(--status-reserved-bg))]",     icon: Eye,         category: "catalog" },
  unpublish_catalog:  { label: "Unpublish Katalog",   color: "text-muted-foreground",                      bg: "bg-muted/50",                              icon: Archive,     category: "catalog" },
  delete_catalog:     { label: "Hapus dari Katalog",  color: "text-[hsl(var(--status-lost-fg))]",         bg: "bg-[hsl(var(--status-lost-bg))]",         icon: Trash2,      category: "catalog" },
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "Semua Kategori",
  auth: "Autentikasi",
  admin: "Manajemen Admin",
  product: "Produk",
  stock: "Stok",
  catalog: "Katalog",
};

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr));
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
      role === "super_admin"
        ? "bg-foreground/10 text-foreground"
        : "bg-muted text-muted-foreground"
    }`}>
      {role === "super_admin" ? "Super Admin" : "Admin"}
    </span>
  );
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs((data as ActivityLog[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.actor_email?.toLowerCase().includes(q) ||
      l.target_email?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      ACTION_META[l.action]?.label.toLowerCase().includes(q);

    const meta = ACTION_META[l.action];
    const matchCategory = categoryFilter === "all" || meta?.category === categoryFilter;

    return matchSearch && matchCategory;
  });

  // Stats per category
  const stats = Object.entries(CATEGORY_LABELS)
    .filter(([k]) => k !== "all")
    .map(([key, label]) => ({
      key, label,
      count: logs.filter(l => ACTION_META[l.action]?.category === key).length,
    }));

  return (
    <DashboardLayout pageTitle="Log Aktivitas">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Log Aktivitas</h2>
            <p className="text-sm text-muted-foreground">
              Rekam jejak seluruh aktivitas sistem — login, produk, stok, katalog, dan manajemen admin
            </p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2">
          {stats.map(s => (
            <button
              key={s.key}
              onClick={() => setCategoryFilter(prev => prev === s.key ? "all" : s.key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                categoryFilter === s.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              <span>{s.label}</span>
              <span className={`font-semibold ${categoryFilter === s.key ? "text-background" : "text-foreground"}`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari email atau jenis aktivitas..."
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 border-b border-border last:border-0 animate-pulse bg-muted/30" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Activity className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Tidak ada log yang sesuai</p>
              <p className="text-xs text-muted-foreground">Coba ubah kata kunci atau filter kategori</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Waktu</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pelaku</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aktivitas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Target</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const meta = ACTION_META[log.action] ?? {
                      label: log.action,
                      color: "text-foreground",
                      bg: "bg-muted/40",
                      icon: Activity,
                      category: "other",
                    };
                    const Icon = meta.icon;
                    return (
                      <tr key={log.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground leading-tight">
                              {log.actor_email ?? <span className="text-muted-foreground italic">Sistem</span>}
                            </p>
                            <RoleBadge role={log.actor_role} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg ${meta.color} ${meta.bg}`}>
                            <Icon className="w-3 h-3 shrink-0" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {log.target_email ?? (log.target_id ? (
                            <span className="font-mono text-[10px] text-muted-foreground/60">{log.target_id.slice(0, 8)}…</span>
                          ) : "—")}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {log.metadata ? (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {Object.entries(log.metadata).slice(0, 3).map(([k, v]) => (
                                <Badge key={k} variant="outline" className="text-[10px] h-auto py-0.5 px-1.5 font-normal">
                                  <span className="text-muted-foreground">{k}:</span>{" "}
                                  <span className="font-medium text-foreground">{String(v)}</span>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
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
