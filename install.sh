#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${CYAN}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
error()   { echo -e "${RED}❌${NC} $1"; exit 1; }
dim()     { echo -e "${GRAY}   $1${NC}"; }

echo ""
echo -e "${CYAN}  scc-web installer${NC}"
echo -e "${GRAY}  Web client for scc${NC}"
echo ""

# ── Node.js ───────────────────────────────────────────────────
info "Checking Node.js..."
if ! command -v node &>/dev/null; then
  error "Node.js not found. Install from https://nodejs.org (v18+)"
fi
NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])")
if [[ "$NODE_VER" -lt 18 ]]; then
  error "Node.js v${NODE_VER} is too old. Need v18+"
fi
success "Node.js v$(node --version)"

# ── Dependencies ──────────────────────────────────────────────
info "Installing dependencies..."
npm install
success "Dependencies installed"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
success "Ready!"
echo ""
dim "Dev server:"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
dim "Production build:"
echo -e "  ${CYAN}npm run build${NC}   # outputs to dist/"
echo ""
dim "Docker deploy:"
echo -e "  ${CYAN}bash deploy.sh${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
