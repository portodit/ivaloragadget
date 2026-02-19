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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Search, Plus, LayoutGrid, List, Edit3, Eye,
  Archive, RefreshCw, ImageOff, Star, Tag, AlertCircle,
  ExternalLink, Globe, ShoppingCart, Store, X, Upload,
  Ticket, Percent, DollarSign, Trash2, ChevronRight,
  Package, Camera,
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

interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_percent: number | null;
  discount_amount: number | null;
  min_purchase_amount: number | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number | null;
  valid_from: string;
  valid_until: string | null;
  applies_to_all: boolean;
  is_active: boolean;
}

type ViewMode = "grid" | "table";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number | null | undefined) {
  if (!n) return "—";
  return "Rp" + n.toLocaleString("id-ID");
}

function catalogStatusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    draft:       { label: "Draft",       class: "bg-muted text-muted-foreground" },
    published:   { label: "Aktif",       class: "bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))]" },
    unpublished: { label: "Nonaktif",    class: "bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]" },
  };
  const s = map[status] ?? map.draft;
  return <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.class}`}>{s.label}</span>;
}

function PriceDisplay({ agg }: { agg?: StockAggregate }) {
  if (!agg || agg.total === 0) return <span className="text-[hsl(var(--status-lost-fg))] text-xs font-semibold">Stok Habis</span>;
  if (!agg.min_price) return <span className="text-muted-foreground text-xs">Harga belum ditetapkan</span>;
  return (
    <span className="font-semibold text-foreground text-sm">
      <span className="text-xs text-muted-foreground font-normal">Mulai </span>
      {formatRupiah(agg.min_price)}
    </span>
  );
}

function discountTypeLabel(type: string) {
  const map: Record<string, string> = {
    percentage: "Persentase (%)",
    fixed_amount: "Potongan Tetap (Rp)",
    buy_x_get_y: "Beli X Gratis Y",
    min_purchase: "Min. Pembelian",
    flash_sale: "Flash Sale",
  };
  return map[type] ?? type;
}

// ── Image Upload helper ────────────────────────────────────────────────────────
async function uploadImage(file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("catalog-images")
    .upload(path, file, { upsert: true });
  if (error) return null;
  const { data: urlData } = supabase.storage.from("catalog-images").getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ── ImageUploadBox ─────────────────────────────────────────────────────────────
interface ImageUploadBoxProps {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: string; // tailwind aspect ratio class
}
function ImageUploadBox({ label, hint, value, onChange, aspect = "aspect-[4/3]" }: ImageUploadBoxProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const path = `catalog/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const url = await uploadImage(file, path);
    setUploading(false);
    if (url) onChange(url);
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          "relative border-2 border-dashed border-border rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors",
          aspect
        )}
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(null); }}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50 p-4 text-center">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Camera className="w-6 h-6" />
                <span className="text-[11px]">Klik untuk upload</span>
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KatalogPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = role === "super_admin";

  const [catalogs, setCatalogs] = useState<CatalogProduct[]>([]);
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [stockAgg, setStockAgg] = useState<StockAggregate[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<CatalogProduct | null>(null);
  const [detailItem, setDetailItem] = useState<CatalogProduct | null>(null);
  const [showDiscountManager, setShowDiscountManager] = useState(false);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, masterRes, stockRes, discRes] = await Promise.all([
        db.from("catalog_products").select("*").order("updated_at", { ascending: false }),
        db.from("master_products").select("*").eq("is_active", true).is("deleted_at", null),
        // Only AVAILABLE units - price shown from stock, not catalog
        db.from("stock_units").select("product_id, selling_price, condition_status").eq("stock_status", "available"),
        db.from("discount_codes").select("*").order("created_at", { ascending: false }),
      ]);

      const masters: MasterProduct[] = masterRes.data ?? [];
      const rawCatalogs: CatalogProduct[] = catRes.data ?? [];
      const rawStock = stockRes.data ?? [];

      // Aggregate stock per product (AVAILABLE units only)
      const aggMap: Record<string, StockAggregate> = {};
      const priceByProd: Record<string, number[]> = {};

      for (const unit of rawStock) {
        if (!aggMap[unit.product_id]) {
          aggMap[unit.product_id] = {
            product_id: unit.product_id, total: 0,
            no_minus: 0, minus: 0,
            min_price: null, avg_price: null, max_price: null,
          };
        }
        const a = aggMap[unit.product_id];
        a.total++;
        if (unit.condition_status === "no_minus") a.no_minus++; else a.minus++;
        const p = Number(unit.selling_price);
        if (p > 0) {
          a.min_price = a.min_price === null ? p : Math.min(a.min_price, p);
          a.max_price = a.max_price === null ? p : Math.max(a.max_price, p);
          priceByProd[unit.product_id] = [...(priceByProd[unit.product_id] ?? []), p];
        }
      }
      for (const pid in priceByProd) {
        const arr = priceByProd[pid];
        if (aggMap[pid]) aggMap[pid].avg_price = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      }

      setStockAgg(Object.values(aggMap));

      const masterMap: Record<string, MasterProduct> = {};
      masters.forEach(m => (masterMap[m.id] = m));
      setCatalogs(rawCatalogs.map(c => ({ ...c, master: masterMap[c.product_id] })));
      setMasterProducts(masters);
      setDiscountCodes(discRes.data ?? []);
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

  // Products not yet in catalog (with available stock)
  const inCatalogIds = new Set(catalogs.map(c => c.product_id));
  // Only products with at least 1 available unit can be added
  const availableStockProductIds = new Set(stockAgg.filter(a => a.total > 0).map(a => a.product_id));
  const availableToAdd = masterProducts.filter(m => !inCatalogIds.has(m.id) && availableStockProductIds.has(m.id));

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
    toast({ title: newStatus === "published" ? "Produk diaktifkan di katalog" : "Produk dinonaktifkan dari katalog" });
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
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => setShowDiscountManager(true)} className="flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Kelola Diskon
              </Button>
            )}
            {isSuperAdmin && (
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Tambah ke Katalog
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total SKU", value: stats.total, icon: BookOpen },
            { label: "Aktif", value: stats.published, icon: Globe },
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
              <SelectItem value="published">Aktif</SelectItem>
              <SelectItem value="unpublished">Nonaktif</SelectItem>
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
          <div className="bg-card border border-border rounded-2xl py-20 flex flex-col items-center gap-4 text-center px-6">
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
                <div className="aspect-[4/3] bg-muted" />
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
                  {/* Thumbnail — 4:3 */}
                  <div className="relative aspect-[4/3] bg-muted/50 flex items-center justify-center overflow-hidden">
                    {cat.thumbnail_url ? (
                      <img src={cat.thumbnail_url} alt={cat.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                        <ImageOff className="w-10 h-10" />
                        <span className="text-[10px]">Belum ada foto</span>
                      </div>
                    )}
                    {/* Badges */}
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
                      <PriceDisplay agg={agg} />
                      {!outOfStock && agg && (
                        <p className="text-xs text-muted-foreground">
                          {agg.total} unit tersedia
                          {cat.show_condition_breakdown && (agg.no_minus + agg.minus) > 0 && (
                            <span className="ml-1 text-[10px]">
                              ({agg.no_minus} no-minus, {agg.minus} minus)
                            </span>
                          )}
                        </p>
                      )}
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
                        {cat.catalog_status === "published" ? "Nonaktifkan" : "Aktifkan"}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Harga Mulai</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Stok</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Kanal</th>
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
                          <PriceDisplay agg={agg} />
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

        <p className="text-xs text-muted-foreground text-center pb-2">
          {filtered.length} dari {catalogs.length} entri katalog
        </p>
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddCatalogModal
          masterProducts={availableToAdd}
          stockAgg={stockAgg}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchAll(); }}
          user={user}
          role={role}
        />
      )}

      {editItem && (
        <EditCatalogModal
          item={editItem}
          agg={getAgg(editItem.product_id)}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); fetchAll(); }}
          onDelete={isSuperAdmin ? () => { deleteCatalog(editItem); setEditItem(null); } : undefined}
          user={user}
          role={role}
        />
      )}

      {detailItem && (
        <DetailCatalogModal
          item={detailItem}
          agg={getAgg(detailItem.product_id)}
          onClose={() => setDetailItem(null)}
        />
      )}

      {showDiscountManager && (
        <DiscountManagerModal
          discountCodes={discountCodes}
          onClose={() => setShowDiscountManager(false)}
          onSaved={fetchAll}
          user={user}
          role={role}
        />
      )}
    </DashboardLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Add Modal — Revamped
// ══════════════════════════════════════════════════════════════════════════════
interface AddModalProps {
  masterProducts: MasterProduct[];
  stockAgg: StockAggregate[];
  onClose: () => void;
  onSaved: () => void;
  user: { id: string; email?: string } | null;
  role: string | null;
}

function AddCatalogModal({ masterProducts, stockAgg, onClose, onSaved, user, role }: AddModalProps) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [gallery, setGallery] = useState<(string | null)[]>([null, null, null, null]);
  const [publishPos, setPublishPos] = useState(false);
  const [publishWeb, setPublishWeb] = useState(false);
  const [publishMarket, setPublishMarket] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [showCondition, setShowCondition] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedMaster = masterProducts.find(m => m.id === selectedId);
  const selectedAgg = stockAgg.find(a => a.product_id === selectedId);

  useEffect(() => {
    if (selectedMaster) {
      setDisplayName(`${selectedMaster.series} ${selectedMaster.storage_gb}GB ${selectedMaster.color}`);
    }
  }, [selectedId, selectedMaster]);

  async function handleSave() {
    if (!selectedId || !displayName.trim()) {
      toast({ title: "Pilih produk dan isi nama tampilan", variant: "destructive" }); return;
    }
    setSaving(true);
    const slug = displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const galleryUrls = gallery.filter(Boolean) as string[];
    const { error } = await db.from("catalog_products").insert({
      product_id: selectedId,
      slug,
      display_name: displayName.trim(),
      short_description: shortDesc.trim() || null,
      full_description: fullDesc.trim() || null,
      thumbnail_url: thumbnail,
      gallery_urls: galleryUrls,
      catalog_status: "draft",
      publish_to_pos: publishPos,
      publish_to_web: publishWeb,
      publish_to_marketplace: publishMarket,
      price_strategy: "min_price",
      highlight_product: highlight,
      promo_label: promoLabel.trim() || null,
      show_condition_breakdown: showCondition,
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Produk ke Katalog</DialogTitle>
          <p className="text-xs text-muted-foreground">Harga diambil otomatis dari unit yang berstatus "Tersedia" di manajemen stok.</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Product select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pilih Produk (SKU)</label>
            {masterProducts.length === 0 ? (
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4 shrink-0" />
                Semua produk dengan stok tersedia sudah masuk katalog. Tambahkan stok baru di Manajemen Stok terlebih dahulu.
              </div>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih produk dari Master Data yang memiliki stok tersedia…" />
                </SelectTrigger>
                <SelectContent>
                  {masterProducts.map(m => {
                    const agg = stockAgg.find(a => a.product_id === m.id);
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        {m.series} {m.storage_gb}GB {m.color} — {agg?.total ?? 0} unit tersedia
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {selectedAgg && (
              <p className="text-xs text-muted-foreground">
                Harga mulai: <span className="font-semibold text-foreground">{selectedAgg.min_price ? formatRupiah(selectedAgg.min_price) : "Belum ditetapkan"}</span>
                {" · "}{selectedAgg.total} unit tersedia ({selectedAgg.no_minus} no-minus, {selectedAgg.minus} minus)
              </p>
            )}
          </div>

          {/* Nama tampilan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Tampilan untuk Sales & POS</label>
            <p className="text-[11px] text-muted-foreground">Nama ini yang akan dilihat tim sales dan pelanggan. Diisi otomatis, bisa diubah.</p>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Contoh: iPhone 15 Pro Max 256GB Natural Titanium" />
          </div>

          {/* Deskripsi singkat */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Singkat <span className="text-muted-foreground font-normal normal-case">(opsional)</span></label>
            <Input value={shortDesc} onChange={e => setShortDesc(e.target.value)}
              placeholder="Tagline pendek yang muncul di kartu produk (maks. 100 karakter)" maxLength={100} />
          </div>

          {/* Deskripsi lengkap */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Lengkap <span className="text-muted-foreground font-normal normal-case">(opsional)</span></label>
            <Textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)}
              placeholder="Deskripsi produk untuk halaman detail di website atau marketplace…"
              className="min-h-[80px] resize-none" />
          </div>

          {/* Foto utama */}
          <ImageUploadBox
            label="Foto Utama"
            hint="Ukuran ideal: 800×600 px. Foto ini tampil di kartu produk."
            value={thumbnail}
            onChange={setThumbnail}
            aspect="aspect-[4/3]"
          />

          {/* Galeri — 4 slots */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Galeri Foto <span className="text-muted-foreground font-normal normal-case">(maks. 4 foto tambahan)</span></label>
            <div className="grid grid-cols-4 gap-2">
              {gallery.map((url, i) => (
                <ImageUploadBox
                  key={i}
                  label=""
                  value={url}
                  onChange={newUrl => {
                    const g = [...gallery];
                    g[i] = newUrl;
                    setGallery(g);
                  }}
                  aspect="aspect-square"
                />
              ))}
            </div>
          </div>

          {/* Label promo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Label Promo <span className="text-muted-foreground font-normal normal-case">(opsional)</span></label>
            <Input value={promoLabel} onChange={e => setPromoLabel(e.target.value)}
              placeholder="Contoh: PROMO LEBARAN, DISKON 10%, READY STOCK" maxLength={30} />
          </div>

          {/* Publish ke kanal */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tampilkan di Kanal</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "pos", label: "POS", icon: Store, value: publishPos, set: setPublishPos },
                { key: "web", label: "Website", icon: Globe, value: publishWeb, set: setPublishWeb },
                { key: "market", label: "Marketplace", icon: ShoppingCart, value: publishMarket, set: setPublishMarket },
              ].map(ch => (
                <button key={ch.key} type="button" onClick={() => ch.set(!ch.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all text-sm font-medium",
                    ch.value ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                  )}>
                  <ch.icon className="w-5 h-5" />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setHighlight(!highlight)}
              className={cn("flex items-center gap-2 text-sm py-2.5 px-3 rounded-lg border transition-colors",
                highlight ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30")}>
              <Star className={cn("w-4 h-4", highlight && "fill-current")} /> Produk Unggulan
            </button>
            <button type="button" onClick={() => setShowCondition(!showCondition)}
              className={cn("flex items-center gap-2 text-sm py-2.5 px-3 rounded-lg border transition-colors",
                showCondition ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30")}>
              <Eye className="w-4 h-4" /> Tampilkan Kondisi
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || !selectedId || masterProducts.length === 0}>
            {saving ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" /> : null}
            Simpan ke Katalog
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
  agg?: StockAggregate;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
  user: { id: string; email?: string } | null;
  role: string | null;
}

function EditCatalogModal({ item, agg, isSuperAdmin, onClose, onSaved, onDelete, user, role }: EditModalProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(item.display_name);
  const [shortDesc, setShortDesc] = useState(item.short_description ?? "");
  const [fullDesc, setFullDesc] = useState(item.full_description ?? "");
  const [promoLabel, setPromoLabel] = useState(item.promo_label ?? "");
  const [thumbnail, setThumbnail] = useState<string | null>(item.thumbnail_url);
  const [gallery, setGallery] = useState<(string | null)[]>(() => {
    const g = [...(item.gallery_urls ?? [])];
    while (g.length < 4) g.push(null);
    return g.slice(0, 4);
  });
  const [publishPos, setPublishPos] = useState(item.publish_to_pos);
  const [publishWeb, setPublishWeb] = useState(item.publish_to_web);
  const [publishMarket, setPublishMarket] = useState(item.publish_to_marketplace);
  const [highlight, setHighlight] = useState(item.highlight_product);
  const [showCondition, setShowCondition] = useState(item.show_condition_breakdown);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!displayName.trim()) {
      toast({ title: "Nama tampilan wajib diisi", variant: "destructive" }); return;
    }
    setSaving(true);
    const galleryUrls = gallery.filter(Boolean) as string[];
    const { error } = await db.from("catalog_products").update({
      display_name: displayName.trim(),
      short_description: shortDesc.trim() || null,
      full_description: fullDesc.trim() || null,
      thumbnail_url: thumbnail,
      gallery_urls: galleryUrls,
      publish_to_pos: publishPos,
      publish_to_web: publishWeb,
      publish_to_marketplace: publishMarket,
      highlight_product: isSuperAdmin ? highlight : item.highlight_product,
      promo_label: isSuperAdmin ? (promoLabel.trim() || null) : item.promo_label,
      show_condition_breakdown: showCondition,
      updated_by: user?.id,
    }).eq("id", item.id);
    setSaving(false);
    if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); return; }
    await logActivity({
      action: "update_catalog",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      target_id: item.product_id, metadata: { display_name: displayName.trim() },
    });
    toast({ title: "Perubahan disimpan" });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Produk Katalog</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Harga ditentukan dari stok yang tersedia · {" "}
            <span className="font-medium text-foreground">{agg ? `${formatRupiah(agg.min_price)} — ${agg.total} unit` : "Stok habis"}</span>
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Tampilan</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Singkat</label>
            <Input value={shortDesc} onChange={e => setShortDesc(e.target.value)} maxLength={100}
              placeholder="Tagline pendek yang muncul di kartu produk" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi Lengkap</label>
            <Textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)}
              className="min-h-[80px] resize-none" />
          </div>

          <ImageUploadBox
            label="Foto Utama"
            hint="Ukuran ideal: 800×600 px"
            value={thumbnail}
            onChange={setThumbnail}
            aspect="aspect-[4/3]"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Galeri Foto <span className="text-muted-foreground font-normal normal-case">(maks. 4 foto)</span></label>
            <div className="grid grid-cols-4 gap-2">
              {gallery.map((url, i) => (
                <ImageUploadBox
                  key={i}
                  label=""
                  value={url}
                  onChange={newUrl => {
                    const g = [...gallery];
                    g[i] = newUrl;
                    setGallery(g);
                  }}
                  aspect="aspect-square"
                />
              ))}
            </div>
          </div>

          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Label Promo</label>
              <Input value={promoLabel} onChange={e => setPromoLabel(e.target.value)} maxLength={30}
                placeholder="Contoh: BEST SELLER, DISKON 10%" />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tampilkan di Kanal</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "pos", label: "POS", icon: Store, value: publishPos, set: setPublishPos },
                { key: "web", label: "Website", icon: Globe, value: publishWeb, set: setPublishWeb },
                { key: "market", label: "Marketplace", icon: ShoppingCart, value: publishMarket, set: setPublishMarket },
              ].map(ch => (
                <button key={ch.key} type="button" onClick={() => ch.set(!ch.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all text-sm font-medium",
                    ch.value ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                  )}>
                  <ch.icon className="w-5 h-5" />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isSuperAdmin && (
              <button type="button" onClick={() => setHighlight(!highlight)}
                className={cn("flex items-center gap-2 text-sm py-2.5 px-3 rounded-lg border transition-colors",
                  highlight ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30")}>
                <Star className={cn("w-4 h-4", highlight && "fill-current")} /> Produk Unggulan
              </button>
            )}
            <button type="button" onClick={() => setShowCondition(!showCondition)}
              className={cn("flex items-center gap-2 text-sm py-2.5 px-3 rounded-lg border transition-colors",
                showCondition ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30")}>
              <Eye className="w-4 h-4" /> Tampilkan Kondisi
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap pt-2">
          {onDelete && (
            <Button variant="destructive" onClick={onDelete} className="mr-auto">
              <Trash2 className="w-4 h-4 mr-1.5" /> Hapus dari Katalog
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />}
            Simpan Perubahan
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
  const [activeImg, setActiveImg] = useState(item.thumbnail_url);
  const allImages = [item.thumbnail_url, ...(item.gallery_urls ?? [])].filter(Boolean) as string[];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{item.display_name}</DialogTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {catalogStatusBadge(item.catalog_status)}
            {item.highlight_product && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--status-coming-soon-bg))] text-[hsl(var(--status-coming-soon-fg))]">
                ⭐ Unggulan
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Main image */}
          <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden flex items-center justify-center">
            {activeImg
              ? <img src={activeImg} alt="" className="w-full h-full object-cover" />
              : <div className="flex flex-col items-center gap-2 text-muted-foreground/40"><ImageOff className="w-10 h-10" /><span className="text-xs">Belum ada foto</span></div>
            }
          </div>
          {/* Gallery thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, i) => (
                <button key={i} onClick={() => setActiveImg(url)}
                  className={cn("w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors",
                    activeImg === url ? "border-foreground" : "border-border hover:border-foreground/30")}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Harga Mulai</p>
              <p className="text-lg font-bold text-foreground">{agg?.min_price ? formatRupiah(agg.min_price) : "—"}</p>
              {agg?.max_price && agg.max_price !== agg.min_price && (
                <p className="text-xs text-muted-foreground">s/d {formatRupiah(agg.max_price)}</p>
              )}
            </div>
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Stok Tersedia</p>
              <p className="text-lg font-bold text-foreground">{agg?.total ?? 0} unit</p>
              {item.show_condition_breakdown && agg && (
                <p className="text-xs text-muted-foreground">{agg.no_minus} no-minus · {agg.minus} minus</p>
              )}
            </div>
          </div>

          {item.short_description && (
            <p className="text-sm text-muted-foreground">{item.short_description}</p>
          )}

          {item.full_description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deskripsi</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{item.full_description}</p>
            </div>
          )}

          {/* Channels */}
          <div className="flex gap-2 flex-wrap">
            {item.publish_to_pos && <Badge variant="outline" className="gap-1"><Store className="w-3 h-3" />POS</Badge>}
            {item.publish_to_web && <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" />Website</Badge>}
            {item.publish_to_marketplace && <Badge variant="outline" className="gap-1"><ShoppingCart className="w-3 h-3" />Marketplace</Badge>}
          </div>

          {item.promo_label && (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--status-minus-fg))]">
              <Tag className="w-4 h-4" /> {item.promo_label}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Discount Manager Modal
// ══════════════════════════════════════════════════════════════════════════════
interface DiscountManagerProps {
  discountCodes: DiscountCode[];
  onClose: () => void;
  onSaved: () => void;
  user: { id: string; email?: string } | null;
  role: string | null;
}

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Persentase", icon: Percent, hint: "Diskon dalam persen (misal: 10%)" },
  { value: "fixed_amount", label: "Potongan Tetap", icon: DollarSign, hint: "Diskon dalam nominal Rupiah tetap" },
  { value: "buy_x_get_y", label: "Beli X Gratis Y", icon: ShoppingCart, hint: "Beli sejumlah unit, dapat gratis" },
  { value: "min_purchase", label: "Min. Pembelian", icon: Tag, hint: "Diskon jika pembelian melebihi nilai tertentu" },
  { value: "flash_sale", label: "Flash Sale", icon: AlertCircle, hint: "Diskon kilat dengan batas kuota & waktu" },
];

function DiscountManagerModal({ discountCodes, onClose, onSaved, user, role }: DiscountManagerProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "create">("list");
  const [editCode, setEditCode] = useState<DiscountCode | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discType, setDiscType] = useState("percentage");
  const [percent, setPercent] = useState("");
  const [amount, setAmount] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [buyQty, setBuyQty] = useState("");
  const [getQty, setGetQty] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setCode(""); setName(""); setDescription(""); setDiscType("percentage");
    setPercent(""); setAmount(""); setMinPurchase(""); setBuyQty(""); setGetQty("");
    setMaxUses(""); setValidUntil(""); setIsActive(true); setEditCode(null);
  }

  function startEdit(dc: DiscountCode) {
    setCode(dc.code);
    setName(dc.name);
    setDescription(dc.description ?? "");
    setDiscType(dc.discount_type);
    setPercent(dc.discount_percent?.toString() ?? "");
    setAmount(dc.discount_amount?.toString() ?? "");
    setMinPurchase(dc.min_purchase_amount?.toString() ?? "");
    setBuyQty(dc.buy_quantity?.toString() ?? "");
    setGetQty(dc.get_quantity?.toString() ?? "");
    setMaxUses(dc.max_uses?.toString() ?? "");
    setValidUntil(dc.valid_until ? dc.valid_until.slice(0, 10) : "");
    setIsActive(dc.is_active);
    setEditCode(dc);
    setView("create");
  }

  async function handleSave() {
    if (!code.trim() || !name.trim()) {
      toast({ title: "Kode dan nama wajib diisi", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || null,
      discount_type: discType,
      discount_percent: discType === "percentage" || discType === "flash_sale" ? Number(percent) || null : null,
      discount_amount: (discType === "fixed_amount" || discType === "flash_sale") ? Number(amount) || null : null,
      min_purchase_amount: minPurchase ? Number(minPurchase) : null,
      buy_quantity: discType === "buy_x_get_y" ? Number(buyQty) || null : null,
      get_quantity: discType === "buy_x_get_y" ? Number(getQty) || null : null,
      max_uses: maxUses ? Number(maxUses) : null,
      valid_until: validUntil || null,
      is_active: isActive,
      created_by: user?.id,
    };
    let error;
    if (editCode) {
      ({ error } = await db.from("discount_codes").update(payload).eq("id", editCode.id));
    } else {
      ({ error } = await db.from("discount_codes").insert(payload));
    }
    setSaving(false);
    if (error) {
      const msg = error.code === "23505" ? "Kode ini sudah ada, gunakan kode lain." : error.message;
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" }); return;
    }
    await logActivity({
      action: editCode ? "update_discount_code" : "create_discount_code",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      metadata: { code: code.trim().toUpperCase(), name: name.trim(), type: discType },
    });
    toast({ title: editCode ? "Kode diskon diperbarui" : "Kode diskon berhasil dibuat" });
    resetForm();
    setView("list");
    onSaved();
  }

  async function handleDelete(dc: DiscountCode) {
    if (!confirm(`Hapus kode diskon "${dc.code}"?`)) return;
    const { error } = await db.from("discount_codes").delete().eq("id", dc.id);
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); return; }
    await logActivity({
      action: "delete_discount_code",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      metadata: { code: dc.code },
    });
    toast({ title: "Kode diskon dihapus" });
    onSaved();
  }

  async function toggleActive(dc: DiscountCode) {
    await db.from("discount_codes").update({ is_active: !dc.is_active }).eq("id", dc.id);
    toast({ title: dc.is_active ? "Kode dinonaktifkan" : "Kode diaktifkan" });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            {view === "list" ? "Manajemen Kode Diskon" : (editCode ? "Edit Kode Diskon" : "Buat Kode Diskon Baru")}
          </DialogTitle>
        </DialogHeader>

        {view === "list" ? (
          <div className="space-y-4">
            <Button onClick={() => { resetForm(); setView("create"); }} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Buat Kode Diskon Baru
            </Button>

            {discountCodes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Belum ada kode diskon. Buat kode pertama untuk mulai memberikan promo ke pelanggan.
              </div>
            ) : (
              <div className="space-y-2">
                {discountCodes.map(dc => {
                  const typeInfo = DISCOUNT_TYPES.find(t => t.value === dc.discount_type);
                  const TypeIcon = typeInfo?.icon ?? Tag;
                  const isExpired = dc.valid_until && new Date(dc.valid_until) < new Date();
                  return (
                    <div key={dc.id} className={cn(
                      "border border-border rounded-xl p-4 flex items-start gap-3",
                      !dc.is_active || isExpired ? "opacity-60" : ""
                    )}>
                      <div className="w-9 h-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                        <TypeIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-foreground text-sm">{dc.code}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{discountTypeLabel(dc.discount_type)}</span>
                          {!dc.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]">Nonaktif</span>}
                          {isExpired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-destructive">Kedaluwarsa</span>}
                        </div>
                        <p className="text-xs text-foreground mt-0.5">{dc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dc.discount_percent ? `${dc.discount_percent}%` : ""}
                          {dc.discount_amount ? formatRupiah(dc.discount_amount) : ""}
                          {dc.buy_quantity ? ` · Beli ${dc.buy_quantity} Gratis ${dc.get_quantity}` : ""}
                          {dc.min_purchase_amount ? ` · Min. ${formatRupiah(dc.min_purchase_amount)}` : ""}
                          {" · "}{dc.used_count}/{dc.max_uses ?? "∞"} pemakaian
                          {dc.valid_until ? ` · s/d ${new Date(dc.valid_until).toLocaleDateString("id-ID")}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleActive(dc)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => startEdit(dc)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(dc)}
                          className="p-1.5 rounded hover:bg-accent text-destructive hover:text-destructive/70 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Code & Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kode Diskon</label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="PROMO10" className="font-mono" maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Program</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Promo Lebaran 10%" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Keterangan singkat untuk admin (opsional)" />
            </div>

            {/* Type selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipe Diskon</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DISCOUNT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setDiscType(t.value)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all",
                      discType === t.value ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"
                    )}>
                    <t.icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground">{t.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic fields based on type */}
            {(discType === "percentage" || discType === "flash_sale") && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Persentase Diskon (%)</label>
                <Input type="number" min={1} max={100} value={percent} onChange={e => setPercent(e.target.value)} placeholder="10" />
              </div>
            )}
            {(discType === "fixed_amount" || discType === "flash_sale") && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nominal Diskon (Rp)</label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500000" />
              </div>
            )}
            {discType === "buy_x_get_y" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Beli (X unit)</label>
                  <Input type="number" min={1} value={buyQty} onChange={e => setBuyQty(e.target.value)} placeholder="2" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gratis (Y unit)</label>
                  <Input type="number" min={1} value={getQty} onChange={e => setGetQty(e.target.value)} placeholder="1" />
                </div>
              </div>
            )}
            {(discType === "min_purchase" || discType === "percentage" || discType === "fixed_amount") && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Min. Pembelian (Rp) <span className="font-normal text-muted-foreground normal-case">(opsional)</span></label>
                <Input type="number" value={minPurchase} onChange={e => setMinPurchase(e.target.value)} placeholder="Tidak ada minimum" />
              </div>
            )}

            {/* Usage & expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Maks. Pemakaian <span className="font-normal normal-case">(kosong = tak terbatas)</span></label>
                <Input type="number" min={1} value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Berlaku Hingga <span className="font-normal normal-case">(kosong = selamanya)</span></label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>

            {/* Active toggle */}
            <button type="button" onClick={() => setIsActive(!isActive)}
              className={cn("flex items-center gap-2 text-sm py-2.5 px-4 rounded-lg border w-full justify-start transition-colors",
                isActive ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground")}>
              <div className={cn("w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0",
                isActive ? "border-foreground bg-foreground" : "border-muted-foreground")}>
                {isActive && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-background"><path d="M1 6l3 3 7-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              Kode diskon langsung aktif
            </button>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => { resetForm(); setView("list"); }}>Kembali</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />}
                {editCode ? "Simpan Perubahan" : "Buat Kode Diskon"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {view === "list" && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Tutup</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
