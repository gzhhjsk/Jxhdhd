import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { initDatabase, db, run, get, all } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'reza-grootz-ultra-secret-key-2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── AUTH ───────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const user = await get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

  await run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  res.json({
    token,
    user: { id: user.id, username: user.username, mustChangePassword: !!user.must_change_password }
  });
});

app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing passwords' });
  }

  const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 10);
  await run('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hash, req.userId]);

  res.json({ success: true, message: 'Password changed successfully' });
});

app.post('/api/auth/verify', authenticate, async (req, res) => {
  const user = await get('SELECT id, username, must_change_password FROM users WHERE id = ?', [req.userId]);
  res.json({ valid: true, user });
});

// ─── USERS ──────────────────────────────────────────────
app.get('/api/users', authenticate, async (req, res) => {
  const users = await all('SELECT id, username, created_at, last_login, must_change_password FROM users');
  res.json(users);
});

app.post('/api/users', authenticate, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await run('INSERT INTO users (username, password, must_change_password) VALUES (?, ?, ?)',
      [username, hash, 1]);
    res.json({ id: result.lastID, username, must_change_password: 1 });
  } catch {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
  await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ─── SERVERS ────────────────────────────────────────────
app.get('/api/servers', authenticate, async (req, res) => {
  const servers = await all('SELECT * FROM servers ORDER BY id DESC');
  res.json(servers);
});

app.post('/api/servers', authenticate, async (req, res) => {
  const { name, host, port, protocol, settings } = req.body;
  if (!name || !host || !port || !protocol) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = await run(
    `INSERT INTO servers (name, host, port, protocol, settings) VALUES (?, ?, ?, ?, ?)`,
    [name, host, port, protocol, settings || '{}']
  );
  const server = await get('SELECT * FROM servers WHERE id = ?', [result.lastID]);
  res.json(server);
});

app.delete('/api/servers/:id', authenticate, async (req, res) => {
  await run('DELETE FROM servers WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.put('/api/servers/:id', authenticate, async (req, res) => {
  const { name, host, port, protocol, settings, status } = req.body;
  await run(
    `UPDATE servers SET name = ?, host = ?, port = ?, protocol = ?, settings = ?, status = ? WHERE id = ?`,
    [name, host, port, protocol, settings || '{}', status || 'online', req.params.id]
  );
  const server = await get('SELECT * FROM servers WHERE id = ?', [req.params.id]);
  res.json(server);
});

// ─── CONFIGS ────────────────────────────────────────────
app.get('/api/configs', authenticate, async (req, res) => {
  const configs = await all(`
    SELECT c.*, u.username as user_name, s.name as server_name 
    FROM configs c
    JOIN users u ON c.user_id = u.id
    JOIN servers s ON c.server_id = s.id
    ORDER BY c.id DESC
  `);
  res.json(configs);
});

app.post('/api/configs/generate', authenticate, async (req, res) => {
  const { userId, serverId, protocol, expireDays } = req.body;
  if (!userId || !serverId || !protocol) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
  const server = await get('SELECT * FROM servers WHERE id = ?', [serverId]);
  if (!user || !server) return res.status(404).json({ error: 'User or server not found' });

  const uuid = uuidv4();
  const expireAt = expireDays ? new Date(Date.now() + expireDays * 86400000).toISOString() : null;

  let config = '';
  switch (protocol) {
    case 'VLESS':
      config = `vless://${uuid}@${server.host}:${server.port}?flow=xtls-rprx-vision&encryption=none&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H#${user.username}-VLESS`;
      break;
    case 'VMESS':
      config = `vmess://${Buffer.from(JSON.stringify({ v: '2', ps: user.username + '-VMESS', add: server.host, port: server.port, id: uuid, aid: '0', net: 'ws', type: 'none', host: '', path: '/', tls: 'tls' })).toString('base64')}`;
      break;
    case 'Trojan':
      config = `trojan://${uuid}@${server.host}:${server.port}?security=tls&sni=www.cloudflare.com&alpn=h2,http/1.1#${user.username}-Trojan`;
      break;
    case 'Reality':
      config = `vless://${uuid}@${server.host}:${server.port}?flow=xtls-rprx-vision&encryption=none&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H#${user.username}-Reality`;
      break;
    case 'Shadowsocks':
      config = `ss://${Buffer.from('chacha20-ietf-poly1305:' + uuid).toString('base64')}@${server.host}:${server.port}#${user.username}-SS`;
      break;
    case 'WireGuard':
      config = `wg://${uuid}@${server.host}:${server.port}?public_key=7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H7T7s2H#${user.username}-WG`;
      break;
    default:
      config = `${protocol}://${uuid}@${server.host}:${server.port}#${user.username}`;
  }

  const result = await run(
    `INSERT INTO configs (user_id, server_id, protocol, config, subscription_url, qr_code, expire_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, serverId, protocol, config, `https://panel.reza.grootz/sub/${uuid}`, `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(config)}&size=200x200`, expireAt]
  );

  const newConfig = await get('SELECT * FROM configs WHERE id = ?', [result.lastID]);
  res.json(newConfig);
});

app.delete('/api/configs/:id', authenticate, async (req, res) => {
  await run('DELETE FROM configs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ─── STATS ──────────────────────────────────────────────
app.get('/api/stats', authenticate, async (req, res) => {
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  const serverCount = await get('SELECT COUNT(*) as count FROM servers');
  const configCount = await get('SELECT COUNT(*) as count FROM configs');

  const traffic = await get(`
    SELECT COALESCE(SUM(traffic_in + traffic_out), 0) as total FROM configs
  `);

  const onlineUsers = await get(
    `SELECT COUNT(*) as count FROM users WHERE last_login > datetime('now', '-10 minutes')`
  );

  res.json({
    users: userCount.count,
    servers: serverCount.count,
    configs: configCount.count,
    traffic: traffic.total || 0,
    onlineUsers: onlineUsers.count || 0,
    cpu: Math.floor(Math.random() * 40) + 10,
    ram: Math.floor(Math.random() * 50) + 20,
    disk: Math.floor(Math.random() * 30) + 10,
    network: {
      in: Math.floor(Math.random() * 500) + 100,
      out: Math.floor(Math.random() * 300) + 50
    }
  });
});

// ─── LOGS ───────────────────────────────────────────────
app.get('/api/logs', authenticate, async (req, res) => {
  const logs = await all(`
    SELECT l.*, u.username 
    FROM logs l 
    LEFT JOIN users u ON l.user_id = u.id 
    ORDER BY l.id DESC LIMIT 50
  `);
  res.json(logs);
});

app.post('/api/logs', authenticate, async (req, res) => {
  const { level, message } = req.body;
  await run('INSERT INTO logs (level, message, user_id) VALUES (?, ?, ?)',
    [level || 'info', message, req.userId]);
  res.json({ success: true });
});

// ─── SETTINGS ───────────────────────────────────────────
app.get('/api/settings', authenticate, async (req, res) => {
  const rows = await all('SELECT * FROM settings');
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/api/settings', authenticate, async (req, res) => {
  const { key, value } = req.body;
  await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  res.json({ success: true });
});

// ─── BACKUP / RESTORE ──────────────────────────────────
app.get('/api/backup', authenticate, async (req, res) => {
  const tables = ['users', 'servers', 'configs', 'settings'];
  const data = {};
  for (const t of tables) {
    data[t] = await all(`SELECT * FROM ${t}`);
  }
  res.json({ backup: data, timestamp: new Date().toISOString() });
});

app.post('/api/restore', authenticate, async (req, res) => {
  const { backup } = req.body;
  if (!backup) return res.status(400).json({ error: 'No backup data' });
  res.json({ success: true, message: 'Restore initiated (simulated)' });
});

// ─── SYSTEM INFO ───────────────────────────────────────
app.get('/api/system', authenticate, async (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024),
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024)
    },
    uptime: process.uptime()
  });
});

// ─── SUBSCRIPTION ──────────────────────────────────────
app.get('/api/subscription/:uuid', async (req, res) => {
  const config = await get('SELECT config FROM configs WHERE subscription_url LIKE ?', [`%${req.params.uuid}%`]);
  if (!config) return res.status(404).send('Not found');
  res.set('Content-Type', 'text/plain');
  res.send(config.config);
});

// ─── INIT ──────────────────────────────────────────────
await initDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Ultra Panel Server running on http://localhost:${PORT}`);
});
