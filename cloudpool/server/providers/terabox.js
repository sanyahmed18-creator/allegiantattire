// TeraBox adapter — uses the community `terabox-api` library.
// TeraBox has NO official public API, so connection works with your account's
// session cookie ("ndus") instead of OAuth:
//   1. Log in at https://www.terabox.com in your browser
//   2. Open DevTools (F12) -> Application/Storage -> Cookies -> https://www.terabox.com
//   3. Copy the value of the cookie named  "ndus"
//   4. Paste it when connecting the account in CloudPool
// The cookie is long-lived; if it expires, just reconnect the account.

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import TeraBoxApp from 'terabox-api';
import { hashFile, uploadChunks } from 'terabox-api/helper.js';

const REMOTE_DIR = '/CloudPool';

function makeApp(ndus) {
  return new TeraBoxApp(ndus);
}

export default {
  id: 'terabox',
  name: 'TeraBox',
  color: '#0f6cf5',
  oauth: false,
  // connection needs a pasted cookie instead of OAuth redirect
  inputs: [{
    key: 'ndus',
    label: 'TeraBox "ndus" cookie',
    help: 'Log in at terabox.com → press F12 → Application → Cookies → copy the value of "ndus"',
  }],
  configured: () => true,

  async connectWithInput({ ndus }) {
    if (!ndus || ndus.trim().length < 10) throw new Error('Please paste your TeraBox "ndus" cookie value.');
    const app = makeApp(ndus.trim());

    let login;
    try { login = await app.checkLogin(); } catch { login = null; }
    if (login?.errno !== 0) throw new Error('TeraBox rejected this cookie. Make sure you copied the full "ndus" value while logged in at terabox.com.');

    // best-effort account label
    let email = 'terabox-user';
    try {
      const info = await app.passportGetInfo();
      email = info?.data?.email || info?.data?.display_name || email;
    } catch {}
    try {
      if (email === 'terabox-user') {
        const me = await app.getCurrentUserInfo();
        email = me?.records?.[0]?.uname || me?.data?.uname || email;
      }
    } catch {}
    if (email === 'terabox-user') email = `terabox-${crypto.createHash('md5').update(ndus).digest('hex').slice(0, 8)}`;

    return {
      email,
      accessToken: ndus.trim(), // the cookie IS the credential
      refreshToken: null,
      expiresAt: null,          // long-lived; reconnect if it dies
    };
  },

  async quota(ndus) {
    const app = makeApp(ndus);
    const q = await app.getQuota();
    if (q?.errno !== 0) throw new Error('TeraBox session expired — reconnect this account (new "ndus" cookie).');
    return { total: Number(q.total || 0), used: Number(q.used || 0) };
  },

  async upload(ndus, { name, buffer }) {
    const app = makeApp(ndus);
    await app.updateAppData();
    try { await app.createDir(REMOTE_DIR); } catch {}

    // library hashes/uploads from a file path -> stage to a temp file
    const tmp = path.join(os.tmpdir(), `cloudpool-${crypto.randomUUID()}`);
    fs.writeFileSync(tmp, buffer);

    try {
      const safeName = `${Date.now()}-${name}`.replace(/[\\/:*?"<>|]/g, '_');
      const data = {
        remote_dir: REMOTE_DIR,
        file: safeName,
        size: buffer.length,
        hash: await hashFile(tmp),
        upload_id: '',
        uploaded: [],
      };

      await app.getUploadHost();
      const pre = await app.precreateFile(data);
      if (pre?.errno !== 0) throw new Error(`TeraBox precreate failed (errno ${pre?.errno})`);

      // rapid upload: identical file already known to TeraBox
      if (pre.return_type === 2 && pre.info) {
        return { remoteId: JSON.stringify({ path: pre.info.path, fs_id: pre.info.fs_id }) };
      }

      data.upload_id = pre.uploadid;
      const need = Array.isArray(pre.block_list) ? pre.block_list.map(Number) : null;
      data.uploaded = data.hash.chunks.map((_, i) => (need ? !need.includes(i) : false));

      const up = await uploadChunks(app, data, tmp, 4, 5);
      if (up && up.ok === false) throw new Error('TeraBox chunk upload failed');

      const created = await app.createFile(data);
      if (created?.errno !== 0) throw new Error(`TeraBox create failed (errno ${created?.errno})`);

      return { remoteId: JSON.stringify({ path: created.path, fs_id: created.fs_id }) };
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  },

  async download(ndus, remoteId) {
    const app = makeApp(ndus);
    const { fs_id } = JSON.parse(remoteId);
    const res = await app.download([fs_id]);
    const dlink = res?.dlink?.[0]?.dlink;
    if (!dlink) throw new Error('TeraBox did not return a download link (session may have expired).');

    const dl = await fetch(dlink, {
      headers: { Cookie: app.params.cookie, 'User-Agent': app.params.ua },
      redirect: 'follow',
    });
    if (!dl.ok) throw new Error(`TeraBox download failed (${dl.status})`);
    return { stream: Readable.fromWeb(dl.body), size: Number(dl.headers.get('content-length')) || null };
  },

  async remove(ndus, remoteId) {
    const app = makeApp(ndus);
    await app.updateAppData();
    const { path: remotePath } = JSON.parse(remoteId);
    await app.filemanager('delete', [remotePath]);
  },
};
