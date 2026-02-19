import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, LayoutGrid, List, X, RefreshCw, Download, AlertCircle, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { StockStatusBadge, ConditionBadge } from "@/components/stock-units/StockBadges";
import { AddUnitModal } from "@/components/stock-units/AddUnitModal";
import { UnitDetailDrawer } from "@/components/stock-units/UnitDetailDrawer";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  StockUnit,
  StockStatus,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_STYLES,
  SOLD_CHANNEL_SHORT,
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
  const { toast } = useToast();
  const isSuperAdmin = role === "super_admin";

  const [units, setUnits] = useState<StockUnit[]>([]);
  const [summary, setSummary] = useState<SummaryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "compact">("table");

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<Set<StockStatus>>(new Set(DEFAULT_STATUSES));
  const [filterSeries, setFilterSeries] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [allSeries, setAllSeries] = useState<string[]>([]);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
  const seriesRef = useRef<HTMLDivElement>(null);

   // Date filter
   const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<StockUnit | null>(null);
  const [exportEmptyOpen, setExportEmptyOpen] = useState(false);

  // Bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Close series dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (seriesRef.current && !seriesRef.current.contains(e.target as Node)) {
        setSeriesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch all unique series from master_products
  const fetchAllSeries = useCallback(async () => {
    const { data } = await supabase
      .from("master_products")
      .select("series")
      .is("deleted_at", null)
      .eq("is_active", true);
    if (data) {
      const unique = Array.from(new Set(data.map((d: { series: string }) => d.series))).sort();
      setAllSeries(unique);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);

    const activeStatuses = Array.from(filterStatuses);

    let query = supabase
      .from("stock_units")
      .select(`*, master_products(series, storage_gb, color, warranty_type, category)`)
      .in("stock_status", activeStatuses)
      .order("received_at", { ascending: false });

    if (filterCondition === "no_minus") query = query.eq("condition_status", "no_minus" as never);
    else if (filterCondition === "minus") query = query.eq("condition_status", "minus" as never);
    else if (filterCondition === "minus_minor") {
      query = query.eq("condition_status", "minus" as never).eq("minus_severity", "minor" as never);
    } else if (filterCondition === "minus_mayor") {
      query = query.eq("condition_status", "minus" as never).eq("minus_severity", "mayor" as never);
    }
    if (filterSeries !== "all") query = query.ilike("master_products.series" as never, `%${filterSeries}%`);

     // Date filter
     if (dateRange?.from) {
       const fromStr = format(dateRange.from, "yyyy-MM-dd");
       query = query.gte("received_at", fromStr as never);
     }
     if (dateRange?.to) {
       const toDate = new Date(dateRange.to);
       toDate.setDate(toDate.getDate() + 1);
       const toStr = format(toDate, "yyyy-MM-dd");
      query = query.lt("received_at", toStr as never);
    }

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
  }, [search, filterStatuses, filterSeries, filterCondition, dateRange]);

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
  useEffect(() => { fetchAllSeries(); }, [fetchAllSeries]);

  const handleRefresh = () => { fetchUnits(); fetchSummary(); setSelectedIds(new Set()); setConfirmBulkDelete(false); };
  const isDefaultFilter = filterStatuses.size === DEFAULT_STATUSES.length && DEFAULT_STATUSES.every(s => filterStatuses.has(s));
  const resetFilters = () => { setSearch(""); setFilterStatuses(new Set(DEFAULT_STATUSES)); setFilterSeries("all"); setFilterCondition("all"); setDateRange(undefined); setSeriesSearch(""); };

  const hasActiveFilters = search || !isDefaultFilter || filterSeries !== "all" || filterCondition !== "all" || dateRange?.from;

  const filteredSeriesList = allSeries.filter(s => s.toLowerCase().includes(seriesSearch.toLowerCase()));

  // Bulk delete
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === units.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(units.map(u => u.id)));
  };
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase.from("stock_units").delete().in("id", Array.from(selectedIds));
    setBulkDeleting(false);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${selectedIds.size} unit berhasil dihapus` });
    handleRefresh();
  };

   const dateLabel = () => {
     if (dateRange?.from && dateRange?.to) return `${format(dateRange.from, "dd MMM", { locale: localeId })} — ${format(dateRange.to, "dd MMM yy", { locale: localeId })}`;
     if (dateRange?.from) return format(dateRange.from, "dd MMM yy", { locale: localeId });
     return "Tanggal";
   };

  return (
    <DashboardLayout pageTitle="Stok IMEI">
      <div className="space-y-4 sm:space-y-5">
        {/* ── Page header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Stok IMEI</h1>
            <p className="text-xs text-muted-foreground">Kelola dan pantau seluruh unit berbasis IMEI secara real-time.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1.5 text-xs" onClick={handleRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 gap-1.5 text-xs"
              onClick={() => {
                if (units.length === 0) { setExportEmptyOpen(true); return; }
                const csvRows = units.map((u) => {
                  const prod = `${u.master_products?.series ?? ""} ${u.master_products?.storage_gb ? u.master_products.storage_gb + "GB" : ""}`.trim();
                  const color = u.master_products?.color ?? "";
                  const warranty = u.master_products?.warranty_type?.replace(/_/g, " ") ?? "";
                  const kondisi = u.condition_status === "no_minus" ? "No Minus" : "Ada Minus";
                  const hargaJual = u.selling_price != null ? u.selling_price.toString() : "";
                  const status = u.stock_status === "sold" && u.sold_channel ? `Terjual ${SOLD_CHANNEL_SHORT[u.sold_channel]}` : u.stock_status;
                  const tanggal = u.received_at ? new Date(u.received_at).toLocaleDateString("id-ID") : "";
                  if (isSuperAdmin) {
                    return [u.imei, prod, color, warranty, kondisi, hargaJual, u.cost_price?.toString() ?? "", status, u.supplier ?? "", u.batch_code ?? "", tanggal].join(",");
                  }
                  return [prod, color, warranty, kondisi, hargaJual, status, tanggal].join(",");
                });
                const csvHeaders = isSuperAdmin
                  ? ["IMEI", "Produk", "Warna", "Tipe", "Kondisi", "Harga Jual", "Harga Beli", "Status", "Supplier", "Batch", "Tanggal Masuk"]
                  : ["Produk", "Warna", "Tipe", "Kondisi", "Harga Jual", "Status", "Tanggal Masuk"];
                const csv = [csvHeaders.join(","), ...csvRows].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `stok-imei-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor</span>
            </Button>
            {isSuperAdmin && (
              <Button size="sm" className="h-8 sm:h-9 gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Tambah Unit</span>
                <span className="xs:hidden">Tambah</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Summary bar (multi-select) ── */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
          {ALL_STATUSES.map((s) => {
            const count = summary.find((c) => c.status === s)?.count ?? 0;
            const style = STOCK_STATUS_STYLES[s];
            const isActive = filterStatuses.has(s);
            return (
              <button
                key={s}
                onClick={() => {
                  setFilterStatuses(prev => {
                    const next = new Set(prev);
                    if (next.has(s)) {
                      next.delete(s);
                      if (next.size === 0) next.add(s);
                    } else {
                      next.add(s);
                    }
                    return next;
                  });
                }}
                className={`rounded-xl border p-2 sm:p-3 text-left transition-all duration-150 hover:shadow-sm ${
                  isActive ? `${style.bg} border-transparent` : "bg-card border-border hover:border-border/70"
                }`}
              >
                <p className={`text-lg sm:text-xl font-bold leading-none ${isActive ? style.text : "text-foreground"}`}>{count}</p>
                <p className={`text-[9px] sm:text-[10px] mt-1 font-medium uppercase tracking-wider ${isActive ? style.text : "text-muted-foreground"} truncate`}>
                  {STOCK_STATUS_LABELS[s]}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Filter & Search panel ── */}
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 space-y-3">
          {/* Row 1: Search + desktop filters */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari IMEI atau seri…"
                className="pl-9 h-9 text-sm"
              />
            </div>
            {/* Condition filter */}
            <div className="hidden sm:block">
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue placeholder="Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kondisi</SelectItem>
                  <SelectItem value="no_minus">No Minus</SelectItem>
                  <SelectItem value="minus">Ada Minus</SelectItem>
                  <SelectItem value="minus_minor">Minus Minor</SelectItem>
                  <SelectItem value="minus_mayor">Minus Mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Searchable series filter */}
            <div className="hidden sm:block relative" ref={seriesRef}>
              <div
                className="h-9 w-48 flex items-center border border-input rounded-md bg-background px-3 cursor-pointer text-sm"
                onClick={() => setSeriesDropdownOpen(!seriesDropdownOpen)}
              >
                <span className={cn("flex-1 truncate", filterSeries === "all" && "text-muted-foreground")}>
                  {filterSeries === "all" ? "Semua Seri" : filterSeries}
                </span>
                <Search className="w-3 h-3 text-muted-foreground shrink-0 ml-1" />
              </div>
              {seriesDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-border">
                    <Input
                      value={seriesSearch}
                      onChange={(e) => setSeriesSearch(e.target.value)}
                      placeholder="Cari seri..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    <button
                      type="button"
                      onClick={() => { setFilterSeries("all"); setSeriesDropdownOpen(false); setSeriesSearch(""); }}
                      className={cn("w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors", filterSeries === "all" && "bg-accent font-medium")}
                    >
                      Semua Seri
                    </button>
                    {filteredSeriesList.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setFilterSeries(s); setSeriesDropdownOpen(false); setSeriesSearch(""); }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors", filterSeries === s && "bg-accent font-medium")}
                      >
                        {s}
                      </button>
                    ))}
                    {filteredSeriesList.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Tidak ditemukan</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Date filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                   className={cn("h-9 gap-1.5 text-xs hidden sm:flex", dateRange?.from && "border-primary text-primary")}
                 >
                   <CalendarIcon className="w-3.5 h-3.5" />
                   {dateLabel()}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="start">
                 <div className="p-3 space-y-2">
                   <p className="text-xs font-medium text-muted-foreground">Pilih tanggal atau rentang tanggal</p>
                   <Calendar
                     mode="range"
                     selected={dateRange}
                     onSelect={setDateRange}
                     numberOfMonths={1}
                     className={cn("p-0 pointer-events-auto")}
                     locale={localeId}
                   />
                   {dateRange?.from && (
                     <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDateRange(undefined)}>
                       Reset Tanggal
                     </Button>
                   )}
                 </div>
               </PopoverContent>
            </Popover>
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
          {/* Mobile filters */}
          <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
            {[
              { v: "all", label: "Semua" },
              { v: "no_minus", label: "No Minus" },
              { v: "minus", label: "Ada Minus" },
              { v: "minus_minor", label: "Minor" },
              { v: "minus_mayor", label: "Mayor" },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setFilterCondition(v)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  filterCondition === v
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Mobile: series & date row */}
          <div className="flex sm:hidden gap-2">
            <Select value={filterSeries} onValueChange={setFilterSeries}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue placeholder="Seri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Seri</SelectItem>
                {allSeries.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                   className={cn("h-8 gap-1 text-[11px] shrink-0", dateRange?.from && "border-primary text-primary")}
                 >
                   <CalendarIcon className="w-3 h-3" />
                   {dateRange?.from ? dateLabel() : "Tanggal"}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="end">
                 <div className="p-3 space-y-2">
                   <p className="text-xs font-medium text-muted-foreground">Pilih tanggal</p>
                   <Calendar
                     mode="range"
                     selected={dateRange}
                     onSelect={setDateRange}
                     numberOfMonths={1}
                     className={cn("p-0 pointer-events-auto")}
                     locale={localeId}
                   />
                   {dateRange?.from && (
                     <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDateRange(undefined)}>Reset</Button>
                   )}
                 </div>
               </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <button className="shrink-0 px-2 py-1 rounded-full text-[10px] font-medium border border-destructive/30 text-destructive" onClick={resetFilters}>
                Reset
              </button>
            )}
          </div>
          {!isDefaultFilter && (
            <p className="text-xs text-muted-foreground">
              Filter aktif: <span className="font-medium text-foreground">{Array.from(filterStatuses).map(s => STOCK_STATUS_LABELS[s]).join(", ")}</span>
              {" · "}
              <button className="underline" onClick={() => setFilterStatuses(new Set(DEFAULT_STATUSES))}>tampilkan default</button>
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
          <div className="bg-card rounded-xl border border-border p-8 sm:p-12 text-center space-y-3">
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
            {/* Bulk delete bar */}
            {isSuperAdmin && selectedIds.size > 0 && (
              <div className="px-3 sm:px-4 py-2.5 border-b border-border bg-destructive/5 flex items-center justify-between">
                <p className="text-xs font-medium text-destructive">{selectedIds.size} unit dipilih</p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedIds(new Set()); setConfirmBulkDelete(false); }}>Batal</Button>
                  {!confirmBulkDelete ? (
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setConfirmBulkDelete(true)}>
                      <Trash2 className="w-3 h-3" /> Hapus
                    </Button>
                  ) : (
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5" disabled={bulkDeleting} onClick={handleBulkDelete}>
                      {bulkDeleting ? <div className="w-3 h-3 border border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" /> : "Konfirmasi Hapus"}
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {isSuperAdmin && (
                      <th className="w-10 px-3 py-3">
                        <Checkbox
                          checked={units.length > 0 && selectedIds.size === units.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th className="text-left px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produk</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Kondisi</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harga</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Masuk</th>
                    {isSuperAdmin && (
                      <th className="text-left px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">IMEI</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {units.map((unit) => (
                    <tr
                      key={unit.id}
                      className={`hover:bg-accent/40 cursor-pointer transition-colors ${selectedIds.has(unit.id) ? "bg-accent/20" : ""}`}
                      onClick={() => setSelectedUnit(unit)}
                    >
                      {isSuperAdmin && (
                        <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(unit.id)}
                            onCheckedChange={() => toggleSelect(unit.id)}
                          />
                        </td>
                      )}
                      <td className="px-3 sm:px-4 py-3">
                        <p className="font-medium text-foreground text-sm">
                          {unit.master_products?.series} {unit.master_products?.storage_gb}GB
                        </p>
                        <p className="text-xs text-muted-foreground">{unit.master_products?.color} · {unit.master_products?.warranty_type?.replace(/_/g, " ")}</p>
                        {/* Show condition on mobile */}
                        <div className="sm:hidden mt-1">
                          <ConditionBadge condition={unit.condition_status} />
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        <ConditionBadge condition={unit.condition_status} />
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className="font-medium text-foreground text-xs sm:text-sm">{formatCurrency(unit.selling_price)}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <StockStatusBadge status={unit.stock_status} />
                        {unit.stock_status === "sold" && unit.sold_channel && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{SOLD_CHANNEL_SHORT[unit.sold_channel]}</p>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                        {formatDate(unit.received_at)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-3 sm:px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{unit.imei}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 sm:px-4 py-2.5 border-t border-border">
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
                  className="bg-card rounded-xl border border-border p-3 sm:p-4 text-left hover:shadow-md hover:border-border/70 transition-all duration-150 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">
                        {unit.master_products?.series} {unit.master_products?.storage_gb}GB
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{unit.master_products?.color}</p>
                    </div>
                    <StockStatusBadge status={unit.stock_status} className="shrink-0" />
                  </div>
                  <div className="flex items-center justify-between">
                    <ConditionBadge condition={unit.condition_status} />
                    <p className="text-sm font-bold text-foreground">{formatCurrency(unit.selling_price)}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 truncate">{unit.master_products?.warranty_type?.replace(/_/g, " ")} · Masuk {formatDate(unit.received_at)}</p>
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
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-5 sm:p-6 space-y-4">
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
