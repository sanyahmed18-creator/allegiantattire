// CloudPool frontend
const $ = s => document.querySelector(s);

const fmtBytes = n => {
  if (!n && n !== 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n % 1 === 0 ? n : n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`;
};

const fileIcon = (mime = '', name = '') => {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('zip') || /\.(zip|rar|7z|tar|gz)$/i.test(name)) return '🗜️';
  if (mime.startsWith('text/') || /\.(txt|md|doc|docx)$/i.test(name)) return '📄';
  return '📦';
};

let toastTimer;
function toast(msg, type = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4200);
}

async function api(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- render ----------
async function loadPool() {
  const pool = await api('/api/pool');
  $('#pool-free').textContent = fmtBytes(pool.free);
  $('#pool-total').textContent = fmtBytes(pool.total);
  $('#stat-accounts').textContent = pool.accounts;
  $('#stat-files').textContent = pool.files;
}

async function loadAccounts() {
  const [accounts, providers] = await Promise.all([api('/api/accounts'), api('/api/providers')]);

  // account list
  const list = $('#accounts-list');
  list.innerHTML = accounts.length ? '' : '<div class="empty">No accounts yet — connect one below to start pooling storage.</div>';
  for (const a of accounts) {
    const used = a.quota.used, total = a.quota.total || 1;
    const pct = Math.min(100, (used / total) * 100);
    const el = document.createElement('div');
    el.className = 'account';
    el.innerHTML = `
      <div class="avatar" style="background:${a.color}">${a.providerName.slice(0, 2).toUpperCase()}</div>
      <div class="info">
        <div class="email">${a.email}</div>
        ${a.error
          ? `<div class="err">⚠ ${a.error.slice(0, 60)}</div>`
          : `<div class="usage">${a.providerName} · ${fmtBytes(used)} / ${fmtBytes(total)} used</div>
             <div class="mini-meter"><div class="mini-fill" style="width:${pct}%;background:${a.color}"></div></div>`}
      </div>
      <button class="btn small danger" data-disc="${a.id}">Disconnect</button>`;
    list.appendChild(el);
  }
  list.querySelectorAll('[data-disc]').forEach(b => b.onclick = async () => {
    if (!confirm('Disconnect this account? Files stored on it will become unavailable in CloudPool.')) return;
    await api(`/api/accounts/${b.dataset.disc}`, { method: 'DELETE' });
    refresh();
    toast('Account disconnected');
  });

  // connect buttons
  const row = $('#connect-row');
  row.innerHTML = '';
  for (const p of providers) {
    const btn = document.createElement('button');
    btn.className = 'connect-btn';
    btn.disabled = p.oauth && !p.configured;
    btn.innerHTML = `<span class="dot" style="background:${p.color}"></span> + ${p.name} ${p.oauth && !p.configured ? '<small>(add API keys in .env)</small>' : ''}`;
    btn.onclick = () => {
      if (p.inputs) openConnectModal(p);
      else window.location.href = `/api/auth/${p.id}/start`;
    };
    row.appendChild(btn);
  }

  // pool meter segments per account
  const fill = $('#pool-meter');
  const legend = $('#pool-legend');
  fill.innerHTML = ''; legend.innerHTML = '';
  const totalPool = accounts.reduce((s, a) => s + (a.quota.total || 0), 0) || 1;
  for (const a of accounts) {
    const usedPct = ((a.quota.used || 0) / totalPool) * 100;
    if (usedPct > 0.1) {
      const seg = document.createElement('div');
      seg.className = 'meter-seg';
      seg.style.width = usedPct + '%';
      seg.style.background = a.color;
      fill.appendChild(seg);
    }
    const key = document.createElement('div');
    key.className = 'key';
    key.innerHTML = `<span class="dot" style="background:${a.color}"></span>${a.providerName} — ${a.email}`;
    legend.appendChild(key);
  }
}

async function loadFiles() {
  const files = await api('/api/files');
  const list = $('#files-list');
  list.innerHTML = files.length ? '' : '<div class="empty">No files yet. Upload something — CloudPool picks the best account automatically.</div>';
  for (const f of files) {
    const el = document.createElement('div');
    el.className = 'file';
    el.innerHTML = `
      <div class="ficon">${fileIcon(f.mime, f.name)}</div>
      <div class="finfo">
        <div class="fname" title="${f.name}">${f.name}</div>
        <div class="fmeta">${fmtBytes(f.size)} · <span class="badge" style="background:${f.color}">${f.providerName}</span> ${f.accountEmail}</div>
      </div>
      <div class="factions">
        <button class="btn small" data-dl="${f.id}">⬇</button>
        <button class="btn small danger" data-del="${f.id}">✕</button>
      </div>`;
    list.appendChild(el);
  }
  list.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => {
    window.location.href = `/api/files/${b.dataset.dl}/download`;
  });
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete this file from the cloud account it lives on?')) return;
    await api(`/api/files/${b.dataset.del}`, { method: 'DELETE' });
    refresh();
    toast('File deleted');
  });
}

// ---------- credential-based connect (TeraBox etc.) ----------
function openConnectModal(provider) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Connect ${provider.name}</h3>
      ${provider.inputs.map(inp => `
        <label class="modal-label">${inp.label}</label>
        <p class="modal-help">${inp.help || ''}</p>
        <textarea class="modal-input" data-key="${inp.key}" rows="3" placeholder="Paste value here…"></textarea>
      `).join('')}
      <div class="modal-actions">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn primary" data-act="connect">Connect</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-act="cancel"]').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  overlay.querySelector('[data-act="connect"]').onclick = async () => {
    const body = {};
    overlay.querySelectorAll('.modal-input').forEach(t => body[t.dataset.key] = t.value.trim());
    const btn = overlay.querySelector('[data-act="connect"]');
    btn.disabled = true; btn.textContent = 'Connecting…';
    try {
      const r = await api(`/api/connect/${provider.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      overlay.remove();
      toast(`✓ ${provider.name} connected (${r.email}) — storage added to the pool!`);
      refresh();
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Connect';
      toast(e.message, 'err');
    }
  };
}

function refresh() {
  loadPool().catch(() => {});
  loadAccounts().catch(e => toast(e.message, 'err'));
  loadFiles().catch(() => {});
}

// ---------- uploads ----------
async function uploadFiles(fileList) {
  for (const file of fileList) {
    toast(`Uploading ${file.name}…`);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const f = await api('/api/files', { method: 'POST', body: fd });
      toast(`✓ ${file.name} → ${f.providerName} (${f.accountEmail})`);
    } catch (e) {
      toast(`✗ ${file.name}: ${e.message}`, 'err');
    }
  }
  refresh();
}

$('#btn-upload').onclick = () => $('#file-input').click();
$('#file-input').onchange = e => { uploadFiles([...e.target.files]); e.target.value = ''; };

// drag & drop
let dragDepth = 0;
window.addEventListener('dragenter', e => { e.preventDefault(); if (++dragDepth === 1) $('#dropzone').classList.remove('hidden'); });
window.addEventListener('dragleave', e => { e.preventDefault(); if (--dragDepth === 0) $('#dropzone').classList.add('hidden'); });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  $('#dropzone').classList.add('hidden');
  if (e.dataTransfer?.files?.length) uploadFiles([...e.dataTransfer.files]);
});

// ---------- init ----------
const params = new URLSearchParams(location.search);
if (params.get('connected')) { toast('✓ Account connected — storage added to the pool!'); history.replaceState({}, '', '/'); }
if (params.get('autherror')) { toast('Connection failed: ' + params.get('autherror'), 'err'); history.replaceState({}, '', '/'); }

refresh();
setInterval(() => { loadPool().catch(() => {}); }, 30_000);
