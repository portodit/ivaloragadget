import { useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  ShoppingCart,
  Monitor,
  Receipt,
  Package,
  Database,
  Barcode,
  ClipboardList,
  BookOpen,
  BarChart3,
  ChevronRight,
  X,
  Users,
  UserCheck,
  Shield,
} from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoIcon from "@/assets/logo-icon.svg";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type NavChild = { title: string; url: string; icon: React.ElementType };
type NavItem =
  | { title: string; url: string; icon: React.ElementType; children?: never }
  | { title: string; icon: React.ElementType; url?: never; children: NavChild[] };

// ── Nav items per role ─────────────────────────────────────────────────────────
const superAdminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Manajemen Admin",
    icon: Users,
    children: [
      { title: "Daftar Admin", url: "/manajemen-admin/daftar", icon: UserCheck },
      { title: "Approval Admin", url: "/manajemen-admin/approval", icon: Shield },
    ],
  },
  {
    title: "Produk & Inventory",
    icon: Package,
    children: [
      { title: "Master Produk", url: "/master-produk", icon: Database },
      { title: "Stok IMEI", url: "/stok-imei", icon: Barcode },
      { title: "Stok Opname", url: "/stok-opname", icon: ClipboardList },
      { title: "Katalog", url: "/katalog", icon: BookOpen },
    ],
  },
  {
    title: "Penjualan",
    icon: ShoppingCart,
    children: [
      { title: "POS", url: "/pos", icon: Monitor },
      { title: "Transaksi", url: "/transaksi", icon: Receipt },
    ],
  },
  { title: "Laporan & Analitika", url: "/laporan", icon: BarChart3 },
];

const adminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Produk & Inventory",
    icon: Package,
    children: [
      { title: "Stok IMEI", url: "/stok-imei", icon: Barcode },
      { title: "Stok Opname", url: "/stok-opname", icon: ClipboardList },
      { title: "Katalog", url: "/katalog", icon: BookOpen },
    ],
  },
  {
    title: "Penjualan",
    icon: ShoppingCart,
    children: [
      { title: "POS", url: "/pos", icon: Monitor },
      { title: "Transaksi", url: "/transaksi", icon: Receipt },
    ],
  },
  { title: "Laporan & Analitika", url: "/laporan", icon: BarChart3 },
];

interface AppSidebarProps {
  mobileSidebarOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileSidebarOpen = false, onMobileClose }: AppSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([
    "Produk & Inventory",
    "Penjualan",
  ]);
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const navItems = isSuperAdmin ? superAdminNavItems : adminNavItems;

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title]
    );
  };

  const location = useLocation();

  const isGroupActive = (children: NavChild[]) =>
    children.some((c) => location.pathname === c.url || location.pathname.startsWith(c.url + "/"));

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo area */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0 overflow-hidden">
        <img
          src={isMobile ? logoHorizontal : isExpanded ? logoHorizontal : logoIcon}
          alt="Ivalora Gadget"
          className={`object-contain transition-all duration-300 ${
            isMobile ? "h-8 max-w-[160px]" : isExpanded ? "h-8 max-w-[160px]" : "w-8 h-8"
          }`}
        />
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {navItems.map((item) => {
          if (!item.children) {
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 overflow-hidden group"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={isMobile ? onMobileClose : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span
                  className="text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden"
                  style={{
                    opacity: isMobile || isExpanded ? 1 : 0,
                    maxWidth: isMobile || isExpanded ? "200px" : "0px",
                  }}
                >
                  {item.title}
                </span>
              </NavLink>
            );
          }

          const isOpen = openGroups.includes(item.title);
          const showExpanded = isMobile || isExpanded;
          const groupActive = isGroupActive(item.children);

          return (
            <div key={item.title}>
              <button
                onClick={() => showExpanded && toggleGroup(item.title)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 overflow-hidden",
                  !showExpanded && groupActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span
                  className="text-sm font-medium whitespace-nowrap flex-1 text-left transition-all duration-300 overflow-hidden"
                  style={{
                    opacity: showExpanded ? 1 : 0,
                    maxWidth: showExpanded ? "160px" : "0px",
                  }}
                >
                  {item.title}
                </span>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-all duration-200"
                  style={{
                    opacity: showExpanded ? 1 : 0,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Children */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: showExpanded && isOpen ? `${item.children.length * 44}px` : "0px",
                  opacity: showExpanded && isOpen ? 1 : 0,
                }}
              >
                <div className="ml-4 mt-0.5 mb-1 border-l border-sidebar-border pl-3 space-y-0.5">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.title}
                      to={child.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 whitespace-nowrap"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
                      onClick={isMobile ? onMobileClose : undefined}
                    >
                      <child.icon className="w-4 h-4 shrink-0" />
                      <span>{child.title}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-3 border-t border-sidebar-border overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
          <span
            className="text-xs text-sidebar-foreground/50 whitespace-nowrap transition-all duration-300"
            style={{ opacity: isMobile || isExpanded ? 1 : 0 }}
          >
            v1.0.0 · Online
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — hover expand */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="hidden md:flex fixed left-0 top-0 h-screen z-40 flex-col overflow-hidden bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shadow-sm"
        style={{ width: isExpanded ? "260px" : "72px" }}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar — slide in from left */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-screen z-50 flex flex-col w-[280px] bg-sidebar border-r border-sidebar-border shadow-xl transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
}
