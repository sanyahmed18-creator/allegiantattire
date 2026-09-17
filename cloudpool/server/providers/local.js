// "Local Vault" provider — stores files on the server's disk.
// Always available so CloudPool can be tried without any API keys.
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { DATA_DIR } from '../store.js';

const STORE = path.join(DATA_DIR, 'localstore');
fs.mkdirSync(STORE, { recursive: true });

const TOTAL = 2 * 1024 * 1024 * 1024; // 2 GB demo vault

function usedBytes() {
  let used = 0;
  for (const f of fs.readdirSync(STORE)) {
    try { used += fs.statSync(path.join(STORE, f)).size; } catch {}
  }
  return used;
}

export default {
  id: 'local',
  name: 'Local Vault (demo)',
  color: '#8b5cf6',
  oauth: false,
  configured: () => true,

  // no OAuth — "connecting" just creates the account record
  async connectDirect() {
    return {
      email: 'local@this-server',
      accessToken: 'local',
      refreshToken: null,
      expiresAt: null,
    };
  },

  async quota() {
    return { total: TOTAL, used: usedBytes() };
  },

  async upload(_token, { id, stream }) {
    const dest = path.join(STORE, id);
    await pipeline(stream, fs.createWriteStream(dest));
    return { remoteId: id };
  },

  async download(_token, remoteId) {
    const p = path.join(STORE, path.basename(remoteId));
    if (!fs.existsSync(p)) throw new Error('File missing from local vault');
    return { stream: fs.createReadStream(p), size: fs.statSync(p).size };
  },

  async remove(_token, remoteId) {
    const p = path.join(STORE, path.basename(remoteId));
    try { fs.unlinkSync(p); } catch {}
  },
};
