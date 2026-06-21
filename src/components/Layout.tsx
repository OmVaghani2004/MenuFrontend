import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ChefHat, 
  UtensilsCrossed, 
  Grid3X3, 
  Users, 
  Settings, 
  LogOut, 
  Menu as MenuIcon, 
  Server,
  User,
  Eye
} from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, initApiLoading } from '../api';
import { Modal } from './Modal';
import { CookingLoader } from './CookingLoader';
import { useLoading } from '../context/LoadingContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const { isLoading, showLoader, hideLoader } = useLoading();

  // Register callbacks with api.ts once so every fetch drives this overlay
  useEffect(() => {
    initApiLoading(showLoader, hideLoader);
  }, [showLoader, hideLoader]);

  const username = localStorage.getItem('username') || 'Administrator';
  const role = localStorage.getItem('role') || 'Staff';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const saveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrlInput);
    setIsApiModalOpen(false);
    window.location.reload(); // Reload to apply new API URL
  };

  // Generate page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard Overview';
    if (path === '/orders') return 'Order Management';
    if (path === '/menu') return 'Menu & Dishes';
    if (path === '/tables') return 'Table Layouts';
    if (path === '/waiters') return 'Waiters Directory';
    if (path === '/settings') return 'Account & Settings';
    return 'Restaurant Portal';
  };

  return (
    <div className="app-container">
      {/* Full-screen cooking loader — shown during any API call */}
      {isLoading && <CookingLoader fullPage message="Preparing your order…" />}

      {/* Mobile Sidebar overlay */}
      {isSidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <ChefHat size={28} style={{ color: 'var(--primary)' }} />
          <span>MenuCore</span>
        </div>

        <nav className="sidebar-menu">
          <NavLink 
            to="/" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/orders" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <ChefHat size={20} />
            <span>Live Orders</span>
          </NavLink>

          <NavLink 
            to="/menu" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <UtensilsCrossed size={20} />
            <span>Menu Manager</span>
          </NavLink>

          <NavLink 
            to="/tables" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <Grid3X3 size={20} />
            <span>Tables</span>
          </NavLink>

          {role === 'Owner' && (
            <NavLink 
              to="/waiters" 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <Users size={20} />
              <span>Waiters</span>
            </NavLink>
          )}

          {/* Preview customer menu in new tab */}
          <a
            href="/menu-view"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link"
            onClick={() => setIsSidebarOpen(false)}
            style={{ color: 'var(--primary)', borderLeft: '2px solid var(--primary)', marginTop: '4px' }}
          >
            <Eye size={20} />
            <span>Preview Menu</span>
          </a>

          <NavLink 
            to="/settings" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* User Card & Action Footer */}
        <div className="sidebar-footer">
          <div 
            className="glass-panel" 
            style={{ 
              padding: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              fontSize: '0.85rem' 
            }}
          >
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <User size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{role}</p>
            </div>
          </div>

          <button 
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => setIsApiModalOpen(true)}
          >
            <Server size={16} />
            <span>Backend Port</span>
          </button>

          <button 
            className="btn btn-danger btn-sm" 
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="menu-toggle" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <MenuIcon size={24} />
            </button>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{getPageTitle()}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              Server Connected
            </span>
          </div>
        </header>

        <div className="page-container">
          {children}
        </div>
      </main>

      {/* API Configuration Modal */}
      <Modal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        title="Configure Backend URL"
      >
        <form onSubmit={saveApiUrl} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Enter the base URL of your ASP.NET Core API. The default ports are:
            <br />
            - HTTPS: <code style={{ color: 'var(--primary)' }}>https://localhost:44310</code>
            <br />
            - HTTP: <code style={{ color: 'var(--primary)' }}>http://localhost:5166</code>
          </p>
          <div className="form-group">
            <label className="form-label">API Base URL</label>
            <input 
              type="text" 
              className="form-input" 
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
              placeholder="http://localhost:5166"
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsApiModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save & Reload
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
