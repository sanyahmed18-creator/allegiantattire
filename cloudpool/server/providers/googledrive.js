// Google Drive adapter (real API, needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const cfg = () => ({
  id: process.env.GOOGLE_CLIENT_ID,
  secret: process.env.GOOGLE_CLIENT_SECRET,
});

export default {
  id: 'googledrive',
  name: 'Google Drive',
  color: '#4285F4',
  oauth: true,
  configured: () => Boolean(cfg().id && cfg().secret),

  authUrl(redirectUri, state) {
    const p = new URLSearchParams({
      client_id: cfg().id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${AUTH_URL}?${p}`;
  },

  async exchangeCode(code, redirectUri) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg().id,
        client_secret: cfg().secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
    const tok = await res.json();

    const me = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then(r => r.json());

    return {
      email: me.email || 'unknown@gmail.com',
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token || null,
      expiresAt: Date.now() + (tok.expires_in || 3600) * 1000,
    };
  },

  async refresh(refreshToken) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: cfg().id,
        client_secret: cfg().secret,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new Error(`Google refresh failed: ${await res.text()}`);
    const tok = await res.json();
    return { accessToken: tok.access_token, expiresAt: Date.now() + (tok.expires_in || 3600) * 1000 };
  },

  async quota(token) {
    const res = await fetch(`${API}/about?fields=storageQuota`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Google quota failed: ${await res.text()}`);
    const q = (await res.json()).storageQuota || {};
    return { total: Number(q.limit || 15 * 1024 ** 3), used: Number(q.usage || 0) };
  },

  async upload(token, { name, mime, buffer }) {
    const metadata = JSON.stringify({ name });
    const boundary = 'cloudpool' + Date.now();
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mime || 'application/octet-stream'}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) throw new Error(`Google upload failed: ${await res.text()}`);
    return { remoteId: (await res.json()).id };
  },

  async download(token, remoteId) {
    const res = await fetch(`${API}/files/${remoteId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Google download failed: ${await res.text()}`);
    return { stream: res.body, size: Number(res.headers.get('content-length')) || null };
  },

  async remove(token, remoteId) {
    await fetch(`${API}/files/${remoteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
