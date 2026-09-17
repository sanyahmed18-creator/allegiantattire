import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

import { providers, getProvider } from './providers/index.js';
import {
  getAccounts, getAccount, addAccount, removeAccount,
  getFiles, getFile, addFile, removeFile, save,
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 512 * 1024 * 1024 } });

// pending OAuth states -> provider id
const oauthStates = new Map();

function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// ---- token management -------------------------------------------------
async function freshToken(account) {
  const provider = getProvider(account.provider);
  if (!provider.oauth) return account.accessToken;
  if (account.expiresAt && Date.now() < account.expiresAt - 60_000) return account.accessToken;
  if (!account.refreshToken) return account.accessToken; // hope it still works
  const t = await provider.refresh(account.refreshToken);
  account.accessToken = t.accessToken;
  if (t.refreshToken) account.refreshToken = t.refreshToken;
  account.expiresAt = t.expiresAt;
  save();
  return account.accessToken;
}

async function accountQuota(account) {
  try {
    const token = await freshToken(account);
    const q = await getProvider(account.provider).quota(token);
    account.lastQuota = q;
    account.quotaError = null;
  } catch (e) {
    account.quotaError = String(e.message || e);
  }
  save();
  return account.lastQuota || { total: 0, used: 0 };
}

// ---- API: providers & accounts ----------------------------------------
app.get('/api/providers', (req, res) => {
  res.json(Object.values(providers).map(p => ({
    id: p.id, name: p.name, color: p.color, oauth: p.oauth,
    configured: p.configured(), inputs: p.inputs || null,
  })));
});

// Connect a provider that uses pasted credentials (e.g. TeraBox "ndus" cookie)
app.post('/api/connect/:provider', async (req, res) => {
  try {
    const provider = getProvider(req.params.provider);
    if (!provider.connectWithInput) return res.status(400).json({ error: 'This provider uses OAuth — use the connect button.' });
    const info = await provider.connectWithInput(req.body || {});
    const acc = addAccount({ id: crypto.randomUUID(), provider: provider.id, ...info, addedAt: Date.now() });
    res.json({ ok: true, email: acc.email });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.get('/api/accounts', async (req, res) => {
  const accounts = getAccounts();
  await Promise.all(accounts.map(a => accountQuota(a)));
  res.json(accounts.map(a => ({
    id: a.id, provider: a.provider, email: a.email,
    quota: a.lastQuota || { total: 0, used: 0 },
    error: a.quotaError || null,
    providerName: getProvider(a.provider).name,
    color: getProvider(a.provider).color,
  })));
});

app.delete('/api/accounts/:id', (req, res) => {
  removeAccount(req.params.id);
  res.json({ ok: true });
});

// ---- API: OAuth flow ---------------------------------------------------
app.get('/api/auth/:provider/start', async (req, res) => {
  const provider = getProvider(req.params.provider);

  if (!provider.oauth) {
    // direct connect (Local Vault)
    const info = await provider.connectDirect();
    addAccount({
      id: crypto.randomUUID(), provider: provider.id, ...info,
      addedAt: Date.now(),
    });
    return res.redirect('/?connected=' + provider.id);
  }

  if (!provider.configured()) {
    return res.status(400).json({ error: `${provider.name} is not configured. Add its client ID/secret to cloudpool/.env (see .env.example).` });
  }
  const state = crypto.randomUUID();
  oauthStates.set(state, provider.id);
  setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);
  const redirectUri = `${baseUrl(req)}/api/auth/${provider.id}/callback`;
  res.redirect(provider.authUrl(redirectUri, state));
});

app.get('/api/auth/:provider/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) throw new Error(String(error));
    if (!state || oauthStates.get(state) !== req.params.provider) throw new Error('Invalid OAuth state');
    oauthStates.delete(state);
    const provider = getProvider(req.params.provider);
    const redirectUri = `${baseUrl(req)}/api/auth/${provider.id}/callback`;
    const info = await provider.exchangeCode(String(code), redirectUri);
    addAccount({ id: crypto.randomUUID(), provider: provider.id, ...info, addedAt: Date.now() });
    res.redirect('/?connected=' + provider.id);
  } catch (e) {
    res.redirect('/?autherror=' + encodeURIComponent(String(e.message || e)));
  }
});

// ---- API: pooled storage stats ------------------------------------------
app.get('/api/pool', async (req, res) => {
  const accounts = getAccounts();
  await Promise.all(accounts.map(a => accountQuota(a)));
  let total = 0, used = 0;
  for (const a of accounts) {
    total += a.lastQuota?.total || 0;
    used += a.lastQuota?.used || 0;
  }
  res.json({ total, used, free: Math.max(0, total - used), accounts: accounts.length, files: getFiles().length });
});

// ---- API: files (smart routing) ------------------------------------------
app.get('/api/files', (req, res) => {
  res.json(getFiles().map(f => {
    const acc = getAccount(f.accountId);
    return {
      ...f,
      accountEmail: acc?.email || '(removed)',
      providerName: acc ? getProvider(acc.provider).name : f.provider,
      color: acc ? getProvider(acc.provider).color : '#666',
    };
  }).sort((a, b) => b.uploadedAt - a.uploadedAt));
});

app.post('/api/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const accounts = getAccounts();
    if (!accounts.length) return res.status(400).json({ error: 'Connect at least one storage account first.' });

    // Smart routing: pick the connected account with the most free space
    await Promise.all(accounts.map(a => accountQuota(a)));
    const candidates = accounts
      .filter(a => !a.quotaError)
      .map(a => ({ a, free: (a.lastQuota?.total || 0) - (a.lastQuota?.used || 0) }))
      .sort((x, y) => y.free - x.free);

    const size = req.file.size;
    const target = candidates.find(c => c.free >= size);
    if (!target) return res.status(400).json({ error: 'No connected account has enough free space for this file.' });

    const account = target.a;
    const provider = getProvider(account.provider);
    const token = await freshToken(account);
    const id = crypto.randomUUID();

    const { remoteId } = await provider.upload(token, {
      id,
      name: req.file.originalname,
      mime: req.file.mimetype,
      buffer: req.file.buffer,
      stream: Readable.from(req.file.buffer),
    });

    const file = addFile({
      id,
      name: req.file.originalname,
      size,
      mime: req.file.mimetype,
      provider: provider.id,
      accountId: account.id,
      remoteId,
      uploadedAt: Date.now(),
    });

    res.json({ ...file, providerName: provider.name, accountEmail: account.email });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get('/api/files/:id/download', async (req, res) => {
  try {
    const file = getFile(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const account = getAccount(file.accountId);
    if (!account) return res.status(410).json({ error: 'The account holding this file was disconnected' });
    const provider = getProvider(account.provider);
    const token = await freshToken(account);
    const { stream, size } = await provider.download(token, file.remoteId);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    if (size || file.size) res.setHeader('Content-Length', size || file.size);

    if (typeof stream.pipe === 'function') stream.pipe(res);
    else Readable.fromWeb(stream).pipe(res);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const file = getFile(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const account = getAccount(file.accountId);
    if (account) {
      const provider = getProvider(account.provider);
      const token = await freshToken(account);
      await provider.remove(token, file.remoteId).catch(() => {});
    }
    removeFile(file.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CloudPool running on http://0.0.0.0:${PORT}`);
});
