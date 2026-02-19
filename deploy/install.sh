#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  Ivalora Gadget — One-Click VPS Deployment Script
#  Domain : iva.rextra.id
#  Stack  : Supabase self-hosted (Docker) + Nginx + Let's Encrypt
# ============================================================

DOMAIN="iva.rextra.id"
REPO_URL="https://github.com/portodit/ivaloragadget.git"
INSTALL_DIR="/opt/ivaloragadget"
SUPABASE_DIR="$INSTALL_DIR/supabase-docker"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║   Ivalora Gadget — VPS Deployment Installer      ║"
echo "║   Domain: ${DOMAIN}                              ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
# STEP 1: Collect ALL secrets upfront
# ============================================================
echo -e "${YELLOW}━━━ STEP 1/7: Input Konfigurasi & Secrets ━━━${NC}"
echo ""

read -p "Email untuk SSL (Let's Encrypt): " SSL_EMAIL

echo ""
echo -e "${CYAN}── Supabase Secrets ──${NC}"
echo "Buat JWT secret minimal 32 karakter (untuk signing tokens):"
read -p "JWT Secret: " JWT_SECRET

echo "Buat password untuk database PostgreSQL:"
read -sp "PostgreSQL Password: " POSTGRES_PASSWORD
echo ""

echo ""
echo -e "${CYAN}── Application Secrets ──${NC}"

read -p "Gmail Address (untuk kirim email): " GMAIL_USER
read -sp "Gmail App Password: " GMAIL_APP_PASSWORD
echo ""

read -p "reCAPTCHA Site Key: " RECAPTCHA_SITE_KEY
read -sp "reCAPTCHA Secret Key: " RECAPTCHA_SECRET_KEY
echo ""

echo ""
echo -e "${CYAN}── Bootstrap Super Admin ──${NC}"
read -p "Super Admin Email: " SUPERADMIN_EMAIL
read -sp "Super Admin Password: " SUPERADMIN_PASSWORD
echo ""

echo ""
echo -e "${GREEN}✓ Semua konfigurasi sudah diinput!${NC}"
echo ""

# ============================================================
# STEP 2: Install system dependencies
# ============================================================
echo -e "${YELLOW}━━━ STEP 2/7: Install System Dependencies ━━━${NC}"

sudo apt-get update -y
sudo apt-get install -y \
  curl git ufw nginx certbot python3-certbot-nginx \
  apt-transport-https ca-certificates gnupg lsb-release

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose plugin..."
  sudo apt-get install -y docker-compose-plugin
fi

# Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo -e "${GREEN}✓ System dependencies installed${NC}"

# ============================================================
# STEP 3: Clone repository
# ============================================================
echo -e "${YELLOW}━━━ STEP 3/7: Clone Repository ━━━${NC}"

if [ -d "$INSTALL_DIR" ]; then
  echo "Directory $INSTALL_DIR exists, pulling latest..."
  cd "$INSTALL_DIR" && git pull
else
  sudo git clone "$REPO_URL" "$INSTALL_DIR"
  sudo chown -R "$USER:$USER" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
echo -e "${GREEN}✓ Repository cloned${NC}"

# ============================================================
# STEP 4: Setup Supabase self-hosted
# ============================================================
echo -e "${YELLOW}━━━ STEP 4/7: Setup Supabase Self-Hosted ━━━${NC}"

if [ ! -d "$SUPABASE_DIR" ]; then
  git clone --depth 1 https://github.com/supabase/supabase.git /tmp/supabase-repo
  cp -r /tmp/supabase-repo/docker "$SUPABASE_DIR"
  rm -rf /tmp/supabase-repo
fi

cd "$SUPABASE_DIR"

# Copy example env and configure
cp -n .env.example .env 2>/dev/null || true

# Generate keys using JWT secret
ANON_KEY=$(docker run --rm -e JWT_SECRET="$JWT_SECRET" -e ROLE="anon" -e ISSUER="supabase" \
  ghcr.io/supabase/gotrue:v2 generate-keys 2>/dev/null || echo "generate-manually")

SERVICE_ROLE_KEY=$(docker run --rm -e JWT_SECRET="$JWT_SECRET" -e ROLE="service_role" -e ISSUER="supabase" \
  ghcr.io/supabase/gotrue:v2 generate-keys 2>/dev/null || echo "generate-manually")

# If auto-generation failed, use openssl
if [ "$ANON_KEY" = "generate-manually" ]; then
  echo -e "${YELLOW}Auto key generation not available, using jwt.io method...${NC}"
  echo -e "${YELLOW}You will need to generate keys manually at https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys${NC}"
  echo ""
  read -p "Paste ANON_KEY: " ANON_KEY
  read -p "Paste SERVICE_ROLE_KEY: " SERVICE_ROLE_KEY
fi

# Update .env file
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|g" .env
sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|g" .env
sed -i "s|ANON_KEY=.*|ANON_KEY=${ANON_KEY}|g" .env
sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}|g" .env
sed -i "s|SITE_URL=.*|SITE_URL=https://${DOMAIN}|g" .env
sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://${DOMAIN}/api|g" .env

# Add application-specific env vars
cat >> .env <<EOF

# ── Ivalora Application Secrets ──
GMAIL_USER=${GMAIL_USER}
GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD}
RECAPTCHA_SITE_KEY=${RECAPTCHA_SITE_KEY}
RECAPTCHA_SECRET_KEY=${RECAPTCHA_SECRET_KEY}
BOOTSTRAP_SUPERADMIN_ENABLED=true
BOOTSTRAP_SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL}
BOOTSTRAP_SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD}
EOF

# Start Supabase
echo "Starting Supabase services..."
docker compose up -d

# Wait for services to be healthy
echo "Waiting for Supabase to be ready..."
sleep 30

SUPABASE_URL="http://localhost:8000"
echo -e "${GREEN}✓ Supabase is running at ${SUPABASE_URL}${NC}"

# ============================================================
# STEP 5: Apply database migrations
# ============================================================
echo -e "${YELLOW}━━━ STEP 5/7: Apply Database Migrations ━━━${NC}"

cd "$INSTALL_DIR"

DB_URL="postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres"

# Apply migrations in order
for migration in supabase/migrations/*.sql; do
  if [ -f "$migration" ]; then
    echo "Applying: $(basename "$migration")"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p 5432 -U postgres -d postgres -f "$migration" 2>&1 || {
      echo -e "${YELLOW}⚠ Warning on $(basename "$migration"), continuing...${NC}"
    }
  fi
done

echo -e "${GREEN}✓ Database migrations applied${NC}"

# ============================================================
# STEP 6: Build frontend
# ============================================================
echo -e "${YELLOW}━━━ STEP 6/7: Build Frontend ━━━${NC}"

cd "$INSTALL_DIR"

# Create production .env for Vite
cat > .env.production <<EOF
VITE_SUPABASE_URL=https://${DOMAIN}/api
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=self-hosted
EOF

npm install
npm run build

echo -e "${GREEN}✓ Frontend built${NC}"

# ============================================================
# STEP 7: Configure Nginx + SSL
# ============================================================
echo -e "${YELLOW}━━━ STEP 7/7: Configure Nginx + SSL ━━━${NC}"

# Create nginx config
sudo tee /etc/nginx/sites-available/ivaloragadget > /dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend (static files)
    root ${INSTALL_DIR}/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Supabase API proxy
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Edge Functions proxy
    location /functions/v1/ {
        proxy_pass http://localhost:8000/functions/v1/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Storage proxy
    location /storage/v1/ {
        proxy_pass http://localhost:8000/storage/v1/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50M;
    }

    # Auth proxy
    location /auth/v1/ {
        proxy_pass http://localhost:8000/auth/v1/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

# Enable site
sudo ln -sf /etc/nginx/sites-available/ivaloragadget /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# SSL with Let's Encrypt
echo "Requesting SSL certificate..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL"

# Auto-renew cron
(sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sudo crontab - 2>/dev/null || true

echo -e "${GREEN}✓ Nginx configured with SSL${NC}"

# ============================================================
# DONE!
# ============================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DEPLOYMENT COMPLETE!                        ║${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║   🌐 App    : https://${DOMAIN}            ║${NC}"
echo -e "${GREEN}║   🔧 API    : https://${DOMAIN}/api        ║${NC}"
echo -e "${GREEN}║   📂 Folder : ${INSTALL_DIR}               ║${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║   Jalankan bootstrap super admin:                ║${NC}"
echo -e "${GREEN}║   curl -X POST https://${DOMAIN}/functions/v1/bootstrap-superadmin ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📝 CATATAN PENTING:${NC}"
echo "1. Pastikan DNS A record untuk ${DOMAIN} sudah mengarah ke IP VPS ini"
echo "2. Untuk update: cd ${INSTALL_DIR} && git pull && npm run build"
echo "3. Untuk restart Supabase: cd ${SUPABASE_DIR} && docker compose restart"
echo "4. Logs: docker compose -f ${SUPABASE_DIR}/docker-compose.yml logs -f"
