import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import './Approval.css';

/* ── Item type badge ── */
const TYPE_ICONS = {
  'Single Select': { symbol: 'SS',  color: '#6366f1' },
  'Multi Select':  { symbol: 'MS',  color: '#8b5cf6' },
  'Numeric':       { symbol: '##',  color: '#0ea5e9' },
  'Text':          { symbol: 'Tx',  color: '#14b8a6' },
  'Checkbox':      { symbol: '☑',   color: '#22c55e' },
  'Yes/No':        { symbol: 'Y/N', color: '#f59e0b' },
};

function ItemTypeBadge({ type }) {
  const cfg = TYPE_ICONS[type] || { symbol: '?', color: '#9ca3af' };
  return (
    <span
      className="item-type-badge"
      style={{ background: cfg.color + '18', color: cfg.color, borderColor: cfg.color + '40' }}
      title={type}
    >
      {cfg.symbol}
    </span>
  );
}

/* ── Audit timeline ── */
function AuditTimeline({ entries = [] }) {
  if (!entries.length) return <p className="audit-empty">No audit events recorded.</p>;
  return (
    <div className="audit-timeline">
      {[...entries].reverse().map((entry, i) => (
        <div key={entry.id || i} className="audit-entry">
          <div className="audit-dot" />
          <div className="audit-body">
            <div className="audit-action">{entry.action}</div>
            {entry.details && <div className="audit-details">{entry.details}</div>}
            <div className="audit-meta">
              <span>{entry.user}</span>
              <span className="audit-meta-sep">·</span>
              <span>{entry.timestamp}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════ */
/*  Main Component                             */
/* ════════════════════════════════════════════ */
export default function Approval() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { workorders, approveWorkorder, rejectWorkorder, cancelWorkorder } = useAppContext();

  const workorder = workorders.find(w => w.id === id);

  const [activeTab, setActiveTab] = useState('items');

  /* Review modal */
  const [showReviewModal,   setShowReviewModal]   = useState(false);
  const [reviewAction,      setReviewAction]       = useState('approve');
  const [reviewerComment,   setReviewerComment]   = useState('');
  const [rejectionComment,  setRejectionComment]  = useState('');
  const [commentError,      setCommentError]       = useState('');
  const [qaChecked,         setQaChecked]          = useState(true);
  const [confirmChecked,    setConfirmChecked]     = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState(workorder?.groups[0]?.id || null);
  const selectedGroup = workorder?.groups.find(g => g.id === selectedGroupId);

  if (!workorder) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Workorder not found</h3>
          <p>The workorder you&apos;re looking for doesn&apos;t exist.</p>
          <button className="btn btn-primary" onClick={() => navigate('/pending')}>← Back to Review Queue</button>
        </div>
      </div>
    );
  }

  const isActionable = workorder.status === 'Pending Approval';
  const totalItems   = workorder.groups.reduce((sum, g) => sum + g.items.length, 0);

  const resetModal = () => {
    setShowReviewModal(false);
    setReviewAction('approve');
    setReviewerComment('');
    setRejectionComment('');
    setCommentError('');
    setQaChecked(true);
    setConfirmChecked(false);
  };

  const handleSubmitReview = () => {
    if (reviewAction === 'reject' && !rejectionComment.trim()) {
      setCommentError('Rejection reason is required');
      return;
    }
    if (!confirmChecked) return;

    switch (reviewAction) {
      case 'approve': approveWorkorder(workorder.id); break;
      case 'reject':  rejectWorkorder(workorder.id, rejectionComment.trim()); break;
      case 'cancel':  cancelWorkorder(workorder.id); break;
    }

    resetModal();
    navigate('/pending');
  };

  const confirmLabels = {
    approve: 'Workorder will be marked Approved.',
    reject:  'Workorder will be sent back to the creator.',
    cancel:  'Workorder will be permanently removed from active flow.',
  };

  const actionColors = { approve: '#059669', reject: '#dc2626', cancel: '#6b7280' };

  return (
    <div className="page-container">

      {/* ── Breadcrumb ── */}
      <div className="breadcrumb">
        <button className="breadcrumb-link" onClick={() => navigate('/pending')}>← Review Queue</button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{workorder.id}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{workorder.name}</span>
      </div>

      {/* ── Header ── */}
      <div className="wo-detail-header">
        <div className="wo-detail-header-left">
          <div className="wo-detail-meta">
            <span className="wo-detail-id">{workorder.id}</span>
            <StatusBadge status={workorder.status} />
            <span className="view-only-badge">Read only</span>
          </div>
          <h1 className="wo-detail-title">{workorder.name}</h1>
          <p className="wo-detail-subtitle">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {workorder.createdBy}
            <span style={{ color: '#d1d5db', margin: '0 4px' }}>·</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {workorder.createdAt}
          </p>

          <div className="wo-detail-counters">
            <div className="wo-detail-counter">
              <span className="wo-detail-counter-value">{workorder.groups.length}</span>
              <span className="wo-detail-counter-label">Groups</span>
            </div>
            <div className="wo-detail-counter-sep" />
            <div className="wo-detail-counter">
              <span className="wo-detail-counter-value">{totalItems}</span>
              <span className="wo-detail-counter-label">Items</span>
            </div>
            <div className="wo-detail-counter-sep" />
            <div className="wo-detail-counter">
              <span className="wo-detail-counter-value">{workorder.auditTrail?.length || 0}</span>
              <span className="wo-detail-counter-label">Audit events</span>
            </div>
          </div>
        </div>

        <div className="wo-detail-header-right">
          {isActionable && (
            <button id="btn-review" className="btn btn-primary btn-submit" onClick={() => setShowReviewModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Review for Approval
            </button>
          )}
          {workorder.status === 'Approved' && (
            <div className="approved-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Approved
            </div>
          )}
          {workorder.status === 'Rejected' && (
            <div className="rejection-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Rejected: {workorder.rejectionComment}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="approval-tab-nav">
        <button
          id="tab-items"
          className={`approval-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Items &amp; Groups
        </button>
        <button
          id="tab-audit"
          className={`approval-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Audit Trail
          {workorder.auditTrail?.length > 0 && (
            <span className="tab-badge">{workorder.auditTrail.length}</span>
          )}
        </button>
      </div>

      {/* ── Items Tab ── */}
      {activeTab === 'items' && (
        <div className="wo-detail-content">
          <div className="groups-panel">
            <div className="groups-panel-header">
              <span className="panel-label">GROUPS</span>
              <span className="panel-count">{workorder.groups.length} total</span>
            </div>
            <div className="groups-list">
              {workorder.groups.map((group, index) => (
                <button
                  key={group.id}
                  id={`group-${group.id}`}
                  className={`group-item ${selectedGroupId === group.id ? 'active' : ''}`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <span className="group-index">{index + 1}</span>
                  <span className="group-name">{group.name}</span>
                  <span className="group-count">{group.items.length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="items-panel">
            {selectedGroup ? (
              <>
                <div className="items-panel-header">
                  <span className="panel-label">{workorder.id} · {selectedGroup.name}</span>
                  <span className="panel-count">{selectedGroup.items.length} items in this group</span>
                </div>

                {selectedGroup.items.length > 0 ? (
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th style={{ width: '80px' }}>Type</th>
                        <th>Options / Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="item-index">{idx + 1}</td>
                          <td className="item-name-cell">
                            <div className="item-name-main">{item.name}</div>
                            <div className="item-id-sub">{item.id}</div>
                          </td>
                          <td><span className="category-tag">{item.category}</span></td>
                          <td><ItemTypeBadge type={item.type} /></td>
                          <td className="item-options-cell">
                            {item.type === 'Numeric' && (
                              <span className="item-range">
                                {item.lowerLimit ?? '—'} → {item.upperLimit ?? '—'}
                              </span>
                            )}
                            {(item.type === 'Single Select' || item.type === 'Multi Select') &&
                              item.options?.length > 0 && (
                                <div className="item-options-list">
                                  {item.options.slice(0, 3).map((opt, i) => (
                                    <span key={i} className="item-option-chip">{opt}</span>
                                  ))}
                                  {item.options.length > 3 && (
                                    <span className="item-option-chip item-option-more">
                                      +{item.options.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            {['Text', 'Yes/No', 'Checkbox'].includes(item.type) && (
                              <span className="item-actions-placeholder">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="items-empty"><p>No items in this group.</p></div>
                )}
              </>
            ) : (
              <div className="items-empty"><p>Select a group to view items</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── Audit Tab ── */}
      {activeTab === 'audit' && (
        <div className="audit-panel">
          <div className="audit-panel-header">
            <span className="panel-label">AUDIT TRAIL</span>
            <span className="panel-count">{workorder.auditTrail?.length || 0} events</span>
          </div>
          <AuditTimeline entries={workorder.auditTrail || []} />
        </div>
      )}

      {/* ════════════ Review Modal ════════════ */}
      <Modal
        isOpen={showReviewModal}
        onClose={resetModal}
        title="Approval Review"
        subtitle={`${workorder.id} — ${workorder.name}`}
        width="540px"
      >
        <div className="modal-form">
          {/* Action selector */}
          <div className="review-toggle">
            <button
              id="action-approve"
              className={`review-toggle-btn ${reviewAction === 'approve' ? 'active approve-active' : ''}`}
              onClick={() => { setReviewAction('approve'); setCommentError(''); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Approve
            </button>
            <button
              id="action-reject"
              className={`review-toggle-btn ${reviewAction === 'reject' ? 'active reject-active' : ''}`}
              onClick={() => setReviewAction('reject')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Reject
            </button>
            <button
              id="action-cancel"
              className={`review-toggle-btn ${reviewAction === 'cancel' ? 'active cancel-active' : ''}`}
              onClick={() => { setReviewAction('cancel'); setCommentError(''); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Cancel
            </button>
          </div>

          {/* Info strip */}
          <div
            className="review-info-strip"
            style={{ borderColor: actionColors[reviewAction] + '40', background: actionColors[reviewAction] + '0a' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={actionColors[reviewAction]} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ color: actionColors[reviewAction], fontSize: '12px' }}>
              {confirmLabels[reviewAction]}
            </span>
          </div>

          {/* Comment */}
          <div className="review-comment-section">
            <label className="form-label">
              <span
                className="form-label-text"
                style={{ color: reviewAction === 'reject' ? '#dc2626' : '#374151' }}
              >
                {reviewAction === 'reject' ? 'Rejection reason *' : 'Reviewer comment (optional)'}
              </span>
              <textarea
                id="review-comment"
                className={`form-textarea ${commentError ? 'input-error' : ''}`}
                placeholder={
                  reviewAction === 'reject'
                    ? 'Explain why this workorder is being rejected…'
                    : 'Add notes for record-keeping…'
                }
                value={reviewAction === 'reject' ? rejectionComment : reviewerComment}
                onChange={e => {
                  if (reviewAction === 'reject') {
                    setRejectionComment(e.target.value);
                    setCommentError('');
                  } else {
                    setReviewerComment(e.target.value);
                  }
                }}
                rows={3}
              />
              {commentError && <span className="form-error">{commentError}</span>}
            </label>
          </div>

          {/* Summary */}
          <div className="review-summary-card">
            <div className="review-summary-row">
              <span className="review-summary-label">Workorder</span>
              <span className="review-summary-value">{workorder.id} · {workorder.name}</span>
            </div>
            <div className="review-summary-row">
              <span className="review-summary-label">Groups / Items</span>
              <span className="review-summary-value">{workorder.groups.length} groups · {totalItems} items</span>
            </div>
            <div className="review-summary-row">
              <span className="review-summary-label">Created by</span>
              <span className="review-summary-value">{workorder.createdBy}</span>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="review-checkboxes">
            <label className="review-checkbox-item">
              <input id="chk-qa" type="checkbox" className="review-checkbox" checked={qaChecked} onChange={e => setQaChecked(e.target.checked)} />
              <div className="review-checkbox-content">
                <span className="review-checkbox-label">QA checks completed</span>
                <span className="review-checkbox-desc">Pre-checked by default. Uncheck if QA was not performed.</span>
              </div>
            </label>
            <label className="review-checkbox-item">
              <input id="chk-confirm" type="checkbox" className="review-checkbox" checked={confirmChecked} onChange={e => setConfirmChecked(e.target.checked)} />
              <div className="review-checkbox-content">
                <span className="review-checkbox-label">
                  I confirm this review is accurate and final. <span className="required-star">*</span>
                </span>
                <span className="review-checkbox-desc">Required to submit the review decision.</span>
              </div>
            </label>
          </div>

          <div className="modal-actions">
            <button id="modal-cancel" className="btn btn-secondary" onClick={resetModal}>Cancel</button>
            <button
              id="modal-submit"
              className={`btn ${reviewAction === 'reject' ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleSubmitReview}
              disabled={!confirmChecked}
            >
              {reviewAction === 'approve' ? 'Approve Workorder' : reviewAction === 'reject' ? 'Reject Workorder' : 'Cancel Workorder'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
