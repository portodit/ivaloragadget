import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { MasterProduct } from "@/lib/master-products";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  product: MasterProduct | null;
  hasAvailableStock: boolean;
  loading: boolean;
}

export function DeactivateModal({ open, onClose, onConfirm, product, hasAvailableStock, loading }: Props) {
  if (!product) return null;
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {product.is_active ? "Nonaktifkan SKU?" : "Aktifkan Kembali SKU?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {product.is_active
              ? `SKU "${product.series} ${product.storage_gb}GB ${product.color}" akan dinonaktifkan dan tidak bisa dipilih untuk stok baru.`
              : `SKU "${product.series} ${product.storage_gb}GB ${product.color}" akan diaktifkan kembali dan bisa digunakan untuk stok baru.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {product.is_active && hasAvailableStock && (
          <Alert className="border-border bg-muted my-0">
            <AlertTriangle className="h-4 w-4 text-foreground/60" />
            <AlertDescription className="text-muted-foreground text-xs">
              SKU ini masih memiliki unit tersedia di stok. Anda tetap bisa melanjutkan — unit yang sudah ada tidak akan terhapus.
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
        <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={loading}
          className={product.is_active ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : product.is_active ? "Ya, Nonaktifkan" : "Ya, Aktifkan Kembali"}
        </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
