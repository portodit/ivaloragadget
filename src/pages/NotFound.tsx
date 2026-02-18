import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.svg";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Detect common error codes from path (e.g. /403, /500, etc.)
  const pathSegment = location.pathname.replace("/", "");
  const knownCodes: Record<string, { title: string; message: string }> = {
    "403": {
      title: "403 — Akses Ditolak",
      message: "Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi administrator jika Anda merasa ini keliru.",
    },
    "500": {
      title: "500 — Kesalahan Server",
      message: "Terjadi kesalahan pada server kami. Tim kami telah diberi notifikasi. Silakan coba kembali dalam beberapa saat.",
    },
    "503": {
      title: "503 — Layanan Tidak Tersedia",
      message: "Server sedang dalam pemeliharaan atau mengalami kelebihan beban. Silakan coba beberapa saat lagi.",
    },
  };

  const errorInfo = knownCodes[pathSegment] ?? {
    title: "404 — Halaman Tidak Ditemukan",
    message:
      "Halaman yang Anda cari tidak tersedia. Mungkin sudah dipindahkan, dihapus, atau URL yang dimasukkan tidak valid.",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      {/* Logo */}
      <div className="mb-12">
        <img
          src={logoHorizontal}
          alt="Ivalora Gadget"
          className="h-8 sm:h-9 object-contain invert dark:invert-0"
        />
      </div>

      {/* Error block */}
      <div className="max-w-md w-full text-center space-y-6">
        {/* Big error code */}
        <div className="relative select-none">
          <p
            className="text-[120px] sm:text-[160px] font-black leading-none tracking-tighter text-foreground/5 select-none pointer-events-none"
            aria-hidden="true"
          >
            {pathSegment && knownCodes[pathSegment] ? pathSegment : "404"}
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {errorInfo.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {errorInfo.message}
        </p>

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-xs mx-auto">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest">
            Ivalora RMS
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <Button
            className="gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="w-4 h-4" />
            Ke Dashboard
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/40 pt-4">
          Jika masalah berlanjut, hubungi administrator sistem Anda.
        </p>
      </div>

      {/* Bottom branding */}
      <p className="absolute bottom-6 text-xs text-muted-foreground/30">
        Ivalora Gadget RMS (Retail Management System)
      </p>
    </div>
  );
};

export default NotFound;
