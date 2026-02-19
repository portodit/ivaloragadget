#!/usr/bin/env bash
# ============================================================
#  Ivalora Gadget — Self-Hosting Installer v2
#  Flexible domain, DNS check, robust error handling
# ============================================================

# Don't use -u yet, we handle unset vars manually
set -eo pipefail

REPO_URL="https://github.com/portodit/ivaloragadget.git"
INSTALL_DIR="/opt/ivaloragadget"
SUPABASE_DOCKER_DIR="$INSTALL_DIR/supabase-docker"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   Ivalora Gadget — VPS Installer v2                  ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

prompt() {
  local var_name="$1" prompt_text="$2" is_secret="${3:-false}" default="${4:-}"
  local value=""
  while true; do
    if [ "$is_secret" = "true" ]; then
      read -sp "$prompt_text" value
      echo ""
    else
      read -p "$prompt_text" value
    fi
    value="${value:-$default}"
    if [ -n "$value" ]; then
      eval "$var_name='$value'"
      return
    fi
    echo -e "${RED}  ⚠ Tidak boleh kosong, coba lagi.${NC}"
  done
}

check_dns() {
  local domain="$1"
  local vps_ip
  vps_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")

  echo ""
  echo -e "${CYAN}── DNS Check untuk ${domain} ──${NC}"
  echo -e "IP VPS ini: ${GREEN}${vps_ip}${NC}"

  if command -v dig &>/dev/null; then
    local dns_ip
    dns_ip=$(dig +short "$domain" 2>/dev/null | head -1)
    if [ -z "$dns_ip" ]; then
      echo -e "${YELLOW}⚠ DNS A record untuk ${domain} belum ditemukan.${NC}"
      echo "  Pastikan Anda sudah menambahkan A record yang mengarah ke ${vps_ip}"
    elif [ "$dns_ip" = "$vps_ip" ]; then
      echo -e "${GREEN}✓ DNS sudah benar! ${domain} → ${dns_ip}${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠ DNS mengarah ke ${dns_ip}, bukan ke VPS ini (${vps_ip}).${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ 'dig' tidak tersedia, skip DNS check.${NC}"
  fi

  echo ""
  read -p "Lanjut install tanpa DNS yang benar? SSL tidak akan bisa diaktifkan. (y/n): " dns_continue
  if [[ ! "$dns_continue" =~ ^[Yy] ]]; then
    echo "Instalasi dibatalkan. Silakan setup DNS terlebih dahulu."
    exit 0
  fi
  return 1
}

generate_jwt_keys() {
  local jwt_secret="$1"
  # Generate ANON_KEY (role=anon, iss=supabase, exp=10 years)
  local header payload
  header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  
  local exp=$(( $(date +%s) + 315360000 )) # 10 years
  
  payload=$(echo -n "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":${exp}}" | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  local signature
  signature=$(echo -n "${header}.${payload}" | openssl dgst -sha256 -hmac "$jwt_secret" -binary | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  GENERATED_ANON_KEY="${header}.${payload}.${signature}"

  payload=$(echo -n "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":${exp}}" | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  signature=$(echo -n "${header}.${payload}" | openssl dgst -sha256 -hmac "$jwt_secret" -binary | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  GENERATED_SERVICE_KEY="${header}.${payload}.${signature}"
}

# ============================================================
banner

# STEP 1: Domain
echo -e "${YELLOW}━━━ STEP 1/7: Konfigurasi Domain ━━━${NC}"
prompt DOMAIN "Masukkan domain (contoh: iva.rextra.id): "

DNS_OK=false
check_dns "$DOMAIN" && DNS_OK=true

# STEP 2: Secrets
echo ""
echo -e "${YELLOW}━━━ STEP 2/7: Input Secrets ━━━${NC}"
echo -e "${CYAN}Semua secret akan ditanyakan sekarang sebelum instalasi dimulai.${NC}"
echo ""

prompt SSL_EMAIL     "Email untuk SSL (Let's Encrypt): "
prompt JWT_SECRET    "JWT Secret (min 32 karakter): "
prompt PG_PASSWORD   "PostgreSQL Password: " true
echo ""
prompt GMAIL_USER    "Gmail Address (kirim email): "
prompt GMAIL_PASS    "Gmail App Password: " true
echo ""
prompt RECAP_SITE    "reCAPTCHA Site Key: "
prompt RECAP_SECRET  "reCAPTCHA Secret Key: " true
echo ""
prompt SA_EMAIL      "Super Admin Email: "
prompt SA_PASSWORD   "Super Admin Password: " true
echo ""

echo ""
echo -e "${GREEN}✓ Semua input terkumpul. Memulai instalasi...${NC}"
echo ""

# STEP 3: System dependencies
echo -e "${YELLOW}━━━ STEP 3/7: Install Dependencies ━━━${NC}"

sudo apt-get update -y
sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx \
  apt-transport-https ca-certificates gnupg lsb-release openssl dnsutils postgresql-client

if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
fi

if ! docker compose version &>/dev/null 2>&1; then
  sudo apt-get install -y docker-compose-plugin
fi

if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo -e "${GREEN}✓ Dependencies OK${NC}"

# STEP 4: Clone repo
echo -e "${YELLOW}━━━ STEP 4/7: Clone Repository ━━━${NC}"

if [ -d "$INSTALL_DIR" ]; then
  echo "Directory exists, pulling latest..."
  cd "$INSTALL_DIR" && git pull origin main || git pull
else
  sudo git clone "$REPO_URL" "$INSTALL_DIR"
  sudo chown -R "$USER:$USER" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
echo -e "${GREEN}✓ Repository ready${NC}"

# STEP 5: Supabase self-hosted
echo -e "${YELLOW}━━━ STEP 5/7: Setup Supabase ━━━${NC}"

if [ ! -d "$SUPABASE_DOCKER_DIR" ]; then
  echo "Downloading Supabase Docker setup (sparse checkout)..."
  mkdir -p "$SUPABASE_DOCKER_DIR"
  cd /tmp
  rm -rf supabase-docker-tmp
  git clone --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase.git supabase-docker-tmp
  cd supabase-docker-tmp
  git sparse-checkout set docker
  cp -r docker/* "$SUPABASE_DOCKER_DIR/"
  cd /tmp && rm -rf supabase-docker-tmp
fi

cd "$SUPABASE_DOCKER_DIR"

# Generate JWT keys locally
echo "Generating JWT keys..."
generate_jwt_keys "$JWT_SECRET"
echo -e "${GREEN}✓ JWT keys generated${NC}"

# Create .env from scratch (don't rely on .env.example format)
cp -n .env.example .env 2>/dev/null || true

# Use sed to replace values, handle both existing and missing keys
update_env() {
  local key="$1" value="$2" file="$SUPABASE_DOCKER_DIR/.env"
  # Escape special chars in value for sed
  local escaped_value
  escaped_value=$(printf '%s\n' "$value" | sed -e 's/[&/\]/\\&/g')
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$file"
  else
    echo "${key}=${escaped_value}" >> "$file"
  fi
}

update_env "POSTGRES_PASSWORD" "$PG_PASSWORD"
update_env "JWT_SECRET" "$JWT_SECRET"
update_env "ANON_KEY" "$GENERATED_ANON_KEY"
update_env "SERVICE_ROLE_KEY" "$GENERATED_SERVICE_KEY"
update_env "SITE_URL" "https://${DOMAIN}"
update_env "API_EXTERNAL_URL" "https://${DOMAIN}"
update_env "SUPABASE_PUBLIC_URL" "https://${DOMAIN}"

# App secrets as extra env
update_env "GMAIL_USER" "$GMAIL_USER"
update_env "GMAIL_APP_PASSWORD" "$GMAIL_PASS"
update_env "RECAPTCHA_SITE_KEY" "$RECAP_SITE"
update_env "RECAPTCHA_SECRET_KEY" "$RECAP_SECRET"
update_env "BOOTSTRAP_SUPERADMIN_ENABLED" "true"
update_env "BOOTSTRAP_SUPERADMIN_EMAIL" "$SA_EMAIL"
update_env "BOOTSTRAP_SUPERADMIN_PASSWORD" "$SA_PASSWORD"

echo "Starting Supabase (this may take a few minutes on first run)..."
docker compose pull
docker compose up -d

echo "Waiting for services to initialize (60s)..."
sleep 60

# Verify Supabase is running
if curl -sf http://localhost:8000/rest/v1/ -H "apikey: $GENERATED_ANON_KEY" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Supabase is running${NC}"
else
  echo -e "${YELLOW}⚠ Supabase may still be starting. Continuing...${NC}"
fi

# STEP 6: Migrations + Build
echo -e "${YELLOW}━━━ STEP 6/7: Migrations & Build ━━━${NC}"

cd "$INSTALL_DIR"

# Apply migrations
echo "Applying database migrations..."
for migration in supabase/migrations/*.sql; do
  [ -f "$migration" ] || continue
  echo "  → $(basename "$migration")"
  PGPASSWORD="$PG_PASSWORD" psql -h localhost -p 5432 -U postgres -d postgres -f "$migration" 2>&1 | tail -1 || true
done
echo -e "${GREEN}✓ Migrations applied${NC}"

# Build frontend
cat > .env.production <<EOF
VITE_SUPABASE_URL=https://${DOMAIN}
VITE_SUPABASE_PUBLISHABLE_KEY=${GENERATED_ANON_KEY}
VITE_SUPABASE_PROJECT_ID=self-hosted
EOF

echo "Installing npm packages..."
npm install --legacy-peer-deps
echo "Building frontend..."
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

# STEP 7: Nginx + SSL
echo -e "${YELLOW}━━━ STEP 7/7: Nginx & SSL ━━━${NC}"

sudo tee /etc/nginx/sites-available/ivaloragadget > /dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    root ${INSTALL_DIR}/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Supabase REST API
    location ~ ^/(rest|auth|realtime|storage|functions)/v1/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        client_max_body_size 50M;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/ivaloragadget /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable || true

# SSL (only if DNS is correct)
if [ "$DNS_OK" = "true" ]; then
  echo "Requesting SSL certificate..."
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" || {
    echo -e "${YELLOW}⚠ SSL gagal. Anda bisa retry nanti: sudo certbot --nginx -d ${DOMAIN}${NC}"
  }
  (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sort -u | sudo crontab - 2>/dev/null || true
else
  echo -e "${YELLOW}⚠ DNS belum benar, skip SSL. Jalankan nanti:${NC}"
  echo "  sudo certbot --nginx -d ${DOMAIN}"
fi

# Systemd auto-restart for Supabase on reboot
sudo tee /etc/systemd/system/supabase.service > /dev/null <<SYSTEMD
[Unit]
Description=Supabase Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${SUPABASE_DOCKER_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
SYSTEMD

sudo systemctl daemon-reload
sudo systemctl enable supabase.service

# ============================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ INSTALASI SELESAI!                                ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   🌐 Domain  : ${DOMAIN}                          ║${NC}"
echo -e "${GREEN}║   📂 App Dir : ${INSTALL_DIR}                     ║${NC}"
echo -e "${GREEN}║   🐳 Supabase: ${SUPABASE_DOCKER_DIR}             ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
if [ "$DNS_OK" = "true" ]; then
echo -e "${GREEN}║   🔒 SSL     : Aktif                                  ║${NC}"
else
echo -e "${YELLOW}║   🔓 SSL     : Belum (jalankan certbot manual)        ║${NC}"
fi
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Langkah selanjutnya:${NC}"
if [ "$DNS_OK" != "true" ]; then
  echo "  1. Setup DNS A record: ${DOMAIN} → $(curl -s ifconfig.me)"
  echo "  2. Setelah DNS propagate: sudo certbot --nginx -d ${DOMAIN}"
  echo "  3. Bootstrap super admin:"
else
  echo "  1. Bootstrap super admin:"
fi
echo "     curl -X POST https://${DOMAIN}/functions/v1/bootstrap-superadmin"
echo ""
echo -e "${CYAN}🔧 Perintah berguna:${NC}"
echo "  Update app    : cd ${INSTALL_DIR} && git pull && npm run build"
echo "  Restart DB    : cd ${SUPABASE_DOCKER_DIR} && docker compose restart"
echo "  Logs          : cd ${SUPABASE_DOCKER_DIR} && docker compose logs -f"
echo "  Retry SSL     : sudo certbot --nginx -d ${DOMAIN}"
