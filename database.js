import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');

const db = new sqlite3.Database(DB_PATH);
const run = promisify(db.run.bind(db));
const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

export async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      must_change_password INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      protocol TEXT NOT NULL,
      settings TEXT,
      status TEXT DEFAULT 'online',
      traffic_in INTEGER DEFAULT 0,
      traffic_out INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      server_id INTEGER NOT NULL,
      protocol TEXT NOT NULL,
      config TEXT NOT NULL,
      subscription_url TEXT,
      qr_code TEXT,
      traffic_in INTEGER DEFAULT 0,
      traffic_out INTEGER DEFAULT 0,
      expire_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (server_id) REFERENCES servers(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const admin = await get('SELECT * FROM users WHERE username = ?', ['reza grootz']);
  if (!admin) {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('1234', 10);
    await run(
      'INSERT INTO users (username, password, must_change_password) VALUES (?, ?, ?)',
      ['reza grootz', hash, 1]
    );
  }

  const serverCount = await get('SELECT COUNT(*) as count FROM servers');
  if (serverCount.count === 0) {
    await run(
      `INSERT INTO servers (name, host, port, protocol, settings) VALUES (?, ?, ?, ?, ?)`,
      ['Main Server', '127.0.0.1', 443, 'VLESS', JSON.stringify({ flow: 'xtls-rprx-vision' })]
    );
  }

  console.log('✅ Database initialized');
}

export { db, run, get, all };
