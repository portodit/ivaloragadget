import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  PackageOpen,
  Eye,
  Pencil,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";
import {
  MasterProduct,
  CATEGORY_LABELS,
  ProductCategory,
  WarrantyType,
} from "@/lib/master-products";
import { ProductFormModal } from "@/components/master-products/ProductFormModal";
import { ProductDetailDrawer } from "@/components/master-products/ProductDetailDrawer";
import { DeactivateModal } from "@/components/master-products/DeactivateModal";
import { WarrantyLabelModal, WarrantyLabel } from "@/components/master-products/WarrantyLabelModal";

const PAGE_SIZE = 15;

export default function MasterProductsPage() {
  const { toast } = useToast();

  // ─── Data ────────────────────────────────────────────────
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // ─── Warranty labels (dynamic) ───────────────────────────
  const [warrantyLabels, setWarrantyLabels] = useState<WarrantyLabel[]>([]);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  // ─── Filters ─────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterWarranty, setFilterWarranty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [page, setPage] = useState(1);

  // ─── Modals ──────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<MasterProduct | null>(null);
  const [isUsedInStock, setIsUsedInStock] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailProduct, setDetailProduct] = useState<MasterProduct | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateProduct, setDeactivateProduct] = useState<MasterProduct | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // ─── Debounce search ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCategory, filterWarranty, filterStatus]);

  // ─── Fetch warranty labels ────────────────────────────────
  const fetchWarrantyLabels = useCallback(async () => {
    const { data } = await supabase
      .from("warranty_labels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setWarrantyLabels(data as WarrantyLabel[]);
  }, []);

  useEffect(() => { fetchWarrantyLabels(); }, [fetchWarrantyLabels]);

  // Build label map for display
  const warrantyLabelMap = Object.fromEntries(
    warrantyLabels.map((w) => [w.key, w.label])
  );
  const getWarrantyLabel = (key: string) => warrantyLabelMap[key] ?? key;

  // ─── Fetch products ───────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("master_products")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order("series", { ascending: true })
        .order("storage_gb", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (debouncedSearch.trim()) {
        query = query.or(
          `series.ilike.%${debouncedSearch}%,color.ilike.%${debouncedSearch}%`
        );
      }
      if (filterCategory !== "all") query = query.eq("category", filterCategory as ProductCategory);
      if (filterWarranty !== "all") query = query.eq("warranty_type", filterWarranty as WarrantyType);
      if (filterStatus === "active") query = query.eq("is_active", true);
      if (filterStatus === "inactive") query = query.eq("is_active", false);

      const { data, error: err, count } = await query;
      if (err) throw err;
      setProducts((data as MasterProduct[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterCategory, filterWarranty, filterStatus]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ─── Handlers ────────────────────────────────────────────
  const handleEdit = (product: MasterProduct) => {
    setEditProduct(product);
    setIsUsedInStock(false);
    setShowForm(true);
  };

  const handleDetail = (product: MasterProduct) => {
    setDetailProduct(product);
    setShowDetail(true);
  };

  const handleToggleActive = (product: MasterProduct) => {
    setDeactivateProduct(product);
    setShowDeactivate(true);
  };

  const handleConfirmToggle = async () => {
    if (!deactivateProduct) return;
    setDeactivateLoading(true);
    try {
      const { error } = await supabase
        .from("master_products")
        .update({ is_active: !deactivateProduct.is_active })
        .eq("id", deactivateProduct.id);
      if (error) throw error;
      toast({
        title: deactivateProduct.is_active ? "SKU dinonaktifkan" : "SKU diaktifkan kembali",
      });
      setShowDeactivate(false);
      setDeactivateProduct(null);
      fetchProducts();
    } catch (e: unknown) {
      toast({
        title: "Gagal mengubah status",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setDeactivateLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ─── Render helpers ───────────────────────────────────────
  const formatStorage = (gb: number) => gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
  const formatPrice = (n: number | null) =>
    n ? `Rp ${n.toLocaleString("id-ID")}` : <span className="text-muted-foreground text-xs italic">—</span>;

  const renderSkeleton = () =>
    Array.from({ length: 6 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: 8 }).map((_, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
        ))}
      </TableRow>
    ));

  return (
    <DashboardLayout pageTitle="Master Data Produk">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Master Data Produk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola varian produk berdasarkan kombinasi kategori, seri, storage, warna, dan garansi
          </p>
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowWarrantyModal(true)}
          >
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Kelola Label Garansi</span>
            <span className="sm:hidden">Garansi</span>
          </Button>
          <Button
            className="gap-2"
            onClick={() => { setEditProduct(null); setShowForm(true); }}
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari seri atau warna produk..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {(Object.entries(CATEGORY_LABELS) as [ProductCategory, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterWarranty} onValueChange={setFilterWarranty}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Garansi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Garansi</SelectItem>
              {warrantyLabels.map((w) => (
                <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
              <SelectItem value="all">Semua Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Count ── */}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground mb-3">
          {totalCount} SKU ditemukan
        </p>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold text-xs uppercase tracking-widest w-24">Kategori</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-widest">Seri</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-widest w-24 text-center">Storage</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-widest">Warna</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-widest">Garansi</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-widest text-right">Harga Ref.</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-widest w-20 text-center">Status</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-widest w-32 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? renderSkeleton() : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-destructive">
                      <AlertCircle className="w-8 h-8" />
                      <p className="text-sm font-medium">Gagal memuat data</p>
                      <p className="text-xs text-muted-foreground">{error}</p>
                      <Button size="sm" variant="outline" onClick={fetchProducts} className="mt-1">Coba Lagi</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <PackageOpen className="w-12 h-12 opacity-30" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {debouncedSearch || filterCategory !== "all" || filterWarranty !== "all" || filterStatus !== "active"
                            ? "Tidak ada SKU yang cocok"
                            : "Belum ada master produk"}
                        </p>
                        <p className="text-xs mt-0.5">
                          {debouncedSearch || filterCategory !== "all" || filterWarranty !== "all" || filterStatus !== "active"
                            ? "Coba ubah filter atau kata kunci pencarian"
                            : "Mulai dengan menambahkan produk pertama Anda"}
                        </p>
                      </div>
                      {!debouncedSearch && filterCategory === "all" && filterWarranty === "all" && filterStatus === "active" && (
                        <Button
                          size="sm"
                          className="gap-1.5 mt-1"
                          onClick={() => { setEditProduct(null); setShowForm(true); }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Produk Pertama
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {CATEGORY_LABELS[p.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{p.series}</TableCell>
                    <TableCell className="text-center text-sm">{formatStorage(p.storage_gb)}</TableCell>
                    <TableCell className="text-sm">{p.color}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getWarrantyLabel(p.warranty_type)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatPrice(p.base_price)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8"
                          title="Detail"
                          onClick={() => handleDetail(p)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8"
                          title="Edit"
                          onClick={() => handleEdit(p)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8"
                          title={p.is_active ? "Nonaktifkan" : "Aktifkan"}
                          onClick={() => handleToggleActive(p)}
                        >
                          {p.is_active
                            ? <ToggleLeft className="w-3.5 h-3.5 text-destructive" />
                            : <ToggleRight className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 gap-1"
              >
                Berikutnya
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <ProductFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditProduct(null); }}
        onSuccess={fetchProducts}
        editProduct={editProduct}
        isUsedInStock={isUsedInStock}
        warrantyLabels={warrantyLabels}
      />

      <ProductDetailDrawer
        open={showDetail}
        onClose={() => { setShowDetail(false); setDetailProduct(null); }}
        product={detailProduct}
        stockSummary={undefined}
        loadingSummary={false}
        warrantyLabelMap={warrantyLabelMap}
      />

      <DeactivateModal
        open={showDeactivate}
        onClose={() => { setShowDeactivate(false); setDeactivateProduct(null); }}
        onConfirm={handleConfirmToggle}
        product={deactivateProduct}
        hasAvailableStock={false}
        loading={deactivateLoading}
      />

      <WarrantyLabelModal
        open={showWarrantyModal}
        onClose={() => {
          setShowWarrantyModal(false);
          fetchWarrantyLabels(); // Refresh labels after editing
        }}
      />
    </DashboardLayout>
  );
}
