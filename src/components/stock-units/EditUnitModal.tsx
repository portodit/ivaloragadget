import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { StockUnit, ConditionStatus, MinusSeverity } from "@/lib/stock-units";

interface EditUnitModalProps {
  unit: StockUnit | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUnitModal({ unit, open, onClose, onSuccess }: EditUnitModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [imei, setImei] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [conditionStatus, setConditionStatus] = useState<ConditionStatus>("no_minus");
  const [minusSeverity, setMinusSeverity] = useState<MinusSeverity | "">("");
  const [minusDescription, setMinusDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (unit && open) {
      setImei(unit.imei);
      setSellingPrice(unit.selling_price?.toString() ?? "");
      setCostPrice(unit.cost_price?.toString() ?? "");
      setConditionStatus(unit.condition_status);
      setMinusSeverity(unit.minus_severity ?? "");
      setMinusDescription(unit.minus_description ?? "");
      setSupplier(unit.supplier ?? "");
      setBatchCode(unit.batch_code ?? "");
      setNotes(unit.notes ?? "");
    }
  }, [unit, open]);

  async function handleSave() {
    if (!unit) return;
    if (!imei.trim()) {
      toast({ title: "IMEI wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const updateData: Record<string, unknown> = {
      imei: imei.trim(),
      selling_price: sellingPrice ? Number(sellingPrice) : null,
      cost_price: costPrice ? Number(costPrice) : null,
      condition_status: conditionStatus,
      minus_severity: conditionStatus === "minus" ? (minusSeverity || null) : null,
      minus_description: conditionStatus === "minus" ? (minusDescription.trim() || null) : null,
      supplier: supplier.trim() || null,
      batch_code: batchCode.trim() || null,
      notes: notes.trim() || null,
    };

    const { error } = await supabase
      .from("stock_units")
      .update(updateData as never)
      .eq("id", unit.id);

    setSaving(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Unit berhasil diperbarui" });
    onSuccess();
    onClose();
  }

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Unit — {unit.master_products?.series} {unit.master_products?.storage_gb}GB</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">IMEI</label>
            <Input value={imei} onChange={e => setImei(e.target.value)} placeholder="IMEI" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Harga Jual</label>
              <Input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Harga Modal</label>
              <Input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Kondisi</label>
            <Select value={conditionStatus} onValueChange={v => setConditionStatus(v as ConditionStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no_minus">No Minus</SelectItem>
                <SelectItem value="minus">Ada Minus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {conditionStatus === "minus" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tingkat Minus</label>
                <Select value={minusSeverity} onValueChange={v => setMinusSeverity(v as MinusSeverity)}>
                  <SelectTrigger><SelectValue placeholder="Pilih tingkat..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="mayor">Mayor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Deskripsi Minus</label>
                <Textarea value={minusDescription} onChange={e => setMinusDescription(e.target.value)}
                  placeholder="Jelaskan detail minus..." rows={2} />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Supplier</label>
              <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Opsional" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Batch Code</label>
              <Input value={batchCode} onChange={e => setBatchCode(e.target.value)} placeholder="Opsional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Catatan</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan internal..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
