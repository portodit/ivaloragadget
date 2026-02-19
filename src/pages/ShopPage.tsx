import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Input } from "@/components/ui/input";
import { Search, Star, Truck, ImageOff, ChevronLeft, ChevronRight, Tag, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

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

const WARRANTY_SHORT: Record<string, string> = {
  resmi_bc: "Resmi BC",
  ibox: "Resmi iBox",
  inter: "Inter",
  whitelist: "Whitelist",
  digimap: "Digimap",
};

function formatRupiah(n: number | null | undefined) {
  if (!n) return "—";
  return "Rp" + n.toLocaleString("id-ID");
}

const PAGE_SIZE = 12;

export default function ShopPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWarranty, setFilterWarranty] = useState("all");
  const [filterPrice, setFilterPrice] = useState("all"); // all, under5, 5to10, above10
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [catRes, stockRes] = await Promise.all([
      db.from("catalog_products")
        .select("id, product_id, slug, display_name, short_description, thumbnail_url, highlight_product, free_shipping, promo_label, promo_badge, master_products(series, storage_gb, color, category, warranty_type)")
        .eq("catalog_status", "published"),
      db.from("stock_units")
        .select("product_id, selling_price")
        .eq("stock_status", "available"),
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
    setPrices(priceMap);
    setItems(catRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter
  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const master = item.master_products;
    const matchSearch = !q ||
      item.display_name.toLowerCase().includes(q) ||
      master?.series?.toLowerCase().includes(q) ||
      master?.color?.toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || master?.category === filterCategory;
    const matchWar = filterWarranty === "all" || master?.warranty_type === filterWarranty;
    const p = prices[item.product_id];
    const minP = p?.min_price ?? 0;
    let matchPrice = true;
    if (filterPrice === "under5") matchPrice = minP < 5_000_000;
    else if (filterPrice === "5to10") matchPrice = minP >= 5_000_000 && minP <= 10_000_000;
    else if (filterPrice === "above10") matchPrice = minP > 10_000_000;
    return matchSearch && matchCat && matchWar && matchPrice;
  });

  // Sort: highlight first, then by availability
  const sorted = [...filtered].sort((a, b) => {
    if (a.highlight_product && !b.highlight_product) return -1;
    if (!a.highlight_product && b.highlight_product) return 1;
    const aStock = prices[a.product_id]?.total ?? 0;
    const bStock = prices[b.product_id]?.total ?? 0;
    return bStock - aStock;
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

  const filterChips = [
    { label: "Semua", active: filterCategory === "all", onClick: () => handleFilter("cat", "all") },
    { label: "iPhone", active: filterCategory === "iphone", onClick: () => handleFilter("cat", "iphone") },
    { label: "iPad", active: filterCategory === "ipad", onClick: () => handleFilter("cat", "ipad") },
    { label: "Aksesori", active: filterCategory === "accessory", onClick: () => handleFilter("cat", "accessory") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="bg-muted/30 border-b border-border py-6 px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Katalog Produk</h1>
            <p className="text-muted-foreground text-sm mb-5">iPhone, iPad, dan aksesori original berkualitas dengan harga terbaik.</p>
            {/* Search bar */}
            <div className="relative max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Cari produk, model, warna…"
                className="pl-10 h-11 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">

          {/* Category chips + filter toggle */}
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
                    { val: "5to10", label: "Rp 5–10 jt" },
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
              {paginated.map(item => {
                const p = prices[item.product_id];
                const outOfStock = !p || p.total === 0;
                const master = item.master_products;

                return (
                  <Link
                    key={item.id}
                    to={item.slug ? `/produk/${item.slug}` : "#"}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all group flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.display_name}
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
                        {item.highlight_product && (
                          <span className="inline-flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white whitespace-nowrap">
                            <Star className="w-2.5 h-2.5 fill-current shrink-0" /> Unggulan
                          </span>
                        )}
                        {item.free_shipping && (
                          <span className="inline-flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-500 text-white whitespace-nowrap">
                            <Truck className="w-2.5 h-2.5 shrink-0" /> Gratis Ongkir
                          </span>
                        )}
                        {item.promo_label && (
                          <span className="inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white whitespace-nowrap">
                            <Tag className="w-2.5 h-2.5 shrink-0 mr-0.5" /> {item.promo_label}
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
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{item.display_name}</p>
                      {master && (
                        <p className="text-[10px] text-muted-foreground">
                          {WARRANTY_SHORT[master.warranty_type] ?? master.warranty_type}
                        </p>
                      )}
                      <div className="mt-auto">
                        {outOfStock ? (
                          <span className="text-xs text-muted-foreground font-medium">Stok Habis</span>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">Mulai</p>
                            <p className="text-sm font-bold text-foreground">{formatRupiah(p?.min_price)}</p>
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
