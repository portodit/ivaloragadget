import { useState } from "react";
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
} from "lucide-react";
import logoFull from "@/assets/logo-full.svg";
import logoIcon from "@/assets/logo-icon.svg";

type NavChild = { title: string; url: string; icon: React.ElementType };
type NavItem =
  | { title: string; url: string; icon: React.ElementType; children?: never }
  | { title: string; icon: React.ElementType; url?: never; children: NavChild[] };

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Penjualan",
    icon: ShoppingCart,
    children: [
      { title: "POS", url: "/pos", icon: Monitor },
      { title: "Transaksi", url: "/transaksi", icon: Receipt },
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
  { title: "Laporan & Analitika", url: "/laporan", icon: BarChart3 },
];

export function AppSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([
    "Penjualan",
    "Produk & Inventory",
  ]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title]
    );
  };

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col overflow-hidden bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shadow-sm"
      style={{ width: isExpanded ? "260px" : "72px" }}
    >
      {/* Logo area */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-sidebar-border shrink-0 overflow-hidden">
        {isExpanded ? (
          <img
            src={logoFull}
            alt="Ivalora Gadget"
            className="h-7 object-contain transition-all duration-300"
          />
        ) : (
          <img
            src={logoIcon}
            alt="Logo"
            className="w-8 h-8 object-contain transition-all duration-300"
          />
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
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span
                  className="text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden"
                  style={{
                    opacity: isExpanded ? 1 : 0,
                    maxWidth: isExpanded ? "200px" : "0px",
                  }}
                >
                  {item.title}
                </span>
              </NavLink>
            );
          }

          const isOpen = openGroups.includes(item.title);

          return (
            <div key={item.title}>
              <button
                onClick={() => isExpanded && toggleGroup(item.title)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 overflow-hidden"
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span
                  className="text-sm font-medium whitespace-nowrap flex-1 text-left transition-all duration-300 overflow-hidden"
                  style={{
                    opacity: isExpanded ? 1 : 0,
                    maxWidth: isExpanded ? "160px" : "0px",
                  }}
                >
                  {item.title}
                </span>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-all duration-200"
                  style={{
                    opacity: isExpanded ? 1 : 0,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Children */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: isExpanded && isOpen ? `${item.children.length * 44}px` : "0px",
                  opacity: isExpanded && isOpen ? 1 : 0,
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
            style={{ opacity: isExpanded ? 1 : 0 }}
          >
            v1.0.0 · Online
          </span>
        </div>
      </div>
    </aside>
  );
}
