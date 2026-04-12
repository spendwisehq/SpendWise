// frontend/src/components/layout/AppLayout.jsx

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, BarChart2, Users, UserCheck,
  Target, Sparkles, Settings, LogOut, Menu, X, Bell,
  TrendingUp, CreditCard,
} from 'lucide-react';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import NotificationsPanel from '../NotificationsPanel';
import ProfilePanel       from '../ProfilePanel';
import MonthlyIncomePopup, { shouldShowIncomePopup } from '../MonthlyIncomePopup';
import toast from 'react-hot-toast';
import './AppLayout.css';

import logo from '../../assets/logo.png';

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
      { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
      { to: '/analytics',    icon: BarChart2,       label: 'Analytics'    },
    ]
  },
  {
    section: 'Social',
    items: [
      { to: '/groups',  icon: Users,     label: 'Groups'  },
      { to: '/friends', icon: UserCheck, label: 'Friends' },
    ]
  },
  {
    section: 'Tools',
    items: [
      { to: '/goals',        icon: Target,   label: 'Goals'        },
      { to: '/ai-assistant', icon: Sparkles, label: 'AI Assistant' },
      { to: '/settings',     icon: Settings, label: 'Settings'     },
    ]
  },
];

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/transactions': 'Transactions',
  '/analytics':    'Analytics',
  '/groups':       'Groups',
  '/friends':      'Friends',
  '/goals':        'Goals & Score',
  '/ai-assistant': 'AI Assistant',
  '/settings':     'Settings',
};

const AppLayout = () => {
  const { user, logout }       = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  useKeyboardShortcuts();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showIncome,  setShowIncome]  = useState(false);
  const [notifCount,  setNotifCount]  = useState(0);

  const pageTitle = PAGE_TITLES[location.pathname] || 'SpendWise';

  useEffect(() => {
    if (shouldShowIncomePopup()) {
      const t = setTimeout(() => setShowIncome(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const mod = await import('../NotificationsPanel');
        if (mod.getNotifCount) {
          const c = await mod.getNotifCount();
          setNotifCount(c);
        }
      } catch (err) {
        console.warn('Failed to fetch notification count:', err.message);
      }
    };
    fetchCount();
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const openNotifs = () => {
    setShowNotifs(p => !p);
    setShowProfile(false);
    if (!showNotifs) setNotifCount(0);
  };

  const openProfile = () => {
    setShowProfile(p => !p);
    setShowNotifs(false);
  };

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>

        {/* Logo */}
        <div
          className="sidebar__logo"
          onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }}
          title="Dashboard"
        >
          <img src={logo} alt="SpendWise Logo" className="sidebar__logo-img" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <span className="sidebar__logo-text">SpendWise</span>
          <button
            className="sidebar__close"
            onClick={e => { e.stopPropagation(); setSidebarOpen(false); }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav — grouped sections */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ section, items }) => (
            <React.Fragment key={section}>
              <div className="sidebar__nav-section">{section}</div>
              {items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to} to={to}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar__user">
          <div className="sidebar__avatar">
            {user?.initials || user?.name?.slice(0,2).toUpperCase() || 'U'}
          </div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user?.name || 'User'}</span>
            <span className="sidebar__user-plan">{user?.plan || 'free'} plan</span>
          </div>
          <button className="sidebar__logout" onClick={handleLogout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-wrapper">

        {/* ── Header ── */}
        <header className="header" style={{ position: 'relative' }}>
          <button className="header__menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={19} />
          </button>
          <div className="header__brand">
            <img src={logo} alt="SpendWise Logo" style={{ width: '20px', height: '20px', objectFit: 'contain', marginRight: '8px' }} />
            <span>SpendWise</span>
          </div>

          {/* Page title — desktop */}
          <span className="header__breadcrumb" style={{ display: 'none' }}>
            {pageTitle}
          </span>

          <div className="header__actions">
            {/* Theme toggle */}
            <button className="header__btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Notifications */}
            <button
              className={`header__btn ${showNotifs ? 'active' : ''}`}
              onClick={openNotifs}
              title="Notifications"
            >
              <Bell size={17} />
              {notifCount > 0 && <span className="header__notif-dot" />}
            </button>

            {/* Profile */}
            <button
              className={`header__avatar-btn ${showProfile ? 'active' : ''}`}
              onClick={openProfile}
              title={user?.name}
            >
              {user?.initials || user?.name?.slice(0,2).toUpperCase() || 'U'}
            </button>
          </div>

          {/* Panels */}
          {showNotifs && (
            <div className="header-panel">
              <NotificationsPanel onClose={() => setShowNotifs(false)} />
            </div>
          )}
          {showProfile && (
            <div className="header-panel">
              <ProfilePanel onClose={() => setShowProfile(false)} />
            </div>
          )}
        </header>

        {/* ── Content ── */}
        <main className="main-content">
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>

      {showIncome && <MonthlyIncomePopup onClose={() => setShowIncome(false)} />}
    </div>
  );
};

export default AppLayout;