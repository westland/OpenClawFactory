#!/usr/bin/env bash
# ============================================================
#  OpenClawFactory — Deploy to DigitalOcean Droplet
#  Usage: bash deploy.sh user@your-droplet-ip
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

REMOTE="${1:-}"
[[ -z "$REMOTE" ]] && error "Usage: bash deploy.sh user@your-droplet-ip"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_TMP="/tmp/openclaw-deploy"

info "Syncing files to $REMOTE:$REMOTE_TMP ..."
rsync -az --progress \
  --exclude '.git' \
  --exclude 'venv' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'data/' \
  --exclude 'logs/' \
  --exclude '.env' \
  "$SCRIPT_DIR/" "$REMOTE:$REMOTE_TMP/"

info "Running installer on remote..."
ssh "$REMOTE" "bash $REMOTE_TMP/install.sh"

info "Deploy complete."
