import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import allevLogo from '../allevlogo.png';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText,
  Plus, X, Save, Eye, EyeOff, UserPlus, BarChart2, RefreshCw,
  Clock, Key, UserCheck, UserX, UserMinus, Image, Layers, Hash, Wrench,
  MessageSquare, Megaphone, Send, Search, UploadCloud, Award, Briefcase,
  CalendarDays, FilePlus2, ShieldCheck, ChevronRight
} from 'lucide-react';
import './command.css';

const API = import.meta.env.VITE_API_URL || '/api';

// Portal identity is selected by the single-host path: /command
const kind = 'command';
const ALLOWED_ROLES = ['CENTRAL_ADMIN','SUPER_ADMIN'];

const PORTAL_CFG = {
  customer:   { title: 'Customer Portal',       accent: 'Customer Operations' },
  staff:      { title: 'Staff Portal',          accent: 'Service Operations' },
  franchisee: { title: 'Fleet Operator Portal', accent: 'Fleet Operations' },
  command:    { title: 'Central Command',        accent: 'Enterprise Control', email: 'admin@ev.local' },
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
    // ── Overview ──
    { id: 'dashboard',           label: 'Dashboard',           Icon: LayoutDashboard, cat: 'Overview' },

    // ── Operations ──
    { id: 'complaint-center',    label: 'Complaint Center',    Icon: Bell,            cat: 'Operations' },
    { id: 'job-management',      label: 'Job Management',      Icon: ClipboardList,   cat: 'Operations' },
    { id: 'staff-own-job-cards', label: 'Staff Own Job Cards', Icon: Briefcase,       cat: 'Operations' },
    { id: 'demand',              label: 'Demand',              Icon: TrendingUp,      cat: 'Operations' },
    { id: 'maintenance-customer-service', label: 'Maintenance Customer Service', Icon: Wrench, cat: 'Operations' },

    // ── Fleet & Infrastructure ──
    { id: 'hubs',                label: 'Hubs',                Icon: Factory,         cat: 'Fleet & Infrastructure' },
    { id: 'franchisees',         label: 'Fleet Operators',     Icon: Truck,           cat: 'Fleet & Infrastructure' },
    { id: 'vehicle-inventory',   label: 'Vehicle & Inventory', Icon: Layers,          cat: 'Fleet & Infrastructure' },
    { id: 'vehicle-documents',   label: 'Vehicle Documents',   Icon: FileText,        cat: 'Fleet & Infrastructure' },
    { id: 'vehicle-approvals',   label: 'Vehicle Approvals',   Icon: Car,             cat: 'Fleet & Infrastructure' },
    { id: 'franchise-ratings',   label: 'Fleet Ratings',       Icon: BarChart2,       cat: 'Fleet & Infrastructure' },

    // ── People & HR ──
    { id: 'customers',           label: 'Customers',           Icon: Users,           cat: 'People & HR' },
    { id: 'staff-directory',     label: 'Staff Directory',     Icon: Shield,          cat: 'People & HR' },
    { id: 'staff-management',    label: 'Staff Management',    Icon: UserCheck,       cat: 'People & HR' },
    { id: 'staff-attendance',    label: 'Staff Attendance',    Icon: Clock,           cat: 'People & HR' },
    { id: 'leave-approvals',     label: 'Leave Approvals',     Icon: FileText,        cat: 'People & HR' },
    { id: 'staff-communications', label: 'Staff Communications', Icon: Megaphone,       cat: 'People & HR' },
    { id: 'staff-support',        label: 'Staff Support',        Icon: MessageSquare,   cat: 'People & HR' },

    // ── Finance ──
    { id: 'customer-payments',   label: 'Customer Payments',   Icon: DollarSign,      cat: 'Finance' },
    { id: 'wallet-recharges',    label: 'Wallet Recharges',    Icon: Wallet,          cat: 'Finance' },
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
          <img src={allevLogo} alt="allEV" style={{height:"44px",objectFit:"contain"}} />
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
  const { data: sidebarNotifications } = useFetch(call, '/platform/notifications');
  const [badgeSeenAt, setBadgeSeenAt] = useState(0);
  const notes = Array.isArray(sidebarNotifications) ? sidebarNotifications : [];
  const complaintBadge = notes.filter(n=>String(n.type||'').startsWith('COMPLAINT') && !n.read && new Date(n.createdAt||0).getTime() > badgeSeenAt).length;
  const navigate = (id) => {
    if (id === 'complaint-center') {
      setBadgeSeenAt(Date.now());
      call('/platform/notifications/read-all?prefix=COMPLAINT',{method:'put'}).catch(()=>{});
    }
    setPage(id);
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={allevLogo} alt="allEV" style={{height:"32px",objectFit:"contain"}} />
        </div>
        <nav className="sidebar-nav">
          {!user ? <SidebarSkeleton count={navItems.length || 10} /> : (() => {
            const catOrder = [...new Set(navItems.map(item => item.cat || 'Other'))];
            const grouped  = navItems.reduce((acc, item) => {
              const c = item.cat || 'Other';
              if (!acc[c]) acc[c] = [];
              acc[c].push(item);
              return acc;
            }, {});
            return catOrder.map(cat => (
              <div key={cat} className="nav-group">
                <div className="nav-category-label">{cat}</div>
                {grouped[cat].map(({ id, label, Icon, parent, sub }) => {
                  const isActive       = page === id;
                  const isParentActive = parent && page === parent;
                  return (
                    <button key={id}
                      className={
                        'nav-item' +
                        (sub ? ' nav-sub' : '') +
                        (isActive ? ' active' : '') +
                        (isParentActive ? ' parent-active' : '')
                      }
                      onClick={() => navigate(id)}>
                      <Icon size={sub ? 14 : 17} />
                      <span>{label}</span>
                      {id==='complaint-center' && complaintBadge>0 && <b className="nav-count-badge">{complaintBadge>99?'99+':complaintBadge}</b>}
                    </button>
                  );
                })}
              </div>
            ));
          })()}
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
    'complaint-center':   <AdminComplaintCenter    call={call} />,
    hubs:                 <AdminHubs               {...P} />,
    franchisees:          <AdminFranchisees         {...P} />,
    'vehicle-inventory':  <AdminVehicleInventory    call={call} />,
    'vehicle-documents':  <AdminVehicleDocuments     call={call} />,
    'vehicle-approvals':  <AdminVehicleApprovals    call={call} />,
    'staff-directory':    <AdminStaffDirectory      call={call} />,
    'staff-management':   <AdminStaffManagement     call={call} />,
    'staff-attendance':   <AdminStaffAttendance     call={call} />,
    'leave-approvals':    <AdminLeaveApprovals      call={call} />,
    'staff-communications': <AdminStaffCommunications call={call} />,
    'staff-support':        <AdminStaffSupport call={call} />,
    'job-management':     <AdminJobManagement       call={call} />,
    'staff-own-job-cards': <AdminStaffOwnJobCards    call={call} />,
    customers:            <AdminCustomers           call={call} />,
    'franchise-ratings':  <AdminFranchiseRatings    call={call} />,
    'customer-payments':  <AdminCustomerPayments    call={call} />,
    'wallet-recharges':   <AdminWalletRecharges      call={call} />,
    demand:               <AdminDemand              {...P} />,
    'maintenance-customer-service': <MaintenanceCustomerService call={call} />,
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

// Sidebar skeleton — shown while nav / user is loading
function SidebarSkeleton({ count = 10 }) {
  return (
    <div className="sidebar-skeleton-nav">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sidebar-skel-item">
          <div className="sidebar-skel-icon" style={{ animationDelay: `${i * 55}ms` }} />
          <div className="sidebar-skel-label" style={{ animationDelay: `${i * 55 + 28}ms` }} />
        </div>
      ))}
    </div>
  );
}

function Loader() {
  return (
    <div className="page-center-loader">
      <div className="ev-loading-screen">
        <div className="ev-logo-aura-wrap">
          <div className="ev-logo-aura ev-logo-aura-1" />
          <div className="ev-logo-aura ev-logo-aura-2" />
          <div className="ev-logo-aura ev-logo-aura-3" />
          <div className="ev-logo-card">
            <img src={allevLogo} alt="allEV" className="ev-logo-img" />
            <div className="ev-logo-shimmer-sweep" />
          </div>
        </div>
        <div className="ev-loading-title">Loading EV Data…</div>
        <div className="ev-loading-sub">Fetching latest information</div>
        <div className="ev-progress-bar">
          <div className="ev-progress-fill" />
        </div>
        <div className="ev-dots">
          <div className="ev-dot" /><div className="ev-dot" /><div className="ev-dot" />
        </div>
      </div>
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
      Use the sidebar to manage Hubs, Chargers, Fleet Operators and more. All sections have entry forms.
    </InfoBanner>
  </>;
}

// ── Hubs ─────────────────────────────────────────────────────────
const EMPTY_HUB = { name: '', code: '', city: '', address: '', lat: '', lng: '', status: 'ONLINE', swaps: '', siteType: '', area: '' };

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
  if (hub.lat && hub.lng) return [Number(hub.lat), Number(hub.lng)];
  // Search both city AND address fields for a known city name
  const combined = [(hub.city || ''), (hub.address || '')].join(' ').toLowerCase().trim();
  if (CITY_COORDS[combined]) return CITY_COORDS[combined];
  // Partial match — city/address may contain extra text like "Hyderabad, Telangana" or full address
  const key = Object.keys(CITY_COORDS).find(k => combined.includes(k));
  return key ? CITY_COORDS[key] : null;
}

// ── Geocode a hub via Nominatim (free, no key needed) ─────────────────
async function geocodeHub(hub) {
  const q = [hub.address, hub.city, 'India'].filter(Boolean).join(', ');
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { 'Accept-Language': 'en' }
    });
    const data = await r.json();
    if (data && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (_) {}
  return null;
}
const HUB_STATUS_COLOR = { ONLINE: '#16a34a', OFFLINE: '#dc2626', MAINTENANCE: '#d97706' };

function IndiaHubMap({ hubs, selectedHub, onSelectHub, visible }) {
  const mapRef = React.useRef(null);
  const leafRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const [tooltip, setTooltip] = React.useState(null);

  const clearMarkers = map => {
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch (_) {} });
    markersRef.current = [];
  };

  const drawMarkers = map => {
    clearMarkers(map);
    const allCoords = [];
    (hubs || []).forEach(hub => {
      const coords = getHubCoords(hub);
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return;
      const color = HUB_STATUS_COLOR[hub.status] || '#2563eb';
      const marker = window.L.circleMarker(coords, {
        radius: 7,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95,
        pane: 'markerPane',
      }).addTo(map);
      marker.on('mouseover', e => {
        const pt = map.latLngToContainerPoint(e.latlng);
        setTooltip({ hub, x: pt.x, y: pt.y });
      });
      marker.on('mouseout', () => setTooltip(null));
      marker.on('click', () => onSelectHub(hub));
      markersRef.current.push(marker);
      allCoords.push(coords);
    });

    if (selectedHub) {
      const c = getHubCoords(selectedHub);
      if (c) map.setView(c, 13, { animate: false });
    } else if (allCoords.length > 1) {
      map.fitBounds(window.L.latLngBounds(allCoords), { padding: [35, 35], maxZoom: 7, animate: false });
    } else if (allCoords.length === 1) {
      map.setView(allCoords[0], 14, { animate: false });
    }
    map.invalidateSize();
  };

  React.useEffect(() => {
    if (leafRef.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([20.5937, 78.9629], 5);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.getPane('markerPane').style.zIndex = 650;
    leafRef.current = map;
    setTimeout(() => drawMarkers(map), 250);
  }, []);

  React.useEffect(() => {
    if (!leafRef.current) return;
    drawMarkers(leafRef.current);
  }, [hubs, selectedHub]);

  React.useEffect(() => {
    if (visible && leafRef.current) setTimeout(() => leafRef.current.invalidateSize(), 100);
  }, [visible]);

  const selectedCoords = selectedHub ? getHubCoords(selectedHub) : null;
  return (
    <div className="hub-map-container" style={{ position: 'relative' }}>
      <div ref={mapRef} id="india-hub-map" />
      {tooltip && (
        <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y, pointerEvents: 'none' }}>
          <div className="map-tooltip-name">{tooltip.hub.name}</div>
          <div className="map-tooltip-row">📍 <strong>{tooltip.hub.city}</strong></div>
          {tooltip.hub.address && <div className="map-tooltip-row" style={{ fontSize: 11 }}>{tooltip.hub.address}</div>}
          <div className="map-tooltip-row">🔄 Swaps: <strong>{tooltip.hub.swaps ?? '—'}</strong></div>
          {tooltip.hub.siteType && <div className="map-tooltip-row">🏷 {tooltip.hub.siteType}</div>}
          {tooltip.hub.sourceId && <div className="map-tooltip-row">ID: {tooltip.hub.sourceId}</div>}
        </div>
      )}
      {selectedHub && selectedCoords && (
        <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 800, background: '#fff', borderRadius: 10, padding: '9px 12px', boxShadow: '0 3px 14px rgba(0,0,0,.18)', maxWidth: 330 }}>
          <strong>{selectedHub.name}</strong><br />
          <span style={{ fontSize: 12, color: '#6b7280' }}>{selectedHub.city} · {selectedCoords[0].toFixed(5)}, {selectedCoords[1].toFixed(5)}</span>
          <a href={`https://www.google.com/maps/search/?api=1&query=${selectedCoords[0]},${selectedCoords[1]}`} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:7,color:'#2563eb',fontSize:11,fontWeight:800,textDecoration:'none'}}><MapPin size={12}/> Open in Google Maps</a>
        </div>
      )}
      <div className="map-legend">
        {Object.entries(HUB_STATUS_COLOR).map(([status, color]) => (
          <div key={status} className="legend-item"><div className="legend-dot" style={{ background: color }} /><span style={{ fontSize: 11 }}>{status}</span></div>
        ))}
      </div>
    </div>
  );
}

const __PREMIUM_HUBS_UI = (() => {
  if (typeof document !== 'undefined' && !document.getElementById('premium-hubs-ui')) {
    const st = document.createElement('style');
    st.id = 'premium-hubs-ui';
    st.textContent = `
      .premium-hubs-shell{display:flex;flex-direction:column;gap:16px}
      .premium-hubs-hero{position:relative;overflow:hidden;border:1px solid #e5e7eb;border-radius:20px;padding:20px;background:linear-gradient(135deg,#ffffff 0%,#f7faff 55%,#eef5ff 100%);box-shadow:0 12px 35px rgba(15,23,42,.07)}
      .premium-hubs-hero:after{content:'';position:absolute;right:-70px;top:-90px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,#dbeafe 0%,rgba(219,234,254,0) 70%);pointer-events:none}
      .premium-hubs-kicker{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#2563eb}
      .premium-hubs-title{margin:4px 0 3px;font-size:24px;line-height:1.15;font-weight:900;color:#0f172a}
      .premium-hubs-sub{font-size:13px;color:#64748b;max-width:760px}
      .premium-hubs-statgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}
      .premium-hubs-stat{background:rgba(255,255,255,.85);border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;min-width:0}
      .premium-hubs-stat-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
      .premium-hubs-stat-value{font-size:22px;font-weight:900;color:#0f172a;margin-top:3px}
      .premium-hubs-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}
      .premium-hubs-mapcard{min-width:0;border:1px solid #e2e8f0;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,.06)}
      .premium-hubs-maphead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;border-bottom:1px solid #eef2f7}
      .premium-hubs-maphead strong{font-size:14px;color:#0f172a}.premium-hubs-maphead span{font-size:11px;color:#64748b}
      .premium-hubs-sidebar{position:sticky;top:14px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.06);overflow:hidden}
      .premium-hubs-sidebar-head{padding:16px;border-bottom:1px solid #eef2f7;background:linear-gradient(180deg,#fbfdff,#fff)}
      .premium-hubs-sidebar-title{font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#475569}
      .premium-hubs-sidebar-empty{padding:30px 20px;text-align:center;color:#94a3b8;font-size:13px;line-height:1.5}
      .premium-hub-identity{padding:17px;border-bottom:1px solid #eef2f7}.premium-hub-name{font-size:19px;font-weight:900;color:#0f172a;line-height:1.2}.premium-hub-location{font-size:12px;color:#64748b;margin-top:5px;line-height:1.45}
      .premium-hub-status{display:inline-flex;align-items:center;gap:6px;margin-top:10px;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;letter-spacing:.05em}
      .premium-hub-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px}.premium-hub-field{border:1px solid #eef2f7;border-radius:11px;padding:10px;background:#fbfdff}.premium-hub-field small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:800}.premium-hub-field b{display:block;margin-top:3px;font-size:12px;color:#334155;word-break:break-word}
      .premium-hub-actions{display:flex;gap:8px;padding:0 14px 14px}.premium-hub-action{flex:1;display:inline-flex;justify-content:center;align-items:center;gap:6px;border-radius:10px;padding:9px 10px;font-size:11px;font-weight:800;text-decoration:none;cursor:pointer;border:1px solid #dbe3ef;background:#fff;color:#334155}.premium-hub-action.primary{background:#2563eb;border-color:#2563eb;color:#fff}
      .premium-hub-list{max-height:480px;overflow:auto;border-top:1px solid #eef2f7}.premium-hub-list-item{display:flex;gap:10px;padding:11px 13px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:.15s}.premium-hub-list-item:hover{background:#f8fbff}.premium-hub-list-item.selected{background:#eff6ff}.premium-hub-dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex:none}.premium-hub-list-name{font-size:12px;font-weight:800;color:#1e293b}.premium-hub-list-meta{font-size:10px;color:#64748b;margin-top:2px}.premium-hubs-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}
      @media(max-width:1100px){.premium-hubs-layout{grid-template-columns:1fr}.premium-hubs-sidebar{position:relative;top:auto}.premium-hubs-statgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:600px){.premium-hubs-statgrid{grid-template-columns:1fr 1fr}.premium-hubs-title{font-size:20px}}
    `;
    document.head.appendChild(st);
  }
  return null;
})();

function AdminHubs({ call }) {
  const { data: initial, loading, error, refresh } = useFetch(call, '/admin/hubs');
  useEffect(() => { const timer = setInterval(() => refresh(), 10 * 60 * 1000); return () => clearInterval(timer); }, []);
  const [hubs, setHubs] = useState([]);
  const [open, setOpen] = useState(false);
  const [editHub, setEditHub] = useState(null);
  const [delHub, setDelHub] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_HUB);
  const [selectedHub, setSelectedHub] = useState(null);
  const [view, setView] = useState('map');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const { toast, show } = useToast();

  useEffect(() => { if (initial) setHubs(initial); }, [initial]);
  const ff = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code || !form.city) { show('Hub Name, Code and City are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, lat: form.lat === '' ? undefined : +form.lat, lng: form.lng === '' ? undefined : +form.lng, swaps: form.swaps === '' ? undefined : form.swaps };
      const hub = await call('/admin/hubs', { method: 'post', data: payload });
      setHubs(h => [...h, hub]); setOpen(false); setForm(EMPTY_HUB); show('✓ Hub created');
    } catch (e) { show(e.response?.data?.message || 'Failed to create hub', 'error'); }
    finally { setSaving(false); }
  };

  const openEdit = hub => {
    setEditHub(hub);
    setForm({ name: hub.name || '', code: hub.code || '', city: hub.city || '', address: hub.address || '', lat: hub.lat ?? '', lng: hub.lng ?? '', status: hub.status || 'ONLINE', swaps: hub.swaps ?? '', siteType: hub.siteType || '', area: hub.area || '' });
  };
  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, lat: form.lat === '' ? undefined : +form.lat, lng: form.lng === '' ? undefined : +form.lng, swaps: form.swaps === '' ? undefined : form.swaps };
      const updated = await call(`/admin/hubs/${editHub._id}`, { method: 'put', data: payload });
      setHubs(h => h.map(x => x._id === editHub._id ? updated : x)); setEditHub(null); setForm(EMPTY_HUB); show('✓ Hub updated');
    } catch (e) { show(e.response?.data?.message || 'Failed to update hub', 'error'); }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    try { await call(`/admin/hubs/${delHub._id}`, { method: 'delete' }); setHubs(h => h.filter(x => x._id !== delHub._id)); setDelHub(null); show('Hub deleted'); }
    catch (e) { show('Failed to delete hub', 'error'); }
  };
  const syncAll = async () => {
    try {
      await call('/admin/hubs/sync-sm-infrastructure', { method: 'post' });
      const fresh = await call('/admin/hubs'); setHubs(fresh); show(`✓ ${fresh.length} hub records loaded`);
    } catch (e) { show(e.response?.data?.message || 'Hub sync failed', 'error'); }
  };

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;

  const cities = [...new Set(hubs.map(h => h.city).filter(Boolean))].sort();
  const areas = [...new Set(hubs.filter(h => cityFilter === 'ALL' || h.city === cityFilter).map(h => h.area || h.region).filter(Boolean))].sort();
  const filtered = hubs.filter(h => {
    const q = search.trim().toLowerCase();
    const hay = [h.name,h.code,h.city,h.address,h.sourceId,h.siteType,h.area,h.qisName].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (cityFilter === 'ALL' || h.city === cityFilter) && (areaFilter === 'ALL' || (h.area || h.region) === areaFilter);
  });

  const HubFields = () => <>
    <Fld label="Hub Name" required><Inp value={form.name} onChange={ff('name')} placeholder="Charging hub name" /></Fld>
    <Fld label="Hub Code" required><Inp value={form.code} onChange={ff('code')} placeholder="HUB-HYD-001" /></Fld>
    <div className="row-2"><Fld label="City" required><Inp value={form.city} onChange={ff('city')} placeholder="Hyderabad" /></Fld><Fld label="Area"><Inp value={form.area || ''} onChange={ff('area')} placeholder="Area / locality" /></Fld></div>
    <Fld label="Full Address"><Txt value={form.address} onChange={ff('address')} placeholder="Full location address" rows={2} /></Fld>
    <div className="row-2"><Fld label="Latitude"><Inp value={form.lat} onChange={ff('lat')} type="number" step="any" placeholder="17.385000" /></Fld><Fld label="Longitude"><Inp value={form.lng} onChange={ff('lng')} type="number" step="any" placeholder="78.486700" /></Fld></div>
    <div className="row-2"><Fld label="Site Type"><Inp value={form.siteType || ''} onChange={ff('siteType')} placeholder="IOCL / Private / etc." /></Fld><Fld label="Swaps"><Inp value={form.swaps} onChange={ff('swaps')} placeholder="e.g. 4" /></Fld></div>
    <Fld label="Status"><Sel value={form.status} onChange={ff('status')} opts={[{v:'ONLINE',l:'Online'},{v:'OFFLINE',l:'Offline'},{v:'MAINTENANCE',l:'Under Maintenance'}]} /></Fld>
  </>;

  const isMapView = view === 'map';
  return <>
    <Toast toast={toast} />
    <div className="premium-hubs-shell">
      <div className="premium-hubs-hero">
        <div className="premium-hubs-kicker">Infrastructure Intelligence</div>
        <div className="premium-hubs-title">Premium Hub Command Center</div>
        <div className="premium-hubs-sub">A unified operating view of the charging network. Explore locations, monitor hub status, inspect infrastructure metadata, and jump directly to any location in Google Maps.</div>
        <div className="premium-hubs-statgrid">
          <div className="premium-hubs-stat"><div className="premium-hubs-stat-label">Total hubs</div><div className="premium-hubs-stat-value">{hubs.length}</div></div>
          <div className="premium-hubs-stat"><div className="premium-hubs-stat-label">Visible now</div><div className="premium-hubs-stat-value">{filtered.length}</div></div>
          <div className="premium-hubs-stat"><div className="premium-hubs-stat-label">Online</div><div className="premium-hubs-stat-value">{hubs.filter(h=>String(h.status||'').toUpperCase()==='ONLINE').length}</div></div>
          <div className="premium-hubs-stat"><div className="premium-hubs-stat-label">Swaps configured</div><div className="premium-hubs-stat-value">{hubs.reduce((n,h)=>n+(Number.isFinite(Number(h.swaps))?Number(h.swaps):0),0)}</div></div>
        </div>
      </div>

      <div className="premium-hubs-toolbar">
        <div style={{minWidth:260,flex:'1 1 280px'}}><Inp value={search} onChange={setSearch} placeholder="Search hub, ID, city, address, area…" /></div>
        <Sel value={cityFilter} onChange={v=>{setCityFilter(v);setAreaFilter('ALL')}} opts={[{v:'ALL',l:`All cities (${hubs.length})`},...cities.map(c=>({v:c,l:c}))]} />
        <Sel value={areaFilter} onChange={v=>{setAreaFilter(v);if(v!=='ALL')setView('map')}} opts={[{v:'ALL',l:`All areas (${areas.length})`},...areas.map(a=>({v:a,l:a}))]} />
        <button className="btn-ghost" onClick={syncAll}><RefreshCw size={13}/> Sync</button>
        <button className={isMapView?'btn-primary':'btn-ghost'} onClick={()=>setView('map')}>Map</button>
        <button className={!isMapView?'btn-primary':'btn-ghost'} onClick={()=>setView('table')}>Table</button>
        <button className="btn-primary" onClick={()=>{setOpen(true);setForm(EMPTY_HUB);}}><Plus size={14}/> Add Hub</button>
      </div>

      {isMapView && <div className="premium-hubs-layout">
        <div className="premium-hubs-mapcard">
          <div className="premium-hubs-maphead"><div><strong>Live Hub Network</strong><div><span>{filtered.length} locations in the current view</span></div></div><span>Click a hub to inspect</span></div>
          <IndiaHubMap hubs={filtered} selectedHub={selectedHub} onSelectHub={h=>setSelectedHub(s=>s?._id===h._id?null:h)} visible={isMapView} />
        </div>
        <aside className="premium-hubs-sidebar">
          <div className="premium-hubs-sidebar-head"><div className="premium-hubs-sidebar-title">Hub Details</div><div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>{selectedHub?'Selected infrastructure record':'Select a point or hub from the list'}</div></div>
          {selectedHub ? (()=>{
            const sc=HUB_STATUS_COLOR[selectedHub.status]||'#64748b'; const c=getHubCoords(selectedHub); const maps=c?`https://www.google.com/maps/search/?api=1&query=${c[0]},${c[1]}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedHub.address||'')+' '+(selectedHub.city||''))}`;
            return <>
              <div className="premium-hub-identity"><div className="premium-hub-name">{selectedHub.name||'Unnamed Hub'}</div><div className="premium-hub-location">{[selectedHub.city,selectedHub.area||selectedHub.region].filter(Boolean).join(' · ')||'Location not specified'}{selectedHub.address?<><br/>{selectedHub.address}</>:null}</div><span className="premium-hub-status" style={{background:sc+'16',color:sc}}><span>●</span>{selectedHub.status||'UNKNOWN'}</span></div>
              <div className="premium-hub-grid">
                <div className="premium-hub-field"><small>Hub code</small><b>{selectedHub.code||'—'}</b></div><div className="premium-hub-field"><small>Source ID</small><b>{selectedHub.sourceId||'—'}</b></div>
                <div className="premium-hub-field"><small>Site type</small><b>{selectedHub.siteType||'—'}</b></div><div className="premium-hub-field"><small>Swaps</small><b>{selectedHub.swaps??'—'}</b></div>
                <div className="premium-hub-field"><small>Latitude</small><b>{c?Number(c[0]).toFixed(6):'—'}</b></div><div className="premium-hub-field"><small>Longitude</small><b>{c?Number(c[1]).toFixed(6):'—'}</b></div>
                <div className="premium-hub-field" style={{gridColumn:'1 / -1'}}><small>Energization</small><b>{selectedHub.energizationDate||'—'}</b></div>
              </div>
              <div className="premium-hub-actions"><a className="premium-hub-action primary" href={maps} target="_blank" rel="noopener noreferrer"><MapPin size={14}/> Open in Google Maps</a><button className="premium-hub-action" onClick={()=>openEdit(selectedHub)}>Edit</button></div>
            </>;
          })() : <div className="premium-hubs-sidebar-empty">Choose a hub from the map or the quick list below to open its complete infrastructure profile.</div>}
          <div className="premium-hub-list">
            {filtered.slice(0,120).map((hub,i)=><div key={hub._id} className={'premium-hub-list-item'+(selectedHub?._id===hub._id?' selected':'')} onClick={()=>setSelectedHub(hub)}><span className="premium-hub-dot" style={{background:HUB_STATUS_COLOR[hub.status]||'#64748b'}}/><div><div className="premium-hub-list-name">{hub.name||`Hub ${i+1}`}</div><div className="premium-hub-list-meta">{[hub.city,hub.area||hub.region].filter(Boolean).join(' · ')||'Unknown area'} · {hub.status||'UNKNOWN'}</div></div></div>)}
            {filtered.length>120&&<div style={{padding:12,fontSize:11,color:'#94a3b8'}}>Showing first 120 in quick list. All {filtered.length} locations remain available on the map.</div>}
          </div>
        </aside>
      </div>}
    </div>

    {!isMapView && <Card title="All Charging Hub Locations" badge={`${filtered.length} / ${hubs.length}`}>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <div style={{minWidth:280,flex:1}}><Inp value={search} onChange={setSearch} placeholder="Search hub, ID, city, address, site type…" /></div>
        <Sel value={cityFilter} onChange={v=>{setCityFilter(v);setAreaFilter('ALL')}} opts={[{v:'ALL',l:`All cities (${hubs.length})`},...cities.map(c=>({v:c,l:c}))]} />
        <Sel value={areaFilter} onChange={v=>{setAreaFilter(v);if(v!=='ALL')setView('map')}} opts={[{v:'ALL',l:`All areas (${areas.length})`},...areas.map(a=>({v:a,l:a}))]} />
      </div>
      <div className="table-scroll">
        <table><thead><tr><th>#</th><th>Hub / Location</th><th>Source ID</th><th>Site Type</th><th>City</th><th>Area</th><th>Address</th><th>Latitude</th><th>Longitude</th><th>Swaps</th><th>Energization</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map((hub,i)=>{const sc=HUB_STATUS_COLOR[hub.status]||'#6b7280'; const c=getHubCoords(hub); const maps=c?`https://www.google.com/maps?q=${c[0]},${c[1]}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hub.address||'')+' '+(hub.city||''))}`; return <tr key={hub._id}>
            <td>{i+1}</td><td><strong>{hub.name}</strong>{hub.qisName&&hub.qisName!==hub.name?<div style={{fontSize:10,color:'#9ca3af'}}>{hub.qisName}</div>:null}</td><td>{hub.sourceId||hub.code||'—'}</td><td>{hub.siteType||'—'}</td><td>{hub.city||'—'}</td><td>{hub.area||'—'}</td><td style={{maxWidth:260}}>{hub.address||'—'}</td><td>{c?c[0].toFixed(6):'—'}</td><td>{c?c[1].toFixed(6):'—'}</td><td>{hub.swaps ?? '—'}</td><td>{hub.energizationDate||'—'}</td><td><span className="status-pill" style={{background:sc+'18',color:sc}}>● {hub.status}</span></td>
            <td><div style={{display:'flex',gap:5}}><button className="btn-ghost" style={{padding:'3px 7px',fontSize:11}} onClick={()=>{setSelectedHub(hub);setView('map')}}>Map</button><a href={maps} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{padding:'3px 7px',fontSize:11,textDecoration:'none'}}>Maps</a><button className="btn-ghost" style={{padding:'3px 7px',fontSize:11}} onClick={()=>openEdit(hub)}>Edit</button></div></td>
          </tr>})}</tbody>
        </table>
      </div>
    </Card>}

    {open && <Modal title="Add Charging Hub" subtitle="Add a new location to the shared network" onClose={()=>setOpen(false)} footer={<><button className="btn-ghost" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving?'Creating…':'Create Hub'}</button></>}>{HubFields()}</Modal>}
    {editHub && <Modal title="Edit Charging Hub" subtitle={`Editing ${editHub.name}`} onClose={()=>setEditHub(null)} footer={<><button className="btn-ghost" onClick={()=>setEditHub(null)}>Cancel</button><button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving?'Saving…':'Save Changes'}</button></>}>{HubFields()}</Modal>}
    {delHub && <Modal title="Delete Hub" subtitle="This action cannot be undone." onClose={()=>setDelHub(null)} footer={<><button className="btn-ghost" onClick={()=>setDelHub(null)}>Cancel</button><button style={{background:'#dc2626',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontWeight:700,cursor:'pointer'}} onClick={confirmDelete}>Delete</button></>}>Delete <strong>{delHub.name}</strong>?</Modal>}
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
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    leafRef.current = map;
    return () => {
      markersRef.current.forEach(m => { try { map.removeLayer(m); } catch(_){} });
      try { map.remove(); } catch(_){}
      leafRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = leafRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    // Clear old markers
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch(_){} });
    markersRef.current = [];

    const mapped = franchisees.filter(f => {
      const lat = Number(f.address?.latitude ?? f.address?.lat);
      const lng = Number(f.address?.longitude ?? f.address?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
    });

    mapped.forEach((f, idx) => {
      const lat = Number(f.address.latitude ?? f.address.lat);
      const lng = Number(f.address.longitude ?? f.address.lng);
      const a = f.address || {};

      // Styled divIcon — blue dot with white border + pulse ring
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:28px;height:28px;">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:rgba(37,99,235,0.18);
              animation:franchisee-pulse 2s ease-out infinite;
              animation-delay:${(idx * 0.25) % 1.5}s;
            "></div>
            <div style="
              position:absolute;top:5px;left:5px;width:18px;height:18px;
              border-radius:50%;background:#2563eb;
              border:3px solid #fff;
              box-shadow:0 2px 10px rgba(37,99,235,0.55);
              cursor:pointer;
            "></div>
          </div>`,
        iconSize:   [28, 28],
        iconAnchor: [14, 14],
        popupAnchor:[0, -16],
      });

      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      const addressLine = [a.line1, a.line2, a.city, a.district, a.state, a.pincode]
        .filter(Boolean).join(', ') || '—';

      const popupHtml = `
        <div style="min-width:230px;font-family:sans-serif;font-size:13px;line-height:1.55">
          <div style="font-weight:800;font-size:15px;color:#1e3a8a;margin-bottom:6px;display:flex;align-items:center;gap:6px">
            🏢 ${f.name || 'Fleet Operator'}
          </div>
          ${a.businessName ? `<div style="color:#2563eb;font-weight:600;margin-bottom:6px">${a.businessName}</div>` : ''}
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:6px 0"/>
          <div style="color:#374151;margin-bottom:3px"><b>📍 Address:</b> ${addressLine}</div>
          ${a.managerName  ? `<div style="color:#374151;margin-bottom:3px"><b>👤 Manager:</b> ${a.managerName}</div>` : ''}
          ${f.phone || a.managerPhone ? `<div style="color:#374151;margin-bottom:3px"><b>📞 Phone:</b> ${f.phone || a.managerPhone}</div>` : ''}
          ${f.email ? `<div style="color:#374151;margin-bottom:8px"><b>✉ Email:</b> ${f.email}</div>` : ''}
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
            style="display:inline-flex;align-items:center;gap:5px;background:#2563eb;color:#fff;
            border-radius:6px;padding:5px 11px;font-size:12px;font-weight:600;text-decoration:none">
            🗺 Open in Maps
          </a>
        </div>`;

      const marker = L.marker([lat, lng], { icon });
      marker.addTo(map);
      marker.bindPopup(popupHtml, { maxWidth: 320, className: 'franchise-popup' });
      markersRef.current.push(marker);
    });

    // Fit bounds or centre
    if (mapped.length > 1) {
      const bounds = L.latLngBounds(
        mapped.map(f => [Number(f.address.latitude ?? f.address.lat), Number(f.address.longitude ?? f.address.lng)])
      );
      map.fitBounds(bounds, { padding:[40,40], maxZoom:11 });
    } else if (mapped.length === 1) {
      const f = mapped[0];
      map.setView([Number(f.address.latitude ?? f.address.lat), Number(f.address.longitude ?? f.address.lng)], 10);
    }
  }, [franchisees]);

  // Invalidate size after mount (container may have been hidden)
  React.useEffect(() => {
    const t = setTimeout(() => leafRef.current?.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, []);

  const mappedCount = franchisees.filter(f => {
    const lat = Number(f.address?.latitude ?? f.address?.lat);
    const lng = Number(f.address?.longitude ?? f.address?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  }).length;

  return (
    <div className="hub-map-container" style={{ position:'relative' }}>
      <div ref={mapRef} id="india-franchise-map" />
      {mappedCount === 0 && (
        <div style={{
          position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          background:'rgba(249,250,251,0.92)', borderRadius:14, zIndex:500,
        }}>
          <span style={{ fontSize:36, marginBottom:10 }}>📍</span>
          <div style={{ color:'#374151', fontWeight:700, fontSize:14 }}>No franchisees mapped yet</div>
          <div style={{ color:'#9ca3af', fontSize:12, marginTop:4 }}>
            Add latitude &amp; longitude when creating a fleet operator to see them here.
          </div>
        </div>
      )}
      {mappedCount > 0 && (
        <div style={{
          position:'absolute', top:10, right:10, zIndex:500,
          background:'rgba(255,255,255,0.92)', borderRadius:8, padding:'6px 12px',
          border:'1px solid #e5e7eb', fontSize:12, color:'#374151', fontWeight:600,
          boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
        }}>
          🏢 {mappedCount} / {franchisees.length} fleet operator{franchisees.length !== 1 ? 's' : ''} on map
        </div>
      )}
    </div>
  );
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
      show('✓ Fleet Operator account created!');
    } catch (e) {
      show(e.response?.data?.message || e.message || 'Failed to create fleet operator', 'error');
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
      title="Fleet Operators"
      sub="All franchise partners across the network."
      actions={<button className="btn-primary" onClick={openForm}><UserPlus size={15} /> Add Fleet Operator</button>}
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
    <Card title="Vehicle & Inventory by Fleet Operator" badge={`${list.length} partners`}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fleet Operator</th>
              <th>Email</th>
              <th style={{ textAlign:'center' }}>Total Vehicles</th>
              <th style={{ textAlign:'center' }}>Assigned by Command</th>
              <th style={{ textAlign:'center' }}>Operator Submitted</th>
              <th style={{ textAlign:'center' }}>Pending Approval</th>
              <th style={{ textAlign:'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map(f => {
              const s = statsMap.get(String(f._id)) || { totalVehicles: 0, approvedVehicles: 0, pendingVehicles: 0, assignedVehicles: 0 };
              const cmdCount = s.assignedVehicles || 0;
              const ownApproved = (s.approvedVehicles || 0) - cmdCount;
              return (
                <tr key={String(f._id)}>
                  <td style={{ fontWeight: 600 }}>{f.name || '—'}</td>
                  <td style={{ color: '#6b7280', fontSize: 12 }}>{f.email}</td>
                  <td style={{ textAlign:'center', fontWeight: 700 }}>{s.totalVehicles}</td>
                  <td style={{ textAlign:'center' }}>
                    {cmdCount > 0
                      ? <span style={{ background:'#eff6ff', color:'#1d4ed8', padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>{cmdCount}</span>
                      : <span style={{ color:'#9ca3af', fontSize:12 }}>—</span>
                    }
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <span style={{ background:'#dcfce7', color:'#166534', padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>
                      {ownApproved > 0 ? ownApproved : '—'}
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
              <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>No fleet operators yet.</td></tr>
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

    <Card title="Fleet Operator Locations" badge={`${list.filter(f => Number.isFinite(Number(f.address?.latitude ?? f.address?.lat)) && Number.isFinite(Number(f.address?.longitude ?? f.address?.lng))).length} mapped`}>
      <FranchiseeMap franchisees={list} />
    </Card>
    <Card title="Fleet Operator Directory" badge={`${list.length} partners`}>
      <DataTable rows={list} cols={['name', 'email', 'phone', 'active', 'createdAt']} />
    </Card>

    {open && (
      <Modal
        title={created ? 'Fleet Operator Created!' : 'Add New Fleet Operator'}
        subtitle={created ? 'Share credentials with the fleet operator' : 'Creates a login for the Fleet Operator Portal'}
        onClose={() => setOpen(false)}
        footer={
          created
            ? <button className="btn-primary" onClick={() => setOpen(false)}>Done</button>
            : <>
                <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={submit} disabled={saving}>
                  {saving ? 'Creating Account…' : <><UserPlus size={14} /> Create Fleet Operator</>}
                </button>
              </>
        }
      >
        {created ? (
          <div className="success-card">
            <div className="success-icon"><CheckCircle size={32} /></div>
            <h3>Account Created Successfully</h3>
            <p>The fleet operator can now login at the Fleet Operator Portal with these credentials:</p>
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
              This creates a dedicated login account for the Fleet Operator Portal. The fleet operator will have access to their
              own dashboard, financials, inventory and staff.
            </InfoBanner>

            {/* ── Section: Account ── */}
            <div className="form-section-label">Account Details</div>
            <Fld label="Full Name" required>
              <Inp value={form.name} onChange={ff('name')} placeholder="e.g. Raj Kumar" />
            </Fld>
            <Fld label="Email Address" required hint="Used to login to the Fleet Operator Portal">
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
              <Fld label="Fleet Operator Phone" hint="Alternate / login phone">
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
            <Fld label="Notes / Remarks" hint="Internal notes about this fleet operator">
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


// ── Fleet Operator Ratings ────────────────────────────────────────────
function AdminFranchiseRatings({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/admin/franchise-ratings');
  if(loading)return <Loader/>; if(error)return <Err msg={error}/>;
  return <><PageHeader title="Fleet Operator Ratings" sub="Customer feedback captured after complaints are solved." actions={<button className="btn-ghost" onClick={refresh}><RefreshCw size={15}/> Refresh</button>}/>
    <MetricGrid metrics={[{label:'Rated Fleet Operators',value:data?.length||0,Icon:Users,color:'#2563eb'},{label:'Total Ratings',value:(data||[]).reduce((s,x)=>s+(x.ratingCount||0),0),Icon:BarChart2,color:'#16a34a'},{label:'Network Avg',value:data?.length?((data.reduce((s,x)=>s+(x.averageRating||0)*(x.ratingCount||0),0)/(data.reduce((s,x)=>s+(x.ratingCount||0),0)||1)).toFixed(2)):'0.00',Icon:BarChart2,color:'#d97706'}]}/>
    <Card title="Fleet Operator Performance" badge={`${data?.length||0} rated`}><div style={{display:'flex',flexDirection:'column',gap:10}}>{(data||[]).map(r=><div key={String(r._id)} style={{border:'1px solid #e5e7eb',borderRadius:10,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><strong>{r.franchisee?.name||'Fleet Operator'}</strong><div style={{fontSize:12,color:'#64748b',marginTop:3}}>{r.franchisee?.email||''} · PIN {r.franchisee?.address?.pincode||'—'}</div></div><div style={{fontWeight:800,fontSize:18}}>⭐ {(r.averageRating||0).toFixed(2)} <span style={{fontSize:11,fontWeight:500,color:'#64748b'}}>({r.ratingCount} ratings)</span></div></div>)}</div></Card>
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
// INVENTORY MANAGEMENT — Command Center creates vehicles & spare parts,
// then assigns vehicles to fleet operators
// ══════════════════════════════════════════════════════════════════
function AdminVehicleDocuments({ call }) {
  const { data: vehiclesData, loading: vehiclesLoading } = useFetch(call, '/admin/vehicles');
  const { data: docs, loading: docsLoading, error, refresh } = useFetch(call, '/platform/vehicle-documents');
  const [form, setForm] = useState({ vehicleId:'', type:'RC', title:'', number:'', issuedAt:'', expiresAt:'', url:'', fileName:'', notes:'' });
  const [uploading,setUploading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [preview,setPreview]=useState(null);
  const [issueDoc,setIssueDoc]=useState(null);
  const [issuing,setIssuing]=useState(false);
  const {toast,show}=useToast();
  const fileUrl=u=>u?(u.startsWith('http')?u:`${API}${u}`):'';
  const vehicles=Array.isArray(vehiclesData)?vehiclesData:[];
  const assignedVehicles=vehicles.filter(v=>v.franchiseeId);
  const uploadDocument=async file=>{if(!file)return;setUploading(true);try{const fd=new FormData();fd.append('files',file);const result=await call('/uploads',{method:'post',data:fd});const uploaded=result?.files?.[0];if(!uploaded)throw new Error('Upload failed');setForm(f=>({...f,url:uploaded.url,fileName:uploaded.name}));show('Document uploaded.')}catch(e){show(e.response?.data?.message||e.message||'Document upload failed','error')}finally{setUploading(false)}};
  const submit=async e=>{e.preventDefault();if(!form.vehicleId||!form.title||!form.url){show('Vehicle, document title and uploaded document are required','error');return;}setSaving(true);try{await call('/platform/vehicle-documents',{method:'post',data:form});show('Vehicle document registered in Command Center.');setForm({vehicleId:'',type:'RC',title:'',number:'',issuedAt:'',expiresAt:'',url:'',fileName:'',notes:''});refresh()}catch(e){show(e.response?.data?.message||'Could not save document','error')}finally{setSaving(false)}};
  if(vehiclesLoading||docsLoading)return <Loader/>; if(error)return <Err msg={error}/>;
  return <><Toast toast={toast}/><PageHeader title="Vehicle Documents" sub="Command Center owns the vehicle documents and shares each bike's records with its assigned fleet operator."/>
    <MetricGrid metrics={[
      {label:'Total Documents',value:(docs||[]).length,Icon:FileText,color:'#2563eb'},
      {label:'Shared to Fleet',value:(docs||[]).filter(d=>d.franchiseeId).length,Icon:Users,color:'#16a34a'},
      {label:'Expiring / Expired',value:(docs||[]).filter(d=>d.status==='EXPIRED').length,Icon:AlertTriangle,color:'#dc2626'},
      {label:'Assigned Bikes',value:assignedVehicles.length,Icon:Car,color:'#7c3aed'},
    ]}/>
    <div className="command-doc-grid">
      <Card title="Send Vehicle Document" action={<span className="card-section-note">Command Center → Fleet Operator</span>}>
        <form onSubmit={submit} className="premium-form">
          <div className="premium-form-grid-2">
            <Fld label="Bike / Vehicle" required><select required value={form.vehicleId} onChange={e=>setForm({...form,vehicleId:e.target.value})}><option value="">Select bike</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.bikeId||'No Bike ID'} · {v.make} {v.model} · {v.registrationNo||'No reg'}{v.franchiseeName?` · ${v.franchiseeName}`:' · Unassigned'}</option>)}</select></Fld>
            <Fld label="Document type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{['RC','INSURANCE','PUC','FITNESS','PERMIT','SERVICE','OTHER'].map(x=><option key={x}>{x}</option>)}</select></Fld>
          </div>
          <div className="premium-form-grid-2"><Fld label="Document title" required><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Insurance Policy"/></Fld><Fld label="Document number"><input value={form.number} onChange={e=>setForm({...form,number:e.target.value})}/></Fld></div>
          <div className="premium-form-grid-2"><Fld label="Issued"><input type="date" value={form.issuedAt} onChange={e=>setForm({...form,issuedAt:e.target.value})}/></Fld><Fld label="Expires"><input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></Fld></div>
          <Fld label="Upload document" required><div className="premium-upload-box"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e=>uploadDocument(e.target.files?.[0])} disabled={uploading}/><div className="premium-upload-hint"><UploadCloud size={18}/><span><b>{uploading?'Uploading…':'Choose document file'}</b><small>PDF, JPG, PNG, WEBP, DOC or DOCX</small></span></div></div></Fld>
          {form.url&&<div className="premium-uploaded"><div><CheckCircle size={17}/><span><b>{form.fileName||'Document uploaded'}</b><small>Ready to send</small></span></div><button type="button" className="btn-ghost" onClick={()=>setPreview({name:form.fileName,url:fileUrl(form.url)})}>Preview</button></div>}
          <Fld label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional document notes…"/></Fld>
          <button className="btn-primary" disabled={saving||uploading}><Send size={15}/>{saving?'Sending…':'Save & Share Document'}</button>
        </form>
      </Card>
      <Card title="Document Register" badge={`${(docs||[]).length}`}>
        <div className="command-doc-list">{(docs||[]).length===0?<div className="empty-state"><FileText size={36} style={{opacity:.2}}/><p>No vehicle documents yet.</p></div>:(docs||[]).map(d=><div className="command-doc-row" key={d._id}>
          <div className="command-doc-icon"><FileText size={17}/></div><div className="command-doc-main"><strong>{d.title||'Vehicle document'}</strong><span>{d.type} · {d.bikeId||d.vehicle?.bikeId||'No Bike ID'} · {d.vehicle?.make||d.vehicleSnapshot?.make||''} {d.vehicle?.model||d.vehicleSnapshot?.model||''}</span><small>{d.franchiseeId||d.shareStatus==='SHARED' ? `Issued to ${d.issuedToSnapshot?.name||d.fleetOperatorName||'fleet operator'}` : (d.vehicle?.fleetOperatorName ? 'Ready to issue to assigned fleet operator' : 'Assign this bike before issuing')}</small></div><div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}><button className="btn-ghost btn-sm" onClick={()=>setPreview({name:d.fileName||d.title,url:fileUrl(d.url)})}><Eye size={13}/> View</button>{!(d.franchiseeId||d.shareStatus==='SHARED') && <button className="btn-primary btn-sm" disabled={!d.vehicle?.fleetOperatorId || issuing} onClick={()=>setIssueDoc(d)}><Send size={13}/> Issue to Fleet</button>}</div>
        </div>)}</div>
      </Card>
    </div>
    {issueDoc&&<div className="modal-overlay" onClick={()=>!issuing&&setIssueDoc(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(520px,100%)'}}><div className="modal-head"><div><div className="modal-title">Issue Vehicle Document</div><div className="modal-subtitle">Confirm the fleet operator before sending this document.</div></div><button className="icon-btn" disabled={issuing} onClick={()=>setIssueDoc(null)}>✕</button></div><div className="modal-body"><div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:14,padding:14,marginBottom:12}}><div style={{fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>Document</div><strong style={{display:'block',fontSize:15,marginTop:4}}>{issueDoc.title||'Vehicle document'}</strong><span style={{fontSize:12,color:'#64748b'}}>{issueDoc.type||'OTHER'} · {issueDoc.bikeId||issueDoc.vehicle?.bikeId||'Bike'} · {issueDoc.vehicle?.make||issueDoc.vehicleSnapshot?.make||''} {issueDoc.vehicle?.model||issueDoc.vehicleSnapshot?.model||''}</span></div><div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:14,padding:14}}><div style={{fontSize:11,color:'#1d4ed8',fontWeight:700,textTransform:'uppercase'}}>Fleet Operator</div><strong style={{display:'block',fontSize:16,marginTop:4}}>{issueDoc.vehicle?.fleetOperatorName||issueDoc.issuedToSnapshot?.name||'Assigned Fleet Operator'}</strong><div style={{fontSize:12,color:'#475569',marginTop:5}}>{issueDoc.vehicle?.fleetOperatorEmail||issueDoc.issuedToSnapshot?.email||'Email unavailable'}</div><div style={{fontSize:12,color:'#475569',marginTop:3}}>{issueDoc.vehicle?.fleetOperatorPhone||issueDoc.issuedToSnapshot?.phone||''}</div><div style={{fontSize:12,color:'#475569',marginTop:6}}>Bike ID: <b>{issueDoc.vehicle?.bikeId||issueDoc.bikeId||'—'}</b></div></div><div style={{marginTop:14,fontSize:13,color:'#334155'}}>After confirmation, this document will appear in the Fleet Operator's <b>View Documents</b> sidebar.</div></div><div className="modal-footer"><button className="btn-ghost" disabled={issuing} onClick={()=>setIssueDoc(null)}>Cancel</button><button className="btn-primary" disabled={issuing||!issueDoc.vehicle?.fleetOperatorId} onClick={async()=>{setIssuing(true);try{await call(`/platform/vehicle-documents/${issueDoc._id}/issue`,{method:'put'});show('Document issued to the fleet operator.');setIssueDoc(null);refresh();}catch(e){show(e.response?.data?.message||'Could not issue document','error')}finally{setIssuing(false)}}}>{issuing?'Issuing…':'Confirm & Issue Document'}</button></div></div></div>}

    {preview&&<div className="modal-overlay" onClick={()=>setPreview(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(900px,100%)',height:'90vh'}}><div className="modal-head"><div><div className="modal-title">{preview.name||'Document Preview'}</div><div className="modal-subtitle">Vehicle document</div></div><button className="icon-btn" onClick={()=>setPreview(null)}>✕</button></div><div className="modal-body" style={{height:'calc(100% - 70px)',padding:10}}>{/\.(png|jpe?g|webp)$/i.test(preview.url||'')?<img src={preview.url} alt={preview.name} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',display:'block',margin:'auto'}}/>:<iframe title={preview.name||'Document'} src={preview.url} style={{width:'100%',height:'100%',border:'1px solid #e2e8f0',borderRadius:8}}/>}</div></div></div>}
  </>;
}


function AdminVehicleInventory({ call }) {
  const { data: franchiseeList } = useFetch(call, '/admin/franchisees');
  const [vehicles,     setVehicles]     = useState([]);
  const [loadingVeh,   setLoadingVeh]   = useState(true);
  const [parts,        setParts]        = useState([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [activeTab,    setActiveTab]    = useState('vehicles');
  const [showAddVeh,   setShowAddVeh]   = useState(false);
  const [showAddPart,  setShowAddPart]  = useState(false);
  const [assignVeh,    setAssignVeh]    = useState(null);
  const [selectedAssignIds, setSelectedAssignIds] = useState([]);
  const [assignToId,   setAssignToId]   = useState('');
  const [assigning,    setAssigning]    = useState(false);
  const [selectedVeh,  setSelectedVeh]  = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const { toast, show } = useToast();

  // Vehicle form
  const EMPTY_VEH = { category:'', make:'', model:'', year:'', color:'', registrationNo:'', chassisNo:'', motorNo:'', insuranceExpiry:'', odometerKm:'', seatingCapacity:'', topSpeedKph:'', batteryCapacityKwh:'', rangeKm:'', chargingType:'', pricePerDay:'', quantity:'1', bikeIds:[''], description:'', images:[] };
  const [vehForm, setVehForm] = useState(EMPTY_VEH);
  const [savingVeh, setSavingVeh] = useState(false);
  const vf = k => e => setVehForm(f => ({ ...f, [k]: e.target.value }));

  // Part form
  const EMPTY_PART = { sku:'', name:'', category:'', manufacturer:'', quantity:'', reorderLevel:'5', unitPrice:'', description:'' };
  const [partForm, setPartForm] = useState(EMPTY_PART);
  const [savingPart, setSavingPart] = useState(false);
  const pf = k => e => setPartForm(f => ({ ...f, [k]: e.target.value }));

  const loadVehicles = () => {
    setLoadingVeh(true);
    call('/admin/vehicles').then(d => { setVehicles(d || []); setLoadingVeh(false); }).catch(() => setLoadingVeh(false));
  };
  const loadParts = () => {
    setLoadingParts(true);
    call('/admin/all-parts').then(d => { setParts(d || []); setLoadingParts(false); }).catch(() => setLoadingParts(false));
  };
  useEffect(() => { loadVehicles(); }, []);
  useEffect(() => { loadParts(); }, []);

  const [uploadingVehImages, setUploadingVehImages] = useState(false);

  const uploadVehicleImages = async (files) => {
    const picked = Array.from(files || []).filter(Boolean).slice(0, 5 - (vehForm.images?.length || 0));
    if (!picked.length) return;
    setUploadingVehImages(true);
    try {
      const fd = new FormData();
      picked.forEach(file => fd.append('files', file));
      const result = await call('/uploads', { method:'post', data:fd });
      const uploaded = (result?.files || []).map(f => ({ name:f.name, url:f.url }));
      setVehForm(f => ({ ...f, images:[...(f.images || []), ...uploaded] }));
      show(`✓ ${uploaded.length} vehicle photo${uploaded.length !== 1 ? 's' : ''} uploaded`);
    } catch (e) {
      show(e.response?.data?.message || e.message || 'Vehicle image upload failed', 'error');
    } finally { setUploadingVehImages(false); }
  };

  const saveVehicle = async () => {
    if (!vehForm.category || !vehForm.make.trim() || !vehForm.model.trim()) { show('Category, Make and Model are required', 'error'); return; }
    if (!vehForm.images?.length) { show('Please upload at least one vehicle image', 'error'); return; }
    setSavingVeh(true);
    try {
      const qty = Number(vehForm.quantity)||1;
      const bikeIds = (vehForm.bikeIds||[]).map(x=>String(x||'').trim());
      if (bikeIds.length !== qty || bikeIds.some(x=>!x)) { show(`Enter a unique Bike ID for each of the ${qty} bike(s).`, 'error'); return; }
      if (new Set(bikeIds.map(x=>x.toLowerCase())).size !== bikeIds.length) { show('Bike IDs must be unique.', 'error'); return; }
      const payload = { ...vehForm, bikeIds, batteryCapacityKwh: Number(vehForm.batteryCapacityKwh)||undefined, rangeKm: Number(vehForm.rangeKm)||undefined, pricePerDay: Number(vehForm.pricePerDay)||0, quantity: qty };
      const created = await call('/admin/vehicles', { method:'post', data:payload });
      const list = Array.isArray(created) ? created : (created?.vehicles || [created]);
      setVehicles(prev => [...list, ...prev]);
      setShowAddVeh(false); setVehForm(EMPTY_VEH);
      show(`✓ ${list.length} bike${list.length!==1?'s':''} added with individual Bike IDs.`);
    } catch (e) { show(e.response?.data?.message || 'Failed to add vehicle', 'error'); }
    finally { setSavingVeh(false); }
  };

  const savePart = async () => {
    if (!partForm.sku.trim() || !partForm.name.trim()) { show('SKU and Part Name are required', 'error'); return; }
    setSavingPart(true);
    try {
      const payload = { ...partForm, quantity: Number(partForm.quantity)||0, reorderLevel: Number(partForm.reorderLevel)||5, unitPrice: Number(partForm.unitPrice)||0 };
      const p = await call('/admin/parts', { method:'post', data:payload });
      setParts(prev => [p, ...prev]);
      setShowAddPart(false); setPartForm(EMPTY_PART);
      show('✓ Spare part added to inventory!');
    } catch (e) { show(e.response?.data?.message || 'Failed to add part', 'error'); }
    finally { setSavingPart(false); }
  };

  const doAssign = async () => {
    if (!assignToId) { show('Please select a fleet operator', 'error'); return; }
    const ids = selectedAssignIds.length ? selectedAssignIds : (assignVeh?._id ? [assignVeh._id] : []);
    if (!ids.length) { show('Select at least one Bike ID.', 'error'); return; }
    setAssigning(true);
    try {
      const updated = await call(`/admin/vehicles/${ids[0]}/assign`, { method:'put', data:{ fleetOperatorId: assignToId, vehicleIds: ids } });
      const rows = Array.isArray(updated) ? updated : (updated?.vehicles || [updated]);
      const byId = new Map(rows.map(v=>[String(v._id),v]));
      setVehicles(prev => prev.map(v => byId.get(String(v._id)) || v));
      setAssignVeh(null); setSelectedAssignIds([]); setAssignToId('');
      show(`✓ ${rows.length} Bike ID${rows.length!==1?'s':''} assigned to the fleet operator.`);
    } catch (e) { show(e.response?.data?.message || 'Assignment failed', 'error'); }
    finally { setAssigning(false); }
  };

  const operators = franchiseeList || [];
  const assigned   = vehicles.filter(v => v.franchiseeId);
  const unassigned = vehicles.filter(v => !v.franchiseeId);
  const lowStockParts = parts.filter(p => p.quantity <= p.reorderLevel);
  const TABS = [
    { id:'vehicles', label:'Vehicles',    Icon:Car,     count:vehicles.length },
    { id:'parts',    label:'Spare Parts', Icon:Package, count:parts.length },
  ];
  const fmt = d => d ? new Date(d).toLocaleString('en-IN',{ day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  return <>
    <Toast toast={toast} />
    <PageHeader
      title="Inventory Management"
      sub="Create vehicles and spare parts from the Command Center — assign vehicles to fleet operators. Fleet operators configure rental plans before vehicles are published to customers."
      actions={
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-ghost" onClick={() => { setShowAddPart(true); setActiveTab('parts'); }}>
            <Package size={15} /> Add Spare Part
          </button>
          <button className="btn-primary" onClick={() => { setShowAddVeh(true); setActiveTab('vehicles'); }}>
            <Plus size={15} /> Add Vehicle
          </button>
        </div>
      }
    />

    <MetricGrid metrics={[
      { label: 'Total Vehicles',   value: vehicles.length,       Icon: Car,           color: '#2563eb' },
      { label: 'Assigned',         value: assigned.length,       Icon: CheckCircle,   color: '#16a34a' },
      { label: 'Unassigned',       value: unassigned.length,     Icon: Clock,         color: '#d97706' },
      { label: 'Fleet Operators',  value: operators.length,      Icon: Users,         color: '#7c3aed' },
      { label: 'Spare Parts SKUs', value: parts.length,          Icon: Package,       color: '#0891b2' },
      { label: 'Low Stock Parts',  value: lowStockParts.length,  Icon: AlertTriangle, color: '#dc2626' },
    ]} />

    {/* ── Tab bar ── */}
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
          <span style={{ background: activeTab === t.id ? '#2563eb' : '#e5e7eb', color: activeTab === t.id ? '#fff' : '#374151', borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700 }}>{t.count}</span>
        </button>
      ))}
    </div>

    {/* ── VEHICLES TAB ── */}
    {activeTab === 'vehicles' && <>
      {unassigned.length > 0 && (
        <InfoBanner type="warning" Icon={AlertTriangle}>
          {unassigned.length} vehicle(s) have not been assigned to any fleet operator yet. Click <strong>→ Assign</strong> to assign them.
        </InfoBanner>
      )}
      <Card
        title="Command Center Vehicles"
        badge={`${vehicles.length} vehicles`}
        action={<div style={{display:'flex',gap:8}}><button className="btn-ghost" style={{fontSize:12,padding:'5px 12px'}} disabled={!selectedAssignIds.length} onClick={()=>{if(selectedAssignIds.length){setAssignVeh(vehicles.find(v=>String(v._id)===String(selectedAssignIds[0]))||null);setAssignToId('');}}}>{selectedAssignIds.length?`Assign ${selectedAssignIds.length} selected`:'Select Bike IDs'}</button><button className="btn-primary" style={{ fontSize:12, padding:'5px 14px' }} onClick={() => setShowAddVeh(true)}><Plus size={13} /> Add Vehicle</button></div>}
      >
        {loadingVeh
          ? <Loader />
          : vehicles.length === 0
            ? <div className="empty-state"><Car size={40} style={{ opacity:.2, marginBottom:12 }} /><p>No vehicles yet. Click <strong>Add Vehicle</strong> to create your first vehicle.</p></div>
            : <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Bike ID</th>
                      <th>Vehicle</th>
                      <th>Category</th>
                      <th>Reg. No.</th>
                      <th>Battery / Range</th>
                      <th>Charging</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Assigned To</th>
                      <th>Lifecycle</th>
                      <th>Customer</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v, i) => {
                      const isAssigned = !!v.franchiseeId;
                      return (
                        <tr key={v._id || i}>
                          <td>
                            <input type="checkbox" checked={selectedAssignIds.includes(v._id)} disabled={isAssigned} onChange={e=>setSelectedAssignIds(prev=>e.target.checked?[...prev,v._id]:prev.filter(id=>id!==v._id))} />
                          </td>
                          <td><span style={{fontFamily:'monospace',fontWeight:800,color:'#0f766e',background:'#ecfdf5',padding:'4px 8px',borderRadius:7,fontSize:11}}>{v.bikeId || '—'}</span></td>
                          <td>
                            <div style={{ fontWeight:700, fontSize:13 }}>{v.make} {v.model}</div>
                            <div style={{ fontSize:11, color:'#9ca3af' }}>{v.year}{v.year && v.color ? ' · ' : ''}{v.color}</div>
                          </td>
                          <td style={{ fontSize:12 }}>{v.category || '—'}</td>
                          <td style={{ fontFamily:'monospace', fontSize:11, color:'#1d4ed8' }}>{v.registrationNo || '—'}</td>
                          <td style={{ fontSize:12 }}>
                            {v.batteryCapacityKwh ? `${v.batteryCapacityKwh} kWh` : '—'}
                            {v.rangeKm ? ` / ${v.rangeKm} km` : ''}
                          </td>
                          <td style={{ fontSize:12 }}>{v.chargingType || '—'}</td>
                          <td style={{ fontWeight:700, fontSize:13 }}>₹{Number(v.pricePerDay || 0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign:'center', fontWeight:700 }}>{v.quantity ?? 1}</td>
                          <td>
                            {isAssigned
                              ? <div>
                                  <div style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>✓ {v.franchiseeName || '—'}</div>
                                  <div style={{ fontSize:11, color:'#9ca3af' }}>{v.franchiseeEmail || ''}</div>
                                </div>
                              : <span style={{ fontSize:12, color:'#d97706', fontWeight:600 }}>⏳ Not assigned</span>
                            }
                          </td>
                          <td>
                            <span className="status-pill" style={{background:v.lifecycleStatus==='AT_CUSTOMER'?'#dcfce7':v.lifecycleStatus==='HANDOVER_READY'?'#f3e8ff':v.lifecycleStatus==='AT_FLEET'?'#eff6ff':'#fef3c7',color:v.lifecycleStatus==='AT_CUSTOMER'?'#166534':v.lifecycleStatus==='HANDOVER_READY'?'#7e22ce':v.lifecycleStatus==='AT_FLEET'?'#1d4ed8':'#92400e'}}>{String(v.lifecycleStatus||'—').replaceAll('_',' ')}</span>
                          </td>
                          <td style={{fontSize:12,color:'#475569'}}>{v.currentCustomer?.name || (v.pendingHandover ? 'Handover pending' : '—')}</td>
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn-ghost" style={{ padding:'3px 10px', fontSize:11 }} onClick={() => setSelectedVeh(v)}>View</button>
                              <button style={{
                                padding:'3px 12px', fontSize:11, cursor:'pointer', fontWeight:700, borderRadius:6,
                                border: isAssigned ? '1px solid #2563eb' : 'none',
                                background: isAssigned ? '#eff6ff' : '#2563eb',
                                color: isAssigned ? '#2563eb' : '#fff',
                              }}
                                onClick={() => { setAssignVeh(v); setSelectedAssignIds([v._id]); setAssignToId(v.franchiseeId ? String(v.franchiseeId) : ''); }}>
                                {isAssigned ? '⟳ Reassign' : '→ Assign'}
                              </button>
                            </div>
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

    {/* ── SPARE PARTS TAB ── */}
    {activeTab === 'parts' && (
      <Card
        title="Spare Parts Inventory"
        badge={`${parts.length} SKUs`}
        action={<button className="btn-primary" style={{ fontSize:12, padding:'5px 14px' }} onClick={() => setShowAddPart(true)}><Plus size={13} /> Add Spare Part</button>}
      >
        {loadingParts
          ? <Loader />
          : parts.length === 0
            ? <div className="empty-state"><Package size={40} style={{ opacity:.2, marginBottom:12 }} /><p>No spare parts yet. Click <strong>Add Spare Part</strong> to begin tracking inventory.</p></div>
            : <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Part Code (SKU)</th>
                      <th>Part Name</th>
                      <th>Category</th>
                      <th>Manufacturer</th>
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
                          <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#1d4ed8', background:'#eff6ff', padding:'2px 8px', borderRadius:5, fontSize:12 }}>{p.sku || '—'}</span></td>
                          <td style={{ fontWeight:600 }}>{p.name || '—'}</td>
                          <td><span style={{ fontSize:11, background:'#f3f4f6', padding:'2px 7px', borderRadius:4, color:'#374151' }}>{p.category || 'General'}</span></td>
                          <td style={{ fontSize:12, color:'#6b7280' }}>{p.manufacturer || '—'}</td>
                          <td style={{ fontWeight:700, color: isLow ? '#dc2626' : '#16a34a' }}>{p.quantity ?? 0}</td>
                          <td style={{ color:'#6b7280' }}>{p.reorderLevel ?? 5}</td>
                          <td>₹{Number(p.unitPrice || 0).toLocaleString('en-IN')}</td>
                          <td><span className="status-pill" style={{ background: isLow ? '#fee2e2' : '#dcfce7', color: isLow ? '#991b1b' : '#166534' }}>{isLow ? '⚠ Low Stock' : '✓ In Stock'}</span></td>
                          <td><button className="btn-ghost" style={{ padding:'3px 10px', fontSize:11 }} onClick={() => setSelectedPart(p)}>View Details</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
        }
      </Card>
    )}

    {/* ══ ADD VEHICLE MODAL ══ */}
    {showAddVeh && (
      <div className="modal-overlay" onClick={() => setShowAddVeh(false)}>
        <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(680px,100%)' }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">Add Vehicle to Inventory</div>
              <div className="modal-subtitle">Enter complete vehicle details — you can assign it to a fleet operator after saving</div>
            </div>
            <button className="icon-btn" onClick={() => setShowAddVeh(false)}><X size={20} /></button>
          </div>
          <div className="modal-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="fld">
                <label className="fld-label">Category <span style={{color:'#dc2626'}}>*</span></label>
                <select className="fld-input" value={vehForm.category} onChange={vf('category')}>
                  <option value="">— Select —</option>
                  <option>2-wheeler</option><option>3-wheeler</option><option>4-wheeler</option><option>Commercial</option>
                </select>
              </div>
              <div className="fld">
                <label className="fld-label">Make / Brand <span style={{color:'#dc2626'}}>*</span></label>
                <input className="fld-input" placeholder="e.g. Ather" value={vehForm.make} onChange={vf('make')} />
              </div>
              <div className="fld">
                <label className="fld-label">Model Name <span style={{color:'#dc2626'}}>*</span></label>
                <input className="fld-input" placeholder="e.g. 450X" value={vehForm.model} onChange={vf('model')} />
              </div>
              <div className="fld">
                <label className="fld-label">Year of Manufacture</label>
                <input className="fld-input" placeholder="e.g. 2024" value={vehForm.year} onChange={vf('year')} />
              </div>
              <div className="fld">
                <label className="fld-label">Color</label>
                <input className="fld-input" placeholder="e.g. Midnight Blue" value={vehForm.color} onChange={vf('color')} />
              </div>
              <div className="fld">
                <label className="fld-label">Registration No.</label>
                <input className="fld-input" placeholder="e.g. TN09AB1234" value={vehForm.registrationNo} onChange={vf('registrationNo')} />
              </div>
              <div className="fld">
                <label className="fld-label">Chassis / VIN Number</label>
                <input className="fld-input" placeholder="Vehicle chassis / VIN" value={vehForm.chassisNo} onChange={vf('chassisNo')} />
              </div>
              <div className="fld">
                <label className="fld-label">Motor Number</label>
                <input className="fld-input" placeholder="Motor / engine number" value={vehForm.motorNo} onChange={vf('motorNo')} />
              </div>
              <div className="fld">
                <label className="fld-label">Insurance Expiry</label>
                <input className="fld-input" type="date" value={vehForm.insuranceExpiry} onChange={vf('insuranceExpiry')} />
              </div>
              <div className="fld">
                <label className="fld-label">Odometer (km)</label>
                <input className="fld-input" type="number" min="0" placeholder="e.g. 12450" value={vehForm.odometerKm} onChange={vf('odometerKm')} />
              </div>
              <div className="fld">
                <label className="fld-label">Seating Capacity</label>
                <input className="fld-input" type="number" min="1" placeholder="e.g. 2" value={vehForm.seatingCapacity} onChange={vf('seatingCapacity')} />
              </div>
              <div className="fld">
                <label className="fld-label">Top Speed (km/h)</label>
                <input className="fld-input" type="number" min="0" placeholder="e.g. 80" value={vehForm.topSpeedKph} onChange={vf('topSpeedKph')} />
              </div>
              <div className="fld">
                <label className="fld-label">Battery Capacity (kWh)</label>
                <input className="fld-input" type="number" placeholder="e.g. 2.9" value={vehForm.batteryCapacityKwh} onChange={vf('batteryCapacityKwh')} />
              </div>
              <div className="fld">
                <label className="fld-label">Range (km)</label>
                <input className="fld-input" type="number" placeholder="e.g. 116" value={vehForm.rangeKm} onChange={vf('rangeKm')} />
              </div>
              <div className="fld">
                <label className="fld-label">Charging Type</label>
                <select className="fld-input" value={vehForm.chargingType} onChange={vf('chargingType')}>
                  <option value="">— Select —</option>
                  <option>Fast Charging</option><option>Normal Charging</option><option>Swappable Battery</option>
                </select>
              </div>
              <div className="fld">
                <label className="fld-label">Reference Sale Price (₹)</label>
                <input className="fld-input" type="number" placeholder="e.g. 125000" value={vehForm.pricePerDay} onChange={vf('pricePerDay')} />
              </div>
              <div className="fld">
                <label className="fld-label">Quantity</label>
                <input className="fld-input" type="number" min="1" placeholder="1" value={vehForm.quantity} onChange={e=>{const q=Math.max(1,Number(e.target.value)||1);setVehForm(f=>{const ids=[...(f.bikeIds||[])];while(ids.length<q)ids.push('');return {...f,quantity:String(q),bikeIds:ids.slice(0,q)}})}} />
              </div>
            </div>
            <div className="command-bike-id-panel">
              <div className="command-bike-id-head"><div><strong>Individual Bike IDs</strong><small>Every physical bike gets its own permanent ID for assignment, service and alerts.</small></div><span>{(vehForm.bikeIds||[]).length} ID{(vehForm.bikeIds||[]).length!==1?'s':''}</span></div>
              <div className="command-bike-id-grid">{(vehForm.bikeIds||['']).map((id,idx)=><div className="command-bike-id-row" key={idx}><span>{String(idx+1).padStart(2,'0')}</span><input className="fld-input" value={id} placeholder={`e.g. ALV-BIKE-${String(idx+1).padStart(3,'0')}`} onChange={e=>setVehForm(f=>({...f,bikeIds:(f.bikeIds||[]).map((x,i)=>i===idx?e.target.value:x)}))}/></div>)}</div>
            </div>
            <div className="command-vehicle-media">
              <div className="command-vehicle-media-head">
                <div><strong>Vehicle Photos</strong><small>Upload clear exterior, dashboard and vehicle-detail photos. Up to 5.</small></div>
                <label className="command-upload-btn">
                  <UploadCloud size={15} /> {uploadingVehImages ? 'Uploading…' : 'Upload Photos'}
                  <input type="file" accept="image/*" multiple hidden disabled={uploadingVehImages || (vehForm.images?.length || 0) >= 5} onChange={e => { uploadVehicleImages(e.target.files); e.target.value=''; }} />
                </label>
              </div>
              <div className="command-vehicle-photo-grid">
                {(vehForm.images || []).map((img, i) => (
                  <div className="command-vehicle-photo" key={`${img.url}-${i}`}>
                    <img src={img.url} alt={img.name || 'Vehicle'} />
                    <button type="button" onClick={() => setVehForm(f => ({ ...f, images:(f.images || []).filter((_, idx) => idx !== i) }))}>×</button>
                  </div>
                ))}
                {!vehForm.images?.length && <div className="command-vehicle-photo-empty"><Image size={22}/><span>Add the vehicle photos here</span></div>}
              </div>
            </div>
            <div className="fld" style={{ marginTop:10 }}>
              <label className="fld-label">Description / Notes</label>
              <textarea className="fld-input" rows={3} placeholder="Additional features or notes…" value={vehForm.description} onChange={vf('description')} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => setShowAddVeh(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveVehicle} disabled={savingVeh}>
              {savingVeh ? 'Saving…' : <><Save size={14} /> Save Vehicle</>}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══ ADD SPARE PART MODAL ══ */}
    {showAddPart && (
      <div className="modal-overlay" onClick={() => setShowAddPart(false)}>
        <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(580px,100%)' }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">Add Spare Part</div>
              <div className="modal-subtitle">Add a spare part to the Command Center inventory</div>
            </div>
            <button className="icon-btn" onClick={() => setShowAddPart(false)}><X size={20} /></button>
          </div>
          <div className="modal-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="fld">
                <label className="fld-label">Part Code (SKU) <span style={{color:'#dc2626'}}>*</span></label>
                <input className="fld-input" placeholder="e.g. BAT-CELL-4801" value={partForm.sku} onChange={pf('sku')} />
              </div>
              <div className="fld">
                <label className="fld-label">Part Name <span style={{color:'#dc2626'}}>*</span></label>
                <input className="fld-input" placeholder="e.g. Battery Cell Pack" value={partForm.name} onChange={pf('name')} />
              </div>
              <div className="fld">
                <label className="fld-label">Category</label>
                <select className="fld-input" value={partForm.category} onChange={pf('category')}>
                  <option value="">— Select —</option>
                  <option>Battery &amp; Charging</option><option>Motor &amp; Drive</option>
                  <option>Brakes &amp; Suspension</option><option>Tyres &amp; Wheels</option>
                  <option>Body &amp; Frame</option><option>Electronics &amp; Controls</option>
                  <option>Lighting</option><option>Fasteners &amp; Hardware</option>
                  <option>General</option><option>Other</option>
                </select>
              </div>
              <div className="fld">
                <label className="fld-label">Manufacturer</label>
                <input className="fld-input" placeholder="e.g. LG Energy" value={partForm.manufacturer} onChange={pf('manufacturer')} />
              </div>
              <div className="fld">
                <label className="fld-label">Quantity in Stock</label>
                <input className="fld-input" type="number" min="0" placeholder="0" value={partForm.quantity} onChange={pf('quantity')} />
              </div>
              <div className="fld">
                <label className="fld-label">Reorder Level</label>
                <input className="fld-input" type="number" min="0" placeholder="5" value={partForm.reorderLevel} onChange={pf('reorderLevel')} />
              </div>
              <div className="fld">
                <label className="fld-label">Unit Price (₹)</label>
                <input className="fld-input" type="number" min="0" placeholder="0" value={partForm.unitPrice} onChange={pf('unitPrice')} />
              </div>
            </div>
            <div className="fld" style={{ marginTop:10 }}>
              <label className="fld-label">Description / Notes</label>
              <textarea className="fld-input" rows={2} placeholder="Optional notes…" value={partForm.description} onChange={pf('description')} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => setShowAddPart(false)}>Cancel</button>
            <button className="btn-primary" onClick={savePart} disabled={savingPart}>
              {savingPart ? 'Saving…' : <><Save size={14} /> Add to Inventory</>}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══ ASSIGN VEHICLE MODAL ══ */}
    {assignVeh && (
      <div className="modal-overlay" onClick={() => { setAssignVeh(null); setAssignToId(''); }}>
        <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(500px,100%)' }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">Assign to Fleet Operator</div>
              <div className="modal-subtitle">{assignVeh.make} {assignVeh.model}{assignVeh.registrationNo ? ` · ${assignVeh.registrationNo}` : ''}</div>
            </div>
            <button className="icon-btn" onClick={() => { setAssignVeh(null); setAssignToId(''); }}><X size={20} /></button>
          </div>
          <div className="modal-body"><div className="assign-bike-summary"><div><strong>{selectedAssignIds.length} Bike ID{selectedAssignIds.length!==1?'s':''} selected</strong><span>These individual bikes will move to the selected fleet operator.</span></div><div className="assign-bike-chips">{vehicles.filter(v=>selectedAssignIds.includes(v._id)).map(v=><span key={v._id}>{v.bikeId||v.registrationNo||v._id}</span>)}</div></div>
            
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'14px 18px', marginBottom:18, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ background:'#2563eb', color:'#fff', borderRadius:10, width:46, height:46, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                {assignVeh.category === '2-wheeler' ? '🛵' : assignVeh.category === '3-wheeler' ? '🛺' : '🚗'}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:'#1e3a8a' }}>{assignVeh.make} {assignVeh.model}</div>
                <div style={{ fontSize:12, color:'#3b82f6', marginTop:2 }}>{assignVeh.category}{assignVeh.year ? ` · ${assignVeh.year}` : ''}{assignVeh.color ? ` · ${assignVeh.color}` : ''}</div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:1 }}>₹{Number(assignVeh.pricePerDay || 0).toLocaleString('en-IN')} · Qty: {assignVeh.quantity ?? 1}</div>
              </div>
            </div>

            {assignVeh.franchiseeId && (
              <InfoBanner type="warning" Icon={AlertTriangle}>
                Currently assigned to <strong>{assignVeh.franchiseeName}</strong>. Selecting a new operator will reassign it.
              </InfoBanner>
            )}

            <div className="fld">
              <label className="fld-label">Select Fleet Operator <span style={{color:'#dc2626'}}>*</span></label>
              <select className="fld-input" value={assignToId} onChange={e => setAssignToId(e.target.value)}>
                <option value="">— Select Fleet Operator —</option>
                {operators.map(op => (
                  <option key={op._id} value={op._id}>
                    {op.name} · {op.email}{op.address?.city ? ` · ${op.address.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {assignToId && (
              <InfoBanner Icon={CheckCircle}>
                After assigning, this vehicle will appear in the fleet operator's <strong>Inventory</strong> and will be visible to their customers.
              </InfoBanner>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => { setAssignVeh(null); setAssignToId(''); }}>Cancel</button>
            <button className="btn-primary" onClick={doAssign} disabled={assigning || !assignToId}>
              {assigning ? 'Assigning…' : '→ Assign to Fleet Operator'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══ VEHICLE DETAIL MODAL ══ */}
    {selectedVeh && (
      <div className="modal-overlay" onClick={() => setSelectedVeh(null)}>
        <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(620px,100%)' }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">Vehicle Details</div>
              <div className="modal-subtitle">{selectedVeh.make} {selectedVeh.model}</div>
            </div>
            <button className="icon-btn" onClick={() => setSelectedVeh(null)}><X size={20} /></button>
          </div>
          <div className="modal-body">
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ background:'#2563eb', color:'#fff', borderRadius:10, width:52, height:52, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                {selectedVeh.category === '2-wheeler' ? '🛵' : selectedVeh.category === '3-wheeler' ? '🛺' : '🚗'}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#2563eb', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:3 }}>{selectedVeh.category || 'Vehicle'}</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#1e3a8a' }}>{selectedVeh.make} {selectedVeh.model}</div>
                <div style={{ fontSize:12, color:'#3b82f6', marginTop:2, fontFamily:'monospace' }}>{selectedVeh.registrationNo || '—'}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              <span className="status-pill" style={{ background:'#dcfce7', color:'#166534', fontSize:13, padding:'4px 14px' }}>✓ In Inventory</span>
              {selectedVeh.franchiseeName && <span className="status-pill" style={{ background:'#eff6ff', color:'#2563eb', fontSize:13, padding:'4px 14px' }}>Assigned: {selectedVeh.franchiseeName}</span>}
              {!selectedVeh.franchiseeId && <span className="status-pill" style={{ background:'#fef9c3', color:'#713f12', fontSize:13, padding:'4px 14px' }}>⏳ Not yet assigned</span>}
              {selectedVeh.year && <span className="status-pill" style={{ background:'#f5f3ff', color:'#5b21b6', fontSize:13, padding:'4px 14px' }}>Year: {selectedVeh.year}</span>}
              {selectedVeh.color && <span className="status-pill" style={{ background:'#f3f4f6', color:'#374151', fontSize:13, padding:'4px 14px' }}>{selectedVeh.color}</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', background:'#e5e7eb', borderRadius:10, overflow:'hidden', marginBottom:14 }}>
              {[
                ['Make / Brand',        selectedVeh.make || '—'],
                ['Model Name',          selectedVeh.model || '—'],
                ['Category',            selectedVeh.category || '—'],
                ['Year',                selectedVeh.year || '—'],
                ['Color',               selectedVeh.color || '—'],
                ['Registration No.',    selectedVeh.registrationNo || '—'],
                ['Battery Capacity',    selectedVeh.batteryCapacityKwh ? `${selectedVeh.batteryCapacityKwh} kWh` : '—'],
                ['Range',               selectedVeh.rangeKm ? `${selectedVeh.rangeKm} km` : '—'],
                ['Charging Type',       selectedVeh.chargingType || '—'],
                ['Price per Unit',      `₹${Number(selectedVeh.pricePerDay || 0).toLocaleString('en-IN')}`],
                ['Quantity',            selectedVeh.quantity ?? 1],
                ['Assigned Fleet Op.',  selectedVeh.franchiseeName || 'Not yet assigned'],
                ['Added At',            fmt(selectedVeh.createdAt)],
              ].map(([k, val]) => (
                <div key={k} style={{ background:'#fff', padding:'12px 16px' }}>
                  <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{k}</div>
                  <div style={{ fontWeight:700, color:'#1a1f2e', fontSize:13 }}>{val}</div>
                </div>
              ))}
            </div>
            {selectedVeh.description && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Description / Notes</div>
                <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>{selectedVeh.description}</div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => setSelectedVeh(null)}>Close</button>
            <button className="btn-primary" onClick={() => { setSelectedVeh(null); setAssignVeh(selectedVeh); setAssignToId(selectedVeh.franchiseeId ? String(selectedVeh.franchiseeId) : ''); }}>
              → {selectedVeh.franchiseeId ? 'Reassign to Fleet Operator' : 'Assign to Fleet Operator'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══ PART DETAIL MODAL ══ */}
    {selectedPart && (() => {
      const p = selectedPart;
      const isLow = p.quantity <= p.reorderLevel;
      return (
        <div className="modal-overlay" onClick={() => setSelectedPart(null)}>
          <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(520px,100%)' }}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Part Details</div>
                <div className="modal-subtitle">{p.name || 'Spare Part'}</div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedPart(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ background:'#1d4ed8', color:'#fff', borderRadius:10, width:48, height:48, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Hash size={22} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:3 }}>Part Code (SKU)</div>
                  <div style={{ fontSize:26, fontWeight:900, fontFamily:'monospace', color:'#1e3a8a', letterSpacing:'.05em' }}>{p.sku || '—'}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <span className="status-pill" style={{ background: isLow ? '#fee2e2' : '#dcfce7', color: isLow ? '#991b1b' : '#166534', fontSize:13, padding:'4px 14px' }}>{isLow ? '⚠ Low Stock' : '✓ In Stock'}</span>
                <span className="status-pill" style={{ background:'#f5f3ff', color:'#5b21b6', fontSize:13, padding:'4px 14px' }}>{p.category || 'General'}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', background:'#e5e7eb', borderRadius:10, overflow:'hidden', marginBottom:14 }}>
                {[
                  ['Part Name',     p.name || '—'],
                  ['Category',      p.category || 'General'],
                  ['Manufacturer',  p.manufacturer || '—'],
                  ['Current Stock', p.quantity ?? 0],
                  ['Reorder Level', p.reorderLevel ?? 5],
                  ['Unit Price',    `₹${Number(p.unitPrice || 0).toLocaleString('en-IN')}`],
                  ['Total Value',   `₹${Number((p.unitPrice || 0) * (p.quantity || 0)).toLocaleString('en-IN')}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ background:'#fff', padding:'12px 16px' }}>
                    <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{k}</div>
                    <div style={{ fontWeight:700, color:'#1a1f2e', fontSize:13 }}>{v}</div>
                  </div>
                ))}
              </div>
              {p.description && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Description</div>
                  <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#374151', lineHeight:1.6 }}>{p.description}</div>
                </div>
              )}
              {isLow && <InfoBanner Icon={AlertTriangle}>Stock ({p.quantity}) is at or below reorder level ({p.reorderLevel}). Consider restocking.</InfoBanner>}
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

  // ── detect if a vehicle was edited after initial submission ──────
  const isEdited = v => {
    if (!v.updatedAt || !v.createdAt) return false;
    return (new Date(v.updatedAt) - new Date(v.createdAt)) > 8000; // >8s gap → edited
  };

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
          {pending.map(v => {
            const edited = isEdited(v);
            const editedAgo = edited ? (() => {
              const diff = Date.now() - new Date(v.updatedAt);
              const m = Math.floor(diff / 60000);
              if (m < 1) return 'just now';
              if (m < 60) return `${m}m ago`;
              const h = Math.floor(m / 60);
              if (h < 24) return `${h}h ago`;
              return `${Math.floor(h/24)}d ago`;
            })() : null;
            return (
            <div key={v._id} className={`approval-card${edited ? ' approval-card--edited' : ''}`}>
              {/* Image strip — show all thumbs */}
              {v.images?.length > 0 && (
                <div className="approval-img-strip">
                  {v.images.map((img, i) => (
                    <div key={i} className="approval-img">
                      <img src={img.url} alt={img.name || `Photo ${i+1}`} />
                      {i === 0 && v.images.length > 1 && (
                        <span className="img-count">+{v.images.length - 1}</span>
                      )}
                    </div>
                  )).slice(0, 1)}
                </div>
              )}
              <div className="approval-body">
                {/* Title row with EDITED badge */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                  <div className="approval-title">
                    {v.category === '2-wheeler' ? '🛵' : v.category === '3-wheeler' ? '🛺' : '🚗'}
                    &nbsp;{v.make} {v.model} {v.year ? `(${v.year})` : ''}
                  </div>
                  {edited && (
                    <span className="edited-badge">
                      ✏ Edited {editedAgo}
                    </span>
                  )}
                </div>

                {/* Key fields — highlight changed ones */}
                <div className="approval-meta">
                  <span className="approval-field">
                    <span className="field-label">Reg:</span> {v.registrationNo || '—'}
                  </span>
                  <span className="approval-field approval-field--price">
                    <span className="field-label">Price:</span> ₹{(v.pricePerDay||0).toLocaleString('en-IN')}/unit
                  </span>
                  <span className="approval-field approval-field--qty">
                    <span className="field-label">Stock:</span> {v.quantity ?? 0} units
                  </span>
                  {v.rangeKm && <span className="approval-field"><span className="field-label">Range:</span> {v.rangeKm} km</span>}
                  {v.color   && <span className="approval-field"><span className="field-label">Color:</span> {v.color}</span>}
                  {v.chargingType && <span className="approval-field"><span className="field-label">⚡</span> {v.chargingType}</span>}
                </div>

                {/* Images count indicator */}
                {v.images?.length > 0 && (
                  <div style={{ fontSize:11, color:'#6b7280', marginBottom:3, display:'flex', alignItems:'center', gap:4 }}>
                    <span>🖼</span> {v.images.length} photo{v.images.length !== 1 ? 's' : ''} attached
                  </div>
                )}

                <div className="approval-franchise">
                  Submitted by: <strong>{v.franchiseeName}</strong>
                  {v.franchiseeEmail && <> ({v.franchiseeEmail})</>}
                  &nbsp;·&nbsp;{new Date(v.createdAt).toLocaleString()}
                  {edited && (
                    <span style={{ color:'#d97706', fontWeight:600, marginLeft:6 }}>
                      · Last edited: {new Date(v.updatedAt).toLocaleString()}
                    </span>
                  )}
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
            );
          })}
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
        {/* Edited indicator inside modal */}
        {isEdited(selected) && (
          <div style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:10,
            padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>✏️</span>
            <div>
              <div style={{ fontWeight:700, color:'#92400e', fontSize:13 }}>This listing was edited after submission</div>
              <div style={{ fontSize:12, color:'#b45309' }}>
                Originally submitted: {new Date(selected.createdAt).toLocaleString()}<br/>
                Last edited: <strong>{new Date(selected.updatedAt).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        )}
        {selected.images?.length > 0 && (
          <div className="img-grid" style={{ marginBottom: 16 }}>
            {selected.images.map((img, i) => (
              <div key={i} className="img-thumb"><img src={img.url} alt={img.name} /></div>
            ))}
          </div>
        )}
        <div className="kv-list">
          {[
            ['Category',     selected.category],
            ['Make',         selected.make],
            ['Model',        selected.model],
            ['Year',         selected.year],
            ['Color',        selected.color],
            ['Registration', selected.registrationNo],
            ['Battery',      selected.batteryCapacityKwh ? `${selected.batteryCapacityKwh} kWh` : '—'],
            ['Range',        selected.rangeKm ? `${selected.rangeKm} km` : '—'],
            ['Charging',     selected.chargingType],
            ['Price/Unit',   `₹${(selected.pricePerDay||0).toLocaleString('en-IN')}`],
            ['Quantity',     selected.quantity ?? 1],
            ['Fleet Operator',   selected.franchiseeName],
            ['Email',        selected.franchiseeEmail],
            ['Submitted',    new Date(selected.createdAt).toLocaleString()],
            ['Last Updated', new Date(selected.updatedAt).toLocaleString()],
          ].map(([k, v]) => (
            <div className="kv-row" key={k}><span>{k}</span><strong>{v || '—'}</strong></div>
          ))}
        </div>
        {selected.description && (
          <p style={{ fontSize:13, color:'#374151', marginTop:12, lineHeight:1.6,
            background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 14px' }}>
            {selected.description}
          </p>
        )}
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
                    Fleet Operator: <strong>{s.franchiseeName}</strong> · {new Date(s.createdAt).toLocaleString()}
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
            ['Fleet Operator',     selectedStaff.franchiseeName],
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
            {showFranchisee && <th>Fleet Operator</th>}
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
                  {['Name', 'Email', 'Phone', 'Location', 'KYC', 'Verified', 'Password', 'Registered', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.customers?.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No customers found.</td></tr>
                )}
                {data.customers?.map(c => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{c.email}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b', maxWidth:160 }}>{[c.address?.district,c.address?.state,c.address?.pincode].filter(Boolean).join(' · ') || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{badge(!!(c.aadharNumber && c.panNumber && c.identityDocuments?.aadhar?.url && c.identityDocuments?.pan?.url && c.identityDocuments?.currentBill?.url), (c.aadharNumber && c.panNumber && c.identityDocuments?.aadhar?.url && c.identityDocuments?.pan?.url && c.identityDocuments?.currentBill?.url) ? 'Complete' : 'Pending')}</td>
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

                {/* Customer location + KYC */}
                <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:16, marginBottom:16 }}>
                  <div style={{fontSize:12,fontWeight:800,color:'#374151',marginBottom:10}}>Customer Location & KYC</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {[
                      ['Area',detail.customer?.address?.area||'—'],
                      ['District',detail.customer?.address?.district||'—'],
                      ['State',detail.customer?.address?.state||'—'],
                      ['Pincode',detail.customer?.address?.pincode||'—'],
                      ['Aadhaar Number',detail.customer?.aadharNumber||'—'],
                      ['PAN Number',detail.customer?.panNumber||'—'],
                    ].map(([k,v])=><div key={k}><div style={{fontSize:11,color:'#64748b'}}>{k}</div><div style={{fontSize:13,fontWeight:700}}>{v}</div></div>)}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginTop:12}}>
                    {[['aadhar','Aadhaar'],['pan','PAN card'],['currentBill','Current bill']].map(([key,label])=>{const d=detail.customer?.identityDocuments?.[key];return <div key={key} style={{padding:9,border:'1px solid #e2e8f0',borderRadius:8,background:'#fff'}}><div style={{fontSize:11,fontWeight:700}}>{label}</div>{d?.url?<a href={`${API}${d.url}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#2563eb',fontWeight:700}}>View ↗</a>:<span style={{fontSize:10,color:'#94a3b8'}}>Not uploaded</span>}</div>})}
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

                {/* Connected vehicle lifecycle */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#374151' }}>Vehicle Purchases / Rentals ({detail.rentals?.length || 0})</div>
                  {!detail.rentals?.length ? <div style={{color:'#94a3b8',fontSize:13}}>No vehicle purchase or rental records.</div> : <div style={{display:'grid',gap:8}}>
                    {detail.rentals.slice(0,12).map(r=>{const vs=r.vehicleSnapshot||{};const status=r.handoverDate&&!r.returnDate?(r.rentalPlan==='SALE'?'HANDED OVER':'ACTIVE'):(r.paymentStatus==='PAID'?'HANDOVER READY':r.status||'BOOKED');return <div key={r._id} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:9,padding:'10px 12px',fontSize:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong>{vs.make||r.vehicleId?.make||''} {vs.model||r.vehicleId?.model||'Vehicle'}</strong><span className="status-pill" style={{background:status==='ACTIVE'||status==='HANDED OVER'?'#dcfce7':status==='HANDOVER READY'?'#f3e8ff':'#f1f5f9',color:status==='ACTIVE'||status==='HANDED OVER'?'#166534':status==='HANDOVER READY'?'#7e22ce':'#475569'}}>{status}</span></div>
                      <div style={{color:'#64748b',marginTop:4}}>Bike {r.bikeId||vs.bikeId||r.vehicleId?.bikeId||'—'} · {r.rentalPlan||'SALE'} · ₹{Number(r.totalAmount||0).toLocaleString('en-IN')}</div>
                    </div>})}
                  </div>}
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
// COMMAND CENTER — CUSTOMER PAYMENTS (Vehicle Sales)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// COMMAND CENTER — WALLET RECHARGES
// Shows all customer wallet recharge transactions with details
// ══════════════════════════════════════════════════════════════════
function AdminWalletRecharges({ call }) {
  const [data,     setData]     = React.useState(null);
  const [loading,  setLoading]  = React.useState(true);
  const [error,    setError]    = React.useState(null);
  const [search,   setSearch]   = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [filter,   setFilter]   = React.useState('ALL');

  const load = React.useCallback(() => {
    setLoading(true); setError(null);
    // Try /admin/wallet-transactions first, fall back to /admin/wallet-recharges
    call('/admin/wallet-transactions')
      .then(d => { setData(Array.isArray(d) ? d : (d?.transactions || [])); setLoading(false); })
      .catch(() => {
        // fallback: pull from purchases where walletAmount > 0 or from customer list
        call('/admin/purchases')
          .then(purchases => {
            // Build synthetic recharge list from wallet credits in purchases
            const recharges = (Array.isArray(purchases) ? purchases : [])
              .filter(p => p.walletAmount && Number(p.walletAmount) > 0)
              .map(p => ({
                _id: p._id + '_wallet',
                customerId: p.customerId,
                amount: Number(p.walletAmount),
                type: 'DEBIT',
                description: `Wallet deducted for vehicle purchase`,
                referenceType: 'PURCHASE',
                referenceId: p._id,
                createdAt: p.createdAt,
                paymentId: p.razorpayPaymentId || '—',
              }));
            setData(recharges);
            setLoading(false);
          })
          .catch(e => { setError(e.message || 'Failed to load wallet data'); setLoading(false); });
      });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtFull = d => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const filtered = (data || []).filter(tx => {
    const q = search.toLowerCase();
    const cust = tx.customerId || {};
    const matchSearch = !q ||
      (cust.name || '').toLowerCase().includes(q) ||
      (cust.email || '').toLowerCase().includes(q) ||
      (tx.description || '').toLowerCase().includes(q) ||
      (tx.paymentId || tx.referenceId || '').toLowerCase().includes(q);
    const matchFilter = filter === 'ALL' ||
      (filter === 'CREDIT' && (tx.type === 'CREDIT' || tx.amount > 0)) ||
      (filter === 'DEBIT'  && (tx.type === 'DEBIT'  || tx.amount < 0));
    return matchSearch && matchFilter;
  });

  const totalCredited = filtered.filter(t => t.type === 'CREDIT' || t.amount > 0).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const totalDebited  = filtered.filter(t => t.type === 'DEBIT'  || t.amount < 0).reduce((s, t) => s + Math.abs(t.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Wallet Recharges"
        sub="All customer wallet transactions — recharges and deductions across the network"
        actions={
          <button className="btn-ghost" onClick={load} style={{ fontSize: 13 }}>
            <RefreshCw size={14} style={{ display: 'inline', marginRight: 4 }} />
            Refresh
          </button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Transactions', value: (data||[]).length,          color: '#2563eb', icon: '📋' },
          { label: 'Credits',            value: (data||[]).filter(t=>t.type==='CREDIT'||t.amount>0).length, color: '#16a34a', icon: '↓' },
          { label: 'Debits',             value: (data||[]).filter(t=>t.type==='DEBIT'||t.amount<0).length,  color: '#dc2626', icon: '↑' },
          { label: 'Total Credited',     value: `₹${totalCredited.toLocaleString('en-IN')}`, color: '#16a34a', icon: '💚' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid #e4e7ef', borderRadius: 12,
            padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{icon} {value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Search customer name, email, payment ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 13, width: 280, outline: 'none',
          }}
        />
        {['ALL', 'CREDIT', 'DEBIT'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: filter === f ? '1.5px solid #2563eb' : '1.5px solid #e4e7ef',
            background: filter === f ? '#eff6ff' : '#fff',
            color: filter === f ? '#2563eb' : '#6b7280',
          }}>
            {f === 'ALL' ? `All (${(data||[]).length})` : f === 'CREDIT' ? `Credits (${(data||[]).filter(t=>t.type==='CREDIT'||t.amount>0).length})` : `Debits (${(data||[]).filter(t=>t.type==='DEBIT'||t.amount<0).length})`}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
          Showing {filtered.length} of {(data||[]).length} records
        </span>
      </div>

      {loading && <Loader />}
      {error   && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: 20, borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠ Could not load wallet data</div>
          <div style={{ fontSize: 13 }}>{error}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Make sure <code style={{background:'#fee2e2',padding:'1px 6px',borderRadius:4}}>/api/admin/wallet-transactions</code> is implemented in the backend.
          </div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #e4e7ef', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e4e7ef' }}>
                {['Customer', 'Amount', 'Type', 'Description', 'Reference', 'Date & Time'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    {search ? `No wallet transactions matching "${search}"` : 'No wallet transactions found.'}
                  </td>
                </tr>
              )}
              {filtered.map((tx, i) => {
                const isCredit = tx.type === 'CREDIT' || tx.amount > 0;
                const cust = tx.customerId || {};
                return (
                  <tr key={tx._id || i}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background .1s' }}
                    onClick={() => setSelected(selected?._id === tx._id ? null : tx)}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background=''}
                  >
                    {/* Customer */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#1a1f2e' }}>{cust.name || '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{cust.email || '—'}</div>
                      {cust.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>{cust.phone}</div>}
                    </td>
                    {/* Amount */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontWeight: 800, fontSize: 15,
                        color: isCredit ? '#16a34a' : '#dc2626',
                      }}>
                        {isCredit ? '+' : '−'}₹{Math.abs(tx.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    {/* Type badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: isCredit ? '#dcfce7' : '#fee2e2',
                        color:      isCredit ? '#166534' : '#991b1b',
                      }}>
                        {isCredit ? '↓ CREDIT' : '↑ DEBIT'}
                      </span>
                    </td>
                    {/* Description */}
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151', maxWidth: 200 }}>
                      {tx.description || (isCredit ? 'Wallet Recharge' : 'Wallet Deduction')}
                    </td>
                    {/* Reference */}
                    <td style={{ padding: '12px 14px' }}>
                      {tx.referenceType && (
                        <span style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 7px', borderRadius: 4, color: '#374151', display:'block', marginBottom: 3 }}>
                          {tx.referenceType}
                        </span>
                      )}
                      {(tx.paymentId || tx.referenceId) && (
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                          {(tx.paymentId || tx.referenceId || '').substring(0, 18)}…
                        </span>
                      )}
                    </td>
                    {/* Date */}
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>
                      {fmtFull(tx.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: '#fff', width: 'min(460px,100%)', height: '100%',
            overflowY: 'auto', padding: 28, boxShadow: '-4px 0 32px rgba(0,0,0,.12)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1a1f2e' }}>Transaction Details</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {(selected.type === 'CREDIT' || selected.amount > 0) ? '💚 Wallet Recharge / Credit' : '🔴 Wallet Deduction / Debit'}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {/* Amount hero */}
            <div style={{
              textAlign: 'center', padding: '24px 0', marginBottom: 20,
              background: (selected.type === 'CREDIT' || selected.amount > 0) ? '#f0fdf4' : '#fef2f2',
              borderRadius: 12, border: `1px solid ${(selected.type==='CREDIT'||selected.amount>0)?'#bbf7d0':'#fecaca'}`,
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: (selected.type==='CREDIT'||selected.amount>0)?'#16a34a':'#dc2626' }}>
                {(selected.type==='CREDIT'||selected.amount>0)?'+':'−'}₹{Math.abs(selected.amount||0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                {selected.description || ((selected.type==='CREDIT'||selected.amount>0)?'Wallet Recharge':'Wallet Deduction')}
              </div>
            </div>

            {/* Customer Info */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Customer</div>
              {[
                ['Name',  (selected.customerId?.name  || '—')],
                ['Email', (selected.customerId?.email || '—')],
                ['Phone', (selected.customerId?.phone || '—')],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13, borderBottom:'1px solid #f8fafc' }}>
                  <span style={{ color:'#64748b' }}>{k}</span>
                  <strong style={{ color:'#1a1f2e' }}>{v}</strong>
                </div>
              ))}
            </div>

            {/* Transaction Info */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Transaction</div>
              {[
                ['Type',        selected.type || (selected.amount > 0 ? 'CREDIT' : 'DEBIT')],
                ['Reference',   selected.referenceType || '—'],
                ['Payment ID',  selected.paymentId || selected.referenceId || '—'],
                ['Date',        fmtFull(selected.createdAt)],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13, borderBottom:'1px solid #f8fafc', gap:8 }}>
                  <span style={{ color:'#64748b', flexShrink:0 }}>{k}</span>
                  <strong style={{ color:'#1a1f2e', textAlign:'right', wordBreak:'break-all' }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdminCustomerPayments({ call }) {
  const [purchases, setPurchases]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState('ALL');

  const load = () => {
    setLoading(true); setError(null);
    call('/admin/purchases')
      .then(d => setPurchases(Array.isArray(d) ? d.filter(r => r.paymentStatus === 'PAID') : []))
      .catch(e => setError(e.message || 'Failed to load purchases'))
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
    HANDED_OVER:       '#16a34a',
    CANCELLED:        '#dc2626',
  };

  const filtered = filter === 'ALL' ? purchases : purchases.filter(r => r.status === filter);
  const paid     = purchases.filter(r => r.paymentStatus === 'PAID');
  const total    = paid.reduce((s, r) => s + (r.totalAmount || 0), 0);


  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading customer payments…</div>;
  if (error)   return <div style={{ padding: 24, color: '#dc2626' }}>Error: {error}</div>;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1f2e', margin: 0 }}>Customer Payments</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
          Paid vehicle purchase bookings — refreshes every 30 seconds
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Sales',     value: purchases.length,                                       color: '#2563eb' },
          { label: 'Paid',            value: paid.length,                                           color: '#16a34a' },
          { label: 'Vehicles Handed Over', value: purchases.filter(r=>r.status==='HANDED_OVER').length,         color: '#16a34a' },
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
        {['ALL','PAYMENT_DONE','HANDED_OVER','CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: filter === s ? `1.5px solid ${statusColor[s] || '#2563eb'}` : '1.5px solid #e4e7ef',
            background: filter === s ? (statusColor[s] || '#2563eb') + '18' : '#fff',
            color: filter === s ? (statusColor[s] || '#2563eb') : '#6b7280',
          }}>
            {s === 'ALL' ? `All (${purchases.length})` : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e4e7ef', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Customer', 'Vehicle', 'Amount', 'Payment', 'Purchase Status', 'Purchase Date'].map(h => (
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
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.saleQuantity || r.durationDays} vehicle{(r.saleQuantity || r.durationDays) !== 1 ? 's' : ''}</div>
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
                    <div>{fmt(r.purchaseDate || r.createdAt)}</div>
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
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1a1f2e' }}>Purchase Details</div>
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
                ['Vehicle Price', `₹${(selected.pricePerDay||0).toLocaleString('en-IN')} / vehicle`],
                ['Quantity',     `${selected.saleQuantity || selected.durationDays || 1} vehicle${(selected.saleQuantity || selected.durationDays || 1) !== 1 ? 's' : ''}`],
                ['Purchase Date', fmt(selected.purchaseDate || selected.createdAt)],
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
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: .5 }}>Fleet Operator Pickup Location</div>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                {[selected.pickupLocation?.name || selected.franchiseeName, selected.pickupLocation?.address].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>

            {/* Vehicle delivery status */}
            {selected.status === 'HANDED_OVER' && (
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:14, textAlign:'center', color:'#16a34a', fontWeight:700, fontSize:14 }}>
                ✅ Vehicle handed over to customer — Purchase Complete
                {selected.handoverDate && <div style={{fontSize:12,fontWeight:400,marginTop:4}}>Handed over: {fmt(selected.handoverDate)}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
// ══════════════════════════════════════════════════════════════════
// ADMIN COMPLAINT CENTER — Full complaint lifecycle management
// ══════════════════════════════════════════════════════════════════
function AdminComplaintCenter({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/platform/complaints');
  const { data: staffList } = useFetch(call, '/platform/staff-list');
  const [selected, setSelected] = useState(null);
  const [viewCard, setViewCard] = useState(null);
  const [modalTab, setModalTab] = useState('details');
  const [filterTab, setFilterTab] = useState('open');
  const [vehicleHistory, setVehicleHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [spareNote, setSpareNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  const complaints = data || [];
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
  const daysSince = d => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : 0;

  const STATUS_COLOR = {
    OPEN: '#d97706', IN_PROGRESS: '#2563eb', PAUSED: '#7c3aed', STAFF_COMPLETED: '#0f766e',
    SOLVED: '#16a34a', CLOSED: '#64748b', PENDING_REVIEW: '#0891b2',
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterTab === 'all') return true;
    if (filterTab === 'open') return c.status === 'OPEN';
    if (filterTab === 'in_progress') return ['IN_PROGRESS','STAFF_COMPLETED'].includes(c.status);
    if (filterTab === 'paused') return c.status === 'PAUSED';
    if (filterTab === 'resolved') return ['SOLVED','CLOSED'].includes(c.status);
    return true;
  });

  const openModal = (c) => {
    setSelected(c);
    setModalTab('details');
    setAssignStaffId(c.assignedStaffId || '');
    setPauseReason('');
    setSpareNote('');
    setResolutionNote(c.resolution || '');
    setVehicleHistory(null);
    setHistoryLoading(true);
    call(`/platform/complaints/${c._id}/vehicle-history`).then(setVehicleHistory).catch(()=>setVehicleHistory({jobs:[],rentals:[],maintenance:[]})).finally(()=>setHistoryLoading(false));
  };

  const handleChatReply = async () => { const text=chatDraft.trim(); if(!selected||!text)return; setBusy(true); try{await call(`/platform/complaints/${selected._id}/messages`,{method:'post',data:{message:text}});setChatDraft('');refresh();setSelected(prev=>({...prev,messages:[...(prev?.messages||[]),{senderRole:'CENTRAL_ADMIN',message:text,createdAt:new Date().toISOString()}]}));}catch(e){show(e.response?.data?.message||'Could not send message','error');}finally{setBusy(false);} };

  const handleServiceCenter = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const out = await call(`/platform/complaints/${selected._id}/service-center`, { method:'put' });
      show('Service center location sent. Customer chat is now closed.');
      setSelected(prev=>({...prev,...out.complaint,maintenanceId:out.maintenance?._id,chatClosed:true,serviceCenterName:out.maintenance?.vendor,serviceCenterAddress:out.maintenance?.vendorLocation,serviceCenterMapsUrl:out.maintenance?.vendorMapsUrl}));
      refresh();
    } catch(e) { show(e.response?.data?.message || 'Could not send service-center location','error'); }
    finally { setBusy(false); }
  };

  const handleAssign = async () => {
    if (!assignStaffId || !selected) return;
    setBusy(true);
    try {
      const out=await call(`/platform/complaints/${selected._id}/assign`, {method:'put',data:{staffId:assignStaffId}});
      show('Staff assigned successfully.');
      setSelected(prev=>({...prev,...out,assignedStaffId:assignStaffId,assignedStaffName:out.commandAssignedTo?.name||((staffList||[]).find(s=>s._id===assignStaffId)?.name||'Staff')}));
      refresh();
    } catch(e) { show(e.response?.data?.message || 'Assignment failed','error'); }
    finally { setBusy(false); }
  };

  useEffect(()=>{
    const token=localStorage.getItem('ev_command_token');
    const socket=io((API||window.location.origin).replace(/\/api\/?$/,''),{auth:{token},transports:['websocket','polling']});
    const update=()=>refresh();
    socket.on('command:support:update',update);
    return ()=>socket.disconnect();
  },[]);

  // Mark resolved by Command Center
  const handleResolve = async () => {
    if (!resolutionNote.trim() || !selected) return;
    setBusy(true);
    try {
      await call(`/platform/complaints/${selected._id}/resolve`, {
        method: 'put',
        data: { resolution: resolutionNote }
      });
      // Store review request for customer portal
      try {
        const rrList = JSON.parse(localStorage.getItem('ev_customer_review_requests') || '[]');
        if (!rrList.find(r => r.complaintId === selected._id)) {
          rrList.push({
            complaintId: selected._id,
            vehicleMake: selected.vehicleSnapshot?.make || '',
            vehicleModel: selected.vehicleSnapshot?.model || '',
            vehicleReg: selected.vehicleSnapshot?.registrationNo || '—',
            resolution: resolutionNote,
            resolvedAt: new Date().toISOString(),
            customerPhone: selected.customerId?.phone || '',
            customerName: selected.customerId?.name || 'Customer',
            reviewed: false,
          });
          localStorage.setItem('ev_customer_review_requests', JSON.stringify(rrList));
        }
      } catch(_) {}
      show('Complaint resolved. Customer will be prompted for a review.');
      setSelected(null);
      refresh();
    } catch(e) { show(e.response?.data?.message || 'Could not resolve','error'); }
    finally { setBusy(false); }
  };

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;

  const stats = [
    { label:'Total', value: complaints.length, color:'#2563eb', Icon: Bell },
    { label:'Open', value: complaints.filter(c=>c.status==='OPEN').length, color:'#d97706', Icon: AlertTriangle },
    { label:'In Progress', value: complaints.filter(c=>['IN_PROGRESS','STAFF_COMPLETED'].includes(c.status)).length, color:'#2563eb', Icon: Activity },
    { label:'Paused', value: complaints.filter(c=>c.status==='PAUSED').length, color:'#7c3aed', Icon: Clock },
    { label:'Resolved', value: complaints.filter(c=>['SOLVED','CLOSED'].includes(c.status)).length, color:'#16a34a', Icon: CheckCircle },
  ];

  return (
    <>
      <Toast toast={toast} />
      <PageHeader title="Complaint Center" sub="End-to-end complaint lifecycle — from customer to resolution and review." />

      {/* Metrics */}
      <MetricGrid metrics={stats} />

      {/* Filter Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:20, borderBottom:'2px solid #f1f5f9', flexWrap:'wrap' }}>
        {[
          ['open','🔔 Open', complaints.filter(c=>c.status==='OPEN').length],
          ['in_progress','▶ In Progress', complaints.filter(c=>c.status==='IN_PROGRESS').length],
          ['paused','⏸ Paused', complaints.filter(c=>c.status==='PAUSED').length],
          ['resolved','✅ Resolved', complaints.filter(c=>['SOLVED','CLOSED'].includes(c.status)).length],
        ].map(([key, label, cnt]) => (
          <button key={key} onClick={()=>setFilterTab(key)} style={{
            padding:'10px 18px', border:'none', cursor:'pointer', fontWeight:700, fontSize:13, background:'transparent',
            color: filterTab===key ? '#2563eb' : '#6b7280',
            borderBottom: filterTab===key ? '2.5px solid #2563eb' : '2.5px solid transparent',
            marginBottom:'-2px', transition:'all .15s', display:'flex', alignItems:'center', gap:6,
          }}>
            {label}
            <span style={{
              background: filterTab===key ? '#2563eb' : '#e2e8f0',
              color: filterTab===key ? '#fff' : '#64748b',
              borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700,
            }}>{cnt}</span>
          </button>
        ))}
      </div>

      {/* Complaint Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {filteredComplaints.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <Bell size={40} style={{ opacity:.2, marginBottom:12 }} />
              <p style={{ fontWeight:600, color:'#94a3b8' }}>No complaints in this category</p>
            </div>
          </div>
        )}
        {filteredComplaints.map(c => {
          const days = daysSince(c.createdAt);
          const handoverDays = c.handoverDate ? daysSince(c.handoverDate) : null;
          return (
            <div key={c._id} className="card" style={{
              padding:0, overflow:'hidden',
              borderLeft:`4px solid ${STATUS_COLOR[c.status]||'#e2e8f0'}`,
            }}>
              {/* Header */}
              <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid #f8fafc' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'#111827' }}>
                      {c.subject || c.category || 'Vehicle Complaint'}
                    </div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:4, display:'flex', gap:10, flexWrap:'wrap' }}>
                      <span>👤 {c.customerId?.name||'Customer'}</span>
                      <span>📞 {c.customerId?.phone||'—'}</span>
                      <span>🕐 Raised: {fmtDt(c.createdAt)}</span>
                      <span style={{ color: days > 3 ? '#dc2626' : '#64748b', fontWeight: days>3?700:400 }}>
                        📅 {days} day{days!==1?'s':''} old
                      </span>
                      {handoverDays !== null && (
                        <span>🤝 Handover: {days - handoverDays} days ago</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span style={{
                      fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:99,
                      background:(STATUS_COLOR[c.status]||'#64748b')+'18', color:STATUS_COLOR[c.status]||'#64748b',
                    }}>{c.status}</span>
                    {c.assignedStaffName && (
                      <span style={{ fontSize:11, color:'#2563eb', fontWeight:600 }}>🔧 {c.assignedStaffName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding:'10px 18px' }}>
                <div style={{ fontSize:13, color:'#374151', lineHeight:1.6, marginBottom:8 }}>{c.message}</div>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:'#475569' }}>
                  {c.vehicleSnapshot && (
                    <span>🚗 <b>{c.vehicleSnapshot.make} {c.vehicleSnapshot.model}</b> · {c.vehicleSnapshot.registrationNo||'—'}</span>
                  )}
                  {c.fleetOperatorName && <span>🏢 Fleet: {c.fleetOperatorName}</span>}
                  {c.serviceCount !== undefined && <span>✅ Services completed: {c.serviceCount}</span>}
                  {c.previousIssue && <span style={{ color:'#dc2626' }}>⚠ Prior issue: {c.previousIssue}</span>}
                  <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:7,padding:'5px 9px',border:'1px solid #e2e8f0',borderRadius:8,background:'#f8fafc'}}><span style={{fontSize:11,color:'#64748b',fontWeight:700}}>Previous Work History</span><button type="button" className="btn-ghost btn-sm" onClick={()=>openModal(c)}><Wrench size={13}/> View History</button></div>
                </div>
                {c.resolution && (
                  <div style={{ marginTop:8, fontSize:12, color:'#166534', background:'#f0fdf4', padding:'7px 10px', borderRadius:8 }}>
                    ✓ <b>Resolution:</b> {c.resolution}
                  </div>
                )}
                {c.status === 'PAUSED' && c.pauseReason && (
                  <div style={{ marginTop:8, fontSize:12, color:'#92400e', background:'#fef3c7', padding:'7px 10px', borderRadius:8 }}>
                    ⏸ <b>Paused:</b> {c.pauseReason}
                    {c.spareNote && <span> · Spare needed: {c.spareNote}</span>}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding:'10px 18px', background:'#f8fafc', borderTop:'1px solid #f1f5f9', display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="btn-primary" onClick={() => openModal(c)}>📋 Open Complaint</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Complaint Detail Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-drawer" onClick={e => e.stopPropagation()}
            style={{ width:'min(720px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

            {/* Modal Header */}
            <div className="modal-head">
              <div>
                <div className="modal-title">
                  {selected.subject || selected.category || 'Vehicle Complaint'}
                  <span style={{
                    marginLeft:10, fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:99,
                    background:(STATUS_COLOR[selected.status]||'#64748b')+'22', color:STATUS_COLOR[selected.status]||'#64748b',
                  }}>{selected.status}</span>
                </div>
                <div className="modal-subtitle">
                  👤 {selected.customerId?.name||'Customer'} &nbsp;·&nbsp;
                  🚗 {selected.vehicleSnapshot?.make||''} {selected.vehicleSnapshot?.model||''} · {selected.vehicleSnapshot?.registrationNo||'—'} &nbsp;·&nbsp;
                  📅 {daysSince(selected.createdAt)} days open
                  {selected.assignedStaffName && <span> &nbsp;·&nbsp; 🔧 {selected.assignedStaffName}</span>}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display:'flex', gap:4, padding:'12px 20px 0', borderBottom:'1px solid #f1f5f9', background:'#fff', flexShrink:0, flexWrap:'wrap' }}>
              {[
                ['details','📋 Details'],
                ['timeline','📍 Timeline'],
                ['workflow','⚙️ Workflow'],
                ['history','🔧 History'],
              ].map(([key, label]) => (
                <button key={key} onClick={() => setModalTab(key)} style={{
                  padding:'8px 14px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
                  background: modalTab===key ? '#fff' : 'transparent',
                  color: modalTab===key ? '#2563eb' : '#64748b',
                  borderBottom: modalTab===key ? '2px solid #2563eb' : '2px solid transparent',
                }}>{label}</button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ flex:1, overflowY:'auto' }}>

              {/* ── DETAILS TAB ── */}
              {modalTab === 'details' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, padding:12 }}>
                    <div style={{ fontWeight:700, marginBottom:6 }}>📣 Complaint Message</div>
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{selected.message}</div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                    {[
                      ['Status', selected.status],
                      ['Category', selected.category || '—'],
                      ['Raised On', fmtDt(selected.createdAt)],
                      ['Days Open', `${daysSince(selected.createdAt)} day(s)`],
                      ['Handover Date', selected.handoverDate ? fmt(selected.handoverDate) : '—'],
                      ['Days Since Handover', selected.handoverDate ? `${daysSince(selected.handoverDate)} day(s)` : '—'],
                      ['Services Completed', selected.serviceCount ?? '—'],
                      ['Previous Issue', selected.previousIssue || 'None'],
                      ['Vehicle', `${selected.vehicleSnapshot?.make||''} ${selected.vehicleSnapshot?.model||''}`],
                      ['Registration', selected.vehicleSnapshot?.registrationNo || '—'],
                      ['Customer', selected.customerId?.name || '—'],
                      ['Phone', selected.customerId?.phone || '—'],
                      ['Assigned Staff', selected.assignedStaffName || 'Not assigned'],
                      ['Fleet Operator', selected.fleetOperatorName || '—'],
                    ].map(([k,v]) => (
                      <div key={k} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
                        <div style={{ color:'#64748b', marginBottom:2 }}>{k}</div>
                        <div style={{ fontWeight:700, color:'#111827' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {selected.resolution && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:12 }}>
                      <div style={{ fontWeight:700, color:'#166534', marginBottom:4 }}>✅ Resolution</div>
                      <div style={{ fontSize:13, color:'#374151' }}>{selected.resolution}</div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>Resolved: {fmt(selected.solvedAt)}</div>
                    </div>
                  )}

                  {selected.status === 'CLOSED' && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:12 }}>
                      <div style={{ fontWeight:700, color:'#166534', marginBottom:4 }}>⭐ Customer Review</div>
                      <div style={{ fontSize:14, color:'#374151' }}>Rating: {selected.franchiseeRating || '—'}/5</div>
                      {selected.feedback && <div style={{ fontSize:13, color:'#374151', marginTop:4 }}>"{selected.feedback}"</div>}
                    </div>
                  )}
                </div>
              )}

              {/* ── TIMELINE TAB ── */}
              {modalTab === 'timeline' && (
                <div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:16, color:'#374151' }}>📍 Complaint Timeline</div>
                  <div style={{ position:'relative' }}>
                    <div style={{ position:'absolute', left:19, top:0, bottom:0, width:2, background:'#e2e8f0' }} />
                    {[
                      { label:'Complaint Registered', time: selected.createdAt, color:'#d97706', icon:'📩', note: `By ${selected.customerId?.name||'Customer'}` },
                      { label:'Sent to Fleet Operator', time: selected.createdAt, color:'#d97706', icon:'📤', note: `Fleet: ${selected.fleetOperatorName||'—'}` },
                      { label:'Received by Command Center', time: selected.createdAt, color:'#2563eb', icon:'🏢', note:'Auto-escalated to Command Center' },
                      selected.handoverDate && { label:'Vehicle Handover Date', time: selected.handoverDate, color:'#0891b2', icon:'🤝', note:`${daysSince(selected.handoverDate)} days ago` },
                      selected.assignedAt && { label:'Staff Assigned', time: selected.assignedAt, color:'#7c3aed', icon:'👷', note: `Assigned to ${selected.assignedStaffName||'Staff'}` },
                      selected.startedAt && { label:'Work Started', time: selected.startedAt, color:'#2563eb', icon:'▶', note:'Technician started working' },
                      selected.pausedAt && { label:'Work Paused', time: selected.pausedAt, color:'#d97706', icon:'⏸', note: selected.pauseReason||'Paused' },
                      selected.resumedAt && { label:'Work Resumed', time: selected.resumedAt, color:'#2563eb', icon:'▶', note:'Work resumed after pause' },
                      selected.solvedAt && { label:'Marked Resolved', time: selected.solvedAt, color:'#16a34a', icon:'✅', note: selected.resolution||'Resolved by Command Center' },
                      selected.closedAt && { label:'Customer Reviewed', time: selected.closedAt, color:'#16a34a', icon:'⭐', note: `Rating: ${selected.franchiseeRating||'—'}/5` },
                    ].filter(Boolean).map((event, i) => (
                      <div key={i} style={{ display:'flex', gap:14, marginBottom:18, position:'relative' }}>
                        <div style={{
                          width:40, height:40, borderRadius:'50%', background: event.color+'18',
                          border:`2px solid ${event.color}`, display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:16, flexShrink:0, zIndex:1, background:'#fff',
                        }}>{event.icon}</div>
                        <div style={{ paddingTop:8 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{event.label}</div>
                          <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{fmtDt(event.time)}</div>
                          {event.note && <div style={{ fontSize:12, color:'#374151', marginTop:2 }}>{event.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── WORKFLOW TAB ── */}
              {modalTab === 'workflow' && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#374151' }}>⚙️ Manage Complaint Workflow</div>

                  {/* Step 1: Assign Staff */}
                  <div style={{ border:'1.5px solid #ddd6fe', borderRadius:12, padding:16, background: selected.assignedStaffName ? '#f5f3ff' : '#fff' }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#5b21b6', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:22, height:22, borderRadius:'50%', background:'#7c3aed', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>1</span>
                      Assign Staff Member
                    </div>
                    {selected.assignedStaffName && (
                      <div style={{ marginBottom:10, fontSize:12, color:'#166534', background:'#f0fdf4', padding:'6px 10px', borderRadius:8 }}>
                        ✅ Currently assigned to: <b>{selected.assignedStaffName}</b>
                      </div>
                    )}
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                      <select value={assignStaffId} onChange={e => setAssignStaffId(e.target.value)}
                        style={{ flex:1, minWidth:180, padding:'8px 10px', border:'1.5px solid #ddd6fe', borderRadius:8, fontSize:13 }}>
                        <option value="">Select staff member…</option>
                        {(staffList||[]).map(s => (
                          <option key={s._id} value={s._id}>{s.name} · {s.role}</option>
                        ))}
                      </select>
                      <button onClick={handleAssign} disabled={busy || !assignStaffId}
                        style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:8,
                          padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13,
                          opacity: busy||!assignStaffId ? 0.6 : 1 }}>
                        {busy ? 'Assigning…' : '👷 Assign'}
                      </button>
                    </div>
                  </div>

                  {!selected.chatClosed && <div style={{border:'1.5px solid #cbd5e1',borderRadius:12,padding:16,background:'#fff'}}>
                    <div style={{fontWeight:700,fontSize:13,color:'#334155',marginBottom:8}}>💬 Command Center Chat</div>
                    <div style={{display:'grid',gap:7,maxHeight:220,overflowY:'auto',marginBottom:8}}>{(selected.messages||[]).map((m,i)=><div key={i} style={{padding:'7px 9px',borderRadius:9,background:m.senderRole==='CUSTOMER'?'#f8fafc':'#eff6ff',fontSize:12}}><b>{m.senderRole==='CUSTOMER'?'Customer':'Command Center'}</b><div>{m.message}</div><small style={{color:'#94a3b8'}}>{m.createdAt?fmtDt(m.createdAt):''}</small></div>)}</div>
                    <div style={{display:'flex',gap:8}}><input value={chatDraft} onChange={e=>setChatDraft(e.target.value)} placeholder="Reply to customer…" style={{flex:1,padding:'9px 11px',border:'1px solid #cbd5e1',borderRadius:8}}/><button className="btn-primary" onClick={handleChatReply} disabled={busy||!chatDraft.trim()}>Send</button></div>
                  </div>}

                  {/* Step 2: Service center handoff */}
                  {!selected.chatClosed && (
                    <div style={{border:'1.5px solid #bfdbfe',borderRadius:12,padding:16,background:'#fff'}}>
                      <div style={{fontWeight:700,fontSize:13,color:'#1d4ed8',marginBottom:8}}>2 · Send Service Center Location</div>
                      <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>This closes the customer chat. After this point the customer can only view progress.</div>
                      <button onClick={handleServiceCenter} disabled={busy} style={{background:'#2563eb',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontWeight:700,fontSize:13}}>{busy?'Sending…':'📍 Send Service Center Location'}</button>
                    </div>
                  )}
                  {selected.chatClosed && (
                    <div style={{border:'1.5px solid #bfdbfe',borderRadius:12,padding:16,background:'#eff6ff'}}>
                      <div style={{fontWeight:700,fontSize:13,color:'#1d4ed8',marginBottom:6}}>📍 Service Center Handoff Complete</div>
                      <div style={{fontSize:12,color:'#334155',marginBottom:8}}><b>{selected.serviceCenterName||'allEV Service Center'}</b> · {selected.serviceCenterAddress||'Somajiguda, Hyderabad'}</div>
                      <a href={selected.serviceCenterMapsUrl||'https://maps.app.goo.gl/zcJfnm24McDJhYHd6'} target="_blank" rel="noreferrer" style={{fontSize:12,fontWeight:700,color:'#2563eb'}}>Open location ↗</a>
                      <div style={{marginTop:8,fontSize:12,color:'#166534',background:'#dcfce7',padding:'6px 10px',borderRadius:8}}>Customer chat closed. Customer can no longer send messages.</div>
                    </div>
                  )}

                  {/* Step 3: Assign staff — staff owns Start / Pause / Resume / Complete */}
                  <div style={{border:'1.5px solid #ddd6fe',borderRadius:12,padding:16,background:selected.assignedStaffName?'#f5f3ff':'#fff'}}>
                    <div style={{fontWeight:700,fontSize:13,color:'#5b21b6',marginBottom:8}}>3 · Assign Service Staff</div>
                    {selected.assignedStaffName&&<div style={{fontSize:12,color:'#166534',background:'#f0fdf4',padding:'6px 10px',borderRadius:8,marginBottom:10}}>👷 <b>{selected.assignedStaffName}</b> is assigned. Staff controls Start, Pause/Resume and Complete.</div>}
                    <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                      <select value={assignStaffId} onChange={e=>setAssignStaffId(e.target.value)} disabled={!selected.chatClosed||!!selected.assignedStaffName} style={{flex:1,minWidth:180,padding:'8px 10px',border:'1.5px solid #ddd6fe',borderRadius:8,fontSize:13}}>
                        <option value="">Select staff member…</option>{(staffList||[]).map(st=><option key={st._id} value={st._id}>{st.name} · {st.role}</option>)}
                      </select>
                      <button onClick={handleAssign} disabled={busy||!assignStaffId||!selected.chatClosed||!!selected.assignedStaffName} style={{background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontWeight:700,fontSize:13,opacity:(busy||!assignStaffId||!selected.chatClosed||!!selected.assignedStaffName)?0.6:1}}>👷 Assign Staff</button>
                    </div>
                    {selected.maintenanceId?.staffStatus&&<div style={{marginTop:10,fontSize:12,color:'#475569'}}>Current staff progress: <b>{String(selected.maintenanceId.staffStatus).replaceAll('_',' ')}</b></div>}
                    {selected.proof&&<div style={{marginTop:10,fontSize:12,color:'#166534',background:'#f0fdf4',padding:8,borderRadius:8}}>✅ Staff completion proof is available. Command Center can resolve only after staff completion + proof.</div>}
                  </div>

                  {/* Step 4: Mark Resolved */}
                  {!['SOLVED','CLOSED'].includes(selected.status) && (
                    <div style={{ border:'1.5px solid #bbf7d0', borderRadius:12, padding:16 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#166534', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:22, height:22, borderRadius:'50%', background:'#16a34a', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>4</span>
                        Mark Resolved & Request Customer Review
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <div style={{ fontSize:12, color:'#6b7280' }}>
                          Once the technician completes the work, mark as resolved. The customer will be prompted to leave a review.
                        </div>
                        <textarea rows={3} value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
                          placeholder="Describe how the issue was resolved…"
                          style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #bbf7d0', borderRadius:8, fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
                        <button onClick={handleResolve} disabled={busy || !resolutionNote.trim()}
                          style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8,
                            padding:'10px 20px', cursor:'pointer', fontWeight:700, fontSize:13, alignSelf:'flex-start',
                            opacity: busy||!resolutionNote.trim() ? 0.6 : 1 }}>
                          {busy ? 'Resolving…' : '✅ Mark Resolved & Request Review'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resolved state */}
                  {['SOLVED','CLOSED'].includes(selected.status) && (
                    <div style={{ border:'1.5px solid #bbf7d0', borderRadius:12, padding:16, background:'#f0fdf4' }}>
                      <div style={{ fontWeight:700, color:'#166534', marginBottom:6 }}>✅ Complaint Resolved</div>
                      <div style={{ fontSize:13, color:'#374151' }}>{selected.resolution}</div>
                      {selected.status === 'CLOSED' && (
                        <div style={{ marginTop:10, fontSize:13, color:'#166534' }}>
                          ⭐ Customer rating: <b>{selected.franchiseeRating || '—'}/5</b>
                          {selected.feedback && <span> · "{selected.feedback}"</span>}
                        </div>
                      )}
                      {selected.status === 'SOLVED' && (
                        <div style={{ marginTop:8, fontSize:12, color:'#64748b' }}>
                          Waiting for customer to submit their review.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── HISTORY TAB ── */}
              {modalTab === 'history' && (
                <div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                    🔧 Vehicle Service History
                  </div>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>
                    Previous services, jobs, and any prior complaints on this vehicle.
                  </div>

                  {/* Previous issues */}
                  {selected.previousIssue && (
                    <div style={{ border:'1px solid #fecaca', background:'#fff5f5', borderRadius:10, padding:12, marginBottom:14 }}>
                      <div style={{ fontWeight:700, color:'#dc2626', marginBottom:4 }}>⚠ Previous Issue on Record</div>
                      <div style={{ fontSize:13, color:'#374151' }}>{selected.previousIssue}</div>
                    </div>
                  )}

                  {/* Service count */}
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
                    {[
                      ['Services Completed', selected.serviceCount ?? 0, '#2563eb'],
                      ['Days Open', daysSince(selected.createdAt), selected.daysSince > 7 ? '#dc2626' : '#d97706'],
                      ['Days Since Handover', selected.handoverDate ? daysSince(selected.handoverDate) : '—', '#0891b2'],
                    ].map(([k,v,color]) => (
                      <div key={k} style={{ flex:'1 1 150px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>{k}</div>
                        <div style={{ fontSize:22, fontWeight:800, color }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed previous work history */}
                  {historyLoading ? <div style={{textAlign:'center',padding:24,color:'#64748b'}}>Loading previous work history…</div> : (vehicleHistory?.jobs||[]).length===0 ? <div style={{textAlign:'center',padding:24,color:'#94a3b8'}}>No previous work history found for this vehicle.</div> : <div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#374151'}}>Previous Work History ({vehicleHistory.jobs.length})</div>
                    {(vehicleHistory.jobs||[]).map((j,i)=>{const pauses=j.pauseHistory||[];const paused=pauses.reduce((n,p)=>n+Number(p.durationSeconds||0),0);return <div key={j._id||i} style={{border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 14px',marginBottom:8,fontSize:12,background:j.status==='COMPLETED'?'#f0fdf4':'#fff'}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',marginBottom:7}}><b>🔧 {j.serviceType||'Service'}</b><span style={{padding:'2px 9px',borderRadius:99,background:j.status==='COMPLETED'?'#dcfce7':j.status==='PAUSED'?'#fef3c7':'#eff6ff',color:j.status==='COMPLETED'?'#166534':j.status==='PAUSED'?'#92400e':'#1d4ed8',fontWeight:700}}>{j.status}</span></div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:'5px 10px',color:'#475569'}}>
                        <span>🔑 Priority: {j.priority||'NORMAL'}</span><span>📅 Created: {fmtDt(j.createdAt)}</span><span>▶ Started: {fmtDt(j.staffStartedAt||j.startedAt)}</span><span>✅ Completed: {fmtDt(j.staffCompletedAt||j.completedAt)}</span><span>⏱ Work Duration: {j.elapsedSeconds?`${Math.floor(j.elapsedSeconds/3600)}h ${Math.floor((j.elapsedSeconds%3600)/60)}m`:'—'}</span><span>⏸ Total Paused: {paused?`${Math.floor(paused/3600)}h ${Math.floor((paused%3600)/60)}m`:'0m'}</span>
                        {j.problem&&<span style={{gridColumn:'1/-1'}}>⚠️ Problem: {j.problem}</span>}
                        {j.solution&&<span style={{gridColumn:'1/-1',color:'#166534',fontWeight:600}}>🛠️ Solution: {j.solution}</span>}
                      </div>
                      {pauses.length>0&&<div style={{marginTop:9,padding:9,borderRadius:8,background:'#fffbeb',border:'1px solid #fde68a'}}><b style={{color:'#92400e'}}>Pause details</b>{pauses.map((pa,pi)=><div key={pi} style={{marginTop:5,color:'#78350f'}}>#{pi+1} · {fmtDt(pa.pausedAt)} → {pa.resumedAt?fmtDt(pa.resumedAt):'Still paused'} · {pa.durationSeconds!=null?`${Math.floor(pa.durationSeconds/60)} min`: '—'} · {pa.reason||'No reason recorded'}</div>)}</div>}
                      {j.jobCard&&<div style={{marginTop:10,display:'flex',justifyContent:'flex-end'}}><button type="button" className="btn-primary btn-sm" onClick={()=>setViewCard({...j,jobCard:j.jobCard,customerId:selected.customerId,commandVehicleId:selected.vehicleSnapshot,technicianId:{name:selected.assignedStaffName||'Staff'}})}><Eye size={13}/> View Complete Job Card</button></div>}
                    </div>})}
                  </div>}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {viewCard && <CommandJobCardViewer job={viewCard} onClose={()=>setViewCard(null)} />}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN STAFF MANAGEMENT — Moved from Fleet Operator Portal
// ══════════════════════════════════════════════════════════════════
function AdminStaffManagement({ call }) {
  const { data: apiStaff, loading, error, refresh } = useFetch(call, '/platform/all-staff');
  const { data: pendingStaff, loading: psLoading } = useFetch(call, '/platform/pending-staff');
  const [tab, setTab] = useState('active');
  const [imageModal, setImageModal] = useState(null);
  const { toast, show } = useToast();

  const allPending    = pendingStaff || [];
  const activeStaff   = allPending.filter(s => !s.removedFromFranchisee && s.status === 'APPROVED');
  const removedStaff  = allPending.filter(s => s.removedFromFranchisee);
  const pendingList   = allPending.filter(s => s.status === 'PENDING_APPROVAL' && !s.removedFromFranchisee);

  const handleApprove = async (staffId, name) => {
    if (!window.confirm(`Approve ${name}?`)) return;
    try {
      await call(`/platform/pending-staff/${staffId}/approve`, { method: 'put' });
      show(`${name} approved successfully.`);
      refresh();
    } catch(e) { show(e.response?.data?.message || 'Approval failed','error'); }
  };

  if (loading || psLoading) return <Loader />;
  if (error) return <Err msg={error} />;

  const TABS = [
    { id:'active',  label:'Active Staff',     count: activeStaff.length,  Icon: UserCheck },
    { id:'pending', label:'Pending Approval', count: pendingList.length,  Icon: Clock },
    { id:'removed', label:'Removed Staff',    count: removedStaff.length, Icon: UserX },
  ];

  return (
    <>
      <Toast toast={toast} />
      {imageModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setImageModal(null)}>
          <img src={imageModal.url} alt={imageModal.title}
            style={{ maxWidth:'88vw', maxHeight:'85vh', borderRadius:8, objectFit:'contain' }} />
        </div>
      )}
      <PageHeader title="Staff Management" sub="Manage all staff across fleet operators. Approve new staff, view removals, and monitor the directory." />
      <MetricGrid metrics={[
        { label:'Active Staff',     value: activeStaff.length,  Icon: UserCheck, color:'#16a34a' },
        { label:'Pending Approval', value: pendingList.length,  Icon: Clock,     color:'#d97706' },
        { label:'Removed Staff',    value: removedStaff.length, Icon: UserX,     color:'#dc2626' },
        { label:'Total (all time)', value: allPending.length,   Icon: Users,     color:'#2563eb' },
      ]} />

      {pendingList.length > 0 && (
        <InfoBanner Icon={Clock}>
          {pendingList.length} staff entry(s) awaiting approval.
        </InfoBanner>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'2px solid #e5e7eb', paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
            border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t.id ? '2px solid #2563eb' : '2px solid transparent',
            color: tab===t.id ? '#2563eb' : '#6b7280',
            fontWeight: tab===t.id ? 700 : 500, fontSize:14, marginBottom:'-2px',
          }}>
            <t.Icon size={15} />
            {t.label}
            <span style={{
              background: tab===t.id ? '#2563eb' : '#e5e7eb',
              color: tab===t.id ? '#fff' : '#374151',
              borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <Card title="Active Staff Directory" badge={`${activeStaff.length} active`}>
          {!activeStaff.length
            ? <div className="empty-state"><UserCheck size={36} style={{ opacity:.2 }} /><p>No active staff yet.</p></div>
            : <AdminStaffFullTable rows={activeStaff} setImageModal={setImageModal} showFranchisee />
          }
        </Card>
      )}
      {tab === 'pending' && (
        <Card title="Pending Approval" badge={`${pendingList.length} pending`}>
          {!pendingList.length
            ? <div className="empty-state"><Clock size={36} style={{ opacity:.2 }} /><p>No pending approvals.</p></div>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {pendingList.map(s => (
                  <div key={s._id} style={{ border:'1px solid #fde68a', background:'#fffbeb', borderRadius:10, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{s.name}</div>
                      <div style={{ fontSize:12, color:'#64748b' }}>{s.role} · {s.phone} · {s.franchiseeId?.name||'Unknown Fleet'}</div>
                    </div>
                    <button onClick={() => handleApprove(s._id, s.name)}
                      style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                      ✅ Approve
                    </button>
                  </div>
                ))}
              </div>
          }
        </Card>
      )}
      {tab === 'removed' && (
        <Card title="Removed Staff" badge={`${removedStaff.length}`}>
          {!removedStaff.length
            ? <div className="empty-state"><UserX size={36} style={{ opacity:.2 }} /><p>No removed staff.</p></div>
            : <AdminStaffFullTable rows={removedStaff} setImageModal={setImageModal} showFranchisee showRemovedBadge />
          }
        </Card>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN STAFF OWN JOB CARDS
// ══════════════════════════════════════════════════════════════════
function AdminStaffOwnJobCards({ call }) {
  const monthNow=new Date(); const monthKey=`${monthNow.getFullYear()}-${String(monthNow.getMonth()+1).padStart(2,'0')}`;
  const [month,setMonth]=useState(monthKey); const [staffId,setStaffId]=useState('ALL'); const [status,setStatus]=useState(''); const [selected,setSelected]=useState(null); const [viewCard,setViewCard]=useState(null);
  const {data,loading,error,refresh}=useFetch(call,`/platform/staff-own-job-cards?month=${encodeURIComponent(month)}${staffId!=='ALL'?`&staffId=${encodeURIComponent(staffId)}`:''}${status?`&status=${encodeURIComponent(status)}`:''}`);
  const {data:staff}=useFetch(call,'/platform/staff-list');
  const rows=Array.isArray(data)?data:[]; const fmt=d=>d?new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const live=rows.filter(r=>r.status==='IN_PROGRESS').length, completed=rows.filter(r=>r.status==='COMPLETED').length, paused=rows.filter(r=>r.status==='PAUSED').length;
  if(loading)return <Loader/>; if(error)return <Err msg={error}/>;
  return <div style={{display:'grid',gap:16}}>
    <PageHeader title="Staff Own Job Cards" sub="Every job card created directly by staff, with customer, bike, previous-work and live work details." />
    <div style={{display:'flex',gap:10,flexWrap:'wrap',padding:14,border:'1px solid #e2e8f0',borderRadius:16,background:'#fff',boxShadow:'0 8px 24px rgba(15,23,42,.04)'}}>
      <label style={{display:'grid',gap:5,fontSize:11,fontWeight:800,color:'#64748b'}}>Month<input type="month" value={month} onChange={e=>{setMonth(e.target.value);setSelected(null)}} style={{padding:'9px 11px',border:'1px solid #dbe3ef',borderRadius:10}}/></label>
      <label style={{display:'grid',gap:5,fontSize:11,fontWeight:800,color:'#64748b'}}>Staff<select value={staffId} onChange={e=>setStaffId(e.target.value)} style={{padding:'9px 11px',border:'1px solid #dbe3ef',borderRadius:10,minWidth:190}}><option value="ALL">All staff</option>{(staff||[]).map(x=><option key={x._id} value={x._id}>{x.name} · {x.role}</option>)}</select></label>
      <label style={{display:'grid',gap:5,fontSize:11,fontWeight:800,color:'#64748b'}}>Status<select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'9px 11px',border:'1px solid #dbe3ef',borderRadius:10}}><option value="">All</option><option>IN_PROGRESS</option><option>PAUSED</option><option>COMPLETED</option><option>PENDING</option></select></label>
      <button className="btn-ghost" onClick={refresh} style={{alignSelf:'end'}}>↻ Refresh</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>{[['Total',rows.length,'#2563eb'],['In progress',live,'#16a34a'],['Paused',paused,'#d97706'],['Completed',completed,'#7c3aed']].map(([l,v,c])=><div key={l} style={{padding:'16px 18px',borderRadius:16,background:'#fff',border:'1px solid #e2e8f0'}}><small style={{color:'#64748b',fontWeight:700}}>{l}</small><div style={{fontSize:27,fontWeight:900,color:c,marginTop:4}}>{v}</div></div>)}</div>
    {!rows.length?<div className="card"><div className="empty-state"><Briefcase size={38}/><p>No staff-created job cards for this filter.</p></div></div>:<div style={{display:'grid',gridTemplateColumns:selected?'minmax(0,1fr) 380px':'repeat(auto-fit,minmax(320px,1fr))',gap:14,alignItems:'start'}}>
      <div style={{display:'grid',gap:12}}>{rows.map(j=>{const v=j.commandVehicleId||j.vehicleSnapshot||{};const c=j.customerId||j.customerSnapshot||{};const st=j.status||'PENDING';return <div key={j._id} onClick={()=>setSelected(j)} style={{textAlign:'left',border:`1.5px solid ${selected?String(selected._id)===String(j._id)?'#2563eb':'#e2e8f0':'#e2e8f0'}`,borderRadius:16,background:'#fff',padding:16,cursor:'pointer',boxShadow:String(selected?._id)===String(j._id)?'0 10px 30px rgba(37,99,235,.10)':'0 5px 18px rgba(15,23,42,.04)'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><div><div style={{fontWeight:900,fontSize:14}}>{j.bikeId||v.bikeId||'Bike'} · {v.make||j.bikeDetails?.make||''} {v.model||j.bikeDetails?.model||''}</div><div style={{fontSize:12,color:'#64748b',marginTop:4}}>Customer: {c.name||'—'} · {c.phone||'—'}</div></div><span style={{fontSize:10,fontWeight:900,padding:'5px 9px',borderRadius:99,background:st==='COMPLETED'?'#dcfce7':st==='IN_PROGRESS'?'#dbeafe':st==='PAUSED'?'#fef3c7':'#f3e8ff',color:st==='COMPLETED'?'#166534':st==='IN_PROGRESS'?'#1d4ed8':st==='PAUSED'?'#92400e':'#7c3aed'}}>{st.replaceAll('_',' ')}</span></div><div style={{marginTop:10,fontSize:12,color:'#334155'}}><b>Problem:</b> {j.problem||'—'}</div><div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:11,color:'#64748b',marginTop:9}}><span>Staff: {j.technicianId?.name||'—'}</span><span>Created: {fmt(j.createdAt)}</span><span>Priority: {j.priority||'NORMAL'}</span><button type="button" className="btn-ghost btn-sm" style={{marginLeft:'auto'}} onClick={e=>{e.stopPropagation();setViewCard(j)}}><Eye size={13}/> View Job Card</button></div></div>})}</div>
      {selected&&<aside style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:18,position:'sticky',top:16,boxShadow:'0 16px 40px rgba(15,23,42,.08)'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><div><span style={{fontSize:10,fontWeight:900,color:'#2563eb',letterSpacing:'.1em'}}>STAFF OWNED JOB CARD</span><h3 style={{margin:'5px 0 2px'}}>{selected.bikeId||selected.bikeDetails?.bikeId||'Bike'}</h3><small style={{color:'#64748b'}}>{selected.technicianId?.name||'Staff'} · {selected.priority||'NORMAL'}</small></div><button className="btn-icon" onClick={()=>setSelected(null)}>✕</button></div><div style={{display:'grid',gap:10,marginTop:16}}>{[['Customer',selected.customerId?.name||selected.customerSnapshot?.name||'—'],['Phone',selected.customerId?.phone||selected.customerSnapshot?.phone||'—'],['Bike',`${selected.bikeDetails?.make||selected.commandVehicleId?.make||''} ${selected.bikeDetails?.model||selected.commandVehicleId?.model||''}`],['Registration',selected.bikeDetails?.registrationNo||selected.commandVehicleId?.registrationNo||'—'],['Chassis',selected.bikeDetails?.chassisNo||selected.commandVehicleId?.chassisNo||'—'],['Odometer',selected.bikeDetails?.odometerKm??selected.commandVehicleId?.odometerKm??'—'],['Battery SOC',selected.bikeDetails?.batterySoc??selected.commandVehicleId?.batterySoc??'—'],['Started',fmt(selected.startedAt)],['Completed',fmt(selected.completedAt)]].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',gap:10,borderBottom:'1px solid #f1f5f9',paddingBottom:7,fontSize:12}}><span style={{color:'#64748b'}}>{k}</span><b style={{textAlign:'right'}}>{v||'—'}</b></div>)}</div><div style={{marginTop:15,padding:12,borderRadius:13,background:'#f8fafc'}}><b style={{fontSize:12}}>Problem</b><p style={{margin:'5px 0 0',fontSize:12,color:'#475569'}}>{selected.problem||'—'}</p></div>{selected.previousWorkSummary&&<div style={{marginTop:10,padding:12,borderRadius:13,background:'#fffbeb',border:'1px solid #fde68a'}}><b style={{fontSize:12,color:'#92400e'}}>Previous work found</b><p style={{whiteSpace:'pre-wrap',margin:'5px 0 0',fontSize:11,color:'#92400e'}}>{selected.previousWorkSummary}</p></div>}<div style={{marginTop:10,padding:12,borderRadius:13,background:'#eff6ff'}}><b style={{fontSize:12,color:'#1d4ed8'}}>Job Card Details</b><p style={{margin:'5px 0 0',fontSize:11,color:'#475569'}}>Diagnosis: {selected.jobCard?.diagnosis||selected.diagnosis||'—'}</p><p style={{margin:'5px 0 0',fontSize:11,color:'#475569'}}>Work performed: {selected.workPerformed||selected.solution||'—'}</p></div></aside>}
    </div>}
    {viewCard && <CommandJobCardViewer job={viewCard} onClose={()=>setViewCard(null)} />}
  </div>;
}

// Reusable full Job Card viewer for Command Center
function CommandJobCardViewer({ job, onClose }) {
  if (!job) return null;
  const card = job.jobCard || {};
  const data = card.jobCardData || {};
  const vehicle = data.vehicle || job.commandVehicleId || job.vehicleSnapshot || job.bikeDetails || {};
  const customer = data.customer || job.customerId || job.customerSnapshot || {};
  const staff = job.technicianId || {};
  const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const display = v => v===undefined||v===null||v===''?'—':typeof v==='boolean'?(v?'Yes':'No'):Array.isArray(v)?(v.length?v.map((x)=>typeof x==='object'?JSON.stringify(x):String(x)).join(', '):'—'):typeof v==='object'?JSON.stringify(v):String(v);
  const Field=({label,value})=><div style={{padding:'9px 11px',border:'1px solid #e2e8f0',borderRadius:9,background:'#f8fafc'}}><div style={{fontSize:10,color:'#64748b',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</div><div style={{fontSize:12,fontWeight:650,color:'#0f172a',marginTop:3,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{display(value)}</div></div>;
  const ObjectFields=({obj})=><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:8}}>{Object.entries(obj||{}).map(([k,v])=><Field key={k} label={k.replace(/([A-Z])/g,' $1').replace(/_/g,' ')} value={v}/>)}</div>;
  const serviceLines=Array.isArray(data.serviceLines)?data.serviceLines:[];
  const parts=Array.isArray(card.partsUsed)?card.partsUsed:[];
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(980px,100%)',maxHeight:'94vh',display:'flex',flexDirection:'column'}}>
      <div className="modal-head"><div><div className="modal-title">View Complete Job Card <span style={{marginLeft:8,fontSize:11,fontWeight:800,padding:'4px 9px',borderRadius:99,background:'#eff6ff',color:'#2563eb'}}>STAFF CREATED</span></div><div className="modal-subtitle">{card.jobCardNumber||`JC-${String(job._id||'').slice(-8).toUpperCase()}`} · Created {fmt(job.createdAt)} · Completed {fmt(card.completedAt||job.completedAt)}</div></div><button className="icon-btn" onClick={onClose}>✕</button></div>
      <div className="modal-body" style={{overflowY:'auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:9,marginBottom:14}}>
          <Field label="Status" value={String(job.status||'PENDING').replaceAll('_',' ')} /><Field label="Staff" value={staff.name}/><Field label="Job Card No." value={card.jobCardNumber}/><Field label="Bike ID" value={job.bikeId||vehicle.bikeId}/><Field label="Started" value={fmt(job.startedAt||job.staffStartedAt)}/><Field label="Completed" value={fmt(job.completedAt||job.staffCompletedAt||card.completedAt)}/>
        </div>
        <div style={{display:'grid',gap:13}}>
          <section style={{padding:14,border:'1px solid #dbeafe',borderRadius:14,background:'#eff6ff'}}><div style={{fontWeight:850,fontSize:13,color:'#1d4ed8',marginBottom:9}}>Customer Details</div><ObjectFields obj={customer}/></section>
          <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Vehicle Details</div><ObjectFields obj={vehicle}/></section>
          <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Vehicle Receipt Condition</div><ObjectFields obj={data.receipt||card.vehicleReceiptCondition}/></section>
          <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Service / Job Details</div><ObjectFields obj={data.service||card.serviceTypeData}/><div style={{marginTop:9}}><Field label="Customer Complaint / Voice" value={card.complaint||job.problem||data.serviceLines?.map(x=>x.customerVoice).filter(Boolean).join('\n')}/></div><div style={{marginTop:9}}><Field label="Diagnosis" value={card.diagnosis||job.diagnosis}/><div style={{height:8}}/><Field label="Work Performed" value={card.workPerformed||job.workPerformed||job.solution}/><div style={{height:8}}/><Field label="Technician Notes" value={card.technicianNotes||job.technicianNotes}/></div></section>
          <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Service Lines</div>{serviceLines.length?<div style={{display:'grid',gap:8}}>{serviceLines.map((x,i)=><div key={i} style={{padding:11,border:'1px solid #e2e8f0',borderRadius:10}}><b style={{fontSize:12}}>Service Item {i+1}</b><div style={{marginTop:8}}><ObjectFields obj={x}/></div></div>)}</div>:<div style={{fontSize:12,color:'#64748b'}}>No service-line entries.</div>}</section>
          <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Estimate</div><ObjectFields obj={data.estimate||card.estimateData}/></section>
          <section style={{padding:14,border:'1px solid #bbf7d0',borderRadius:14,background:'#f0fdf4'}}><div style={{fontWeight:850,fontSize:13,color:'#166534',marginBottom:9}}>Acknowledgement</div><ObjectFields obj={data.acknowledgement}/></section>
          <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Authorization & Notes</div><Field label="Authorization" value={data.authorizationText||card.authorizationText}/><div style={{height:8}}/><Field label="Notes" value={data.notes||job.remarks||card.technicianNotes}/></section>
          <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Completion</div><ObjectFields obj={{Customer_Approval:card.customerApproval,QC_Approved:card.qcApproved,Submitted_At:fmt(card.submittedAt),Completed_At:fmt(card.completedAt),Customer_Signature_At:fmt(card.customerSignatureAt)}}/>{card.customerSignature&&<div style={{marginTop:10}}><div style={{fontSize:10,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>Customer Signature</div><img src={card.customerSignature} alt="Customer signature" style={{marginTop:6,maxWidth:300,maxHeight:110,objectFit:'contain',background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:6}}/></div>}</section>
          {parts.length>0&&<section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:8}}>Parts Used</div>{parts.map((p,i)=><div key={i} style={{padding:'7px 0',borderTop:i?'1px solid #f1f5f9':'none',fontSize:12}}>{p.partId?.name||p.partName||p.name||`Part ${i+1}`} × {p.qty||0} · ₹{(Number(p.unitPrice||0)*Number(p.qty||0)).toLocaleString('en-IN')}</div>)}</section>}
          {(card.photos||[]).length>0&&<section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:8}}>Job Photos</div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{card.photos.map((src,i)=><img key={i} src={src} alt={`Job proof ${i+1}`} style={{width:110,height:90,objectFit:'cover',borderRadius:9,border:'1px solid #e2e8f0'}} />)}</div></section>}
        </div>
      </div><div className="modal-footer"><button className="btn-ghost" onClick={onClose}>Close</button></div>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════
// ADMIN STAFF ATTENDANCE — Moved from Fleet Operator Portal
// ══════════════════════════════════════════════════════════════════
function AdminStaffAttendance({ call }) {
  const monthNow = new Date();
  const monthKey = `${monthNow.getFullYear()}-${String(monthNow.getMonth()+1).padStart(2,'0')}`;
  const [month, setMonth] = useState(monthKey);
  const [staffId, setStaffId] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [salary, setSalary] = useState('');
  const [allowance, setAllowance] = useState('0');
  const [deduction, setDeduction] = useState('0');
  const [payslipNote, setPayslipNote] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const { toast, show } = useToast();
  const { data, loading, error, refresh } = useFetch(call, `/platform/staff-attendance?month=${encodeURIComponent(month)}${staffId!=='ALL' ? `&staffId=${encodeURIComponent(staffId)}` : ''}`);
  const pays = useFetch(call, `/platform/staff-payslips?${staffId!=='ALL' ? `staffId=${encodeURIComponent(staffId)}&` : ''}month=${encodeURIComponent(month)}`);

  const payload = data && !Array.isArray(data) ? data : { records: Array.isArray(data) ? data : [], staff: [] };
  const records = payload.records || [];
  const staff = payload.staff || [];
  const activeStaff = staff.filter(s => s.active !== false);
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—';
  const hours = n => n==null ? '—' : `${Number(n).toFixed(2)} h`;
  const money = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

  const monthRows = React.useMemo(() => {
    const by = new Map();
    activeStaff.forEach(s => by.set(String(s._id), { staff:s, records:[], workedDays:0, hours:0, breakHours:0, live:false, present:0, lateDays:0 }));
    records.forEach(r => {
      const id = String(r.userId?._id || r.userId || '');
      if (!by.has(id)) by.set(id,{staff:r.userId||{_id:id,name:r.name||'Unknown'},records:[],workedDays:0,hours:0,breakHours:0,live:false,present:0,lateDays:0});
      const x=by.get(id); x.records.push(r); if(r.clockIn)x.present++; if(r.clockIn&&r.clockOut)x.workedDays++; if(r.workedHours!=null)x.hours+=Number(r.workedHours); if(r.breakHours!=null)x.breakHours+=Number(r.breakHours); if(r.lateMinutes>0)x.lateDays++; if(r.live)x.live=true;
    });
    return Array.from(by.values()).map(x=>({...x,hours:Number(x.hours.toFixed(2)),breakHours:Number(x.breakHours.toFixed(2))}));
  },[activeStaff,records]);

  const selectedSummary = selected ? monthRows.find(x=>String(x.staff?._id)===String(selected.staff?._id)) || selected : null;
  const totalWorkedDays = monthRows.reduce((a,x)=>a+x.workedDays,0);
  const totalPresent = monthRows.reduce((a,x)=>a+x.present,0);
  const liveNow = monthRows.filter(x=>x.live).length;
  const totalHours = monthRows.reduce((a,x)=>a+x.hours,0);
  const totalBreakHours = monthRows.reduce((a,x)=>a+x.breakHours,0);
  const totalLateDays = monthRows.reduce((a,x)=>a+x.lateDays,0);
  const attendanceRate = monthRows.length ? Math.round(monthRows.reduce((a,x)=>a+(x.present?1:0),0)/monthRows.length*100) : 0;
  const daysInMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate();

  const openStaff = row => {
    setSelected(row);
    const existing = Number(row.staff?.monthlySalary || 0);
    setSalary(existing ? String(existing) : '');
    setAllowance('0'); setDeduction('0'); setPayslipNote(''); setPreview(null);
  };

  const buildPayslipPreview = () => {
    if(!selectedSummary?.staff?._id) return show('Select a staff member first.','error');
    const grossBase=Number(salary||0), allow=Number(allowance||0), ded=Number(deduction||0), gross=grossBase+allow, net=Math.max(0,gross-ded);
    if(grossBase<=0) return show('Enter the monthly salary before generating the payslip.','error');
    setPreview({
      userId:selectedSummary.staff._id, month, monthLabel:new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN',{month:'long',year:'numeric'}),
      staff:selectedSummary.staff, basic:grossBase, allowances:allow, deductions:ded, gross, net, note:payslipNote||'',
      workedDays:selectedSummary.workedDays, presentDays:selectedSummary.present, workedHours:selectedSummary.hours, breakHours:selectedSummary.breakHours,
      lateDays:selectedSummary.lateDays, generatedAt:new Date()
    });
  };

  const confirmPublishPayslip = async() => {
    if(!preview) return;
    setPayBusy(true);
    try {
      await call('/platform/staff-payslips',{method:'post',data:{userId:preview.userId,month:preview.month,gross:preview.gross,earnings:{basic:preview.basic,allowances:preview.allowances,workedDays:preview.workedDays,workedHours:preview.workedHours,presentDays:preview.presentDays,breakHours:preview.breakHours,lateDays:preview.lateDays},deductions:{other:preview.deductions},net:preview.net,status:'PUBLISHED',notes:preview.note,createdBy:'COMMAND_CENTER'}});
      show('Payslip confirmed, saved and sent to the staff member.');
      setPreview(null); pays.refresh();
    } catch(e) { show(e.response?.data?.message||'Payslip publishing failed.','error'); }
    finally { setPayBusy(false); }
  };

  const printPreview = () => {
    if(!preview) return;
    setTimeout(()=>window.print(),100);
  };

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;

  return <>
    <Toast toast={toast} />
    <PageHeader title="Staff Attendance & Payroll" sub="A complete HR control center for live duty, monthly attendance, work history, salary preparation and confirmed payslips." />

    <div className="att-hero-grid">
      <div className="att-hero-card"><div className="att-hero-icon"><Clock size={22}/></div><div><span>Live on duty</span><strong>{liveNow}</strong><small>Currently clocked in</small></div></div>
      <div className="att-hero-card"><div className="att-hero-icon"><CalendarDays size={22}/></div><div><span>Worked days</span><strong>{totalWorkedDays}</strong><small>Completed shifts in {month}</small></div></div>
      <div className="att-hero-card"><div className="att-hero-icon"><CheckCircle size={22}/></div><div><span>Attendance rate</span><strong>{attendanceRate}%</strong><small>{totalPresent} present entries · {daysInMonth} calendar days</small></div></div>
      <div className="att-hero-card"><div className="att-hero-icon"><DollarSign size={22}/></div><div><span>Work hours</span><strong>{totalHours.toFixed(1)}h</strong><small>{totalBreakHours.toFixed(1)}h recorded breaks</small></div></div>
    </div>

    <div className="att-control-card">
      <div><div className="att-eyebrow">ATTENDANCE CONTROL CENTER</div><h3>Monthly staff register</h3><p>Inspect every clock event, duty state, breaks, late records and payroll inputs for the selected month.</p></div>
      <div className="att-controls">
        <label>Month<input type="month" value={month} onChange={e=>{setMonth(e.target.value);setSelected(null);setPreview(null)}}/></label>
        <label>Staff<select value={staffId} onChange={e=>{setStaffId(e.target.value);setSelected(null);setPreview(null)}}><option value="ALL">All staff</option>{staff.map(s=><option key={s._id} value={s._id}>{s.name} · {s.role}</option>)}</select></label>
        <button className="btn-ghost" onClick={refresh}><RefreshCw size={14}/> Refresh live</button>
      </div>
    </div>

    <div className="att-insight-grid">
      <div><span>Present entries</span><b>{totalPresent}</b><small>Clock-in records</small></div>
      <div><span>Late days</span><b>{totalLateDays}</b><small>Late clock-ins recorded</small></div>
      <div><span>Break time</span><b>{totalBreakHours.toFixed(1)}h</b><small>Across visible staff</small></div>
      <div><span>Avg hours / worked day</span><b>{totalWorkedDays ? (totalHours/totalWorkedDays).toFixed(2) : '0.00'}h</b><small>Based on completed shifts</small></div>
    </div>

    <div className="att-layout">
      <section className="att-main-panel">
        <div className="att-panel-head"><div><h3>Staff monthly ledger</h3><p>Click a staff member to open their full monthly attendance and payroll workspace.</p></div><span className="att-month-badge">{month}</span></div>
        <div className="att-staff-grid">
          {monthRows.length ? monthRows.map(row=>{
            const s=row.staff||{}; const isSel=selectedSummary&&String(selectedSummary.staff?._id)===String(s._id);
            return <button key={s._id} className={`att-staff-card ${isSel?'selected':''}`} onClick={()=>openStaff(row)}>
              <div className="att-avatar">{(s.name||'?').slice(0,1).toUpperCase()}</div>
              <div className="att-staff-copy"><strong>{s.name||'Unnamed staff'}</strong><span>{s.role||'Staff'}{s.email?` · ${s.email}`:''}</span><small>{row.present} present · {row.lateDays} late · {row.breakHours.toFixed(1)}h break</small></div>
              <div className="att-stat"><b>{row.workedDays}</b><small>days</small></div><div className="att-stat"><b>{row.hours.toFixed(1)}</b><small>hours</small></div>
              <span className={`att-live-pill ${row.live?'live':''}`}>{row.live?'LIVE':'OFF DUTY'}</span><ChevronRight size={17}/>
            </button>
          }) : <div className="att-empty"><Clock size={34}/><h4>No staff attendance records</h4><p>No staff records are available for this month.</p></div>}
        </div>
      </section>

      <aside className="att-sidebar">
        {!selectedSummary ? <div className="att-side-empty"><div className="att-side-orb"><Users size={28}/></div><h3>Staff details</h3><p>Select a staff member to open their complete monthly history, duty analytics and payroll workspace.</p></div> : <>
          <div className="att-profile-head"><div className="att-avatar large">{(selectedSummary.staff?.name||'?').slice(0,1).toUpperCase()}</div><div><h3>{selectedSummary.staff?.name}</h3><span>{selectedSummary.staff?.role||'Staff'}</span><small>{selectedSummary.staff?.email||''} {selectedSummary.staff?.phone?`· ${selectedSummary.staff.phone}`:''}</small></div><button className="btn-icon" onClick={()=>setSelected(null)}><X size={16}/></button></div>
          <div className="att-kpi-row"><div><b>{selectedSummary.workedDays}</b><span>Worked days</span></div><div><b>{selectedSummary.hours.toFixed(1)}h</b><span>Worked hours</span></div><div><b>{selectedSummary.present}</b><span>Present</span></div></div>
          <div className="att-detail-strip"><span>Late days <b>{selectedSummary.lateDays}</b></span><span>Breaks <b>{selectedSummary.breakHours.toFixed(1)}h</b></span><span>Duty <b>{selectedSummary.live?'LIVE':'OFF'}</b></span></div>
          <div className="att-section"><div className="att-section-title">Complete history · {month}</div><div className="att-history">
            {selectedSummary.records.length ? selectedSummary.records.map((r,i)=><div className="att-history-row" key={r._id||i}><div className="att-date-dot"><span>{new Date(r.dateKey||r.clockIn).getDate()}</span></div><div><strong>{fmtDate(r.dateKey||r.clockIn)}</strong><small>{fmtTime(r.clockIn)} → {r.clockOut?fmtTime(r.clockOut):'LIVE'} · {hours(r.workedHours)} · break {hours(r.breakHours)}</small>{(r.lateMinutes||r.earlyMinutes)?<em>Late {r.lateMinutes||0}m · Early {r.earlyMinutes||0}m</em>:null}</div><span className={`att-status ${r.live?'live':''}`}>{r.live?'LIVE':r.clockIn?'PRESENT':'ABSENT'}</span></div>) : <p className="att-muted">No entries for this month.</p>}
          </div></div>
          <div className="att-section payroll-box"><div className="att-section-title"><span>Payroll preparation</span><span className="att-mini-label">PREVIEW → CONFIRM → SEND</span></div>
            <div className="att-pay-grid"><label>Basic salary<input type="number" min="0" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="0"/></label><label>Allowances<input type="number" min="0" value={allowance} onChange={e=>setAllowance(e.target.value)}/></label><label>Deductions<input type="number" min="0" value={deduction} onChange={e=>setDeduction(e.target.value)}/></label></div>
            <label className="att-note-label">Payslip note<textarea value={payslipNote} onChange={e=>setPayslipNote(e.target.value)} placeholder="Optional note for the employee / payroll file"/></label>
            <div className="att-pay-total"><span>Net payable</span><strong>{money(Number(salary||0)+Number(allowance||0)-Number(deduction||0))}</strong></div>
            <div className="att-pay-actions"><button className="btn-primary" disabled={payBusy} onClick={buildPayslipPreview}><Eye size={15}/> Preview payslip</button></div>
            <div className="att-pay-hint"><ShieldCheck size={14}/> Nothing is saved or sent until you confirm the preview.</div>
          </div>
          <div className="att-section"><div className="att-section-title">Saved payslips <span className="att-mini-label">HISTORY</span></div>{pays.loading?<div className="att-muted">Loading…</div>:pays.data?.length?<div className="att-payslip-list">{pays.data.slice(0,8).map(p=><div className="att-payslip-row" key={p._id}><div><strong>{p.month}</strong><small>Net {money(p.net)} · {fmtDate(p.createdAt)} · {p.status||'PUBLISHED'}</small></div><span>{p.status||'PUBLISHED'}</span></div>)}</div>:<div className="att-muted">No payslip generated for this month.</div>}</div>
        </>}
      </aside>
    </div>

    <div className="att-footer-note"><ShieldCheck size={16}/><span>Attendance is read from the existing staff clock-in / clock-out system. Payroll is separated from attendance; previewing never changes attendance data.</span></div>

    {preview && <div className="att-preview-backdrop" role="dialog" aria-modal="true">
      <div className="att-preview-modal">
        <div className="att-preview-head"><div><span className="att-eyebrow">PAYSLIP PREVIEW</span><h2>{preview.monthLabel}</h2><p>Review every value before the payslip is saved and sent to the staff member.</p></div><button className="btn-icon" onClick={()=>setPreview(null)}><X size={18}/></button></div>
        <div className="att-slip-paper" id="staff-payslip-preview">
          <div className="att-slip-brand"><div><strong>EV PLATFORM</strong><span>STAFF PAYSLIP</span></div><b>{preview.monthLabel}</b></div>
          <div className="att-slip-employee"><div><small>EMPLOYEE</small><strong>{preview.staff?.name||'Staff'}</strong><span>{preview.staff?.role||'Staff'} · {preview.staff?.email||''}</span></div><div><small>PAYROLL PERIOD</small><strong>{preview.month}</strong><span>Generated {fmtDate(preview.generatedAt)}</span></div></div>
          <div className="att-slip-grid"><div><span>Present days</span><b>{preview.presentDays}</b></div><div><span>Worked days</span><b>{preview.workedDays}</b></div><div><span>Worked hours</span><b>{preview.workedHours.toFixed(2)}h</b></div><div><span>Break hours</span><b>{preview.breakHours.toFixed(2)}h</b></div><div><span>Late days</span><b>{preview.lateDays}</b></div></div>
          <div className="att-slip-money"><div><span>Basic salary</span><b>{money(preview.basic)}</b></div><div><span>Allowances</span><b>{money(preview.allowances)}</b></div><div><span>Gross earnings</span><b>{money(preview.gross)}</b></div><div><span>Deductions</span><b>- {money(preview.deductions)}</b></div><div className="net"><span>NET PAYABLE</span><b>{money(preview.net)}</b></div></div>
          {preview.note&&<div className="att-slip-note"><small>ADMIN NOTE</small><p>{preview.note}</p></div>}
          <div className="att-slip-footer"><span>Prepared by Command Center</span><span>Attendance-linked payroll record</span></div>
        </div>
        <div className="att-preview-actions"><button className="btn-ghost" onClick={()=>setPreview(null)}>Back & edit</button><button className="btn-ghost" onClick={printPreview}><FileText size={15}/> Print preview</button><button className="btn-primary" disabled={payBusy} onClick={confirmPublishPayslip}><CheckCircle size={15}/>{payBusy?'Publishing…':'Confirm & send to staff'}</button></div>
      </div>
    </div>}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// ADMIN LEAVE APPROVALS — Moved from Fleet Operator Portal
// ══════════════════════════════════════════════════════════════════
function AdminLeaveApprovals({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/platform/leave-requests');
  const [tab, setTab] = useState('pending');
  const { toast, show } = useToast();

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  const handleDecision = async (id, staffName, action) => {
    if (!window.confirm(`${action === 'approve' ? 'Approve' : 'Reject'} leave for ${staffName}?`)) return;
    try {
      await call(`/platform/leave-requests/${id}/${action}`, { method: 'put' });
      show(`Leave ${action === 'approve' ? 'approved' : 'rejected'}.`);
      refresh();
    } catch(e) { show(e.response?.data?.message || 'Action failed','error'); }
  };

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;

  const records = data || [];
  const pending  = records.filter(r => r.status === 'PENDING');
  const approved = records.filter(r => r.status === 'APPROVED');
  const rejected = records.filter(r => r.status === 'REJECTED');
  const display  = tab==='pending' ? pending : tab==='approved' ? approved : rejected;

  return (
    <>
      <Toast toast={toast} />
      <PageHeader title="Leave Approvals" sub="Review and approve leave requests submitted by staff across all fleet operators." />
      <MetricGrid metrics={[
        { label:'Pending',  value: pending.length,  Icon: Clock,       color:'#d97706' },
        { label:'Approved', value: approved.length, Icon: UserCheck,   color:'#16a34a' },
        { label:'Rejected', value: rejected.length, Icon: UserX,       color:'#dc2626' },
        { label:'Total',    value: records.length,  Icon: FileText,    color:'#2563eb' },
      ]} />

      {pending.length > 0 && (
        <InfoBanner Icon={Clock}>{pending.length} leave request(s) awaiting your decision.</InfoBanner>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'2px solid #e5e7eb' }}>
        {[['pending','Pending',pending.length],['approved','Approved',approved.length],['rejected','Rejected',rejected.length]].map(([key,label,cnt]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding:'8px 18px', border:'none', background:'none', cursor:'pointer', fontWeight:700, fontSize:13,
            borderBottom: tab===key ? '2px solid #2563eb' : '2px solid transparent',
            color: tab===key ? '#2563eb' : '#6b7280', marginBottom:'-2px',
            display:'flex', alignItems:'center', gap:6,
          }}>
            {label}
            <span style={{ background: tab===key?'#2563eb':'#e5e7eb', color: tab===key?'#fff':'#374151', borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700 }}>{cnt}</span>
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {!display.length && (
          <div className="card">
            <div className="empty-state"><FileText size={40} style={{ opacity:.2 }} /><p>No {tab} leave requests.</p></div>
          </div>
        )}
        {display.map(r => (
          <div key={r._id} className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{r.staffName||r.staff?.name||'Staff'}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                    {r.role||r.staff?.role||'—'} · Fleet: {r.franchiseeName||'—'}
                  </div>
                  <div style={{ fontSize:12, color:'#374151', marginTop:6 }}>
                    <b>Leave Type:</b> {r.leaveType||'Annual'} &nbsp;·&nbsp;
                    <b>From:</b> {fmt(r.startDate)} &nbsp;·&nbsp;
                    <b>To:</b> {fmt(r.endDate)} &nbsp;·&nbsp;
                    <b>Duration:</b> {r.duration||r.days||'—'} day(s)
                  </div>
                  {r.reason && <div style={{ fontSize:12, color:'#374151', marginTop:4 }}><b>Reason:</b> {r.reason}</div>}
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Submitted: {fmtDt(r.createdAt)}</div>
                </div>
                <span style={{
                  padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:800,
                  background: r.status==='APPROVED'?'#dcfce7':r.status==='REJECTED'?'#fee2e2':'#fef3c7',
                  color: r.status==='APPROVED'?'#166534':r.status==='REJECTED'?'#dc2626':'#92400e',
                }}>{r.status}</span>
              </div>
            </div>
            {r.status === 'PENDING' && (
              <div style={{ padding:'10px 18px', background:'#f8fafc', borderTop:'1px solid #f1f5f9', display:'flex', gap:8 }}>
                <button onClick={() => handleDecision(r._id, r.staffName||'Staff', 'approve')}
                  style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                  ✅ Approve
                </button>
                <button onClick={() => handleDecision(r._id, r.staffName||'Staff', 'reject')}
                  style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN JOB MANAGEMENT — Moved from Fleet Operator Portal
// ══════════════════════════════════════════════════════════════════
function AdminJobManagement({ call }) {
  const { data, loading, error } = useFetch(call, '/platform/all-jobs');
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
  const fmtElapsed = s => { if(!s)return '0m'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;

  // Read job cards from localStorage
  const allCards = JSON.parse(localStorage.getItem('ev_franchise_job_cards')||'[]');
  const apiJobs  = data || [];

  // Merge
  const allJobs = allCards.length ? allCards : apiJobs;

  const display = tab==='all' ? allJobs
    : tab==='pending'     ? allJobs.filter(j=>j.status==='PENDING')
    : tab==='in_progress' ? allJobs.filter(j=>j.status==='IN_PROGRESS')
    : tab==='paused'      ? allJobs.filter(j=>j.status==='PAUSED')
    : allJobs.filter(j=>j.status==='COMPLETED');

  const STATUS_COLOR = { PENDING:'#7c3aed', IN_PROGRESS:'#2563eb', PAUSED:'#d97706', COMPLETED:'#16a34a' };

  return (
    <>
      <PageHeader title="Jobs" sub="All vehicle service jobs and work orders across fleet operators." />
      <MetricGrid metrics={[
        { label:'Total Jobs',    value: allJobs.length,                                     Icon: ClipboardList, color:'#2563eb' },
        { label:'In Progress',  value: allJobs.filter(j=>j.status==='IN_PROGRESS').length,  Icon: Activity,      color:'#2563eb' },
        { label:'Paused',       value: allJobs.filter(j=>j.status==='PAUSED').length,       Icon: Clock,         color:'#d97706' },
        { label:'Completed',    value: allJobs.filter(j=>j.status==='COMPLETED').length,    Icon: CheckCircle,   color:'#16a34a' },
      ]} />

      <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'2px solid #e5e7eb', flexWrap:'wrap' }}>
        {[
          ['all','All',allJobs.length],
          ['pending','⏳ Pending',allJobs.filter(j=>j.status==='PENDING').length],
          ['in_progress','▶ In Progress',allJobs.filter(j=>j.status==='IN_PROGRESS').length],
          ['paused','⏸ Paused',allJobs.filter(j=>j.status==='PAUSED').length],
          ['completed','✅ Completed',allJobs.filter(j=>j.status==='COMPLETED').length],
        ].map(([key,label,cnt]) => (
          <button key={key} onClick={()=>setTab(key)} style={{
            padding:'8px 16px', border:'none', background:'none', cursor:'pointer', fontWeight:700, fontSize:13,
            borderBottom: tab===key?'2px solid #2563eb':'2px solid transparent',
            color: tab===key?'#2563eb':'#6b7280', marginBottom:'-2px',
            display:'flex', alignItems:'center', gap:6,
          }}>
            {label}
            <span style={{ background:tab===key?'#2563eb':'#e5e7eb', color:tab===key?'#fff':'#374151', borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700 }}>{cnt}</span>
          </button>
        ))}
      </div>

      {!display.length && (
        <div className="card">
          <div className="empty-state"><ClipboardList size={40} style={{ opacity:.2 }} /><p>No {tab.replace('_',' ')} jobs.</p></div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
        {display.map((jc, i) => {
          const color = STATUS_COLOR[jc.status]||'#64748b';
          return (
            <div key={jc._id||jc.id||i} onClick={() => setSelected(selected?.id===jc.id?null:jc)}
              style={{
                border:`2px solid ${selected?.id===jc.id?color:'#e2e8f0'}`,
                borderTop:`4px solid ${color}`, borderRadius:14, overflow:'hidden',
                background:'#fff', cursor:'pointer', transition:'border-color .15s',
                boxShadow: selected?.id===jc.id ? `0 0 0 3px ${color}22` : '0 1px 4px rgba(0,0,0,.06)',
              }}>
              <div style={{ padding:'14px 16px 10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#111827' }}>
                    🚗 {jc.vehicleMake||''} {jc.vehicleModel||''}
                  </div>
                  <span style={{
                    fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, flexShrink:0,
                    background:`${color}18`, color,
                  }}>{jc.status}</span>
                </div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:6 }}>
                  🔖 {jc.vehicleReg||'—'} &nbsp;·&nbsp; 👤 {jc.customerName||'—'}
                </div>
                <div style={{ fontSize:12, color:'#374151', lineHeight:1.5 }}>
                  <b>Problem:</b> {jc.problem||jc.description||'—'}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 16px', background:'rgba(0,0,0,.025)', borderTop:'1px solid rgba(0,0,0,.06)', fontSize:12, color:'#475569', flexWrap:'wrap' }}>
                <span>👷 {jc.staffName||'Unassigned'}</span>
                <span style={{ padding:'1px 8px', borderRadius:99, fontSize:11, fontWeight:700,
                  background: jc.priority==='URGENT'||jc.priority==='HIGH'?'#fee2e2':'#f1f5f9',
                  color: jc.priority==='URGENT'||jc.priority==='HIGH'?'#dc2626':'#475569',
                }}>⚡ {jc.priority||'NORMAL'}</span>
                {(jc.elapsedSeconds||0)>0 && <span>⏱ {fmtElapsed(jc.elapsedSeconds)}</span>}
              </div>
              {selected?.id === jc.id && (
                <div style={{ padding:16, borderTop:`2px solid ${color}`, background:'#f8fafc' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                    {[
                      ['Customer', jc.customerName],
                      ['Phone', jc.customerPhone],
                      ['Vehicle', `${jc.vehicleMake||''} ${jc.vehicleModel||''}`],
                      ['Reg No.', jc.vehicleReg],
                      ['Staff', jc.staffName||'Unassigned'],
                      ['Priority', jc.priority],
                      ['Created', fmtDt(jc.createdAt)],
                      jc.startedAt && ['Started', fmtDt(jc.startedAt)],
                      jc.completedAt && ['Completed', fmtDt(jc.completedAt)],
                    ].filter(Boolean).map(([k,v]) => (
                      <div key={k} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:12 }}>
                        <div style={{ color:'#94a3b8', fontSize:11, marginBottom:2 }}>{k}</div>
                        <div style={{ fontWeight:700, color:'#111827' }}>{v||'—'}</div>
                      </div>
                    ))}
                  </div>
                  {jc.pauseReason && (
                    <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#92400e', marginBottom:8 }}>
                      ⏸ <b>Pause Reason:</b> {jc.pauseReason}
                    </div>
                  )}
                  {jc.remarks && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#166534' }}>
                      📝 <b>Remarks:</b> {jc.remarks}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// STAFF COMMUNICATIONS / SUPPORT
// ══════════════════════════════════════════════════════════════════
function AdminStaffCommunications({call}) {
  const [tab,setTab]=useState('notify'); const [staff,setStaff]=useState([]); const [history,setHistory]=useState([]); const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({title:'',message:'',banner:false,role:'ALL',hubId:'ALL',staffIds:[]});
  const [hr,setHr]=useState({type:'document',userId:'',title:'',month:'',gross:'',net:'',url:'',dateKey:'',startTime:'09:00',endTime:'18:00',location:'',badge:'',description:'',checkTitle:'',items:''});
  const load=async()=>{try{const [st,h]=await Promise.all([call('/platform/all-staff'),call('/platform/staff-notifications')]);setStaff(st||[]);setHistory(h||[])}catch(e){console.error(e)}};
  useEffect(()=>{load()},[]);
  const send=async()=>{if(!form.title||!form.message)return alert('Title and message are required');setBusy(true);try{await call('/platform/staff-notifications',{method:'post',data:form});setForm({...form,title:'',message:''});await load();alert('Notification sent to matching staff')}catch(e){alert(e.response?.data?.message||e.message)}finally{setBusy(false)}};
  const create=async()=>{if(!hr.userId)return alert('Select a staff member');setBusy(true);try{if(hr.type==='document')await call('/platform/staff-documents',{method:'post',data:{userId:hr.userId,title:hr.title,type:'Staff Document',url:hr.url}});if(hr.type==='payslip')await call('/platform/staff-payslips',{method:'post',data:{userId:hr.userId,month:hr.month,gross:Number(hr.gross),net:Number(hr.net),url:hr.url,earnings:{Basic:hr.gross},deductions:{}}});if(hr.type==='shift')await call('/platform/staff-shifts',{method:'post',data:{userId:hr.userId,dateKey:hr.dateKey,startTime:hr.startTime,endTime:hr.endTime,location:hr.location,status:'SCHEDULED'}});if(hr.type==='recognition')await call('/platform/staff-recognition',{method:'post',data:{userId:hr.userId,title:hr.title,description:hr.description,badge:hr.badge}});if(hr.type==='checklist')await call('/platform/staff-checklists',{method:'post',data:{userId:hr.userId,dateKey:hr.dateKey||new Date().toISOString().slice(0,10),title:hr.checkTitle,items:hr.items.split('\n').filter(Boolean).map(label=>({label,done:false}))}});alert('Saved and connected to Staff Portal')}catch(e){alert(e.response?.data?.message||e.message)}finally{setBusy(false)}};
  return <><PageHeader title="Staff Communications" sub="Send live announcements and publish staff resources from Command Center."/><div className="admin-feature-tabs"><button className={tab==='notify'?'active':''} onClick={()=>setTab('notify')}><Megaphone size={15}/> Notifications</button><button className={tab==='hr'?'active':''} onClick={()=>setTab('hr')}><FilePlus2 size={15}/> Staff publishing</button></div>{tab==='notify'?<div className="command-comm-grid"><div className="card"><div className="card-head"><div className="card-title">Send to staff</div><span className="badge">Live</span></div><div className="comm-banner-preview"><Megaphone size={20}/><div><b>{form.title||'Announcement preview'}</b><span>{form.message||'Your message will appear in Staff Notifications.'}</span></div></div><div className="form-grid"><label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Service update"/></label><label>Audience<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="ALL">All staff</option><option value="STAFF">Staff</option><option value="TECHNICIAN">Technicians</option><option value="HUB_MANAGER">Hub Managers</option></select></label><label className="full">Message<textarea rows="5" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Write the message…"/></label><label className="switch-field full"><input type="checkbox" checked={form.banner} onChange={e=>setForm({...form,banner:e.target.checked})}/><span><b>Show as priority banner</b><small>Staff sees a banner-style notification.</small></span></label></div><button className="btn-primary" disabled={busy} onClick={send}><Send size={15}/> {busy?'Sending…':'Send notification'}</button></div><div className="card"><div className="card-head"><div className="card-title">Delivery history</div><span className="badge">{history.length}</span></div><div className="comm-history">{history.slice(0,12).map(n=><div className="comm-history-row" key={n._id}><span className={n.data?.banner?'banner-mark':''}>{n.data?.banner?'Banner':'Message'}</span><div><b>{n.title}</b><small>{n.userId?.name||n.userId?.email||'Staff'} · {new Date(n.createdAt).toLocaleString('en-IN')}</small></div></div>)}</div></div></div>:<div className="card"><div className="card-head"><div className="card-title">Publish staff resource</div><span className="badge">Connected</span></div><div className="form-grid"><label>Staff member<select value={hr.userId} onChange={e=>setHr({...hr,userId:e.target.value})}><option value="">Select staff</option>{staff.map(x=><option key={x._id} value={x._id}>{x.name} · {x.role}</option>)}</select></label><label>Resource<select value={hr.type} onChange={e=>setHr({...hr,type:e.target.value})}><option value="document">Document</option><option value="payslip">Payslip</option><option value="shift">Shift</option><option value="recognition">Recognition</option><option value="checklist">Daily checklist</option></select></label>{hr.type==='document'&&<><label>Document title<input value={hr.title} onChange={e=>setHr({...hr,title:e.target.value})}/></label><label>Document URL<input value={hr.url} onChange={e=>setHr({...hr,url:e.target.value})}/></label></>}{hr.type==='payslip'&&<><label>Month<input value={hr.month} onChange={e=>setHr({...hr,month:e.target.value})} placeholder="September 2026"/></label><label>Gross<input type="number" value={hr.gross} onChange={e=>setHr({...hr,gross:e.target.value})}/></label><label>Net take-home<input type="number" value={hr.net} onChange={e=>setHr({...hr,net:e.target.value})}/></label><label>Payslip URL<input value={hr.url} onChange={e=>setHr({...hr,url:e.target.value})}/></label></>}{hr.type==='shift'&&<><label>Date<input type="date" value={hr.dateKey} onChange={e=>setHr({...hr,dateKey:e.target.value})}/></label><label>Start<input type="time" value={hr.startTime} onChange={e=>setHr({...hr,startTime:e.target.value})}/></label><label>End<input type="time" value={hr.endTime} onChange={e=>setHr({...hr,endTime:e.target.value})}/></label><label>Location<input value={hr.location} onChange={e=>setHr({...hr,location:e.target.value})}/></label></>}{hr.type==='recognition'&&<><label>Title<input value={hr.title} onChange={e=>setHr({...hr,title:e.target.value})}/></label><label>Badge<input value={hr.badge} onChange={e=>setHr({...hr,badge:e.target.value})}/></label><label className="full">Description<textarea rows="3" value={hr.description} onChange={e=>setHr({...hr,description:e.target.value})}/></label></>}{hr.type==='checklist'&&<><label>Checklist title<input value={hr.checkTitle} onChange={e=>setHr({...hr,checkTitle:e.target.value})}/></label><label>Date<input type="date" value={hr.dateKey} onChange={e=>setHr({...hr,dateKey:e.target.value})}/></label><label className="full">Items <textarea rows="7" value={hr.items} onChange={e=>setHr({...hr,items:e.target.value})} placeholder="Inspect charger\nCheck cable\nTake proof photos"/></label></>}</div><button className="btn-primary" disabled={busy} onClick={create}><CheckCircle size={15}/> Publish to Staff</button></div>}</>;
}

function AdminStaffSupport({call}) { const {data,loading,refresh}=useFetch(call,'/platform/support-tickets'); const [reply,setReply]=useState({}); const update=async(id,status)=>{try{await call(`/platform/support-tickets/${id}`,{method:'put',data:{status,message:reply[id]||''}});setReply(r=>({...r,[id]:''}));refresh()}catch(e){alert(e.response?.data?.message||e.message)}}; return <><PageHeader title="Staff Support" sub="Manage staff requests and continue the conversation."/><div className="feature-stack">{loading?<Loader/>:!(data||[]).length?<div className="empty-state"><MessageSquare size={40}/><p>No staff support tickets.</p></div>:(data||[]).map(t=><div className="card support-admin-card" key={t._id}><div className="card-head"><div><div className="card-title">#{t.ticketNo} · {t.subject}</div><div className="page-sub">{t.userId?.name||'Staff'} · {t.category} · {t.priority}</div></div><span className="status-pill">{t.status}</span></div><p className="support-admin-desc">{t.description}</p><div className="admin-thread">{(t.messages||[]).slice(-5).map((m,i)=><div key={i}><b>{m.senderRole}</b><span>{m.message}</span></div>)}</div><div className="admin-reply"><input placeholder="Reply to staff…" value={reply[t._id]||''} onChange={e=>setReply(r=>({...r,[t._id]:e.target.value}))}/><button onClick={()=>update(t._id,'IN_PROGRESS')}><Send size={15}/></button><button onClick={()=>update(t._id,'RESOLVED')}><CheckCircle size={15}/> Resolve</button></div></div>)}</div></>}

function MaintenanceCustomerService({call}) {
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('ALL'),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[notes,setNotes]=useState('');
  const [staff,setStaff]=useState([]),[staffId,setStaffId]=useState(''),[assigning,setAssigning]=useState(false),[detailView,setDetailView]=useState(null);
  const load=async()=>{setLoading(true);try{const [items,people]=await Promise.all([call('/platform/maintenance-customer-service'),call('/platform/all-staff')]);setRows(items||[]);setStaff((people||[]).filter(x=>x.active!==false));}catch(e){}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const openService=m=>{setSelected(m);setDetailView(null);setNotes(m.notes||m.completionSummary||'');setStaffId(m.commandAssignedTo?._id||m.commandAssignedTo||'');};
  const assignStaff=async()=>{if(!selected||!staffId)return;setAssigning(true);try{const m=await call(`/platform/maintenance-customer-service/${selected._id}/assign`,{method:'put',data:{staffId}});setRows(x=>x.map(r=>r._id===m._id?m:r));setSelected(m);setStaffId(m.commandAssignedTo?._id||m.commandAssignedTo||staffId);alert('Maintenance job card assigned to staff.')}catch(e){alert(e.response?.data?.message||'Could not assign staff')}finally{setAssigning(false)}};
  const update=async status=>{if(!selected)return;setBusy(true);try{const m=await call(`/platform/maintenance-customer-service/${selected._id}/status`,{method:'put',data:{status,notes,completionSummary:notes}});setRows(x=>x.map(r=>r._id===m._id?m:r));setSelected(m);if(status==='COMPLETED')alert('Service completed. Customer and fleet operator were notified.')}catch(e){alert(e.response?.data?.message||'Could not update service')}finally{setBusy(false)}};
  const shown=filter==='ALL'?rows:rows.filter(x=>x.status===filter); const counts={ALL:rows.length,SCHEDULED:rows.filter(x=>x.status==='SCHEDULED').length,IN_PROGRESS:rows.filter(x=>x.status==='IN_PROGRESS').length,COMPLETED:rows.filter(x=>x.status==='COMPLETED').length};
  return <div className="maintenance-command-page"><div className="page-header"><div><div className="eyebrow">SERVICE OPERATIONS</div><h1>Maintenance Customer Service</h1><p>Receive fleet maintenance registrations, assign the right staff member, monitor the job card and close the service.</p></div><button className="btn-ghost" onClick={load}>↻ Refresh</button></div>
  <div className="maintenance-command-hero"><div><span>Live service queue</span><strong>{rows.filter(x=>!['COMPLETED','CANCELLED'].includes(x.status)).length}</strong><small>services requiring Command Center attention</small></div><div className="maintenance-command-hero-icon">🛠️</div></div>
  <div className="maintenance-filter-row">{[['ALL','All'],['SCHEDULED','New'],['IN_PROGRESS','In Service'],['COMPLETED','Completed']].map(([k,l])=><button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{l}<span>{counts[k]||0}</span></button>)}</div>
  {loading?<div className="command-empty-state">Loading maintenance services…</div>:!shown.length?<div className="command-empty-state"><div>🛠️</div><b>No maintenance requests</b><span>New fleet maintenance registrations will appear here.</span></div>:<div className="maintenance-command-grid">{shown.map(m=>{const v=m.vehicleId||{},c=m.customerId||{},f=m.franchiseeId||{};const displayStatus=m.status==='COMPLETED'?'COMPLETED':m.staffStatus==='COMPLETED'?'STAFF_COMPLETED':m.staffStatus==='PAUSED'?'PAUSED':m.status;return <article className="command-maint-card" key={m._id} onClick={()=>openService(m)}><div className="command-maint-head"><div><span>{m.priority||'NORMAL'} PRIORITY</span><h3>{m.title||m.type||'Maintenance Service'}</h3></div><b className={`command-status status-${String(displayStatus||'').toLowerCase()}`}>{String(displayStatus||'').replace('_',' ')}</b></div><div className="command-vehicle-strip">🚗 <b>{m.bikeId||v.bikeId||'Bike ID —'}</b> <span>{v.make||''} {v.model||''} · {v.registrationNo||'No registration'}</span></div><div className="command-customer"><div className="customer-avatar">{(c.name||'?')[0]}</div><div><b>{c.name||'Customer not linked'}</b><span>{c.phone||c.email||'—'}</span></div><div className="operator-chip">Fleet · {f.name||'—'}</div></div><div className="command-maint-details"><span>📅 {new Date(m.createdAt).toLocaleDateString('en-IN')}</span><span>🔧 {m.vendor||'Vendor pending'}</span><span>👨‍🔧 {m.commandAssignedTo?.name||'Staff not assigned'}</span></div>{m.customerFeedback?.rating&&<div className="command-feedback-mini">⭐ {m.customerFeedback.rating}/5 · {m.customerFeedback.comment||'Customer feedback received'}</div>}<div className="command-maint-footer"><span>{m.staffStatus==='COMPLETED'&&m.status!=='COMPLETED'?'Staff completed · Awaiting Command Center':m.commandJobId?'Job card created':'Assign staff to create job card'}</span><span>›</span></div></article>})}</div>}
  {selected&&<div className="modal-overlay" onClick={()=>{setSelected(null);setDetailView(null)}}><div className="modal-drawer maintenance-command-drawer" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="modal-title">Maintenance Service</div><div className="modal-subtitle">{selected.bikeId||selected.vehicleId?.bikeId||'Bike'} · {selected.title||selected.type}</div></div><button className="icon-btn" onClick={()=>setSelected(null)}>✕</button></div><div className="modal-body"><div className="command-detail-grid"><div><small>Bike ID</small><strong>{selected.bikeId||selected.vehicleId?.bikeId||'—'}</strong><span>{selected.vehicleId?.registrationNo||'No registration'}</span></div><div><small>Customer</small><strong>{selected.customerId?.name||'—'}</strong><span>{selected.customerId?.phone||selected.customerId?.email||'—'}</span></div><div><small>Fleet Operator</small><strong>{selected.franchiseeId?.name||'—'}</strong><span>{selected.franchiseeId?.email||'—'}</span></div><div><small>Vehicle</small><strong>{selected.vehicleId?.make} {selected.vehicleId?.model}</strong><span>{selected.vehicleId?.registrationNo||'—'}</span></div><div><small>Vendor</small><strong>{selected.vendor||'—'}</strong><span>{selected.vendorLocation||'—'}</span></div><div><small>Job Card</small><strong>{selected.commandJobId?'Created':'Not created'}</strong><span>{selected.commandAssignedTo?.name||'Staff not assigned'}</span>{selected.staffStatus&&<em style={{display:'block',marginTop:4,fontSize:11,color:'#64748b'}}>Staff: {String(selected.staffStatus).replace('_',' ')}</em>}</div></div>
  <div className="maintenance-assignment-panel"><div><b>Assign staff / create job card</b><small>Select a staff member. A connected job + job card will be created in Staff Portal automatically.</small></div><div className="maintenance-assignment-row"><select value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">Select staff member</option>{staff.map(x=><option key={x._id} value={x._id}>{x.name} · {x.role}{x.phone?` · ${x.phone}`:''}</option>)}</select><button className="btn-primary" disabled={!staffId||assigning} onClick={assignStaff}>{assigning?'Assigning…':selected.commandJobId?'Reassign Job':'Assign & Create Job Card'}</button></div>{selected.commandAssignedTo?.name&&<div className="assigned-staff-chip">👨‍🔧 Assigned to <b>{selected.commandAssignedTo.name}</b> · {selected.commandAssignedTo.role||'Staff'}</div>}</div>
  {(() => { const pauses=selected.staffPauseHistory?.length?selected.staffPauseHistory:(selected.proof?.pauseHistory?.length?selected.proof.pauseHistory:(selected.commandJobId?.pauseHistory||[])); const hasCompletion=selected.staffStatus==='COMPLETED'||selected.proof?.report; return <div className="service-detail-panel" style={{background:'#f8fafc',borderColor:'#e2e8f0'}}><b>Staff Work Details</b><div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}>{pauses.length>0&&<button type="button" className="btn-ghost" onClick={()=>setDetailView('pause')}>⏸ View Pause Details <span style={{marginLeft:5}}>({pauses.length})</span></button>}{hasCompletion&&<button type="button" className="btn-primary" onClick={()=>setDetailView('completed')}>✓ View Staff Completed Details</button>}</div><small style={{display:'block',marginTop:9,color:'#64748b'}}>All details entered by Staff during Pause and Mark Complete are stored with this job and available here.</small></div>; })()}
{detailView && (() => { const pauses=selected.staffPauseHistory?.length?selected.staffPauseHistory:(selected.proof?.pauseHistory?.length?selected.proof.pauseHistory:(selected.commandJobId?.pauseHistory||[])); const r=selected.proof?.report||selected; const show=(v)=>v===undefined||v===null||v===''?'—':Array.isArray(v)?(v.length?v.join(', '):'—'):v; return <div className="modal-overlay" style={{zIndex:10050}} onClick={()=>setDetailView(null)}><div className="modal-drawer" style={{maxWidth:760}} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="modal-title">{detailView==='pause'?'Staff Pause Details':'Staff Completed Details'}</div><div className="modal-subtitle">{selected.bikeId||selected.vehicleId?.bikeId||'Bike'} · {selected.commandAssignedTo?.name||'Assigned Staff'}</div></div><button className="icon-btn" onClick={()=>setDetailView(null)}>✕</button></div><div className="modal-body">{detailView==='pause'?<div>{pauses.length===0?<div className="command-empty-state">No pause details recorded.</div>:pauses.map((pa,i)=><div key={i} style={{border:'1px solid #fde68a',background:'#fffbeb',borderRadius:12,padding:14,marginBottom:10}}><div style={{fontWeight:800,color:'#92400e',marginBottom:8}}>Pause #{i+1}</div><div className="command-detail-grid"><div><small>Reason</small><strong>{show(pa.reason)}</strong></div><div><small>Category</small><strong>{show(pa.category)}</strong></div><div><small>Paused At</small><strong>{pa.pausedAt?new Date(pa.pausedAt).toLocaleString('en-IN'):'—'}</strong></div><div><small>Resumed At</small><strong>{pa.resumedAt?new Date(pa.resumedAt).toLocaleString('en-IN'):'Still paused'}</strong></div><div><small>Expected Resume</small><strong>{pa.expectedResumeAt?new Date(pa.expectedResumeAt).toLocaleString('en-IN'):'—'}</strong></div><div><small>Pause Duration</small><strong>{pa.durationSeconds!=null?`${Math.floor(pa.durationSeconds/60)} min`:'—'}</strong></div></div><div style={{marginTop:10}}><small>Pause Details</small><p style={{margin:'4px 0 10px'}}>{show(pa.details)}</p><small>Work Completed Before Pause</small><p style={{margin:'4px 0 10px'}}>{show(pa.workCompletedBeforePause)}</p><small>Parts / Materials Required</small><p style={{margin:'4px 0 0'}}>{show(pa.partsRequired)}</p></div></div>)}</div>:<div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><div><small>Problem / Issue</small><strong>{show(r.issue||selected.problem||selected.description)}</strong></div><div><small>Diagnosis</small><strong>{show(r.diagnosis)}</strong></div><div><small>Root Cause</small><strong>{show(r.rootCause)}</strong></div><div><small>Work Performed</small><strong>{show(r.workPerformed)}</strong></div><div><small>Solution</small><strong>{show(r.solution)}</strong></div><div><small>Parts Replaced</small><strong>{show(r.partsReplaced)}</strong></div><div><small>Test / Verification</small><strong>{show(r.testResult)}</strong></div><div><small>Final Condition</small><strong>{show(r.finalCondition)}</strong></div><div><small>Recommendations</small><strong>{show(r.recommendations)}</strong></div><div><small>Next Service</small><strong>{r.nextServiceAt?new Date(r.nextServiceAt).toLocaleDateString('en-IN'):'—'}</strong></div><div><small>Labour Hours</small><strong>{show(r.labourHours)}</strong></div><div><small>Odometer</small><strong>{show(selected.proof?.odometerReading??selected.odometerReading)} km</strong></div><div><small>Battery</small><strong>{selected.proof?.batteryPercent??selected.batteryPercent??'—'}{selected.proof?.batteryPercent!=null||selected.batteryPercent!=null?'%':''}</strong></div><div><small>Completion Notes</small><strong>{show(r.completionNotes||selected.staffCompletionSummary)}</strong></div><div><small>Submitted At</small><strong>{selected.proof?.submittedAt?new Date(selected.proof.submittedAt).toLocaleString('en-IN'):(selected.staffCompletedAt?new Date(selected.staffCompletedAt).toLocaleString('en-IN'):'—')}</strong></div></div></div>}<div style={{marginTop:16,textAlign:'right'}}><button className="btn-ghost" onClick={()=>setDetailView(null)}>Close</button></div></div></div></div>; })()}
  <div className="service-detail-panel"><b>Service information</b><p>{selected.description||'No additional description provided.'}</p><div className="service-detail-line"><span>Registered</span><b>{new Date(selected.createdAt).toLocaleString('en-IN')}</b></div><div className="service-detail-line"><span>Scheduled</span><b>{selected.scheduledAt?new Date(selected.scheduledAt).toLocaleString('en-IN'):'—'}</b></div><div className="service-detail-line"><span>Odometer</span><b>{selected.odometerKm??'—'} km</b></div><div className="service-detail-line"><span>Battery SOC</span><b>{selected.batterySoc!=null?`${selected.batterySoc}%`:'—'}</b></div><div className="service-detail-line"><span>Next 45-day service</span><b>{selected.vehicleId?.nextGeneralServiceAt?new Date(selected.vehicleId.nextGeneralServiceAt).toLocaleDateString('en-IN'):'Managed from bike assignment'}</b></div></div><label>Command Center notes<textarea rows="4" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Work performed, parts used, completion summary…"/></label>{selected.customerFeedback?.rating&&<div className="command-feedback-panel"><b>Customer Feedback</b><strong>{'★'.repeat(selected.customerFeedback.rating)}{'☆'.repeat(5-selected.customerFeedback.rating)} · {selected.customerFeedback.rating}/5</strong><p>{selected.customerFeedback.comment||'No comment.'}</p><small>{selected.customerFeedback.submittedAt?new Date(selected.customerFeedback.submittedAt).toLocaleString('en-IN'):''}</small></div>}<div className="command-action-row">
    {selected.staffStatus==='COMPLETED' && selected.status!=='COMPLETED' && <div className="completed-banner" style={{background:'#fff7ed',color:'#9a3412',borderColor:'#fed7aa'}}>✓ Staff completed · Awaiting Command Center completion</div>}
    {selected.status==='SCHEDULED' && <div className="service-waiting-banner">Waiting for assigned staff to start the service.</div>}
    {selected.status==='IN_PROGRESS' && selected.staffStatus!=='COMPLETED' && <div className="service-waiting-banner">Service is being handled by the assigned staff member.</div>}
    {selected.staffStatus==='COMPLETED' && selected.status!=='COMPLETED' && <button className="btn-primary" disabled={busy} onClick={()=>update('COMPLETED')}>{busy?'Completing…':'✓ Mark Service Completed'}</button>}
    {selected.status==='COMPLETED'&&<span className="completed-banner">✓ Completed {selected.completedAt?new Date(selected.completedAt).toLocaleString('en-IN'):''}</span>}
  </div></div></div></div>}
  </div>;
}
