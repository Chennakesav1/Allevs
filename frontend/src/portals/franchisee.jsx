import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell,
  FileText, Plus, X, Save, Upload, Clock, Image, ChevronRight,
  UserX, UserCheck, UserMinus, Hash, Tag, Layers, Wrench, Building2
} from 'lucide-react';
import './franchisee.css';

const API = import.meta.env.VITE_API_URL || '/api';

// Portal identity is selected by the single-host path: /franchisee
const kind = 'franchisee';
const ALLOWED_ROLES = ['FRANCHISEE','CENTRAL_ADMIN','SUPER_ADMIN'];

const PORTAL_CFG = {
  customer:   { title: 'Customer Portal',    accent: 'Customer Operations' },
  staff:      { title: 'Staff Portal',       accent: 'Service Operations' },
  franchisee: { title: 'Franchisee Portal',  accent: 'Business Intelligence', email: 'franchise@ev.local' },
  command:    { title: 'Central Command',    accent: 'Enterprise Control' },
};
const cfg = PORTAL_CFG[kind];

// ── Local storage helper (shared with Staff portal) ──
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

const NAV_ITEMS = {
  franchisee: [
    { id: 'dashboard',        label: 'Dashboard',        Icon: LayoutDashboard },
    { id: 'financials',       label: 'Financials',       Icon: DollarSign },
    { id: 'inventory',        label: 'Inventory',        Icon: Package },
    { id: 'staff',            label: 'Staff Management', Icon: Users },
    { id: 'attendance',       label: 'Attendance',       Icon: Clock },
    { id: 'leave-approval',   label: 'Leave Approvals',  Icon: FileText },
    { id: 'jobs',             label: 'Jobs',             Icon: ClipboardList },
    { id: 'rentals',           label: 'Customer Bookings', Icon: Car },
    { id: 'complaints',       label: 'Customer Complaints', Icon: Bell },
    { id: 'fault-vehicles',   label: 'Fault Vehicles',      Icon: AlertTriangle },
  ],
};

// ── Axios helper — always reads token fresh from localStorage, auto-refreshes on 401 ──
function api() {
  return async (path, opts = {}) => {
    const token = localStorage.getItem('ev_franchisee_token');
    try {
      const r = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${token}` }, ...opts });
      return r.data;
    } catch (err) {
      if (err.response?.status === 401) {
        const rt = localStorage.getItem('ev_franchisee_refresh_token');
        if (rt) {
          try {
            const { data } = await axios.post(`${API}/auth/refresh`, { refreshToken: rt });
            localStorage.setItem('ev_franchisee_token', data.accessToken);
            localStorage.setItem('ev_franchisee_refresh_token', data.refreshToken);
            const retry = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${data.accessToken}` }, ...opts });
            return retry.data;
          } catch (_) {
            localStorage.removeItem('ev_franchisee_token');
            localStorage.removeItem('ev_franchisee_refresh_token');
            window.location.reload();
            return;
          }
        } else {
          localStorage.removeItem('ev_franchisee_token');
          window.location.reload();
          return;
        }
      }
      throw err;
    }
  };
}

function useFetch(call, path) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [rev, setRev]         = useState(0);
  useEffect(() => {
    if (!call || !path) return;
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
  const [token,  setToken]  = useState(() => localStorage.getItem('ev_franchisee_token'));
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
          localStorage.removeItem('ev_franchisee_token');
          localStorage.removeItem('ev_franchisee_refresh_token');
          setToken(null);
          setUser(null);
          return;
        }
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem('ev_franchisee_token');
        localStorage.removeItem('ev_franchisee_refresh_token');
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
      localStorage.setItem('ev_franchisee_token', tok);
      if (rt) localStorage.setItem('ev_franchisee_refresh_token', rt);
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
    localStorage.removeItem('ev_franchisee_token');
    localStorage.removeItem('ev_franchisee_refresh_token');
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
// SHELL
// ══════════════════════════════════════════════════════════════════
function Shell({ user, page, setPage, call, logout }) {
  const navItems = NAV_ITEMS[kind] || NAV_ITEMS.franchisee;
  const activePage = page;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon sm"><Zap size={16} /></div>
          <span className="logo-text">EV CORE</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ id, label, Icon, parent, sub }) => {
            const isActive = activePage === id;
            const isParentActive = parent && activePage === parent;
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
                {sub && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
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
          <PageRouter page={page} call={call} user={user} setPage={setPage} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE ROUTER
// ══════════════════════════════════════════════════════════════════
function PageRouter({ page, call, user, setPage }) {
  const pages = {
    dashboard:        <FranDashboard  call={call} />,
    financials:       <FranFinancials call={call} />,
    inventory:        <FranInventory  call={call} user={user} setPage={setPage} />,
    staff:            <FranStaff     call={call} user={user} setPage={setPage} />,
    attendance:       <FranAttendance />,
    'leave-approval': <FranLeaveApproval />,
    jobs:             <FranJobs      call={call} />,
    rentals:          <FranRentals   call={call} />,
    complaints:       <FranComplaints call={call} />,
    'fault-vehicles': <FaultVehicles call={call} />,
  };
  return pages[page] || pages.dashboard;
}

// ══════════════════════════════════════════════════════════════════
// SHARED UI
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
  IN_USE: '#2563eb', OFFLINE: '#dc2626',
  PENDING_APPROVAL: '#d97706', APPROVED: '#16a34a', REJECTED: '#dc2626',
};

function DataTable({ rows = [], cols = [], renderActions }) {
  if (!rows?.length) return <div className="empty">No records found.</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {cols.map(c => <th key={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</th>)}
            {renderActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r?._id || r?.id || i}>
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
              {renderActions && <td>{renderActions(r)}</td>}
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

function InfoBanner({ Icon: I = Shield, type = 'info', children }) {
  const styles = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
  };
  const s = styles[type] || styles.info;
  return (
    <div className="info-banner" style={{ background: s.bg, borderColor: s.border, color: s.color }}>
      <I size={15} />
      <span>{children}</span>
    </div>
  );
}

function Drawer({ open, onClose, title, subtitle, children, footer, width = 560 }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fmodal-overlay" onClick={onClose}>
      <div
        className="fmodal-panel"
        style={{ width: `min(${width}px, 96vw)` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{title}</div>
            {subtitle && <div className="drawer-subtitle">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="drawer-body fmodal-body">
          {children}
        </div>
        {footer && (
          <div className="drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const VEHICLE_CATEGORIES = [
  { value: '2-wheeler', label: '2-Wheeler', emoji: '🛵', desc: 'Scooters, Motorcycles, E-bikes' },
  { value: '3-wheeler', label: '3-Wheeler', emoji: '🛺', desc: 'Auto-rickshaws, E-carts' },
  { value: '4-wheeler', label: '4-Wheeler', emoji: '🚗', desc: 'Cars, SUVs, Vans' },
];

const VEHICLE_MAKES = {
  '2-wheeler': ['Ola Electric', 'Ather Energy', 'Hero Electric', 'Bajaj Chetak', 'TVS iQube', 'Ampere', 'Pure EV', 'Other'],
  '3-wheeler': ['Mahindra Electric', 'Piaggio Ape', 'Saarthi EV', 'Lohia Auto', 'OSM Rage+', 'YC Electric', 'Other'],
  '4-wheeler': ['Tata Nexon EV', 'Tata Tigor EV', 'MG ZS EV', 'Hyundai Kona', 'Kia EV6', 'BYD Atto 3', 'Mahindra XEV9e', 'Other'],
};

// ══════════════════════════════════════════════════════════════════
// FRAN DASHBOARD
// ══════════════════════════════════════════════════════════════════
function FranDashboard({ call }) {
  const { data: d, loading: ld } = useFetch(call, '/franchise/dashboard');
  const { data: f, loading: lf } = useFetch(call, '/franchise/financials');
  // ── FIXED: read pending counts from real API ──────────────────
  const { data: pendingVehicles } = useFetch(call, '/franchise/pending-vehicles');
  const { data: pendingStaff   } = useFetch(call, '/franchise/pending-staff');

  const vPending = (pendingVehicles || []).filter(v => v.status === 'PENDING_APPROVAL').length;
  const sPending = (pendingStaff   || []).filter(s => s.status === 'PENDING_APPROVAL').length;

  if (ld || lf) return <Loader />;
  return <>
    <PageHeader title="Franchise Dashboard" sub="Revenue, jobs and performance overview." />
    {(vPending > 0 || sPending > 0) && (
      <InfoBanner type="warning" Icon={Clock}>
        You have {vPending} vehicle(s) and {sPending} staff entry(s) awaiting Command Center approval.
      </InfoBanner>
    )}
    <MetricGrid metrics={[
      { label: 'Revenue',       value: `₹${(d?.revenue ?? 0).toLocaleString()}`, Icon: DollarSign,    color: '#16a34a' },
      { label: 'Total Jobs',    value: d?.jobs ?? 0,                              Icon: ClipboardList, color: '#2563eb' },
      { label: 'ROI',           value: `${d?.roi ?? 0}%`,                         Icon: TrendingUp,    color: '#7c3aed' },
      { label: 'Pending Items', value: vPending + sPending,                       Icon: Clock,         color: '#d97706' },
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

// ══════════════════════════════════════════════════════════════════
// FRAN INVENTORY PAGE
// ══════════════════════════════════════════════════════════════════
function FranInventory({ call, user, setPage }) {
  const { data: apiInv, loading, error, refresh: refreshParts } = useFetch(call, '/franchise/inventory');
  const { data: pendingVehicles, loading: pvLoading, refresh } = useFetch(call, '/franchise/pending-vehicles');
  const [vehicleDrawerOpen, setVehicleDrawerOpen] = useState(false);
  const [partDrawerOpen,    setPartDrawerOpen]    = useState(false);
  const [selectedPart,      setSelectedPart]      = useState(null);
  const [selectedVehicle,   setSelectedVehicle]   = useState(null);
  const [activeTab,         setActiveTab]         = useState('vehicles');
  const { toast, show } = useToast();

  const onVehicleAdded = () => {
    refresh();
    show('Vehicle submitted for Command Center approval!');
  };

  const onPartAdded = () => {
    refreshParts();
    show('New part added to inventory!');
  };

  if (loading || pvLoading) return <Loader />;
  if (error) return <Err msg={error} />;

  const vehicles  = pendingVehicles || [];
  const parts     = apiInv || [];
  const approved  = vehicles.filter(v => v.status === 'APPROVED');
  const pending   = vehicles.filter(v => v.status === 'PENDING_APPROVAL');
  const lowStock  = parts.filter(p => p.quantity <= p.reorderLevel);

  const INV_TABS = [
    { id: 'vehicles', label: 'My Vehicles', Icon: Car,     count: vehicles.length },
    { id: 'parts',    label: 'Parts Inventory', Icon: Package, count: parts.length },
  ];

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Inventory"
      sub="Manage your EV fleet vehicles and spare parts inventory."
      actions={
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-ghost" onClick={() => setPartDrawerOpen(true)}>
            <Package size={15} /> Add Part
          </button>
          <button className="btn-primary" onClick={() => setVehicleDrawerOpen(true)}>
            <Plus size={15} /> Add Vehicle
          </button>
        </div>
      }
    />

    <MetricGrid metrics={[
      { label: 'Total Vehicles',   value: vehicles.length, Icon: Car,           color: '#2563eb' },
      { label: 'Pending Approval', value: pending.length,  Icon: Clock,         color: '#d97706' },
      { label: 'Approved & Live',  value: approved.length, Icon: CheckCircle,   color: '#16a34a' },
      { label: 'Parts SKUs',       value: parts.length,    Icon: Package,       color: '#7c3aed' },
      { label: 'Low Stock Parts',  value: lowStock.length, Icon: AlertTriangle, color: '#dc2626' },
    ]} />

    {pending.length > 0 && (
      <InfoBanner type="warning" Icon={Clock}>
        {pending.length} vehicle(s) sent to Command Center — awaiting approval before they appear in Customer Portal.
      </InfoBanner>
    )}
    {lowStock.length > 0 && (
      <InfoBanner type="warning" Icon={AlertTriangle}>
        {lowStock.length} part(s) are at or below reorder level — consider restocking soon.
      </InfoBanner>
    )}

    {/* ── Subtab Bar ── */}
    <div style={{ display:'flex', gap:0, borderBottom:'2px solid #e5e7eb', marginBottom:16 }}>
      {INV_TABS.map(t => (
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

    {/* ── Vehicles Tab ── */}
    {activeTab === 'vehicles' && (
      <Card title="My Vehicles" badge={`${vehicles.length} vehicles`}>
        {vehicles.length === 0
          ? <div className="empty-state" style={{ padding: '40px 24px' }}>
              <Car size={40} style={{ opacity: .25, marginBottom: 12 }} />
              <p>No vehicles added yet. Click <strong>Add Vehicle</strong> to get started.</p>
            </div>
          : <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Registration No</th>
                    <th>Color</th>
                    <th>Price Per Day</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i) => {
                    const sc = v.status === 'APPROVED' ? '#16a34a' : v.status === 'REJECTED' ? '#dc2626' : '#d97706';
                    return (
                      <tr key={v._id || i}>
                        <td>{v.category || '—'}</td>
                        <td style={{ fontWeight:600 }}>{v.make || '—'}</td>
                        <td>{v.model || '—'}</td>
                        <td style={{ fontFamily:'monospace', fontSize:12 }}>{v.registrationNo || '—'}</td>
                        <td>{v.color || '—'}</td>
                        <td>₹{Number(v.pricePerDay || 0).toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight:700, textAlign:'center' }}>{v.quantity ?? 1}</td>
                        <td>
                          <span className="status-pill" style={{ background: sc + '18', color: sc }}>
                            {v.status === 'APPROVED' ? '✓ Approved' : v.status === 'REJECTED' ? '✗ Rejected' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-ghost" style={{ padding:'3px 10px', fontSize:12 }}
                            onClick={() => setSelectedVehicle(v)}>
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
    )}

    {/* ── Parts Tab ── */}
    {activeTab === 'parts' && (
      <Card
        title="Parts Inventory"
        badge={`${parts.length} SKUs`}
        action={
          <button className="btn-ghost" style={{ fontSize:12, padding:'4px 12px' }} onClick={() => setPartDrawerOpen(true)}>
            <Plus size={13} /> Add Part
          </button>
        }
      >
        {parts.length === 0
          ? <div className="empty-state" style={{ padding:'32px 24px' }}>
              <Package size={38} style={{ opacity:.2, marginBottom:10 }} />
              <p>No parts added yet. Click <strong>Add Part</strong> to begin tracking spare parts.</p>
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
                  {parts.map((p, i) => {
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
    )}

    {/* Part Detail Modal */}
    {selectedPart && (
      <PartDetailModal part={selectedPart} onClose={() => setSelectedPart(null)} />
    )}

    {/* Vehicle Detail Modal */}
    {selectedVehicle && (
      <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
    )}

    <AddInventoryDrawer
      open={vehicleDrawerOpen}
      onClose={() => setVehicleDrawerOpen(false)}
      call={call}
      user={user}
      onAdded={onVehicleAdded}
    />

    <AddPartDrawer
      open={partDrawerOpen}
      onClose={() => setPartDrawerOpen(false)}
      call={call}
      onAdded={onPartAdded}
    />
  </>;
}

// ══════════════════════════════════════════════════════════════════
// VEHICLE DETAIL MODAL — shows ALL input details for a vehicle
// ══════════════════════════════════════════════════════════════════
function VehicleDetailModal({ vehicle: v, onClose }) {
  const cat = VEHICLE_CATEGORIES.find(c => c.value === v.category);
  const statusColor = v.status === 'APPROVED' ? '#16a34a' : v.status === 'REJECTED' ? '#dc2626' : '#d97706';
  const statusLabel = v.status === 'APPROVED' ? '✓ Approved & Live' : v.status === 'REJECTED' ? '✗ Rejected' : '⏳ Pending Approval';
  const fmt = d => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width: 'min(640px,100%)' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Vehicle Details</div>
            <div className="modal-subtitle">Complete information for this vehicle listing</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Hero: Vehicle Identity */}
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12,
            padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ background:'#2563eb', color:'#fff', borderRadius:10,
              width:52, height:52, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
              {cat?.emoji || '🚗'}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#2563eb', letterSpacing:'.08em',
                textTransform:'uppercase', marginBottom:3 }}>{v.category || 'Vehicle'}</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#1e3a8a' }}>{v.make} {v.model}</div>
              <div style={{ fontSize:12, color:'#3b82f6', marginTop:2, fontFamily:'monospace' }}>{v.registrationNo || '—'}</div>
            </div>
          </div>

          {/* Status + Badges */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            <span className="status-pill" style={{ background: statusColor + '18', color: statusColor, fontSize:13, padding:'4px 14px' }}>
              {statusLabel}
            </span>
            {v.year && <span className="status-pill" style={{ background:'#f5f3ff', color:'#5b21b6', fontSize:13, padding:'4px 14px' }}>Year: {v.year}</span>}
            {v.color && <span className="status-pill" style={{ background:'#fef9c3', color:'#713f12', fontSize:13, padding:'4px 14px' }}>{v.color}</span>}
            {v.chargingType && <span className="status-pill" style={{ background:'#ecfdf5', color:'#065f46', fontSize:13, padding:'4px 14px' }}>⚡ {v.chargingType}</span>}
          </div>

          {/* Vehicle Images */}
          {v.images?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <Package size={13} /> Vehicle Images ({v.images.length})
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {v.images.map((img, i) => (
                  <div key={i} style={{ width:80, height:64, borderRadius:8, overflow:'hidden', border:'1px solid #e5e7eb', flexShrink:0 }}>
                    <img src={img.url} alt={img.name || `Image ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Info Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px',
            background:'#e5e7eb', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
            {[
              ['Make / Brand',        v.make              || '—'],
              ['Model Name',          v.model             || '—'],
              ['Category',            v.category          || '—'],
              ['Year of Manufacture', v.year              || '—'],
              ['Color',               v.color             || '—'],
              ['Registration No.',    v.registrationNo    || '—'],
              ['Battery Capacity',    v.batteryCapacityKwh ? `${v.batteryCapacityKwh} kWh` : '—'],
              ['Range',               v.rangeKm           ? `${v.rangeKm} km` : '—'],
              ['Charging Type',       v.chargingType      || '—'],
              ['Price Per Day',       `₹${Number(v.pricePerDay || 0).toLocaleString('en-IN')}`],
              ['Quantity in Stock',   v.quantity ?? 1],
              ['Approval Status',     v.status            || '—'],
            ].map(([k, val]) => (
              <div key={k} style={{ background:'#fff', padding:'12px 16px' }}>
                <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600,
                  textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{k}</div>
                <div style={{ fontWeight:700, color:'#1a1f2e', fontSize:14 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Description / Notes */}
          {v.description && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Description / Notes</div>
              <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8,
                padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>
                {v.description}
              </div>
            </div>
          )}

          {/* Franchisee Info */}
          {(v.franchiseeName || v.franchiseeEmail) && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <Building2 size={13} /> Submitted By
              </div>
              <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 14px' }}>
                {v.franchiseeName && <div style={{ fontWeight:700, fontSize:13, color:'#1a1f2e' }}>{v.franchiseeName}</div>}
                {v.franchiseeEmail && <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{v.franchiseeEmail}</div>}
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {v.status === 'REJECTED' && v.rejectionReason && (
            <InfoBanner type="warning" Icon={AlertTriangle}>
              Rejection reason: {v.rejectionReason}
            </InfoBanner>
          )}

          {/* Timestamps */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
            {[
              ['Submitted At', fmt(v.createdAt)],
              ['Last Updated', fmt(v.updatedAt)],
            ].map(([k, val]) => (
              <div key={k} style={{ background:'#f9fafb', borderRadius:8, padding:'10px 14px', border:'1px solid #e5e7eb' }}>
                <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>{k}</div>
                <div style={{ fontWeight:600, color:'#374151', fontSize:12 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PART DETAIL MODAL  — shows complete info for a selected part
// ══════════════════════════════════════════════════════════════════
function PartDetailModal({ part, onClose }) {
  const isLow = part.quantity <= part.reorderLevel;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width: 'min(580px,100%)' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Part Details</div>
            <div className="modal-subtitle">Complete information for this spare part</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
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
                letterSpacing:'.05em' }}>{part.sku || '—'}</div>
            </div>
          </div>

          {/* Stock badge */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <span className="status-pill" style={{
              background: isLow ? '#fee2e2' : '#dcfce7',
              color:      isLow ? '#991b1b' : '#166534',
              fontSize: 13, padding:'4px 14px',
            }}>
              {isLow ? '⚠ Low Stock' : '✓ In Stock'}
            </span>
            <span className="status-pill" style={{ background:'#f5f3ff', color:'#5b21b6', fontSize:13, padding:'4px 14px' }}>
              {part.category || 'General'}
            </span>
            {part.partType && (
              <span className="status-pill" style={{ background:'#fef9c3', color:'#713f12', fontSize:13, padding:'4px 14px' }}>
                {part.partType}
              </span>
            )}
          </div>

          {/* Core Info Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px',
            background:'#e5e7eb', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
            {[
              ['Part Name',      part.name          || '—'],
              ['Category',       part.category      || 'General'],
              ['Current Stock',  part.quantity ?? 0],
              ['Reorder Level',  part.reorderLevel  ?? 5],
              ['Unit Price',     `₹${Number(part.unitPrice||0).toLocaleString('en-IN')}`],
              ['Total Value',    `₹${Number((part.unitPrice||0)*(part.quantity||0)).toLocaleString('en-IN')}`],
              part.manufacturer ? ['Manufacturer', part.manufacturer] : null,
              part.location     ? ['Storage Location', part.location]  : null,
              part.partType     ? ['Part Type', part.partType]          : null,
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} style={{ background:'#fff', padding:'12px 16px' }}>
                <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600,
                  textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{k}</div>
                <div style={{ fontWeight:700, color:'#1a1f2e', fontSize:14 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Compatible Vehicles */}
          {part.compatibleVehicles && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8,
                display:'flex', alignItems:'center', gap:6 }}>
                <Car size={13} /> Compatible Vehicles
              </div>
              <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8,
                padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>
                {part.compatibleVehicles}
              </div>
            </div>
          )}

          {/* Description */}
          {part.description && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Description / Notes</div>
              <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8,
                padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>
                {part.description}
              </div>
            </div>
          )}

          {/* Low stock alert */}
          {isLow && (
            <InfoBanner type="warning" Icon={AlertTriangle}>
              Stock ({part.quantity}) is at or below reorder level ({part.reorderLevel}).
              Consider restocking this part soon to avoid service delays.
            </InfoBanner>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADD PART DRAWER — detailed form with Part Code (SKU) in focus
// ══════════════════════════════════════════════════════════════════
const PART_CATEGORIES = [
  'Battery & Charging', 'Motor & Drive', 'Brakes & Suspension',
  'Tyres & Wheels', 'Body & Frame', 'Electronics & Controls',
  'Lighting', 'Cabin & Comfort', 'Fasteners & Hardware', 'General', 'Other',
];

const PART_TYPES = [
  'OEM Original', 'Aftermarket', 'Refurbished', 'Consumable', 'Tool / Equipment', 'Other',
];

const EMPTY_PART = {
  sku: '', name: '', category: '', partType: '', quantity: '',
  reorderLevel: '5', unitPrice: '', manufacturer: '',
  compatibleVehicles: '', location: '', description: '',
};

function AddPartDrawer({ open, onClose, call, onAdded }) {
  const [form,      setForm]      = useState(EMPTY_PART);
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedPart, setSavedPart] = useState(null);
  const { toast, show } = useToast();

  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  // Auto-generate SKU suggestion from name + category
  const autoSku = () => {
    if (form.sku) return;          // don't overwrite manual entry
    const prefix = (form.category || 'GEN').slice(0, 3).toUpperCase().replace(/\s/g, '');
    const nameCode = (form.name || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const rand = Math.floor(Math.random() * 9000 + 1000);
    ff('sku')(`${prefix}-${nameCode}-${rand}`);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setForm(EMPTY_PART); setSubmitted(false); setSavedPart(null); }, 350);
  };

  const submit = async () => {
    if (!form.sku.trim()) { show('Part code (SKU) is required', 'error'); return; }
    if (!form.name.trim()) { show('Part name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity:     Number(form.quantity)     || 0,
        reorderLevel: Number(form.reorderLevel) || 5,
        unitPrice:    Number(form.unitPrice)    || 0,
      };
      const part = await call('/franchise/inventory', { method: 'post', data: payload });
      setSavedPart(part);
      if (onAdded) onAdded(part);
      setSubmitted(true);
    } catch (e) {
      show(e.response?.data?.message || 'Failed to add part', 'error');
    } finally { setSaving(false); }
  };

  const footer = submitted ? (
    <>
      <button className="btn-ghost" onClick={() => { setForm(EMPTY_PART); setSubmitted(false); setSavedPart(null); }}>
        + Add Another Part
      </button>
      <button className="btn-primary" onClick={handleClose}>Done</button>
    </>
  ) : (
    <>
      <button className="btn-ghost" onClick={handleClose}>Cancel</button>
      <button className="btn-primary" onClick={submit} disabled={saving}>
        {saving ? 'Saving…' : <><Save size={14} /> Add Part to Inventory</>}
      </button>
    </>
  );

  return (
    <>
      <Toast toast={toast} />
      <Drawer
        open={open}
        onClose={handleClose}
        title={submitted ? '✅ Part Added!' : 'Add New Part to Inventory'}
        subtitle={submitted ? 'Part saved to spare parts inventory' : 'Enter complete details — Part Code (SKU) is the unique identifier'}
        footer={footer}
        width={560}
      >
        {submitted ? (
          <PartAddSuccess part={savedPart || form} />
        ) : (
          <PartAddForm form={form} ff={ff} autoSku={autoSku} />
        )}
      </Drawer>
    </>
  );
}

function PartAddSuccess({ part }) {
  return (
    <div className="success-card">
      <div className="success-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
        <Package size={32} />
      </div>
      <h3>Part Added Successfully</h3>
      <p>The part is now tracked in your inventory.</p>
      <div className="cred-box" style={{ width: '100%' }}>
        <div className="cred-row">
          <span>Part Code (SKU)</span>
          <code style={{ color:'#1d4ed8', fontWeight:900, fontSize:15 }}>{part.sku}</code>
        </div>
        <div className="cred-row"><span>Part Name</span><code>{part.name}</code></div>
        <div className="cred-row"><span>Category</span><code>{part.category || 'General'}</code></div>
        <div className="cred-row"><span>Quantity</span><code>{part.quantity ?? 0}</code></div>
        <div className="cred-row"><span>Unit Price</span><code>₹{Number(part.unitPrice||0).toLocaleString('en-IN')}</code></div>
        {part.manufacturer && <div className="cred-row"><span>Manufacturer</span><code>{part.manufacturer}</code></div>}
        {part.location && <div className="cred-row"><span>Location</span><code>{part.location}</code></div>}
      </div>
    </div>
  );
}

function PartAddForm({ form, ff, autoSku }) {
  return (
    <>
      {/* ── Section 1: Part Identification ── */}
      <div className="drawer-section-label">Part Identification</div>

      <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:10,
        padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <Hash size={14} color="#1d4ed8" />
          <span style={{ fontSize:12, fontWeight:700, color:'#1d4ed8' }}>PART CODE (SKU) — Unique Identifier</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input
            className="fld-input"
            style={{ flex:1, fontFamily:'monospace', fontWeight:700, fontSize:15,
              letterSpacing:'.04em', textTransform:'uppercase' }}
            value={form.sku}
            onChange={e => ff('sku')(e.target.value.toUpperCase())}
            placeholder="e.g. BAT-CELL-1042"
          />
          <button
            type="button"
            className="btn-ghost"
            style={{ whiteSpace:'nowrap', fontSize:12, padding:'0 12px' }}
            onClick={autoSku}
          >
            Auto-generate
          </button>
        </div>
        <div style={{ fontSize:11, color:'#3b82f6', marginTop:5 }}>
          Format: CATEGORY-NAME-NUMBER  · Must be unique across all inventories
        </div>
      </div>

      <Fld label="Part Name" required>
        <Inp value={form.name} onChange={ff('name')} placeholder="e.g. Lithium Cell 18650 — 3.7V 3000mAh" />
      </Fld>

      <div className="row-2">
        <Fld label="Category" required>
          <Sel
            value={PART_CATEGORIES.includes(form.category) ? form.category : (form.category ? 'Other' : '')}
            onChange={v => ff('category')(v === 'Other' ? 'Other' : v)}
            opts={PART_CATEGORIES}
            placeholder="Select category…"
          />
          {form.category === 'Other' && (
            <input
              className="fld-input"
              style={{ marginTop: 6 }}
              placeholder="Type your category"
              onBlur={e => { if (e.target.value.trim()) ff('category')(e.target.value.trim()); }}
            />
          )}
        </Fld>
        <Fld label="Part Type">
          <Sel
            value={PART_TYPES.includes(form.partType) ? form.partType : (form.partType ? 'Other' : '')}
            onChange={v => ff('partType')(v === 'Other' ? 'Other' : v)}
            opts={PART_TYPES}
            placeholder="Select type…"
          />
          {form.partType === 'Other' && (
            <input
              className="fld-input"
              style={{ marginTop: 6 }}
              placeholder="Type your part type"
              onBlur={e => { if (e.target.value.trim()) ff('partType')(e.target.value.trim()); }}
            />
          )}
        </Fld>
      </div>

      {/* ── Section 2: Stock & Pricing ── */}
      <div className="drawer-section-label" style={{ marginTop:4 }}>Stock & Pricing</div>

      <div className="row-2">
        <Fld label="Current Quantity" required hint="Units currently in stock">
          <Inp value={form.quantity} onChange={ff('quantity')} type="number" placeholder="50" />
        </Fld>
        <Fld label="Reorder Level" hint="Trigger restocking when stock falls to this">
          <Inp value={form.reorderLevel} onChange={ff('reorderLevel')} type="number" placeholder="5" />
        </Fld>
      </div>

      <Fld label="Unit Price (₹)" required hint="Price per single unit">
        <Inp value={form.unitPrice} onChange={ff('unitPrice')} type="number" placeholder="299" />
      </Fld>

      {/* Live total value preview */}
      {(form.quantity && form.unitPrice) && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8,
          padding:'10px 14px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#166534', fontWeight:600 }}>Total Stock Value</span>
          <span style={{ fontSize:16, fontWeight:900, color:'#166534' }}>
            ₹{(Number(form.quantity) * Number(form.unitPrice)).toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* ── Section 3: Supplier & Storage ── */}
      <div className="drawer-section-label" style={{ marginTop:4 }}>Supplier & Storage</div>

      <div className="row-2">
        <Fld label="Manufacturer / Brand" hint="OEM or aftermarket maker">
          <Inp value={form.manufacturer} onChange={ff('manufacturer')} placeholder="e.g. Samsung SDI" />
        </Fld>
        <Fld label="Storage Location" hint="Shelf, bin, or warehouse location">
          <Inp value={form.location} onChange={ff('location')} placeholder="e.g. Rack-A / Shelf-3" />
        </Fld>
      </div>

      {/* ── Section 4: Vehicle Compatibility ── */}
      <div className="drawer-section-label" style={{ marginTop:4 }}>Compatibility</div>

      <Fld label="Compatible Vehicles" hint="List vehicle makes/models this part fits">
        <Txt
          value={form.compatibleVehicles}
          onChange={ff('compatibleVehicles')}
          placeholder="e.g. Ola S1 Pro, Ather 450X, Hero Electric Optima…"
          rows={2}
        />
      </Fld>

      {/* ── Section 5: Description ── */}
      <div className="drawer-section-label" style={{ marginTop:4 }}>Additional Notes</div>

      <Fld label="Description / Technical Notes" hint="Specifications, usage notes, warranty info">
        <Txt
          value={form.description}
          onChange={ff('description')}
          placeholder="Technical specs, installation notes, warranty period, condition…"
          rows={3}
        />
      </Fld>

      <InfoBanner Icon={Package}>
        The Part Code (SKU) must be unique. Use a consistent format like
        <strong> CATEGORY-NAME-NUMBER</strong> (e.g. BAT-CELL-1042) for easy lookup.
      </InfoBanner>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADD INVENTORY DRAWER — posts to /api/franchise/pending-vehicles
// ══════════════════════════════════════════════════════════════════
const EMPTY_VEH = {
  category: '', make: '', model: '', year: new Date().getFullYear() + '',
  color: '', registrationNo: '', batteryCapacityKwh: '', rangeKm: '',
  chargingType: 'AC', pricePerDay: '', quantity: 1, description: '', images: [],
};

function AddInventoryDrawer({ open, onClose, call, user, onAdded, standalone, setPage }) {
  const [form,      setForm]      = useState(EMPTY_VEH);
  const [step,      setStep]      = useState(1);
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const { toast, show } = useToast();

  const [standaloneOpen, setStandaloneOpen] = useState(true);
  const isOpen = standalone ? standaloneOpen : open;

  const handleClose = () => {
    if (standalone) {
      setStandaloneOpen(false);
      setTimeout(() => setPage('inventory'), 300);
    } else {
      onClose();
    }
    setTimeout(() => { setForm(EMPTY_VEH); setStep(1); setSubmitted(false); setSavedRecord(null); }, 350);
  };

  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleImages = e => {
    const files = Array.from(e.target.files).slice(0, 5);
    const readers = files.map(file =>
      new Promise(res => {
        const r = new FileReader();
        r.onload = () => res({ name: file.name, url: r.result });
        r.readAsDataURL(file);
      })
    );
    Promise.all(readers).then(imgs => setForm(f => ({ ...f, images: imgs })));
  };

  const removeImg = idx => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const nextStep = () => {
    if (step === 1 && (!form.category || !form.make || !form.model)) {
      show('Select Category, Make and Model first', 'error'); return;
    }
    setStep(s => s + 1);
  };

  // ── FIXED: POST to backend instead of localStorage ────────────
  const submitVehicle = async () => {
    if (!form.category || !form.make || !form.model || !form.registrationNo) {
      show('Category, Make, Model and Registration No. are required', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        batteryCapacityKwh: form.batteryCapacityKwh ? +form.batteryCapacityKwh : undefined,
        rangeKm:            form.rangeKm            ? +form.rangeKm            : undefined,
        pricePerDay:        form.pricePerDay        ? +form.pricePerDay        : undefined,
        quantity:           Math.max(1, Number(form.quantity || 1)),
      };
      const record = await call('/franchise/pending-vehicles', { method: 'post', data: payload });
      setSavedRecord(record);
      if (onAdded) onAdded(record);
      setSubmitted(true);
    } catch (e) {
      show(e.response?.data?.message || 'Submission failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const drawerFooter = submitted ? (
    <button className="btn-primary" onClick={handleClose}>Done</button>
  ) : (
    <>
      {step > 1 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>}
      <button className="btn-ghost" onClick={handleClose}>Cancel</button>
      {step < 3
        ? <button className="btn-primary" onClick={nextStep}>Next →</button>
        : <button className="btn-primary" onClick={submitVehicle} disabled={saving}>
            {saving ? 'Submitting…' : <><Upload size={14} /> Submit for Approval</>}
          </button>
      }
    </>
  );

  return (
    <>
      <Toast toast={toast} />
      <Drawer
        open={isOpen}
        onClose={handleClose}
        title={submitted ? '✅ Vehicle Submitted!' : `Add New Vehicle — Step ${step} of 3`}
        subtitle={submitted
          ? 'Sent to Command Center for review'
          : step === 1 ? 'Vehicle Details (Category, Make, Model, Specs)'
          : step === 2 ? 'Upload Images — up to 5 photos'
          : 'Review & Submit for Approval'}
        footer={drawerFooter}
        width={560}
      >
        {submitted ? (
          <VehicleSubmitSuccess form={savedRecord || form} />
        ) : step === 1 ? (
          <VehicleStep1 form={form} ff={ff} />
        ) : step === 2 ? (
          <VehicleStep2 form={form} handleImages={handleImages} removeImg={removeImg} />
        ) : (
          <VehicleStep3 form={form} />
        )}
      </Drawer>
    </>
  );
}

function VehicleSubmitSuccess({ form }) {
  return (
    <div className="success-card">
      <div className="success-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
        <Clock size={32} />
      </div>
      <h3>Awaiting Command Center Approval</h3>
      <p>Your vehicle has been saved to the database. Once approved, it will automatically appear in the Customer Portal.</p>
      <div className="cred-box" style={{ width: '100%' }}>
        <div className="cred-row"><span>Vehicle</span><code>{form.make} {form.model}</code></div>
        <div className="cred-row"><span>Category</span><code>{form.category}</code></div>
        <div className="cred-row"><span>Reg. No.</span><code>{form.registrationNo}</code></div>
        <div className="cred-row"><span>Price/Day</span><code>₹{form.pricePerDay}</code></div>
        <div className="cred-row"><span>Status</span><code style={{ color: '#d97706' }}>PENDING_APPROVAL</code></div>
      </div>
    </div>
  );
}

// ── Custom makes persisted per-category in localStorage ─────────────
function useCustomMakes() {
  const KEY = 'ev_custom_makes';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = (cat, val) => {
    const all = load();
    const existing = all[cat] || [];
    if (val && !existing.includes(val)) all[cat] = [...existing, val];
    localStorage.setItem(KEY, JSON.stringify(all));
  };
  return { loadCustom: (cat) => load()[cat] || [], saveCustom: save };
}

function VehicleStep1({ form, ff }) {
  const { loadCustom, saveCustom } = useCustomMakes();
  const baseMakes = VEHICLE_MAKES[form.category] || [];
  const customMakes = form.category ? loadCustom(form.category) : [];
  // Merge: base makes (without "Other") + custom makes + "Other"
  const baseWithoutOther = baseMakes.filter(m => m !== 'Other');
  const allMakes = [...baseWithoutOther, ...customMakes.filter(m => !baseWithoutOther.includes(m)), 'Other'];

  const isOtherSelected = form.make === 'Other' || (form.make && !allMakes.slice(0, -1).includes(form.make) && form.make !== '');
  const [customMakeInput, setCustomMakeInput] = useState(
    (form.make && form.make !== 'Other' && !baseWithoutOther.includes(form.make) && !customMakes.includes(form.make)) ? form.make : ''
  );

  const handleMakeChange = (val) => {
    if (val === 'Other') {
      ff('make')('Other');
      setCustomMakeInput('');
    } else {
      ff('make')(val);
    }
  };

  const handleCustomMakeBlur = () => {
    if (customMakeInput.trim()) {
      const v = customMakeInput.trim();
      saveCustom(form.category, v);
      ff('make')(v);
    }
  };

  return <>
    <div className="drawer-section-label">Select Vehicle Category</div>
    <div className="vehicle-cat-grid">
      {VEHICLE_CATEGORIES.map(c => (
        <button key={c.value} type="button"
          className={'cat-btn' + (form.category === c.value ? ' selected' : '')}
          onClick={() => { ff('category')(c.value); ff('make')(''); setCustomMakeInput(''); }}>
          <span className="cat-emoji">{c.emoji}</span>
          <span className="cat-label">{c.label}</span>
          <span className="cat-desc">{c.desc}</span>
        </button>
      ))}
    </div>

    {form.category && <>
      <div className="drawer-section-label" style={{ marginTop: 4 }}>Vehicle Details</div>
      <div className="row-2">
        <Fld label="Make / Brand" required>
          <Sel
            value={isOtherSelected ? 'Other' : form.make}
            onChange={handleMakeChange}
            opts={allMakes}
            placeholder="Select make…"
          />
          {(form.make === 'Other' || isOtherSelected) && (
            <input
              className="fld-input"
              style={{ marginTop: 6 }}
              value={customMakeInput}
              onChange={e => setCustomMakeInput(e.target.value)}
              onBlur={handleCustomMakeBlur}
              placeholder="Type brand name & press Tab/click away"
            />
          )}
        </Fld>
        <Fld label="Model Name" required>
          <Inp value={form.model} onChange={ff('model')} placeholder="e.g. Nexon EV Max" />
        </Fld>
      </div>
      <div className="row-2">
        <Fld label="Year of Manufacture">
          <Inp value={form.year} onChange={ff('year')} type="number" placeholder="2024" />
        </Fld>
        <Fld label="Color">
          <Inp value={form.color} onChange={ff('color')} placeholder="e.g. Pristine White" />
        </Fld>
      </div>
      <Fld label="Registration Number" required hint="Vehicle Registration No. (e.g. TS09EV1234)">
        <Inp value={form.registrationNo} onChange={ff('registrationNo')} placeholder="TS09EV1234" />
      </Fld>
      <div className="row-2">
        <Fld label="Battery Capacity (kWh)">
          <Inp value={form.batteryCapacityKwh} onChange={ff('batteryCapacityKwh')} type="number" placeholder="40.5" />
        </Fld>
        <Fld label="Range (km)">
          <Inp value={form.rangeKm} onChange={ff('rangeKm')} type="number" placeholder="312" />
        </Fld>
      </div>
      <div className="row-2">
        <Fld label="Charging Type">
          <Sel value={form.chargingType} onChange={ff('chargingType')}
            opts={['AC', 'DC', 'AC+DC', 'CCS2', 'CHAdeMO']} />
        </Fld>
        <Fld label="Price Per Day (₹)" required>
          <Inp value={form.pricePerDay} onChange={ff('pricePerDay')} type="number" placeholder="1499" />
        </Fld>
        <Fld label="Available Quantity" required hint="Number of identical units in inventory">
          <Inp value={form.quantity} onChange={ff('quantity')} type="number" placeholder="1" />
        </Fld>
      </div>
      <Fld label="Description / Notes">
        <Txt value={form.description} onChange={ff('description')} placeholder="Features, condition, special notes…" />
      </Fld>
    </>}
  </>;
}

function VehicleStep2({ form, handleImages, removeImg }) {
  return <>
    <InfoBanner Icon={Image}>
      Upload up to 5 photos of the vehicle (exterior, interior, dashboard). Clear images improve customer trust.
    </InfoBanner>
    <div className="upload-zone">
      <label className="upload-label">
        <Upload size={28} />
        <span>Click to select images</span>
        <small>JPG, PNG, WebP — max 5 files</small>
        <input type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} />
      </label>
    </div>
    {form.images?.length > 0 && (
      <div className="img-grid">
        {form.images.map((img, i) => (
          <div key={i} className="img-thumb">
            <img src={img.url} alt={img.name} />
            <button className="img-remove" onClick={() => removeImg(i)}><X size={12} /></button>
            <span className="img-name">{img.name}</span>
          </div>
        ))}
      </div>
    )}
    {form.images?.length === 0 && (
      <div className="empty" style={{ padding: '20px' }}>No images selected. You can proceed without images.</div>
    )}
  </>;
}

function VehicleStep3({ form }) {
  const cat = VEHICLE_CATEGORIES.find(c => c.value === form.category);
  return <>
    <InfoBanner type="warning" Icon={Shield}>
      Review details before submitting. The vehicle will go to Command Center for approval.
    </InfoBanner>
    <div className="review-grid">
      <div className="review-section">
        <div className="review-title">Vehicle Details</div>
        {[
          ['Category', `${cat?.emoji || ''} ${form.category}`],
          ['Make', form.make],
          ['Model', form.model],
          ['Year', form.year],
          ['Color', form.color],
          ['Registration No.', form.registrationNo],
          ['Battery', `${form.batteryCapacityKwh} kWh`],
          ['Range', `${form.rangeKm} km`],
          ['Charging Type', form.chargingType],
          ['Price/Day', `₹${form.pricePerDay}`],
        ].map(([k, v]) => v && v !== ' kWh' && v !== ' km' && (
          <div className="kv-row" key={k}><span>{k}</span><strong>{v}</strong></div>
        ))}
      </div>
      <div className="review-section">
        <div className="review-title">Images ({form.images?.length || 0})</div>
        {form.images?.length > 0
          ? <div className="img-grid small">
              {form.images.map((img, i) => (
                <div key={i} className="img-thumb small"><img src={img.url} alt={img.name} /></div>
              ))}
            </div>
          : <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No images uploaded</div>
        }
        {form.description && <>
          <div className="review-title" style={{ marginTop: 12 }}>Notes</div>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{form.description}</p>
        </>}
      </div>
    </div>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// FRAN STAFF PAGE — Tabbed: Active | Removed | Pending
// ══════════════════════════════════════════════════════════════════
function FranStaff({ call, user, setPage }) {
  const { data: apiStaff, loading, error } = useFetch(call, '/franchise/staff');
  const { data: pendingStaff, loading: psLoading, refresh } = useFetch(call, '/franchise/pending-staff');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab]               = useState('active'); // 'active' | 'removed' | 'pending'
  const [imageModal, setImageModal] = useState(null);
  const { toast, show } = useToast();

  const onStaffAdded = () => { refresh(); show('Staff entry submitted for Command Center approval!'); };

  const handleRemove = async (staffId, name) => {
    if (!window.confirm(`Remove ${name} from franchisee? Their login will be disabled.`)) return;
    try {
      await call(`/franchise/pending-staff/${staffId}/remove`, { method: 'put' });
      show(`${name} removed successfully.`);
      refresh();
    } catch (e) {
      show(e.response?.data?.message || 'Remove failed', 'error');
    }
  };

  if (loading || psLoading) return <Loader />;
  if (error) return <Err msg={error} />;

  const allPending    = pendingStaff || [];
  const activeStaff   = allPending.filter(s => !s.removedFromFranchisee && s.status === 'APPROVED');
  const removedStaff  = allPending.filter(s => s.removedFromFranchisee);
  const pendingList   = allPending.filter(s => s.status === 'PENDING_APPROVAL' && !s.removedFromFranchisee);

  const TABS = [
    { id: 'active',  label: 'Active Staff',    count: activeStaff.length,  Icon: UserCheck },
    { id: 'removed', label: 'Removed Staff',   count: removedStaff.length, Icon: UserX },
    { id: 'pending', label: 'Pending Approval',count: pendingList.length,  Icon: Clock },
  ];

  return <>
    <Toast toast={toast} />

    {imageModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick={() => setImageModal(null)}>
        <div style={{ position:'relative', maxWidth:'90vw', maxHeight:'90vh' }} onClick={e => e.stopPropagation()}>
          <img src={imageModal.url} alt={imageModal.title}
            style={{ maxWidth:'88vw', maxHeight:'85vh', borderRadius:8, objectFit:'contain' }} />
          <div style={{ color:'#fff', textAlign:'center', marginTop:8, fontSize:13 }}>{imageModal.title}</div>
          <button onClick={() => setImageModal(null)}
            style={{ position:'absolute', top:-12, right:-12, background:'#fff', border:'none', borderRadius:'50%',
              width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={18} />
          </button>
        </div>
      </div>
    )}

    <PageHeader
      title="Staff Management"
      sub="Manage your franchise staff. New entries require Command Center approval."
      actions={
        <button className="btn-primary" onClick={() => setDrawerOpen(true)}>
          <Plus size={15} /> Add Staff
        </button>
      }
    />

    <MetricGrid metrics={[
      { label: 'Active Staff',     value: activeStaff.length,  Icon: UserCheck,   color: '#16a34a' },
      { label: 'Pending Approval', value: pendingList.length,  Icon: Clock,       color: '#d97706' },
      { label: 'Removed Staff',    value: removedStaff.length, Icon: UserX,       color: '#dc2626' },
      { label: 'Total (all time)', value: allPending.length,   Icon: Users,       color: '#2563eb' },
    ]} />

    {pendingList.length > 0 && (
      <InfoBanner type="warning" Icon={Clock}>
        {pendingList.length} staff entry(s) awaiting Command Center approval.
      </InfoBanner>
    )}

    {/* Tab bar */}
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

    {/* Active Staff Tab */}
    {tab === 'active' && (
      <Card title="Active Staff Directory" badge={`${activeStaff.length} active`}>
        {activeStaff.length === 0
          ? <div className="empty-state" style={{ padding:'32px 24px' }}>
              <UserCheck size={36} style={{ opacity:.2, marginBottom:10 }} />
              <p>No active approved staff yet.</p>
            </div>
          : <StaffFullTable rows={activeStaff} setImageModal={setImageModal} onRemove={handleRemove} showRemoveBtn />
        }
      </Card>
    )}

    {/* Removed Staff Tab */}
    {tab === 'removed' && (
      <Card title="Removed Staff" badge={`${removedStaff.length}`}>
        {removedStaff.length === 0
          ? <div className="empty-state" style={{ padding:'32px 24px' }}>
              <UserX size={36} style={{ opacity:.2, marginBottom:10 }} />
              <p>No removed staff on record.</p>
            </div>
          : <StaffFullTable rows={removedStaff} setImageModal={setImageModal} showRemovedBadge />
        }
      </Card>
    )}

    {/* Pending Tab */}
    {tab === 'pending' && (
      <Card title="Pending / All Submissions" badge={`${pendingList.length} pending`}>
        {pendingList.length === 0
          ? <div className="empty-state" style={{ padding:'32px 24px' }}>
              <Clock size={36} style={{ opacity:.2, marginBottom:10 }} />
              <p>No pending approvals.</p>
            </div>
          : <StaffFullTable rows={pendingList} setImageModal={setImageModal} />
        }
      </Card>
    )}

    <AddStaffDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      call={call}
      user={user}
      onAdded={onStaffAdded}
    />
  </>;
}

// ── Reusable full-column staff table ──────────────────────────────
function StaffFullTable({ rows, setImageModal, onRemove, showRemoveBtn, showRemovedBadge }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Role</th><th>Phone</th>
            <th>Hub ID</th><th>Address</th>
            <th>PAN Number</th><th>Aadhar No.</th>
            <th>Aadhar Photo</th><th>PAN Photo</th>
            <th>Status</th>
            {(showRemoveBtn || showRemovedBadge) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(s => {
            const color = STATUS_COLOR[s.status];
            return (
              <tr key={s._id} style={ showRemovedBadge ? { background:'#fff7f7' } : {}}>
                <td style={{ fontWeight:600 }}>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.role}</td>
                <td>{s.phone || '—'}</td>
                <td>{s.hubId || '—'}</td>
                <td style={{ maxWidth:160, fontSize:12, color:'#6b7280' }}>{s.address || '—'}</td>
                <td><code style={{ fontSize:12 }}>{s.panNumber || '—'}</code></td>
                <td><code style={{ fontSize:12 }}>{s.aadhar || '—'}</code></td>
                <td>
                  {s.aadharPhoto?.url
                    ? <button className="btn-ghost" style={{ padding:'2px 8px', fontSize:12 }}
                        onClick={() => setImageModal({ url: s.aadharPhoto.url, title: `${s.name} — Aadhar` })}>
                        <Image size={12} /> View
                      </button>
                    : '—'}
                </td>
                <td>
                  {s.panPhoto?.url
                    ? <button className="btn-ghost" style={{ padding:'2px 8px', fontSize:12 }}
                        onClick={() => setImageModal({ url: s.panPhoto.url, title: `${s.name} — PAN` })}>
                        <Image size={12} /> View
                      </button>
                    : '—'}
                </td>
                <td>
                  {color
                    ? <span className="status-pill" style={{ background: color + '18', color }}>{s.status}</span>
                    : <span className="status-pill">{s.status || '—'}</span>}
                </td>
                {(showRemoveBtn || showRemovedBadge) && (
                  <td>
                    {showRemoveBtn && s.status === 'APPROVED' && (
                      <button
                        style={{ padding:'4px 10px', fontSize:12, borderRadius:6, background:'#fef2f2',
                          border:'1px solid #fecaca', color:'#dc2626', cursor:'pointer', display:'flex',
                          alignItems:'center', gap:4 }}
                        onClick={() => onRemove(s._id, s.name)}>
                        <UserMinus size={12} /> Remove
                      </button>
                    )}
                    {showRemovedBadge && (
                      <span style={{ display:'flex', alignItems:'center', gap:4, color:'#dc2626', fontSize:12, fontWeight:600 }}>
                        <UserX size={12} /> Removed
                      </span>
                    )}
                  </td>
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
// FRAN STAFF DIRECTORY — Standalone sidebar pages (active / removed)
// ══════════════════════════════════════════════════════════════════
function FranStaffDirectory({ call, filter, setPage }) {
  const { data: pendingStaff, loading, error, refresh } = useFetch(call, '/franchise/pending-staff');
  const [imageModal, setImageModal] = useState(null);
  const { toast, show } = useToast();

  const handleRemove = async (staffId, name) => {
    if (!window.confirm(`Remove ${name} from franchisee? Their login will be disabled.`)) return;
    try {
      await call(`/franchise/pending-staff/${staffId}/remove`, { method: 'put' });
      show(`${name} removed successfully.`);
      refresh();
    } catch (e) {
      show(e.response?.data?.message || 'Remove failed', 'error');
    }
  };

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;

  const all     = pendingStaff || [];
  const active  = all.filter(s => !s.removedFromFranchisee && s.status === 'APPROVED');
  const removed = all.filter(s => s.removedFromFranchisee);
  const rows    = filter === 'active' ? active : removed;

  const isActive = filter === 'active';

  return <>
    <Toast toast={toast} />
    {imageModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick={() => setImageModal(null)}>
        <div style={{ position:'relative', maxWidth:'90vw', maxHeight:'90vh' }} onClick={e => e.stopPropagation()}>
          <img src={imageModal.url} alt={imageModal.title}
            style={{ maxWidth:'88vw', maxHeight:'85vh', borderRadius:8, objectFit:'contain' }} />
          <div style={{ color:'#fff', textAlign:'center', marginTop:8, fontSize:13 }}>{imageModal.title}</div>
          <button onClick={() => setImageModal(null)}
            style={{ position:'absolute', top:-12, right:-12, background:'#fff', border:'none', borderRadius:'50%',
              width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={18} />
          </button>
        </div>
      </div>
    )}

    <PageHeader
      title={isActive ? 'Active Staff Directory' : 'Removed Staff Records'}
      sub={isActive
        ? 'All currently active & approved staff members in your franchise.'
        : 'History of removed staff — data preserved for audit purposes.'}
      actions={
        <button className="btn-ghost" onClick={() => setPage('staff')}>
          ← Back to Staff Management
        </button>
      }
    />

    <MetricGrid metrics={
      isActive ? [
        { label: 'Active Staff',    value: active.length,  Icon: UserCheck, color: '#16a34a' },
        { label: 'Removed Records', value: removed.length, Icon: UserX,     color: '#dc2626' },
        { label: 'Total (all time)',value: all.length,      Icon: Users,     color: '#2563eb' },
      ] : [
        { label: 'Removed Staff',  value: removed.length, Icon: UserX,     color: '#dc2626' },
        { label: 'Active Staff',   value: active.length,  Icon: UserCheck, color: '#16a34a' },
        { label: 'Total Records',  value: all.length,     Icon: Users,     color: '#2563eb' },
      ]
    } />

    {!isActive && (
      <InfoBanner Icon={Shield} type="warning">
        Removed staff data is kept for compliance and audit. These accounts have been disabled.
      </InfoBanner>
    )}

    <Card
      title={isActive ? `Active Staff (${active.length})` : `Removed Staff History (${removed.length})`}
      badge={`${rows.length} records`}
    >
      {rows.length === 0
        ? <div className="empty-state" style={{ padding:'40px 24px' }}>
            {isActive
              ? <UserCheck size={40} style={{ opacity:.2, marginBottom:12 }} />
              : <UserX size={40} style={{ opacity:.2, marginBottom:12 }} />}
            <p>{isActive ? 'No active staff yet.' : 'No removed staff on record.'}</p>
            {isActive && (
              <button className="btn-primary" style={{ marginTop:12 }} onClick={() => setPage('staff')}>
                <Plus size={14} /> Add Staff Member
              </button>
            )}
          </div>
        : <StaffFullTable
            rows={rows}
            setImageModal={setImageModal}
            onRemove={handleRemove}
            showRemoveBtn={isActive}
            showRemovedBadge={!isActive}
          />
      }
    </Card>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// ADD STAFF DRAWER — OTP verification + full fields
// ══════════════════════════════════════════════════════════════════
const EMPTY_STAFF = {
  name: '', phone: '', email: '', role: '', hubId: '', address: '',
  aadhar: '', panNumber: '', aadharPhoto: null, panPhoto: null,
};

// OTP step states: 'idle' | 'sent' | 'verified'
function AddStaffDrawer({ open, onClose, call, user, onAdded, standalone, setPage }) {
  const [form,        setForm]        = useState(EMPTY_STAFF);
  const [saving,      setSaving]      = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [otpState,    setOtpState]    = useState('idle'); // idle | sending | sent | verifying | verified
  const [otpValue,    setOtpValue]    = useState('');
  const [otpError,    setOtpError]    = useState('');
  const { toast, show } = useToast();

  const [standaloneOpen, setStandaloneOpen] = useState(true);
  const isOpen = standalone ? standaloneOpen : open;

  const handleClose = () => {
    if (standalone) { setStandaloneOpen(false); setTimeout(() => setPage('staff'), 300); }
    else { onClose(); }
    setTimeout(() => {
      setForm(EMPTY_STAFF); setSubmitted(false); setSavedRecord(null);
      setOtpState('idle'); setOtpValue(''); setOtpError('');
    }, 350);
  };

  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  const readFileAsBase64 = file =>
    new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ name: file.name, url: r.result });
      r.readAsDataURL(file);
    });

  const handleDocUpload = async (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = await readFileAsBase64(file);
    setForm(f => ({ ...f, [field]: data }));
  };

  const sendOtp = async () => {
    if (!form.email || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) {
      setOtpError('Please enter a valid email first'); return;
    }
    setOtpState('sending'); setOtpError('');
    try {
      await call('/franchise/staff-otp/send', { method: 'post', data: { email: form.email } });
      setOtpState('sent');
      show('OTP sent to ' + form.email);
    } catch (e) {
      setOtpError(e.response?.data?.message || 'Failed to send OTP');
      setOtpState('idle');
    }
  };

  const verifyOtp = async () => {
    if (!otpValue || otpValue.length < 4) { setOtpError('Enter the OTP'); return; }
    setOtpState('verifying'); setOtpError('');
    try {
      await call('/franchise/staff-otp/verify', { method: 'post', data: { email: form.email, otp: otpValue } });
      setOtpState('verified');
      show('Email verified ✓');
    } catch (e) {
      setOtpError(e.response?.data?.message || 'Invalid OTP');
      setOtpState('sent');
    }
  };

  const submitStaff = async () => {
    if (!form.name || !form.email || !form.role) {
      show('Name, Email and Role are required', 'error'); return;
    }
    if (otpState !== 'verified') {
      show('Please verify the email with OTP before submitting', 'error'); return;
    }
    setSaving(true);
    try {
      const record = await call('/franchise/pending-staff', { method: 'post', data: form });
      setSavedRecord(record);
      if (onAdded) onAdded(record);
      setSubmitted(true);
    } catch (e) {
      show(e.response?.data?.message || 'Submission failed', 'error');
    } finally { setSaving(false); }
  };

  const drawerFooter = submitted ? (
    <button className="btn-primary" onClick={handleClose}>Done</button>
  ) : (
    <>
      <button className="btn-ghost" onClick={handleClose}>Cancel</button>
      <button className="btn-primary" onClick={submitStaff} disabled={saving || otpState !== 'verified'}>
        {saving ? 'Submitting…' : <><Upload size={14} /> Submit for Approval</>}
      </button>
    </>
  );

  const r = savedRecord || form;

  return (
    <>
      <Toast toast={toast} />
      <Drawer
        open={isOpen}
        onClose={handleClose}
        title={submitted ? '✅ Staff Entry Submitted!' : 'Add New Staff Member'}
        subtitle={submitted ? 'Sent to Command Center for approval' : 'Staff receives credentials after Command Center approves'}
        footer={drawerFooter}
        width={520}
      >
        {submitted ? (
          <div className="success-card">
            <div className="success-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={32} />
            </div>
            <h3>Awaiting Command Center Approval</h3>
            <p>Once approved, <strong>{r.name}</strong> will receive their login credentials.</p>
            <div className="cred-box" style={{ width: '100%' }}>
              <div className="cred-row"><span>Name</span><code>{r.name}</code></div>
              <div className="cred-row"><span>Email</span><code>{r.email}</code></div>
              <div className="cred-row"><span>Role</span><code>{r.role}</code></div>
              <div className="cred-row"><span>Phone</span><code>{r.phone || '—'}</code></div>
              <div className="cred-row"><span>PAN</span><code>{r.panNumber || '—'}</code></div>
              <div className="cred-row"><span>Status</span><code style={{ color: '#d97706' }}>PENDING_APPROVAL</code></div>
            </div>
          </div>
        ) : (
          <>
            <InfoBanner Icon={Shield}>
              On approval, the system will auto-generate a secure password for this staff member.
            </InfoBanner>

            <div className="drawer-section-label">Personal Information</div>
            <div className="row-2">
              <Fld label="Full Name" required>
                <Inp value={form.name} onChange={ff('name')} placeholder="e.g. Ravi Shankar" />
              </Fld>
              <Fld label="Role" required>
                <Sel value={form.role} onChange={ff('role')}
                  opts={['Technician', 'Service Manager', 'Hub Supervisor', 'Driver', 'Customer Support', 'Security']} />
              </Fld>
            </div>
            <div className="row-2">
              <Fld label="Phone Number">
                <Inp value={form.phone} onChange={ff('phone')} type="tel" placeholder="+91 9876543210" />
              </Fld>
              <Fld label="Hub ID / Branch">
                <Inp value={form.hubId} onChange={ff('hubId')} placeholder="HUB-001" />
              </Fld>
            </div>

            {/* ── Email + OTP Verification ─────────────────── */}
            <div className="drawer-section-label" style={{ marginTop: 4 }}>Email Verification</div>
            <Fld label="Email Address" required hint={otpState === 'verified' ? '✓ Email verified' : 'A 6-digit OTP will be sent to verify this address'}>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  className="fld-input"
                  type="email"
                  value={form.email}
                  onChange={e => { ff('email')(e.target.value); setOtpState('idle'); setOtpValue(''); setOtpError(''); }}
                  placeholder="ravi@example.com"
                  disabled={otpState === 'verified'}
                  style={{ flex:1 }}
                />
                {otpState !== 'verified' && (
                  <button className="btn-primary" style={{ whiteSpace:'nowrap', padding:'0 12px' }}
                    disabled={otpState === 'sending'}
                    onClick={sendOtp}>
                    {otpState === 'sending' ? 'Sending…' : otpState === 'sent' ? 'Resend OTP' : 'Send OTP'}
                  </button>
                )}
                {otpState === 'verified' && (
                  <span style={{ display:'flex', alignItems:'center', color:'#16a34a', fontWeight:700, fontSize:13, gap:4 }}>
                    <CheckCircle size={16} /> Verified
                  </span>
                )}
              </div>
            </Fld>

            {(otpState === 'sent' || otpState === 'verifying') && (
              <Fld label="Enter OTP" hint="Check the inbox of the email address above">
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    className="fld-input"
                    type="text"
                    value={otpValue}
                    onChange={e => { setOtpValue(e.target.value); setOtpError(''); }}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    style={{ flex:1, letterSpacing:'4px', fontWeight:700 }}
                  />
                  <button className="btn-primary" style={{ whiteSpace:'nowrap', padding:'0 12px' }}
                    disabled={otpState === 'verifying'}
                    onClick={verifyOtp}>
                    {otpState === 'verifying' ? 'Verifying…' : 'Verify OTP'}
                  </button>
                </div>
                {otpError && <span style={{ color:'#dc2626', fontSize:12 }}>{otpError}</span>}
              </Fld>
            )}
            {otpError && otpState === 'idle' && (
              <div style={{ color:'#dc2626', fontSize:12, marginBottom:8 }}>{otpError}</div>
            )}

            {/* ── Identity ────────────────────────────────── */}
            <div className="drawer-section-label" style={{ marginTop: 4 }}>Identity Documents</div>
            <div className="row-2">
              <Fld label="Aadhar Number" hint="12-digit Aadhar number">
                <Inp value={form.aadhar} onChange={ff('aadhar')} placeholder="XXXX XXXX XXXX" />
              </Fld>
              <Fld label="PAN Card Number" hint="10-character PAN number">
                <Inp value={form.panNumber} onChange={ff('panNumber')} placeholder="ABCDE1234F" />
              </Fld>
            </div>

            {/* Aadhar Photo Upload */}
            <Fld label="Aadhar Card Photo" hint="Upload a clear photo of the Aadhar card (front side)">
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                  background:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:6,
                  padding:'6px 12px', fontSize:13 }}>
                  <Upload size={14} />
                  {form.aadharPhoto ? 'Change' : 'Upload Aadhar Photo'}
                  <input type="file" accept="image/*" onChange={e => handleDocUpload('aadharPhoto', e)}
                    style={{ display:'none' }} />
                </label>
                {form.aadharPhoto && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <img src={form.aadharPhoto.url} alt="Aadhar"
                      style={{ width:56, height:36, objectFit:'cover', borderRadius:4, border:'1px solid #d1d5db', cursor:'pointer' }}
                      onClick={() => window.open(form.aadharPhoto.url, '_blank')} />
                    <button onClick={() => ff('aadharPhoto')(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626' }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </Fld>

            {/* PAN Photo Upload */}
            <Fld label="PAN Card Photo" hint="Upload a clear photo of the PAN card">
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                  background:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:6,
                  padding:'6px 12px', fontSize:13 }}>
                  <Upload size={14} />
                  {form.panPhoto ? 'Change' : 'Upload PAN Photo'}
                  <input type="file" accept="image/*" onChange={e => handleDocUpload('panPhoto', e)}
                    style={{ display:'none' }} />
                </label>
                {form.panPhoto && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <img src={form.panPhoto.url} alt="PAN"
                      style={{ width:56, height:36, objectFit:'cover', borderRadius:4, border:'1px solid #d1d5db', cursor:'pointer' }}
                      onClick={() => window.open(form.panPhoto.url, '_blank')} />
                    <button onClick={() => ff('panPhoto')(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626' }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </Fld>

            {/* Address */}
            <Fld label="Home Address">
              <Txt value={form.address} onChange={ff('address')} placeholder="Full address…" rows={2} />
            </Fld>

            {otpState !== 'verified' && (
              <InfoBanner type="warning" Icon={Shield}>
                You must verify the staff email with OTP before submitting.
              </InfoBanner>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// FRAN ATTENDANCE — reads from shared localStorage written by Staff portal
// ══════════════════════════════════════════════════════════════════
function FranAttendance() {
  const [records, setRecords] = useState(() => store.get('ev_franchise_attendance') || []);
  const [filterDate, setFilterDate] = useState('');
  const [filterStaff, setFilterStaff] = useState('');

  // Refresh every 30 seconds for live duty status
  useEffect(() => {
    const interval = setInterval(() => {
      setRecords(store.get('ev_franchise_attendance') || []);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = records
    .filter(r => (!filterDate || r.date === filterDate))
    .filter(r => (!filterStaff || r.staffName.toLowerCase().includes(filterStaff.toLowerCase())))
    .sort((a, b) => new Date(b.dutyIn) - new Date(a.dutyIn));

  const todayRecs    = records.filter(r => r.date === today);
  const onDutyNow    = todayRecs.filter(r => r.status === 'ON_DUTY').length;
  const completedToday = todayRecs.filter(r => r.status === 'OFF_DUTY').length;

  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—';

  return <>
    <PageHeader title="Staff Attendance" sub="Live duty status and daily attendance records from your staff." />

    <div className="metric-grid">
      <div className="metric-card">
        <div className="metric-icon" style={{ background:'#dcfce7', color:'#16a34a' }}><Clock size={20}/></div>
        <div className="metric-body">
          <div className="metric-label">On Duty Now (Today)</div>
          <div className="metric-value">{onDutyNow}</div>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-icon" style={{ background:'#dbeafe', color:'#2563eb' }}><CheckCircle size={20}/></div>
        <div className="metric-body">
          <div className="metric-label">Completed Today</div>
          <div className="metric-value">{completedToday}</div>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-icon" style={{ background:'#fef9c3', color:'#ca8a04' }}><Users size={20}/></div>
        <div className="metric-body">
          <div className="metric-label">Total Records</div>
          <div className="metric-value">{records.length}</div>
        </div>
      </div>
    </div>

    <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
      <input
        type="date"
        value={filterDate}
        onChange={e => setFilterDate(e.target.value)}
        style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13 }}
        placeholder="Filter by date"
      />
      <input
        type="text"
        value={filterStaff}
        onChange={e => setFilterStaff(e.target.value)}
        placeholder="Search staff name…"
        style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, minWidth:180 }}
      />
      {(filterDate || filterStaff) && (
        <button
          onClick={() => { setFilterDate(''); setFilterStaff(''); }}
          style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer', background:'#f9fafb' }}
        >Clear</button>
      )}
    </div>

    {filtered.length === 0 ? (
      <div className="empty-state">
        <div className="empty-icon">🕐</div>
        <div className="empty-title">No Attendance Records</div>
        <div className="empty-sub">Records appear here when staff toggle their duty status from the Staff Portal.</div>
      </div>
    ) : (
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Date</th>
                <th>Duty In</th>
                <th>Duty Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight:600 }}>{r.staffName}</td>
                  <td style={{ fontSize:12, color:'#374151' }}>{r.staffPhone || '—'}</td>
                  <td style={{ fontSize:12, color:'#374151' }}>{r.staffEmail || '—'}</td>
                  <td>{r.date}</td>
                  <td>{fmtTime(r.dutyIn)}</td>
                  <td>{fmtTime(r.dutyOut)}</td>
                  <td>{r.hoursWorked ? `${r.hoursWorked}h` : '—'}</td>
                  <td>
                    <span style={{
                      background: r.status === 'ON_DUTY' ? '#dcfce7' : '#f3f4f6',
                      color:      r.status === 'ON_DUTY' ? '#16a34a' : '#374151',
                      borderRadius:99, padding:'2px 10px', fontSize:11, fontWeight:700
                    }}>{r.status === 'ON_DUTY' ? '🟢 On Duty' : '⚫ Off Duty'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// FRAN LEAVE APPROVAL — reads staff leave requests from shared localStorage
// ══════════════════════════════════════════════════════════════════
function FranLeaveApproval() {
  const [leaves, setLeaves] = useState(() => store.get('ev_franchise_leave_requests') || []);
  const [tab, setTab] = useState('pending');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = (id, status) => {
    const updated = leaves.map(l => l.id === id ? { ...l, status, reviewedOn: new Date().toISOString() } : l);
    setLeaves(updated);
    store.set('ev_franchise_leave_requests', updated);
    showToast(`Leave ${status === 'APPROVED' ? 'approved ✅' : 'rejected ❌'} successfully.`);
  };

  const pending  = leaves.filter(l => l.status === 'PENDING');
  const reviewed = leaves.filter(l => l.status !== 'PENDING');

  const typeColors = { casual:'#2563eb', sick:'#dc2626', earned:'#16a34a', maternity:'#7c3aed', paternity:'#7c3aed', unpaid:'#6b7280', compensatory:'#d97706' };

  const LeaveCard = ({ l }) => (
    <div style={{
      background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:12, padding:'16px 20px',
      marginBottom:12, display:'flex', alignItems:'flex-start', gap:16, flexWrap:'wrap'
    }}>
      <div style={{ minWidth:120 }}>
        <span style={{
          background: (typeColors[l.type] || '#6b7280') + '18',
          color: typeColors[l.type] || '#6b7280',
          borderRadius:99, padding:'3px 10px', fontSize:11, fontWeight:700, display:'block', marginBottom:6
        }}>{l.type?.toUpperCase()} LEAVE</span>
        <div style={{ fontSize:13, color:'#374151', fontWeight:600 }}>
          {new Date(l.fromDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })} — {new Date(l.toDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        </div>
        <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{l.days} day{l.days !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#111827', marginBottom:2 }}>{l.staffName}</div>
        <div style={{ fontSize:13, color:'#6b7280', marginBottom:4 }}>{l.reason}</div>
        {l.contactDuring && <div style={{ fontSize:12, color:'#6b7280' }}>📞 {l.contactDuring}</div>}
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Applied {new Date(l.appliedOn).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
        <span style={{
          background: l.status === 'APPROVED' ? '#dcfce7' : l.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
          color: l.status === 'APPROVED' ? '#16a34a' : l.status === 'REJECTED' ? '#dc2626' : '#ca8a04',
          borderRadius:99, padding:'3px 12px', fontSize:11, fontWeight:700
        }}>{l.status}</span>
        {l.status === 'PENDING' && (
          <div style={{ display:'flex', gap:8 }}>
            <button
              onClick={() => updateStatus(l.id, 'APPROVED')}
              style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:700, fontSize:12 }}
            >✅ Approve</button>
            <button
              onClick={() => updateStatus(l.id, 'REJECTED')}
              style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:700, fontSize:12 }}
            >❌ Reject</button>
          </div>
        )}
        {l.reviewedOn && <div style={{ fontSize:11, color:'#9ca3af' }}>Reviewed {new Date(l.reviewedOn).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</div>}
      </div>
    </div>
  );

  return <>
    {toast && (
      <div style={{
        position:'fixed', top:20, right:20, zIndex:9999,
        background: toast.type === 'success' ? '#16a34a' : '#dc2626',
        color:'#fff', borderRadius:10, padding:'12px 20px', fontWeight:600, fontSize:14,
        boxShadow:'0 4px 20px rgba(0,0,0,0.15)'
      }}>{toast.msg}</div>
    )}

    <PageHeader title="Leave Approvals" sub="Review and approve leave requests submitted by your staff." />

    <div className="metric-grid" style={{ marginBottom:20 }}>
      <div className="metric-card">
        <div className="metric-icon" style={{ background:'#fef9c3', color:'#ca8a04' }}><Clock size={20}/></div>
        <div className="metric-body"><div className="metric-label">Pending</div><div className="metric-value">{pending.length}</div></div>
      </div>
      <div className="metric-card">
        <div className="metric-icon" style={{ background:'#dcfce7', color:'#16a34a' }}><CheckCircle size={20}/></div>
        <div className="metric-body"><div className="metric-label">Approved</div><div className="metric-value">{leaves.filter(l => l.status === 'APPROVED').length}</div></div>
      </div>
      <div className="metric-card">
        <div className="metric-icon" style={{ background:'#fee2e2', color:'#dc2626' }}><X size={20}/></div>
        <div className="metric-body"><div className="metric-label">Rejected</div><div className="metric-value">{leaves.filter(l => l.status === 'REJECTED').length}</div></div>
      </div>
      <div className="metric-card">
        <div className="metric-icon" style={{ background:'#dbeafe', color:'#2563eb' }}><FileText size={20}/></div>
        <div className="metric-body"><div className="metric-label">Total Requests</div><div className="metric-value">{leaves.length}</div></div>
      </div>
    </div>

    <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'2px solid #e5e7eb' }}>
      {[['pending','⏳ Pending', pending.length], ['reviewed','📋 Reviewed', reviewed.length]].map(([key, label, count]) => (
        <button key={key} onClick={() => setTab(key)} style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
          border:'none', background:'none', cursor:'pointer', marginBottom:'-2px',
          borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
          color: tab === key ? '#2563eb' : '#6b7280',
          fontWeight: tab === key ? 700 : 500, fontSize:14, transition:'all 0.15s',
        }}>
          {label}
          <span style={{ background: tab === key ? '#2563eb' : '#e5e7eb', color: tab === key ? '#fff' : '#374151', borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700 }}>{count}</span>
        </button>
      ))}
    </div>

    {tab === 'pending' && (
      pending.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-title">No Pending Requests</div>
          <div className="empty-sub">All leave requests have been reviewed.</div>
        </div>
      ) : pending.map(l => <LeaveCard key={l.id} l={l} />)
    )}
    {tab === 'reviewed' && (
      reviewed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No Reviewed Requests Yet</div>
        </div>
      ) : reviewed.map(l => <LeaveCard key={l.id} l={l} />)
    )}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// FRAN JOBS
// ══════════════════════════════════════════════════════════════════
function FranJobs({ call }) {
  const { data, loading, error } = useFetch(call, '/franchise/jobs');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  const jobs = Array.isArray(data) ? data : [];
  const completed = jobs.filter(j => j.status === 'COMPLETED');
  return <>
    <PageHeader title="Jobs" sub="Completed rental-return tasks and service jobs for this franchise." />
    <MetricGrid metrics={[
      { label: 'Total Jobs', value: jobs.length, Icon: ClipboardList, color: '#2563eb' },
      { label: 'Completed Tasks', value: completed.length, Icon: CheckCircle, color: '#16a34a' },
      { label: 'Rental Returns', value: jobs.filter(j => j.serviceType === 'RENTAL_RETURN').length, Icon: Car, color: '#7c3aed' },
    ]} />
    {jobs.length > 0 && <Card title="Recent Tasks" badge={`${jobs.length} tasks`}>
      <DataTable rows={jobs.map(j => ({
        ...j,
        task: j.serviceType === 'RENTAL_RETURN' ? 'Rental Vehicle Return' : (j.serviceType || 'Service Task'),
        statusLabel: j.status,
        tracking: j.trackingStatus || '—',
        created: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN') : '—',
      }))} cols={['task','statusLabel','tracking','created']} />
    </Card>}
    {!jobs.length && <div className="card"><div className="empty-state"><ClipboardList size={40} style={{opacity:.25}}/><p>No tasks yet.</p></div></div>}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// CUSTOMER COMPLAINTS + FAULT VEHICLES
// ══════════════════════════════════════════════════════════════════

function FranRentals({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/franchise/rentals');
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState(null);
  const { toast, show } = useToast();

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—';
  const handover = async id => {
    setBusy(id);
    try {
      await call(`/franchise/rentals/${id}/handover`, { method:'put' });
      show('Vehicle handover marked successfully.');
      refresh();
      setSelected(null);
    } catch(e) { show(e.response?.data?.message || 'Handover failed','error'); }
    finally { setBusy(null); }
  };
  const markReturned = async id => {
    if (!window.confirm('Mark this vehicle as returned? It will move back into franchise stock and the rental will be completed.')) return;
    setBusy(id);
    try {
      await call(`/franchise/rentals/${id}/return`, { method:'put' });
      show('Vehicle returned, stock restored and completion task created.');
      refresh();
      setSelected(null);
    } catch(e) { show(e.response?.data?.message || 'Vehicle return failed','error'); }
    finally { setBusy(null); }
  };

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  const rows = data || [];

  return <>
    <Toast toast={toast}/>
    <PageHeader title="Customer Bookings" sub="Customer rental payments, pickup details and vehicle handover." />
    <MetricGrid metrics={[
      {label:'Total Bookings',value:rows.length,Icon:ClipboardList,color:'#2563eb'},
      {label:'Paid',value:rows.filter(r=>r.paymentStatus==='PAID').length,Icon:CheckCircle,color:'#16a34a'},
      {label:'Awaiting Handover',value:rows.filter(r=>r.paymentStatus==='PAID'&&!r.handoverDate).length,Icon:Clock,color:'#d97706'},
      {label:'Active Rentals',value:rows.filter(r=>r.status==='ACTIVE').length,Icon:Car,color:'#16a34a'},
      {label:'Completed',value:rows.filter(r=>r.status==='COMPLETED').length,Icon:CheckCircle,color:'#64748b'},
    ]}/>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {rows.map(r => {
        const vs=r.vehicleSnapshot||{}, cust=r.customerId||{};
        return <div key={r._id} className="card" style={{padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>{cust.name||'Customer'} · {vs.make||''} {vs.model||''}</div>
              <div style={{fontSize:12,color:'#64748b',marginTop:4}}>{cust.email||'—'} · {cust.phone||'—'}</div>
            </div>
            <span className="status-pill" style={{background:r.paymentStatus==='PAID'?'#dcfce7':'#fef3c7',color:r.paymentStatus==='PAID'?'#166534':'#92400e'}}>{r.paymentStatus}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginTop:14}}>
            <div><small>Vehicle</small><strong>{vs.registrationNo||'—'}</strong></div>
            <div><small>Rental Start</small><strong>{fmt(r.startDate)}</strong></div>
            <div><small>Due / End</small><strong>{fmt(r.endDate)}</strong></div>
            <div><small>Duration</small><strong>{r.durationDays||0} day(s)</strong></div>
            <div><small>Amount Paid</small><strong>₹{Number(r.totalAmount||0).toLocaleString('en-IN')}</strong></div>
            <div><small>Handover Date</small><strong>{fmt(r.handoverDate)}</strong></div>
            {(r.extensionHistory||[]).length>0 && <div><small>Extensions</small><strong style={{color:'#7c3aed'}}>{(r.extensionHistory||[]).length}×</strong></div>}
            {(r.extensionHistory||[]).length>0 && <div><small>Extended By</small><strong style={{color:'#7c3aed'}}>+{(r.extensionHistory||[]).reduce((s,e)=>s+(e.days||0),0)} day(s)</strong></div>}
          </div>
          {(r.extensionHistory||[]).length>0 && (
            <div style={{marginTop:10,padding:'10px 12px',background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:700,color:'#5b21b6',marginBottom:6}}>🔄 Rental Extensions ({(r.extensionHistory||[]).length})</div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {(r.extensionHistory||[]).map((ex,i)=>(
                  <div key={i} style={{display:'flex',flexWrap:'wrap',gap:'4px 16px',fontSize:12,color:'#4c1d95',background:'#ede9fe',padding:'6px 10px',borderRadius:7}}>
                    <span>📅 <b>Ext #{i+1}</b></span>
                    <span>+{ex.days} day{ex.days!==1?'s':''}</span>
                    <span>₹{Number(ex.amount||0).toLocaleString('en-IN')}</span>
                    <span>{fmt(ex.oldEndDate)} → <b>{fmt(ex.newEndDate)}</b></span>
                    <span style={{color:'#7c3aed'}}>{ex.at?new Date(ex.at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
            <div style={{padding:10,background:'#f8fafc',borderRadius:9,fontSize:12,color:'#475569'}}><b>Customer Location:</b><br/>{r.customerLocation?.fullAddress || r.fullAddress || [r.area,r.district,r.state,r.pincode].filter(Boolean).join(', ') || '—'}</div>
            <div style={{padding:10,background:'#f0fdf4',borderRadius:9,fontSize:12,color:'#166534'}}><b>Pickup Location:</b><br/>{r.pickupLocation?.name || r.franchiseeName || '—'} · {r.pickupLocation?.address || '—'}</div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <button className="btn-ghost" onClick={()=>setSelected(r)}>View Complete Details</button>
            {r.paymentStatus==='PAID' && !r.handoverDate && <button className="btn-primary" disabled={busy===r._id} onClick={()=>handover(r._id)}>
              {busy===r._id?'Processing…':'🚗 Mark Handover'}
            </button>}
            {r.handoverDate && r.status === 'ACTIVE' && <button className="btn-primary" disabled={busy===r._id} onClick={()=>markReturned(r._id)}>
              {busy===r._id?'Processing…':'↩ Mark Returned'}
            </button>}
            {r.handoverDate && r.status === 'ACTIVE' && <span style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'#166534'}}>✓ Handed over {fmt(r.handoverDate)}</span>}
            {r.status === 'COMPLETED' && <span style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'#475569'}}>✓ Returned {fmt(r.returnDate)}</span>}
          </div>
        </div>;
      })}
      {!rows.length && <div className="card"><div className="empty-state"><Car size={40} style={{opacity:.25}}/><p>No customer bookings for this franchisee.</p></div></div>}
    </div>
    {selected && <div className="modal-overlay" onClick={()=>setSelected(null)}>
      <div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(620px,100%)'}}>
        <div className="modal-head"><div><div className="modal-title">Booking Details</div><div className="modal-subtitle">Customer payment and handover record</div></div><button className="icon-btn" onClick={()=>setSelected(null)}>✕</button></div>
        <div className="modal-body">
          <div style={{marginBottom:14,padding:14,borderRadius:12,background:selected.paymentStatus==='PAID'?'#dcfce7':selected.paymentStatus==='FAILED'?'#fee2e2':'#fef3c7',border:`1px solid ${selected.paymentStatus==='PAID'?'#86efac':selected.paymentStatus==='FAILED'?'#fca5a5':'#fde68a'}`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{width:34,height:34,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',background:selected.paymentStatus==='PAID'?'#16a34a':selected.paymentStatus==='FAILED'?'#dc2626':'#d97706',color:'#fff',fontSize:20,fontWeight:900}}>{selected.paymentStatus==='PAID'?'✓':selected.paymentStatus==='FAILED'?'✕':'!'}</span>
              <div><div style={{fontWeight:900,color:selected.paymentStatus==='PAID'?'#166534':selected.paymentStatus==='FAILED'?'#991b1b':'#92400e'}}>Payment {selected.paymentStatus}</div><div style={{fontSize:12,color:'#475569'}}>Booking payment status</div></div>
            </div>
          </div>
          {[
            ['Customer',selected.customerId?.name||'—'],['Email',selected.customerId?.email||'—'],['Phone',selected.customerId?.phone||'—'],
            ['Customer Location',selected.customerLocation?.fullAddress || selected.fullAddress || [selected.area,selected.district,selected.state,selected.pincode].filter(Boolean).join(', ') || '—'],
            ['Customer Pincode',selected.customerLocation?.pincode || selected.pincode || '—'],
            ['Vehicle',`${selected.vehicleSnapshot?.make||''} ${selected.vehicleSnapshot?.model||''}`],['Registration',selected.vehicleSnapshot?.registrationNo||'—'],
            ['Payment ID',selected.razorpayPaymentId||'—'],['Amount Paid',`₹${Number(selected.totalAmount||0).toLocaleString('en-IN')}`],
            ['Start Date',fmt(selected.startDate)],['Due / End Date',fmt(selected.endDate)],['Duration',`${selected.durationDays||0} day(s)`],
            ['Pickup Franchisee',selected.pickupLocation?.name||selected.franchiseeName||'—'],['Pickup Address',selected.pickupLocation?.address||'—'],
            ['Pickup Coordinates',selected.pickupLocation?.lat!=null&&selected.pickupLocation?.lng!=null?`${selected.pickupLocation.lat}, ${selected.pickupLocation.lng}`:'—'],
            ['Handover Date',fmt(selected.handoverDate)],['Booking Created',fmt(selected.createdAt)],
            ...((selected.extensionHistory||[]).length>0?[
              ['Extensions',`${(selected.extensionHistory||[]).length} extension(s) — +${(selected.extensionHistory||[]).reduce((s,e)=>s+(e.days||0),0)} day(s)`],
              ['Extended End Date',fmt(selected.endDate)],
            ]:[]),
          ].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:13}}><span style={{color:'#64748b'}}>{k}</span><strong style={{textAlign:'right',wordBreak:'break-word'}}>{v}</strong></div>)}
          <div style={{marginTop:16,fontWeight:800,fontSize:14}}>Booking History</div>
          <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:7}}>
            {(selected.bookingHistory||[]).slice().reverse().map((h,i)=><div key={i} style={{padding:10,borderRadius:9,background:'#f8fafc',border:'1px solid #e2e8f0',fontSize:12}}><b>{String(h.event||'EVENT').replaceAll('_',' ')}</b><span style={{float:'right',color:'#64748b'}}>{h.at?fmt(h.at):'—'}</span><div style={{marginTop:4,color:'#475569'}}>Payment: {h.paymentStatus||selected.paymentStatus||'—'} · Status: {h.status||selected.status||'—'} · Customer Location: {h.customerLocation?.fullAddress||selected.fullAddress||'—'}</div></div>)}
            {!(selected.bookingHistory||[]).length&&<div style={{fontSize:12,color:'#64748b'}}>No historical events recorded for this booking.</div>}
          </div>
          {(selected.extensionHistory||[]).length>0 && <>
            <div style={{marginTop:16,fontWeight:800,fontSize:14,color:'#5b21b6'}}>🔄 Extension History ({(selected.extensionHistory||[]).length})</div>
            <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:7}}>
              {(selected.extensionHistory||[]).map((ex,i)=>(
                <div key={i} style={{padding:10,borderRadius:9,background:'#f5f3ff',border:'1px solid #ddd6fe',fontSize:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
                    <b style={{color:'#5b21b6'}}>Extension #{i+1}</b>
                    <span style={{color:'#7c3aed'}}>{ex.at?new Date(ex.at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):''}</span>
                  </div>
                  <div style={{marginTop:6,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'4px 12px',color:'#4c1d95'}}>
                    <div><span style={{opacity:.7}}>Extra Days: </span><b>+{ex.days} day{ex.days!==1?'s':''}</b></div>
                    <div><span style={{opacity:.7}}>Extension Paid: </span><b>₹{Number(ex.amount||0).toLocaleString('en-IN')}</b></div>
                    <div><span style={{opacity:.7}}>Old End Date: </span><b>{fmt(ex.oldEndDate)}</b></div>
                    <div><span style={{opacity:.7}}>New End Date: </span><b>{fmt(ex.newEndDate)}</b></div>
                    {ex.razorpayPaymentId && <div style={{gridColumn:'1/-1'}}><span style={{opacity:.7}}>Payment ID: </span><code style={{fontSize:11,background:'#ede9fe',padding:'1px 5px',borderRadius:4}}>{ex.razorpayPaymentId}</code></div>}
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>
        <div className="modal-footer">
          {selected.paymentStatus==='PAID' && !selected.handoverDate && <button className="btn-primary" disabled={busy===selected._id} onClick={()=>handover(selected._id)}>{busy===selected._id?'Processing…':'🚗 Mark Handover'}</button>}
          {selected.status==='ACTIVE' && selected.handoverDate && <button className="btn-primary" disabled={busy===selected._id} onClick={()=>markReturned(selected._id)}>{busy===selected._id?'Processing…':'↩ Mark Returned'}</button>}
          <button className="btn-ghost" onClick={()=>setSelected(null)}>Close</button>
        </div>
      </div>
    </div>}
  </>;
}

function FranComplaints({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/franchise/complaints');
  const { data: inventory } = useFetch(call, '/franchise/pending-vehicles');
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('');
  const [replaceId, setReplaceId] = useState('');
  const [faultReason, setFaultReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();
  const available = (inventory || []).filter(v => v.status === 'APPROVED' && Number(v.quantity ?? 1) > 0);
  const solve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await call(`/franchise/complaints/${selected._id}/solve`, { method:'put', data:{ resolution, replacementVehicleId:replaceId||undefined, faultReason:faultReason||undefined } });
      show('Complaint marked solved. Customer feedback request sent.');
      setSelected(null); setResolution(''); setReplaceId(''); setFaultReason(''); refresh();
    } catch(e) { show(e.response?.data?.message || 'Could not solve complaint','error'); }
    finally { setBusy(false); }
  };
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <Toast toast={toast}/>
    <PageHeader title="Customer Complaints" sub="Resolve complaints and optionally issue a replacement from approved inventory."/>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {(data||[]).map(c=><div key={c._id} className="card" style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{c.subject||c.category||'Vehicle Complaint'}</strong><div style={{fontSize:12,color:'#64748b',marginTop:4}}>Customer: {c.customerId?.name||'Customer'} · {new Date(c.createdAt).toLocaleString()}</div></div><span style={{fontSize:11,fontWeight:700}}>{c.status}</span></div>
        <div style={{fontSize:13,color:'#374151',marginTop:10}}>{c.message}</div>
        {c.vehicleSnapshot&&<div style={{fontSize:12,color:'#475569',marginTop:7}}>🚗 {c.vehicleSnapshot.make||''} {c.vehicleSnapshot.model||''} · Reg {c.vehicleSnapshot.registrationNo||'—'}</div>}
        {c.paymentDetails&&<div style={{fontSize:11,color:'#64748b',marginTop:4}}>Payment: {c.paymentDetails.paymentStatus||'—'} · {c.paymentDetails.razorpayPaymentId||'—'} · ₹{c.paymentDetails.totalAmount||0}</div>}
        {c.status!=='SOLVED'&&c.status!=='CLOSED'&&<button className="btn-primary" style={{marginTop:12}} onClick={()=>setSelected(c)}>Open & Resolve</button>}
        {c.status==='SOLVED'&&<div style={{marginTop:8,color:'#166534',fontSize:12}}>✓ Solved. Waiting for customer feedback.</div>}
        {c.status==='CLOSED'&&<div style={{marginTop:8,color:'#166534',fontSize:12}}>⭐ Customer rating: {c.franchiseeRating||'—'}/5 {c.feedback?`· ${c.feedback}`:''}</div>}
      </div>)}
      {!data?.length&&<div className="card"><div className="empty-state"><Bell size={40} style={{opacity:.25}}/><p>No customer complaints.</p></div></div>}
    </div>
    {selected&&<div className="modal-overlay" onClick={()=>setSelected(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(620px,100%)'}}><div className="modal-head"><div><div className="modal-title">Resolve Complaint</div><div className="modal-subtitle">Solve the issue or issue a replacement vehicle.</div></div><button className="icon-btn" onClick={()=>setSelected(null)}>✕</button></div><div className="modal-body"><div className="login-form">
      <div style={{background:'#f8fafc',padding:12,borderRadius:10,border:'1px solid #e2e8f0'}}><strong>Complaint</strong><div style={{fontSize:13,marginTop:5}}>{selected.message}</div></div>
      <label>Resolution *<textarea rows={3} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Explain how the issue was resolved…"/></label>
      <label>Replacement Vehicle (optional)<select value={replaceId} onChange={e=>setReplaceId(e.target.value)}><option value="">No replacement</option>{available.map(v=><option key={v._id} value={v._id}>{v.make} {v.model} · {v.registrationNo} · {v.quantity??1} available</option>)}</select></label>
      {replaceId&&<label>Old Vehicle Fault / Replacement Reason *<textarea rows={2} value={faultReason} onChange={e=>setFaultReason(e.target.value)} placeholder="Why is the old vehicle being replaced?"/></label>}
      {replaceId&&<InfoBanner Icon={AlertTriangle}>Replacement stock is reduced by 1 and the old vehicle is added to Fault Vehicles with its vehicle/payment snapshot and your reason.</InfoBanner>}
    </div></div><div className="modal-footer"><button className="btn-ghost" onClick={()=>setSelected(null)}>Cancel</button><button className="btn-primary" onClick={solve} disabled={busy||!resolution||!!(replaceId&&!faultReason)}>{busy?'Saving…':'Mark as Solved'}</button></div></div></div>}
  </>;
}

function FaultVehicles({ call }) {
  const {data,loading,error}=useFetch(call,'/franchise/fault-vehicles');
  if(loading)return <Loader/>; if(error)return <Err msg={error}/>;
  return <><PageHeader title="Fault Vehicles" sub="Replaced/faulty vehicles retained for service and audit history."/><Card title="Fault Vehicle Register" badge={`${data?.length||0} vehicles`}>
    {!data?.length?<div className="empty-state"><AlertTriangle size={40} style={{opacity:.25}}/><p>No fault vehicles recorded.</p></div>:<div style={{display:'flex',flexDirection:'column',gap:10}}>{data.map(f=><div key={f._id} style={{border:'1px solid #fecaca',background:'#fffafa',borderRadius:10,padding:14}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong>{f.vehicleSnapshot?.make||''} {f.vehicleSnapshot?.model||'Vehicle'}</strong><span style={{fontSize:11,color:'#991b1b',fontWeight:700}}>FAULT / REPLACED</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:6,marginTop:9,fontSize:12,color:'#475569'}}><span>Reg: {f.vehicleSnapshot?.registrationNo||'—'}</span><span>Customer: {f.customerId?.name||'—'}</span><span>Payment ID: {f.paymentSnapshot?.razorpayPaymentId||'—'}</span><span>Amount: ₹{f.paymentSnapshot?.totalAmount||0}</span><span>Reason: {f.reason||'—'}</span></div></div>)}</div>}
  </Card></>;
}

// ══════════════════════════════════════════════════════════════════
// MOUNT
// ══════════════════════════════════════════════════════════════════