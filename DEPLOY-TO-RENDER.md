# 🚀 Put Your Site Online with Render.com (Beginner Guide)

This guide takes you from "files on my computer" to "my store is live on the internet."
No coding required — just clicking and copy-pasting. Takes about 20–30 minutes.

> ❌ **Important:** Netlify CANNOT run this site (it only hosts simple static files).
> Your store has a backend + database, so we use **Render**, which can run it.

---

## What you'll need (all free)
1. A **GitHub** account — this is where your code lives online (free).
2. A **Render** account — this runs your website (free tier to start).

---

# PART 1 — Put your code on GitHub

Think of GitHub as "Google Drive for code." Render reads your code from there.

### Step 1.1 — Create a GitHub account
1. Go to **https://github.com** and click **Sign up**.
2. Pick a username, email, and password. Verify your email.

### Step 1.2 — Create a new repository ("repo" = a folder for your project)
1. Click the **+** in the top-right → **New repository**.
2. Repository name: `lamsadz`
3. Choose **Private** (so others can't see your code). 
4. Click **Create repository**.

### Step 1.3 — Upload your files
The easiest way without installing anything:

1. On your new empty repo page, click **"uploading an existing file"** (it's a link in the middle of the page).
2. On your computer, open the `lamsadz` folder.
3. **Select all files and folders EXCEPT these** (don't upload them):
   - ❌ `node_modules` (huge, not needed — Render rebuilds it)
   - ❌ `.env` (contains secrets — never upload this!)
   - ❌ `db/lamsadz.sqlite` and any `.sqlite` files
   - ❌ the `logs` folder contents
4. Drag the rest into the upload box (or click "choose your files").
5. At the bottom, click **Commit changes**.

> 💡 The file `.gitignore` I included already lists what to skip — if you use the
> GitHub Desktop app or git command line later, it handles this automatically.

✅ Your code is now on GitHub!

---

# PART 2 — Deploy on Render

### Step 2.1 — Create a Render account
1. Go to **https://render.com** and click **Get Started**.
2. Click **"Sign in with GitHub"** — this connects the two accounts. 
3. Allow Render to access your repositories when it asks.

### Step 2.2 — Create the service from the Blueprint
I included a file called **`render.yaml`** that tells Render exactly how to run your
site (including the persistent disk for your products & images). So:

1. On the Render dashboard, click **New +** → **Blueprint**.
2. Select your **`lamsadz`** repository from the list.
3. Render reads `render.yaml` and shows a service named **lamsadz**. Click **Apply**.

### Step 2.3 — Set your secret password
Render will ask you to fill in one secret value:

- **ADMIN_PASSWORD** → type a strong password you'll remember (this is how you log
  into the admin panel). Example: `MyShop2026!Strong`

Then click **Apply / Create**.

### Step 2.4 — Wait for it to build (~3–5 minutes)
Render will:
- Install everything (`npm install`)
- Build the database and load your 22 products
- Start the site

Watch the **Logs** tab. When you see `LamsaDZ running in production mode`, it's live! 🎉

### Step 2.5 — Open your site
At the top of the page Render shows your URL, like:
**`https://lamsadz.onrender.com`**

- Your store: `https://lamsadz.onrender.com`
- Your admin: `https://lamsadz.onrender.com/admin`
  - Email: `admin@lamsadz.dz` (or whatever you set)
  - Password: the one you typed in Step 2.3

---

# PART 3 — Important final settings

### Fix the SITE_URL
1. In Render → your service → **Environment** tab.
2. Find **SITE_URL** and change it to your real URL (e.g. `https://lamsadz.onrender.com`).
3. Click **Save Changes** (the site restarts automatically).

This makes your sitemap, sharing previews, and SEO links correct.

### (Optional) Add Google Analytics
1. Get a Measurement ID from https://analytics.google.com (looks like `G-XXXXXXXXXX`).
2. In Render → **Environment** → set **GA_MEASUREMENT_ID** to that value → Save.

---

# 🔁 How to UPDATE your site later

This is the part you asked about! Once it's set up, updating is easy:

### If you changed something in the admin panel (products, prices, settings):
✅ **Nothing to do!** Those changes are saved instantly in your live database.
You manage products at `https://your-site.onrender.com/admin` — no re-deploy needed.

### If you (or I) changed the actual code/design files:
1. Upload the changed files to GitHub again:
   - Go to your repo → click the file → ✏️ edit, OR click **Add file → Upload files**
   - Click **Commit changes**.
2. **Render automatically detects the change and re-deploys.** Wait ~3 min. Done!

> 💡 This is the magic of connecting GitHub + Render: **push to GitHub → site updates itself.**

---

# ⚠️ Two things to know about the FREE plan

1. **It sleeps after 15 min of no visitors.** The first visit after that takes ~30 seconds
   to "wake up." To keep it always-on, upgrade to **Starter ($7/month)** in Render →
   your service → Settings → change plan. (Change `plan: free` to `plan: starter` in
   `render.yaml` too.)

2. **Always keep the persistent disk.** It stores your database and uploaded images.
   The `render.yaml` already sets this up — don't delete the disk or you'll lose data.

---

# 🌐 Using your own domain (e.g. lamsadz.dz)

When you're ready:
1. Buy a domain (e.g. from Namecheap, or a .dz registrar).
2. Render → your service → **Settings** → **Custom Domains** → **Add**.
3. Follow Render's instructions to point your domain's DNS to Render (they give you
   the exact records to copy). Render gives you free HTTPS automatically.

---

# About your existing Netlify site

You said you already use Netlify. You have two choices:
- **Easiest:** Stop using Netlify for this — Render hosts the full store now.
- **Optional:** Keep your domain pointing to Render (the real store). If you want a
  separate simple landing page on Netlify, you can — but it's not needed.

---

# 😵 Something went wrong?

- **Build failed?** Open the **Logs** tab in Render and read the last red lines.
  Most common cause: a file wasn't uploaded to GitHub. Re-check Part 1, Step 1.3.
- **Site loads but admin login fails?** Double-check ADMIN_PASSWORD in the
  Environment tab matches what you're typing.
- **Images disappeared after a deploy?** Make sure the **disk** still exists
  (Render → Settings → Disks) and `UPLOADS_DIR` = `/var/data/uploads`.

You've got this! 💪
