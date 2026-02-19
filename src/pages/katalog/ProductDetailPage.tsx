import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import {
  ChevronRight, Shield, CheckCircle2, Truck, MessageCircle,
  Share2, Package, Star, ExternalLink,
  ImageOff, BadgeCheck, Zap, Clock, ShoppingCart, AlertCircle, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { addToCart, type CartItem } from "@/pages/CartPage";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MasterProduct {
  id: string;
  series: string;
  storage_gb: number;
  color: string;
  category: string;
  warranty_type: string;
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
  catalog_status: string;
  publish_to_pos: boolean;
  publish_to_web: boolean;
  publish_to_marketplace: boolean;
  tokopedia_url: string | null;
  shopee_url: string | null;
  highlight_product: boolean;
  show_condition_breakdown: boolean;
  promo_label: string | null;
  promo_badge: string | null;
  free_shipping: boolean;
  is_flash_sale: boolean;
  discount_active: boolean;
  discount_type: string | null;
  discount_value: number | null;
  discount_start_at: string | null;
  discount_end_at: string | null;
  bonus_items: BonusItem[];
  master_products: MasterProduct;
  spec_condition: string | null;
  spec_brand: string | null;
  spec_warranty_duration: string | null;
  spec_screen_protector_type: string | null;
  spec_case_type: string | null;
  spec_custom_product: string | null;
  spec_built_in_battery: string | null;
  spec_condition_detail: string | null;
  spec_cable_type: string | null;
  spec_phone_model: string | null;
  spec_postel_cert: string | null;
  spec_shipped_from: string | null;
  rating_score: number;
  rating_count: number;
}

interface StockUnit {
  id: string;
  imei: string;
  condition_status: "no_minus" | "minus";
  minus_severity: string | null;
  minus_description: string | null;
  selling_price: number | null;
  stock_status: string;
}

interface SiblingCatalog {
  id: string;
  product_id: string;
  slug: string | null;
  display_name: string;
  master_products: {
    storage_gb: number;
    color: string;
    warranty_type: string;
    series: string;
  };
}

interface BonusItem {
  name: string;
  description: string;
}

const WARRANTY_LABELS: Record<string, string> = {
  resmi_bc: "Resmi BC (Bea Cukai)",
  ibox: "Resmi iBox Indonesia",
  inter: "Inter (Internasional)",
  whitelist: "Whitelist Terdaftar",
  digimap: "Resmi Digimap Indonesia",
};

const WARRANTY_BADGE_COLORS: Record<string, string> = {
  resmi_bc: "#007AFF",
  ibox: "#34C759",
  inter: "#FF9500",
  whitelist: "#5856D6",
  digimap: "#FF2D55",
};

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

function storageLabel(gb: number) {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
}

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5 pr-4 text-sm text-muted-foreground w-[45%] align-top">{label}</td>
      <td className="py-2.5 text-sm font-medium text-foreground align-top">{value}</td>
    </tr>
  );
}

function StarRating({ score, count }: { score: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={cn("w-4 h-4", i <= Math.round(score) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
        ))}
      </div>
      <span className="text-sm font-bold text-foreground">{score.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">dari 5 ({count} ulasan)</span>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
        active
          ? "border-foreground text-foreground font-semibold"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function censorImei(imei: string): string {
  if (imei.length <= 6) return imei;
  return imei.slice(0, 3) + "****" + imei.slice(-3);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const formatRupiah = useFormatPrice();
  const { toast } = useToast();

  const [catalog, setCatalog] = useState<CatalogProduct | null>(null);
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [allSiblings, setAllSiblings] = useState<SiblingCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "kondisi" | "rating" | "garansi" | "pengiriman">("detail");
  const [flashSaleSettings, setFlashSaleSettings] = useState<{ is_active: boolean; start_time: string; duration_hours: number } | null>(null);
  const [showFlashSalePopup, setShowFlashSalePopup] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [countdownStr, setCountdownStr] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data } = await db.from("catalog_products")
        .select("*, master_products(*)")
        .eq("slug", slug)
        .eq("catalog_status", "published")
        .single();

      if (!data) { setNotFound(true); setLoading(false); return; }

      const rawBonus = data.bonus_items;
      const bonusItems: BonusItem[] = Array.isArray(rawBonus) ? rawBonus : [];
      setCatalog({ ...data, bonus_items: bonusItems });
      setActiveImg(data.thumbnail_url);

      const { data: stockData } = await db.from("stock_units")
        .select("id, imei, condition_status, minus_severity, minus_description, selling_price, stock_status")
        .eq("product_id", data.product_id)
        .eq("stock_status", "available")
        .order("selling_price", { ascending: true });
      setUnits(stockData ?? []);

      if (data.master_products) {
        const { data: allCatalogs } = await db.from("catalog_products")
          .select("id, product_id, slug, display_name, master_products(storage_gb, color, warranty_type, series)")
          .eq("catalog_status", "published");

        if (allCatalogs) {
          const sibs = allCatalogs.filter((c: SiblingCatalog) => {
            const m = c.master_products;
            return m.series === data.master_products.series;
          });
          setAllSiblings(sibs);
        }
      }

      if (data.is_flash_sale) {
        const { data: fsData } = await db.from("flash_sale_settings")
          .select("is_active, start_time, duration_hours")
          .limit(1)
          .single();
        if (fsData) setFlashSaleSettings(fsData);
      }

      setLoading(false);
    }
    if (slug) fetchData();
  }, [slug]);

  // Countdown timer for discount end
  useEffect(() => {
    if (!catalog) return;
    const endAt = catalog.discount_end_at;
    if (!endAt || !catalog.discount_active) { setCountdownStr(""); return; }
    function tick() {
      const diff = new Date(endAt!).getTime() - Date.now();
      if (diff <= 0) { setCountdownStr("Berakhir"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownStr(`${h}j ${m}m ${s}d`);
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [catalog]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="pt-8">
          <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-6">
            <div className="h-4 bg-muted rounded w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-8">
              <div className="aspect-square bg-muted rounded-2xl" />
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-48" />
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-10 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !catalog) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="pt-8 flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-4">
          <Package className="w-16 h-16 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold text-foreground">Produk tidak ditemukan</h1>
          <p className="text-muted-foreground max-w-sm">Produk ini mungkin sudah tidak tersedia atau URL tidak valid.</p>
          <button onClick={() => navigate(-1)} className="text-sm font-medium text-foreground underline underline-offset-4">← Kembali</button>
        </div>
      </div>
    );
  }

  const allImages = [catalog.thumbnail_url, ...(catalog.gallery_urls ?? [])].filter(Boolean) as string[];
  const master = catalog.master_products;
  const noMinusUnits = units.filter(u => u.condition_status === "no_minus");
  const minusUnits = units.filter(u => u.condition_status === "minus");
  const minPrice = units.length > 0 ? Math.min(...units.filter(u => u.selling_price).map(u => u.selling_price!)) : null;
  const maxPrice = units.length > 0 ? Math.max(...units.filter(u => u.selling_price).map(u => u.selling_price!)) : null;
  const outOfStock = units.length === 0;

  // ── Warranty type selectors
  const warrantyGroups = Array.from(
    new Map(allSiblings.map(s => [s.master_products.warranty_type, s])).entries()
  ).map(([wt, sib]) => ({ warrantyType: wt, catalog: sib }));
  const currentWarrantyInGroups = warrantyGroups.some(g => g.warrantyType === master.warranty_type);
  if (!currentWarrantyInGroups) {
    warrantyGroups.unshift({ warrantyType: master.warranty_type, catalog: { id: catalog.id, product_id: catalog.product_id, slug: catalog.slug, display_name: catalog.display_name, master_products: master } });
  }
  warrantyGroups.sort((a, b) => a.warrantyType === master.warranty_type ? -1 : b.warrantyType === master.warranty_type ? 1 : 0);

  // ── Color selectors
  const colorSiblings = allSiblings.filter(s => s.master_products.warranty_type === master.warranty_type);
  const uniqueColors = Array.from(new Set([master.color, ...colorSiblings.map(s => s.master_products.color)]));

  // ── Storage selectors
  const storageSiblings = colorSiblings.filter(s => s.master_products.color === master.color);
  const uniqueStorages = Array.from(new Set([master.storage_gb, ...storageSiblings.map(s => s.master_products.storage_gb)])).sort((a, b) => a - b);

  // Tabs should only show when product is fully specific (has specific color + storage selected)
  const isFullySpecific = true; // The page always shows a specific product variant

  function getSlugForWarranty(warrantyType: string) {
    if (warrantyType === master.warranty_type) return null;
    const match = allSiblings.find(s => s.master_products.warranty_type === warrantyType && s.master_products.color === master.color && s.master_products.storage_gb === master.storage_gb);
    return match?.slug ?? allSiblings.find(s => s.master_products.warranty_type === warrantyType)?.slug ?? null;
  }

  function getSlugForColor(color: string) {
    if (color === master.color) return null;
    const match = colorSiblings.find(s => s.master_products.color === color && s.master_products.storage_gb === master.storage_gb);
    return match?.slug ?? colorSiblings.find(s => s.master_products.color === color)?.slug ?? null;
  }

  function getSlugForStorage(gb: number) {
    if (gb === master.storage_gb) return null;
    const match = storageSiblings.find(s => s.master_products.storage_gb === gb);
    return match?.slug ?? null;
  }

  function handleAddToCart() {
    if (outOfStock) return;
    // Flash sale not started check
    if (catalog?.is_flash_sale && flashSaleSettings?.is_active && new Date(flashSaleSettings.start_time).getTime() > Date.now()) {
      setShowFlashSalePopup(true);
      return;
    }
    // Pick the selected unit or cheapest
    const targetUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) : units[0];
    if (!targetUnit) return;
    const item: CartItem = {
      unitId: targetUnit.id,
      productName: catalog.display_name,
      color: master.color,
      storageGb: master.storage_gb,
      warrantyType: master.warranty_type,
      conditionStatus: targetUnit.condition_status,
      minusDescription: targetUnit.minus_description,
      sellingPrice: targetUnit.selling_price ?? 0,
      imeiCensored: censorImei(targetUnit.imei),
      thumbnailUrl: catalog.thumbnail_url,
      slug: catalog.slug,
    };
    const added = addToCart(item);
    if (added) {
      toast({ title: "Ditambahkan ke keranjang", description: catalog.display_name });
    } else {
      toast({ title: "Unit sudah ada di keranjang", variant: "destructive" });
    }
  }

  // ── Specs table data
  const specsRows: { label: string; value: string | null | undefined }[] = [
    { label: "Stok", value: outOfStock ? "Habis" : String(units.length) },
    { label: "Kondisi", value: catalog.spec_condition || "Bekas" },
    { label: "Merek", value: catalog.spec_brand || "iPhone Apple" },
    { label: "Kapasitas Penyimpanan", value: storageLabel(master.storage_gb) },
    { label: "Jenis Garansi", value: WARRANTY_LABELS[master.warranty_type] || master.warranty_type },
    { label: "Produk Custom", value: catalog.spec_custom_product || "Tidak" },
    { label: "Build-in Battery", value: catalog.spec_built_in_battery || "Ya" },
    { label: "Model Handphone", value: catalog.spec_phone_model || master.series },
    { label: "No.Sertifikat (POSTEL)", value: catalog.spec_postel_cert || "-" },
    { label: "Dikirim Dari", value: catalog.spec_shipped_from || "Kota Surabaya" },
  ];
  if (catalog.spec_warranty_duration) specsRows.splice(5, 0, { label: "Masa Garansi", value: catalog.spec_warranty_duration });
  if (catalog.spec_screen_protector_type) specsRows.push({ label: "Tipe Pengaman Layar", value: catalog.spec_screen_protector_type });
  if (catalog.spec_case_type) specsRows.push({ label: "Tipe Case", value: catalog.spec_case_type });
  if (catalog.spec_cable_type) specsRows.push({ label: "Tipe Kabel Seluler", value: catalog.spec_cable_type });

  const tabs = [
    { key: "detail", label: "Detail Produk" },
    { key: "kondisi", label: `Kondisi Unit${minusUnits.length > 0 ? ` (${minusUnits.length} minus)` : ""}` },
    { key: "rating", label: `Penilaian (${catalog.rating_count ?? 0})` },
    { key: "garansi", label: "Informasi Garansi" },
    { key: "pengiriman", label: "Pengiriman" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-8">
        <div className="max-w-6xl mx-auto px-4">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground py-3">
            <Link to="/" className="hover:text-foreground transition-colors">Beranda</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/katalog" className="hover:text-foreground transition-colors">Katalog</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-xs">{catalog.display_name}</span>
          </nav>

          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-6 pb-8">

            {/* LEFT — Media */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
                {activeImg ? (
                  <img src={activeImg} alt={catalog.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                    <ImageOff className="w-16 h-16" />
                    <span className="text-sm">Belum ada foto</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                  {catalog.is_flash_sale && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground shadow-sm whitespace-nowrap">
                      <Zap className="w-3.5 h-3.5 shrink-0" /> Flash Sale
                    </span>
                  )}
                  {catalog.free_shipping && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500 text-white shadow-sm whitespace-nowrap">
                      <Truck className="w-3.5 h-3.5 shrink-0" /> Gratis Ongkir
                    </span>
                  )}
                  {catalog.highlight_product && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white shadow-sm whitespace-nowrap">
                      <Star className="w-3.5 h-3.5 fill-current shrink-0" /> Unggulan
                    </span>
                  )}
                  {catalog.discount_active && catalog.discount_value && !catalog.is_flash_sale && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground shadow-sm whitespace-nowrap">
                      <Tag className="w-3.5 h-3.5 shrink-0" /> Diskon {catalog.discount_type === "percentage" ? `${catalog.discount_value}%` : `Rp${catalog.discount_value.toLocaleString("id-ID")}`}
                    </span>
                  )}
                </div>
                {outOfStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-white text-lg font-bold">Stok Habis</p>
                      <p className="text-white/70 text-sm">Produk sedang tidak tersedia</p>
                    </div>
                  </div>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((url, i) => (
                    <button key={i} onClick={() => setActiveImg(url)}
                      className={cn("w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                        activeImg === url ? "border-foreground scale-105" : "border-border hover:border-foreground/40")}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MIDDLE — Info */}
            <div className="space-y-4">
              {/* Product name */}
              <h1 className="text-xl font-bold text-foreground leading-tight">{catalog.display_name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-3 pb-1 border-b border-border">
                <StarRating score={catalog.rating_score ?? 0} count={catalog.rating_count ?? 0} />
              </div>

              {/* Price */}
              {(() => {
                const now = Date.now();
                const hasDiscount = catalog.discount_active && catalog.discount_value && catalog.discount_value > 0
                  && (!catalog.discount_start_at || new Date(catalog.discount_start_at).getTime() <= now)
                  && (!catalog.discount_end_at || new Date(catalog.discount_end_at).getTime() > now);
                const discountedMin = hasDiscount && minPrice
                  ? catalog.discount_type === "percentage"
                    ? Math.round(minPrice * (1 - catalog.discount_value! / 100))
                    : Math.max(0, minPrice - catalog.discount_value!)
                  : null;
                return (
                  <div className="space-y-1">
                    {outOfStock ? (
                      <div className="text-2xl font-bold text-muted-foreground">Stok Habis</div>
                    ) : (
                      <>
                        {hasDiscount && discountedMin !== null ? (
                          <>
                            <p className="text-base text-muted-foreground line-through">{formatRupiah(minPrice)}</p>
                            <div className="text-3xl font-bold text-destructive">{formatRupiah(discountedMin)}</div>
                            {countdownStr && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Berakhir dalam {countdownStr}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-3xl font-bold text-foreground">{formatRupiah(minPrice)}</div>
                        )}
                        {maxPrice && maxPrice !== minPrice && (
                          <p className="text-sm text-muted-foreground">s/d {formatRupiah(maxPrice)} tergantung kondisi unit</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* ① Pilih Tipe Garansi — DROPDOWN below price */}
              {warrantyGroups.length > 1 ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">Tipe Garansi</p>
                  <Select
                    value={master.warranty_type}
                    onValueChange={(val) => {
                      const targetSlug = getSlugForWarranty(val);
                      if (targetSlug) navigate(`/produk/${targetSlug}`);
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {warrantyGroups.map(({ warrantyType }) => (
                        <SelectItem key={warrantyType} value={warrantyType}>
                          {WARRANTY_LABELS[warrantyType] ?? warrantyType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                    style={{ backgroundColor: WARRANTY_BADGE_COLORS[master.warranty_type] ?? "#666" }}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {WARRANTY_SHORT[master.warranty_type] ?? master.warranty_type}
                  </span>
                  <span className="text-xs text-muted-foreground">{WARRANTY_LABELS[master.warranty_type]}</span>
                </div>
              )}

              {/* ② Pilih Warna */}
              {uniqueColors.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Pilih warna: <span className="text-muted-foreground font-normal">{master.color}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueColors.map(color => {
                      const isCurrent = color === master.color;
                      const targetSlug = getSlugForColor(color);
                      return (
                        <button key={color}
                          onClick={() => targetSlug && navigate(`/produk/${targetSlug}`)}
                          disabled={!targetSlug && !isCurrent}
                          className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                            isCurrent ? "border-foreground bg-foreground text-background"
                              : targetSlug ? "border-border text-foreground hover:border-foreground/60 bg-background"
                              : "border-border text-muted-foreground/40 bg-muted/20 cursor-not-allowed line-through")}>
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ③ Pilih Kapasitas */}
              {uniqueStorages.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Pilih kapasitas: <span className="text-muted-foreground font-normal">{storageLabel(master.storage_gb)}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueStorages.map(gb => {
                      const isCurrent = gb === master.storage_gb;
                      const targetSlug = getSlugForStorage(gb);
                      return (
                        <button key={gb}
                          onClick={() => targetSlug && navigate(`/produk/${targetSlug}`)}
                          disabled={!targetSlug && !isCurrent}
                          className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                            isCurrent ? "border-foreground bg-foreground text-background"
                              : targetSlug ? "border-border text-foreground hover:border-foreground/60 bg-background"
                              : "border-border text-muted-foreground/40 bg-muted/20 cursor-not-allowed line-through")}>
                          {storageLabel(gb)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Marketplace links */}
              {(catalog.tokopedia_url || catalog.shopee_url) && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Tersedia juga di marketplace resmi:</p>
                  <div className="flex gap-2 flex-wrap">
                    {catalog.tokopedia_url && (
                      <a href={catalog.tokopedia_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                        style={{ color: "#03AC0E" }}>
                        <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: "#03AC0E" }}>T</span>
                        Tokopedia <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {catalog.shopee_url && (
                      <a href={catalog.shopee_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                        style={{ color: "#EE4D2D" }}>
                        <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: "#EE4D2D" }}>S</span>
                        Shopee <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Purchase box */}
            <div className="lg:self-start">
              <div className="border border-border rounded-xl p-4 space-y-4 sticky top-20">
                <p className="text-sm font-semibold text-foreground">Atur pembelian</p>
                <p className="text-xs text-muted-foreground">{master.color} · {storageLabel(master.storage_gb)}</p>
                {!outOfStock && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-foreground font-medium">
                      Stok: <span className="text-amber-500 font-bold">Tersedia {units.length}</span>
                    </span>
                  </div>
                )}
                {/* Unit selector */}
                {!outOfStock && units.length > 1 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Pilih unit:</p>
                    <Select value={selectedUnitId ?? units[0]?.id ?? ""} onValueChange={setSelectedUnitId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.condition_status === "no_minus" ? "No Minus" : "Minus"} — {formatRupiah(u.selling_price)} — IMEI: {censorImei(u.imei)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Flash sale indicator */}
                {(() => {
                  const isFlashNotStarted = catalog?.is_flash_sale && flashSaleSettings?.is_active && 
                    new Date(flashSaleSettings.start_time).getTime() > Date.now();
                  if (isFlashNotStarted) {
                    const startAt = new Date(flashSaleSettings!.start_time);
                    return (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="text-xs">
                          <p className="font-semibold text-amber-700 dark:text-amber-400">Flash Sale Segera Dimulai</p>
                          <p className="text-amber-600 dark:text-amber-500 mt-0.5">
                            {startAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} pukul {startAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="text-xl font-bold text-foreground">{formatRupiah(selectedUnitId ? units.find(u => u.id === selectedUnitId)?.selling_price : minPrice)}</div>
                <div className="space-y-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
                      outOfStock
                        ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                        : "bg-foreground text-background hover:opacity-90"
                    )}
                  >
                    <ShoppingCart className="w-4 h-4" /> Keranjang
                  </button>
                  <button
                    onClick={() => {
                      handleAddToCart();
                      if (!outOfStock) navigate("/keranjang");
                    }}
                    disabled={outOfStock}
                    className={cn(
                      "w-full py-3 rounded-xl border-2 text-sm font-semibold transition-colors",
                      outOfStock
                        ? "border-border text-muted-foreground cursor-not-allowed opacity-50"
                        : "border-foreground text-foreground hover:bg-accent"
                    )}
                  >
                    Beli Langsung
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <button
                    onClick={() => {
                      const hour = new Date().getHours();
                      const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
                      const selectedUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) : units[0];
                      const imeiLast4 = selectedUnit ? selectedUnit.imei.slice(-4) : "****";
                      const conditionText = selectedUnit?.condition_status === "minus" ? "minus" : "no minus";
                      const msg = `${greeting} Admin Ivalora Gadget 👋\n\nSaya ingin bertanya tentang unit:\n📱 *${catalog.display_name}*\n🎨 Warna: ${master.color}\n💾 Kapasitas: ${storageLabel(master.storage_gb)}\n📋 Kondisi: ${conditionText}\n🔢 IMEI (4 digit terakhir): ${imeiLast4}\n\nApakah unit ini masih tersedia? Terima kasih! 🙏`;
                      window.open(`https://wa.me/6285890024760?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Chat Admin
                  </button>
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Share2 className="w-4 h-4" /> Bagikan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bonus Section ── */}
          {catalog.bonus_items.length > 0 && (
            <div className="py-6 border-t border-border">
              <h2 className="text-base font-bold text-foreground mb-3">🎁 Yang Anda Dapatkan dalam Paket Pembelian</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {catalog.bonus_items.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground">Hadiah · Free Gift</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">Variasi: {b.name}</p>
                      {b.description && <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>}
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 mt-1">Included · 1</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Value Proposition ── */}
          <div className="py-6 border-t border-border">
            <h2 className="text-base font-bold text-foreground mb-4">Kenapa Memilih Ivalora?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "IMEI Aman & Terdaftar" },
                { icon: CheckCircle2, label: "QC 30+ Checkpoint" },
                { icon: Zap, label: "Battery Health ≥ 81%" },
                { icon: BadgeCheck, label: "Tidak iCloud Lock" },
                { icon: Truck, label: "Packing Aman" },
                { icon: MessageCircle, label: "After Sales 30 Hari" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border">
                  <item.icon className="w-4 h-4 text-foreground shrink-0" />
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── TABS — show always since product is specific ── */}
          {isFullySpecific && (
            <div className="border-t border-border">
              <div className="flex overflow-x-auto border-b border-border -mb-px scrollbar-hide">
                {tabs.map(t => (
                  <Tab key={t.key} label={t.label} active={activeTab === t.key} onClick={() => setActiveTab(t.key as typeof activeTab)} />
                ))}
              </div>

              <div className="py-6">
                {/* TAB: Detail Produk */}
                {activeTab === "detail" && (
                  <div className="space-y-6">
                    {catalog.full_description && (
                      <div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{catalog.full_description}</p>
                      </div>
                    )}
                    <table className="w-full max-w-2xl">
                      <tbody>
                        {specsRows.map(r => <SpecRow key={r.label} label={r.label} value={r.value} />)}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB: Kondisi Unit — detailed unit cards */}
                {activeTab === "kondisi" && (
                  <div className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                      <div className="p-3 rounded-xl border border-border bg-muted/20 text-center">
                        <p className="text-2xl font-bold text-foreground">{units.length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Total Tersedia</p>
                      </div>
                      <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-center">
                        <p className="text-2xl font-bold text-green-700">{noMinusUnits.length}</p>
                        <p className="text-xs text-green-600 mt-0.5">No Minus</p>
                      </div>
                      <div className="p-3 rounded-xl border border-orange-200 bg-orange-50 text-center">
                        <p className="text-2xl font-bold text-orange-700">{minusUnits.length}</p>
                        <p className="text-xs text-orange-600 mt-0.5">Ada Minus</p>
                      </div>
                    </div>

                    {/* No minus units — detailed cards */}
                    {noMinusUnits.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">Unit No Minus ({noMinusUnits.length} unit)</p>
                        <div className="space-y-2">
                          {noMinusUnits.map((unit) => (
                            <div key={unit.id} className="p-4 rounded-xl border border-green-200 bg-green-50">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                  <span className="text-sm font-semibold text-green-800">
                                    {master.series} {master.color} {storageLabel(master.storage_gb)} — No Minus
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-foreground">{formatRupiah(unit.selling_price)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono mb-1.5">IMEI: {censorImei(unit.imei)}</p>
                              <p className="text-xs text-green-700">
                                ✅ Barang dalam kondisi prima — telah melewati quality control 30+ checkpoint. Siap digunakan tanpa kendala.
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Minus units — detailed cards */}
                    {minusUnits.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">Unit Ada Minus ({minusUnits.length} unit)</p>
                        <div className="space-y-2">
                          {minusUnits.map((unit) => (
                            <div key={unit.id} className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                                  <span className="text-sm font-semibold text-orange-800">
                                    {master.series} {master.color} {storageLabel(master.storage_gb)} — Minus {unit.minus_severity === "minor" ? "Minor" : unit.minus_severity === "mayor" ? "Mayor" : ""}
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-foreground">{formatRupiah(unit.selling_price)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono mb-1.5">IMEI: {censorImei(unit.imei)}</p>
                              {unit.minus_description ? (
                                <p className="text-xs text-orange-700">⚠️ {unit.minus_description}</p>
                              ) : (
                                <p className="text-xs text-orange-700">⚠️ Terdapat minus pada unit ini. Hubungi admin untuk detail lebih lanjut.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {units.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Stok habis</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: Penilaian */}
                {activeTab === "rating" && (
                  <div className="max-w-2xl">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex flex-col items-center justify-center bg-muted/30 border border-border rounded-2xl p-6 min-w-[160px] gap-2">
                        <span className="text-5xl font-black text-foreground">{(catalog.rating_score ?? 0).toFixed(1)}</span>
                        <StarRating score={catalog.rating_score ?? 0} count={catalog.rating_count ?? 0} />
                        <span className="text-xs text-muted-foreground mt-1">dari 5</span>
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        {[5, 4, 3, 2, 1].map(star => (
                          <div key={star} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-4 text-right">{star}</span>
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: "0%" }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-4">0</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(catalog.rating_count ?? 0) === 0 && (
                      <div className="mt-6 text-center py-10 rounded-xl border border-border bg-muted/10">
                        <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-foreground">Belum ada ulasan</p>
                        <p className="text-xs text-muted-foreground mt-1">Jadilah yang pertama memberikan ulasan.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: Garansi */}
                {activeTab === "garansi" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <div className="p-4 rounded-xl border border-border">
                      <p className="text-sm font-semibold text-foreground mb-2">✅ Termasuk dalam Garansi</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Garansi toko 30 hari mesin</li>
                        <li>• IMEI lifetime aktif terdaftar</li>
                        <li>• {WARRANTY_LABELS[master.warranty_type] ?? master.warranty_type}</li>
                        {catalog.spec_warranty_duration && <li>• Masa garansi: {catalog.spec_warranty_duration}</li>}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl border border-border">
                      <p className="text-sm font-semibold text-foreground mb-2">❌ Tidak Termasuk</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Kerusakan akibat jatuh/benturan</li>
                        <li>• Kerusakan akibat air/cairan</li>
                        <li>• Human error</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* TAB: Pengiriman */}
                {activeTab === "pengiriman" && (
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-border">
                      <Truck className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Dikirim dari</p>
                        <p className="text-sm text-muted-foreground">{catalog.spec_shipped_from || "Kota Surabaya, Jawa Timur"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-border">
                      <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Pengemasan</p>
                        <p className="text-sm text-muted-foreground">Bubble wrap + kardus tebal + asuransi pengiriman</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-border">
                      <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Pemeriksaan sebelum kirim</p>
                        <p className="text-sm text-muted-foreground">Semua unit dicek ulang dan dipacking oleh tim kami</p>
                      </div>
                    </div>
                    {catalog.free_shipping && (
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                        <Truck className="w-5 h-5 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-green-800">Gratis Ongkos Kirim</p>
                          <p className="text-sm text-green-700">Produk ini gratis ongkir ke seluruh Indonesia</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pb-16" />
        </div>
      </div>

      {/* Flash Sale Popup */}
      <AlertDialog open={showFlashSalePopup} onOpenChange={setShowFlashSalePopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Flash Sale Belum Dimulai
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {flashSaleSettings && (() => {
                const startAt = new Date(flashSaleSettings.start_time);
                const diffMs = startAt.getTime() - Date.now();
                const hours = Math.floor(diffMs / 3600000);
                const minutes = Math.ceil((diffMs % 3600000) / 60000);
                return (
                  <>
                    <p>Flash sale untuk produk ini belum dimulai. Harga spesial akan tersedia pada:</p>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        {startAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        Pukul {startAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hours > 0 ? `${hours} jam ${minutes} menit lagi` : `${minutes} menit lagi`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Kembali lagi nanti untuk mendapatkan harga flash sale!</p>
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Mengerti</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}