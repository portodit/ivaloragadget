import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Beranda", labelEn: "Home", href: "/" },
  { label: "Katalog", labelEn: "Catalog", href: "/katalog" },
  { label: "Tentang Kami", labelEn: "About", href: "#tentang" },
  { label: "Kontak", labelEn: "Contact", href: "#kontak" },
];

type Lang = "id" | "en";
type Currency = "IDR" | "USD";

interface PublicNavbarProps {
  lang?: Lang;
  currency?: Currency;
  onLangChange?: (l: Lang) => void;
  onCurrencyChange?: (c: Currency) => void;
}

export function PublicNavbar({
  lang: externalLang,
  currency: externalCurrency,
  onLangChange,
  onCurrencyChange,
}: PublicNavbarProps = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState<Lang>(externalLang ?? "id");
  const [currency, setCurrency] = useState<Currency>(externalCurrency ?? "IDR");
  const [langOpen, setLangOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => { setLangOpen(false); setCurrOpen(false); };
    if (langOpen || currOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [langOpen, currOpen]);

  const handleLang = (l: Lang) => {
    setLang(l);
    onLangChange?.(l);
    setLangOpen(false);
  };
  const handleCurrency = (c: Currency) => {
    setCurrency(c);
    onCurrencyChange?.(c);
    setCurrOpen(false);
  };

  const label = (item: (typeof navLinks)[0]) => lang === "en" ? item.labelEn : item.label;

  return (
    <>
      {/* ── Floating wrapper ── */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          scrolled
            ? "py-2"
            : "py-0"
        )}
      >
        <div
          className={cn(
            "transition-all duration-300 ease-out",
            scrolled
              ? "mx-4 md:mx-8 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-border/60"
              : "bg-background/95 backdrop-blur-sm border-b border-border"
          )}
        >
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center">
            {/* Logo — left */}
            <Link to="/" className="flex items-center shrink-0 mr-8">
              <img src={logoHorizontal} alt="Ivalora" className="h-7 w-auto" />
            </Link>

            {/* Nav links — centered absolutely */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium"
                >
                  {label(l)}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0 ml-8">
              {/* Language switcher */}
              <div className="relative hidden md:block" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setLangOpen(!langOpen); setCurrOpen(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span className="text-base leading-none">{lang === "id" ? "🇮🇩" : "🇬🇧"}</span>
                  <span className="text-xs font-medium uppercase">{lang}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", langOpen && "rotate-180")} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-lg overflow-hidden py-1 min-w-[110px]">
                    <button onClick={() => handleLang("id")} className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors", lang === "id" && "font-semibold text-foreground")}>
                      <span>🇮🇩</span> Bahasa
                    </button>
                    <button onClick={() => handleLang("en")} className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors", lang === "en" && "font-semibold text-foreground")}>
                      <span>🇬🇧</span> English
                    </button>
                  </div>
                )}
              </div>

              {/* Currency switcher */}
              <div className="relative hidden md:block" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setCurrOpen(!currOpen); setLangOpen(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span className="text-xs font-semibold">{currency}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", currOpen && "rotate-180")} />
                </button>
                {currOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-lg overflow-hidden py-1 min-w-[90px]">
                    <button onClick={() => handleCurrency("IDR")} className={cn("w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors", currency === "IDR" && "font-semibold text-foreground")}>
                      IDR — Rp
                    </button>
                    <button onClick={() => handleCurrency("USD")} className={cn("w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors", currency === "USD" && "font-semibold text-foreground")}>
                      USD — $
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2 ml-1">
                <Button size="sm" onClick={() => navigate("/login")}>
                  {lang === "en" ? "Sign In" : "Masuk"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/login")}>
                  Admin
                </Button>
              </div>

              {/* Mobile hamburger */}
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
            <div className="md:hidden border-t border-border px-4 pb-4 pt-3 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium"
                >
                  {label(l)}
                </Link>
              ))}
              {/* Mobile lang + currency row */}
              <div className="flex items-center gap-2 px-3 pt-1">
                <button onClick={() => handleLang(lang === "id" ? "en" : "id")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
                  <span>{lang === "id" ? "🇮🇩" : "🇬🇧"}</span>
                  <span className="uppercase text-xs font-medium">{lang}</span>
                </button>
                <button onClick={() => handleCurrency(currency === "IDR" ? "USD" : "IDR")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
                  <span className="text-xs font-semibold">{currency}</span>
                </button>
              </div>
              <div className="pt-2 border-t border-border mt-2 flex flex-col gap-2">
                <Button className="w-full" onClick={() => { setMobileOpen(false); navigate("/login"); }}>
                  {lang === "en" ? "Sign In" : "Masuk"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => { setMobileOpen(false); navigate("/admin/login"); }}>
                  Admin
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Spacer so content doesn't go behind fixed navbar */}
      <div className="h-16" />
    </>
  );
}
