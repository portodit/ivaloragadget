import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, RefreshCw, ChevronDown,
  CheckCircle2, XCircle, Clock, Ban, X, Mail,
  Eye, KeyRound, AlertTriangle, ShieldCheck, Trash2,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomerUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  email_confirmed: boolean;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  profile_status: string;
}

type ModalAction = { type: "detail" | "verify" | "email" | "password" | "suspend" | "activate" | "delete"; user: CustomerUser };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(dateStr));
}

function StatusBadge({ confirmed, profileStatus }: { confirmed: boolean; profileStatus: string }) {
  if (profileStatus === "suspended") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]">
        <Ban className="w-3 h-3" /> Dinonaktifkan
      </span>
    );
  }
  if (!confirmed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--status-reserved-bg))] text-[hsl(var(--status-reserved-fg))]">
        <Clock className="w-3 h-3" /> Belum Verifikasi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))]">
      <CheckCircle2 className="w-3 h-3" /> Aktif
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManajemenCustomerPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState<ModalAction | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-customer", {
      body: { action: "list_customers" },
    });
    if (error) {
      toast({ title: "Gagal memuat data customer", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setCustomers(data?.customers ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const invokeAction = async (action: string, userId: string, extra?: Record<string, string>) => {
    setProcessing(true);
    const { error } = await supabase.functions.invoke("manage-customer", {
      body: { action, user_id: userId, ...extra },
    });
    setProcessing(false);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleVerifyEmail = async (user: CustomerUser) => {
    const ok = await invokeAction("verify_email", user.id);
    if (ok) {
      toast({ title: "Email berhasil diverifikasi." });
      setModal(null);
      fetchCustomers();
    }
  };

  const handleUpdateEmail = async (user: CustomerUser) => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast({ title: "Email tidak valid.", variant: "destructive" });
      return;
    }
    const ok = await invokeAction("update_email", user.id, { email: newEmail.trim() });
    if (ok) {
      toast({ title: "Email berhasil diubah." });
      setModal(null);
      setNewEmail("");
      fetchCustomers();
    }
  };

  const handleUpdatePassword = async (user: CustomerUser) => {
    if (newPassword.length < 8) {
      toast({ title: "Password minimal 8 karakter.", variant: "destructive" });
      return;
    }
    const ok = await invokeAction("update_password", user.id, { password: newPassword });
    if (ok) {
      toast({ title: "Password berhasil diubah." });
      setModal(null);
      setNewPassword("");
      fetchCustomers();
    }
  };

  const handleSuspend = async (user: CustomerUser) => {
    const ok = await invokeAction("suspend", user.id);
    if (ok) {
      toast({ title: "Akun customer dinonaktifkan." });
      setModal(null);
      fetchCustomers();
    }
  };

  const handleActivate = async (user: CustomerUser) => {
    const ok = await invokeAction("activate", user.id);
    if (ok) {
      toast({ title: "Akun customer diaktifkan kembali." });
      setModal(null);
      fetchCustomers();
    }
  };

  const handleDelete = async (user: CustomerUser) => {
    const ok = await invokeAction("delete", user.id);
    if (ok) {
      toast({ title: "Akun customer dihapus permanen." });
      setModal(null);
      fetchCustomers();
    }
  };

  // Filter
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.full_name ?? "").toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    let matchStatus = true;
    if (filterStatus === "verified") matchStatus = c.email_confirmed && c.profile_status !== "suspended";
    else if (filterStatus === "unverified") matchStatus = !c.email_confirmed;
    else if (filterStatus === "suspended") matchStatus = c.profile_status === "suspended";
    return matchSearch && matchStatus;
  });

  const counts = {
    total: customers.length,
    verified: customers.filter((c) => c.email_confirmed && c.profile_status !== "suspended").length,
    unverified: customers.filter((c) => !c.email_confirmed).length,
    suspended: customers.filter((c) => c.profile_status === "suspended").length,
  };

  return (
    <DashboardLayout pageTitle="Manajemen Customer">
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Manajemen Customer</h1>
          <p className="text-xs text-muted-foreground">Kelola akun customer, verifikasi email, dan reset password.</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Customer", count: counts.total, color: "text-foreground", bg: "bg-muted/50" },
            { label: "Terverifikasi", count: counts.verified, color: "text-[hsl(var(--status-available-fg))]", bg: "bg-[hsl(var(--status-available-bg))]" },
            { label: "Belum Verifikasi", count: counts.unverified, color: "text-[hsl(var(--status-reserved-fg))]", bg: "bg-[hsl(var(--status-reserved-bg))]" },
            { label: "Dinonaktifkan", count: counts.suspended, color: "text-[hsl(var(--status-minus-fg))]", bg: "bg-[hsl(var(--status-minus-bg))]" },
          ].map((k) => (
            <div key={k.label} className={cn("rounded-xl border border-border p-3 sm:p-4", k.bg)}>
              <p className={cn("text-xl sm:text-2xl font-bold", k.color)}>{k.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Semua Status</option>
              <option value="verified">Terverifikasi</option>
              <option value="unverified">Belum Verifikasi</option>
              <option value="suspended">Dinonaktifkan</option>
            </select>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={fetchCustomers}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Tidak ada customer yang ditemukan.</p>
            <p className="text-xs text-muted-foreground mt-1">Coba ubah filter atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nama</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Terdaftar</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Login Terakhir</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-bold flex items-center justify-center shrink-0">
                            {(c.full_name ?? c.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.full_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground md:hidden truncate">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        <span className="truncate max-w-[200px] block">{c.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge confirmed={c.email_confirmed} profileStatus={c.profile_status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{formatDate(c.last_sign_in_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModal({ type: "detail", user: c })}
                            title="Lihat detail"
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {!c.email_confirmed && c.profile_status !== "suspended" && (
                            <button
                              onClick={() => setModal({ type: "verify", user: c })}
                              title="Verifikasi email"
                              className="p-1.5 rounded-lg hover:bg-[hsl(var(--status-available-bg))] text-muted-foreground hover:text-[hsl(var(--status-available-fg))] transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => { setModal({ type: "password", user: c }); setNewPassword(""); }}
                            title="Ganti password"
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {c.profile_status === "suspended" ? (
                            <button
                              onClick={() => setModal({ type: "activate", user: c })}
                              title="Aktifkan kembali"
                              className="p-1.5 rounded-lg hover:bg-[hsl(var(--status-available-bg))] text-muted-foreground hover:text-[hsl(var(--status-available-fg))] transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setModal({ type: "suspend", user: c })}
                              title="Nonaktifkan"
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <p className="text-xs text-muted-foreground">{filtered.length} dari {customers.length} customer</p>
            </div>
          </div>
        )}

        {/* Detail Drawer */}
        {modal?.type === "detail" && (
          <DetailDrawer
            user={modal.user}
            onClose={() => setModal(null)}
            onVerify={() => setModal({ type: "verify", user: modal.user })}
            onChangeEmail={() => { setModal({ type: "email", user: modal.user }); setNewEmail(modal.user.email); }}
            onChangePassword={() => { setModal({ type: "password", user: modal.user }); setNewPassword(""); }}
            onSuspend={() => setModal({ type: "suspend", user: modal.user })}
            onActivate={() => setModal({ type: "activate", user: modal.user })}
            onDelete={() => setModal({ type: "delete", user: modal.user })}
          />
        )}

        {/* Verify email modal */}
        {modal?.type === "verify" && (
          <ConfirmModal
            title="Verifikasi Email?"
            description={`Email ${modal.user.email} akan diverifikasi secara manual tanpa melalui email verification. Akun akan langsung aktif.`}
            confirmLabel="Verifikasi Sekarang"
            variant="default"
            icon={<ShieldCheck className="w-5 h-5 text-[hsl(var(--status-available-fg))]" />}
            loading={processing}
            onConfirm={() => handleVerifyEmail(modal.user)}
            onClose={() => setModal(null)}
          />
        )}

        {/* Update email modal */}
        {modal?.type === "email" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40" onClick={() => !processing && setModal(null)} />
            <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Ubah Email</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{modal.user.full_name ?? modal.user.email}</p>
                </div>
                <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Email Baru</label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" className="h-9 text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setModal(null)} disabled={processing}>Batal</Button>
                <Button className="flex-1 h-9 text-sm gap-1.5" onClick={() => handleUpdateEmail(modal.user)} disabled={processing || !newEmail.trim()}>
                  {processing ? <div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Update password modal */}
        {modal?.type === "password" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40" onClick={() => !processing && setModal(null)} />
            <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Ganti Password</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{modal.user.full_name ?? modal.user.email}</p>
                </div>
                <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Password Baru</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter" className="h-9 text-sm" />
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[hsl(var(--status-reserved-bg))] border border-[hsl(var(--status-reserved))]/20">
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--status-reserved-fg))] shrink-0 mt-0.5" />
                <p className="text-xs text-[hsl(var(--status-reserved-fg))]">Password akan langsung berubah tanpa notifikasi ke customer.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setModal(null)} disabled={processing}>Batal</Button>
                <Button className="flex-1 h-9 text-sm gap-1.5" onClick={() => handleUpdatePassword(modal.user)} disabled={processing || newPassword.length < 8}>
                  {processing ? <div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Suspend modal */}
        {modal?.type === "suspend" && (
          <ConfirmModal
            title="Nonaktifkan Akun?"
            description={`Akun ${modal.user.full_name ?? modal.user.email} tidak akan dapat login hingga diaktifkan kembali.`}
            confirmLabel="Nonaktifkan"
            variant="destructive"
            icon={<Ban className="w-5 h-5 text-destructive" />}
            loading={processing}
            onConfirm={() => handleSuspend(modal.user)}
            onClose={() => setModal(null)}
          />
        )}

        {/* Activate modal */}
        {modal?.type === "activate" && (
          <ConfirmModal
            title="Aktifkan Kembali Akun?"
            description={`Akun ${modal.user.full_name ?? modal.user.email} akan dapat login kembali.`}
            confirmLabel="Aktifkan"
            variant="default"
            icon={<CheckCircle2 className="w-5 h-5 text-[hsl(var(--status-available-fg))]" />}
            loading={processing}
            onConfirm={() => handleActivate(modal.user)}
            onClose={() => setModal(null)}
          />
        )}

        {/* Delete modal */}
        {modal?.type === "delete" && (
          <ConfirmModal
            title="Hapus Akun Permanen?"
            description={`PERINGATAN: Akun ${modal.user.email} akan dihapus secara permanen dan tidak dapat dikembalikan.`}
            confirmLabel="Hapus Permanen"
            variant="destructive"
            icon={<Trash2 className="w-5 h-5 text-destructive" />}
            loading={processing}
            onConfirm={() => handleDelete(modal.user)}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Detail Drawer ──────────────────────────────────────────────────────────
function DetailDrawer({
  user, onClose, onVerify, onChangeEmail, onChangePassword, onSuspend, onActivate, onDelete,
}: {
  user: CustomerUser;
  onClose: () => void;
  onVerify: () => void;
  onChangeEmail: () => void;
  onChangePassword: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Detail Customer</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-lg font-bold flex items-center justify-center shrink-0">
              {(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{user.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground break-all">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "Status", value: <StatusBadge confirmed={user.email_confirmed} profileStatus={user.profile_status} /> },
              { label: "Email Terverifikasi", value: user.email_confirmed ? formatDate(user.email_confirmed_at) : "Belum" },
              { label: "Tanggal Registrasi", value: formatDate(user.created_at) },
              { label: "Login Terakhir", value: formatDate(user.last_sign_in_at) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-sm">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border space-y-2 shrink-0">
          {!user.email_confirmed && user.profile_status !== "suspended" && (
            <Button variant="outline" className="w-full h-9 text-sm gap-2 justify-start" onClick={onVerify}>
              <ShieldCheck className="w-4 h-4" /> Verifikasi Email Manual
            </Button>
          )}
          <Button variant="outline" className="w-full h-9 text-sm gap-2 justify-start" onClick={onChangeEmail}>
            <Mail className="w-4 h-4" /> Ubah Email
          </Button>
          <Button variant="outline" className="w-full h-9 text-sm gap-2 justify-start" onClick={onChangePassword}>
            <KeyRound className="w-4 h-4" /> Ganti Password
          </Button>
          {user.profile_status === "suspended" ? (
            <Button variant="outline" className="w-full h-9 text-sm gap-2 justify-start" onClick={onActivate}>
              <CheckCircle2 className="w-4 h-4" /> Aktifkan Kembali
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full h-9 text-sm gap-2 justify-start text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={onSuspend}
            >
              <Ban className="w-4 h-4" /> Nonaktifkan Akun
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full h-9 text-sm gap-2 justify-start text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" /> Hapus Akun Permanen
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────
function ConfirmModal({
  title, description, confirmLabel, variant, icon, loading = false, onConfirm, onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "destructive";
  icon?: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => !loading && onClose()} />
      <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-9 text-sm" onClick={onClose} disabled={loading}>Batal</Button>
          <Button variant={variant} className="flex-1 h-9 text-sm gap-1.5" onClick={onConfirm} disabled={loading}>
            {loading && <div className="w-3.5 h-3.5 border border-current/30 border-t-current rounded-full animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
