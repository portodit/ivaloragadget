import { useState, useEffect, useCallback } from "react";
import { Plus, Search, LayoutGrid, List, X, RefreshCw, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StockStatusBadge, ConditionBadge } from "@/components/stock-units/StockBadges";
import { AddUnitModal } from "@/components/stock-units/AddUnitModal";
import { UnitDetailDrawer } from "@/components/stock-units/UnitDetailDrawer";
import {
  StockUnit,
  StockStatus,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_STYLES,
  formatCurrency,
  formatDate,
} from "@/lib/stock-units";

// Default operational view statuses
const DEFAULT_STATUSES: StockStatus[] = ["available", "reserved", "service", "coming_soon"];

const ALL_STATUSES: StockStatus[] = ["available", "reserved", "coming_soon", "service", "sold", "return", "lost"];

interface SummaryCount {
  status: StockStatus;
  count: number;
}

export default function StockIMEIPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const [units, setUnits] = useState<StockUnit[]>([]);
  const [summary, setSummary] = useState<SummaryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "compact">("table");

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StockStatus | "default">("default");
  const [filterSeries, setFilterSeries] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<StockUnit | null>(null);
  const [exportEmptyOpen, setExportEmptyOpen] = useState(false);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);

    const activeStatuses = filterStatus === "default" ? DEFAULT_STATUSES : [filterStatus];

    let query = supabase
      .from("stock_units")
      .select(`*, master_products(series, storage_gb, color, warranty_type, category)`)
      .in("stock_status", activeStatuses)
      .order("received_at", { ascending: false });

    if (filterCondition !== "all") query = query.eq("condition_status", filterCondition as never);
    if (filterSeries !== "all") query = query.ilike("master_products.series" as never, `%${filterSeries}%`);

    const { data, error: fetchError } = await query;
    if (fetchError) { setError(fetchError.message); setLoading(false); return; }

    let filtered = (data as StockUnit[]) ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((u) =>
        u.imei?.toLowerCase().includes(q) ||
        u.master_products?.series?.toLowerCase().includes(q) ||
        u.master_products?.color?.toLowerCase().includes(q)
      );
    }
    setUnits(filtered);
    setLoading(false);
  }, [search, filterStatus, filterSeries, filterCondition]);

  const fetchSummary = useCallback(async () => {
    const counts: SummaryCount[] = [];
    for (const s of ALL_STATUSES) {
      const { count } = await supabase
        .from("stock_units")
        .select("*", { count: "exact", head: true })
        .eq("stock_status", s);
      counts.push({ status: s, count: count ?? 0 });
    }
    setSummary(counts);
  }, []);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleRefresh = () => { fetchUnits(); fetchSummary(); };
  const resetFilters = () => { setSearch(""); setFilterStatus("default"); setFilterSeries("all"); setFilterCondition("all"); };

  const hasActiveFilters = search || filterStatus !== "default" || filterSeries !== "all" || filterCondition !== "all";

  // Unique series for filter
  const seriesList = Array.from(new Set(units.map((u) => u.master_products?.series).filter(Boolean)));

  return (
    <DashboardLayout pageTitle="Stok IMEI">
      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Stok IMEI</h1>
            <p className="text-xs text-muted-foreground">Kelola dan pantau seluruh unit berbasis IMEI secara real-time.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={() => {
                if (units.length === 0) { setExportEmptyOpen(true); return; }
                // TODO: actual export
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor</span>
            </Button>
            {isSuperAdmin && (
              <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                Tambah Unit
              </Button>
            )}
          </div>
        </div>

        {/* ── Summary bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {ALL_STATUSES.map((s) => {
            const count = summary.find((c) => c.status === s)?.count ?? 0;
            const style = STOCK_STATUS_STYLES[s];
            const isActive = filterStatus === s || (filterStatus === "default" && DEFAULT_STATUSES.includes(s));
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "default" : s)}
                className={`rounded-xl border p-3 text-left transition-all duration-150 hover:shadow-sm ${
                  isActive ? `${style.bg} border-transparent` : "bg-card border-border hover:border-border/70"
                }`}
              >
                <p className={`text-xl font-bold leading-none ${isActive ? style.text : "text-foreground"}`}>{count}</p>
                <p className={`text-[10px] mt-1 font-medium uppercase tracking-wider ${isActive ? style.text : "text-muted-foreground"}`}>
                  {STOCK_STATUS_LABELS[s]}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Filter & Search panel ── */}
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 space-y-3">
          <div className="flex gap-2">
            {/* Search — full width on mobile */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari IMEI atau seri…"
                className="pl-9 h-9 text-sm"
              />
            </div>
            {/* Condition — hidden on mobile, shown inline on desktop */}
            <div className="hidden sm:block">
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue placeholder="Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kondisi</SelectItem>
                  <SelectItem value="no_minus">No Minus</SelectItem>
                  <SelectItem value="minus">Ada Minus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 h-9">
              <button
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("compact")}
                className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === "compact" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-muted-foreground hidden sm:flex" onClick={resetFilters}>
                <X className="w-3 h-3" /> Reset
              </Button>
            )}
          </div>
          {/* Mobile: condition filter as pill chips */}
          <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-0.5">
            {["all", "no_minus", "minus"].map((v) => (
              <button
                key={v}
                onClick={() => setFilterCondition(v)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterCondition === v
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border"
                }`}
              >
                {v === "all" ? "Semua Kondisi" : v === "no_minus" ? "No Minus" : "Ada Minus"}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium border border-destructive/30 text-destructive"
                onClick={resetFilters}
              >
                Reset
              </button>
            )}
          </div>
          {filterStatus !== "default" && (
            <p className="text-xs text-muted-foreground">
              Filter aktif: <span className="font-medium text-foreground">{STOCK_STATUS_LABELS[filterStatus]}</span>
              {" · "}
              <button className="underline" onClick={() => setFilterStatus("default")}>tampilkan default</button>
            </p>
          )}
        </div>

        {/* ── Content ── */}
        {error ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center space-y-3">
            <p className="text-sm text-destructive">Terjadi kesalahan saat memuat data. Silakan coba kembali.</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>Coba Lagi</Button>
          </div>
        ) : loading ? (
          viewMode === "table" ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          )
        ) : units.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Belum ada unit dengan kriteria ini.</p>
            <p className="text-xs text-muted-foreground">Coba ubah filter atau tambahkan unit baru.</p>
            {isSuperAdmin && (
              <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Tambah Unit
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* ── Table View ── */
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produk</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kondisi</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harga Jual</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Masuk</th>
                    {isSuperAdmin && (
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">IMEI</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {units.map((unit) => (
                    <tr
                      key={unit.id}
                      className="hover:bg-accent/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedUnit(unit)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-sm">
                          {unit.master_products?.series} {unit.master_products?.storage_gb}GB
                        </p>
                        <p className="text-xs text-muted-foreground">{unit.master_products?.color} · {unit.master_products?.warranty_type?.replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ConditionBadge condition={unit.condition_status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{formatCurrency(unit.selling_price)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StockStatusBadge status={unit.stock_status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(unit.received_at)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{unit.imei}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <p className="text-xs text-muted-foreground">{units.length} unit ditampilkan</p>
            </div>
          </div>
        ) : (
          /* ── Compact View (Sales Mode) ── */
          <>
            <p className="text-xs text-muted-foreground">Tampilan ringkas untuk pengecekan cepat di etalase.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {units.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  className="bg-card rounded-xl border border-border p-4 text-left hover:shadow-md hover:border-border/70 transition-all duration-150 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {unit.master_products?.series} {unit.master_products?.storage_gb}GB
                      </p>
                      <p className="text-xs text-muted-foreground">{unit.master_products?.color}</p>
                    </div>
                    <StockStatusBadge status={unit.stock_status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <ConditionBadge condition={unit.condition_status} />
                    <p className="text-sm font-bold text-foreground">{formatCurrency(unit.selling_price)}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{unit.master_products?.warranty_type?.replace(/_/g, " ")} · Masuk {formatDate(unit.received_at)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AddUnitModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={handleRefresh} />
      <UnitDetailDrawer unit={selectedUnit} onClose={() => setSelectedUnit(null)} onUpdate={handleRefresh} />

      {/* Export empty-state modal */}
      {exportEmptyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setExportEmptyOpen(false)} />
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--status-minus-bg))] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[hsl(var(--status-minus-fg))]" />
              </div>
              <button onClick={() => setExportEmptyOpen(false)} className="p-1 rounded-lg hover:bg-accent">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Ekspor Tidak Dapat Dilakukan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tidak ada data yang dapat diekspor saat ini. Pastikan terdapat unit yang sesuai dengan filter aktif, atau reset filter untuk menampilkan semua unit.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              {hasActiveFilters && (
                <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => { resetFilters(); setExportEmptyOpen(false); }}>
                  Reset Filter
                </Button>
              )}
              <Button className="flex-1 h-9 text-sm" onClick={() => setExportEmptyOpen(false)}>
                Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

