import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Save, KeyRound, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilPage() {
  const { user, role, refreshUserData } = useAuth();
  const { toast } = useToast();

  const fullName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";
  const [name, setName] = useState(fullName);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const displayRole =
    role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "—";

  async function handleSaveProfile() {
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });
      if (authErr) throw authErr;

      const { error: dbErr } = await supabase
        .from("user_profiles")
        .update({ full_name: name.trim() })
        .eq("id", user!.id);
      if (dbErr) throw dbErr;

      await refreshUserData();
      toast({ title: "Profil berhasil diperbarui" });
    } catch (e: unknown) {
      toast({
        title: "Gagal menyimpan profil",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!newPw || !confirmPw) return;
    if (newPw !== confirmPw) {
      toast({ title: "Kata sandi baru tidak cocok", variant: "destructive" });
      return;
    }
    if (newPw.length < 8) {
      toast({ title: "Kata sandi minimal 8 karakter", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast({ title: "Kata sandi berhasil diubah" });
    } catch (e: unknown) {
      toast({
        title: "Gagal mengubah kata sandi",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <DashboardLayout pageTitle="Profil Saya">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {/* Avatar + identity */}
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center text-background text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{displayRole}</span>
              </div>
            </div>
          </div>

          {/* Edit nama */}
          <div className="border-t border-border pt-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4" /> Informasi Akun
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nama Lengkap</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap Anda"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={user?.email ?? ""} disabled className="opacity-60" />
              <p className="text-[11px] text-muted-foreground">Email tidak dapat diubah</p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile || name === fullName}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>

        {/* Password Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-5">
            <KeyRound className="w-4 h-4" /> Ganti Kata Sandi
          </h3>
          <div className="space-y-4">
            {[
              {
                label: "Kata sandi baru",
                value: newPw,
                setter: setNewPw,
                show: showNew,
                toggle: () => setShowNew((v) => !v),
                placeholder: "Masukkan kata sandi baru",
              },
              {
                label: "Konfirmasi kata sandi baru",
                value: confirmPw,
                setter: setConfirmPw,
                show: showConfirm,
                toggle: () => setShowConfirm((v) => !v),
                placeholder: "Ulangi kata sandi baru Anda",
              },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <div className="relative">
                  <Input
                    type={f.show ? "text" : "password"}
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={f.toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Minimal 8 karakter</p>
            <Button
              onClick={handleChangePassword}
              disabled={savingPw || !newPw || !confirmPw}
              variant="outline"
              className="flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {savingPw ? "Memproses..." : "Ganti Kata Sandi"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
