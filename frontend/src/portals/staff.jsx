import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText
} from 'lucide-react';
import './staff.css';

const API = import.meta.env.VITE_API_URL || '/api';

// Portal identity is selected by the single-host path: /staff
const kind = 'staff';
const ALLOWED_ROLES = ['TECHNICIAN','STAFF','HUB_MANAGER','CENTRAL_ADMIN','SUPER_ADMIN'];

const PORTAL_CFG = {
  customer:   { title: 'Customer Portal',    accent: 'Customer Operations' },
  staff:      { title: 'Staff Portal',       accent: 'Service Operations' , email: 'staff@ev.local'},
  franchisee: { title: 'Franchisee Portal',  accent: 'Business Intelligence' },
  command:    { title: 'Central Command',    accent: 'Enterprise Control' },
};
const cfg = PORTAL_CFG[kind];

const NAV_ITEMS = {
  customer: [
    { id: 'dashboard',  label: 'Dashboard',    Icon: LayoutDashboard },
    { id: 'vehicles',   label: 'My Vehicles',  Icon: Car },
    { id: 'bookings',   label: 'Bookings',     Icon: ClipboardList },
    { id: 'wallet',     label: 'Wallet',       Icon: Wallet },
    { id: 'invoices',   label: 'Invoices',     Icon: FileText },
    { id: 'complaints', label: 'Support',      Icon: Bell },
  ],
  staff: [
    { id: 'dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
    { id: 'jobs',        label: 'Job Queue',   Icon: ClipboardList },
    { id: 'inventory',   label: 'Inventory',   Icon: Package },
    { id: 'technicians', label: 'Technicians', Icon: Users },
    { id: 'suppliers',   label: 'Suppliers',   Icon: Truck },
  ],
  franchisee: [
    { id: 'dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
    { id: 'financials', label: 'Financials',  Icon: DollarSign },
    { id: 'inventory',  label: 'Inventory',   Icon: Package },
    { id: 'staff',      label: 'Staff',       Icon: Users },
    { id: 'jobs',       label: 'Jobs',        Icon: ClipboardList },
  ],
  command: [
    { id: 'dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
    { id: 'hubs',        label: 'Hubs',        Icon: Factory },
    { id: 'chargers',    label: 'Chargers',    Icon: Zap },
    { id: 'operations',  label: 'Live Ops',    Icon: Activity },
    { id: 'revenue',     label: 'Revenue',     Icon: DollarSign },
    { id: 'anomalies',   label: 'Anomalies',   Icon: AlertTriangle },
    { id: 'franchisees', label: 'Franchisees', Icon: Users },
    { id: 'demand',      label: 'Demand',      Icon: TrendingUp },
    { id: 'expansion',   label: 'Expansion',   Icon: MapPin },
  ],
};

// ── Axios helper — always reads token fresh from localStorage, auto-refreshes on 401 ──
function api() {
  return async (path, opts = {}) => {
    const token = localStorage.getItem('ev_staff_token');
    try {
      const r = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${token}` }, ...opts });
      return r.data;
    } catch (err) {
      if (err.response?.status === 401) {
        const rt = localStorage.getItem('ev_staff_refresh_token');
        if (rt) {
          try {
            const { data } = await axios.post(`${API}/auth/refresh`, { refreshToken: rt });
            localStorage.setItem('ev_staff_token', data.accessToken);
            localStorage.setItem('ev_staff_refresh_token', data.refreshToken);
            const retry = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${data.accessToken}` }, ...opts });
            return retry.data;
          } catch (_) {
            localStorage.removeItem('ev_staff_token');
            localStorage.removeItem('ev_staff_refresh_token');
            window.location.reload();
            return;
          }
        } else {
          localStorage.removeItem('ev_staff_token');
          window.location.reload();
          return;
        }
      }
      throw err;
    }
  };
}

// ── useFetch hook ──────────────────────────────────────────────────
function useFetch(call, path) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    call(path)
      .then(d  => { if (alive) setData(d); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path]);
  return { data, loading, error };
}

// ══════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [token,   setToken]   = useState(() => localStorage.getItem('ev_staff_token'));
  const [user,    setUser]    = useState(null);
  const [creds,   setCreds]   = useState({ email: cfg.email || '', password: 'Password123!' });
  const [busy,    setBusy]    = useState(false);
  const [page,    setPage]    = useState('dashboard');
  // Forgot password flow: 'login' | 'forgot' | 'otp' | 'newpass' | 'done'
  const [authView, setAuthView] = useState('login');
  const [fpEmail,  setFpEmail]  = useState('');
  const [fpOtp,    setFpOtp]    = useState('');
  const [fpNew,    setFpNew]    = useState('');
  const [fpBusy,   setFpBusy]   = useState(false);
  const [fpError,  setFpError]  = useState('');
  const call = api();

  useEffect(() => {
    if (!token) return;
    call('/auth/me')
      .then(u => {
        if (!ALLOWED_ROLES.includes(u.role)) {
          localStorage.removeItem('ev_staff_token');
          localStorage.removeItem('ev_staff_refresh_token');
          setToken(null); setUser(null); return;
        }
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem('ev_staff_token');
        localStorage.removeItem('ev_staff_refresh_token');
        setToken(null);
      });
  }, []);

  const login = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const res = await axios.post(`${API}/auth/login`, creds);
      const tok = res.data.accessToken;
      const rt  = res.data.refreshToken;
      localStorage.setItem('ev_staff_token', tok);
      if (rt) localStorage.setItem('ev_staff_refresh_token', rt);
      if (!ALLOWED_ROLES.includes(res.data.user.role))
        throw new Error(`This account belongs to the ${res.data.user.role} portal.`);
      setToken(tok); setUser(res.data.user);
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const sendFpOtp = async e => {
    e.preventDefault(); setFpBusy(true); setFpError('');
    try {
      await axios.post(`${API}/auth/staff/forgot-password`, { email: fpEmail });
      setAuthView('otp');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setFpBusy(false); }
  };

  const verifyFpOtp = async e => {
    e.preventDefault(); setFpBusy(true); setFpError('');
    try {
      await axios.post(`${API}/auth/staff/verify-reset-otp`, { email: fpEmail, otp: fpOtp });
      setAuthView('newpass');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Invalid OTP');
    } finally { setFpBusy(false); }
  };

  const resetPassword = async e => {
    e.preventDefault(); setFpBusy(true); setFpError('');
    if (fpNew.length < 6) { setFpError('Password must be at least 6 characters'); setFpBusy(false); return; }
    try {
      await axios.post(`${API}/auth/staff/reset-password`, { email: fpEmail, otp: fpOtp, newPassword: fpNew });
      setAuthView('done');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Reset failed');
    } finally { setFpBusy(false); }
  };

  const logout = () => {
    localStorage.removeItem('ev_staff_token');
    localStorage.removeItem('ev_staff_refresh_token');
    setToken(null); setUser(null); setPage('dashboard');
  };

  if (!token) {
    return <LoginPage
      creds={creds} setCreds={setCreds} onSubmit={login} busy={busy}
      authView={authView} setAuthView={setAuthView}
      fpEmail={fpEmail} setFpEmail={setFpEmail}
      fpOtp={fpOtp} setFpOtp={setFpOtp}
      fpNew={fpNew} setFpNew={setFpNew}
      fpBusy={fpBusy} fpError={fpError}
      sendFpOtp={sendFpOtp} verifyFpOtp={verifyFpOtp} resetPassword={resetPassword}
    />;
  }
  return <Shell user={user} page={page} setPage={setPage} call={call} logout={logout} />;
}

// ══════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════
function LoginPage({
  creds, setCreds, onSubmit, busy,
  authView, setAuthView,
  fpEmail, setFpEmail, fpOtp, setFpOtp, fpNew, setFpNew,
  fpBusy, fpError, sendFpOtp, verifyFpOtp, resetPassword,
}) {
  const logoBlock = (
    <>
      <div className="login-logo">
        <div className="logo-icon"><Zap size={22} /></div>
        <span className="logo-text">EV CORE</span>
      </div>
      <p className="login-sub">{cfg.accent}</p>
    </>
  );

  if (authView === 'forgot') return (
    <div className="login-wrap">
      <div className="login-box">
        {logoBlock}
        <h2 className="login-title">Forgot Password</h2>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>
          Enter your staff email. A 6-digit OTP will be sent to reset your password.
        </p>
        <form onSubmit={sendFpOtp} className="login-form">
          <label>Staff Email
            <input type="email" value={fpEmail} required
              onChange={e => setFpEmail(e.target.value)} placeholder="your@email.com" />
          </label>
          {fpError && <p style={{ color:'#dc2626', fontSize:13, margin:0 }}>{fpError}</p>}
          <button type="submit" disabled={fpBusy}>{fpBusy ? 'Sending OTP…' : 'Send OTP'}</button>
        </form>
        <p style={{ textAlign:'center', marginTop:12 }}>
          <button style={{ background:'none', border:'none', color:'#2563eb', cursor:'pointer', fontSize:13 }}
            onClick={() => setAuthView('login')}>← Back to Login</button>
        </p>
      </div>
    </div>
  );

  if (authView === 'otp') return (
    <div className="login-wrap">
      <div className="login-box">
        {logoBlock}
        <h2 className="login-title">Enter OTP</h2>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>
          A 6-digit OTP was sent to <strong>{fpEmail}</strong>. Enter it below.
        </p>
        <form onSubmit={verifyFpOtp} className="login-form">
          <label>OTP Code
            <input type="text" value={fpOtp} required maxLength={6}
              onChange={e => setFpOtp(e.target.value)}
              placeholder="6-digit code"
              style={{ letterSpacing:'6px', fontWeight:700, textAlign:'center' }} />
          </label>
          {fpError && <p style={{ color:'#dc2626', fontSize:13, margin:0 }}>{fpError}</p>}
          <button type="submit" disabled={fpBusy}>{fpBusy ? 'Verifying…' : 'Verify OTP'}</button>
        </form>
        <p style={{ textAlign:'center', marginTop:12 }}>
          <button style={{ background:'none', border:'none', color:'#2563eb', cursor:'pointer', fontSize:13 }}
            onClick={() => setAuthView('forgot')}>← Resend OTP</button>
        </p>
      </div>
    </div>
  );

  if (authView === 'newpass') return (
    <div className="login-wrap">
      <div className="login-box">
        {logoBlock}
        <h2 className="login-title">Set New Password</h2>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>
          OTP verified ✓ — Choose a new password for <strong>{fpEmail}</strong>.
        </p>
        <form onSubmit={resetPassword} className="login-form">
          <label>New Password
            <input type="password" value={fpNew} required minLength={6}
              onChange={e => setFpNew(e.target.value)} placeholder="Min 6 characters" />
          </label>
          {fpError && <p style={{ color:'#dc2626', fontSize:13, margin:0 }}>{fpError}</p>}
          <button type="submit" disabled={fpBusy}>{fpBusy ? 'Saving…' : 'Save New Password'}</button>
        </form>
      </div>
    </div>
  );

  if (authView === 'done') return (
    <div className="login-wrap">
      <div className="login-box" style={{ textAlign:'center' }}>
        {logoBlock}
        <div style={{ fontSize:48, margin:'24px 0 8px' }}>✅</div>
        <h2 className="login-title">Password Reset!</h2>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>
          Your password has been updated. You can now log in with your new password.
        </p>
        <button className="login-form" style={{ width:'100%' }}
          onClick={() => setAuthView('login')}>Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="login-wrap">
      <div className="login-box">
        {logoBlock}
        <h2 className="login-title">{cfg.title}</h2>
        <form onSubmit={onSubmit} className="login-form">
          <label>Email
            <input type="email" value={creds.email}
              onChange={e => setCreds({ ...creds, email: e.target.value })} />
          </label>
          <label>Password
            <input type="password" value={creds.password}
              onChange={e => setCreds({ ...creds, password: e.target.value })} />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p style={{ textAlign:'center', marginTop:8 }}>
          <button style={{ background:'none', border:'none', color:'#2563eb', cursor:'pointer', fontSize:13 }}
            onClick={() => setAuthView('forgot')}>Forgot Password?</button>
        </p>
        <p className="login-hint">Demo&nbsp;&mdash;&nbsp;<strong>{cfg.email || ''}</strong> / <strong>Password123!</strong></p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHELL WITH SIDEBAR
// ══════════════════════════════════════════════════════════════════
function Shell({ user, page, setPage, call, logout }) {
  const navItems = NAV_ITEMS[kind] || NAV_ITEMS.command;

  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon sm"><Zap size={16} /></div>
          <span className="logo-text">EV CORE</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={'nav-item' + (page === id ? ' active' : '')}
              onClick={() => setPage(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="nav-item logout-btn" onClick={logout}>
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="main-wrap">
        <header className="topbar">
          <div>
            <div className="topbar-sub">{cfg.accent}</div>
            <div className="topbar-title">{cfg.title}</div>
          </div>
          <div className="topbar-user">
            <div className="avatar">{user?.name?.[0] ?? '?'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
        </header>

        <div className="page-body">
          <PageRouter page={page} call={call} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE ROUTER
// ══════════════════════════════════════════════════════════════════
function PageRouter({ page, call }) {
  const P = { page, call };
  if (kind === 'customer') {
    const pages = {
      dashboard: <CustDashboard {...P} />, vehicles: <CustVehicles {...P} />,
      bookings: <CustBookings {...P} />,   wallet: <CustWallet {...P} />,
      invoices: <CustInvoices {...P} />,   complaints: <CustComplaints {...P} />,
    };
    return pages[page] || pages.dashboard;
  }
  if (kind === 'staff') {
    const pages = {
      dashboard: <StaffDashboard {...P} />, jobs: <StaffJobs {...P} />,
      inventory: <StaffInventory {...P} />, technicians: <StaffTechnicians {...P} />,
      suppliers: <StaffSuppliers {...P} />,
    };
    return pages[page] || pages.dashboard;
  }
  if (kind === 'franchisee') {
    const pages = {
      dashboard: <FranDashboard {...P} />, financials: <FranFinancials {...P} />,
      inventory: <FranInventory {...P} />, staff: <FranStaff {...P} />,
      jobs: <FranJobs {...P} />,
    };
    return pages[page] || pages.dashboard;
  }
  // command
  const pages = {
    dashboard: <AdminDashboard {...P} />, hubs: <AdminHubs {...P} />,
    chargers: <AdminChargers {...P} />,   operations: <AdminOps {...P} />,
    revenue: <AdminRevenue {...P} />,     anomalies: <AdminAnomalies {...P} />,
    franchisees: <AdminFranchisees {...P} />, demand: <AdminDemand {...P} />,
    expansion: <AdminExpansion {...P} />,
  };
  return pages[page] || pages.dashboard;
}

// ══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════
function PageHeader({ title, sub }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </div>
  );
}

function MetricGrid({ metrics }) {
  return (
    <div className="metric-grid">
      {metrics.map(({ label, value, Icon, color }) => (
        <div className="metric-card" key={label}>
          <div className="metric-icon" style={{ background: color + '18', color }}>
            <Icon size={20} />
          </div>
          <div className="metric-body">
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value ?? '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, badge, children }) {
  return (
    <div className="card">
      {(title || badge) && (
        <div className="card-head">
          {title && <div className="card-title">{title}</div>}
          {badge && <span className="badge">{badge}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

const STATUS_COLOR = {
  COMPLETED: '#16a34a', ACTIVE: '#2563eb', PENDING: '#d97706',
  CANCELLED: '#dc2626', ASSIGNED: '#7c3aed', HIGH: '#dc2626',
  MEDIUM: '#d97706', LOW: '#16a34a', PAID: '#16a34a', AVAILABLE: '#16a34a',
  IN_USE: '#2563eb', OFFLINE: '#dc2626',
};

function DataTable({ rows = [], cols = [] }) {
  if (!rows?.length) return <div className="empty">No records found.</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>{cols.map(c => <th key={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r?._id || i}>
              {cols.map(c => {
                const v = r?.[c];
                const color = STATUS_COLOR[v];
                return (
                  <td key={c}>
                    {color
                      ? <span className="status-pill" style={{ background: color + '18', color }}>{v}</span>
                      : typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
    </div>
  );
}

function Err({ msg }) {
  return <div className="empty" style={{ color: '#dc2626' }}>Error: {msg}</div>;
}

// ══════════════════════════════════════════════════════════════════
// CUSTOMER PAGES
// ══════════════════════════════════════════════════════════════════
function CustDashboard({ call }) {
  const { data: v, loading: lv } = useFetch(call, '/customer/vehicles');
  const { data: b, loading: lb } = useFetch(call, '/customer/bookings');
  if (lv || lb) return <Loader />;
  const active = b?.filter(x => !['COMPLETED', 'CANCELLED'].includes(x.status)) || [];
  return <>
    <PageHeader title="My Dashboard" sub="Overview of your vehicles and bookings." />
    <MetricGrid metrics={[
      { label: 'Vehicles',      value: v?.length ?? 0,      Icon: Car,          color: '#2563eb' },
      { label: 'Total Bookings',value: b?.length ?? 0,      Icon: ClipboardList,color: '#7c3aed' },
      { label: 'Active Jobs',   value: active.length,       Icon: Activity,     color: '#d97706' },
      { label: 'Completed',     value: b?.filter(x => x.status === 'COMPLETED').length ?? 0, Icon: CheckCircle, color: '#16a34a' },
    ]} />
    <div className="two-col">
      <Card title="Recent Bookings" badge="Live">
        <DataTable rows={b?.slice(0, 8)} cols={['serviceType', 'status', 'trackingStatus', 'totalAmount']} />
      </Card>
      <Card title="My Vehicles">
        <DataTable rows={v?.slice(0, 8)} cols={['vin', 'model', 'batterySoc', 'status']} />
      </Card>
    </div>
  </>;
}

function CustVehicles({ call }) {
  const { data, loading, error } = useFetch(call, '/customer/vehicles');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="My Vehicles" sub="All registered electric vehicles." />
    <Card title="Vehicle Fleet" badge={`${data?.length ?? 0} vehicles`}>
      <DataTable rows={data} cols={['vin', 'model', 'year', 'batterySoc', 'batterySoh', 'status']} />
    </Card>
  </>;
}

function CustBookings({ call }) {
  const { data, loading, error } = useFetch(call, '/customer/bookings');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="My Bookings" sub="Service history and active jobs." />
    <Card title="All Bookings" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['serviceType', 'status', 'priority', 'trackingStatus', 'totalAmount']} />
    </Card>
  </>;
}

function CustWallet({ call }) {
  const { data: w, loading: lw } = useFetch(call, '/customer/wallet');
  const { data: tx, loading: lt } = useFetch(call, '/customer/wallet/transactions');
  if (lw || lt) return <Loader />;
  return <>
    <PageHeader title="Wallet" sub="Balance and transactions." />
    <MetricGrid metrics={[
      { label: 'Balance',       value: `₹${(w?.balance ?? 0).toLocaleString()}`, Icon: Wallet,   color: '#16a34a' },
      { label: 'Transactions',  value: tx?.length ?? 0,                           Icon: Activity, color: '#2563eb' },
    ]} />
    <Card title="Transaction History">
      <DataTable rows={tx} cols={['type', 'amount', 'description', 'createdAt']} />
    </Card>
  </>;
}

function CustInvoices({ call }) {
  const { data, loading, error } = useFetch(call, '/customer/invoices');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Invoices" sub="Payment records and receipts." />
    <Card title="All Invoices" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['invoiceNumber', 'amount', 'status', 'createdAt']} />
    </Card>
  </>;
}

function CustComplaints({ call }) {
  const { data, loading, error } = useFetch(call, '/customer/complaints');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Support & Complaints" sub="Raise and track support tickets." />
    <Card title="My Complaints" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['subject', 'status', 'priority', 'createdAt']} />
    </Card>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// STAFF PAGES
// ══════════════════════════════════════════════════════════════════
function StaffDashboard({ call }) {
  const { data: jobs, loading: lj } = useFetch(call, '/staff/jobs');
  const { data: inv,  loading: li } = useFetch(call, '/staff/inventory');
  const { data: tech, loading: lt } = useFetch(call, '/staff/technicians');
  if (lj || li || lt) return <Loader />;
  const open = jobs?.filter(j => !['COMPLETED', 'CANCELLED'].includes(j.status)) || [];
  return <>
    <PageHeader title="Staff Dashboard" sub="Jobs, inventory and technician overview." />
    <MetricGrid metrics={[
      { label: 'Open Jobs',      value: open.length,       Icon: ClipboardList, color: '#d97706' },
      { label: 'Total Jobs',     value: jobs?.length ?? 0, Icon: Activity,      color: '#2563eb' },
      { label: 'Inventory SKUs', value: inv?.length ?? 0,  Icon: Package,       color: '#7c3aed' },
      { label: 'Technicians',    value: tech?.length ?? 0, Icon: Users,         color: '#16a34a' },
    ]} />
    <div className="two-col">
      <Card title="Active Jobs" badge="Live">
        <DataTable rows={open?.slice(0, 8)} cols={['serviceType', 'status', 'priority', 'trackingStatus']} />
      </Card>
      <Card title="Low Stock" badge="Alert">
        <DataTable rows={inv?.filter(i => i.quantity <= i.reorderLevel)?.slice(0, 8)} cols={['sku', 'name', 'quantity', 'reorderLevel']} />
      </Card>
    </div>
  </>;
}

function StaffJobs({ call }) {
  const { data, loading, error } = useFetch(call, '/staff/jobs');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Job Queue" sub="All service jobs across the network." />
    <MetricGrid metrics={[
      { label: 'Total',     value: data?.length ?? 0,                                         Icon: ClipboardList, color: '#2563eb' },
      { label: 'Pending',   value: data?.filter(j => j.status === 'PENDING').length ?? 0,     Icon: Activity,      color: '#d97706' },
      { label: 'Assigned',  value: data?.filter(j => j.status === 'ASSIGNED').length ?? 0,    Icon: Users,         color: '#7c3aed' },
      { label: 'Completed', value: data?.filter(j => j.status === 'COMPLETED').length ?? 0,   Icon: CheckCircle,   color: '#16a34a' },
    ]} />
    <Card title="All Jobs" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['serviceType', 'status', 'priority', 'trackingStatus', 'createdAt']} />
    </Card>
  </>;
}

function StaffInventory({ call }) {
  const { data, loading, error } = useFetch(call, '/staff/inventory');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Inventory" sub="Spare parts and stock management." />
    <MetricGrid metrics={[
      { label: 'Total SKUs',   value: data?.length ?? 0,                                         Icon: Package,       color: '#2563eb' },
      { label: 'Low Stock',    value: data?.filter(i => i.quantity <= i.reorderLevel).length ?? 0, Icon: AlertTriangle, color: '#d97706' },
      { label: 'Out of Stock', value: data?.filter(i => i.quantity === 0).length ?? 0,            Icon: AlertTriangle, color: '#dc2626' },
    ]} />
    <Card title="All Inventory" badge={`${data?.length ?? 0} SKUs`}>
      <DataTable rows={data} cols={['sku', 'name', 'quantity', 'reorderLevel', 'unitPrice']} />
    </Card>
  </>;
}

function StaffTechnicians({ call }) {
  const { data, loading, error } = useFetch(call, '/staff/technicians');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Technicians" sub="Active field technicians." />
    <Card title="Technician Directory" badge={`${data?.length ?? 0} active`}>
      <DataTable rows={data} cols={['name', 'phone', 'hubId']} />
    </Card>
  </>;
}

function StaffSuppliers({ call }) {
  const { data, loading, error } = useFetch(call, '/staff/suppliers');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Suppliers" sub="Approved parts suppliers." />
    <Card title="Supplier List" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['name', 'contact', 'email', 'category']} />
    </Card>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// FRANCHISEE PAGES
// ══════════════════════════════════════════════════════════════════
function FranDashboard({ call }) {
  const { data: d, loading: ld } = useFetch(call, '/franchise/dashboard');
  const { data: f, loading: lf } = useFetch(call, '/franchise/financials');
  if (ld || lf) return <Loader />;
  return <>
    <PageHeader title="Franchise Dashboard" sub="Revenue, jobs and performance." />
    <MetricGrid metrics={[
      { label: 'Revenue',    value: `₹${(d?.revenue ?? 0).toLocaleString()}`, Icon: DollarSign, color: '#16a34a' },
      { label: 'Total Jobs', value: d?.jobs ?? 0,                              Icon: ClipboardList, color: '#2563eb' },
      { label: 'ROI',        value: `${d?.roi ?? 0}%`,                         Icon: TrendingUp, color: '#7c3aed' },
      { label: 'Payback',    value: `${f?.paybackMonths ?? 0} mo`,             Icon: Gauge,      color: '#d97706' },
    ]} />
    <div className="two-col">
      <Card title="Financial Summary">
        <DataTable rows={[f]} cols={['revenue', 'expenses', 'cashflow', 'capex', 'emi']} />
      </Card>
      <Card title="Network Metrics">
        {[['Hubs', d?.hubs], ['Chargers', d?.chargers], ['Customers', d?.customers]].map(([k, v]) => (
          <div className="kv-row" key={k}><span>{k}</span><strong>{v ?? '—'}</strong></div>
        ))}
      </Card>
    </div>
  </>;
}

function FranFinancials({ call }) {
  const { data, loading, error } = useFetch(call, '/franchise/financials');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Financials" sub="Revenue, costs and ROI." />
    <MetricGrid metrics={[
      { label: 'Revenue',  value: `₹${(data?.revenue ?? 0).toLocaleString()}`,  Icon: DollarSign, color: '#16a34a' },
      { label: 'Expenses', value: `₹${(data?.expenses ?? 0).toLocaleString()}`, Icon: Activity,   color: '#dc2626' },
      { label: 'Cashflow', value: `₹${(data?.cashflow ?? 0).toLocaleString()}`, Icon: TrendingUp, color: '#16a34a' },
      { label: 'CAPEX',    value: `₹${(data?.capex ?? 0).toLocaleString()}`,    Icon: Factory,    color: '#d97706' },
    ]} />
    <Card title="Full Breakdown">
      <DataTable rows={[data]} cols={['revenue', 'expenses', 'cashflow', 'capex', 'emi', 'paybackMonths']} />
    </Card>
  </>;
}

function FranInventory({ call }) {
  const { data, loading, error } = useFetch(call, '/franchise/inventory');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Inventory" sub="Hub parts and stock levels." />
    <Card title="Inventory" badge={`${data?.length ?? 0} SKUs`}>
      <DataTable rows={data} cols={['sku', 'name', 'quantity', 'reorderLevel', 'unitPrice']} />
    </Card>
  </>;
}

function FranStaff({ call }) {
  const { data, loading, error } = useFetch(call, '/franchise/staff');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Staff" sub="Hub staff and technicians." />
    <Card title="Staff Directory" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['name', 'role', 'active', 'hubId']} />
    </Card>
  </>;
}

function FranJobs({ call }) {
  const { data, loading, error } = useFetch(call, '/franchise/jobs');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Jobs" sub="Total jobs count." />
    <MetricGrid metrics={[
      { label: 'Total Jobs', value: typeof data === 'number' ? data : 0, Icon: ClipboardList, color: '#2563eb' },
    ]} />
  </>;
}

// ══════════════════════════════════════════════════════════════════
// ADMIN / COMMAND-CENTER PAGES
// ══════════════════════════════════════════════════════════════════
function AdminDashboard({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/dashboard');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Enterprise Command Center" sub="Full network overview — hubs, revenue and live operations." />
    <MetricGrid metrics={[
      { label: 'Hubs',      value: data?.hubs ?? 0,                               Icon: Factory,      color: '#2563eb' },
      { label: 'Chargers',  value: data?.chargers ?? 0,                            Icon: Zap,          color: '#7c3aed' },
      { label: 'Open Jobs', value: data?.openJobs ?? 0,                            Icon: ClipboardList,color: '#d97706' },
      { label: 'Revenue',   value: `₹${(data?.revenue ?? 0).toLocaleString()}`,    Icon: DollarSign,   color: '#16a34a' },
    ]} />
  </>;
}

function AdminHubs({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/hubs');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Charging Hubs" sub="All hub locations across the network." />
    <Card title="Hub Network" badge={`${data?.length ?? 0} hubs`}>
      <DataTable rows={data} cols={['name', 'city', 'state', 'pincode', 'capacity', 'status']} />
    </Card>
  </>;
}

function AdminChargers({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/chargers');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Chargers" sub="All charging units across hubs." />
    <MetricGrid metrics={[
      { label: 'Total',     value: data?.length ?? 0,                                          Icon: Zap,          color: '#2563eb' },
      { label: 'Available', value: data?.filter(c => c.status === 'AVAILABLE').length ?? 0,   Icon: CheckCircle,  color: '#16a34a' },
      { label: 'In Use',    value: data?.filter(c => c.status === 'IN_USE').length ?? 0,      Icon: Activity,     color: '#7c3aed' },
      { label: 'Offline',   value: data?.filter(c => c.status === 'OFFLINE').length ?? 0,     Icon: AlertTriangle,color: '#dc2626' },
    ]} />
    <Card title="All Chargers">
      <DataTable rows={data} cols={['serialNo', 'type', 'powerKw', 'status', 'lastHeartbeat']} />
    </Card>
  </>;
}

function AdminOps({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/live-operations');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Live Operations" sub="Real-time service jobs across all hubs." />
    <MetricGrid metrics={[
      { label: 'Active Jobs',   value: data?.length ?? 0,                                   Icon: Activity,     color: '#2563eb' },
      { label: 'High Priority', value: data?.filter(j => j.priority === 'HIGH').length ?? 0, Icon: AlertTriangle,color: '#dc2626' },
    ]} />
    <Card title="Live Job Stream" badge="Real-time">
      <DataTable rows={data} cols={['serviceType', 'status', 'priority', 'trackingStatus', 'createdAt']} />
    </Card>
  </>;
}

function AdminRevenue({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/revenue');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  const rev = Array.isArray(data) ? data[0] : data;
  return <>
    <PageHeader title="Revenue" sub="Network-wide payment and revenue summary." />
    <MetricGrid metrics={[
      { label: 'Total Revenue', value: `₹${(rev?.total ?? 0).toLocaleString()}`, Icon: DollarSign, color: '#16a34a' },
      { label: 'Transactions',  value: rev?.transactions ?? 0,                    Icon: Activity,   color: '#2563eb' },
    ]} />
    <Card title="Revenue Summary">
      <DataTable rows={[rev]} cols={['total', 'transactions']} />
    </Card>
  </>;
}

function AdminAnomalies({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/anomalies');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Anomaly Detection" sub="Rule-based fraud and anomaly alerts." />
    <MetricGrid metrics={[
      { label: 'Total Alerts',  value: data?.length ?? 0,                                        Icon: AlertTriangle, color: '#d97706' },
      { label: 'High Severity', value: data?.filter(a => a.severity === 'HIGH').length ?? 0,     Icon: Shield,        color: '#dc2626' },
    ]} />
    <Card title="Anomalies" badge={`${data?.length ?? 0} alerts`}>
      <DataTable rows={data} cols={['type', 'severity', 'reason', 'customerId']} />
    </Card>
  </>;
}

function AdminFranchisees({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/franchisees');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Franchisees" sub="All franchise partners." />
    <Card title="Franchisee Directory" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['name', 'email', 'phone']} />
    </Card>
  </>;
}

function AdminDemand({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/demand');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Demand Analysis" sub="City-wise EV demand and capacity gaps." />
    <Card title="Demand by City" badge="AI Scored">
      <DataTable rows={data} cols={['city', 'demandScore', 'capacityGap']} />
    </Card>
  </>;
}

function AdminExpansion({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/expansion');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Expansion Engine" sub="AI-powered site viability analysis." />
    <MetricGrid metrics={[
      { label: 'Demand Score',  value: data?.demandScore,                                          Icon: TrendingUp, color: '#2563eb' },
      { label: 'Monthly Rev',  value: `₹${(data?.expectedRevenueMonthly ?? 0).toLocaleString()}`,  Icon: DollarSign, color: '#16a34a' },
      { label: 'Expected Cost',value: `₹${(data?.expectedCost ?? 0).toLocaleString()}`,            Icon: Factory,    color: '#d97706' },
      { label: 'ROI',          value: `${data?.roi ?? 0}%`,                                        Icon: Gauge,      color: '#7c3aed' },
    ]} />
    <Card title="Full Analysis">
      <div className="kv-list">
        {data && Object.entries(data).map(([k, v]) => (
          <div className="kv-row" key={k}>
            <span>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
            <strong style={k === 'recommendation' ? { color: '#16a34a', fontWeight: 700 } : {}}>
              {String(v)}
            </strong>
          </div>
        ))}
      </div>
    </Card>
  </>;
}