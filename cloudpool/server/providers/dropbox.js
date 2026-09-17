// Dropbox adapter (real API, needs DROPBOX_CLIENT_ID / DROPBOX_CLIENT_SECRET).
const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const API = 'https://api.dropboxapi.com/2';
const CONTENT = 'https://content.dropboxapi.com/2';

const cfg = () => ({
  id: process.env.DROPBOX_CLIENT_ID,
  secret: process.env.DROPBOX_CLIENT_SECRET,
});

export default {
  id: 'dropbox',
  name: 'Dropbox',
  color: '#0061FF',
  oauth: true,
  configured: () => Boolean(cfg().id && cfg().secret),

  authUrl(redirectUri, state) {
    const p = new URLSearchParams({
      client_id: cfg().id,
      redirect_uri: redirectUri,
      response_type: 'code',
      token_access_type: 'offline',
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
    if (!res.ok) throw new Error(`Dropbox token exchange failed: ${await res.text()}`);
    const tok = await res.json();

    const me = await fetch(`${API}/users/get_current_account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then(r => r.json());

    return {
      email: me?.email || 'unknown@dropbox',
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token || null,
      expiresAt: Date.now() + (tok.expires_in || 14400) * 1000,
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
    if (!res.ok) throw new Error(`Dropbox refresh failed: ${await res.text()}`);
    const tok = await res.json();
    return { accessToken: tok.access_token, expiresAt: Date.now() + (tok.expires_in || 14400) * 1000 };
  },

  async quota(token) {
    const res = await fetch(`${API}/users/get_space_usage`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Dropbox quota failed: ${await res.text()}`);
    const q = await res.json();
    return { total: Number(q.allocation?.allocated || 2 * 1024 ** 3), used: Number(q.used || 0) };
  },

  async upload(token, { name, buffer }) {
    const path = `/CloudPool/${Date.now()}-${name}`;
    const res = await fetch(`${CONTENT}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true }),
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });
    if (!res.ok) throw new Error(`Dropbox upload failed: ${await res.text()}`);
    const data = await res.json();
    return { remoteId: data.path_lower };
  },

  async download(token, remoteId) {
    const res = await fetch(`${CONTENT}/files/download`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: remoteId }),
      },
    });
    if (!res.ok) throw new Error(`Dropbox download failed: ${await res.text()}`);
    return { stream: res.body, size: Number(res.headers.get('content-length')) || null };
  },

  async remove(token, remoteId) {
    await fetch(`${API}/files/delete_v2`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: remoteId }),
    });
  },
};
