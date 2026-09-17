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

### A note on "Gmail" and "TeraBox"

- **Gmail** itself isn't a file store — its storage is Google Drive. CloudPool uses the Google Drive API, which is the correct way to use Google's 15 GB per account.
- **TeraBox** has no official public API and blocks third-party clients, so there's no reliable/safe way to integrate it. Its 1 TB free tier also throttles heavily. If you want big pools cheaply, multiple Google/Microsoft accounts or an S3-compatible provider are far more dependable. A TeraBox adapter could be added later if they ever ship a public API — the adapter interface (`server/providers/`) makes new providers a ~150-line file.

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
