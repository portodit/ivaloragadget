import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const kpis = [
  {
    label: "Penjualan Hari Ini",
    value: "Rp 12,45 jt",
    raw: "Rp 12.450.000",
    change: "+8,2%",
    trend: "up",
    sub: "vs kemarin",
  },
  {
    label: "Total Transaksi",
    value: "34",
    raw: "transaksi",
    change: "+5",
    trend: "up",
    sub: "hari ini",
  },
  {
    label: "Unit Terjual",
    value: "47",
    raw: "unit",
    change: "−3",
    trend: "down",
    sub: "vs kemarin",
  },
  {
    label: "Pelanggan Aktif",
    value: "128",
    raw: "pelanggan",
    change: "+12",
    trend: "up",
    sub: "bulan ini",
  },
];

const recentTransactions = [
  { id: "TRX-001", item: "iPhone 15 Pro 256GB", imei: "351234567890123", kondisi: "Baru", harga: "Rp 18.500.000", waktu: "10:23", kasir: "Budi" },
  { id: "TRX-002", item: "iPhone 14 128GB", imei: "351234567890456", kondisi: "Bekas", harga: "Rp 10.200.000", waktu: "09:55", kasir: "Sari" },
  { id: "TRX-003", item: "iPhone 13 Mini 64GB", imei: "351234567890789", kondisi: "Bekas", harga: "Rp 7.800.000", waktu: "09:12", kasir: "Budi" },
  { id: "TRX-004", item: "iPhone 15 128GB", imei: "351234567891012", kondisi: "Baru", harga: "Rp 15.700.000", waktu: "08:44", kasir: "Andi" },
  { id: "TRX-005", item: "iPhone 12 Pro 128GB", imei: "351234567891345", kondisi: "Bekas", harga: "Rp 9.100.000", waktu: "08:21", kasir: "Sari" },
];

export default function Index() {
  return (
    <DashboardLayout pageTitle="Dashboard">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            Rabu, 18 Februari 2026
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Selamat datang, Ahmad.
          </h2>
        </div>
        <span className="text-xs text-muted-foreground hidden md:block">
          Last updated: 10:23 WIB
        </span>
      </div>

      {/* KPI Row — editorial style, no icon containers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border border border-border rounded-2xl overflow-hidden bg-card mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="px-6 py-5 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  kpi.trend === "up" ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {kpi.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight leading-none mb-1">
              {kpi.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi.raw} · {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Transaksi Terkini</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {recentTransactions.length} transaksi hari ini
            </p>
          </div>
          <button className="text-xs font-medium text-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors duration-150">
            Lihat Semua
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  ID
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Produk
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  IMEI
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Kondisi
                </th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Harga
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                  Waktu
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                  Kasir
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentTransactions.map((trx) => (
                <tr
                  key={trx.id}
                  className="hover:bg-muted/40 transition-colors duration-100 cursor-default"
                >
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {trx.id}
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {trx.item}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground hidden md:table-cell">
                    {trx.imei}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                        trx.kondisi === "Baru"
                          ? "bg-foreground text-background border-foreground"
                          : "bg-transparent text-muted-foreground border-border"
                      }`}
                    >
                      {trx.kondisi}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-foreground tabular-nums">
                    {trx.harga}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">
                    {trx.waktu}
                  </td>
                  <td className="px-6 py-4 text-foreground hidden lg:table-cell">
                    {trx.kasir}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Menampilkan {recentTransactions.length} transaksi terbaru · Data realtime
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
