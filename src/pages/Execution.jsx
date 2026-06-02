import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import './Execution.css';

export default function Execution() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    workorders,
    markItemDone,
    markItemUndone,
    cancelItem,
    completeWorkorder,
    markNotExecuted,
    cancelWorkorder,
    updateItemValue,
    startExecution,
  } = useAppContext();

  /* ─── List view filters ─── */
  const [execSearch, setExecSearch] = useState('');
  const [execStatusFilter, setExecStatusFilter] = useState('All');
  const [execDateFilter, setExecDateFilter] = useState('');

  /* If no ID, show list of executable workorders */
  const allExecutableOrders = workorders.filter(w =>
    ['Approved', 'Pending Execution', 'In Progress'].includes(w.status)
  );

  /* Sort newest first */
  const sortedExecutable = useMemo(() => {
    return [...allExecutableOrders].sort((a, b) => {
      const da = new Date(a.createdAt);
      const db = new Date(b.createdAt);
      if (!isNaN(db) && !isNaN(da)) return db - da;
      return 0;
    });
  }, [allExecutableOrders.length, workorders]);

  /* Apply filters */
  const executableOrders = useMemo(() => {
    return sortedExecutable.filter(wo => {
      const q = execSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        wo.name.toLowerCase().includes(q) ||
        wo.id.toLowerCase().includes(q);

      const matchesStatus = execStatusFilter === 'All' || wo.status === execStatusFilter;

      const matchesDate = !execDateFilter || (() => {
        const [selYear, selMonth, selDay] = execDateFilter.split('-').map(Number);
        const d = new Date(wo.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === selYear &&
               (d.getMonth() + 1) === selMonth &&
               d.getDate() === selDay;
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [sortedExecutable, execSearch, execStatusFilter, execDateFilter]);

  const workorder = id ? workorders.find(w => w.id === id) : null;

  /* Undone modal */
  const [showUndoneModal, setShowUndoneModal] = useState(false);
  const [undoneTarget, setUndoneTarget] = useState(null);
  const [undoneComment, setUndoneComment] = useState('');
  const [undoneError, setUndoneError] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  if (!id) {
    return (
      <div className="page-container">
        <div className="page-header-bar">
          <div>
            <h1 className="page-title">Execution</h1>
            <p className="page-subtitle">Execute approved workorders and mark items as done</p>
          </div>
        </div>

        {/* Filters toolbar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '340px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              id="exec-search"
              type="text"
              placeholder="Search by name or ID…"
              value={execSearch}
              onChange={e => setExecSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 34px', border: '1px solid #e5e7eb',
                borderRadius: '7px', fontSize: '13px', color: '#374151', outline: 'none',
                background: '#fff', fontFamily: 'inherit',
              }}
            />
            {execSearch && (
              <button onClick={() => setExecSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', fontSize: '16px', cursor: 'pointer', padding: '0 2px' }}>×</button>
            )}
          </div>

          {/* Status dropdown */}
          <div style={{ width: '180px', flexShrink: 0 }}>
            <select
              id="exec-status-filter"
              value={execStatusFilter}
              onChange={e => setExecStatusFilter(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
                borderRadius: '7px', fontSize: '13px', color: '#374151',
                outline: 'none', background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending Execution">Pending Execution</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>

          {/* Date filter */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <input
              id="exec-date-filter"
              type="date"
              value={execDateFilter}
              onChange={e => setExecDateFilter(e.target.value)}
              style={{
                padding: '8px 32px 8px 10px', border: '1px solid #e5e7eb',
                borderRadius: '7px', fontSize: '13px', color: execDateFilter ? '#374151' : '#9ca3af',
                background: '#fff', cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
              }}
            />
            {execDateFilter && (
              <button onClick={() => setExecDateFilter('')} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', fontSize: '16px', cursor: 'pointer', padding: '0 2px' }}>×</button>
            )}
          </div>

          {(execSearch || execStatusFilter !== 'All' || execDateFilter) && (
            <button
              onClick={() => { setExecSearch(''); setExecStatusFilter('All'); setExecDateFilter(''); }}
              style={{ padding: '8px 14px', fontSize: '12px', border: '1px solid #fecaca', borderRadius: '7px', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {allExecutableOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>No workorders ready for execution</h3>
            <p>Approved workorders will appear here</p>
          </div>
        ) : executableOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3>No matching workorders</h3>
            <p>Try adjusting your search or filters</p>
            <button className="btn btn-primary" onClick={() => { setExecSearch(''); setExecStatusFilter('All'); setExecDateFilter(''); }}>Clear Filters</button>
          </div>
        ) : (
          <div className="pending-list">
            {executableOrders.map(wo => {
              const totalItems = wo.groups.reduce((sum, g) => sum + g.items.length, 0);
              const doneItems = wo.groups.reduce(
                (sum, g) => sum + g.items.filter(i => i.executionStatus === 'Done').length,
                0
              );
              return (
                <div key={wo.id} className="pending-card" onClick={() => {
                  if (wo.status === 'Approved') startExecution(wo.id);
                  window.open(`/execution/${wo.id}`, '_blank');
                }}>
                  <div className="pending-card-header">
                    <div className="pending-card-meta">
                      <span className="pending-card-id">{wo.id}</span>
                      <StatusBadge status={wo.status} />
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={e => {
                      e.stopPropagation();
                      if (wo.status === 'Approved') startExecution(wo.id);
                      window.open(`/execution/${wo.id}`, '_blank');
                    }}>
                      Execute
                    </button>
                  </div>
                  <h3 className="pending-card-title">{wo.name}</h3>
                  <p className="pending-card-subtitle">
                    {doneItems}/{totalItems} items completed
                  </p>
                  <div className="exec-progress-bar">
                    <div
                      className="exec-progress-fill"
                      style={{ width: totalItems > 0 ? `${(doneItems / totalItems) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!workorder) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Workorder not found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/execution')}>
            Back to Execution
          </button>
        </div>
      </div>
    );
  }

  /* Execution detail */
  const totalItems = workorder.groups.reduce((sum, g) => sum + g.items.length, 0);
  const doneItems = workorder.groups.reduce(
    (sum, g) => sum + g.items.filter(i => i.executionStatus === 'Done').length,
    0
  );
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const handleMarkDone = (groupId, itemId) => {
    markItemDone(workorder.id, groupId, itemId);
  };

  const handleOpenUndone = (groupId, itemId) => {
    setUndoneTarget({ groupId, itemId });
    setShowUndoneModal(true);
  };

  /* Find the target item name for the undone modal subtitle */
  const undoneItemName = (() => {
    if (!undoneTarget) return '';
    const g = workorder.groups.find(gr => gr.id === undoneTarget.groupId);
    const item = g?.items.find(i => i.id === undoneTarget.itemId);
    return item?.name || '';
  })();

  const handleSubmitUndone = () => {
    if (!undoneComment.trim()) {
      setUndoneError('A comment is required to record this status.');
      return;
    }
    markItemUndone(workorder.id, undoneTarget.groupId, undoneTarget.itemId, undoneComment.trim());
    setShowUndoneModal(false);
    setUndoneComment('');
    setUndoneError('');
    setUndoneTarget(null);
  };

  const handleCancelItem = (groupId, itemId) => {
    cancelItem(workorder.id, groupId, itemId);
  };

  const handleComplete = () => {
    completeWorkorder(workorder.id);
    navigate('/execution');
  };

  const handleMarkNotExecuted = () => {
    markNotExecuted(workorder.id);
    navigate('/execution');
  };

  const handleCancelExecution = () => {
    cancelWorkorder(workorder.id);
    navigate('/execution');
  };

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button className="breadcrumb-link" onClick={() => navigate('/execution')}>
          ← Workorders
        </button>
        <span className="breadcrumb-sep">&gt;</span>
        <span className="breadcrumb-current">{workorder.id}</span>
        <span className="breadcrumb-sep">&gt;</span>
        <span className="breadcrumb-current">{workorder.name}</span>
      </div>

      {/* Header */}
      <div className="exec-header">
        <div className="exec-header-left">
          <div className="wo-detail-meta">
            <span className="wo-detail-id">{workorder.id}</span>
            <StatusBadge status={workorder.status} />
          </div>
          <h1 className="wo-detail-title">{workorder.name}</h1>
          <p className="exec-instructions">
            Execution Mode · Mark every item as Done to complete the workorder.
          </p>
        </div>
        <div className="exec-header-right">
          <div className="exec-progress-info">
            <span className="exec-progress-text">{doneItems}/{totalItems} done</span>
            <div className="exec-progress-bar exec-progress-header">
              <div className="exec-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="exec-progress-pct">{progressPct}%</span>
          </div>
          <button className="btn btn-icon" onClick={() => setShowAuditModal(true)} title="View Audit Trail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Audit Log
          </button>
          <button className="btn btn-icon" onClick={handleCancelExecution}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Cancel
          </button>
          <button className="btn btn-icon btn-danger-outline" onClick={handleMarkNotExecuted}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Mark Not Executed
          </button>
          <button
            className="btn btn-primary btn-submit"
            onClick={handleComplete}
            disabled={doneItems < totalItems}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Complete
          </button>
        </div>
      </div>

      {/* Execution Items */}
      <div className="exec-groups">
        {workorder.groups.map((group, gIdx) => {
          const groupDone = group.items.filter(i => i.executionStatus === 'Done').length;
          return (
            <div key={group.id} className="exec-group-card">
              <div className="exec-group-header">
                <div className="exec-group-title">
                  <span className="exec-group-index">{gIdx + 1}</span>
                  <div>
                    <h3 className="exec-group-name">{group.name}</h3>
                    <span className="exec-group-count">{groupDone}/{group.items.length} done</span>
                  </div>
                </div>
              </div>
              <div className="exec-items-list">
                {group.items.map((item, iIdx) => {
                  let isInvalid = false;
                  if (item.type === 'Numeric') {
                    if (item.value === '' || 
                        (item.lowerLimit != null && Number(item.value) < item.lowerLimit) ||
                        (item.upperLimit != null && Number(item.value) > item.upperLimit)) {
                      isInvalid = true;
                    }
                  } else if (item.type === 'Single Select') {
                    if (!item.value || item.value === '') isInvalid = true;
                  } else if (item.type === 'Text Input' || item.type === 'Label/Code') {
                    if (typeof item.value !== 'string' || item.value.trim() === '') isInvalid = true;
                  }
                  
                  return (
                    <div key={item.id} className={`exec-item-row ${item.executionStatus === 'Done' ? 'item-done' : ''} ${item.executionStatus === 'Undone' ? 'item-undone' : ''} ${item.executionStatus === 'Cancelled' ? 'item-cancelled' : ''}`}>
                      <div className="exec-item-left">
                      <div className="exec-item-info">
                        <span className="exec-item-index">#{iIdx + 1}</span>
                        <span className="exec-item-sep">&rsaquo;</span>
                        <span className="exec-item-type">{item.type}</span>
                        <span className="exec-item-sep">&rsaquo;</span>
                        <StatusBadge status={item.executionStatus} />
                      </div>
                      <div className="exec-item-name">{item.name}</div>
                    </div>
                    <div className="exec-item-right">
                      {/* Type-specific input control */}
                      {item.type === 'Single Select' && (
                        <div className="exec-item-input-wrap">
                          <select
                            className="exec-item-select"
                            value={item.value}
                            onChange={e => updateItemValue(workorder.id, group.id, item.id, e.target.value)}
                            disabled={item.executionStatus === 'Done' || item.executionStatus === 'Cancelled'}
                          >
                            <option value="">Select...</option>
                            {(item.options || []).map((opt, oi) => (
                              <option key={oi} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <svg className="exec-input-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}

                      {item.type === 'Numeric' && (
                        <div className="exec-numeric-wrap">
                          <div className="exec-item-input-wrap">
                            <input
                              type="number"
                              className={`exec-item-input exec-item-numeric ${item.value !== '' && item.lowerLimit != null && item.upperLimit != null &&
                                  (Number(item.value) < item.lowerLimit || Number(item.value) > item.upperLimit)
                                  ? 'exec-input-out-of-range'
                                  : ''
                                }`}
                              placeholder="0"
                              value={item.value}
                              min={item.lowerLimit ?? undefined}
                              max={item.upperLimit ?? undefined}
                              onChange={e => updateItemValue(workorder.id, group.id, item.id, e.target.value)}
                              disabled={item.executionStatus === 'Done' || item.executionStatus === 'Cancelled'}
                            />
                          </div>
                          {item.lowerLimit != null && item.upperLimit != null && (
                            <span className="exec-numeric-range">Range: {item.lowerLimit} – {item.upperLimit}</span>
                          )}
                          {item.value !== '' && item.lowerLimit != null && item.upperLimit != null &&
                            (Number(item.value) < item.lowerLimit || Number(item.value) > item.upperLimit) && (
                              <span className="exec-numeric-error">
                                ⚠ Value must be between {item.lowerLimit} and {item.upperLimit}
                              </span>
                            )}
                        </div>
                      )}

                      {item.type === 'Checkbox' && (
                        <label className="exec-checkbox-wrap">
                          <input
                            type="checkbox"
                            className="exec-item-checkbox"
                            checked={!!item.value}
                            onChange={e => updateItemValue(workorder.id, group.id, item.id, e.target.checked)}
                            disabled={item.executionStatus === 'Done' || item.executionStatus === 'Cancelled'}
                          />
                          <span className="exec-checkbox-label">{item.value ? 'Checked' : 'Unchecked'}</span>
                        </label>
                      )}

                      {(item.type === 'Text Input' || item.type === 'Label/Code') && (
                        <input
                          type="text"
                          className="exec-item-input"
                          placeholder={item.type === 'Label/Code' ? 'LBL-000' : 'Enter value...'}
                          value={item.value}
                          onChange={e => updateItemValue(workorder.id, group.id, item.id, e.target.value)}
                          disabled={item.executionStatus === 'Done' || item.executionStatus === 'Cancelled'}
                        />
                      )}
                      <div className="exec-item-actions">
                        <button
                          className="exec-action-btn exec-done-btn"
                          onClick={() => handleMarkDone(group.id, item.id)}
                          disabled={item.executionStatus === 'Done' || item.executionStatus === 'Cancelled' || isInvalid}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Done
                        </button>
                        <button
                          className="exec-action-btn exec-undone-btn"
                          onClick={() => handleOpenUndone(group.id, item.id)}
                          disabled={item.executionStatus === 'Cancelled'}
                        >
                          Undone
                        </button>
                        <button
                          className="exec-action-btn exec-cancel-btn"
                          onClick={() => handleCancelItem(group.id, item.id)}
                          disabled={item.executionStatus === 'Done' || item.executionStatus === 'Cancelled'}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                    {item.undoneComment && (
                      <div className="exec-undone-comment">
                        <strong>Undone reason:</strong> {item.undoneComment}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mark Item as Undone Modal */}
      <Modal
        isOpen={showUndoneModal}
        onClose={() => { setShowUndoneModal(false); setUndoneComment(''); setUndoneError(''); setUndoneTarget(null); }}
        title="Mark Item as Undone"
        subtitle={`${undoneItemName} — a comment is required to record this status.`}
        width="520px"
      >
        <div className="modal-form">
          <label className="form-label">
            <span className="undone-label-text">Executor comment (required)</span>
            <textarea
              className={`form-textarea ${undoneError ? 'input-error' : ''}`}
              placeholder="Why this item could not be completed..."
              value={undoneComment}
              onChange={e => { setUndoneComment(e.target.value); setUndoneError(''); }}
              rows={4}
              autoFocus
            />
            {undoneError && <span className="form-error">{undoneError}</span>}
          </label>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => { setShowUndoneModal(false); setUndoneComment(''); setUndoneError(''); setUndoneTarget(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmitUndone}>Save</button>
          </div>
        </div>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title="Audit Trail"
        subtitle={`History of ${workorder?.name}`}
        width="600px"
      >
        <div className="audit-log-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {workorder && (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1rem' }}>Workorder Report Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#9ca3af' }}>Created At:</span> <span style={{ color: '#fff' }}>{workorder.auditTrail?.find(a => a.action === 'Created Workorder' || a.action.startsWith('Duplicated'))?.timestamp || workorder.createdAt || 'Unknown'}</span></div>
                <div><span style={{ color: '#9ca3af' }}>Sent for Approval:</span> <span style={{ color: '#fff' }}>{workorder.auditTrail?.find(a => a.action === 'Submitted for Approval')?.timestamp || 'Not sent yet'}</span></div>
                <div><span style={{ color: '#9ca3af' }}>Execution Status:</span> <span style={{ color: '#fff' }}>
                  {(() => {
                    const st = workorder.status;
                    if (st === 'Draft') return 'Draft';
                    if (st === 'Pending Approval') return 'Pending Approval';
                    if (st === 'Approved') return 'Pending';
                    if (st === 'Pending Execution' || st === 'In Progress') return 'Started';
                    if (st === 'Completed' || st === 'Done') return 'Completed';
                    return st;
                  })()}
                </span></div>
                <div><span style={{ color: '#9ca3af' }}>Execution Started:</span> <span style={{ color: '#fff' }}>{workorder.auditTrail?.find(a => a.action === 'Started Execution')?.timestamp || 'Not started'}</span></div>
                {workorder.auditTrail?.find(a => a.action === 'Completed Workorder') && (
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#9ca3af' }}>Execution Completed:</span> <span style={{ color: '#10b981' }}>{workorder.auditTrail.find(a => a.action === 'Completed Workorder').timestamp}</span></div>
                )}
              </div>
            </div>
          )}

          {workorder?.auditTrail && workorder.auditTrail.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '10px' }}>
              {workorder.auditTrail.map((audit) => (
                <div key={audit.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{audit.action}</strong>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{audit.timestamp}</span>
                  </div>
                  <div style={{ color: '#d1d5db', fontSize: '0.85rem' }}>
                    User: <span style={{ color: '#60a5fa' }}>{audit.user}</span>
                  </div>
                  {audit.details && (
                    <div style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', color: '#9ca3af', fontSize: '0.8rem' }}>
                      {audit.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
              No audit trail history found.
            </div>
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowAuditModal(false)}>Close</button>
        </div>
      </Modal>
    </div>
  );
}
