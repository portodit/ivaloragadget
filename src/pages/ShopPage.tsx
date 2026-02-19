import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Input } from "@/components/ui/input";
import { Search, Star, Truck, ImageOff, ChevronLeft, ChevronRight, Tag, Filter, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

interface CatalogItem {
  id: string;
  product_id: string;
  slug: string | null;
  display_name: string;
  short_description: string | null;
  thumbnail_url: string | null;
  highlight_product: boolean;
  free_shipping: boolean;
  promo_label: string | null;
  promo_badge: string | null;
  is_flash_sale: boolean;
  discount_active: boolean;
  discount_type: string | null;
  discount_value: number | null;
  discount_start_at: string | null;
  discount_end_at: string | null;
  master_products: {
    series: string;
    storage_gb: number;
    color: string;
    category: string;
    warranty_type: string;
  };
}

interface StockPrice {
  product_id: string;
  min_price: number | null;
  total: number;
}

// A grouped card = 1 series + 1 warranty_type
interface GroupedProduct {
  key: string; // series + warranty_type
  series: string;
  warranty_type: string;
  category: string;
  // Representative data (from the first/best variant)
  representative: CatalogItem;
  variants: CatalogItem[];
  // Aggregated
  minPrice: number | null;
  maxPrice: number | null;
  totalStock: number;
  hasFlashSale: boolean;
  hasDiscount: boolean;
  hasFreeShipping: boolean;
  hasHighlight: boolean;
  thumbnailUrl: string | null;
}

const WARRANTY_SHORT: Record<string, string> = {
  resmi_bc: "Resmi BC",
  ibox: "Resmi iBox",
  inter: "Inter",
  whitelist: "Whitelist",
  digimap: "Digimap",
};

const USD_RATE = 15500;

function useFormatPrice() {
  const { currency } = useLocale();
  return (n: number | null | undefined) => {
    if (!n) return "—";
    if (currency === "USD") {
      const usd = n / USD_RATE;
      return "$" + usd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return "Rp" + n.toLocaleString("id-ID");
  };
}

const PAGE_SIZE = 12;

interface FlashSaleSettings {
  is_active: boolean;
  start_time: string;
  duration_hours: number;
}

function useCountdown(endTime: Date | null) {
  const getRemaining = () => {
    if (!endTime) return { h: 0, m: 0, s: 0, expired: true };
    const diff = endTime.getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000), expired: false };
  };
  const [time, setTime] = useState(getRemaining());
  useEffect(() => { const t = setInterval(() => setTime(getRemaining()), 1000); return () => clearInterval(t); }, [endTime]);
  return time;
}

export default function ShopPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formatPrice = useFormatPrice();
  const { lang } = useLocale();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [filterCategory, setFilterCategory] = useState(searchParams.get("filter") === "flash_sale" ? "flash_sale" : "all");
  const [filterWarranty, setFilterWarranty] = useState("all");
  const [filterPrice, setFilterPrice] = useState("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [flashSale, setFlashSale] = useState<FlashSaleSettings | null>(null);
  const [flashEndTime, setFlashEndTime] = useState<Date | null>(null);
  const { h, m, s, expired: flashExpired } = useCountdown(flashEndTime);
  const flashActive = flashSale?.is_active && !flashExpired;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [catRes, stockRes, fsRes] = await Promise.all([
      db.from("catalog_products")
        .select("id, product_id, slug, display_name, short_description, thumbnail_url, highlight_product, free_shipping, promo_label, promo_badge, is_flash_sale, discount_active, discount_type, discount_value, discount_start_at, discount_end_at, master_products(series, storage_gb, color, category, warranty_type)")
        .eq("catalog_status", "published"),
      db.from("stock_units")
        .select("product_id, selling_price")
        .eq("stock_status", "available"),
      db.from("flash_sale_settings").select("is_active, start_time, duration_hours").limit(1).single(),
    ]);

    const rawStock = stockRes.data ?? [];
    const priceMap: Record<string, StockPrice> = {};
    for (const unit of rawStock) {
      if (!priceMap[unit.product_id]) {
        priceMap[unit.product_id] = { product_id: unit.product_id, min_price: null, total: 0 };
      }
      priceMap[unit.product_id].total++;
      const p = Number(unit.selling_price);
      if (p > 0) {
        const cur = priceMap[unit.product_id].min_price;
        priceMap[unit.product_id].min_price = cur === null ? p : Math.min(cur, p);
      }
    }
    if (fsRes.data) {
      setFlashSale(fsRes.data as FlashSaleSettings);
      if (fsRes.data.is_active) {
        const start = new Date(fsRes.data.start_time);
        const end = new Date(start.getTime() + fsRes.data.duration_hours * 3600000);
        if (end.getTime() > Date.now()) setFlashEndTime(end);
      }
    }

    setPrices(priceMap);
    setItems(catRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group items by series + warranty_type
  const grouped: GroupedProduct[] = useMemo(() => {
    const map = new Map<string, GroupedProduct>();
    for (const item of items) {
      const m = item.master_products;
      if (!m) continue;
      const key = `${m.series}__${m.warranty_type}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          series: m.series,
          warranty_type: m.warranty_type,
          category: m.category,
          representative: item,
          variants: [],
          minPrice: null,
          maxPrice: null,
          totalStock: 0,
          hasFlashSale: false,
          hasDiscount: false,
          hasFreeShipping: false,
          hasHighlight: false,
          thumbnailUrl: null,
        });
      }
      const g = map.get(key)!;
      g.variants.push(item);
      // Aggregate stock & price from ALL variants
      const sp = prices[item.product_id];
      if (sp) {
        g.totalStock += sp.total;
        if (sp.min_price != null) {
          g.minPrice = g.minPrice === null ? sp.min_price : Math.min(g.minPrice, sp.min_price);
          g.maxPrice = g.maxPrice === null ? sp.min_price : Math.max(g.maxPrice!, sp.min_price);
        }
      }
      if (item.is_flash_sale) g.hasFlashSale = true;
      if (item.discount_active && item.discount_value) g.hasDiscount = true;
      if (item.free_shipping) g.hasFreeShipping = true;
      if (item.highlight_product) g.hasHighlight = true;
      if (!g.thumbnailUrl && item.thumbnail_url) g.thumbnailUrl = item.thumbnail_url;
    }

    // Pick best representative (one with thumbnail, or highlight, or most stock)
    for (const g of map.values()) {
      const withThumb = g.variants.find(v => v.thumbnail_url);
      const withHighlight = g.variants.find(v => v.highlight_product);
      g.representative = withThumb ?? withHighlight ?? g.variants[0];
      g.thumbnailUrl = g.representative.thumbnail_url ?? g.thumbnailUrl;
    }
    return Array.from(map.values());
  }, [items, prices]);

  // Filter grouped
  const filtered = grouped.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      g.series.toLowerCase().includes(q) ||
      g.variants.some(v => v.display_name.toLowerCase().includes(q) || v.master_products?.color?.toLowerCase().includes(q));
    const matchFlash = filterCategory === "flash_sale" ? g.hasFlashSale : true;
    const matchCat = filterCategory === "flash_sale" || filterCategory === "all" || g.category === filterCategory;
    const matchWar = filterWarranty === "all" || g.warranty_type === filterWarranty;
    const minP = g.minPrice ?? 0;
    let matchPrice = true;
    if (filterPrice === "under5") matchPrice = minP < 5_000_000;
    else if (filterPrice === "5to10") matchPrice = minP >= 5_000_000 && minP <= 10_000_000;
    else if (filterPrice === "above10") matchPrice = minP > 10_000_000;
    return matchSearch && matchFlash && matchCat && matchWar && matchPrice;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (a.hasHighlight && !b.hasHighlight) return -1;
    if (!a.hasHighlight && b.hasHighlight) return 1;
    return b.totalStock - a.totalStock;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleFilter(key: string, v: string) {
    if (key === "cat") setFilterCategory(v);
    if (key === "war") setFilterWarranty(v);
    if (key === "price") setFilterPrice(v);
    setPage(1);
  }

  const flashSaleCount = grouped.filter(g => g.hasFlashSale).length;
  const filterChips = [
    { label: "Semua", active: filterCategory === "all", onClick: () => handleFilter("cat", "all") },
    ...(flashSaleCount > 0 ? [{
      label: "\u26A1 Flash Sale",
      active: filterCategory === "flash_sale",
      onClick: () => handleFilter("cat", "flash_sale"),
    }] : []),
    { label: "iPhone", active: filterCategory === "iphone", onClick: () => handleFilter("cat", "iphone") },
    { label: "iPad", active: filterCategory === "ipad", onClick: () => handleFilter("cat", "ipad") },
    { label: "Aksesori", active: filterCategory === "accessory", onClick: () => handleFilter("cat", "accessory") },
  ];

  // Build display name for a grouped product
  function groupDisplayName(g: GroupedProduct) {
    const storages = Array.from(new Set(g.variants.map(v => v.master_products.storage_gb))).sort((a, b) => a - b);
    const storageStr = storages.map(s => s >= 1024 ? `${s / 1024}TB` : `${s}GB`).join("/");
    return `${g.series} ${storageStr} ${WARRANTY_SHORT[g.warranty_type] ?? g.warranty_type}`;
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-4">

        {/* Hero */}
        <div className="bg-muted/30 border-b border-border py-6 px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Katalog Produk</h1>
            <p className="text-muted-foreground text-sm mb-5">iPhone, iPad, dan aksesori original berkualitas dengan harga terbaik.</p>
            <div className="relative max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Cari produk, model, warna..."
                className="pl-10 h-11 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">

          {/* Category chips */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {filterChips.map(c => (
              <button
                key={c.label}
                onClick={c.onClick}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                  c.active
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                showFilters ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40"
              )}
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>

          {/* Flash sale countdown banner */}
          {filterCategory === "flash_sale" && flashActive && !flashExpired && (
            <div className="mb-4 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: "linear-gradient(135deg, hsl(0 0% 6%) 0%, hsl(15 60% 8%) 50%, hsl(0 0% 5%) 100%)" }}>
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-bold text-white">Flash Sale Aktif</p>
                  <p className="text-xs text-white/60">Harga spesial terbatas waktu</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-white/60 uppercase tracking-wider">Sisa waktu:</span>
                <div className="flex items-center gap-1">
                  {[
                    { v: h, l: "j" }, { v: m, l: "m" }, { v: s, l: "d" },
                  ].map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5">
                      <span className="bg-white/10 text-amber-400 font-bold text-sm px-2 py-1 rounded-md tabular-nums">{String(t.v).padStart(2, "0")}</span>
                      <span className="text-[10px] text-white/50">{t.l}</span>
                      {i < 2 && <span className="text-amber-400 font-bold mx-0.5">:</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Expanded filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-4 bg-muted/20 border border-border rounded-xl">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Jenis Garansi</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: "all", label: "Semua" },
                    { val: "resmi_bc", label: "Resmi BC" },
                    { val: "ibox", label: "iBox" },
                    { val: "inter", label: "Inter" },
                    { val: "whitelist", label: "Whitelist" },
                    { val: "digimap", label: "Digimap" },
                  ].map(w => (
                    <button
                      key={w.val}
                      onClick={() => handleFilter("war", w.val)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                        filterWarranty === w.val ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                      )}
                    >{w.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Rentang Harga</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: "all", label: "Semua" },
                    { val: "under5", label: "< Rp 5 jt" },
                    { val: "5to10", label: "Rp 5\u201310 jt" },
                    { val: "above10", label: "> Rp 10 jt" },
                  ].map(p => (
                    <button
                      key={p.val}
                      onClick={() => handleFilter("price", p.val)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                        filterPrice === p.val ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                      )}
                    >{p.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results count */}
          <p className="text-xs text-muted-foreground mb-4">{sorted.length} produk ditemukan</p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Produk tidak ditemukan</p>
              <p className="text-xs text-muted-foreground mt-1">Coba ubah kata kunci atau filter pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginated.map(g => {
                const outOfStock = g.totalStock === 0;
                const displayName = groupDisplayName(g);
                // Pick slug from representative
                const slug = g.representative.slug;

                return (
                  <Link
                    key={g.key}
                    to={slug ? `/produk/${slug}` : "#"}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all group flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                      {g.thumbnailUrl ? (
                        <img
                          src={g.thumbnailUrl}
                          alt={displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground/30">
                          <ImageOff className="w-8 h-8" />
                          <span className="text-[10px]">Belum ada foto</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        {g.hasHighlight && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white whitespace-nowrap">
                            <Star className="w-3 h-3 fill-current shrink-0" /> Unggulan
                          </span>
                        )}
                        {g.hasFreeShipping && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500 text-white whitespace-nowrap">
                            <Truck className="w-3 h-3 shrink-0" /> Gratis Ongkir
                          </span>
                        )}
                        {g.hasFlashSale && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground whitespace-nowrap">
                            <Zap className="w-3 h-3 shrink-0" /> Flash Sale
                          </span>
                        )}
                        {g.hasDiscount && !g.hasFlashSale && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground whitespace-nowrap">
                            <Tag className="w-3 h-3 shrink-0" /> Diskon
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
                    <div className="p-3 flex-1 flex flex-col gap-1.5">
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {g.variants.length} varian · {WARRANTY_SHORT[g.warranty_type] ?? g.warranty_type}
                      </p>
                      <div className="mt-auto">
                        {outOfStock ? (
                          <span className="text-xs text-muted-foreground font-medium">Stok Habis</span>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">{lang === "en" ? "From" : "Mulai"}</p>
                            <p className="text-sm font-bold text-foreground">{formatPrice(g.minPrice)}</p>
                            {g.totalStock > 0 && (
                              <p className="text-[10px] text-muted-foreground">{g.totalStock} unit tersedia</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={cn(
                    "w-9 h-9 rounded-lg border text-sm font-medium transition-all",
                    page === i + 1
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4 mb-8">
            Menampilkan {paginated.length} dari {sorted.length} produk · Halaman {page} dari {Math.max(1, totalPages)}
          </p>
        </div>
      </div>
    </div>
  );
}
