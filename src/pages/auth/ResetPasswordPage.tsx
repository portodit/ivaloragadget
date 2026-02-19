import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { useLocale } from "@/contexts/LocaleContext";
import logoFull from "@/assets/logo-full.svg";

const schema = z.object({
  password: z
    .string()
    .min(8, "Password min. 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { lang } = useLocale();
  const [isRecovery, setIsRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setIsRecovery(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) { setServerError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate("/login"), 2000);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm w-full text-center space-y-4">
            <h2 className="text-xl font-bold">{lang === "en" ? "Invalid link" : "Link tidak valid"}</h2>
            <p className="text-sm text-muted-foreground">{lang === "en" ? "This reset link is invalid or expired." : "Link reset password tidak valid atau sudah kadaluarsa."}</p>
            <Link to="/forgot-password" className="text-sm font-medium hover:underline underline-offset-4">
              {lang === "en" ? "Request a new link" : "Minta link baru"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{lang === "en" ? "Password updated" : "Password diperbarui"}</h2>
              <p className="text-sm text-muted-foreground">{lang === "en" ? "Redirecting to login..." : "Mengalihkan ke halaman login..."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center">
            <img src={logoFull} alt="Ivalora Gadget" className="h-7 invert" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{lang === "en" ? "Create new password" : "Buat password baru"}</h2>
            <p className="text-sm text-muted-foreground">{lang === "en" ? "Enter your new password below" : "Masukkan password baru Anda di bawah ini"}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {lang === "en" ? "New Password" : "Password Baru"}
              </Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder={lang === "en" ? "Min. 8 chars, 1 uppercase, 1 number" : "Min. 8 karakter, 1 kapital, 1 angka"} {...register("password")} className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {lang === "en" ? "Confirm Password" : "Konfirmasi Password"}
              </Label>
              <div className="relative">
                <Input id="confirm" type={showConfirm ? "text" : "password"} placeholder={lang === "en" ? "Repeat new password" : "Ulangi password baru"} {...register("confirm")} className="h-11 pr-10" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{serverError}</div>
            )}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (lang === "en" ? "Save New Password" : "Simpan Password Baru")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
