import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import allevLogo from '../allevlogo.png';
import {
  Activity, AlertTriangle, Car, CalendarDays, RotateCcw, CheckCircle, ClipboardList, DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin, Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText, Plus, X, Save, Upload, Clock, Image, Eye, Search, ChevronRight, UserX, UserCheck, UserMinus, Hash, Tag, Layers, Wrench, Building2, Edit2, Pencil, RefreshCw, ChevronLeft, Menu, MoreHorizontal, XCircle, Settings, User, Home, ShieldCheck, Check, Moon, Globe2, Type, LockKeyhole, Send, Gift
} from 'lucide-react';
import './franchisee.css';

const API = import.meta.env.VITE_API_URL || '/api';

// Portal identity is selected by the single-host path: /franchisee
const kind = 'franchisee';
const ALLOWED_ROLES = ['FRANCHISEE','CENTRAL_ADMIN','SUPER_ADMIN'];

const PORTAL_CFG = {
  customer:   { title: 'Customer Portal',       accent: 'Customer Operations' },
  staff:      { title: 'Staff Portal',          accent: 'Service Operations' },
  franchisee: { title: 'Fleet Operator Portal', accent: 'Fleet Operations', email: 'franchise@ev.local' },
  command:    { title: 'Central Command',        accent: 'Enterprise Control' },
};
const cfg = PORTAL_CFG[kind];

// ── Local storage helper (shared with Staff portal) ──
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

const NAV_ITEMS = {
  franchisee: [
    // ── Overview ──
    { id: 'dashboard',        label: 'Dashboard',           Icon: LayoutDashboard, cat: 'Overview'   },

    // ── Fleet ──
    { id: 'inventory',        label: 'Fleet Inventory',     Icon: Package,         cat: 'Fleet'      },
    { id: 'view-documents',  label: 'View Documents',      Icon: FileText,        cat: 'Fleet'      },
    { id: 'rentals',          label: 'Bookings & Rentals',   Icon: Car,             cat: 'Fleet'      },
    { id: 'completed-returns', label: 'Completed Vehicle Returns', Icon: CheckCircle, cat: 'Fleet' },
    { id: 'maintenance',      label: 'Maintenance',          Icon: Wrench,          cat: 'Fleet'      },
    { id: 'fault-vehicles',   label: 'Fault Vehicles',       Icon: AlertTriangle,   cat: 'Fleet'      },

    // ── Customers ──
    { id: 'customers',        label: 'Customers',             Icon: Users,           cat: 'Customers'  },
    { id: 'complaints',       label: 'Customer Complaints',   Icon: Bell,            cat: 'Customers'  },

    // ── Finance ──
    { id: 'payments',         label: 'Customer Payments',     Icon: Wallet,          cat: 'Finance'    },
    { id: 'expenses',         label: 'Fleet Expenses',        Icon: DollarSign,      cat: 'Finance'    },
    { id: 'reports',          label: 'Reports & Analytics',   Icon: TrendingUp,      cat: 'Finance'    },

    // ── Network ──
    { id: 'charge-hubs',      label: 'Charge Hubs',           Icon: MapPin,          cat: 'Network'    },
    { id: 'notifications',    label: 'Notifications',         Icon: Bell,            cat: 'Network'    },
    { id: 'coupons',          label: 'Coupons & Offers',       Icon: Tag,             cat: 'Customers'  },
    { id: 'broadcasts',       label: 'Customer Broadcasts',   Icon: Send,            cat: 'Network'    },

    // ── Finance / legacy ──
    { id: 'financials',       label: 'Financials',            Icon: DollarSign,      cat: 'Finance'    },

    // ── Account ──
    { id: 'profile',           label: 'Profile',                Icon: User,            cat: 'Account'   },
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

const FR_FETCH_CACHE = new Map();
function useFetch(call, path) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [rev, setRev]         = useState(0);
  useEffect(() => {
    if (!call || !path) return;
    let alive = true;
    const cached = FR_FETCH_CACHE.get(path);
    if (cached) { setData(cached.data); setLoading(false); }
    else setLoading(true);
    setError(null);
    call(path)
      .then(d => { if (alive) { FR_FETCH_CACHE.set(path,{data:d,at:Date.now()}); setData(d); } })
      .catch(e => { if (alive && !cached) setError(e.message); })
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
// SHELL
// ══════════════════════════════════════════════════════════════════
function Shell({ user, page, setPage, call, logout }) {
  const navItems = NAV_ITEMS[kind] || NAV_ITEMS.franchisee;
  const { data: navNotifications } = useFetch(call, '/franchise/fleet/notifications');
  const [supportSeenAt, setSupportSeenAt] = useState(0);
  const [notificationSeenAt, setNotificationSeenAt] = useState(0);
  const notes = Array.isArray(navNotifications) ? navNotifications : [];
  const isNew = (n, seenAt) => !n.read && new Date(n.createdAt||0).getTime() > seenAt;
  const complaintBadge = notes.filter(n=>String(n.type||'').startsWith('COMPLAINT') && isNew(n,supportSeenAt)).length;
  const notificationBadge = notes.filter(n=>isNew(n,notificationSeenAt)).length;
  const activePage = page;
  const navigate = (id) => {
    const now = Date.now();
    if (id === 'notifications') {
      setNotificationSeenAt(now);
      call('/franchise/fleet/notifications/read-all',{method:'put'}).catch(()=>{});
    } else if (id === 'complaints') {
      setSupportSeenAt(now);
      call('/franchise/fleet/notifications/read-all?prefix=COMPLAINT',{method:'put'}).catch(()=>{});
    }
    setPage(id);
  };
  const activeNav = navItems.find(item => item.id === page);
  const mobilePageTitle = activeNav?.label || cfg.title;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={allevLogo} alt="allEV" style={{height:"32px",objectFit:"contain"}} />
        </div>
        <nav className="sidebar-nav">
          {!user ? <SidebarSkeleton count={navItems.length || 7} /> : (() => {
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
                  const isActive       = activePage === id;
                  const isParentActive = parent && activePage === parent;
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
                      {id==='complaints' && complaintBadge>0 && <b className="nav-count-badge">{complaintBadge>99?'99+':complaintBadge}</b>}
                      {id==='notifications' && notificationBadge>0 && <b className="nav-count-badge">{notificationBadge>99?'99+':notificationBadge}</b>}
                      {sub && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
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
        <header className={`topbar ${page === 'dashboard' ? 'dashboard-topbar' : ''}`}>
          <div className="desktop-topbar-copy">
            <div className="topbar-sub">{cfg.accent}</div>
            <div className="topbar-title">{cfg.title}</div>
          </div>

          {page !== 'dashboard' && (
            <div className="mobile-subpage-bar">
              <button
                type="button"
                className="mobile-back-button"
                onClick={() => setPage('dashboard')}
                aria-label="Back to dashboard"
              >
                <ChevronLeft size={21} />
              </button>
              <div className="mobile-subpage-title">{mobilePageTitle}</div>
            </div>
          )}

          <div className="topbar-user">
            <div className="avatar">{user?.name?.[0] ?? '?'}</div>
            <div className="desktop-user-copy">
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
    dashboard:        <FleetDashboard  call={call} setPage={setPage} user={user} />,
    financials:       <FranFinancials call={call} />,
    inventory:        <FranInventory  call={call} user={user} setPage={setPage} />,
    'view-documents': <FleetViewDocuments call={call} />,
    rentals:          <FranRentals   call={call} />,
    'completed-returns': <CompletedVehicleReturns call={call} />,
    maintenance:     <FleetMaintenance call={call} />,
    customers:        <FleetCustomers call={call} />,
    payments:         <FleetPayments call={call} />,
    expenses:         <FleetExpenses call={call} />,
    reports:          <FleetReports call={call} />,
    notifications:    <FleetNotifications call={call} />,
    coupons:          <FleetCoupons call={call} />,
    broadcasts:       <FleetBroadcasts call={call} />,
    complaints:       <FranComplaints call={call} />,
    'fault-vehicles': <FaultVehicles call={call} />,
    'charge-hubs':    <FranChargeHubs call={call} />,
    profile:           <FranchiseeProfile call={call} user={user} setPage={setPage} />,
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

// Sidebar skeleton — shown while nav / user is loading
function SidebarSkeleton({ count = 7 }) {
  return (
    <div className="sidebar-skeleton-nav">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sidebar-skel-item">
          <div className="sidebar-skel-icon" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="sidebar-skel-label" style={{ animationDelay: `${i * 60 + 30}ms` }} />
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

function Toast({ toast }) {
  if (!toast) return null;
  const success = toast.type !== 'error';
  return (
    <div className="toast-overlay" role="status" aria-live="polite">
      <div className={`toast toast-${toast.type}`} onClick={e => e.stopPropagation()}>
        <div className="toast-icon">{success ? '✓' : '!'}</div>
        <div className="toast-copy">
          <strong>{success ? 'Success' : 'Something went wrong'}</strong>
          <span>{toast.msg}</span>
        </div>
      </div>
    </div>
  );
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
    <PageHeader title="Fleet Operator Dashboard" sub="Revenue, jobs and performance overview." />
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
function FleetCommandVehicleDetails({ vehicle }) {
  const details = [
    ['Category', vehicle?.category], ['Make', vehicle?.make], ['Model / Name', vehicle?.model],
    ['Year', vehicle?.year], ['Color', vehicle?.color], ['Bike ID', vehicle?.bikeId],
    ['Bike Number / Registration', vehicle?.registrationNo], ['Chassis Number', vehicle?.chassisNo], ['Motor Number', vehicle?.motorNo],
    ['Insurance Expiry', vehicle?.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toLocaleDateString('en-IN') : ''],
    ['Odometer', vehicle?.odometerKm != null ? `${vehicle.odometerKm} km` : ''], ['Battery SOC', vehicle?.batterySoc != null ? `${vehicle.batterySoc}%` : ''],
    ['Seating Capacity', vehicle?.seatingCapacity], ['Top Speed', vehicle?.topSpeedKph != null ? `${vehicle.topSpeedKph} km/h` : ''],
    ['Battery Capacity', vehicle?.batteryCapacityKwh != null ? `${vehicle.batteryCapacityKwh} kWh` : ''], ['Range', vehicle?.rangeKm != null ? `${vehicle.rangeKm} km` : ''],
    ['Charging Type', vehicle?.chargingType], ['Price / Day', vehicle?.pricePerDay != null ? `₹${Number(vehicle.pricePerDay).toLocaleString('en-IN')}` : ''],
    ['Quantity', vehicle?.quantity], ['Security Deposit', vehicle?.securityDeposit != null ? `₹${Number(vehicle.securityDeposit).toLocaleString('en-IN')}` : ''],
    ['Discount', vehicle?.discountPercent != null ? `${vehicle.discountPercent}%` : ''], ['Inventory Status', vehicle?.fleetInventoryStatus],
    ['Vehicle Status', vehicle?.status], ['Fleet Location', vehicle?.fleetLocationStatus], ['Fleet Operator', vehicle?.fleetOperatorName],
    ['Fleet Operator Email', vehicle?.fleetOperatorEmail], ['Assigned At', vehicle?.assignedAt ? new Date(vehicle.assignedAt).toLocaleString('en-IN') : ''],
    ['Description', vehicle?.description], ['Next General Service', vehicle?.nextGeneralServiceAt ? new Date(vehicle.nextGeneralServiceAt).toLocaleDateString('en-IN') : ''],
  ].filter(([,value]) => value !== undefined && value !== null && String(value).trim() !== '');
  const rp = vehicle?.rentalPlans || {};
  return <div className="fleet-command-details">
    <div className="fleet-command-details-head"><strong>Command Center Vehicle Details</strong><span>{details.length} details</span></div>
    <div className="fleet-command-details-grid">
      {details.map(([label,value]) => <div key={label}><small>{label}</small><b>{String(value)}</b></div>)}
    </div>
    {(rp.daily?.enabled || rp.weekly?.enabled || rp.monthly?.enabled) && <div className="fleet-command-plans">
      <small>Rental Plans</small>
      <div>{rp.daily?.enabled && <span>Daily ₹{Number(rp.daily.amount||0).toLocaleString('en-IN')}</span>}{rp.weekly?.enabled && <span>Weekly ₹{Number(rp.weekly.amount||0).toLocaleString('en-IN')}</span>}{rp.monthly?.enabled && <span>Monthly ₹{Number(rp.monthly.amount||0).toLocaleString('en-IN')}</span>}</div>
    </div>}
  </div>;
}

function FranInventory({ call, user, setPage }) {
  const { data: assignedVehicles, loading: avLoading, refresh: refreshAssigned } = useFetch(call, '/franchise/assigned-vehicles');
  const [activeTab, setActiveTab] = useState('setup');
  const [setupVehicle, setSetupVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [documentsVehicle, setDocumentsVehicle] = useState(null);
  const { toast, show } = useToast();

  if (avLoading) return <Loader />;

  const vehicles = Array.isArray(assignedVehicles) ? assignedVehicles : [];
  const setupVehicles = vehicles.filter(v => v.fleetInventoryStatus !== 'ACTIVE');
  const fleetVehicles = vehicles.filter(v => v.fleetInventoryStatus === 'ACTIVE' && v.fleetLocationStatus !== 'AT_CUSTOMER');
  const customerVehicles = vehicles.filter(v => v.fleetInventoryStatus === 'ACTIVE' && v.fleetLocationStatus === 'AT_CUSTOMER');

  const activate = async (form, vehicle) => {
    try {
      await call(`/franchise/assigned-vehicles/${vehicle._id}/activate`, { method:'put', data:form });
      show('✓ Vehicle moved to Fleet Inventory and is now ready for customer booking.');
      setSetupVehicle(null);
      setActiveTab('fleet');
      refreshAssigned();
    } catch(e) { show(e.response?.data?.message || 'Could not activate vehicle', 'error'); }
  };

  const update = async (form, vehicle) => {
    try {
      await call(`/franchise/fleet-inventory/${vehicle._id}`, { method:'put', data:form });
      show('✓ Fleet rental plans updated.');
      setEditingVehicle(null);
      refreshAssigned();
    } catch(e) { show(e.response?.data?.message || 'Could not update vehicle', 'error'); }
  };

  const vehicleCard = (v, location) => {
    const rp = v.rentalPlans || {};
    const plans = [
      rp.daily?.enabled && `Daily ₹${Number(rp.daily.amount || 0).toLocaleString('en-IN')}`,
      rp.weekly?.enabled && `Weekly ₹${Number(rp.weekly.amount || 0).toLocaleString('en-IN')}`,
      rp.monthly?.enabled && `Monthly ₹${Number(rp.monthly.amount || 0).toLocaleString('en-IN')}`,
    ].filter(Boolean);
    const atCustomer = location === 'customer';
    return <div className={`fleet-vehicle-card ${atCustomer ? 'live' : 'fleet-at-fleet'}`} key={v._id}>
      <div className="fleet-vehicle-main">
        <div className="fleet-vehicle-thumb">{v.images?.[0]?.url ? <img src={v.images[0].url} alt=""/> : <Car size={28}/>}</div>
        <div className="fleet-vehicle-copy">
          <div className="fleet-vehicle-title">{v.bikeId ? <span className="fleet-bike-id">{v.bikeId}</span> : null}{v.make} {v.model}</div>
          <div className="fleet-vehicle-meta">{v.registrationNo || 'No registration'} · {atCustomer ? 'Currently with customer' : 'Currently at fleet'}</div>
          {atCustomer && v.currentCustomer && <div className="fleet-source"><UserCheck size={13}/> {v.currentCustomer.name || 'Customer'}{v.currentCustomer.phone ? ` · ${v.currentCustomer.phone}` : ''}</div>}
          {!atCustomer && <div className="fleet-source"><Package size={13}/> Available at Fleet{v.assignedAt ? ` · Issued ${new Date(v.assignedAt).toLocaleDateString('en-IN')}` : ''}</div>}
          <div className="fleet-plan-chips">{plans.map(x=><span key={x}>{x}</span>)}{v.documents?.length ? <span><FileText size={11}/> {v.documents.length} docs</span> : null}</div>
        </div>
        <span className={`fleet-status ${atCustomer ? 'live' : 'at-fleet'}`}>{atCustomer ? <><Car size={12}/> At Customer</> : <><Package size={12}/> At Fleet</>}</span>
      </div>
      <FleetCommandVehicleDetails vehicle={v} />
      <div className="fleet-finance-strip">
        <div><span>Issued Days</span><b>{v.assignedAt ? Math.max(0, Math.floor((Date.now()-new Date(v.assignedAt).getTime())/86400000)) : 0}</b></div>
        <div><span>General Service</span><b>{v.nextGeneralServiceAt ? new Date(v.nextGeneralServiceAt).toLocaleDateString('en-IN') : '—'}</b></div>
        <div><span>Availability</span><b>{atCustomer ? 'Unavailable' : 'Available'}</b></div>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {!atCustomer && <button className="btn-ghost fleet-configure-btn" onClick={()=>setEditingVehicle(v)}><Pencil size={15}/> Edit Rental Plans</button>}
        {v.documents?.length ? <button className="btn-ghost fleet-configure-btn" onClick={()=>setDocumentsVehicle(v)}><FileText size={15}/> Documents ({v.documents.length})</button> : null}
      </div>
    </div>;
  };

  return <>
    <Toast toast={toast} />
    <PageHeader title="Fleet Inventory" sub="Manage setup, vehicles currently at fleet, and vehicles currently with customers." />

    <MetricGrid metrics={[
      { label:'Setup Required', value:setupVehicles.length, Icon:Clock, color:'#d97706' },
      { label:'Fleet Inventory', value:fleetVehicles.length, Icon:Package, color:'#2563eb' },
      { label:'Fleet At Customer', value:customerVehicles.length, Icon:Car, color:'#16a34a' },
    ]} />

    <div className="fleet-inventory-tabs">
      <button className={activeTab==='setup'?'active':''} onClick={()=>setActiveTab('setup')}>
        <Clock size={16}/> Setup Required <span>{setupVehicles.length}</span>
      </button>
      <button className={activeTab==='fleet'?'active':''} onClick={()=>setActiveTab('fleet')}>
        <Package size={16}/> Fleet Inventory <span>{fleetVehicles.length}</span>
      </button>
      <button className={activeTab==='customer'?'active':''} onClick={()=>setActiveTab('customer')}>
        <Car size={16}/> Fleet At Customer <span>{customerVehicles.length}</span>
      </button>
    </div>

    {activeTab==='setup' && <div className="fleet-vehicle-list">
      {!setupVehicles.length && <div className="card fleet-empty"><CheckCircle size={42}/><h3>All assigned vehicles are configured</h3><p>New Command Center assignments will appear here first.</p></div>}
      {setupVehicles.map(v => <div className="fleet-vehicle-card setup" key={v._id}>
        <div className="fleet-vehicle-main">
          <div className="fleet-vehicle-thumb">{v.images?.[0]?.url ? <img src={v.images[0].url} alt=""/> : <Car size={28}/>}</div>
          <div className="fleet-vehicle-copy">
            <div className="fleet-vehicle-title">{v.bikeId ? <span className="fleet-bike-id">{v.bikeId}</span> : null}{v.make} {v.model}</div>
            <div className="fleet-vehicle-meta">{v.year || 'Year —'} · {v.color || 'Colour —'} · {v.registrationNo || 'Registration pending'}</div>
            <div className="fleet-source"><Truck size={13}/> Assigned by Command Center{v.documents?.length ? <span className="fleet-doc-count"><FileText size={12}/> {v.documents.length} document{v.documents.length===1?'':'s'}</span> : null}</div>
          </div>
          <span className="fleet-status setup">Setup Required</span>
        </div>
        <div className="fleet-vehicle-details">
          <div><span>Battery</span><b>{v.batteryCapacityKwh ? `${v.batteryCapacityKwh} kWh` : '—'}</b></div>
          <div><span>Range</span><b>{v.rangeKm ? `${v.rangeKm} km` : '—'}</b></div>
          <div><span>Bike ID</span><b>{v.bikeId || '—'}</b></div>
        </div>
        <FleetCommandVehicleDetails vehicle={v} />
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn-primary fleet-configure-btn" onClick={()=>setSetupVehicle(v)}><Package size={15}/> Move to Fleet Inventory</button>
          {v.documents?.length ? <button className="btn-ghost fleet-configure-btn" onClick={()=>setDocumentsVehicle(v)}><FileText size={15}/> Documents ({v.documents.length})</button> : null}
        </div>
      </div>)}
    </div>}

    {activeTab==='fleet' && <div className="fleet-vehicle-list">
      {!fleetVehicles.length && <div className="card fleet-empty"><Package size={42}/><h3>No vehicles at fleet</h3><p>Vehicles returned by customers or newly moved from Setup will appear here.</p></div>}
      {fleetVehicles.map(v => vehicleCard(v, 'fleet'))}
    </div>}

    {activeTab==='customer' && <div className="fleet-vehicle-list">
      {!customerVehicles.length && <div className="card fleet-empty"><Car size={42}/><h3>No vehicles are currently with customers</h3><p>Vehicles will appear here after a completed handover.</p></div>}
      {customerVehicles.map(v => vehicleCard(v, 'customer'))}
    </div>}

    {(setupVehicle || editingVehicle) && <FleetRentalSetupModal
      vehicle={setupVehicle || editingVehicle}
      editing={!!editingVehicle}
      onClose={()=>{setSetupVehicle(null);setEditingVehicle(null)}}
      onSave={editingVehicle ? update : activate}
    />}
    {documentsVehicle && <FleetVehicleDocumentsModal vehicle={documentsVehicle} onClose={()=>setDocumentsVehicle(null)} />}
  </>;
}

function FleetVehicleDocumentsModal({ vehicle, onClose }) {
  const docs=Array.isArray(vehicle?.documents)?vehicle.documents:[];
  const fileUrl=u=>u?(u.startsWith('http')?u:`${API}${u}`):'';
  const types=[...new Set(docs.map(d=>String(d.type||'OTHER')).filter(Boolean))];
  const [selectedType,setSelectedType]=useState(types.length===1?types[0]:'');
  const [preview,setPreview]=useState(null);
  const selectedDocs=selectedType?docs.filter(d=>String(d.type||'OTHER')===selectedType):[];
  return <div className="modal-overlay" onClick={onClose}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(720px,100%)',maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
    <div className="modal-head"><div><div className="modal-title">View Vehicle Documents</div><div className="modal-subtitle">Select a document type to view it</div></div><button className="icon-btn" onClick={onClose}><X size={20}/></button></div>
    {!preview ? <div className="modal-body" style={{overflowY:'auto'}}>
      <div className="fleet-document-vehicle-summary">
        <div><small>Bike ID</small><b>{vehicle?.bikeId||'—'}</b></div>
        <div><small>Chassis Number</small><b>{vehicle?.chassisNo||'—'}</b></div>
        <div><small>Bike Number</small><b>{vehicle?.registrationNo||'—'}</b></div>
        <div><small>Name of Bike</small><b>{vehicle?.make ? `${vehicle.make} ${vehicle.model||''}`.trim() : vehicle?.model||'—'}</b></div>
      </div>
      {!docs.length ? <div className="fleet-empty"><FileText size={36}/><h3>No documents received</h3><p>Command Center has not shared documents for this bike yet.</p></div> : <div className="fleet-document-selector">
        <label>Document Type<select value={selectedType} onChange={e=>setSelectedType(e.target.value)}><option value="">Select document type…</option>{types.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
        {selectedType && !selectedDocs.length && <div className="fleet-empty"><p>No document available for this type.</p></div>}
        {selectedDocs.map(d=><div key={d._id} className="fleet-document-select-row"><div><strong>{d.title||d.type||'Vehicle document'}</strong><small>{d.number?`Document No: ${d.number} · `:''}{d.expiresAt?`Expires ${new Date(d.expiresAt).toLocaleDateString('en-IN')}`:''}</small></div><button className="btn-primary btn-sm" disabled={!d.url} onClick={()=>setPreview({name:d.fileName||d.title||d.type,url:fileUrl(d.url),doc:d})}><Eye size={13}/> View</button></div>)}
      </div>}
    </div> : <div className="modal-body" style={{height:'calc(100% - 70px)',padding:10,display:'flex',flexDirection:'column'}}>
      <div className="fleet-document-preview-bar"><strong>{preview.name||'Vehicle Document'}</strong><button className="btn-ghost btn-sm" onClick={()=>setPreview(null)}>← Back to documents</button></div>
      <div style={{flex:1,minHeight:420}}>{/\.(png|jpe?g|webp)$/i.test(preview.url||'')?<img src={preview.url} alt={preview.name} style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}}/>:<iframe title={preview.name||'Document'} src={preview.url} style={{width:'100%',height:'100%',border:'1px solid #e2e8f0',borderRadius:8}}/>}</div>
    </div>}
    <div className="modal-footer"><button className="btn-ghost" onClick={onClose}>Close</button></div>
  </div></div>;
}

function FleetRentalSetupModal({ vehicle, editing, onClose, onSave }) {
  const rp=vehicle.rentalPlans||{};
  const [plans,setPlans]=useState({
    DAILY: editing ? !!rp.daily?.enabled : true,
    WEEKLY: editing ? !!rp.weekly?.enabled : true,
    MONTHLY: editing ? !!rp.monthly?.enabled : true,
  });
  const [dailyAmount,setDailyAmount]=useState(editing ? rp.daily?.amount || '' : '');
  const [weeklyAmount,setWeeklyAmount]=useState(editing ? rp.weekly?.amount || '' : '');
  const [monthlyAmount,setMonthlyAmount]=useState(editing ? rp.monthly?.amount || '' : '');
  const [securityDeposit,setSecurityDeposit]=useState(vehicle.securityDeposit || '');
  const [discountPercent,setDiscountPercent]=useState(vehicle.discountPercent || '');
  const [description,setDescription]=useState(vehicle.description || '');
  const [saving,setSaving]=useState(false);

  const submit=async()=>{
    const enabledPlans=Object.keys(plans).filter(k=>plans[k]);
    if(!enabledPlans.length){ alert('Select at least one rental plan.'); return; }
    for(const [name,val] of [['Daily',dailyAmount],['Weekly',weeklyAmount],['Monthly',monthlyAmount]]){
      if(plans[name.toUpperCase()] && Number(val)<=0){ alert(`${name} rental amount is required.`); return; }
    }
    setSaving(true);
    try { await onSave({enabledPlans,dailyAmount:Number(dailyAmount||0),weeklyAmount:Number(weeklyAmount||0),monthlyAmount:Number(monthlyAmount||0),securityDeposit:Number(securityDeposit||0),discountPercent:Number(discountPercent||0),description},vehicle); }
    finally { setSaving(false); }
  };
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-drawer fleet-setup-modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div><div className="modal-title">{editing?'Edit Fleet Listing':'Move to Fleet Inventory'}</div><div className="modal-subtitle">{vehicle.make} {vehicle.model} · customer rental configuration</div></div>
        <button className="icon-btn" onClick={onClose}><X size={18}/></button>
      </div>
      <div className="modal-body">
        <div className="fleet-setup-vehicle"><div className="fleet-vehicle-thumb">{vehicle.images?.[0]?.url?<img src={vehicle.images[0].url} alt=""/>:<Car size={28}/>}</div><div><strong>{vehicle.make} {vehicle.model}</strong><small>{vehicle.registrationNo || 'Registration not provided'} · {vehicle.quantity ?? 1} unit(s)</small></div></div>
        <div className="fleet-setup-section"><div className="fleet-setup-heading">Rental Plans</div><p className="fleet-setup-help">Choose which plans customers can book. You can publish one or all three.</p>
          {[
            ['DAILY','Daily','₹ / day',dailyAmount,setDailyAmount],
            ['WEEKLY','Weekly','₹ / week',weeklyAmount,setWeeklyAmount],
            ['MONTHLY','Monthly','₹ / month',monthlyAmount,setMonthlyAmount],
          ].map(([key,label,unit,val,setter])=><div className={'fleet-plan-row '+(plans[key]?'selected':'')} key={key}>
            <label className="fleet-plan-check"><input type="checkbox" checked={plans[key]} onChange={e=>setPlans(p=>({...p,[key]:e.target.checked}))}/><span className="fleet-checkmark">✓</span><strong>{label}</strong></label>
            <div className="fleet-plan-input"><span>{unit}</span><input type="number" min="0" value={val} onChange={e=>setter(e.target.value)} disabled={!plans[key]} placeholder="0"/></div>
          </div>)}
        </div>
        <div className="fleet-form-grid">
          <label>Security Deposit<input type="number" min="0" value={securityDeposit} onChange={e=>setSecurityDeposit(e.target.value)} placeholder="₹ 0"/></label>
          <label>Discount %<input type="number" min="0" max="100" value={discountPercent} onChange={e=>setDiscountPercent(e.target.value)} placeholder="0"/></label>
        </div>
        <label className="fleet-description-label">Customer Listing Description<textarea rows="3" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Add helpful vehicle/rental details for customers…"/></label>
        <div className="fleet-publish-note"><Shield size={17}/><span><b>Customer publishing</b><br/>After you submit, this vehicle becomes available in the Customer Portal with the exact plans, deposit, discount and vehicle details above.</span></div>
      </div>
      <div className="modal-footer"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving?'Publishing…':editing?'Save Changes':'Move to Fleet Inventory'}</button></div>
    </div>
  </div>;
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
              ['Price (per unit)',    `₹${Number(v.pricePerDay || 0).toLocaleString('en-IN')}`],
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
// EDIT VEHICLE MODAL — full inline edit for every vehicle field
// ══════════════════════════════════════════════════════════════════
function EditVehicleModal({ vehicle, call, onClose, onSaved }) {
  const [form, setForm] = useState({
    category:           vehicle.category           || '',
    make:               vehicle.make               || '',
    model:              vehicle.model              || '',
    year:               vehicle.year               || '',
    color:              vehicle.color              || '',
    registrationNo:     vehicle.registrationNo     || '',
    batteryCapacityKwh: vehicle.batteryCapacityKwh || '',
    rangeKm:            vehicle.rangeKm            || '',
    chargingType:       vehicle.chargingType       || '',
    pricePerDay:        vehicle.pricePerDay        || '',
    quantity:           vehicle.quantity           ?? 1,
    description:        vehicle.description        || '',
    images:             vehicle.images             || [],
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [imgPreviewing, setImgPreviewing] = useState(null);

  const ff = field => val => setForm(f => ({ ...f, [field]: typeof val === 'string' ? val : val?.target?.value ?? val }));

  // Image handling
  const handleImages = async e => {
    const files = Array.from(e.target.files).slice(0, 5 - form.images.length);
    const newImgs = await Promise.all(files.map(file => new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res({ name: file.name, url: ev.target.result });
      reader.readAsDataURL(file);
    })));
    setForm(f => ({ ...f, images: [...f.images, ...newImgs].slice(0, 5) }));
  };
  const removeImg = idx => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.make || !form.model || !form.pricePerDay) {
      setError('Make, Model, and Price are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        pricePerDay:        Number(form.pricePerDay),
        quantity:           Number(form.quantity),
        batteryCapacityKwh: form.batteryCapacityKwh ? Number(form.batteryCapacityKwh) : undefined,
        rangeKm:            form.rangeKm ? Number(form.rangeKm) : undefined,
        year:               form.year || undefined,
      };
      const res = await call(`/franchise/pending-vehicles/${vehicle._id}`, { method: 'put', data: payload });
      const msg = res.reQueued
        ? 'Vehicle updated! Since price/quantity/key details changed, it has been re-sent for Command Center approval.'
        : 'Vehicle updated successfully!';
      onSaved(msg);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const cats = VEHICLE_CATEGORIES || [];
  const chargingOpts = ['AC', 'DC', 'AC+DC', 'CCS2', 'CHAdeMO'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(680px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Edit2 size={18} color="#2563eb" /> Edit Vehicle
            </div>
            <div className="modal-subtitle">{vehicle.make} {vehicle.model} — all fields are editable</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ overflowY:'auto', flex:1 }}>
          {error && <InfoBanner type="warning" Icon={AlertTriangle}>{error}</InfoBanner>}

          {vehicle.status === 'APPROVED' && (
            <InfoBanner Icon={RefreshCw}>
              This vehicle is <strong>Approved &amp; Live</strong>. Changing price, quantity, make, model, or category will <strong>re-queue it for Command Center approval</strong> and temporarily hide it from customers.
            </InfoBanner>
          )}

          {/* Category */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Vehicle Category</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8 }}>
              {cats.map(c => (
                <button key={c.value} type="button"
                  onClick={() => ff('category')(c.value)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 8px',
                    border: form.category === c.value ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
                    borderRadius:10, background: form.category === c.value ? '#eff6ff' : '#fff',
                    cursor:'pointer', transition:'all 0.15s',
                  }}>
                  <span style={{ fontSize:22 }}>{c.emoji}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: form.category === c.value ? '#2563eb' : '#374151' }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Make & Model */}
          <div className="row-2">
            <Fld label="Make / Brand" required>
              <Inp value={form.make} onChange={ff('make')} placeholder="e.g. Ola Electric" />
            </Fld>
            <Fld label="Model Name" required>
              <Inp value={form.model} onChange={ff('model')} placeholder="e.g. S1 Pro" />
            </Fld>
          </div>

          {/* Year & Color */}
          <div className="row-2">
            <Fld label="Year of Manufacture">
              <Inp value={form.year} onChange={ff('year')} type="number" placeholder="2024" />
            </Fld>
            <Fld label="Color">
              <Inp value={form.color} onChange={ff('color')} placeholder="e.g. Jet Black" />
            </Fld>
          </div>

          {/* Registration */}
          <Fld label="Registration Number" required hint="e.g. TS09EV1234">
            <Inp value={form.registrationNo} onChange={ff('registrationNo')} placeholder="TS09EV1234" />
          </Fld>

          {/* Battery & Range */}
          <div className="row-2">
            <Fld label="Battery Capacity (kWh)">
              <Inp value={form.batteryCapacityKwh} onChange={ff('batteryCapacityKwh')} type="number" placeholder="40.5" />
            </Fld>
            <Fld label="Range (km)">
              <Inp value={form.rangeKm} onChange={ff('rangeKm')} type="number" placeholder="312" />
            </Fld>
          </div>

          {/* Charging, Price, Qty */}
          <div className="row-2">
            <Fld label="Charging Type">
              <Sel value={form.chargingType} onChange={ff('chargingType')} opts={chargingOpts} placeholder="Select…" />
            </Fld>
            <Fld label="Price per Unit (₹)" required hint="Selling price">
              <Inp value={form.pricePerDay} onChange={ff('pricePerDay')} type="number" placeholder="149900" />
            </Fld>
          </div>
          <Fld label="Available Quantity" required hint="Total units in stock">
            <Inp value={form.quantity} onChange={ff('quantity')} type="number" placeholder="1" />
          </Fld>

          {/* Description */}
          <Fld label="Description / Notes">
            <Txt value={form.description} onChange={ff('description')} placeholder="Features, condition, special notes…" />
          </Fld>

          {/* Images */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <Upload size={13} /> Vehicle Images ({form.images.length}/5)
            </div>

            {form.images.length > 0 && (
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
                {form.images.map((img, i) => (
                  <div key={i} style={{ position:'relative', width:90, height:72, borderRadius:8, overflow:'hidden',
                    border:'2px solid #e5e7eb', cursor:'pointer' }}
                    onClick={() => setImgPreviewing(img.url)}>
                    <img src={img.url} alt={img.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <button
                      onClick={e => { e.stopPropagation(); removeImg(i); }}
                      style={{ position:'absolute', top:3, right:3, background:'rgba(220,38,38,0.9)', border:'none',
                        borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center',
                        justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {form.images.length < 5 && (
              <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                border:'1.5px dashed #93c5fd', borderRadius:8, cursor:'pointer', color:'#2563eb',
                background:'#f0f9ff', fontSize:13, fontWeight:600 }}>
                <Upload size={16} />
                {form.images.length === 0 ? 'Upload vehicle photos (up to 5)' : 'Add more photos'}
                <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleImages} />
              </label>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Image full-preview */}
      {imgPreviewing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setImgPreviewing(null)}>
          <img src={imgPreviewing} alt="preview" style={{ maxWidth:'90vw', maxHeight:'90vh', borderRadius:12, objectFit:'contain' }} />
          <button style={{ position:'absolute', top:18, right:22, background:'rgba(255,255,255,0.15)', border:'none',
            borderRadius:'50%', width:36, height:36, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={() => setImgPreviewing(null)}><X size={18} /></button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EDIT PART MODAL — inline edit for every part/inventory field
// ══════════════════════════════════════════════════════════════════
function EditPartModal({ part, call, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:               part.name               || '',
    category:           part.category           || '',
    quantity:           part.quantity           ?? 0,
    reorderLevel:       part.reorderLevel       ?? 5,
    unitPrice:          part.unitPrice          || 0,
    description:        part.description        || '',
    manufacturer:       part.manufacturer       || '',
    compatibleVehicles: part.compatibleVehicles || '',
    location:           part.location           || '',
    partType:           part.partType           || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const ff = field => val => setForm(f => ({ ...f, [field]: typeof val === 'string' ? val : val?.target?.value ?? val }));

  const PART_CATS = ['Brake System','Battery & Charging','Motor & Drivetrain','Body & Frame',
    'Electrical','Suspension','Tyres & Wheels','Lighting','Cooling','General'];

  const handleSave = async () => {
    if (!form.name) { setError('Part name is required.'); return; }
    setSaving(true); setError('');
    try {
      await call(`/franchise/inventory/${part._id}`, {
        method: 'put',
        data: {
          ...form,
          quantity:     Number(form.quantity),
          reorderLevel: Number(form.reorderLevel),
          unitPrice:    Number(form.unitPrice),
        },
      });
      onSaved('Part updated successfully!');
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width:'min(600px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Edit2 size={18} color="#2563eb" /> Edit Part
            </div>
            <div className="modal-subtitle" style={{ fontFamily:'monospace', fontSize:12 }}>SKU: {part.sku}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ overflowY:'auto', flex:1 }}>
          {error && <InfoBanner type="warning" Icon={AlertTriangle}>{error}</InfoBanner>}

          <Fld label="Part Name" required>
            <Inp value={form.name} onChange={ff('name')} placeholder="e.g. Disc Brake Pad Set" />
          </Fld>

          <div className="row-2">
            <Fld label="Category">
              <Sel value={form.category} onChange={ff('category')} opts={PART_CATS} placeholder="Select category…" />
            </Fld>
            <Fld label="Part Type">
              <Inp value={form.partType} onChange={ff('partType')} placeholder="e.g. OEM, Aftermarket" />
            </Fld>
          </div>

          <div className="row-2">
            <Fld label="Quantity in Stock" required>
              <Inp value={form.quantity} onChange={ff('quantity')} type="number" placeholder="0" />
            </Fld>
            <Fld label="Reorder Level" hint="Alert threshold">
              <Inp value={form.reorderLevel} onChange={ff('reorderLevel')} type="number" placeholder="5" />
            </Fld>
          </div>

          <Fld label="Unit Price (₹)" required>
            <Inp value={form.unitPrice} onChange={ff('unitPrice')} type="number" placeholder="0" />
          </Fld>

          <Fld label="Manufacturer">
            <Inp value={form.manufacturer} onChange={ff('manufacturer')} placeholder="e.g. Bosch" />
          </Fld>

          <Fld label="Compatible Vehicles" hint="List vehicle makes/models this part fits">
            <Txt value={form.compatibleVehicles} onChange={ff('compatibleVehicles')} placeholder="e.g. Ola S1, Ather 450X" />
          </Fld>

          <Fld label="Storage Location" hint="Shelf/bin/rack reference">
            <Inp value={form.location} onChange={ff('location')} placeholder="e.g. Rack A-3" />
          </Fld>

          <Fld label="Description / Notes">
            <Txt value={form.description} onChange={ff('description')} placeholder="Additional notes about this part…" />
          </Fld>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save Changes</>}
          </button>
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
        <div className="cred-row"><span>Price/Vehicle</span><code>₹{form.pricePerDay}</code></div>
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
        <Fld label="Price per Unit (₹)" required hint="Selling price per vehicle unit">
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
          ['Unit Price', `₹${form.pricePerDay}`],
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
    if (!window.confirm(`Remove ${name} from fleet? Their login will be disabled.`)) return;
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
      sub="Manage your fleet staff. New entries require Command Center approval."
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
    if (!window.confirm(`Remove ${name} from fleet? Their login will be disabled.`)) return;
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
        ? 'All currently active & approved staff members in your fleet.'
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
    <PageHeader title="Jobs" sub="Completed vehicle-delivery tasks and service jobs for this fleet." />
    <MetricGrid metrics={[
      { label: 'Total Jobs', value: jobs.length, Icon: ClipboardList, color: '#2563eb' },
      { label: 'Completed Tasks', value: completed.length, Icon: CheckCircle, color: '#16a34a' },
      { label: 'Delivery Tasks', value: jobs.filter(j => j.serviceType === 'DELIVERY_COMPLETED').length, Icon: Car, color: '#7c3aed' },
    ]} />
    {jobs.length > 0 && <Card title="Recent Tasks" badge={`${jobs.length} tasks`}>
      <DataTable rows={jobs.map(j => ({
        ...j,
        task: j.serviceType === 'DELIVERY_COMPLETED' ? 'Vehicle Delivery' : (j.serviceType || 'Service Task'),
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
  const { data, loading, error, refresh } = useFetch(call, '/franchise/purchases');
  const { data: fleetVehicles } = useFetch(call, '/franchise/fleet/vehicles');
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedMode, setSelectedMode] = useState('all');
  const [inspection, setInspection] = useState(null);
  const [handoverRental, setHandoverRental] = useState(null);
  const [handoverVehicleId, setHandoverVehicleId] = useState('');
  const [handoverVehicle, setHandoverVehicle] = useState(null);
  const [inspectionForm, setInspectionForm] = useState({stage:'HANDOVER',vehicleId:'',odometerKm:'',batterySoc:'',damageNotes:'',customerConfirmed:true,extraCharges:0,notes:'',returnDisposition:'COMPLETED'});
  const { toast, show } = useToast();
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

  const sourceRows = Array.isArray(data) ? data : [];
  const groups = (() => {
    const map = new Map();
    const getCustomerId = r => r.customerId?._id || r.customerId || r.customer?._id || r.customer?._id || r.customerSnapshot?._id || '';
    const getBikeId = r => r.bikeId || r.vehicleSnapshot?.bikeId || r.vehicleId?.bikeId || r.vehicle?.bikeId || '';
    const getVehicleId = r => r.vehicleId?._id || r.vehicleId || r.vehicleSnapshot?._id || r.vehicle?._id || '';
    const isExt = r => r.paymentType === 'EXTENSION' || Number(r.extensionCount||0) > 0 || Number(r.extensionUnits||0) > 0 || !!r.extensionDueDate;
    sourceRows.forEach((r, idx) => {
      const sale = r.rentalPlan === 'SALE';
      const rentalId = r.rentalId || r.bookingId || r.parentRentalId || r.parentBookingId || '';
      const key = rentalId
        ? `rental:${rentalId}`
        : `${getCustomerId(r)}|${getBikeId(r)}|${getVehicleId(r)}|${sale?'sale':'rental'}`;
      if (!map.has(key)) map.set(key,{key,base:null,extensions:[],rows:[]});
      const g=map.get(key); g.rows.push(r);
      if (isExt(r)) g.extensions.push(r); else if (!g.base || new Date(r.createdAt||r.paidAt||0) < new Date(g.base.createdAt||g.base.paidAt||0)) g.base=r;
    });
    return Array.from(map.values()).map(g => {
      const base = g.base || g.rows[0] || {};
      const history = Array.isArray(base.extensionHistory) ? [...base.extensionHistory] : [];
      g.extensions.forEach(ex => {
        const item={
          extensionNumber: ex.extensionCount || ex.extensionNumber,
          amount: ex.amount || ex.totalAmount || 0,
          plan: ex.rentalPlan || base.rentalPlan || 'DAILY',
          units: ex.extensionUnits || ex.units || 1,
          unitLabel: ex.unitLabel,
          paidAt: ex.paidAt || ex.createdAt,
          previousDueDate: ex.previousDueDate || base.dueDate,
          newDueDate: ex.extensionDueDate || ex.dueDate,
          razorpayPaymentId: ex.razorpayPaymentId
        };
        if (!history.some(h => (h.razorpayPaymentId && h.razorpayPaymentId===item.razorpayPaymentId) || (h.extensionNumber && item.extensionNumber && Number(h.extensionNumber)===Number(item.extensionNumber)))) history.push(item);
      });
      g.base=base;
      g.basePayment = base.basePayment || null;
      g.extensionPayments = Array.isArray(base.extensionPayments) ? base.extensionPayments : [];
      const paymentHistory = g.extensionPayments.map(p => ({
        extensionNumber: p.extensionCount || p.extensionNumber,
        amount: p.amount || 0,
        plan: p.rentalPlan || base.rentalPlan || 'DAILY',
        units: p.extensionUnits || p.planUnits || 1,
        unitLabel: p.rentalPlan === 'WEEKLY' ? 'week' : p.rentalPlan === 'MONTHLY' ? 'month' : 'day',
        paidAt: p.paidAt || p.createdAt,
        previousDueDate: p.dueDate && history.find(h => Number(h.extensionNumber) === Number(p.extensionCount))?.previousDueDate || null,
        newDueDate: p.extensionDueDate || p.dueDate,
        paymentThrough: p.paymentThrough || 'RAZORPAY',
        razorpayPaymentId: p.razorpayPaymentId,
      }));
      paymentHistory.forEach(item => {
        if (!history.some(h => h.razorpayPaymentId && item.razorpayPaymentId && h.razorpayPaymentId === item.razorpayPaymentId)) history.push(item);
      });
      g.extensionHistory=history;
      return g;
    });
  })();
  const activeGroups = groups.filter(g => !['COMPLETED','CANCELLED'].includes(String(g.base?.status||'').toUpperCase()));

  const fleetList=Array.isArray(fleetVehicles)?fleetVehicles:(fleetVehicles?.assigned||[]);
  const fleetById=id => fleetList.find(v=>String(v._id)===String(id));
  const openHandover = r => { setHandoverRental(r); setHandoverVehicleId(''); setHandoverVehicle(null); };
  const beginHandoverInspection = () => {
    if (!handoverRental || !handoverVehicleId) return;
    const vehicle=fleetById(handoverVehicleId);
    if(!vehicle)return;
    setHandoverVehicle(vehicle);
    setInspection(handoverRental);
    setInspectionForm({stage:'HANDOVER',vehicleId:vehicle._id,odometerKm:vehicle.odometerKm ?? '',batterySoc:vehicle.batterySoc ?? '',damageNotes:'',customerConfirmed:true,extraCharges:0,notes:'',returnDisposition:'FLEET'});
    setHandoverRental(null);
  };
  const handoverOptions=handoverRental?fleetList.filter(v=>['ACTIVE','ASSIGNED'].includes(String(v.status||'').toUpperCase())):[];
  const openInspection = (r, stage) => {
    const id=String(r.vehicleId?._id||r.vehicleId||'');
    const vehicle=fleetById(id);
    setHandoverVehicle(vehicle||null);
    setInspection(r);
    setInspectionForm({stage,vehicleId:id,odometerKm:vehicle?.odometerKm ?? r.vehicleSnapshot?.odometerKm ?? '',batterySoc:vehicle?.batterySoc ?? r.vehicleSnapshot?.batterySoc ?? '',damageNotes:'',customerConfirmed:true,extraCharges:0,notes:'',returnDisposition:stage==='RETURN'?'FLEET':'FLEET'});
  };
  const saveInspection = async disposition => {
    if(!inspection)return;
    setBusy(inspection._id);
    try{
      const payload={...inspectionForm,returnDisposition:(disposition||inspectionForm.returnDisposition||'FLEET')==='FAULT'?'FAULT':'FLEET'};
      await call(`/franchise/fleet/rentals/${inspection._id}/inspection`,{method:'post',data:payload});
      show(payload.stage==='HANDOVER'?'Handover inspection completed and vehicle marked as handed over.':payload.returnDisposition==='FAULT'?'Vehicle returned and moved to Fault Vehicles.':'Vehicle return completed.');
      setInspection(null); setHandoverVehicle(null); refresh();
    }catch(e){show(e.response?.data?.message||'Inspection failed','error')}finally{setBusy(null)}
  };
  if (loading) return <Loader />; if (error) return <Err msg={error} />;

  const openDetails = (g, mode='all') => { setSelected(g); setSelectedMode(mode); };
  const baseAmount = g => Number(g.base?.totalAmount || g.base?.price || 0);
  const extensionTotal = g => g.extensionHistory.reduce((sum,x)=>sum+Number(x.amount||0),0);
  const totalPaid = g => baseAmount(g) + extensionTotal(g);
  const isSale = g => g.base?.rentalPlan === 'SALE';

  return <>
    <Toast toast={toast}/>
    <PageHeader title="Vehicle Sales & Rentals" />
    <MetricGrid metrics={[
      {label:'Vehicles',value:activeGroups.length,Icon:ClipboardList,color:'#2563eb'},
      {label:'Paid',value:activeGroups.filter(g=>g.base?.paymentStatus==='PAID').length,Icon:CheckCircle,color:'#16a34a'},
      {label:'Awaiting Handover',value:activeGroups.filter(g=>g.base?.paymentStatus==='PAID'&&!g.base?.handoverDate).length,Icon:Clock,color:'#d97706'},
      {label:'Extensions',value:groups.reduce((n,g)=>n+g.extensionHistory.length,0),Icon:RefreshCw,color:'#7c3aed'}
    ]}/>

    <div className="fr-rental-ledger">
      {activeGroups.map(g=>{
        const r=g.base||{}; const vs=r.vehicleSnapshot||{}; const cust=r.customerId||{};
        const bikeId=r.bikeId||vs.bikeId||r.vehicleId?.bikeId||'—';
        const vehicle=[vs.make,vs.model].filter(Boolean).join(' ')||'Vehicle';
        const extensionCount=g.extensionHistory.length;
        return <article key={g.key} className="fr-rental-card">
          <div className="fr-rental-card-head">
            <div className="fr-rental-identity">
              <div className="fr-rental-avatar">{(cust.name||'C').slice(0,1).toUpperCase()}</div>
              <div className="fr-rental-title-wrap">
                <span className="fr-payment-kicker">{isSale(g)?'VEHICLE SALE':'VEHICLE RENTAL'}</span>
                <h3>{cust.name||'Customer'}</h3>
                <p>{vehicle} <span>·</span> {vs.registrationNo||r.vehicleId?.registrationNo||'No registration'}</p>
              </div>
            </div>
            <div className="fr-rental-head-right">
              <span className="fr-paid-pill">{r.paymentStatus||'PAID'}</span>
              <strong>{money(totalPaid(g))}</strong>
            </div>
          </div>

          <div className="fr-rental-quick-grid">
            <div className="fr-rental-quick primary"><small>BIKE ID</small><strong>{bikeId}</strong></div>
            <div className="fr-rental-quick"><small>PLAN</small><strong>{isSale(g)?'Vehicle Purchase':`${String(r.rentalPlan||'DAILY').toUpperCase()} · ${r.planUnits||r.durationDays||1}`}</strong></div>
            <div className="fr-rental-quick"><small>PAYMENT DATE</small><strong>{fmt(g.basePayment?.paidAt||r.paidAt||r.purchaseDate||r.createdAt)}</strong></div>
            <div className="fr-rental-quick"><small>PAYMENT AMOUNT</small><strong>{money(g.basePayment?.amount ?? baseAmount(g))}</strong></div>
            <div className="fr-rental-quick"><small>PAYMENT THROUGH</small><strong>{g.basePayment?.paymentThrough||'RAZORPAY'}</strong></div>
            <div className="fr-rental-quick"><small>ACTUAL DUE DATE</small><strong>{fmt(r.dueDate||r.endDate)}</strong></div>
            <div className="fr-rental-quick extension"><small>EXTENSIONS</small><strong>{extensionCount ? `${extensionCount} extension${extensionCount===1?'':'s'}` : 'None'}</strong></div>
          </div>

          <div className="fr-rental-card-footer">
            <div className="fr-rental-foot-info"><span>{isSale(g)?'Purchase':'Rental'} amount <b>{money(baseAmount(g))}</b></span>{extensionCount>0&&<span>Extensions <b>{money(extensionTotal(g))}</b></span>}</div>
            <div className="fr-payment-actions">
              <button className="btn-primary" onClick={()=>openDetails(g,'all')}><FileText size={14}/> View Complete Details</button>
              {extensionCount>0&&<button className="btn-ghost fr-extension-btn" onClick={()=>openDetails(g,'extension')}><ChevronRight size={14}/> View Extension Details</button>}
              {r.paymentStatus==='PAID'&&!r.handoverDate&&<button className="btn-primary" disabled={busy===r._id} onClick={()=>openHandover(r)}>{busy===r._id?'Processing…':'🚗 Select Bike → Handover Inspect'}</button>}
              {!isSale(g)&&r.handoverDate&&!r.returnDate&&<button className="btn-primary" onClick={()=>openInspection(r,'RETURN')}>↩ Return Inspection</button>}
            </div>
          </div>
        </article>
      })}
      {!activeGroups.length&&<div className="card"><div className="empty-state"><Car size={40} style={{opacity:.25}}/><p>No customer vehicle purchases for this fleet operator.</p></div></div>}
    </div>

    {selected&&<div className="modal-overlay" onClick={()=>setSelected(null)}><div className="modal-drawer fr-rental-detail-modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-head"><div><div className="modal-title">{isSale(selected)?'Vehicle Sale Details':'Rental Details'}</div><div className="modal-subtitle">{selected.base?.customerId?.name||'Customer'} · {selected.base?.bikeId||selected.base?.vehicleSnapshot?.bikeId||'Bike'}</div></div><button className="icon-btn" onClick={()=>setSelected(null)}>✕</button></div>
      <div className="modal-body fr-rental-detail-body">
        <div className="fr-detail-hero"><div><span>{isSale(selected)?'TOTAL PAID':'TOTAL RECEIVED'}</span><strong>{money(totalPaid(selected))}</strong></div><span className="fr-paid-pill">{selected.base?.paymentStatus||'PAID'}</span></div>
        <div className="fr-detail-section"><div className="fr-detail-section-title">Customer</div><div className="fr-detail-grid">{[['Name',selected.base?.customerId?.name],['Email',selected.base?.customerId?.email],['Phone',selected.base?.customerId?.phone],['Address',selected.base?.customerLocation?.fullAddress||selected.base?.fullAddress]].map(([k,v])=><div className="kv-row" key={k}><span>{k}</span><strong>{v||'—'}</strong></div>)}</div></div>
        <div className="fr-detail-section"><div className="fr-detail-section-title">Vehicle</div><div className="fr-detail-grid">{[['Bike ID',selected.base?.bikeId||selected.base?.vehicleSnapshot?.bikeId||'—'],['Vehicle',[selected.base?.vehicleSnapshot?.make,selected.base?.vehicleSnapshot?.model].filter(Boolean).join(' ')||'—'],['Registration',selected.base?.vehicleSnapshot?.registrationNo||'—'],['Vehicle ID',selected.base?.vehicleId?._id||selected.base?.vehicleId||'—']].map(([k,v])=><div className="kv-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div></div>
        <div className="fr-detail-section"><div className="fr-detail-section-title">PLAN & PAYMENT</div><div className="fr-detail-grid">{[['Payment Date',fmt(selected.basePayment?.paidAt||selected.base?.paidAt||selected.base?.purchaseDate||selected.base?.createdAt)],['Payment Plan',isSale(selected)?'Vehicle Purchase':`${String(selected.base?.rentalPlan||'DAILY').toUpperCase()} · ${selected.base?.planUnits||selected.base?.durationDays||1}`],['Payment Amount',money(selected.basePayment?.amount ?? baseAmount(selected))],['Actual Payment',money(selected.basePayment?.amount ?? selected.base?.totalAmount ?? 0)],['Payment Through',selected.basePayment?.paymentThrough||'RAZORPAY'],['Actual Due Date',fmt(selected.base?.dueDate||selected.base?.endDate)],['Payment Status',selected.base?.paymentStatus||selected.basePayment?.status||'PAID'],['Payment ID',selected.basePayment?.razorpayPaymentId||selected.base?.razorpayPaymentId||'—']].map(([k,v])=><div className="kv-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div></div>
        {selected.extensionHistory.length>0&&<div className="fr-extension-history fr-extension-modal-history"><div className="fr-extension-history-head"><div><span className="fr-section-eyebrow">EXTENSION HISTORY</span><strong>{selected.extensionHistory.length} extension{selected.extensionHistory.length===1?'':'s'}</strong></div><span className="fr-extension-total">{money(extensionTotal(selected))}</span></div>{selected.extensionHistory.slice().reverse().map((ex,i)=><div className="fr-extension-history-item" key={`${ex.extensionNumber||i}-${ex.razorpayPaymentId||i}`}><div className="fr-extension-number">#{ex.extensionNumber||selected.extensionHistory.length-i}</div><div className="fr-extension-history-main"><div className="fr-extension-history-title">Extension {ex.extensionNumber||selected.extensionHistory.length-i} · {String(ex.plan||selected.base?.rentalPlan||'DAILY').toUpperCase()} · {Number(ex.units||1)} {ex.unitLabel||'unit'}{Number(ex.units||1)!==1?'s':''}</div><div className="fr-extension-history-sub">Actual due date: {fmt(ex.previousDueDate)} · Payment date: {fmt(ex.paidAt)} · Plan: {String(ex.plan||'DAILY').toUpperCase()} · Payment through: {ex.paymentThrough||'RAZORPAY'} · New due date: <b>{fmt(ex.newDueDate)}</b></div></div><div className="fr-extension-history-amount">{money(ex.amount||0)}</div></div>)}</div>}
        {selectedMode==='extension'&&<div className="fr-extension-focus"><b>Extension details</b><span>{selected.extensionHistory.length} extension payment{selected.extensionHistory.length===1?'':'s'} linked to this {isSale(selected)?'vehicle':'rental'}.</span></div>}
      </div>
      <div className="modal-footer"><button className="btn-ghost" onClick={()=>setSelected(null)}>Close</button></div>
    </div></div>}

    {handoverRental&&<div className="modal-overlay" onClick={()=>!busy&&setHandoverRental(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(560px,100%)'}}><div className="modal-head"><div><div className="modal-title">Select Fleet Inventory Vehicle</div><div className="modal-subtitle">{handoverRental.customerId?.name||'Customer'} · {handoverRental.vehicleSnapshot?.make||''} {handoverRental.vehicleSnapshot?.model||''}</div></div><button className="icon-btn" onClick={()=>setHandoverRental(null)}>✕</button></div><div className="modal-body"><div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:12,marginBottom:14}}><div style={{fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>Paid booking</div><div style={{fontWeight:800,marginTop:4}}>{handoverRental.vehicleSnapshot?.make||''} {handoverRental.vehicleSnapshot?.model||''}</div><div style={{fontSize:12,color:'#64748b',marginTop:4}}>Customer: {handoverRental.customerId?.name||'—'} · Plan: {handoverRental.rentalPlan||'SALE'}</div></div><Fld label="Fleet Inventory vehicle" required><select value={handoverVehicleId} onChange={e=>setHandoverVehicleId(e.target.value)}><option value="">Select any Fleet Inventory vehicle…</option>{handoverOptions.map(v=><option key={v._id} value={v._id}>{v.bikeId||'No Bike ID'} · {v.make} {v.model} · {v.registrationNo||'No registration'} · {String(v.fleetLocationStatus||'AT_FLEET').replaceAll('_',' ')}</option>)}</select></Fld>{handoverOptions.length===0&&<div style={{marginTop:10,padding:10,borderRadius:10,background:'#fff7ed',color:'#9a3412',fontSize:12}}>No Fleet Inventory vehicles are assigned to this fleet operator.</div>}<div style={{marginTop:14,padding:12,borderRadius:12,background:'#eff6ff',color:'#1e40af',fontSize:12}}><strong>Next step:</strong> select the physical Bike ID, then complete the <strong>Handover Inspection</strong>. The final action will be <strong>Mark Handover</strong>.</div></div><div className="modal-footer"><button className="btn-ghost" onClick={()=>setHandoverRental(null)}>Cancel</button><button className="btn-primary" disabled={busy===handoverRental._id||!handoverVehicleId} onClick={beginHandoverInspection}>🔍 Handover Inspect →</button></div></div></div>}

{inspection&&<div className="modal-overlay" onClick={()=>setInspection(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="modal-title">{inspectionForm.stage==='HANDOVER'?'Handover Inspection':'Return Inspection'}</div><div className="modal-subtitle">{inspection.customerId?.name||'Customer'} · {handoverVehicle?.bikeId||inspection.vehicleSnapshot?.bikeId||'Bike'} · {handoverVehicle?.chassisNo||inspection.vehicleSnapshot?.chassisNo||'VIN —'}</div></div><button className="icon-btn" onClick={()=>setInspection(null)}>✕</button></div><div className="modal-body">
    {handoverVehicle&&<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:14}}>
      {[['Bike ID',handoverVehicle.bikeId],['Chassis / VIN',handoverVehicle.chassisNo],['Registration',handoverVehicle.registrationNo],['Motor Number',handoverVehicle.motorNo],['Battery Capacity',handoverVehicle.batteryCapacityKwh?`${handoverVehicle.batteryCapacityKwh} kWh`:'—'],['Range',handoverVehicle.rangeKm?`${handoverVehicle.rangeKm} km`:'—'],['Charging Type',handoverVehicle.chargingType],['Top Speed',handoverVehicle.topSpeedKph?`${handoverVehicle.topSpeedKph} km/h`:'—']].map(([k,v])=><div key={k} style={{padding:10,border:'1px solid #e2e8f0',borderRadius:10,background:'#f8fafc'}}><small style={{display:'block',color:'#64748b',fontSize:10,fontWeight:700,textTransform:'uppercase'}}>{k}</small><strong style={{display:'block',marginTop:4,fontSize:12}}>{v||'—'}</strong></div>)}
    </div>}
    <div className="two-col-grid"><Fld label="Odometer (km)"><input type="number" min="0" value={inspectionForm.odometerKm} onChange={e=>setInspectionForm(f=>({...f,odometerKm:e.target.value}))}/></Fld><Fld label="Battery SOC (%)"><input type="number" min="0" max="100" value={inspectionForm.batterySoc} onChange={e=>setInspectionForm(f=>({...f,batterySoc:e.target.value}))}/></Fld></div>
    <Fld label="Damage notes"><textarea value={inspectionForm.damageNotes} onChange={e=>setInspectionForm(f=>({...f,damageNotes:e.target.value}))}/></Fld>{inspectionForm.stage==='RETURN'&&<Fld label="Extra charges"><input type="number" min="0" value={inspectionForm.extraCharges} onChange={e=>setInspectionForm(f=>({...f,extraCharges:e.target.value}))}/></Fld>}<Fld label="Notes"><textarea value={inspectionForm.notes} onChange={e=>setInspectionForm(f=>({...f,notes:e.target.value}))}/></Fld><label style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><input type="checkbox" checked={inspectionForm.customerConfirmed} onChange={e=>setInspectionForm(f=>({...f,customerConfirmed:e.target.checked}))}/> Customer confirmed</label>
  </div><div className="modal-footer"><button className="btn-ghost" onClick={()=>setInspection(null)}>Cancel</button>{inspectionForm.stage==='HANDOVER'?<button className="btn-primary" disabled={busy===inspection._id} onClick={()=>saveInspection('FLEET')}>{busy===inspection._id?'Saving…':'✓ Inspect & Handover'}</button>:<><button className="btn-ghost" disabled={busy===inspection._id} onClick={()=>saveInspection('FAULT')} style={{color:'#b91c1c',borderColor:'#fecaca'}}>⚠ Move to Fault Vehicles</button><button className="btn-primary" disabled={busy===inspection._id} onClick={()=>saveInspection('COMPLETED')}>{busy===inspection._id?'Saving…':'✓ Complete Vehicle Return'}</button></>}</div></div></div>}
  </>;
}




function FranComplaints({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/franchise/complaints');
  const { data: pendingVehiclesData } = useFetch(call, '/franchise/pending-vehicles');
  const { data: staffList } = useFetch(call, '/franchise/staff-list');

  // Keep the local name distinct from any older Vite/HMR binding named `inventory`.
  // This prevents the TDZ error that previously blanked the whole complaints page.
  const safeInventory = Array.isArray(pendingVehiclesData)
    ? pendingVehiclesData
    : (Array.isArray(pendingVehiclesData?.vehicles) ? pendingVehiclesData.vehicles : []);
  const safeStaffList = Array.isArray(staffList)
    ? staffList
    : (Array.isArray(staffList?.staff) ? staffList.staff : []);

  useEffect(()=>{
    const socket=io((API||window.location.origin).replace(/\/api\/?$/,''),{transports:['websocket','polling']});
    socket.on('connect',()=>{call('/auth/me').then(u=>{if(u?._id)socket.emit('auth:user',u._id)}).catch(()=>{})});
    socket.on('complaint:update',()=>refresh());
    return()=>socket.disconnect();
  },[]);
  const [tab, setTab] = useState('open'); // 'open' | 'resolved'
  const [selected, setSelected] = useState(null);
  const [modalTab, setModalTab] = useState('details'); // 'details' | 'history' | 'jobcard'
  const [resolution, setResolution] = useState('');
  const [replaceId, setReplaceId] = useState('');
  const [faultReason, setFaultReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();
  // Vehicle history
  const [vHistory, setVHistory] = useState(null);
  const [vHistoryLoading, setVHistoryLoading] = useState(false);
  // Job card creation
  const [jcStaffId, setJcStaffId] = useState('');
  const [jcDescription, setJcDescription] = useState('');
  const [jcPriority, setJcPriority] = useState('NORMAL');
  const [jcBusy, setJcBusy] = useState(false);
  // Job cards tab sub-tabs
  const [jcTab, setJcTab] = useState('pending'); // 'pending' | 'completed'

  const available = safeInventory.filter(v => v && v.status === 'APPROVED' && Number(v.quantity ?? 1) > 0);
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—';
  const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

  const openModal = async (c) => {
    setSelected(c);
    setResolution('');
    setReplaceId('');
    setFaultReason('');
    setJcStaffId('');
    setJcDescription(c.message || '');
    setJcPriority('NORMAL');
    setModalTab('details');
    setVHistory(null);
    setVHistoryLoading(true);
    try {
      const h = await call(`/franchise/complaints/${c._id}/vehicle-history`);
      setVHistory(h);
    } catch (_) { setVHistory({ jobs: [], rentals: [] }); }
    finally { setVHistoryLoading(false); }
  };

  const solve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await call(`/franchise/complaints/${selected._id}/solve`, { method:'put', data:{ resolution, replacementVehicleId:replaceId||undefined, faultReason:faultReason||undefined } });
      // Push a review request so the customer portal surfaces the rating prompt
      try {
        const storedReviewRequests = store.get('ev_customer_review_requests');
        const reviewRequests = Array.isArray(storedReviewRequests) ? storedReviewRequests : [];
        // Avoid duplicate requests for the same complaint
        if (!reviewRequests.find(r => r.complaintId === selected._id)) {
          reviewRequests.push({
            complaintId: selected._id,
            vehicleMake: selected.vehicleSnapshot?.make || '',
            vehicleModel: selected.vehicleSnapshot?.model || '',
            vehicleReg: selected.vehicleSnapshot?.registrationNo || '—',
            resolution,
            resolvedAt: new Date().toISOString(),
            customerPhone: selected.customerId?.phone || '',
            customerName: selected.customerId?.name || 'Customer',
            reviewed: false,
          });
          localStorage.setItem('ev_customer_review_requests', JSON.stringify(reviewRequests));
        }
      } catch (_) {}
      show('Complaint marked resolved. Customer has been asked to leave a review.');
      setSelected(null); refresh();
    } catch(e) { show(e.response?.data?.message || 'Could not resolve complaint','error'); }
    finally { setBusy(false); }
  };

  const createJobCard = async () => {
    if (!selected) return;
    setJcBusy(true);
    try {
      const job = await call(`/franchise/complaints/${selected._id}/work-order`, {
        method:'post',
        data:{ description: jcDescription, staffId: jcStaffId||undefined, priority: jcPriority }
      });
      // Write to localStorage so staff portal can see it
      const storedJobCards = store.get('ev_franchise_job_cards');
      const staffJobCards = Array.isArray(storedJobCards) ? storedJobCards : [];
      const staffMember = safeStaffList.find(s => s && s._id === jcStaffId);
      staffJobCards.push({
        id: job._id || Date.now().toString(),
        jobId: job._id,
        complaintId: selected._id,
        staffId: jcStaffId,
        staffName: staffMember?.name || 'Unassigned',
        vehicleMake: selected.vehicleSnapshot?.make || '',
        vehicleModel: selected.vehicleSnapshot?.model || '',
        vehicleReg: selected.vehicleSnapshot?.registrationNo || '—',
        customerName: selected.customerId?.name || 'Customer',
        customerPhone: selected.customerId?.phone || '—',
        problem: selected.message,
        description: jcDescription,
        priority: jcPriority,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        elapsedSeconds: 0,
        remarks: '',
      });
      localStorage.setItem('ev_franchise_job_cards', JSON.stringify(staffJobCards));
      show(`Job card created${jcStaffId ? ` and assigned to ${staffMember?.name || 'staff'}` : ''}.`);
      setJcStaffId(''); setJcDescription(''); refresh();
      setModalTab('jobcard'); setJcTab('pending');
    } catch(e) { show(e.response?.data?.message || 'Could not create job card','error'); }
    finally { setJcBusy(false); }
  };

  const complaints = Array.isArray(data)
    ? data
    : (Array.isArray(data?.complaints) ? data.complaints : []);

  const openComplaints = complaints.filter(c => c && !['SOLVED','CLOSED'].includes(c.status));
  const resolvedComplaints = complaints.filter(c => c && ['SOLVED','CLOSED'].includes(c.status));
  const displayList = tab === 'open' ? openComplaints : resolvedComplaints;

  // Job cards from localStorage tied to this fleet operator
  const storedAllJobCards = store.get('ev_franchise_job_cards');
  const allJobCards = Array.isArray(storedAllJobCards) ? storedAllJobCards : [];
  const pendingJobCards = allJobCards.filter(j => j && j.status !== 'COMPLETED');
  const completedJobCards = allJobCards.filter(j => j && j.status === 'COMPLETED');

  // Page-level tab: 'complaints' | 'jobcards'
  const [pageTab, setPageTab] = useState('complaints');
  // Selected job card for detail panel
  const [selectedJc, setSelectedJc] = useState(null);

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;

  const STAT_COLOR = { OPEN:'#d97706', IN_PROGRESS:'#2563eb', SOLVED:'#16a34a', CLOSED:'#64748b' };

  const jcStatusMeta = (jc) => {
    if (jc.status==='COMPLETED') return { label:'✅ Completed', bg:'#dcfce7', color:'#166534', border:'#16a34a', cardBg:'#f0fdf4' };
    if (jc.status==='PAUSED')    return { label:'⏸ Paused',    bg:'#fef3c7', color:'#92400e', border:'#d97706', cardBg:'#fffbeb' };
    if (jc.status==='IN_PROGRESS') return { label:'▶ In Progress', bg:'#dbeafe', color:'#1d4ed8', border:'#2563eb', cardBg:'#eff6ff' };
    return { label:'⏳ Pending', bg:'#f3e8ff', color:'#7c3aed', border:'#7c3aed', cardBg:'#fff' };
  };

  const fmtElapsed = s => {
    if (!s) return '0m';
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return <>
    <Toast toast={toast}/>
    <PageHeader title="Customer Complaints" sub="Monitor complaint progress. Command Center and Staff handle the workflow."/>

    {/* ── Metrics ── */}
    <div className="metric-grid" style={{marginBottom:20}}>
      {[
        {label:'Total',value:complaints.length,color:'#2563eb',Icon:Bell},
        {label:'Open',value:openComplaints.length,color:'#d97706',Icon:AlertTriangle},
        {label:'In Progress',value:complaints.filter(c=>c.status==='IN_PROGRESS').length,color:'#7c3aed',Icon:Wrench},
        {label:'Resolved',value:resolvedComplaints.length,color:'#16a34a',Icon:CheckCircle},
      ].map(({label,value,color,Icon})=>(
        <div key={label} className="metric-card">
          <div className="metric-icon" style={{background:color+'18',color}}><Icon size={20}/></div>
          <div className="metric-body"><div className="metric-label">{label}</div><div className="metric-value">{value}</div></div>
        </div>
      ))}
    </div>

    {/* ── Page-level Tab Bar ── */}
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      borderBottom:'2px solid #f1f5f9', marginBottom:20, gap:12, flexWrap:'wrap',
    }}>
      <div style={{display:'flex', gap:0}}>
        {[
          ['complaints', '🔔 Complaints', complaints.length],
          
        ].map(([key, label, cnt]) => (
          <button key={key} onClick={()=>setPageTab(key)} style={{
            padding:'10px 22px', border:'none', cursor:'pointer',
            fontWeight:700, fontSize:14, background:'transparent',
            color: pageTab===key ? '#2563eb' : '#6b7280',
            borderBottom: pageTab===key ? '2.5px solid #2563eb' : '2.5px solid transparent',
            marginBottom:'-2px', transition:'all .15s',
            display:'flex', alignItems:'center', gap:8,
          }}>
            {label}
            <span style={{
              background: pageTab===key ? '#2563eb' : '#e2e8f0',
              color: pageTab===key ? '#fff' : '#64748b',
              borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700,
            }}>{cnt}</span>
          </button>
        ))}
      </div>
      {/* Add Job Card button — only visible in job cards tab */}
      {pageTab==='jobcards' && (
        <button
          onClick={()=>{ if(complaints.length>0){openModal(complaints[0]);} }}
          style={{
            display:'flex', alignItems:'center', gap:6,
            background:'#7c3aed', color:'#fff', border:'none', borderRadius:10,
            padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13,
            boxShadow:'0 2px 8px rgba(124,58,237,.25)',
          }}
        >
          <Plus size={15}/> Add Job Card
        </button>
      )}
    </div>

    {/* ══════════════════════════════════════
        COMPLAINTS TAB
    ══════════════════════════════════════ */}
    {pageTab==='complaints' && (<>
      {/* Sub-tabs: Open / Resolved */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[['open','🔔 Open / Active',openComplaints.length],['resolved','✅ Resolved / Closed',resolvedComplaints.length]].map(([key,label,cnt])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            padding:'7px 18px', borderRadius:24, border:'2px solid', cursor:'pointer', fontWeight:700, fontSize:13,
            borderColor: tab===key ? '#2563eb' : '#e2e8f0',
            background:  tab===key ? '#2563eb' : '#fff',
            color:       tab===key ? '#fff'    : '#374151',
          }}>
            {label}
            <span style={{marginLeft:6,background:tab===key?'rgba(255,255,255,.25)':'#f1f5f9',borderRadius:99,padding:'1px 8px',fontSize:11}}>{cnt}</span>
          </button>
        ))}
      </div>

      {/* Complaint Cards */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {displayList.map(c=>(
          <div key={c._id} className="card" style={{padding:0,overflow:'hidden',borderLeft:`4px solid ${STAT_COLOR[c.status]||'#e2e8f0'}`}}>
            {/* Card Header */}
            <div style={{padding:'14px 18px 10px', borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:'#111827'}}>{c.subject||c.category||'Vehicle Complaint'}</div>
                  <div style={{fontSize:12,color:'#64748b',marginTop:4,display:'flex',gap:10,flexWrap:'wrap'}}>
                    <span>👤 {c.customerId?.name||'Customer'}</span>
                    <span>📞 {c.customerId?.phone||'—'}</span>
                    <span>🕐 {fmtDt(c.createdAt)}</span>
                  </div>
                </div>
                <span style={{
                  fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:99, whiteSpace:'nowrap',
                  background:(STAT_COLOR[c.status]||'#64748b')+'18', color:STAT_COLOR[c.status]||'#64748b',
                }}>{c.status}</span>
              </div>
            </div>
            {/* Card Body */}
            <div style={{padding:'12px 18px'}}>
              <div style={{fontSize:13,color:'#374151',lineHeight:1.6,marginBottom:8}}>{c.message}</div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:12,color:'#475569'}}>
                {c.vehicleSnapshot&&<span>🚗 <b>{c.vehicleSnapshot.make||''} {c.vehicleSnapshot.model||''}</b> · {c.vehicleSnapshot.registrationNo||'—'}</span>}
                {c.paymentDetails&&<span>💳 {c.paymentDetails.paymentStatus||'—'} · ₹{Number(c.paymentDetails.totalAmount||0).toLocaleString('en-IN')}</span>}
                {c.assignedStaffName&&<span style={{color:'#2563eb'}}>🔧 {c.assignedStaffName}</span>}
              </div>
              <div className="complaint-progress-mini">{[['Raised request',true],['Staff assigned',!!(c.assignedStaffId||c.assignedStaffName)],['Working on it',['IN_PROGRESS','PAUSED','STAFF_COMPLETED','SOLVED','CLOSED'].includes(c.status)],['Staff completed',['STAFF_COMPLETED','SOLVED','CLOSED'].includes(c.status)],['Resolved',['SOLVED','CLOSED'].includes(c.status)]].map(([label,done],i)=><div key={label} className={done?'done':''}><span>{done?'✓':i+1}</span><small>{label}</small></div>)}</div>
              {c.resolution&&<div style={{marginTop:8,fontSize:12,color:'#166534',background:'#f0fdf4',padding:'7px 10px',borderRadius:8,lineHeight:1.5}}>✓ <b>Resolution:</b> {c.resolution}</div>}
              {c.status==='SOLVED'&&<div style={{marginTop:6,color:'#16a34a',fontSize:12}}>✓ Solved {fmt(c.solvedAt)} · Waiting for customer feedback.</div>}
              {c.status==='CLOSED'&&<div style={{marginTop:6,color:'#166534',fontSize:12}}>⭐ Rating: {c.franchiseeRating||'—'}/5{c.feedback?` · "${c.feedback}"`:''}</div>}
            </div>
            {/* Card Footer */}
            <div style={{padding:'10px 18px',background:'#f8fafc',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,flexWrap:'wrap'}}>
              {!['SOLVED','CLOSED'].includes(c.status)&&(
                <button className="btn-primary" onClick={()=>openModal(c)}>👁 View Progress</button>
              )}
              {['SOLVED','CLOSED'].includes(c.status)&&(
                <button className="btn-ghost" onClick={()=>openModal(c)}>📋 View Details</button>
              )}
            </div>
          </div>
        ))}
        {!displayList.length&&(
          <div className="card">
            <div className="empty-state">
              <Bell size={40} style={{opacity:.2, marginBottom:12}}/>
              <p style={{fontWeight:600,color:'#94a3b8'}}>No {tab} complaints</p>
            </div>
          </div>
        )}
      </div>
    </>)}

    {/* ══════════════════════════════════════
        JOB CARDS TAB
    ══════════════════════════════════════ */}
    {false && pageTab==='jobcards' && (<>
      {/* Sub-tabs: Pending / In Progress / Paused / Completed */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[
          ['pending',    '⏳ Pending',     allJobCards.filter(j=>j.status==='PENDING').length],
          ['in_progress','▶ In Progress',  allJobCards.filter(j=>j.status==='IN_PROGRESS').length],
          ['paused',     '⏸ Paused',       allJobCards.filter(j=>j.status==='PAUSED').length],
          ['completed',  '✅ Completed',   completedJobCards.length],
        ].map(([key,label,cnt])=>(
          <button key={key} onClick={()=>setJcTab(key)} style={{
            padding:'7px 16px', borderRadius:8, border:'2px solid', cursor:'pointer', fontWeight:700, fontSize:13,
            borderColor: jcTab===key
              ? (key==='completed'?'#16a34a':key==='paused'?'#d97706':key==='in_progress'?'#2563eb':'#7c3aed')
              : '#e2e8f0',
            background: jcTab===key
              ? (key==='completed'?'#16a34a':key==='paused'?'#d97706':key==='in_progress'?'#2563eb':'#7c3aed')
              : '#fff',
            color: jcTab===key ? '#fff' : '#374151',
            display:'flex', alignItems:'center', gap:6,
          }}>
            {label}
            <span style={{
              background: jcTab===key ? 'rgba(255,255,255,.25)' : '#f1f5f9',
              color: jcTab===key ? '#fff' : '#64748b',
              borderRadius:99, padding:'0px 7px', fontSize:11, fontWeight:700, minWidth:18, textAlign:'center',
            }}>{cnt}</span>
          </button>
        ))}
      </div>

      {/* ── Job Cards Grid ── */}
      {(()=>{
        const filtered = jcTab==='completed' ? completedJobCards
          : jcTab==='paused'      ? allJobCards.filter(j=>j.status==='PAUSED')
          : jcTab==='in_progress' ? allJobCards.filter(j=>j.status==='IN_PROGRESS')
          : allJobCards.filter(j=>j.status==='PENDING');

        if (!filtered.length) return (
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            minHeight:260, background:'#fff', border:'1.5px dashed #e2e8f0', borderRadius:16, gap:12,
          }}>
            <ClipboardList size={40} style={{color:'#cbd5e1'}}/>
            <div style={{fontWeight:700, fontSize:15, color:'#94a3b8'}}>No {jcTab.replace('_',' ')} job cards</div>
            <div style={{fontSize:13, color:'#cbd5e1'}}>
              {jcTab==='pending' ? 'Job cards you create will appear here.' : `No ${jcTab.replace('_',' ')} cards right now.`}
            </div>
            {jcTab==='pending' && complaints.length>0 && (
              <button onClick={()=>{openModal(complaints[0]);}} style={{
                marginTop:4, background:'#7c3aed', color:'#fff', border:'none', borderRadius:8,
                padding:'9px 20px', cursor:'pointer', fontWeight:700, fontSize:13,
              }}><Plus size={14} style={{verticalAlign:'middle',marginRight:4}}/>Create First Job Card</button>
            )}
          </div>
        );

        return (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))',
            gap:16,
          }}>
            {filtered.map(jc=>{
              const meta = jcStatusMeta(jc);
              const isSelected = selectedJc?.id === jc.id;
              return (
                <div
                  key={jc.id}
                  onClick={()=>setSelectedJc(isSelected ? null : jc)}
                  style={{
                    border: `2px solid ${isSelected ? meta.border : '#e2e8f0'}`,
                    borderRadius:14, overflow:'hidden',
                    background: meta.cardBg,
                    boxShadow: isSelected ? `0 0 0 3px ${meta.border}33` : '0 1px 4px rgba(0,0,0,.06)',
                    cursor:'pointer', transition:'box-shadow .15s, border-color .15s',
                    borderTop:`4px solid ${meta.border}`,
                  }}
                >
                  {/* Card Top */}
                  <div style={{padding:'14px 16px 10px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
                      <div style={{fontWeight:800,fontSize:14,color:'#111827',lineHeight:1.3}}>
                        🚗 {jc.vehicleMake} {jc.vehicleModel}
                      </div>
                      <span style={{
                        fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, whiteSpace:'nowrap', flexShrink:0,
                        background:meta.bg, color:meta.color,
                      }}>{meta.label}</span>
                    </div>
                    <div style={{fontSize:12,color:'#64748b',marginBottom:6}}>
                      🔖 {jc.vehicleReg} &nbsp;·&nbsp; 👤 {jc.customerName}
                    </div>
                    <div style={{fontSize:12,color:'#374151',lineHeight:1.5}}>
                      <span style={{fontWeight:600}}>Problem:</span> {jc.problem}
                    </div>
                  </div>

                  {/* Divider row: staff + priority + time */}
                  <div style={{
                    display:'flex', gap:12, flexWrap:'wrap', alignItems:'center',
                    padding:'8px 16px', background:'rgba(0,0,0,.025)',
                    borderTop:'1px solid rgba(0,0,0,.06)',
                    fontSize:12, color:'#475569',
                  }}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'#94a3b8',display:'inline-block'}}/>
                      {jc.staffName||'Unassigned'}
                    </span>
                    <span style={{
                      padding:'1px 8px', borderRadius:99, fontSize:11, fontWeight:700,
                      background: jc.priority==='URGENT'||jc.priority==='HIGH' ? '#fee2e2' : jc.priority==='LOW' ? '#f0fdf4' : '#f1f5f9',
                      color: jc.priority==='URGENT'||jc.priority==='HIGH' ? '#dc2626' : jc.priority==='LOW' ? '#16a34a' : '#475569',
                    }}>⚡ {jc.priority}</span>
                    {jc.elapsedSeconds>0&&<span>⏱ {fmtElapsed(jc.elapsedSeconds)}</span>}
                  </div>

                  {/* Pause Reason (if paused) */}
                  {jc.pauseReason && jc.status==='PAUSED' && (
                    <div style={{padding:'8px 16px',background:'#fef3c7',borderTop:'1px solid #fde68a',fontSize:12,color:'#92400e'}}>
                      ⏸ <b>Pause Reason:</b> {jc.pauseReason}
                      {jc.pausedAt&&<span style={{color:'#b45309',marginLeft:6,fontSize:11}}>· {fmtDt(jc.pausedAt)}</span>}
                    </div>
                  )}

                  {/* Staff Remarks (if completed) */}
                  {jc.remarks && jc.status==='COMPLETED' && (
                    <div style={{padding:'8px 16px',background:'#f0fdf4',borderTop:'1px solid #bbf7d0',fontSize:12,color:'#166534'}}>
                      📝 <b>Remarks:</b> {jc.remarks}
                    </div>
                  )}

                  {/* Expanded Detail Panel */}
                  {isSelected && (
                    <div style={{borderTop:'2px solid',borderColor:meta.border,background:'#fff',padding:'16px'}}>
                      <div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:12}}>Job Card Details</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                        {[
                          ['Customer', jc.customerName],
                          ['Phone', jc.customerPhone],
                          ['Vehicle', `${jc.vehicleMake} ${jc.vehicleModel}`],
                          ['Reg No.', jc.vehicleReg],
                          ['Staff', jc.staffName||'Unassigned'],
                          ['Priority', jc.priority],
                          ['Created', fmtDt(jc.createdAt)],
                          jc.startedAt && ['Started', fmtDt(jc.startedAt)],
                          jc.completedAt && ['Completed', fmtDt(jc.completedAt)],
                          jc.elapsedSeconds>0 && ['Time Spent', fmtElapsed(jc.elapsedSeconds)],
                        ].filter(Boolean).map(([k,v])=>(
                          <div key={k} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'8px 10px',fontSize:12}}>
                            <div style={{color:'#94a3b8',fontSize:11,marginBottom:2}}>{k}</div>
                            <div style={{fontWeight:700,color:'#111827'}}>{v||'—'}</div>
                          </div>
                        ))}
                      </div>
                      {jc.description && jc.description !== jc.problem && (
                        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#374151',marginBottom:10,lineHeight:1.5}}>
                          <div style={{fontWeight:700,fontSize:11,color:'#94a3b8',marginBottom:4}}>WORK DESCRIPTION</div>
                          {jc.description}
                        </div>
                      )}
                      {jc.pauseReason && (
                        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#92400e',marginBottom:10}}>
                          <div style={{fontWeight:700,fontSize:11,color:'#b45309',marginBottom:4}}>⏸ PAUSE REASON FROM STAFF</div>
                          {jc.pauseReason}
                        </div>
                      )}
                      {jc.remarks && (
                        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#166534',marginBottom:10}}>
                          <div style={{fontWeight:700,fontSize:11,color:'#16a34a',marginBottom:4}}>📝 STAFF REMARKS</div>
                          {jc.remarks}
                        </div>
                      )}
                      <button onClick={(e)=>{e.stopPropagation();setSelectedJc(null);}} style={{
                        width:'100%', border:'1.5px solid #e2e8f0', background:'#f8fafc', color:'#374151',
                        borderRadius:8, padding:'8px', cursor:'pointer', fontWeight:600, fontSize:13,
                      }}>Close Details</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Quick summary bar */}
      {allJobCards.length > 0 && (
        <div style={{
          display:'flex', gap:16, flexWrap:'wrap', marginTop:20,
          padding:'12px 18px', background:'#f8fafc', border:'1px solid #e2e8f0',
          borderRadius:12, fontSize:13, color:'#475569',
        }}>
          <span style={{fontWeight:700, color:'#374151'}}>Summary:</span>
          {[
            ['⏳ Pending',    allJobCards.filter(j=>j.status==='PENDING').length,    '#7c3aed'],
            ['▶ In Progress', allJobCards.filter(j=>j.status==='IN_PROGRESS').length,'#2563eb'],
            ['⏸ Paused',     allJobCards.filter(j=>j.status==='PAUSED').length,     '#d97706'],
            ['✅ Completed',  completedJobCards.length,                               '#16a34a'],
          ].map(([label, cnt, color])=>(
            <span key={label} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:color,display:'inline-block'}}/>
              <b style={{color}}>{cnt}</b> {label}
            </span>
          ))}
          <span style={{marginLeft:'auto',fontWeight:600}}>Total: {allJobCards.length}</span>
        </div>
      )}
    </>)}

    {/* Modal */}
    {selected&&(
      <div className="modal-overlay" onClick={()=>setSelected(null)}>
        <div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(680px,100%)',maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
          {/* Modal Header */}
          <div className="modal-head">
            <div>
              <div className="modal-title">Complaint: {selected.subject||selected.category||'Vehicle Complaint'}</div>
              <div className="modal-subtitle">👤 {selected.customerId?.name||'Customer'} · 🚗 {selected.vehicleSnapshot?.make||''} {selected.vehicleSnapshot?.model||''} · {selected.vehicleSnapshot?.registrationNo||'—'}</div>
            </div>
            <button className="icon-btn" onClick={()=>setSelected(null)}>✕</button>
          </div>

          {/* Modal Tabs */}
          <div style={{display:'flex',gap:4,padding:'12px 20px 0',borderBottom:'1px solid #f1f5f9',background:'#fff',flexShrink:0}}>
            {[['details','📋 Details'],['history','🔧 Vehicle History']].map(([key,label])=>(
              <button key={key} onClick={()=>setModalTab(key)} style={{
                padding:'8px 14px',borderRadius:'8px 8px 0 0',border:'none',cursor:'pointer',fontWeight:600,fontSize:13,
                background:modalTab===key?'#fff':'transparent',
                color:modalTab===key?'#2563eb':'#64748b',
                borderBottom:modalTab===key?'2px solid #2563eb':'2px solid transparent',
              }}>{label}</button>
            ))}
          </div>

          {/* Modal Body */}
          <div className="modal-body" style={{flex:1,overflowY:'auto'}}>

            {/* ── DETAILS TAB ── */}
            {modalTab==='details'&&(
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,padding:12}}>
                  <div style={{fontWeight:700,marginBottom:6}}>📣 Complaint Message</div>
                  <div style={{fontSize:13,color:'#374151',lineHeight:1.6}}>{selected.message}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
                  {[
                    ['Status',selected.status],
                    ['Category',selected.category||'—'],
                    ['Raised On',fmtDt(selected.createdAt)],
                    ['Vehicle',`${selected.vehicleSnapshot?.make||''} ${selected.vehicleSnapshot?.model||''}`],
                    ['Registration',selected.vehicleSnapshot?.registrationNo||'—'],
                    ['Customer',selected.customerId?.name||'—'],
                    ['Phone',selected.customerId?.phone||'—'],
                    ['Payment',selected.paymentDetails?.paymentStatus||'—'],
                    ['Amount',`₹${Number(selected.paymentDetails?.totalAmount||0).toLocaleString('en-IN')}`],
                    ['Assigned To',selected.assignedStaffName||'Not assigned'],
                  ].map(([k,v])=>(
                    <div key={k} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'8px 12px',fontSize:12}}>
                      <div style={{color:'#64748b',marginBottom:2}}>{k}</div>
                      <div style={{fontWeight:700,color:'#111827'}}>{v}</div>
                    </div>
                  ))}
                </div>
                {selected.resolution&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:12}}>
                  <div style={{fontWeight:700,color:'#166534',marginBottom:4}}>✅ Resolution</div>
                  <div style={{fontSize:13,color:'#374151'}}>{selected.resolution}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:4}}>Solved on {fmt(selected.solvedAt)}</div>
                </div>}
              </div>
            )}

            {/* ── VEHICLE HISTORY TAB ── */}
            {modalTab==='history'&&(
              <div>
                {vHistoryLoading?(
                  <div style={{textAlign:'center',padding:32,color:'#64748b'}}>Loading vehicle history…</div>
                ):(
                  <>
                    {/* Previous Repairs */}
                    <div style={{fontWeight:700,fontSize:14,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                      <Wrench size={16}/> Previous Repairs &amp; Jobs ({(vHistory?.jobs||[]).length})
                    </div>
                    {(vHistory?.jobs||[]).length===0&&<div style={{fontSize:13,color:'#94a3b8',marginBottom:16,padding:'10px 0'}}>No previous repair jobs found for this vehicle.</div>}
                    <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                      {(vHistory?.jobs||[]).map((j,i)=>(
                        <div key={j._id||i} style={{border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 14px',fontSize:12,background:j.status==='COMPLETED'?'#f0fdf4':'#fffbeb'}}>
                          <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:6}}>
                            <div style={{fontWeight:700}}>{j.serviceType||'Service'}</div>
                            <span style={{padding:'2px 9px',borderRadius:99,fontSize:11,fontWeight:700,background:j.status==='COMPLETED'?'#dcfce7':'#fef3c7',color:j.status==='COMPLETED'?'#166534':'#92400e'}}>{j.status}</span>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'4px 10px',color:'#475569'}}>
                            <span>🔑 Priority: {j.priority||'NORMAL'}</span>
                            <span>📅 Created: {fmtDt(j.createdAt)}</span>
                            {j.staffStartedAt&&<span>▶ Started: {fmtDt(j.staffStartedAt)}</span>}
                            {j.staffCompletedAt&&<span>✅ Completed: {fmtDt(j.staffCompletedAt)}</span>}
                            {j.elapsedSeconds>0&&<span>⏱ Work Duration: {fmtElapsed(j.elapsedSeconds)}</span>}
                            {j.totalPauseSeconds>0&&<span>⏸ Total Paused: {fmtElapsed(j.totalPauseSeconds)}</span>}
                            {j.problem&&<span style={{gridColumn:'1/-1'}}>⚠️ Problem: {j.problem}</span>}
                            {(j.serviceType==='COMPLAINT_SERVICE' || j.solution) && <span style={{gridColumn:'1/-1',color:'#166534',fontWeight:600}}>🛠️ Solution: {j.solution || 'Service completed'}</span>}{j.jobCard && <span style={{gridColumn:'1/-1',padding:'8px 10px',background:'#eff6ff',borderRadius:8,color:'#1d4ed8'}}><b>📄 Job Card {j.jobCard.jobCardNumber||''}</b> · Technician: {j.jobCard.jobCardData?.technicianName||'—'} · Odometer: {j.jobProof?.odometerReading??'—'} km · Final notes: {j.job?.completionNotes||j.jobCard.jobCardData?.notes||'—'}</span>}
                            {j.trackingStatus&&<span style={{gridColumn:'1/-1'}}>📍 Status: {j.trackingStatus}</span>}
                          </div>
                          {(j.pauseHistory||[]).length>0&&<div style={{marginTop:9,padding:9,borderRadius:8,background:'#fffbeb',border:'1px solid #fde68a'}}><div style={{fontWeight:700,color:'#92400e',marginBottom:5}}>⏸ Pause Report</div>{j.pauseHistory.map((pa,pi)=><div key={pi} style={{fontSize:11,color:'#78350f',display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginTop:4}}><span>Paused: {fmtDt(pa.pausedAt)}</span><span>Resumed: {pa.resumedAt?fmtDt(pa.resumedAt):'Still paused'}</span><span style={{gridColumn:'1/-1'}}>Reason: {pa.reason||'Not specified'} · Duration: {pa.durationSeconds!=null?fmtElapsed(pa.durationSeconds):'—'}</span></div>)}</div>}
                          </div>
                      ))}
                    </div>

                    {/* Previous Rentals / Handover dates */}
                    <div style={{fontWeight:700,fontSize:14,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                      <Car size={16}/> Rental &amp; Handover History ({(vHistory?.rentals||[]).length})
                    </div>
                    {(vHistory?.rentals||[]).length===0&&<div style={{fontSize:13,color:'#94a3b8',padding:'10px 0'}}>No rental history found for this vehicle.</div>}
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {(vHistory?.rentals||[]).map((r,i)=>(
                        <div key={r._id||i} style={{border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 14px',fontSize:12,background:'#f8fafc'}}>
                          <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:6}}>
                            <div style={{fontWeight:700}}>Rental #{i+1} · {r.durationDays||0} day(s)</div>
                            <span style={{padding:'2px 9px',borderRadius:99,fontSize:11,fontWeight:700,background:r.status==='COMPLETED'?'#dcfce7':'#dbeafe',color:r.status==='COMPLETED'?'#166534':'#1d4ed8'}}>{r.status}</span>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'4px 10px',color:'#475569'}}>
                            <span>📅 Start: {fmt(r.startDate)}</span>
                            <span>📅 End: {fmt(r.endDate)}</span>
                            <span>🚗 Handover: {fmt(r.handoverDate)||'Not handed over'}</span>
                            <span>↩ Returned: {fmt(r.returnDate)||'Not returned'}</span>
                            <span>💳 {r.paymentStatus}</span>
                            <span>₹{Number(r.totalAmount||0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── JOB CARD TAB ── */}
            {false && modalTab==='jobcard'&&(
              <div>
                {/* Create New Job Card */}
                {!['SOLVED','CLOSED'].includes(selected.status)&&(
                  <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:12,padding:16,marginBottom:20}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#5b21b6',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
                      <Plus size={16}/> Create Job Card
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      <div>
                        <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Work Description</label>
                        <textarea rows={3} value={jcDescription} onChange={e=>setJcDescription(e.target.value)}
                          placeholder="Describe the work to be done…"
                          style={{width:'100%',padding:'8px 10px',border:'1.5px solid #ddd6fe',borderRadius:8,fontSize:13,resize:'vertical',boxSizing:'border-box'}}
                        />
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Assign to Staff</label>
                          <select value={jcStaffId} onChange={e=>setJcStaffId(e.target.value)}
                            style={{width:'100%',padding:'8px 10px',border:'1.5px solid #ddd6fe',borderRadius:8,fontSize:13}}>
                            <option value="">Select staff member</option>
                            {(staffList||[]).map(s=><option key={s._id} value={s._id}>{s.name} · {s.role}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Priority</label>
                          <select value={jcPriority} onChange={e=>setJcPriority(e.target.value)}
                            style={{width:'100%',padding:'8px 10px',border:'1.5px solid #ddd6fe',borderRadius:8,fontSize:13}}>
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={createJobCard} disabled={jcBusy||!jcDescription.trim()} style={{
                        background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',
                        cursor:'pointer',fontWeight:700,fontSize:13,alignSelf:'flex-start',
                        opacity:jcBusy||!jcDescription.trim()?0.6:1,
                      }}>{jcBusy?'Creating…':'🪪 Create &amp; Assign Job Card'}</button>
                    </div>
                  </div>
                )}

                {/* Existing Job Cards for this complaint */}
                {(() => {
                  const thisCards = allJobCards.filter(j => j.complaintId === selected._id);
                  if (!thisCards.length) return (
                    <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:13}}>
                      No job cards created for this complaint yet.
                    </div>
                  );
                  return (
                    <div>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'#374151'}}>Job Cards for this Complaint ({thisCards.length})</div>
                      <div style={{display:'flex',gap:8,marginBottom:12}}>
                        {[['pending','⏳ Pending'],['completed','✅ Completed']].map(([key,label])=>(
                          <button key={key} onClick={()=>setJcTab(key)} style={{
                            padding:'5px 14px',borderRadius:99,border:'1.5px solid',cursor:'pointer',fontWeight:600,fontSize:12,
                            borderColor:jcTab===key?'#7c3aed':'#e2e8f0',background:jcTab===key?'#7c3aed':'#fff',color:jcTab===key?'#fff':'#374151',
                          }}>{label}</button>
                        ))}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {thisCards.filter(j=>jcTab==='pending'?j.status!=='COMPLETED':j.status==='COMPLETED').map(jc=>{
                          const mBadgeBg = jc.status==='COMPLETED'?'#dcfce7':jc.status==='PAUSED'?'#fef3c7':'#f3e8ff';
                          const mBadgeColor = jc.status==='COMPLETED'?'#166534':jc.status==='PAUSED'?'#92400e':'#7c3aed';
                          const mStatusLabel = jc.status==='COMPLETED'?'✅ Completed':jc.status==='PAUSED'?'⏸ Paused':jc.status==='IN_PROGRESS'?'▶ In Progress':'⏳ Pending';
                          return (
                          <div key={jc.id} style={{border:'1px solid #e2e8f0',borderRadius:10,overflow:'hidden',background:jc.status==='COMPLETED'?'#f0fdf4':jc.status==='PAUSED'?'#fffbeb':'#fff'}}>
                            <div style={{padding:'12px 14px'}}>
                              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                                <span style={{fontWeight:700,fontSize:13}}>👷 {jc.staffName||'Unassigned'}</span>
                                <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:99,background:mBadgeBg,color:mBadgeColor}}>{mStatusLabel}</span>
                              </div>
                              <div style={{fontSize:12,color:'#374151',marginBottom:6}}>{jc.description}</div>
                              <div style={{display:'flex',gap:12,fontSize:11,color:'#64748b',flexWrap:'wrap'}}>
                                <span>⚡ {jc.priority}</span>
                                {jc.startedAt&&<span>▶ {fmtDt(jc.startedAt)}</span>}
                                {jc.completedAt&&<span>✓ {fmtDt(jc.completedAt)}</span>}
                                {jc.elapsedSeconds>0&&<span>⏱ {Math.floor(jc.elapsedSeconds/3600)}h {Math.floor((jc.elapsedSeconds%3600)/60)}m</span>}
                              </div>
                            </div>
                            {jc.pauseReason&&jc.status==='PAUSED'&&(
                              <div style={{padding:'7px 14px',background:'#fef3c7',borderTop:'1px solid #fde68a',fontSize:12,color:'#92400e'}}>
                                ⏸ <b>Pause Reason:</b> {jc.pauseReason}
                              </div>
                            )}
                            {jc.remarks&&(
                              <div style={{padding:'7px 14px',background:'#f0fdf4',borderTop:'1px solid #bbf7d0',fontSize:12,color:'#166534'}}>
                                📝 {jc.remarks}
                              </div>
                            )}
                          </div>
                          );
                        })}
                        {thisCards.filter(j=>jcTab==='pending'?j.status!=='COMPLETED':j.status==='COMPLETED').length===0&&(
                          <div style={{textAlign:'center',padding:16,color:'#94a3b8',fontSize:13}}>No {jcTab} job cards.</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button className="btn-ghost" onClick={()=>setSelected(null)}>Close</button>
          </div>
        </div>
      </div>
    )}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// FRAN CHARGE HUBS — Network hub map (read-only, mirrors Command Center)
// ══════════════════════════════════════════════════════════════════

const FRAN_HUB_STATUS_COLOR = { ONLINE: '#16a34a', OFFLINE: '#dc2626', MAINTENANCE: '#d97706' };

const FRAN_CITY_COORDS = {
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

function franGetCoords(hub) {
  if (hub.lat && hub.lng) return [hub.lat, hub.lng];
  const key = (hub.city || '').toLowerCase().trim();
  return FRAN_CITY_COORDS[key] || null;
}

async function franGeocodeHub(hub) {
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

function FranHubMap({ hubs, selectedHub, onSelectHub }) {
  const mapRef = React.useRef(null);
  const leafRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const hubsRef = React.useRef(hubs);
  const drawTokenRef = React.useRef(0);
  hubsRef.current = hubs || [];

  React.useEffect(() => {
    if (leafRef.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true, preferCanvas: true })
      .setView([20.5937, 78.9629], 5);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      updateWhenIdle: true,
      keepBuffer: 2,
    }).addTo(map);
    map.getPane('markerPane').style.zIndex = 650;
    delete window.L.Icon.Default.prototype._getIconUrl;
    window.L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' });
    leafRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
  }, []);

  React.useEffect(() => {
    const map = leafRef.current;
    if (!map) return;
    const token = ++drawTokenRef.current;
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch (_) {} });
    markersRef.current = [];
    const list = Array.isArray(hubs) ? hubs : [];
    const seenCoords = new Set();
    const coordsList = list.map(h => ({ hub: h, coords: franGetCoords(h) })).filter(x => {
      if (!x.coords) return false;
      const key = `${Number(x.coords[0]).toFixed(6)},${Number(x.coords[1]).toFixed(6)}`;
      if (seenCoords.has(key)) return false;
      seenCoords.add(key);
      return true;
    });
    if (!coordsList.length) return;
    const bounds = coordsList.map(x => x.coords);
    if (bounds.length === 1) map.setView(bounds[0], 15, { animate: false });
    else map.fitBounds(LatLngBounds(bounds), { padding: [35, 35], maxZoom: 13, animate: false });
    map.invalidateSize();

    let i = 0;
    const drawBatch = () => {
      if (token !== drawTokenRef.current) return;
      const end = Math.min(i + 50, coordsList.length);
      for (; i < end; i++) placeFranMarker(map, coordsList[i].hub, coordsList[i].coords, i + 1);
      if (i < coordsList.length) requestAnimationFrame(drawBatch);
    };
    requestAnimationFrame(drawBatch);
  }, [hubs]);

  function LatLngBounds(coords) { return window.L.latLngBounds(coords); }

  function placeFranMarker(map, hub, coords, number) {
    const color = FRAN_HUB_STATUS_COLOR[hub.status] || '#2563eb';
    const icon = window.L.divIcon({
      className: '',
      html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:2px solid ${color};box-shadow:0 2px 9px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;font-size:19px;line-height:1;">⚡</div>`,
      iconSize: [34,34], iconAnchor: [17,17], popupAnchor: [0,-17]
    });
    const marker = window.L.marker(coords, { icon, pane: 'markerPane' }).addTo(map);
    const detail = [
      `<strong>${String(hub.name || hub.hubName || `Location ${number}`)}</strong>`,
      hub.city ? `City: ${String(hub.city)}` : '',
      hub.area || hub.locality ? `Area: ${String(hub.area || hub.locality)}` : '',
      hub.address || hub.fullAddress ? `Address: ${String(hub.address || hub.fullAddress)}` : '',
      hub.status ? `Status: ${String(hub.status)}` : '',
      (hub.swaps !== undefined && hub.swaps !== null && hub.swaps !== '') ? `Swaps: ${String(hub.swaps)}` : ''
    ].filter(Boolean).join('<br/>');
    marker.bindPopup(detail, { closeButton: true, autoPan: false, maxWidth: 320 });
    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => marker.closePopup());
    marker.on('click', (e) => {
      if (e && e.originalEvent) e.originalEvent.stopPropagation();
      marker.openPopup();
      onSelectHub(hub);
    });
    markersRef.current.push(marker);
  }

  return <div className="hub-map-container" style={{ position: 'relative' }}>
    <div ref={mapRef} id="fran-hub-map" style={{ height: 480, borderRadius: 12, overflow: 'hidden' }} />
    <div className="map-legend" style={{pointerEvents:'none'}}>
      {Object.entries(FRAN_HUB_STATUS_COLOR).map(([s, c]) => <div key={s} className="legend-item"><div className="legend-dot" style={{ background: c }} /><span style={{ fontSize: 11, color: '#374151' }}>{s}</span></div>)}
    </div>
  </div>;
}


const __HUB_NUMBER_STYLE = (() => { if (typeof document !== 'undefined' && !document.getElementById('hub-number-style')) { const st=document.createElement('style'); st.id='hub-number-style'; st.textContent='.hub-map-number{background:transparent!important;border:0!important;box-shadow:none!important;color:#fff!important;font-weight:900!important;font-size:10px!important;line-height:1!important;text-align:center!important;text-shadow:0 1px 2px rgba(0,0,0,.45)!important;padding:0!important;}'; document.head.appendChild(st); } return null; })();

function FranChargeHubs({ call }) {
  const { data: hubs, loading, error, refresh } = useFetch(call, '/hubs');
  const [selectedHub,  setSelectedHub]  = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter,   setCityFilter]   = useState('ALL');
  const [areaFilter,   setAreaFilter]   = useState('ALL');
  const [hubSearch,    setHubSearch]    = useState('');
  const [viewMode,     setViewMode]     = useState('map');

  // All hooks must run on every render, including loading/error renders.
  useEffect(() => {
    const timer = setInterval(() => refresh(), 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  const hubList    = hubs || [];
  const cityOptions = [...new Set(hubList.map(h => String(h.city || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const areaOptions = [...new Set(hubList
    .filter(h => cityFilter === 'ALL' || String(h.city || '').trim() === cityFilter)
    .map(h => String(h.area || h.region || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const filtered   = hubList.filter(h =>
    (statusFilter === 'ALL' || h.status === statusFilter) &&
    (cityFilter === 'ALL' || String(h.city || '').trim() === cityFilter) &&
    (areaFilter === 'ALL' || String(h.area || h.region || '').trim() === areaFilter) &&
    (!hubSearch || [h.name,h.code,h.city,h.area,h.region,h.address,h.siteType,h.sourceId].join(' ').toLowerCase().includes(hubSearch.trim().toLowerCase()))
  );
  const onlineCount  = hubList.filter(h => h.status === 'ONLINE').length;
  const offlineCount = hubList.filter(h => h.status === 'OFFLINE').length;
  const maintCount   = hubList.filter(h => h.status === 'MAINTENANCE').length;
  const totalChargers = hubList.reduce((s, h) => s + (h.chargerCount || 0), 0);

  // Keep the selected area valid when the selected city changes. This hook is
  // intentionally before the loading/error returns so hook order never changes.
  useEffect(() => {
    if (areaFilter !== 'ALL' && !areaOptions.includes(areaFilter)) setAreaFilter('ALL');
  }, [cityFilter, areaFilter, areaOptions]);

  if (loading && !hubs) return <Loader />;
  if (error   && !hubs) return <Err msg={error} />;

  const STATUS_CFG = {
    ONLINE:      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', label: 'Online'      },
    OFFLINE:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Offline'     },
    MAINTENANCE: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Maintenance' },
  };

  return (
    <>
      <PageHeader
        title="Charge Hubs"
        sub={`${hubList.length} hubs across the allEV network · ${totalChargers} total charger slots`}
      />

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        {[
          { label: 'Total Hubs',   value: hubList.length,  color: '#2563eb' },
          { label: 'Online',       value: onlineCount,      color: '#16a34a' },
          { label: 'Offline',      value: offlineCount,     color: '#dc2626' },
          { label: 'Maintenance',  value: maintCount,       color: '#d97706' },
          { label: 'Charger Slots',value: totalChargers,    color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '10px 18px', flex: '1 1 120px', minWidth: 100,
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Location controls + status + view toggle ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:10 }}>
        <div style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 220px'}}>
          <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>📍 Location</span>
          <select value={cityFilter} onChange={e => { setCityFilter(e.target.value); setAreaFilter('ALL'); }} style={{flex:1,minWidth:130,padding:'7px 9px',border:'1px solid #dfe3eb',borderRadius:7,fontSize:12}}>
            <option value="ALL">All Cities</option>
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 260px'}}>
          <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>Area</span>
          <select value={areaFilter} onChange={e => { setAreaFilter(e.target.value); if(e.target.value !== 'ALL') setViewMode('map'); }} style={{flex:1,minWidth:160,padding:'7px 9px',border:'1px solid #dfe3eb',borderRadius:7,fontSize:12}}>
            <option value="ALL">All Areas / Regions</option>
            {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <input value={hubSearch} onChange={e=>setHubSearch(e.target.value)} placeholder="Search hub, area, address…" style={{flex:'1 1 220px',minWidth:180,padding:'7px 9px',border:'1px solid #dfe3eb',borderRadius:7,fontSize:12}} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL',         label: `All (${hubList.length})`,   color: '#2563eb' },
            { id: 'ONLINE',      label: `Online (${onlineCount})`,   color: '#16a34a' },
            { id: 'OFFLINE',     label: `Offline (${offlineCount})`, color: '#dc2626' },
            { id: 'MAINTENANCE', label: `Maintenance (${maintCount})`, color: '#d97706' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: statusFilter === f.id ? `2px solid ${f.color}` : '2px solid #e5e7eb',
                background: statusFilter === f.id ? f.color : '#fff',
                color: statusFilter === f.id ? '#fff' : '#374151',
                transition: 'all .15s',
              }}
            >{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2, marginLeft: 'auto' }}>
          {[
            { id: 'map',   icon: '🗺',  label: 'Map'   },
            { id: 'table', icon: '📋', label: 'Table' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewMode === v.id ? '#fff' : 'transparent',
                color: viewMode === v.id ? '#2563eb' : '#6b7280',
                boxShadow: viewMode === v.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                transition: 'all .15s',
              }}
            >{v.icon} {v.label}</button>
          ))}
        </div>
      </div>

      {/* ── Map View ── */}
      {viewMode === 'map' && (
        <Card title="Hub Network Map" badge={`${filtered.length} hubs${areaFilter !== 'ALL' ? ` · ${areaFilter}` : ''}`}>
          {areaFilter !== 'ALL' && <div style={{marginBottom:10,padding:'8px 10px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,fontSize:12,color:'#1d4ed8',fontWeight:600}}>📍 Showing all hubs in <strong>{areaFilter}</strong>{cityFilter !== 'ALL' ? ` · ${cityFilter}` : ''}. The map is filtered to this location.</div>}
          <FranHubMap
            hubs={filtered}
            selectedHub={selectedHub}
            onSelectHub={h => setSelectedHub(s => s?._id === h._id ? null : h)}
          />
          {selectedHub && (() => {
            const sc = STATUS_CFG[selectedHub.status] || STATUS_CFG.OFFLINE;
            const coords = franGetCoords(selectedHub);
            const mapsUrl = coords
              ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedHub.address ? selectedHub.address + ', ' : '') + (selectedHub.city || ''))}`;
            return (
              <div style={{
                marginTop: 16, background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 16,
                flexWrap: 'wrap', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1f2e' }}>{selectedHub.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    📍 {selectedHub.city}{selectedHub.address ? ` · ${selectedHub.address}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                    ● {sc.label}
                  </span>
                  <span style={{ fontSize: 13, color: '#374151' }}>⚡ {selectedHub.chargerCount ?? 0} chargers</span>
                  {selectedHub.code && <span style={{ fontSize: 12, color: '#6b7280' }}>🔖 {selectedHub.code}</span>}
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                     style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} /> Open Maps
                  </a>
                  <button onClick={() => setSelectedHub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>✕</button>
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <Card title="Hub List" badge={`${filtered.length} hubs`}>
          <div style={{fontSize:12,color:'#6b7280',marginBottom:10}}>Location filter: <strong>{cityFilter === 'ALL' ? 'All cities' : cityFilter}</strong> · Area: <strong>{areaFilter === 'ALL' ? 'All areas' : areaFilter}</strong></div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <MapPin size={36} style={{ opacity: .2 }} />
              <p>No hubs found for this filter.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Hub Name</th><th>Hub Code</th><th>City</th><th>Area / Region</th><th>Full Address</th><th>Latitude</th><th>Longitude</th><th>Chargers</th><th>Status</th><th>Franchisee</th><th>Updated</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(h => {
                    const sc = STATUS_CFG[h.status] || STATUS_CFG.OFFLINE;
                    const coords  = franGetCoords(h);
                    const mapsUrl = coords
                      ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((h.address ? h.address + ', ' : '') + (h.city || ''))}`;
                    return (
                      <tr key={h._id}>
                        <td style={{ fontWeight: 700, whiteSpace:'nowrap' }}>{h.name || '—'}</td>
                        <td style={{fontFamily:'monospace',fontSize:11}}>{h.code || '—'}</td>
                        <td>{h.city || '—'}</td>
                        <td>{h.area || h.region || '—'}</td>
                        <td style={{minWidth:200}}>{h.address || '—'}</td>
                        <td style={{fontFamily:'monospace',fontSize:11}}>{coords ? Number(coords[0]).toFixed(6) : '—'}</td>
                        <td style={{fontFamily:'monospace',fontSize:11}}>{coords ? Number(coords[1]).toFixed(6) : '—'}</td>
                        <td style={{fontWeight:700}}>⚡ {h.chargerCount ?? 0}</td>
                        <td>
                          <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ● {sc.label}
                          </span>
                        </td>
                        <td>{h.franchiseeId?.name || '—'}</td>
                        <td style={{whiteSpace:'nowrap',fontSize:11}}>{h.updatedAt ? new Date(h.updatedAt).toLocaleDateString('en-IN') : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                               style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={12} /> Maps
                            </a>
                            <button onClick={() => { setSelectedHub(h); setViewMode('map'); }}
                              style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              📍 Map
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}


function money(v){ return `₹${Number(v||0).toLocaleString('en-IN')}`; }
function dateOnly(v){ return v ? new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'; }
function vehicleLabel(v){ const direct=[v?.make,v?.model].filter(Boolean).join(' '); const snap=[v?.vehicleSnapshot?.make,v?.vehicleSnapshot?.model].filter(Boolean).join(' '); return direct || snap || 'Vehicle'; }


function FranchiseeProfile({ call, user, setPage }) {
  const [profile, setProfile] = useState(() => {
    const saved = store.get('ev_franchisee_profile');
    const address = user?.address || {};
    return saved || {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      role: user?.role || 'FRANCHISEE',
      franchiseName: user?.franchiseName || user?.companyName || '',
      address: address?.fullAddress || address?.address || user?.fullAddress || '',
      city: address?.city || user?.city || '',
      state: address?.state || user?.state || '',
      pincode: address?.pincode || user?.pincode || '',
      aadhaar: '',
      pan: '',
      profilePic: null,
      settings: {
        notifications: true,
        darkMode: false,
        language: 'en',
        fontSize: 'medium'
      }
    };
  });
  const [activeTab, setActiveTab] = useState('personal');
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const fileRef = React.useRef(null);

  const persist = (next) => {
    setProfile(next);
    store.set('ev_franchisee_profile', next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const upd = (key, value) => setProfile(p => ({ ...p, [key]: value }));
  const updSetting = (key, value) => {
    setProfile(p => {
      const next = { ...p, settings: { ...p.settings, [key]: value } };
      store.set('ev_franchisee_profile', next);
      return next;
    });
  };

  const saveProfile = () => {
    store.set('ev_franchisee_profile', profile);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const changePhoto = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => persist({ ...profile, profilePic: ev.target.result });
    reader.readAsDataURL(file);
  };

  const changePassword = async e => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    if (!password.currentPassword || !password.newPassword) {
      setPasswordError('Enter your current and new password.');
      return;
    }
    if (password.newPassword.length < 6) {
      setPasswordError('New password must contain at least 6 characters.');
      return;
    }
    if (password.newPassword !== password.confirm) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      await call('/auth/change-password', {
        method: 'post',
        data: {
          currentPassword: password.currentPassword,
          newPassword: password.newPassword
        }
      });
      setPassword({ currentPassword:'', newPassword:'', confirm:'' });
      setPasswordMessage('Password changed successfully.');
    } catch (e) {
      setPasswordError(e.response?.data?.message || e.message || 'Could not change password.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const displayName = profile.name || user?.name || 'Franchisee';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase() || 'F';
  const tabs = [
    ['personal', 'Personal', User],
    ['documents', 'Documents', FileText],
    ['address', 'Address', Home],
    ['settings', 'Settings', Settings],
    ['security', 'Security', ShieldCheck],
  ];

  return (
    <div className="fr-profile-page">
      <PageHeader
        title="My Profile"
        sub="Manage your franchisee identity, contact details and account preferences."
        actions={
          <button className="btn-ghost fr-profile-back-desktop" onClick={() => setPage('dashboard')}>
            <ChevronLeft size={15}/> Dashboard
          </button>
        }
      />

      {saved && <div className="fr-profile-save-toast"><Check size={15}/> Profile saved successfully</div>}

      <div className="fr-profile-layout">
        <section className="fr-profile-hero card">
          <div className="fr-profile-hero-main">
            <div className="fr-profile-avatar-wrap">
              {profile.profilePic
                ? <img src={profile.profilePic} alt="Profile" className="fr-profile-avatar-img" />
                : <div className="fr-profile-avatar-default">{initials}</div>}
              <button type="button" className="fr-profile-photo-btn" onClick={() => fileRef.current?.click()} aria-label="Change profile photo">
                <Upload size={14}/>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={changePhoto}/>
            </div>

            <div className="fr-profile-identity">
              <h2>{displayName}</h2>
              <span className="fr-profile-role"><User size={12}/> {String(profile.role || 'FRANCHISEE').replaceAll('_',' ')}</span>
              {profile.franchiseName && <div className="fr-profile-company">{profile.franchiseName}</div>}
              <div className="fr-profile-active"><span/> Active account</div>
            </div>

            <button type="button" className="fr-profile-manage" onClick={() => setActiveTab('personal')}>
              <Settings size={14}/> Manage
            </button>
          </div>

          <div className="fr-profile-contact-strip">
            <div><span>Email</span><strong>{profile.email || 'Not set'}</strong></div>
            <div><span>Phone</span><strong>{profile.phone || 'Not set'}</strong></div>
            <div><span>Location</span><strong>{profile.city || profile.state || 'Not set'}</strong></div>
          </div>
        </section>

        <div className="fr-profile-content">
          <div className="fr-profile-tabs">
            {tabs.map(([id,label,Icon]) => (
              <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
                <span><Icon size={15}/></span>{label}
              </button>
            ))}
          </div>

          {activeTab === 'personal' && (
            <section className="card fr-profile-card">
              <div className="fr-profile-card-head">
                <div>
                  <h3>Personal Information</h3>
                  <p>Your name and primary franchisee contact details.</p>
                </div>
                <span><User size={13}/> Personal</span>
              </div>
              <div className="fr-profile-fields">
                <label>Full Name<input value={profile.name} onChange={e => upd('name', e.target.value)} /></label>
                <label>Email Address<input type="email" value={profile.email} onChange={e => upd('email', e.target.value)} /></label>
                <label>Phone Number<input value={profile.phone} onChange={e => upd('phone', e.target.value)} /></label>
                <label>Franchise / Business Name<input value={profile.franchiseName} onChange={e => upd('franchiseName', e.target.value)} /></label>
                <label>Account Role<input value={String(profile.role || '').replaceAll('_',' ')} readOnly /></label>
              </div>
              <div className="fr-profile-card-footer">
                <span><ShieldCheck size={13}/> Your profile is stored securely for this portal.</span>
                <button className="btn-primary" onClick={saveProfile}><Save size={14}/> Save Changes</button>
              </div>
            </section>
          )}

          {activeTab === 'documents' && (
            <section className="card fr-profile-card">
              <div className="fr-profile-card-head">
                <div>
                  <h3>Identity & Business Documents</h3>
                  <p>Keep important identity information available for your franchise account.</p>
                </div>
                <span><FileText size={13}/> Secure</span>
              </div>
              <div className="fr-profile-fields">
                <label>Aadhaar Number<input value={profile.aadhaar} onChange={e => upd('aadhaar', e.target.value)} placeholder="Enter Aadhaar number" /></label>
                <label>PAN Number<input value={profile.pan} onChange={e => upd('pan', e.target.value.toUpperCase())} placeholder="Enter PAN number" /></label>
              </div>
              <div className="fr-profile-doc-note"><ShieldCheck size={15}/><div><strong>Protected information</strong><span>Only enter documents required for your franchise account.</span></div></div>
              <div className="fr-profile-card-footer">
                <span>Document details are stored with your profile preferences.</span>
                <button className="btn-primary" onClick={saveProfile}><Save size={14}/> Save Documents</button>
              </div>
            </section>
          )}

          {activeTab === 'address' && (
            <section className="card fr-profile-card">
              <div className="fr-profile-card-head">
                <div>
                  <h3>Business / Contact Address</h3>
                  <p>Keep your franchise location and contact address current.</p>
                </div>
                <span><Home size={13}/> Address</span>
              </div>
              <div className="fr-profile-fields fr-profile-address-fields">
                <label className="full">Street / Full Address<textarea rows="3" value={profile.address} onChange={e => upd('address', e.target.value)} /></label>
                <label>City<input value={profile.city} onChange={e => upd('city', e.target.value)} /></label>
                <label>State<input value={profile.state} onChange={e => upd('state', e.target.value)} /></label>
                <label>PIN Code<input value={profile.pincode} onChange={e => upd('pincode', e.target.value)} /></label>
              </div>
              <div className="fr-profile-address-note"><Home size={16}/><div><strong>Address on file</strong><span>Use the address where your franchise operations are managed.</span></div></div>
              <div className="fr-profile-card-footer">
                <span>Update the address whenever your operating location changes.</span>
                <button className="btn-primary" onClick={saveProfile}><Save size={14}/> Save Address</button>
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="card fr-profile-card">
              <div className="fr-profile-card-head">
                <div>
                  <h3>App Settings</h3>
                  <p>Personalize notifications and your portal experience.</p>
                </div>
                <span><Settings size={13}/> Preferences</span>
              </div>
              <div className="fr-settings-list">
                <div className="fr-setting-row">
                  <span className="fr-setting-icon blue"><Bell size={16}/></span>
                  <div><strong>Notifications</strong><small>Receive operational and fleet alerts.</small></div>
                  <button type="button" className={'fr-toggle'+(profile.settings.notifications?' on':'')} onClick={() => updSetting('notifications', !profile.settings.notifications)}><i/></button>
                </div>
                <div className="fr-setting-row">
                  <span className="fr-setting-icon purple"><Moon size={16}/></span>
                  <div><strong>Dark Mode</strong><small>Use a darker interface at night.</small></div>
                  <button type="button" className={'fr-toggle'+(profile.settings.darkMode?' on':'')} onClick={() => updSetting('darkMode', !profile.settings.darkMode)}><i/></button>
                </div>
                <div className="fr-setting-row">
                  <span className="fr-setting-icon green"><Globe2 size={16}/></span>
                  <div><strong>Language</strong><small>Choose your preferred portal language.</small></div>
                  <select value={profile.settings.language} onChange={e => updSetting('language', e.target.value)}>
                    <option value="en">English</option><option value="hi">Hindi</option><option value="te">Telugu</option><option value="ta">Tamil</option><option value="kn">Kannada</option>
                  </select>
                </div>
                <div className="fr-setting-row">
                  <span className="fr-setting-icon orange"><Type size={16}/></span>
                  <div><strong>Font Size</strong><small>Adjust text size for readability.</small></div>
                  <select value={profile.settings.fontSize} onChange={e => updSetting('fontSize', e.target.value)}>
                    <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="card fr-profile-card">
              <div className="fr-profile-card-head">
                <div>
                  <h3>Security & Password</h3>
                  <p>Change the password used to sign in to the Franchisee Portal.</p>
                </div>
                <span><ShieldCheck size={13}/> Security</span>
              </div>

              <div className="fr-security-banner">
                <ShieldCheck size={22}/>
                <div><strong>Keep your account protected</strong><span>Use a unique password that only you know.</span></div>
              </div>

              <form className="fr-password-form" onSubmit={changePassword}>
                <label>Current Password<input type="password" value={password.currentPassword} onChange={e => setPassword({...password,currentPassword:e.target.value})} autoComplete="current-password"/></label>
                <label>New Password<input type="password" value={password.newPassword} onChange={e => setPassword({...password,newPassword:e.target.value})} minLength="6" autoComplete="new-password"/></label>
                <label>Confirm New Password<input type="password" value={password.confirm} onChange={e => setPassword({...password,confirm:e.target.value})} minLength="6" autoComplete="new-password"/></label>
                {passwordError && <div className="fr-password-message error">{passwordError}</div>}
                {passwordMessage && <div className="fr-password-message success"><Check size={14}/> {passwordMessage}</div>}
                <button className="btn-primary" type="submit" disabled={passwordBusy}>
                  <ShieldCheck size={14}/>{passwordBusy ? 'Updating…' : 'Change Password'}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}


function FranchiseDashboardInsights({ call, setPage }) {
  const { data, loading, error, refresh } = useFetch(call, '/franchise/fleet/dashboard-insights');
  const [dueDays, setDueDays] = useState(1);
  const [open, setOpen] = useState(null);

  if (loading) return <div className="fr-dashboard-insights-loading"><Loader /></div>;
  if (error) return <Card title="Dashboard Insights"><Err msg={error} /></Card>;
  if (!data) return null;

  const dueRows = dueDays === 1 ? (data.todayDue || []) : (data.dueIn1To5 || []).filter(r => {
    if (!r.endDate) return false;
    const d = new Date(r.endDate); const now = new Date(); now.setHours(0,0,0,0);
    const end = new Date(now); end.setDate(end.getDate() + dueDays + 1);
    const start = new Date(now); start.setDate(start.getDate() + 1);
    return d >= start && d < end;
  });

  const cards = [
    { key:'todayDue', title:"Today's Due", value:(data.todayDue||[]).length, Icon:Clock, tone:'amber', subtitle:'Rentals due today', rows:data.todayDue||[] },
    { key:'dueRange', title:'Due in 1–5 Days', value:(data.dueIn1To5||[]).length, Icon:CalendarDays, tone:'blue', subtitle:'Upcoming rental dues', rows:dueRows, range:true },
    { key:'overdue', title:'Overdue Rentals', value:(data.overdueRentals||[]).length, Icon:AlertTriangle, tone:'red', subtitle:'Past due and still open', rows:data.overdueRentals||[] },
    { key:'payment', title:'Payment Due', value:(data.paymentDue||[]).length, Icon:Wallet, tone:'violet', subtitle:'Bookings needing payment', rows:data.paymentDue||[] },
    { key:'returns', title:"Today's Returns", value:(data.todayReturns||[]).length, Icon:RotateCcw, tone:'green', subtitle:'Expected returns today', rows:data.todayReturns||[] },
    { key:'availability', title:'Fleet Availability', value:data.fleetAvailability?.available ?? 0, Icon:Truck, tone:'cyan', subtitle:`${data.fleetAvailability?.rented ?? 0} rented · ${data.fleetAvailability?.inactive ?? 0} inactive`, rows:null },
    { key:'maintenance', title:'Maintenance Due', value:(data.maintenanceDue||[]).length, Icon:Wrench, tone:'orange', subtitle:'Due within the next 5 days', rows:data.maintenanceDue||[] },
    { key:'complaints', title:'Complaints', value:(data.complaints||[]).length, Icon:Bell, tone:'rose', subtitle:'Open operational complaints', rows:data.complaints||[] },
    { key:'notifications', title:'Important Notifications', value:(data.importantNotifications||[]).length, Icon:ShieldCheck, tone:'indigo', subtitle:'Unread or marked important', rows:data.importantNotifications||[] },
    { key:'coupons', title:'Coupon Summary', value:data.couponSummary?.active ?? 0, Icon:Tag, tone:'pink', subtitle:`${data.couponSummary?.used ?? 0} uses · ${data.couponSummary?.total ?? 0} total`, rows:null },
    { key:'referrals', title:'Referral Summary', value:data.referralSummary?.successful ?? 0, Icon:Gift, tone:'teal', subtitle:`₹${Number(data.referralSummary?.rewards || 0).toLocaleString('en-IN')} rewards`, rows:null },
  ];

  const titleFor = c => c.key === 'dueRange' ? `Due in 1–${dueDays} Days` : c.title;
  const openCard = c => {
    if (c.key === 'availability') { setPage('inventory'); return; }
    if (c.key === 'complaints') { setPage('complaints'); return; }
    if (c.key === 'notifications') { setPage('notifications'); return; }
    if (c.key === 'coupons') { setPage('coupons'); return; }
    if (c.key === 'maintenance') { setPage('maintenance'); return; }
    setOpen(c);
  };

  const vehicleName = r => [r?.vehicle?.make, r?.vehicle?.model].filter(Boolean).join(' ') || r?.bikeId || 'Vehicle';
  const RentalRows = ({ rows }) => !rows?.length ? <div className="fr-insight-empty">No related records found.</div> : (
    <div className="fr-insight-list">
      {rows.map((r, i) => (
        <div className="fr-insight-row" key={r._id || i}>
          <div className="fr-insight-row-main">
            <strong>{r.customer?.name || r.customerId?.name || vehicleName(r)}</strong>
            <span>{vehicleName(r)}{r.rentalPlan ? ` · ${r.rentalPlan}` : ''}</span>
          </div>
          <div className="fr-insight-row-meta">
            <b>{r.endDate ? dateOnly(r.endDate) : r.paymentStatus || '—'}</b>
            <span>{r.pendingExtension?.amount ? money(r.pendingExtension.amount) : r.totalAmount ? money(r.totalAmount) : r.status || '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <section className="fr-dashboard-insights">
        <div className="fr-dashboard-insights-head">
          <div>
            <div className="fr-dashboard-insights-kicker">OPERATIONS SNAPSHOT</div>
            <h2>Today & Upcoming</h2>
            <p>Click any card to open the related records.</p>
          </div>
          <button type="button" className="btn-ghost" onClick={refresh}><RefreshCw size={14}/> Refresh</button>
        </div>

        <div className="fr-insight-grid">
          {cards.map(c => {
            const Icon = c.Icon;
            return (
              <button type="button" key={c.key} className={`fr-insight-card ${c.key === 'dueRange' ? 'fr-insight-card-range' : ''}`} onClick={() => openCard(c)}>
                <span className={`fr-insight-icon ${c.tone}`}><Icon size={19}/></span>
                <span className="fr-insight-copy">
                  <small>{titleFor(c)}</small>
                  <strong>{c.value}</strong>
                  <em>{c.subtitle}</em>
                </span>
                <ChevronRight size={17} className="fr-insight-arrow"/>
              </button>
            );
          })}
        </div>

        <div className="fr-due-selector">
          <div>
            <strong>Due in 1–5 Days</strong>
            <span>Choose a window to see upcoming rentals.</span>
          </div>
          <div className="fr-due-pills">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" className={dueDays===n ? 'active' : ''} onClick={() => setDueDays(n)}>{n} day{n>1?'s':''}</button>
            ))}
          </div>
          <div className="fr-due-results">
            <b>{dueRows.length}</b> rental{dueRows.length===1?'':'s'} due within {dueDays} day{dueDays>1?'s':''}
          </div>
        </div>
      </section>

      {open && (
        <Drawer
          open
          onClose={() => setOpen(null)}
          title={titleFor(open)}
          subtitle={open.subtitle}
          width={720}
        >
          {open.key === 'availability' ? null : <RentalRows rows={open.rows} />}
        </Drawer>
      )}
    </>
  );
}

function FleetDashboard({call,setPage,user}){
  const {data,loading,error,refresh}=useFetch(call,'/franchise/fleet/overview');
  if(loading)return <Loader/>; if(error)return <Err msg={error}/>;

  const m=data?.metrics||{};
  const alerts=data?.alerts||[];
  const bookings=data?.recentBookings||[];
  const firstName=(user?.name||'Franchisee').split(/\s+/)[0];
  const hour=new Date().getHours();
  const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const today=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  const quickActions=[
    ['inventory','Fleet','Truck'],['rentals','Rentals','Car'],['maintenance','Service','Wrench'],
    ['customers','Customers','Users'],['payments','Payments','Wallet'],['expenses','Expenses','DollarSign'],
    ['documents','Documents','FileText'],['charge-hubs','Charge Hubs','MapPin'],
    ['complaints','Complaints','Bell'],['reports','Reports','TrendingUp'],['notifications','Alerts','AlertTriangle'],
    ['financials','Financials','DollarSign']
  ];
  const iconMap={Truck,Car,Wrench,Users,Wallet,DollarSign,FileText,MapPin,Bell,TrendingUp,AlertTriangle};

  return <>
    {/* Reference-inspired mobile application dashboard */}
    <section className="fr-mobile-dashboard">
      <div className="fr-mobile-appbar">
        <img src={allevLogo} alt="allEV" className="fr-mobile-app-logo" />
        <button type="button" className="fr-mobile-avatar" onClick={()=>setPage('profile')} aria-label="Open profile">
          {(user?.name||'A').slice(0,1).toUpperCase()}
        </button>
      </div>

      <div className="fr-mobile-welcome">
        <div className="fr-mobile-welcome-orb">⚡</div>
        <div className="fr-mobile-welcome-copy">
          <div className="fr-mobile-greeting">{greeting}, {firstName}!</div>
          <div className="fr-mobile-date">{today}</div>
          <div className="fr-mobile-welcome-caption">Here is your fleet at a glance.</div>
        </div>
      </div>

      <div className="fr-mobile-status">
        <div className="fr-mobile-status-left">
          <span className="fr-status-pulse"><span /></span>
          <div>
            <strong>Fleet Operations</strong>
            <small>{m.totalFleet ?? 0} vehicles · {m.availableFleet ?? 0} available</small>
          </div>
        </div>
        <span className="fr-mobile-status-pill">ACTIVE</span>
      </div>

      <div className="fr-mobile-quick-grid">
        {quickActions.map(([page,label,icon])=>{
          const Icon=iconMap[icon];
          return (
            <button key={page} type="button" className="fr-mobile-quick-item" onClick={()=>setPage(page)}>
              <span className={`fr-mobile-quick-icon fr-mobile-q-${page}`}>
                <Icon size={22}/>
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="fr-mobile-section-heading">
        <h1>Dashboard</h1>
        <button type="button" onClick={refresh}><RefreshCw size={16}/></button>
      </div>

      <div className="fr-mobile-accent-line" />

      <FranchiseDashboardInsights call={call} setPage={setPage} />

      <div className="fr-mobile-stat-grid">
        <button type="button" className="fr-mobile-stat-card" onClick={()=>setPage('inventory')}>
          <span className="fr-stat-icon blue"><Truck size={19}/></span>
          <span><small>Total Fleet</small><strong>{m.totalFleet ?? 0}</strong></span>
        </button>
        <button type="button" className="fr-mobile-stat-card" onClick={()=>setPage('inventory')}>
          <span className="fr-stat-icon green"><CheckCircle size={19}/></span>
          <span><small>Available</small><strong>{m.availableFleet ?? 0}</strong></span>
        </button>
        <button type="button" className="fr-mobile-stat-card" onClick={()=>setPage('rentals')}>
          <span className="fr-stat-icon violet"><Car size={19}/></span>
          <span><small>Active Rentals</small><strong>{m.activeRentals ?? 0}</strong></span>
        </button>
        <button type="button" className="fr-mobile-stat-card" onClick={()=>setPage('payments')}>
          <span className="fr-stat-icon amber"><Wallet size={19}/></span>
          <span><small>Revenue</small><strong>{money(m.revenue)}</strong></span>
        </button>
      </div>

      <div className="fr-mobile-live-card">
        <div className="fr-mobile-live-head">
          <div><span className="fr-live-dot" />Live operations</div>
          <button type="button" onClick={()=>setPage('notifications')}>View all <ChevronRight size={14}/></button>
        </div>
        {alerts.length ? alerts.slice(0,3).map((a,i)=>(
          <button type="button" className="fr-mobile-alert-row" key={i} onClick={()=>setPage('notifications')}>
            <span className="fr-alert-icon"><AlertTriangle size={17}/></span>
            <span><strong>{String(a.type||'Fleet alert').replaceAll('_',' ')}</strong><small>{a.message}</small></span>
            <ChevronRight size={15}/>
          </button>
        )) : (
          <div className="fr-mobile-empty">
            <CheckCircle size={20}/>
            <span><strong>All clear</strong><small>No active operational alerts.</small></span>
          </div>
        )}
      </div>

      <div className="fr-mobile-recent">
        <div className="fr-mobile-live-head">
          <div>Recent bookings</div>
          <button type="button" onClick={()=>setPage('rentals')}>See all <ChevronRight size={14}/></button>
        </div>
        {bookings.slice(0,3).map((b,i)=>(
          <div className="fr-mobile-booking-row" key={b?._id||b?.id||i}>
            <span className="fr-booking-avatar"><Car size={17}/></span>
            <span><strong>{b?.rentalPlan||'Booking'}</strong><small>{b?.paymentStatus||b?.status||'Pending'}</small></span>
            <strong>{money(b?.totalAmount)}</strong>
          </div>
        ))}
        {!bookings.length && <div className="fr-mobile-empty"><Clock size={20}/><span><strong>No recent bookings</strong><small>New activity will appear here.</small></span></div>}
      </div>
    </section>

    {/* Existing desktop dashboard remains intact */}
    <section className="fr-desktop-dashboard">
      <PageHeader title="Fleet Operator Dashboard" sub="Live view of your assigned fleet, bookings, customers, payments and operations." actions={<button className="btn-ghost" onClick={refresh}><RefreshCw size={14}/> Refresh</button>}/>
      <FranchiseDashboardInsights call={call} setPage={setPage} />
            <MetricGrid metrics={[
        {label:'Fleet Vehicles',value:m.totalFleet,Icon:Truck,color:'#2563eb'},
        {label:'Available',value:m.availableFleet,Icon:CheckCircle,color:'#16a34a'},
        {label:'Active Rentals',value:m.activeRentals,Icon:Car,color:'#7c3aed'},
        {label:'Awaiting Handover',value:m.pendingHandover,Icon:Clock,color:'#d97706'},
        {label:'Customers',value:m.customers,Icon:Users,color:'#0891b2'},
        {label:'Revenue',value:money(m.revenue),Icon:Wallet,color:'#16a34a'},
        {label:'Expenses',value:money(m.expenses),Icon:DollarSign,color:'#dc2626'},
        {label:'Net Revenue',value:money(m.netRevenue),Icon:TrendingUp,color:'#2563eb'},
      ]}/>
      <div className="two-col-grid">
        <Card title="Operational Alerts" badge={`${alerts.length}`}>
          {!alerts.length?<div className="empty-state"><CheckCircle size={34}/><p>No active alerts.</p></div>:<div style={{display:'grid',gap:8}}>{alerts.map((a,i)=><div key={i} style={{padding:11,border:'1px solid #e5e7eb',borderRadius:9,background:a.severity==='HIGH'?'#fff7ed':'#f8fafc'}}><b>{String(a.type||'').replaceAll('_',' ')}</b><div style={{fontSize:12,color:'#64748b',marginTop:3}}>{a.message}</div></div>)}</div>}
        </Card>
        <Card title="Quick Actions">
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9}}>
            {[['inventory','🚗 Fleet'],['rentals','🚘 Sales & Rentals'],['maintenance','🔧 Maintenance'],['customers','👥 Customers'],['payments','💳 Payments'],['reports','📊 Reports']].map(([p,l])=><button key={p} className="btn-ghost" onClick={()=>setPage(p)} style={{justifyContent:'center'}}>{l}</button>)}
          </div>
        </Card>
      </div>
      <Card title="Recent Customer Bookings" badge={`${bookings.length}`}>
        <DataTable rows={bookings} cols={['rentalPlan','paymentStatus','status','totalAmount','createdAt']} />
      </Card>
    </section>
  </>;
}
function FleetHandover({call}){
 const {data,loading,error,refresh}=useFetch(call,'/franchise/purchases'); const [selected,setSelected]=useState(null); const [form,setForm]=useState({stage:'HANDOVER',odometerKm:'',batterySoc:'',damageNotes:'',customerConfirmed:true,extraCharges:0,notes:''}); const [busy,setBusy]=useState(false); const {toast,show}=useToast();
 if(loading)return <Loader/>; if(error)return <Err msg={error}/>; const rows=data||[];
 const submit=async()=>{if(!selected)return;setBusy(true);try{await call(`/franchise/fleet/rentals/${selected._id}/inspection`,{method:'post',data:form});show(form.stage==='HANDOVER'?'Handover completed.':'Return completed.');setSelected(null);refresh();}catch(e){show(e.response?.data?.message||'Inspection failed','error')}finally{setBusy(false)}};
 return <><Toast toast={toast}/><PageHeader title="Handover & Returns" sub="Complete a controlled vehicle handover or return inspection with customer confirmation."/><Card title="Bookings ready for action"><DataTable rows={rows.filter(r=>r.paymentStatus==='PAID'&&!['COMPLETED','CANCELLED'].includes(r.status))} cols={['rentalPlan','paymentStatus','status','handoverDate','returnDate','totalAmount']} renderActions={r=><button className="btn-primary" onClick={()=>{setSelected(r);setForm({...form,stage:r.handoverDate?'RETURN':'HANDOVER'});}}> {r.handoverDate?'Return Inspection':'Handover Inspection'} </button>}/></Card>
 {selected&&<div className="modal-overlay" onClick={()=>setSelected(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="modal-title">{form.stage==='HANDOVER'?'Vehicle Handover':'Vehicle Return'}</div><div className="modal-subtitle">{selected.customerId?.name||'Customer'} · {selected.vehicleSnapshot?.make} {selected.vehicleSnapshot?.model}</div></div><button className="icon-btn" onClick={()=>setSelected(null)}>✕</button></div><div className="modal-body">
 <Fld label="Stage"><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}><option>HANDOVER</option><option>RETURN</option></select></Fld><Fld label="Odometer (km)"><input type="number" value={form.odometerKm} onChange={e=>setForm({...form,odometerKm:e.target.value})}/></Fld><Fld label="Battery SOC (%)"><input type="number" min="0" max="100" value={form.batterySoc} onChange={e=>setForm({...form,batterySoc:e.target.value})}/></Fld><Fld label="Damage / inspection notes"><textarea value={form.damageNotes} onChange={e=>setForm({...form,damageNotes:e.target.value})}/></Fld>{form.stage==='RETURN'&&<Fld label="Extra charges"><input type="number" value={form.extraCharges} onChange={e=>setForm({...form,extraCharges:e.target.value})}/></Fld>}<Fld label="Customer confirmed"><input type="checkbox" checked={!!form.customerConfirmed} onChange={e=>setForm({...form,customerConfirmed:e.target.checked})}/></Fld><Fld label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Fld><button className="btn-primary" disabled={busy} onClick={submit}>{busy?'Saving…':'Complete Inspection'}</button>
 </div></div></div>}
 </>;
}

function FleetMaintenance({call}){
 const {data,loading,error,refresh}=useFetch(call,'/franchise/fleet/maintenance'); const {data:fv}=useFetch(call,'/franchise/fleet/vehicles');
 useEffect(()=>{const t=setInterval(()=>refresh(),10000);return()=>clearInterval(t)},[refresh]);
 const [vehicleInfo,setVehicleInfo]=useState(null); const [vehicleLoading,setVehicleLoading]=useState(false);
 const [activeTab,setActiveTab]=useState('schedule');
 const [form,setForm]=useState({vehicleId:'',type:'SERVICE',title:'',description:'',priority:'NORMAL',scheduledAt:'',cost:0,vendor:'allevs [somajiguda]',vendorLocation:'allevs [somajiguda], Somajiguda, Hyderabad',notes:'',customerId:'',customerSnapshot:null,customerLocation:'',customerMapsUrl:'',vendorMapsUrl:''});
 const [busy,setBusy]=useState(false); const {toast,show}=useToast();
 const maps=q=>q?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`:'';
 const onVehicle=async id=>{ setForm(f=>({...f,vehicleId:id})); setVehicleInfo(null); if(!id)return; setVehicleLoading(true); try{const d=await call(`/franchise/fleet/vehicles/${id}`); const active=(d?.rentals||[]).find(r=>r.paymentStatus==='PAID'&&['HANDED_OVER','ACTIVE'].includes(r.status)) || (d?.rentals||[]).find(r=>r.paymentStatus==='PAID'&&!r.returnDate); const c=active?.customerId; const addr=[c?.address?.fullAddress,c?.address?.address,c?.address?.area,c?.address?.district,c?.address?.state,c?.address?.pincode,active?.customerLocation?.fullAddress,active?.fullAddress,active?.area,active?.district,active?.state,active?.pincode].filter(Boolean).join(', '); const info={activeRental:active,customer:c,address:addr}; setVehicleInfo(info); setForm(f=>({...f,customerId:c?._id||'',customerSnapshot:c?{name:c.name,email:c.email,phone:c.phone,address:c.address}:null,customerLocation:addr,customerMapsUrl:maps(addr),vendor:'allevs [somajiguda]',vendorLocation:'allevs [somajiguda], Somajiguda, Hyderabad',vendorMapsUrl:maps('allevs [somajiguda], Somajiguda, Hyderabad')})); }catch(e){show(e.response?.data?.message||'Could not load vehicle/customer details','error')}finally{setVehicleLoading(false)} };
 const submit=async e=>{e.preventDefault();if(!form.vehicleId){show('Select a vehicle','error');return;}if(!form.title.trim()){show('Service title is required','error');return;}setBusy(true);try{await call('/franchise/fleet/maintenance',{method:'post',data:form});show('Maintenance scheduled successfully.');setForm({...form,vehicleId:'',title:'',description:'',cost:0,notes:'',customerId:'',customerSnapshot:null,customerLocation:'',customerMapsUrl:'',vendor:'allevs [somajiguda]',vendorLocation:'allevs [somajiguda], Somajiguda, Hyderabad',vendorMapsUrl:maps('allevs [somajiguda], Somajiguda, Hyderabad')});setVehicleInfo(null);refresh();setActiveTab('register')}catch(e){show(e.response?.data?.message||'Maintenance could not be saved.','error')}finally{setBusy(false)}};
 if(loading)return <Loader/>;if(error)return <Err msg={error}/>;const vehicles=fv?.assigned||[];
 return <><Toast toast={toast}/><PageHeader title="Fleet Maintenance"/>
 <div className="maintenance-tabs-shell">
   <div className="maintenance-tabs" role="tablist" aria-label="Fleet Maintenance">
     <button type="button" role="tab" aria-selected={activeTab==='schedule'} className={`maintenance-tab ${activeTab==='schedule'?'active':''}`} onClick={()=>setActiveTab('schedule')}>
       <span className="maintenance-tab-icon">＋</span><span><strong>Schedule Maintenance</strong><small>Create a new service request</small></span>
     </button>
     <button type="button" role="tab" aria-selected={activeTab==='register'} className={`maintenance-tab ${activeTab==='register'?'active':''}`} onClick={()=>setActiveTab('register')}>
       <span className="maintenance-tab-icon">☷</span><span><strong>Maintenance Register</strong><small>{(data||[]).length} service {(data||[]).length===1?'record':'records'}</small></span>
     </button>
   </div>
   <div className="maintenance-tab-panel">
    {activeTab==='schedule' ? <Card title="Schedule Maintenance" action={<span className="card-section-note">Service request</span>}>
      <form className="maintenance-form" onSubmit={submit}>
        <div className="form-section"><div className="form-section-title"><span className="form-section-icon">🚗</span><div><strong>Vehicle & Customer</strong><small>Select a vehicle to load the active customer automatically.</small></div></div>
          <Fld label="Vehicle" required><select required value={form.vehicleId} onChange={e=>onVehicle(e.target.value)}><option value="">Select vehicle</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.bikeId ? `${v.bikeId} · ` : ''}{v.make} {v.model} · {v.registrationNo||'No registration'}</option>)}</select></Fld>
          {vehicleLoading&&<div className="loading-inline"><span className="mini-spinner"/> Loading vehicle and customer details…</div>}
          {vehicleInfo?.customer?<div className="customer-context-card"><div className="context-heading"><span className="context-avatar">👤</span><div><strong>Current Customer</strong><small>Linked from the active paid rental</small></div><span className="context-status">ACTIVE</span></div><div className="context-grid"><div><small>Name</small><strong>{vehicleInfo.customer.name||'—'}</strong></div><div><small>Phone</small><strong>{vehicleInfo.customer.phone||'—'}</strong></div><div><small>Email</small><strong>{vehicleInfo.customer.email||'—'}</strong></div><div className="context-wide"><small>Service / customer location</small><strong>{vehicleInfo.address||'—'}</strong></div></div>{vehicleInfo.address&&<a className="map-link" href={maps(vehicleInfo.address)} target="_blank" rel="noreferrer">📍 Open Customer Location in Google Maps <span>↗</span></a>}</div>:form.vehicleId&&!vehicleLoading?<div className="no-customer-card"><strong>No active customer linked</strong><span>This vehicle can still be registered for internal maintenance.</span></div>:null}
        </div>
        <div className="form-section"><div className="form-section-title"><span className="form-section-icon">🔧</span><div><strong>Service Details</strong><small>Define what needs to be inspected, repaired or serviced.</small></div></div>
          <div className="form-grid-2"><Fld label="Service type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>SERVICE</option><option>REPAIR</option><option>BATTERY</option><option>INSPECTION</option></select></Fld><Fld label="Priority"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{['LOW','NORMAL','HIGH','CRITICAL'].map(x=><option key={x}>{x}</option>)}</select></Fld></div>
          <Fld label="Service title" required><input required value={form.title} placeholder="e.g. General service, brake inspection" onChange={e=>setForm({...form,title:e.target.value})}/></Fld>
          <Fld label="Description"><textarea value={form.description} placeholder="Add service requirements or useful service notes…" onChange={e=>setForm({...form,description:e.target.value})}/></Fld>
          <div className="form-grid-2"><Fld label="Scheduled date & time"><input type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})}/></Fld><Fld label="Estimated cost"><div className="money-input"><span>₹</span><input type="number" min="0" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></div></Fld></div>
        </div>
        <div className="form-section"><div className="form-section-title"><span className="form-section-icon">🏢</span><div><strong>Service Provider</strong><small>Set the vendor and service location.</small></div></div>
          <Fld label="Vendor"><input value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/></Fld>
          <div className="vendor-location-card"><div><small>Service location</small><strong>{form.vendorLocation}</strong></div><a className="map-link" href={form.vendorMapsUrl||maps(form.vendorLocation)} target="_blank" rel="noreferrer">📍 Open in Google Maps <span>↗</span></a></div>
          <Fld label="Vendor location"><input value={form.vendorLocation} onChange={e=>setForm({...form,vendorLocation:e.target.value,vendorMapsUrl:maps(e.target.value)})}/></Fld>
        </div>
        <div className="form-section"><div className="form-section-title"><span className="form-section-icon">📝</span><div><strong>Internal Notes</strong><small>Add information for the fleet and service teams.</small></div></div><Fld label="Notes"><textarea value={form.notes} placeholder="Add parts, instructions, observations or special notes…" onChange={e=>setForm({...form,notes:e.target.value})}/></Fld></div>
        <div className="form-actions"><div><strong>Ready to register?</strong><small>Saving creates the maintenance record for this vehicle.</small></div><button className="btn-primary" disabled={busy}>{busy?'Saving…':'Schedule & Save Maintenance'}</button></div>
      </form>
    </Card> : <Card title="Maintenance Register" badge={`${(data||[]).length} records`} action={<span className="card-section-note">Live service progress</span>}>
      <div className="maintenance-register-list">{(data||[]).length ? (data||[]).map(m=>{
        const assigned=!!m.commandAssignedTo; const working=['IN_PROGRESS'].includes(m.staffStatus)||m.status==='IN_PROGRESS'; const staffDone=m.staffStatus==='COMPLETED'||!!m.staffCompletedAt; const closed=m.status==='COMPLETED';
        const steps=[['Registered',true],['Staff Assigned',assigned],['Working on it',working||staffDone||closed],['Staff Completed',staffDone||closed],['Final Completed',closed]];
        return <div className="maintenance-register-card" key={m._id}>
          <div className="maintenance-register-top"><div><span className="service-eyebrow">{m.type||'SERVICE'} · {m.priority||'NORMAL'}</span><h3>{m.title||'Maintenance Service'}</h3><p>{m.bikeId||m.vehicleId?.bikeId||'Vehicle'}{m.customerSnapshot?.name?` · ${m.customerSnapshot.name}`:''}</p></div><span className={`maintenance-register-status ${closed?'done':staffDone?'staffdone':working?'working':'scheduled'}`}>{closed?'COMPLETED':staffDone?'STAFF COMPLETED':working?'WORKING':'SCHEDULED'}</span></div>
          <div className="maintenance-progress-track">{steps.map(([label,done],i)=><div key={label} className={done?'done':''}><span>{done?'✓':i+1}</span><small>{label}</small>{i<steps.length-1&&<i/>}</div>)}</div>
          <div className="maintenance-register-meta"><span>📅 {m.scheduledAt?new Date(m.scheduledAt).toLocaleString('en-IN'):'Not scheduled'}</span><span>👤 Staff: {m.commandAssignedTo?.name||'Awaiting assignment'}</span><span>🔧 {m.staffStatus||m.status||'SCHEDULED'}</span></div>
          {m.staffCompletionSummary&&<div className="maintenance-completion-note"><b>Staff completion:</b> {m.staffCompletionSummary}</div>}
        </div>
      }) : <div className="fleet-empty"><Wrench size={40}/><h3>No maintenance records</h3><p>Scheduled services will appear here with live progress.</p></div>}</div>
    </Card>}
   </div>
 </div></>;
}

function FleetViewDocuments({call}){
 const {data,loading,error}=useFetch(call,'/franchise/fleet/documents');
 const [openVehicle,setOpenVehicle]=useState(null);
 const fileUrl=u=>u?(u.startsWith('http')?u:`${API}${u}`):'';
 if(loading)return <Loader/>; if(error)return <Err msg={error}/>;
 const docs=Array.isArray(data)?data:[];
 const groups=Array.from(docs.reduce((map,d)=>{const key=String(d.vehicleId||d.bikeId||d.vehicleSnapshot?.bikeId||'unknown');if(!map.has(key))map.set(key,[]);map.get(key).push(d);return map;},new Map()).entries()).map(([key,items])=>({key,items,vehicle:items[0]?.vehicleSnapshot||{}}));
 return <><PageHeader title="View Documents" sub="Select a bike first, then choose the document type you want to view."/>
 <Card title="Vehicle Documents" badge={`${groups.length} bikes`}>
   {!groups.length?<div className="fleet-empty"><FileText size={40}/><h3>No documents issued yet</h3><p>Command Center documents will appear here after they are issued to your fleet.</p></div>:<div className="fleet-view-doc-list">{groups.map(g=>{const v=g.vehicle;const bikeId=g.items[0]?.bikeId||v.bikeId||'—';const chassis=v.chassisNo||'—';const bikeNo=v.registrationNo||'—';const bikeName=v.make?`${v.make} ${v.model||''}`.trim():v.model||'—';return <div className="fleet-view-doc-card" key={g.key}><div className="fleet-document-vehicle-summary compact"><div><small>Bike ID</small><b>{bikeId}</b></div><div><small>Chassis Number</small><b>{chassis}</b></div><div><small>Bike Number</small><b>{bikeNo}</b></div><div><small>Name of Bike</small><b>{bikeName}</b></div></div><div className="fleet-view-doc-action"><span>{g.items.length} document{g.items.length===1?'':'s'} available</span><button className="btn-primary" onClick={()=>setOpenVehicle({bikeId,chassisNo:chassis,registrationNo:bikeNo,make:v.make,model:v.model,documents:g.items})}><Eye size={14}/> Select & View</button></div></div>})}</div>}
 </Card>
 {openVehicle&&<FleetVehicleDocumentsModal vehicle={openVehicle} onClose={()=>setOpenVehicle(null)}/>}</>;
}

function FleetDocuments({call}){
 const {data,loading,error,refresh}=useFetch(call,'/franchise/fleet/documents'); const {data:fv}=useFetch(call,'/franchise/fleet/vehicles');
 const [form,setForm]=useState({vehicleId:'',type:'INSURANCE',title:'',number:'',issuedAt:'',expiresAt:'',url:'',fileName:'',notes:''}); const [uploading,setUploading]=useState(false); const [saving,setSaving]=useState(false); const [preview,setPreview]=useState(null); const [activeTab,setActiveTab]=useState('upload'); const {toast,show}=useToast();
 const fileUrl=u=>u?(u.startsWith('http')?u:`${API}${u}`):'';
 const uploadDocument=async file=>{if(!file)return;setUploading(true);try{const fd=new FormData();fd.append('files',file);const result=await call('/uploads',{method:'post',data:fd});const uploaded=result?.files?.[0];if(!uploaded)throw new Error('Upload failed');setForm(f=>({...f,url:uploaded.url,fileName:uploaded.name}));show('Document uploaded. Preview is ready.')}catch(e){show(e.response?.data?.message||e.message||'Document upload failed','error')}finally{setUploading(false)}};
 const submit=async e=>{e.preventDefault();if(!form.vehicleId||!form.title||!form.url){show('Vehicle, document title and uploaded document are required','error');return;}setSaving(true);try{await call('/franchise/fleet/documents',{method:'post',data:form});show('Document saved successfully.');setForm({...form,title:'',number:'',issuedAt:'',expiresAt:'',url:'',fileName:'',notes:''});refresh();setActiveTab('register')}catch(e){show(e.response?.data?.message||'Failed','error')}finally{setSaving(false)}};
 if(loading)return <Loader/>;if(error)return <Err msg={error}/>;const vehicles=fv?.assigned||[];
 return <><Toast toast={toast}/><PageHeader title="Vehicle Documents" sub="Keep every vehicle document organized, current and easy to audit."/>
 <div className="premium-section-shell">
  <div className="premium-tabs" role="tablist" aria-label="Vehicle Documents">
   <button type="button" className={`premium-tab ${activeTab==='upload'?'active':''}`} onClick={()=>setActiveTab('upload')}><span className="premium-tab-icon"><Upload size={16}/></span><span><strong>Upload Document</strong><small>Add a new vehicle document</small></span></button>
   <button type="button" className={`premium-tab ${activeTab==='register'?'active':''}`} onClick={()=>setActiveTab('register')}><span className="premium-tab-icon"><FileText size={16}/></span><span><strong>Document Register</strong><small>{(data||[]).length} stored documents</small></span></button>
  </div>
  {activeTab==='upload'?<div className="premium-tab-panel"><Card title="Upload Vehicle Document" action={<span className="card-section-note">Document intake</span>}><form onSubmit={submit} className="premium-form">
   <div className="premium-form-grid-2"><Fld label="Vehicle" required><select required value={form.vehicleId} onChange={e=>setForm({...form,vehicleId:e.target.value})}><option value="">Select vehicle</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.make} {v.model} · {v.registrationNo||'No reg'}</option>)}</select></Fld>
   <Fld label="Document type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{['RC','INSURANCE','PUC','FITNESS','PERMIT','SERVICE','OTHER'].map(x=><option key={x}>{x}</option>)}</select></Fld></div>
   <div className="premium-form-grid-2"><Fld label="Document title" required><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Fld><Fld label="Document number"><input value={form.number} onChange={e=>setForm({...form,number:e.target.value})}/></Fld></div>
   <div className="premium-form-grid-2"><Fld label="Issued"><input type="date" value={form.issuedAt} onChange={e=>setForm({...form,issuedAt:e.target.value})}/></Fld><Fld label="Expires"><input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></Fld></div>
   <Fld label="Upload document" required><div className="premium-upload-box"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e=>uploadDocument(e.target.files?.[0])} disabled={uploading}/><div className="premium-upload-hint"><Upload size={18}/><span><b>{uploading?'Uploading…':'Choose document file'}</b><small>PDF, JPG, PNG, WEBP, DOC or DOCX</small></span></div></div></Fld>
   {form.url&&<div className="premium-uploaded"><div><CheckCircle size={17}/><span><b>{form.fileName||'Document uploaded'}</b><small>Ready to save</small></span></div><button type="button" className="btn-ghost" onClick={()=>setPreview({name:form.fileName,url:fileUrl(form.url)})}>Preview</button></div>}
   <Fld label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Fld>
   <div className="premium-form-actions"><button className="btn-primary" disabled={saving||uploading}><Save size={15}/>{saving?'Saving…':'Save Document'}</button><button type="button" className="btn-ghost" onClick={()=>setForm({vehicleId:'',type:'INSURANCE',title:'',number:'',issuedAt:'',expiresAt:'',url:'',fileName:'',notes:''})}>Clear</button></div>
  </form></Card></div>:<div className="premium-tab-panel"><Card title="Document Register" badge={`${(data||[]).length} documents`} action={<span className="card-section-note">Document history</span>}><div className="premium-register-intro"><div><strong>Vehicle document register</strong><span>Review expiry, status and stored files from one place.</span></div><span className="premium-count-badge">{(data||[]).length} total</span></div><DataTable rows={data||[]} cols={['title','type','number','expiresAt','status']} renderActions={d=><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{d.url&&<button className="btn-ghost btn-sm" onClick={()=>setPreview({name:d.fileName||d.title,url:fileUrl(d.url)})}><FileText size={13}/> View Document</button>}</div>}/></Card></div>}
 </div>
 {preview&&<div className="modal-overlay" onClick={()=>setPreview(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(900px,100%)',height:'90vh'}}><div className="modal-head"><div><div className="modal-title">{preview.name||'Document Preview'}</div><div className="modal-subtitle">Vehicle document</div></div><button className="icon-btn" onClick={()=>setPreview(null)}>✕</button></div><div className="modal-body" style={{height:'calc(100% - 70px)',padding:10}}>{/\.(png|jpe?g|webp)$/i.test(preview.url||'')?<img src={preview.url} alt={preview.name} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',display:'block',margin:'auto'}}/>:<iframe title={preview.name||'Document'} src={preview.url} style={{width:'100%',height:'100%',border:'1px solid #e2e8f0',borderRadius:8}}/>}</div></div></div>}
 </>;
}

function FleetCustomers({call}){
  const [search,setSearch]=useState('');
  const {data,loading,error}=useFetch(call,`/franchise/fleet/customers?search=${encodeURIComponent(search)}`);
  const [selected,setSelected]=useState(null);
  if(loading)return <Loader/>;if(error)return <Err msg={error}/>;
  const rows=data||[]; const docUrl=u=>u?(u.startsWith('http')?u:`${API.replace(/\/api\/?$/,'')}${u}`):'';
  return <><PageHeader title="Customers" sub="Customer profile, KYC details, uploaded documents, bookings and payments connected to this fleet operator."/>
    <Card title="Customer Directory" badge={`${rows.length}`}>
      <div className="fleet-customer-search"><Search size={16}/><input placeholder="Search name, email or phone" value={search} onChange={e=>setSearch(e.target.value)} /></div>
      <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Contact</th><th>Aadhaar</th><th>PAN</th><th>KYC Documents</th><th>Paid</th><th>Action</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r._id}>
        <td><strong>{r.name||'—'}</strong><div style={{fontSize:11,color:'#64748b'}}>{r.email||'—'}</div></td>
        <td>{r.phone||'—'}</td>
        <td>{r.aadharNumber||'Not provided'}</td>
        <td>{r.panNumber||'Not provided'}</td>
        <td><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{[['Aadhaar',r.kyc?.documents?.aadhar?.url],['PAN',r.kyc?.documents?.pan?.url],['Bill',r.kyc?.documents?.currentBill?.url]].map(([label,url])=>url?<a key={label} href={docUrl(url)} target="_blank" rel="noreferrer" className="status-pill" style={{background:'#eff6ff',color:'#1d4ed8',textDecoration:'none'}}>{label}</a>:<span key={label} className="status-pill" style={{background:'#f1f5f9',color:'#64748b'}}>{label} missing</span>)}</div></td>
        <td>{money(r.totalPaid)}</td>
        <td><button className="btn-ghost" onClick={()=>setSelected(r)}>View</button></td>
      </tr>)}</tbody></table></div>
    </Card>
    {selected&&<div className="modal-overlay" onClick={()=>setSelected(null)}><div className="modal-drawer" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="modal-title">{selected.name}</div><div className="modal-subtitle">{selected.email}</div></div><button className="icon-btn" onClick={()=>setSelected(null)}>✕</button></div><div className="modal-body">
      <div className="kv-row"><span>Phone</span><strong>{selected.phone||'—'}</strong></div>
      <div className="kv-row"><span>Aadhaar</span><strong>{selected.aadharNumber||'—'}</strong></div>
      <div className="kv-row"><span>PAN</span><strong>{selected.panNumber||'—'}</strong></div>
      <div className="kv-row"><span>Address</span><strong>{typeof selected.address==='string'?selected.address:[selected.address?.line1,selected.address?.line2,selected.address?.city,selected.address?.district,selected.address?.state,selected.address?.pincode].filter(Boolean).join(', ')||'—'}</strong></div>
      <h3 style={{margin:'16px 0 8px'}}>KYC Documents</h3>
      {[['Aadhaar',selected.kyc?.documents?.aadhar?.url],['PAN',selected.kyc?.documents?.pan?.url],['Current Bill',selected.kyc?.documents?.currentBill?.url]].map(([label,url])=><div key={label} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #e5e7eb'}}><span>{label}</span>{url?<a href={docUrl(url)} target="_blank" rel="noreferrer" className="btn-ghost">Open document</a>:<span>Not uploaded</span>}</div>)}
    </div></div></div>}
  </>;
}
function FleetPayments({call}){
  const {data,loading,error}=useFetch(call,'/franchise/fleet/payments');
  const [selectedPayment,setSelectedPayment]=useState(null);
  if(loading)return <Loader/>;
  if(error)return <Err msg={error}/>;

  const rows=Array.isArray(data?.rows)?data.rows:[];
  const fmt=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
  const moneyOrDash=v=>Number(v||0)>0?money(v):'—';
  const vehicleOf=r=>r?.vehicle||r?.vehicleSnapshot||{};
  const customerOf=r=>r?.customer||r?.customerId||r?.customerSnapshot||{};
  const bikeOf=r=>r?.bikeId||vehicleOf(r).bikeId||r?.vehicleId?.bikeId||'—';
  const addressOf=c=>typeof c?.address==='string'?c.address:[c?.address?.line1,c?.address?.line2,c?.address?.city,c?.address?.state,c?.address?.pincode].filter(Boolean).join(', ')||'—';
  const isExt=r=>r?.paymentType==='EXTENSION'||Number(r?.extensionCount||0)>0||Number(r?.extensionUnits||0)>0||!!r?.extensionDueDate;
  const amountOf=r=>Number(r?.amount||r?.totalAmount||0);
  const paymentTypeLabel=r=>r?.paymentType==='EXTENSION'?'Extension Pay':r?.paymentType==='SALE'||r?.rentalPlan==='SALE'?'Vehicle Sale':'Rental Payment';
  const planLabel=r=>r?.rentalPlan&&r.rentalPlan!=='SALE'?`${String(r.rentalPlan).toUpperCase()} · ${r.planUnits||1}`:'Vehicle Sale';
  const payThrough=r=>r?.paymentThrough||r?.payThrough||r?.paymentMethod||r?.method||(r?.razorpayPaymentId?'Razorpay':'—');

  // Keep the vehicle/rental grouping for context, but render the actual payment
  // ledger as one payment per row so rental payments and extension payments are
  // easy to audit and compare.
  const groups=(()=>{
    const map=new Map();
    rows.forEach((r,idx)=>{
      const c=customerOf(r),v=vehicleOf(r);
      const customerId=c?._id||r.customerId||'';
      const rentalId=r.rentalId||r.bookingId||r.parentRentalId||r.parentBookingId||'';
      const sale=r.paymentType==='SALE'||r.rentalPlan==='SALE';
      const key=rentalId?`rental:${rentalId}`:`${customerId}|${bikeOf(r)}|${v._id||r.vehicleId||''}|${sale?'sale':'rental'}`;
      if(!map.has(key))map.set(key,{key,base:null,extensions:[],rows:[]});
      const g=map.get(key);g.rows.push(r);
      if(isExt(r))g.extensions.push(r);else if(!g.base)g.base=r;
    });
    return Array.from(map.values()).map(g=>{
      const base=g.base||g.rows[0]||{};
      const history=Array.isArray(base.extensionHistory)?[...base.extensionHistory]:[];
      g.extensions.forEach(ex=>{
        const item={
          _syntheticExtension:true,
          extensionNumber:ex.extensionCount||ex.extensionNumber,
          amount:ex.amount||ex.totalAmount||0,
          plan:ex.rentalPlan||base.rentalPlan||'DAILY',
          units:ex.extensionUnits||ex.units||1,
          unitLabel:ex.unitLabel,
          paidAt:ex.paidAt||ex.createdAt,
          previousDueDate:ex.previousDueDate||base.dueDate,
          newDueDate:ex.extensionDueDate||ex.dueDate,
          razorpayPaymentId:ex.razorpayPaymentId,
          sourceRow:ex
        };
        if(!history.some(h=>(h.razorpayPaymentId&&h.razorpayPaymentId===item.razorpayPaymentId)||(h.extensionNumber&&item.extensionNumber&&Number(h.extensionNumber)===Number(item.extensionNumber))))history.push(item);
      });
      g.base=base;g.extensionHistory=history;return g;
    });
  })();

  const baseAmount=g=>amountOf(g?.base);
  const extensionTotal=g=>(g?.extensionHistory||[]).reduce((sum,x)=>sum+Number(x.amount||0),0);
  const totalReceived=g=>baseAmount(g)+extensionTotal(g);
  const isSale=g=>g?.base?.paymentType==='SALE'||g?.base?.rentalPlan==='SALE';

  const ledgerRows=[];
  groups.forEach(g=>{
    if(g.base)ledgerRows.push({key:`${g.key}:base`,group:g,record:g.base,extension:false});
    const extRows=[...g.extensions];
    // Some older records keep extension payments only inside extensionHistory.
    // Surface those as normal ledger rows too, without creating duplicates.
    (g.extensionHistory||[]).forEach((h,i)=>{
      const exists=extRows.some(ex=>(ex.razorpayPaymentId&&h.razorpayPaymentId&&ex.razorpayPaymentId===h.razorpayPaymentId)||(ex.extensionCount&&h.extensionNumber&&Number(ex.extensionCount)===Number(h.extensionNumber)));
      if(!exists)extRows.push({
        _syntheticExtension:true,
        paymentType:'EXTENSION',
        extensionNumber:h.extensionNumber||i+1,
        extensionCount:h.extensionNumber||i+1,
        extensionUnits:h.units||1,
        unitLabel:h.unitLabel,
        rentalPlan:h.plan||g.base?.rentalPlan,
        amount:h.amount||0,
        paidAt:h.paidAt,
        previousDueDate:h.previousDueDate,
        extensionDueDate:h.newDueDate,
        dueDate:h.newDueDate,
        razorpayPaymentId:h.razorpayPaymentId,
        customerId:g.base?.customerId,
        customerSnapshot:g.base?.customerSnapshot,
        vehicleId:g.base?.vehicleId,
        vehicleSnapshot:g.base?.vehicleSnapshot,
        rentalId:g.base?.rentalId
      });
    });
    extRows.forEach((ex,i)=>ledgerRows.push({key:`${g.key}:ext:${ex._id||ex.razorpayPaymentId||i}`,group:g,record:ex,extension:true}));
  });

  const detailGroups=(g,focusRecord)=>{
    const r=focusRecord||g.base||{};
    const base=g.base||r;
    const v=vehicleOf(r).make?vehicleOf(r):vehicleOf(base);
    const c=customerOf(r).name?customerOf(r):customerOf(base);
    const extensionRecord=isExt(r);
    const extNumber=r.extensionCount||r.extensionNumber||g.extensions.findIndex(x=>x===r)+1;
    return {
      customer:[['Name',c.name||'—'],['Email',c.email||'—'],['Phone',c.phone||'—'],['Address',addressOf(c)]],
      payment:[['Status',r.status||r.paymentStatus||base.status||'PAID'],['Payment Type',paymentTypeLabel(r)],['Pay Through',payThrough(r)],['Plan',planLabel(r)],['Amount',moneyOrDash(amountOf(r))],['Total Received For Rental',money(totalReceived(g))],['Currency',r.currency||base.currency||'INR'],['Payment Date',fmt(r.paidAt||r.createdAt)],['Due Date',fmt(r.dueDate||base.dueDate)],['Rental Rate',moneyOrDash(r.rentalRate||base.rentalRate)],['Security Deposit',moneyOrDash(r.securityDeposit||base.securityDeposit)],['Discount Amount',moneyOrDash(r.discountAmount||base.discountAmount)]],
      vehicle:[['Bike ID',bikeOf(r)||bikeOf(base)],['Vehicle',[v.make,v.model].filter(Boolean).join(' ')||'—'],['Registration',v.registrationNo||'—'],['Vehicle ID',r.vehicleId||base.vehicleId||v._id||'—']],
      transaction:[['Razorpay Payment',r.razorpayPaymentId||base.razorpayPaymentId||'—'],['Razorpay Order',r.razorpayOrderId||base.razorpayOrderId||'—'],['Invoice ID',r.invoiceId||base.invoiceId||'—'],['Rental ID',r.rentalId||base.rentalId||'—'],['Payment Record',r._id||'—']],
      extension:extensionRecord?[['Extension Number',`#${extNumber||'—'}`],['Extension Units',`${r.extensionUnits||r.units||1} ${r.unitLabel||'unit'}${Number(r.extensionUnits||r.units||1)!==1?'s':''}`],['Previous Due Date',fmt(r.previousDueDate||base.dueDate)],['New Due Date',fmt(r.extensionDueDate||r.newDueDate||r.dueDate)],['Extension Amount',money(amountOf(r))]]:[]
    };
  };
  const DetailSection=({title,items})=><section className="fr-payment-modal-section"><div className="fr-payment-modal-section-title">{title}</div><div className="fr-payment-modal-grid">{items.map(([k,val])=><div className="fr-payment-modal-field" key={k}><span>{k}</span><strong>{val}</strong></div>)}</div></section>;

  return <>
    <PageHeader title="Customer Payments"/>
    <MetricGrid metrics={[{label:'Payments',value:ledgerRows.length,Icon:ClipboardList,color:'#2563eb'},{label:'Total Received',value:money(data?.summary?.total),Icon:Wallet,color:'#16a34a'},{label:'Sales',value:money(data?.summary?.sales),Icon:Car,color:'#7c3aed'},{label:'Rentals',value:money(data?.summary?.rentals),Icon:Truck,color:'#0891b2'}]}/>

    <Card title="Payment Ledger" badge={`${ledgerRows.length} payments`}>
      <div className="fr-payment-table-wrap">
        <table className="fr-payment-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Payment Type</th>
              <th>Customer Name</th>
              <th>Ph No</th>
              <th>Email</th>
              <th>Pay Through</th>
              <th>Amount</th>
              <th>Rental Plan</th>
              <th>Payment Date</th>
              <th className="fr-payment-table-actions-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.map((item,index)=>{
              const g=item.group;const r=item.record;const c=customerOf(r).name?customerOf(r):customerOf(g.base||r);const extension=item.extension||isExt(r);
              return <tr key={item.key}>
                <td className="fr-payment-sno">{index+1}</td>
                <td><span className={`fr-payment-type-pill ${extension?'extension':r.paymentType==='SALE'||r.rentalPlan==='SALE'?'sale':''}`}>{paymentTypeLabel(r)}</span></td>
                <td><div className="fr-payment-name-cell"><span className="fr-payment-mini-avatar">{(c.name||'C').slice(0,1).toUpperCase()}</span><strong>{c.name||'Customer'}</strong></div></td>
                <td>{c.phone||'—'}</td>
                <td className="fr-payment-email">{c.email||'—'}</td>
                <td><span className="fr-pay-through">{payThrough(r)}</span></td>
                <td><strong className="fr-payment-table-amount">{money(amountOf(r))}</strong></td>
                <td>{planLabel(r)}</td>
                <td>{fmt(r.paidAt||r.createdAt)}</td>
                <td><div className="fr-payment-row-actions"><button className="btn-primary btn-sm" onClick={()=>setSelectedPayment({group:g,record:r,mode:'all'})}><FileText size={13}/> View Complete Details</button>{(extension||g.extensionHistory.length>0)&&<button className="btn-ghost btn-sm" onClick={()=>setSelectedPayment({group:g,record:r,mode:'extension'})}><ChevronRight size={13}/> View Extension Details</button>}</div></td>
              </tr>;
            })}
          </tbody>
        </table>
        {!ledgerRows.length&&<div className="empty-state"><ClipboardList size={36}/><p>No customer payments found.</p></div>}
      </div>
    </Card>

    {selectedPayment&&(()=>{const g=selectedPayment.group;const r=selectedPayment.record||g.base||{};const c=customerOf(r).name?customerOf(r):customerOf(g.base||r);const v=vehicleOf(r).make?vehicleOf(r):vehicleOf(g.base||r);const details=detailGroups(g,r);return <div className="modal-overlay" onClick={()=>setSelectedPayment(null)}><div className="modal-drawer fr-payment-modal" onClick={e=>e.stopPropagation()}><div className="modal-head fr-payment-modal-head"><div className="fr-payment-modal-identity"><div className="fr-payment-modal-avatar">{(c.name||'C').slice(0,1).toUpperCase()}</div><div><span className="fr-payment-kicker">{paymentTypeLabel(r)}</span><div className="modal-title">{c.name||'Customer'}</div><div className="modal-subtitle">{[v.make,v.model].filter(Boolean).join(' ')} · {bikeOf(r)}</div></div></div><button className="icon-btn" onClick={()=>setSelectedPayment(null)} aria-label="Close">✕</button></div><div className="fr-payment-modal-body"><div className="fr-payment-modal-hero"><div><span>Payment Amount</span><strong>{money(amountOf(r))}</strong></div><div className="fr-payment-modal-status">{r.status||r.paymentStatus||'PAID'}</div></div><DetailSection title="Customer Details" items={details.customer}/><DetailSection title="Payment Details" items={details.payment}/><DetailSection title="Vehicle Details" items={details.vehicle}/><DetailSection title="Transaction Details" items={details.transaction}/>{details.extension.length>0&&<DetailSection title="Extension Details" items={details.extension}/>} {selectedPayment.mode==='extension'&&g.extensionHistory.length>0&&<section className="fr-payment-modal-section"><div className="fr-payment-modal-section-title">Extension History</div><div className="fr-extension-modal-list">{g.extensionHistory.slice().reverse().map((ex,i)=><div className="fr-extension-mini" key={`${ex.extensionNumber||i}-${ex.razorpayPaymentId||i}`}><div><b>Extension #{ex.extensionNumber||g.extensionHistory.length-i}</b><span>{String(ex.plan||g.base?.rentalPlan||'DAILY').toUpperCase()} · {Number(ex.units||1)} {ex.unitLabel||'unit'}{Number(ex.units||1)!==1?'s':''}</span></div><strong>{money(ex.amount||0)}</strong><small>{fmt(ex.paidAt)} · Due {fmt(ex.previousDueDate)} → {fmt(ex.newDueDate)}</small></div>)}</div></section>}</div><div className="modal-footer fr-payment-modal-footer"><button className="btn-ghost" onClick={()=>setSelectedPayment(null)}>Close</button></div></div></div>})()}
  </>;
}
function FleetExpenses({call}){
 const {data,loading,error,refresh}=useFetch(call,'/franchise/fleet/expenses'); const [form,setForm]=useState({category:'MAINTENANCE',amount:'',date:'',description:''}); const [activeTab,setActiveTab]=useState('add'); const {toast,show}=useToast();
 if(loading)return <Loader/>;if(error)return <Err msg={error}/>;
 const submit=async e=>{e.preventDefault();try{await call('/franchise/fleet/expenses',{method:'post',data:form});show('Expense recorded successfully.');setForm({...form,amount:'',description:''});refresh();setActiveTab('ledger')}catch(e){show(e.response?.data?.message||'Failed','error')}};
 return <><Toast toast={toast}/><PageHeader title="Fleet Expenses" sub="Track operating costs with a clean, auditable expense register."/>
 <div className="premium-section-shell">
  <div className="premium-tabs" role="tablist" aria-label="Fleet Expenses">
   <button type="button" className={`premium-tab ${activeTab==='add'?'active':''}`} onClick={()=>setActiveTab('add')}><span className="premium-tab-icon"><Plus size={16}/></span><span><strong>Add Expense</strong><small>Record a new fleet cost</small></span></button>
   <button type="button" className={`premium-tab ${activeTab==='ledger'?'active':''}`} onClick={()=>setActiveTab('ledger')}><span className="premium-tab-icon"><DollarSign size={16}/></span><span><strong>Expense Ledger</strong><small>{(data||[]).length} recorded expenses</small></span></button>
  </div>
  {activeTab==='add'?<div className="premium-tab-panel"><Card title="Add Expense" action={<span className="card-section-note">Cost entry</span>}><form onSubmit={submit} className="premium-form">
   <div className="premium-form-grid-2"><Fld label="Category"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['MAINTENANCE','FUEL','CHARGING','INSURANCE','TAX','STAFF','OTHER'].map(x=><option key={x}>{x}</option>)}</select></Fld><Fld label="Amount" required><input required type="number" min="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></Fld></div>
   <div className="premium-form-grid-2"><Fld label="Date"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Fld><div className="premium-field-placeholder"><span>Entry status</span><strong>Ready to record</strong><small>Saved to the fleet ledger after submission.</small></div></div>
   <Fld label="Description"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Add a short expense note..."/></Fld>
   <div className="premium-form-actions"><button className="btn-primary"><Save size={15}/> Record Expense</button><button type="button" className="btn-ghost" onClick={()=>setForm({category:'MAINTENANCE',amount:'',date:'',description:''})}>Clear</button></div>
  </form></Card></div>:<div className="premium-tab-panel"><Card title="Expense Ledger" badge={`${(data||[]).length} records`} action={<span className="card-section-note">Expense history</span>}><div className="premium-register-intro"><div><strong>Fleet expense register</strong><span>Review recorded costs and keep your operating history organized.</span></div><span className="premium-count-badge">{(data||[]).length} total</span></div><DataTable rows={data||[]} cols={['category','amount','date','description']}/></Card></div>}
 </div></>;
}

function FleetReports({call}){const {data,loading,error}=useFetch(call,'/franchise/fleet/reports');if(loading)return <Loader/>;if(error)return <Err msg={error}/>;return <><PageHeader title="Reports & Analytics" sub={`Generated ${dateOnly(data?.generatedAt)}`}/><MetricGrid metrics={[{label:'Revenue',value:money(data?.summary?.revenue),Icon:Wallet,color:'#16a34a'},{label:'Expenses',value:money(data?.summary?.expenses),Icon:DollarSign,color:'#dc2626'},{label:'Maintenance Cost',value:money(data?.summary?.maintenanceCost),Icon:Wrench,color:'#d97706'}]}/><Card title="Monthly Revenue"><DataTable rows={data?.monthlyRevenue||[]} cols={['month','revenue']}/></Card><Card title="Booking Report"><DataTable rows={data?.bookings||[]} cols={['rentalPlan','paymentStatus','status','totalAmount','createdAt']}/></Card></>}
function FleetNotifications({call}){const {data,loading,error,refresh}=useFetch(call,'/franchise/fleet/notifications');if(loading)return <Loader/>;if(error)return <Err msg={error}/>;return <><PageHeader title="Notifications" sub="Booking, payment, maintenance and operational alerts."/><Card title="Notification Center"><div style={{display:'grid',gap:8}}>{(data||[]).map(n=><div key={n._id} style={{padding:12,border:'1px solid #e5e7eb',borderRadius:9,background:n.read?'#fff':'#eff6ff'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><b>{n.title}</b>{!n.read&&<button className="btn-ghost" onClick={async()=>{await call(`/franchise/fleet/notifications/${n._id}/read`,{method:'put'});refresh()}}>Mark read</button>}</div><div style={{fontSize:12,color:'#64748b',marginTop:4}}>{n.message}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:5}}>{dateOnly(n.createdAt)}</div></div>)}{!data?.length&&<div className="empty-state"><Bell size={34}/><p>No notifications.</p></div>}</div></Card></>}


function FleetCoupons({call}){
  const {data:customers}=useFetch(call,'/franchise/fleet/customers');
  const {data,loading,error,refresh}=useFetch(call,'/franchise/coupons');
  const [form,setForm]=useState({code:'',title:'',description:'',discountType:'PERCENT',discountValue:'',maxDiscount:'',minOrderAmount:'',expiresAt:'',sendTo:'ALL',recipientIds:[]});
  const [busy,setBusy]=useState(false);
  const submit=async()=>{if(!form.code||!form.title||!form.discountValue)return alert('Enter code, title and discount.');setBusy(true);try{await call('/franchise/coupons',{method:'post',data:{...form,discountValue:Number(form.discountValue),maxDiscount:form.maxDiscount?Number(form.maxDiscount):undefined,minOrderAmount:form.minOrderAmount?Number(form.minOrderAmount):0}});setForm({code:'',title:'',description:'',discountType:'PERCENT',discountValue:'',maxDiscount:'',minOrderAmount:'',expiresAt:'',sendTo:'ALL',recipientIds:[]});refresh();alert('Coupon created and sent successfully.')}catch(e){alert(e.response?.data?.message||'Could not create coupon')}finally{setBusy(false)}};
  if(loading)return <Loader/>;if(error)return <Err msg={error}/>;
  return <><PageHeader title="Coupons & Offers" sub="Create discount codes and send them to every customer or selected customers."/>
  <div className="fr-coupon-layout"><Card title="Create Coupon">
    <div className="fr-form-grid">
      <Fld label="Coupon Code"><input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="FESTIVE100"/></Fld>
      <Fld label="Title"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Festival Offer"/></Fld>
      <Fld label="Discount Type"><select value={form.discountType} onChange={e=>setForm({...form,discountType:e.target.value})}><option value="PERCENT">Percentage %</option><option value="FLAT">Flat ₹</option></select></Fld>
      <Fld label="Discount Value"><input type="number" min="0" value={form.discountValue} onChange={e=>setForm({...form,discountValue:e.target.value})}/></Fld>
      <Fld label="Maximum Discount (optional)"><input type="number" min="0" value={form.maxDiscount} onChange={e=>setForm({...form,maxDiscount:e.target.value})}/></Fld>
      <Fld label="Minimum Order Amount"><input type="number" min="0" value={form.minOrderAmount} onChange={e=>setForm({...form,minOrderAmount:e.target.value})}/></Fld>
      <Fld label="Expiry"><input type="datetime-local" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></Fld>
      <Fld label="Send To"><select value={form.sendTo} onChange={e=>setForm({...form,sendTo:e.target.value,recipientIds:[]})}><option value="ALL">All linked customers</option><option value="SELECTED">Selected customers</option></select></Fld>
    </div>
    <Fld label="Description"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Offer details shown to customers"/></Fld>
    {form.sendTo==='SELECTED'&&<div className="fr-recipient-list">{(customers||[]).map(c=><label key={c._id}><input type="checkbox" checked={form.recipientIds.includes(c._id)} onChange={e=>setForm({...form,recipientIds:e.target.checked?[...form.recipientIds,c._id]:form.recipientIds.filter(x=>x!==c._id)})}/><span>{c.name} · {c.email}</span></label>)}</div>}
    <button className="btn-primary" disabled={busy} onClick={submit}>{busy?'Creating…':'Create & Send Coupon'}</button>
  </Card>
  <Card title="Created Coupons" badge={`${data?.length||0}`}><DataTable rows={data||[]} cols={['code','title','discountType','discountValue','sendTo','expiresAt','createdAt']}/></Card></div></>;
}

function FleetBroadcasts({call}){
  const {data:customers}=useFetch(call,'/franchise/fleet/customers');
  const [form,setForm]=useState({title:'',message:'',type:'FRANCHISE_BROADCAST',priority:'IMPORTANT',bannerUrl:'',sendTo:'ALL',recipientIds:[]});
  const [busy,setBusy]=useState(false);
  const submit=async()=>{if(!form.title||!form.message)return alert('Enter title and message.');setBusy(true);try{const r=await call('/franchise/broadcast-notification',{method:'post',data:form});alert(`${r?.sent||0} customer(s) notified.`);setForm({...form,title:'',message:'',bannerUrl:'',recipientIds:[]});}catch(e){alert(e.response?.data?.message||'Could not send notification')}finally{setBusy(false)}};
  return <><PageHeader title="Customer Broadcasts" sub="Send important announcements, festival messages, banners and urgent updates as customer pop-ups."/>
  <Card title="Create Customer Pop-up">
    <div className="fr-form-grid">
      <Fld label="Title"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Festival Special"/></Fld>
      <Fld label="Priority"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>IMPORTANT</option><option>URGENT</option><option>INFO</option></select></Fld>
      <Fld label="Send To"><select value={form.sendTo} onChange={e=>setForm({...form,sendTo:e.target.value,recipientIds:[]})}><option value="ALL">All linked customers</option><option value="SELECTED">Selected customers</option></select></Fld>
      <Fld label="Banner Image URL (optional)"><input value={form.bannerUrl} onChange={e=>setForm({...form,bannerUrl:e.target.value})} placeholder="https://..."/></Fld>
    </div>
    <Fld label="Message"><textarea rows="5" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Write the announcement customers should see…"/></Fld>
    {form.sendTo==='SELECTED'&&<div className="fr-recipient-list">{(customers||[]).map(c=><label key={c._id}><input type="checkbox" checked={form.recipientIds.includes(c._id)} onChange={e=>setForm({...form,recipientIds:e.target.checked?[...form.recipientIds,c._id]:form.recipientIds.filter(x=>x!==c._id)})}/><span>{c.name} · {c.email}</span></label>)}</div>}
    <button className="btn-primary" disabled={busy} onClick={submit}><Send size={15}/>{busy?'Sending…':'Send Customer Pop-up'}</button>
  </Card></>;
}


function CompletedVehicleReturns({call}){
  const {data,loading,error}=useFetch(call,'/franchise/purchases');
  if(loading)return <Loader/>;
  if(error)return <Err msg={error}/>;
  const rows=(Array.isArray(data)?data:[]).filter(r=>String(r.status||'').toUpperCase()==='COMPLETED' && r.returnDate);
  const fmt=d=>d?new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  return <><PageHeader title="Completed Vehicle Returns" sub="Completed customer returns and the final physical vehicle readings."/><Card title="Completed Returns" badge={`${rows.length} returns`}>
    {!rows.length?<div className="empty-state"><CheckCircle size={40} style={{opacity:.25}}/><p>No completed vehicle returns yet.</p></div>:<div style={{display:'grid',gap:10}}>{rows.map(r=>{const v=r.vehicleSnapshot||{};const fault=String(r.bookingHistory?.slice?.(-1)?.[0]?.returnDisposition||'COMPLETED').toUpperCase()==='FAULT';return <div key={r._id} style={{border:'1px solid #e2e8f0',borderRadius:12,padding:14,background:'#fff'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{v.make||''} {v.model||'Vehicle'}</strong><div style={{fontSize:12,color:'#64748b',marginTop:4}}>{r.customerId?.name||'Customer'} · {r.bikeId||v.bikeId||'—'}</div></div><span style={{fontSize:11,fontWeight:800,color:fault?'#b91c1c':'#15803d'}}>{fault?'FAULT VEHICLE':'RETURN COMPLETED'}</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8,marginTop:12,fontSize:12,color:'#475569'}}><span><b>Chassis/VIN:</b> {v.chassisNo||v.vin||'—'}</span><span><b>Registration:</b> {v.registrationNo||'—'}</span><span><b>Odometer:</b> {r.bookingHistory?.slice?.(-1)?.[0]?.odometerKm ?? v.odometerKm ?? '—'} km</span><span><b>Battery:</b> {r.bookingHistory?.slice?.(-1)?.[0]?.batterySoc ?? v.batterySoc ?? '—'}%</span><span><b>Returned:</b> {fmt(r.returnDate)}</span></div></div>})}</div>}
  </Card></>;
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
