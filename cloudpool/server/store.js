// Simple JSON persistence for accounts + virtual file index.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

let db = { accounts: [], files: [] };
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.accounts ||= [];
  db.files ||= [];
} catch { /* first run */ }

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }, 50);
}

export function getAccounts() { return db.accounts; }
export function getAccount(id) { return db.accounts.find(a => a.id === id); }
export function addAccount(acc) {
  // replace an existing account for the same provider+email
  db.accounts = db.accounts.filter(a => !(a.provider === acc.provider && a.email === acc.email));
  db.accounts.push(acc);
  save();
  return acc;
}
export function removeAccount(id) {
  db.accounts = db.accounts.filter(a => a.id !== id);
  db.files = db.files.filter(f => f.accountId !== id);
  save();
}

export function getFiles() { return db.files; }
export function getFile(id) { return db.files.find(f => f.id === id); }
export function addFile(file) { db.files.push(file); save(); return file; }
export function removeFile(id) { db.files = db.files.filter(f => f.id !== id); save(); }
