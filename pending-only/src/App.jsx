import { AppProvider } from './context/AppContext.jsx';
import PendingPage from './pages/Pending.jsx';
import './index.css';

export default function App() {
  return (
    <AppProvider>
      <div className="app-shell">
        {/* ── Top header bar ── */}
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-brand">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
              <span>WorkOrder</span>
            </div>
            <nav className="app-nav">
              <a
                className="nav-link nav-link--active"
                href="#"
                id="nav-pending"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Pending Approval
              </a>
            </nav>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="app-main">
          <PendingPage />
        </main>
      </div>
    </AppProvider>
  );
}
