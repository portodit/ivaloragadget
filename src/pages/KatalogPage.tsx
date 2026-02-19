import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Search, Plus, LayoutGrid, List, Edit3, Eye,
  Archive, RefreshCw, ImageOff, Star, Tag, AlertCircle,
  ExternalLink, Layers, Globe, ShoppingCart, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MasterProduct {
  id: string;
  series: string;
  storage_gb: number;
  color: string;
  category: string;
  warranty_type: string;
  is_active: boolean;
}

interface CatalogProduct {
  id: string;
  product_id: string;
  slug: string | null;
  display_name: string;
  short_description: string | null;
  full_description: string | null;
  thumbnail_url: string | null;
  gallery_urls: string[];
  catalog_status: "draft" | "published" | "unpublished";
  publish_to_pos: boolean;
  publish_to_web: boolean;
  publish_to_marketplace: boolean;
  price_strategy: "min_price" | "avg_price" | "fixed";
  override_display_price: number | null;
  highlight_product: boolean;
  show_condition_breakdown: boolean;
  promo_label: string | null;
  updated_at: string;
  // joined from master_products
  master?: MasterProduct;
}

interface StockAggregate {
  product_id: string;
  total: number;
  no_minus: number;
  minus: number;
  min_price: number | null;
  avg_price: number | null;
  max_price: number | null;
}

type ViewMode = "grid" | "table";
type PriceStrategy = "min_price" | "avg_price" | "fixed";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number | null | undefined) {
  if (!n) return "—";
  return "Rp" + n.toLocaleString("id-ID");
}

function catalogStatusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    draft:       { label: "Draft",       class: "bg-muted text-muted-foreground" },
    published:   { label: "Published",   class: "bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))]" },
    unpublished: { label: "Unpublished", class: "bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]" },
  };
  const s = map[status] ?? map.draft;
  return <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.class}`}>{s.label}</span>;
}

function PriceDisplay({ cat, agg }: { cat: CatalogProduct; agg?: StockAggregate }) {
  if (agg?.total === 0 || !agg) return <span className="text-[hsl(var(--status-lost-fg))] text-xs font-semibold">Stok Habis</span>;
  if (cat.price_strategy === "fixed" && cat.override_display_price) {
    return <span className="font-semibold text-foreground text-sm">{formatRupiah(cat.override_display_price)}</span>;
  }
  if (cat.price_strategy === "avg_price" && agg.avg_price) {
    return <><span className="text-xs text-muted-foreground">Rata-rata </span><span className="font-semibold text-foreground text-sm">{formatRupiah(agg.avg_price)}</span></>;
  }
  return <><span className="text-xs text-muted-foreground">Mulai dari </span><span className="font-semibold text-foreground text-sm">{formatRupiah(agg.min_price)}</span></>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KatalogPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = role === "super_admin";

  const [catalogs, setCatalogs] = useState<CatalogProduct[]>([]);
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [stockAgg, setStockAgg] = useState<StockAggregate[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<CatalogProduct | null>(null);
  const [detailItem, setDetailItem] = useState<CatalogProduct | null>(null);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, masterRes, stockRes] = await Promise.all([
        db.from("catalog_products").select("*").order("updated_at", { ascending: false }),
        db.from("master_products").select("*").eq("is_active", true).is("deleted_at", null),
        db.from("stock_units").select("product_id, selling_price, condition_status").eq("stock_status", "available"),
      ]);

      const masters: MasterProduct[] = masterRes.data ?? [];
      const rawCatalogs: CatalogProduct[] = catRes.data ?? [];
      const rawStock = stockRes.data ?? [];

      // Aggregate stock per product
      const aggMap: Record<string, StockAggregate> = {};
      for (const unit of rawStock) {
        if (!aggMap[unit.product_id]) {
          aggMap[unit.product_id] = { product_id: unit.product_id, total: 0, no_minus: 0, minus: 0, min_price: null, avg_price: null, max_price: null };
        }
        const a = aggMap[unit.product_id];
        a.total++;
        if (unit.condition_status === "no_minus") a.no_minus++; else a.minus++;
        const p = unit.selling_price;
        if (p) {
          a.min_price = a.min_price === null ? p : Math.min(a.min_price, p);
          a.max_price = a.max_price === null ? p : Math.max(a.max_price, p);
        }
      }
      // Compute avg
      const priceByProd: Record<string, number[]> = {};
      for (const unit of rawStock) {
        if (unit.selling_price) {
          priceByProd[unit.product_id] = [...(priceByProd[unit.product_id] ?? []), unit.selling_price];
        }
      }
      for (const pid in priceByProd) {
        const arr = priceByProd[pid];
        if (aggMap[pid]) aggMap[pid].avg_price = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      }

      setStockAgg(Object.values(aggMap));

      // Join master data into catalog
      const masterMap: Record<string, MasterProduct> = {};
      masters.forEach(m => masterMap[m.id] = m);
      setCatalogs(rawCatalogs.map(c => ({ ...c, master: masterMap[c.product_id] })));
      setMasterProducts(masters);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = catalogs.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.display_name.toLowerCase().includes(q) ||
      c.master?.series.toLowerCase().includes(q) ||
      c.master?.color.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || c.catalog_status === filterStatus;
    const matchCategory = filterCategory === "all" || c.master?.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  // Already in catalog product_ids
  const inCatalogIds = new Set(catalogs.map(c => c.product_id));
  const availableToAdd = masterProducts.filter(m => !inCatalogIds.has(m.id));

  const getAgg = (product_id: string) => stockAgg.find(a => a.product_id === product_id);

  // ── Toggle publish ──────────────────────────────────────────────────────────
  async function toggleStatus(cat: CatalogProduct) {
    const newStatus = cat.catalog_status === "published" ? "unpublished" : "published";
    const { error } = await db.from("catalog_products").update({ catalog_status: newStatus }).eq("id", cat.id);
    if (error) { toast({ title: "Gagal mengubah status", variant: "destructive" }); return; }
    await logActivity({
      action: newStatus === "published" ? "publish_catalog" : "unpublish_catalog",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      target_id: cat.product_id,
      metadata: { display_name: cat.display_name, status: newStatus },
    });
    toast({ title: newStatus === "published" ? "Produk dipublish" : "Produk di-unpublish" });
    fetchAll();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function deleteCatalog(cat: CatalogProduct) {
    if (!confirm(`Hapus "${cat.display_name}" dari katalog?`)) return;
    const { error } = await db.from("catalog_products").delete().eq("id", cat.id);
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); return; }
    await logActivity({
      action: "delete_catalog",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      target_id: cat.product_id, metadata: { display_name: cat.display_name },
    });
    toast({ title: "Produk dihapus dari katalog" });
    fetchAll();
  }

  // ── Summary stats ───────────────────────────────────────────────────────────
  const stats = {
    total: catalogs.length,
    published: catalogs.filter(c => c.catalog_status === "published").length,
    draft: catalogs.filter(c => c.catalog_status === "draft").length,
    outOfStock: catalogs.filter(c => (getAgg(c.product_id)?.total ?? 0) === 0).length,
  };

  return (
    <DashboardLayout pageTitle="Katalog Produk">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Katalog Produk</h2>
            <p className="text-sm text-muted-foreground">
              Kelola tampilan produk untuk kebutuhan penjualan dan distribusi.
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Tambah ke Katalog
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total SKU", value: stats.total, icon: BookOpen },
            { label: "Published", value: stats.published, icon: Globe },
            { label: "Draft", value: stats.draft, icon: Archive },
            { label: "Stok Habis", value: stats.outOfStock, icon: AlertCircle },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + View toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari seri atau varian produk…" className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="iphone">iPhone</SelectItem>
              <SelectItem value="ipad">iPad</SelectItem>
              <SelectItem value="accessory">Aksesori</SelectItem>
            </SelectContent>
          </Select>
          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden shrink-0">
            <button onClick={() => setViewMode("grid")}
              className={cn("px-3 py-2 transition-colors", viewMode === "grid" ? "bg-foreground text-background" : "hover:bg-accent text-muted-foreground")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("table")}
              className={cn("px-3 py-2 transition-colors", viewMode === "table" ? "bg-foreground text-background" : "hover:bg-accent text-muted-foreground")}>
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {catalogs.length === 0 ? "Belum ada produk yang ditampilkan dalam katalog." : "Tidak ada produk yang sesuai dengan filter yang dipilih."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {catalogs.length === 0 && isSuperAdmin ? "Klik \"Tambah ke Katalog\" untuk memulai." : "Coba ubah filter pencarian."}
              </p>
            </div>
            {catalogs.length === 0 && isSuperAdmin && (
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Tambahkan Produk ke Katalog
              </Button>
            )}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-5 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid View */}
        {!loading && viewMode === "grid" && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(cat => {
              const agg = getAgg(cat.product_id);
              const outOfStock = (agg?.total ?? 0) === 0;
              return (
                <div key={cat.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-muted/50 flex items-center justify-center overflow-hidden">
                    {cat.thumbnail_url ? (
                      <img src={cat.thumbnail_url} alt={cat.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                        <ImageOff className="w-10 h-10" />
                        <span className="text-[10px]">No Image Available</span>
                      </div>
                    )}
                    {/* Overlays */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {catalogStatusBadge(cat.catalog_status)}
                      {cat.highlight_product && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--status-coming-soon-bg))] text-[hsl(var(--status-coming-soon-fg))]">
                          <Star className="w-2.5 h-2.5" /> Unggulan
                        </span>
                      )}
                      {cat.promo_label && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]">
                          <Tag className="w-2.5 h-2.5" /> {cat.promo_label}
                        </span>
                      )}
                    </div>
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">Stok Habis</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm leading-tight">{cat.display_name}</p>
                      {cat.short_description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.short_description}</p>
                      )}
                    </div>
                    <div className="mt-auto space-y-1.5">
                      <PriceDisplay cat={cat} agg={agg} />
                      {!outOfStock && agg && (
                        <p className="text-xs text-muted-foreground">
                          {agg.total} unit tersedia
                          {cat.show_condition_breakdown && agg.no_minus + agg.minus > 0 && (
                            <span className="ml-1 text-[10px]">
                              ({agg.no_minus} no-minus, {agg.minus} minus)
                            </span>
                          )}
                        </p>
                      )}
                      {/* Publish channels */}
                      <div className="flex gap-1 flex-wrap">
                        {cat.publish_to_pos && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5"><Store className="w-2.5 h-2.5" /> POS</span>}
                        {cat.publish_to_web && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" /> Web</span>}
                        {cat.publish_to_marketplace && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5"><ShoppingCart className="w-2.5 h-2.5" /> Marketplace</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-border px-4 py-2.5 flex items-center gap-2">
                    <button onClick={() => setDetailItem(cat)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                      <Eye className="w-3.5 h-3.5" /> Detail
                    </button>
                    {(isSuperAdmin || role === "admin") && (
                      <button onClick={() => setEditItem(cat)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button onClick={() => toggleStatus(cat)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                        {cat.catalog_status === "published" ? <Archive className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                        {cat.catalog_status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {!loading && viewMode === "table" && filtered.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produk</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Harga Tampil</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Stok</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Publish</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cat => {
                    const agg = getAgg(cat.product_id);
                    const outOfStock = (agg?.total ?? 0) === 0;
                    return (
                      <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                              {cat.thumbnail_url
                                ? <img src={cat.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                : <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                              }
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{cat.display_name}</p>
                              {cat.master && (
                                <p className="text-[10px] text-muted-foreground capitalize">{cat.master.category} · {cat.master.warranty_type}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <PriceDisplay cat={cat} agg={agg} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {outOfStock
                            ? <span className="text-xs text-[hsl(var(--status-lost-fg))]">Stok Habis</span>
                            : <span className="text-xs text-foreground font-medium">{agg?.total} unit</span>
                          }
                        </td>
                        <td className="px-4 py-3">{catalogStatusBadge(cat.catalog_status)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex gap-1">
                            {cat.publish_to_pos && <Badge variant="outline" className="text-[10px] py-0 h-5"><Store className="w-2.5 h-2.5 mr-0.5" />POS</Badge>}
                            {cat.publish_to_web && <Badge variant="outline" className="text-[10px] py-0 h-5"><Globe className="w-2.5 h-2.5 mr-0.5" />Web</Badge>}
                            {cat.publish_to_marketplace && <Badge variant="outline" className="text-[10px] py-0 h-5"><ShoppingCart className="w-2.5 h-2.5 mr-0.5" />MKT</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setDetailItem(cat)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                              <Eye className="w-4 h-4" />
                            </button>
                            {(isSuperAdmin || role === "admin") && (
                              <button onClick={() => setEditItem(cat)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button onClick={() => toggleStatus(cat)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                                {cat.catalog_status === "published" ? <Archive className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} dari {catalogs.length} entri katalog · © 2026 Tim IT Ivalora Gadget
        </p>
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <AddCatalogModal
          masterProducts={availableToAdd}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchAll(); }}
          user={user}
          role={role}
        />
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <EditCatalogModal
          item={editItem}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); fetchAll(); }}
          onDelete={isSuperAdmin ? () => { deleteCatalog(editItem); setEditItem(null); } : undefined}
          user={user}
          role={role}
        />
      )}

      {/* ── Detail Modal ── */}
      {detailItem && (
        <DetailCatalogModal
          item={detailItem}
          agg={getAgg(detailItem.product_id)}
          onClose={() => setDetailItem(null)}
        />
      )}
    </DashboardLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Add Modal
// ══════════════════════════════════════════════════════════════════════════════
interface AddModalProps {
  masterProducts: MasterProduct[];
  onClose: () => void;
  onSaved: () => void;
  user: { id: string; email?: string } | null;
  role: string | null;
}

function AddCatalogModal({ masterProducts, onClose, onSaved, user, role }: AddModalProps) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [priceStrategy, setPriceStrategy] = useState<PriceStrategy>("min_price");
  const [overridePrice, setOverridePrice] = useState("");
  const [publishPos, setPublishPos] = useState(false);
  const [publishWeb, setPublishWeb] = useState(false);
  const [publishMarket, setPublishMarket] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [promoLabel, setPromoLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-fill display name when product selected
  useEffect(() => {
    const mp = masterProducts.find(m => m.id === selectedId);
    if (mp) {
      setDisplayName(`${mp.series} ${mp.storage_gb}GB ${mp.color}`);
    }
  }, [selectedId, masterProducts]);

  async function handleSave() {
    if (!selectedId || !displayName.trim()) {
      toast({ title: "Pilih produk dan isi nama tampil", variant: "destructive" }); return;
    }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const slug = displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { error } = await db.from("catalog_products").insert({
      product_id: selectedId,
      slug,
      display_name: displayName.trim(),
      short_description: shortDesc.trim() || null,
      catalog_status: "draft",
      publish_to_pos: publishPos,
      publish_to_web: publishWeb,
      publish_to_marketplace: publishMarket,
      price_strategy: priceStrategy,
      override_display_price: priceStrategy === "fixed" && overridePrice ? Number(overridePrice) : null,
      highlight_product: highlight,
      promo_label: promoLabel.trim() || null,
      show_condition_breakdown: true,
      created_by: user?.id,
      updated_by: user?.id,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") { toast({ title: "Produk ini sudah ada di katalog", variant: "destructive" }); }
      else toast({ title: "Gagal menambahkan", description: error.message, variant: "destructive" });
      return;
    }
    await logActivity({
      action: "create_catalog",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      target_id: selectedId, metadata: { display_name: displayName.trim() },
    });
    toast({ title: "Produk berhasil ditambahkan ke katalog" });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Produk ke Katalog</DialogTitle>
          <p className="text-xs text-muted-foreground">Data stok akan diambil otomatis dari unit yang tersedia.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Select product */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pilih Produk (SKU)</label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih produk dari Master Data…" />
              </SelectTrigger>
              <SelectContent>
                {masterProducts.length === 0
                  ? <SelectItem value="none" disabled>Semua produk sudah ada di katalog</SelectItem>
                  : masterProducts.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.series} {m.storage_gb}GB {m.color} — {m.category}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Display name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Tampil</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nama yang ditampilkan ke tim sales" />
          </div>

          {/* Short desc */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Singkat</label>
            <Input value={shortDesc} onChange={e => setShortDesc(e.target.value)} placeholder="Deskripsi singkat untuk tampilan kartu (opsional)" />
          </div>

          {/* Price strategy */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Strategi Harga Tampil</label>
            <p className="text-[11px] text-muted-foreground">Harga tampilan tidak mengubah harga aktual unit.</p>
            <div className="space-y-2">
              {([
                { value: "min_price", label: "Gunakan Harga Terendah Otomatis" },
                { value: "avg_price", label: "Gunakan Harga Rata-Rata" },
                { value: "fixed", label: "Gunakan Harga Tetap (Override)" },
              ] as { value: PriceStrategy; label: string }[]).map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${priceStrategy === opt.value ? "border-foreground bg-foreground" : "border-border"}`}
                    onClick={() => setPriceStrategy(opt.value)}>
                    {priceStrategy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                  </div>
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
            {priceStrategy === "fixed" && (
              <Input type="number" value={overridePrice} onChange={e => setOverridePrice(e.target.value)}
                placeholder="Masukkan harga tetap (Rp)" className="mt-2" />
            )}
          </div>

          {/* Publish channels */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Publish ke Kanal</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "pos", label: "POS", icon: Store, state: publishPos, set: setPublishPos },
                { key: "web", label: "Website", icon: Globe, state: publishWeb, set: setPublishWeb },
                { key: "market", label: "Marketplace", icon: ShoppingCart, state: publishMarket, set: setPublishMarket },
              ].map(ch => (
                <button key={ch.key} type="button" onClick={() => ch.set(!ch.state)}
                  className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all",
                    ch.state ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30")}>
                  <ch.icon className="w-4 h-4" />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight & Promo */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setHighlight(!highlight)}
              className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${highlight ? "border-yellow-400 bg-yellow-50 text-yellow-800" : "border-border text-muted-foreground"}`}>
              <Star className="w-3.5 h-3.5" /> Produk Unggulan
            </button>
          </div>
          {highlight && (
            <Input value={promoLabel} onChange={e => setPromoLabel(e.target.value)}
              placeholder="Label promo (contoh: Hot Deal, Terlaris) — opsional" />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || !selectedId}>
            {saving ? "Menyimpan…" : "Simpan ke Katalog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Edit Modal
// ══════════════════════════════════════════════════════════════════════════════
interface EditModalProps {
  item: CatalogProduct;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
  user: { id: string; email?: string } | null;
  role: string | null;
}

function EditCatalogModal({ item, isSuperAdmin, onClose, onSaved, onDelete, user, role }: EditModalProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(item.display_name);
  const [shortDesc, setShortDesc] = useState(item.short_description ?? "");
  const [fullDesc, setFullDesc] = useState(item.full_description ?? "");
  const [priceStrategy, setPriceStrategy] = useState<PriceStrategy>(item.price_strategy);
  const [overridePrice, setOverridePrice] = useState(item.override_display_price?.toString() ?? "");
  const [publishPos, setPublishPos] = useState(item.publish_to_pos);
  const [publishWeb, setPublishWeb] = useState(item.publish_to_web);
  const [publishMarket, setPublishMarket] = useState(item.publish_to_marketplace);
  const [highlight, setHighlight] = useState(item.highlight_product);
  const [showCondition, setShowCondition] = useState(item.show_condition_breakdown);
  const [promoLabel, setPromoLabel] = useState(item.promo_label ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnail_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${item.product_id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("catalog-images").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Gagal upload gambar", variant: "destructive" }); setUploading(false); return; }
    const { data } = supabase.storage.from("catalog-images").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSave() {
    if (!displayName.trim()) { toast({ title: "Nama tampil wajib diisi", variant: "destructive" }); return; }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const updateData: Record<string, unknown> = {
      display_name: displayName.trim(),
      short_description: shortDesc.trim() || null,
      full_description: fullDesc.trim() || null,
      thumbnail_url: thumbnailUrl || null,
      show_condition_breakdown: showCondition,
      updated_by: user?.id,
    };
    if (isSuperAdmin) {
      Object.assign(updateData, {
        publish_to_pos: publishPos,
        publish_to_web: publishWeb,
        publish_to_marketplace: publishMarket,
        price_strategy: priceStrategy,
        override_display_price: priceStrategy === "fixed" && overridePrice ? Number(overridePrice) : null,
        highlight_product: highlight,
        promo_label: promoLabel.trim() || null,
      });
    }

    const { error } = await db.from("catalog_products").update(updateData).eq("id", item.id);
    setSaving(false);
    if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); return; }
    await logActivity({
      action: "update_catalog",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      target_id: item.product_id, metadata: { display_name: displayName.trim() },
    });
    toast({ title: "Katalog berhasil diperbarui", description: "Perubahan tidak memengaruhi harga aktual unit di stok." });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Produk Katalog</DialogTitle>
          <p className="text-xs text-muted-foreground">Perubahan tidak memengaruhi harga aktual unit di stok.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Thumbnail */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Foto Utama</label>
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                {thumbnailUrl
                  ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  : <ImageOff className="w-6 h-6 text-muted-foreground/40" />
                }
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full">
                  {uploading ? "Mengunggah…" : "Pilih Gambar"}
                </Button>
                <Input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)}
                  placeholder="Atau masukkan URL gambar" className="text-xs" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Tampil</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Singkat</label>
            <Input value={shortDesc} onChange={e => setShortDesc(e.target.value)} placeholder="Deskripsi untuk kartu produk" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Lengkap</label>
            <textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)}
              placeholder="Deskripsi lengkap untuk halaman detail"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Super admin only fields */}
          {isSuperAdmin && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Strategi Harga Tampil</label>
                <p className="text-[11px] text-muted-foreground">Harga tampilan tidak mengubah harga aktual unit.</p>
                <div className="space-y-2">
                  {([
                    { value: "min_price", label: "Harga Terendah Otomatis" },
                    { value: "avg_price", label: "Harga Rata-Rata" },
                    { value: "fixed", label: "Harga Tetap (Override)" },
                  ] as { value: PriceStrategy; label: string }[]).map(opt => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${priceStrategy === opt.value ? "border-foreground bg-foreground" : "border-border"}`}
                        onClick={() => setPriceStrategy(opt.value)}>
                        {priceStrategy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                      </div>
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {priceStrategy === "fixed" && (
                  <Input type="number" value={overridePrice} onChange={e => setOverridePrice(e.target.value)}
                    placeholder="Harga tetap (Rp)" />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Publish ke Kanal</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "POS", icon: Store, state: publishPos, set: setPublishPos },
                    { label: "Website", icon: Globe, state: publishWeb, set: setPublishWeb },
                    { label: "Marketplace", icon: ShoppingCart, state: publishMarket, set: setPublishMarket },
                  ].map(ch => (
                    <button key={ch.label} type="button" onClick={() => ch.set(!ch.state)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${ch.state ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground"}`}>
                      <ch.icon className="w-4 h-4" /> {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setHighlight(!highlight)}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${highlight ? "border-yellow-400 bg-yellow-50 text-yellow-800" : "border-border text-muted-foreground"}`}>
                  <Star className="w-3.5 h-3.5" /> Produk Unggulan
                </button>
                <button type="button" onClick={() => setShowCondition(!showCondition)}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${showCondition ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground"}`}>
                  <Layers className="w-3.5 h-3.5" /> Tampilkan Kondisi
                </button>
              </div>
              <Input value={promoLabel} onChange={e => setPromoLabel(e.target.value)}
                placeholder="Label promo (opsional, contoh: Hot Deal)" />
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDelete && (
            <Button variant="destructive" onClick={onDelete} className="sm:mr-auto">Hapus dari Katalog</Button>
          )}
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Detail Modal
// ══════════════════════════════════════════════════════════════════════════════
interface DetailModalProps {
  item: CatalogProduct;
  agg?: StockAggregate;
  onClose: () => void;
}

function DetailCatalogModal({ item, agg, onClose }: DetailModalProps) {
  const outOfStock = (agg?.total ?? 0) === 0;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Katalog Produk</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Thumbnail */}
          <div className="aspect-video w-full rounded-xl bg-muted overflow-hidden flex items-center justify-center">
            {item.thumbnail_url
              ? <img src={item.thumbnail_url} alt={item.display_name} className="w-full h-full object-cover" />
              : <div className="flex flex-col items-center gap-2 text-muted-foreground/40"><ImageOff className="w-12 h-12" /><span className="text-xs">No Image Available</span></div>
            }
          </div>

          {/* Info */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground">{item.display_name}</h3>
              {catalogStatusBadge(item.catalog_status)}
            </div>
            {item.short_description && <p className="text-sm text-muted-foreground">{item.short_description}</p>}
          </div>

          {/* Price & stock */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Harga Tampil</span>
              <PriceDisplay cat={item} agg={agg} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ketersediaan</span>
              <span className={`text-sm font-semibold ${outOfStock ? "text-[hsl(var(--status-lost-fg))]" : "text-foreground"}`}>
                {outOfStock ? "Stok Habis" : `${agg?.total} unit tersedia`}
              </span>
            </div>
            {item.show_condition_breakdown && !outOfStock && agg && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Breakdown Kondisi</span>
                <span className="text-xs text-foreground">{agg.no_minus} No Minus · {agg.minus} Minus</span>
              </div>
            )}
          </div>

          {/* Publish channels */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kanal Distribusi</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "POS", active: item.publish_to_pos, icon: Store },
                { label: "Website", active: item.publish_to_web, icon: Globe },
                { label: "Marketplace", active: item.publish_to_marketplace, icon: ShoppingCart },
              ].map(ch => (
                <div key={ch.label} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${ch.active ? "border-foreground text-foreground bg-foreground/5" : "border-border text-muted-foreground/50"}`}>
                  <ch.icon className="w-3.5 h-3.5" /> {ch.label}
                  {!ch.active && <span className="ml-1 text-[10px]">(nonaktif)</span>}
                </div>
              ))}
            </div>
          </div>

          {item.full_description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Lengkap</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.full_description}</p>
            </div>
          )}

          {/* Master product info */}
          {item.master && (
            <div className="border-t border-border pt-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data SKU</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Seri</span><span className="text-foreground">{item.master.series}</span>
                <span className="text-muted-foreground">Storage</span><span className="text-foreground">{item.master.storage_gb}GB</span>
                <span className="text-muted-foreground">Warna</span><span className="text-foreground">{item.master.color}</span>
                <span className="text-muted-foreground">Kategori</span><span className="text-foreground capitalize">{item.master.category}</span>
                <span className="text-muted-foreground">Garansi</span><span className="text-foreground">{item.master.warranty_type}</span>
              </div>
            </div>
          )}

          {/* Redirect to stock */}
          <Button variant="outline" className="w-full flex items-center gap-2" asChild>
            <a href={`/stok-imei?product_id=${item.product_id}`}>
              <ExternalLink className="w-4 h-4" /> Lihat Unit Tersedia di Stok IMEI
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
