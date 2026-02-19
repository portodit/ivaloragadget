import { useState, useEffect } from "react";
import { X, Package, Clock, TrendingDown, ShieldCheck, AlertTriangle, Trash2, Pencil, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StockUnit, StockUnitLog, STOCK_STATUS_LABELS, VALID_TRANSITIONS, SOLD_CHANNEL_LABELS, SOLD_CHANNEL_SHORT, MINUS_SEVERITY_LABELS, formatCurrency, formatDate, StockStatus, SoldChannel } from "@/lib/stock-units";
import { StockStatusBadge, ConditionBadge } from "./StockBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EditUnitModal } from "./EditUnitModal";
import { ReportUnitModal } from "./ReportUnitModal";

interface UnitDetailDrawerProps {
  unit: StockUnit | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function UnitDetailDrawer({ unit, onClose, onUpdate }: UnitDetailDrawerProps) {
  const { toast } = useToast();
  const { role } = useAuth();
  const [logs, setLogs] = useState<StockUnitLog[]>([]);
  const [newStatus, setNewStatus] = useState<StockStatus | "">("");
  const [soldChannel, setSoldChannel] = useState<SoldChannel | "">("");
  const [soldRefId, setSoldRefId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!unit) return;
    setNewStatus("");
    setSoldChannel("");
    setSoldRefId("");
    setConfirmDelete(false);
    supabase
      .from("stock_unit_logs")
      .select("*")
      .eq("unit_id", unit.id)
      .order("changed_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setLogs((data as StockUnitLog[]) ?? []));
  }, [unit]);

  if (!unit) return null;

  const validTransitions = isSuperAdmin
    ? Object.keys(STOCK_STATUS_LABELS) as StockStatus[]
    : VALID_TRANSITIONS[unit.stock_status];

  const needsSoldChannel = newStatus === "sold";
  const needsSoldRef = soldChannel === "ecommerce_tokopedia" || soldChannel === "ecommerce_shopee";

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === unit.stock_status) return;
    if (needsSoldChannel && !soldChannel) {
      toast({ title: "Pilih channel penjualan", variant: "destructive" });
      return;
    }
    if (needsSoldRef && !soldRefId.trim()) {
      toast({ title: "Masukkan ID Transaksi e-commerce", variant: "destructive" });
      return;
    }
    setUpdating(true);
    const updateData: Record<string, unknown> = { stock_status: newStatus };
    if (needsSoldChannel) {
      updateData.sold_channel = soldChannel;
      if (needsSoldRef) updateData.sold_reference_id = soldRefId.trim();
    }
    const { error } = await supabase
      .from("stock_units")
      .update(updateData as never)
      .eq("id", unit.id);
    setUpdating(false);
    if (error) {
      toast({ title: "Gagal mengubah status", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status berhasil diperbarui" });
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("stock_units").delete().eq("id", unit.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Gagal menghapus unit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Unit berhasil dihapus" });
    onUpdate();
    onClose();
  };

  const fieldLabel: Record<string, string> = {
    stock_status: "Status Stok",
    selling_price: "Harga Jual",
    condition_status: "Kondisi",
    minus_severity: "Tingkat Minus",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-md bg-card border-l border-border flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Detail Unit</h2>
            <p className="text-sm font-medium text-foreground font-mono mt-0.5">IMEI: {unit.imei}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Product info */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {unit.master_products?.series} — {unit.master_products?.storage_gb}GB
                </p>
                <p className="text-xs text-muted-foreground">{unit.master_products?.color} · {unit.master_products?.warranty_type?.replace(/_/g, " ")}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StockStatusBadge status={unit.stock_status} />
                  <ConditionBadge condition={unit.condition_status} />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons: Edit (super_admin) / Report (admin) */}
          <div className="px-6 py-2 border-b border-border flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" size="sm" className="flex-1 h-8 gap-1.5 text-xs" onClick={() => setEditOpen(true)}>
                <Pencil className="w-3 h-3" /> Edit Unit
              </Button>
            )}
            {isAdmin && !isSuperAdmin && (
              <Button variant="outline" size="sm" className="flex-1 h-8 gap-1.5 text-xs" onClick={() => setReportOpen(true)}>
                <Flag className="w-3 h-3" /> Laporkan Koreksi
              </Button>
            )}
          </div>

          {/* Key fields */}
          <div className="px-6 py-4 space-y-3 border-b border-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Harga Jual</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(unit.selling_price)}</p>
              </div>
              {isSuperAdmin && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Harga Modal</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(unit.cost_price)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Tanggal Masuk</p>
                <p className="text-sm text-foreground">{formatDate(unit.received_at)}</p>
              </div>
              {unit.estimated_arrival_at && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Est. Kedatangan</p>
                  <p className="text-sm text-foreground">{formatDate(unit.estimated_arrival_at)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Perubahan Status</p>
                <p className="text-sm text-foreground">{formatDate(unit.status_changed_at)}</p>
              </div>
              {unit.supplier && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Supplier</p>
                  <p className="text-sm text-foreground">{unit.supplier}</p>
                </div>
              )}
              {unit.batch_code && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Batch</p>
                  <p className="text-sm text-foreground font-mono">{unit.batch_code}</p>
                </div>
              )}
            </div>
            {unit.minus_description && (
              <div className="rounded-lg bg-[hsl(var(--status-minus-bg))] border border-[hsl(var(--status-minus))]/20 px-3 py-2">
                <p className="text-xs text-[hsl(var(--status-minus-fg))] font-medium flex items-center gap-1 mb-0.5">
                  <AlertTriangle className="w-3 h-3" /> Deskripsi Minus
                  {unit.minus_severity && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--status-minus))]/10">
                      {MINUS_SEVERITY_LABELS[unit.minus_severity]}
                    </span>
                  )}
                </p>
                <p className="text-xs text-foreground">{unit.minus_description}</p>
              </div>
            )}
            {unit.sold_channel && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Channel Penjualan</p>
                  <p className="text-sm text-foreground">{SOLD_CHANNEL_SHORT[unit.sold_channel]}</p>
                </div>
                {unit.sold_reference_id && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">ID Transaksi</p>
                    <p className="text-sm text-foreground font-mono">{unit.sold_reference_id}</p>
                  </div>
                )}
              </div>
            )}
            {unit.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Catatan</p>
                <p className="text-sm text-foreground">{unit.notes}</p>
              </div>
            )}
          </div>

          {/* Status change (super admin + valid transitions) */}
          {isSuperAdmin && validTransitions.length > 0 && (
            <div className="px-6 py-4 border-b border-border space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Ubah Status
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as StockStatus)}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Pilih status baru..." />
                    </SelectTrigger>
                    <SelectContent>
                      {validTransitions
                        .filter((s) => s !== unit.stock_status)
                        .map((s) => (
                          <SelectItem key={s} value={s}>{STOCK_STATUS_LABELS[s]}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-9" disabled={!newStatus || updating || (needsSoldChannel && !soldChannel) || (needsSoldRef && !soldRefId.trim())} onClick={handleStatusUpdate}>
                    {updating ? <div className="w-3 h-3 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Terapkan"}
                  </Button>
                </div>

                {/* Sold channel selection */}
                {needsSoldChannel && (
                  <div className="space-y-2 pl-1">
                    <p className="text-xs text-muted-foreground">Channel penjualan:</p>
                    <Select value={soldChannel} onValueChange={(v) => setSoldChannel(v as SoldChannel)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Pilih channel..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ecommerce_tokopedia">E-Commerce Tokopedia</SelectItem>
                        <SelectItem value="ecommerce_shopee">E-Commerce Shopee</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">POS & Website otomatis saat ada transaksi.</p>
                  </div>
                )}

                {/* E-commerce transaction ID */}
                {needsSoldRef && (
                  <div className="pl-1 space-y-1">
                    <p className="text-xs text-muted-foreground">ID Transaksi E-Commerce:</p>
                    <Input
                      value={soldRefId}
                      onChange={(e) => setSoldRefId(e.target.value)}
                      placeholder="Masukkan nomor transaksi..."
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Perubahan status akan dicatat dalam histori audit.</p>
            </div>
          )}

          {/* Delete unit (super admin only) */}
          {isSuperAdmin && (
            <div className="px-6 py-4 border-b border-border">
              {!confirmDelete ? (
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 gap-2" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Unit Ini
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-destructive font-medium">Yakin ingin menghapus unit ini? Tindakan ini tidak dapat dibatalkan.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => setConfirmDelete(false)}>Batal</Button>
                    <Button variant="destructive" size="sm" className="flex-1 h-8" disabled={deleting} onClick={handleDelete}>
                      {deleting ? <div className="w-3 h-3 border border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" /> : "Hapus"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit log */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-3">
              <Clock className="w-3 h-3" /> Riwayat Perubahan
            </p>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada riwayat perubahan.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-border mt-1 shrink-0" />
                      <div className="w-px flex-1 bg-border mt-1" />
                    </div>
                    <div className="pb-3">
                      <p className="text-xs text-foreground font-medium">{fieldLabel[log.field_changed] ?? log.field_changed}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.old_value ?? "—"} → {log.new_value ?? "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.changed_at))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground/50 mt-3">Riwayat aktivitas unit ini tercatat untuk kebutuhan audit.</p>
          </div>
        </div>
      </div>
      <EditUnitModal unit={unit} open={editOpen} onClose={() => setEditOpen(false)} onSuccess={() => { onUpdate(); }} />
      <ReportUnitModal unit={unit} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
