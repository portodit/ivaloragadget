import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, BadgeCheck, Wrench, Store, Star, ChevronRight,
  MapPin, Clock, Phone, MessageCircle, ArrowRight, Play,
  Package, Truck, HeartHandshake, Instagram, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { supabase } from "@/integrations/supabase/client";
import logoFull from "@/assets/logo-full.svg";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import iphone11Pro from "@/assets/iphone-11-pro.png";
import iphone13 from "@/assets/iphone-13.png";
import iphone13Pro from "@/assets/iphone-13-pro.png";
import iphone11 from "@/assets/iphone-11.png";
import logoShopee from "@/assets/logo-shopee.png";

// ─── helpers ────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

// ─── types ──────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  display_name: string;
  slug: string | null;
  thumbnail_url: string | null;
  override_display_price: number | null;
  highlight_product: boolean;
  promo_badge: string | null;
  rating_score: number | null;
  free_shipping: boolean;
  spec_warranty_duration: string | null;
}

// ─── UVP Cards ──────────────────────────────────────────────────────────────
const UVP = [
  { icon: Shield, title: "IMEI Resmi & Aman", desc: "Setiap unit dicek IMEI-nya sebelum pengiriman — tidak masuk daftar hitam." },
  { icon: BadgeCheck, title: "Garansi 1 Bulan", desc: "Garansi toko berlaku 1 bulan untuk kerusakan internal sejak tanggal pembelian." },
  { icon: Wrench, title: "QC 30+ Checkpoint", desc: "Prosedur quality control ketat di lebih dari 30 titik sebelum produk dijual." },
  { icon: Store, title: "Offline Store & Marketplace", desc: "Toko fisik di Surabaya dan hadir di Shopee & Tokopedia sebagai official store." },
];

// ─── Testimonials ────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Rizky A.", city: "Surabaya", rating: 5, text: "Unit iPhone 13 Pro yang saya beli kondisinya mulus banget, IMEI clear, garansi toko juga ada. Proses cepat dan aman!" },
  { name: "Dewi S.", city: "Jakarta", rating: 5, text: "Belanja online dari Shopee, pengiriman kilat dan packing aman. HP sesuai deskripsi, sangat rekomended!" },
  { name: "Budi H.", city: "Sidoarjo", rating: 5, text: "Sudah 3x beli di Ivalora, selalu puas. Harga kompetitif, unit bersih, dan admin responsif banget." },
];

// ─── Countdown Timer ─────────────────────────────────────────────────────────
function useCountdown(endHour: number) {
  const getRemaining = () => {
    const now = new Date();
    const end = new Date();
    end.setHours(endHour, 0, 0, 0);
    if (end <= now) end.setDate(end.getDate() + 1);
    const diff = end.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s };
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
      <div className="bg-foreground text-background rounded-xl w-14 h-14 flex items-center justify-center text-2xl font-bold tabular-nums">
        {String(val).padStart(2, "0")}
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [highlight, setHighlight] = useState<Product[]>([]);
  const { h, m, s } = useCountdown(22); // Flash sale ends at 22:00

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("catalog_products")
        .select("id, display_name, slug, thumbnail_url, override_display_price, highlight_product, promo_badge, rating_score, free_shipping, spec_warranty_duration")
        .eq("catalog_status", "published")
        .eq("publish_to_web", true)
        .limit(12);
      if (data) {
        setHighlight(data.filter((p) => p.highlight_product).slice(0, 4));
        setProducts(data.slice(0, 8));
      }
    })();
  }, []);

  const heroImages = [iphone13Pro, iphone13, iphone11Pro, iphone11];
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroImages.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-[Poppins,sans-serif]">
      <PublicNavbar />

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-foreground text-background min-h-[90vh] flex items-center">
        {/* Grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(hsl(0 0% 100% / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(var(--hero-glow))" }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full opacity-5 blur-3xl bg-primary-foreground" />

        <div className="max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center py-20 lg:py-0">
          {/* Text */}
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 rounded-full px-4 py-1.5 text-xs font-medium text-primary-foreground/70 border border-primary-foreground/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-available))] animate-pulse" />
              Stok tersedia · Surabaya
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
                Pusat Jual Beli<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--hero-glow)), hsl(var(--hero-glow-2)))" }}>
                  iPhone Terpercaya
                </span>
              </h1>
              <p className="text-base md:text-lg text-primary-foreground/60 max-w-lg leading-relaxed">
                Unit bergaransi, IMEI aman, dan telah melalui Quality Control sebelum dikirim ke tangan Anda.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-white text-foreground hover:bg-white/90 font-semibold rounded-xl gap-2 px-6"
                onClick={() => navigate("/katalog")}
              >
                Lihat Produk <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white bg-transparent hover:bg-white/10 rounded-xl gap-2 px-6"
                onClick={() => window.open("https://wa.me/6285890024760", "_blank")}
              >
                <MessageCircle className="w-4 h-4" /> Chat Admin
              </Button>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6 pt-2">
              {[
                { val: "5.000+", label: "Pelanggan" },
                { val: "10.000+", label: "Unit Terjual" },
                { val: "4.9★", label: "Rating Toko" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-bold text-white">{stat.val}</p>
                  <p className="text-xs text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* iPhone image carousel */}
          <div className="relative flex justify-center items-end h-[460px] lg:h-auto">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(var(--hero-glow))" }} />
            </div>
            {heroImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="iPhone"
                className={`absolute bottom-0 max-h-[420px] w-auto object-contain drop-shadow-2xl transition-all duration-700 ease-in-out ${
                  i === heroIdx ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
                }`}
              />
            ))}
            {/* Dots */}
            <div className="absolute bottom-4 flex gap-1.5">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className={`rounded-full transition-all duration-300 ${i === heroIdx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/30"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          UVP CARDS (floating below hero)
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 -mt-8 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {UVP.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center mb-3 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed hidden md:block">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FLASH SALE
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-foreground">⚡ Flash Sale</h2>
              {/* Countdown */}
              <div className="flex items-center gap-2">
                <CountdownBlock val={h} label="Jam" />
                <span className="text-foreground font-bold text-xl mb-4">:</span>
                <CountdownBlock val={m} label="Mnt" />
                <span className="text-foreground font-bold text-xl mb-4">:</span>
                <CountdownBlock val={s} label="Dtk" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Penawaran terbatas, stok cepat habis</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/katalog")} className="gap-1.5 rounded-xl">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Product cards horizontal scroll */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(highlight.length ? highlight : products.slice(0, 4)).map((p) => (
            <ProductCard key={p.id} product={p} badge="FLASH SALE" />
          ))}
          {highlight.length === 0 && products.length === 0 && (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          BEST SELLER / NEW ARRIVAL TABS
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-8 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Produk Unggulan</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Unit bersih, QC ketat, harga terbaik</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/katalog")} className="gap-1.5 rounded-xl">
            Semua Produk <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.length > 0
            ? products.map((p) => <ProductCard key={p.id} product={p} />)
            : Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          }
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          KENAPA BELI DI IVALORA
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-foreground text-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Kenapa Ivalora?</p>
            <h2 className="text-3xl md:text-4xl font-bold">Belanja Lebih Tenang,<br />Dapat Unit Lebih Jelas</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "Transparansi Kondisi", desc: "Setiap unit dilengkapi keterangan kondisi lengkap — tidak ada yang disembunyikan." },
              { icon: Package, title: "Real Unit Preview", desc: "Foto produk nyata bukan render. Apa yang kamu lihat, itu yang kamu terima." },
              { icon: HeartHandshake, title: "CS Responsif", desc: "Admin aktif dan siap membantu setiap hari dari pagi hingga malam." },
              { icon: Store, title: "Official Marketplace", desc: "Tersedia di Shopee dan Tokopedia dengan rating toko bintang 5." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          E-COMMERCE CHANNELS
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Tersedia di</p>
          <h2 className="text-2xl font-bold">Official Marketplace Store</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Shopee */}
          <div className="border border-border rounded-2xl p-7 flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
            <img src={logoShopee} alt="Shopee" className="h-10 object-contain" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "hsl(var(--star))" }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-sm text-muted-foreground">Rating Toko 5.0 · Official Store</p>
            </div>
            <Button
              className="w-full rounded-xl gap-2"
              onClick={() => window.open("https://shopee.co.id/ivalora_gadget", "_blank")}
            >
              Kunjungi Toko Shopee <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Tokopedia */}
          <div className="border border-border rounded-2xl p-7 flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
            <div className="h-10 flex items-center">
              <span className="text-2xl font-extrabold text-[hsl(var(--status-available))]">tokopedia</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "hsl(var(--star))" }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-sm text-muted-foreground">Rating Toko 5.0 · Power Merchant</p>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2 text-[hsl(var(--status-available))] border-[hsl(var(--status-available))] hover:bg-[hsl(var(--status-available-bg))]"
              onClick={() => window.open("https://www.tokopedia.com/ivalora", "_blank")}
            >
              Kunjungi Toko Tokopedia <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          OFFLINE STORE
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-secondary/50" id="tentang">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Toko Fisik</p>
            <h2 className="text-3xl font-bold leading-tight">Kunjungi Toko Kami<br />di Surabaya</h2>
            <div className="space-y-4">
              {[
                { icon: MapPin, text: "Jl. Raya Sukodono — Sidoarjo, Jawa Timur" },
                { icon: Clock, text: "Senin – Sabtu: 09.00 – 20.00 WIB" },
                { icon: Phone, text: "0858-9002-4760" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-9 h-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => window.open("https://maps.app.goo.gl/Qep4kZ3rViH2XWRZ6", "_blank")}
            >
              <MapPin className="w-4 h-4" /> Lihat di Google Maps
            </Button>
          </div>

          {/* Map embed */}
          <div className="rounded-2xl overflow-hidden border border-border shadow-sm h-72 lg:h-80">
            <iframe
              title="Lokasi Ivalora Gadget"
              className="w-full h-full"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=-7.293936,112.814863&zoom=16`}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Testimoni</p>
          <h2 className="text-2xl font-bold">Dipercaya 5.000+ Pelanggan</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="border border-border rounded-2xl p-6 bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5" style={{ fill: "hsl(var(--star))", color: "hsl(var(--star))" }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                  <span className="text-xs font-bold">{t.name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA — BUTUH BANTUAN
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-foreground text-background" id="kontak">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Hubungi Kami</p>
          <h2 className="text-3xl md:text-4xl font-bold">Butuh Bantuan?</h2>
          <p className="text-white/60 text-base">Tim kami siap membantu Anda memilih iPhone yang tepat sesuai budget dan kebutuhan.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="bg-white text-foreground hover:bg-white/90 rounded-xl gap-2"
              onClick={() => window.open("https://wa.me/6285890024760", "_blank")}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white bg-transparent hover:bg-white/10 rounded-xl gap-2"
              onClick={() => navigate("/katalog")}
            >
              <ShoppingBag className="w-4 h-4" /> Lihat Katalog
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
            {/* Brand */}
            <div className="md:col-span-1 space-y-4">
              <img src={logoHorizontal} alt="Ivalora Gadget" className="h-7" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pusat jual beli iPhone terpercaya di Surabaya. Unit bergaransi, IMEI aman, harga kompetitif.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://instagram.com/ivalora_gadget" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-foreground/5 hover:bg-foreground hover:text-background flex items-center justify-center transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://shopee.co.id/ivalora_gadget" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-foreground/5 hover:bg-foreground hover:text-background flex items-center justify-center transition-colors text-xs font-bold">
                  S
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Navigasi</h4>
              {[
                { label: "Beranda", href: "/" },
                { label: "Katalog Produk", href: "/katalog" },
                { label: "Tentang Kami", href: "#tentang" },
                { label: "Hubungi Kami", href: "#kontak" },
              ].map((l) => (
                <div key={l.label}>
                  <Link to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                </div>
              ))}
            </div>

            {/* Customer Service */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Customer Service</h4>
              <p className="text-sm text-muted-foreground">0858-9002-4760</p>
              <p className="text-sm text-muted-foreground">Senin – Sabtu</p>
              <p className="text-sm text-muted-foreground">09.00 – 20.00 WIB</p>
              <a
                href="https://wa.me/6285890024760"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline underline-offset-4"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Chat di WhatsApp
              </a>
            </div>

            {/* Marketplace */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Marketplace</h4>
              <a href="https://shopee.co.id/ivalora_gadget" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <img src={logoShopee} alt="Shopee" className="h-5 w-auto" />
                Shopee
              </a>
              <a href="https://www.tokopedia.com/ivalora" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-bold text-sm text-[hsl(var(--status-available))]">T</span>
                Tokopedia
              </a>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2025 Ivalora Gadget. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Surabaya, Jawa Timur, Indonesia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Product Card ────────────────────────────────────────────────────────────
function ProductCard({ product, badge }: { product: Product; badge?: string }) {
  const navigate = useNavigate();
  const href = product.slug ? `/produk/${product.slug}` : "#";

  return (
    <div
      onClick={() => navigate(href)}
      className="border border-border rounded-2xl overflow-hidden bg-card hover:shadow-lg transition-all duration-200 cursor-pointer group"
    >
      {/* Thumbnail */}
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
        {badge && (
          <span className="absolute top-3 left-3 bg-foreground text-background text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
            {badge}
          </span>
        )}
        {product.promo_badge && !badge && (
          <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
            {product.promo_badge}
          </span>
        )}
        {product.free_shipping && (
          <span className="absolute top-3 right-3 text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: "hsl(var(--status-available))", color: "hsl(var(--status-available-bg))" }}>
            <Truck className="w-2.5 h-2.5" /> Gratis
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground line-clamp-1">
          {product.spec_warranty_duration ?? "Garansi Toko"}
        </p>
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {product.display_name}
        </p>
        {product.rating_score != null && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" style={{ fill: "hsl(var(--star))", color: "hsl(var(--star))" }} />
            <span className="text-xs text-muted-foreground">{product.rating_score.toFixed(1)}</span>
          </div>
        )}
        <p className="text-base font-bold text-foreground">
          {product.override_display_price
            ? formatRupiah(product.override_display_price)
            : "Hubungi Admin"}
        </p>
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
