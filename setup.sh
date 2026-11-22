#!/bin/bash
set -e
cd "$(dirname "$0")"
IP=$(curl -s -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
if [ ! -f .env ]; then
  ADMINPW=$(openssl rand -base64 14 | tr -d '=+/')
  cat > .env <<ENV
APP_PORT=3010
DOMAIN=unused.example.com
DB_PASSWORD=$(openssl rand -hex 16)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=http://$IP:3010
ADMIN_EMAIL=admin@powersourcetrading.com
ADMIN_PASSWORD=$ADMINPW
ADMIN_NAME=PST Admin
ENV
  echo "Generated .env with fresh secrets."
else
  ADMINPW="(unchanged, from the existing .env)"
  echo ".env already exists, keeping it."
fi
{ ufw status 2>/dev/null | grep -q "Status: active" && ufw allow 3010/tcp; } || true
docker compose up -d --build
echo
echo "================================================="
echo "  URL:       http://$IP:3010"
echo "  LOGIN:     admin@powersourcetrading.com"
echo "  PASSWORD:  $ADMINPW"
echo "================================================="
