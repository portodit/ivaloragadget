import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, ShoppingCart, User, MapPin, ClipboardList, Settings, LogOut } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import logoIcon from "@/assets/logo-icon.svg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCart } from "@/pages/CartPage";

const navLinks = [
  { label: "Beranda", labelEn: "Home", href: "/" },
  { label: "Katalog", labelEn: "Catalog", href: "/katalog" },
];

export function PublicNavbar() {
  const { lang, currency, setLang, setCurrency } = useLocale();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(getCart().length);

  useEffect(() => {
    const sync = () => setCartCount(getCart().length);
    window.addEventListener("cart-update", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("cart-update", sync); window.removeEventListener("storage", sync); };
  }, []);
  const fullName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Close profile dropdown on outside click
  useEffect(() => {
    const close = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [profileOpen]);

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

  const handleLang = (l: "id" | "en") => {
    setLang(l);
    setLangOpen(false);
  };
  const handleCurrency = (c: "IDR" | "USD") => {
    setCurrency(c);
    setCurrOpen(false);
  };

  const label = (item: (typeof navLinks)[0]) => lang === "en" ? item.labelEn : item.label;

  return (
    <>
      {/* ── Floating wrapper ── */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          scrolled ? "py-2" : "py-0"
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
            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0 mr-8">
              <img src={scrolled ? logoIcon : logoHorizontal} alt="Ivalora" className={scrolled ? "h-8 w-auto" : "h-7 w-auto"} />
            </Link>

            {/* Nav links — centered */}
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
            <div className="flex items-center gap-1.5 shrink-0 ml-8">
              {/* Language switcher — flag only */}
              <div className="relative hidden md:block" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setLangOpen(!langOpen); setCurrOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title={lang === "id" ? "Ganti bahasa" : "Change language"}
                >
                  <span className="text-lg leading-none">{lang === "id" ? "🇮🇩" : "🇬🇧"}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", langOpen && "rotate-180")} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-lg overflow-hidden py-1 min-w-[160px]">
                    <button onClick={() => handleLang("id")} className={cn("flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-accent transition-colors", lang === "id" && "font-semibold text-foreground")}>
                      <span className="text-base">🇮🇩</span> Bahasa Indonesia
                    </button>
                    <button onClick={() => handleLang("en")} className={cn("flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-accent transition-colors", lang === "en" && "font-semibold text-foreground")}>
                      <span className="text-base">🇬🇧</span> English
                    </button>
                  </div>
                )}
              </div>

              {/* Currency switcher — symbol only */}
              <div className="relative hidden md:block" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setCurrOpen(!currOpen); setLangOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-semibold"
                  title="Change currency"
                >
                  <span className="text-sm">{currency === "IDR" ? "Rp" : "$"}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", currOpen && "rotate-180")} />
                </button>
                {currOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-lg overflow-hidden py-1 min-w-[120px]">
                    <button onClick={() => handleCurrency("IDR")} className={cn("w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors", currency === "IDR" && "font-semibold text-foreground")}>
                      🇮🇩 IDR — Rp
                    </button>
                    <button onClick={() => handleCurrency("USD")} className={cn("w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors", currency === "USD" && "font-semibold text-foreground")}>
                      🇺🇸 USD — $
                    </button>
                  </div>
                )}
              </div>

              {/* Cart icon */}
              <button
                onClick={() => navigate("/keranjang")}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground relative"
                title={lang === "en" ? "Cart" : "Keranjang"}
              >
                <ShoppingCart className="w-4.5 h-4.5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>

              <div className="hidden md:flex items-center gap-2 ml-1">
                {user ? (
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-accent transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-bold">
                        {initials || <User className="w-4 h-4" />}
                      </div>
                      <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", profileOpen && "rotate-180")} />
                    </button>
                    {profileOpen && (
                      <div className="absolute right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-lg overflow-hidden py-1 min-w-[200px] z-50">
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <button onClick={() => { setProfileOpen(false); navigate("/profil"); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {lang === "en" ? "My Profile" : "Profil Saya"}
                        </button>
                        <button onClick={() => { setProfileOpen(false); navigate("/pengaturan"); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          {lang === "en" ? "Settings" : "Pengaturan"}
                        </button>
                        <button onClick={() => { setProfileOpen(false); navigate("/alamat"); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {lang === "en" ? "Address" : "Alamat"}
                        </button>
                        <button onClick={() => { setProfileOpen(false); navigate("/riwayat"); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                          <ClipboardList className="w-4 h-4 text-muted-foreground" />
                          {lang === "en" ? "Transaction History" : "Riwayat Transaksi"}
                        </button>
                        <div className="border-t border-border my-1" />
                        <button onClick={async () => { setProfileOpen(false); await signOut(); navigate("/"); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors">
                          <LogOut className="w-4 h-4" />
                          {lang === "en" ? "Sign Out" : "Keluar"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button size="sm" onClick={() => navigate("/login")}>
                    {lang === "en" ? "Sign In" : "Masuk"}
                  </Button>
                )}
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
                <button onClick={() => handleCurrency(currency === "IDR" ? "USD" : "IDR")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors font-semibold">
                  <span className="text-xs">{currency === "IDR" ? "Rp" : "$"}</span>
                </button>
              </div>
              <div className="pt-2 border-t border-border mt-2 flex flex-col gap-2">
                {user ? (
                  <>
                    <button onClick={() => { setMobileOpen(false); navigate("/profil"); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors font-medium">
                      <User className="w-4 h-4 text-muted-foreground" /> {lang === "en" ? "My Profile" : "Profil Saya"}
                    </button>
                    <button onClick={() => { setMobileOpen(false); navigate("/riwayat"); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors font-medium">
                      <ClipboardList className="w-4 h-4 text-muted-foreground" /> {lang === "en" ? "History" : "Riwayat"}
                    </button>
                    <button onClick={async () => { setMobileOpen(false); await signOut(); navigate("/"); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/5 transition-colors font-medium">
                      <LogOut className="w-4 h-4" /> {lang === "en" ? "Sign Out" : "Keluar"}
                    </button>
                  </>
                ) : (
                  <Button className="w-full" onClick={() => { setMobileOpen(false); navigate("/login"); }}>
                    {lang === "en" ? "Sign In" : "Masuk"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
}
