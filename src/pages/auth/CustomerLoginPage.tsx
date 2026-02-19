import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoFull from "@/assets/logo-full.svg";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type FormData = z.infer<typeof schema>;

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setServerError("Email belum diverifikasi. Periksa inbox Anda dan klik link verifikasi.");
      } else if (error.message.includes("Invalid login credentials")) {
        setServerError("Email atau password salah.");
      } else {
        setServerError(error.message);
      }
      return;
    }

    if (!authData.user) return;

    // Redirect to catalog after login
    navigate("/katalog", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/katalog">
          <img src={logoFull} alt="Ivalora Gadget" className="h-6 invert" />
        </Link>
        <Link to="/katalog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Kembali ke Katalog
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Icon */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Masuk ke akun</h1>
            <p className="text-sm text-muted-foreground">Belanja lebih mudah dengan akun Ivalora</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input id="email" type="email" placeholder="Masukkan email Anda" autoComplete="email" {...register("email")} className="h-11" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Password</Label>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Lupa password?</Link>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Masukkan password" autoComplete="current-password" {...register("password")} className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{serverError}</div>
            )}

            <Button type="submit" className="w-full h-11 gap-2 font-semibold" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (<>Masuk <ArrowRight className="w-4 h-4" /></>)}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link to="/register" className="font-semibold text-foreground hover:underline underline-offset-4">Daftar sekarang</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
