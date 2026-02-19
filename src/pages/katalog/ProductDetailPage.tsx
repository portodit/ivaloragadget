import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import {
  ChevronRight, Shield, CheckCircle2, Truck, MessageCircle,
  Share2, ChevronDown, ChevronUp, Package, Star, ExternalLink,
  ImageOff, BadgeCheck, Zap,
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
  bonus_items: BonusItem[];
  master_products: MasterProduct;
}

interface StockUnit {
  id: string;
  imei: string;
  condition_status: "no_minus" | "minus";
  minus_description: string | null;
  selling_price: number | null;
  stock_status: string;
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

const WARRANTY_BADGES: Record<string, { label: string; color: string }> = {
  resmi_bc: { label: "Resmi BC", color: "#007AFF" },
  ibox: { label: "Resmi iBox", color: "#34C759" },
  inter: { label: "Inter", color: "#FF9500" },
  whitelist: { label: "Whitelist", color: "#5856D6" },
  digimap: { label: "Digimap", color: "#FF2D55" },
};

function formatRupiah(n: number | null | undefined) {
  if (!n) return "—";
  return "Rp" + n.toLocaleString("id-ID");
}

function maskImei(imei: string) {
  if (imei.length < 8) return imei;
  return imei.slice(0, 4) + "××××" + imei.slice(-4);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogProduct | null>(null);
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [bonusOpen, setBonusOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data } = await db.from("catalog_products")
        .select("*, master_products(*)")
        .eq("slug", slug)
        .eq("catalog_status", "published")
        .single();

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Parse bonus_items if stored as JSON
      const rawBonus = data.bonus_items;
      const bonusItems: BonusItem[] = Array.isArray(rawBonus) ? rawBonus : [];
      setCatalog({ ...data, bonus_items: bonusItems });
      setActiveImg(data.thumbnail_url);

      // Fetch available stock units
      const { data: stockData } = await db.from("stock_units")
        .select("id, imei, condition_status, minus_description, selling_price, stock_status")
        .eq("product_id", data.product_id)
        .eq("stock_status", "available")
        .order("selling_price", { ascending: true });

      setUnits(stockData ?? []);
      setLoading(false);
    }
    if (slug) fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="pt-16">
          <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
            <div className="h-4 bg-muted rounded w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-10 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
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
        <div className="pt-16 flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-4">
          <Package className="w-16 h-16 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold text-foreground">Produk tidak ditemukan</h1>
          <p className="text-muted-foreground max-w-sm">
            Produk ini mungkin sudah tidak tersedia atau URL tidak valid.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            ← Kembali
          </button>
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
  const warrantyBadge = WARRANTY_BADGES[master.warranty_type];
  const outOfStock = units.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground py-4">
            <Link to="/" className="hover:text-foreground transition-colors">Beranda</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/katalog" className="hover:text-foreground transition-colors">Katalog</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-xs">{catalog.display_name}</span>
          </nav>

          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">

            {/* LEFT — Media */}
            <div className="space-y-3">
              {/* Main image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
                {activeImg ? (
                  <img src={activeImg} alt={catalog.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                    <ImageOff className="w-16 h-16" />
                    <span className="text-sm">Belum ada foto</span>
                  </div>
                )}

                {/* Badge overlays */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {catalog.free_shipping && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-500 text-white shadow-sm">
                      <Truck className="w-3 h-3" /> Gratis Ongkir
                    </span>
                  )}
                  {catalog.promo_label && (
                    <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500 text-white shadow-sm">
                      {catalog.promo_label}
                    </span>
                  )}
                  {catalog.promo_badge && (
                    <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-foreground text-background shadow-sm">
                      {catalog.promo_badge}
                    </span>
                  )}
                  {catalog.highlight_product && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-900 shadow-sm">
                      <Star className="w-3 h-3 fill-current" /> Unggulan
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

              {/* Gallery thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(url)}
                      className={cn(
                        "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                        activeImg === url ? "border-foreground scale-105" : "border-border hover:border-foreground/40"
                      )}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* QC promise */}
              <div className="bg-muted/40 rounded-xl p-3 border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  ✓ Seluruh unit telah melewati proses Quality Control 30+ checkpoint sebelum dijual.
                </p>
              </div>
            </div>

            {/* RIGHT — Info & transaksi */}
            <div className="space-y-5">
              {/* Warranty badge */}
              {warrantyBadge && (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                    style={{ backgroundColor: warrantyBadge.color }}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {warrantyBadge.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{WARRANTY_LABELS[master.warranty_type]}</span>
                </div>
              )}

              {/* Product name H1 */}
              <h1 className="text-2xl font-bold text-foreground leading-tight">{catalog.display_name}</h1>

              {/* Short description */}
              {catalog.short_description && (
                <p className="text-sm text-muted-foreground">{catalog.short_description}</p>
              )}

              {/* Price */}
              <div className="space-y-1">
                {outOfStock ? (
                  <div className="text-lg font-bold text-muted-foreground">Stok Habis</div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-foreground">{formatRupiah(minPrice)}</div>
                    {maxPrice && maxPrice !== minPrice && (
                      <p className="text-sm text-muted-foreground">s/d {formatRupiah(maxPrice)} tergantung kondisi unit</p>
                    )}
                  </>
                )}
              </div>

              {/* Stock info */}
              {!outOfStock && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-foreground font-medium">Tersedia {units.length} unit siap kirim</span>
                  {catalog.show_condition_breakdown && (
                    <span className="text-muted-foreground">
                      ({noMinusUnits.length} mulus, {minusUnits.length} ada minus)
                    </span>
                  )}
                </div>
              )}

              {/* Unit list */}
              {!outOfStock && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Tersedia</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {units.map((unit, i) => (
                      <div key={unit.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-muted/20 text-sm">
                        <div>
                          <span className="font-medium text-foreground">Unit {String.fromCharCode(65 + i)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{maskImei(unit.imei)}</span>
                          <span className={cn(
                            "ml-2 text-xs font-medium",
                            unit.condition_status === "no_minus" ? "text-green-600" : "text-orange-500"
                          )}>
                            {unit.condition_status === "no_minus" ? "✓ Mulus" : "Ada Minus"}
                          </span>
                        </div>
                        <span className="font-bold text-foreground">{formatRupiah(unit.selling_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div className="space-y-2 pt-1">
                <button
                  disabled
                  className="w-full py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold opacity-50 cursor-not-allowed"
                >
                  Beli Sekarang
                </button>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <MessageCircle className="w-4 h-4" /> Chat Admin
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <Share2 className="w-4 h-4" /> Bagikan
                  </button>
                </div>
              </div>

              {/* Marketplace shortcuts */}
              {(catalog.tokopedia_url || catalog.shopee_url) && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Tersedia juga di marketplace resmi kami:</p>
                  <div className="flex gap-2 flex-wrap">
                    {catalog.tokopedia_url && (
                      <a
                        href={catalog.tokopedia_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                        style={{ color: "#03AC0E" }}
                      >
                        <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: "#03AC0E" }}>T</span>
                        Tokopedia
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {catalog.shopee_url && (
                      <a
                        href={catalog.shopee_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                        style={{ color: "#EE4D2D" }}
                      >
                        <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: "#EE4D2D" }}>S</span>
                        Shopee
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Value Proposition ── */}
          <div className="py-8 border-t border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Kenapa Memilih Ivalora?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "IMEI Aman & Terdaftar", desc: "Setiap unit dapat dicek status IMEI-nya" },
                { icon: CheckCircle2, label: "QC 30+ Checkpoint", desc: "Seluruh fungsi diperiksa sebelum dijual" },
                { icon: Zap, label: "Battery Health ≥ 81%", desc: "Garansi kondisi baterai optimal" },
                { icon: BadgeCheck, label: "Tidak iCloud Lock", desc: "Unit bebas dari iCloud orang lain" },
                { icon: Truck, label: "Packing Aman", desc: "Dikemas bubble wrap + kardus tebal" },
                { icon: MessageCircle, label: "After Sales Support", desc: "Garansi toko 30 hari mesin" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                  <item.icon className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bonus Section ── */}
          {catalog.bonus_items.length > 0 && (
            <div className="py-6 border-t border-border">
              <button
                onClick={() => setBonusOpen(!bonusOpen)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-foreground">Yang Anda Dapatkan dalam Paket Pembelian</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Termasuk {catalog.bonus_items.length} Bonus & Perlindungan
                  </p>
                </div>
                {bonusOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>

              {bonusOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {catalog.bonus_items.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{b.name}</p>
                        {b.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                        )}
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Included
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Deskripsi Lengkap ── */}
          {catalog.full_description && (
            <div className="py-6 border-t border-border">
              <h2 className="text-lg font-bold text-foreground mb-3">Deskripsi Produk</h2>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {catalog.full_description}
              </div>
            </div>
          )}

          {/* ── Kondisi & Minus ── */}
          {catalog.show_condition_breakdown && minusUnits.length > 0 && (
            <div className="py-6 border-t border-border">
              <h2 className="text-lg font-bold text-foreground mb-3">Detail Kondisi Unit</h2>
              <div className="space-y-3">
                {minusUnits.map((unit, i) => (
                  <div key={unit.id} className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-orange-800">Unit {String.fromCharCode(65 + noMinusUnits.length + i)} — Ada Minus</span>
                      <span className="font-bold text-foreground">{formatRupiah(unit.selling_price)}</span>
                    </div>
                    {unit.minus_description && (
                      <p className="text-xs text-orange-700">{unit.minus_description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Garansi ── */}
          <div className="py-6 border-t border-border">
            <h2 className="text-lg font-bold text-foreground mb-3">Informasi Garansi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border">
                <p className="text-sm font-semibold text-foreground mb-2">✅ Termasuk</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Garansi toko 30 hari mesin</li>
                  <li>• IMEI lifetime aktif terdaftar</li>
                  <li>• {WARRANTY_LABELS[master.warranty_type] ?? master.warranty_type}</li>
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
          </div>

          {/* ── Pengiriman ── */}
          <div className="py-6 border-t border-border mb-12">
            <h2 className="text-lg font-bold text-foreground mb-3">Informasi Pengiriman</h2>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 shrink-0" />
                <span>Dikirim dari Surabaya, Jawa Timur</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Packing bubble wrap + kardus tebal + asuransi pengiriman</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Semua unit dikemas dan dicek ulang sebelum dikirim</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
