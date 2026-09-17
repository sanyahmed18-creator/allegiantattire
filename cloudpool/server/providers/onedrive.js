// OneDrive adapter via Microsoft Graph (needs MS_CLIENT_ID / MS_CLIENT_SECRET).
const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH = 'https://graph.microsoft.com/v1.0';

const SCOPES = 'offline_access Files.ReadWrite User.Read';

const cfg = () => ({
  id: process.env.MS_CLIENT_ID,
  secret: process.env.MS_CLIENT_SECRET,
});

export default {
  id: 'onedrive',
  name: 'OneDrive',
  color: '#0078D4',
  oauth: true,
  configured: () => Boolean(cfg().id && cfg().secret),

  authUrl(redirectUri, state) {
    const p = new URLSearchParams({
      client_id: cfg().id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
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
        scope: SCOPES,
      }),
    });
    if (!res.ok) throw new Error(`OneDrive token exchange failed: ${await res.text()}`);
    const tok = await res.json();

    const me = await fetch(`${GRAPH}/me`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then(r => r.json());

    return {
      email: me.userPrincipalName || me.mail || 'unknown@outlook.com',
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
        scope: SCOPES,
      }),
    });
    if (!res.ok) throw new Error(`OneDrive refresh failed: ${await res.text()}`);
    const tok = await res.json();
    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token || undefined,
      expiresAt: Date.now() + (tok.expires_in || 3600) * 1000,
    };
  },

  async quota(token) {
    const res = await fetch(`${GRAPH}/me/drive?select=quota`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`OneDrive quota failed: ${await res.text()}`);
    const q = (await res.json()).quota || {};
    return { total: Number(q.total || 5 * 1024 ** 3), used: Number(q.used || 0) };
  },

  async upload(token, { name, mime, buffer }) {
    const safe = encodeURIComponent(`${Date.now()}-${name}`);
    const res = await fetch(`${GRAPH}/me/drive/root:/CloudPool/${safe}:/content`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mime || 'application/octet-stream',
      },
      body: buffer,
    });
    if (!res.ok) throw new Error(`OneDrive upload failed: ${await res.text()}`);
    return { remoteId: (await res.json()).id };
  },

  async download(token, remoteId) {
    const res = await fetch(`${GRAPH}/me/drive/items/${remoteId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`OneDrive download failed: ${await res.text()}`);
    return { stream: res.body, size: Number(res.headers.get('content-length')) || null };
  },

  async remove(token, remoteId) {
    await fetch(`${GRAPH}/me/drive/items/${remoteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
