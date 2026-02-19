# 🚀 Ivalora Gadget — Self-Hosting Deployment

Deploy Ivalora Gadget ke VPS Anda dengan satu perintah.

## Prerequisites

- VPS dengan **Ubuntu 22.04+** (minimal 2GB RAM, 20GB disk)
- Domain `iva.rextra.id` sudah di-pointing ke IP VPS (A record)
- Akses **root** atau user dengan sudo

## DNS Setup

Sebelum menjalankan script, pastikan DNS sudah dikonfigurasi:

| Type | Name | Value |
|------|------|-------|
| A | iva | `<IP VPS Anda>` |

> DNS propagation bisa memakan waktu hingga 24 jam.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/portodit/ivaloragadget/main/deploy/install.sh | bash
```

## Yang Perlu Disiapkan

Script akan menanyakan ini di awal:

| Secret | Keterangan |
|--------|-----------|
| SSL Email | Email untuk Let's Encrypt |
| JWT Secret | Minimal 32 karakter, untuk signing token |
| PostgreSQL Password | Password database |
| Gmail Address | Untuk kirim email notifikasi |
| Gmail App Password | [Cara buat App Password](https://support.google.com/accounts/answer/185833) |
| reCAPTCHA Site Key | Dari [Google reCAPTCHA](https://www.google.com/recaptcha/admin) |
| reCAPTCHA Secret Key | Dari Google reCAPTCHA |
| Super Admin Email | Email akun super admin pertama |
| Super Admin Password | Password super admin |

## Maintenance

```bash
# Update aplikasi
cd /opt/ivaloragadget && git pull && npm run build

# Restart Supabase
cd /opt/ivaloragadget/supabase-docker && docker compose restart

# Lihat logs
docker compose -f /opt/ivaloragadget/supabase-docker/docker-compose.yml logs -f

# Renew SSL (otomatis via cron, tapi bisa manual)
sudo certbot renew
```

## Struktur

```
/opt/ivaloragadget/
├── dist/                  # Frontend build output (served by nginx)
├── src/                   # Source code
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
├── supabase-docker/       # Supabase self-hosted (docker-compose)
└── deploy/
    ├── install.sh         # Script ini
    └── README.md          # Dokumentasi ini
```

## Troubleshooting

- **SSL gagal**: Pastikan DNS sudah propagate (`dig iva.rextra.id`)
- **Supabase error**: Cek logs `docker compose logs`
- **502 Bad Gateway**: Supabase belum ready, tunggu 30 detik lalu reload
- **Migration error**: Cek log spesifik, beberapa warning bisa diabaikan
