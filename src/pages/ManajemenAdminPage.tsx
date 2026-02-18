import { Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ManajemenAdminPage() {
  return (
    <DashboardLayout pageTitle="Manajemen Admin">
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Manajemen Admin</h1>
          <p className="text-xs text-muted-foreground">Kelola akun admin, status, dan hak akses mereka.</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Segera Hadir</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Fitur manajemen admin sedang dalam pengembangan. Di sini kamu bisa approve/reject pendaftaran admin, atur status akun, dan kelola hak akses.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            🚧 Dalam Pengembangan
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
