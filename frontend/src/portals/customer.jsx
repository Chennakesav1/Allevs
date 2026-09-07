import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText,
  Sparkles, Battery, Gauge as GaugeIcon, Image, Plus
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
    { id: 'bookings',            label: 'Bookings',           Icon: ClipboardList },
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

// ── useFetch hook ──────────────────────────────────────────────────
function useFetch(call, path) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tick, setTick]       = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    call(path)
      .then(d  => { if (alive) setData(d); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, tick]);
  const refresh = () => setTick(t => t + 1);
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
  };

  const logout = () => {
    localStorage.removeItem('ev_customer_token');
    localStorage.removeItem('ev_customer_refresh_token');
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
          <div className="logo-icon"><Zap size={22} /></div>
          <span className="logo-text">EV CORE</span>
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
          <PageRouter page={page} call={call} setPage={setPage} />
        </div>
      </div>
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
      dashboard:            <CustDashboard        {...P} />,
      'available-vehicles': <CustAvailableVehicles {...P} />,
      vehicles:             <CustVehicles          {...P} />,
      bookings:             <CustBookings          {...P} />,
      wallet:               <CustWallet            {...P} />,
      invoices:             <CustInvoices          {...P} />,
      complaints:           <CustComplaints        {...P} />,
      'charging-stations':  <CustChargingStations  {...P} />,
    };
    return <ErrorBoundary key={page}>{pages[page] || pages.dashboard}</ErrorBoundary>;
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
  const { data: owned, loading: lo, error: eo } = useFetch(call, '/customer/vehicles');
  const [rentals, setRentals]   = useState([]);
  const [rentLoading, setRL]    = useState(true);
  const [extendRental, setExtendRental] = useState(null);
  const { toast, show } = useToast();

  useEffect(() => {
    call('/customer/rentals')
      .then(d => setRentals(Array.isArray(d) ? d : []))
      .catch(() => setRentals([]))
      .finally(() => setRL(false));
  }, []);

  if (lo || rentLoading) return <Loader />;

  const activeRentals = rentals.filter(r => r.status === 'ACTIVE'); // Only truly delivered vehicles
  const pastRentals   = rentals.filter(r => ['COMPLETED','CANCELLED'].includes(r.status));

  return <>
    <Toast toast={toast}/>
    <PageHeader title="My Vehicles" sub="Rented and owned EV vehicles." />

    {/* Active Rentals */}
    {activeRentals.length > 0 && (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1f2e', marginBottom: 10 }}>
          🚗 Active Rentals ({activeRentals.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeRentals.map(r => {
            const vs = r.vehicleSnapshot || {};
            const sc = r.status === 'ACTIVE' ? '#16a34a' : r.status === 'PAYMENT_DONE' ? '#2563eb' : '#d97706';
            const statusLabel = {
              PAYMENT_DONE: '💳 Payment Done — Awaiting Handover',
              HANDOVER_PENDING: '⏳ Handover Pending',
              ACTIVE: '✅ Active — Vehicle Delivered',
            }[r.status] || r.status;
            return (
              <div key={r._id} style={{
                background: '#fff', border: `1.5px solid ${sc}44`, borderRadius: 14,
                padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1f2e' }}>
                      {vs.make} {vs.model} ({vs.year})
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{vs.category} · {vs.color}</div>
                  </div>
                  <span style={{ background: sc + '18', color: sc, borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Vehicle images */}
                {vs.images?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>
                    {vs.images.map((img, i) => (
                      <img key={i} src={img.url} alt={img.name}
                        style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #e4e7ef' }} />
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '6px 16px' }}>
                  {[
                    ['Reg. No.',       vs.registrationNo || '—'],
                    ['Battery',        vs.batteryCapacityKwh ? `${vs.batteryCapacityKwh} kWh` : '—'],
                    ['Range',          vs.rangeKm ? `${vs.rangeKm} km` : '—'],
                    ['Rate',           `₹${r.pricePerDay}/day`],
                    ['Duration',       `${r.durationDays} day${r.durationDays !== 1 ? 's' : ''}`],
                    ['Start Date',     r.startDate ? new Date(r.startDate).toLocaleDateString('en-IN') : '—'],
                    ['End Date',       r.endDate   ? new Date(r.endDate).toLocaleDateString('en-IN')   : '—'],
                    ['Total Paid',     `₹${(r.totalAmount || 0).toLocaleString('en-IN')}`],
                    ['Franchisee Location', [r.pickupLocation?.name || r.franchiseeName, r.pickupLocation?.address].filter(Boolean).join(' · ') || '—'],
                    ...(r.handoverDate ? [['Handover Date', new Date(r.handoverDate).toLocaleDateString('en-IN')]] : []),
                    ...(r.returnDate  ? [['Returned Date', new Date(r.returnDate).toLocaleDateString('en-IN')]]   : []),
                  ].map(([k, v]) => (
                    <div key={k} style={{ fontSize: 13 }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: 11 }}>{k}</span>
                      <strong style={{ color: '#1a1f2e' }}>{v}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-primary" onClick={() => setExtendRental(r)} disabled={r.status !== 'ACTIVE'}>
                    <Plus size={15}/> Extend Rental
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {extendRental && (
      <ExtendRentalFlow
        rental={extendRental}
        call={call}
        onClose={() => setExtendRental(null)}
        onSuccess={(updated) => {
          setRentals(prev => prev.map(x => String(x._id) === String(updated._id) ? updated : x));
          setExtendRental(null);
          show('Rental extended successfully.');
        }}
      />
    )}

    {/* Owned Vehicles */}
    {(owned?.length ?? 0) > 0 && (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1f2e', marginBottom: 10 }}>
          🔑 My Registered Vehicles ({owned.length})
        </div>
        <Card>
          <DataTable rows={owned} cols={['vin', 'model', 'year', 'batterySoc', 'batterySoh', 'status']} />
        </Card>
      </div>
    )}

    {/* Past Rentals */}
    {pastRentals.length > 0 && (
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1f2e', marginBottom: 10 }}>
          📋 Past Rentals ({pastRentals.length})
        </div>
        <Card>
          <DataTable
            rows={pastRentals.map(r => ({
              ...r,
              vehicle: `${r.vehicleSnapshot?.make || ''} ${r.vehicleSnapshot?.model || ''}`.trim() || '—',
              amount:  `₹${(r.totalAmount || 0).toLocaleString('en-IN')}`,
              start:   r.startDate ? new Date(r.startDate).toLocaleDateString('en-IN') : '—',
              end:     r.endDate   ? new Date(r.endDate).toLocaleDateString('en-IN')   : '—',
            }))}
            cols={['vehicle', 'status', 'amount', 'start', 'end']}
          />
        </Card>
      </div>
    )}

    {(owned?.length ?? 0) === 0 && rentals.length === 0 && (
      <div className="card">
        <div className="empty-state">
          <Car size={40} style={{ opacity: .25, marginBottom: 12 }} />
          <p>No vehicles yet.<br />Browse Available Vehicles to make your first booking!</p>
        </div>
      </div>
    )}
  </>;
}

function CustBookings({ call, setPage }) {
  const [rentals, setRentals] = useState([]);
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    call('/customer/rentals')
      .then(d => setRentals(Array.isArray(d) ? d : []))
      .catch(() => setRentals([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const bookings = rentals.filter(r => !['COMPLETED', 'CANCELLED'].includes(r.status));
  const statusColor = { BOOKED: '#d97706', PAYMENT_DONE: '#2563eb', HANDOVER_PENDING: '#7c3aed' };
  const statusLabel = {
    BOOKED:           '🕐 Booked — Awaiting Payment',
    PAYMENT_DONE:     '💳 Paid — Awaiting Franchise Handover',
    HANDOVER_PENDING: '⏳ Handover Pending',
    ACTIVE:            '✅ Handed Over — Rental Active',
  };

  return <>
    <PageHeader title="My Bookings" sub="Your customer location is recorded for the booking; pickup and handover happen only at the selected franchisee." />
    <MetricGrid metrics={[
      { label: 'Total Bookings',    value: bookings.length, Icon: ClipboardList, color: '#2563eb' },
      { label: 'Awaiting Handover', value: bookings.filter(r => r.status === 'PAYMENT_DONE').length, Icon: Car, color: '#7c3aed' },
    ]} />
    {bookings.length === 0 ? (
      <div className="card">
        <div className="empty-state">
          <ClipboardList size={40} style={{ opacity: .25, marginBottom: 12 }} />
          <p>No active bookings.<br />Once you pay for a rental it appears here until the vehicle is handed over.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setPage('available-vehicles')}>
            Browse Vehicles
          </button>
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bookings.map(r => {
          const vs = r.vehicleSnapshot || {};
          const sc = statusColor[r.status] || '#64748b';
          return (
            <div key={r._id} style={{
              background: '#fff', border: `1.5px solid ${sc}33`, borderRadius: 14,
              padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1f2e' }}>{vs.make} {vs.model} ({vs.year})</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{vs.category} · {vs.color} · {vs.registrationNo}</div>
                </div>
                <span style={{ background: sc + '18', color: sc, borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', height: 'fit-content' }}>
                  {statusLabel[r.status] || r.status}
                </span>
              </div>
              {vs.images?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>
                  {vs.images.slice(0,3).map((img, i) => (
                    <img key={i} src={img.url} alt={img.name}
                      style={{ width: 90, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #e4e7ef' }} />
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: '6px 16px' }}>
                {[
                  ['Duration',   `${r.durationDays} day${r.durationDays !== 1 ? 's' : ''}`],
                  ['Start Date', r.startDate ? new Date(r.startDate).toLocaleDateString('en-IN') : '—'],
                  ['End Date',   r.endDate   ? new Date(r.endDate).toLocaleDateString('en-IN')   : '—'],
                  ['Rate',       `\u20b9${r.pricePerDay}/day`],
                  ['Total Paid', `\u20b9${(r.totalAmount || 0).toLocaleString('en-IN')}`],
                  ['Customer Location', r.fullAddress || [r.area, r.district, r.state, r.pincode].filter(Boolean).join(', ')],
                  ['Payment ID', r.razorpayPaymentId || '—'],
                  ['Booked On',  new Date(r.createdAt).toLocaleDateString('en-IN')],
                  ['Handover Date', r.handoverDate ? new Date(r.handoverDate).toLocaleDateString('en-IN') : 'Pending'],
                  ['Pickup Location', [r.pickupLocation?.name || r.franchiseeName, r.pickupLocation?.address].filter(Boolean).join(' · ') || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: 13 }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: 11 }}>{k}</span>
                    <strong style={{ color: '#1a1f2e', wordBreak: 'break-all' }}>{v}</strong>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', background: r.handoverDate ? '#f0fdf4' : '#fefce8', border: `1px solid ${r.handoverDate ? '#bbf7d0' : '#fde68a'}`, borderRadius: 8, fontSize: 13, color: r.handoverDate ? '#166534' : '#92400e' }}>
                {r.handoverDate
                  ? <>✅ Vehicle handed over on <strong>{new Date(r.handoverDate).toLocaleDateString('en-IN')}</strong>. Rental is active.</>
                  : <>⏳ Your payment is confirmed. The franchisee will handover your vehicle.</>}
              </div>
              {r.pickupLocation && (r.pickupLocation.lat || r.pickupLocation.lng) && (
                <button className="btn-primary" style={{marginTop:10,display:'inline-flex',alignItems:'center',gap:7}}
                  onClick={() => setPickup(r.pickupLocation)}>
                  <MapPin size={15}/> Go to Pickup Location
                </button>
              )}
            </div>
          );
        })}
      </div>
    )}
    {pickup && <PickupLocationMap location={pickup} onClose={()=>setPickup(null)} />}
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(map);
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
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [downloading, setDL]    = useState(null);

  useEffect(() => {
    call('/customer/rentals/invoices')
      .then(d => setInvoices(Array.isArray(d) ? d : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (inv) => {
    setDL(inv._id);
    try {
      const token = localStorage.getItem('ev_customer_token');
      const res = await fetch(`/api/customer/rentals/invoices/${inv._id}/download`, {
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

  if (loading) return <Loader />;

  const fmt = (n) => `\u20b9${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const date = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return <>
    <PageHeader title="Invoices" sub="Rental payment invoices. Download as HTML and print/save as PDF from your browser." />
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
                {inv.items?.[0]?.description || 'Vehicle Rental'}
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

  const activeVehicles = options?.activeVehicles || [];
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

  if (loading) return <Loader />;
  if (error) return <Err msg={error} />;
  return <>
    <Toast toast={toast}/>
    <PageHeader title="Support & Complaints" sub="Register a complaint against an active vehicle and track franchisee resolution."
      actions={<button className="btn-primary" onClick={()=>setOpen(true)} disabled={!activeVehicles.length}><Plus size={15}/> Register Complaint</button>} />
    {!activeVehicles.length && <InfoBanner Icon={Bell}>You need an active vehicle before you can register a vehicle complaint.</InfoBanner>}
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
              <span style={{fontSize:11,fontWeight:700,color:'#166534',display:'block',marginBottom:4}}>FRANCHISEE (auto-filled from rental)</span>
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
  const [bookingVehicle, setBookingVehicle] = useState(null);
  const [location, setLocation] = useState(null);
  const [nearbyFranchisees, setNearbyFranchisees] = useState([]);
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState('');

  // FIX: Fetch approved vehicles from the API (MongoDB) instead of
  // localStorage. The Command Center writes approvals to MongoDB via
  // PUT /api/admin/pending-vehicles/:id/approve — localStorage is
  // never updated, so the customer portal was always seeing nothing.
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const profile = await call('/customer/profile');
        const pin = profile?.address?.pincode || '';
        const list = await call(`/customer/available-vehicles${pin ? `?pincode=${encodeURIComponent(pin)}` : ''}`);
        setVehicles(Array.isArray(list) ? list : []);
        setLocation(profile?.address || null);
        const opt = await call(`/customer/complaint-options${pin ? `?pincode=${encodeURIComponent(pin)}` : ''}`);
        setNearbyFranchisees(opt?.franchisees || []);
      } catch { setVehicles([]); }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 10000); // refresh every 10 s
    return () => clearInterval(interval);
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

  return <>
    <PageHeader title="Available Vehicles" sub={location?.pincode ? `Vehicles near your location · ${location.pincode}${location.district ? ` · ${location.district}` : ''}` : 'Vehicles available across the EV CORE network'} />

    {location?.pincode && (
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
        <span style={{background:'#eff6ff',border:'1px solid #bfdbfe',color:'#1d4ed8',padding:'6px 11px',borderRadius:999,fontSize:12,fontWeight:700}}>📍 Pincode {location.pincode}</span>
        <span style={{fontSize:12,color:'#64748b'}}>Showing inventory from franchisees closest to your pincode.</span>
        {availableFranchisees.length > 0 && (
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',width:'100%'}}>
            <span style={{fontSize:12,color:'#64748b',fontWeight:700}}>Nearest available franchise:</span>
            {availableFranchisees.map((fr, i) => {
              const active = String(fr._id) === String(selectedFranchiseeId);
              return (
                <button key={fr._id} type="button" onClick={() => setSelectedFranchiseeId(String(fr._id))}
                  style={{fontSize:12,fontWeight:700,color:active?'#fff':'#1d4ed8',background:active?'#2563eb':'#fff',border:`1px solid ${active?'#2563eb':'#bfdbfe'}`,borderRadius:999,padding:'6px 11px',cursor:'pointer'}}>
                  {i === 0 ? '📍 ' : '🏪 '}{fr.name}{fr.address?.pincode ? ` · ${fr.address.pincode}` : ''}
                </button>
              );
            })}
          </div>
        )}
        {selectedFranchisee && (
          <div style={{width:'100%',marginTop:2,padding:'8px 11px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,color:'#475569'}}>
            <strong>Booking from:</strong> {selectedFranchisee.name} · {selectedFranchisee.address?.city || selectedFranchisee.address?.district || ''}{selectedFranchisee.address?.pincode ? ` · PIN ${selectedFranchisee.address.pincode}` : ''}
            <span style={{marginLeft:6,color:'#64748b'}}>The vehicle will be handed over only by this franchisee.</span>
          </div>
        )}
      </div>
    )}

    {/* Category filter tabs */}
    <div className="filter-tabs">
      {categories.map(c => (
        <button key={c} className={'filter-tab' + (filterCat === c ? ' active' : '')}
          onClick={() => setFilterCat(c)}>
          {c === 'all' ? 'All Vehicles' : `${catEmoji[c]} ${c}`}
        </button>
      ))}
    </div>

    {filtered.length === 0 ? (
      <div className="card">
        <div className="empty-state">
          <Car size={40} style={{ opacity: .25, marginBottom: 12 }} />
          <p>No vehicles available in this category yet.<br />Check back soon — franchisees are adding vehicles regularly.</p>
        </div>
      </div>
    ) : (
      <div className="vehicle-browse-grid">
        {filtered.map(v => (
          <div key={v._id || v.id} className="vehicle-browse-card" onClick={() => setSelected(v)}>
            <div className="vbc-img">
              {v.images?.length > 0
                ? <img src={v.images[0].url} alt={v.make} />
                : <div className="vbc-no-img">{catEmoji[v.category] || '🚗'}</div>
              }
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
              <div style={{fontSize:11,color:'#16a34a',fontWeight:700,marginBottom:4}}>{v.quantity} unit{Number(v.quantity)===1?'':'s'} available · {v.franchiseeName || 'EV CORE franchise'}</div>
              <div className="vbc-price">
                <span className="price-amt">₹{v.pricePerDay}</span>
                <span className="price-unit">/day</span>
              </div>
            </div>
            <button className="vbc-btn">View Details</button>
          </div>
        ))}
      </div>
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
                ['Battery', `${selected.batteryCapacityKwh} kWh`],
                ['Range', `${selected.rangeKm} km`],
                ['Charging', selected.chargingType],
                ['Price/Day', `₹${selected.pricePerDay}`],
                ['Availability', `${selected.quantity ?? 0} unit(s) available`],
                ['Franchisee', selected.franchiseeName || 'EV CORE franchise'],
              ].map(([k, v]) => v && (
                <div className="kv-row" key={k}><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
            {selected.description && <p style={{ fontSize: 13, color: '#374151', marginTop: 12, lineHeight: 1.6 }}>{selected.description}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => setSelected(null)}>Close</button>
            <button className="btn-primary" onClick={() => setBookingVehicle(selected)}>Book Now</button>
          </div>
        </div>
      </div>
    )}

    {/* Booking Flow Modal */}
    {bookingVehicle && (
      <BookingFlow
        vehicle={bookingVehicle}
        call={call}
        onClose={() => setBookingVehicle(null)}
        onSuccess={() => { setBookingVehicle(null); setSelected(null); setPage('bookings'); }}
      />
    )}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// EXTEND RENTAL FLOW: select days → Razorpay → verify → extend plan
// ══════════════════════════════════════════════════════════════════
function ExtendRentalFlow({ rental, call, onClose, onSuccess }) {
  const [days, setDays] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const amount = Number(rental.pricePerDay || 0) * Number(days || 0);
  const currentEnd = rental.endDate ? new Date(rental.endDate) : new Date();
  const previewEnd = new Date(currentEnd.getTime() + Number(days || 0) * 86400000);

  const payAndExtend = async () => {
    const extraDays = Number(days);
    if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 30) {
      setMsg({ type: 'error', text: 'Choose between 1 and 30 additional days.' });
      return;
    }
    if (amount <= 0) { setMsg({ type: 'error', text: 'This rental has no valid daily rate.' }); return; }
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const order = await call(`/customer/rentals/${rental._id}/extend/create-order`, {
        method: 'POST', data: { days: extraDays },
      });
      if (!window.Razorpay) {
        setMsg({ type: 'error', text: 'Razorpay SDK not loaded. Please check your internet connection.' });
        setBusy(false); return;
      }
      const options = {
        key: order.keyId, amount: order.amount, currency: order.currency || 'INR',
        name: 'EV Core',
        description: `Extend ${rental.vehicleSnapshot?.make || ''} ${rental.vehicleSnapshot?.model || ''} by ${extraDays} day(s)`,
        order_id: order.orderId, redirect: false,
        handler: async (response) => {
          try {
            const result = await call(`/customer/rentals/${rental._id}/extend/verify-payment`, {
              method: 'POST',
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            onSuccess(result.rental);
          } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Extension payment verification failed.' });
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false), escape: false, backdropclose: false },
        theme: { color: '#2563eb' },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', resp => {
        setMsg({ type: 'error', text: 'Payment failed: ' + (resp.error?.description || 'Please try again.') });
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Could not create extension payment.' });
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width: 'min(520px,100%)' }}>
        <div className="modal-head">
          <div><div className="modal-title">Extend Rental</div><div className="modal-subtitle">Payment is required before the plan is extended.</div></div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <Msg type={msg.type} text={msg.text} />
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:14, marginBottom:14 }}>
            <strong>{rental.vehicleSnapshot?.make} {rental.vehicleSnapshot?.model}</strong>
            <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>Current end date: {currentEnd.toLocaleDateString('en-IN')}</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>Daily rate: ₹{Number(rental.pricePerDay || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="login-form">
            <label>Additional days *
              <input type="number" min="1" max="30" value={days} onChange={e => setDays(e.target.value)} />
            </label>
          </div>
          <div style={{ marginTop:14, padding:14, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span>Extension charge</span><strong>₹{amount.toLocaleString('en-IN')}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginTop:7 }}><span>New end date</span><strong>{previewEnd.toLocaleDateString('en-IN')}</strong></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={payAndExtend}>
            {busy ? 'Processing…' : `Pay ₹${amount.toLocaleString('en-IN')} & Extend`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// BOOKING FLOW: Pincode → State/District/Area → Razorpay → Success
// ══════════════════════════════════════════════════════════════════
function BookingFlow({ vehicle, call, onClose, onSuccess }) {
  const [step, setStep] = useState('address'); // 'address' | 'dates' | 'payment' | 'success'
  const [pincode, setPincode]     = useState('');
  const [addrData, setAddrData]   = useState(null); // { state, district, area }
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError]     = useState('');
  const [area, setArea]           = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [busy, setBusy]           = useState(false);
  const [msg, setMsg]             = useState({ type: '', text: '' });
  const [successData, setSuccessData] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Calculate days
  const durationDays = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diff = (new Date(endDate) - new Date(startDate)) / 86400000;
    return diff > 0 ? Math.ceil(diff) : 0;
  }, [startDate, endDate]);

  // Lookup pincode via India Post API
  const lookupPincode = async (pin) => {
    if (pin.length !== 6) return;
    setPincodeLoading(true); setPincodeError(''); setAddrData(null);
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await resp.json();
      if (json[0]?.Status === 'Success' && json[0]?.PostOffice?.length > 0) {
        const po = json[0].PostOffice[0];
        setAddrData({ state: po.State, district: po.District, area: po.Region || po.Block || '' });
        setArea(po.Name || '');
      } else {
        setPincodeError('Invalid pincode or no data found.');
      }
    } catch {
      setPincodeError('Could not lookup pincode. Please try again.');
    } finally { setPincodeLoading(false); }
  };

  const handlePincodeChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
    if (cleaned.length === 6) lookupPincode(cleaned);
    else { setAddrData(null); setPincodeError(''); }
  };

  const handleAddressNext = () => {
    if (!pincode || pincode.length !== 6) { setMsg({ type: 'error', text: 'Enter a valid 6-digit pincode.' }); return; }
    if (!addrData) { setMsg({ type: 'error', text: 'Wait for pincode lookup to complete.' }); return; }
    setMsg({ type: '', text: '' });
    setStep('dates');
  };

  const handleDatesNext = () => {
    if (!startDate) { setMsg({ type: 'error', text: 'Please select a start date.' }); return; }
    if (!endDate) { setMsg({ type: 'error', text: 'Please select an end date.' }); return; }
    if (durationDays <= 0) { setMsg({ type: 'error', text: 'End date must be after start date.' }); return; }
    setMsg({ type: '', text: '' });
    setStep('payment');
  };

  const initiatePayment = async () => {
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      // Create Razorpay order via backend
      const orderRes = await call('/customer/rentals/create-order', {
        method: 'POST',
        data: {
          vehicleId:   vehicle._id,
          franchiseeId: vehicle.franchiseeId,
          pincode,
          state:       addrData?.state,
          district:    addrData?.district,
          area:        area || addrData?.area,
          fullAddress: `${area || addrData?.area}, ${addrData?.district}, ${addrData?.state} - ${pincode}`,
          startDate,
          endDate,
          durationDays,
        },
      });

      const { rentalId, orderId, amount, currency, keyId } = orderRes;

      // Open Razorpay checkout
      const options = {
        key:         keyId,
        amount,
        currency,
        name:        'EV Core',
        description: `${vehicle.make} ${vehicle.model} rental for ${durationDays} day(s)`,
        order_id:    orderId,
        handler: async (response) => {
          // Verify payment on backend
          try {
            await call('/customer/rentals/verify-payment', {
              method: 'POST',
              data: {
                rentalId,
                razorpay_order_id:    response.razorpay_order_id,
                razorpay_payment_id:  response.razorpay_payment_id,
                razorpay_signature:   response.razorpay_signature,
              },
            });
            setSuccessData({
              rentalId,
              vehicleName: `${vehicle.make} ${vehicle.model}`,
              amount: (amount / 100).toLocaleString('en-IN'),
              days: durationDays,
              startDate, endDate,
              address: `${area || addrData?.area}, ${addrData?.district}, ${addrData?.state} - ${pincode}`,
              pickup: [vehicle.franchiseeName, vehicle.franchiseeAddress ? [vehicle.franchiseeAddress.line1, vehicle.franchiseeAddress.line2, vehicle.franchiseeAddress.city, vehicle.franchiseeAddress.district, vehicle.franchiseeAddress.state, vehicle.franchiseeAddress.pincode].filter(Boolean).join(', ') : ''].filter(Boolean).join(' · '),
              paymentId: response.razorpay_payment_id,
            });
            setStep('success');
          } catch (e) {
            setMsg({ type: 'error', text: 'Payment verification failed. Contact support with payment ID: ' + response.razorpay_payment_id });
          }
        },
        prefill: {},
        theme: { color: '#2563eb' },
        redirect: false,
        modal: {
          ondismiss:  () => { setBusy(false); },
          escape:     false,
          backdropclose: false,
        },
      };

      if (!window.Razorpay) {
        setMsg({ type: 'error', text: 'Razorpay SDK not loaded. Please check your internet connection.' });
        setBusy(false);
        return;
      }
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setMsg({ type: 'error', text: 'Payment failed: ' + resp.error.description });
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Could not create booking. Please try again.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={e => e.stopPropagation()} style={{ width: 'min(560px,100%)' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">
              {step === 'success' ? '🎉 Booking Confirmed!' : `Book — ${vehicle.make} ${vehicle.model}`}
            </div>
            <div className="modal-subtitle">
              {step === 'address' && 'Step 1 of 3 — Customer Location'}
              {step === 'dates'   && 'Step 2 of 3 — Rental Duration'}
              {step === 'payment' && 'Step 3 of 3 — Payment'}
              {step === 'success' && 'Your booking is live!'}
            </div>
          </div>
          {step !== 'success' && <button className="icon-btn" onClick={onClose}>✕</button>}
        </div>

        <div className="modal-body">
          <Msg type={msg.type} text={msg.text} />

          {/* ── STEP 1: Address ── */}
          {step === 'address' && (
            <div className="login-form">
              <label>Pincode *
                <div style={{ position: 'relative' }}>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={pincode} onChange={e => handlePincodeChange(e.target.value)}
                    placeholder="6-digit pincode"
                    style={{ paddingRight: 36 }}
                  />
                  {pincodeLoading && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>⏳</span>
                  )}
                  {addrData && !pincodeLoading && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>✅</span>
                  )}
                </div>
                {pincodeError && <span style={{ color: '#dc2626', fontSize: 12 }}>{pincodeError}</span>}
              </label>
              {addrData && (
                <>
                  <label>State
                    <input type="text" value={addrData.state} readOnly
                      style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
                  </label>
                  <label>District
                    <input type="text" value={addrData.district} readOnly
                      style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
                  </label>
                  <label>Area / Locality
                    <input type="text" value={area} onChange={e => setArea(e.target.value)}
                      placeholder="Enter your area or locality" />
                  </label>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: Dates ── */}
          {step === 'dates' && (
            <div className="login-form">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>
                  📍 Pickup: {vehicle.franchiseeName || 'Selected Franchisee'}
                </div>
                {vehicle.franchiseeAddress && <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                  {[vehicle.franchiseeAddress.line1, vehicle.franchiseeAddress.line2, vehicle.franchiseeAddress.city, vehicle.franchiseeAddress.district, vehicle.franchiseeAddress.state, vehicle.franchiseeAddress.pincode].filter(Boolean).join(', ')}
                </div>}
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                  📍 Customer Location: {area || addrData?.area}, {addrData?.district}, {addrData?.state} - {pincode}
                </div>
              </div>
              <label>Start Date *
                <input type="date" value={startDate} min={today}
                  onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value >= endDate) setEndDate(''); }} />
              </label>
              <label>End Date *
                <input type="date" value={endDate} min={startDate || today}
                  onChange={e => setEndDate(e.target.value)} />
              </label>
              {durationDays > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
                    📅 {durationDays} day{durationDays !== 1 ? 's' : ''} rental
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1f2e', marginTop: 4 }}>
                    ₹{(vehicle.pricePerDay * durationDays).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>₹{vehicle.pricePerDay}/day × {durationDays} days</div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Payment summary ── */}
          {step === 'payment' && (
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e4e7ef', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1f2e', marginBottom: 12 }}>Booking Summary</div>
                {[
                  ['Vehicle',  `${vehicle.make} ${vehicle.model} (${vehicle.year})`],
                  ['Category', vehicle.category],
                  ['Duration', `${durationDays} day${durationDays !== 1 ? 's' : ''} (${startDate} → ${endDate})`],
                  ['Customer Location', `${area || addrData?.area}, ${addrData?.district}, ${addrData?.state} - ${pincode}`],
                  ['Rate',     `₹${vehicle.pricePerDay}/day`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>{k}</span>
                    <strong style={{ color: '#1a1f2e', textAlign: 'right', maxWidth: '60%' }}>{v}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 16, fontWeight: 800, color: '#1a1f2e', marginTop: 4 }}>
                  <span>Total</span>
                  <span style={{ color: '#2563eb' }}>₹{(vehicle.pricePerDay * durationDays).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                🔒 Secure payment powered by Razorpay
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === 'success' && successData && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#1a1f2e', marginBottom: 6 }}>
                Booking Confirmed!
              </div>
              <div style={{ color: '#16a34a', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                ✅ Payment of ₹{successData.amount} received
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', textAlign: 'left', marginBottom: 16 }}>
                {[
                  ['Vehicle',    successData.vehicleName],
                  ['Duration',   `${successData.days} day${successData.days !== 1 ? 's' : ''}`],
                  ['Dates',      `${successData.startDate} → ${successData.endDate}`],
                  ['Customer Location', successData.address],
                  ['Pickup Location', successData.pickup || vehicle.franchiseeName || '—'],
                  ['Payment ID', successData.paymentId],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #d1fae5' }}>
                    <span style={{ color: '#64748b' }}>{k}</span>
                    <strong style={{ color: '#1a1f2e', textAlign: 'right', maxWidth: '65%', wordBreak: 'break-all' }}>{v}</strong>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                Payment is confirmed. Go to the selected franchisee pickup location for vehicle handover. The selected franchisee alone can mark the handover.<br />
                You can track the handover date in <strong>My Bookings</strong> and the active rental in <strong>My Vehicles</strong>.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'address' && (
            <>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleAddressNext} disabled={!addrData || pincodeLoading}>
                Continue →
              </button>
            </>
          )}
          {step === 'dates' && (
            <>
              <button className="btn-ghost" onClick={() => setStep('address')}>← Back</button>
              <button className="btn-primary" onClick={handleDatesNext} disabled={durationDays <= 0}>
                Review Booking →
              </button>
            </>
          )}
          {step === 'payment' && (
            <>
              <button className="btn-ghost" onClick={() => setStep('dates')}>← Back</button>
              <button className="btn-primary" onClick={initiatePayment} disabled={busy}>
                {busy ? 'Processing…' : `Pay ₹${(vehicle.pricePerDay * durationDays).toLocaleString('en-IN')}`}
              </button>
            </>
          )}
          {step === 'success' && (
            <button className="btn-primary" style={{ width: '100%' }} onClick={onSuccess}>
              View My Bookings →
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18,
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
    });
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
  const { data: rawHubs, loading, error } = useFetch(call, '/customer/hubs');
  const [userCoords,   setUserCoords]   = useState(null);
  const [locStatus,    setLocStatus]    = useState('idle'); // idle | getting | done | denied
  const [selectedHub,  setSelectedHub]  = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sort hubs by distance from user if we have location
  const hubs = React.useMemo(() => {
    if (!rawHubs) return [];
    let list = rawHubs.map((h, i) => {
      const coords = custGetCoords(h);
      const dist   = (userCoords && coords)
        ? haversineKm(userCoords, coords)
        : null;
      return { ...h, _coords: coords, _dist: dist, _rank: null };
    });

    if (statusFilter !== 'ALL') {
      list = list.filter(h => h.status === statusFilter);
    }

    if (userCoords) {
      // hubs without coords go to bottom
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
    if (!navigator.geolocation) {
      setLocStatus('denied');
      return;
    }
    setLocStatus('getting');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
        setLocStatus('done');
      },
      () => setLocStatus('denied'),
      { timeout: 10000 }
    );
  };

  if (loading) return <Loader />;
  if (error)   return <Err msg={error} />;

  const onlineCount = (rawHubs || []).filter(h => h.status === 'ONLINE').length;

  return <>
    <PageHeader
      title="Charging Stations"
      sub="All EV charging hubs — sorted by distance from your location."
    />

    {/* Location banner */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: '#fff', border: '1px solid #e4e7ef', borderRadius: 12,
      padding: '14px 18px', marginBottom: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        {locStatus === 'idle' && (
          <>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1f2e' }}>📍 Find Nearest Stations</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Share your location to see charging hubs sorted by distance
            </div>
          </>
        )}
        {locStatus === 'getting' && (
          <div style={{ fontWeight: 600, fontSize: 13, color: '#2563eb' }}>⏳ Getting your location…</div>
        )}
        {locStatus === 'done' && (
          <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a' }}>
            ✅ Location found — showing nearest stations first
          </div>
        )}
        {locStatus === 'denied' && (
          <div style={{ fontWeight: 600, fontSize: 13, color: '#dc2626' }}>
            ❌ Location access denied — showing all stations
          </div>
        )}
      </div>
      {locStatus !== 'done' && (
        <button
          className="btn-primary"
          onClick={getLocation}
          disabled={locStatus === 'getting'}
          style={{ fontSize: 13 }}
        >
          {locStatus === 'getting' ? 'Locating…' : '📍 Use My Location'}
        </button>
      )}
      {locStatus === 'done' && (
        <button className="btn-ghost" onClick={() => { setUserCoords(null); setLocStatus('idle'); }}
          style={{ fontSize: 12 }}>
          Clear Location
        </button>
      )}
    </div>

    {/* Stats */}
    <MetricGrid metrics={[
      { label: 'Total Hubs',    value: (rawHubs || []).length,  Icon: Factory,      color: '#2563eb' },
      { label: 'Online Now',    value: onlineCount,              Icon: Zap,          color: '#16a34a' },
      { label: 'Offline',       value: (rawHubs || []).filter(h => h.status === 'OFFLINE').length, Icon: AlertTriangle, color: '#dc2626' },
      { label: 'Maintenance',   value: (rawHubs || []).filter(h => h.status === 'MAINTENANCE').length, Icon: Activity, color: '#d97706' },
    ]} />

    {/* Map */}
    <div style={{ marginBottom: 16 }}>
      <CustStationsMap
        hubs={hubs}
        userCoords={userCoords}
        selectedHub={selectedHub}
        onSelectHub={h => setSelectedHub(s => s?._id === h._id ? null : h)}
      />
    </div>

    {/* Filter tabs */}
    <div className="filter-tabs" style={{ marginBottom: 12 }}>
      {['ALL', 'ONLINE', 'OFFLINE', 'MAINTENANCE'].map(s => (
        <button
          key={s}
          className={'filter-tab' + (statusFilter === s ? ' active' : '')}
          onClick={() => setStatusFilter(s)}
        >
          {s === 'ALL' ? `All Stations (${(rawHubs || []).length})` : s}
        </button>
      ))}
    </div>

    {/* Hub list — sorted nearest first */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hubs.map((hub, i) => {
        const sc    = HUB_SC[hub.status] || '#2563eb';
        const isSelected = selectedHub?._id === hub._id;
        return (
          <div
            key={hub._id}
            onClick={() => setSelectedHub(s => s?._id === hub._id ? null : hub)}
            style={{
              background: '#fff',
              border: `1.5px solid ${isSelected ? '#2563eb' : '#e4e7ef'}`,
              borderRadius: 12,
              padding: '14px 16px',
              cursor: 'pointer',
              boxShadow: isSelected ? '0 0 0 3px #2563eb18' : '0 1px 4px rgba(0,0,0,.04)',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          >
            {/* Rank badge */}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: userCoords ? (i === 0 ? '#2563eb' : '#f3f4f6') : '#f3f4f6',
              color: userCoords ? (i === 0 ? '#fff' : '#6b7280') : '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, flexShrink: 0,
            }}>
              #{i + 1}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1f2e' }}>{hub.name}</div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  {hub._dist != null && (
                    <span style={{
                      background: '#eff6ff', color: '#2563eb',
                      borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                    }}>
                      📏 {hub._dist < 1 ? `${(hub._dist * 1000).toFixed(0)} m` : `${hub._dist.toFixed(1)} km`}
                    </span>
                  )}
                  {(() => {
                    const coords = custGetCoords(hub);
                    const mapsUrl = coords
                      ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hub.address ? hub.address + ', ' : '') + (hub.city || ''))}`;
                    return (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                         title="Open in Google Maps"
                         onClick={e => e.stopPropagation()}
                         style={{
                           display: 'flex', alignItems: 'center', gap: 4,
                           background: '#eff6ff', color: '#2563eb',
                           borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                           textDecoration: 'none', border: '1px solid #bfdbfe',
                         }}>
                        <MapPin size={12} /> Maps
                      </a>
                    );
                  })()}
                  <span style={{
                    background: sc + '18', color: sc,
                    borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                  }}>
                    ● {hub.status}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                📍 {hub.city}{hub.address ? ` · ${hub.address}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#374151' }}>
                  ⚡ <strong>{hub.chargerCount ?? 0}</strong> charger slots
                </span>
                {hub.code && (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>🔖 {hub.code}</span>
                )}
                {!hub._coords && (
                  <span style={{ fontSize: 11, color: '#d97706' }}>⚠ No map coords</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {hubs.length === 0 && (
        <div className="empty">No charging stations found for this filter.</div>
      )}
    </div>
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