import { useRef, useState, useEffect } from "react";
import { Bell, Check, CheckCheck, X, Info, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, AppNotification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

function NotifIcon({ type }: { type: string }) {
  if (type === "opname_reminder")
    return <Clock className="w-4 h-4 text-[hsl(var(--status-reserved-fg))]" />;
  if (type === "approval")
    return <Check className="w-4 h-4 text-[hsl(var(--status-available-fg))]" />;
  if (type === "warning")
    return <AlertTriangle className="w-4 h-4 text-[hsl(var(--status-minus-fg))]" />;
  return <Info className="w-4 h-4 text-muted-foreground" />;
}

function NotifBg({ type }: { type: string }) {
  if (type === "opname_reminder") return "bg-[hsl(var(--status-reserved-bg))]";
  if (type === "approval") return "bg-[hsl(var(--status-available-bg))]";
  if (type === "warning") return "bg-[hsl(var(--status-minus-bg))]";
  return "bg-muted";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNotifClick(notif: AppNotification) {
    markRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="w-[18px] h-[18px] text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                  title="Tandai semua dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Tidak ada notifikasi</p>
                <p className="text-xs text-muted-foreground">Pengingat opname akan muncul di sini</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-0",
                    !notif.is_read && "bg-[hsl(210_20%_98%)]"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", NotifBg({ type: notif.type }))}>
                    <NotifIcon type={notif.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs font-medium text-foreground leading-snug", !notif.is_read && "font-semibold")}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-destructive shrink-0 mt-0.5" />
                      )}
                    </div>
                    {notif.body && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
