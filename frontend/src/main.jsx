import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Users, Car, Wrench, Shield } from 'lucide-react';
import allevLogo from './allevlogo.png';
import CustomerApp from './portals/customer.jsx';
import StaffApp from './portals/staff.jsx';
import FranchiseeApp from './portals/franchisee.jsx';
import CommandApp from './portals/command.jsx';
import './portals/customer.css';
import './portals/staff.css';
import './portals/franchisee.css';
import './portals/command.css';
import './app.css';

const PORTALS = [
  {
    key: 'customer',
    path: '/customer',
    title: 'Customer Portal',
    description: 'Vehicles, bookings, wallet & support',
    Icon: Car,
    colorClass: 'customer',
  },
  {
    key: 'staff',
    path: '/staff',
    title: 'Staff Portal',
    description: 'Jobs, inventory, technicians & operations',
    Icon: Wrench,
    colorClass: 'staff',
  },
  {
    key: 'franchisee',
    path: '/franchisee',
    title: 'Franchisee Portal',
    description: 'Financials, inventory, staff & jobs',
    Icon: Users,
    colorClass: 'franchise',
  },
  {
    key: 'command',
    path: '/command',
    title: 'Central Command',
    description: 'Network KPIs, hubs, chargers & expansion',
    Icon: Shield,
    colorClass: 'command',
  },
];

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/* ── Loading Screen ─────────────────────────────────── */
function LoadingScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="loader">
      <div className="loader-logo">
        {/* No filter — logo colours render correctly on white background */}
        <img src={allevLogo} alt="allEV" />
      </div>
      <div className="loader-bar-track">
        <div className="loader-bar-fill" />
      </div>
    </div>
  );
}

/* ── Portal Chooser ─────────────────────────────────── */
function PortalChooser() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`portal-chooser${ready ? ' visible' : ''}`}>
      <div className="chooser-card">

        {/* Brand */}
        <div className="chooser-brand">
          {/* No filter — logo colours render correctly on white background */}
          <img src={allevLogo} alt="allEV" style={{ height: '32px', objectFit: 'contain' }} />
          <span className="brand-divider" />
          <span className="brand-tag">EV Operations Platform</span>
        </div>

        {/* Headline */}
        <h1 className="chooser-headline">
          Welcome back.<br />
          <span className="chooser-headline-accent">Choose your portal.</span>
        </h1>
        <p className="chooser-sub">Select the workspace that matches your role to continue.</p>

        {/* Cards */}
        <div className="portal-grid">
          {PORTALS.map(({ key, path, title, description, Icon, colorClass }, i) => (
            <button
              className="portal-card"
              key={key}
              style={{ animationDelay: `${0.55 + i * 0.1}s` }}
              onClick={() => navigate(path)}
            >
              <div className={`portal-icon ${colorClass}`}>
                <Icon size={20} />
              </div>
              <div className="portal-info">
                <strong className="portal-title">{title}</strong>
                <span className="portal-desc">{description}</span>
              </div>
              <span className="portal-arrow">›</span>
            </button>
          ))}
        </div>

        {/* Status footer */}
        <div className="status-bar">
          <span className="status-dot" />
          <span className="status-text">All systems operational</span>
        </div>

      </div>
    </div>
  );
}

/* ── App Root ─────────────────────────────────────────── */
function App() {
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(
    window.location.pathname.toLowerCase().replace(/\/$/, '') || '/'
  );

  useEffect(() => {
    const onPop = () =>
      setPath(window.location.pathname.toLowerCase().replace(/\/$/, '') || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (loading) return <LoadingScreen onDone={() => setLoading(false)} />;
  if (path === '/customer')                    return <CustomerApp />;
  if (path === '/staff')                       return <StaffApp />;
  if (path === '/franchisee')                  return <FranchiseeApp />;
  if (path === '/command' || path === '/admin') return <CommandApp />;
  return <PortalChooser />;
}

createRoot(document.getElementById('root')).render(<App />);