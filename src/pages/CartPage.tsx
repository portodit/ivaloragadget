import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingBag, Tag, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

const USD_RATE = 15500;

export interface CartItem {
  unitId: string;
  productName: string;
  color: string;
  storageGb: number;
  warrantyType: string;
  conditionStatus: "no_minus" | "minus";
  minusDescription: string | null;
  sellingPrice: number;
  imeiCensored: string;
  thumbnailUrl: string | null;
  slug: string | null;
}

// Simple localStorage-based cart
const CART_KEY = "ivalora_cart";

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch { return []; }
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  // Don't add duplicate units
  if (cart.some(c => c.unitId === item.unitId)) return false;
  cart.push(item);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-update"));
  return true;
}

export function removeFromCart(unitId: string) {
  const cart = getCart().filter(c => c.unitId !== unitId);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-update"));
}

export function clearCart() {
  localStorage.setItem(CART_KEY, JSON.stringify([]));
  window.dispatchEvent(new Event("cart-update"));
}

function useFormatPrice() {
  const { currency } = useLocale();
  return (n: number | null | undefined) => {
    if (!n) return "—";
    if (currency === "USD") {
      const usd = n / USD_RATE;
      return "$" + usd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return "Rp" + n.toLocaleString("id-ID");
  };
}

const WARRANTY_SHORT: Record<string, string> = {
  resmi_bc: "Resmi BC",
  ibox: "Resmi iBox",
  inter: "Inter",
  whitelist: "Whitelist",
  digimap: "Digimap",
};

export default function CartPage() {
  const navigate = useNavigate();
  const formatPrice = useFormatPrice();
  const [items, setItems] = useState<CartItem[]>(getCart());
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState<{ code: string; amount: number } | null>(null);
  const [discountError, setDiscountError] = useState("");

  useEffect(() => {
    function sync() { setItems(getCart()); }
    window.addEventListener("cart-update", sync);
    return () => window.removeEventListener("cart-update", sync);
  }, []);

  function handleRemove(unitId: string) {
    removeFromCart(unitId);
    setItems(getCart());
  }

  const subtotal = items.reduce((sum, i) => sum + i.sellingPrice, 0);
  const discount = discountApplied?.amount ?? 0;
  const total = Math.max(0, subtotal - discount);

  function handleApplyDiscount() {
    setDiscountError("");
    if (!discountCode.trim()) return;
    // Simple client-side placeholder — real discount validation should use backend
    setDiscountError("Kode diskon tidak valid atau sudah kedaluwarsa.");
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-4">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Keranjang Belanja</h1>
              <p className="text-xs text-muted-foreground">{items.length} item</p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-base font-semibold text-foreground">Keranjang masih kosong</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Jelajahi katalog untuk menambahkan produk.</p>
              <Button variant="outline" onClick={() => navigate("/katalog")}>
                Lihat Katalog
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              {/* Items list */}
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.unitId} className="bg-card border border-border rounded-xl p-4 flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg bg-muted/40 overflow-hidden shrink-0">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={item.slug ? `/produk/${item.slug}` : "#"}
                        className="text-sm font-semibold text-foreground hover:underline line-clamp-1"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.color} · {item.storageGb}GB · {WARRANTY_SHORT[item.warrantyType] ?? item.warrantyType}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.conditionStatus === "no_minus" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            <CheckCircle2 className="w-2.5 h-2.5" /> No Minus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            <AlertCircle className="w-2.5 h-2.5" /> Minus
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">IMEI: {item.imeiCensored}</span>
                      </div>
                      <p className="text-base font-bold text-foreground mt-2">{formatPrice(item.sellingPrice)}</p>
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(item.unitId)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors self-start shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary sidebar */}
              <div className="lg:self-start">
                <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-20">
                  <p className="text-sm font-semibold text-foreground">Ringkasan Belanja</p>

                  {/* Discount code */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Kode Diskon / Promo</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          value={discountCode}
                          onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(""); }}
                          placeholder="Masukkan kode"
                          className="pl-9 h-9 text-sm uppercase"
                        />
                      </div>
                      <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleApplyDiscount}>
                        Terapkan
                      </Button>
                    </div>
                    {discountError && <p className="text-[11px] text-destructive">{discountError}</p>}
                    {discountApplied && (
                      <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-green-700 font-medium">✓ {discountApplied.code}</span>
                        <span className="text-green-700 font-bold">-{formatPrice(discountApplied.amount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({items.length} item)</span>
                      <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Diskon</span>
                        <span className="font-medium text-green-600">-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-border">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Button className="w-full h-11 font-semibold" disabled={items.length === 0}>
                    Checkout
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">
                    Setiap item di keranjang adalah unit spesifik (bukan SKU). Pastikan Anda memilih unit yang sesuai.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}