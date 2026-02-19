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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, Star, Eye, Store, Globe, ShoppingCart, Camera,
  X, Package, Loader2, Trash2, Plus, GripVertical, ExternalLink,
  Tag, Truck, Search, FileText, Image as ImageIcon, Settings2, Gift,
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
  icon: string | null;
  quantity?: number;
}

interface BonusProductRecord {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
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

  // Bonus products from DB
  const [bonusProductRecords, setBonusProductRecords] = useState<BonusProductRecord[]>([]);
  const [bonusSearch, setBonusSearch] = useState("");

  // Form state
  const [selectedId, setSelectedId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [promoLabel2, setPromoLabel2] = useState("");
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

  // Spec fields
  const [specCondition, setSpecCondition] = useState("Bekas");
  const [specBrand, setSpecBrand] = useState("iPhone Apple");
  const [specWarrantyDuration, setSpecWarrantyDuration] = useState("");
  const [specScreenProtector, setSpecScreenProtector] = useState("Lainnya");
  const [specCaseType, setSpecCaseType] = useState("Lainnya");
  const [specCustomProduct, setSpecCustomProduct] = useState("Tidak");
  const [specBuiltInBattery, setSpecBuiltInBattery] = useState("Ya");
  const [specConditionDetail, setSpecConditionDetail] = useState("");
  const [specCableType, setSpecCableType] = useState("");
  const [specPhoneModel, setSpecPhoneModel] = useState("");
  const [specPostelCert, setSpecPostelCert] = useState("-");
  const [specShippedFrom, setSpecShippedFrom] = useState("Kota Surabaya");

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [masterRes, stockRes, bonusRes] = await Promise.all([
          db.from("master_products").select("*").eq("is_active", true).is("deleted_at", null),
          db.from("stock_units").select("product_id, selling_price, condition_status").eq("stock_status", "available"),
          db.from("bonus_products").select("id, name, description, icon").eq("is_active", true).order("sort_order"),
        ]);

        const masters: MasterProduct[] = masterRes.data ?? [];
        const rawStock = stockRes.data ?? [];
        setBonusProductRecords(bonusRes.data ?? []);

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
            const raw = catData.bonus_items;
            if (Array.isArray(raw)) {
              setBonusItems(raw.map((b: Record<string, string>) => ({
                id: generateId(), name: b.name ?? "", description: b.description ?? "", icon: b.icon ?? null,
              })));
            }
            setSpecCondition(catData.spec_condition ?? "Bekas");
            setSpecBrand(catData.spec_brand ?? "iPhone Apple");
            setSpecWarrantyDuration(catData.spec_warranty_duration ?? "");
            setSpecScreenProtector(catData.spec_screen_protector_type ?? "Lainnya");
            setSpecCaseType(catData.spec_case_type ?? "Lainnya");
            setSpecCustomProduct(catData.spec_custom_product ?? "Tidak");
            setSpecBuiltInBattery(catData.spec_built_in_battery ?? "Ya");
            setSpecConditionDetail(catData.spec_condition_detail ?? "");
            setSpecCableType(catData.spec_cable_type ?? "");
            setSpecPhoneModel(catData.spec_phone_model ?? "");
            setSpecPostelCert(catData.spec_postel_cert ?? "-");
            setSpecShippedFrom(catData.spec_shipped_from ?? "Kota Surabaya");
            const withAll = masters.some(m => m.id === catData.product_id)
              ? masters
              : [catData.master_products, ...masters].filter(Boolean);
            setMasterProducts(withAll);
          }
        } else {
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

  useEffect(() => {
    if (!slugEdited && displayName && !isEdit) {
      const warranty = selectedMaster?.warranty_type.replace(/_/g, "-") ?? "";
      const suffix = selectedId.slice(0, 6);
      setSlug(generateSlug(`${displayName} ${warranty}`, suffix));
    }
  }, [displayName, slugEdited, isEdit, selectedMaster, selectedId]);

  // Bonus item handlers
  function addBonus() {
    setBonusItems(prev => [...prev, { id: generateId(), name: "", description: "", icon: null }]);
  }
  function addExistingBonus(record: BonusProductRecord) {
    // Don't add duplicate
    if (bonusItems.some(b => b.name === record.name)) {
      toast({ title: "Bonus sudah ditambahkan", variant: "destructive" });
      return;
    }
    setBonusItems(prev => [...prev, {
      id: generateId(),
      name: record.name,
      description: record.description ?? "",
      icon: record.icon ?? null,
    }]);
    setBonusSearch("");
  }
  function updateBonus(id: string, field: keyof BonusItem, val: string | null) {
    setBonusItems(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  }
  function removeBonus(id: string) {
    setBonusItems(prev => prev.filter(b => b.id !== id));
  }

  // Upload bonus icon
  async function handleBonusIconUpload(bonusId: string, file: File) {
    const path = `bonus/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const url = await uploadImage(file, path);
    if (url) updateBonus(bonusId, "icon", url);
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
      .map(b => ({ name: b.name.trim(), description: b.description.trim(), icon: b.icon ?? null }));

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
      spec_condition: specCondition.trim() || null,
      spec_brand: specBrand.trim() || null,
      spec_warranty_duration: specWarrantyDuration.trim() || null,
      spec_screen_protector_type: specScreenProtector.trim() || null,
      spec_case_type: specCaseType.trim() || null,
      spec_custom_product: specCustomProduct.trim() || null,
      spec_built_in_battery: specBuiltInBattery.trim() || null,
      spec_condition_detail: specConditionDetail.trim() || null,
      spec_cable_type: specCableType.trim() || null,
      spec_phone_model: specPhoneModel.trim() || null,
      spec_postel_cert: specPostelCert.trim() || null,
      spec_shipped_from: specShippedFrom.trim() || null,
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
    navigate("/admin/katalog");
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
    navigate("/admin/katalog");
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

  // Filtered bonus search results
  const filteredBonusRecords = bonusSearch.trim()
    ? bonusProductRecords.filter(b =>
        b.name.toLowerCase().includes(bonusSearch.toLowerCase()) &&
        !bonusItems.some(bi => bi.name === b.name)
      )
    : [];

  return (
    <DashboardLayout pageTitle={isEdit ? "Edit Katalog" : "Tambah Katalog"}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/katalog")}
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
                Semua produk dengan stok tersedia sudah masuk katalog.
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk dari Master Data…" />
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
                    {" · "}{selectedAgg.total} unit tersedia
                  </p>
                )}
              </div>
            )}
          </Section>
        )}

        {/* Tabbed content */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1 gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> Info & Media
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex-1 gap-1.5 text-xs">
              <ShoppingCart className="w-3.5 h-3.5" /> Distribusi
            </TabsTrigger>
            <TabsTrigger value="bonus" className="flex-1 gap-1.5 text-xs">
              <Gift className="w-3.5 h-3.5" /> Bonus
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex-1 gap-1.5 text-xs">
              <Settings2 className="w-3.5 h-3.5" /> Spesifikasi
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Info & Media ────────────────────── */}
          <TabsContent value="info" className="space-y-6 mt-4">
            <Section title="Informasi Tampilan">
              <div className="space-y-4">
                <Field label="Nama Tampilan" hint="Nama yang dilihat sales dan pelanggan." required>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="Contoh: iPhone 15 Pro Max 256GB Natural Titanium Resmi BC" />
                </Field>
                <Field label="Slug URL" hint="URL halaman detail produk.">
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground bg-muted border border-border border-r-0 rounded-l-md px-3 h-10 flex items-center shrink-0">/produk/</span>
                    <Input value={slug}
                      onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
                      placeholder="iphone-15-pro-max-256gb-resmi-bc-abc123" className="rounded-l-none" />
                  </div>
                </Field>
                <Field label="Deskripsi Singkat" hint="Tagline pendek di kartu produk (maks. 120 karakter).">
                  <Input value={shortDesc} onChange={e => setShortDesc(e.target.value)} maxLength={120}
                    placeholder="Contoh: Unit mulus fullset, garansi Apple aktif." />
                </Field>
                <Field label="Deskripsi Lengkap" hint="Tampil di halaman detail produk.">
                  <Textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)}
                    className="min-h-[120px] resize-none" placeholder="Tuliskan detail produk…" />
                </Field>
              </div>
            </Section>

            <Section title="Foto & Media">
              <div className="space-y-4">
                <ImageUploadBox label="Foto Utama" hint="Ukuran ideal: 800×600 px."
                  value={thumbnail} onChange={setThumbnail} aspect="aspect-[4/3]" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Galeri Foto <span className="normal-case font-normal">(maks. 4)</span>
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.map((url, i) => (
                      <ImageUploadBox key={i} value={url}
                        onChange={newUrl => { const g = [...gallery]; g[i] = newUrl; setGallery(g); }}
                        aspect="aspect-square" />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Label & Promosi">
              <div className="space-y-4">
                <Field label="Label Promo" hint="Badge merah kecil di kartu produk (maks. 30 karakter).">
                  <Input value={promoLabel} onChange={e => setPromoLabel(e.target.value)} maxLength={30}
                    placeholder="Contoh: PROMO LEBARAN, BEST SELLER" />
                </Field>
                <Field label="Badge Tambahan" hint="Badge sekunder (maks. 30 karakter).">
                  <Input value={promoLabel2} onChange={e => setPromoLabel2(e.target.value)} maxLength={30}
                    placeholder="Contoh: QC VERIFIED, FULLSET" />
                </Field>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span>Gratis Ongkir</span>
                  </div>
                  <button type="button" onClick={() => setFreeShipping(!freeShipping)}
                    className={cn("w-11 h-6 rounded-full transition-colors relative shrink-0",
                      freeShipping ? "bg-foreground" : "bg-muted-foreground/30")}>
                    <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                      freeShipping && "translate-x-5")} />
                  </button>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* ── Tab: Distribusi ───────────────────────── */}
          <TabsContent value="distribution" className="space-y-6 mt-4">
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
                {publishMarket && (
                  <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Link Marketplace</p>
                    <Field label="Tokopedia" hint="">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#03AC0E" }}>
                          <span className="text-white text-[10px] font-bold">TKP</span>
                        </div>
                        <Input value={tokopediaUrl} onChange={e => setTokopediaUrl(e.target.value)}
                          placeholder="https://tokopedia.com/ivalora/..." />
                      </div>
                    </Field>
                    <Field label="Shopee" hint="">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#EE4D2D" }}>
                          <span className="text-white text-[10px] font-bold">SHP</span>
                        </div>
                        <Input value={shopeeUrl} onChange={e => setShopeeUrl(e.target.value)}
                          placeholder="https://shopee.co.id/ivalora/..." />
                      </div>
                    </Field>
                  </div>
                )}
              </div>
            </Section>

            {isSuperAdmin && (
              <Section title="Pengaturan Tampilan">
                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton active={highlight} onClick={() => setHighlight(!highlight)} icon={Star} label="Produk Unggulan" />
                  <ToggleButton active={showCondition} onClick={() => setShowCondition(!showCondition)} icon={Eye} label="Tampilkan Kondisi" />
                </div>
              </Section>
            )}
          </TabsContent>

          {/* ── Tab: Bonus ────────────────────────────── */}
          <TabsContent value="bonus" className="space-y-6 mt-4">
            <Section title="Bonus & Benefit">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Cari bonus yang sudah tersedia, atau tambahkan manual jika belum ada.
                </p>

                {/* Search existing bonuses */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={bonusSearch} onChange={e => setBonusSearch(e.target.value)}
                    placeholder="Cari bonus yang sudah ada (Softcase, Adaptor, dll)…"
                    className="pl-9" />
                </div>

                {/* Search results */}
                {filteredBonusRecords.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border max-h-40 overflow-y-auto">
                    {filteredBonusRecords.map(r => (
                      <button key={r.id} type="button" onClick={() => addExistingBonus(r)}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-accent transition-colors text-left">
                        {r.icon ? (
                          <img src={r.icon} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted shrink-0 flex items-center justify-center">
                            <Gift className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                          {r.description && <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>}
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Current bonus list */}
                {bonusItems.map((b) => (
                  <BonusItemRow key={b.id} bonus={b}
                    onUpdate={updateBonus} onRemove={removeBonus}
                    onIconUpload={handleBonusIconUpload} />
                ))}
                <button type="button" onClick={addBonus}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg border border-dashed border-border w-full justify-center">
                  <Plus className="w-4 h-4" /> Tambah Bonus Manual
                </button>
              </div>
            </Section>
          </TabsContent>

          {/* ── Tab: Spesifikasi ──────────────────────── */}
          <TabsContent value="specs" className="space-y-6 mt-4">
            <Section title="Spesifikasi Produk">
              <p className="text-xs text-muted-foreground mb-4">
                Informasi ini tampil di halaman detail produk. Isi sesuai kondisi unit.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Kondisi"><Input value={specCondition} onChange={e => setSpecCondition(e.target.value)} placeholder="Bekas" /></Field>
                <Field label="Merek"><Input value={specBrand} onChange={e => setSpecBrand(e.target.value)} placeholder="iPhone Apple" /></Field>
                <Field label="Masa Garansi"><Input value={specWarrantyDuration} onChange={e => setSpecWarrantyDuration(e.target.value)} placeholder="12 Bulan" /></Field>
                <Field label="Tipe Pengaman Layar"><Input value={specScreenProtector} onChange={e => setSpecScreenProtector(e.target.value)} placeholder="Lainnya" /></Field>
                <Field label="Tipe Case"><Input value={specCaseType} onChange={e => setSpecCaseType(e.target.value)} placeholder="Lainnya" /></Field>
                <Field label="Produk Custom"><Input value={specCustomProduct} onChange={e => setSpecCustomProduct(e.target.value)} placeholder="Tidak" /></Field>
                <Field label="Build-in Battery"><Input value={specBuiltInBattery} onChange={e => setSpecBuiltInBattery(e.target.value)} placeholder="Ya" /></Field>
                <Field label="Kondisi Detail"><Input value={specConditionDetail} onChange={e => setSpecConditionDetail(e.target.value)} placeholder="Like New" /></Field>
                <Field label="Tipe Kabel"><Input value={specCableType} onChange={e => setSpecCableType(e.target.value)} placeholder="USB-C" /></Field>
                <Field label="Model Handphone"><Input value={specPhoneModel} onChange={e => setSpecPhoneModel(e.target.value)} placeholder="iPhone 15 Pro" /></Field>
                <Field label="No.Sertifikat POSTEL"><Input value={specPostelCert} onChange={e => setSpecPostelCert(e.target.value)} placeholder="-" /></Field>
                <Field label="Dikirim Dari"><Input value={specShippedFrom} onChange={e => setSpecShippedFrom(e.target.value)} placeholder="Kota Surabaya" /></Field>
              </div>
            </Section>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-8">
          {isEdit && isSuperAdmin && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              <Trash2 className="w-4 h-4 mr-1.5" /> Hapus dari Katalog
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/admin/katalog")} className="ml-auto">
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

// ── Bonus Item Row ────────────────────────────────────────────────────────────
function BonusItemRow({ bonus, onUpdate, onRemove, onIconUpload }: {
  bonus: BonusItem;
  onUpdate: (id: string, field: keyof BonusItem, val: string | null) => void;
  onRemove: (id: string) => void;
  onIconUpload: (id: string, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2 p-3 rounded-xl border border-border bg-muted/20">
      {/* Icon */}
      <div className="shrink-0">
        <div className="w-10 h-10 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
          onClick={() => fileRef.current?.click()}>
          {bonus.icon ? (
            <img src={bonus.icon} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-4 h-4 text-muted-foreground/40" />
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onIconUpload(bonus.id, f); }} />
      </div>
      <div className="flex-1 space-y-2">
        <Input value={bonus.name} onChange={e => onUpdate(bonus.id, "name", e.target.value)}
          placeholder="Nama bonus (Softcase Premium)" className="h-8 text-sm" />
        <Input value={bonus.description} onChange={e => onUpdate(bonus.id, "description", e.target.value)}
          placeholder="Deskripsi singkat" className="h-8 text-sm" />
      </div>
      <button type="button" onClick={() => onRemove(bonus.id)}
        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1">
        <X className="w-4 h-4" />
      </button>
    </div>
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
