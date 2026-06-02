import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import './Pending.css';

export default function Pending() {
  const navigate = useNavigate();
  const { workorders } = useAppContext();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery,  setSearchQuery]  = useState('');

  const pendingOrders   = workorders.filter(w => w.status === 'Pending Approval');
  const approvedOrders  = workorders.filter(w => w.status === 'Approved');
  const rejectedOrders  = workorders.filter(w => w.status === 'Rejected');
  const cancelledOrders = workorders.filter(w => w.status === 'Cancelled');
  const allOrders       = workorders.filter(w =>
    ['Pending Approval', 'Approved', 'Rejected', 'Cancelled'].includes(w.status)
  );

  const tabFiltered = useMemo(() => {
    switch (filterStatus) {
      case 'pending':   return pendingOrders;
      case 'approved':  return approvedOrders;
      case 'rejected':  return rejectedOrders;
      case 'cancelled': return cancelledOrders;
      default:          return allOrders;
    }
  }, [filterStatus, workorders]);

  const displayOrders = useMemo(() => {
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase();
    return tabFiltered.filter(wo =>
      wo.name.toLowerCase().includes(q) ||
      wo.id.toLowerCase().includes(q)   ||
      wo.createdBy.toLowerCase().includes(q)
    );
  }, [tabFiltered, searchQuery]);

  const tabs = [
    { key: 'all',       label: 'All',       count: allOrders.length },
    { key: 'pending',   label: 'Pending',   count: pendingOrders.length },
    { key: 'approved',  label: 'Approved',  count: approvedOrders.length },
    { key: 'rejected',  label: 'Rejected',  count: rejectedOrders.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledOrders.length },
  ];

  return (
    <div className="page-container">

      {/* ── Page Header ── */}
      <div className="pending-page-header">
        <div className="pending-header-left">
          <h1 className="page-title">Pending Approval</h1>
          <p className="page-subtitle">Review and approve submitted workorders</p>
        </div>

        <div className="pending-stats-bar">
          <div className="pending-stat-chip pending-stat-chip--blue">
            <span className="pending-stat-chip-value">{pendingOrders.length}</span>
            <span className="pending-stat-chip-label">Awaiting Review</span>
          </div>
          <div className="pending-stat-chip pending-stat-chip--green">
            <span className="pending-stat-chip-value">{approvedOrders.length}</span>
            <span className="pending-stat-chip-label">Approved</span>
          </div>
          <div className="pending-stat-chip pending-stat-chip--red">
            <span className="pending-stat-chip-value">{rejectedOrders.length}</span>
            <span className="pending-stat-chip-label">Rejected</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="pending-toolbar">
        <div className="pending-search-wrap">
          <svg className="pending-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            id="pending-search"
            type="text"
            className="pending-search-input"
            placeholder="Search by name, ID or creator…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="pending-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">×</button>
          )}
        </div>

        <div className="filter-group">
          {tabs.map(tab => (
            <button
              key={tab.key}
              id={`filter-${tab.key}`}
              className={`filter-btn ${filterStatus === tab.key ? 'active' : ''}`}
              onClick={() => setFilterStatus(tab.key)}
            >
              {tab.label}
              <span className={`filter-count ${filterStatus === tab.key ? 'filter-count--active' : ''}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {displayOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <h3>{searchQuery ? 'No results found' : 'No workorders to review'}</h3>
          <p>{searchQuery ? `No workorders match "${searchQuery}"` : 'Submitted workorders will appear here for approval'}</p>
        </div>
      ) : (
        <div className="pending-list">
          {displayOrders.map((wo, index) => {
            const totalItems  = wo.groups.reduce((sum, g) => sum + g.items.length, 0);
            const isFirst     = wo.status === 'Pending Approval' && index === 0;
            const isSecond    = wo.status === 'Pending Approval' && index === 1;

            return (
              <div
                key={wo.id}
                id={`card-${wo.id}`}
                className={`pending-card ${isFirst ? 'priority-high' : isSecond ? 'priority-medium' : ''}`}
                onClick={() => window.open(`/approval/${wo.id}`, '_blank')}
              >
                {(isFirst || isSecond) && (
                  <div className={`pending-card-stripe pending-card-stripe--${isFirst ? 'high' : 'medium'}`} />
                )}

                <div className="pending-card-header">
                  <div className="pending-card-meta">
                    <span className="pending-card-id">{wo.id}</span>
                    <StatusBadge status={wo.status} />
                    {isFirst && (
                      <span className="priority-badge priority-badge--high">Needs attention</span>
                    )}
                  </div>
                  <button
                    id={`review-btn-${wo.id}`}
                    className="btn btn-sm btn-primary"
                    onClick={e => { e.stopPropagation(); window.open(`/approval/${wo.id}`, '_blank'); }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {wo.status === 'Pending Approval' ? 'Review' : 'View'}
                  </button>
                </div>

                <h3 className="pending-card-title">{wo.name}</h3>
                <p className="pending-card-subtitle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {wo.createdBy}
                  <span className="card-subtitle-dot">·</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {wo.createdAt}
                </p>

                <div className="pending-card-footer">
                  <div className="pending-stat">
                    <span className="pending-stat-value">{wo.groups.length}</span>
                    <span className="pending-stat-label">Groups</span>
                  </div>
                  <div className="pending-card-divider" />
                  <div className="pending-stat">
                    <span className="pending-stat-value">{totalItems}</span>
                    <span className="pending-stat-label">Items</span>
                  </div>
                  <div className="pending-card-divider" />
                  <div className="pending-stat">
                    <span className="pending-stat-value">{wo.auditTrail?.length || 0}</span>
                    <span className="pending-stat-label">Audit events</span>
                  </div>

                  {wo.rejectionComment && (
                    <div className="pending-rejection">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      {wo.rejectionComment}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
