// ── Types & constants for Stok Opname ──────────────────────────

export type SessionType = "opening" | "closing" | "adhoc";
export type SessionStatus = "draft" | "completed" | "approved" | "locked";
export type SnapshotScanResult = "match" | "missing";
export type ScannedScanResult = "match" | "unregistered";
export type SnapshotActionTaken =
  | "sold_pos"
  | "sold_ecommerce"
  | "sold_manual"
  | "service"
  | "lost"
  | "pending_investigation"
  | null;
export type ScannedActionTaken = "add_to_stock" | "mark_return" | "ignore" | null;

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  opening: "Opening",
  closing: "Closing",
  adhoc: "Ad-Hoc",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  draft: "Draft",
  completed: "Selesai",
  approved: "Disetujui",
  locked: "Terkunci",
};

export const SESSION_STATUS_STYLES: Record<
  SessionStatus,
  { bg: string; text: string; dot: string }
> = {
  draft: {
    bg: "bg-[hsl(var(--status-coming-soon-bg))]",
    text: "text-[hsl(var(--status-coming-soon-fg))]",
    dot: "bg-[hsl(var(--status-coming-soon))]",
  },
  completed: {
    bg: "bg-[hsl(var(--status-reserved-bg))]",
    text: "text-[hsl(var(--status-reserved-fg))]",
    dot: "bg-[hsl(var(--status-reserved))]",
  },
  approved: {
    bg: "bg-[hsl(var(--status-available-bg))]",
    text: "text-[hsl(var(--status-available-fg))]",
    dot: "bg-[hsl(var(--status-available))]",
  },
  locked: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export const SESSION_TYPE_STYLES: Record<
  SessionType,
  { bg: string; text: string }
> = {
  opening: {
    bg: "bg-[hsl(var(--status-available-bg))]",
    text: "text-[hsl(var(--status-available-fg))]",
  },
  closing: {
    bg: "bg-[hsl(var(--status-sold-bg,var(--muted)))]",
    text: "text-[hsl(var(--status-sold-fg,var(--muted-foreground)))]",
  },
  adhoc: {
    bg: "bg-[hsl(var(--status-coming-soon-bg))]",
    text: "text-[hsl(var(--status-coming-soon-fg))]",
  },
};

export const SNAPSHOT_ACTION_LABELS: Record<
  NonNullable<SnapshotActionTaken>,
  string
> = {
  sold_pos: "Tandai Terjual (POS)",
  sold_ecommerce: "Tandai Terjual (E-Commerce)",
  sold_manual: "Tandai Terjual (Manual)",
  service: "Tandai Service",
  lost: "Tandai Hilang",
  pending_investigation: "Tunda Investigasi",
};

export const SCANNED_ACTION_LABELS: Record<
  NonNullable<ScannedActionTaken>,
  string
> = {
  add_to_stock: "Tambahkan ke Stok",
  mark_return: "Tandai Return",
  ignore: "Abaikan",
};

// ── Interface types ──────────────────────────────────────────────

export interface OpnameSession {
  id: string;
  session_type: SessionType;
  session_status: SessionStatus;
  notes: string | null;
  total_expected: number;
  total_scanned: number;
  total_match: number;
  total_missing: number;
  total_unregistered: number;
  created_by: string | null;
  approved_by: string | null;
  started_at: string;
  completed_at: string | null;
  approved_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  creator_name?: string;
  approver_name?: string;
}

export interface OpnameSnapshotItem {
  id: string;
  session_id: string;
  unit_id: string;
  imei: string;
  product_label: string;
  selling_price: number | null;
  cost_price: number | null;
  stock_status: string;
  scan_result: SnapshotScanResult;
  action_taken: SnapshotActionTaken;
  action_notes: string | null;
  sold_reference_id: string | null;
  created_at: string;
}

export interface OpnameScannedItem {
  id: string;
  session_id: string;
  imei: string;
  scan_result: ScannedScanResult;
  action_taken: ScannedActionTaken;
  action_notes: string | null;
  scanned_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(dateStr)
  );
}
