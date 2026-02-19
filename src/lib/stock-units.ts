// ── Shared constants & helpers for Stok IMEI ──────────────────────────────

export type StockStatus = "available" | "reserved" | "coming_soon" | "service" | "sold" | "return" | "lost";
export type ConditionStatus = "no_minus" | "minus";
export type MinusSeverity = "minor" | "mayor";
export type SoldChannel = "pos" | "ecommerce_tokopedia" | "ecommerce_shopee" | "website";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  available: "Tersedia",
  reserved: "Dipesan",
  coming_soon: "Coming Soon",
  service: "Service",
  sold: "Terjual",
  return: "Retur",
  lost: "Hilang",
};

export const CONDITION_LABELS: Record<ConditionStatus, string> = {
  no_minus: "No Minus",
  minus: "Ada Minus",
};

export const MINUS_SEVERITY_LABELS: Record<MinusSeverity, string> = {
  minor: "Minor",
  mayor: "Mayor",
};

export const SOLD_CHANNEL_LABELS: Record<SoldChannel, string> = {
  pos: "Terjual Offline Store (POS)",
  ecommerce_tokopedia: "Terjual Online (Tokopedia)",
  ecommerce_shopee: "Terjual Online (Shopee)",
  website: "Terjual Online (Website)",
};

export const SOLD_CHANNEL_SHORT: Record<SoldChannel, string> = {
  pos: "Offline Store (POS)",
  ecommerce_tokopedia: "Online (Tokopedia)",
  ecommerce_shopee: "Online (Shopee)",
  website: "Online (Website)",
};

// Status badge color mapping using CSS variables
export const STOCK_STATUS_STYLES: Record<StockStatus, { bg: string; text: string; dot: string }> = {
  available: {
    bg: "bg-[hsl(var(--status-available-bg))]",
    text: "text-[hsl(var(--status-available-fg))]",
    dot: "bg-[hsl(var(--status-available))]",
  },
  reserved: {
    bg: "bg-[hsl(var(--status-reserved-bg))]",
    text: "text-[hsl(var(--status-reserved-fg))]",
    dot: "bg-[hsl(var(--status-reserved))]",
  },
  coming_soon: {
    bg: "bg-[hsl(var(--status-coming-soon-bg))]",
    text: "text-[hsl(var(--status-coming-soon-fg))]",
    dot: "bg-[hsl(var(--status-coming-soon))]",
  },
  service: {
    bg: "bg-[hsl(var(--status-service-bg))]",
    text: "text-[hsl(var(--status-service-fg))]",
    dot: "bg-[hsl(var(--status-service))]",
  },
  sold: {
    bg: "bg-[hsl(var(--status-sold-bg))]",
    text: "text-[hsl(var(--status-sold-fg))]",
    dot: "bg-[hsl(var(--status-sold))]",
  },
  return: {
    bg: "bg-[hsl(var(--status-return-bg))]",
    text: "text-[hsl(var(--status-return-fg))]",
    dot: "bg-[hsl(var(--status-return))]",
  },
  lost: {
    bg: "bg-[hsl(var(--status-lost-bg))]",
    text: "text-[hsl(var(--status-lost-fg))]",
    dot: "bg-[hsl(var(--status-lost))]",
  },
};

export const CONDITION_STYLES: Record<ConditionStatus, { bg: string; text: string }> = {
  no_minus: {
    bg: "bg-[hsl(var(--status-no-minus-bg))]",
    text: "text-[hsl(var(--status-no-minus-fg))]",
  },
  minus: {
    bg: "bg-[hsl(var(--status-minus-bg))]",
    text: "text-[hsl(var(--status-minus-fg))]",
  },
};

// Valid state transitions (business rules)
export const VALID_TRANSITIONS: Record<StockStatus, StockStatus[]> = {
  available: ["reserved", "service", "lost", "coming_soon"],
  reserved: ["sold", "available"],
  coming_soon: ["available"],
  service: ["available"],
  sold: [], // Only super_admin can correct sold status
  return: ["available", "service"],
  lost: [],
};

export interface StockUnit {
  id: string;
  product_id: string;
  imei: string;
  condition_status: ConditionStatus;
  minus_severity: MinusSeverity | null;
  minus_description: string | null;
  selling_price: number | null;
  cost_price: number | null;
  stock_status: StockStatus;
  sold_channel: SoldChannel | null;
  sold_reference_id: string | null;
  reserved_at: string | null;
  sold_at: string | null;
  status_changed_at: string;
  received_at: string;
  estimated_arrival_at: string | null;
  supplier: string | null;
  supplier_id: string | null;
  batch_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined from master_products
  master_products?: {
    series: string;
    storage_gb: number;
    color: string;
    warranty_type: string;
    category: string;
  } | null;
}

export interface StockUnitLog {
  id: string;
  unit_id: string;
  changed_at: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}
