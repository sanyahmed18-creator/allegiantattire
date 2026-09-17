# ☁️ CloudPool — One Big Drive

CloudPool links multiple cloud storage accounts (Google Drive, Dropbox, OneDrive — as many accounts of each as you want) and presents them as **one single virtual drive**. Connect enough accounts and your pool grows to 4–5 TB or more.

## How it works

- **Pooling** — every connected account's quota is added together. The dashboard shows one combined free/total number.
- **Smart routing** — when you upload a file, CloudPool automatically stores it on whichever connected account has the most free space. You never pick; you just see one drive.
- **Virtual index** — CloudPool keeps a small index (`server/data/db.json`) mapping each file to the account and remote ID it lives on, so downloads and deletes are transparent.
- **Token refresh** — OAuth refresh tokens are stored and access tokens are refreshed automatically.

## Quick start

```bash
cd cloudpool
npm install
npm start          # http://localhost:4000
```

Out of the box you can connect the **Local Vault (demo)** provider to try the whole flow with zero setup.

## Connecting real providers

Copy `.env.example` to `.env` and fill in credentials for each provider you want. The `.env.example` file has step-by-step instructions for each:

| Provider | Console | Env vars |
|---|---|---|
| Google Drive | console.cloud.google.com (enable Drive API) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Dropbox | dropbox.com/developers/apps | `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET` |
| OneDrive | portal.azure.com (App registrations) | `MS_CLIENT_ID`, `MS_CLIENT_SECRET` |

Each provider needs the redirect URI `<YOUR_APP_URL>/api/auth/<provider>/callback` registered in its console, e.g. `http://localhost:4000/api/auth/googledrive/callback`.

You can connect **multiple accounts of the same provider** — e.g. 10 Gmail accounts × 15 GB = 150 GB pooled, plus Dropbox and OneDrive accounts on top.

## Connecting TeraBox (1 TB free per account)

TeraBox has **no official OAuth API**, so CloudPool connects using your account's session cookie instead:

1. Log in at [terabox.com](https://www.terabox.com) in your browser
2. Press **F12** → **Application** (Chrome) / **Storage** (Firefox) → **Cookies** → `https://www.terabox.com`
3. Copy the value of the cookie named **`ndus`**
4. In CloudPool, click **+ TeraBox** and paste it

Repeat with different TeraBox accounts to stack multiple 1 TB pools. Caveats to know:

- This uses a community-reverse-engineered API (`terabox-api` npm package) — it can break if TeraBox changes their site, and heavy automated use may violate their ToS.
- The `ndus` cookie is long-lived but does expire eventually; just reconnect the account when it does.
- Free TeraBox throttles download speeds and caps files at 4 GB.

### A note on "Gmail"

**Gmail** itself isn't a file store — its storage is Google Drive. CloudPool uses the Google Drive API, which is the correct way to use Google's 15 GB per account.

## Reaching 5 TB: providers that give ~1 TB per account

| Provider | Free storage | CloudPool support | Notes |
|---|---|---|---|
| **TeraBox** | **1 TB** | ✅ built-in (cookie) | Only mainstream service giving 1 TB free; slow downloads, 4 GB file cap, ads |
| MEGA | 20 GB | ➕ addable | Best "real" free tier with proper apps; ~5 GB/day transfer limit |
| Google Drive | 15 GB | ✅ built-in (OAuth) | Reliable, fast, proper API |
| Blomp | 200 GB | ➕ addable | Lesser-known, 200 GB free |
| Degoo | 20 GB | ❌ | No API, aggressive account deletion policy |

**Realistic 5 TB plans:**

- **Free (5× TeraBox):** 5 TeraBox accounts × 1 TB = **5 TB free** — works today in CloudPool, but expect throttled speeds and unofficial-API fragility.
- **Cheap & reliable:** [IDrive](https://www.idrive.com) 10 TB ≈ $80/yr, or Backblaze B2 at $6/TB/mo (≈$30/mo for 5 TB) — S3-compatible adapters are easy to add.
- **Mixed (recommended):** 3–4 TeraBox accounts for bulk cold storage + Google Drive/OneDrive accounts for files you need fast and dependable. CloudPool's smart routing handles the spread automatically.

## Adding a new provider

Create `server/providers/yourprovider.js` implementing:

```js
export default {
  id, name, color, oauth: true,
  configured(),              // are API keys present?
  authUrl(redirectUri, state),
  exchangeCode(code, redirectUri), // -> { email, accessToken, refreshToken, expiresAt }
  refresh(refreshToken),           // -> { accessToken, expiresAt }
  quota(token),                    // -> { total, used } bytes
  upload(token, { name, mime, buffer }), // -> { remoteId }
  download(token, remoteId),             // -> { stream, size }
  remove(token, remoteId),
}
```

then register it in `server/providers/index.js`.

## Limits & honest caveats

- Upload size is capped at 512 MB per file in this version (in-memory routing). Chunked/resumable uploads would lift this.
- Provider terms of service generally allow personal multi-account use via official APIs, but mass-creating accounts to farm free storage can violate ToS — use accounts you legitimately own.
- The file index lives on the server; back up `server/data/db.json` — without it, files are still in your accounts (in a `CloudPool` folder) but the unified view is lost.
