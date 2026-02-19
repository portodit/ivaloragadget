import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft, Plus, Search, Edit3, Trash2, Gift, Camera, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BonusProduct {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

async function uploadImage(file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("catalog-images")
    .upload(path, file, { upsert: true });
  if (error) return null;
  const { data: urlData } = supabase.storage.from("catalog-images").getPublicUrl(data.path);
  return urlData.publicUrl;
}

export default function BonusProductsPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = role === "super_admin";

  const [items, setItems] = useState<BonusProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BonusProduct | null>(null);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from("bonus_products").select("*").order("sort_order");
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function resetForm() {
    setName(""); setDescription(""); setIcon(null); setSortOrder(0); setIsActive(true); setEditItem(null);
  }

  function openAdd() { resetForm(); setModalOpen(true); }
  function openEdit(item: BonusProduct) {
    setEditItem(item);
    setName(item.name);
    setDescription(item.description ?? "");
    setIcon(item.icon);
    setSortOrder(item.sort_order);
    setIsActive(item.is_active);
    setModalOpen(true);
  }

  async function handleIconUpload(file: File) {
    setUploading(true);
    const path = `bonus/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const url = await uploadImage(file, path);
    setUploading(false);
    if (url) setIcon(url);
  }

  async function handleSave() {
    if (!name.trim()) { toast({ title: "Nama wajib diisi", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon: icon,
      sort_order: sortOrder,
      is_active: isActive,
    };
    let error;
    if (editItem) {
      ({ error } = await db.from("bonus_products").update(payload).eq("id", editItem.id));
    } else {
      ({ error } = await db.from("bonus_products").insert(payload));
    }
    setSaving(false);
    if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); return; }
    toast({ title: editItem ? "Bonus diperbarui" : "Bonus berhasil ditambahkan" });
    setModalOpen(false);
    resetForm();
    fetchItems();
  }

  async function handleDelete(item: BonusProduct) {
    if (!confirm(`Hapus bonus "${item.name}"?`)) return;
    const { error } = await db.from("bonus_products").delete().eq("id", item.id);
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); return; }
    toast({ title: "Bonus dihapus" });
    fetchItems();
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout pageTitle="Kelola Bonus Produk">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/katalog")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Kelola Bonus Produk</h2>
            <p className="text-sm text-muted-foreground">Atur hadiah gratis yang dapat ditambahkan ke setiap item katalog.</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Bonus
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari bonus produk…" className="pl-9" />
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse space-y-3">
                <div className="w-16 h-16 bg-muted rounded-xl" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
            <Gift className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Belum ada bonus produk</p>
            <p className="text-xs text-muted-foreground">Klik "Tambah Bonus" untuk menambahkan hadiah gratis baru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className={cn(
                "bg-card border border-border rounded-2xl p-4 flex gap-4 items-start transition-all hover:shadow-sm",
                !item.is_active && "opacity-50"
              )}>
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {item.icon ? (
                    item.icon.startsWith("http") ? (
                      <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{item.icon}</span>
                    )
                  ) : (
                    <Gift className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Urutan: {item.sort_order}</span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Bonus Produk" : "Tambah Bonus Produk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Bonus</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Tempered Glass" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deskripsi <span className="font-normal normal-case">(opsional)</span></label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Keterangan singkat…" className="min-h-[60px] resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ikon/Foto</label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : icon ? (
                    icon.startsWith("http") ? (
                      <img src={icon} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{icon}</span>
                    )
                  ) : (
                    <Camera className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>
                {icon && (
                  <Button variant="ghost" size="sm" onClick={() => setIcon(null)}>
                    <X className="w-3 h-3 mr-1" /> Hapus
                  </Button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); }} />
              </div>
              <p className="text-[11px] text-muted-foreground">Upload gambar atau ketik emoji di field di bawah</p>
              <Input value={icon && !icon.startsWith("http") ? icon : ""} onChange={e => setIcon(e.target.value || null)} placeholder="Emoji (misal: 🎁)" className="w-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Urutan</label>
                <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
                <button type="button" onClick={() => setIsActive(!isActive)}
                  className={cn("w-full h-9 rounded-md border text-sm font-medium transition-colors",
                    isActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-zinc-50 border-zinc-200 text-zinc-500"
                  )}>
                  {isActive ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? "Simpan" : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
