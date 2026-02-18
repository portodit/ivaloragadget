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
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Loader2,
  Plus,
  Pencil,
  Tag,
  ToggleLeft,
  ToggleRight,
  GripVertical,
} from "lucide-react";

export interface WarrantyLabel {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  key: z
    .string()
    .trim()
    .min(2, "Key minimal 2 karakter")
    .max(60, "Key maksimal 60 karakter")
    .regex(/^[a-z0-9_]+$/, "Key hanya boleh huruf kecil, angka, dan underscore"),
  label: z.string().trim().min(2, "Label wajib diisi").max(100, "Label maksimal 100 karakter"),
  description: z.string().trim().max(255, "Deskripsi maksimal 255 karakter").optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Sub-component: AddEditForm ─────────────────────────────────────────────
function AddEditForm({
  editItem,
  existingKeys,
  onSuccess,
  onCancel,
}: {
  editItem: WarrantyLabel | null;
  existingKeys: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [duplicateError, setDuplicateError] = useState(false);
  const isEdit = !!editItem;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      key: editItem?.key ?? "",
      label: editItem?.label ?? "",
      description: editItem?.description ?? "",
    },
  });

  useEffect(() => {
    reset({
      key: editItem?.key ?? "",
      label: editItem?.label ?? "",
      description: editItem?.description ?? "",
    });
    setDuplicateError(false);
  }, [editItem, reset]);

  const onSubmit = async (data: FormData) => {
    setDuplicateError(false);
    try {
      if (isEdit && editItem) {
        const { error } = await supabase
          .from("warranty_labels")
          .update({
            label: data.label,
            description: data.description || null,
          })
          .eq("id", editItem.id);
        if (error) throw error;
        toast({ title: "Label garansi berhasil diperbarui" });
      } else {
        // Check key uniqueness client-side for better UX
        if (existingKeys.includes(data.key)) {
          setDuplicateError(true);
          return;
        }
        const { error } = await supabase.from("warranty_labels").insert({
          key: data.key,
          label: data.label,
          description: data.description || null,
          sort_order: existingKeys.length + 1,
        });
        if (error) {
          if (error.code === "23505") {
            setDuplicateError(true);
            return;
          }
          throw error;
        }
        toast({ title: "Label garansi berhasil ditambahkan" });
      }
      onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {isEdit ? "Edit Label Garansi" : "Tambah Label Garansi Baru"}
      </p>

      {duplicateError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Key "{watch("key")}" sudah digunakan. Gunakan key yang berbeda.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Key — read-only on edit */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key (ID Sistem)
          </Label>
          <Input
            placeholder="Contoh: resmi_bc"
            {...register("key")}
            readOnly={isEdit}
            className={isEdit ? "bg-muted text-muted-foreground" : ""}
          />
          {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
          {!isEdit && (
            <p className="text-[10px] text-muted-foreground">Huruf kecil, angka, underscore saja</p>
          )}
        </div>

        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nama Label
          </Label>
          <Input
            placeholder="Contoh: Resmi iBox Indonesia"
            {...register("label")}
          />
          {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Deskripsi <span className="normal-case font-normal">(Opsional)</span>
        </Label>
        <Textarea
          placeholder="Masukkan deskripsi singkat label garansi ini"
          rows={2}
          className="resize-none"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isEdit ? (
            "Simpan Perubahan"
          ) : (
            "Tambah Label"
          )}
        </Button>
      </div>
    </form>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
export function WarrantyLabelModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const [labels, setLabels] = useState<WarrantyLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<WarrantyLabel | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchLabels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("warranty_labels")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (!error) setLabels((data as WarrantyLabel[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchLabels();
  }, [open]);

  const handleToggle = async (item: WarrantyLabel) => {
    setTogglingId(item.id);
    const { error } = await supabase
      .from("warranty_labels")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (error) {
      toast({ title: "Gagal mengubah status", variant: "destructive" });
    } else {
      toast({ title: item.is_active ? "Label dinonaktifkan" : "Label diaktifkan" });
      fetchLabels();
    }
    setTogglingId(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditItem(null);
    fetchLabels();
  };

  const handleEdit = (item: WarrantyLabel) => {
    setEditItem(item);
    setShowForm(true);
  };

  const existingKeys = labels.map((l) => l.key);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Tag className="w-4 h-4" />
            Kelola Label Garansi
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tambah atau kelola label jenis garansi yang tersedia untuk produk.
          </DialogDescription>
        </DialogHeader>

        {/* Add form toggle */}
        {!showForm ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start shrink-0"
            onClick={() => { setEditItem(null); setShowForm(true); }}
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Label Baru
          </Button>
        ) : (
          <AddEditForm
            editItem={editItem}
            existingKeys={existingKeys}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-16 h-5 rounded-full" />
                <Skeleton className="w-8 h-8 rounded" />
              </div>
            ))
          ) : labels.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Tag className="w-8 h-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm">Belum ada label garansi</p>
            </div>
          ) : (
            labels.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.label}</span>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                      {item.key}
                    </code>
                    <Badge
                      variant={item.is_active ? "default" : "secondary"}
                      className="text-[10px] h-4 px-1.5"
                    >
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7"
                    title="Edit"
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7"
                    title={item.is_active ? "Nonaktifkan" : "Aktifkan"}
                    disabled={togglingId === item.id}
                    onClick={() => handleToggle(item)}
                  >
                    {togglingId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : item.is_active ? (
                      <ToggleLeft className="w-3.5 h-3.5 text-destructive" />
                    ) : (
                      <ToggleRight className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
