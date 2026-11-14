# Set up hosting (parent steps)

The app runs on the parent's personal Cloudflare account (parthi292929) as a Cloudflare Pages project named `brain-teaser`, with one D1 database. Sign-in uses Google. Do the steps in this order: Cloudflare first, because the Google client needs the Pages address.

## 1. Sign in to Cloudflare from this PC

1. Open a terminal in `D:\Parthiban\Local Projects\tools\ed-apps\brain-teaser-class5`.
2. Run:
   ```bash
   npx wrangler login
   ```
3. The browser opens a Cloudflare page. Sign in with the **parthi292929** Cloudflare account (never a Giza account), then click **Allow**.
4. Run this and check that the account name is the personal one:
   ```bash
   npx wrangler whoami
   ```
5. Tell Claude "wrangler login done". Claude then asks before it runs each of these (they create the database and the empty Pages project; nothing is published yet):
   ```bash
   npx wrangler d1 create brain-teaser
   npx wrangler d1 migrations apply DB --remote
   npx wrangler pages project create brain-teaser --production-branch main
   ```
   Claude puts the database id in `wrangler.toml` and tells you the Pages address, for example `https://brain-teaser.pages.dev`.

## 2. Add the 2 secrets

You type the values, so they never appear in chat or in a file.

1. Run, and type `parthi292929@gmail.com` when it asks:
   ```bash
   npx wrangler pages secret put ADMIN_EMAIL --project-name brain-teaser
   ```
2. Make a random value:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Run, and paste that random value when it asks:
   ```bash
   npx wrangler pages secret put SESSION_SECRET --project-name brain-teaser
   ```

## 3. Create the Google sign-in client

1. Open https://console.cloud.google.com/ and sign in as parthi292929@gmail.com.
2. Click the project picker at the top left, then **New project**. Name: `brain-teaser`. Click **Create**, then select the new project in the project picker.
3. Open the menu (☰) → **APIs & Services** → **OAuth consent screen**. Click **Get started**.
   - App name: `Brain Teaser`. User support email: parthi292929@gmail.com. Click **Next**.
   - Audience: **External**. Click **Next**.
   - Contact email: parthi292929@gmail.com. Click **Next**, tick the agreement, click **Continue**, then **Create**.
4. Click **Audience** (left menu). Under **Test users**, click **Add users**, add the family Google account and parthi292929@gmail.com, then **Save**. Only these accounts can sign in while the app stays in "Testing", which keeps a children's app private.
5. Click **Clients** (left menu) → **Create client**.
   - Application type: **Web application**. Name: `Brain Teaser web`.
   - Under **Authorised JavaScript origins**, click **Add URI** 3 times and add:
     - the Pages address from step 1, for example `https://brain-teaser.pages.dev`
     - `http://localhost:8765`
     - `http://localhost`
   - Leave **Authorised redirect URIs** empty. Click **Create**.
6. Copy the **Client ID** (it ends with `.apps.googleusercontent.com`) and send it to Claude. It is public by design; it is not a secret.

## 4. Deploy

Claude sets `GOOGLE_CLIENT_ID` in `wrangler.toml`, asks you, and then runs:
```bash
npx wrangler pages deploy
```
This is a direct upload: it uses no Pages build.

## Local preview

`npx wrangler pages dev --port 8765` serves the app with the Worker and a local copy of the database. The file `.dev.vars` (never committed) holds local test values and allows a "Local test sign-in" without Google.
