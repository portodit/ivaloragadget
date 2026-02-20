import { useState } from "react";
import { ChevronDown, Settings, LogOut, User, Shield, Menu, Building2, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

interface TopNavbarProps {
  pageTitle?: string;
  onMobileMenuToggle?: () => void;
}

export function TopNavbar({ pageTitle, onMobileMenuToggle }: TopNavbarProps) {
  const { user, role, activeBranch, userBranches, setActiveBranch, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [branchSelectorOpen, setBranchSelectorOpen] = useState(false);

  const fullName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Admin";
  const displayRole =
    role === "super_admin" ? "Super Admin" :
    role === "admin_branch" ? "Admin Cabang" :
    role === "employee" ? "Employee" : "—";

  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/admin/login");
  };

  const showBranchInfo = role === "admin_branch" || role === "employee";
  const canSwitchBranch = userBranches.length > 1;

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[72px] h-16 z-30 flex items-center justify-between px-4 md:px-6 bg-card border-b border-border transition-all duration-300">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors text-foreground"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm md:text-base font-semibold text-foreground leading-tight">
            {pageTitle ?? "Dashboard"}
          </h1>
          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
            Ivalora Gadget RMS (Retail Management System)
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Branch indicator for admin_branch & employee */}
        {showBranchInfo && activeBranch && (
          <div className="relative">
            <button
              onClick={() => canSwitchBranch && setBranchSelectorOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border ${
                canSwitchBranch ? "hover:bg-accent cursor-pointer" : "cursor-default"
              } transition-colors`}
            >
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground hidden sm:inline">{activeBranch.name}</span>
              <span className="font-medium text-foreground sm:hidden">{activeBranch.code}</span>
              {canSwitchBranch && <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />}
            </button>

            {branchSelectorOpen && canSwitchBranch && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setBranchSelectorOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Cabang</p>
                  </div>
                  {userBranches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setActiveBranch(branch);
                        setBranchSelectorOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        branch.id === activeBranch.id
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {branch.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <NotificationBell />

        {/* Profile section */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-xl hover:bg-accent transition-colors duration-150"
          >
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-tight">{fullName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{displayRole}</p>
            </div>
            <ChevronDown
              className="w-4 h-4 text-muted-foreground transition-transform duration-200"
              style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-foreground" />
                    <span className="text-[11px] font-medium text-foreground">{displayRole}</span>
                  </div>
                  {showBranchInfo && activeBranch && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">{activeBranch.name}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); navigate("/admin/profil"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors duration-150"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Profil Saya
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); navigate("/admin/pengaturan"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors duration-150"
                >
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
      </div>
    </header>
  );
}
