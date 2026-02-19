#!/usr/bin/env bash
# ============================================================
#  Ivalora Gadget — Self-Hosting Installer v2
#  Flexible domain, DNS check, resume-capable, robust
# ============================================================

set -eo pipefail

REPO_URL="https://github.com/portodit/ivaloragadget.git"
INSTALL_DIR="/opt/ivaloragadget"
SUPABASE_DOCKER_DIR="$INSTALL_DIR/supabase-docker"
STATE_FILE="/opt/ivaloragadget/.install-state"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   Ivalora Gadget — VPS Installer v2                  ║"
  echo "║   Resume-capable • Flexible domain • Auto JWT        ║"
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

save_state() {
  local step="$1"
  mkdir -p "$(dirname "$STATE_FILE")"
  cat > "$STATE_FILE" <<EOF
COMPLETED_STEP=${step}
DOMAIN=${DOMAIN:-}
SSL_EMAIL=${SSL_EMAIL:-}
JWT_SECRET=${JWT_SECRET:-}
PG_PASSWORD=${PG_PASSWORD:-}
GMAIL_USER=${GMAIL_USER:-}
GMAIL_PASS=${GMAIL_PASS:-}
RECAP_SITE=${RECAP_SITE:-}
RECAP_SECRET=${RECAP_SECRET:-}
SA_EMAIL=${SA_EMAIL:-}
SA_PASSWORD=${SA_PASSWORD:-}
GENERATED_ANON_KEY=${GENERATED_ANON_KEY:-}
GENERATED_SERVICE_KEY=${GENERATED_SERVICE_KEY:-}
DNS_OK=${DNS_OK:-false}
EOF
  chmod 600 "$STATE_FILE"
}

load_state() {
  if [ -f "$STATE_FILE" ]; then
    source "$STATE_FILE"
    return 0
  fi
  return 1
}

check_dns() {
  local domain="$1"
  local vps_ip
  vps_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")
  echo ""
  echo -e "${CYAN}── DNS Check: ${domain} ──${NC}"
  echo -e "IP VPS ini: ${GREEN}${vps_ip}${NC}"

  if command -v dig &>/dev/null; then
    local dns_ip
    dns_ip=$(dig +short "$domain" 2>/dev/null | head -1)
    if [ -z "$dns_ip" ]; then
      echo -e "${YELLOW}⚠ DNS A record untuk ${domain} belum ditemukan.${NC}"
    elif [ "$dns_ip" = "$vps_ip" ]; then
      echo -e "${GREEN}✓ DNS sudah benar! ${domain} → ${dns_ip}${NC}"
      DNS_OK=true
      return 0
    else
      echo -e "${YELLOW}⚠ DNS mengarah ke ${dns_ip}, bukan ke VPS ini (${vps_ip}).${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ 'dig' belum tersedia, skip DNS check.${NC}"
  fi

  echo ""
  read -p "Lanjut tanpa DNS? SSL akan di-skip. (y/n): " dns_continue
  if [[ ! "$dns_continue" =~ ^[Yy] ]]; then
    echo "Dibatalkan. Setup DNS dulu, lalu jalankan ulang script ini."
    exit 0
  fi
  DNS_OK=false
  return 1
}

generate_jwt_keys() {
  local jwt_secret="$1"
  local header payload signature exp
  header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  exp=$(( $(date +%s) + 315360000 ))

  payload=$(echo -n "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":${exp}}" | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  signature=$(echo -n "${header}.${payload}" | openssl dgst -sha256 -hmac "$jwt_secret" -binary | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  GENERATED_ANON_KEY="${header}.${payload}.${signature}"

  payload=$(echo -n "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":${exp}}" | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  signature=$(echo -n "${header}.${payload}" | openssl dgst -sha256 -hmac "$jwt_secret" -binary | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  GENERATED_SERVICE_KEY="${header}.${payload}.${signature}"
}

update_env() {
  local key="$1" value="$2" file="$SUPABASE_DOCKER_DIR/.env"
  local escaped_value
  escaped_value=$(printf '%s\n' "$value" | sed -e 's/[&/\]/\\&/g')
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$file"
  else
    echo "${key}=${escaped_value}" >> "$file"
  fi
}

# ============================================================
banner

# Check for previous progress
COMPLETED_STEP=0
DNS_OK=false

if load_state; then
  echo -e "${GREEN}📋 Progress sebelumnya ditemukan!${NC}"
  echo -e "   Domain       : ${DOMAIN:-belum diset}"
  echo -e "   Step terakhir: ${COMPLETED_STEP}/7"
  echo ""

  # Check what actually exists on disk to validate state
  DETECTED_STEP=0
  [ -d "$INSTALL_DIR/.git" ] && DETECTED_STEP=4
  [ -d "$SUPABASE_DOCKER_DIR" ] && DETECTED_STEP=4
  [ -f "$SUPABASE_DOCKER_DIR/.env" ] && DETECTED_STEP=5
  if docker compose -f "$SUPABASE_DOCKER_DIR/docker-compose.yml" ps 2>/dev/null | grep -q "running"; then
    DETECTED_STEP=5
  fi
  [ -d "$INSTALL_DIR/dist" ] && DETECTED_STEP=6
  [ -f "/etc/nginx/sites-available/ivaloragadget" ] && DETECTED_STEP=7

  if [ "$DETECTED_STEP" -gt "$COMPLETED_STEP" ]; then
    COMPLETED_STEP=$DETECTED_STEP
  fi

  echo -e "   Detected step: ${COMPLETED_STEP}/7 berdasarkan file yang ada"
  echo ""
  echo "Opsi:"
  echo "  1) Lanjutkan dari step $((COMPLETED_STEP + 1))"
  echo "  2) Mulai ulang dari awal"
  echo "  3) Pilih step tertentu"
  read -p "Pilih (1/2/3): " resume_choice

  case "$resume_choice" in
    2)
      COMPLETED_STEP=0
      rm -f "$STATE_FILE"
      echo "Memulai dari awal..."
      ;;
    3)
      read -p "Mulai dari step berapa? (1-7): " custom_step
      COMPLETED_STEP=$(( custom_step - 1 ))
      echo "Memulai dari step ${custom_step}..."
      ;;
    *)
      echo "Melanjutkan dari step $((COMPLETED_STEP + 1))..."
      ;;
  esac

  # If resuming and secrets exist, ask if want to re-enter
  if [ "$COMPLETED_STEP" -ge 2 ] && [ -n "${JWT_SECRET:-}" ]; then
    echo ""
    read -p "Secrets sudah ada dari sebelumnya. Ingin input ulang? (y/n): " reenter
    if [[ "$reenter" =~ ^[Yy] ]]; then
      COMPLETED_STEP=0
    fi
  fi
else
  echo -e "${CYAN}Instalasi baru.${NC}"
fi

# ============================================================
# STEP 1: Domain
# ============================================================
if [ "$COMPLETED_STEP" -lt 1 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 1/7: Konfigurasi Domain ━━━${NC}"
  prompt DOMAIN "Masukkan domain (contoh: iva.rextra.id): "
  check_dns "$DOMAIN" || true
  save_state 1
  echo -e "${GREEN}✓ Step 1 selesai${NC}"
fi

# ============================================================
# STEP 2: Secrets
# ============================================================
if [ "$COMPLETED_STEP" -lt 2 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 2/7: Input Secrets ━━━${NC}"
  echo -e "${CYAN}Semua credential ditanyakan sekarang sebelum instalasi.${NC}"
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

  # Generate JWT keys
  generate_jwt_keys "$JWT_SECRET"
  echo -e "${GREEN}✓ JWT keys generated${NC}"

  save_state 2
  echo -e "${GREEN}✓ Step 2 selesai${NC}"
fi

# ============================================================
# STEP 3: System dependencies
# ============================================================
if [ "$COMPLETED_STEP" -lt 3 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 3/7: Install Dependencies ━━━${NC}"

  sudo apt-get update -y
  sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx \
    apt-transport-https ca-certificates gnupg lsb-release openssl dnsutils postgresql-client

  if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
  else
    echo -e "${GREEN}  Docker sudah terinstall${NC}"
  fi

  if ! docker compose version &>/dev/null 2>&1; then
    sudo apt-get install -y docker-compose-plugin
  else
    echo -e "${GREEN}  Docker Compose sudah terinstall${NC}"
  fi

  if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo -e "${GREEN}  Node.js sudah terinstall ($(node -v))${NC}"
  fi

  save_state 3
  echo -e "${GREEN}✓ Step 3 selesai${NC}"
fi

# ============================================================
# STEP 4: Clone repo
# ============================================================
if [ "$COMPLETED_STEP" -lt 4 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 4/7: Clone Repository ━━━${NC}"

  if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Repo sudah ada, pulling latest..."
    cd "$INSTALL_DIR" && git pull origin main 2>/dev/null || git pull || true
  else
    [ -d "$INSTALL_DIR" ] && sudo rm -rf "$INSTALL_DIR"
    sudo git clone "$REPO_URL" "$INSTALL_DIR"
    sudo chown -R "$USER:$USER" "$INSTALL_DIR"
  fi
  cd "$INSTALL_DIR"

  # Re-save state (STATE_FILE is inside INSTALL_DIR)
  save_state 4
  echo -e "${GREEN}✓ Step 4 selesai${NC}"
fi

# ============================================================
# STEP 5: Supabase self-hosted
# ============================================================
if [ "$COMPLETED_STEP" -lt 5 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 5/7: Setup Supabase ━━━${NC}"

  if [ ! -d "$SUPABASE_DOCKER_DIR/docker-compose.yml" ] && [ ! -f "$SUPABASE_DOCKER_DIR/docker-compose.yml" ]; then
    echo "Downloading Supabase Docker (sparse checkout, ~5MB)..."
    cd /tmp && rm -rf supabase-docker-tmp
    git clone --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase.git supabase-docker-tmp
    cd supabase-docker-tmp
    git sparse-checkout set docker
    mkdir -p "$SUPABASE_DOCKER_DIR"
    cp -r docker/* "$SUPABASE_DOCKER_DIR/"
    cd /tmp && rm -rf supabase-docker-tmp
  else
    echo -e "${GREEN}  Supabase Docker files sudah ada${NC}"
  fi

  cd "$SUPABASE_DOCKER_DIR"

  # Ensure keys are generated
  if [ -z "${GENERATED_ANON_KEY:-}" ]; then
    generate_jwt_keys "$JWT_SECRET"
  fi

  cp -n .env.example .env 2>/dev/null || true

  update_env "POSTGRES_PASSWORD" "$PG_PASSWORD"
  update_env "JWT_SECRET" "$JWT_SECRET"
  update_env "ANON_KEY" "$GENERATED_ANON_KEY"
  update_env "SERVICE_ROLE_KEY" "$GENERATED_SERVICE_KEY"
  update_env "SITE_URL" "https://${DOMAIN}"
  update_env "API_EXTERNAL_URL" "https://${DOMAIN}"
  update_env "SUPABASE_PUBLIC_URL" "https://${DOMAIN}"
  update_env "GMAIL_USER" "$GMAIL_USER"
  update_env "GMAIL_APP_PASSWORD" "$GMAIL_PASS"
  update_env "RECAPTCHA_SITE_KEY" "$RECAP_SITE"
  update_env "RECAPTCHA_SECRET_KEY" "$RECAP_SECRET"
  update_env "BOOTSTRAP_SUPERADMIN_ENABLED" "true"
  update_env "BOOTSTRAP_SUPERADMIN_EMAIL" "$SA_EMAIL"
  update_env "BOOTSTRAP_SUPERADMIN_PASSWORD" "$SA_PASSWORD"

  echo "Starting Supabase containers..."
  docker compose pull
  docker compose up -d

  echo "Waiting for services (60s)..."
  sleep 60

  if curl -sf http://localhost:8000/rest/v1/ -H "apikey: $GENERATED_ANON_KEY" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Supabase is running${NC}"
  else
    echo -e "${YELLOW}⚠ Supabase mungkin masih starting, lanjut...${NC}"
  fi

  save_state 5
  echo -e "${GREEN}✓ Step 5 selesai${NC}"
fi

# ============================================================
# STEP 6: Migrations + Build
# ============================================================
if [ "$COMPLETED_STEP" -lt 6 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 6/7: Migrations & Build Frontend ━━━${NC}"

  cd "$INSTALL_DIR"

  echo "Applying database migrations..."
  for migration in supabase/migrations/*.sql; do
    [ -f "$migration" ] || continue
    echo "  → $(basename "$migration")"
    PGPASSWORD="$PG_PASSWORD" psql -h localhost -p 5432 -U postgres -d postgres -f "$migration" 2>&1 | tail -1 || true
  done
  echo -e "${GREEN}✓ Migrations applied${NC}"

  # Ensure keys exist
  if [ -z "${GENERATED_ANON_KEY:-}" ]; then
    generate_jwt_keys "$JWT_SECRET"
  fi

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

  save_state 6
  echo -e "${GREEN}✓ Step 6 selesai${NC}"
fi

# ============================================================
# STEP 7: Nginx + SSL
# ============================================================
if [ "$COMPLETED_STEP" -lt 7 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 7/7: Nginx & SSL ━━━${NC}"

  sudo tee /etc/nginx/sites-available/ivaloragadget > /dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    root ${INSTALL_DIR}/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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

  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  echo "y" | sudo ufw enable || true

  if [ "$DNS_OK" = "true" ]; then
    echo "Requesting SSL..."
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" || {
      echo -e "${YELLOW}⚠ SSL gagal. Retry: sudo certbot --nginx -d ${DOMAIN}${NC}"
    }
    (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sort -u | sudo crontab - 2>/dev/null || true
  else
    echo -e "${YELLOW}⚠ DNS belum benar, skip SSL.${NC}"
    echo "  Nanti jalankan: sudo certbot --nginx -d ${DOMAIN}"
  fi

  # Systemd service for auto-restart
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

  save_state 7
  echo -e "${GREEN}✓ Step 7 selesai${NC}"
fi

# ============================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ INSTALASI SELESAI!                                ║${NC}"
echo -e "${GREEN}║   🌐 ${DOMAIN}                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Langkah selanjutnya:${NC}"
if [ "${DNS_OK:-false}" != "true" ]; then
  echo "  1. DNS A record: ${DOMAIN} → $(curl -s ifconfig.me 2>/dev/null)"
  echo "  2. SSL: sudo certbot --nginx -d ${DOMAIN}"
fi
echo "  • Bootstrap admin: curl -X POST https://${DOMAIN}/functions/v1/bootstrap-superadmin"
echo "  • Update: cd ${INSTALL_DIR} && git pull && npm run build"
echo "  • Logs: cd ${SUPABASE_DOCKER_DIR} && docker compose logs -f"
echo ""
echo -e "${YELLOW}Untuk install ulang dari awal, hapus state: rm ${STATE_FILE}${NC}"
