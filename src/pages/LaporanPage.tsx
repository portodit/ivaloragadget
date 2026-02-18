import { BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function LaporanPage() {
  return (
    <DashboardLayout pageTitle="Laporan & Analitika">
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Laporan & Analitika</h1>
          <p className="text-xs text-muted-foreground">Pantau performa penjualan, stok, dan kinerja admin.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Laporan Penjualan", desc: "Rekap transaksi harian, mingguan, dan bulanan." },
            { label: "Performa Admin", desc: "Pantau produktivitas dan aktivitas setiap admin." },
            { label: "Analitika Stok", desc: "Tren stok masuk, keluar, dan hasil stok opname." },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border w-fit">
                🚧 Segera Hadir
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
