import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText,
  Plus, X, Save, Eye, EyeOff, UserPlus, BarChart2, RefreshCw,
  Clock, Key, UserCheck, UserX, UserMinus, Image, Layers, Hash
} from 'lucide-react';
import './command.css';

const API = import.meta.env.VITE_API_URL || '/api';

// Portal identity is selected by the single-host path: /command
const kind = 'command';
const ALLOWED_ROLES = ['CENTRAL_ADMIN','SUPER_ADMIN'];

const PORTAL_CFG = {
  customer:   { title: 'Customer Portal',    accent: 'Customer Operations' },
  staff:      { title: 'Staff Portal',       accent: 'Service Operations' },
  franchisee: { title: 'Franchisee Portal',  accent: 'Business Intelligence' },
  command:    { title: 'Central Command',    accent: 'Enterprise Control', email: 'admin@ev.local' },
};
const cfg = PORTAL_CFG[kind];

const NAV_ITEMS = {
  customer: [
    { id: 'dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
    { id: 'vehicles',   label: 'My Vehicles', Icon: Car },
    { id: 'bookings',   label: 'Bookings',    Icon: ClipboardList },
    { id: 'wallet',     label: 'Wallet',      Icon: Wallet },
    { id: 'invoices',   label: 'Invoices',    Icon: FileText },
    { id: 'complaints', label: 'Support',     Icon: Bell },
  ],
  staff: [
    { id: 'dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
    { id: 'jobs',        label: 'Job Queue',   Icon: ClipboardList },
    { id: 'inventory',   label: 'Inventory',   Icon: Package },
    { id: 'technicians', label: 'Technicians', Icon: Users },
    { id: 'suppliers',   label: 'Suppliers',   Icon: Truck },
  ],
  franchisee: [
    { id: 'dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
    { id: 'financials', label: 'Financials', Icon: DollarSign },
    { id: 'inventory',  label: 'Inventory',  Icon: Package },
    { id: 'staff',      label: 'Staff',      Icon: Users },
    { id: 'jobs',       label: 'Jobs',       Icon: ClipboardList },
  ],
  command: [
    { id: 'dashboard',           label: 'Dashboard',              Icon: LayoutDashboard },
    { id: 'hubs',                label: 'Hubs',                   Icon: Factory },
    { id: 'franchisees',         label: 'Franchisees',            Icon: Users },
    { id: 'vehicle-inventory',   label: 'Vehicle & Inventory',    Icon: Layers },
    { id: 'vehicle-approvals',   label: 'Vehicle Approvals',      Icon: Car },
    { id: 'staff-directory',     label: 'Staff Directory',        Icon: Users },
    { id: 'customers',           label: 'Customers',              Icon: Users },
    { id: 'franchise-ratings',   label: 'Franchisee Ratings',     Icon: BarChart2 },
    { id: 'customer-payments',   label: 'Customer Payments',      Icon: DollarSign },
    { id: 'demand',              label: 'Demand',                 Icon: TrendingUp },
  ],
};

// ── Axios helper — always reads token fresh from localStorage, auto-refreshes on 401 ──
function api() {
  return async (path, opts = {}) => {
    const token = localStorage.getItem('ev_command_token');
    try {
      const r = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${token}` }, ...opts });
      return r.data;
    } catch (err) {
      if (err.response?.status === 401) {
        const rt = localStorage.getItem('ev_command_refresh_token');
        if (rt) {
          try {
            const { data } = await axios.post(`${API}/auth/refresh`, { refreshToken: rt });
            localStorage.setItem('ev_command_token', data.accessToken);
            localStorage.setItem('ev_command_refresh_token', data.refreshToken);
            const retry = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${data.accessToken}` }, ...opts });
            return retry.data;
          } catch (_) {
            localStorage.removeItem('ev_command_token');
            localStorage.removeItem('ev_command_refresh_token');
            window.location.reload();
            return;
          }
        } else {
          localStorage.removeItem('ev_command_token');
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
  const [rev, setRev]         = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    call(path)
      .then(d  => { if (alive) setData(d); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, rev]);
  return { data, loading, error, refresh: () => setRev(r => r + 1) };
}

// ── useToast ──────────────────────────────────────────────────────
function useToast() {
  const [t, setT] = useState(null);
  const show = (msg, type = 'success') => {
    setT({ msg, type });
    setTimeout(() => setT(null), 3500);
  };
  return { toast: t, show };
}

// ══════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [token,  setToken]  = useState(() => localStorage.getItem('ev_command_token'));
  const [user,   setUser]   = useState(null);
  const [creds,  setCreds]  = useState({ email: cfg.email || '', password: 'Password123!' });
  const [busy,   setBusy]   = useState(false);
  const [page,   setPage]   = useState('dashboard');
  const call = api();

  useEffect(() => {
    if (!token) return;
    call('/auth/me')
      .then(u => {
        if (!ALLOWED_ROLES.includes(u.role)) {
          localStorage.removeItem('ev_command_token');
          localStorage.removeItem('ev_command_refresh_token');
          setToken(null);
          setUser(null);
          return;
        }
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem('ev_command_token');
        localStorage.removeItem('ev_command_refresh_token');
        setToken(null);
      });
  }, []);

  const login = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await axios.post(`${API}/auth/login`, creds);
      const tok = res.data.accessToken;
      const rt  = res.data.refreshToken;
      localStorage.setItem('ev_command_token', tok);
      if (rt) localStorage.setItem('ev_command_refresh_token', rt);
      if (!ALLOWED_ROLES.includes(res.data.user.role)) {
        throw new Error(`This account belongs to the ${res.data.user.role} portal.`);
      }
      setToken(tok);
      setUser(res.data.user);
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const logout = () => {
    localStorage.removeItem('ev_command_token');
    localStorage.removeItem('ev_command_refresh_token');
    setToken(null); setUser(null); setPage('dashboard');
  };

  if (!token) return <LoginPage creds={creds} setCreds={setCreds} onSubmit={login} busy={busy} />;
  return <Shell user={user} page={page} setPage={setPage} call={call} logout={logout} />;
}

// ══════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════
function LoginPage({ creds, setCreds, onSubmit, busy }) {
  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <div className="logo-icon"><Zap size={22} /></div>
          <span className="logo-text">EV CORE</span>
        </div>
        <p className="login-sub">{cfg.accent}</p>
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
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon sm"><Zap size={16} /></div>
          <span className="logo-text">EV CORE</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ id, label, Icon, parent, sub }) => {
            const isActive = page === id;
            const isParentActive = parent && page === parent;
            return (
              <button key={id}
                className={
                  'nav-item' +
                  (sub ? ' nav-sub' : '') +
                  (isActive ? ' active' : '') +
                  (isParentActive ? ' parent-active' : '')
                }
                onClick={() => setPage(id)}>
                <Icon size={sub ? 14 : 17} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <button className="nav-item logout-btn" onClick={logout}>
          <LogOut size={17} /><span>Sign out</span>
        </button>
      </aside>
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
      dashboard: <CustDashboard {...P} />, vehicles:   <CustVehicles   {...P} />,
      bookings:  <CustBookings  {...P} />, wallet:     <CustWallet     {...P} />,
      invoices:  <CustInvoices  {...P} />, complaints: <CustComplaints {...P} />,
    };
    return pages[page] || pages.dashboard;
  }
  if (kind === 'staff') {
    const pages = {
      dashboard: <StaffDashboard {...P} />, jobs:        <StaffJobs        {...P} />,
      inventory: <StaffInventory {...P} />, technicians: <StaffTechnicians  {...P} />,
      suppliers: <StaffSuppliers {...P} />,
    };
    return pages[page] || pages.dashboard;
  }
  if (kind === 'franchisee') {
    const pages = {
      dashboard: <FranDashboard  {...P} />, financials: <FranFinancials {...P} />,
      inventory: <FranInventory  {...P} />, staff:      <FranStaff     {...P} />,
      jobs:      <FranJobs       {...P} />,
    };
    return pages[page] || pages.dashboard;
  }
  // command
  const pages = {
    dashboard:            <AdminDashboard          {...P} />,
    hubs:                 <AdminHubs               {...P} />,
    franchisees:          <AdminFranchisees         {...P} />,
    'vehicle-inventory':  <AdminVehicleInventory    call={call} />,
    'vehicle-approvals':  <AdminVehicleApprovals    call={call} />,
    'staff-directory':    <AdminStaffDirectory      call={call} />,
    customers:            <AdminCustomers           call={call} />,
    'franchise-ratings':  <AdminFranchiseRatings    call={call} />,
    'customer-payments':  <AdminCustomerPayments    call={call} />,
    demand:               <AdminDemand              {...P} />,
  };
  return pages[page] || pages.dashboard;
}

// ══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════
function PageHeader({ title, sub, actions }) {
  return (
    <div className="page-header">
      <div className="ph-left">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
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

function Card({ title, badge, children, action }) {
  return (
    <div className="card">
      {(title || badge || action) && (
        <div className="card-head">
          <div className="card-head-left">
            {title && <div className="card-title">{title}</div>}
            {badge && <span className="badge">{badge}</span>}
          </div>
          {action && <div>{action}</div>}
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
  IN_USE: '#2563eb', OFFLINE: '#dc2626', ONLINE: '#16a34a', OPEN: '#d97706',
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
// FORM / MODAL COMPONENTS
// ══════════════════════════════════════════════════════════════════
function Modal({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast toast-${toast.type}`}>{toast.msg}</div>;
}

function Fld({ label, hint, required, children }) {
  return (
    <div className="fld">
      <span className="fld-label">{label}{required && <em className="req"> *</em>}</span>
      {children}
      {hint && <span className="fld-hint">{hint}</span>}
    </div>
  );
}

function Inp({ value, onChange, type = 'text', placeholder, disabled }) {
  const [show, setShow] = useState(false);
  if (type === 'password') return (
    <div className="pw-wrap">
      <input className="fld-input" type={show ? 'text' : 'password'} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
      <button type="button" className="icon-btn sm" onClick={() => setShow(s => !s)}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
  return <input className="fld-input" type={type} value={value}
    onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />;
}

function Sel({ value, onChange, opts, placeholder = 'Select…' }) {
  return (
    <select className="fld-input" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
    </select>
  );
}

function Txt({ value, onChange, placeholder, rows = 3 }) {
  return <textarea className="fld-input" value={value}
    onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />;
}

function InfoBanner({ Icon: I = Shield, children }) {
  return (
    <div className="info-banner">
      <I size={15} />
      <span>{children}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CUSTOMER PAGES  (unchanged)
// ══════════════════════════════════════════════════════════════════
function CustDashboard({ call }) {
  const { data: v, loading: lv } = useFetch(call, '/customer/vehicles');
  const { data: b, loading: lb } = useFetch(call, '/customer/bookings');
  if (lv || lb) return <Loader />;
  const active = b?.filter(x => !['COMPLETED', 'CANCELLED'].includes(x.status)) || [];
  return <>
    <PageHeader title="My Dashboard" sub="Overview of your vehicles and bookings." />
    <MetricGrid metrics={[
      { label: 'Vehicles',       value: v?.length ?? 0,                                                    Icon: Car,          color: '#2563eb' },
      { label: 'Total Bookings', value: b?.length ?? 0,                                                    Icon: ClipboardList,color: '#7c3aed' },
      { label: 'Active Jobs',    value: active.length,                                                     Icon: Activity,     color: '#d97706' },
      { label: 'Completed',      value: b?.filter(x => x.status === 'COMPLETED').length ?? 0,              Icon: CheckCircle,  color: '#16a34a' },
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
  if (error)   return <Err msg={error} />;
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
  if (error)   return <Err msg={error} />;
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
      { label: 'Balance',      value: `₹${(w?.balance ?? 0).toLocaleString()}`, Icon: Wallet,   color: '#16a34a' },
      { label: 'Transactions', value: tx?.length ?? 0,                          Icon: Activity, color: '#2563eb' },
    ]} />
    <Card title="Transaction History">
      <DataTable rows={tx} cols={['type', 'amount', 'description', 'createdAt']} />
    </Card>
  </>;
}

function CustInvoices({ call }) {
  const { data, loading, error } = useFetch(call, '/customer/invoices');
  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;
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
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader title="Support & Complaints" sub="Raise and track support tickets." />
    <Card title="My Complaints" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['subject', 'status', 'priority', 'createdAt']} />
    </Card>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// STAFF PAGES  (unchanged)
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
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader title="Job Queue" sub="All service jobs across the network." />
    <MetricGrid metrics={[
      { label: 'Total',     value: data?.length ?? 0,                                        Icon: ClipboardList, color: '#2563eb' },
      { label: 'Pending',   value: data?.filter(j => j.status === 'PENDING').length ?? 0,   Icon: Activity,      color: '#d97706' },
      { label: 'Assigned',  value: data?.filter(j => j.status === 'ASSIGNED').length ?? 0,  Icon: Users,         color: '#7c3aed' },
      { label: 'Completed', value: data?.filter(j => j.status === 'COMPLETED').length ?? 0, Icon: CheckCircle,   color: '#16a34a' },
    ]} />
    <Card title="All Jobs" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['serviceType', 'status', 'priority', 'trackingStatus', 'createdAt']} />
    </Card>
  </>;
}

function StaffInventory({ call }) {
  const { data, loading, error } = useFetch(call, '/staff/inventory');
  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader title="Inventory" sub="Spare parts and stock management." />
    <MetricGrid metrics={[
      { label: 'Total SKUs',   value: data?.length ?? 0,                                          Icon: Package,       color: '#2563eb' },
      { label: 'Low Stock',    value: data?.filter(i => i.quantity <= i.reorderLevel).length ?? 0,Icon: AlertTriangle, color: '#d97706' },
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
  if (error)   return <Err msg={error} />;
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
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader title="Suppliers" sub="Approved parts suppliers." />
    <Card title="Supplier List" badge={`${data?.length ?? 0}`}>
      <DataTable rows={data} cols={['name', 'contact', 'email', 'category']} />
    </Card>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// FRANCHISEE PAGES  (unchanged)
// ══════════════════════════════════════════════════════════════════
function FranDashboard({ call }) {
  const { data: d, loading: ld } = useFetch(call, '/franchise/dashboard');
  const { data: f, loading: lf } = useFetch(call, '/franchise/financials');
  if (ld || lf) return <Loader />;
  return <>
    <PageHeader title="Franchise Dashboard" sub="Revenue, jobs and performance." />
    <MetricGrid metrics={[
      { label: 'Revenue',    value: `₹${(d?.revenue ?? 0).toLocaleString()}`, Icon: DollarSign,   color: '#16a34a' },
      { label: 'Total Jobs', value: d?.jobs ?? 0,                             Icon: ClipboardList, color: '#2563eb' },
      { label: 'ROI',        value: `${d?.roi ?? 0}%`,                        Icon: TrendingUp,    color: '#7c3aed' },
      { label: 'Payback',    value: `${f?.paybackMonths ?? 0} mo`,            Icon: Gauge,         color: '#d97706' },
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
  if (error)   return <Err msg={error} />;
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
  if (error)   return <Err msg={error} />;
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
  if (error)   return <Err msg={error} />;
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
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader title="Jobs" sub="Total jobs count." />
    <MetricGrid metrics={[
      { label: 'Total Jobs', value: typeof data === 'number' ? data : 0, Icon: ClipboardList, color: '#2563eb' },
    ]} />
  </>;
}

// ══════════════════════════════════════════════════════════════════
// ADMIN / COMMAND-CENTER PAGES  — ALL WITH FULL CRUD FORMS
// ══════════════════════════════════════════════════════════════════

// ── Dashboard ────────────────────────────────────────────────────
function AdminDashboard({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/admin/dashboard');
  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader
      title="Enterprise Command Center"
      sub="Full network overview — hubs, revenue and live operations."
      actions={
        <button className="btn-ghost" onClick={refresh}><RefreshCw size={15} /> Refresh</button>
      }
    />
    <MetricGrid metrics={[
      { label: 'Hubs',      value: data?.hubs ?? 0,                            Icon: Factory,       color: '#2563eb' },
      { label: 'Chargers',  value: data?.chargers ?? 0,                         Icon: Zap,           color: '#7c3aed' },
      { label: 'Open Jobs', value: data?.openJobs ?? 0,                         Icon: ClipboardList, color: '#d97706' },
      { label: 'Revenue',   value: `₹${(data?.revenue ?? 0).toLocaleString()}`, Icon: DollarSign,    color: '#16a34a' },
    ]} />
    <AdminPendingBanner call={call} />
    <InfoBanner Icon={Activity}>
      Use the sidebar to manage Hubs, Chargers, Franchisees and more. All sections have entry forms.
    </InfoBanner>
  </>;
}

// ── Hubs ─────────────────────────────────────────────────────────
const EMPTY_HUB = { name: '', code: '', city: '', address: '', lat: '', lng: '', status: 'ONLINE', chargerCount: '' };

const CITY_COORDS = {
  'hyderabad':  [17.3850,  78.4867], 'bangalore':  [12.9716,  77.5946],
  'bengaluru':  [12.9716,  77.5946], 'mumbai':     [19.0760,  72.8777],
  'delhi':      [28.6139,  77.2090], 'new delhi':  [28.6139,  77.2090],
  'chennai':    [13.0827,  80.2707], 'kolkata':    [22.5726,  88.3639],
  'pune':       [18.5204,  73.8567], 'ahmedabad':  [23.0225,  72.5714],
  'jaipur':     [26.9124,  75.7873], 'lucknow':    [26.8467,  80.9462],
  'surat':      [21.1702,  72.8311], 'kochi':      [ 9.9312,  76.2673],
  'vizag':      [17.6868,  83.2185], 'visakhapatnam': [17.6868, 83.2185],
  'nagpur':     [21.1458,  79.0882], 'indore':     [22.7196,  75.8577],
  'coimbatore': [11.0168,  76.9558], 'vadodara':   [22.3072,  73.1812],
  'patna':      [25.5941,  85.1376], 'bhopal':     [23.2599,  77.4126],
  'thane':      [19.2183,  72.9781], 'noida':      [28.5355,  77.3910],
  'gurgaon':    [28.4595,  77.0266], 'gurugram':   [28.4595,  77.0266],
  'chandigarh': [30.7333,  76.7794], 'mysore':     [12.2958,  76.6394],
  'mysuru':     [12.2958,  76.6394], 'bhubaneswar':[20.2961,  85.8245],
  'kurnool':    [15.8281,  78.0373], 'vijayawada': [16.5062,  80.6480],
  'guntur':     [16.3067,  80.4365], 'tirupati':   [13.6288,  79.4192],
  'warangal':   [17.9784,  79.5941], 'nellore':    [14.4426,  79.9865],
  'rajkot':     [22.3039,  70.8022], 'amritsar':   [31.6340,  74.8723],
  'jodhpur':    [26.2389,  73.0243], 'guwahati':   [26.1445,  91.7362],
  'agra':       [27.1767,  78.0081], 'varanasi':   [25.3176,  82.9739],
};
function getHubCoords(hub) {
  if (hub.lat && hub.lng) return [hub.lat, hub.lng];
  return CITY_COORDS[(hub.city || '').toLowerCase().trim()] || null;
}
const HUB_STATUS_COLOR = { ONLINE: '#16a34a', OFFLINE: '#dc2626', MAINTENANCE: '#d97706' };

function IndiaHubMap({ hubs, selectedHub, onSelectHub, visible }) {
  const mapRef          = React.useRef(null);  // <div> element
  const leafRef         = React.useRef(null);  // L.map instance
  const markersRef      = React.useRef([]);
  const tooltipTimerRef = React.useRef(null);
  const [tooltip, setTooltip] = React.useState(null);

  // ── init map once — L is already on window from index.html ────
  React.useEffect(() => {
    if (leafRef.current || !mapRef.current || !window.L) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18,
    }).addTo(map);
    leafRef.current = map;
    drawMarkers(map, hubs);   // draw immediately — no waiting
  }, []);

  // ── invalidate size when panel re-appears (view toggle fix) ───
  React.useEffect(() => {
    if (!visible || !leafRef.current) return;
    const t = setTimeout(() => leafRef.current.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [visible]);

  // ── redraw markers whenever hub list changes ───────────────────
  React.useEffect(() => {
    if (!leafRef.current) return;
    drawMarkers(leafRef.current, hubs);
  }, [hubs]);

  function drawMarkers(map, hubList) {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    hubList.forEach(hub => {
      const coords = getHubCoords(hub);
      if (!coords) return;
      const color = HUB_STATUS_COLOR[hub.status] || '#2563eb';
      const icon = window.L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:pointer;"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      const marker = window.L.marker(coords, { icon }).addTo(map);
      marker.on('mouseover', e => {
        clearTimeout(tooltipTimerRef.current);
        const pt = map.latLngToContainerPoint(e.latlng);
        setTooltip({ hub, x: pt.x, y: pt.y });
      });
      marker.on('mouseout',  () => { tooltipTimerRef.current = setTimeout(() => setTooltip(null), 150); });
      marker.on('click',     () => onSelectHub(hub));
      markersRef.current.push(marker);
    });
  }

  // ── pan to selected hub ────────────────────────────────────────
  React.useEffect(() => {
    if (!selectedHub || !leafRef.current) return;
    const c = getHubCoords(selectedHub);
    if (c) leafRef.current.setView(c, 10, { animate: true });
  }, [selectedHub]);

  const sc = tooltip ? (HUB_STATUS_COLOR[tooltip.hub.status] || '#2563eb') : '#16a34a';

  return (
    <div className="hub-map-container" style={{ position: 'relative' }}>
      <div ref={mapRef} id="india-hub-map" />
      {tooltip && (() => {
        const coords  = getHubCoords(tooltip.hub);
        const mapsUrl = coords
          ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((tooltip.hub.address ? tooltip.hub.address + ', ' : '') + (tooltip.hub.city || ''))}`;
        return (
          <div
            className="map-tooltip"
            style={{ left: tooltip.x, top: tooltip.y, pointerEvents: 'auto' }}
            onMouseEnter={() => clearTimeout(tooltipTimerRef.current)}
            onMouseLeave={() => setTooltip(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div className="map-tooltip-name">{tooltip.hub.name}</div>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Open in Google Maps"
                 style={{ color: '#2563eb', flexShrink: 0, display: 'flex', alignItems: 'center', textDecoration: 'none', padding: '2px 0' }}>
                <MapPin size={16} />
              </a>
            </div>
            <div className="map-tooltip-row"><span>📍</span><strong>{tooltip.hub.city}</strong></div>
            {tooltip.hub.address && <div className="map-tooltip-row" style={{ fontSize: 11 }}>{tooltip.hub.address}</div>}
            <div className="map-tooltip-row"><span>⚡ Chargers:</span><strong>{tooltip.hub.chargerCount ?? 0}</strong></div>
            {tooltip.hub.code && <div className="map-tooltip-row"><span>🔖 Code:</span><strong>{tooltip.hub.code}</strong></div>}
            <div><span className="map-tooltip-status" style={{ background: sc + '22', color: sc }}>● {tooltip.hub.status}</span></div>
          </div>
        );
      })()}
      <div className="map-legend">
        {Object.entries(HUB_STATUS_COLOR).map(([s, c]) => (
          <div key={s} className="legend-item">
            <div className="legend-dot" style={{ background: c }} />
            <span style={{ fontSize: 11, color: '#374151' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminHubs({ call }) {
  const { data: initial, loading, error } = useFetch(call, '/admin/hubs');
  const [hubs,        setHubs]        = useState([]);
  const [open,        setOpen]        = useState(false);   // add modal
  const [editHub,     setEditHub]     = useState(null);    // hub being edited
  const [delHub,      setDelHub]      = useState(null);    // hub awaiting delete confirm
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState(EMPTY_HUB);
  const [selectedHub, setSelectedHub] = useState(null);
  const [view,        setView]        = useState('map');
  const { toast, show } = useToast();

  useEffect(() => { if (initial) setHubs(initial); }, [initial]);

  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  // ── Add hub ──────────────────────────────────────────────────
  const submit = async () => {
    if (!form.name || !form.code || !form.city) { show('Hub Name, Code and City are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, lat: form.lat ? +form.lat : undefined, lng: form.lng ? +form.lng : undefined, chargerCount: form.chargerCount ? +form.chargerCount : undefined };
      const hub = await call('/admin/hubs', { method: 'post', data: payload });
      setHubs(h => [...h, hub]);
      setOpen(false); setForm(EMPTY_HUB);
      show('✓ Hub created!');
    } catch (e) { show(e.response?.data?.message || 'Failed to create hub', 'error'); }
    finally { setSaving(false); }
  };

  // ── Edit hub ─────────────────────────────────────────────────
  const openEdit = hub => { setEditHub(hub); setForm({ name: hub.name, code: hub.code, city: hub.city || '', address: hub.address || '', lat: hub.lat || '', lng: hub.lng || '', status: hub.status, chargerCount: hub.chargerCount || '' }); };
  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, lat: form.lat ? +form.lat : undefined, lng: form.lng ? +form.lng : undefined, chargerCount: form.chargerCount ? +form.chargerCount : undefined };
      const updated = await call(`/admin/hubs/${editHub._id}`, { method: 'put', data: payload });
      setHubs(h => h.map(x => x._id === editHub._id ? updated : x));
      setEditHub(null); setForm(EMPTY_HUB);
      show('✓ Hub updated!');
    } catch (e) { show(e.response?.data?.message || 'Failed to update hub', 'error'); }
    finally { setSaving(false); }
  };

  // ── Delete hub ───────────────────────────────────────────────
  const confirmDelete = async () => {
    try {
      await call(`/admin/hubs/${delHub._id}`, { method: 'delete' });
      setHubs(h => h.filter(x => x._id !== delHub._id));
      if (selectedHub?._id === delHub._id) setSelectedHub(null);
      setDelHub(null);
      show('Hub deleted.');
    } catch (e) { show('Failed to delete hub', 'error'); }
  };

  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;

  const hubsWithCoords = hubs.filter(h => getHubCoords(h));
  const isMapView = view === 'map';

  // ── Hub form fields (reused in Add + Edit modals) ────────────
  const HubFields = () => <>
    <Fld label="Hub Name" required><Inp value={form.name} onChange={ff('name')} placeholder="e.g. Main Hub Hyderabad" /></Fld>
    <Fld label="Hub Code" required hint="Unique code used across the network"><Inp value={form.code} onChange={ff('code')} placeholder="e.g. HUB-HYD-01" /></Fld>
    <Fld label="City" required><Inp value={form.city} onChange={ff('city')} placeholder="e.g. Hyderabad" /></Fld>
    <Fld label="Address"><Txt value={form.address} onChange={ff('address')} placeholder="Full address including area and state" rows={2} /></Fld>
    <div className="row-2">
      <Fld label="Latitude" hint="For map pin"><Inp value={form.lat} onChange={ff('lat')} type="number" placeholder="17.3850" /></Fld>
      <Fld label="Longitude"><Inp value={form.lng} onChange={ff('lng')} type="number" placeholder="78.4867" /></Fld>
    </div>
    <Fld label="Charger Capacity"><Inp value={form.chargerCount} onChange={ff('chargerCount')} type="number" placeholder="e.g. 10" /></Fld>
    <Fld label="Status">
      <Sel value={form.status} onChange={ff('status')} opts={[{ v: 'ONLINE', l: 'Online' }, { v: 'OFFLINE', l: 'Offline' }, { v: 'MAINTENANCE', l: 'Under Maintenance' }]} />
    </Fld>
  </>;

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Charging Hubs"
      sub="India-wide hub network — hover a pin to see hub details."
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={isMapView ? 'btn-primary' : 'btn-ghost'} onClick={() => setView('map')} style={{ fontSize: 13 }}>🗺 Map View</button>
          <button className={!isMapView ? 'btn-primary' : 'btn-ghost'} onClick={() => setView('table')} style={{ fontSize: 13 }}>📋 Table View</button>
          <button className="btn-primary" onClick={() => { setOpen(true); setForm(EMPTY_HUB); }}><Plus size={15} /> Add Hub</button>
        </div>
      }
    />

    {/* ── Map panel — always rendered, hidden via CSS so Leaflet keeps its instance ── */}
    <div style={{ display: isMapView ? 'grid' : 'none' }} className="hub-map-wrap">
      <IndiaHubMap
        hubs={hubs}
        selectedHub={selectedHub}
        onSelectHub={h => setSelectedHub(s => s?._id === h._id ? null : h)}
        visible={isMapView}
      />
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8 }}>
          🏭 {hubs.length} Hubs · {hubsWithCoords.length} on map
        </div>
        <div className="hub-list-panel">
          {hubs.map(hub => {
            const color     = HUB_STATUS_COLOR[hub.status] || '#2563eb';
            const hasCoords = !!getHubCoords(hub);
            return (
              <div key={hub._id}
                className={'hub-list-item' + (selectedHub?._id === hub._id ? ' selected' : '')}
                style={{ opacity: hasCoords ? 1 : 0.65 }}
              >
                <div
                  onClick={() => { if (hasCoords) setSelectedHub(s => s?._id === hub._id ? null : hub); }}
                  style={{ cursor: hasCoords ? 'pointer' : 'default' }}
                >
                  <div className="hub-list-name">{hub.name}</div>
                  <div className="hub-list-city">📍 {hub.city}{hub.address ? ` · ${hub.address.substring(0, 32)}…` : ''}</div>
                  <div className="hub-list-meta">
                    <div className="hub-pin-dot" style={{ background: color }} />
                    <span style={{ fontSize: 11, color, fontWeight: 600 }}>{hub.status}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>· ⚡ {hub.chargerCount ?? 0}</span>
                    {!hasCoords && <span style={{ fontSize: 10, color: '#d97706' }}>no coords</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    style={{ flex: 1, fontSize: 11, padding: '4px 0', borderRadius: 6, border: '1px solid #e4e7ef', background: '#f9fafb', color: '#374151', cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); openEdit(hub); }}
                  >✏ Edit</button>
                  <button
                    style={{ flex: 1, fontSize: 11, padding: '4px 0', borderRadius: 6, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); setDelHub(hub); }}
                  >🗑 Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── Table view ── */}
    {!isMapView && (
      <Card title="Hub Network" badge={`${hubs.length} hubs`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Name</th><th>Code</th><th>City</th><th>Address</th><th>Chargers</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {hubs.map(hub => {
                const sc = HUB_STATUS_COLOR[hub.status] || '#6b7280';
                return (
                  <tr key={hub._id}>
                    <td style={{ fontWeight: 600 }}>{hub.name}</td>
                    <td>{hub.code}</td>
                    <td>{hub.city}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hub.address || '—'}</td>
                    <td>{hub.chargerCount ?? 0}</td>
                    <td><span className="status-pill" style={{ background: sc + '18', color: sc }}>● {hub.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(() => {
                          const coords = getHubCoords(hub);
                          const mapsUrl = coords
                            ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hub.address ? hub.address + ', ' : '') + (hub.city || ''))}`;
                          return (
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Open in Google Maps"
                               style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={11} /> Maps
                            </a>
                          );
                        })()}
                        <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #e4e7ef', background: '#f9fafb', color: '#374151', cursor: 'pointer' }} onClick={() => openEdit(hub)}>✏ Edit</button>
                        <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', cursor: 'pointer' }} onClick={() => setDelHub(hub)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    )}

    {/* ── Add Hub Modal ── */}
    {open && (
      <Modal title="Add New Hub" subtitle="Create a new charging hub location" onClose={() => setOpen(false)}
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Creating…' : <><Save size={14} /> Create Hub</>}</button></>}>
        {HubFields()}
      </Modal>
    )}

    {/* ── Edit Hub Modal ── */}
    {editHub && (
      <Modal title="Edit Hub" subtitle={`Editing: ${editHub.name}`} onClose={() => setEditHub(null)}
        footer={<><button className="btn-ghost" onClick={() => setEditHub(null)}>Cancel</button><button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : <><Save size={14} /> Save Changes</>}</button></>}>
        {HubFields()}
      </Modal>
    )}

    {/* ── Delete Confirm Modal ── */}
    {delHub && (
      <Modal title="Delete Hub" subtitle="This action cannot be undone." onClose={() => setDelHub(null)}
        footer={<><button className="btn-ghost" onClick={() => setDelHub(null)}>Cancel</button><button style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }} onClick={confirmDelete}>Delete</button></>}>
        <p style={{ fontSize: 14, color: '#374151' }}>Are you sure you want to delete <strong>{delHub.name}</strong> ({delHub.city})?</p>
        <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>⚠ All chargers associated with this hub may be orphaned.</p>
      </Modal>
    )}
  </>;
}
// ── Chargers ─────────────────────────────────────────────────────
const EMPTY_CHR = { hubId: '', code: '', powerKw: '7.2', connectorType: 'AC', pricePerKwh: '12', status: 'AVAILABLE' };

function AdminChargers({ call }) {
  const { data: initial, loading, error } = useFetch(call, '/admin/chargers');
  const { data: hubs }                   = useFetch(call, '/admin/hubs');
  const [chargers, setChargers] = useState([]);
  const [open,     setOpen]     = useState(false);
  const [editChr,  setEditChr]  = useState(null);
  const [delChr,   setDelChr]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState(EMPTY_CHR);
  const { toast, show } = useToast();

  useEffect(() => { if (initial) setChargers(initial); }, [initial]);
  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.hubId || !form.code) { show('Hub and Charger Code are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, powerKw: +form.powerKw, pricePerKwh: +form.pricePerKwh };
      const ch = await call('/admin/chargers', { method: 'post', data: payload });
      setChargers(c => [...c, ch]);
      setOpen(false); setForm(EMPTY_CHR);
      show('✓ Charger added!');
    } catch (e) { show(e.response?.data?.message || 'Failed to create charger', 'error'); }
    finally { setSaving(false); }
  };

  const openEdit = ch => {
    setEditChr(ch);
    setForm({ hubId: ch.hubId?._id || ch.hubId || '', code: ch.code, powerKw: ch.powerKw, connectorType: ch.connectorType, pricePerKwh: ch.pricePerKwh, status: ch.status });
  };
  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, powerKw: +form.powerKw, pricePerKwh: +form.pricePerKwh };
      const updated = await call(`/admin/chargers/${editChr._id}`, { method: 'put', data: payload });
      setChargers(c => c.map(x => x._id === editChr._id ? updated : x));
      setEditChr(null); setForm(EMPTY_CHR);
      show('✓ Charger updated!');
    } catch (e) { show(e.response?.data?.message || 'Failed to update', 'error'); }
    finally { setSaving(false); }
  };
  const confirmDelChr = async () => {
    try {
      await call(`/admin/chargers/${delChr._id}`, { method: 'delete' });
      setChargers(c => c.filter(x => x._id !== delChr._id));
      setDelChr(null); show('Charger deleted.');
    } catch (e) { show('Failed to delete charger', 'error'); }
  };

  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;

  const ChrFields = () => <>
    <Fld label="Hub" required hint="Which hub does this charger belong to?">
      <Sel value={form.hubId} onChange={ff('hubId')} placeholder="Select a hub…"
        opts={(hubs || []).map(h => ({ v: h._id, l: `${h.name} — ${h.city}` }))} />
    </Fld>
    <Fld label="Charger Code" required hint="Unique identifier printed on the unit">
      <Inp value={form.code} onChange={ff('code')} placeholder="e.g. CHR-HYD-01-A" />
    </Fld>
    <div className="row-2">
      <Fld label="Power (kW)"><Inp value={form.powerKw} onChange={ff('powerKw')} type="number" placeholder="7.2" /></Fld>
      <Fld label="Price per kWh (₹)"><Inp value={form.pricePerKwh} onChange={ff('pricePerKwh')} type="number" placeholder="12" /></Fld>
    </div>
    <Fld label="Connector Type">
      <Sel value={form.connectorType} onChange={ff('connectorType')} opts={['AC', 'DC', 'CCS1', 'CCS2', 'CHAdeMO', 'Type2']} />
    </Fld>
    <Fld label="Status">
      <Sel value={form.status} onChange={ff('status')} opts={[
        { v: 'AVAILABLE', l: 'Available' }, { v: 'IN_USE', l: 'In Use' }, { v: 'OFFLINE', l: 'Offline' },
      ]} />
    </Fld>
  </>;

  return <>
    <Toast toast={toast} />
    <PageHeader title="Chargers" sub="All charging units across hubs."
      actions={<button className="btn-primary" onClick={() => { setOpen(true); setForm(EMPTY_CHR); }}><Plus size={15} /> Add Charger</button>}
    />
    <MetricGrid metrics={[
      { label: 'Total',     value: chargers.length,                                       Icon: Zap,           color: '#2563eb' },
      { label: 'Available', value: chargers.filter(c => c.status === 'AVAILABLE').length, Icon: CheckCircle,   color: '#16a34a' },
      { label: 'In Use',    value: chargers.filter(c => c.status === 'IN_USE').length,    Icon: Activity,      color: '#7c3aed' },
      { label: 'Offline',   value: chargers.filter(c => c.status === 'OFFLINE').length,   Icon: AlertTriangle, color: '#dc2626' },
    ]} />
    <Card title="All Chargers">
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Code</th><th>Hub</th><th>Type</th><th>Power (kW)</th><th>₹/kWh</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {chargers.map(ch => {
              const sc = { AVAILABLE: '#16a34a', IN_USE: '#2563eb', OFFLINE: '#dc2626' }[ch.status] || '#6b7280';
              const hubName = ch.hubId?.name || ch.hubId || '—';
              return (
                <tr key={ch._id}>
                  <td style={{ fontWeight: 600 }}>{ch.code}</td>
                  <td>{hubName}</td>
                  <td>{ch.connectorType}</td>
                  <td>{ch.powerKw}</td>
                  <td>{ch.pricePerKwh}</td>
                  <td><span className="status-pill" style={{ background: sc + '18', color: sc }}>● {ch.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #e4e7ef', background: '#f9fafb', color: '#374151', cursor: 'pointer' }} onClick={() => openEdit(ch)}>✏ Edit</button>
                      <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', cursor: 'pointer' }} onClick={() => setDelChr(ch)}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>

    {open && (
      <Modal title="Add New Charger" subtitle="Register a charging unit to an existing hub" onClose={() => setOpen(false)}
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Adding…' : <><Save size={14} /> Add Charger</>}</button></>}>
        <ChrFields />
      </Modal>
    )}

    {editChr && (
      <Modal title="Edit Charger" subtitle={`Editing: ${editChr.code}`} onClose={() => setEditChr(null)}
        footer={<><button className="btn-ghost" onClick={() => setEditChr(null)}>Cancel</button><button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : <><Save size={14} /> Save Changes</>}</button></>}>
        <ChrFields />
      </Modal>
    )}

    {delChr && (
      <Modal title="Delete Charger" subtitle="This cannot be undone." onClose={() => setDelChr(null)}
        footer={<><button className="btn-ghost" onClick={() => setDelChr(null)}>Cancel</button><button style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }} onClick={confirmDelChr}>Delete</button></>}>
        <p style={{ fontSize: 14, color: '#374151' }}>Delete charger <strong>{delChr.code}</strong>?</p>
      </Modal>
    )}
  </>;
}
// ── Live Operations ───────────────────────────────────────────────
function AdminOps({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/admin/live-operations');
  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader
      title="Live Operations"
      sub="Real-time service jobs across all hubs."
      actions={<button className="btn-ghost" onClick={refresh}><RefreshCw size={15} /> Refresh</button>}
    />
    <MetricGrid metrics={[
      { label: 'Active Jobs',   value: data?.length ?? 0,                                    Icon: Activity,     color: '#2563eb' },
      { label: 'High Priority', value: data?.filter(j => j.priority === 'HIGH').length ?? 0, Icon: AlertTriangle,color: '#dc2626' },
      { label: 'En Route',      value: data?.filter(j => j.status === 'EN_ROUTE').length ?? 0, Icon: Truck,      color: '#7c3aed' },
      { label: 'In Progress',   value: data?.filter(j => j.status === 'IN_PROGRESS').length ?? 0, Icon: CheckCircle, color: '#16a34a' },
    ]} />
    <Card title="Live Job Stream" badge="Real-time">
      <DataTable rows={data} cols={['serviceType', 'status', 'priority', 'trackingStatus', 'createdAt']} />
    </Card>
  </>;
}

// ── Revenue ───────────────────────────────────────────────────────
function AdminRevenue({ call }) {
  const { data, loading, error } = useFetch(call, '/admin/revenue');
  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;
  const rev = Array.isArray(data) ? data[0] : data;
  return <>
    <PageHeader title="Revenue" sub="Network-wide payment and revenue summary." />
    <MetricGrid metrics={[
      { label: 'Total Revenue', value: `₹${(rev?.total ?? 0).toLocaleString()}`, Icon: DollarSign, color: '#16a34a' },
      { label: 'Transactions',  value: rev?.transactions ?? 0,                   Icon: Activity,   color: '#2563eb' },
    ]} />
    <Card title="Revenue Summary">
      <DataTable rows={[rev]} cols={['total', 'transactions']} />
    </Card>
  </>;
}

// ── Anomalies ─────────────────────────────────────────────────────
function AdminAnomalies({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/admin/anomalies');
  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;
  return <>
    <PageHeader
      title="Anomaly Detection"
      sub="Rule-based fraud and anomaly alerts."
      actions={<button className="btn-ghost" onClick={refresh}><RefreshCw size={15} /> Run Check</button>}
    />
    <MetricGrid metrics={[
      { label: 'Total Alerts',  value: data?.length ?? 0,                                     Icon: AlertTriangle, color: '#d97706' },
      { label: 'High Severity', value: data?.filter(a => a.severity === 'HIGH').length ?? 0,  Icon: Shield,        color: '#dc2626' },
      { label: 'Medium',        value: data?.filter(a => a.severity === 'MEDIUM').length ?? 0,Icon: AlertTriangle, color: '#d97706' },
      { label: 'Resolved',      value: 0,                                                       Icon: CheckCircle,   color: '#16a34a' },
    ]} />
    <Card title="Anomalies" badge={`${data?.length ?? 0} alerts`}>
      <DataTable rows={data} cols={['type', 'severity', 'reason', 'customerId']} />
    </Card>
  </>;
}

// ── Franchisees ───────────────────────────────────────────────────
const EMPTY_FR = {
  // Account
  name: '', email: '', phone: '', password: '', confirm: '',
  // Manager
  managerName: '', managerPhone: '', managerEmail: '',
  // Address
  addressLine1: '', addressLine2: '', city: '', district: '', state: '', pincode: '',
  // Business
  businessName: '', gstNumber: '', panNumber: '',
  // Location
  latitude: '', longitude: '',
  // Extra
  notes: '',
};


function FranchiseeMap({ franchisees = [] }) {
  const mapRef = React.useRef(null);
  const leafRef = React.useRef(null);
  const markersRef = React.useRef([]);

  React.useEffect(() => {
    if (!mapRef.current || !window.L || leafRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(map);
    leafRef.current = map;
    return () => { markersRef.current.forEach(m => map.removeLayer(m)); map.remove(); leafRef.current = null; };
  }, []);

  React.useEffect(() => {
    const map = leafRef.current;
    if (!map || !window.L) return;
    const L = window.L;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    const mapped = franchisees.filter(f => {
      const lat = Number(f.address?.latitude ?? f.address?.lat);
      const lng = Number(f.address?.longitude ?? f.address?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
    mapped.forEach(f => {
      const lat = Number(f.address.latitude ?? f.address.lat);
      const lng = Number(f.address.longitude ?? f.address.lng);
      const a = f.address || {};
      const basic = `<strong>${f.name || 'Franchisee'}</strong><br/>${a.city || a.district || a.state || 'India'}<br/>📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      const complete = `<div style="min-width:220px"><strong>${f.name || 'Franchisee'}</strong><hr style="border:0;border-top:1px solid #eee;margin:6px 0"/>` +
        `<div><b>Business:</b> ${a.businessName || '—'}</div><div><b>Manager:</b> ${a.managerName || '—'}</div>` +
        `<div><b>Phone:</b> ${f.phone || a.managerPhone || '—'}</div><div><b>Email:</b> ${f.email || a.managerEmail || '—'}</div>` +
        `<div><b>Address:</b> ${[a.line1,a.line2,a.city,a.district,a.state,a.pincode].filter(Boolean).join(', ') || '—'}</div>` +
        `<div><b>GST:</b> ${a.gstNumber || '—'}</div><div><b>PAN:</b> ${a.panNumber || '—'}</div>` +
        `<div><b>Latitude:</b> ${lat}</div><div><b>Longitude:</b> ${lng}</div></div>`;
      const marker = L.circleMarker([lat,lng], { radius: 9, weight: 3, fillOpacity: .9 });
      marker.addTo(map);
      marker.bindTooltip(basic, { direction:'top', offset:[0,-8], sticky:true });
      marker.bindPopup(complete, { maxWidth: 340 });
      markersRef.current.push(marker);
    });
    if (mapped.length > 1) {
      map.fitBounds(L.latLngBounds(mapped.map(f => [Number(f.address.latitude ?? f.address.lat), Number(f.address.longitude ?? f.address.lng)])), { padding:[30,30], maxZoom: 10 });
    } else if (mapped.length === 1) {
      map.setView([Number(mapped[0].address.latitude ?? mapped[0].address.lat), Number(mapped[0].address.longitude ?? mapped[0].address.lng)], 10);
    }
  }, [franchisees]);

  return <div className="hub-map-container" style={{position:'relative'}}>
    <div ref={mapRef} id="india-franchise-map" />
    {!franchisees.some(f => Number.isFinite(Number(f.address?.latitude ?? f.address?.lat)) && Number.isFinite(Number(f.address?.longitude ?? f.address?.lng))) &&
      <div style={{padding:14,color:'#64748b',fontSize:12}}>No franchisee locations mapped yet. Add latitude and longitude when creating a franchisee.</div>}
  </div>;
}

function AdminFranchisees({ call }) {
  const { data: initial, loading, error } = useFetch(call, '/admin/franchisees');
  const { data: statsData } = useFetch(call, '/admin/franchisee-stats');
  const [list,    setList]    = useState([]);
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState(EMPTY_FR);
  const [created, setCreated] = useState(null);
  const { toast, show }       = useToast();

  useEffect(() => { if (initial) setList(initial); }, [initial]);

  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  const openForm = () => { setCreated(null); setForm(EMPTY_FR); setOpen(true); };

  const submit = async () => {
    if (!form.name || !form.email || !form.password) { show('Full Name, Email and Password are required', 'error'); return; }
    if (form.password !== form.confirm)               { show('Passwords do not match', 'error'); return; }
    if (form.password.length < 8)                     { show('Password must be at least 8 characters', 'error'); return; }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)){ show('Pincode must be exactly 6 digits', 'error'); return; }
    if (form.latitude === '' || form.longitude === '') { show('Latitude and Longitude are required', 'error'); return; }
    if (Number.isNaN(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90) { show('Latitude must be between -90 and 90', 'error'); return; }
    if (Number.isNaN(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180) { show('Longitude must be between -180 and 180', 'error'); return; }

    setSaving(true);
    try {
      // FIX: use call() so the Authorization header is included automatically
      const newFr = await call('/admin/franchisees', {
        method: 'post',
        data: {
          name:         form.name,
          email:        form.email,
          phone:        form.phone        || undefined,
          password:     form.password,
          managerName:  form.managerName  || undefined,
          managerPhone: form.managerPhone || undefined,
          managerEmail: form.managerEmail || undefined,
          addressLine1: form.addressLine1 || undefined,
          addressLine2: form.addressLine2 || undefined,
          city:         form.city         || undefined,
          district:     form.district     || undefined,
          state:        form.state        || undefined,
          pincode:      form.pincode      || undefined,
          latitude:     form.latitude     || undefined,
          longitude:    form.longitude    || undefined,
          businessName: form.businessName || undefined,
          gstNumber:    form.gstNumber    || undefined,
          panNumber:    form.panNumber    || undefined,
          notes:        form.notes        || undefined,
        },
      });
      setList(l => [...l, newFr]);
      setCreated({ name: form.name, email: form.email, password: form.password, businessName: form.businessName, managerName: form.managerName, latitude: form.latitude, longitude: form.longitude });
      show('✓ Franchisee account created!');
    } catch (e) {
      show(e.response?.data?.message || e.message || 'Failed to create franchisee', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;

  // Build a quick lookup: franchiseeId → vehicle stats
  const statsMap = new Map((statsData?.franchisees || []).map(s => [s.franchiseeId, s]));
  const inv = statsData?.inventory || { totalSkus: 0, totalQty: 0, totalValue: 0 };
  const totalVehiclesAll = (statsData?.franchisees || []).reduce((s, f) => s + f.totalVehicles, 0);
  const totalApprovedAll = (statsData?.franchisees || []).reduce((s, f) => s + f.approvedVehicles, 0);
  const totalPendingAll  = (statsData?.franchisees || []).reduce((s, f) => s + f.pendingVehicles, 0);

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Franchisees"
      sub="All franchise partners across the network."
      actions={<button className="btn-primary" onClick={openForm}><UserPlus size={15} /> Add Franchisee</button>}
    />
    <MetricGrid metrics={[
      { label: 'Total Partners',      value: list.length,      Icon: Users,         color: '#2563eb' },
      { label: 'Total Vehicles',      value: totalVehiclesAll, Icon: Car,           color: '#7c3aed' },
      { label: 'Approved & Live',     value: totalApprovedAll, Icon: CheckCircle,   color: '#16a34a' },
      { label: 'Pending Approval',    value: totalPendingAll,  Icon: Clock,         color: '#d97706' },
      { label: 'Parts SKUs (Total)',  value: inv.totalSkus,    Icon: Package,       color: '#0891b2' },
      { label: 'Parts Stock (Units)', value: inv.totalQty,     Icon: Layers,        color: '#4f46e5' },
    ]} />

    {/* ── Per-Franchisee Vehicle & Inventory Breakdown ── */}
    <Card title="Vehicle & Inventory by Franchisee" badge={`${list.length} partners`}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Franchisee</th>
              <th>Email</th>
              <th style={{ textAlign:'center' }}>Total Vehicles</th>
              <th style={{ textAlign:'center' }}>Approved</th>
              <th style={{ textAlign:'center' }}>Pending</th>
              <th style={{ textAlign:'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map(f => {
              const s = statsMap.get(String(f._id)) || { totalVehicles: 0, approvedVehicles: 0, pendingVehicles: 0 };
              return (
                <tr key={String(f._id)}>
                  <td style={{ fontWeight: 600 }}>{f.name || '—'}</td>
                  <td style={{ color: '#6b7280', fontSize: 12 }}>{f.email}</td>
                  <td style={{ textAlign:'center', fontWeight: 700 }}>{s.totalVehicles}</td>
                  <td style={{ textAlign:'center' }}>
                    <span style={{ background:'#dcfce7', color:'#166534', padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>
                      {s.approvedVehicles}
                    </span>
                  </td>
                  <td style={{ textAlign:'center' }}>
                    {s.pendingVehicles > 0 ? (
                      <span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>
                        {s.pendingVehicles}
                      </span>
                    ) : <span style={{ color:'#9ca3af', fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <span style={{
                      background: f.active ? '#dcfce7' : '#fee2e2',
                      color:      f.active ? '#166534' : '#991b1b',
                      padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:700
                    }}>
                      {f.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>No franchisees yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>

    {/* ── Parts Inventory Summary ── */}
    <Card title="Parts Inventory Summary (Network-wide)">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {[
          { label:'Total SKUs', value: inv.totalSkus,                                           color:'#2563eb' },
          { label:'Total Units in Stock', value: inv.totalQty,                                  color:'#16a34a' },
          { label:'Total Inventory Value', value:`₹${Number(inv.totalValue||0).toLocaleString('en-IN')}`, color:'#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'#f9fafb', borderRadius:12, padding:'18px 20px', textAlign:'center', border:'1.5px solid #e5e7eb' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:26, fontWeight:900, color }}>{value ?? 0}</div>
          </div>
        ))}
      </div>
    </Card>

    <Card title="Franchisee Locations" badge={`${list.filter(f => Number.isFinite(Number(f.address?.latitude ?? f.address?.lat)) && Number.isFinite(Number(f.address?.longitude ?? f.address?.lng))).length} mapped`}>
      <FranchiseeMap franchisees={list} />
    </Card>
    <Card title="Franchisee Directory" badge={`${list.length} partners`}>
      <DataTable rows={list} cols={['name', 'email', 'phone', 'active', 'createdAt']} />
    </Card>

    {open && (
      <Modal
        title={created ? 'Franchisee Created!' : 'Add New Franchisee'}
        subtitle={created ? 'Share credentials with the franchisee' : 'Creates a login for the Franchisee Portal'}
        onClose={() => setOpen(false)}
        footer={
          created
            ? <button className="btn-primary" onClick={() => setOpen(false)}>Done</button>
            : <>
                <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={submit} disabled={saving}>
                  {saving ? 'Creating Account…' : <><UserPlus size={14} /> Create Franchisee</>}
                </button>
              </>
        }
      >
        {created ? (
          <div className="success-card">
            <div className="success-icon"><CheckCircle size={32} /></div>
            <h3>Account Created Successfully</h3>
            <p>The franchisee can now login at the Franchisee Portal with these credentials:</p>
            <div className="cred-box">
              <div className="cred-row"><span>Portal URL</span><code>localhost:5000/franchisee</code></div>
              <div className="cred-row"><span>Name</span><code>{created.name}</code></div>
              {created.businessName && <div className="cred-row"><span>Business</span><code>{created.businessName}</code></div>}
              {created.managerName  && <div className="cred-row"><span>Manager</span><code>{created.managerName}</code></div>}
              <div className="cred-row"><span>Email</span><code>{created.email}</code></div>
              <div className="cred-row"><span>Password</span><code>{created.password}</code></div>
            </div>
            <div className="cred-warn">⚠ Save these credentials securely. Password shown only once.</div>
          </div>
        ) : (
          <>
            <InfoBanner Icon={Shield}>
              This creates a dedicated login account for the Franchisee Portal. The franchisee will have access to their
              own dashboard, financials, inventory and staff.
            </InfoBanner>

            {/* ── Section: Account ── */}
            <div className="form-section-label">Account Details</div>
            <Fld label="Full Name" required>
              <Inp value={form.name} onChange={ff('name')} placeholder="e.g. Raj Kumar" />
            </Fld>
            <Fld label="Email Address" required hint="Used to login to the Franchisee Portal">
              <Inp value={form.email} onChange={ff('email')} type="email" placeholder="raj@example.com" />
            </Fld>
            <div className="row-2">
              <Fld label="Password" required hint="Min 8 characters">
                <Inp value={form.password} onChange={ff('password')} type="password" placeholder="Strong password" />
              </Fld>
              <Fld label="Confirm Password" required>
                <Inp value={form.confirm} onChange={ff('confirm')} type="password" placeholder="Repeat password" />
              </Fld>
            </div>

            {/* ── Section: Business ── */}
            <div className="form-section-label">Business Details</div>
            <Fld label="Business / Franchise Name" hint="Trading name of the franchise">
              <Inp value={form.businessName} onChange={ff('businessName')} placeholder="e.g. Raj EV Services Pvt Ltd" />
            </Fld>
            <div className="row-2">
              <Fld label="GST Number" hint="15-digit GSTIN">
                <Inp value={form.gstNumber} onChange={ff('gstNumber')} placeholder="e.g. 37ABCDE1234F1Z5" />
              </Fld>
              <Fld label="PAN Number">
                <Inp value={form.panNumber} onChange={ff('panNumber')} placeholder="e.g. ABCDE1234F" />
              </Fld>
            </div>

            {/* ── Section: Manager ── */}
            <div className="form-section-label">Manager / Contact Person</div>
            <Fld label="Manager Name">
              <Inp value={form.managerName} onChange={ff('managerName')} placeholder="e.g. Suresh Reddy" />
            </Fld>
            <div className="row-2">
              <Fld label="Manager Phone" hint="Primary contact number">
                <Inp value={form.managerPhone} onChange={ff('managerPhone')} type="tel" placeholder="+91 9876543210" />
              </Fld>
              <Fld label="Franchisee Phone" hint="Alternate / login phone">
                <Inp value={form.phone} onChange={ff('phone')} type="tel" placeholder="+91 9876543210" />
              </Fld>
            </div>
            <Fld label="Manager Email" hint="For operational communications">
              <Inp value={form.managerEmail} onChange={ff('managerEmail')} type="email" placeholder="manager@example.com" />
            </Fld>

            {/* ── Section: Address ── */}
            <div className="form-section-label">Address Details</div>
            <Fld label="Address Line 1">
              <Inp value={form.addressLine1} onChange={ff('addressLine1')} placeholder="Building / Plot No., Street Name" />
            </Fld>
            <Fld label="Address Line 2" hint="Area, Landmark (optional)">
              <Inp value={form.addressLine2} onChange={ff('addressLine2')} placeholder="Landmark, Area" />
            </Fld>
            <div className="row-2">
              <Fld label="City">
                <Inp value={form.city} onChange={ff('city')} placeholder="e.g. Kurnool" />
              </Fld>
              <Fld label="District">
                <Inp value={form.district} onChange={ff('district')} placeholder="e.g. Kurnool" />
              </Fld>
            </div>
            <div className="row-2">
              <Fld label="State">
                <Sel value={form.state} onChange={ff('state')} placeholder="Select state…" opts={[
                  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
                  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
                  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
                  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
                  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
                ].map(s => ({ v: s, l: s }))} />
              </Fld>
              <Fld label="Pincode" hint="6-digit PIN">
                <Inp value={form.pincode} onChange={ff('pincode')} placeholder="e.g. 518001" maxLength={6} />
              </Fld>
            </div>

            {/* ── Section: Notes ── */}
                        <div className="form-section-label">Map Location</div>
            <div className="row-2">
              <Fld label="Latitude" required hint="Example: 15.8281">
                <Inp value={form.latitude} onChange={ff('latitude')} type="number" step="any" placeholder="15.8281" />
              </Fld>
              <Fld label="Longitude" required hint="Example: 78.0373">
                <Inp value={form.longitude} onChange={ff('longitude')} type="number" step="any" placeholder="78.0373" />
              </Fld>
            </div>

            <div className="form-section-label">Additional Notes</div>
            <Fld label="Notes / Remarks" hint="Internal notes about this franchisee">
              <Txt value={form.notes} onChange={ff('notes')} placeholder="Any special instructions or remarks…" rows={2} />
            </Fld>
          </>
        )}
      </Modal>
    )}
  </>;
}

// ── Demand ────────────────────────────────────────────────────────
const EMPTY_DEM = { location: '', demandScore: '', competitionScore: '', evDensityScore: '', expectedRevenue: '', expectedCost: '' };

function AdminDemand({ call }) {
  const { data: initial, loading, error } = useFetch(call, '/admin/demand');
  const [records, setRecords] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState(EMPTY_DEM);
  const { toast, show }       = useToast();

  useEffect(() => { if (Array.isArray(initial)) setRecords(initial); }, [initial]);

  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.location || !form.demandScore) { show('Location and Demand Score are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        location:         form.location,
        demandScore:      +form.demandScore,
        competitionScore: form.competitionScore ? +form.competitionScore : undefined,
        evDensityScore:   form.evDensityScore   ? +form.evDensityScore   : undefined,
        expectedRevenue:  form.expectedRevenue  ? +form.expectedRevenue  : undefined,
        expectedCost:     form.expectedCost     ? +form.expectedCost     : undefined,
      };
      const rec = await call('/admin/demand', { method: 'post', data: payload });
      setRecords(r => [rec, ...r]);
      setOpen(false);
      setForm(EMPTY_DEM);
      show('✓ Demand record added!');
    } catch (e) {
      show(e.response?.data?.message || 'Failed to add record', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Demand Analysis"
      sub="City-wise EV demand and capacity gaps."
      actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Add Record</button>}
    />
    <Card title="Demand by City" badge={`${records.length} records`}>
      <DataTable rows={records} cols={['location', 'demandScore', 'competitionScore', 'evDensityScore', 'expectedRevenue']} />
    </Card>

    {open && (
      <Modal
        title="Add Demand Record"
        subtitle="Enter city-level EV demand data for analysis"
        onClose={() => setOpen(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : <><Save size={14} /> Save Record</>}
          </button>
        </>}
      >
        <Fld label="Location / City" required>
          <Inp value={form.location} onChange={ff('location')} placeholder="e.g. Vijayawada, Andhra Pradesh" />
        </Fld>
        <Fld label="Demand Score (0–100)" required hint="How strong is EV adoption demand in this city?">
          <Inp value={form.demandScore} onChange={ff('demandScore')} type="number" placeholder="e.g. 85" />
        </Fld>
        <div className="row-2">
          <Fld label="Competition Score (0–100)" hint="0 = no existing competitors">
            <Inp value={form.competitionScore} onChange={ff('competitionScore')} type="number" placeholder="e.g. 30" />
          </Fld>
          <Fld label="EV Density Score (0–100)" hint="Concentration of EVs in area">
            <Inp value={form.evDensityScore} onChange={ff('evDensityScore')} type="number" placeholder="e.g. 60" />
          </Fld>
        </div>
        <div className="row-2">
          <Fld label="Expected Monthly Revenue (₹)">
            <Inp value={form.expectedRevenue} onChange={ff('expectedRevenue')} type="number" placeholder="150000" />
          </Fld>
          <Fld label="Expected Setup Cost (₹)">
            <Inp value={form.expectedCost} onChange={ff('expectedCost')} type="number" placeholder="2500000" />
          </Fld>
        </div>
      </Modal>
    )}
  </>;
}

// ── Expansion Engine ──────────────────────────────────────────────
const EMPTY_EXP = { location: '', demandScore: '70', competitionScore: '40', evDensityScore: '60', expectedRevenue: '150000', expectedCost: '2500000' };

function AdminExpansion({ call }) {
  const { data, loading } = useFetch(call, '/admin/expansion');
  const [result,  setResult]  = useState(null);
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState(EMPTY_EXP);
  const { toast, show }       = useToast();

  useEffect(() => { if (data && !data.message) setResult(data); }, [data]);

  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.location) { show('Location is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        location:         form.location,
        demandScore:      +form.demandScore,
        competitionScore: +form.competitionScore,
        evDensityScore:   +form.evDensityScore,
        expectedRevenue:  +form.expectedRevenue,
        expectedCost:     +form.expectedCost,
      };
      const rec = await call('/admin/expansion', { method: 'post', data: payload });
      setResult(rec);
      setOpen(false);
      show('✓ Expansion analysis complete!');
    } catch (e) {
      show(e.response?.data?.message || 'Analysis failed', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Expansion Engine"
      sub="AI-powered site viability analysis for new hub locations."
      actions={<button className="btn-primary" onClick={() => setOpen(true)}><BarChart2 size={15} /> Run Analysis</button>}
    />

    {result ? <>
      <MetricGrid metrics={[
        { label: 'Demand Score', value: result.demandScore,                                                  Icon: TrendingUp, color: '#2563eb' },
        { label: 'Monthly Rev',  value: `₹${(result.expectedRevenue ?? 0).toLocaleString()}`,                Icon: DollarSign, color: '#16a34a' },
        { label: 'Setup Cost',   value: `₹${(result.expectedCost ?? 0).toLocaleString()}`,                  Icon: Factory,    color: '#d97706' },
        { label: 'ROI',          value: `${result.roi ?? 0}%`,                                              Icon: Gauge,      color: '#7c3aed' },
      ]} />
      <Card title={`Analysis: ${result.location || 'Latest'}`}>
        <div className="kv-list">
          {result && Object.entries(result)
            .filter(([k]) => !['_id', '__v', 'inputs', 'createdAt', 'updatedAt'].includes(k))
            .map(([k, v]) => (
              <div className="kv-row" key={k}>
                <span>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                <strong style={k === 'recommendation' ? { color: '#16a34a', fontWeight: 700 } : {}}>
                  {String(v)}
                </strong>
              </div>
            ))}
        </div>
      </Card>
    </> : (
      <Card title="No Analysis Yet">
        <div className="empty-state">
          <BarChart2 size={40} style={{ opacity: .3, marginBottom: 12 }} />
          <p>No expansion analysis found. Click <strong>Run Analysis</strong> to get started.</p>
        </div>
      </Card>
    )}

    {open && (
      <Modal
        title="Run Expansion Analysis"
        subtitle="Compute viability for a new hub location"
        onClose={() => setOpen(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Analyzing…' : <><BarChart2 size={14} /> Run Analysis</>}
          </button>
        </>}
      >
        <Fld label="Target Location" required hint="City and state for the proposed hub">
          <Inp value={form.location} onChange={ff('location')} placeholder="e.g. Vijayawada, Andhra Pradesh" />
        </Fld>
        <div className="row-2">
          <Fld label="Demand Score (0–100)" hint="EV adoption potential">
            <Inp value={form.demandScore} onChange={ff('demandScore')} type="number" />
          </Fld>
          <Fld label="Competition Score (0–100)" hint="0 = no competitors">
            <Inp value={form.competitionScore} onChange={ff('competitionScore')} type="number" />
          </Fld>
        </div>
        <div className="row-2">
          <Fld label="EV Density Score (0–100)">
            <Inp value={form.evDensityScore} onChange={ff('evDensityScore')} type="number" />
          </Fld>
          <Fld label="Expected Monthly Revenue (₹)">
            <Inp value={form.expectedRevenue} onChange={ff('expectedRevenue')} type="number" />
          </Fld>
        </div>
        <Fld label="Expected Setup Cost (₹)" hint="One-time capital expenditure">
          <Inp value={form.expectedCost} onChange={ff('expectedCost')} type="number" />
        </Fld>
        <InfoBanner Icon={Activity}>
          The AI engine will compute ROI, payback period and a Go/No-Go recommendation automatically.
        </InfoBanner>
      </Modal>
    )}
  </>;
}


// ── Franchisee Ratings ────────────────────────────────────────────
function AdminFranchiseRatings({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/admin/franchise-ratings');
  if(loading)return <Loader/>; if(error)return <Err msg={error}/>;
  return <><PageHeader title="Franchisee Ratings" sub="Customer feedback captured after complaints are solved." actions={<button className="btn-ghost" onClick={refresh}><RefreshCw size={15}/> Refresh</button>}/>
    <MetricGrid metrics={[{label:'Rated Franchisees',value:data?.length||0,Icon:Users,color:'#2563eb'},{label:'Total Ratings',value:(data||[]).reduce((s,x)=>s+(x.ratingCount||0),0),Icon:BarChart2,color:'#16a34a'},{label:'Network Avg',value:data?.length?((data.reduce((s,x)=>s+(x.averageRating||0)*(x.ratingCount||0),0)/(data.reduce((s,x)=>s+(x.ratingCount||0),0)||1)).toFixed(2)):'0.00',Icon:BarChart2,color:'#d97706'}]}/>
    <Card title="Franchisee Performance" badge={`${data?.length||0} rated`}><div style={{display:'flex',flexDirection:'column',gap:10}}>{(data||[]).map(r=><div key={String(r._id)} style={{border:'1px solid #e5e7eb',borderRadius:10,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><strong>{r.franchisee?.name||'Franchisee'}</strong><div style={{fontSize:12,color:'#64748b',marginTop:3}}>{r.franchisee?.email||''} · PIN {r.franchisee?.address?.pincode||'—'}</div></div><div style={{fontWeight:800,fontSize:18}}>⭐ {(r.averageRating||0).toFixed(2)} <span style={{fontSize:11,fontWeight:500,color:'#64748b'}}>({r.ratingCount} ratings)</span></div></div>)}</div></Card>
  </>;
}

// ──────────────────────────────────────────────────────────────────
// NOTE: Pending vehicle/staff data now lives in MongoDB via the API.
// The localStorage helpers below are intentionally removed.
// Both portals (all portals on one localhost) now talk to
// the same backend endpoints:
//   GET  /api/admin/pending-vehicles          — all submissions
//   PUT  /api/admin/pending-vehicles/:id/approve
//   PUT  /api/admin/pending-vehicles/:id/reject
//   GET  /api/admin/pending-staff
//   PUT  /api/admin/pending-staff/:id/approve — also creates User record
//   PUT  /api/admin/pending-staff/:id/reject
// ──────────────────────────────────────────────────────────────────

// ── Dashboard Pending Banner ─────────────────────────────────────
function AdminPendingBanner({ call }) {
  const { data: vehicles } = useFetch(call, '/admin/pending-vehicles');
  const { data: staff    } = useFetch(call, '/admin/pending-staff');
  const vPending = (vehicles || []).filter(v => v.status === 'PENDING_APPROVAL').length;
  const sPending = (staff    || []).filter(s => s.status === 'PENDING_APPROVAL').length;
  if (vPending === 0 && sPending === 0) return null;
  return (
    <div className="info-banner" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e', marginBottom: 16 }}>
      <Clock size={15} />
      <span>
        <strong>{vPending} vehicle approval(s)</strong> and <strong>{sPending} staff approval(s)</strong> waiting in queue.
        Check <em>Vehicle Approvals</em> and <em>Staff Approvals</em> in the sidebar.
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// VEHICLE & INVENTORY BY FRANCHISEE — full detail view
// ══════════════════════════════════════════════════════════════════
function AdminVehicleInventory({ call }) {
  const { data: franchiseeList, loading: flLoading } = useFetch(call, '/admin/franchisees');
  const { data: statsData,      loading: sdLoading } = useFetch(call, '/admin/franchisee-stats');
  const { data: allVehicles,    loading: avLoading } = useFetch(call, '/admin/pending-vehicles');
  const { data: allPartsData,   loading: apLoading } = useFetch(call, '/admin/all-parts');
  const [activeTab,     setActiveTab]     = useState('vehicles');
  const [selectedFr,    setSelectedFr]    = useState('all');
  const [selectedVeh,   setSelectedVeh]   = useState(null);
  const [selectedPart,  setSelectedPart]  = useState(null);
  const { toast, show } = useToast();

  if (flLoading || sdLoading || avLoading || apLoading) return <Loader />;

  const franchisees  = franchiseeList || [];
  const statsMap     = new Map((statsData?.franchisees || []).map(s => [s.franchiseeId, s]));
  const inv          = statsData?.inventory || { totalSkus: 0, totalQty: 0, totalValue: 0 };
  const vehicles     = allVehicles || [];
  const allParts     = allPartsData || [];

  const filteredVehicles = selectedFr === 'all'
    ? vehicles
    : vehicles.filter(v => v.franchiseeEmail === selectedFr || v.franchiseeId === selectedFr);

  const approved  = vehicles.filter(v => v.status === 'APPROVED');
  const pending   = vehicles.filter(v => v.status === 'PENDING_APPROVAL');
  const totalVeh  = (statsData?.franchisees || []).reduce((s, f) => s + f.totalVehicles, 0);

  const totalPartsValue = allParts.reduce((s, p) => s + (Number(p.unitPrice || 0) * Number(p.quantity || 0)), 0);
  const lowStockParts   = allParts.filter(p => p.quantity <= p.reorderLevel);

  const TABS = [
    { id: 'vehicles', label: 'Vehicles by Franchisee', Icon: Car,     count: vehicles.length },
    { id: 'inventory', label: 'Parts Inventory',        Icon: Package, count: allParts.length },
  ];

  const fmt = d => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Vehicle & Inventory by Franchisee"
      sub="Complete network view — all vehicles and parts inventory across all franchise partners."
      actions={<button className="btn-ghost" onClick={() => window.location.reload()}><RefreshCw size={15} /> Refresh</button>}
    />

    <MetricGrid metrics={[
      { label: 'Total Partners',      value: franchisees.length, Icon: Users,         color: '#2563eb' },
      { label: 'Total Vehicles',      value: totalVeh,           Icon: Car,           color: '#7c3aed' },
      { label: 'Approved & Live',     value: approved.length,    Icon: CheckCircle,   color: '#16a34a' },
      { label: 'Pending Approval',    value: pending.length,     Icon: Clock,         color: '#d97706' },
      { label: 'Parts SKUs (Network)',value: inv.totalSkus,      Icon: Package,       color: '#0891b2' },
      { label: 'Parts Stock (Units)', value: inv.totalQty,       Icon: Layers,        color: '#4f46e5' },
    ]} />

    {/* ── Subtab Bar ── */}
    <div style={{ display:'flex', gap:0, borderBottom:'2px solid #e5e7eb', marginBottom:16 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)}
          style={{
            display:'flex', alignItems:'center', gap:7, padding:'10px 22px',
            border:'none', background:'none', cursor:'pointer',
            borderBottom: activeTab === t.id ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === t.id ? '#2563eb' : '#6b7280',
            fontWeight: activeTab === t.id ? 700 : 500, fontSize:14, marginBottom:'-2px',
            transition:'all 0.15s',
          }}>
          <t.Icon size={15} />
          {t.label}
          <span style={{
            background: activeTab === t.id ? '#2563eb' : '#e5e7eb',
            color: activeTab === t.id ? '#fff' : '#374151',
            borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700
          }}>{t.count}</span>
        </button>
      ))}
    </div>

    {/* ── VEHICLES TAB ── */}
    {activeTab === 'vehicles' && <>
      {/* Franchisee filter */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Filter by Franchisee:</span>
        <select
          className="fld-input"
          style={{ maxWidth:280, padding:'6px 12px', fontSize:13 }}
          value={selectedFr}
          onChange={e => setSelectedFr(e.target.value)}
        >
          <option value="all">All Franchisees ({vehicles.length} vehicles)</option>
          {franchisees.map(f => {
            const count = vehicles.filter(v => v.franchiseeEmail === f.email || v.franchiseeId === String(f._id)).length;
            return <option key={f._id} value={f.email}>{f.name} — {f.email} ({count} vehicles)</option>;
          })}
        </select>
        {selectedFr !== 'all' && (
          <button className="btn-ghost" style={{ fontSize:12, padding:'4px 10px' }} onClick={() => setSelectedFr('all')}>
            Clear Filter
          </button>
        )}
      </div>

      <Card title="Vehicle Listings" badge={`${filteredVehicles.length} vehicles`}>
        {filteredVehicles.length === 0
          ? <div className="empty-state"><Car size={40} style={{ opacity:.2, marginBottom:12 }} /><p>No vehicles found.</p></div>
          : <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Franchisee</th>
                    <th>Category</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Registration No.</th>
                    <th>Color</th>
                    <th>Year</th>
                    <th>Battery</th>
                    <th>Range</th>
                    <th>Charging</th>
                    <th>Price/Day</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v, i) => {
                    const sc = v.status === 'APPROVED' ? '#16a34a' : v.status === 'REJECTED' ? '#dc2626' : '#d97706';
                    return (
                      <tr key={v._id || i}>
                        <td>
                          <div style={{ fontWeight:600, fontSize:12 }}>{v.franchiseeName || '—'}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>{v.franchiseeEmail || ''}</div>
                        </td>
                        <td style={{ fontSize:12 }}>{v.category || '—'}</td>
                        <td style={{ fontWeight:600, fontSize:13 }}>{v.make || '—'}</td>
                        <td style={{ fontSize:13 }}>{v.model || '—'}</td>
                        <td style={{ fontFamily:'monospace', fontSize:11, color:'#1d4ed8' }}>{v.registrationNo || '—'}</td>
                        <td style={{ fontSize:12 }}>{v.color || '—'}</td>
                        <td style={{ fontSize:12 }}>{v.year || '—'}</td>
                        <td style={{ fontSize:12 }}>{v.batteryCapacityKwh ? `${v.batteryCapacityKwh} kWh` : '—'}</td>
                        <td style={{ fontSize:12 }}>{v.rangeKm ? `${v.rangeKm} km` : '—'}</td>
                        <td style={{ fontSize:12 }}>{v.chargingType || '—'}</td>
                        <td style={{ fontWeight:700, fontSize:13 }}>₹{Number(v.pricePerDay || 0).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign:'center', fontWeight:700 }}>{v.quantity ?? 1}</td>
                        <td>
                          <span className="status-pill" style={{ background: sc + '18', color: sc, fontSize:11 }}>
                            {v.status === 'APPROVED' ? '✓ Approved' : v.status === 'REJECTED' ? '✗ Rejected' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-ghost" style={{ padding:'3px 10px', fontSize:11 }}
                            onClick={() => setSelectedVeh(v)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Card>

    </>}

    {/* ── INVENTORY TAB ── */}
    {activeTab === 'inventory' && <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:16 }}>
        {[
          { label:'Total Vehicles',      value: totalVeh,                                                                           Icon: Car,           color:'#2563eb' },
          { label:'Parts SKUs',          value: allParts.length,                                                                    Icon: Package,       color:'#7c3aed' },
          { label:'Approved & Live',     value: approved.length,                                                                    Icon: CheckCircle,   color:'#16a34a' },
          { label:'Low Stock Parts',     value: lowStockParts.length,                                                               Icon: AlertTriangle, color:'#dc2626' },
        ].map(({ label, value, Icon: Ic, color }) => (
          <div key={label} style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:'1.5px solid #e5e7eb', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ background: color + '15', borderRadius:10, width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Ic size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:24, fontWeight:900, color }}>{value ?? 0}</div>
            </div>
          </div>
        ))}
      </div>

      <Card
        title="Parts Inventory"
        badge={`${allParts.length} SKUs`}
      >
        {allParts.length === 0
          ? <div className="empty-state" style={{ padding:'32px 24px' }}>
              <Package size={38} style={{ opacity:.2, marginBottom:10 }} />
              <p>No parts in inventory yet. Parts added by franchisees will appear here.</p>
            </div>
          : <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Part Code (SKU)</th>
                    <th>Part Name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Reorder Level</th>
                    <th>Unit Price</th>
                    <th>Stock Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allParts.map((p, i) => {
                    const isLow = p.quantity <= p.reorderLevel;
                    return (
                      <tr key={p._id || p.sku || i}>
                        <td>
                          <span style={{ fontFamily:'monospace', fontWeight:700, color:'#1d4ed8',
                            background:'#eff6ff', padding:'2px 8px', borderRadius:5, fontSize:12 }}>
                            {p.sku || '—'}
                          </span>
                        </td>
                        <td style={{ fontWeight:600 }}>{p.name || '—'}</td>
                        <td>
                          <span style={{ fontSize:11, background:'#f3f4f6', padding:'2px 7px',
                            borderRadius:4, color:'#374151' }}>
                            {p.category || 'General'}
                          </span>
                        </td>
                        <td style={{ fontWeight:700, color: isLow ? '#dc2626' : '#16a34a' }}>
                          {p.quantity ?? 0}
                        </td>
                        <td style={{ color:'#6b7280' }}>{p.reorderLevel ?? 5}</td>
                        <td>₹{Number(p.unitPrice || 0).toLocaleString('en-IN')}</td>
                        <td>
                          <span className="status-pill" style={{
                            background: isLow ? '#fee2e2' : '#dcfce7',
                            color:      isLow ? '#991b1b' : '#166534',
                          }}>
                            {isLow ? '⚠ Low Stock' : '✓ In Stock'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-ghost" style={{ padding:'3px 10px', fontSize:12 }}
                            onClick={() => setSelectedPart(p)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </>}

    {/* ── Vehicle Detail Modal ── */}
    {selectedVeh && (
      <div className="modal-overlay" onClick={() => setSelectedVeh(null)}>
        <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(640px,100%)' }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">Vehicle Details</div>
              <div className="modal-subtitle">Complete vehicle information submitted by franchisee</div>
            </div>
            <button className="icon-btn" onClick={() => setSelectedVeh(null)}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {/* Hero */}
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12,
              padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ background:'#2563eb', color:'#fff', borderRadius:10,
                width:52, height:52, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                {selectedVeh.category === '2-wheeler' ? '🛵' : selectedVeh.category === '3-wheeler' ? '🛺' : '🚗'}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#2563eb', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:3 }}>{selectedVeh.category || 'Vehicle'}</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#1e3a8a' }}>{selectedVeh.make} {selectedVeh.model}</div>
                <div style={{ fontSize:12, color:'#3b82f6', marginTop:2, fontFamily:'monospace' }}>{selectedVeh.registrationNo || '—'}</div>
              </div>
            </div>

            {/* Status + badges */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
              {(() => {
                const sc = selectedVeh.status === 'APPROVED' ? '#16a34a' : selectedVeh.status === 'REJECTED' ? '#dc2626' : '#d97706';
                const sl = selectedVeh.status === 'APPROVED' ? '✓ Approved & Live' : selectedVeh.status === 'REJECTED' ? '✗ Rejected' : '⏳ Pending Approval';
                return <span className="status-pill" style={{ background: sc + '18', color: sc, fontSize:13, padding:'4px 14px' }}>{sl}</span>;
              })()}
              {selectedVeh.year && <span className="status-pill" style={{ background:'#f5f3ff', color:'#5b21b6', fontSize:13, padding:'4px 14px' }}>Year: {selectedVeh.year}</span>}
              {selectedVeh.color && <span className="status-pill" style={{ background:'#fef9c3', color:'#713f12', fontSize:13, padding:'4px 14px' }}>{selectedVeh.color}</span>}
              {selectedVeh.chargingType && <span className="status-pill" style={{ background:'#ecfdf5', color:'#065f46', fontSize:13, padding:'4px 14px' }}>⚡ {selectedVeh.chargingType}</span>}
            </div>

            {/* Images */}
            {selectedVeh.images?.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Vehicle Images ({selectedVeh.images.length})</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {selectedVeh.images.map((img, i) => (
                    <div key={i} style={{ width:80, height:64, borderRadius:8, overflow:'hidden', border:'1px solid #e5e7eb' }}>
                      <img src={img.url} alt={`Image ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Fields Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', background:'#e5e7eb', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
              {[
                ['Make / Brand',        selectedVeh.make              || '—'],
                ['Model Name',          selectedVeh.model             || '—'],
                ['Category',            selectedVeh.category          || '—'],
                ['Year of Manufacture', selectedVeh.year              || '—'],
                ['Color',               selectedVeh.color             || '—'],
                ['Registration No.',    selectedVeh.registrationNo    || '—'],
                ['Battery Capacity',    selectedVeh.batteryCapacityKwh ? `${selectedVeh.batteryCapacityKwh} kWh` : '—'],
                ['Range',               selectedVeh.rangeKm           ? `${selectedVeh.rangeKm} km` : '—'],
                ['Charging Type',       selectedVeh.chargingType      || '—'],
                ['Price Per Day',       `₹${Number(selectedVeh.pricePerDay || 0).toLocaleString('en-IN')}`],
                ['Quantity in Stock',   selectedVeh.quantity ?? 1],
                ['Approval Status',     selectedVeh.status            || '—'],
                ['Submitted By',        selectedVeh.franchiseeName    || '—'],
                ['Franchisee Email',    selectedVeh.franchiseeEmail   || '—'],
                ['Submitted At',        fmt(selectedVeh.createdAt)],
                ['Last Updated',        fmt(selectedVeh.updatedAt)],
              ].map(([k, val]) => (
                <div key={k} style={{ background:'#fff', padding:'12px 16px' }}>
                  <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{k}</div>
                  <div style={{ fontWeight:700, color:'#1a1f2e', fontSize:13 }}>{val}</div>
                </div>
              ))}
            </div>

            {selectedVeh.description && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Description / Notes</div>
                <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>
                  {selectedVeh.description}
                </div>
              </div>
            )}

            {selectedVeh.status === 'REJECTED' && selectedVeh.rejectionReason && (
              <InfoBanner Icon={AlertTriangle}>Rejection reason: {selectedVeh.rejectionReason}</InfoBanner>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => setSelectedVeh(null)}>Close</button>
          </div>
        </div>
      </div>
    )}

    {/* ── Part Detail Modal ── */}
    {selectedPart && (() => {
      const p = selectedPart;
      const isLow = p.quantity <= p.reorderLevel;
      return (
        <div className="modal-overlay" onClick={() => setSelectedPart(null)}>
          <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(580px,100%)' }}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Part Details</div>
                <div className="modal-subtitle">Complete information for this spare part</div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedPart(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {/* Hero: Part Code */}
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12,
                padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ background:'#1d4ed8', color:'#fff', borderRadius:10,
                  width:48, height:48, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Hash size={22} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'.1em',
                    textTransform:'uppercase', marginBottom:3 }}>Part Code (SKU)</div>
                  <div style={{ fontSize:26, fontWeight:900, fontFamily:'monospace', color:'#1e3a8a',
                    letterSpacing:'.05em' }}>{p.sku || '—'}</div>
                </div>
              </div>
              {/* Stock badge */}
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <span className="status-pill" style={{
                  background: isLow ? '#fee2e2' : '#dcfce7',
                  color:      isLow ? '#991b1b' : '#166534',
                  fontSize:13, padding:'4px 14px',
                }}>
                  {isLow ? '⚠ Low Stock' : '✓ In Stock'}
                </span>
                <span className="status-pill" style={{ background:'#f5f3ff', color:'#5b21b6', fontSize:13, padding:'4px 14px' }}>
                  {p.category || 'General'}
                </span>
                {p.partType && (
                  <span className="status-pill" style={{ background:'#fef9c3', color:'#713f12', fontSize:13, padding:'4px 14px' }}>
                    {p.partType}
                  </span>
                )}
              </div>
              {/* Core Info Grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px',
                background:'#e5e7eb', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
                {[
                  ['Part Name',      p.name          || '—'],
                  ['Category',       p.category      || 'General'],
                  ['Current Stock',  p.quantity ?? 0],
                  ['Reorder Level',  p.reorderLevel  ?? 5],
                  ['Unit Price',     `₹${Number(p.unitPrice||0).toLocaleString('en-IN')}`],
                  ['Total Value',    `₹${Number((p.unitPrice||0)*(p.quantity||0)).toLocaleString('en-IN')}`],
                  p.manufacturer ? ['Manufacturer', p.manufacturer] : null,
                  p.location     ? ['Storage Location', p.location]  : null,
                  p.partType     ? ['Part Type', p.partType]          : null,
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} style={{ background:'#fff', padding:'12px 16px' }}>
                    <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600,
                      textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{k}</div>
                    <div style={{ fontWeight:700, color:'#1a1f2e', fontSize:14 }}>{v}</div>
                  </div>
                ))}
              </div>
              {p.compatibleVehicles && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8,
                    display:'flex', alignItems:'center', gap:6 }}>
                    <Car size={13} /> Compatible Vehicles
                  </div>
                  <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8,
                    padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>
                    {p.compatibleVehicles}
                  </div>
                </div>
              )}
              {p.description && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Description / Notes</div>
                  <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8,
                    padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>
                    {p.description}
                  </div>
                </div>
              )}
              {isLow && (
                <InfoBanner Icon={AlertTriangle}>
                  Stock ({p.quantity}) is at or below reorder level ({p.reorderLevel}). Consider restocking soon.
                </InfoBanner>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setSelectedPart(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    })()}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// VEHICLE APPROVALS PAGE  — reads from /api/admin/pending-vehicles
// ══════════════════════════════════════════════════════════════════
function AdminVehicleApprovals({ call }) {
  const { data: initial, loading, error, refresh } = useFetch(call, '/admin/pending-vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const { toast, show } = useToast();

  useEffect(() => { if (initial) setVehicles(initial); }, [initial]);

  const approve = async (id) => {
    try {
      const updated = await call(`/admin/pending-vehicles/${id}/approve`, { method: 'put' });
      setVehicles(vs => vs.map(v => v._id === id ? updated : v));
      setSelected(null);
      show('✓ Vehicle approved — now live in Customer Portal!');
    } catch (e) {
      show(e.response?.data?.message || 'Approval failed', 'error');
    }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason (optional):');
    try {
      const updated = await call(`/admin/pending-vehicles/${id}/reject`, { method: 'put', data: { reason: reason || '' } });
      setVehicles(vs => vs.map(v => v._id === id ? updated : v));
      setSelected(null);
      show('Vehicle rejected.', 'error');
    } catch (e) {
      show(e.response?.data?.message || 'Rejection failed', 'error');
    }
  };

  const pending  = vehicles.filter(v => v.status === 'PENDING_APPROVAL');
  const approved = vehicles.filter(v => v.status === 'APPROVED');
  const rejected = vehicles.filter(v => v.status === 'REJECTED');

  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Vehicle Approvals"
      sub="Review and approve vehicle listings submitted by franchisees. Approved vehicles appear in the Customer Portal."
      actions={<button className="btn-ghost" onClick={refresh}><RefreshCw size={15} /> Refresh</button>}
    />
    <MetricGrid metrics={[
      { label: 'Pending Review', value: pending.length,  Icon: Clock,         color: '#d97706' },
      { label: 'Approved',       value: approved.length, Icon: CheckCircle,   color: '#16a34a' },
      { label: 'Rejected',       value: rejected.length, Icon: AlertTriangle, color: '#dc2626' },
      { label: 'Total',          value: vehicles.length, Icon: Car,           color: '#2563eb' },
    ]} />

    {pending.length > 0 && (
      <Card title="Pending Approval" badge={`${pending.length} awaiting`}>
        <div className="approval-list">
          {pending.map(v => (
            <div key={v._id} className="approval-card">
              {v.images?.length > 0 && (
                <div className="approval-img">
                  <img src={v.images[0].url} alt={v.make} />
                  {v.images.length > 1 && <span className="img-count">+{v.images.length - 1}</span>}
                </div>
              )}
              <div className="approval-body">
                <div className="approval-title">
                  {v.category === '2-wheeler' ? '🛵' : v.category === '3-wheeler' ? '🛺' : '🚗'}
                  &nbsp;{v.make} {v.model} ({v.year})
                </div>
                <div className="approval-meta">
                  <span>Reg: {v.registrationNo}</span>
                  <span>₹{v.pricePerDay}/day</span>
                  <span>Stock: {v.quantity ?? 0}</span>
                  <span>{v.rangeKm} km range</span>
                  <span>{v.color}</span>
                </div>
                <div className="approval-franchise">
                  Submitted by: <strong>{v.franchiseeName}</strong> ({v.franchiseeEmail})
                  &nbsp;·&nbsp;{new Date(v.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="approval-actions">
                <button className="btn-ghost" onClick={() => setSelected(v)}>View Details</button>
                <button className="btn-approve" onClick={() => approve(v._id)}>
                  <CheckCircle size={14} /> Approve
                </button>
                <button className="btn-reject" onClick={() => reject(v._id)}>
                  <AlertTriangle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )}

    {approved.length > 0 && (
      <Card title="Approved Vehicles" badge={`${approved.length} live`}>
        <DataTable rows={approved} cols={['make', 'model', 'category', 'registrationNo', 'pricePerDay', 'franchiseeName', 'status']} />
      </Card>
    )}

    {rejected.length > 0 && (
      <Card title="Rejected" badge={`${rejected.length}`}>
        <DataTable rows={rejected} cols={['make', 'model', 'registrationNo', 'franchiseeName', 'rejectionReason', 'status']} />
      </Card>
    )}

    {vehicles.length === 0 && (
      <Card title="No Submissions Yet">
        <div className="empty-state">
          <Car size={40} style={{ opacity: .25, marginBottom: 12 }} />
          <p>No vehicle submissions from franchisees yet. Once a franchisee adds a vehicle, it will appear here for review.</p>
        </div>
      </Card>
    )}

    {selected && (
      <Modal
        title={`${selected.make} ${selected.model} — Details`}
        subtitle={`Submitted by ${selected.franchiseeName}`}
        onClose={() => setSelected(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setSelected(null)}>Close</button>
          <button className="btn-reject" onClick={() => reject(selected._id)}><AlertTriangle size={14} /> Reject</button>
          <button className="btn-approve" onClick={() => approve(selected._id)}><CheckCircle size={14} /> Approve</button>
        </>}
      >
        {selected.images?.length > 0 && (
          <div className="img-grid" style={{ marginBottom: 16 }}>
            {selected.images.map((img, i) => (
              <div key={i} className="img-thumb"><img src={img.url} alt={img.name} /></div>
            ))}
          </div>
        )}
        <div className="kv-list">
          {[
            ['Category', selected.category], ['Make', selected.make], ['Model', selected.model],
            ['Year', selected.year], ['Color', selected.color], ['Registration', selected.registrationNo],
            ['Battery', `${selected.batteryCapacityKwh} kWh`], ['Range', `${selected.rangeKm} km`],
            ['Charging', selected.chargingType], ['Price/Day', `₹${selected.pricePerDay}`],
            ['Franchisee', selected.franchiseeName], ['Email', selected.franchiseeEmail],
            ['Submitted', new Date(selected.createdAt).toLocaleString()],
          ].map(([k, v]) => (
            <div className="kv-row" key={k}><span>{k}</span><strong>{v || '—'}</strong></div>
          ))}
        </div>
        {selected.description && <p style={{ fontSize: 13, color: '#374151', marginTop: 12, lineHeight: 1.6 }}>{selected.description}</p>}
      </Modal>
    )}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// ADMIN STAFF DIRECTORY — Unified page: Active | Inactive | Approvals
// ══════════════════════════════════════════════════════════════════
function AdminStaffDirectory({ call, initialTab = 'active' }) {
  const { data: initial, loading, error, refresh } = useFetch(call, '/admin/pending-staff');
  const [staffList,     setStaffList]     = useState([]);
  const [newlyApproved, setNewlyApproved] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [imageModal,    setImageModal]    = useState(null);
  const [tab,           setTab]           = useState(initialTab);
  const { toast, show } = useToast();

  useEffect(() => { if (initial) setStaffList(initial); }, [initial]);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const approveStaff = async (id) => {
    try {
      const result = await call(`/admin/pending-staff/${id}/approve`, { method: 'put' });
      const updated = await call('/admin/pending-staff');
      setStaffList(updated);
      setNewlyApproved(a => [...a, {
        _id: id, name: result.name, email: result.email,
        role: result.role, password: result.password, franchiseeName: result.franchiseeName,
      }]);
      show(`✓ ${result.name} approved! Credentials generated.`);
      setSelectedStaff(null);
    } catch (e) {
      show(e.response?.data?.message || 'Approval failed', 'error');
    }
  };

  const rejectStaff = async (id) => {
    const reason = prompt('Rejection reason (optional):');
    try {
      const updated_doc = await call(`/admin/pending-staff/${id}/reject`, { method: 'put', data: { reason: reason || '' } });
      setStaffList(sl => sl.map(s => s._id === id ? updated_doc : s));
      show('Staff entry rejected.', 'error');
      setSelectedStaff(null);
    } catch (e) {
      show(e.response?.data?.message || 'Rejection failed', 'error');
    }
  };

  const activeList   = staffList.filter(s => s.status === 'APPROVED' && !s.removedFromFranchisee);
  const inactiveList = staffList.filter(s => s.removedFromFranchisee || s.status === 'REJECTED');
  const pending      = staffList.filter(s => s.status === 'PENDING_APPROVAL' && !s.removedFromFranchisee);

  const TABS = [
    { id: 'active',    label: 'Active Staff',     count: activeList.length,   Icon: UserCheck },
    { id: 'inactive',  label: 'Inactive / Removed', count: inactiveList.length, Icon: UserX },
    { id: 'approvals', label: 'Staff Approvals',  count: pending.length,      Icon: Key },
  ];

  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;

  return <>
    <Toast toast={toast} />

    {/* Image lightbox */}
    {imageModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick={() => setImageModal(null)}>
        <div style={{ position:'relative', maxWidth:'90vw', maxHeight:'90vh' }} onClick={e => e.stopPropagation()}>
          <img src={imageModal.url} alt={imageModal.title}
            style={{ maxWidth:'88vw', maxHeight:'85vh', borderRadius:8, objectFit:'contain' }} />
          <div style={{ color:'#fff', textAlign:'center', marginTop:8, fontSize:13 }}>{imageModal.title}</div>
          <button onClick={() => setImageModal(null)}
            style={{ position:'absolute', top:-12, right:-12, background:'#fff', border:'none', borderRadius:'50%',
              width:32, height:32, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} />
          </button>
        </div>
      </div>
    )}

    <PageHeader
      title="Staff Directory"
      sub="All staff across franchises — active, inactive/removed, and pending approvals."
      actions={<button className="btn-ghost" onClick={refresh}><RefreshCw size={15} /> Refresh</button>}
    />

    <MetricGrid metrics={[
      { label: 'Active Staff',     value: activeList.length,   Icon: UserCheck,     color: '#16a34a' },
      { label: 'Inactive / Removed',value: inactiveList.length,Icon: UserX,         color: '#dc2626' },
      { label: 'Pending Approval', value: pending.length,      Icon: Clock,         color: '#d97706' },
      { label: 'Total Records',    value: staffList.length,    Icon: Users,         color: '#2563eb' },
    ]} />

    {/* Tab Bar */}
    <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'2px solid #e5e7eb', paddingBottom:0 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
            border:'none', background:'none', cursor:'pointer',
            borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
            color: tab === t.id ? '#2563eb' : '#6b7280',
            fontWeight: tab === t.id ? 700 : 500, fontSize:14, marginBottom:'-2px',
            transition:'all 0.15s',
          }}>
          <t.Icon size={15} />
          {t.label}
          <span style={{
            background: tab === t.id ? '#2563eb' : '#e5e7eb',
            color: tab === t.id ? '#fff' : '#374151',
            borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700
          }}>{t.count}</span>
        </button>
      ))}
    </div>

    {/* ── ACTIVE TAB ───────────────────────────────── */}
    {tab === 'active' && (
      <Card title="Active Staff — Full Details" badge={`${activeList.length} active`}>
        {activeList.length === 0
          ? <div className="empty-state"><UserCheck size={40} style={{ opacity:.2, marginBottom:12 }} /><p>No active staff yet.</p></div>
          : <AdminStaffFullTable rows={activeList} setImageModal={setImageModal} showFranchisee />
        }
      </Card>
    )}

    {/* ── INACTIVE TAB ─────────────────────────────── */}
    {tab === 'inactive' && (
      <Card title="Inactive / Removed Staff" badge={`${inactiveList.length}`}>
        {inactiveList.length === 0
          ? <div className="empty-state"><UserX size={40} style={{ opacity:.2, marginBottom:12 }} /><p>No inactive staff records.</p></div>
          : <AdminStaffFullTable rows={inactiveList} setImageModal={setImageModal} showFranchisee showRemovedBadge />
        }
      </Card>
    )}

    {/* ── APPROVALS TAB ────────────────────────────── */}
    {tab === 'approvals' && <>
      {newlyApproved.map(a => (
        <div key={a._id} className="cred-reveal-card">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ background:'#dcfce7', color:'#16a34a', borderRadius:'50%', width:36, height:36, display:'grid', placeItems:'center' }}>
              <CheckCircle size={18} />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>{a.name} — Account Created</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Credentials generated — share securely with staff member</div>
            </div>
          </div>
          <div className="cred-box">
            <div className="cred-row"><span>Name</span><code>{a.name}</code></div>
            <div className="cred-row"><span>Email (Login)</span><code>{a.email}</code></div>
            <div className="cred-row"><span>Password</span><code style={{ color:'#1d4ed8' }}>{a.password}</code></div>
            <div className="cred-row"><span>Role</span><code>{a.role}</code></div>
            <div className="cred-row"><span>Franchise</span><code>{a.franchiseeName}</code></div>
          </div>
          <div className="cred-warn">⚠ Share these credentials securely. Password is shown only once.</div>
        </div>
      ))}

      {pending.length > 0 ? (
        <Card title="Pending Staff Approvals" badge={`${pending.length} waiting`}>
          <div className="approval-list">
            {pending.map(s => (
              <div key={s._id} className="approval-card staff-card" style={{ cursor:'pointer' }}
                onClick={() => setSelectedStaff(s)}>
                <div className="staff-avatar">{s.name?.[0]?.toUpperCase() || '?'}</div>
                <div className="approval-body">
                  <div className="approval-title">{s.name}</div>
                  <div className="approval-meta">
                    <span>{s.role}</span>
                    <span>{s.email}</span>
                    {s.phone && <span>{s.phone}</span>}
                    {s.panNumber && <span>PAN: {s.panNumber}</span>}
                    {s.aadhar && <span>Aadhar: {s.aadhar}</span>}
                    {s.hubId && <span>Hub: {s.hubId}</span>}
                  </div>
                  <div className="approval-franchise">
                    Franchisee: <strong>{s.franchiseeName}</strong> · {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="approval-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-approve" onClick={() => approveStaff(s._id)}>
                    <CheckCircle size={14} /> Approve & Generate Credentials
                  </button>
                  <button className="btn-reject" onClick={() => rejectStaff(s._id)}>
                    <AlertTriangle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card title="No Pending Approvals">
          <div className="empty-state">
            <CheckCircle size={40} style={{ opacity:.2, marginBottom:12 }} />
            <p>All caught up — no pending staff submissions.</p>
          </div>
        </Card>
      )}

      {staffList.filter(s => s.status === 'REJECTED').length > 0 && (
        <Card title="Rejected Submissions" badge={`${staffList.filter(s=>s.status==='REJECTED').length}`}>
          <AdminStaffFullTable rows={staffList.filter(s => s.status === 'REJECTED')} setImageModal={setImageModal} showFranchisee showRejectedReason />
        </Card>
      )}
    </>}

    {/* Detail modal for pending staff */}
    {selectedStaff && (
      <Modal
        title={`${selectedStaff.name} — Staff Details`}
        subtitle={`Submitted by ${selectedStaff.franchiseeName}`}
        onClose={() => setSelectedStaff(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setSelectedStaff(null)}>Close</button>
          <button className="btn-reject" onClick={() => rejectStaff(selectedStaff._id)}><AlertTriangle size={14} /> Reject</button>
          <button className="btn-approve" onClick={() => approveStaff(selectedStaff._id)}><CheckCircle size={14} /> Approve & Generate Credentials</button>
        </>}
      >
        <div className="kv-list">
          {[
            ['Name',           selectedStaff.name],
            ['Email',          selectedStaff.email],
            ['Role',           selectedStaff.role],
            ['Phone',          selectedStaff.phone || '—'],
            ['Hub ID',         selectedStaff.hubId || '—'],
            ['PAN Number',     selectedStaff.panNumber || '—'],
            ['Aadhar Number',  selectedStaff.aadhar || '—'],
            ['Address',        selectedStaff.address || '—'],
            ['Franchisee',     selectedStaff.franchiseeName],
            ['Franchise Email',selectedStaff.franchiseeEmail],
            ['Submitted',      new Date(selectedStaff.createdAt).toLocaleString()],
          ].map(([k, v]) => (
            <div className="kv-row" key={k}><span>{k}</span><strong>{v || '—'}</strong></div>
          ))}
        </div>
        <div style={{ display:'flex', gap:16, marginTop:16 }}>
          {selectedStaff.aadharPhoto?.url && (
            <div>
              <div style={{ fontSize:12, color:'#6b7280', marginBottom:4 }}>Aadhar Photo</div>
              <img src={selectedStaff.aadharPhoto.url} alt="Aadhar"
                style={{ width:140, height:90, objectFit:'cover', borderRadius:6, border:'1px solid #e5e7eb', cursor:'pointer' }}
                onClick={() => setImageModal({ url: selectedStaff.aadharPhoto.url, title:`${selectedStaff.name} — Aadhar` })} />
            </div>
          )}
          {selectedStaff.panPhoto?.url && (
            <div>
              <div style={{ fontSize:12, color:'#6b7280', marginBottom:4 }}>PAN Card Photo</div>
              <img src={selectedStaff.panPhoto.url} alt="PAN"
                style={{ width:140, height:90, objectFit:'cover', borderRadius:6, border:'1px solid #e5e7eb', cursor:'pointer' }}
                onClick={() => setImageModal({ url: selectedStaff.panPhoto.url, title:`${selectedStaff.name} — PAN` })} />
            </div>
          )}
        </div>
      </Modal>
    )}
  </>;
}

// ── Full-column staff table for Command Center ─────────────────────
function AdminStaffFullTable({ rows, setImageModal, showFranchisee, showRemovedBadge, showRejectedReason }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Role</th><th>Phone</th>
            <th>Hub ID</th><th>Address</th>
            <th>PAN No.</th><th>Aadhar No.</th>
            <th>Aadhar Photo</th><th>PAN Photo</th>
            {showFranchisee && <th>Franchisee</th>}
            <th>Status</th>
            {showRemovedBadge && <th>Removed</th>}
            {showRejectedReason && <th>Rejection Reason</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(s => {
            const statusColor = s.status === 'APPROVED' ? '#16a34a'
              : s.status === 'REJECTED'  ? '#dc2626'
              : s.status === 'PENDING_APPROVAL' ? '#d97706'
              : '#6b7280';
            return (
              <tr key={s._id} style={showRemovedBadge && s.removedFromFranchisee ? { background:'#fff7f7' } : {}}>
                <td style={{ fontWeight:600 }}>{s.name}</td>
                <td style={{ fontSize:12 }}>{s.email}</td>
                <td>{s.role}</td>
                <td>{s.phone || '—'}</td>
                <td>{s.hubId || '—'}</td>
                <td style={{ maxWidth:140, fontSize:11, color:'#6b7280' }}>{s.address || '—'}</td>
                <td><code style={{ fontSize:11 }}>{s.panNumber || '—'}</code></td>
                <td><code style={{ fontSize:11 }}>{s.aadhar || '—'}</code></td>
                <td>
                  {s.aadharPhoto?.url
                    ? <button className="btn-ghost" style={{ padding:'2px 8px', fontSize:11 }}
                        onClick={() => setImageModal({ url:s.aadharPhoto.url, title:`${s.name} — Aadhar` })}>
                        <Image size={11} style={{ display:'inline', marginRight:3 }} />View
                      </button>
                    : '—'}
                </td>
                <td>
                  {s.panPhoto?.url
                    ? <button className="btn-ghost" style={{ padding:'2px 8px', fontSize:11 }}
                        onClick={() => setImageModal({ url:s.panPhoto.url, title:`${s.name} — PAN` })}>
                        <Image size={11} style={{ display:'inline', marginRight:3 }} />View
                      </button>
                    : '—'}
                </td>
                {showFranchisee && <td style={{ fontSize:12 }}>{s.franchiseeName || '—'}</td>}
                <td>
                  <span className="status-pill" style={{ background: statusColor+'18', color: statusColor }}>
                    {s.status}
                  </span>
                </td>
                {showRemovedBadge && (
                  <td>
                    {s.removedFromFranchisee
                      ? <span style={{ color:'#dc2626', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', gap:3 }}>
                          <UserX size={12} /> Removed
                        </span>
                      : <span style={{ color:'#16a34a', fontSize:12 }}>—</span>}
                  </td>
                )}
                {showRejectedReason && (
                  <td style={{ fontSize:12, color:'#9ca3af' }}>{s.rejectionReason || '—'}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN — CUSTOMERS  (Command Center)
// Shows all registered customers with their profile and activity.
// Data sourced from GET /api/admin/customers
// ══════════════════════════════════════════════════════════════════
function AdminCustomers({ call }) {
  const [search,   setSearch]   = React.useState('');
  const [page,     setPage]     = React.useState(1);
  const [data,     setData]     = React.useState(null);
  const [loading,  setLoading]  = React.useState(true);
  const [error,    setError]    = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [detail,   setDetail]   = React.useState(null);
  const [dLoading, setDLoading] = React.useState(false);

  const fetchCustomers = React.useCallback(() => {
    setLoading(true); setError(null);
    const qs = new URLSearchParams({ page, limit: 20, ...(search ? { search } : {}) });
    call(`/admin/customers?${qs}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message || 'Failed to load customers'); setLoading(false); });
  }, [page, search]);

  React.useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openDetail = id => {
    setSelected(id); setDLoading(true); setDetail(null);
    call(`/admin/customers/${id}`)
      .then(d => { setDetail(d); setDLoading(false); })
      .catch(() => setDLoading(false));
  };

  const closeDetail = () => { setSelected(null); setDetail(null); };

  const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const badge = (ok, label) => (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: ok ? '#dcfce7' : '#fef9c3', color: ok ? '#15803d' : '#a16207'
    }}>{label}</span>
  );

  return (
    <>
      <PageHeader
        title="Customers"
        sub="All registered customer accounts from the Customer Portal"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="search"
              placeholder="Search name / email / phone…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 13, width: 220 }}
            />
            <button className="btn-primary" onClick={fetchCustomers} style={{ padding: '7px 14px' }}>
              Refresh
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Customers', value: data.total, color: '#2563eb' },
            { label: 'Verified',
              value: data.customers?.filter(c => c.otpVerified).length,
              note: `of ${data.customers?.length} shown`,
              color: '#16a34a' },
            { label: 'Password Set',
              value: data.customers?.filter(c => c.isPasswordSet).length,
              color: '#7c3aed' },
          ].map(({ label, value, note, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value ?? '—'}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
              {note && <div style={{ fontSize: 11, color: '#94a3b8' }}>{note}</div>}
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading customers…</div>}
      {error   && <div style={{ background: '#fef2f2', color: '#dc2626', padding: 14, borderRadius: 8 }}>{error}</div>}

      {data && !loading && (
        <Card title={`Customers (${data.total} total)`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Name', 'Email', 'Phone', 'Verified', 'Password', 'Registered', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.customers?.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No customers found.</td></tr>
                )}
                {data.customers?.map(c => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{c.email}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{badge(c.otpVerified, c.otpVerified ? 'Verified' : 'Pending')}</td>
                    <td style={{ padding: '8px 12px' }}>{badge(c.isPasswordSet, c.isPasswordSet ? 'Set' : 'OTP Only')}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(c.createdAt)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <button
                        onClick={() => openDetail(c._id)}
                        style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: page <= 1 ? '#f8fafc' : '#fff' }}>
                ← Prev
              </button>
              <span style={{ padding: '5px 12px', fontSize: 13, color: '#64748b' }}>Page {data.page} of {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: page >= data.pages ? '#f8fafc' : '#fff' }}>
                Next →
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ── Customer Detail Modal ─────────────────────────────── */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto'
        }} onClick={e => e.target === e.currentTarget && closeDetail()}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Customer Details</h2>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {dLoading && <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>Loading…</div>}

            {detail && (
              <>
                {/* Profile */}
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Name',       detail.customer?.name],
                      ['Email',      detail.customer?.email],
                      ['Phone',      detail.customer?.phone || '—'],
                      ['Registered', fmt(detail.customer?.createdAt)],
                      ['Email Verified', detail.customer?.otpVerified ? '✅ Yes' : '❌ No'],
                      ['Password Set',   detail.customer?.isPasswordSet ? '✅ Yes' : '❌ OTP Only'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicles */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#374151' }}>
                    Vehicles ({detail.vehicles?.length || 0})
                  </div>
                  {detail.vehicles?.length === 0
                    ? <div style={{ color: '#94a3b8', fontSize: 13 }}>No vehicles registered.</div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {detail.vehicles?.map(v => (
                          <div key={v._id} style={{ background: '#f0f9ff', borderRadius: 7, padding: '8px 12px', fontSize: 13 }}>
                            <strong>{v.registrationNo || v.vin}</strong> · {v.model} · SOC {v.batterySoc}% · SOH {v.batterySoh}%
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {/* Recent Jobs */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#374151' }}>
                    Recent Bookings ({detail.jobs?.length || 0})
                  </div>
                  {detail.jobs?.length === 0
                    ? <div style={{ color: '#94a3b8', fontSize: 13 }}>No bookings yet.</div>
                    : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {['Service', 'Status', 'Amount', 'Date'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.jobs?.slice(0, 10).map(j => (
                            <tr key={j._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 8px' }}>{j.serviceType}</td>
                              <td style={{ padding: '5px 8px' }}>{j.status}</td>
                              <td style={{ padding: '5px 8px' }}>₹{j.totalAmount}</td>
                              <td style={{ padding: '5px 8px' }}>{fmt(j.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  }
                </div>

                {/* Payments */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#374151' }}>
                    Payments ({detail.payments?.length || 0}) ·{' '}
                    <span style={{ color: '#2563eb' }}>
                      Total ₹{detail.payments?.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {detail.payments?.length === 0
                    ? <div style={{ color: '#94a3b8', fontSize: 13 }}>No payments yet.</div>
                    : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {['Amount', 'Method', 'Status', 'Date'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.payments?.slice(0, 10).map(p => (
                            <tr key={p._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 8px', fontWeight: 600 }}>₹{p.amount}</td>
                              <td style={{ padding: '5px 8px' }}>{p.method || '—'}</td>
                              <td style={{ padding: '5px 8px' }}>{p.status}</td>
                              <td style={{ padding: '5px 8px' }}>{fmt(p.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  }
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMMAND CENTER — CUSTOMER PAYMENTS (Vehicle Rentals)
// ══════════════════════════════════════════════════════════════════
function AdminCustomerPayments({ call }) {
  const [rentals, setRentals]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState('ALL');

  const load = () => {
    setLoading(true); setError(null);
    call('/admin/rentals')
      .then(d => setRentals(Array.isArray(d) ? d.filter(r => r.paymentStatus === 'PAID') : []))
      .catch(e => setError(e.message || 'Failed to load rentals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const statusColor = {
    BOOKED:           '#d97706',
    PAYMENT_DONE:     '#2563eb',
    HANDOVER_PENDING: '#7c3aed',
    ACTIVE:           '#16a34a',
    COMPLETED:        '#64748b',
    CANCELLED:        '#dc2626',
  };

  const filtered = filter === 'ALL' ? rentals : rentals.filter(r => r.status === filter);
  const paid     = rentals.filter(r => r.paymentStatus === 'PAID');
  const total    = paid.reduce((s, r) => s + (r.totalAmount || 0), 0);


  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading customer payments…</div>;
  if (error)   return <div style={{ padding: 24, color: '#dc2626' }}>Error: {error}</div>;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1f2e', margin: 0 }}>Customer Payments</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
          Paid vehicle rental bookings — refreshes every 30 seconds
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Bookings',  value: rentals.length,                                       color: '#2563eb' },
          { label: 'Paid',            value: paid.length,                                           color: '#16a34a' },
          { label: 'Active Rentals',  value: rentals.filter(r=>r.status==='ACTIVE').length,         color: '#16a34a' },
          { label: 'Revenue Collected',value: `₹${total.toLocaleString('en-IN')}`,                 color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid #e4e7ef', borderRadius: 12,
            padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['ALL','PAYMENT_DONE','ACTIVE','COMPLETED','CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: filter === s ? `1.5px solid ${statusColor[s] || '#2563eb'}` : '1.5px solid #e4e7ef',
            background: filter === s ? (statusColor[s] || '#2563eb') + '18' : '#fff',
            color: filter === s ? (statusColor[s] || '#2563eb') : '#6b7280',
          }}>
            {s === 'ALL' ? `All (${rentals.length})` : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e4e7ef', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Customer', 'Vehicle', 'Amount', 'Payment', 'Booking Status', 'Dates'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #e4e7ef' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No records found.</td></tr>
            )}
            {filtered.map(r => {
              const sc   = statusColor[r.status] || '#6b7280';
              const cust = r.customerId || {};
              const vs   = r.vehicleSnapshot || {};
              return (
                <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => setSelected(r)}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700 }}>{cust.name || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{cust.email || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{cust.phone || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{vs.make} {vs.model}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{vs.category} · {vs.year}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1a1f2e' }}>
                    ₹{(r.totalAmount || 0).toLocaleString('en-IN')}
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.durationDays} day{r.durationDays !== 1 ? 's' : ''}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      background: r.paymentStatus === 'PAID' ? '#f0fdf4' : '#fef3c7',
                      color: r.paymentStatus === 'PAID' ? '#16a34a' : '#d97706',
                      borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {r.paymentStatus === 'PAID' ? '✅ PAID' : r.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: sc + '18', color: sc, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>
                    <div>{fmt(r.startDate)} →</div>
                    <div>{fmt(r.endDate)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: '#fff', width: 'min(520px,100%)', height: '100%',
            overflowY: 'auto', padding: 28, boxShadow: '-4px 0 32px rgba(0,0,0,.12)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1a1f2e' }}>Rental Details</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>ID: {selected._id}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {/* Vehicle images */}
            {selected.vehicleSnapshot?.images?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
                {selected.vehicleSnapshot.images.map((img, i) => (
                  <img key={i} src={img.url} alt={img.name}
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #e4e7ef' }} />
                ))}
              </div>
            )}

            {/* Customer info */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: .5 }}>Customer</div>
              {[
                ['Name',  (selected.customerId?.name  || '—')],
                ['Email', (selected.customerId?.email || '—')],
                ['Phone', (selected.customerId?.phone || '—')],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <strong style={{ color: '#1a1f2e' }}>{v}</strong>
                </div>
              ))}
            </div>

            {/* Vehicle info */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: .5 }}>Vehicle</div>
              {[
                ['Make & Model', `${selected.vehicleSnapshot?.make || ''} ${selected.vehicleSnapshot?.model || ''}`],
                ['Year/Color',   `${selected.vehicleSnapshot?.year || ''} · ${selected.vehicleSnapshot?.color || ''}`],
                ['Category',     selected.vehicleSnapshot?.category || '—'],
                ['Reg. No.',     selected.vehicleSnapshot?.registrationNo || '—'],
                ['Battery',      selected.vehicleSnapshot?.batteryCapacityKwh ? `${selected.vehicleSnapshot.batteryCapacityKwh} kWh` : '—'],
                ['Range',        selected.vehicleSnapshot?.rangeKm ? `${selected.vehicleSnapshot.rangeKm} km` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <strong style={{ color: '#1a1f2e' }}>{v}</strong>
                </div>
              ))}
            </div>

            {/* Booking & Payment */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: .5 }}>Booking & Payment</div>
              {[
                ['Status',       selected.status],
                ['Payment',      selected.paymentStatus],
                ['Total Amount', `₹${(selected.totalAmount || 0).toLocaleString('en-IN')}`],
                ['Rate',         `₹${selected.pricePerDay}/day`],
                ['Duration',     `${selected.durationDays} day${selected.durationDays !== 1 ? 's' : ''}`],
                ['Start Date',   fmt(selected.startDate)],
                ['End Date',     fmt(selected.endDate)],
                ['Booked On',    fmt(selected.createdAt)],
                ...(selected.handoverDate ? [['Handover Date', fmt(selected.handoverDate)]] : []),
                ...(selected.returnDate ? [['Returned Date', fmt(selected.returnDate)]] : []),
                ['Razorpay Order', selected.razorpayOrderId || '—'],
                ['Payment ID',    selected.razorpayPaymentId || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f8fafc', gap: 8 }}>
                  <span style={{ color: '#64748b', flexShrink: 0 }}>{k}</span>
                  <strong style={{ color: '#1a1f2e', textAlign: 'right', wordBreak: 'break-all' }}>{v}</strong>
                </div>
              ))}
            </div>

            {/* Pickup Location */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: .5 }}>Franchisee Pickup Location</div>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                {[selected.pickupLocation?.name || selected.franchiseeName, selected.pickupLocation?.address].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>

            {/* Handover action */}            {selected.status === 'ACTIVE' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px', textAlign: 'center', color: '#16a34a', fontWeight: 700, fontSize: 14 }}>
                ✅ Vehicle is with the customer — Rental Active
                {selected.handoverDate && <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4 }}>Handed over: {fmt(selected.handoverDate)}</div>}
              </div>
            )}
            {selected.status === 'COMPLETED' && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: '14px', textAlign: 'center', color: '#475569', fontWeight: 700, fontSize: 14 }}>
                ✅ Booking Completed — Vehicle Returned to Franchise Stock
                {selected.returnDate && <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4 }}>Returned: {fmt(selected.returnDate)}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}