import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logoFull from "@/assets/logo-full.svg";

export default function WaitingApprovalPage() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  // Poll status every 10s — redirect to dashboard once approved
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("status")
        .eq("id", user.id)
        .single();
      if (data?.status === "active") {
        // Reload auth context by refreshing session
        await supabase.auth.refreshSession();
        navigate("/admin/dashboard", { replace: true });
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <img src={logoFull} alt="Ivalora Gadget" className="h-7 invert" />
        </div>

        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Menunggu Persetujuan</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              Akun Anda telah terdaftar dan email sudah diverifikasi. Silakan tunggu Super Admin untuk menyetujui akses Anda.
            </p>
          </div>
        </div>

        {user?.email && (
          <div className="rounded-xl border border-border bg-muted/30 px-6 py-4 flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground">{user.email}</span>
          </div>
        )}

        <div className="space-y-3 text-left rounded-xl border border-border p-5">
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Langkah selanjutnya</p>
          {[
            "Email Anda sudah terverifikasi",
            "Akun sedang direview oleh Super Admin",
            "Anda akan mendapat notifikasi via email",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
                {i === 0 ? "✓" : i + 1}
              </div>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full h-11"
          onClick={handleSignOut}
        >
          Keluar dari akun ini
        </Button>
      </div>
    </div>
  );
}

