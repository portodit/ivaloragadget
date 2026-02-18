import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoFull from "@/assets/logo-full.svg";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 sm:p-8">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Cek email Anda</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Link reset password telah dikirim. Berlaku selama 1 jam.
            </p>
          </div>
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium hover:underline underline-offset-4">
            <ArrowLeft className="w-4 h-4" /> Kembali ke login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <img src={logoFull} alt="Ivalora Gadget" className="h-7 invert" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Lupa password?</h2>
          <p className="text-sm text-muted-foreground">
            Masukkan email Anda dan kami akan mengirim link reset.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Masukkan alamat email Anda"
              {...register("email")}
              className="h-11"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          {serverError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : "Kirim Link Reset"}
          </Button>
        </form>

        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali ke login
        </Link>
      </div>
    </div>
  );
}
