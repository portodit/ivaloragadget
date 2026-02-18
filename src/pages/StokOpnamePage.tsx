import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, RefreshCw, ClipboardList, CheckCircle2,
  Lock, ChevronRight, AlertTriangle, Search, Trash2,
  ArrowLeft, ShieldCheck, X, Info, Layers, ScanLine,
  UserCheck, CalendarClock, Users,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  OpnameSession, OpnameSnapshotItem, OpnameScannedItem,
  SessionType, SessionStatus, SnapshotActionTaken, ScannedActionTaken,
  SESSION_TYPE_LABELS, SESSION_STATUS_LABELS, SESSION_STATUS_STYLES,
  SESSION_TYPE_STYLES, SNAPSHOT_ACTION_LABELS, SCANNED_ACTION_LABELS,
  formatDate, formatDateShort,
} from "@/lib/opname";
import { formatCurrency } from "@/lib/stock-units";
import { cn } from "@/lib/utils";

// ─── Badge components ─────────────────────────────────────────────────────────
function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const s = SESSION_STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", s.bg, s.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {SESSION_STATUS_LABELS[status]}
    </span>
  );
}

function SessionTypeBadge({ type }: { type: SessionType }) {
  const s = SESSION_TYPE_STYLES[type];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", s.bg, s.text)}>
      {SESSION_TYPE_LABELS[type]}
    </span>
  );
}

// ─── View state ────────────────────────────────────────────────────────────────
type View =
  | { type: "list" }
  | { type: "scan"; sessionId: string }
  | { type: "results"; sessionId: string }
  | { type: "detail"; sessionId: string };

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StokOpnamePage() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = role === "super_admin";
  const [view, setView] = useState<View>({ type: "list" });

  if (view.type === "scan") {
    return (
      <ScanView
        sessionId={view.sessionId}
        onBack={() => setView({ type: "list" })}
        onComplete={(sid) => setView({ type: "results", sessionId: sid })}
      />
    );
  }
  if (view.type === "results") {
    return (
      <ResultsView
        sessionId={view.sessionId}
        isSuperAdmin={isSuperAdmin}
        onBack={() => setView({ type: "list" })}
        onLocked={() => setView({ type: "list" })}
      />
    );
  }
  if (view.type === "detail") {
    return (
      <DetailView
        sessionId={view.sessionId}
        isSuperAdmin={isSuperAdmin}
        onBack={() => setView({ type: "list" })}
        onGoToResults={(sid) => setView({ type: "results", sessionId: sid })}
      />
    );
  }

  return (
    <SessionListView
      userId={user?.id}
      isSuperAdmin={isSuperAdmin}
      onStartScan={(sid) => setView({ type: "scan", sessionId: sid })}
      onViewDetail={(sid, status) =>
        status === "draft"
          ? setView({ type: "scan", sessionId: sid })
          : setView({ type: "detail", sessionId: sid })
      }
      toast={toast}
    />
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminProfile { id: string; full_name: string | null; email: string }
interface SessionWithAssignees extends OpnameSession { assignees?: AdminProfile[] }

// ─── SessionListView ──────────────────────────────────────────────────────────
function SessionListView({
  userId, isSuperAdmin, onStartScan, onViewDetail, toast,
}: {
  userId?: string;
  isSuperAdmin: boolean;
  onStartScan: (id: string) => void;
  onViewDetail: (id: string, status: SessionStatus) => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [sessions, setSessions] = useState<SessionWithAssignees[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [expectedCount, setExpectedCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<SessionType>("opening");
  const [newNotes, setNewNotes] = useState("");
  const [adminList, setAdminList] = useState<AdminProfile[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [assignModalSession, setAssignModalSession] = useState<SessionWithAssignees | null>(null);

  const fetchAdmins = useCallback(async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (!roles || roles.length === 0) { setAdminList([]); return; }
    const ids = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", ids)
      .eq("status", "active");
    setAdminList((profiles ?? []) as AdminProfile[]);
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data: sessData } = await supabase
      .from("opname_sessions")
      .select("*")
      .order("started_at", { ascending: false });

    const sessions = (sessData as OpnameSession[]) ?? [];

    // Fetch assignees for each session
    const sessionsWithAssignees: SessionWithAssignees[] = await Promise.all(
      sessions.map(async (s) => {
        const { data: assignments } = await supabase
          .from("opname_session_assignments" as never)
          .select("admin_id")
          .eq("session_id", s.id);
        if (!assignments || (assignments as { admin_id: string }[]).length === 0) return { ...s, assignees: [] };
        const adminIds = (assignments as { admin_id: string }[]).map((a) => a.admin_id);
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name, email")
          .in("id", adminIds);
        return { ...s, assignees: (profiles ?? []) as AdminProfile[] };
      })
    );

    setSessions(sessionsWithAssignees);
    setLoading(false);
  }, []);

  const fetchExpected = useCallback(async () => {
    const { count } = await supabase
      .from("stock_units")
      .select("*", { count: "exact", head: true })
      .in("stock_status", ["available", "reserved"]);
    setExpectedCount(count ?? 0);
  }, []);

  useEffect(() => { fetchSessions(); fetchExpected(); if (isSuperAdmin) fetchAdmins(); }, [fetchSessions, fetchExpected, fetchAdmins, isSuperAdmin]);

  const handleCreateSession = async () => {
    if (!userId) return;
    setCreating(true);

    const { data: sess, error: sessErr } = await supabase
      .from("opname_sessions")
      .insert({ session_type: newType, notes: newNotes || null, created_by: userId, total_expected: expectedCount } as never)
      .select()
      .single();

    if (sessErr || !sess) {
      toast({ title: "Gagal membuat sesi", description: sessErr?.message, variant: "destructive" });
      setCreating(false);
      return;
    }
    const sessionId = (sess as { id: string }).id;

    // Assign selected admins
    if (selectedAdminIds.length > 0) {
      const assignRows = selectedAdminIds.map((adminId) => ({
        session_id: sessionId,
        admin_id: adminId,
        assigned_by: userId,
      }));
      await supabase.from("opname_session_assignments" as never).insert(assignRows as never);
    }

    // Take snapshot
    const { data: units } = await supabase
      .from("stock_units")
      .select("id, imei, stock_status, selling_price, cost_price, master_products(series, storage_gb, color, warranty_type)")
      .in("stock_status", ["available", "reserved"]);

    if (units && units.length > 0) {
      const snapshotRows = (units as never[]).map((u: never) => {
        const unit = u as {
          id: string; imei: string; stock_status: string;
          selling_price: number | null; cost_price: number | null;
          master_products?: { series?: string; storage_gb?: number; color?: string; warranty_type?: string };
        };
        const mp = unit.master_products;
        const label = mp
          ? `${mp.series} ${mp.storage_gb}GB — ${mp.color} (${(mp.warranty_type ?? "").replace(/_/g, " ")})`
          : unit.imei;
        return {
          session_id: sessionId,
          unit_id: unit.id,
          imei: unit.imei,
          product_label: label,
          selling_price: unit.selling_price,
          cost_price: unit.cost_price,
          stock_status: unit.stock_status,
          scan_result: "missing",
        };
      });
      await supabase.from("opname_snapshot_items").insert(snapshotRows as never);
    }

    toast({ title: "Snapshot stok berhasil dibuat.", description: `Sesi ${SESSION_TYPE_LABELS[newType]} dimulai.` });
    setCreating(false);
    setNewSessionOpen(false);
    setNewNotes("");
    setSelectedAdminIds([]);
    onStartScan(sessionId);
  };

  const handleSaveAssignees = async (sessionId: string, adminIds: string[]) => {
    if (!userId) return;
    // Remove existing then re-insert
    await supabase.from("opname_session_assignments" as never).delete().eq("session_id" as never, sessionId);
    if (adminIds.length > 0) {
      const rows = adminIds.map((aid) => ({ session_id: sessionId, admin_id: aid, assigned_by: userId }));
      await supabase.from("opname_session_assignments" as never).insert(rows as never);
    }
    toast({ title: "Penugasan admin berhasil disimpan." });
    setAssignModalSession(null);
    fetchSessions();
  };

  const toggleAdminSelect = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  return (
    <DashboardLayout pageTitle="Stok Opname">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Stok Opname</h1>
            <p className="text-xs text-muted-foreground">Lakukan dan pantau verifikasi stok berbasis IMEI secara terstruktur.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => { fetchSessions(); fetchExpected(); }}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            {isSuperAdmin && (
              <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setNewSessionOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Mulai Sesi Baru
              </Button>
            )}
          </div>
        </div>

        {/* Sessions table */}
        {loading ? (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <ClipboardList className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Belum ada sesi stok opname.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isSuperAdmin ? "Mulai sesi pertama untuk memverifikasi stok secara fisik." : "Belum ada sesi yang ditugaskan ke Anda."}
              </p>
            </div>
            {isSuperAdmin && (
              <Button size="sm" className="gap-1.5" onClick={() => setNewSessionOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Mulai Sesi Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Jenis</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Assigned</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Match</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Selisih</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.map((s) => {
                    const selisih = s.total_missing + s.total_unregistered;
                    const isAssignedToMe = s.assignees?.some((a) => a.id === userId);
                    const canScan = isSuperAdmin || isAssignedToMe;
                    return (
                      <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{formatDateShort(s.started_at)}</p>
                          <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(s.started_at))}</p>
                        </td>
                        <td className="px-4 py-3"><SessionTypeBadge type={s.session_type} /></td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {s.assignees && s.assignees.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <div className="flex -space-x-1">
                                {s.assignees.slice(0, 3).map((a) => (
                                  <div key={a.id} title={a.full_name ?? a.email} className="w-6 h-6 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-card">
                                    {(a.full_name ?? a.email).slice(0, 2).toUpperCase()}
                                  </div>
                                ))}
                              </div>
                              {s.assignees.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{s.assignees.length - 3}</span>
                              )}
                              {isSuperAdmin && (
                                <button onClick={() => setAssignModalSession(s)} className="ml-1 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                                  <UserCheck className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground italic">Belum ada</span>
                              {isSuperAdmin && (
                                <button onClick={() => setAssignModalSession(s)} className="ml-1 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                                  <UserCheck className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[hsl(var(--status-available-fg))] font-medium hidden sm:table-cell">{s.total_match}</td>
                        <td className="px-4 py-3">
                          {selisih > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--status-minus-fg))]">
                              <AlertTriangle className="w-3 h-3" /> {selisih}
                            </span>
                          ) : (
                            <span className="text-xs text-[hsl(var(--status-available-fg))]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><SessionStatusBadge status={s.session_status} /></td>
                        <td className="px-4 py-3 text-right">
                          {canScan ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => onViewDetail(s.id, s.session_status)}
                            >
                              {s.session_status === "draft" ? "Lanjut Scan" : "Lihat Detail"}
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Tidak ada akses</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <p className="text-xs text-muted-foreground">{sessions.length} sesi tercatat</p>
            </div>
          </div>
        )}
      </div>

      {/* ── New session modal ── */}
      {newSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setNewSessionOpen(false)} />
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Mulai Sesi Baru</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Snapshot diambil dari unit Available & Reserved saat sesi dimulai.</p>
              </div>
              <button onClick={() => setNewSessionOpen(false)} className="p-1 rounded-lg hover:bg-accent">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="rounded-xl bg-[hsl(var(--status-available-bg))] border border-[hsl(var(--status-available))]/20 px-4 py-3 flex items-center gap-3">
              <Info className="w-4 h-4 text-[hsl(var(--status-available-fg))] shrink-0" />
              <div>
                <p className="text-xs font-medium text-[hsl(var(--status-available-fg))]">Estimasi Unit Expected</p>
                <p className="text-xl font-bold text-foreground">{expectedCount} unit</p>
                <p className="text-[10px] text-muted-foreground">Status: Available + Reserved saat ini</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Jenis Sesi</label>
                <Select value={newType} onValueChange={(v) => setNewType(v as SessionType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opening">Opening</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="adhoc">Ad-Hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin assignment */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Assign Admin (opsional, bisa lebih dari 1)
                </label>
                {adminList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">Belum ada admin aktif.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {adminList.map((admin) => {
                      const checked = selectedAdminIds.includes(admin.id);
                      return (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => toggleAdminSelect(admin.id, selectedAdminIds, setSelectedAdminIds)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm text-left transition-all",
                            checked
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-background text-foreground hover:bg-accent",
                          )}
                        >
                          <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0", checked ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                            {checked && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">{admin.full_name ?? admin.email}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{admin.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Catatan (opsional)</label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Tambahkan catatan sesi…"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setNewSessionOpen(false)}>Batal</Button>
              <Button className="flex-1 h-9 text-sm gap-1.5" onClick={handleCreateSession} disabled={creating}>
                {creating ? <div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Mulai Sesi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign admin modal ── */}
      {assignModalSession && (
        <AssignAdminModal
          session={assignModalSession}
          adminList={adminList}
          onClose={() => setAssignModalSession(null)}
          onSave={(ids) => handleSaveAssignees(assignModalSession.id, ids)}
        />
      )}
    </DashboardLayout>
  );
}

// ─── AssignAdminModal ─────────────────────────────────────────────────────────
function AssignAdminModal({
  session, adminList, onClose, onSave,
}: {
  session: SessionWithAssignees;
  adminList: AdminProfile[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(
    (session.assignees ?? []).map((a) => a.id)
  );
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Assign Admin</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pilih admin yang bertugas untuk sesi ini.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {adminList.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">Belum ada admin aktif di sistem.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {adminList.map((admin) => {
              const checked = selected.includes(admin.id);
              return (
                <button
                  key={admin.id}
                  onClick={() => toggle(admin.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-all",
                    checked ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-accent",
                  )}
                >
                  <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0", checked ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                    {checked && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs truncate">{admin.full_name ?? admin.email}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{admin.email}</p>
                  </div>
                  {checked && <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Batal</Button>
          <Button className="flex-1 h-9 text-sm gap-1.5" disabled={saving} onClick={async () => { setSaving(true); await onSave(selected); setSaving(false); }}>
            {saving ? <div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
            Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}




// ─── ScanView ─────────────────────────────────────────────────────────────────
interface ScannedItemWithScanner extends OpnameScannedItem {
  scanned_by?: string | null;
  scanner_name?: string | null;
}

function ScanView({
  sessionId, onBack, onComplete,
}: {
  sessionId: string;
  onBack: () => void;
  onComplete: (id: string) => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [session, setSession] = useState<OpnameSession | null>(null);
  const [snapshot, setSnapshot] = useState<OpnameSnapshotItem[]>([]);
  const [scanned, setScanned] = useState<ScannedItemWithScanner[]>([]);
  const [scannerNames, setScannerNames] = useState<Record<string, string>>({});
  const [imeiInput, setImeiInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [scanMode, setScanMode] = useState<"single" | "bulk">("single");
  const [scanning, setScanning] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "info" | "warn" | "ok" } | null>(null);
  const [bulkResults, setBulkResults] = useState<{ imei: string; result: "match" | "unregistered" | "duplicate" | "invalid" }[]>([]);

  const fetchAll = useCallback(async () => {
    const [{ data: sess }, { data: snap }, { data: sc }] = await Promise.all([
      supabase.from("opname_sessions").select("*").eq("id", sessionId).single(),
      supabase.from("opname_snapshot_items").select("*").eq("session_id", sessionId),
      supabase.from("opname_scanned_items" as never).select("*").eq("session_id", sessionId).order("scanned_at", { ascending: false }),
    ]);
    setSession(sess as OpnameSession);
    setSnapshot((snap as OpnameSnapshotItem[]) ?? []);
    const scannedData = (sc as ScannedItemWithScanner[]) ?? [];
    setScanned(scannedData);

    // Fetch scanner names from user_profiles
    const scannerIds = [...new Set(scannedData.map((s) => s.scanned_by).filter(Boolean))] as string[];
    if (scannerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", scannerIds);
      if (profiles) {
        const nameMap: Record<string, string> = {};
        for (const p of profiles as { id: string; full_name: string | null; email: string }[]) {
          nameMap[p.id] = p.full_name ?? p.email;
        }
        setScannerNames(nameMap);
      }
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [sessionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Refocus based on current mode
  const refocusInput = useCallback(() => {
    setTimeout(() => {
      if (scanMode === "single") inputRef.current?.focus();
    }, 50);
  }, [scanMode]);

  // Derived stats
  const match = scanned.filter((s) => s.scan_result === "match").length;
  const unregistered = scanned.filter((s) => s.scan_result === "unregistered").length;
  const missing = snapshot.length - match;

  // ── single scan ──────────────────────────────────────────────────────────────
  const handleScan = async () => {
    const imei = imeiInput.trim();
    if (!imei) return;
    if (imei.length < 15) {
      setAlertMsg({ text: "IMEI minimal 15 digit.", type: "warn" });
      return;
    }
    if (scanned.some((s) => s.imei === imei)) {
      setAlertMsg({ text: "IMEI sudah discan dalam sesi ini.", type: "warn" });
      setImeiInput("");
      return;
    }

    setScanning(true);
    const isInSnapshot = snapshot.some((s) => s.imei === imei);
    const scanResult: "match" | "unregistered" = isInSnapshot ? "match" : "unregistered";

    const { error } = await supabase.from("opname_scanned_items" as never).insert({
      session_id: sessionId,
      imei,
      scan_result: scanResult,
      scanned_by: user?.id ?? null,
    } as never);

    if (error) {
      toast({ title: "Gagal menyimpan scan", description: error.message, variant: "destructive" });
      setScanning(false);
      return;
    }

    if (isInSnapshot) {
      await supabase.from("opname_snapshot_items")
        .update({ scan_result: "match" } as never)
        .eq("session_id", sessionId)
        .eq("imei", imei);
    }

    const newScannedCount = scanned.length + 1;
    const newMatch = match + (isInSnapshot ? 1 : 0);
    const newUnregistered = unregistered + (isInSnapshot ? 0 : 1);
    const newMissing = snapshot.length - newMatch;
    await supabase.from("opname_sessions").update({
      total_scanned: newScannedCount,
      total_match: newMatch,
      total_missing: newMissing,
      total_unregistered: newUnregistered,
    } as never).eq("id", sessionId);

    setAlertMsg({ text: isInSnapshot ? "✓ IMEI cocok dengan snapshot." : "⚠ IMEI tidak ada dalam daftar expected.", type: isInSnapshot ? "ok" : "warn" });
    setImeiInput("");
    fetchAll();
    setScanning(false);
    refocusInput();
  };

  // ── bulk scan ─────────────────────────────────────────────────────────────────
  const handleBulkScan = async () => {
    const lines = bulkInput.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    setBulkProcessing(true);
    setBulkResults([]);
    setAlertMsg(null);

    const results: { imei: string; result: "match" | "unregistered" | "duplicate" | "invalid" }[] = [];
    let currentScanned = [...scanned];
    let currentMatch = match;
    let currentUnregistered = unregistered;

    for (const imei of lines) {
      if (imei.length < 15) {
        results.push({ imei, result: "invalid" });
        continue;
      }
      if (currentScanned.some((s) => s.imei === imei)) {
        results.push({ imei, result: "duplicate" });
        continue;
      }
      const isInSnapshot = snapshot.some((s) => s.imei === imei);
      const scanResult: "match" | "unregistered" = isInSnapshot ? "match" : "unregistered";

      const { error } = await supabase.from("opname_scanned_items" as never).insert({
        session_id: sessionId,
        imei,
        scan_result: scanResult,
        scanned_by: user?.id ?? null,
      } as never);

      if (error) continue;

      if (isInSnapshot) {
        await supabase.from("opname_snapshot_items")
          .update({ scan_result: "match" } as never)
          .eq("session_id", sessionId)
          .eq("imei", imei);
        currentMatch++;
      } else {
        currentUnregistered++;
      }

      currentScanned = [...currentScanned, { id: "", session_id: sessionId, imei, scan_result: scanResult, action_taken: null, action_notes: null, scanned_at: new Date().toISOString() }];
      results.push({ imei, result: scanResult });
    }

    const newMissing = snapshot.length - currentMatch;
    await supabase.from("opname_sessions").update({
      total_scanned: currentScanned.length,
      total_match: currentMatch,
      total_missing: newMissing,
      total_unregistered: currentUnregistered,
    } as never).eq("id", sessionId);

    setBulkResults(results);
    setBulkInput("");
    fetchAll();
    setBulkProcessing(false);

    const successCount = results.filter((r) => r.result === "match" || r.result === "unregistered").length;
    toast({
      title: `Bulk scan selesai: ${successCount} dari ${lines.length} IMEI diproses.`,
      description: results.filter((r) => r.result === "duplicate").length > 0 ? `${results.filter((r) => r.result === "duplicate").length} IMEI sudah ada (dilewati).` : undefined,
    });
  };

  const handleDeleteScan = async (id: string) => {
    const item = scanned.find((s) => s.id === id);
    if (!item) return;
    await supabase.from("opname_scanned_items").delete().eq("id", id);
    if (item.scan_result === "match") {
      await supabase.from("opname_snapshot_items")
        .update({ scan_result: "missing" } as never)
        .eq("session_id", sessionId)
        .eq("imei", item.imei);
    }
    fetchAll();
  };

  const handleComplete = async () => {
    setCompleting(true);
    const { error } = await supabase.from("opname_sessions").update({
      session_status: "completed",
      completed_at: new Date().toISOString(),
    } as never).eq("id", sessionId);
    setCompleting(false);
    if (error) {
      toast({ title: "Gagal menyelesaikan sesi", description: error.message, variant: "destructive" });
      return;
    }

    // Fire email notification to super admins
    try {
      await supabase.functions.invoke("opname-notify", {
        body: { sessionId, completedBy: user?.id },
      });
    } catch (e) {
      console.warn("Email notification failed (non-critical):", e);
    }

    toast({
      title: "Sesi berhasil diselesaikan.",
      description: "Laporan dikirim ke Super Admin via email.",
    });
    onComplete(sessionId);
  };

  if (!session) {
    return (
      <DashboardLayout pageTitle="Stok Opname – Scan">
        <div className="p-8 text-center"><div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin mx-auto" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Stok Opname – Scan">
      <div className="space-y-4">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground">Sesi Aktif – {SESSION_TYPE_LABELS[session.session_type]}</h1>
              <SessionStatusBadge status={session.session_status} />
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(session.started_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left: Scan panel ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* IMEI input */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              {/* Mode toggle header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Input IMEI</p>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted border border-border">
                  <button
                    onClick={() => { setScanMode("single"); setBulkResults([]); setAlertMsg(null); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                      scanMode === "single"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ScanLine className="w-3 h-3" />
                    Satu per Satu
                  </button>
                  <button
                    onClick={() => { setScanMode("bulk"); setAlertMsg(null); setTimeout(() => textareaRef.current?.focus(), 50); }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                      scanMode === "bulk"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Layers className="w-3 h-3" />
                    Bulk Scan
                  </button>
                </div>
              </div>

              {/* ── Single mode ── */}
              {scanMode === "single" && (
                <>
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={imeiInput}
                      onChange={(e) => { setImeiInput(e.target.value); setAlertMsg(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleScan()}
                      placeholder="Scan atau masukkan IMEI…"
                      className="h-10 text-sm font-mono"
                      disabled={scanning}
                      autoFocus
                    />
                    <Button className="h-10 px-4 text-sm" onClick={handleScan} disabled={scanning || !imeiInput.trim()}>
                      {scanning ? <div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Scan"}
                    </Button>
                  </div>
                  {alertMsg && (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
                      alertMsg.type === "ok" && "bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))]",
                      alertMsg.type === "warn" && "bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]",
                      alertMsg.type === "info" && "bg-muted text-muted-foreground",
                    )}>
                      {alertMsg.type === "ok" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                      {alertMsg.text}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">Tekan Enter atau klik Scan setelah setiap IMEI. Data tersimpan otomatis.</p>
                </>
              )}

              {/* ── Bulk mode ── */}
              {scanMode === "bulk" && (
                <>
                  <Textarea
                    ref={textareaRef}
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={"Scan semua IMEI di sini — setiap scan akan menambah baris baru.\nSetelah selesai, klik tombol Proses Semua."}
                    className="text-sm font-mono min-h-[140px] resize-y leading-relaxed"
                    disabled={bulkProcessing}
                    autoFocus
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] text-muted-foreground">
                      {bulkInput.split("\n").filter((l) => l.trim()).length} IMEI siap diproses. Enter = baris baru, scan akan otomatis menambah baris.
                    </p>
                    <Button
                      className="h-9 px-4 text-sm shrink-0 gap-1.5"
                      onClick={handleBulkScan}
                      disabled={bulkProcessing || !bulkInput.trim()}
                    >
                      {bulkProcessing
                        ? <><div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Memproses…</>
                        : <><Layers className="w-3.5 h-3.5" />Proses Semua</>
                      }
                    </Button>
                  </div>

                  {/* Bulk results summary */}
                  {bulkResults.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hasil Proses Terakhir</p>
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {bulkResults.map((r, i) => (
                          <div key={i} className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono",
                            r.result === "match" && "bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))]",
                            r.result === "unregistered" && "bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]",
                            r.result === "duplicate" && "bg-muted text-muted-foreground",
                            r.result === "invalid" && "bg-muted text-muted-foreground",
                          )}>
                            <span className="shrink-0">
                              {r.result === "match" && "✓"}
                              {r.result === "unregistered" && "⚠"}
                              {r.result === "duplicate" && "↩"}
                              {r.result === "invalid" && "✗"}
                            </span>
                            <span className="flex-1 truncate">{r.imei}</span>
                            <span className="text-[10px] font-sans shrink-0">
                              {r.result === "match" && "Match"}
                              {r.result === "unregistered" && "Unregistered"}
                              {r.result === "duplicate" && "Sudah ada"}
                              {r.result === "invalid" && "IMEI tidak valid"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>


            {/* Scanned list */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hasil Scan ({scanned.length})</p>
              </div>
              {scanned.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Belum ada IMEI yang discan.</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-80 overflow-y-auto">
                  {scanned.map((s) => {
                    const scannerName = s.scanned_by ? (scannerNames[s.scanned_by] ?? "Admin") : null;
                    return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.scan_result === "match" ? "bg-[hsl(var(--status-available))]" : "bg-[hsl(var(--status-minus))]")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-foreground">{s.imei}</p>
                        {scannerName && (
                          <p className="text-[10px] text-muted-foreground truncate">oleh {scannerName}</p>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
                        s.scan_result === "match" ? "bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))]" : "bg-[hsl(var(--status-minus-bg))] text-[hsl(var(--status-minus-fg))]",
                      )}>
                        {s.scan_result === "match" ? "Cocok" : "Tidak Terdaftar"}
                      </span>
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block">
                        {new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(s.scanned_at))}
                      </p>
                      <button onClick={() => handleDeleteScan(s.id)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Summary ── */}
          <div className="space-y-3">
            {/* Stats */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ringkasan Real-Time</p>
              <div className="space-y-2">
                <SummaryRow label="Expected" value={snapshot.length} color="text-foreground" />
                <SummaryRow label="Discan" value={scanned.length} color="text-foreground" />
                <div className="border-t border-border pt-2 space-y-2">
                  <SummaryRow label="Match" value={match} color="text-[hsl(var(--status-available-fg))]" />
                  <SummaryRow label="Missing" value={missing} color={missing > 0 ? "text-[hsl(var(--status-minus-fg))]" : "text-foreground"} />
                  <SummaryRow label="Unregistered" value={unregistered} color={unregistered > 0 ? "text-[hsl(var(--status-coming-soon-fg))]" : "text-foreground"} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Perbandingan diperbarui secara otomatis berdasarkan hasil scan.</p>
            </div>

            {/* Complete button */}
            <Button
              className="w-full h-10 gap-2 text-sm"
              onClick={handleComplete}
              disabled={completing || scanned.length === 0}
            >
              {completing ? (
                <div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Selesaikan Sesi
            </Button>
            {scanned.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center">Scan minimal 1 IMEI untuk dapat menyelesaikan sesi.</p>
            )}
            {missing > 0 && (
              <div className="rounded-xl bg-[hsl(var(--status-minus-bg))] border border-[hsl(var(--status-minus))]/20 px-3 py-2.5">
                <p className="text-xs font-medium text-[hsl(var(--status-minus-fg))] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Terdapat {missing} unit missing. Selisih perlu ditinjau sebelum sesi disetujui.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold", color)}>{value}</p>
    </div>
  );
}

// ─── ResultsView ──────────────────────────────────────────────────────────────
function ResultsView({
  sessionId, isSuperAdmin, onBack, onLocked,
}: {
  sessionId: string;
  isSuperAdmin: boolean;
  onBack: () => void;
  onLocked: () => void;
}) {
  const { toast } = useToast();
  const [session, setSession] = useState<OpnameSession | null>(null);
  const [snapshot, setSnapshot] = useState<OpnameSnapshotItem[]>([]);
  const [scanned, setScanned] = useState<OpnameScannedItem[]>([]);
  const [tab, setTab] = useState<"match" | "missing" | "unregistered">("match");
  const [actions, setActions] = useState<Record<string, { action: string; notes: string; ref: string }>>({});
  const [locking, setLocking] = useState(false);
  const { user } = useAuth();

  const fetchAll = useCallback(async () => {
    const [{ data: sess }, { data: snap }, { data: sc }] = await Promise.all([
      supabase.from("opname_sessions").select("*").eq("id", sessionId).single(),
      supabase.from("opname_snapshot_items").select("*").eq("session_id", sessionId),
      supabase.from("opname_scanned_items").select("*").eq("session_id", sessionId),
    ]);
    setSession(sess as OpnameSession);
    setSnapshot((snap as OpnameSnapshotItem[]) ?? []);
    setScanned((sc as OpnameScannedItem[]) ?? []);
  }, [sessionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const matchItems = snapshot.filter((s) => s.scan_result === "match");
  const missingItems = snapshot.filter((s) => s.scan_result === "missing");
  const unregisteredItems = scanned.filter((s) => s.scan_result === "unregistered");

  const allMissingActioned = missingItems.every(
    (item) => actions[item.id]?.action || item.action_taken
  );
  const allUnregisteredActioned = unregisteredItems.every(
    (item) => actions[item.id]?.action || item.action_taken
  );
  const canLock = isSuperAdmin && allMissingActioned && allUnregisteredActioned;

  const saveSnapshotAction = async (itemId: string, action: SnapshotActionTaken, notes: string, ref: string) => {
    await supabase.from("opname_snapshot_items").update({
      action_taken: action,
      action_notes: notes || null,
      sold_reference_id: (action === "sold_pos" || action === "sold_ecommerce" || action === "sold_manual") ? ref : null,
    } as never).eq("id", itemId);
    fetchAll();
  };

  const saveScannedAction = async (itemId: string, action: ScannedActionTaken, notes: string) => {
    await supabase.from("opname_scanned_items").update({
      action_taken: action,
      action_notes: notes || null,
    } as never).eq("id", itemId);
    fetchAll();
  };

  const handleLock = async () => {
    setLocking(true);
    // Save all pending actions first
    for (const [id, act] of Object.entries(actions)) {
      const snapItem = snapshot.find((s) => s.id === id);
      const scanItem = scanned.find((s) => s.id === id);
      if (snapItem) await saveSnapshotAction(id, act.action as SnapshotActionTaken, act.notes, act.ref);
      if (scanItem) await saveScannedAction(id, act.action as ScannedActionTaken, act.notes);
    }
    const { error } = await supabase.from("opname_sessions").update({
      session_status: "locked",
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
    } as never).eq("id", sessionId);
    setLocking(false);
    if (error) { toast({ title: "Gagal mengunci sesi", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sesi berhasil dikunci." });
    onLocked();
  };

  if (!session) return (
    <DashboardLayout pageTitle="Stok Opname – Hasil">
      <div className="p-8 text-center"><div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin mx-auto" /></div>
    </DashboardLayout>
  );

  const isLocked = session.session_status === "locked";

  return (
    <DashboardLayout pageTitle="Stok Opname – Hasil Sesi">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-foreground">Hasil Sesi – {SESSION_TYPE_LABELS[session.session_type]}</h1>
              <SessionStatusBadge status={session.session_status} />
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(session.started_at)}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Expected", val: session.total_expected, color: "text-foreground" },
            { label: "Discan", val: session.total_scanned, color: "text-foreground" },
            { label: "Match", val: matchItems.length, color: "text-[hsl(var(--status-available-fg))]" },
            { label: "Missing", val: missingItems.length, color: missingItems.length > 0 ? "text-[hsl(var(--status-minus-fg))]" : "text-foreground" },
            { label: "Unregistered", val: unregisteredItems.length, color: unregisteredItems.length > 0 ? "text-[hsl(var(--status-coming-soon-fg))]" : "text-foreground" },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl border border-border p-3 text-center">
              <p className={cn("text-2xl font-bold", item.color)}>{item.val}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex border-b border-border">
            {([
              { key: "match", label: `Match (${matchItems.length})` },
              { key: "missing", label: `Missing (${missingItems.length})` },
              { key: "unregistered", label: `Unregistered (${unregisteredItems.length})` },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-1 px-4 py-3 text-xs font-medium transition-colors",
                  tab === t.key
                    ? "text-foreground border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {/* Match tab */}
            {tab === "match" && (
              matchItems.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-4">Tidak ada unit yang cocok.</p>
                : matchItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--status-available-bg))] border border-[hsl(var(--status-available))]/20">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--status-available-fg))] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-foreground">{item.imei}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.product_label}</p>
                    </div>
                  </div>
                ))
            )}

            {/* Missing tab */}
            {tab === "missing" && (
              missingItems.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-4">Tidak ada unit missing. Semua unit ditemukan.</p>
                : missingItems.map((item) => {
                  const local = actions[item.id] ?? { action: item.action_taken ?? "", notes: item.action_notes ?? "", ref: item.sold_reference_id ?? "" };
                  const isSold = local.action === "sold_pos" || local.action === "sold_ecommerce" || local.action === "sold_manual";
                  return (
                    <div key={item.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[hsl(var(--status-minus-fg))] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-foreground">{item.imei}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.product_label}</p>
                        </div>
                        {item.selling_price && <p className="text-xs font-semibold text-foreground whitespace-nowrap">{formatCurrency(item.selling_price)}</p>}
                      </div>
                      {!isLocked && (
                        <div className="space-y-1.5">
                          <Select
                            value={local.action}
                            onValueChange={(v) => {
                              const updated = { ...local, action: v };
                              setActions((prev) => ({ ...prev, [item.id]: updated }));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Pilih tindakan…" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SNAPSHOT_ACTION_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isSold && (
                            <Input
                              placeholder="No. Referensi transaksi…"
                              className="h-8 text-xs"
                              value={local.ref}
                              onChange={(e) => setActions((prev) => ({ ...prev, [item.id]: { ...local, ref: e.target.value } }))}
                            />
                          )}
                          <Input
                            placeholder="Catatan tindakan (opsional)…"
                            className="h-8 text-xs"
                            value={local.notes}
                            onChange={(e) => setActions((prev) => ({ ...prev, [item.id]: { ...local, notes: e.target.value } }))}
                          />
                          {local.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => saveSnapshotAction(item.id, local.action as SnapshotActionTaken, local.notes, local.ref)}
                            >
                              Simpan Tindakan
                            </Button>
                          )}
                        </div>
                      )}
                      {item.action_taken && (
                        <p className="text-[10px] font-medium text-[hsl(var(--status-available-fg))]">
                          ✓ {SNAPSHOT_ACTION_LABELS[item.action_taken]}
                        </p>
                      )}
                    </div>
                  );
                })
            )}

            {/* Unregistered tab */}
            {tab === "unregistered" && (
              unregisteredItems.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-4">Tidak ada IMEI yang tidak terdaftar.</p>
                : unregisteredItems.map((item) => {
                  const local = actions[item.id] ?? { action: item.action_taken ?? "", notes: item.action_notes ?? "", ref: "" };
                  return (
                    <div key={item.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[hsl(var(--status-coming-soon-fg))] shrink-0" />
                        <p className="text-xs font-mono text-foreground">{item.imei}</p>
                        <span className="text-[10px] bg-[hsl(var(--status-coming-soon-bg))] text-[hsl(var(--status-coming-soon-fg))] px-1.5 py-0.5 rounded font-medium">Tidak Terdaftar</span>
                      </div>
                      {!isLocked && (
                        <div className="space-y-1.5">
                          <Select
                            value={local.action}
                            onValueChange={(v) => setActions((prev) => ({ ...prev, [item.id]: { ...local, action: v } }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Pilih tindakan…" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SCANNED_ACTION_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Catatan (opsional)…"
                            className="h-8 text-xs"
                            value={local.notes}
                            onChange={(e) => setActions((prev) => ({ ...prev, [item.id]: { ...local, notes: e.target.value } }))}
                          />
                          {local.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => saveScannedAction(item.id, local.action as ScannedActionTaken, local.notes)}
                            >
                              Simpan Tindakan
                            </Button>
                          )}
                        </div>
                      )}
                      {item.action_taken && (
                        <p className="text-[10px] font-medium text-[hsl(var(--status-available-fg))]">
                          ✓ {SCANNED_ACTION_LABELS[item.action_taken]}
                        </p>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Lock button (super admin) */}
        {isSuperAdmin && !isLocked && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Kunci Sesi (Super Admin)
            </p>
            {!canLock && (missingItems.length > 0 || unregisteredItems.length > 0) && (
              <div className="rounded-lg bg-[hsl(var(--status-minus-bg))] border border-[hsl(var(--status-minus))]/20 px-3 py-2">
                <p className="text-xs text-[hsl(var(--status-minus-fg))]">
                  Tindakan wajib dipilih untuk setiap unit selisih sebelum sesi dapat dikunci.
                </p>
              </div>
            )}
            <Button
              className="w-full h-10 gap-2"
              onClick={handleLock}
              disabled={!canLock || locking}
            >
              {locking ? (
                <div className="w-3.5 h-3.5 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Kunci Sesi
            </Button>
            <p className="text-[10px] text-muted-foreground">Sesi yang telah dikunci tidak dapat diubah kecuali oleh Super Admin.</p>
          </div>
        )}

        {isLocked && (
          <div className="rounded-xl bg-muted border border-border px-4 py-3 flex items-center gap-3">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Sesi telah dikunci.</p>
              <p className="text-[10px] text-muted-foreground">Data tidak dapat diubah. Terkunci {formatDate(session.locked_at)}.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── DetailView ───────────────────────────────────────────────────────────────
function DetailView({
  sessionId, isSuperAdmin, onBack, onGoToResults,
}: {
  sessionId: string;
  isSuperAdmin: boolean;
  onBack: () => void;
  onGoToResults: (id: string) => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [session, setSession] = useState<OpnameSession | null>(null);
  const [assignees, setAssignees] = useState<AdminProfile[]>([]);
  const [adminList, setAdminList] = useState<AdminProfile[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItemWithScanner[]>([]);
  const [scannerNames, setScannerNames] = useState<Record<string, string>>({});

  const fetchDetail = useCallback(async () => {
    const [{ data: sess }, { data: assignments }, { data: sc }] = await Promise.all([
      supabase.from("opname_sessions").select("*").eq("id", sessionId).single(),
      supabase.from("opname_session_assignments" as never).select("admin_id").eq("session_id", sessionId),
      supabase.from("opname_scanned_items" as never).select("*").eq("session_id", sessionId).order("scanned_at", { ascending: false }),
    ]);
    setSession(sess as OpnameSession);

    const scannedData = (sc as ScannedItemWithScanner[]) ?? [];
    setScannedItems(scannedData);

    // Fetch assignee profiles
    const assigneeIds = ((assignments as { admin_id: string }[]) ?? []).map((a) => a.admin_id);
    if (assigneeIds.length > 0) {
      const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", assigneeIds);
      setAssignees((profiles ?? []) as AdminProfile[]);
    } else {
      setAssignees([]);
    }

    // Fetch scanner names
    const scannerIds = [...new Set(scannedData.map((s) => s.scanned_by).filter(Boolean))] as string[];
    if (scannerIds.length > 0) {
      const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", scannerIds);
      if (profiles) {
        const nameMap: Record<string, string> = {};
        for (const p of profiles as { id: string; full_name: string | null; email: string }[]) {
          nameMap[p.id] = p.full_name ?? p.email;
        }
        setScannerNames(nameMap);
      }
    }
  }, [sessionId]);

  const fetchAdmins = useCallback(async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (!roles || roles.length === 0) { setAdminList([]); return; }
    const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", roles.map((r) => r.user_id)).eq("status", "active");
    setAdminList((profiles ?? []) as AdminProfile[]);
  }, []);

  useEffect(() => {
    fetchDetail();
    if (isSuperAdmin) fetchAdmins();
  }, [fetchDetail, fetchAdmins, isSuperAdmin]);

  const handleSaveAssignees = async (ids: string[]) => {
    if (!user) return;
    await supabase.from("opname_session_assignments" as never).delete().eq("session_id" as never, sessionId);
    if (ids.length > 0) {
      const rows = ids.map((aid) => ({ session_id: sessionId, admin_id: aid, assigned_by: user.id }));
      await supabase.from("opname_session_assignments" as never).insert(rows as never);
    }
    toast({ title: "Penugasan admin berhasil disimpan." });
    setShowAssignModal(false);
    fetchDetail();
  };

  if (!session) return (
    <DashboardLayout pageTitle="Detail Sesi">
      <div className="p-8 text-center"><div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin mx-auto" /></div>
    </DashboardLayout>
  );

  // Breakdown by scanner
  const scannerBreakdown: Record<string, { name: string; count: number; match: number }> = {};
  for (const item of scannedItems) {
    const key = item.scanned_by ?? "__unknown";
    const name = item.scanned_by ? (scannerNames[item.scanned_by] ?? "Admin") : "Tidak diketahui";
    if (!scannerBreakdown[key]) scannerBreakdown[key] = { name, count: 0, match: 0 };
    scannerBreakdown[key].count++;
    if (item.scan_result === "match") scannerBreakdown[key].match++;
  }
  const scannerEntries = Object.values(scannerBreakdown);

  return (
    <DashboardLayout pageTitle="Detail Sesi Opname">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-foreground">Detail Sesi – {SESSION_TYPE_LABELS[session.session_type]}</h1>
              <SessionStatusBadge status={session.session_status} />
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(session.started_at)}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoCard label="Expected" value={session.total_expected.toString()} />
          <InfoCard label="Discan" value={session.total_scanned.toString()} />
          <InfoCard label="Cocok" value={session.total_match.toString()} />
          <InfoCard label="Missing" value={session.total_missing.toString()} />
          <InfoCard label="Tidak Terdaftar" value={session.total_unregistered.toString()} />
          <InfoCard label="Dimulai" value={formatDateShort(session.started_at)} />
        </div>

        {/* ── Admin yang ditugaskan ── */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Admin yang Ditugaskan
            </p>
            {isSuperAdmin && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-1 text-xs text-foreground hover:underline font-medium"
              >
                <UserCheck className="w-3 h-3" />
                {assignees.length === 0 ? "Assign Admin" : "Ubah Penugasan"}
              </button>
            )}
          </div>

          {assignees.length === 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--status-minus-bg))] border border-[hsl(var(--status-minus))]/20">
              <AlertTriangle className="w-4 h-4 text-[hsl(var(--status-minus-fg))] shrink-0" />
              <div>
                <p className="text-xs font-medium text-[hsl(var(--status-minus-fg))]">Sesi ini belum memiliki admin yang ditugaskan.</p>
                {isSuperAdmin && <p className="text-[10px] text-muted-foreground mt-0.5">Klik "Assign Admin" untuk menambahkan penugasan.</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className="w-7 h-7 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {(a.full_name ?? a.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{a.full_name ?? a.email}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                  </div>
                  <UserCheck className="w-3.5 h-3.5 text-[hsl(var(--status-available-fg))] shrink-0 ml-auto" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Breakdown scanner ── */}
        {scannerEntries.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5" /> Rekap Scan per Admin
            </p>
            <div className="space-y-2">
              {scannerEntries.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className="w-7 h-7 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0">
                    {entry.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{entry.name}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.count} scan · {entry.match} cocok</p>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {session.notes && (
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Catatan Sesi</p>
            <p className="text-sm text-foreground">{session.notes}</p>
          </div>
        )}

        {/* Audit trail */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> Jejak Sesi
          </p>
          <AuditRow label="Sesi dimulai" date={session.started_at} />
          {session.completed_at && <AuditRow label="Sesi diselesaikan" date={session.completed_at} />}
          {session.approved_at && <AuditRow label="Sesi disetujui & dikunci" date={session.approved_at} />}
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={() => onGoToResults(session.id)}>
          <ChevronRight className="w-4 h-4" />
          Lihat Detail Hasil & Tindakan
        </Button>
      </div>

      {/* Assign modal */}
      {showAssignModal && (
        <AssignAdminModal
          session={{ ...session, assignees }}
          adminList={adminList}
          onClose={() => setShowAssignModal(false)}
          onSave={handleSaveAssignees}
        />
      )}
    </DashboardLayout>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function AuditRow({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[hsl(var(--status-available))] shrink-0" />
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{formatDate(date)}</p>
      </div>
    </div>
  );
}
