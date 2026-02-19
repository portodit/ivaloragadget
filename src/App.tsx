import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

// Public pages
import LandingPage from "./pages/LandingPage";
import ShopPage from "./pages/ShopPage";
import ProductDetailPage from "./pages/katalog/ProductDetailPage";

// Customer auth pages
import CustomerLoginPage from "./pages/auth/CustomerLoginPage";
import CustomerRegisterPage from "./pages/auth/CustomerRegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Admin auth pages
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import AdminRegisterPage from "./pages/auth/AdminRegisterPage";
import WaitingApprovalPage from "./pages/auth/WaitingApprovalPage";

// Dashboard pages (protected — admin/super_admin only)
import Index from "./pages/Index";
import MasterProductsPage from "./pages/MasterProductsPage";
import StockIMEIPage from "./pages/StockIMEIPage";
import StokOpnamePage from "./pages/StokOpnamePage";
import ManajemenAdminPage from "./pages/ManajemenAdminPage";
import LaporanPage from "./pages/LaporanPage";
import ProfilPage from "./pages/ProfilPage";
import PengaturanPage from "./pages/PengaturanPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import KatalogPage from "./pages/KatalogPage";
import KatalogFormPage from "./pages/katalog/KatalogFormPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Public / Landing ──────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/katalog" element={<ShopPage />} />
            <Route path="/produk/:slug" element={<ProductDetailPage />} />

            {/* ── Customer auth routes ───────────────────────────── */}
            <Route path="/login" element={<CustomerLoginPage />} />
            <Route path="/register" element={<CustomerRegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ── Admin auth routes (/admin/...) ─────────────────── */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/register" element={<AdminRegisterPage />} />
            <Route path="/waiting-approval" element={<WaitingApprovalPage />} />

            {/* ── Protected dashboard routes (/dashboard/...) ────── */}
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/master-produk" element={<ProtectedRoute><MasterProductsPage /></ProtectedRoute>} />
            <Route path="/stok-imei" element={<ProtectedRoute><StockIMEIPage /></ProtectedRoute>} />
            <Route path="/stok-opname" element={<ProtectedRoute><StokOpnamePage /></ProtectedRoute>} />
            <Route path="/manajemen-admin" element={<ProtectedRoute requireRole="super_admin"><ManajemenAdminPage /></ProtectedRoute>} />
            <Route path="/manajemen-admin/:tab" element={<ProtectedRoute requireRole="super_admin"><ManajemenAdminPage /></ProtectedRoute>} />
            <Route path="/laporan" element={<ProtectedRoute><LaporanPage /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfilPage /></ProtectedRoute>} />
            <Route path="/pengaturan" element={<ProtectedRoute><PengaturanPage /></ProtectedRoute>} />
            <Route path="/log-aktivitas" element={<ProtectedRoute requireRole="super_admin"><ActivityLogPage /></ProtectedRoute>} />
            <Route path="/admin/katalog" element={<ProtectedRoute><KatalogPage /></ProtectedRoute>} />
            <Route path="/admin/katalog/tambah" element={<ProtectedRoute requireRole="super_admin"><KatalogFormPage /></ProtectedRoute>} />
            <Route path="/admin/katalog/edit/:id" element={<ProtectedRoute><KatalogFormPage /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
