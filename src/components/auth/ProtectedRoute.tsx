import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "super_admin" | "admin_branch" | "employee";
  /** Allow multiple roles */
  allowRoles?: Array<"super_admin" | "admin_branch" | "employee">;
}

export function ProtectedRoute({ children, requireRole, allowRoles }: ProtectedRouteProps) {
  const { user, status, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (status === "pending") {
    return <Navigate to="/admin/waiting-approval" replace />;
  }

  if (status === "suspended" || status === "rejected") {
    return <Navigate to="/admin/login" state={{ blocked: true, status }} replace />;
  }

  // Role-based access
  if (requireRole && role !== requireRole && role !== "super_admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (allowRoles && allowRoles.length > 0) {
    if (role !== "super_admin" && (!role || !allowRoles.includes(role as any))) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
