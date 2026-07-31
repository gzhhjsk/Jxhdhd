import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Users, Server, Cog, QrCode, Activity, Settings as SettingsIcon,
  LogOut, Menu, X, User, Database, HardDrive, Globe, Shield, Crown,
  Plus, Trash2, Copy, Eye, EyeOff, Terminal, FileText, Bell, Moon, Sun,
  Cpu, AlertCircle, CheckCircle, Info, MoreVertical, Edit, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// ─── TYPES ──────────────────────────────────────────────
interface User { id: number; username: string; created_at: string; last_login: string | null; must_change_password: number; }
interface Server { id: number; name: string; host: string; port: number; protocol: string; settings: string; status: string; traffic_in: number; traffic_out: number; created_at: string; }
interface Config { id: number; user_id: number; server_id: number; protocol: string; config: string; subscription_url: string; qr_code: string; traffic_in: number; traffic_out: number; expire_at: string | null; created_at: string; user_name?: string; server_name?: string; }
interface Log { id: number; level: string; message: string; user_id: number | null; created_at: string; username?: string; }
interface Stats { users: number; servers: number; configs: number; traffic: number; onlineUsers: number; cpu: number; ram: number; disk: number; network: { in: number; out: number; }; }

type View = 'dashboard' | 'users' | 'servers' | 'configs' | 'subscription' | 'qrcode' | 'traffic' | 'logs' | 'settings' | 'terminal' | 'backup';

// ─── API ────────────────────────────────────────────────
const api = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.reload();
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: string) => new Date(date).toLocaleString();

// ─── MAIN APP ────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [darkMode, setDarkMode] = useState(true);

  if (!token) {
    return <Login onLogin={(t) => { localStorage.setItem('token', t); setToken(t); }} />;
  }

  return (
    <div className="min-h-screen bg-black text-[#e8e0d0] flex">
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 24, stiffness: 200 }}
        className="fixed top-0 left-0 z-50 h-screen w-[260px] glass border-r border-gold/10 flex flex-col overflow-hidden"
      >
        <div className="p-5 border-b border-gold/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center border border-gold/30">
            <Crown className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-gold font-bold text-lg tracking-tight text-glow">Ultra Panel</h1>
            <p className="text-[10px] text-gold/40 uppercase tracking-widest">Reza Grootz</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`sidebar-item ${view === item.id ? 'active' : 'text-gold/60'}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gold/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gold/5 border border-gold/10">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
              <User className="w-4 h-4 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">reza grootz</p>
              <p className="text-[10px] text-gold/40">Admin</p>
            </div>
            <button onClick={() => { localStorage.removeItem('token'); setToken(null); }} className="p-1.5 rounded-lg hover:bg-gold/10 text-gold/50 hover:text-gold transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-[260px]' : 'ml-0'}`}>
        <Navbar sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} view={view} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} notifications={notifications} clearNotifications={() => setNotifications([])} />
        <main className="p-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
              {view === 'dashboard' && <DashboardView />}
              {view === 'users' && <UsersView />}
              {view === 'servers' && <ServersView />}
              {view === 'configs' && <ConfigsView />}
              {view === 'subscription' && <SubscriptionView />}
              {view === 'qrcode' && <QRCodeView />}
              {view === 'traffic' && <TrafficView />}
              {view === 'logs' && <LogsView />}
              {view === 'settings' && <SettingsView />}
              {view === 'terminal' && <TerminalView />}
              {view === 'backup' && <BackupView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'users', icon: Users, label: 'Users' },
  { id: 'servers', icon: Server, label: 'Servers' },
  { id: 'configs', icon: Cog, label: 'Config Generator' },
  { id: 'subscription', icon: Shield, label: 'Subscription' },
  { id: 'qrcode', icon: QrCode, label: 'QR Code' },
  { id: 'traffic', icon: Activity, label: 'Traffic' },
  { id: 'logs', icon: FileText, label: 'Logs' },
  { id: 'terminal', icon: Terminal, label: 'Terminal' },
  { id: 'backup', icon: Database, label: 'Backup' },
  { id: 'settings', icon: SettingsIcon, label: 'Settings' },
];

// ─── NAVBAR ─────────────────────────────────────────────
function Navbar({ sidebarOpen, toggleSidebar, view, darkMode, toggleDarkMode, notifications, clearNotifications }: any) {
  const [showNotif, setShowNotif] = useState(false);
  const viewLabel = navItems.find(i => i.id === view)?.label || 'Dashboard';

  return (
    <header className="glass border-b border-gold/10 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gold/10 text-gold/50 hover:text-gold transition">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h2 className="text-lg font-semibold text-white/90">{viewLabel}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold/5 border border-gold/10">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-gold/50">Online</span>
        </div>
        <button onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-gold/10 text-gold/50 hover:text-gold transition">
          {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <div className="relative">
          <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-xl hover:bg-gold/10 text-gold/50 hover:text-gold transition relative">
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 glass rounded-2xl border border-gold/10 p-3 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Notifications</span>
                <button onClick={clearNotifications} className="text-xs text-gold/50 hover:text-gold">Clear</button>
              </div>
              {notifications.length === 0 ? <p className="text-xs text-gold/30 text-center py-4">No notifications</p> :
                notifications.map((n: any) => <div key={n.id} className="text-xs py-1.5 border-b border-gold/5 last:border-0 text-gold/70">{n.message}</div>)}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
          <User className="w-4 h-4 text-gold" />
        </div>
      </div>
    </header>
  );
}

// ─── LOGIN ──────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('reza grootz');
  const [password, setPassword] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      if (data.user?.mustChangePassword) {
        setMustChange(true);
        setLoading(false);
        return;
      }
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: password, newPassword }),
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (data.success) {
        const loginData = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password: newPassword }) });
        onLogin(loginData.token);
      }
    } catch (err: any) {
      setError(err.message || 'Password change failed');
      setLoading(false);
    }
  };

  if (mustChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#0a0804] to-black">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md glass rounded-3xl p-8 border border-gold/20 shadow-gold">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gold/20 mx-auto flex items-center justify-center border border-gold/30 mb-4">
              <Lock className="w-8 h-8 text-gold" />
            </div>
            <h2 className="text-2xl font-bold text-gold text-glow">Change Password</h2>
            <p className="text-gold/40 text-sm mt-1">You must change your password before continuing</p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm text-gold/60 block mb-1.5">New Password</label>
              <div className="relative">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-gold pr-12" placeholder="Enter new password" required minLength={4} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/30 hover:text-gold">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading || newPassword.length < 4} className="btn-gold w-full">{loading ? 'Updating...' : 'Update Password'}</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#0a0804] to-black">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 border border-gold/20 shadow-gold relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
          <div className="text-center mb-8 relative">
            <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }} className="w-20 h-20 rounded-2xl bg-gold/20 mx-auto flex items-center justify-center border border-gold/30 shadow-gold">
              <Crown className="w-10 h-10 text-gold" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gold mt-4 text-glow tracking-tight">Ultra Panel</h1>
            <p className="text-gold/30 text-sm tracking-widest uppercase mt-1">Reza Grootz · Administration</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 relative">
            <div>
              <label className="text-sm text-gold/60 block mb-1.5">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-gold" placeholder="Enter username" required />
            </div>
            <div>
              <label className="text-sm text-gold/60 block mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-gold pr-12" placeholder="Enter password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/30 hover:text-gold">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-gold w-full">{loading ? 'Authenticating...' : 'Access Panel'}</button>
          </form>
          <div className="mt-6 text-center text-[10px] text-gold/20 tracking-widest uppercase">Secure · Encrypted · Premium</div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────
function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => { try { const data = await api('/stats'); setStats(data); } catch {}; setLoading(false); };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ name: `${i + 1}h`, traffic: Math.floor(Math.random() * 80) + 20, users: Math.floor(Math.random() * 30) + 5 })), []);
  const pieData = [{ name: 'VLESS', value: 35 }, { name: 'VMESS', value: 25 }, { name: 'Trojan', value: 20 }, { name: 'Reality', value: 12 }, { name: 'Other', value: 8 }];
  const COLORS = ['#d4a843', '#c9943a', '#b88430', '#a07428', '#8a6420'];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gold/30">Loading dashboard...</div></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Users" value={stats?.users || 0} />
        <StatCard icon={Server} label="Servers" value={stats?.servers || 0} />
        <StatCard icon={Cog} label="Configs" value={stats?.configs || 0} />
        <StatCard icon={Activity} label="Online Users" value={stats?.onlineUsers || 0} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SysStat label="CPU" value={stats?.cpu || 0} icon={Cpu} />
        <SysStat label="RAM" value={stats?.ram || 0} icon={Database} />
        <SysStat label="Disk" value={stats?.disk || 0} icon={HardDrive} />
        <SysStat label="Traffic" value={formatBytes(stats?.traffic || 0)} icon={Globe} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="stat-card p-4">
          <h3 className="text-sm font-medium text-gold/70 mb-3">Traffic Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs><linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4a843" stopOpacity={0.3} /><stop offset="100%" stopColor="#d4a843" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(212,168,67,0.06)" />
              <XAxis dataKey="name" stroke="rgba(212,168,67,0.2)" tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(212,168,67,0.2)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0a0804', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="traffic" stroke="#d4a843" fill="url(#trafficGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="stat-card p-4">
          <h3 className="text-sm font-medium text-gold/70 mb-3">Protocol Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0a0804', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#d4a843' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="stat-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gold/70">Network Traffic</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> In: {formatBytes(stats?.network?.in || 0)}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Out: {formatBytes(stats?.network?.out || 0)}</span>
          </div>
        </div>
        <div className="h-2 w-full bg-gold/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold/40 to-gold rounded-full" style={{ width: `${Math.min((stats?.network?.in || 0) / ((stats?.network?.in || 1) + (stats?.network?.out || 1)) * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <motion.div whileHover={{ y: -2 }} className="stat-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
          <Icon className="w-5 h-5 text-gold" />
        </div>
        <div><p className="text-xs text-gold/40 uppercase tracking-wider">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div>
      </div>
    </motion.div>
  );
}

function SysStat({ label, value, icon: Icon }: any) {
  return (
    <div className="glass-light rounded-xl p-3 border border-gold/5 flex items-center gap-3">
      <Icon className="w-4 h-4 text-gold/50" />
      <div className="flex-1"><p className="text-[10px] text-gold/30 uppercase tracking-wider">{label}</p><p className="text-sm font-semibold text-white">{typeof value === 'number' ? value + '%' : value}</p></div>
    </div>
  );
}

// ─── USERS VIEW ─────────────────────────────────────────
function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '' });

  const fetchUsers = async () => { try { const data = await api('/users'); setUsers(data); } catch {}; setLoading(false); };
  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api('/users', { method: 'POST', body: JSON.stringify(newUser) }); setShowModal(false); setNewUser({ username: '', password: '' }); fetchUsers(); } catch { alert('Error creating user'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try { await api(`/users/${id}`, { method: 'DELETE' }); fetchUsers(); } catch { alert('Error deleting user'); }
  };

  if (loading) return <div className="text-gold/30">Loading users...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gold/50 text-sm">Manage system users</h3>
        <button onClick={() => setShowModal(true)} className="btn-gold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add User</button>
      </div>
      <div className="glass rounded-2xl border border-gold/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gold/5 border-b border-gold/10">
            <tr><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">ID</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Username</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Created</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Last Login</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Status</th><th className="px-4 py-3 text-right text-gold/40 font-medium text-xs uppercase tracking-wider">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gold/5 hover:bg-gold/5 transition">
                <td className="px-4 py-3 text-gold/30">#{u.id}</td>
                <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                <td className="px-4 py-3 text-gold/40 text-xs">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3 text-gold/40 text-xs">{u.last_login ? formatDate(u.last_login) : '—'}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${u.must_change_password ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{u.must_change_password ? 'Pending' : 'Active'}</span></td>
                <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(u.id)} className="text-gold/30 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-6 w-full max-w-md border border-gold/20">
            <h3 className="text-lg font-semibold text-gold mb-4">Create User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input className="input-gold" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
              <input className="input-gold" type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={4} />
              <div className="flex gap-3"><button type="submit" className="btn-gold flex-1">Create</button><button type="button" onClick={() => setShowModal(false)} className="btn-outline-gold flex-1">Cancel</button></div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── SERVERS VIEW ───────────────────────────────────────
function ServersView() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [form, setForm] = useState({ name: '', host: '', port: 443, protocol: 'VLESS', settings: '{}' });

  const fetchServers = async () => { try { const data = await api('/servers'); setServers(data); } catch {}; setLoading(false); };
  useEffect(() => { fetchServers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api(`/servers/${editing.id}`, { method: 'PUT', body: JSON.stringify({ ...form, status: editing.status }) });
      else await api('/servers', { method: 'POST', body: JSON.stringify(form) });
      setShowModal(false); setEditing(null); setForm({ name: '', host: '', port: 443, protocol: 'VLESS', settings: '{}' }); fetchServers();
    } catch { alert('Error saving server'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this server?')) return;
    try { await api(`/servers/${id}`, { method: 'DELETE' }); fetchServers(); } catch { alert('Error deleting server'); }
  };

  const protocols = ['VLESS', 'VMESS', 'Trojan', 'Reality', 'Shadowsocks', 'WireGuard'];
  if (loading) return <div className="text-gold/30">Loading servers...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gold/50 text-sm">Manage proxy servers</h3>
        <button onClick={() => { setEditing(null); setForm({ name: '', host: '', port: 443, protocol: 'VLESS', settings: '{}' }); setShowModal(true); }} className="btn-gold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add Server</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((s) => (
          <motion.div key={s.id} whileHover={{ y: -2 }} className="glass rounded-2xl p-4 border border-gold/10 hover:border-gold/30 transition">
            <div className="flex items-start justify-between">
              <div><h4 className="text-white font-semibold">{s.name}</h4><p className="text-xs text-gold/40">{s.protocol} · {s.host}:{s.port}</p></div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.status || 'online'}</span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gold/30"><span>↑ {formatBytes(s.traffic_out || 0)}</span><span>↓ {formatBytes(s.traffic_in || 0)}</span></div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setEditing(s); setForm({ name: s.name, host: s.host, port: s.port, protocol: s.protocol, settings: s.settings || '{}' }); setShowModal(true); }} className="text-gold/40 hover:text-gold text-xs">Edit</button>
              <button onClick={() => handleDelete(s.id)} className="text-gold/40 hover:text-red-400 text-xs">Delete</button>
            </div>
          </motion.div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-6 w-full max-w-md border border-gold/20">
            <h3 className="text-lg font-semibold text-gold mb-4">{editing ? 'Edit Server' : 'Add Server'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input className="input-gold" placeholder="Server Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input-gold" placeholder="Host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} required />
              <input className="input-gold" type="number" placeholder="Port" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 443 })} required />
              <select className="input-gold" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
                {protocols.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex gap-3"><button type="submit" className="btn-gold flex-1">{editing ? 'Update' : 'Create'}</button><button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-outline-gold flex-1">Cancel</button></div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── CONFIGS VIEW ───────────────────────────────────────
function ConfigsView() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ userId: '', serverId: '', protocol: 'VLESS', expireDays: '30' });

  const fetchData = async () => {
    try { const [c, u, s] = await Promise.all([api('/configs'), api('/users'), api('/servers')]); setConfigs(c); setUsers(u); setServers(s); } catch {}; setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/configs/generate', { method: 'POST', body: JSON.stringify({ userId: parseInt(form.userId), serverId: parseInt(form.serverId), protocol: form.protocol, expireDays: parseInt(form.expireDays) || 30 }) });
      setShowModal(false); setForm({ userId: '', serverId: '', protocol: 'VLESS', expireDays: '30' }); fetchData();
    } catch { alert('Error generating config'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this config?')) return;
    try { await api(`/configs/${id}`, { method: 'DELETE' }); fetchData(); } catch { alert('Error deleting config'); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert('Copied!'); };
  const protocols = ['VLESS', 'VMESS', 'Trojan', 'Reality', 'Shadowsocks', 'WireGuard'];
  if (loading) return <div className="text-gold/30">Loading configs...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gold/50 text-sm">Generate and manage configs</h3>
        <button onClick={() => setShowModal(true)} className="btn-gold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Generate</button>
      </div>
      <div className="glass rounded-2xl border border-gold/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gold/5 border-b border-gold/10">
            <tr><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">User</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Server</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Protocol</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Expires</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Traffic</th><th className="px-4 py-3 text-right text-gold/40 font-medium text-xs uppercase tracking-wider">Actions</th></tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.id} className="border-b border-gold/5 hover:bg-gold/5 transition">
                <td className="px-4 py-3 text-white">{c.user_name || '#' + c.user_id}</td>
                <td className="px-4 py-3 text-gold/60">{c.server_name || '#' + c.server_id}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{c.protocol}</span></td>
                <td className="px-4 py-3 text-xs text-gold/40">{c.expire_at ? formatDate(c.expire_at) : '∞'}</td>
                <td className="px-4 py-3 text-xs text-gold/40">{formatBytes((c.traffic_in || 0) + (c.traffic_out || 0))}</td>
                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                  <button onClick={() => copyToClipboard(c.config)} className="text-gold/40 hover:text-gold transition"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="text-gold/40 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-6 w-full max-w-md border border-gold/20">
            <h3 className="text-lg font-semibold text-gold mb-4">Generate Config</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
              <select className="input-gold" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
                <option value="">Select User</option>{users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
              <select className="input-gold" value={form.serverId} onChange={(e) => setForm({ ...form, serverId: e.target.value })} required>
                <option value="">Select Server</option>{servers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.protocol})</option>)}
              </select>
              <select className="input-gold" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
                {protocols.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="input-gold" type="number" placeholder="Expire (days)" value={form.expireDays} onChange={(e) => setForm({ ...form, expireDays: e.target.value })} />
              <div className="flex gap-3"><button type="submit" className="btn-gold flex-1">Generate</button><button type="button" onClick={() => setShowModal(false)} className="btn-outline-gold flex-1">Cancel</button></div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── SUBSCRIPTION VIEW ──────────────────────────────────
function SubscriptionView() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const fetch = async () => { try { const data = await api('/configs'); setConfigs(data); } catch {}; setLoading(false); }; fetch(); }, []);
  if (loading) return <div className="text-gold/30">Loading subscriptions...</div>;
  return (
    <div className="space-y-4">
      <h3 className="text-gold/50 text-sm">Subscription links for all configs</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {configs.map((c) => (
          <div key={c.id} className="glass rounded-2xl p-4 border border-gold/10 hover:border-gold/30 transition">
            <div className="flex items-center justify-between">
              <div><p className="text-white font-medium">{c.user_name || 'User'}</p><p className="text-xs text-gold/40">{c.protocol} · {c.server_name}</p></div>
              <button onClick={() => navigator.clipboard.writeText(c.subscription_url || c.config)} className="btn-ghost-gold text-xs flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
            </div>
            <p className="mt-2 text-xs text-gold/30 truncate">{c.subscription_url || c.config}</p>
            {c.expire_at && <p className="text-[10px] text-gold/30 mt-1">Expires: {formatDate(c.expire_at)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── QR CODE VIEW ───────────────────────────────────────
function QRCodeView() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Config | null>(null);
  useEffect(() => { const fetch = async () => { try { const data = await api('/configs'); setConfigs(data); } catch {}; setLoading(false); }; fetch(); }, []);
  if (loading) return <div className="text-gold/30">Loading QR codes...</div>;
  return (
    <div className="space-y-4">
      <h3 className="text-gold/50 text-sm">QR codes for configs</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((c) => (
          <motion.div key={c.id} whileHover={{ y: -2 }} className="glass rounded-2xl p-4 border border-gold/10 hover:border-gold/30 transition text-center cursor-pointer" onClick={() => setSelected(c)}>
            <div className="aspect-square max-w-[150px] mx-auto bg-black/40 rounded-xl p-2 border border-gold/10">
              <img src={c.qr_code || `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(c.config)}&size=200x200`} alt="QR" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-gold/40 mt-2 truncate">{c.user_name || 'User'} · {c.protocol}</p>
          </motion.div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-6 max-w-sm w-full border border-gold/20" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-square max-w-[250px] mx-auto bg-black/40 rounded-xl p-4 border border-gold/10">
              <img src={selected.qr_code || `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(selected.config)}&size=300x300`} alt="QR" className="w-full h-full object-contain" />
            </div>
            <p className="text-center text-sm text-gold/60 mt-3">{selected.user_name || 'User'} · {selected.protocol}</p>
            <button onClick={() => setSelected(null)} className="btn-outline-gold w-full mt-4 text-sm">Close</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── TRAFFIC VIEW ──────────────────────────────────────
function TrafficView() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const fetch = async () => { try { const data = await api('/configs'); setConfigs(data); } catch {}; setLoading(false); }; fetch(); }, []);
  const total = useMemo(() => configs.reduce((acc, c) => acc + (c.traffic_in || 0) + (c.traffic_out || 0), 0), [configs]);
  if (loading) return <div className="text-gold/30">Loading traffic data...</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="text-gold/50 text-sm">Traffic usage by config</h3><span className="text-gold text-sm">Total: {formatBytes(total)}</span></div>
      <div className="glass rounded-2xl border border-gold/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gold/5 border-b border-gold/10">
            <tr><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">User</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Protocol</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">In</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Out</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Total</th></tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.id} className="border-b border-gold/5 hover:bg-gold/5 transition">
                <td className="px-4 py-3 text-white">{c.user_name || '#' + c.user_id}</td>
                <td className="px-4 py-3 text-gold/60">{c.protocol}</td>
                <td className="px-4 py-3 text-gold/40">{formatBytes(c.traffic_in || 0)}</td>
                <td className="px-4 py-3 text-gold/40">{formatBytes(c.traffic_out || 0)}</td>
                <td className="px-4 py-3 text-gold">{formatBytes((c.traffic_in || 0) + (c.traffic_out || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LOGS VIEW ──────────────────────────────────────────
function LogsView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('all');
  useEffect(() => {
    const fetch = async () => { try { const data = await api('/logs'); setLogs(data); } catch {}; setLoading(false); };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);
  const filtered = useMemo(() => level === 'all' ? logs : logs.filter(l => l.level === level), [logs, level]);
  const levelColors: Record<string, string> = { info: 'text-blue-400 bg-blue-500/10', warn: 'text-yellow-400 bg-yellow-500/10', error: 'text-red-400 bg-red-500/10', success: 'text-green-400 bg-green-500/10' };
  if (loading) return <div className="text-gold/30">Loading logs...</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4"><h3 className="text-gold/50 text-sm">System logs</h3><select className="input-gold w-auto text-sm py-1.5 px-3" value={level} onChange={(e) => setLevel(e.target.value)}><option value="all">All</option><option value="info">Info</option><option value="success">Success</option><option value="warn">Warn</option><option value="error">Error</option></select></div>
      <div className="glass rounded-2xl border border-gold/10 overflow-hidden max-h-[500px] overflow-y-auto">
        {filtered.map((log) => (
          <div key={log.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-gold/5 hover:bg-gold/5 transition text-xs">
            <span className={`px-2 py-0.5 rounded-full ${levelColors[log.level] || 'text-gold/40'}`}>{log.level}</span>
            <span className="text-gold/30 flex-shrink-0">{formatDate(log.created_at)}</span>
            <span className="text-gold/60 flex-1">{log.message}</span>
            {log.username && <span className="text-gold/30">@{log.username}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SETTINGS VIEW ──────────────────────────────────────
function SettingsView() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  useEffect(() => { const fetch = async () => { try { const data = await api('/settings'); setSettings(data); } catch {}; setLoading(false); }; fetch(); }, []);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !value) return;
    try { await api('/settings', { method: 'POST', body: JSON.stringify({ key, value }) }); setSettings({ ...settings, [key]: value }); setKey(''); setValue(''); } catch { alert('Error saving setting'); }
  };
  if (loading) return <div className="text-gold/30">Loading settings...</div>;
  return (
    <div className="space-y-6">
      <h3 className="text-gold/50 text-sm">System settings</h3>
      <form onSubmit={handleSave} className="glass rounded-2xl p-4 border border-gold/10 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[150px]"><label className="text-xs text-gold/40">Key</label><input className="input-gold" placeholder="Setting key" value={key} onChange={(e) => setKey(e.target.value)} /></div>
        <div className="flex-1 min-w-[150px]"><label className="text-xs text-gold/40">Value</label><input className="input-gold" placeholder="Setting value" value={value} onChange={(e) => setValue(e.target.value)} /></div>
        <button type="submit" className="btn-gold">Add/Update</button>
      </form>
      <div className="glass rounded-2xl border border-gold/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gold/5 border-b border-gold/10"><tr><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Key</th><th className="px-4 py-3 text-left text-gold/40 font-medium text-xs uppercase tracking-wider">Value</th></tr></thead>
          <tbody>
            {Object.entries(settings).map(([k, v]) => (<tr key={k} className="border-b border-gold/5"><td className="px-4 py-3 text-gold/60 font-mono text-xs">{k}</td><td className="px-4 py-3 text-gold/40 text-xs">{v}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TERMINAL VIEW ──────────────────────────────────────
function TerminalView() {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>(['$ Welcome to Ultra Panel Terminal', '$ Type a command and press Enter']);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    const cmd = command.trim();
    setOutput(prev => [...prev, `$ ${cmd}`]);
    try {
      let result = '';
      if (cmd === 'help') result = 'Available: help, status, stats, users, servers, configs, clear, echo <text>, whoami, date';
      else if (cmd === 'status') { const stats = await api('/stats'); result = `System: ${stats.users} users, ${stats.servers} servers, ${stats.configs} configs, ${stats.onlineUsers} online`; }
      else if (cmd === 'stats') { const stats = await api('/stats'); result = `CPU: ${stats.cpu}%  RAM: ${stats.ram}%  Disk: ${stats.disk}%  Traffic: ${formatBytes(stats.traffic)}`; }
      else if (cmd === 'users') { const users = await api('/users'); result = users.map((u: any) => `${u.username} (${u.must_change_password ? 'pending' : 'active'})`).join('\n'); }
      else if (cmd === 'servers') { const servers = await api('/servers'); result = servers.map((s: any) => `${s.name} [${s.protocol}] ${s.host}:${s.port} (${s.status})`).join('\n'); }
      else if (cmd === 'configs') { const configs = await api('/configs'); result = `${configs.length} configs found`; }
      else if (cmd === 'clear') { setOutput([]); setCommand(''); return; }
      else if (cmd.startsWith('echo ')) result = cmd.slice(5);
      else if (cmd === 'whoami') result = 'reza grootz (admin)';
      else if (cmd === 'date') result = new Date().toISOString();
      else result = `Command not found: ${cmd}. Type 'help' for available commands.`;
      setOutput(prev => [...prev, result]);
    } catch { setOutput(prev => [...prev, 'Error executing command']); }
    setCommand('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-gold/50 text-sm">Terminal · System Console</h3>
      <div className="glass rounded-2xl border border-gold/10 p-4 bg-black/60 font-mono text-xs">
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {output.map((line, i) => (<div key={i} className={line.startsWith('$') ? 'text-gold/60' : line.startsWith('Error') ? 'text-red-400' : 'text-green-400'}>{line}</div>))}
        </div>
        <form onSubmit={handleCommand} className="mt-3 flex items-center gap-2 border-t border-gold/10 pt-3">
          <span className="text-gold/40">$</span>
          <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} className="flex-1 bg-transparent outline-none text-gold/80 placeholder:text-gold/20" placeholder="Enter command..." autoFocus />
        </form>
      </div>
    </div>
  );
}

// ─── BACKUP VIEW ────────────────────────────────────────
function BackupView() {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const data = await api('/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Backup failed'); }
    setLoading(false);
  };

  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try { const data = JSON.parse(text); await api('/restore', { method: 'POST', body: JSON.stringify({ backup: data.backup }) }); alert('Restore initiated successfully'); } catch { alert('Invalid backup file'); }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-gold/50 text-sm">Backup & Restore</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 border border-gold/10 text-center">
          <Database className="w-10 h-10 text-gold/30 mx-auto mb-3" />
          <h4 className="text-white font-medium">Create Backup</h4>
          <p className="text-xs text-gold/30 mt-1">Export all system data as JSON</p>
          <button onClick={handleBackup} disabled={loading} className="btn-gold mt-4 w-full text-sm">{loading ? 'Creating...' : 'Download Backup'}</button>
        </div>
        <div className="glass rounded-2xl p-6 border border-gold/10 text-center">
          <RefreshCw className="w-10 h-10 text-gold/30 mx-auto mb-3" />
          <h4 className="text-white font-medium">Restore Backup</h4>
          <p className="text-xs text-gold/30 mt-1">Upload a backup JSON file</p>
          <button onClick={handleRestore} className="btn-outline-gold mt-4 w-full text-sm">Upload & Restore</button>
        </div>
      </div>
    </div>
  );
}
