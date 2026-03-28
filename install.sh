#!/usr/bin/env bash
# ============================================================
#  OpenClawFactory — Server Installer
#  Tested on Ubuntu 22.04 / 24.04 LTS (DigitalOcean)
#  Run as root:  bash install.sh
# ============================================================
set -euo pipefail

INSTALL_DIR="/opt/openclaw-factory"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }
ask()   { echo -e "${YELLOW}[?]${NC} $*"; }

echo ""
echo "  ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗██╗      █████╗ ██╗    ██╗"
echo "  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║     ██╔══██╗██║    ██║"
echo "  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║     ███████║██║ █╗ ██║"
echo "  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║     ██╔══██║██║███╗██║"
echo "  ╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗███████╗██║  ██║╚███╔███╔╝"
echo "   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝"
echo "  OpenClawFactory — Installer"
echo ""

[[ $EUID -ne 0 ]] && error "Please run as root: sudo bash install.sh"

# ---- Step 1: System packages ----
info "Updating system and installing packages..."
apt-get update -qq
apt-get install -y -qq \
  python3 python3-pip python3-venv \
  nodejs npm \
  nginx \
  curl rsync git \
  libnss3 nss-plugin-pem   # required by open-interpreter's browser tools

# Install Node 20 LTS if current version is too old
NODE_VER=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "${NODE_VER:-0}" -lt 18 ]]; then
  info "Upgrading Node.js to v20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 globally
npm install -g pm2 -q
info "Node $(node --version) · npm $(npm --version) · PM2 $(pm2 --version)"

# Add 1 GB swap if low RAM
TOTAL_RAM=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
if [[ $TOTAL_RAM -lt 2200000 ]] && ! swapon --show | grep -q /swapfile; then
  info "Adding 2 GB swap (recommended for AI workloads)..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile -q
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---- Step 2: Copy project files ----
info "Copying project files to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
rsync -a --exclude '.git' --exclude 'venv' --exclude 'node_modules' \
  --exclude '__pycache__' --exclude '*.pyc' --exclude 'data/' \
  "$SCRIPT_DIR/" "$INSTALL_DIR/"

cd "$INSTALL_DIR"
mkdir -p data logs

# ---- Step 3: Python virtualenv + backend deps ----
info "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
info "Installing Python dependencies (this takes a few minutes)..."
pip install -r backend/requirements.txt -q
info "Python backend dependencies installed."

# ---- Step 4: Frontend npm install (build deferred until after .env is ready) ----
info "Installing Node.js dependencies..."
cd "$INSTALL_DIR/frontend"
npm install --silent
cd "$INSTALL_DIR"

# ---- Step 5: Configure .env ----
if [[ -f .env ]]; then
  warn ".env already exists — skipping key setup. Edit $INSTALL_DIR/.env manually."
else
  cp .env.example .env

  echo ""
  echo "─────────────────────────────────────────"
  echo "  API Keys"
  echo "─────────────────────────────────────────"

  ask "Anthropic API key (required, starts with sk-ant-):"
  read -r ANTHROPIC_KEY
  [[ -z "$ANTHROPIC_KEY" ]] && error "Anthropic API key is required."
  sed -i "s|your_claude_key_here|$ANTHROPIC_KEY|" .env

  ask "OpenAI API key (optional, press Enter to skip):"
  read -r OPENAI_KEY
  [[ -n "$OPENAI_KEY" ]] && sed -i "s|your_openai_key_here|$OPENAI_KEY|" .env

  echo ""
  echo "─────────────────────────────────────────"
  echo "  Dashboard Password (IMPORTANT)"
  echo "─────────────────────────────────────────"
  ask "Set a dashboard password (anyone with your IP can reach port 3000):"
  read -rs DASH_PASS
  echo ""
  [[ -n "$DASH_PASS" ]] && sed -i "s|DASHBOARD_PASSWORD=changeme|DASHBOARD_PASSWORD=$DASH_PASS|" .env

  echo ""
  echo "─────────────────────────────────────────"
  echo "  Telegram Bot (optional)"
  echo "─────────────────────────────────────────"
  ask "Telegram bot token (or Enter to skip):"
  read -r TG_TOKEN
  if [[ -n "$TG_TOKEN" ]]; then
    ask "Telegram chat ID:"
    read -r TG_CHAT
    sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TG_TOKEN|" .env
    sed -i "s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=$TG_CHAT|" .env
    info "Telegram configured."
  fi
fi

chmod 600 .env

# ---- Step 6: Set NEXT_PUBLIC vars from .env ----
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
sed -i "s|http://localhost:8000|http://$SERVER_IP:8000|g" .env
sed -i "s|ws://localhost:8000|ws://$SERVER_IP:8000|g" .env

# ---- Step 6b: Build Next.js dashboard (after .env has real server IP) ----
info "Building Next.js dashboard..."
cd "$INSTALL_DIR/frontend"
# Export NEXT_PUBLIC vars so they are baked into the build
set -a; source "$INSTALL_DIR/.env"; set +a
npm run build
cd "$INSTALL_DIR"
info "Frontend build complete."

# ---- Step 7: Nginx ----
info "Configuring Nginx reverse proxy..."
sed "s|YOUR_DOMAIN_OR_IP|$SERVER_IP|g" nginx.conf > /etc/nginx/sites-available/openclaw
ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
info "Nginx configured → http://$SERVER_IP"

# Open ports
ufw allow 80/tcp  &>/dev/null || true
ufw allow 3000/tcp &>/dev/null || true
ufw allow 8000/tcp &>/dev/null || true

# ---- Step 8: PM2 ----
info "Starting services with PM2..."
cd "$INSTALL_DIR"
PYTHONPATH="$INSTALL_DIR/backend" pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | bash || true

# ---- Done ----
echo ""
echo "════════════════════════════════════════════════"
echo "  OpenClawFactory is running!"
echo "════════════════════════════════════════════════"
echo ""
echo "  Dashboard:  http://$SERVER_IP"
echo "  Direct:     http://$SERVER_IP:3000"
echo "  API:        http://$SERVER_IP:8000"
echo ""
echo "  Logs:       pm2 logs"
echo "  Status:     pm2 status"
echo "  Restart:    pm2 restart all"
echo ""
