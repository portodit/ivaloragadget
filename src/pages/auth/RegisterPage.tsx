import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import logoFull from "@/assets/logo-full.svg";
import storeFront from "@/assets/ruko.jpg";

const schema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().email("Email tidak valid").max(255),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Harus mengandung huruf kapital")
    .regex(/[0-9]/, "Harus mengandung angka"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Password tidak cocok",
  path: ["confirm_password"],
});

type FormData = z.infer<typeof schema>;

const steps = [
  "Verifikasi email",
  "Review oleh Super Admin",
  "Akses penuh dashboard",
];

export default function RegisterPage() {
  const { getToken, verifyToken } = useRecaptcha();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    // reCAPTCHA v3 check
    const rcToken = await getToken("register");
    if (rcToken) {
      const ok = await verifyToken(rcToken, "register");
      if (!ok) {
        setServerError("Verifikasi keamanan gagal. Coba lagi.");
        return;
      }
    }

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: data.full_name },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setServerError("Email ini sudah terdaftar.");
      } else {
        setServerError(error.message);
      }
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="auth-page min-h-screen flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-background" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Cek email Anda</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Link verifikasi telah dikirim ke email Anda. Klik link tersebut, lalu tunggu persetujuan Super Admin.
            </p>
          </div>
          <Link to="/login" className="block text-sm font-semibold text-foreground hover:underline underline-offset-4">
            Kembali ke halaman login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen flex bg-background">
      {/* ── Left panel — photo background ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden">
        <img
          src={storeFront}
          alt="Ivalora Gadget Store"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Logo */}
        <div className="absolute top-8 left-8">
          <img src={logoFull} alt="Ivalora Gadget" className="h-6 brightness-0 invert" />
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-10 left-8 right-8 space-y-5">
          <div className="space-y-2">
            <p className="text-white/60 text-xs uppercase tracking-[0.2em] font-medium">
              Registrasi Admin
            </p>
            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight">
              Pusat Jual Beli<br />iPhone Surabaya
            </h2>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-white/50 font-semibold">{i + 1}</span>
                </div>
                <span className="text-white/60 text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col min-h-screen px-6 py-10 sm:px-8 lg:px-12 xl:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden flex justify-center mb-6">
          <img src={logoFull} alt="Ivalora Gadget" className="h-7 invert" />
        </div>

        {/* Vertically centered form */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm space-y-7">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Buat akun Admin</h1>
              <p className="text-sm text-muted-foreground">Isi data di bawah untuk mendaftar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Nama Lengkap
                </Label>
                <Input
                  id="full_name"
                  placeholder="Ahmad Fauzi"
                  {...register("full_name")}
                  className="h-11 bg-background"
                />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ivalora.com"
                  {...register("email")}
                  className="h-11 bg-background"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 karakter, 1 kapital, 1 angka"
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
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Konfirmasi Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Ulangi password"
                    {...register("confirm_password")}
                    className="h-11 pr-10 bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
                )}
              </div>

              {serverError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 gap-2 font-semibold mt-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Daftar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground">
              Sudah punya akun?{" "}
              <Link
                to="/login"
                className="font-semibold text-foreground hover:underline underline-offset-4"
              >
                Masuk
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="pt-8 text-center text-xs text-muted-foreground/50">
          © 2025 Ivalora Gadget · All rights reserved
        </p>
      </div>
    </div>
  );
}
