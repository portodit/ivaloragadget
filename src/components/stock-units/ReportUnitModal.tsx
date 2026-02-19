import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import type { StockUnit } from "@/lib/stock-units";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const REPORT_TYPES = [
  { value: "wrong_imei", label: "IMEI salah / tidak cocok dengan seri" },
  { value: "wrong_condition", label: "Keterangan minus/no minus salah" },
  { value: "wrong_status", label: "Status stok salah (terjual, dll)" },
  { value: "wrong_price", label: "Harga jual / modal salah" },
  { value: "wrong_data", label: "Data lain salah (supplier, batch, dll)" },
  { value: "other", label: "Lainnya" },
];

interface ReportUnitModalProps {
  unit: StockUnit | null;
  open: boolean;
  onClose: () => void;
}

export function ReportUnitModal({ unit, open, onClose }: ReportUnitModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!unit || !reportType) {
      toast({ title: "Pilih jenis pengajuan", variant: "destructive" });
      return;
    }
    setSending(true);

    // Find all super_admins
    const { data: saRoles } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    const saIds: string[] = (saRoles ?? []).map((r: { user_id: string }) => r.user_id);

    const typeLabel = REPORT_TYPES.find(r => r.value === reportType)?.label ?? reportType;
    const productLabel = `${unit.master_products?.series ?? ""} ${unit.master_products?.storage_gb ?? ""}GB ${unit.master_products?.color ?? ""}`.trim();

    // Send notification to all super admins
    const notifications = saIds.map(saId => ({
      user_id: saId,
      type: "unit_report",
      title: `Pengajuan Koreksi Unit: ${typeLabel}`,
      body: `${productLabel} (IMEI: ${unit.imei})${description ? ` — ${description}` : ""}`,
      link: "/admin/stok-imei",
    }));

    if (notifications.length > 0) {
      await db.from("notifications").insert(notifications);
    }

    setSending(false);
    toast({ title: "Pengajuan terkirim ke Super Admin" });
    setReportType("");
    setDescription("");
    onClose();
  }

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Laporkan Kesalahan Unit
          </DialogTitle>
          <DialogDescription>
            {unit.master_products?.series} {unit.master_products?.storage_gb}GB {unit.master_products?.color} — IMEI: {unit.imei}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Jenis Pengajuan Koreksi</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis masalah..." /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Keterangan Tambahan (opsional)</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Jelaskan detail yang perlu dikoreksi..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSend} disabled={sending || !reportType}>
            {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Kirim ke Super Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
