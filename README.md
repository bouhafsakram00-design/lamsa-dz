# LamsaDZ — Full-Stack Electronics Store (Algeria) 🇩🇿

A complete, production-ready e-commerce website for **LamsaDZ** (Tissemsilt, Algeria):
phones, accessories, chargers, PC gear and cyber services — with WhatsApp ordering,
a multilingual storefront (English / Français / العربية), and a secure admin dashboard.

Built with **Node.js + Express + SQLite** (Postgres-ready), server-rendered with EJS.

---

## 🟢 Quick start (run it on your computer)

> You only need **Node.js 18+** installed. Get it free at https://nodejs.org (choose the “LTS” version).

Open a terminal **inside the `lamsadz` folder** and run these 4 commands, one at a time:

```bash
npm install        # 1) download the building blocks (only needed once)
cp .env.example .env   # 2) create your settings file
npm run setup      # 3) build the database + load your products
npm start          # 4) turn the website ON
```

Now open your browser:

| What | Address | Login |
|------|---------|-------|
| 🛍️ **Your store** (customers see this) | http://localhost:3000 | — |
| 🔐 **Admin panel** (you manage products here) | http://localhost:3000/admin | see below |

**Default admin login** (change it — see Security below):
- Email: `admin@lamsadz.dz`
- Password: `ChangeMe!2026`

To stop the website, press **Ctrl + C** in the terminal.

> 💡 While editing code, run `npm run dev` instead of `npm start` — it auto-restarts when you change files.

---

## 🧭 What can I do in the admin panel?

- **Dashboard** — visitors, WhatsApp clicks, top products, low-stock alerts
- **Products** — add / edit / delete products, upload images, set prices & discounts, mark “Featured”
- **Inventory** — adjust stock with one click; automatic low-stock warnings
- **Reviews** — approve or delete customer reviews before they appear
- **Messages** — read inquiries sent from the contact form
- **Analytics** — page views, searches, WhatsApp clicks over time
- **Settings** — change your WhatsApp number, address, hours, delivery/warranty/return text, and Google Analytics ID — **no coding needed**

---

## 🗂️ Project structure (what each folder is)

```
lamsadz/
├── src/
│   ├── server.js          # starts the web server
│   ├── app.js             # wires everything together
│   ├── config/            # reads settings from .env
│   ├── db/                # database connection
│   ├── middleware/        # security, login checks, CSRF, uploads, rate limits
│   ├── services/          # the "brain": products, users, analytics, content
│   ├── controllers/       # handle each page/request
│   ├── routes/            # web pages, /api, /admin URLs
│   ├── validators/        # check & clean form input (anti-spam)
│   └── utils/             # translations, helpers, logger
├── views/                 # the HTML pages (EJS templates)
│   ├── pages/             # home, shop, product, faq, login, account...
│   ├── partials/          # header, footer, product card (reused pieces)
│   └── admin/             # the admin dashboard pages
├── public/                # CSS, JavaScript, images (served to the browser)
├── db/
│   ├── migrations/        # database structure (tables)
│   └── seeds/             # your starter products, categories, FAQs...
├── scripts/               # migrate.js (build tables) + seed.js (load data)
├── deploy/                # Nginx config for production
├── Dockerfile             # for one-command deployment
└── docker-compose.yml
```

---

## 🔐 Security — please do this before going live

1. **Change the admin password.** Edit `.env`:
   ```
   ADMIN_EMAIL=you@yourdomain.dz
   ADMIN_PASSWORD=YourStrongPasswordHere
   ```
   Then re-run `npm run seed` (it only creates the admin if it doesn’t exist —
   to reset, delete `db/lamsadz.sqlite` and run `npm run setup` again, or create
   a new admin via the database).

2. **Set a strong session secret.** Generate one:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Paste it into `.env` as `SESSION_SECRET=...`

3. **In production**, set in `.env`:
   ```
   NODE_ENV=production
   SECURE_COOKIES=true        # only when served over HTTPS
   SITE_URL=https://yourdomain.dz
   ```

This app already includes: password hashing (bcrypt), CSRF protection, XSS protection
(Helmet + escaped templates), SQL-injection protection (parameterized queries),
rate limiting, secure image uploads, spam honeypots, and protected admin routes.

---

## 🌍 Deployment

See **DEPLOYMENT.md** for full instructions. Quick options:

**Option A — Docker (any VPS):**
```bash
cp .env.example .env   # edit your secrets
docker compose up -d --build
```

**Option B — Plain Node on a VPS:**
```bash
npm ci --omit=dev
npm run setup
NODE_ENV=production npm start    # use PM2 to keep it running (see DEPLOYMENT.md)
```

**Option C — Shared hosting (cPanel “Node.js App”):** also in DEPLOYMENT.md.

---

## 🛠️ Switching to PostgreSQL (for scaling later)

SQLite is perfect to start and handles thousands of products and lots of traffic.
When you outgrow it, the data layer in `src/db/index.js` exposes a small surface
(`get/all/run/transaction`) — re-implement it with the `pg` driver and set
`DB_DRIVER=postgres` + `DATABASE_URL` in `.env`. The schema in `db/migrations/`
is written to be Postgres-compatible.

---

## 📞 Support
Made by **Akram A. Bouhafs**. Configure your WhatsApp number in the admin **Settings**.
