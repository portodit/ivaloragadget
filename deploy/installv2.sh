#!/usr/bin/env bash
# ============================================================
#  Ivalora Gadget — Self-Hosting Installer v3.1
#  Fully automated • Self-hosted Supabase • Resume-capable
#  Fix: IP public fallback, bash local scope, docker group
# ============================================================

set -eo pipefail

# ============================================================
# HARDCODED CONFIG
# ============================================================
REPO_URL="https://github.com/portodit/ivaloragadget.git"
DOMAIN="iva.rextra.id"
SSL_EMAIL="bliaditdev@gmail.com"
GMAIL_USER="bliaditdev@gmail.com"
GMAIL_PASS="rjpd hmzv qlob ynjo"
RECAP_SITE="6LcOQHAsAAAAAJwvDERjZ1ENHH4asFN5_TKlkQo_"
RECAP_SECRET="6LcOQHAsAAAAAGwqh0Js-B003_PyHa_CEExM117d"
SA_EMAIL="bliaditdev@gmail.com"
SA_PASSWORD="mafialamongan123"

# ============================================================
INSTALL_DIR="/opt/ivaloragadget"
SUPABASE_DOCKER_DIR="$INSTALL_DIR/supabase-docker"
STATE_FILE="/var/lib/ivaloragadget-install-state"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log_ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }
log_warn() { echo -e "${YELLOW}  ⚠ $*${NC}"; }
log_info() { echo -e "${CYAN}  → $*${NC}"; }
log_err()  { echo -e "${RED}  ✗ $*${NC}"; }

# ============================================================
# STATE
# ============================================================
save_state() {
  mkdir -p "$(dirname "$STATE_FILE")"
  cat > "$STATE_FILE" <<EOF
COMPLETED_STEP=$1
JWT_SECRET=${JWT_SECRET:-}
PG_PASSWORD=${PG_PASSWORD:-}
GENERATED_ANON_KEY=${GENERATED_ANON_KEY:-}
GENERATED_SERVICE_KEY=${GENERATED_SERVICE_KEY:-}
DNS_OK=${DNS_OK:-false}
VPS_IP=${VPS_IP:-}
EOF
  chmod 600 "$STATE_FILE"
}

load_state() {
  [ -f "$STATE_FILE" ] && source "$STATE_FILE" && return 0
  return 1
}

# ============================================================
# SECRETS
# ============================================================
generate_secrets() {
  if [ -z "${JWT_SECRET:-}" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    log_ok "JWT Secret generated"
  fi
  if [ -z "${PG_PASSWORD:-}" ]; then
    PG_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
    log_ok "PostgreSQL password generated"
  fi
}

generate_jwt_keys() {
  local secret="$1"
  local header payload signature exp
  header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  exp=$(( $(date +%s) + 315360000 ))

  payload=$(echo -n "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":${exp}}" \
    | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  signature=$(echo -n "${header}.${payload}" \
    | openssl dgst -sha256 -hmac "$secret" -binary | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  GENERATED_ANON_KEY="${header}.${payload}.${signature}"

  payload=$(echo -n "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":${exp}}" \
    | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  signature=$(echo -n "${header}.${payload}" \
    | openssl dgst -sha256 -hmac "$secret" -binary | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  GENERATED_SERVICE_KEY="${header}.${payload}.${signature}"
  log_ok "JWT keys generated"
}

# ============================================================
# UPDATE ENV HELPER
# ============================================================
update_env() {
  local key="$1" value="$2" file="$3"
  local escaped_value
  escaped_value=$(printf '%s\n' "$value" | sed -e 's/[&/\]/\\&/g')
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$file"
  else
    echo "${key}=${escaped_value}" >> "$file"
  fi
}

# ============================================================
# DNS CHECK
# ============================================================
check_dns() {
  VPS_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null \
        || curl -s --max-time 5 icanhazip.com 2>/dev/null \
        || echo "unknown")
  log_info "IP VPS ini: ${VPS_IP}"

  DNS_OK=false
  if command -v dig &>/dev/null; then
    local dns_ip
    dns_ip=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
    if [ "$dns_ip" = "$VPS_IP" ]; then
      log_ok "DNS OK: ${DOMAIN} → ${dns_ip}"
      DNS_OK=true
    else
      log_warn "DNS belum pointing ke VPS ini (${VPS_IP}). DNS saat ini: ${dns_ip:-tidak ditemukan}"
      log_warn "Website tetap bisa diakses via IP: http://${VPS_IP}"
    fi
  else
    log_warn "'dig' tidak tersedia, skip DNS check. IP: ${VPS_IP}"
  fi
}

# ============================================================
# WAIT HELPERS — global vars, bukan local (fix bash scope bug)
# ============================================================
wait_supabase() {
  log_info "Menunggu Supabase REST API siap (max 3 menit)..."
  SUPA_RETRIES=0
  until curl -sf http://localhost:8000/rest/v1/ -H "apikey: $GENERATED_ANON_KEY" > /dev/null 2>&1; do
    SUPA_RETRIES=$(( SUPA_RETRIES + 1 ))
    if [ "$SUPA_RETRIES" -ge 36 ]; then
      log_warn "Supabase belum merespons setelah 3 menit, lanjut..."
      return 1
    fi
    echo -n "."
    sleep 5
  done
  echo ""
  log_ok "Supabase siap!"
}

wait_postgres() {
  log_info "Menunggu PostgreSQL siap (max 2 menit)..."
  PG_RETRIES=0
  until PGPASSWORD="$PG_PASSWORD" psql -h localhost -p 5432 -U postgres -d postgres \
        -c "SELECT 1" > /dev/null 2>&1; do
    PG_RETRIES=$(( PG_RETRIES + 1 ))
    if [ "$PG_RETRIES" -ge 24 ]; then
      log_err "PostgreSQL tidak merespons setelah 2 menit!"
      exit 1
    fi
    echo -n "."
    sleep 5
  done
  echo ""
  log_ok "PostgreSQL siap!"
}

# ============================================================
# NGINX CONFIG — support BOTH IP publik DAN domain
# ============================================================
write_nginx_config() {
  local vps_ip="$1"
  sudo tee /etc/nginx/sites-available/ivaloragadget > /dev/null <<NGINX
# ── Akses via IP publik (sementara sebelum DNS siap) ──
server {
    listen 80 default_server;
    server_name ${vps_ip} _;

    root ${INSTALL_DIR}/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss;

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

# ── Akses via domain (aktif setelah DNS pointing) ──
server {
    listen 80;
    server_name ${DOMAIN};

    root ${INSTALL_DIR}/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss;

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
}

# ============================================================
# BANNER
# ============================================================
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Ivalora Gadget — VPS Installer v3.1                ║"
echo "║   Fully Automated • Akses via IP & Domain            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Init semua variabel
COMPLETED_STEP=0
DNS_OK=false
JWT_SECRET=""
PG_PASSWORD=""
GENERATED_ANON_KEY=""
GENERATED_SERVICE_KEY=""
VPS_IP=""

if load_state; then
  echo -e "${GREEN}📋 Progress sebelumnya ditemukan (Step ${COMPLETED_STEP}/7)${NC}"
  echo ""
  echo "  1) Lanjutkan dari step $((COMPLETED_STEP + 1))"
  echo "  2) Mulai ulang dari awal"
  echo "  3) Pilih step tertentu"
  read -p "Pilih (1/2/3) [1]: " resume_choice </dev/tty
  resume_choice="${resume_choice:-1}"

  case "$resume_choice" in
    2)
      COMPLETED_STEP=0
      JWT_SECRET=""; PG_PASSWORD=""
      GENERATED_ANON_KEY=""; GENERATED_SERVICE_KEY=""
      rm -f "$STATE_FILE"
      log_info "Mulai dari awal..."
      ;;
    3)
      read -p "Mulai dari step berapa? (1-7): " custom_step </dev/tty
      COMPLETED_STEP=$(( custom_step - 1 ))
      log_info "Mulai dari step ${custom_step}..."
      ;;
    *)
      log_info "Melanjutkan dari step $((COMPLETED_STEP + 1))..."
      ;;
  esac
else
  log_info "Instalasi baru."
fi

# ============================================================
# STEP 1: Generate secrets
# ============================================================
if [ "$COMPLETED_STEP" -lt 1 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 1/7: Generate Secrets ━━━${NC}"
  generate_secrets
  generate_jwt_keys "$JWT_SECRET"
  save_state 1
  log_ok "Step 1 selesai"
fi

# Pastikan secrets selalu tersedia saat resume dari step lebih tinggi
[ -z "${JWT_SECRET:-}" ]         && generate_secrets
[ -z "${GENERATED_ANON_KEY:-}" ] && generate_jwt_keys "$JWT_SECRET"

# ============================================================
# STEP 2: DNS + IP check
# ============================================================
if [ "$COMPLETED_STEP" -lt 2 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 2/7: DNS & IP Check ━━━${NC}"
  check_dns
  save_state 2
  log_ok "Step 2 selesai"
fi

[ -z "${VPS_IP:-}" ] && VPS_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "unknown")

# ============================================================
# STEP 3: Install dependencies
# ============================================================
if [ "$COMPLETED_STEP" -lt 3 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 3/7: Install Dependencies ━━━${NC}"

  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -y
  sudo apt-get install -y \
    curl git ufw nginx certbot python3-certbot-nginx \
    apt-transport-https ca-certificates gnupg lsb-release \
    openssl dnsutils postgresql-client

  if ! command -v docker &>/dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER" || true
    log_ok "Docker installed"
  else
    log_ok "Docker sudah ada: $(docker --version | head -1)"
  fi

  # Selalu pakai sudo untuk docker compose supaya tidak ada masalah group
  if ! sudo docker compose version &>/dev/null 2>&1; then
    sudo apt-get install -y docker-compose-plugin
    log_ok "Docker Compose plugin installed"
  else
    log_ok "Docker Compose sudah ada"
  fi

  if ! command -v node &>/dev/null; then
    log_info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log_ok "Node.js installed: $(node -v)"
  else
    log_ok "Node.js sudah ada: $(node -v)"
  fi

  save_state 3
  log_ok "Step 3 selesai"
fi

# ============================================================
# STEP 4: Clone repo
# ============================================================
if [ "$COMPLETED_STEP" -lt 4 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 4/7: Clone Repository ━━━${NC}"

  if [ -d "$INSTALL_DIR/.git" ]; then
    log_info "Repo sudah ada, update ke latest..."
    cd "$INSTALL_DIR"
    git pull origin main 2>/dev/null || git pull || true
  else
    [ -d "$INSTALL_DIR" ] && sudo rm -rf "$INSTALL_DIR"
    sudo git clone "$REPO_URL" "$INSTALL_DIR"
    sudo chown -R "$USER:$USER" "$INSTALL_DIR"
  fi

  log_ok "Repo ready di $INSTALL_DIR"
  save_state 4
  log_ok "Step 4 selesai"
fi

# ============================================================
# STEP 5: Setup Supabase self-hosted
# ============================================================
if [ "$COMPLETED_STEP" -lt 5 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 5/7: Setup Supabase Self-Hosted ━━━${NC}"

  if [ ! -f "$SUPABASE_DOCKER_DIR/docker-compose.yml" ]; then
    log_info "Downloading Supabase Docker files..."
    cd /tmp && rm -rf supabase-docker-tmp
    git clone --depth 1 --filter=blob:none --sparse \
      https://github.com/supabase/supabase.git supabase-docker-tmp
    cd supabase-docker-tmp
    git sparse-checkout set docker
    mkdir -p "$SUPABASE_DOCKER_DIR"
    cp -r docker/* "$SUPABASE_DOCKER_DIR/"
    cd /tmp && rm -rf supabase-docker-tmp
    log_ok "Supabase Docker files downloaded"
  else
    log_ok "Supabase Docker files sudah ada"
  fi

  cd "$SUPABASE_DOCKER_DIR"
  [ ! -f ".env" ] && cp .env.example .env

  update_env "POSTGRES_PASSWORD"              "$PG_PASSWORD"           ".env"
  update_env "JWT_SECRET"                     "$JWT_SECRET"            ".env"
  update_env "ANON_KEY"                       "$GENERATED_ANON_KEY"    ".env"
  update_env "SERVICE_ROLE_KEY"               "$GENERATED_SERVICE_KEY" ".env"
  update_env "SITE_URL"                       "https://${DOMAIN}"      ".env"
  update_env "API_EXTERNAL_URL"               "https://${DOMAIN}"      ".env"
  update_env "SUPABASE_PUBLIC_URL"            "https://${DOMAIN}"      ".env"
  update_env "SMTP_ADMIN_EMAIL"               "$GMAIL_USER"            ".env"
  update_env "SMTP_HOST"                      "smtp.gmail.com"         ".env"
  update_env "SMTP_PORT"                      "587"                    ".env"
  update_env "SMTP_USER"                      "$GMAIL_USER"            ".env"
  update_env "SMTP_PASS"                      "$GMAIL_PASS"            ".env"
  update_env "SMTP_SENDER_NAME"               "Ivalora Gadget"         ".env"
  update_env "RECAPTCHA_SITE_KEY"             "$RECAP_SITE"            ".env"
  update_env "RECAPTCHA_SECRET_KEY"           "$RECAP_SECRET"          ".env"
  update_env "BOOTSTRAP_SUPERADMIN_ENABLED"   "true"                   ".env"
  update_env "BOOTSTRAP_SUPERADMIN_EMAIL"     "$SA_EMAIL"              ".env"
  update_env "BOOTSTRAP_SUPERADMIN_PASSWORD"  "$SA_PASSWORD"           ".env"

  log_info "Pulling Supabase images (butuh waktu ~5-15 menit tergantung koneksi)..."
  sudo docker compose pull

  log_info "Starting Supabase containers..."
  sudo docker compose up -d

  wait_supabase || true

  save_state 5
  log_ok "Step 5 selesai"
fi

# ============================================================
# STEP 6: Migrations + Build Frontend
# ============================================================
if [ "$COMPLETED_STEP" -lt 6 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 6/7: Migrations & Build Frontend ━━━${NC}"

  cd "$INSTALL_DIR"

  wait_postgres

  log_info "Applying database migrations..."
  MIGRATION_COUNT=0
  for migration in supabase/migrations/*.sql; do
    [ -f "$migration" ] || continue
    log_info "  → $(basename "$migration")"
    PGPASSWORD="$PG_PASSWORD" psql -h localhost -p 5432 -U postgres -d postgres \
      -f "$migration" 2>&1 | grep -iE "^ERROR" || true
    MIGRATION_COUNT=$(( MIGRATION_COUNT + 1 ))
  done
  log_ok "${MIGRATION_COUNT} migration(s) applied"

  # .env untuk development/test via IP (tanpa SSL)
  cat > "$INSTALL_DIR/.env" <<EOF
VITE_SUPABASE_URL=http://${VPS_IP}
VITE_SUPABASE_PUBLISHABLE_KEY=${GENERATED_ANON_KEY}
VITE_SUPABASE_PROJECT_ID=self-hosted
EOF

  # .env.production untuk build — pakai domain dengan HTTPS
  cat > "$INSTALL_DIR/.env.production" <<EOF
VITE_SUPABASE_URL=https://${DOMAIN}
VITE_SUPABASE_PUBLISHABLE_KEY=${GENERATED_ANON_KEY}
VITE_SUPABASE_PROJECT_ID=self-hosted
EOF

  log_ok ".env (IP) dan .env.production (domain) ditulis"

  log_info "Installing npm packages..."
  npm install --legacy-peer-deps

  log_info "Building frontend (menggunakan .env.production)..."
  npm run build

  log_ok "Frontend built di $INSTALL_DIR/dist"
  save_state 6
  log_ok "Step 6 selesai"
fi

# ============================================================
# STEP 7: Nginx + SSL
# ============================================================
if [ "$COMPLETED_STEP" -lt 7 ]; then
  echo ""
  echo -e "${YELLOW}━━━ STEP 7/7: Nginx & SSL ━━━${NC}"

  [ -z "${VPS_IP:-}" ] && VPS_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "unknown")

  write_nginx_config "$VPS_IP"

  sudo ln -sf /etc/nginx/sites-available/ivaloragadget /etc/nginx/sites-enabled/ivaloragadget
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  log_ok "Nginx configured"
  log_ok "Website langsung bisa diakses: http://${VPS_IP}"

  # Firewall
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  echo "y" | sudo ufw enable 2>/dev/null || true
  log_ok "Firewall: port 22, 80, 443 dibuka"

  # SSL
  if [ "$DNS_OK" = "true" ]; then
    log_info "Requesting SSL certificate untuk ${DOMAIN}..."
    sudo certbot --nginx -d "$DOMAIN" \
      --non-interactive --agree-tos -m "$SSL_EMAIL" \
      && log_ok "SSL installed! https://${DOMAIN} aktif" \
      || log_warn "SSL gagal. Coba manual: sudo certbot --nginx -d ${DOMAIN} -m ${SSL_EMAIL} --agree-tos --non-interactive"

    (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") \
      | sort -u | sudo crontab - 2>/dev/null || true
    log_ok "SSL auto-renew scheduled"
  else
    log_warn "DNS belum pointing ke VPS, SSL di-skip."
    log_info "Setelah DNS update, jalankan:"
    log_info "  sudo certbot --nginx -d ${DOMAIN} -m ${SSL_EMAIL} --agree-tos --non-interactive"
  fi

  # Systemd service
  sudo tee /etc/systemd/system/supabase.service > /dev/null <<SYSTEMD
[Unit]
Description=Supabase Self-Hosted (Docker Compose)
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${SUPABASE_DOCKER_DIR}
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=120
Restart=on-failure

[Install]
WantedBy=multi-user.target
SYSTEMD

  sudo systemctl daemon-reload
  sudo systemctl enable supabase.service
  log_ok "Supabase systemd service enabled (auto-start on reboot)"

  save_state 7
  log_ok "Step 7 selesai"
fi

# ============================================================
# SELESAI
# ============================================================
[ -z "${VPS_IP:-}" ] && VPS_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "unknown")

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  INSTALASI SELESAI!                                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}  Akses website:${NC}"
echo -e "    🌐 Via IP publik  → ${GREEN}http://${VPS_IP}${NC}     ← LANGSUNG BISA SEKARANG"
echo -e "    🌐 Via Domain     → ${GREEN}http://${DOMAIN}${NC}  ← setelah DNS pointing"
echo -e "    🔒 Via HTTPS      → ${GREEN}https://${DOMAIN}${NC} ← setelah SSL install"
echo ""

if [ "$DNS_OK" != "true" ]; then
  echo -e "${YELLOW}  ⚠ DNS BELUM SIAP — langkah selanjutnya:${NC}"
  echo -e "     1. Tambahkan DNS A record: ${DOMAIN} → ${VPS_IP}"
  echo -e "     2. Tunggu propagasi DNS (5–30 menit)"
  echo -e "     3. Install SSL:"
  echo -e "        sudo certbot --nginx -d ${DOMAIN} -m ${SSL_EMAIL} --agree-tos --non-interactive"
  echo ""
fi

echo -e "${CYAN}  Perintah berguna:${NC}"
echo -e "    Bootstrap superadmin : curl -X POST http://${VPS_IP}/functions/v1/bootstrap-superadmin"
echo -e "    Update app           : cd ${INSTALL_DIR} && git pull && npm run build"
echo -e "    Supabase logs        : cd ${SUPABASE_DOCKER_DIR} && sudo docker compose logs -f"
echo -e "    Status container     : cd ${SUPABASE_DOCKER_DIR} && sudo docker compose ps"
echo -e "    Restart Supabase     : sudo systemctl restart supabase"
echo ""
echo -e "${YELLOW}  Install ulang dari awal: sudo rm ${STATE_FILE} && sudo bash install.sh${NC}"
echo ""
