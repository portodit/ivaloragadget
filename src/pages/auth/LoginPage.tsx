import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import logoFull from "@/assets/logo-full.svg";
import storeFront from "@/assets/store-front.webp";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken, verifyToken } = useRecaptcha();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const state = location.state as { blocked?: boolean; status?: string } | null;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    // reCAPTCHA v3 check
    const rcToken = await getToken("login");
    if (rcToken) {
      const ok = await verifyToken(rcToken, "login");
      if (!ok) {
        setServerError("Verifikasi keamanan gagal. Coba lagi.");
        return;
      }
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setServerError("Email belum diverifikasi. Periksa inbox Anda.");
      } else if (error.message.includes("Invalid login credentials")) {
        setServerError("Email atau password salah.");
      } else {
        setServerError(error.message);
      }
      return;
    }

    if (!authData.user) return;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("status")
      .eq("id", authData.user.id)
      .single();

    const status = profile?.status;
    if (status === "pending") {
      navigate("/waiting-approval", { replace: true });
    } else if (status === "suspended") {
      await supabase.auth.signOut();
      setServerError("Akun Anda telah disuspend. Hubungi administrator.");
    } else if (status === "rejected") {
      await supabase.auth.signOut();
      setServerError("Akun Anda ditolak. Hubungi administrator.");
    } else {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel — photo background ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden">
        {/* Background photo */}
        <img
          src={storeFront}
          alt="Ivalora Gadget Store"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Dark overlay overall — subtle */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Gradient overlay — heavy at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Logo — top left */}
        <div className="absolute top-8 left-8">
          <img src={logoFull} alt="Ivalora Gadget" className="h-6 brightness-0 invert" />
        </div>

        {/* Tagline — bottom left */}
        <div className="absolute bottom-10 left-8 right-8 space-y-2">
          <p className="text-white/60 text-xs uppercase tracking-[0.2em] font-medium">
            Dashboard Admin
          </p>
          <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight">
            Pusat Jual Beli<br />iPhone Surabaya
          </h2>
          <p className="text-white/50 text-sm">
            Kelola penjualan, stok IMEI, dan laporan dalam satu platform.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 lg:px-12 xl:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img src={logoFull} alt="Ivalora Gadget" className="h-7 invert" />
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Masuk ke akun</h1>
            <p className="text-sm text-muted-foreground">
              Gunakan email dan password yang terdaftar
            </p>
          </div>

          {/* Blocked notice */}
          {state?.blocked && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {state.status === "suspended"
                ? "Akun Anda telah disuspend."
                : "Akun Anda ditolak oleh administrator."}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ivalora.com"
                autoComplete="email"
                {...register("email")}
                className="h-11 bg-background"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className="h-11 pr-10 bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 gap-2 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Masuk
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              to="/register"
              className="font-semibold text-foreground hover:underline underline-offset-4"
            >
              Daftar sebagai Admin
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-auto pt-12 text-xs text-muted-foreground/50">
          © 2025 Ivalora Gadget · All rights reserved
        </p>
      </div>
    </div>
  );
}
