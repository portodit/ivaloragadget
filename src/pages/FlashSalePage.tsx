import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Zap, Save, Tag, Check } from "lucide-react";
import { toast } from "sonner";

interface FlashSaleSettings {
  id: string;
  is_active: boolean;
  start_time: string;
  duration_hours: number;
}

interface CatalogProduct {
  id: string;
  display_name: string;
  is_flash_sale: boolean;
  thumbnail_url: string | null;
}

export default function FlashSalePage() {
  const [settings, setSettings] = useState<FlashSaleSettings | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [isActive, setIsActive] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationHours, setDurationHours] = useState(6);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [settingsRes, productsRes] = await Promise.all([
      supabase.from("flash_sale_settings").select("*").limit(1).single(),
      supabase
        .from("catalog_products")
        .select("id, display_name, is_flash_sale, thumbnail_url")
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
    }
    setProducts((productsRes.data as CatalogProduct[]) ?? []);
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);

    const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();

    const { error } = await supabase
      .from("flash_sale_settings")
      .update({
        is_active: isActive,
        start_time: startDateTime,
        duration_hours: durationHours,
      })
      .eq("id", settings.id);

    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Flash sale berhasil diperbarui!");
    }
    setSaving(false);
  }

  async function toggleFlashSale(productId: string, current: boolean) {
    const { error } = await supabase
      .from("catalog_products")
      .update({ is_flash_sale: !current })
      .eq("id", productId);

    if (error) {
      toast.error("Gagal mengubah: " + error.message);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_flash_sale: !current } : p))
      );
    }
  }

  const endTime = startDate && startTime
    ? new Date(new Date(`${startDate}T${startTime}:00`).getTime() + durationHours * 3600000)
    : null;

  if (loading) {
    return (
      <DashboardLayout pageTitle="Flash Sale">
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-40 bg-muted rounded-2xl" />
          <div className="h-60 bg-muted rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Flash Sale">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Settings Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Zap className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Pengaturan Flash Sale</h2>
              <p className="text-xs text-muted-foreground">Atur waktu mulai, durasi, dan status flash sale</p>
            </div>
          </div>

          <div className="space-y-5">
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
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Jam Mulai</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-10" />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Durasi (Jam)</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="h-10 max-w-[120px]"
              />
            </div>

            {/* Preview */}
            {endTime && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <strong>Berakhir:</strong> {endTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} pukul {endTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan Pengaturan
            </Button>
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Tag className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Produk Flash Sale</h2>
              <p className="text-xs text-muted-foreground">Tandai produk yang termasuk flash sale</p>
            </div>
          </div>

          <div className="space-y-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleFlashSale(p.id, p.is_flash_sale)}
                className="w-full flex items-center gap-3 p-3 border border-border rounded-xl hover:bg-accent transition-colors text-left"
              >
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
                )}
                <p className="text-sm font-medium text-foreground flex-1 truncate">{p.display_name}</p>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  p.is_flash_sale ? "bg-foreground text-background" : "border border-border"
                }`}>
                  {p.is_flash_sale && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada produk katalog yang dipublish.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
