import { cn } from "@/lib/utils";
import { STOCK_STATUS_LABELS, STOCK_STATUS_STYLES, CONDITION_LABELS, CONDITION_STYLES, StockStatus, ConditionStatus } from "@/lib/stock-units";

export function StockStatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  const s = STOCK_STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", s.bg, s.text, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {STOCK_STATUS_LABELS[status]}
    </span>
  );
}

export function ConditionBadge({ condition, className }: { condition: ConditionStatus; className?: string }) {
  const s = CONDITION_STYLES[condition];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", s.bg, s.text, className)}>
      {CONDITION_LABELS[condition]}
    </span>
  );
}
