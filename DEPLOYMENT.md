# Deployment Guide — LamsaDZ

This app is portable. Pick the option that matches your hosting.

---

## Before you deploy (all options)

1. Copy and edit your environment file:
   ```bash
   cp .env.example .env
   ```
2. Set these for production:
   ```
   NODE_ENV=production
   SITE_URL=https://yourdomain.dz
   SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   SECURE_COOKIES=true
   ADMIN_EMAIL=you@yourdomain.dz
   ADMIN_PASSWORD=<a strong password>
   WHATSAPP_NUMBER=213XXXXXXXXX
   GA_MEASUREMENT_ID=G-XXXXXXXXXX   # optional
   ```

---

## Option A — Docker (recommended for a VPS)

Requirements: a Linux server with Docker + Docker Compose.

```bash
# 1. Upload the project to your server (git clone or scp)
cd lamsadz
cp .env.example .env && nano .env      # set secrets (see above)

# 2. Build and start
docker compose up -d --build

# 3. Check it's running
docker compose logs -f app
```

The app listens on port **3000**. Data (database, uploads, logs) persists in Docker volumes.

### Add HTTPS with Nginx
1. Point your domain’s DNS A-record to the server IP.
2. Get a free certificate (e.g. with certbot) and place `fullchain.pem` + `privkey.pem`
   in `deploy/certs/`.
3. Edit `deploy/nginx.conf` (replace `lamsadz.dz` with your domain).
4. Uncomment the `nginx` service in `docker-compose.yml`.
5. `docker compose up -d`

---

## Option B — Plain Node.js on a VPS (with PM2)

```bash
# Install Node 20 (Debian/Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential python3

cd lamsadz
npm ci --omit=dev
cp .env.example .env && nano .env
npm run setup            # creates tables + loads products

# Keep it running with PM2
sudo npm install -g pm2
pm2 start src/server.js --name lamsadz
pm2 save
pm2 startup              # follow the printed command to auto-start on reboot
```

Put Nginx in front (see `deploy/nginx.conf`) and proxy to `http://127.0.0.1:3000`.

---

## Option C — Shared hosting (cPanel / Hostinger “Setup Node.js App”)

Many Algerian hosts (e.g. via cPanel) support Node apps:

1. Upload the project (File Manager or Git).
2. In cPanel → **Setup Node.js App**:
   - Application root: the `lamsadz` folder
   - Application startup file: `src/server.js`
   - Node version: 18 or 20
3. Click **Run NPM Install**.
4. Add your environment variables in the panel (same keys as `.env`).
5. In the app’s terminal run once: `node scripts/migrate.js && node scripts/seed.js`
6. Start the app.

> Note: SQLite needs write access to the `db/` folder — make sure file permissions allow it.
> If your host restricts native modules, switch to a VPS (Option A/B).

---

## Database migrations

- Build/upgrade tables:  `npm run migrate`
- Load starter data:     `npm run seed`
- Both at once:          `npm run setup`

Migrations are tracked in a `_migrations` table, so running them again is safe.

To add a new table or column later, drop a new numbered `.sql` file into
`db/migrations/` (e.g. `002_add_orders_field.sql`) and run `npm run migrate`.

---

## Backups

Your whole store lives in **two places**:
- `db/lamsadz.sqlite` (all products, orders, users, analytics)
- `public/uploads/` (product images you uploaded)

Back these up regularly:
```bash
cp db/lamsadz.sqlite backups/lamsadz-$(date +%F).sqlite
tar czf backups/uploads-$(date +%F).tgz public/uploads
```
With Docker, copy from the volumes or use `docker compose cp`.

---

## Health check

`GET /robots.txt` returns 200 when the app is healthy (used by the Docker healthcheck).
