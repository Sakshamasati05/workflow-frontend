import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const { currentUser } = useAppContext();

  const navItems = [
    { path: '/', label: 'Workorders' },
    { path: '/pending', label: 'Pending Approval' },
    { path: '/execution', label: 'Execution' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <div className="navbar-brand">
            <div className="navbar-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" fill="#2563eb" />
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="navbar-brand-text">
              <span className="navbar-brand-name">Workorder Records</span>
              <span className="navbar-brand-sub">OPERATIONS CONSOLE</span>
            </div>
          </div>
          <div className="navbar-links">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="navbar-right">
          <button className="navbar-icon-btn" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="navbar-user">
            <div className="navbar-avatar">
              {currentUser.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="navbar-username">{currentUser}</span>
          </div>
          <button className="navbar-icon-btn navbar-menu-btn" aria-label="Menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
