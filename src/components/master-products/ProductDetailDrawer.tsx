import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterProduct, CATEGORY_LABELS } from "@/lib/master-products";

interface StockSummary {
  total_available: number;
  total_sold: number;
  total_ever: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: MasterProduct | null;
  stockSummary?: StockSummary;
  loadingSummary?: boolean;
  warrantyLabelMap?: Record<string, string>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border last:border-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
      {loading ? (
        <Skeleton className="h-7 w-12 mx-auto mb-1" />
      ) : (
        <div className="text-2xl font-bold text-foreground">{value}</div>
      )}
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export function ProductDetailDrawer({ open, onClose, product, stockSummary, loadingSummary, warrantyLabelMap }: Props) {
  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <SheetTitle className="text-base leading-snug">{product.series}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {product.storage_gb >= 1024 ? `${product.storage_gb / 1024} TB` : `${product.storage_gb} GB`} · {product.color}
              </p>
            </div>
            <Badge variant={product.is_active ? "default" : "secondary"} className="shrink-0">
              {product.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
        </SheetHeader>

        {/* Info SKU */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Informasi SKU</h3>
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            <InfoRow label="Kategori" value={CATEGORY_LABELS[product.category]} />
            <InfoRow label="Seri" value={product.series} />
            <InfoRow label="Storage" value={product.storage_gb >= 1024 ? `${product.storage_gb / 1024} TB` : `${product.storage_gb} GB`} />
            <InfoRow label="Warna" value={product.color} />
            <InfoRow label="Garansi" value={warrantyLabelMap?.[product.warranty_type] ?? product.warranty_type} />
            <InfoRow
              label="Harga Referensi"
              value={
                product.base_price
                  ? `Rp ${product.base_price.toLocaleString("id-ID")}`
                  : <span className="text-muted-foreground text-xs italic">Tidak diset</span>
              }
            />
            <InfoRow
              label="Dibuat"
              value={new Date(product.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            />
          </div>
        </div>

        {/* Ringkasan Stok */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Ringkasan Stok Terkait</h3>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Tersedia" value={stockSummary?.total_available ?? 0} loading={loadingSummary} />
            <StatCard label="Terjual" value={stockSummary?.total_sold ?? 0} loading={loadingSummary} />
            <StatCard label="Total Masuk" value={stockSummary?.total_ever ?? 0} loading={loadingSummary} />
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Data stok akan tersedia setelah fitur Manajemen Stok IMEI diaktifkan.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
