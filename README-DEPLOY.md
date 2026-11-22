# PST Inventory · VPS deployment

One stack: the app, PostgreSQL 16 and a nightly database backup, plus optional automatic HTTPS once a real domain exists. Works on any Ubuntu or Debian VPS with 1 GB RAM or more.

## Shared VPS, zero impact on existing sites
The stack is built to coexist with whatever already runs on the server:
- Ports 80 and 443 are never used until you switch on the proxy profile yourself.
- The app binds one high port of your choosing (`APP_PORT` in `.env`, default 3010).
- Postgres stays on the internal Docker network, no port on the host.
- All containers, networks and volumes carry the `pst-inventory` name, separate from every other project.
Before starting, confirm the port is free: `ss -tlnp | grep :3010` must print nothing.

## Temporary address, before any domain
Set in `.env`:
```
APP_PORT=3010
BETTER_AUTH_URL=http://YOUR-VPS-IP:3010
```
Start with `docker compose up -d --build` and open `http://YOUR-VPS-IP:3010`.
A nicer temporary name without any registrar: `http://pst.YOUR-VPS-IP.nip.io:3010` resolves to the same server automatically.
Honest note: this runs over plain http. Fine for a few days of internal use; move to the real subdomain with HTTPS for daily work.

## 1. Point your domain
Create an A record for your chosen subdomain (example: `inventory.powersourcetrading.com`) to the VPS IP. Wait until `ping` answers from the VPS IP.

## 2. Install Docker on the VPS
```bash
curl -fsSL https://get.docker.com | sh
```

## 3. Upload the project
```bash
mkdir -p /opt/pst && cd /opt/pst
# upload pst-inventory.tar.gz here with scp or your panel, then:
tar xzf pst-inventory.tar.gz --strip-components=1
```

## 4. Configure
```bash
cp .env.example .env
nano .env
```
Fill the six values. Secrets:
```bash
openssl rand -hex 16   # DB_PASSWORD
openssl rand -hex 32   # BETTER_AUTH_SECRET
```

## 5. Start
Temporary mode (no domain): `docker compose up -d --build`
Real domain with HTTPS: set `APP_PORT=127.0.0.1:3010`, `DOMAIN` and `BETTER_AUTH_URL=https://...` in `.env`, then
```bash
docker compose --profile proxy up -d --build
```
First build takes a few minutes. Then open `https://your-domain` and sign in with the admin email and password from `.env`. The June 2024 opening stock (947 items) loads automatically on the first start.

## Daily operations
- Create staff accounts in Settings. Staff record stock, admins control everything.
- Nightly database dumps land in `/opt/pst/backups`, 14 days kept. Copy them off the server monthly.
- Extra manual copy any time: Settings → Download backup (JSON).

## Restore from a backup
```bash
cd /opt/pst
gunzip -c backups/pst-2026-11-22.sql.gz | docker compose exec -T db psql -U pst -d pst_inventory
```

## Update the app after a code change
```bash
cd /opt/pst
docker compose up -d --build app
```

## Logs and status
```bash
docker compose ps
docker compose logs -f app
```

## Security notes
- Postgres is never exposed to the internet, only the app reaches it on the internal network.
- HTTPS certificates come from Let's Encrypt through Caddy, renewed automatically.
- Public sign-up is disabled at the middleware. Accounts exist only when an admin creates them.
- Login is rate limited. Sessions are httpOnly cookies, 14 days.
- Keep the VPS firewall open on 22, 80, 443 only: `ufw allow 22,80,443/tcp && ufw enable`
