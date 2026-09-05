import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell,
  FileText, Plus, X, Save, Upload, Clock, Image, ChevronRight,
  UserX, UserCheck, UserMinus
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

const NAV_ITEMS = {
  franchisee: [
    { id: 'dashboard',        label: 'Dashboard',        Icon: LayoutDashboard },
    { id: 'financials',       label: 'Financials',       Icon: DollarSign },
    { id: 'inventory',        label: 'Inventory',        Icon: Package },
    { id: 'staff',            label: 'Staff Management', Icon: Users },
    { id: 'jobs',             label: 'Jobs',             Icon: ClipboardList },
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
    jobs:             <FranJobs      call={call} />,
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

function Drawer({ open, onClose, title, subtitle, children, footer, width = 520 }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className={'drawer-overlay' + (open ? ' drawer-overlay-open' : '')}
        onClick={onClose}
      />
      <div
        className={'drawer-panel' + (open ? ' drawer-panel-open' : '')}
        style={{ width }}
      >
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{title}</div>
            {subtitle && <div className="drawer-subtitle">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="drawer-body">
          {children}
        </div>
        {footer && (
          <div className="drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </>
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
  const { data: apiInv, loading, error } = useFetch(call, '/franchise/inventory');
  // ── FIXED: read from API, not localStorage ────────────────────
  const { data: pendingVehicles, loading: pvLoading, refresh } = useFetch(call, '/franchise/pending-vehicles');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast, show } = useToast();

  const onVehicleAdded = () => {
    refresh();
    show('Vehicle submitted for Command Center approval!');
  };

  if (loading || pvLoading) return <Loader />;
  if (error) return <Err msg={error} />;

  const vehicles  = pendingVehicles || [];
  const approved  = vehicles.filter(v => v.status === 'APPROVED');
  const pending   = vehicles.filter(v => v.status === 'PENDING_APPROVAL');
  const rejected  = vehicles.filter(v => v.status === 'REJECTED');

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Inventory — Vehicles"
      sub="Add EV vehicles to your fleet. New vehicles need Command Center approval before going live."
      actions={
        <button className="btn-primary" onClick={() => setDrawerOpen(true)}>
          <Plus size={15} /> Add Inventory
        </button>
      }
    />

    <MetricGrid metrics={[
      { label: 'Total Listed',     value: vehicles.length, Icon: Car,           color: '#2563eb' },
      { label: 'Pending Approval', value: pending.length,  Icon: Clock,         color: '#d97706' },
      { label: 'Approved & Live',  value: approved.length, Icon: CheckCircle,   color: '#16a34a' },
      { label: 'Rejected',         value: rejected.length, Icon: AlertTriangle, color: '#dc2626' },
    ]} />

    {pending.length > 0 && (
      <InfoBanner type="warning" Icon={Clock}>
        {pending.length} vehicle(s) sent to Command Center — awaiting approval before they appear in Customer Portal.
      </InfoBanner>
    )}

    <Card title="My Vehicles" badge={`${vehicles.length} vehicles`}>
      {vehicles.length === 0
        ? <div className="empty-state" style={{ padding: '40px 24px' }}>
            <Car size={40} style={{ opacity: .25, marginBottom: 12 }} />
            <p>No vehicles added yet. Click <strong>Add Inventory</strong> to get started.</p>
          </div>
        : <DataTable
            rows={vehicles}
            cols={['category', 'make', 'model', 'registrationNo', 'color', 'pricePerDay', 'status']}
          />
      }
    </Card>

    <Card title="Parts Inventory">
      <DataTable rows={apiInv} cols={['sku', 'name', 'quantity', 'reorderLevel', 'unitPrice']} />
    </Card>

    <AddInventoryDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      call={call}
      user={user}
      onAdded={onVehicleAdded}
    />
  </>;
}

// ══════════════════════════════════════════════════════════════════
// ADD INVENTORY DRAWER — posts to /api/franchise/pending-vehicles
// ══════════════════════════════════════════════════════════════════
const EMPTY_VEH = {
  category: '', make: '', model: '', year: new Date().getFullYear() + '',
  color: '', registrationNo: '', batteryCapacityKwh: '', rangeKm: '',
  chargingType: 'AC', pricePerDay: '', description: '', images: [],
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

function VehicleStep1({ form, ff }) {
  const makes = VEHICLE_MAKES[form.category] || [];
  return <>
    <div className="drawer-section-label">Select Vehicle Category</div>
    <div className="vehicle-cat-grid">
      {VEHICLE_CATEGORIES.map(c => (
        <button key={c.value} type="button"
          className={'cat-btn' + (form.category === c.value ? ' selected' : '')}
          onClick={() => { ff('category')(c.value); ff('make')(''); }}>
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
          <Sel value={form.make} onChange={ff('make')} opts={makes} placeholder="Select make…" />
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
// FRAN JOBS
// ══════════════════════════════════════════════════════════════════
function FranJobs({ call }) {
  const { data, loading, error } = useFetch(call, '/franchise/jobs');
  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <PageHeader title="Jobs" sub="Total jobs count for this franchise." />
    <MetricGrid metrics={[
      { label: 'Total Jobs', value: typeof data === 'number' ? data : 0, Icon: ClipboardList, color: '#2563eb' },
    ]} />
  </>;
}

// ══════════════════════════════════════════════════════════════════
// MOUNT
// ══════════════════════════════════════════════════════════════════