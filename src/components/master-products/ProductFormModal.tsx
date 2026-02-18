import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  CATEGORY_LABELS,
  STORAGE_OPTIONS,
  MasterProduct,
  ProductCategory,
  WarrantyType,
} from "@/lib/master-products";
import type { WarrantyLabel } from "@/components/master-products/WarrantyLabelModal";

const schema = z.object({
  category: z.enum(["iphone", "ipad", "accessory"] as const),
  series: z.string().trim().min(1, "Seri wajib diisi").max(100),
  storage_gb: z.coerce.number().int().positive("Storage wajib diisi"),
  color: z.string().trim().min(1, "Warna wajib diisi").max(50),
  warranty_type: z.enum(["resmi_bc", "ibox", "inter", "whitelist", "digimap"] as const),
  base_price: z.coerce.number().min(0).optional().or(z.literal("")).transform((v) => (v === "" ? null : v || null)),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProduct?: MasterProduct | null;
  isUsedInStock?: boolean;
  warrantyLabels?: WarrantyLabel[];
}


export function ProductFormModal({ open, onClose, onSuccess, editProduct, isUsedInStock, warrantyLabels = [] }: Props) {
  const { toast } = useToast();
  const [duplicateError, setDuplicateError] = useState(false);
  const isEdit = !!editProduct;
  const coreFieldsReadOnly = isEdit && isUsedInStock;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "iphone",
      series: "",
      storage_gb: 128,
      color: "",
      warranty_type: "resmi_bc",
      base_price: "" as any,
    },
  });

  useEffect(() => {
    if (editProduct && open) {
      reset({
        category: editProduct.category,
        series: editProduct.series,
        storage_gb: editProduct.storage_gb,
        color: editProduct.color,
        warranty_type: editProduct.warranty_type,
        base_price: editProduct.base_price ?? ("" as any),
      });
    } else if (!open) {
      reset({
        category: "iphone",
        series: "",
        storage_gb: 128,
        color: "",
        warranty_type: "resmi_bc",
        base_price: "" as any,
      });
      setDuplicateError(false);
    }
  }, [editProduct, open, reset]);

  const onSubmit = async (data: FormData) => {
    setDuplicateError(false);
    try {
      if (isEdit && editProduct) {
        const updatePayload: Record<string, unknown> = {
          base_price: data.base_price ?? null,
        };
        if (!coreFieldsReadOnly) {
          updatePayload.category = data.category;
          updatePayload.series = data.series;
          updatePayload.storage_gb = data.storage_gb;
          updatePayload.color = data.color;
          updatePayload.warranty_type = data.warranty_type;
        }
        const { error } = await supabase
          .from("master_products")
          .update(updatePayload)
          .eq("id", editProduct.id);
        if (error) throw error;
        toast({ title: "Produk berhasil diperbarui" });
      } else {
        const { error } = await supabase.from("master_products").insert({
          category: data.category,
          series: data.series,
          storage_gb: data.storage_gb,
          color: data.color,
          warranty_type: data.warranty_type,
          base_price: data.base_price ?? null,
        });
        if (error) {
          if (error.code === "23505") {
            setDuplicateError(true);
            return;
          }
          throw error;
        }
        toast({ title: "Produk berhasil ditambahkan" });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
    }
  };

  const watchedCategory = watch("category");
  const watchedStorage = watch("storage_gb");
  const watchedWarranty = watch("warranty_type");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? "Edit Master Produk" : "Tambah Master Produk"}
          </DialogTitle>
        </DialogHeader>

        {coreFieldsReadOnly && (
          <Alert className="border-border bg-muted">
            <AlertCircle className="h-4 w-4 text-foreground/60" />
            <AlertDescription className="text-muted-foreground text-xs">
              SKU ini sudah digunakan di stok. Atribut inti (Kategori, Seri, Storage, Warna, Garansi) tidak dapat diubah untuk menjaga integritas histori.
            </AlertDescription>
          </Alert>
        )}

        {duplicateError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Kombinasi SKU ini sudah terdaftar. Setiap kombinasi Kategori + Seri + Storage + Warna + Garansi harus unik.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kategori</Label>
            {coreFieldsReadOnly ? (
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
                {CATEGORY_LABELS[editProduct!.category]}
              </div>
            ) : (
              <Select value={watchedCategory} onValueChange={(v) => setValue("category", v as ProductCategory)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_LABELS) as [ProductCategory, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          {/* Series */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Seri / Model</Label>
            <Input
              placeholder="Contoh: iPhone 15 Pro Max"
              {...register("series")}
              readOnly={coreFieldsReadOnly}
              className={coreFieldsReadOnly ? "bg-muted" : ""}
            />
            {errors.series && <p className="text-xs text-destructive">{errors.series.message}</p>}
          </div>

          {/* Storage */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Storage (GB)</Label>
            {coreFieldsReadOnly ? (
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
                {editProduct!.storage_gb} GB
              </div>
            ) : (
              <Select value={String(watchedStorage)} onValueChange={(v) => setValue("storage_gb", parseInt(v))}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s >= 1024 ? `${s / 1024} TB` : `${s} GB`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.storage_gb && <p className="text-xs text-destructive">{errors.storage_gb.message}</p>}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Warna</Label>
            <Input
              placeholder="Contoh: Midnight, Desert Titanium, Starlight"
              {...register("color")}
              readOnly={coreFieldsReadOnly}
              className={coreFieldsReadOnly ? "bg-muted" : ""}
            />
            {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
          </div>

          {/* Warranty */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Jenis Garansi</Label>
            {coreFieldsReadOnly ? (
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
                {warrantyLabels.find((w) => w.key === editProduct!.warranty_type)?.label ?? editProduct!.warranty_type}
              </div>
            ) : (
              <Select value={watchedWarranty} onValueChange={(v) => setValue("warranty_type", v as WarrantyType)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Pilih jenis garansi" />
                </SelectTrigger>
                <SelectContent>
                  {warrantyLabels
                    .filter((w) => w.is_active)
                    .map((w) => (
                      <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            {errors.warranty_type && <p className="text-xs text-destructive">{errors.warranty_type.message}</p>}
          </div>


          {/* Base price — always editable */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Harga Referensi <span className="normal-case font-normal">(Opsional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                type="number"
                placeholder="Masukkan harga referensi dalam rupiah"
                min={0}
                className="pl-10"
                {...register("base_price")}
              />
            </div>
            {errors.base_price && <p className="text-xs text-destructive">{errors.base_price.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
