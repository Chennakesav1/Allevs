import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import allevLogo from '../allevlogo.png';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText,
  Sparkles, Battery, Gauge as GaugeIcon, Image, Plus, Menu, X, MoreHorizontal, ArrowLeft, Camera, Mail, Phone, CreditCard, ShieldCheck, BellRing, LockKeyhole, MapPinned, Pencil, Save, Eye, EyeOff, Check, SlidersHorizontal
} from 'lucide-react';
import './customer.css';

const API = import.meta.env.VITE_API_URL || '/api';

// Portal identity is selected by the single-host path: /customer
const kind = 'customer';
const ALLOWED_ROLES = ['CUSTOMER'];

const PORTAL_CFG = {
  customer:   { title: 'Customer Portal',    accent: 'Customer Operations' , email: 'customer@ev.local'},
  staff:      { title: 'Staff Portal',       accent: 'Service Operations' },
  franchisee: { title: 'Franchisee Portal',  accent: 'Business Intelligence' },
  command:    { title: 'Central Command',    accent: 'Enterprise Control' },
};
const cfg = PORTAL_CFG[kind];

const NAV_ITEMS = {
  customer: [
    { id: 'dashboard',           label: 'Dashboard',          Icon: LayoutDashboard },
    { id: 'available-vehicles',  label: 'Available Vehicles', Icon: Sparkles },
    { id: 'charging-stations',   label: 'Charging Stations',  Icon: MapPin },
    { id: 'vehicles',            label: 'My Vehicles',        Icon: Car },
    { id: 'purchases',            label: 'Purchases',           Icon: ClipboardList },
    { id: 'wallet',              label: 'Wallet',             Icon: Wallet },
    { id: 'invoices',            label: 'Invoices',           Icon: FileText },
    { id: 'complaints',          label: 'Support',            Icon: Bell },
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
    const token = localStorage.getItem('ev_customer_token');
    try {
      const r = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${token}` }, ...opts });
      return r.data;
    } catch (err) {
      if (err.response?.status === 401) {
        const rt = localStorage.getItem('ev_customer_refresh_token');
        if (rt) {
          try {
            const { data } = await axios.post(`${API}/auth/refresh`, { refreshToken: rt });
            localStorage.setItem('ev_customer_token', data.accessToken);
            localStorage.setItem('ev_customer_refresh_token', data.refreshToken);
            const retry = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${data.accessToken}` }, ...opts });
            return retry.data;
          } catch (_) {
            localStorage.removeItem('ev_customer_token');
            localStorage.removeItem('ev_customer_refresh_token');
            window.location.reload();
            return;
          }
        } else {
          localStorage.removeItem('ev_customer_token');
          window.location.reload();
          return;
        }
      }
      throw err;
    }
  };
}

// ── Error Boundary ─────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('EV CORE UI Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:32,textAlign:'center',color:'#b91c1c'}}>
          <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:13,color:'#64748b',marginBottom:16}}>{this.state.error?.message || 'An unexpected error occurred.'}</div>
          <button className="btn-primary" onClick={()=>this.setState({hasError:false,error:null})}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── In-memory cache (TTL = 30 s) ──────────────────────────────────
const _cache = new Map(); // path → { data, ts }
const CACHE_TTL = 30_000; // ms

function cacheGet(path) {
  const entry = _cache.get(path);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(path); return null; }
  return entry.data;
}
function cacheSet(path, data) { _cache.set(path, { data, ts: Date.now() }); }
function cacheClear()         { _cache.clear(); }

// In-flight deduplication: multiple callers for the same path share one fetch
const _inflight = new Map(); // path → Promise

function cachedCall(callFn, path) {
  if (_inflight.has(path)) return _inflight.get(path);
  const p = callFn(path)
    .then(d => { cacheSet(path, d); return d; })
    .finally(() => _inflight.delete(path));
  _inflight.set(path, p);
  return p;
}

// Prefetch all customer endpoints in parallel right after login
const CUSTOMER_PREFETCH_PATHS = [
  '/customer/vehicles',
  '/customer/purchases',
  '/customer/purchases',
  '/customer/wallet',
  '/customer/wallet/transactions',
  '/customer/complaints',
  '/hubs',
  '/customer/profile',
];

function prefetchCustomerData(callFn) {
  CUSTOMER_PREFETCH_PATHS.forEach(path => {
    if (!cacheGet(path)) cachedCall(callFn, path).catch(() => {});
  });
}

// ── useFetch hook — cache-first, background revalidate ─────────────
function useFetch(call, path) {
  const cached = cacheGet(path);
  const [data, setData]       = useState(cached);
  const [loading, setLoading] = useState(!cached); // no spinner when cache hit
  const [error, setError]     = useState(null);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    let alive = true;
    // If we have cached data, show it immediately and revalidate silently
    const hasCache = !!cacheGet(path);
    if (!hasCache) setLoading(true);
    setError(null);

    cachedCall(call, path)
      .then(d  => { if (alive) { setData(d); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message); setLoading(false); } });

    return () => { alive = false; };
  }, [path, tick]);

  const refresh = () => {
    _cache.delete(path); // force a real fetch on next call
    setTick(t => t + 1);
  };
  return { data, loading, error, refresh };
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast toast-${toast.type}`}>{toast.msg}</div>;
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
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('ev_customer_token'));
  const [user,  setUser]  = useState(null);
  const [page,  setPage]  = useState('dashboard');
  // 'login' | 'register' | 'verify-register' | 'verify-login-otp'
  // | 'forgot-password' | 'reset-password' | 'set-password'
  const [authScreen, setAuthScreen] = useState('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const call = api();

  useEffect(() => {
    if (!token) return;
    call('/auth/me')
      .then(u => {
        if (!ALLOWED_ROLES.includes(u.role)) {
          localStorage.removeItem('ev_customer_token');
          localStorage.removeItem('ev_customer_refresh_token');
          setToken(null); setUser(null);
          return;
        }
        setUser(u);
        // Returning session (page reload) — kick off prefetch so first
        // page renders from cache rather than waiting on the network
        prefetchCustomerData(api());
      })
      .catch(() => {
        localStorage.removeItem('ev_customer_token');
        localStorage.removeItem('ev_customer_refresh_token');
        setToken(null);
      });
  }, []);

  const handleAuth = (tok, rt, userData) => {
    localStorage.setItem('ev_customer_token', tok);
    if (rt) localStorage.setItem('ev_customer_refresh_token', rt);
    setToken(tok);
    setUser(userData);
    setAuthScreen('login');
    // Fire all customer API calls in parallel immediately after login
    // so data is in cache before the user clicks anything
    prefetchCustomerData(api());
  };

  const logout = () => {
    localStorage.removeItem('ev_customer_token');
    localStorage.removeItem('ev_customer_refresh_token');
    cacheClear(); // wipe cached data so next user starts fresh
    setToken(null); setUser(null); setPage('dashboard');
  };

  if (!token) {
    return (
      <AuthRouter
        screen={authScreen}
        setScreen={setAuthScreen}
        pendingEmail={pendingEmail}
        setPendingEmail={setPendingEmail}
        pendingPassword={pendingPassword}
        setPendingPassword={setPendingPassword}
        onAuth={handleAuth}
      />
    );
  }
  return <Shell user={user} page={page} setPage={setPage} call={call} logout={logout} />;
}

// ══════════════════════════════════════════════════════════════════
// AUTH ROUTER — selects which auth screen to show
// ══════════════════════════════════════════════════════════════════
function AuthRouter({ screen, setScreen, pendingEmail, setPendingEmail, pendingPassword, setPendingPassword, onAuth }) {
  const common = { setScreen, pendingEmail, setPendingEmail, pendingPassword, setPendingPassword, onAuth };
  if (screen === 'register')           return <RegisterPage {...common} />;
  if (screen === 'verify-register')    return <VerifyRegisterOtpPage {...common} />;
  if (screen === 'verify-login-otp')   return <VerifyLoginOtpPage {...common} />;
  if (screen === 'forgot-password')    return <ForgotPasswordPage {...common} />;
  if (screen === 'reset-password')     return <ResetPasswordPage {...common} />;
  return <LoginPage {...common} />;
}

// ── shared inner-box ───────────────────────────────────────────────
function AuthBox({ title, sub, children }) {
  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <img src={allevLogo} alt="allEV" style={{height:"44px",objectFit:"contain"}} />
        </div>
        <p className="login-sub">{sub || cfg.accent}</p>
        <h2 className="login-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ── error/success banner ───────────────────────────────────────────
function Msg({ type, text }) {
  if (!text) return null;
  return (
    <div className={`auth-msg auth-msg--${type}`}>{text}</div>
  );
}

// ── OTP input row ──────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  return (
    <label className="otp-label">
      OTP Code
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="otp-input"
        placeholder="6-digit OTP"
        autoFocus
      />
    </label>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 1 — LOGIN (password OR switch to OTP)
// ══════════════════════════════════════════════════════════════════
function LoginPage({ setScreen, setPendingEmail, onAuth }) {
  const [email, setEmail]   = useState('');
  const [pass,  setPass]    = useState('');
  const [busy,  setBusy]    = useState(false);
  const [msg,   setMsg]     = useState({ type: '', text: '' });
  const [mode,  setMode]    = useState('password'); // 'password' | 'otp'

  const loginWithPassword = async () => {
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const res = await axios.post(`${API}/auth/customer/login-password`, { email, password: pass });
      onAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Login failed.' });
    } finally { setBusy(false); }
  };

  const sendOtp = async () => {
    if (!email) { setMsg({ type: 'error', text: 'Enter your email first.' }); return; }
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API}/auth/customer/login-otp`, { email });
      setPendingEmail(email);
      setScreen('verify-login-otp');
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Could not send OTP.' });
    } finally { setBusy(false); }
  };

  return (
    <AuthBox title="Welcome back" sub="Customer Portal">
      <div className="auth-tabs">
        <button className={'auth-tab' + (mode === 'password' ? ' active' : '')} onClick={() => setMode('password')}>Password</button>
        <button className={'auth-tab' + (mode === 'otp' ? ' active' : '')} onClick={() => setMode('otp')}>OTP Login</button>
      </div>
      <Msg type={msg.type} text={msg.text} />
      <div className="login-form">
        <label>Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? loginWithPassword() : sendOtp())} />
        </label>
        {mode === 'password' && (
          <label>Password
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loginWithPassword()} />
          </label>
        )}
        {mode === 'password' ? (
          <button className="btn-auth" disabled={busy} onClick={loginWithPassword}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        ) : (
          <button className="btn-auth" disabled={busy} onClick={sendOtp}>
            {busy ? 'Sending OTP…' : 'Send OTP to Email'}
          </button>
        )}
      </div>
      <div className="auth-links">
        <button className="link-btn" onClick={() => setScreen('forgot-password')}>Forgot password?</button>
        <span className="auth-sep">·</span>
        <button className="link-btn" onClick={() => setScreen('register')}>Create account</button>
      </div>
    </AuthBox>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 2 — REGISTER
// ══════════════════════════════════════════════════════════════════
function RegisterPage({ setScreen, setPendingEmail, setPendingPassword }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', pincode: '', state: '', district: '', password: '', password2: '' });
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMsg, setPinMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState({ type: '', text: '' });

  const submit = async () => {
    if (!form.name || !form.email) { setMsg({ type: 'error', text: 'Name and email are required.' }); return; }
    if (!/^\d{6}$/.test(form.pincode) || !form.state || !form.district) { setMsg({ type: 'error', text: 'Enter a valid 6-digit pincode and wait for State/District to auto-fill.' }); return; }
    if (!form.password || form.password.length < 8) { setMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    if (form.password !== form.password2) { setMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API}/auth/customer/register`, { name: form.name, email: form.email, phone: form.phone, pincode: form.pincode, state: form.state, district: form.district });
      setPendingEmail(form.email);
      if (setPendingPassword) setPendingPassword(form.password);
      setScreen('verify-register');
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Registration failed.' });
    } finally { setBusy(false); }
  };

  return (
    <AuthBox title="Create Account" sub="EV Customer Portal">
      <Msg type={msg.type} text={msg.text} />
      <div className="login-form">
        <label>Full Name *
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>Email *
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Phone (optional)
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>Pincode *
          <div style={{ position:'relative' }}>
            <input type="text" inputMode="numeric" maxLength={6} value={form.pincode}
              onChange={async e => {
                const pin=e.target.value.replace(/\D/g,'').slice(0,6);
                setForm(f=>({...f,pincode:pin,state:'',district:''})); setPinMsg('');
                if(pin.length===6){
                  setPinBusy(true);
                  try{ const r=await fetch(`https://api.postalpincode.in/pincode/${pin}`); const j=await r.json(); const po=j[0]?.PostOffice?.[0];
                    if(j[0]?.Status==='Success'&&po){setForm(f=>({...f,pincode:pin,state:po.State||'',district:po.District||''}));setPinMsg('✓ Location found');}
                    else setPinMsg('Invalid pincode');
                  }catch{setPinMsg('Could not lookup pincode');} finally{setPinBusy(false);}
                }
              }} placeholder="6-digit pincode" />
            {pinBusy && <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)'}}>⏳</span>}
          </div>
          {pinMsg && <span style={{fontSize:12,color:pinMsg.startsWith('✓')?'#16a34a':'#dc2626'}}>{pinMsg}</span>}
        </label>
        <div className="row-2">
          <label>State
            <input type="text" value={form.state} readOnly placeholder="Auto-filled from pincode" style={{background:'#f8fafc'}} />
          </label>
          <label>District
            <input type="text" value={form.district} readOnly placeholder="Auto-filled from pincode" style={{background:'#f8fafc'}} />
          </label>
        </div>
        <label>Password * <span style={{fontSize:11,color:'#94a3b8'}}>(min 8 characters)</span>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </label>
        <label>Confirm Password *
          <input type="password" value={form.password2} onChange={e => setForm({ ...form, password2: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        <button className="btn-auth" disabled={busy} onClick={submit}>
          {busy ? 'Creating account…' : 'Create Account & Send OTP'}
        </button>
      </div>
      <div className="auth-links">
        <button className="link-btn" onClick={() => setScreen('login')}>← Back to login</button>
      </div>
    </AuthBox>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 3 — VERIFY OTP (after register)
// ══════════════════════════════════════════════════════════════════
function VerifyRegisterOtpPage({ setScreen, pendingEmail, pendingPassword, onAuth }) {
  const [otp,    setOtp]    = useState('');
  const [busy,   setBusy]   = useState(false);
  const [resend, setResend] = useState(false);
  const [msg,    setMsg]    = useState({ type: 'info', text: `OTP sent to ${pendingEmail}. Check your inbox (or server console in dev).` });
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verify = async () => {
    if (otp.length !== 6) { setMsg({ type: 'error', text: 'Enter the 6-digit OTP.' }); return; }
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const res = await axios.post(`${API}/auth/customer/verify-otp`, { email: pendingEmail, otp });
      // Immediately set password after OTP verification (using the token from verify response)
      if (pendingPassword && res.data.accessToken) {
        try {
          await axios.post(`${API}/auth/customer/set-password`,
            { password: pendingPassword },
            { headers: { Authorization: `Bearer ${res.data.accessToken}` } }
          );
        } catch (_) { /* password set can be retried later */ }
      }
      onAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'OTP verification failed.' });
    } finally { setBusy(false); }
  };

  const doResend = async () => {
    setResend(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API}/auth/customer/resend-otp`, { email: pendingEmail });
      setOtp('');
      setCountdown(60);
      setMsg({ type: 'success', text: 'New OTP sent to your email.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Could not resend OTP.' });
    } finally { setResend(false); }
  };

  return (
    <AuthBox title="Verify Email" sub="Enter the OTP sent to your email">
      <Msg type={msg.type} text={msg.text} />
      <div className="login-form">
        <OtpInput value={otp} onChange={setOtp} />
        <button className="btn-auth" disabled={busy || otp.length !== 6} onClick={verify}>
          {busy ? 'Verifying…' : 'Verify OTP'}
        </button>
        <div className="resend-row">
          {countdown > 0 ? (
            <span className="resend-timer">Resend OTP in {countdown}s</span>
          ) : (
            <button className="link-btn" disabled={resend} onClick={doResend}>
              {resend ? 'Sending…' : 'Resend OTP'}
            </button>
          )}
        </div>
      </div>
      <div className="auth-links">
        <button className="link-btn" onClick={() => setScreen('register')}>← Change email</button>
      </div>
    </AuthBox>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 4 — VERIFY LOGIN OTP (passwordless login)
// ══════════════════════════════════════════════════════════════════
function VerifyLoginOtpPage({ setScreen, pendingEmail, onAuth }) {
  const [otp,    setOtp]    = useState('');
  const [busy,   setBusy]   = useState(false);
  const [resend, setResend] = useState(false);
  const [msg,    setMsg]    = useState({ type: 'info', text: `OTP sent to ${pendingEmail}.` });
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verify = async () => {
    if (otp.length !== 6) { setMsg({ type: 'error', text: 'Enter the 6-digit OTP.' }); return; }
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const res = await axios.post(`${API}/auth/customer/verify-login-otp`, { email: pendingEmail, otp });
      onAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'OTP verification failed.' });
    } finally { setBusy(false); }
  };

  const doResend = async () => {
    setResend(true);
    try {
      await axios.post(`${API}/auth/customer/resend-otp`, { email: pendingEmail });
      setOtp(''); setCountdown(60);
      setMsg({ type: 'success', text: 'New OTP sent.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Could not resend.' });
    } finally { setResend(false); }
  };

  return (
    <AuthBox title="Enter Login OTP" sub={`Sent to ${pendingEmail}`}>
      <Msg type={msg.type} text={msg.text} />
      <div className="login-form">
        <OtpInput value={otp} onChange={setOtp} />
        <button className="btn-auth" disabled={busy || otp.length !== 6} onClick={verify}>
          {busy ? 'Verifying…' : 'Login with OTP'}
        </button>
        <div className="resend-row">
          {countdown > 0 ? (
            <span className="resend-timer">Resend in {countdown}s</span>
          ) : (
            <button className="link-btn" disabled={resend} onClick={doResend}>
              {resend ? 'Sending…' : 'Resend OTP'}
            </button>
          )}
        </div>
      </div>
      <div className="auth-links">
        <button className="link-btn" onClick={() => setScreen('login')}>← Back to login</button>
      </div>
    </AuthBox>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 5 — FORGOT PASSWORD (send reset OTP)
// ══════════════════════════════════════════════════════════════════
function ForgotPasswordPage({ setScreen, setPendingEmail }) {
  const [email, setEmail] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [msg,   setMsg]   = useState({ type: '', text: '' });

  const submit = async () => {
    if (!email) { setMsg({ type: 'error', text: 'Enter your email.' }); return; }
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API}/auth/customer/forgot-password`, { email });
      setPendingEmail(email);
      setMsg({ type: 'success', text: 'If that email is registered, an OTP has been sent.' });
      setTimeout(() => setScreen('reset-password'), 1500);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Request failed.' });
    } finally { setBusy(false); }
  };

  return (
    <AuthBox title="Forgot Password" sub="We'll send a reset OTP to your email">
      <Msg type={msg.type} text={msg.text} />
      <div className="login-form">
        <label>Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        <button className="btn-auth" disabled={busy} onClick={submit}>
          {busy ? 'Sending…' : 'Send Reset OTP'}
        </button>
      </div>
      <div className="auth-links">
        <button className="link-btn" onClick={() => setScreen('login')}>← Back to login</button>
      </div>
    </AuthBox>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 6 — RESET PASSWORD (OTP + new password)
// ══════════════════════════════════════════════════════════════════
function ResetPasswordPage({ setScreen, pendingEmail }) {
  const [otp,   setOtp]   = useState('');
  const [pass,  setPass]  = useState('');
  const [pass2, setPass2] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [msg,   setMsg]   = useState({ type: 'info', text: 'Enter the OTP sent to your email and choose a new password.' });

  const submit = async () => {
    if (otp.length !== 6) { setMsg({ type: 'error', text: 'Enter the 6-digit OTP.' }); return; }
    if (pass.length < 8)  { setMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    if (pass !== pass2)   { setMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API}/auth/customer/reset-password`, { email: pendingEmail, otp, newPassword: pass });
      setMsg({ type: 'success', text: 'Password reset! Redirecting to login…' });
      setTimeout(() => setScreen('login'), 1500);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Reset failed.' });
    } finally { setBusy(false); }
  };

  const doResend = async () => {
    try {
      await axios.post(`${API}/auth/customer/forgot-password`, { email: pendingEmail });
      setMsg({ type: 'success', text: 'New OTP sent.' });
    } catch (e) {
      setMsg({ type: 'error', text: 'Could not resend OTP.' });
    }
  };

  return (
    <AuthBox title="Reset Password" sub={`OTP sent to ${pendingEmail}`}>
      <Msg type={msg.type} text={msg.text} />
      <div className="login-form">
        <OtpInput value={otp} onChange={setOtp} />
        <label>New Password
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} />
        </label>
        <label>Confirm Password
          <input type="password" value={pass2} onChange={e => setPass2(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        <button className="btn-auth" disabled={busy} onClick={submit}>
          {busy ? 'Resetting…' : 'Reset Password'}
        </button>
        <div className="resend-row">
          <button className="link-btn" onClick={doResend}>Resend OTP</button>
        </div>
      </div>
      <div className="auth-links">
        <button className="link-btn" onClick={() => setScreen('login')}>← Back to login</button>
      </div>
    </AuthBox>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHELL WITH SIDEBAR
// ══════════════════════════════════════════════════════════════════
// Bottom-nav primary items (mobile): first 4 + "More" drawer trigger
const BOTTOM_NAV_COUNT = 4;

function Shell({ user, page, setPage, call, logout }) {
  const navItems = NAV_ITEMS[kind] || NAV_ITEMS.command;
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (id) => {
    setPage(id);
    setMenuOpen(false);
  };

  // Mobile menu is rendered through a portal so it can never be trapped
  // behind a page/card stacking context. This is intentionally app-like:
  // one clean side drawer, no bottom navigation bar.
  const mobileMenu = menuOpen && typeof document !== 'undefined'
    ? createPortal(
        <>
          <div
            className="mobile-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="mobile-menu-drawer" aria-label="Customer Portal menu">
            <div className="mobile-menu-head">
              <div className="mobile-menu-brand">
                <img src={allevLogo} alt="allEV" />
                <div>
                  <div className="mobile-menu-title">Customer Portal</div>
                  <div className="mobile-menu-sub">Your EV journey</div>
                </div>
              </div>
              <button
                className="mobile-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={21} />
              </button>
            </div>

            <button className="mobile-menu-user mobile-menu-profile-card" onClick={() => navigate('profile')} aria-label="Open profile details">
              <div className="mobile-menu-avatar">{user?.name?.[0] ?? '?'}</div>
              <div className="mobile-menu-user-copy">
                <strong>{user?.name || 'Customer'}</strong>
                <span>{user?.email || 'Customer account'}</span>
              </div>
              <span className="mobile-menu-profile-arrow">›</span>
            </button>

            <nav className="mobile-menu-nav">
              {!user ? <SidebarSkeleton count={navItems.length} /> : navItems.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`mobile-menu-item${page === id ? ' active' : ''}`}
                  onClick={() => navigate(id)}
                >
                  <span className="mobile-menu-item-icon"><Icon size={19} /></span>
                  <span>{label}</span>
                  <span className="mobile-menu-chevron">›</span>
                </button>
              ))}
            </nav>

            <div className="mobile-menu-footer">
              <button className="mobile-menu-item mobile-menu-logout" onClick={logout}>
                <span className="mobile-menu-item-icon"><LogOut size={19} /></span>
                <span>Sign out</span>
                <span className="mobile-menu-chevron">›</span>
              </button>
            </div>
          </aside>
        </>,
        document.body
      )
    : null;

  return (
    <div className={`shell customer-shell${menuOpen ? ' menu-open' : ''}`}>
      {/* Desktop sidebar. On mobile this is hidden; the portal drawer above is used. */}
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-logo">
          <img src={allevLogo} alt="allEV" style={{height:"32px",objectFit:"contain"}} />
        </div>
        <nav className="sidebar-nav">
          {!user ? <SidebarSkeleton count={navItems.length} /> : navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={'nav-item' + (page === id ? ' active' : '')}
              onClick={() => navigate(id)}
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

      <div className="main-wrap">
        <header className="topbar customer-mobile-profile-header">
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="topbar-brand customer-mobile-logo-brand">
            <img src={allevLogo} alt="allEV" className="customer-mobile-brand-logo" />
          </div>

          <button className="topbar-user topbar-profile-trigger" onClick={() => { setPage('profile'); setMenuOpen(false); }} aria-label="Open profile">
            <div className="avatar">{user?.profileImage ? <img src={user.profileImage} alt="Profile" /> : (user?.name?.[0] ?? 'C')}</div>
            <div className="topbar-user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </button>
        </header>

        <main className="page-body customer-page-body">
          <div className="customer-page-transition" key={page}>
            <PageRouter page={page} call={call} setPage={setPage} />
          </div>
        </main>
      </div>

      {/* Mobile menu replaces the old bottom navigation. */}
      {mobileMenu}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════
// PAGE ROUTER
// ══════════════════════════════════════════════════════════════════
function PageRouter({ page, call, setPage }) {
  const P = { page, call, setPage };
  if (kind === 'customer') {
    const pages = {
      dashboard:            <CustDashboard        call={P.call} setPage={P.setPage} />,
      'available-vehicles': <CustAvailableVehicles {...P} />,
      vehicles:             <CustVehicles          call={P.call} setPage={P.setPage} />,
      purchases:             <CustBookings          {...P} />,
      wallet:               <CustWallet            {...P} />,
      invoices:             <CustInvoices          {...P} />,
      complaints:           <CustComplaints        {...P} />,
      profile:               <CustProfile            {...P} />,
      'charging-stations':  <CustChargingStations  {...P} />,
    };
    const sectionLabels = {
      'available-vehicles': 'Available Vehicles',
      vehicles: 'My Vehicles',
      purchases: 'Purchases',
      wallet: 'Wallet',
      invoices: 'Invoices',
      complaints: 'Support',
      'charging-stations': 'Charging Stations',
    };
    const showSectionBack = page !== 'dashboard' && page !== 'profile';
    return (
      <ErrorBoundary key={page}>
        {showSectionBack && (
          <div className="customer-section-backbar">
            <button className="customer-section-back" onClick={() => setPage('dashboard')} aria-label="Back to dashboard">
              <ArrowLeft size={19} />
            </button>
            <div className="customer-section-back-title">{sectionLabels[page] || 'Customer'}</div>
          </div>
        )}
        {pages[page] || pages.dashboard}
      </ErrorBoundary>
    );
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
function PageHeader({ title, sub, actions }) {
  return (
    <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div style={{flexShrink:0}}>{actions}</div>}
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

// Sidebar skeleton — shown while nav data / user is loading
function SidebarSkeleton({ count = 8 }) {
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
  // Lightweight content loader: never repeats the branded/logo splash between pages.
  // The allEV logo is reserved for the actual app shell/login, not data fetching.
  return (
    <div className="page-center-loader" role="status" aria-live="polite" aria-label="Loading">
      <div className="compact-loader-card">
        <div className="compact-loader-spinner" aria-hidden="true" />
        <div className="compact-loader-copy">
          <strong>Loading</strong>
          <span>Please wait a moment…</span>
        </div>
      </div>
    </div>
  );
}

// Shimmer skeleton cards for Available Vehicles section
function VehicleSkeletonGrid({ count = 6 }) {
  return (
    <div className="vehicle-skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="vehicle-skeleton-card" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="skel-img skel-shimmer" />
          <div className="skel-body">
            <div className="skel-line skel-line-lg skel-shimmer" />
            <div className="skel-line skel-line-sm skel-shimmer" />
            <div className="skel-specs">
              <div className="skel-spec-chip skel-shimmer" />
              <div className="skel-spec-chip skel-shimmer" />
              <div className="skel-spec-chip skel-shimmer" style={{ width: 48 }} />
            </div>
            <div className="skel-price skel-shimmer" />
            <div className="skel-line skel-line-xs skel-shimmer" style={{ marginBottom: 12 }} />
          </div>
          <div className="skel-btn skel-shimmer" />
        </div>
      ))}
    </div>
  );
}

// Lightweight vehicle loading state — no branded/logo splash between page loads.
function EVLoadingScreen({ label = 'Finding vehicles near you…' }) {
  return (
    <div className="vehicle-loading-inline" role="status" aria-live="polite">
      <div className="compact-loader-spinner" aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>Checking the latest availability</span>
      </div>
    </div>
  );
}

// Payment processing overlay with animated steps
function PaymentProcessingOverlay({ steps, currentStep }) {
  return (
    <div className="payment-processing-overlay">
      <div className="payment-processing-card">
        <div className="payment-spinner">
          <div className="payment-spinner-ring" />
          <div className="payment-spinner-icon">💳</div>
        </div>
        <div className="payment-processing-title">Processing Payment</div>
        <div className="payment-processing-sub">Please don't close this window</div>
        <div className="payment-processing-steps">
          {steps.map((step, i) => (
            <div key={i} className={`payment-step ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
              {i < currentStep
                ? <span className="payment-step-icon">✅</span>
                : i === currentStep
                  ? <div className="payment-step-spinner" />
                  : <span className="payment-step-icon">⏳</span>
              }
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Animated payment success screen
function PaymentSuccessScreen({ successData, vehicle, onDone }) {
  const confettiColors = ['#1d4ed8','#22c55e','#f59e0b','#ec4899','#8b5cf6','#06b6d4'];
  const confettiPieces = Array.from({ length: 18 }).map((_, i) => ({
    left: `${5 + (i * 5.5) % 90}%`,
    top:  `${(i * 7) % 40}%`,
    color: confettiColors[i % confettiColors.length],
    delay: `${(i * 0.09).toFixed(2)}s`,
    size: i % 3 === 0 ? '10px' : '7px',
    borderRadius: i % 2 === 0 ? '50%' : '2px',
  }));

  return (
    <div className="payment-success-overlay">
      <div className="payment-success-card">
        {/* Confetti */}
        <div className="success-confetti-container">
          {confettiPieces.map((p, i) => (
            <div key={i} className="confetti-piece" style={{
              left: p.left, top: p.top,
              background: p.color,
              animationDelay: p.delay,
              width: p.size, height: p.size,
              borderRadius: p.borderRadius,
            }} />
          ))}
        </div>

        {/* Checkmark */}
        <div className="success-checkmark-wrap">
          <div className="success-circle">
            <svg className="success-check-svg" viewBox="0 0 40 40">
              <path className="success-check-path" d="M9 20 L17 28 L31 12" />
            </svg>
          </div>
        </div>

        <div className="success-title">Payment Successful! 🎉</div>
        <div className="success-amount">₹{successData.amount}</div>
        <div className="success-sub">Your payment has been received and your vehicle booking is confirmed.</div>

        <div className="success-details-card">
          {[
            ['Vehicle',   successData.vehicleName],
            ['Quantity',  `${successData.quantity} vehicle${successData.quantity !== 1 ? 's' : ''}`],
            ['Purchase Date', successData.purchaseDate || '—'],
            ['Location',  successData.address],
            ['Payment ID', successData.paymentId],
          ].map(([k, v]) => (
            <div className="success-detail-row" key={k}>
              <span className="success-detail-label">{k}</span>
              <span className="success-detail-value">{v}</span>
            </div>
          ))}
        </div>

        {successData.pickup && (
          <div className="success-pickup-banner">
            <strong>📍 Pickup at:</strong> {successData.pickup}<br />
            <span style={{ fontSize: 12, opacity: .85 }}>The franchisee will handover your vehicle after verifying your purchase.</span>
          </div>
        )}

        <div className="success-actions">
          <button className="btn-primary" onClick={onDone}>View My Purchases →</button>
        </div>
      </div>
    </div>
  );
}

function Err({ msg }) {
  return <div className="empty" style={{ color: '#dc2626' }}>Error: {msg}</div>;
}

// ══════════════════════════════════════════════════════════════════
// CUSTOMER PAGES
// ══════════════════════════════════════════════════════════════════
function CustDashboard({ call, setPage }) {
  const { data: v, loading: lv } = useFetch(call, '/customer/vehicles');
  const { data: b, loading: lb } = useFetch(call, '/customer/purchases');
  const { data: w, loading: lw } = useFetch(call, '/customer/wallet');
  const { data: complaints, loading: lc } = useFetch(call, '/customer/complaints');
  const [user, setUser] = React.useState(null);
  React.useEffect(() => { call('/customer/profile').then(setUser).catch(() => {}); }, []);

  if ((lv && !v) || (lb && !b)) return <Loader />;

  const purchases = Array.isArray(b) ? b : [];
  const handedOver = purchases.filter(p => p.status === 'HANDED_OVER');
  const pending = purchases.filter(p => ['BOOKED','PAYMENT_DONE','HANDOVER_PENDING'].includes(p.status));
  const recent = [...purchases].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const complaintList = Array.isArray(complaints) ? complaints : (Array.isArray(complaints?.complaints) ? complaints.complaints : []);
  const openTickets = complaintList.filter(c => !['SOLVED','CLOSED'].includes(c.status));
  const walletBal = w?.balance ?? 0;

  const STATUS_CFG = {
    BOOKED:           { label: 'Awaiting Payment',  color: '#d97706', bg: '#fef3c7', icon: '🕐' },
    PAYMENT_DONE:     { label: 'Paid – Awaiting Handover', color: '#2563eb', bg: '#eff6ff', icon: '💳' },
    HANDOVER_PENDING: { label: 'Handover Pending',  color: '#7c3aed', bg: '#f5f3ff', icon: '⏳' },
    HANDED_OVER:      { label: 'Handed Over',       color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    ACTIVE:           { label: 'Active',             color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    COMPLETED:        { label: 'Completed',          color: '#16a34a', bg: '#f0fdf4', icon: '✓'  },
    CANCELLED:        { label: 'Cancelled',          color: '#dc2626', bg: '#fef2f2', icon: '✗'  },
  };

  return (
    <div className="cust-dashboard">
      {/* ── Welcome Banner ── */}
      <div className="cust-welcome-banner">
        <div className="cust-welcome-left">
          <div className="cust-welcome-tag">⚡ Customer Portal</div>
          <h1 className="cust-welcome-title">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋</h1>
          <p className="cust-welcome-sub">Here's an overview of your EV journey with allEV.</p>
          <div className="cust-welcome-actions">
            <button className="cust-btn-primary" onClick={() => setPage('available-vehicles')}>
              🚗 Browse Vehicles
            </button>
            <button className="cust-btn-secondary" onClick={() => setPage('wallet')}>
              💰 Wallet: ₹{walletBal.toLocaleString('en-IN')}
            </button>
          </div>
        </div>
        <div className="cust-welcome-art">
          <div className="cust-art-circle cust-art-c1" />
          <div className="cust-art-circle cust-art-c2" />
          <div className="cust-art-icon">⚡</div>
        </div>
      </div>

      {/* ── Stat Grid ── */}
      <div className="cust-stat-grid">
        {[
          { icon: '🏍️', label: 'Vehicles Owned', value: handedOver.length, color: '#2563eb', bg: '#eff6ff', onClick: () => setPage('vehicles') },
          { icon: '📦', label: 'Total Purchases', value: purchases.length, color: '#7c3aed', bg: '#f5f3ff', onClick: () => setPage('purchases') },
          { icon: '⏳', label: 'Pending Orders', value: pending.length, color: '#d97706', bg: '#fef3c7', onClick: () => setPage('purchases') },
          { icon: '🎫', label: 'Open Tickets', value: openTickets.length, color: '#dc2626', bg: '#fef2f2', onClick: () => setPage('complaints') },
        ].map(s => (
          <button key={s.label} className="cust-stat-card" onClick={s.onClick} style={{'--stat-color': s.color, '--stat-bg': s.bg}}>
            <div className="cust-stat-icon">{s.icon}</div>
            <div className="cust-stat-body">
              <div className="cust-stat-value">{s.value}</div>
              <div className="cust-stat-label">{s.label}</div>
            </div>
            <div className="cust-stat-arrow">→</div>
          </button>
        ))}
      </div>

      {/* ── App launcher: PhonePe-style service icons ── */}
      <section className="cust-app-launcher" aria-label="Customer services">
        <div className="cust-app-launcher-head">
          <div>
            <h2>All services</h2>
            <p>Everything you need, one tap away</p>
          </div>
          <span className="cust-app-launcher-badge">allEV</span>
        </div>
        <div className="cust-app-icon-grid">
          {[
            { icon: Car, label: 'Buy EV', sub: 'Browse vehicles', page: 'available-vehicles', tone: 'blue' },
            { icon: Wallet, label: 'Wallet', sub: 'Recharge & pay', page: 'wallet', tone: 'violet' },
            { icon: MapPin, label: 'Charging', sub: 'Find stations', page: 'charging-stations', tone: 'green' },
            { icon: ClipboardList, label: 'Purchases', sub: 'Track orders', page: 'purchases', tone: 'orange' },
            { icon: Car, label: 'My Vehicles', sub: 'Your EVs', page: 'vehicles', tone: 'cyan' },
            { icon: FileText, label: 'Invoices', sub: 'Bills & receipts', page: 'invoices', tone: 'indigo' },
            { icon: Bell, label: 'Support', sub: 'Get help', page: 'complaints', tone: 'rose' },
            { icon: Users, label: 'Profile', sub: 'Account details', page: 'profile', tone: 'slate' },
          ].map(({ icon: Icon, label, sub, page, tone }) => (
            <button key={page} className={`cust-app-icon-tile tone-${tone}`} onClick={() => setPage(page)}>
              <span className="cust-app-icon-wrap"><Icon size={22} strokeWidth={2.2} /></span>
              <span className="cust-app-icon-copy"><strong>{label}</strong><small>{sub}</small></span>
              <span className="cust-app-icon-arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <div className="cust-dash-grid">
        {/* ── Recent Activity ── */}
        <div className="cust-dash-card">
          <div className="cust-dash-card-head">
            <div className="cust-dash-card-title">📋 Recent Purchases</div>
            <button className="cust-dash-link" onClick={() => setPage('purchases')}>View all →</button>
          </div>
          {recent.length === 0 ? (
            <div className="cust-empty-mini">
              <span>🛒</span>
              <p>No purchases yet.<br /><button className="link-btn" onClick={() => setPage('available-vehicles')}>Browse vehicles</button></p>
            </div>
          ) : (
            <div className="cust-activity-list">
              {recent.map(p => {
                const vs = p.vehicleSnapshot || {};
                const cfg = STATUS_CFG[p.status] || { label: p.status, color: '#64748b', bg: '#f1f5f9', icon: '•' };
                return (
                  <div key={p._id} className="cust-activity-row">
                    <div className="cust-activity-icon" style={{background: cfg.bg, color: cfg.color}}>{cfg.icon}</div>
                    <div className="cust-activity-info">
                      <div className="cust-activity-name">{vs.make} {vs.model || 'Vehicle'}</div>
                      <div className="cust-activity-meta">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}
                        {' · '}₹{Number(p.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="cust-activity-badge" style={{background: cfg.bg, color: cfg.color}}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Pending Orders Alert ── */}
      {pending.length > 0 && (
        <div className="cust-pending-alert" onClick={() => setPage('purchases')}>
          <div className="cust-pending-icon">⏳</div>
          <div className="cust-pending-text">
            <strong>You have {pending.length} pending order{pending.length !== 1 ? 's' : ''}</strong>
            <span> — {pending.filter(p => p.status === 'BOOKED').length} awaiting payment, {pending.filter(p => p.status === 'PAYMENT_DONE').length} awaiting handover</span>
          </div>
          <span className="cust-pending-arrow">→</span>
        </div>
      )}
    </div>
  );
}

function CustVehicles({ call, setPage }) {
  const { data: purchasesRaw, loading: lp } = useFetch(call, '/customer/purchases');
  const purchaseRecords = Array.isArray(purchasesRaw) ? purchasesRaw : [];
  if (lp && !purchasesRaw) return <Loader />;

  // Only show vehicles that have been HANDED_OVER by the franchisee
  const handedOver = purchaseRecords.filter(p => p.status === 'HANDED_OVER');

  return <>
    <PageHeader
      title="My Vehicles"
      sub="Vehicles handed over to you by the franchisee."
    />

    {handedOver.length === 0 ? (
      <div className="cust-no-vehicles">
        <div className="cust-no-vehicles-icon">🏍️</div>
        <div className="cust-no-vehicles-title">No vehicle available in My Vehicles</div>
        <div className="cust-no-vehicles-sub">
          Vehicles will appear here once the franchisee completes handover.<br />
          Check your purchase status in <strong>Purchases</strong>.
        </div>
        <div className="cust-no-vehicles-actions">
          <button className="btn-primary" onClick={() => setPage('available-vehicles')}>Browse Vehicles</button>
          <button className="btn-ghost" onClick={() => setPage('purchases')}>View Purchases</button>
        </div>
      </div>
    ) : (
      <div className="cust-vehicles-grid">
        {handedOver.map(p => {
          const vs = p.vehicleSnapshot || {};
          return (
            <div key={p._id} className="cust-vehicle-card">
              {/* Card Header */}
              <div className="cust-vc-header">
                <div className="cust-vc-header-info">
                  <div className="cust-vc-name">{vs.make} {vs.model}</div>
                  <div className="cust-vc-year">{vs.year} · {vs.color}</div>
                </div>
                <span className="cust-vc-owned-badge">✓ Owned</span>
              </div>

              {/* Vehicle Images */}
              {vs.images?.length > 0 && (
                <div className="cust-vc-images">
                  {vs.images.slice(0, 3).map((img, i) => (
                    <img key={i} src={img.url} alt={img.name || vs.make}
                      className={`cust-vc-img${i === 0 ? ' cust-vc-img-main' : ''}`} />
                  ))}
                </div>
              )}
              {!vs.images?.length && (
                <div className="cust-vc-img-ph">🏍️</div>
              )}

              {/* Specs */}
              <div className="cust-vc-specs">
                {vs.rangeKm && <div className="cust-vc-spec"><span>🔋</span>{vs.rangeKm} km range</div>}
                {vs.batteryCapacityKwh && <div className="cust-vc-spec"><span>⚡</span>{vs.batteryCapacityKwh} kWh</div>}
                {vs.chargingType && <div className="cust-vc-spec"><span>🔌</span>{vs.chargingType}</div>}
                {vs.category && <div className="cust-vc-spec"><span>🏷️</span>{vs.category}</div>}
              </div>

              {/* Details Grid */}
              <div className="cust-vc-details">
                {[
                  ['Registration No.', vs.registrationNo || '—'],
                  ['Total Paid', `₹${Number(p.totalAmount || 0).toLocaleString('en-IN')}`],
                  ['Quantity', `${p.saleQuantity ?? 1} unit${(p.saleQuantity ?? 1) > 1 ? 's' : ''}`],
                  ['Purchase Date', p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : new Date(p.createdAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})],
                  ['Handover Date', p.handoverDate ? new Date(p.handoverDate).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—'],
                  ['Franchisee', p.franchiseeName || '—'],
                ].map(([k, val]) => (
                  <div key={k} className="cust-vc-detail-row">
                    <span className="cust-vc-detail-key">{k}</span>
                    <strong className="cust-vc-detail-val">{val}</strong>
                  </div>
                ))}
              </div>

              {/* Handover info */}
              <div className="cust-vc-footer">
                <span className="cust-vc-handover">
                  🏪 Picked up from: <strong>{[p.pickupLocation?.name || p.franchiseeName, p.pickupLocation?.address].filter(Boolean).join(' · ') || '—'}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </>;
}


function CustBookings({ call, setPage }) {
  const { data: purchasesRaw, loading } = useFetch(call, '/customer/purchases');
  const purchases = Array.isArray(purchasesRaw) ? purchasesRaw : [];
  const [pickup, setPickup] = useState(null);
  const [filter, setFilter] = useState('all');

  if (loading && !purchasesRaw) return <Loader />;

  const STATUS_CFG = {
    BOOKED:           { label: 'Awaiting Payment',     color: '#d97706', bg: '#fef3c7', icon: '🕐' },
    PAYMENT_DONE:     { label: 'Awaiting Handover',    color: '#2563eb', bg: '#eff6ff', icon: '💳' },
    HANDOVER_PENDING: { label: 'Handover Pending',     color: '#7c3aed', bg: '#f5f3ff', icon: '⏳' },
    ACTIVE:            { label: 'Handed Over',          color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    COMPLETED:        { label: 'Completed',             color: '#16a34a', bg: '#f0fdf4', icon: '✓'  },
    CANCELLED:        { label: 'Cancelled',             color: '#dc2626', bg: '#fef2f2', icon: '✗'  },
  };

  const FILTERS = [
    { id: 'all',    label: `All (${purchases.length})` },
    { id: 'active', label: 'Active' },
    { id: 'paid',   label: 'Paid' },
    { id: 'done',   label: 'Completed' },
  ];

  const filtered = purchases.filter(r => {
    if (filter === 'active') return ['BOOKED','PAYMENT_DONE','HANDOVER_PENDING'].includes(r.status);
    if (filter === 'paid')   return r.status === 'PAYMENT_DONE';
    if (filter === 'done')   return r.status === 'COMPLETED';
    return true;
  });

  const activePurchases = purchases.filter(r => !['COMPLETED','CANCELLED'].includes(r.status));

  return <>
    <PageHeader title="My Bookings" sub="Rental plans, payment status and fleet operator handover details." />
    <MetricGrid metrics={[
      { label: 'Total Purchases',   value: purchases.length,                                    Icon: ClipboardList, color: '#2563eb' },
      { label: 'Awaiting Handover', value: activePurchases.filter(r => r.status === 'PAYMENT_DONE').length, Icon: Car,          color: '#7c3aed' },
      { label: 'In Progress',       value: activePurchases.length,                              Icon: Activity,      color: '#d97706' },
      { label: 'Completed',         value: purchases.filter(r => r.status === 'COMPLETED').length, Icon: CheckCircle, color: '#16a34a' },
    ]} />

    {/* Filter tabs */}
    <div className="filter-tabs" style={{marginBottom:20}}>
      {FILTERS.map(f => (
        <button key={f.id} className={`filter-tab${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
      ))}
    </div>

    {filtered.length === 0 ? (
      <div className="card">
        <div className="empty-state">
          <ClipboardList size={40} style={{opacity:.25,marginBottom:12}} />
          <p>No purchases found for this filter.<br/>Browse Available Vehicles to make your first purchase.</p>
          <button className="btn-primary" style={{marginTop:16}} onClick={() => setPage('available-vehicles')}>Browse Vehicles</button>
        </div>
      </div>
    ) : (
      <div className="pc-grid">
        {filtered.map(r => {
          const vs = r.vehicleSnapshot || {};
          const sc = STATUS_CFG[r.status] || { label: r.status, color: '#64748b', bg: '#f1f5f9', icon: '📋' };
          const pickupName = [r.pickupLocation?.name || r.franchiseeName, r.pickupLocation?.address].filter(Boolean).join(' · ') || '—';
          return (
            <div key={r._id} className="pc-card" style={{borderLeftColor: sc.color}}>
              {/* Top: image + title + status */}
              <div className="pc-top">
                <div className="pc-img-wrap">
                  {vs.images?.[0]?.url
                    ? <img src={vs.images[0].url} alt={vs.make} className="pc-img" />
                    : <div className="pc-img-ph"><Car size={26} /></div>
                  }
                </div>
                <div className="pc-title-col">
                  <div className="pc-name">{vs.make} {vs.model} {vs.year ? `(${vs.year})` : ''}</div>
                  <div className="pc-meta">{vs.category} · {vs.color} {vs.registrationNo ? `· ${vs.registrationNo}` : ''}</div>
                  <span className="pc-status-badge" style={{background: sc.bg, color: sc.color}}>
                    {sc.icon} {sc.label}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="pc-stats">
                <div className="pc-stat">
                  <span>Quantity</span>
                  <strong>{r.saleQuantity ?? 1} vehicle{(r.saleQuantity ?? 1) !== 1 ? 's' : ''}</strong>
                </div>
                <div className="pc-stat">
                  <span>{r.rentalPlan && r.rentalPlan!=='SALE' ? 'Rental Plan' : 'Unit Price'}</span>
                  <strong>{r.rentalPlan && r.rentalPlan!=='SALE' ? `${r.rentalPlan} · ${r.planUnits||r.durationDays||1}` : `₹${(r.pricePerDay || 0).toLocaleString('en-IN')}`}</strong>
                </div>
                {r.rentalPlan && r.rentalPlan!=='SALE' && <div className="pc-stat">
                  <span>Security Deposit</span>
                  <strong>₹{Number(r.securityDeposit||0).toLocaleString('en-IN')}</strong>
                </div>}
                <div className="pc-stat pc-stat--highlight">
                  <span>Total Paid</span>
                  <strong>₹{(r.totalAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="pc-stat">
                  <span>Booked On</span>
                  <strong>{new Date(r.createdAt).toLocaleDateString('en-IN')}</strong>
                </div>
                {r.razorpayPaymentId && (
                  <div className="pc-stat pc-stat--full">
                    <span>Payment ID</span>
                    <strong className="pc-pay-id">{r.razorpayPaymentId}</strong>
                  </div>
                )}
              </div>

              {/* Pickup location */}
              <div className="pc-location">
                <MapPin size={13} />
                <span><strong>Pickup:</strong> {pickupName}</span>
              </div>

              {/* Status banner */}
              <div className="pc-banner" style={{background: sc.bg, borderColor: sc.color + '55'}}>
                {r.handoverDate
                  ? <>✅ Handed over on <strong>{new Date(r.handoverDate).toLocaleDateString('en-IN')}</strong> — purchase complete</>
                  : r.status === 'BOOKED'
                    ? <>🕐 Complete payment to confirm your booking</>
                    : <>⏳ Payment confirmed. The fleet operator will coordinate your vehicle handover.</>
                }
              </div>

              {/* Action */}
              {r.pickupLocation && (r.pickupLocation.lat || r.pickupLocation.lng) && (
                <button className="pc-action-btn" onClick={() => setPickup(r.pickupLocation)}>
                  <MapPin size={14} /> Get Directions
                </button>
              )}
            </div>
          );
        })}
      </div>
    )}
    {pickup && <PickupLocationMap location={pickup} onClose={() => setPickup(null)} />}
  </>;
}


function PickupLocationMap({ location, onClose }) {
  const mapRef = React.useRef(null);
  React.useEffect(() => {
    if (!location || !mapRef.current || !window.L) return;
    const lat = Number(location.lat), lng = Number(location.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView([lat,lng], 15);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(map);
    const marker = L.marker([lat,lng]).addTo(map);
    marker.bindPopup(`<strong>${location.name || 'Pickup Location'}</strong><br/>${location.address || ''}`).openPopup();
    return () => map.remove();
  }, [location]);
  if (!location) return null;
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(850px,100%)'}}>
      <div className="modal-head">
        <div><div className="modal-title">Pickup Location</div><div className="modal-subtitle">{location.name || 'Franchisee'} · {location.address || 'India'}</div></div>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div ref={mapRef} style={{height:450,borderRadius:12,overflow:'hidden',border:'1px solid #e4e7ef'}} />
        <div style={{marginTop:10,fontSize:12,color:'#64748b'}}>📍 Coordinates: {location.lat}, {location.lng}</div>
      </div>
    </div>
  </div>;
}

function CustWallet({ call }) {
  const { data: w, loading: lw, refresh: refreshW } = useFetch(call, '/customer/wallet');
  const { data: tx, loading: lt, refresh: refreshTx } = useFetch(call, '/customer/wallet/transactions');

  const [showRecharge, setShowRecharge] = React.useState(false);
  const [rechargeAmt, setRechargeAmt]   = React.useState(500);
  const [customAmt, setCustomAmt]       = React.useState('');
  const [busy, setBusy]                 = React.useState(false);
  const [success, setSuccess]           = React.useState(null); // { amount, newBalance, paymentId }
  const [error, setError]               = React.useState('');

  if ((lw && !w) || (lt && !tx)) return <Loader />;

  const balance = w?.balance ?? 0;
  const txList  = Array.isArray(tx) ? tx : [];
  const QUICK_AMTS = [200, 500, 1000, 2000, 5000];

  const doRecharge = async () => {
    const amount = customAmt ? Number(customAmt) : rechargeAmt;
    if (!amount || amount < 1) { setError('Enter a valid amount (minimum ₹1)'); return; }
    setError('');
    setBusy(true);
    try {
      let newWallet;
      // Try Razorpay order first
      try {
        const order = await call('/customer/wallet/recharge-order', { method: 'POST', data: { amount } });
        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: order.keyId, amount: order.amount, currency: 'INR',
            name: 'allEV Wallet', description: `Wallet Recharge — ₹${amount}`,
            order_id: order.orderId,
            handler: async response => {
              try {
                newWallet = await call('/customer/wallet/verify-recharge', { method: 'POST', data: { ...response, amount } });
                resolve();
              } catch (e) { reject(e); }
            },
            modal: { ondismiss: () => reject(new Error('dismissed')) },
            theme: { color: '#16a34a' },
          });
          rzp.open();
        });
      } catch (_) {
        // Fallback: direct add-money (no Razorpay configured)
        newWallet = await call('/customer/wallet/add-money', { method: 'POST', data: { amount } });
      }
      setSuccess({ amount, newBalance: newWallet?.balance ?? (balance + amount), paymentId: 'W-' + Date.now() });
      setShowRecharge(false);
      setCustomAmt('');
      refreshW();
      refreshTx();
    } catch (e) {
      if (e?.message !== 'dismissed') setError('Recharge failed. Please try again.');
    } finally { setBusy(false); }
  };

  const finalAmt = customAmt ? Number(customAmt) : rechargeAmt;

  return <>
    <PageHeader title="My Wallet" sub="Manage your allEV wallet balance." />

    {/* ── Success Overlay ── */}
    {success && (
      <div className="wallet-success-overlay" onClick={() => setSuccess(null)}>
        <div className="wallet-success-card" onClick={e => e.stopPropagation()}>
          <div className="wallet-success-anim">
            <div className="wallet-success-ring" />
            <div className="wallet-success-check">✓</div>
          </div>
          <div className="wallet-success-confetti">
            {Array.from({length:12}).map((_,i)=>(
              <div key={i} className="wallet-confetti-piece"
                style={{
                  left:`${8+(i*7.5)}%`,
                  background:['#16a34a','#2563eb','#f59e0b','#ec4899','#8b5cf6'][i%5],
                  animationDelay:`${i*0.07}s`,
                  width: i%2===0?'8px':'6px', height: i%2===0?'8px':'6px',
                  borderRadius: i%3===0?'50%':'2px',
                }} />
            ))}
          </div>
          <div className="wallet-success-title">Balance Added! 💚</div>
          <div className="wallet-success-amount">+₹{Number(success.amount).toLocaleString('en-IN')}</div>
          <div className="wallet-success-bal">
            New Balance: <strong>₹{Number(success.newBalance).toLocaleString('en-IN')}</strong>
          </div>
          <div className="wallet-success-details">
            <div className="wallet-success-row"><span>Amount Credited</span><strong style={{color:'#16a34a'}}>₹{Number(success.amount).toLocaleString('en-IN')}</strong></div>
            <div className="wallet-success-row"><span>Payment ID</span><strong>{success.paymentId}</strong></div>
            <div className="wallet-success-row"><span>Date & Time</span><strong>{new Date().toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</strong></div>
            <div className="wallet-success-row"><span>Status</span><strong style={{color:'#16a34a'}}>✓ Successfully Credited</strong></div>
          </div>
          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',marginTop:12,fontSize:12,color:'#166534',textAlign:'center'}}>
            Your wallet has been topped up. You can now use this balance for vehicle purchases.
          </div>
          <button className="btn-primary" style={{width:'100%',marginTop:16}} onClick={() => setSuccess(null)}>
            ✓ Done
          </button>
        </div>
      </div>
    )}

    {/* ── Balance Card ── */}
    <div className="wallet-balance-card">
      <div className="wallet-balance-left">
        <div className="wallet-balance-label">Available Balance</div>
        <div className="wallet-balance-amount">₹{balance.toLocaleString('en-IN')}</div>
        <div className="wallet-balance-sub">{txList.length} transaction{txList.length !== 1 ? 's' : ''} total</div>
      </div>
      <div className="wallet-balance-right">
        <div className="wallet-balance-icon">💰</div>
        <button className="wallet-add-btn" onClick={() => setShowRecharge(true)}>
          <Plus size={16} />
          Add Balance
        </button>
      </div>
    </div>

    {/* ── Recharge Modal ── */}
    {showRecharge && (
      <div className="modal-overlay" onClick={() => setShowRecharge(false)}>
        <div className="modal-drawer" style={{width:'min(480px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div>
              <div className="modal-title">💰 Add Wallet Balance</div>
              <div className="modal-subtitle">Choose an amount to recharge via Razorpay</div>
            </div>
            <button className="icon-btn" onClick={() => setShowRecharge(false)}>✕</button>
          </div>
          <div className="modal-body" style={{padding:'20px 24px'}}>
            {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#dc2626',marginBottom:16}}>{error}</div>}

            <div style={{marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:10,letterSpacing:'.05em',textTransform:'uppercase'}}>Quick Select</div>
              <div className="wallet-recharge-chips">
                {QUICK_AMTS.map(amt => (
                  <button key={amt}
                    className={`wallet-recharge-chip${rechargeAmt === amt && !customAmt ? ' active' : ''}`}
                    onClick={() => { setRechargeAmt(amt); setCustomAmt(''); }}>
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:8,letterSpacing:'.05em',textTransform:'uppercase'}}>Or Enter Custom Amount</div>
              <input
                type="number" min={1}
                className="bk-input"
                placeholder="Enter amount (₹)"
                value={customAmt}
                onChange={e => setCustomAmt(e.target.value)}
                style={{fontSize:16,padding:'12px 14px'}}
              />
            </div>

            <div className="wallet-recharge-summary">
              <div style={{fontSize:13,color:'#64748b'}}>You will be charged</div>
              <div style={{fontSize:22,fontWeight:800,color:'#16a34a'}}>₹{(finalAmt || 0).toLocaleString('en-IN')}</div>
              <div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>via Razorpay · Secure Payment 🔒</div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => { setShowRecharge(false); setError(''); }}>Cancel</button>
            <button className="btn-primary" disabled={busy || !finalAmt} style={{minWidth:180}} onClick={doRecharge}>
              {busy ? 'Processing…' : `Recharge ₹${(finalAmt||0).toLocaleString('en-IN')}`}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Transaction History ── */}
    <div className="wallet-tx-section">
      <div className="wallet-tx-head">
        <div style={{fontWeight:700,fontSize:15,color:'#1a1f2e'}}>Transaction History</div>
        <span style={{fontSize:12,color:'#94a3b8'}}>{txList.length} record{txList.length!==1?'s':''}</span>
      </div>
      {txList.length === 0 ? (
        <div className="card"><div className="empty-state"><Wallet size={36} style={{opacity:.2,marginBottom:10}}/><p>No transactions yet.<br/>Add balance to get started.</p></div></div>
      ) : (
        <div className="wallet-tx-list">
          {txList.map((t, i) => {
            const isCredit = t.type === 'CREDIT' || t.amount > 0;
            return (
              <div key={t._id || i} className="wallet-tx-row">
                <div className={`wallet-tx-icon ${isCredit ? 'credit' : 'debit'}`}>
                  {isCredit ? '↓' : '↑'}
                </div>
                <div className="wallet-tx-info">
                  <div className="wallet-tx-desc">{t.description || (isCredit ? 'Wallet Credit' : 'Wallet Debit')}</div>
                  <div className="wallet-tx-meta">
                    {t.referenceType && <span className="wallet-tx-ref">{t.referenceType}</span>}
                    <span>{t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</span>
                  </div>
                </div>
                <div className={`wallet-tx-amount ${isCredit ? 'credit' : 'debit'}`}>
                  {isCredit ? '+' : '−'}₹{Math.abs(t.amount ?? 0).toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </>;
}

function CustInvoices({ call }) {
  const { data: invoicesRaw, loading } = useFetch(call, '/customer/purchases/invoices');
  const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];
  const [downloading, setDL] = useState(null);

  const handleDownload = async (inv) => {
    setDL(inv._id);
    try {
      const token = localStorage.getItem('ev_customer_token');
      const res = await fetch(`/api/customer/purchases/invoices/${inv._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${inv.invoiceNo || 'invoice'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not download invoice: ' + e.message);
    } finally {
      setDL(null);
    }
  };

  if (loading && !invoicesRaw) return <Loader />;

  const fmt = (n) => `\u20b9${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const date = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return <>
    <PageHeader title="Invoices" sub="Purchase payment invoices. Download as HTML and print/save as PDF from your browser." />
    <MetricGrid metrics={[
      { label: 'Total Invoices', value: invoices.length,                                               Icon: FileText, color: '#2563eb' },
      { label: 'Total Paid',     value: fmt(invoices.reduce((s, i) => s + (i.subtotal || 0), 0)),         Icon: DollarSign, color: '#16a34a' },
    ]} />

    {invoices.length === 0 ? (
      <div className="card">
        <div className="empty-state">
          <FileText size={40} style={{ opacity: .25, marginBottom: 12 }} />
          <p>No invoices yet.<br />Invoices are generated automatically after a successful payment.</p>
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {invoices.map(inv => (
          <div key={inv._id} style={{
            background: '#fff', border: '1.5px solid #e4e9f7', borderRadius: 14,
            padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1f2e', marginBottom: 4 }}>
                {inv.invoiceNo}
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {date(inv.createdAt)} &nbsp;·&nbsp;
                {inv.items?.[0]?.description || 'Vehicle Purchase'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  ['Total', fmt(inv.subtotal)],
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: 13 }}>
                    <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{k}</span>
                    <strong style={{ color: '#1a1f2e' }}>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#d1fae5', color: '#059669', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                PAID
              </span>
              <button
                onClick={() => handleDownload(inv)}
                disabled={downloading === inv._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#2563eb', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  cursor: downloading === inv._id ? 'not-allowed' : 'pointer',
                  opacity: downloading === inv._id ? .6 : 1,
                }}
              >
                {downloading === inv._id ? '⏳ Downloading…' : '⬇ Download Invoice'}
              </button>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
          💡 Tip: After downloading, open the HTML file in your browser and press Ctrl+P → Save as PDF for a PDF copy.
        </div>
      </div>
    )}
  </>;
}

function CustComplaints({ call }) {
  const { data, loading, error, refresh } = useFetch(call, '/customer/complaints');
  const { data: options } = useFetch(call, '/customer/complaint-options');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId:'', franchiseeId:'', category:'Service Issue', message:'', subject:'' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [feedbackBusy, setFeedbackBusy] = useState(null);
  const { toast, show } = useToast();

  // Review requests from franchisee marking as resolved
  const [reviewRequests, setReviewRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ev_customer_review_requests') || '[]'); } catch { return []; }
  });
  // Job updates (pause/complete events) from staff
  const [jobUpdates, setJobUpdates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ev_customer_job_updates') || '[]'); } catch { return []; }
  });
  // Local feedback for review requests (not tied to complaint API)
  const [localReviewFeedback, setLocalReviewFeedback] = useState({});

  const markLocalReviewed = (complaintId, rating, comment) => {
    try {
      const updated = reviewRequests.map(r =>
        r.complaintId === complaintId ? { ...r, reviewed: true, rating, comment, reviewedAt: new Date().toISOString() } : r
      );
      localStorage.setItem('ev_customer_review_requests', JSON.stringify(updated));
      setReviewRequests(updated);
    } catch (_) {}
  };

  const sendLocalReview = async (req) => {
    const f = localReviewFeedback[req.complaintId] || {};
    if (!f.rating) { show('Select a star rating first', 'error'); return; }
    try {
      await call(`/customer/complaints/${req.complaintId}/feedback`, {
        method: 'post',
        data: { rating: Number(f.rating), feedback: f.comment || '' }
      });
    } catch (_) { /* silently ignore if API not available, still mark locally */ }
    markLocalReviewed(req.complaintId, f.rating, f.comment || '');
    show('⭐ Thank you! Your review has been submitted.');
    refresh();
  };

  const activeVehicles = options?.activeVehicles || [];
  // Only block on first load with no cache
  if (loading && !data) return <Loader />;
  if (error && !data)   return <Err msg={error} />;
  const selectedVehicle = activeVehicles.find(v => String(v.vehicleId) === String(form.vehicleId));

  const submit = async () => {
    if(!form.vehicleId || !form.franchiseeId || !form.message){show('Select an active bike, franchisee and enter the complaint.', 'error');return;}
    setSaving(true);
    try{
      const fr=(options.franchisees||[]).find(x=>String(x._id)===String(form.franchiseeId));
      await call('/customer/complaints',{method:'post',data:{...form,subject:form.subject||form.category,vehicleSnapshot:selectedVehicle?.vehicleSnapshot,paymentDetails:selectedVehicle?.paymentDetails,franchiseeId:form.franchiseeId,franchiseeName:fr?.name||''}});
      show('Complaint sent to the selected franchisee.'); setOpen(false); setForm({vehicleId:'',franchiseeId:'',category:'Service Issue',message:'',subject:''}); refresh();
    }catch(e){show(e.response?.data?.message||'Could not register complaint','error');} finally{setSaving(false);}
  };

  const sendFeedback = async (c) => {
    const f=feedback[c._id]||{};
    if(!f.rating){show('Select a rating first','error');return;}
    setFeedbackBusy(c._id);
    try{await call(`/customer/complaints/${c._id}/feedback`,{method:'post',data:{rating:Number(f.rating),feedback:f.comment||''}});show('Thank you. Your franchisee rating was saved.');refresh();}
    catch(e){show(e.response?.data?.message||'Could not save feedback','error');}finally{setFeedbackBusy(null);}
  };

  // Unreviewed review requests (franchisee marked resolved)
  const pendingReviews = reviewRequests.filter(r => !r.reviewed);
  // Recent pause events from staff
  const recentPauses = jobUpdates.filter(u => u.event === 'PAUSED').slice(-5);
  // Recent completion events
  const recentCompletions = jobUpdates.filter(u => u.event === 'COMPLETED').slice(-5);

  return <>
    <Toast toast={toast}/>
    <PageHeader title="Support & Complaints" sub="Register a complaint against an active vehicle and track franchisee resolution."
      actions={<button className="btn-primary" onClick={()=>setOpen(true)} disabled={!activeVehicles.length}><Plus size={15}/> Register Complaint</button>} />
    {!activeVehicles.length && <InfoBanner Icon={Bell}>You need an active vehicle before you can register a vehicle complaint.</InfoBanner>}

    {/* ── Work Status Updates (pause + completion from staff) ── */}
    {recentPauses.length > 0 && (
      <div style={{marginBottom:12,display:'flex',flexDirection:'column',gap:8}}>
        {recentPauses.map((u,i) => (
          <div key={i} style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'flex-start',gap:10}}>
            <span style={{fontSize:20}}>⏸</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:'#92400e'}}>Work Paused on Your Vehicle</div>
              <div style={{fontSize:12,color:'#78350f',marginTop:2}}>
                🚗 {u.vehicleMake} {u.vehicleReg} — <b>Reason:</b> {u.reason}
              </div>
              <div style={{fontSize:11,color:'#b45309',marginTop:2}}>{new Date(u.timestamp).toLocaleString('en-IN')}</div>
            </div>
          </div>
        ))}
      </div>
    )}
    {recentCompletions.length > 0 && (
      <div style={{marginBottom:12,display:'flex',flexDirection:'column',gap:8}}>
        {recentCompletions.map((u,i) => (
          <div key={i} style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'flex-start',gap:10}}>
            <span style={{fontSize:20}}>✅</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:'#166534'}}>Work Completed on Your Vehicle</div>
              <div style={{fontSize:12,color:'#14532d',marginTop:2}}>
                🚗 {u.vehicleMake} {u.vehicleReg}{u.remarks ? ` — ${u.remarks}` : ''}
              </div>
              <div style={{fontSize:11,color:'#16a34a',marginTop:2}}>{new Date(u.timestamp).toLocaleString('en-IN')}</div>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* ── Review Requests (franchisee marked complaint resolved) ── */}
    {pendingReviews.length > 0 && (
      <div style={{marginBottom:16,display:'flex',flexDirection:'column',gap:12}}>
        {pendingReviews.map(req => (
          <div key={req.complaintId} style={{background:'#faf5ff',border:'2px solid #c4b5fd',borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <span style={{fontSize:22}}>⭐</span>
              <div>
                <div style={{fontWeight:800,fontSize:14,color:'#5b21b6'}}>Your complaint has been resolved!</div>
                <div style={{fontSize:12,color:'#6d28d9',marginTop:2}}>
                  🚗 {req.vehicleMake} {req.vehicleModel} · {req.vehicleReg}
                </div>
              </div>
            </div>
            {req.resolution && (
              <div style={{background:'#ede9fe',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#4c1d95',marginBottom:12}}>
                <b>Resolution:</b> {req.resolution}
              </div>
            )}
            <div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:8}}>
              How was the service? Leave a review for your franchisee:
            </div>
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              {[1,2,3,4,5].map(n => (
                <button key={n}
                  onClick={() => setLocalReviewFeedback(f => ({...f,[req.complaintId]:{...f[req.complaintId],rating:n}}))}
                  style={{
                    border:'2px solid',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontWeight:700,fontSize:16,
                    borderColor: localReviewFeedback[req.complaintId]?.rating===n ? '#7c3aed' : '#e2e8f0',
                    background: localReviewFeedback[req.complaintId]?.rating===n ? '#7c3aed' : '#fff',
                    color: localReviewFeedback[req.complaintId]?.rating===n ? '#fff' : '#64748b',
                  }}>{'★'.repeat(n)}</button>
              ))}
            </div>
            <input
              style={{width:'100%',padding:'9px 12px',border:'1.5px solid #ddd6fe',borderRadius:8,fontSize:13,marginBottom:10,boxSizing:'border-box'}}
              placeholder="Write a short review (optional)…"
              value={localReviewFeedback[req.complaintId]?.comment || ''}
              onChange={e => setLocalReviewFeedback(f => ({...f,[req.complaintId]:{...f[req.complaintId],comment:e.target.value}}))}
            />
            <button
              onClick={() => sendLocalReview(req)}
              disabled={!localReviewFeedback[req.complaintId]?.rating}
              style={{
                background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,padding:'10px 24px',
                cursor:'pointer',fontWeight:700,fontSize:13,
                opacity: localReviewFeedback[req.complaintId]?.rating ? 1 : 0.5,
              }}>⭐ Submit Review</button>
          </div>
        ))}
      </div>
    )}

    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {(data||[]).map(c=><div key={c._id} className="card" style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div><strong>{c.subject || c.category || 'Vehicle Complaint'}</strong><div style={{fontSize:12,color:'#64748b',marginTop:4}}>Franchisee: {c.franchiseeName||'—'} · {new Date(c.createdAt).toLocaleString()}</div></div>
          <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:999,background:c.status==='SOLVED'?'#dcfce7':c.status==='CLOSED'?'#e2e8f0':c.status==='IN_PROGRESS'?'#fef3c7':'#fee2e2',color:c.status==='SOLVED'?'#166534':c.status==='CLOSED'?'#475569':c.status==='IN_PROGRESS'?'#92400e':'#991b1b'}}>{c.status}</span>
        </div>
        <div style={{fontSize:13,color:'#374151',marginTop:10}}>{c.message}</div>
        {c.resolution && <div style={{marginTop:10,padding:10,borderRadius:8,background:'#f0fdf4',fontSize:12}}><strong>Resolution:</strong> {c.resolution}</div>}
        {c.replacementVehicleSnapshot && <div style={{marginTop:8,fontSize:12,color:'#166534'}}>🔁 Replacement vehicle: {c.replacementVehicleSnapshot.make} {c.replacementVehicleSnapshot.model}</div>}
        {c.status==='SOLVED' && !c.feedbackSubmitted && <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #eef2f7'}}><strong style={{fontSize:13}}>How was the franchisee service?</strong><div style={{display:'flex',gap:6,marginTop:8}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setFeedback(f=>({...f,[c._id]:{...f[c._id],rating:n}}))} style={{border:'1px solid #dbe3ef',background:(feedback[c._id]?.rating===n)?'#2563eb':'#fff',color:(feedback[c._id]?.rating===n)?'#fff':'#64748b',borderRadius:7,padding:'5px 9px',cursor:'pointer'}}>{n}★</button>)}</div><input style={{marginTop:8,width:'100%',padding:9,border:'1px solid #dbe3ef',borderRadius:7}} placeholder="Feedback (optional)" value={feedback[c._id]?.comment||''} onChange={e=>setFeedback(f=>({...f,[c._id]:{...f[c._id],comment:e.target.value}}))}/><button className="btn-primary" style={{marginTop:8}} onClick={()=>sendFeedback(c)} disabled={feedbackBusy===c._id}>{feedbackBusy===c._id?'Saving…':'Submit Feedback'}</button></div>}
      </div>)}
      {!data?.length && <div className="card"><div className="empty-state"><Bell size={40} style={{opacity:.25,marginBottom:12}}/><p>No complaints yet.</p></div></div>}
    </div>

    {open && <div className="modal-overlay" onClick={()=>setOpen(false)}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(620px,100%)'}}><div className="modal-head"><div><div className="modal-title">Register a Complaint</div><div className="modal-subtitle">Active bike → auto-filled vehicle & payment details → franchisee</div></div><button className="icon-btn" onClick={()=>setOpen(false)}>✕</button></div><div className="modal-body">
      <div className="login-form">
        <label>Active Bike *<select value={form.vehicleId} onChange={e=>{const v=e.target.value;const av=activeVehicles.find(x=>String(x.vehicleId)===v);setForm(f=>({...f,vehicleId:v,franchiseeId:av?.franchiseeId||f.franchiseeId}))}}><option value="">Select active bike…</option>{activeVehicles.map(v=><option key={String(v.vehicleId)} value={String(v.vehicleId)}>{v.vehicleSnapshot?.make||''} {v.vehicleSnapshot?.model||v.vehicleSnapshot?.modelName||'Vehicle'} · {v.vehicleSnapshot?.registrationNo||v.vehicleSnapshot?.vin||String(v.vehicleId).slice(-6)}</option>)}</select></label>
        {selectedVehicle && <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:12}}><strong style={{fontSize:13}}>Vehicle details (non-editable)</strong>{[['Vehicle',`${selectedVehicle.vehicleSnapshot?.make||''} ${selectedVehicle.vehicleSnapshot?.model||selectedVehicle.vehicleSnapshot?.modelName||'Vehicle'}`],['Registration',selectedVehicle.vehicleSnapshot?.registrationNo||'—'],['Payment Status',selectedVehicle.paymentDetails?.paymentStatus||'—'],['Payment ID',selectedVehicle.paymentDetails?.razorpayPaymentId||'—'],['Amount',selectedVehicle.paymentDetails?.totalAmount?`₹${selectedVehicle.paymentDetails.totalAmount}`:'—']].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12,padding:'4px 0'}}><span style={{color:'#64748b'}}>{k}</span><strong>{v}</strong></div>)}</div>}
        {form.franchiseeId && (() => {
          const fr=(options?.franchisees||[]).find(x=>String(x._id)===String(form.franchiseeId)) || selectedVehicle;
          const name=fr?.name||selectedVehicle?.franchiseeName||'—';
          const pin=fr?.address?.pincode||'—';
          return (
            <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:10,padding:'10px 14px',fontSize:13}}>
              <span style={{fontSize:11,fontWeight:700,color:'#166534',display:'block',marginBottom:4}}>FRANCHISEE (auto-filled from purchase)</span>
              <strong style={{color:'#14532d'}}>{name}</strong>
              {pin!=='—' && <span style={{color:'#16a34a',marginLeft:8,fontSize:12}}>PIN {pin}</span>}
            </div>
          );
        })()}
        {!form.franchiseeId && <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#92400e'}}>⚠ Select an active bike above to auto-fill franchisee</div>}
        <label>Issue Category<select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{['Service Issue','Vehicle Fault','Battery Issue','Charging Issue','Accident/Damage','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Complaint *<textarea rows={4} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Describe the issue clearly…"/></label>
      </div>
    </div><div className="modal-footer"><button className="btn-ghost" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving?'Sending…':'Send Complaint'}</button></div></div></div>}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// CUSTOMER — AVAILABLE VEHICLES (approved by Command Center)
// ══════════════════════════════════════════════════════════════════
function CustAvailableVehicles({ call, setPage }) {
  const [vehicles, setVehicles]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [loading, setLoading]     = useState(true);
  const [purchaseVehicle, setPurchaseVehicle] = useState(null);
  const [location, setLocation] = useState(null);
  const [nearbyFranchisees, setNearbyFranchisees] = useState([]);
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState('');

  // Fetch profile first (cached instantly if prefetched), then fire
  // vehicles + franchisees in parallel using the resolved pincode.
  useEffect(() => {
    let alive = true;

    const load = async (isInterval = false) => {
      try {
        if (!isInterval) setLoading(true);

        // Step 1: profile — almost always cached after login prefetch
        const profile = await cachedCall(call, '/customer/profile');
        const pin = profile?.address?.pincode || '';
        if (alive) setLocation(profile?.address || null);

        // Step 2: vehicles + franchisees in parallel
        const vehiclePath = `/customer/available-vehicles${pin ? `?pincode=${encodeURIComponent(pin)}` : ''}`;
        const optPath     = `/customer/complaint-options${pin ? `?pincode=${encodeURIComponent(pin)}` : ''}`;

        const [list, opt] = await Promise.all([
          cachedCall(call, vehiclePath),
          cachedCall(call, optPath),
        ]);

        if (alive) {
          setVehicles(Array.isArray(list) ? list : []);
          setNearbyFranchisees(opt?.franchisees || []);
        }
      } catch { if (alive) setVehicles([]); }
      finally  { if (alive) setLoading(false); }
    };

    load();
    // Background refresh every 10 s — uses cachedCall so no flicker
    const interval = setInterval(() => {
      // Invalidate vehicle/franchisee cache before background refresh
      _cache.forEach((_, k) => {
        if (k.startsWith('/customer/available-vehicles') || k.startsWith('/customer/complaint-options')) {
          _cache.delete(k);
        }
      });
      load(true);
    }, 10_000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  const categories = ['all', '2-wheeler', '3-wheeler', '4-wheeler'];
  // Only show franchisees that actually have available vehicles, already ordered
  // by the backend from nearest to farthest for the customer's pincode.
  const availableFranchisees = nearbyFranchisees.filter(fr =>
    vehicles.some(v => String(v.franchiseeId || '') === String(fr._id))
  );

  useEffect(() => {
    if (!availableFranchisees.length) {
      setSelectedFranchiseeId('');
      return;
    }
    if (!availableFranchisees.some(fr => String(fr._id) === String(selectedFranchiseeId))) {
      setSelectedFranchiseeId(String(availableFranchisees[0]._id));
    }
  }, [vehicles, nearbyFranchisees, selectedFranchiseeId]);

  const filtered = vehicles
    .filter(v => filterCat === 'all' || v.category === filterCat)
    .filter(v => !selectedFranchiseeId || String(v.franchiseeId || '') === String(selectedFranchiseeId));

  const selectedFranchisee = availableFranchisees.find(fr => String(fr._id) === String(selectedFranchiseeId));

  const catEmoji = { '2-wheeler': '🛵', '3-wheeler': '🛺', '4-wheeler': '🚗' };
  const [imgLoaded, setImgLoaded] = useState({});

  return <>
    <PageHeader title="Available Vehicles" sub={location?.pincode ? `Vehicles near your location · ${location.pincode}${location.district ? ` · ${location.district}` : ''}` : 'Vehicles available across the EV CORE network'} />

    {/* Loading state — EV logo + skeleton grid */}
    {loading && (
      <>
        <EVLoadingScreen label="Finding vehicles near you…" />
        <VehicleSkeletonGrid count={6} />
      </>
    )}

    {!loading && location?.pincode && (
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:14,animation:'slide-up .4s ease'}}>
        <span style={{background:'#eff6ff',border:'1px solid #bfdbfe',color:'#1d4ed8',padding:'6px 11px',borderRadius:999,fontSize:12,fontWeight:700}}>📍 Pincode {location.pincode}</span>
        <span style={{fontSize:12,color:'#64748b'}}>Showing inventory from franchisees closest to your pincode.</span>
        {availableFranchisees.length > 0 && (
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',width:'100%'}}>
            <span style={{fontSize:12,color:'#64748b',fontWeight:700}}>Nearest available franchise:</span>
            {availableFranchisees.map((fr, i) => {
              const active = String(fr._id) === String(selectedFranchiseeId);
              return (
                <button key={fr._id} type="button" onClick={() => setSelectedFranchiseeId(String(fr._id))}
                  className="franchisee-tab-enter"
                  style={{fontSize:12,fontWeight:700,color:active?'#fff':'#1d4ed8',background:active?'#2563eb':'#fff',border:`1px solid ${active?'#2563eb':'#bfdbfe'}`,borderRadius:999,padding:'6px 11px',cursor:'pointer',transition:'all .2s',animationDelay:`${i*60}ms`}}>
                  {i === 0 ? '📍 ' : '🏪 '}{fr.name}{fr.address?.pincode ? ` · ${fr.address.pincode}` : ''}
                </button>
              );
            })}
          </div>
        )}
        {selectedFranchisee && (
          <div style={{width:'100%',marginTop:2,padding:'8px 11px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,color:'#475569',animation:'slide-up .3s ease .1s both'}}>
            <strong>Purchase from:</strong> {selectedFranchisee.name} · {selectedFranchisee.address?.city || selectedFranchisee.address?.district || ''}{selectedFranchisee.address?.pincode ? ` · PIN ${selectedFranchisee.address.pincode}` : ''}
            <span style={{marginLeft:6,color:'#64748b'}}>The vehicle will be handed over only by this franchisee.</span>
          </div>
        )}
      </div>
    )}

    {!loading && (
      <>
        {/* Category filter tabs */}
        <div className="filter-tabs" style={{animation:'slide-up .35s ease .05s both'}}>
          {categories.map(c => (
            <button key={c} className={'filter-tab' + (filterCat === c ? ' active' : '')}
              onClick={() => setFilterCat(c)}>
              {c === 'all' ? '🚘 All Vehicles' : `${catEmoji[c]} ${c}`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{animation:'float-up .4s ease'}}>
            <div className="empty-state">
              <Car size={40} style={{ opacity: .25, marginBottom: 12 }} />
              <p>No vehicles available in this category yet.<br />Check back soon — franchisees are adding vehicles regularly.</p>
            </div>
          </div>
        ) : (
          <div className="vehicle-browse-grid">
            {filtered.map((v, idx) => (
              <div key={v._id || v.id} className="vehicle-browse-card"
                style={{ animationDelay: `${Math.min(idx * 55, 550)}ms` }}
                onClick={() => setSelected(v)}>
                <div className="vbc-img">
                  {v.images?.length > 0 ? (
                    <>
                      {!imgLoaded[v._id] && <div className="vbc-img-loading" />}
                      <img
                        src={v.images[0].url}
                        alt={v.make}
                        onLoad={() => setImgLoaded(p => ({ ...p, [v._id]: true }))}
                        style={{ opacity: imgLoaded[v._id] ? 1 : 0, transition: 'opacity .35s ease' }}
                      />
                    </>
                  ) : (
                    <div className="vbc-no-img" style={{ fontSize: 52 }}>{catEmoji[v.category] || '🚗'}</div>
                  )}
                  <span className="vbc-cat-badge">{v.category}</span>
                </div>
                <div className="vbc-body">
                  <div className="vbc-name">{v.make} {v.model}</div>
                  <div className="vbc-year">{v.year} · {v.color}</div>
                  <div className="vbc-specs">
                    {v.rangeKm && <span>🔋 {v.rangeKm} km</span>}
                    {v.batteryCapacityKwh && <span>⚡ {v.batteryCapacityKwh} kWh</span>}
                    {v.chargingType && <span>🔌 {v.chargingType}</span>}
                  </div>
                  <div style={{fontSize:11,color:'#16a34a',fontWeight:700,marginBottom:6}}>
                    ✓ {v.quantity || 0} available · {v.franchiseeName || 'EV CORE Fleet'}
                  </div>
                  {v.rentalPlans ? (
                    <div className="vbc-rental-prices">
                      {v.rentalPlans.daily?.enabled && <div><span>Daily</span><strong>₹{Number(v.rentalPlans.daily.amount).toLocaleString('en-IN')}</strong><small>/day</small></div>}
                      {v.rentalPlans.weekly?.enabled && <div><span>Weekly</span><strong>₹{Number(v.rentalPlans.weekly.amount).toLocaleString('en-IN')}</strong><small>/week</small></div>}
                      {v.rentalPlans.monthly?.enabled && <div><span>Monthly</span><strong>₹{Number(v.rentalPlans.monthly.amount).toLocaleString('en-IN')}</strong><small>/month</small></div>}
                    </div>
                  ) : (
                    <div className="vbc-price">
                      <span className="price-amt">₹{Number(v.salePrice || v.pricePerDay || 0).toLocaleString('en-IN')}</span>
                      <span className="price-unit"> / vehicle</span>
                    </div>
                  )}
                </div>
                <button className="vbc-btn">View Details →</button>
              </div>
            ))}
          </div>
        )}
      </>
    )}

    {/* Detail modal */}
    {selected && (
      <div className="modal-overlay" onClick={() => setSelected(null)}>
        <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width: 'min(580px,100%)' }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">{selected.make} {selected.model}</div>
              <div className="modal-subtitle">{selected.category} · {selected.year} · {selected.color}</div>
            </div>
            <button className="icon-btn" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="modal-body">
            {selected.images?.length > 0 && (
              <div className="detail-img-gallery">
                {selected.images.map((img, i) => (
                  <div key={i} className="detail-img-thumb"><img src={img.url} alt={img.name} /></div>
                ))}
              </div>
            )}
            <div className="kv-list" style={{ marginTop: 12 }}>
              {[
                ['Registration', selected.registrationNo],
                ['Chassis / VIN', selected.chassisNo],
                ['Motor Number', selected.motorNo],
                ['Insurance Expiry', selected.insuranceExpiry ? new Date(selected.insuranceExpiry).toLocaleDateString('en-IN') : null],
                ['Odometer', selected.odometerKm != null ? `${Number(selected.odometerKm).toLocaleString('en-IN')} km` : null],
                ['Seating', selected.seatingCapacity ? `${selected.seatingCapacity} persons` : null],
                ['Top Speed', selected.topSpeedKph ? `${selected.topSpeedKph} km/h` : null],
                ['Battery', selected.batteryCapacityKwh ? `${selected.batteryCapacityKwh} kWh` : '—'],
                ['Range', selected.rangeKm ? `${selected.rangeKm} km` : '—'],
                ['Charging', selected.chargingType || '—'],
                ['Daily Plan', selected.rentalPlans?.daily?.enabled ? `₹${Number(selected.rentalPlans.daily.amount).toLocaleString('en-IN')} / day` : null],
                ['Weekly Plan', selected.rentalPlans?.weekly?.enabled ? `₹${Number(selected.rentalPlans.weekly.amount).toLocaleString('en-IN')} / week` : null],
                ['Monthly Plan', selected.rentalPlans?.monthly?.enabled ? `₹${Number(selected.rentalPlans.monthly.amount).toLocaleString('en-IN')} / month` : null],
                ['Security Deposit', selected.rentalPlans ? `₹${Number(selected.securityDeposit||0).toLocaleString('en-IN')}` : null],
                ['Discount', selected.rentalPlans && Number(selected.discountPercent||0) ? `${Number(selected.discountPercent)}% off` : null],
                ['Sale Price', !selected.rentalPlans ? `₹${(selected.pricePerDay||0).toLocaleString('en-IN')} / unit` : null],
                ['Available Stock', `${selected.quantity ?? 0} vehicle(s)`],
                ['Fleet Operator', selected.franchiseeName || 'EV CORE Fleet'],
              ].map(([k, v]) => v && (
                <div className="kv-row" key={k}><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
            {selected.description && <p style={{ fontSize: 13, color: '#374151', marginTop: 12, lineHeight: 1.6 }}>{selected.description}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => setSelected(null)}>Close</button>
            <button className="btn-primary" onClick={() => setPurchaseVehicle(selected)}>{selected.rentalPlans ? '🛵 Book Rental' : '🛒 Buy Now'}</button>
          </div>
        </div>
      </div>
    )}

    {/* Purchase Flow Modal */}
    {purchaseVehicle && (
      <BookingFlow
        vehicle={purchaseVehicle}
        call={call}
        onClose={() => setPurchaseVehicle(null)}
        onSuccess={() => { setPurchaseVehicle(null); setSelected(null); setPage('purchases'); }}
      />
    )}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// VEHICLE PURCHASE FLOW: location → quantity → Razorpay payment → ownership handover
// ══════════════════════════════════════════════════════════════════

function BookingFlow({ vehicle, call, onClose, onSuccess }) {
  const [step, setStep] = useState('address');
  const [pincode, setPincode] = useState('');
  const [addrData, setAddrData] = useState(null);
  const [area, setArea] = useState('');
  const quantity = 1;
  const [rentalPlan, setRentalPlan] = useState(vehicle.rentalPlans ? (vehicle.rentalPlans.daily?.enabled ? 'DAILY' : vehicle.rentalPlans.weekly?.enabled ? 'WEEKLY' : 'MONTHLY') : 'SALE');
  const [rentalDuration, setRentalDuration] = useState(1);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({type:'',text:''});
  const [successData, setSuccessData] = useState(null);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [useWallet, setUseWallet] = useState(false);

  // Coupon state
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');

  // Recharge state
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(500);
  const [rechargeBusy, setRechargeBusy] = useState(false);

  // Fetch wallet on mount
  React.useEffect(() => {
    setWalletLoading(true);
    call('/customer/wallet').then(w => {
      setWalletBalance(w?.balance ?? 0);
    }).catch(() => {}).finally(() => setWalletLoading(false));
  }, []);

  // Price calculations — rental listings are priced by plan × duration × vehicles.
  const isRental = !!vehicle.rentalPlans;
  const selectedPlanData = isRental ? vehicle.rentalPlans?.[rentalPlan.toLowerCase()] : null;
  const unitPrice = Number(isRental ? (selectedPlanData?.amount || 0) : (vehicle.pricePerDay || 0));
  const billingUnits = isRental ? rentalDuration : 1;
  const subtotal = unitPrice * billingUnits * quantity;
  const listingDiscount = isRental ? Math.floor(subtotal * Number(vehicle.discountPercent || 0) / 100) : 0;
  const couponDiscount = couponApplied
    ? (couponApplied.type === 'PERCENT' ? Math.floor(Math.max(0, subtotal - listingDiscount) * couponApplied.discount / 100) : Math.min(couponApplied.discount, Math.max(0, subtotal - listingDiscount)))
    : 0;
  const afterDiscounts = Math.max(0, subtotal - listingDiscount - couponDiscount);
  const securityDeposit = isRental ? Number(vehicle.securityDeposit || 0) * quantity : 0;
  const afterCoupon = afterDiscounts + securityDeposit;
  const walletDeduction = useWallet ? Math.min(walletBalance, afterCoupon) : 0;
  const finalAmount = Math.max(0, afterCoupon - walletDeduction);

  const lookupPincode = async pin => {
    if (pin.length !== 6) return;
    setPincodeLoading(true); setPincodeError('');
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await resp.json();
      if (json[0]?.Status === 'Success' && json[0]?.PostOffice?.length) {
        const po = json[0].PostOffice[0];
        setAddrData({ state: po.State, district: po.District, area: po.Region || po.Block || '' });
        setArea(po.Name || '');
      } else setPincodeError('Invalid pincode or no data found.');
    } catch { setPincodeError('Could not lookup pincode. Please try again.'); }
    finally { setPincodeLoading(false); }
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponBusy(true); setCouponMsg('');
    try {
      const res = await call('/customer/coupons/validate', { method: 'POST', data: { code: coupon.toUpperCase(), vehicleId: vehicle._id, amount: subtotal } });
      setCouponApplied({ code: coupon.toUpperCase(), discount: res.discount, type: res.type || 'FLAT', description: res.description });
      setCouponMsg('✓ Coupon applied successfully!');
    } catch (_) {
      setCouponMsg('✗ Invalid or expired coupon code');
    }
    setCouponBusy(false);
  };

  const handleRecharge = async () => {
    if (!window.Razorpay) { alert('Razorpay SDK not loaded'); return; }
    setRechargeBusy(true);
    // Directly add to wallet via API (with Razorpay if order endpoint exists, else simple add)
    try {
      let w;
      try {
        const order = await call('/customer/wallet/recharge-order', { method: 'POST', data: { amount: rechargeAmount } });
        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: order.keyId, amount: order.amount, currency: 'INR',
            name: 'allEV Wallet', description: 'Wallet Recharge',
            order_id: order.orderId,
            handler: async response => {
              try { w = await call('/customer/wallet/verify-recharge', { method: 'POST', data: { ...response, amount: rechargeAmount } }); resolve(); }
              catch (e) { reject(e); }
            },
            modal: { ondismiss: () => reject(new Error('dismissed')) },
            theme: { color: '#16a34a' }
          });
          rzp.open();
        });
      } catch (_) {
        // Fallback: simple add-money endpoint
        w = await call('/customer/wallet/add-money', { method: 'POST', data: { amount: rechargeAmount } });
      }
      setWalletBalance(w?.balance ?? walletBalance + rechargeAmount);
      setShowRecharge(false); setUseWallet(true);
    } catch (_) {}
    setRechargeBusy(false);
  };

  const startPayment = async () => {
    if (!pincode || pincode.length !== 6 || !addrData) { setMsg({type:'error',text:'Please enter a valid pincode.'}); return; }
    if (quantity !== 1) { setMsg({type:'error',text:'Each customer can book only 1 vehicle per booking.'}); return; }
    if (isRental && !selectedPlanData?.enabled) { setMsg({type:'error',text:'Please select an available rental plan.'}); return; }
    if (isRental && rentalDuration < 1) { setMsg({type:'error',text:'Please select a valid rental duration.'}); return; }
    setBusy(true); setMsg({type:'',text:''});
    try {
      const order = await call('/customer/purchases/create-order', {
        method: 'POST',
        data: {
          vehicleId: vehicle._id, vehicleSource: vehicle._source, franchiseeId: vehicle.franchiseeId, pincode,
          state: addrData.state, district: addrData.district, area: area || addrData.area,
          fullAddress: `${area || addrData.area}, ${addrData.district}, ${addrData.state} - ${pincode}`,
          purchaseDate: new Date().toISOString(), saleQuantity: quantity, durationDays: isRental ? rentalDuration : quantity, rentalPlan: isRental ? rentalPlan : 'SALE', planUnits: isRental ? rentalDuration : 1,
          walletAmount: walletDeduction, couponCode: couponApplied?.code, couponDiscount,
        }
      });
      if (finalAmount === 0) {
        setSuccessData({ vehicleName: `${vehicle.make} ${vehicle.model}`, amount: finalAmount.toLocaleString('en-IN'), quantity, purchaseDate: new Date().toLocaleDateString('en-IN'), address: `${area || addrData.area}, ${addrData.district}, ${addrData.state} - ${pincode}`, pickup: vehicle.franchiseeName || 'Selected Franchisee', paymentId: 'WALLET-' + Date.now() });
        setStep('success'); setBusy(false); return;
      }
      if (!window.Razorpay) { setMsg({type:'error',text:'Razorpay SDK is not loaded.'}); setBusy(false); return; }
      const options = {
        key: order.keyId, amount: order.amount, currency: order.currency || 'INR',
        name: 'EV Core', description: `Buy ${quantity} ${vehicle.make} ${vehicle.model}`,
        order_id: order.orderId, redirect: false,
        handler: async response => {
          try {
            const verification = await call('/customer/purchases/verify-payment', {
              method: 'POST',
              data: {
                rentalId: order.purchaseId,
                purchaseId: order.purchaseId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            });
            if (!verification?.success) throw new Error(verification?.message || 'Payment verification failed.');
            setSuccessData({
              vehicleName: `${vehicle.make} ${vehicle.model}`,
              amount: (order.amount / 100).toLocaleString('en-IN'),
              quantity,
              purchaseDate: new Date().toLocaleDateString('en-IN'),
              address: `${area || addrData.area}, ${addrData.district}, ${addrData.state} - ${pincode}`,
              pickup: vehicle.franchiseeName || 'Selected Franchisee',
              paymentId: verification.paymentId || response.razorpay_payment_id
            });
            setStep('success');
          } catch (e) { setMsg({type:'error',text:e.response?.data?.message||'Payment verification failed.'}); }
          finally { setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) }, theme: { color: '#2563eb' }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', resp => { setMsg({type:'error',text:'Payment failed: '+(resp.error?.description||'Please try again.')}); setBusy(false); });
      rzp.open();
    } catch (e) { setMsg({type:'error',text:e.response?.data?.message||'Could not create purchase order.'}); setBusy(false); }
  };

  const STEPS = ['address', 'quantity', 'payment'];
  const STEP_LABELS = isRental ? ['Location', 'Plan & Quantity', 'Payment'] : ['Location', 'Quantity', 'Payment'];
  const stepIdx = STEPS.indexOf(step);

  if (step === 'success' && successData) return <PaymentSuccessScreen successData={successData} vehicle={vehicle} onDone={onSuccess} />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer booking-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-head">
          <div>
            <div className="modal-title">Buy {vehicle.make} {vehicle.model}</div>
            <div className="modal-subtitle">Purchase outright · ₹{Number(vehicle.pricePerDay || 0).toLocaleString('en-IN')} per vehicle</div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* ── Step progress bar ── */}
        <div className="bk-step-bar">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className={`bk-step-connector${stepIdx > i ? ' done' : stepIdx === i ? ' active-line' : ''}`} />}
              <div className="bk-step-item">
                <div className={`bk-step-dot${stepIdx > i ? ' done' : stepIdx === i ? ' active' : ''}`}>
                  {stepIdx > i ? '✓' : i + 1}
                </div>
                <span className={`bk-step-label${stepIdx === i ? ' active' : stepIdx > i ? ' done' : ''}`}>{label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="modal-body">
          <Msg type={msg.type} text={msg.text} />

          {/* ── STEP 1: Location ── */}
          {step === 'address' && (
            <div className="bk-step-content">
              <div className="bk-step-hero">
                <div className="bk-step-hero-icon"><MapPin size={22} /></div>
                <div>
                  <div className="bk-step-hero-title">Confirm your location</div>
                  <div className="bk-step-hero-sub">Your pincode helps us find the nearest franchise pickup point.</div>
                </div>
              </div>

              <div className="bk-field-group">
                <label className="bk-label">Pincode *</label>
                <div className="bk-pincode-row">
                  <input
                    className="bk-input bk-pincode-input"
                    value={pincode} maxLength={6} inputMode="numeric"
                    placeholder="Enter 6-digit pincode"
                    onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,6); setPincode(v); setAddrData(null); setPincodeError(''); if (v.length === 6) lookupPincode(v); }}
                  />
                  {pincodeLoading && <div className="pincode-spinner" />}
                </div>
                {pincodeError && <div className="bk-field-err">{pincodeError}</div>}
              </div>

              {addrData && (
                <div className="bk-addr-reveal">
                  <div className="bk-addr-chips">
                    <div className="bk-addr-chip">
                      <span className="bk-addr-chip-label">State</span>
                      <span className="bk-addr-chip-value">{addrData.state}</span>
                    </div>
                    <div className="bk-addr-chip">
                      <span className="bk-addr-chip-label">District</span>
                      <span className="bk-addr-chip-value">{addrData.district}</span>
                    </div>
                  </div>
                  <div className="bk-field-group" style={{marginTop:14}}>
                    <label className="bk-label">Area / Locality (optional)</label>
                    <input className="bk-input" value={area} onChange={e => setArea(e.target.value)} placeholder={addrData.area || 'Your area or locality'} />
                  </div>
                  <div className="bk-pickup-banner">
                    🏪 Pickup from: <strong>{vehicle.franchiseeName || 'Selected Franchisee'}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Rental plan ── */}
          {step === 'quantity' && (
            <div className="bk-step-content">
              <div className="bk-vehicle-card">
                {vehicle.images?.[0]?.url
                  ? <img src={vehicle.images[0].url} alt={vehicle.make} className="bk-vehicle-img" />
                  : <div className="bk-vehicle-img-ph"><Car size={28} /></div>
                }
                <div className="bk-vehicle-info">
                  <div className="bk-vehicle-name">{vehicle.make} {vehicle.model}</div>
                  <div className="bk-vehicle-meta">{vehicle.category || 'Vehicle'} · {vehicle.registrationNo || 'Fleet vehicle'}</div>
                  <div className="bk-vehicle-price">{isRental ? 'Flexible rental' : `₹${unitPrice.toLocaleString('en-IN')}`} <span>{isRental ? 'choose a plan below' : '/ vehicle'}</span></div>
                </div>
              </div>

              {isRental && (
                <>
                  <div className="bk-plan-heading">Choose your rental plan</div>
                  <div className="bk-rental-plan-grid">
                    {[
                      ['DAILY','Daily','day','daily'],
                      ['WEEKLY','Weekly','week','weekly'],
                      ['MONTHLY','Monthly','month','monthly'],
                    ].map(([key,label,unit,field]) => vehicle.rentalPlans?.[field]?.enabled && (
                      <button type="button" key={key} className={`bk-rental-plan-card${rentalPlan===key?' active':''}`} onClick={()=>{setRentalPlan(key);setRentalDuration(1);}}>
                        <span className="bk-plan-check">{rentalPlan===key?'✓':''}</span>
                        <strong>{label}</strong>
                        <b>₹{Number(vehicle.rentalPlans[field].amount).toLocaleString('en-IN')}</b>
                        <small>per {unit}</small>
                      </button>
                    ))}
                  </div>
                  <div className="bk-rental-controls">
                    <div className="bk-qty-section bk-single-vehicle-note">
                      <div className="bk-qty-label">Vehicle</div>
                      <div className="bk-single-vehicle"><Car size={16}/> 1 vehicle per booking</div>
                      <div className="bk-qty-avail">{vehicle.quantity || 0} vehicle(s) currently available</div>
                    </div>
                    <div className="bk-qty-section">
                      <div className="bk-qty-label">Rental duration</div>
                      <div className="bk-duration-input"><input type="number" min="1" max="365" value={rentalDuration} onChange={e=>setRentalDuration(Math.max(1,Math.min(365,Number(e.target.value)||1)))} /><span>{rentalPlan==='DAILY'?'days':rentalPlan==='WEEKLY'?'weeks':'months'}</span></div>
                    </div>
                  </div>
                </>
              )}

              {!isRental && <div className="bk-single-vehicle-note bk-qty-section">
                <div className="bk-qty-label">Vehicle</div>
                <div className="bk-single-vehicle"><Car size={16}/> 1 vehicle per booking</div>
                <div className="bk-qty-avail">{vehicle.quantity || 0} unit(s) currently available</div>
              </div>}

              <div className="bk-price-preview">
                <div className="bk-price-row"><span>{quantity} vehicle{quantity!==1?'s':''} × ₹{unitPrice.toLocaleString('en-IN')} × {billingUnits}{isRental?' '+(rentalPlan==='DAILY'?'day(s)':rentalPlan==='WEEKLY'?'week(s)':'month(s)'):''}</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div>
                {isRental && Number(vehicle.discountPercent||0)>0 && <div className="bk-price-row"><span>Fleet discount ({Number(vehicle.discountPercent)}%)</span><strong className="bk-discount">−₹{listingDiscount.toLocaleString('en-IN')}</strong></div>}
                {isRental && <div className="bk-price-row"><span>Security deposit</span><strong>₹{securityDeposit.toLocaleString('en-IN')}</strong></div>}
                <div className="bk-price-row bk-total-row"><span>Estimated total</span><strong>₹{afterCoupon.toLocaleString('en-IN')}</strong></div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Payment ── */}
          {step === 'payment' && (
            <div className="bk-step-content">
              {/* Order Summary */}
              <div className="bk-order-summary">
                <div className="bk-order-title">Order Summary</div>
                {[
                  ['Vehicle', `${vehicle.make} ${vehicle.model}`],
                  ['Plan', isRental ? `${rentalPlan} · ${rentalDuration} ${rentalPlan==='DAILY'?'day(s)':rentalPlan==='WEEKLY'?'week(s)':'month(s)'}` : 'Vehicle Purchase'],
                  ['Rate', `₹${unitPrice.toLocaleString('en-IN')} / ${isRental ? rentalPlan==='DAILY'?'day':rentalPlan==='WEEKLY'?'week':'month' : 'vehicle'}`],
                  ['Rental Amount', `₹${subtotal.toLocaleString('en-IN')}`],
                  ...(isRental ? [['Fleet Discount', `−₹${listingDiscount.toLocaleString('en-IN')}`],['Security Deposit', `₹${securityDeposit.toLocaleString('en-IN')}`]] : []),
                  ['Pickup at', vehicle.franchiseeName || '—'],
                ].map(([k, v]) => (
                  <div className="bk-order-row" key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>

              {!isRental && <>
              {/* Coupon */}
              <div className="bk-section">
                <div className="bk-section-label">🏷️ Coupon Code</div>
                <div className="bk-coupon-row">
                  <input
                    className="bk-input bk-coupon-input"
                    value={coupon}
                    onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponMsg(''); if (couponApplied && e.target.value.toUpperCase() !== couponApplied.code) setCouponApplied(null); }}
                    placeholder="Enter coupon code"
                    disabled={!!couponApplied}
                  />
                  {couponApplied
                    ? <button className="bk-coupon-remove" onClick={() => { setCouponApplied(null); setCoupon(''); setCouponMsg(''); }}>✕ Remove</button>
                    : <button className="bk-coupon-apply" onClick={applyCoupon} disabled={!coupon.trim() || couponBusy}>{couponBusy ? '…' : 'Apply'}</button>
                  }
                </div>
                {couponMsg && <div className={`bk-coupon-msg${couponMsg.startsWith('✓') ? ' ok' : ' err'}`}>{couponMsg}</div>}
                {couponApplied && (
                  <div className="bk-coupon-applied">
                    🎉 <strong>{couponApplied.code}</strong> — {couponApplied.description || `₹${couponDiscount.toLocaleString('en-IN')} off`} applied
                  </div>
                )}
              </div>

              {/* Wallet */}
              <div className="bk-section">
                <div className="bk-section-label">💰 Wallet Balance</div>
                <div className="bk-wallet-row">
                  <div className="bk-wallet-bal">
                    <Wallet size={16} />
                    {walletLoading
                      ? <span className="bk-wallet-loading">Loading…</span>
                      : <strong>₹{walletBalance.toLocaleString('en-IN')}</strong>
                    }
                    <span className="bk-wallet-label">available</span>
                  </div>
                  {!walletLoading && (
                    <label className="bk-wallet-toggle">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={e => {
                          if (e.target.checked && walletBalance === 0) {
                            // Balance is 0 — open recharge panel instead
                            setShowRecharge(true);
                            setUseWallet(false);
                          } else {
                            setUseWallet(e.target.checked);
                          }
                        }}
                      />
                      <span>Use wallet</span>
                    </label>
                  )}
                </div>

                {/* Zero-balance notice */}
                {!walletLoading && walletBalance === 0 && (
                  <div className="bk-wallet-zero-notice">
                    <span>Your wallet balance is ₹0.</span>
                    <button className="bk-recharge-trigger" onClick={() => setShowRecharge(true)}>
                      ⚡ Recharge Now
                    </button>
                  </div>
                )}

                {useWallet && walletDeduction > 0 && (
                  <div className="bk-wallet-applied">
                    ✓ ₹{walletDeduction.toLocaleString('en-IN')} will be deducted from your wallet
                  </div>
                )}

                {/* Inline recharge panel */}
                {showRecharge && (
                  <div className="bk-recharge-panel">
                    <div className="bk-recharge-head">
                      <span>⚡ Recharge Wallet via Razorpay</span>
                      <button onClick={() => setShowRecharge(false)}>✕</button>
                    </div>
                    <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>
                      After recharge, tick "Use wallet" to deduct from your balance.
                    </div>
                    <div className="bk-recharge-chips">
                      {[200, 500, 1000, 2000].map(amt => (
                        <button key={amt} className={`bk-recharge-chip${rechargeAmount === amt ? ' active' : ''}`} onClick={() => setRechargeAmount(amt)}>₹{amt}</button>
                      ))}
                    </div>
                    <input type="number" className="bk-input" value={rechargeAmount} min={1} onChange={e => setRechargeAmount(Number(e.target.value))} placeholder="Custom amount" style={{marginTop:10}} />
                    <button className="btn-primary" style={{width:'100%',marginTop:10,fontSize:13}} onClick={handleRecharge} disabled={rechargeBusy}>
                      {rechargeBusy ? 'Processing…' : `Pay ₹${rechargeAmount.toLocaleString('en-IN')} & Recharge`}
                    </button>
                  </div>
                )}
              </div>

              </>}

              {/* Total */}
              <div className="bk-total-box">
                {couponDiscount > 0 && (
                  <div className="bk-total-row discount">
                    <span>Coupon Discount</span>
                    <strong>−₹{couponDiscount.toLocaleString('en-IN')}</strong>
                  </div>
                )}
                {walletDeduction > 0 && (
                  <div className="bk-total-row wallet">
                    <span>Wallet Deduction</span>
                    <strong>−₹{walletDeduction.toLocaleString('en-IN')}</strong>
                  </div>
                )}
                <div className="bk-total-row final">
                  <span>Amount to Pay</span>
                  <strong>₹{finalAmount.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer buttons ── */}
        <div className="modal-footer">
          {step === 'address' && (
            <button className="btn-primary" onClick={() => {
              if (pincode.length === 6 && addrData) { setMsg({type:'',text:''}); setStep('quantity'); }
              else setMsg({type:'error',text:'Enter a valid 6-digit pincode first.'});
            }}>Continue →</button>
          )}
          {step === 'quantity' && (
            <>
              <button className="btn-ghost" onClick={() => setStep('address')}>← Back</button>
              <button className="btn-primary" onClick={() => setStep('payment')}>Review & Pay →</button>
            </>
          )}
          {step === 'payment' && (
            <>
              <button className="btn-ghost" onClick={() => setStep('quantity')}>← Back</button>
              <button className="btn-primary" disabled={busy} onClick={startPayment} style={{minWidth:160}}>
                {busy ? 'Processing…' : finalAmount === 0 ? '✓ Confirm Purchase' : `Pay ₹${finalAmount.toLocaleString('en-IN')}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


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

// ══════════════════════════════════════════════════════════════════
// CUSTOMER — CHARGING STATIONS  (nearest first, with map)
// ══════════════════════════════════════════════════════════════════

// City fallback coords (same table as command center)
const CUST_CITY_COORDS = {
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

function custGetCoords(hub) {
  if (hub.lat && hub.lng) return [hub.lat, hub.lng];
  const key = (hub.city || '').toLowerCase().trim();
  return CUST_CITY_COORDS[key] || null;
}

// Haversine formula — returns km
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const HUB_SC = { ONLINE: '#16a34a', OFFLINE: '#dc2626', MAINTENANCE: '#d97706' };

function CustStationsMap({ hubs, userCoords, selectedHub, onSelectHub }) {
  const mapRef          = React.useRef(null);
  const leafRef         = React.useRef(null);
  const markersRef      = React.useRef([]);
  const userMarkerRef   = React.useRef(null);
  const tooltipTimerRef = React.useRef(null);
  const [tooltip, setTooltip] = React.useState(null);

  // ── init map once — L already on window from index.html ─────
  React.useEffect(() => {
    if (leafRef.current || !mapRef.current || !window.L) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([20.5937, 78.9629], 5);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    leafRef.current = map;
    drawHubMarkers(map, hubs);   // instant — no waiting
  }, []);

  // ── redraw markers when hubs change ─────────────────────────
  React.useEffect(() => {
    if (!leafRef.current) return;
    drawHubMarkers(leafRef.current, hubs);
  }, [hubs]);

  function drawHubMarkers(map, hubList) {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    const allCoords = [];
    hubList.forEach(hub => {
      const coords = custGetCoords(hub);
      if (!coords) return;
      const color = HUB_SC[hub.status] || '#2563eb';
      const rank  = hub._rank != null ? hub._rank + 1 : null;
      const icon = window.L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;">${rank ?? ''}</div>`,
        iconSize: [22, 22], iconAnchor: [11, 11],
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
      allCoords.push(coords);
    });
    // Auto-fit map to all hub locations
    if (allCoords.length === 1) {
      map.setView(allCoords[0], 14, { animate: false });
    } else if (allCoords.length > 1) {
      map.fitBounds(window.L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 14, animate: false });
    }
    map.invalidateSize();
  }

  // Draw / update user location marker
  React.useEffect(() => {
    if (!userCoords || !window.L) return;
    const L   = window.L;
    const map = leafRef.current;
    if (!map) return;
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:24px;height:24px;border-radius:50%;
        background:#2563eb;border:4px solid #fff;
        box-shadow:0 0 0 3px #2563eb66;
        cursor:default;
      "></div>`,
      iconSize: [24, 24], iconAnchor: [12, 12],
    });
    userMarkerRef.current = L.marker(userCoords, { icon })
      .bindPopup('<b>📍 Your Location</b>')
      .addTo(map);
    map.setView(userCoords, 8, { animate: true });
  }, [userCoords]);

  // Pan to selected
  React.useEffect(() => {
    if (!selectedHub || !leafRef.current) return;
    const c = custGetCoords(selectedHub);
    if (c) leafRef.current.setView(c, 10, { animate: true });
  }, [selectedHub]);

  const sc = tooltip ? (HUB_SC[tooltip.hub.status] || '#2563eb') : '#16a34a';
  return (
    <div style={{ position: 'relative', height: 500, borderRadius: 14, overflow: 'hidden',
                  border: '1px solid #e4e7ef', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {tooltip && (() => {
        const coords  = custGetCoords(tooltip.hub);
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
            {tooltip.hub._dist != null && (
              <div className="map-tooltip-row" style={{ color: '#2563eb', fontWeight: 700 }}>
                📏 {tooltip.hub._dist.toFixed(1)} km away
              </div>
            )}
            <div className="map-tooltip-row"><span>📍</span><strong>{tooltip.hub.city}</strong></div>
            {tooltip.hub.address && <div className="map-tooltip-row" style={{ fontSize: 11 }}>{tooltip.hub.address}</div>}
            <div className="map-tooltip-row"><span>⚡</span><strong>{tooltip.hub.chargerCount ?? 0} chargers</strong></div>
            <div style={{ marginTop: 6 }}>
              <span className="map-tooltip-status" style={{ background: sc + '22', color: sc }}>
                ● {tooltip.hub.status}
              </span>
            </div>
          </div>
        );
      })()}
      <div className="map-legend">
        <div style={{ fontWeight: 700, fontSize: 11, color: '#374151', marginBottom: 3 }}>Status</div>
        {Object.entries(HUB_SC).map(([s, c]) => (
          <div key={s} className="legend-item">
            <div className="legend-dot" style={{ background: c }} />
            <span style={{ fontSize: 11 }}>{s}</span>
          </div>
        ))}
        {userCoords && (
          <div className="legend-item" style={{ marginTop: 4 }}>
            <div className="legend-dot" style={{ background: '#2563eb', outline: '2px solid #2563eb66', outlineOffset: 2 }} />
            <span style={{ fontSize: 11 }}>You</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CustChargingStations({ call }) {
  const { data: rawHubs, loading, error } = useFetch(call, '/hubs');
  const [userCoords,   setUserCoords]   = useState(null);
  const [locStatus,    setLocStatus]    = useState('idle');
  const [selectedHub,  setSelectedHub]  = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode,     setViewMode]     = useState('map'); // 'grid' | 'map'

  const hubs = React.useMemo(() => {
    if (!rawHubs) return [];
    let list = rawHubs.map((h, i) => {
      const coords = custGetCoords(h);
      const dist   = (userCoords && coords) ? haversineKm(userCoords, coords) : null;
      return { ...h, _coords: coords, _dist: dist, _rank: null };
    });
    if (statusFilter !== 'ALL') list = list.filter(h => h.status === statusFilter);
    if (userCoords) {
      list.sort((a, b) => {
        if (a._dist == null && b._dist == null) return 0;
        if (a._dist == null) return 1;
        if (b._dist == null) return -1;
        return a._dist - b._dist;
      });
    }
    return list.map((h, i) => ({ ...h, _rank: i }));
  }, [rawHubs, userCoords, statusFilter]);

  const getLocation = () => {
    if (!navigator.geolocation) { setLocStatus('denied'); return; }
    setLocStatus('getting');
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords([pos.coords.latitude, pos.coords.longitude]); setLocStatus('done'); },
      () => setLocStatus('denied'),
      { timeout: 10000 }
    );
  };

  if (loading && !rawHubs) return <Loader />;
  if (error   && !rawHubs) return <Err msg={error} />;

  const onlineCount = (rawHubs || []).filter(h => h.status === 'ONLINE').length;
  const offlineCount = (rawHubs || []).filter(h => h.status === 'OFFLINE').length;
  const maintCount = (rawHubs || []).filter(h => h.status === 'MAINTENANCE').length;
  const totalChargers = (rawHubs || []).reduce((s, h) => s + (h.chargerCount || 0), 0);

  const STATUS_CFG = {
    ONLINE:      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', label: 'Online',      icon: '🟢' },
    OFFLINE:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Offline',     icon: '🔴' },
    MAINTENANCE: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Maintenance', icon: '🟡' },
  };

  return (
    <div className="cs-page">
      {/* ── Hero Header ── */}
      <div className="cs-hero">
        <div className="cs-hero-content">
          <div className="cs-hero-tag">⚡ allEV Network</div>
          <h1 className="cs-hero-title">Charging Stations</h1>
          <p className="cs-hero-sub">Find the nearest EV charging hub across the allEV network</p>
          <div className="cs-hero-stats">
            <div className="cs-hero-stat"><span>{(rawHubs||[]).length}</span><label>Total Hubs</label></div>
            <div className="cs-hero-stat cs-hero-stat--online"><span>{onlineCount}</span><label>Online Now</label></div>
            <div className="cs-hero-stat"><span>{totalChargers}</span><label>Charger Slots</label></div>
          </div>
        </div>
        <div className="cs-hero-art">
          <div className="cs-hero-circle c1" />
          <div className="cs-hero-circle c2" />
          <div className="cs-hero-zap">⚡</div>
        </div>
      </div>

      {/* ── Location + Controls Bar ── */}
      <div className="cs-controls">
        <div className="cs-loc-section">
          {locStatus === 'idle' && (
            <button className="cs-loc-btn" onClick={getLocation}>
              <MapPin size={15} /> Use My Location
            </button>
          )}
          {locStatus === 'getting' && (
            <div className="cs-loc-status getting">
              <div className="cs-loc-spinner" />
              <span>Getting your location…</span>
            </div>
          )}
          {locStatus === 'done' && (
            <div className="cs-loc-status done">
              <span>📍 Sorted by distance</span>
              <button className="cs-loc-clear" onClick={() => { setUserCoords(null); setLocStatus('idle'); }}>✕ Clear</button>
            </div>
          )}
          {locStatus === 'denied' && (
            <div className="cs-loc-status denied">
              <span>❌ Location access denied</span>
              <button className="cs-loc-btn" onClick={getLocation} style={{marginLeft:8,padding:'4px 10px',fontSize:11}}>Retry</button>
            </div>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="cs-filter-pills">
          {[
            { id: 'ALL',         label: `All (${(rawHubs||[]).length})`,  color: '#2563eb'  },
            { id: 'ONLINE',      label: `Online (${onlineCount})`,        color: '#16a34a'  },
            { id: 'OFFLINE',     label: `Offline (${offlineCount})`,      color: '#dc2626'  },
            { id: 'MAINTENANCE', label: `Maintenance (${maintCount})`,    color: '#d97706'  },
          ].map(f => (
            <button
              key={f.id}
              className={`cs-pill${statusFilter === f.id ? ' active' : ''}`}
              style={statusFilter === f.id ? { '--pill-color': f.color } : {}}
              onClick={() => setStatusFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>

        {/* View toggle */}
        <div className="cs-view-toggle">
          <button className={`cs-view-btn${viewMode==='grid'?' active':''}`} onClick={()=>setViewMode('grid')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/><rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/></svg>
            Grid
          </button>
          <button className={`cs-view-btn${viewMode==='map'?' active':''}`} onClick={()=>setViewMode('map')}>
            <MapPin size={13}/> Map
          </button>
        </div>
      </div>

      {/* ── Map View ── */}
      {viewMode === 'map' && (
        <div style={{ marginBottom: 24 }}>
          <CustStationsMap hubs={hubs} userCoords={userCoords} selectedHub={selectedHub}
            onSelectHub={h => setSelectedHub(s => s?._id === h._id ? null : h)} />
          {selectedHub && (() => {
            const sc = STATUS_CFG[selectedHub.status] || STATUS_CFG.OFFLINE;
            const coords = custGetCoords(selectedHub);
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
                  {selectedHub._dist != null && (
                    <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
                      📏 {selectedHub._dist < 1 ? `${(selectedHub._dist * 1000).toFixed(0)} m` : `${selectedHub._dist.toFixed(1)} km`} away
                    </span>
                  )}
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
        </div>
      )}

      {/* ── Grid View ── */}
      {viewMode === 'grid' && (
        <div className="cs-hub-grid">
          {hubs.map((hub, i) => {
            const sc = STATUS_CFG[hub.status] || STATUS_CFG.OFFLINE;
            const isSelected = selectedHub?._id === hub._id;
            const coords = custGetCoords(hub);
            const mapsUrl = coords
              ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hub.address ? hub.address + ', ' : '') + (hub.city || ''))}`;
            const isNearest = userCoords && i === 0;
            return (
              <div
                key={hub._id}
                className={`cs-hub-card${isSelected ? ' selected' : ''}${isNearest ? ' nearest' : ''}`}
                onClick={() => setSelectedHub(s => s?._id === hub._id ? null : hub)}
                style={{ '--hub-color': sc.color }}
              >
                {/* Card top accent bar */}
                <div className="cs-hub-accent" style={{ background: sc.color }} />

                {/* Nearest badge */}
                {isNearest && <div className="cs-nearest-badge">📍 Nearest</div>}

                {/* Rank + Status */}
                <div className="cs-hub-top">
                  <div className="cs-hub-rank" style={{ background: isNearest ? sc.color : '#f3f4f6', color: isNearest ? '#fff' : '#6b7280' }}>
                    #{i + 1}
                  </div>
                  <div className="cs-hub-status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    <div className="cs-status-dot" style={{ background: sc.dot }} />
                    {sc.label}
                  </div>
                </div>

                {/* Hub name + city */}
                <div className="cs-hub-name">{hub.name}</div>
                <div className="cs-hub-city">
                  <MapPin size={12} />{hub.city}{hub.address ? ` · ${hub.address.substring(0, 30)}${hub.address.length>30?'…':''}` : ''}
                </div>

                {/* Chargers + distance */}
                <div className="cs-hub-meta">
                  <div className="cs-hub-chargers">
                    <Zap size={13} />
                    <strong>{hub.chargerCount ?? 0}</strong> charger{hub.chargerCount !== 1 ? 's' : ''}
                  </div>
                  {hub._dist != null && (
                    <div className="cs-hub-dist">
                      {hub._dist < 1 ? `${(hub._dist * 1000).toFixed(0)} m` : `${hub._dist.toFixed(1)} km`}
                    </div>
                  )}
                </div>

                {hub.code && <div className="cs-hub-code">🔖 {hub.code}</div>}

                {/* Actions */}
                <div className="cs-hub-actions">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="cs-hub-btn-maps">
                    <MapPin size={12} /> Open Maps
                  </a>
                  <button className="cs-hub-btn-view" onClick={e => { e.stopPropagation(); setViewMode('map'); setSelectedHub(hub); }}>
                    View on Map
                  </button>
                </div>
              </div>
            );
          })}
          {hubs.length === 0 && (
            <div className="cs-empty">
              <div className="cs-empty-icon">⚡</div>
              <div className="cs-empty-title">No stations found</div>
              <div className="cs-empty-sub">Try a different filter</div>
            </div>
          )}
        </div>
      )}

      {/* ── Hub Detail Panel (when selected in grid mode) ── */}
      {selectedHub && viewMode === 'grid' && (() => {
        const sc = STATUS_CFG[selectedHub.status] || STATUS_CFG.OFFLINE;
        const coords = custGetCoords(selectedHub);
        const mapsUrl = coords
          ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedHub.address ? selectedHub.address + ', ' : '') + (selectedHub.city || ''))}`;
        return (
          <div className="cs-detail-panel" onClick={e=>e.stopPropagation()}>
            <div className="cs-detail-inner">
              <div className="cs-detail-head" style={{ borderBottom: `3px solid ${sc.color}` }}>
                <div>
                  <div className="cs-detail-name">{selectedHub.name}</div>
                  <div className="cs-detail-city"><MapPin size={13}/>{selectedHub.city}</div>
                </div>
                <button className="cs-detail-close" onClick={() => setSelectedHub(null)}>✕</button>
              </div>
              <div className="cs-detail-body">
                <div className="cs-detail-stat-row">
                  <div className="cs-detail-stat">
                    <span>Status</span>
                    <strong style={{ color: sc.color }}>{sc.icon} {sc.label}</strong>
                  </div>
                  <div className="cs-detail-stat">
                    <span>Charger Slots</span>
                    <strong>⚡ {selectedHub.chargerCount ?? 0}</strong>
                  </div>
                  {selectedHub._dist != null && (
                    <div className="cs-detail-stat">
                      <span>Distance</span>
                      <strong>📏 {selectedHub._dist < 1 ? `${(selectedHub._dist * 1000).toFixed(0)} m` : `${selectedHub._dist.toFixed(1)} km`}</strong>
                    </div>
                  )}
                </div>
                {selectedHub.address && (
                  <div className="cs-detail-address">📍 {selectedHub.address}, {selectedHub.city}</div>
                )}
                {selectedHub.code && (
                  <div className="cs-detail-code">Hub Code: <strong>{selectedHub.code}</strong></div>
                )}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="cs-detail-maps-btn">
                  <MapPin size={14}/> Get Directions in Google Maps
                </a>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
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

function CustProfile({ call, setPage }) {
  const { data: user, loading, refresh } = useFetch(call, '/customer/profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAadhar, setShowAadhar] = useState(false);
  const [showPan, setShowPan] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name:'', email:'', phone:'', aadharNumber:'', panNumber:'', address:'' });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '', email: user.email || '', phone: user.phone || '',
      aadharNumber: user.aadharNumber || user.aadhar || '', panNumber: user.panNumber || user.pan || '',
      address: typeof user.address === 'string' ? user.address : (user.address?.line1 || user.address?.street || ''),
    });
  }, [user]);

  if (loading && !user) return <Loader />;
  const name = user?.name || 'Customer';
  const initial = name.trim().charAt(0).toUpperCase() || 'C';
  const profileImage = user?.profileImage;
  const masked = (value, visible) => {
    if (!value) return 'Not added';
    if (visible) return value;
    return value.length > 4 ? `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : '••••';
  };
  const setField = (key, value) => setForm(f => ({...f, [key]: value}));

  const saveProfile = async () => {
    setSaving(true); setMessage('');
    try {
      await call('/customer/profile', { method:'PATCH', data: form });
      setEditing(false); setMessage('Profile updated successfully'); refresh();
    } catch (e) { setMessage(e?.message || 'Could not update profile'); }
    finally { setSaving(false); }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Please choose an image file');
    setUploading(true); setMessage('');
    try {
      const fd = new FormData(); fd.append('profileImage', file);
      await call('/customer/profile/image', { method:'POST', data:fd, headers:{'Content-Type':'multipart/form-data'} });
      setMessage('Profile photo updated'); refresh();
    } catch (e) { setMessage(e?.message || 'Could not upload photo'); }
    finally { setUploading(false); }
  };

  const settings = user?.settings || {};
  const toggleSetting = async (key) => {
    try {
      await call('/customer/profile', { method:'PATCH', data:{ settings:{ ...settings, [key]: settings[key] !== true } } });
      refresh();
    } catch (e) { setMessage(e?.message || 'Could not update setting'); }
  };

  return (
    <div className="cust-profile-page premium-profile-page">
      <div className="profile-mobile-topbar">
        <button className="profile-back-icon" onClick={() => setPage('dashboard')} aria-label="Back to dashboard"><ArrowLeft size={21}/></button>
        <div><strong>Profile</strong><span>Account & settings</span></div>
        <div className="profile-topbar-spacer" />
      </div>

      <div className="profile-cover-card">
        <div className="profile-cover-glow" />
        <div className="profile-photo-wrap">
          <div className="profile-photo">
            {profileImage ? <img src={profileImage} alt="Profile" /> : <span>{initial}</span>}
          </div>
          <label className="profile-photo-edit" title="Change profile photo">
            <Camera size={15}/>
            <input type="file" accept="image/*" onChange={e => uploadPhoto(e.target.files?.[0])} />
          </label>
          {uploading && <div className="profile-photo-loading">Updating…</div>}
        </div>
        <div className="profile-cover-copy">
          <span className="profile-kicker"><ShieldCheck size={13}/> VERIFIED CUSTOMER</span>
          <h1>{name}</h1>
          <p>{user?.email || 'Add your email address'}</p>
          <div className="profile-cover-chips"><span>allEV Member</span><span>{user?.role || 'CUSTOMER'}</span></div>
        </div>
        <button className={`profile-edit-btn${editing ? ' active' : ''}`} onClick={() => setEditing(v => !v)}>
          <Pencil size={15}/>{editing ? 'Cancel' : 'Edit profile'}
        </button>
      </div>

      {message && <div className={`profile-message ${message.toLowerCase().includes('success') || message.toLowerCase().includes('updated') ? 'success' : 'error'}`}><Check size={16}/>{message}</div>}

      <section className="profile-section-card">
        <div className="profile-section-head"><div><span className="profile-section-eyebrow">PERSONAL INFORMATION</span><h2>Basic details</h2></div>{editing && <button className="profile-save-btn" onClick={saveProfile} disabled={saving}><Save size={16}/>{saving ? 'Saving…' : 'Save changes'}</button>}</div>
        <div className="profile-form-grid">
          {[
            ['name','Full name',user?.name,'Your full name',Users],
            ['email','Email address',user?.email,'Your email address',Mail],
            ['phone','Phone number',user?.phone,'Your phone number',Phone],
          ].map(([key,label,value,placeholder,Icon]) => (
            <label className="profile-input-field" key={key}><span>{label}</span><div className="profile-input-shell"><Icon size={17}/><input disabled={!editing || key==='email'} value={form[key] || ''} placeholder={placeholder} onChange={e=>setField(key,e.target.value)} /></div></label>
          ))}
          <label className="profile-input-field profile-field-wide"><span>Address</span><div className="profile-input-shell"><MapPinned size={17}/><input disabled={!editing} value={form.address || ''} placeholder="Add your address" onChange={e=>setField('address',e.target.value)} /></div></label>
        </div>
      </section>

      <section className="profile-section-card">
        <div className="profile-section-head"><div><span className="profile-section-eyebrow">KYC & IDENTITY</span><h2>Identity details</h2></div><span className="profile-secure-pill"><ShieldCheck size={14}/> Secure</span></div>
        <div className="profile-kyc-grid">
          <div className="profile-kyc-card"><div className="profile-kyc-icon blue"><CreditCard size={19}/></div><div><span>Aadhaar number</span><strong>{masked(user?.aadharNumber || user?.aadhar, showAadhar)}</strong></div><button onClick={()=>setShowAadhar(v=>!v)} aria-label="Show Aadhaar"><>{showAadhar?<EyeOff size={17}/>:<Eye size={17}/>}</></button></div>
          <div className="profile-kyc-card"><div className="profile-kyc-icon violet"><CreditCard size={19}/></div><div><span>PAN card</span><strong>{masked(user?.panNumber || user?.pan, showPan)}</strong></div><button onClick={()=>setShowPan(v=>!v)} aria-label="Show PAN"><>{showPan?<EyeOff size={17}/>:<Eye size={17}/>}</></button></div>
        </div>
        {editing && <div className="profile-kyc-edit-grid"><label className="profile-input-field"><span>Aadhaar number</span><input value={form.aadharNumber} onChange={e=>setField('aadharNumber',e.target.value)} placeholder="12-digit Aadhaar" maxLength={12}/></label><label className="profile-input-field"><span>PAN card</span><input value={form.panNumber} onChange={e=>setField('panNumber',e.target.value.toUpperCase())} placeholder="PAN number" maxLength={10}/></label></div>}
      </section>

      <section className="profile-section-card">
        <div className="profile-section-head"><div><span className="profile-section-eyebrow">PREFERENCES</span><h2>Settings</h2></div><SlidersHorizontal size={19} className="profile-muted-icon"/></div>
        <div className="profile-setting-list">
          {[
            ['notifications','Notifications','Get updates about orders, payments and charging.','🔔',BellRing],
            ['securityAlerts','Security alerts','Receive important account and login alerts.','🛡️',ShieldCheck],
            ['offers','EV offers','Receive useful EV offers and service updates.','✨',Sparkles],
          ].map(([key,title,sub,emoji,Icon]) => <button className="profile-setting-row" key={key} onClick={()=>toggleSetting(key)}><span className="profile-setting-icon">{emoji}</span><span className="profile-setting-copy"><strong>{title}</strong><small>{sub}</small></span><span className={`profile-switch ${settings[key] !== false ? 'on' : ''}`}><i/></span></button>)}
        </div>
      </section>

      <section className="profile-section-card profile-account-card">
        <div className="profile-account-row"><div className="profile-account-icon"><LockKeyhole size={18}/></div><div><strong>Account security</strong><span>Password, login protection and account access</span></div><span className="profile-arrow">›</span></div>
        <div className="profile-account-row"><div className="profile-account-icon"><FileText size={18}/></div><div><strong>Documents & invoices</strong><span>Your purchase records and billing documents</span></div><span className="profile-arrow">›</span></div>
        <div className="profile-account-row"><div className="profile-account-icon"><Bell size={18}/></div><div><strong>Notification centre</strong><span>View all account notifications</span></div><span className="profile-arrow">›</span></div>
      </section>
    </div>
  );
}