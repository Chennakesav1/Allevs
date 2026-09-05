import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Zap, Users, Car, Wrench, Shield } from 'lucide-react';
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
  { key: 'customer', path: '/customer', title: 'Customer Portal', description: 'Vehicles, bookings, wallet, invoices and support.', Icon: Car },
  { key: 'staff', path: '/staff', title: 'Staff Portal', description: 'Jobs, inventory, technicians and service operations.', Icon: Wrench },
  { key: 'franchisee', path: '/franchisee', title: 'Franchisee Portal', description: 'Financials, inventory, staff and jobs.', Icon: Users },
  { key: 'command', path: '/command', title: 'Central Command', description: 'Network KPIs, hubs, chargers, approvals and expansion.', Icon: Shield },
];

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function PortalChooser() {
  return (
    <div className="portal-chooser">
      <div className="chooser-card">
        <div className="chooser-brand"><span><Zap size={20}/></span> EV CORE</div>
        <div className="chooser-kicker">Integrated EV Operations Platform</div>
        <h1>Choose your portal</h1>
        <p>All four portals now run from one localhost and use the same Node/Express API and MongoDB.</p>
        <div className="portal-grid">
          {PORTALS.map(({ key, path, title, description, Icon }) => (
            <button className="portal-card" key={key} onClick={() => navigate(path)}>
              <div className="portal-icon"><Icon size={22}/></div>
              <div><strong>{title}</strong><span>{description}</span><small>{path}</small></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname.toLowerCase().replace(/\/$/, '') || '/');

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname.toLowerCase().replace(/\/$/, '') || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (path === '/customer') return <CustomerApp />;
  if (path === '/staff') return <StaffApp />;
  if (path === '/franchisee') return <FranchiseeApp />;
  if (path === '/command' || path === '/admin') return <CommandApp />;
  return <PortalChooser />;
}

createRoot(document.getElementById('root')).render(<App />);
