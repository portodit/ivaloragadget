import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Layers,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface KpiData {
  totalStokAktif: number;
  totalAvailable: number;
  totalReserved: number;
  totalSold: number;
  totalComingSoon: number;
  totalService: number;
  totalLost: number;
  totalReturn: number;
}

interface OpnameMonitor {
  id: string;
  session_type: string;
  session_status: string;
  started_at: string;
  total_scanned: number;
  total_expected: number;
  total_match: number;
  total_missing: number;
  total_unregistered: number;
}

const STATUS_COLORS: Record<string, string> = {
  available: "hsl(142 71% 45%)",
  reserved: "hsl(38 92% 50%)",
  coming_soon: "hsl(210 90% 52%)",
  service: "hsl(262 60% 55%)",
  sold: "hsl(215 16% 55%)",
  return: "hsl(24 95% 53%)",
  lost: "hsl(0 72% 51%)",
};

const HARI: Record<string, string> = {
  "0": "Min", "1": "Sen", "2": "Sel", "3": "Rab", "4": "Kam", "5": "Jum", "6": "Sab",
};

function todayLabel() {
  const now = new Date();
  return now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function timeLabel() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "20" }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground tracking-tight leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Opname Status Badge ────────────────────────────────────────────────────────
function OpnameBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    draft: { label: "Sedang berjalan", cls: "text-[hsl(38_92%_28%)] bg-[hsl(38_92%_95%)]", icon: Clock },
    completed: { label: "Selesai", cls: "text-[hsl(142_71%_28%)] bg-[hsl(142_71%_95%)]", icon: CheckCircle2 },
    approved: { label: "Disetujui", cls: "text-[hsl(210_90%_30%)] bg-[hsl(210_90%_95%)]", icon: CheckCircle2 },
    locked: { label: "Dikunci", cls: "text-[hsl(215_16%_30%)] bg-[hsl(215_16%_94%)]", icon: XCircle },
  };
  const s = map[status] ?? { label: status, cls: "text-muted-foreground bg-muted", icon: AlertCircle };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Index() {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [opnameSessions, setOpnameSessions] = useState<OpnameMonitor[]>([]);
  const [chartData, setChartData] = useState<{ name: string; tersedia: number; terjual: number }[]>([]);
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingOpname, setLoadingOpname] = useState(true);
  const [updateTime] = useState(timeLabel());

  useEffect(() => {
    fetchKpi();
    fetchOpname();
    buildChartData();
  }, []);

  async function fetchKpi() {
    setLoadingKpi(true);
    const statuses = ["available", "reserved", "coming_soon", "service", "sold", "return", "lost"] as const;
    const counts: Record<string, number> = {};
    await Promise.all(
      statuses.map(async (s) => {
        const { count } = await supabase
          .from("stock_units")
          .select("*", { count: "exact", head: true })
          .eq("stock_status", s);
        counts[s] = count ?? 0;
      })
    );
    setKpi({
      totalStokAktif: (counts.available ?? 0) + (counts.reserved ?? 0) + (counts.coming_soon ?? 0),
      totalAvailable: counts.available ?? 0,
      totalReserved: counts.reserved ?? 0,
      totalSold: counts.sold ?? 0,
      totalComingSoon: counts.coming_soon ?? 0,
      totalService: counts.service ?? 0,
      totalLost: counts.lost ?? 0,
      totalReturn: counts.return ?? 0,
    });
    setLoadingKpi(false);
  }

  async function fetchOpname() {
    setLoadingOpname(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("opname_sessions")
      .select("id,session_type,session_status,started_at,total_scanned,total_expected,total_match,total_missing,total_unregistered")
      .gte("started_at", today.toISOString())
      .order("started_at", { ascending: true });
    setOpnameSessions((data as OpnameMonitor[]) ?? []);
    setLoadingOpname(false);
  }

  async function buildChartData() {
    // Last 7 days: count available & sold units received per day
    const days: { name: string; tersedia: number; terjual: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const [avail, sold] = await Promise.all([
        supabase
          .from("stock_units")
          .select("*", { count: "exact", head: true })
          .eq("stock_status", "available")
          .gte("received_at", d.toISOString())
          .lt("received_at", nextD.toISOString()),
        supabase
          .from("stock_units")
          .select("*", { count: "exact", head: true })
          .eq("stock_status", "sold")
          .gte("status_changed_at", d.toISOString())
          .lt("status_changed_at", nextD.toISOString()),
      ]);
      days.push({
        name: HARI[d.getDay().toString()],
        tersedia: avail.count ?? 0,
        terjual: sold.count ?? 0,
      });
    }
    setChartData(days);
  }

  const n = (v: number | undefined) => (v ?? 0);

  return (
    <DashboardLayout pageTitle="Dashboard">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            {todayLabel()}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Halo, selamat datang! 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Ini ringkasan stok dan aktivitas hari ini.</p>
        </div>
        <span className="text-xs text-muted-foreground hidden md:block">
          Diperbarui pukul {updateTime}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      {loadingKpi ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard
            label="Stok Aktif"
            value={n(kpi?.totalStokAktif)}
            sub="Tersedia + Reserved + Akan Datang"
            icon={Package}
            color="hsl(0 0% 12%)"
          />
          <KpiCard
            label="Tersedia"
            value={n(kpi?.totalAvailable)}
            sub="Siap dijual sekarang"
            icon={TrendingUp}
            color={STATUS_COLORS.available}
          />
          <KpiCard
            label="Terjual"
            value={n(kpi?.totalSold)}
            sub="Total unit berhasil terjual"
            icon={ShoppingCart}
            color={STATUS_COLORS.sold}
          />
          <KpiCard
            label="Dalam Servis"
            value={n(kpi?.totalService)}
            sub="Unit sedang diperbaiki"
            icon={AlertCircle}
            color={STATUS_COLORS.service}
          />
        </div>
      )}

      {/* ── Row 2: Status breakdown + Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Status breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Breakdown Status</h3>
          </div>
          {loadingKpi ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Tersedia", value: kpi?.totalAvailable, color: STATUS_COLORS.available },
                { label: "Dipesan", value: kpi?.totalReserved, color: STATUS_COLORS.reserved },
                { label: "Akan Datang", value: kpi?.totalComingSoon, color: STATUS_COLORS.coming_soon },
                { label: "Servis", value: kpi?.totalService, color: STATUS_COLORS.service },
                { label: "Retur", value: kpi?.totalReturn, color: STATUS_COLORS.return },
                { label: "Hilang", value: kpi?.totalLost, color: STATUS_COLORS.lost },
              ].map((row) => {
                const total = n(kpi?.totalStokAktif) + n(kpi?.totalSold) + n(kpi?.totalService) + n(kpi?.totalLost) + n(kpi?.totalReturn) || 1;
                const pct = Math.round((n(row.value) / total) * 100);
                return (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{row.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums w-6 text-right">{n(row.value)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Aktivitas 7 Hari Terakhir</h3>
          </div>
          {chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 91%)", fontSize: 12 }}
                  cursor={{ fill: "hsl(210 20% 96%)" }}
                />
                <Bar dataKey="tersedia" name="Unit Masuk" fill={STATUS_COLORS.available} radius={[3, 3, 0, 0]} />
                <Bar dataKey="terjual" name="Terjual" fill={STATUS_COLORS.sold} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: STATUS_COLORS.available }} />
              Unit Masuk
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: STATUS_COLORS.sold }} />
              Terjual
            </div>
          </div>
        </div>
      </div>

      {/* ── Monitoring Opname Hari Ini ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Monitoring Opname Hari Ini</h3>
              <p className="text-xs text-muted-foreground">Sesi stok opname yang berjalan hari ini</p>
            </div>
          </div>
        </div>

        {loadingOpname ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : opnameSessions.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Belum ada sesi opname hari ini</p>
            <p className="text-xs text-muted-foreground">Sesi baru akan muncul di sini ketika dibuat</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opnameSessions.map((s) => {
              const pct = s.total_expected > 0 ? Math.round((s.total_scanned / s.total_expected) * 100) : 0;
              const typeLabel: Record<string, string> = { opening: "Opening", closing: "Closing", adhoc: "Ad-hoc" };
              return (
                <div key={s.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{typeLabel[s.session_type] ?? s.session_type}</span>
                      <OpnameBadge status={s.session_status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Mulai {new Date(s.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      { label: "Discan", val: s.total_scanned },
                      { label: "Cocok", val: s.total_match },
                      { label: "Hilang", val: s.total_missing },
                      { label: "Tidak Terdaftar", val: s.total_unregistered },
                    ].map((x) => (
                      <div key={x.label}>
                        <p className="text-lg font-bold text-foreground">{x.val}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{x.label}</p>
                      </div>
                    ))}
                  </div>
                  {s.total_expected > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Progress scan</span>
                        <span className="text-xs font-semibold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: "hsl(142 71% 45%)" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
