import { useState } from "react";
import { ChevronDown, Settings, LogOut, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function TopNavbar({ pageTitle }: { pageTitle?: string }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fullName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Admin";
  const displayRole = role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "—";

  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/login");
  };

  return (
    <header className="fixed top-0 right-0 left-[72px] h-16 z-30 flex items-center justify-between px-6 bg-card border-b border-border transition-all duration-300">
      {/* Page title */}
      <div>
        <h1 className="text-base font-semibold text-foreground">
          {pageTitle ?? "Dashboard"}
        </h1>
        <p className="text-xs text-muted-foreground">
          Ivalora Gadget · Sistem Manajemen
        </p>
      </div>

      {/* Profile section */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent transition-colors duration-150"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-bold shrink-0">
            {initials}
          </div>

          {/* Name & Role */}
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">{fullName}</p>
            <p className="text-xs text-muted-foreground leading-tight">{displayRole}</p>
          </div>

          <ChevronDown
            className="w-4 h-4 text-muted-foreground transition-transform duration-200"
            style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden py-1">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                {role === "super_admin" && (
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-foreground" />
                    <span className="text-[11px] font-medium text-foreground">{displayRole}</span>
                  </div>
                )}
              </div>

              {/* Menu items */}
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors duration-150">
                <User className="w-4 h-4 text-muted-foreground" />
                Profil Saya
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors duration-150">
                <Settings className="w-4 h-4 text-muted-foreground" />
                Pengaturan
              </button>

              <div className="border-t border-border my-1" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
