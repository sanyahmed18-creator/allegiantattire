import googledrive from './googledrive.js';
import dropbox from './dropbox.js';
import onedrive from './onedrive.js';
import terabox from './terabox.js';
import local from './local.js';

export const providers = { googledrive, dropbox, onedrive, terabox, local };
export function getProvider(id) {
  const p = providers[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}
