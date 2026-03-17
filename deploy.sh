#!/usr/bin/env bash
set -e

IMAGE="scc-web"
CONTAINER="scc-web"
PORT="${PORT:-3000}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${CYAN}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
dim()     { echo -e "${GRAY}   $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }

echo ""
echo -e "${CYAN}  scc-web deploy${NC}"
echo ""

# ── Docker check ──────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo -e "\033[0;31m❌\033[0m Docker not found."
  exit 1
fi

# ── Stop existing container ───────────────────────────────────
if docker ps -q --filter "name=${CONTAINER}" | grep -q .; then
  info "Stopping existing container..."
  docker stop "${CONTAINER}" >/dev/null
  docker rm   "${CONTAINER}" >/dev/null
  success "Old container removed"
fi

# ── Build ─────────────────────────────────────────────────────
info "Building Docker image..."
docker build -t "${IMAGE}:latest" .
success "Image built: ${IMAGE}:latest"

# ── Run ───────────────────────────────────────────────────────
info "Starting container on port ${PORT}..."
docker run -d \
  --name "${CONTAINER}" \
  --restart unless-stopped \
  -p "${PORT}:80" \
  "${IMAGE}:latest"

success "Container started: ${CONTAINER}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
success "Deployed!"
echo ""
dim "Available at:  http://localhost:${PORT}"
dim "Logs:          docker logs -f ${CONTAINER}"
dim "Stop:          docker stop ${CONTAINER}"
echo ""
dim "On first open, enter your scc server address:"
dim "  ws://your-server-ip:8765"
dim "  wss://your-domain.com/ws  (if behind HTTPS proxy)"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
