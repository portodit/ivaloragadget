import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Beranda", href: "/" },
  { label: "Katalog", href: "/katalog" },
  { label: "Tentang Kami", href: "#tentang" },
  { label: "Kontak", href: "#kontak" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={logoHorizontal} alt="Ivalora" className="h-7 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => navigate("/login")}
            className="hidden md:flex"
          >
            Masuk
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/admin/login")}
            className="hidden md:flex"
          >
            Admin
          </Button>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-3 space-y-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border mt-2 flex flex-col gap-2">
            <Button className="w-full" onClick={() => { setMobileOpen(false); navigate("/login"); }}>
              Masuk
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setMobileOpen(false); navigate("/admin/login"); }}>
              Admin
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
