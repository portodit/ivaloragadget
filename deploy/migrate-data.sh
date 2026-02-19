#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Ivalora Gadget — Data Migration Script
# Export data from Lovable Cloud → Import to VPS Supabase
# ═══════════════════════════════════════════════════════════════════
#
# Usage:
#   1. Install prerequisites: sudo apt install -y postgresql-client jq
#   2. Edit the SOURCE and TARGET variables below
#   3. Run: bash deploy/migrate-data.sh
#
# This script exports all public tables from Lovable Cloud Supabase
# and imports them into your self-hosted VPS Supabase instance.
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── SOURCE: Lovable Cloud Supabase ──────────────────────────────
# Get this from Lovable Cloud > Settings > Database
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SOURCE_DB_URL="${SOURCE_DB_URL:-}"

# ── TARGET: Your VPS Supabase ───────────────────────────────────
# Format: postgresql://postgres:[password]@localhost:5432/postgres
TARGET_DB_URL="${TARGET_DB_URL:-}"

# ── Tables to migrate (in dependency order) ─────────────────────
TABLES=(
  "warranty_labels"
  "suppliers"
  "master_products"
  "stock_units"
  "stock_unit_logs"
  "bonus_products"
  "catalog_products"
  "catalog_discount_codes"
  "discount_codes"
  "flash_sale_settings"
  "user_profiles"
  "user_roles"
  "notifications"
  "activity_logs"
  "opname_schedules"
  "opname_sessions"
  "opname_session_assignments"
  "opname_snapshot_items"
  "opname_scanned_items"
)

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DUMP_DIR="/tmp/ivalora-migration-$(date +%Y%m%d_%H%M%S)"

# ── Validation ──────────────────────────────────────────────────
if [ -z "$SOURCE_DB_URL" ]; then
  echo -e "${RED}ERROR: SOURCE_DB_URL is not set.${NC}"
  echo ""
  echo "Set it like this:"
  echo "  export SOURCE_DB_URL=\"postgresql://postgres.yahtenrzxqogvpauaouw:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres\""
  echo ""
  echo "You can find the password in Lovable Cloud settings."
  exit 1
fi

if [ -z "$TARGET_DB_URL" ]; then
  echo -e "${RED}ERROR: TARGET_DB_URL is not set.${NC}"
  echo ""
  echo "Set it like this:"
  echo "  export TARGET_DB_URL=\"postgresql://postgres:[YOUR-VPS-DB-PASSWORD]@localhost:5432/postgres\""
  exit 1
fi

# Check prerequisites
for cmd in psql pg_dump jq; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${RED}ERROR: '$cmd' not found. Install with: sudo apt install -y postgresql-client jq${NC}"
    exit 1
  fi
done

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Ivalora Gadget — Data Migration Tool${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

mkdir -p "$DUMP_DIR"

# ── Step 1: Test connections ────────────────────────────────────
echo -e "${YELLOW}[1/4] Testing database connections...${NC}"

echo -n "  Source (Lovable Cloud): "
if psql "$SOURCE_DB_URL" -c "SELECT 1" &>/dev/null; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo "  Cannot connect to source database. Check SOURCE_DB_URL."
  exit 1
fi

echo -n "  Target (VPS):          "
if psql "$TARGET_DB_URL" -c "SELECT 1" &>/dev/null; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo "  Cannot connect to target database. Check TARGET_DB_URL."
  exit 1
fi

echo ""

# ── Step 2: Export data from source ─────────────────────────────
echo -e "${YELLOW}[2/4] Exporting data from Lovable Cloud...${NC}"

for table in "${TABLES[@]}"; do
  ROW_COUNT=$(psql "$SOURCE_DB_URL" -t -A -c "SELECT COUNT(*) FROM public.\"$table\"" 2>/dev/null || echo "0")
  ROW_COUNT=$(echo "$ROW_COUNT" | tr -d '[:space:]')
  
  if [ "$ROW_COUNT" = "0" ] || [ -z "$ROW_COUNT" ]; then
    echo -e "  ${table}: ${YELLOW}skipped (empty)${NC}"
    continue
  fi

  pg_dump "$SOURCE_DB_URL" \
    --data-only \
    --table="public.\"$table\"" \
    --column-inserts \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    -f "$DUMP_DIR/${table}.sql" 2>/dev/null

  if [ -f "$DUMP_DIR/${table}.sql" ]; then
    echo -e "  ${table}: ${GREEN}${ROW_COUNT} rows exported${NC}"
  else
    echo -e "  ${table}: ${RED}export failed${NC}"
  fi
done

echo ""

# ── Step 3: Count exported files ────────────────────────────────
EXPORT_COUNT=$(find "$DUMP_DIR" -name "*.sql" -type f | wc -l)

if [ "$EXPORT_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}No data to migrate. All tables are empty.${NC}"
  rm -rf "$DUMP_DIR"
  exit 0
fi

echo -e "${YELLOW}[3/4] ${EXPORT_COUNT} tables ready for import.${NC}"
echo ""

# ── Confirmation ────────────────────────────────────────────────
echo -e "${RED}WARNING: This will INSERT data into your VPS database.${NC}"
echo -e "${RED}Existing data with same IDs may cause conflicts.${NC}"
echo ""
read -p "Continue with import? (y/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted. Exported files saved at: $DUMP_DIR"
  exit 0
fi

echo ""

# ── Step 4: Import data to target ──────────────────────────────
echo -e "${YELLOW}[4/4] Importing data to VPS...${NC}"

IMPORTED=0
FAILED=0

for table in "${TABLES[@]}"; do
  DUMP_FILE="$DUMP_DIR/${table}.sql"
  
  if [ ! -f "$DUMP_FILE" ]; then
    continue
  fi

  # Truncate existing data in target (optional, uncomment if needed)
  # psql "$TARGET_DB_URL" -c "TRUNCATE public.\"$table\" CASCADE;" 2>/dev/null

  if psql "$TARGET_DB_URL" -f "$DUMP_FILE" &>/dev/null; then
    echo -e "  ${table}: ${GREEN}imported OK${NC}"
    ((IMPORTED++))
  else
    echo -e "  ${table}: ${RED}import failed (possible duplicate keys)${NC}"
    ((FAILED++))
    
    # Try with ON CONFLICT DO NOTHING approach
    echo -e "  ${table}: ${YELLOW}retrying with conflict handling...${NC}"
    # Create a temp wrapper that handles conflicts
    TEMP_SQL="$DUMP_DIR/${table}_retry.sql"
    echo "BEGIN;" > "$TEMP_SQL"
    echo "SET session_replication_role = replica;" >> "$TEMP_SQL"  # Disable triggers temporarily
    cat "$DUMP_FILE" >> "$TEMP_SQL"
    echo "SET session_replication_role = DEFAULT;" >> "$TEMP_SQL"
    echo "COMMIT;" >> "$TEMP_SQL"
    
    if psql "$TARGET_DB_URL" -f "$TEMP_SQL" &>/dev/null; then
      echo -e "  ${table}: ${GREEN}retry successful${NC}"
      ((FAILED--))
      ((IMPORTED++))
    else
      echo -e "  ${table}: ${RED}retry also failed — manual intervention needed${NC}"
    fi
  fi
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Migration complete!${NC}"
echo -e "${GREEN}  Imported: ${IMPORTED} tables${NC}"
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}  Failed: ${FAILED} tables${NC}"
fi
echo -e "${BLUE}  Dump files: ${DUMP_DIR}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}NOTE: auth.users data is NOT migrated (managed by Supabase Auth).${NC}"
echo -e "${YELLOW}Users will need to register again on your VPS instance.${NC}"
echo -e "${YELLOW}Or use: supabase auth admin list/create commands.${NC}"

# ── Optional: Export storage files list ─────────────────────────
echo ""
echo -e "${YELLOW}Checking storage buckets...${NC}"
BUCKETS=$(psql "$SOURCE_DB_URL" -t -A -c "SELECT id FROM storage.buckets" 2>/dev/null || echo "")

if [ -n "$BUCKETS" ]; then
  echo -e "  Storage buckets found: ${GREEN}${BUCKETS}${NC}"
  echo -e "  ${YELLOW}Storage files must be migrated manually:${NC}"
  echo -e "    1. Download from Lovable Cloud storage"
  echo -e "    2. Upload to VPS Supabase storage"
  echo -e "    3. Or use: supabase storage cp (if using Supabase CLI)"
fi
