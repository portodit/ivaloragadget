import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, ChevronRight, MapPin, Clock, Phone, MessageCircle,
  ArrowRight, ShoppingBag, Instagram, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import iphone11Pro from "@/assets/iphone-11-pro.png";
import iphone13 from "@/assets/iphone-13.png";
import iphone13Pro from "@/assets/iphone-13-pro.png";
import iphone11 from "@/assets/iphone-11.png";
import logoShopee from "@/assets/logo-shopee.png";
import uvpQuality from "@/assets/uvp-quality.png";
import uvpGaransi from "@/assets/uvp-garansi.png";
import uvpHarga from "@/assets/uvp-harga.png";
import uvpCicilan from "@/assets/uvp-cicilan.png";
import heroBg from "@/assets/hero-bg.jpg";

const USD_RATE = 15500;

function useFormatPrice() {
  const { currency } = useLocale();
  return (n: number | null | undefined) => {
    if (!n) return "—";
    if (currency === "USD") {
      const usd = n / USD_RATE;
      return "$" + usd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return "Rp " + n.toLocaleString("id-ID");
  };
}

function useT() {
  const { lang } = useLocale();
  return (id: string, en: string) => lang === "en" ? en : id;
}

interface Product {
  id: string;
  display_name: string;
  slug: string | null;
  thumbnail_url: string | null;
  override_display_price: number | null;
  highlight_product: boolean;
  promo_badge: string | null;
  promo_label: string | null;
  rating_score: number | null;
  free_shipping: boolean;
  spec_warranty_duration: string | null;
  product_id: string;
}

interface StockPriceInfo {
  product_id: string;
  min_price: number | null;
  max_price: number | null;
}

// ─── iPhone category cards ────────────────────────────────────────────────────
const IPHONE_CATEGORIES = [
  { name: "iPhone 11", img: iphone11, year: "2019", tag: "Hemat & Handal" },
  { name: "iPhone 11 Pro", img: iphone11Pro, year: "2019", tag: "Kamera Triple" },
  { name: "iPhone 13", img: iphone13, year: "2021", tag: "Baterai Tahan Lama" },
  { name: "iPhone 13 Pro", img: iphone13Pro, year: "2021", tag: "Layar ProMotion" },
];

// ─── UVP cards ────────────────────────────────────────────────────────────────
const UVP_CARDS = [
  {
    emoji: "✅",
    title: "Premium Quality",
    titleEn: "Premium Quality",
    short: "QC ketat di 30+ checkpoint",
    shortEn: "Strict QC at 30+ checkpoints",
    desc: "Setiap unit melewati pengecekan menyeluruh sebelum dijual. Fungsi utama dipastikan normal dan kondisi dijelaskan secara transparan — kamu tahu persis apa yang kamu beli.",
    descEn: "Every unit undergoes thorough inspection before sale. Core functions are verified and condition is transparently described.",
    img: uvpQuality,
  },
  {
    emoji: "🛡️",
    title: "Free Garansi Unit",
    titleEn: "Free Unit Warranty",
    short: "Garansi toko berlaku penuh",
    shortEn: "Full store warranty included",
    desc: "Setiap pembelian dilengkapi garansi sesuai ketentuan toko. Jika ada kendala selama masa garansi, unit bisa dikonsultasikan dan ditangani langsung oleh tim Ivalora.",
    descEn: "Every purchase includes warranty per store policy. Any issues during warranty period can be consulted and handled directly by the Ivalora team.",
    img: uvpGaransi,
  },
  {
    emoji: "💰",
    title: "Jaminan Harga Terbaik",
    titleEn: "Best Price Guarantee",
    short: "Harga pasar, transparan, no hidden fee",
    shortEn: "Market price, transparent, no hidden fees",
    desc: "Harga disesuaikan kondisi unit dan mengikuti harga pasar terkini. Tanpa biaya tersembunyi, plus tersedia opsi tukar tambah untuk memudahkan upgrade perangkat.",
    descEn: "Prices follow current market rates based on unit condition. No hidden fees, plus trade-in options available.",
    img: uvpHarga,
  },
  {
    emoji: "💳",
    title: "Cicilan Mudah & Aman",
    titleEn: "Easy & Safe Installments",
    short: "Tersedia via Shopee & Tokopedia",
    shortEn: "Available via Shopee & Tokopedia",
    desc: "Pembelian tersedia melalui marketplace resmi seperti Shopee dan Tokopedia dengan sistem pembayaran aman, termasuk opsi cicilan sesuai ketentuan platform.",
    descEn: "Available through official marketplaces like Shopee and Tokopedia with secure payment systems, including installment options.",
    img: uvpCicilan,
  },
];

// ─── Store branches ───────────────────────────────────────────────────────────
const BRANCHES = [
  {
    id: "sukodono",
    name: "Ivalora Gadget — Sukodono",
    address: "Jl. Raya Sukodono, Sidoarjo, Jawa Timur",
    hours: "Senin – Sabtu: 09.00 – 20.00 WIB",
    phone: "0858-9002-4760",
    mapSrc: "https://maps.google.com/maps?q=-7.293936,112.814863&z=16&output=embed",
    mapsUrl: "https://maps.app.goo.gl/Qep4kZ3rViH2XWRZ6",
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Rizky A.", city: "Surabaya", rating: 5, text: "iPhone 13 Pro yang saya beli kondisinya mulus banget. IMEI bersih, garansi toko ada, dan prosesnya cepat. Recommended banget!" },
  { name: "Dewi S.", city: "Jakarta", rating: 5, text: "Order via Shopee, packing aman dan pengiriman kilat. HP kondisinya persis seperti deskripsi, tidak ada yang mengecewakan." },
  { name: "Budi H.", city: "Sidoarjo", rating: 5, text: "Sudah 3x beli di sini, selalu puas. Harga kompetitif, unit bersih, admin fast response. Nggak perlu cari yang lain." },
];

// ─── Countdown ───────────────────────────────────────────────────────────────
function useCountdown(endHour: number) {
  const getRemaining = () => {
    const now = new Date();
    const end = new Date();
    end.setHours(endHour, 0, 0, 0);
    if (end <= now) end.setDate(end.getDate() + 1);
    const diff = end.getTime() - now.getTime();
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(getRemaining());
  useEffect(() => {
    const t = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function CountdownBlock({ val, label }: { val: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-lg w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center text-lg sm:text-xl font-bold tabular-nums"
        style={{ background: "hsl(0 0% 100% / 0.08)", color: "hsl(38 92% 50%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
      >
        {String(val).padStart(2, "0")}
      </div>
      <span className="text-[9px] mt-1 uppercase tracking-widest" style={{ color: "hsl(0 0% 40%)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
            else setCount(target);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  const formatted = target >= 1000
    ? count.toLocaleString("id-ID")
    : count % 1 !== 0
    ? count.toFixed(1)
    : String(count);

  return <div ref={ref}>{formatted}{suffix}</div>;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const t = useT();
  const formatPrice = useFormatPrice();
  const { lang } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [highlight, setHighlight] = useState<Product[]>([]);
  const [stockPrices, setStockPrices] = useState<StockPriceInfo[]>([]);
  const { h, m, s } = useCountdown(22);
  const [activeUvp, setActiveUvp] = useState(0);
  const [activeBranch, setActiveBranch] = useState(0);
  const uvpImgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("catalog_products")
        .select("id, display_name, slug, thumbnail_url, override_display_price, highlight_product, promo_badge, promo_label, rating_score, free_shipping, spec_warranty_duration, product_id")
        .eq("catalog_status", "published")
        .eq("publish_to_web", true)
        .limit(12);
      if (data) {
        setHighlight(data.filter((p) => p.highlight_product).slice(0, 4));
        setProducts(data.slice(0, 8));

        const productIds = data.map((p) => p.product_id);
        if (productIds.length > 0) {
          const { data: stockData } = await supabase
            .from("stock_units")
            .select("product_id, selling_price")
            .in("product_id", productIds)
            .eq("stock_status", "available")
            .not("selling_price", "is", null);

          if (stockData) {
            const priceMap: Record<string, { min: number; max: number }> = {};
            for (const unit of stockData) {
              if (!unit.selling_price) continue;
              if (!priceMap[unit.product_id]) {
                priceMap[unit.product_id] = { min: unit.selling_price, max: unit.selling_price };
              } else {
                priceMap[unit.product_id].min = Math.min(priceMap[unit.product_id].min, unit.selling_price);
                priceMap[unit.product_id].max = Math.max(priceMap[unit.product_id].max, unit.selling_price);
              }
            }
            setStockPrices(
              Object.entries(priceMap).map(([product_id, { min, max }]) => ({
                product_id,
                min_price: min,
                max_price: max,
              }))
            );
          }
        }
      }
    })();
  }, []);

  const branch = BRANCHES[activeBranch];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* ══════════════════════════════════════════════════════════════
          HERO — Full bleed photo background, dark left overlay
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden flex items-center min-h-[92vh]">
        <img
          src={heroBg}
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, hsl(0 0% 3% / 0.97) 0%, hsl(0 0% 5% / 0.88) 35%, hsl(0 0% 8% / 0.5) 65%, hsl(0 0% 0% / 0.05) 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-32"
          style={{ background: "linear-gradient(180deg, hsl(0 0% 3% / 0.7) 0%, transparent 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-32"
          style={{ background: "linear-gradient(0deg, hsl(0 0% 3% / 0.8) 0%, transparent 100%)" }} />

        <div className="max-w-6xl mx-auto px-6 w-full py-28 relative z-10">
          <div className="max-w-2xl space-y-8">
            {/* Tag */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{ background: "hsl(0 0% 100% / 0.07)", border: "1px solid hsl(0 0% 100% / 0.12)", color: "hsl(0 0% 70%)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(142 71% 45%)" }} />
              🔥 {t("Stok Selalu Tersedia", "Always In Stock")}
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl xl:text-[3.6rem] font-bold leading-[1.07] tracking-tight text-white">
                {t("Pusat Jual Beli", "Buy & Sell Center")}<br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(90deg, hsl(0 0% 100%), hsl(0 0% 70%))" }}
                >
                  {t("iPhone Resmi Surabaya.", "Official iPhone Surabaya.")}
                </span>
              </h1>
              <p className="text-base md:text-lg leading-relaxed max-w-md" style={{ color: "hsl(0 0% 58%)" }}>
                {t(
                  "Unit bergaransi, IMEI terdaftar, kondisi transparan. Ribuan pelanggan sudah mempercayakan pembelian iPhone mereka ke Ivalora.",
                  "Warranted units, registered IMEI, transparent condition. Thousands of customers have trusted Ivalora for their iPhone purchases."
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="font-semibold rounded-xl gap-2 px-7 h-12"
                style={{ background: "hsl(0 0% 100%)", color: "hsl(0 0% 8%)" }}
                onClick={() => navigate("/katalog")}
              >
                {t("Lihat Katalog", "View Catalog")} <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                className="rounded-xl gap-2 px-7 h-12 font-medium"
                style={{ background: "hsl(0 0% 100% / 0.08)", border: "1px solid hsl(0 0% 100% / 0.15)", color: "hsl(0 0% 85%)" }}
                onClick={() => window.open("https://wa.me/6285890024760", "_blank")}
              >
                <MessageCircle className="w-4 h-4" /> {t("Konsultasi Gratis", "Free Consultation")}
              </Button>
            </div>

            {/* Stats — Large, prominent with animated counter */}
            <div className="flex items-center gap-6 sm:gap-10 pt-4">
              {[
                { target: 5000, suffix: "+", label: t("Pelanggan Puas", "Happy Customers") },
                { target: 10000, suffix: "+", label: t("Unit Terjual", "Units Sold") },
                { target: 4.9, suffix: "★", label: t("Rating Toko", "Store Rating"), isDecimal: true },
              ].map((stat) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <p className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                    {stat.isDecimal ? (
                      <span>4.9<span className="text-2xl sm:text-3xl">★</span></span>
                    ) : (
                      <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                    )}
                  </p>
                  <p className="text-xs sm:text-sm mt-1.5 font-medium" style={{ color: "hsl(0 0% 55%)" }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          KENAPA IVALORA — 2-column interactive cards (MOVED UP)
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6" style={{ background: "hsl(0 0% 97%)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t("Kenapa Ivalora?", "Why Ivalora?")}</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              {t("Beli iPhone dengan Tenang,", "Buy iPhone with Peace of Mind,")}<br />
              <span style={{ color: "hsl(0 0% 45%)" }}>{t("Tanpa Tanda Tanya.", "No Questions Asked.")}</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
            <div className="space-y-3">
              {UVP_CARDS.map((card, i) => (
                <button
                  key={card.title}
                  onClick={() => setActiveUvp(i)}
                  className="w-full text-left rounded-2xl p-5 border transition-all duration-200"
                  style={{
                    background: activeUvp === i ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
                    borderColor: activeUvp === i ? "hsl(0 0% 8%)" : "hsl(214 32% 91%)",
                    boxShadow: activeUvp === i ? "0 8px 24px hsl(0 0% 0% / 0.15)" : "none",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl leading-none mt-0.5">{card.emoji}</span>
                    <div>
                      <p className="font-semibold text-sm"
                        style={{ color: activeUvp === i ? "hsl(0 0% 100%)" : "hsl(0 0% 10%)" }}>
                        {lang === "en" ? card.titleEn : card.title}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed"
                        style={{ color: activeUvp === i ? "hsl(0 0% 60%)" : "hsl(215 16% 47%)" }}>
                        {lang === "en" ? card.shortEn : card.short}
                      </p>
                      {activeUvp === i && (
                        <p className="text-xs mt-3 leading-relaxed" style={{ color: "hsl(0 0% 65%)" }}>
                          {lang === "en" ? card.descEn : card.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div
              ref={uvpImgRef}
              className="rounded-2xl overflow-hidden sticky top-24 relative"
              style={{ aspectRatio: "16/10", background: "hsl(214 32% 91%)" }}
            >
              {UVP_CARDS.map((card, i) => (
                <img
                  key={card.title}
                  src={card.img}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
                  style={{ opacity: activeUvp === i ? 1 : 0 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FLASH SALE (MOVED UP — after Kenapa Ivalora)
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(0 0% 6%) 0%, hsl(15 60% 8%) 50%, hsl(0 0% 5%) 100%)" }}
          >
            <div className="absolute top-0 right-1/4 w-48 h-48 rounded-full blur-[70px] opacity-15"
              style={{ background: "hsl(15 90% 55%)" }} />
            <div className="absolute bottom-0 right-0 w-64 h-40 rounded-full blur-[80px] opacity-10"
              style={{ background: "hsl(38 92% 50%)" }} />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider"
                    style={{ background: "hsl(15 90% 55%)", color: "hsl(0 0% 100%)" }}
                  >
                    <Zap className="w-3 h-3" /> Flash Sale
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 55%)", border: "1px solid hsl(38 92% 50% / 0.25)" }}>
                    {t("Hari Ini Saja", "Today Only")}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
                  {t("Penawaran Terbatas,", "Limited Offer,")}<br />
                  <span style={{ color: "hsl(38 92% 55%)" }}>{t("Stok Cepat Habis.", "Selling Fast.")}</span>
                </h2>
                <p className="text-sm" style={{ color: "hsl(0 0% 45%)" }}>
                  {t("Harga spesial berlaku sampai pukul 22:00 WIB", "Special prices valid until 10:00 PM WIB")}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <p className="text-xs uppercase tracking-widest" style={{ color: "hsl(0 0% 40%)" }}>{t("Berakhir dalam", "Ends in")}</p>
                <div className="flex items-center gap-2">
                  <CountdownBlock val={h} label={t("Jam", "Hr")} />
                  <span className="text-2xl font-bold pb-4" style={{ color: "hsl(38 92% 50%)" }}>:</span>
                  <CountdownBlock val={m} label={t("Menit", "Min")} />
                  <span className="text-2xl font-bold pb-4" style={{ color: "hsl(38 92% 50%)" }}>:</span>
                  <CountdownBlock val={s} label={t("Detik", "Sec")} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(highlight.length ? highlight : products.slice(0, 4)).map((p) => (
              <ProductCard key={p.id} product={p} isFlashSale stockPrices={stockPrices} formatPrice={formatPrice} />
            ))}
            {highlight.length === 0 && products.length === 0 &&
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            }
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" className="rounded-xl gap-2 px-8" onClick={() => navigate("/katalog")}>
              {t("Lihat Semua Produk", "View All Products")} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          KOLEKSI PILIHAN — (MOVED DOWN — after Flash Sale)
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">{t("Koleksi Pilihan", "Curated Collection")}</p>
              <h2 className="text-2xl font-bold">{t("iPhone Tersedia", "Available iPhones")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("Unit terpilih, kualitas terjamin, harga terbaik", "Hand-picked units, guaranteed quality, best prices")}</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => navigate("/katalog")}>
              {t("Lihat Semua", "View All")} <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {IPHONE_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                onClick={() => navigate("/katalog")}
                className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)" }}
              >
                <div
                  className="relative h-52 flex items-center justify-center overflow-hidden"
                  style={{ background: "hsl(0 0% 10%)" }}
                >
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="h-40 w-auto object-contain group-hover:scale-105 transition-transform duration-500"
                    style={{ filter: "drop-shadow(0 8px 24px hsl(0 0% 0% / 0.5))" }}
                  />
                </div>
                <div style={{ height: 1, background: "hsl(0 0% 15%)" }} />
                <div className="px-4 py-3.5">
                  <p className="font-semibold text-sm" style={{ color: "hsl(0 0% 92%)" }}>{cat.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(0 0% 40%)" }}>{t("Rilis", "Released")} {cat.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PRODUK UNGGULAN — Grid layout (no scrollbar)
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-8 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold">{t("Produk Unggulan", "Featured Products")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("Unit terbaik yang paling banyak diminati", "Best units most in demand")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/katalog")} className="gap-1.5 rounded-xl">
              {t("Semua Produk", "All Products")} <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.length > 0
              ? products.map((p) => (
                  <ProductCard key={p.id} product={p} stockPrices={stockPrices} formatPrice={formatPrice} />
                ))
              : Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
            }
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MARKETPLACE
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t("Tersedia di", "Available On")}</p>
          <h2 className="text-2xl font-bold">{t("Official Marketplace Store", "Official Marketplace Store")}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t("Belanja online dengan proteksi penuh dari platform terpercaya", "Shop online with full protection from trusted platforms")}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="border border-border rounded-2xl p-7 flex flex-col items-center gap-4 hover:shadow-md transition-shadow bg-card">
            <img src={logoShopee} alt="Shopee" className="h-10 object-contain" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: "hsl(var(--star))" }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Rating 5.0 · Official Store</p>
            </div>
            <Button className="w-full rounded-xl gap-2"
              onClick={() => window.open("https://shopee.co.id/ivalora_gadget", "_blank")}>
              {t("Kunjungi Toko Shopee", "Visit Shopee Store")} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="border border-border rounded-2xl p-7 flex flex-col items-center gap-4 hover:shadow-md transition-shadow bg-card">
            <div className="h-10 flex items-center">
              <span className="text-2xl font-extrabold" style={{ color: "hsl(142 71% 38%)" }}>tokopedia</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: "hsl(var(--star))" }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Rating 5.0 · Power Merchant</p>
            </div>
            <Button variant="outline" className="w-full rounded-xl gap-2"
              style={{ color: "hsl(142 71% 38%)", borderColor: "hsl(142 71% 38%)" }}
              onClick={() => window.open("https://www.tokopedia.com/ivalora", "_blank")}>
              {t("Kunjungi Toko Tokopedia", "Visit Tokopedia Store")} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TOKO FISIK
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6" style={{ background: "hsl(0 0% 97%)" }} id="tentang">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t("Toko Fisik", "Physical Store")}</p>
            <h2 className="text-3xl font-bold leading-tight">
              {t("Temui Kami Langsung.", "Meet Us In Person.")}<br />
              <span style={{ color: "hsl(0 0% 45%)" }}>{t("Lihat, Coba, Baru Beli.", "See, Try, Then Buy.")}</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3 max-w-xl">
              {t(
                "Ingin melihat kondisi unit secara langsung sebelum memutuskan? Datangi toko kami — tim kami siap membantu tanpa tekanan.",
                "Want to see the unit's condition in person? Visit our store — our team is ready to help without pressure."
              )}
            </p>
          </div>

          <div className="grid lg:grid-cols-[2fr_3fr] gap-5 items-stretch">
            <div className="space-y-3">
              {BRANCHES.map((br, i) => (
                <button
                  key={br.id}
                  onClick={() => setActiveBranch(i)}
                  className="w-full text-left rounded-2xl p-5 transition-all duration-200 group"
                  style={{
                    background: "hsl(0 0% 100%)",
                    border: `1.5px solid ${activeBranch === i ? "hsl(0 0% 20%)" : "hsl(214 32% 88%)"}`,
                    boxShadow: activeBranch === i
                      ? "0 4px 20px hsl(0 0% 0% / 0.08)"
                      : "0 1px 3px hsl(0 0% 0% / 0.04)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: activeBranch === i ? "hsl(0 0% 8%)" : "hsl(0 0% 95%)" }}
                    >
                      <MapPin className="w-5 h-5" style={{ color: activeBranch === i ? "hsl(0 0% 90%)" : "hsl(0 0% 35%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{br.name}</p>
                      <p className="text-xs mt-1 leading-relaxed text-muted-foreground">{br.address}</p>
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 shrink-0" /> {br.hours}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" /> {br.phone}
                        </div>
                        <a
                          href={br.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold"
                          style={{ color: "hsl(210 100% 50%)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ArrowRight className="w-3 h-3" /> {t("Buka di Google Maps", "Open in Google Maps")}
                        </a>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden relative"
              style={{ minHeight: 320, border: "1.5px solid hsl(214 32% 88%)" }}>
              {BRANCHES.map((br, i) => (
                <iframe
                  key={br.id}
                  title={br.name}
                  className="w-full h-full absolute inset-0 transition-opacity duration-500"
                  style={{ border: 0, opacity: activeBranch === i ? 1 : 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={br.mapSrc}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t("Apa Kata Mereka", "What They Say")}</p>
          <h2 className="text-2xl font-bold">{t("Dipercaya 5.000+ Pembeli", "Trusted by 5,000+ Buyers")}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((tst) => (
            <div key={tst.name} className="border border-border rounded-2xl p-6 bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: tst.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: "hsl(var(--star))" }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{tst.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                  <span className="text-xs font-bold">{tst.name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{tst.name}</p>
                  <p className="text-xs text-muted-foreground">{tst.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 text-white" id="kontak"
        style={{ background: "linear-gradient(135deg, hsl(0 0% 7%) 0%, hsl(220 20% 10%) 100%)" }}>
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "hsl(0 0% 40%)" }}>{t("Hubungi Kami", "Contact Us")}</p>
          <h2 className="text-3xl md:text-4xl font-bold">{t("Ada yang Ingin", "Have a")}<br />{t("Ditanyakan?", "Question?")}</h2>
          <p className="text-base leading-relaxed" style={{ color: "hsl(0 0% 55%)" }}>
            {t(
              "Tim kami aktif setiap hari dan siap membantu Anda menemukan iPhone yang paling sesuai — berdasarkan budget, kondisi, dan kebutuhan nyata Anda.",
              "Our team is active every day and ready to help you find the perfect iPhone — based on your budget, condition preference, and real needs."
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="rounded-xl gap-2 font-semibold"
              style={{ background: "hsl(142 71% 40%)", color: "hsl(0 0% 100%)" }}
              onClick={() => window.open("https://wa.me/6285890024760", "_blank")}>
              <MessageCircle className="w-4 h-4" /> Chat via WhatsApp
            </Button>
            <Button size="lg" className="rounded-xl gap-2"
              style={{ background: "hsl(0 0% 100% / 0.08)", border: "1px solid hsl(0 0% 100% / 0.12)", color: "hsl(0 0% 80%)" }}
              onClick={() => navigate("/katalog")}>
              <ShoppingBag className="w-4 h-4" /> {t("Lihat Katalog", "View Catalog")}
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="bg-background border-t border-border py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-1 space-y-4">
              <img src={logoHorizontal} alt="Ivalora Gadget" className="h-7" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(
                  "Pusat jual beli iPhone terpercaya di Surabaya. Unit bergaransi, IMEI bersih, harga kompetitif.",
                  "Trusted iPhone buy & sell center in Surabaya. Warranted units, clean IMEI, competitive prices."
                )}
              </p>
              <div className="flex items-center gap-3">
                <a href="https://instagram.com/ivalora_gadget" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-foreground/5 hover:bg-foreground hover:text-background flex items-center justify-center transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">{t("Navigasi", "Navigation")}</h4>
              {[
                { label: t("Beranda", "Home"), href: "/" },
                { label: t("Katalog Produk", "Product Catalog"), href: "/katalog" },
                { label: t("Tentang Kami", "About Us"), href: "#tentang" },
                { label: t("Hubungi Kami", "Contact Us"), href: "#kontak" },
              ].map((l) => (
                <div key={l.label}>
                  <Link to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Customer Service</h4>
              <p className="text-sm text-muted-foreground">0858-9002-4760</p>
              <p className="text-sm text-muted-foreground">{t("Senin – Sabtu, 09.00 – 20.00 WIB", "Mon – Sat, 09:00 – 20:00 WIB")}</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Marketplace</h4>
              <a href="https://shopee.co.id/ivalora_gadget" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <img src={logoShopee} alt="Shopee" className="h-5 w-auto" />
                Shopee
              </a>
              <a href="https://www.tokopedia.com/ivalora" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-bold text-sm" style={{ color: "hsl(142 71% 38%)" }}>T</span>
                Tokopedia
              </a>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 Ivalora Gadget. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Surabaya, Jawa Timur, Indonesia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  isFlashSale,
  stockPrices,
  formatPrice,
}: {
  product: Product;
  isFlashSale?: boolean;
  stockPrices: StockPriceInfo[];
  formatPrice: (n: number | null | undefined) => string;
}) {
  const navigate = useNavigate();
  const href = product.slug ? `/produk/${product.slug}` : "#";

  const stockInfo = stockPrices.find((s) => s.product_id === product.product_id);
  const displayPrice = product.override_display_price ?? stockInfo?.min_price ?? null;
  const maxPrice = stockInfo?.max_price ?? null;
  const hasRange = stockInfo && stockInfo.min_price !== stockInfo.max_price;

  const flashOriginal = displayPrice ? Math.round(displayPrice * 1.18) : null;

  return (
    <div
      onClick={() => navigate(href)}
      className="border border-border rounded-2xl overflow-hidden bg-card hover:shadow-lg transition-all duration-200 cursor-pointer group h-full"
    >
      <div className="relative bg-secondary/30 h-44 flex items-center justify-center overflow-hidden">
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.display_name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-foreground/10 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-foreground/20" />
          </div>
        )}
        {isFlashSale && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1"
            style={{ background: "hsl(15 90% 55%)", color: "hsl(0 0% 100%)" }}>
            <Zap className="w-2.5 h-2.5" /> FLASH
          </span>
        )}
        {product.promo_badge && !isFlashSale && (
          <span className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
            {product.promo_badge}
          </span>
        )}
        {product.free_shipping && (
          <span className="absolute bottom-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{ background: "hsl(142 71% 45%)", color: "hsl(0 0% 100%)" }}>
            FREE ONGKIR
          </span>
        )}
        {isFlashSale && displayPrice && flashOriginal && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-black px-1.5 py-0.5 rounded-md"
            style={{ background: "hsl(0 72% 50%)", color: "hsl(0 0% 100%)" }}>
            HEMAT {Math.round(((flashOriginal - displayPrice) / flashOriginal) * 100)}%
          </span>
        )}
      </div>

      <div className="p-4 space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">
          {product.spec_warranty_duration ?? "Garansi Toko 1 Bulan"}
        </p>
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {product.display_name}
        </p>
        {product.rating_score != null && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" style={{ color: "hsl(var(--star))" }} />
            <span className="text-xs text-muted-foreground">{product.rating_score.toFixed(1)}</span>
          </div>
        )}
        <div className="pt-0.5">
          {displayPrice ? (
            <>
              {isFlashSale && flashOriginal && (
                <p className="text-xs text-muted-foreground line-through">{formatPrice(flashOriginal)}</p>
              )}
              <p className="text-base font-bold text-foreground">
                {hasRange && !isFlashSale
                  ? `${formatPrice(stockInfo!.min_price!)} – ${formatPrice(maxPrice!)}`
                  : formatPrice(displayPrice)}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground italic">Cek Harga →</p>
          )}
        </div>
        <Button
          size="sm"
          className="w-full rounded-xl text-xs mt-1"
          onClick={(e) => { e.stopPropagation(); navigate(href); }}
        >
          Lihat Detail
        </Button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card animate-pulse">
      <div className="bg-secondary/50 h-44" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-secondary rounded-lg w-1/2" />
        <div className="h-4 bg-secondary rounded-lg w-3/4" />
        <div className="h-5 bg-secondary rounded-lg w-1/2" />
        <div className="h-9 bg-secondary rounded-xl" />
      </div>
    </div>
  );
}
