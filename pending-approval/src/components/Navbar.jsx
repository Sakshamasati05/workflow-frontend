import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const location   = useLocation();
  const { currentUser, workorders, resetDemo } = useAppContext();

  const pendingCount = workorders.filter(w => w.status === 'Pending Approval').length;

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
              <span className="navbar-brand-name">Pending Approval</span>
              <span className="navbar-brand-sub">OPERATIONS CONSOLE</span>
            </div>
          </div>

          <div className="navbar-links">
            <Link
              to="/pending"
              className={`navbar-link ${location.pathname === '/pending' || location.pathname === '/' ? 'active' : ''}`}
            >
              Review Queue
              {pendingCount > 0 && (
                <span className="navbar-pending-pill">{pendingCount}</span>
              )}
            </Link>
          </div>
        </div>

        <div className="navbar-right">
          <button
            className="navbar-demo-reset"
            onClick={resetDemo}
            title="Reset demo data"
          >
            ↺ Reset Demo
          </button>
          <div className="navbar-user">
            <div className="navbar-avatar">
              {currentUser.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="navbar-username">{currentUser}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
