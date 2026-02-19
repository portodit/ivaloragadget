import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Save, Tag, Check, Search, Percent, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface FlashSaleSettings {
  id: string;
  is_active: boolean;
  start_time: string;
  duration_hours: number;
  default_discount_type: string;
  default_discount_value: number;
}

interface CatalogProduct {
  id: string;
  display_name: string;
  is_flash_sale: boolean;
  thumbnail_url: string | null;
  flash_sale_discount_type: string | null;
  flash_sale_discount_value: number | null;
}

const PAGE_SIZE = 10;

export default function FlashSalePage() {
  const [settings, setSettings] = useState<FlashSaleSettings | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings form
  const [isActive, setIsActive] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationHours, setDurationHours] = useState(6);
  const [defaultDiscountType, setDefaultDiscountType] = useState("percentage");
  const [defaultDiscountValue, setDefaultDiscountValue] = useState(0);

  // Products tab
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [settingsRes, productsRes] = await Promise.all([
      db.from("flash_sale_settings").select("*").limit(1).single(),
      db.from("catalog_products")
        .select("id, display_name, is_flash_sale, thumbnail_url, flash_sale_discount_type, flash_sale_discount_value")
        .eq("catalog_status", "published"),
    ]);

    if (settingsRes.data) {
      const s = settingsRes.data as FlashSaleSettings;
      setSettings(s);
      setIsActive(s.is_active);
      const d = new Date(s.start_time);
      setStartDate(d.toISOString().split("T")[0]);
      setStartTime(d.toTimeString().slice(0, 5));
      setDurationHours(s.duration_hours);
      setDefaultDiscountType(s.default_discount_type ?? "percentage");
      setDefaultDiscountValue(s.default_discount_value ?? 0);
    }
    setProducts((productsRes.data as CatalogProduct[]) ?? []);
    setLoading(false);
  }

  async function handleSaveSettings() {
    if (!settings) return;
    setSaving(true);
    const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
    const { error } = await db.from("flash_sale_settings").update({
      is_active: isActive,
      start_time: startDateTime,
      duration_hours: durationHours,
      default_discount_type: defaultDiscountType,
      default_discount_value: defaultDiscountValue,
    }).eq("id", settings.id);
    if (error) toast.error("Gagal menyimpan: " + error.message);
    else toast.success("Pengaturan flash sale berhasil diperbarui!");
    setSaving(false);
  }

  // Toggle flash sale for a product
  async function toggleFlashSale(productId: string, current: boolean) {
    const update: Record<string, unknown> = { is_flash_sale: !current };
    // When enabling, apply default discount if product doesn't have one
    if (!current && defaultDiscountValue > 0) {
      const product = products.find(p => p.id === productId);
      if (!product?.flash_sale_discount_value) {
        update.flash_sale_discount_type = defaultDiscountType;
        update.flash_sale_discount_value = defaultDiscountValue;
      }
    }
    const { error } = await db.from("catalog_products").update(update).eq("id", productId);
    if (error) { toast.error("Gagal mengubah: " + error.message); return; }
    setProducts(prev => prev.map(p => p.id === productId ? {
      ...p,
      is_flash_sale: !current,
      ...(update.flash_sale_discount_type ? {
        flash_sale_discount_type: update.flash_sale_discount_type as string,
        flash_sale_discount_value: update.flash_sale_discount_value as number,
      } : {}),
    } : p));
  }

  // Update individual product discount
  async function updateProductDiscount(productId: string, type: string, value: number) {
    const { error } = await db.from("catalog_products").update({
      flash_sale_discount_type: type,
      flash_sale_discount_value: value,
    }).eq("id", productId);
    if (error) { toast.error("Gagal menyimpan diskon"); return; }
    setProducts(prev => prev.map(p => p.id === productId ? {
      ...p, flash_sale_discount_type: type, flash_sale_discount_value: value,
    } : p));
  }

  // Apply bulk discount to all flash sale products
  async function applyBulkDiscount() {
    const flashSaleProducts = products.filter(p => p.is_flash_sale);
    if (flashSaleProducts.length === 0) { toast.error("Tidak ada produk flash sale"); return; }
    const { error } = await db.from("catalog_products").update({
      flash_sale_discount_type: defaultDiscountType,
      flash_sale_discount_value: defaultDiscountValue,
    }).in("id", flashSaleProducts.map(p => p.id));
    if (error) { toast.error("Gagal menerapkan diskon massal"); return; }
    setProducts(prev => prev.map(p => p.is_flash_sale ? {
      ...p, flash_sale_discount_type: defaultDiscountType, flash_sale_discount_value: defaultDiscountValue,
    } : p));
    toast.success(`Diskon diterapkan ke ${flashSaleProducts.length} produk`);
  }

  // Filtered & paginated products
  const filtered = products.filter(p =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const endTime = startDate && startTime
    ? new Date(new Date(`${startDate}T${startTime}:00`).getTime() + durationHours * 3600000)
    : null;

  if (loading) {
    return (
      <DashboardLayout pageTitle="Flash Sale">
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Flash Sale">
      <div className="max-w-2xl mx-auto">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="settings" className="flex-1 gap-2">
              <Zap className="w-4 h-4" /> Pengaturan Flash Sale
            </TabsTrigger>
            <TabsTrigger value="products" className="flex-1 gap-2">
              <Tag className="w-4 h-4" /> Produk Flash Sale
            </TabsTrigger>
          </TabsList>

          {/* ── Settings Tab ─────────────────────────────────── */}
          <TabsContent value="settings">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 border border-border rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">Aktifkan Flash Sale</p>
                  <p className="text-xs text-muted-foreground">Section flash sale akan tampil di halaman beranda</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {/* Start date & time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal Mulai</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Jam Mulai</Label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-10" />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Durasi (Jam)</Label>
                <Input type="number" min={1} max={72} value={durationHours}
                  onChange={e => setDurationHours(Number(e.target.value))} className="h-10 max-w-[120px]" />
              </div>

              {/* Preview */}
              {endTime && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <strong>Berakhir:</strong> {endTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} pukul {endTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                </div>
              )}

              {/* Default discount */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Diskon Default</p>
                <p className="text-xs text-muted-foreground">Diskon otomatis diterapkan saat menandai produk sebagai flash sale</p>
                <div className="flex items-center gap-3">
                  <div className="flex border border-border rounded-lg overflow-hidden shrink-0">
                    <button onClick={() => setDefaultDiscountType("percentage")}
                      className={cn("px-3 py-2 text-xs font-medium flex items-center gap-1 transition-colors",
                        defaultDiscountType === "percentage" ? "bg-foreground text-background" : "hover:bg-accent text-muted-foreground")}>
                      <Percent className="w-3.5 h-3.5" /> Persen
                    </button>
                    <button onClick={() => setDefaultDiscountType("fixed")}
                      className={cn("px-3 py-2 text-xs font-medium flex items-center gap-1 transition-colors",
                        defaultDiscountType === "fixed" ? "bg-foreground text-background" : "hover:bg-accent text-muted-foreground")}>
                      <DollarSign className="w-3.5 h-3.5" /> Rupiah
                    </button>
                  </div>
                  <Input type="number" min={0} value={defaultDiscountValue}
                    onChange={e => setDefaultDiscountValue(Number(e.target.value))}
                    className="h-10 max-w-[140px]"
                    placeholder={defaultDiscountType === "percentage" ? "10" : "50000"} />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {defaultDiscountType === "percentage" ? "%" : "Rp"}
                  </span>
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                {saving ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan Pengaturan
              </Button>
            </div>
          </TabsContent>

          {/* ── Products Tab ─────────────────────────────────── */}
          <TabsContent value="products">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              {/* Search + bulk action */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari produk…" className="pl-9" />
                </div>
                {defaultDiscountValue > 0 && (
                  <Button variant="outline" size="sm" onClick={applyBulkDiscount} className="shrink-0 text-xs">
                    Terapkan Diskon Massal
                  </Button>
                )}
              </div>

              {/* Product list */}
              <div className="space-y-2">
                {paginated.map(p => (
                  <div key={p.id} className="border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
                      )}
                      <p className="text-sm font-medium text-foreground flex-1 truncate">{p.display_name}</p>
                      <button onClick={() => toggleFlashSale(p.id, p.is_flash_sale)}
                        className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                          p.is_flash_sale ? "bg-foreground text-background" : "border border-border")}>
                        {p.is_flash_sale && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Per-product discount (only when tagged) */}
                    {p.is_flash_sale && (
                      <div className="flex items-center gap-2 pl-[52px]">
                        <div className="flex border border-border rounded-md overflow-hidden shrink-0">
                          <button onClick={() => updateProductDiscount(p.id, "percentage", p.flash_sale_discount_value ?? 0)}
                            className={cn("px-2 py-1 text-[10px] font-medium transition-colors",
                              (p.flash_sale_discount_type ?? "percentage") === "percentage" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")}>
                            %
                          </button>
                          <button onClick={() => updateProductDiscount(p.id, "fixed", p.flash_sale_discount_value ?? 0)}
                            className={cn("px-2 py-1 text-[10px] font-medium transition-colors",
                              p.flash_sale_discount_type === "fixed" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")}>
                            Rp
                          </button>
                        </div>
                        <Input type="number" min={0}
                          value={p.flash_sale_discount_value ?? ""}
                          onChange={e => updateProductDiscount(p.id, p.flash_sale_discount_type ?? "percentage", Number(e.target.value))}
                          className="h-7 text-xs max-w-[100px]"
                          placeholder="Nilai" />
                        <span className="text-[10px] text-muted-foreground">
                          {(p.flash_sale_discount_type ?? "percentage") === "percentage" ? "% off" : "potongan"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {search ? "Tidak ada produk yang sesuai." : "Belum ada produk katalog yang dipublish."}
                  </p>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} produk · Hal {page}/{totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
