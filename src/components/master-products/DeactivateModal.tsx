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
  loading: boolean;
  cannotDeleteReason?: string | null;
}

export function DeactivateModal({ open, onClose, onConfirm, product, loading, cannotDeleteReason }: Props) {
  if (!product) return null;
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Hapus Master Produk?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            SKU "{product.series} {product.storage_gb}GB {product.color}" akan dihapus permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {cannotDeleteReason && (
          <Alert variant="destructive" className="my-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {cannotDeleteReason}
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
        <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={loading || !!cannotDeleteReason}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : "Ya, Hapus"}
        </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}