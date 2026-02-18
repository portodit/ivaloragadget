import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import WaitingApprovalPage from "./pages/auth/WaitingApprovalPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import MasterProductsPage from "./pages/MasterProductsPage";
import StockIMEIPage from "./pages/StockIMEIPage";
import StokOpnamePage from "./pages/StokOpnamePage";
import ManajemenAdminPage from "./pages/ManajemenAdminPage";
import LaporanPage from "./pages/LaporanPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/waiting-approval" element={<WaitingApprovalPage />} />

            {/* Protected dashboard routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/master-produk" element={<ProtectedRoute><MasterProductsPage /></ProtectedRoute>} />
            <Route path="/stok-imei" element={<ProtectedRoute><StockIMEIPage /></ProtectedRoute>} />
            <Route path="/stok-opname" element={<ProtectedRoute><StokOpnamePage /></ProtectedRoute>} />
            <Route path="/manajemen-admin" element={<ProtectedRoute requireRole="super_admin"><ManajemenAdminPage /></ProtectedRoute>} />
            <Route path="/manajemen-admin/:tab" element={<ProtectedRoute requireRole="super_admin"><ManajemenAdminPage /></ProtectedRoute>} />
            <Route path="/laporan" element={<ProtectedRoute><LaporanPage /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

