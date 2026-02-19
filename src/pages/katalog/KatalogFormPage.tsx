import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, Star, Eye, Store, Globe, ShoppingCart, Camera,
  X, Package, Loader2, Trash2, Plus, GripVertical, ExternalLink,
  Tag, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Image upload helper ───────────────────────────────────────────────────────
async function uploadImage(file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("catalog-images")
    .upload(path, file, { upsert: true });
  if (error) return null;
  const { data: urlData } = supabase.storage.from("catalog-images").getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ── Slug generator ────────────────────────────────────────────────────────────
function generateSlug(text: string, suffix = "") {
  const base = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return suffix ? `${base}-${suffix}` : base;
}

// ── ImageUploadBox ────────────────────────────────────────────────────────────
function ImageUploadBox({
  label, hint, value, onChange, aspect = "aspect-[4/3]",
}: {
  label?: string; hint?: string; value: string | null;
  onChange: (url: string | null) => void; aspect?: string;
}) {
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
      {label && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>}
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
              <Loader2 className="w-5 h-5 animate-spin" />
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
        ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ── Bonus Item ────────────────────────────────────────────────────────────────
interface BonusItem {
  id: string;
  name: string;
  description: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

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

interface StockAggregate {
  product_id: string;
  total: number;
  no_minus: number;
  minus: number;
  min_price: number | null;
}

function formatRupiah(n: number | null | undefined) {
  if (!n) return "—";
  return "Rp" + n.toLocaleString("id-ID");
}

// ── WARRANTY labels ───────────────────────────────────────────────────────────
const WARRANTY_LABELS: Record<string, string> = {
  resmi_bc: "Resmi BC (Bea Cukai)",
  ibox: "Resmi iBox Indonesia",
  inter: "Inter (Internasional)",
  whitelist: "Whitelist Terdaftar",
  digimap: "Resmi Digimap Indonesia",
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function KatalogFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = role === "super_admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Master data
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [stockAgg, setStockAgg] = useState<StockAggregate[]>([]);

  // Form state
  const [selectedId, setSelectedId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [promoLabel2, setPromoLabel2] = useState(""); // promo_badge field
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [gallery, setGallery] = useState<(string | null)[]>([null, null, null, null]);
  const [publishPos, setPublishPos] = useState(false);
  const [publishWeb, setPublishWeb] = useState(false);
  const [publishMarket, setPublishMarket] = useState(false);
  const [tokopediaUrl, setTokopediaUrl] = useState("");
  const [shopeeUrl, setShopeeUrl] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [showCondition, setShowCondition] = useState(true);
  const [freeShipping, setFreeShipping] = useState(false);
  const [bonusItems, setBonusItems] = useState<BonusItem[]>([]);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [masterRes, stockRes] = await Promise.all([
          db.from("master_products").select("*").eq("is_active", true).is("deleted_at", null),
          db.from("stock_units").select("product_id, selling_price, condition_status").eq("stock_status", "available"),
        ]);

        const masters: MasterProduct[] = masterRes.data ?? [];
        const rawStock = stockRes.data ?? [];

        // Build stock aggregate
        const aggMap: Record<string, StockAggregate> = {};
        for (const unit of rawStock) {
          if (!aggMap[unit.product_id]) {
            aggMap[unit.product_id] = { product_id: unit.product_id, total: 0, no_minus: 0, minus: 0, min_price: null };
          }
          const a = aggMap[unit.product_id];
          a.total++;
          if (unit.condition_status === "no_minus") a.no_minus++; else a.minus++;
          const p = Number(unit.selling_price);
          if (p > 0) a.min_price = a.min_price === null ? p : Math.min(a.min_price, p);
        }

        setStockAgg(Object.values(aggMap));

        if (isEdit && id) {
          // Load existing catalog product
          const { data: catData } = await db.from("catalog_products").select("*, master_products(*)").eq("id", id).single();
          if (catData) {
            setSelectedId(catData.product_id);
            setDisplayName(catData.display_name);
            setSlug(catData.slug ?? "");
            setSlugEdited(!!catData.slug);
            setShortDesc(catData.short_description ?? "");
            setFullDesc(catData.full_description ?? "");
            setPromoLabel(catData.promo_label ?? "");
            setPromoLabel2(catData.promo_badge ?? "");
            setThumbnail(catData.thumbnail_url);
            const g = [...(catData.gallery_urls ?? [])];
            while (g.length < 4) g.push(null);
            setGallery(g.slice(0, 4) as (string | null)[]);
            setPublishPos(catData.publish_to_pos);
            setPublishWeb(catData.publish_to_web);
            setPublishMarket(catData.publish_to_marketplace);
            setTokopediaUrl(catData.tokopedia_url ?? "");
            setShopeeUrl(catData.shopee_url ?? "");
            setHighlight(catData.highlight_product);
            setShowCondition(catData.show_condition_breakdown);
            setFreeShipping(catData.free_shipping ?? false);
            // Parse bonus items
            const raw = catData.bonus_items;
            if (Array.isArray(raw)) {
              setBonusItems(raw.map((b: Record<string, string>) => ({ id: generateId(), name: b.name ?? "", description: b.description ?? "" })));
            }
            // Set masters list including this product's master even if not "available"
            const withAll = masters.some(m => m.id === catData.product_id)
              ? masters
              : [catData.master_products, ...masters].filter(Boolean);
            setMasterProducts(withAll);
          }
        } else {
          // Only products with available stock and not yet in catalog
          const { data: existingCats } = await db.from("catalog_products").select("product_id");
          const inCatalogIds = new Set((existingCats ?? []).map((c: { product_id: string }) => c.product_id));
          const availStockIds = new Set(Object.values(aggMap).filter(a => a.total > 0).map(a => a.product_id));
          setMasterProducts(masters.filter(m => !inCatalogIds.has(m.id) && availStockIds.has(m.id)));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, isEdit]);

  // Auto-fill display name & slug when product selected (add mode)
  const selectedMaster = masterProducts.find(m => m.id === selectedId);
  const selectedAgg = stockAgg.find(a => a.product_id === selectedId);

  useEffect(() => {
    if (!isEdit && selectedMaster) {
      const name = `${selectedMaster.series} ${selectedMaster.storage_gb}GB ${selectedMaster.color}`;
      setDisplayName(name);
      if (!slugEdited) {
        const warranty = selectedMaster.warranty_type.replace(/_/g, "-");
        const suffix = selectedId.slice(0, 6);
        setSlug(generateSlug(`${name} ${warranty}`, suffix));
      }
    }
  }, [selectedId, selectedMaster, isEdit, slugEdited]);

  // Auto-generate slug from displayName (only if user hasn't manually edited slug)
  useEffect(() => {
    if (!slugEdited && displayName && !isEdit) {
      const warranty = selectedMaster?.warranty_type.replace(/_/g, "-") ?? "";
      const suffix = selectedId.slice(0, 6);
      setSlug(generateSlug(`${displayName} ${warranty}`, suffix));
    }
  }, [displayName, slugEdited, isEdit, selectedMaster, selectedId]);

  // Bonus item handlers
  function addBonus() {
    setBonusItems(prev => [...prev, { id: generateId(), name: "", description: "" }]);
  }
  function updateBonus(id: string, field: keyof BonusItem, val: string) {
    setBonusItems(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  }
  function removeBonus(id: string) {
    setBonusItems(prev => prev.filter(b => b.id !== id));
  }

  async function handleSave() {
    if (!selectedId && !isEdit) {
      toast({ title: "Pilih produk terlebih dahulu", variant: "destructive" }); return;
    }
    if (!displayName.trim()) {
      toast({ title: "Nama tampilan wajib diisi", variant: "destructive" }); return;
    }
    setSaving(true);

    const galleryUrls = gallery.filter(Boolean) as string[];
    const bonusJson = bonusItems
      .filter(b => b.name.trim())
      .map(b => ({ name: b.name.trim(), description: b.description.trim() }));

    const payload: Record<string, unknown> = {
      display_name: displayName.trim(),
      slug: slug.trim() || null,
      short_description: shortDesc.trim() || null,
      full_description: fullDesc.trim() || null,
      thumbnail_url: thumbnail,
      gallery_urls: galleryUrls,
      publish_to_pos: publishPos,
      publish_to_web: publishWeb,
      publish_to_marketplace: publishMarket,
      tokopedia_url: publishMarket && tokopediaUrl.trim() ? tokopediaUrl.trim() : null,
      shopee_url: publishMarket && shopeeUrl.trim() ? shopeeUrl.trim() : null,
      highlight_product: highlight,
      promo_label: promoLabel.trim() || null,
      promo_badge: promoLabel2.trim() || null,
      show_condition_breakdown: showCondition,
      free_shipping: freeShipping,
      bonus_items: bonusJson,
      updated_by: user?.id,
    };

    if (!isEdit) {
      payload.product_id = selectedId;
      payload.catalog_status = "draft";
      payload.price_strategy = "min_price";
      payload.created_by = user?.id;
    }

    const { error } = isEdit
      ? await db.from("catalog_products").update(payload).eq("id", id)
      : await db.from("catalog_products").insert(payload);

    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: isEdit ? "Slug sudah digunakan produk lain" : "Produk ini sudah ada di katalog", variant: "destructive" });
      } else {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      }
      return;
    }

    await logActivity({
      action: isEdit ? "update_catalog" : "create_catalog",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      target_id: isEdit ? id : selectedId,
      metadata: { display_name: displayName.trim() },
    });

    toast({ title: isEdit ? "Perubahan disimpan" : "Produk berhasil ditambahkan ke katalog" });
    navigate("/katalog");
  }

  async function handleDelete() {
    if (!id || !confirm(`Hapus "${displayName}" dari katalog?`)) return;
    await db.from("catalog_products").delete().eq("id", id);
    await logActivity({
      action: "delete_catalog",
      actor_id: user?.id, actor_email: user?.email, actor_role: role,
      target_id: id, metadata: { display_name: displayName },
    });
    toast({ title: "Produk dihapus dari katalog" });
    navigate("/katalog");
  }

  if (loading) {
    return (
      <DashboardLayout pageTitle={isEdit ? "Edit Katalog" : "Tambah Katalog"}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={isEdit ? "Edit Katalog" : "Tambah Katalog"}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/katalog")}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? "Edit Produk Katalog" : "Tambah Produk ke Katalog"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit ? "Perbarui informasi produk yang tampil di katalog." : "Harga ditarik otomatis dari stok unit tersedia."}
            </p>
          </div>
        </div>

        {/* Section: Pilih Produk (add only) */}
        {!isEdit && (
          <Section title="Produk (SKU)">
            {masterProducts.length === 0 ? (
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4 shrink-0" />
                Semua produk dengan stok tersedia sudah masuk katalog. Tambahkan stok baru terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk dari Master Data yang memiliki stok tersedia…" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterProducts.map(m => {
                      const agg = stockAgg.find(a => a.product_id === m.id);
                      return (
                        <SelectItem key={m.id} value={m.id}>
                          {m.series} {m.storage_gb}GB {m.color} — {WARRANTY_LABELS[m.warranty_type] ?? m.warranty_type} · {agg?.total ?? 0} unit
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedAgg && selectedId && (
                  <p className="text-xs text-muted-foreground px-1">
                    Harga mulai: <span className="font-semibold text-foreground">{formatRupiah(selectedAgg.min_price)}</span>
                    {" · "}{selectedAgg.total} unit tersedia ({selectedAgg.no_minus} no-minus, {selectedAgg.minus} minus)
                  </p>
                )}
              </div>
            )}
          </Section>
        )}

        {/* Section: Informasi Tampilan */}
        <Section title="Informasi Tampilan">
          <div className="space-y-4">
            <Field label="Nama Tampilan" hint="Nama yang dilihat sales dan pelanggan." required>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Contoh: iPhone 15 Pro Max 256GB Natural Titanium Resmi BC"
              />
            </Field>

            <Field label="Slug URL" hint="URL halaman detail produk. Dibuat otomatis, bisa diubah manual.">
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground bg-muted border border-border border-r-0 rounded-l-md px-3 h-10 flex items-center shrink-0">
                  /produk/
                </span>
                <Input
                  value={slug}
                  onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
                  placeholder="iphone-15-pro-max-256gb-resmi-bc-abc123"
                  className="rounded-l-none"
                />
              </div>
            </Field>

            <Field label="Deskripsi Singkat" hint="Tagline pendek yang muncul di kartu produk (maks. 120 karakter).">
              <Input
                value={shortDesc} onChange={e => setShortDesc(e.target.value)} maxLength={120}
                placeholder="Contoh: Unit mulus fullset, garansi Apple aktif, siap kirim hari ini."
              />
            </Field>

            <Field label="Deskripsi Lengkap" hint="Tampil di halaman detail produk. Markdown-like.">
              <Textarea
                value={fullDesc} onChange={e => setFullDesc(e.target.value)}
                className="min-h-[120px] resize-none"
                placeholder="Tuliskan detail produk, spesifikasi, catatan kondisi, dll…"
              />
            </Field>
          </div>
        </Section>

        {/* Section: Media */}
        <Section title="Foto & Media">
          <div className="space-y-4">
            <ImageUploadBox
              label="Foto Utama"
              hint="Ukuran ideal: 800×600 px. Tampil di kartu produk di katalog."
              value={thumbnail}
              onChange={setThumbnail}
              aspect="aspect-[4/3]"
            />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Galeri Foto <span className="normal-case font-normal">(maks. 4 foto tambahan)</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                {gallery.map((url, i) => (
                  <ImageUploadBox
                    key={i} value={url}
                    onChange={newUrl => {
                      const g = [...gallery]; g[i] = newUrl; setGallery(g);
                    }}
                    aspect="aspect-square"
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Section: Label & Promosi */}
        <Section title="Label & Promosi">
          <div className="space-y-4">
            <Field label="Label Promo" hint="Teks badge merah kecil di kartu produk (maks. 30 karakter).">
              <Input value={promoLabel} onChange={e => setPromoLabel(e.target.value)} maxLength={30}
                placeholder="Contoh: PROMO LEBARAN, BEST SELLER, DISKON 10%" />
            </Field>
            <Field label="Badge Tambahan" hint="Badge sekunder di kartu (maks. 30 karakter).">
              <Input value={promoLabel2} onChange={e => setPromoLabel2(e.target.value)} maxLength={30}
                placeholder="Contoh: QC VERIFIED, FULLSET, MULUS" />
            </Field>
            {/* Gratis Ongkir toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span>Gratis Ongkir</span>
              </div>
              <button
                type="button"
                onClick={() => setFreeShipping(!freeShipping)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative shrink-0",
                  freeShipping ? "bg-foreground" : "bg-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  freeShipping && "translate-x-5"
                )} />
              </button>
            </div>
          </div>
        </Section>

        {/* Section: Kanal Distribusi */}
        <Section title="Kanal Distribusi">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "pos", label: "POS / Kasir", icon: Store, value: publishPos, set: setPublishPos },
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

            {/* Marketplace links */}
            {publishMarket && (
              <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Link Marketplace</p>
                <Field label="Tokopedia" hint="">
                  <div className="flex items-center gap-2">
                    {/* Tokopedia green brand color badge */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#03AC0E" }}>
                      <span className="text-white text-[10px] font-bold">TKP</span>
                    </div>
                    <Input
                      value={tokopediaUrl} onChange={e => setTokopediaUrl(e.target.value)}
                      placeholder="https://tokopedia.com/ivalora/..."
                    />
                  </div>
                </Field>
                <Field label="Shopee" hint="">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#EE4D2D" }}>
                      <span className="text-white text-[10px] font-bold">SHP</span>
                    </div>
                    <Input
                      value={shopeeUrl} onChange={e => setShopeeUrl(e.target.value)}
                      placeholder="https://shopee.co.id/ivalora/..."
                    />
                  </div>
                </Field>
              </div>
            )}
          </div>
        </Section>

        {/* Section: Bonus & Benefit */}
        <Section title="Bonus & Benefit">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Tambahkan daftar bonus yang disertakan dalam pembelian untuk meningkatkan nilai produk.
            </p>
            {bonusItems.map((b) => (
              <div key={b.id} className="flex gap-2 p-3 rounded-xl border border-border bg-muted/20">
                <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-2 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Input
                    value={b.name}
                    onChange={e => updateBonus(b.id, "name", e.target.value)}
                    placeholder="Nama bonus (contoh: Softcase Premium)"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={b.description}
                    onChange={e => updateBonus(b.id, "description", e.target.value)}
                    placeholder="Deskripsi singkat (contoh: Melindungi dari goresan)"
                    className="h-8 text-sm"
                  />
                </div>
                <button type="button" onClick={() => removeBonus(b.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addBonus}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg border border-dashed border-border w-full justify-center"
            >
              <Plus className="w-4 h-4" /> Tambah Bonus
            </button>
          </div>
        </Section>

        {/* Section: Pengaturan */}
        {isSuperAdmin && (
          <Section title="Pengaturan Tampilan">
            <div className="grid grid-cols-2 gap-3">
              <ToggleButton active={highlight} onClick={() => setHighlight(!highlight)} icon={Star} label="Produk Unggulan" />
              <ToggleButton active={showCondition} onClick={() => setShowCondition(!showCondition)} icon={Eye} label="Tampilkan Kondisi" />
            </div>
          </Section>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pb-8">
          {isEdit && isSuperAdmin && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              <Trash2 className="w-4 h-4 mr-1.5" /> Hapus dari Katalog
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/katalog")} className="ml-auto">
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || (!isEdit && !selectedId)}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEdit ? "Simpan Perubahan" : "Tambah ke Katalog"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function ToggleButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string;
}) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-sm py-2.5 px-3 rounded-lg border transition-colors w-full",
        active ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
      )}
    >
      <Icon className={cn("w-4 h-4", active && label === "Produk Unggulan" && "fill-current")} />
      {label}
    </button>
  );
}
