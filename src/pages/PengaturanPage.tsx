import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Settings, Bell, Moon, Globe } from "lucide-react";

export default function PengaturanPage() {
  return (
    <DashboardLayout pageTitle="Pengaturan">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Placeholder — bisa diisi fitur pengaturan lebih lanjut */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Pengaturan Aplikasi</h2>
              <p className="text-xs text-muted-foreground">Kelola preferensi tampilan dan notifikasi</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Bell,
                title: "Notifikasi Email",
                desc: "Terima pengingat opname via email",
                active: true,
              },
              {
                icon: Bell,
                title: "Notifikasi In-App",
                desc: "Pengingat muncul di dashboard",
                active: true,
              },
              {
                icon: Globe,
                title: "Bahasa",
                desc: "Bahasa Indonesia",
                active: false,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between p-4 border border-border rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                {item.active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--status-available-bg))] text-[hsl(var(--status-available-fg))] font-medium">
                    Aktif
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4">
          © 2026 Tim IT Ivalora Gadget · Ivalora Gadget RMS v1.0
        </div>
      </div>
    </DashboardLayout>
  );
}
