import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "super_admin" | "admin";
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
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

  // Customer accounts cannot access admin dashboard
  // (role check happens after status check)

  if (status === "pending") {
    return <Navigate to="/waiting-approval" replace />;
  }

  if (status === "suspended" || status === "rejected") {
    return <Navigate to="/login" state={{ blocked: true, status }} replace />;
  }

  if (requireRole === "super_admin" && role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
