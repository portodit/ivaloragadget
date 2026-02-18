import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MasterProduct } from "@/lib/master-products";
import { formatCurrency } from "@/lib/stock-units";

const schema = z.object({
  product_id: z.string().min(1, "Pilih produk"),
  imei: z.string().min(14, "IMEI minimal 14 karakter").max(17, "IMEI maksimal 17 karakter"),
  condition_status: z.enum(["no_minus", "minus"]),
  minus_description: z.string().optional(),
  selling_price: z.string().min(1, "Masukkan harga jual"),
  cost_price: z.string().optional(),
  stock_status: z.enum(["available", "coming_soon"]),
  received_at: z.string().min(1, "Masukkan tanggal masuk"),
  supplier: z.string().optional(),
  batch_code: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddUnitModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUnitModal({ open, onClose, onSuccess }: AddUnitModalProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [imeiChecking, setImeiChecking] = useState(false);
  const [imeiError, setImeiError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      condition_status: "no_minus",
      stock_status: "available",
      received_at: new Date().toISOString().split("T")[0],
    },
  });

  const conditionStatus = watch("condition_status");
  const imeiValue = watch("imei");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("master_products")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("series")
      .then(({ data }) => setProducts((data as MasterProduct[]) ?? []));
  }, [open]);

  // IMEI uniqueness check (debounced)
  useEffect(() => {
    if (!imeiValue || imeiValue.length < 14) { setImeiError(null); return; }
    const t = setTimeout(async () => {
      setImeiChecking(true);
      const { data } = await supabase.from("stock_units").select("id").eq("imei", imeiValue).maybeSingle();
      setImeiChecking(false);
      setImeiError(data ? "IMEI sudah terdaftar dalam sistem." : null);
    }, 500);
    return () => clearTimeout(t);
  }, [imeiValue]);

  const onSubmit = async (data: FormData) => {
    if (imeiError) return;
    const { error } = await supabase.from("stock_units").insert({
      product_id: data.product_id,
      imei: data.imei,
      condition_status: data.condition_status,
      minus_description: data.minus_description || null,
      selling_price: data.selling_price ? parseFloat(data.selling_price.replace(/\D/g, "")) : null,
      cost_price: data.cost_price ? parseFloat(data.cost_price.replace(/\D/g, "")) : null,
      stock_status: data.stock_status,
      received_at: data.received_at,
      supplier: data.supplier || null,
      batch_code: data.batch_code || null,
      notes: data.notes || null,
    } as never);

    if (error) {
      toast({ title: "Gagal menyimpan unit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Unit berhasil ditambahkan" });
    reset();
    onSuccess();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-lg bg-card border-l border-border flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Tambah Unit Stok</h2>
            <p className="text-xs text-muted-foreground">Daftarkan unit baru berbasis IMEI</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Produk */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produk (SKU)</Label>
            <Select onValueChange={(v) => setValue("product_id", v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Pilih produk..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.series} — {p.storage_gb}GB {p.color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.product_id && <p className="text-xs text-destructive">{errors.product_id.message}</p>}
          </div>

          {/* IMEI */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">IMEI</Label>
            <div className="relative">
              <Input
                {...register("imei")}
                placeholder="Masukkan nomor IMEI (14–17 digit)"
                className="h-10 pr-8"
                maxLength={17}
              />
              {imeiChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              )}
            </div>
            {(errors.imei || imeiError) && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {errors.imei?.message || imeiError}
              </p>
            )}
          </div>

          {/* Kondisi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kondisi</Label>
            <div className="flex gap-2">
              {(["no_minus", "minus"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("condition_status", c)}
                  className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    conditionStatus === c
                      ? c === "no_minus"
                        ? "border-[hsl(var(--status-available))] bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))]"
                        : "border-[hsl(var(--status-minus))] bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c === "no_minus" ? "No Minus" : "Ada Minus"}
                </button>
              ))}
            </div>
          </div>

          {/* Deskripsi Minus */}
          {conditionStatus === "minus" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Deskripsi Minus</Label>
              <Textarea
                {...register("minus_description")}
                placeholder="Jelaskan kondisi minus pada unit ini..."
                className="resize-none h-20 text-sm"
              />
            </div>
          )}

          {/* Harga Jual */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harga Jual</Label>
            <Input {...register("selling_price")} placeholder="Masukkan harga jual (contoh: 5000000)" className="h-10" />
            {errors.selling_price && <p className="text-xs text-destructive">{errors.selling_price.message}</p>}
          </div>

          {/* Harga Modal (super admin only field — always shown, RLS protects it) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Harga Modal <span className="text-muted-foreground/50 normal-case font-normal">(opsional)</span>
            </Label>
            <Input {...register("cost_price")} placeholder="Masukkan harga modal..." className="h-10" />
          </div>

          {/* Status Awal */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status Awal</Label>
            <Select defaultValue="available" onValueChange={(v) => setValue("stock_status", v as "available" | "coming_soon")}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Tersedia</SelectItem>
                <SelectItem value="coming_soon">Akan Datang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal Masuk */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal Masuk</Label>
            <Input {...register("received_at")} type="date" className="h-10" />
            {errors.received_at && <p className="text-xs text-destructive">{errors.received_at.message}</p>}
          </div>

          {/* Supplier & Batch */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Supplier</Label>
              <Input {...register("supplier")} placeholder="Nama supplier..." className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Batch</Label>
              <Input {...register("batch_code")} placeholder="Kode batch..." className="h-10" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Catatan</Label>
            <Textarea {...register("notes")} placeholder="Catatan tambahan (opsional)..." className="resize-none h-16 text-sm" />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button
            className="flex-1"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || !!imeiError || imeiChecking}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : "Simpan Unit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
