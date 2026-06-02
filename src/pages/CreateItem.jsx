import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import './CreateItem.css';

export default function CreateItem() {
  const navigate = useNavigate();
  const {
    workorders,
    loading,
    createWorkorder,
    addGroup,
    addItemToGroup,
    removeItemFromGroup,
    submitForApproval,
    saveDraft,
    cancelWorkorder,
    duplicateWorkorder,
  } = useAppContext();

  /* ─── Filters State ─── */
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  /* ─── Create Workorder State ─── */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [woName, setWoName] = useState('');
  const [woDesc, setWoDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  /* ─── Selected Workorder ─── */
  const [selectedWoId, setSelectedWoId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  /* ─── Add Group Modal ─── */
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupError, setGroupError] = useState('');

  /* ─── Add Item Modal ─── */
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemType, setItemType] = useState('Single Select');
  const [itemError, setItemError] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [optionInput, setOptionInput] = useState('');
  const [numLower, setNumLower] = useState('');
  const [numUpper, setNumUpper] = useState('');

  const selectedWo = workorders.find(w => w.id === selectedWoId);
  const selectedGroup = selectedWo?.groups.find(g => g.id === selectedGroupId);
  const draftOrders = workorders.filter(w => w.status === 'Draft');

  const displayWorkorders = useMemo(() => {
    let filtered = workorders.filter(wo => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        wo.name.toLowerCase().includes(q) || 
        wo.id.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || 
        wo.status === statusFilter;

      const matchesDate = !dateFilter || (() => {
        const [selYear, selMonth, selDay] = dateFilter.split('-').map(Number);
        const d = new Date(wo.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === selYear && 
               (d.getMonth() + 1) === selMonth && 
               d.getDate() === selDay;
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
    // Sort newest first
    return filtered.sort((a, b) => {
      const da = new Date(a.createdAt);
      const db = new Date(b.createdAt);
      if (!isNaN(db) && !isNaN(da)) return db - da;
      return 0;
    });
  }, [workorders, searchQuery, statusFilter, dateFilter]);

  /* ─── Handlers ─── */
  const handleCreateWorkorder = () => {
    const trimmedName = woName.trim();
    const trimmedDesc = woDesc.trim();
    if (!trimmedName) {
      setCreateError('Workorder name is required');
      return;
    }
    if (!trimmedDesc) {
      setCreateError('Description is required');
      return;
    }

    // Check if name exists in any workorder
    const existingWo = workorders.find(
      w => w.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingWo) {
      setCreateError('A workorder with this name already exists.');
      return;
    }

    createWorkorder(trimmedName, trimmedDesc);
    setWoName('');
    setWoDesc('');
    setCreateError('');
    setShowCreateModal(false);
  };

  const handleAddGroup = () => {
    const trimmedGroupName = groupName.trim();
    if (!trimmedGroupName) {
      setGroupError('Group name is required');
      return;
    }

    if (selectedWo?.groups.some(g => g.name.toLowerCase() === trimmedGroupName.toLowerCase())) {
      setGroupError('A group with this name already exists in this workorder.');
      return;
    }

    addGroup(selectedWoId, trimmedGroupName);
    setGroupName('');
    setGroupError('');
    setShowAddGroup(false);
  };

  const handleAddItem = () => {
    const trimmedItemName = itemName.trim();
    const trimmedCategory = itemCategory.trim();
    if (!trimmedItemName) {
      setItemError('Item name is required');
      return;
    }
    if (!trimmedCategory) {
      setItemError('Category is required');
      return;
    }

    const itemExistsInWo = selectedWo?.groups.some(g => 
      g.items.some(i => i.name.toLowerCase() === trimmedItemName.toLowerCase())
    );

    if (itemExistsInWo) {
      setItemError('An item with this name already exists in this workorder.');
      return;
    }
    if (itemType === 'Single Select' && dropdownOptions.length === 0) {
      setItemError('Add at least one dropdown option for Single Select');
      return;
    }
    if (itemType === 'Numeric') {
      if (numLower === '' || numUpper === '') {
        setItemError('Both lower and upper limits are required for Numeric type');
        return;
      }
      if (Number(numLower) >= Number(numUpper)) {
        setItemError('Lower limit must be less than upper limit');
        return;
      }
    }
    addItemToGroup(
      selectedWoId,
      selectedGroupId,
      itemName.trim(),
      trimmedCategory,
      itemType,
      itemType === 'Single Select' ? dropdownOptions : [],
      itemType === 'Numeric' ? Number(numLower) : null,
      itemType === 'Numeric' ? Number(numUpper) : null
    );
    setItemName('');
    setItemCategory('');
    setItemType('Single Select');
    setItemError('');
    setDropdownOptions([]);
    setOptionInput('');
    setNumLower('');
    setNumUpper('');
    setShowAddItem(false);
  };

  const handleAddOption = () => {
    const val = optionInput.trim();
    if (val && !dropdownOptions.includes(val)) {
      setDropdownOptions([...dropdownOptions, val]);
      setOptionInput('');
      setItemError('');
    }
  };

  const handleRemoveOption = (opt) => {
    setDropdownOptions(dropdownOptions.filter(o => o !== opt));
  };

  const handleOptionKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleSubmitForApproval = () => {
    if (selectedWo && selectedWo.groups.length > 0) {
      submitForApproval(selectedWoId);
      navigate('/pending');
    }
  };

  const handleSaveDraft = () => {
    if (selectedWo) saveDraft(selectedWoId);
  };

  const handleCancelWorkorder = () => {
    if (selectedWo) {
      cancelWorkorder(selectedWoId);
      setSelectedWoId(null);
      setSelectedGroupId(null);
    }
  };

  /* ─── No workorder selected → Show list view ─── */
  if (!selectedWoId) {
    return (
      <div className="page-container">
        <div className="page-header-bar">
          <div>
            <h1 className="page-title">Workorders</h1>
            <p className="page-subtitle">Create and manage your workorders</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Workorder
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
            </div>
            <h3>Loading workorders...</h3>
            <p>Fetching data from the server</p>
          </div>
        ) : workorders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="12" x2="12" y2="18" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3>No workorders yet</h3>
            <p>Create your first workorder to get started</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Workorder
            </button>
          </div>
        ) : (
          <>
            {/* Filters Toolbar */}
            <div className="filters-toolbar" style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by ID or name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#374151',
                    outline: 'none',
                    background: '#fff',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div style={{ width: '180px' }}>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#374151',
                    outline: 'none',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div style={{ width: '160px' }}>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#374151',
                    outline: 'none',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                />
              </div>
              
              {(searchQuery || statusFilter !== 'All' || dateFilter) && (
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFilter(''); }}
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {displayWorkorders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                </div>
                <h3>No matching workorders</h3>
                <p>Try adjusting your search query, status, or date filter</p>
                <button className="btn btn-primary" onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFilter(''); }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="wo-table-wrap">
                <table className="wo-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Groups</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayWorkorders.map(wo => (
                      <tr key={wo.id} onClick={() => { setSelectedWoId(wo.id); setSelectedGroupId(wo.groups[0]?.id || null); }}>
                        <td className="wo-id-cell">{wo.id}</td>
                        <td className="wo-name-cell">{wo.name}</td>
                        <td><StatusBadge status={wo.status} /></td>
                        <td>{wo.groups.length}</td>
                        <td className="wo-date-cell">{wo.createdAt}</td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); setSelectedWoId(wo.id); setSelectedGroupId(wo.groups[0]?.id || null); }}>
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Create Workorder Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setCreateError(''); }}
          title="Create Workorder"
          subtitle="Define a new workorder for execution"
        >
          <div className="modal-form">
            <label className="form-label">
              Workorder Name
              <input
                type="text"
                className={`form-input ${createError ? 'input-error' : ''}`}
                placeholder="e.g. Monthly Facility Audit"
                value={woName}
                onChange={e => { setWoName(e.target.value); setCreateError(''); }}
                autoFocus
              />
              {createError && <span className="form-error">{createError}</span>}
            </label>
            <label className="form-label">
              Description
              <textarea
                className="form-textarea"
                placeholder="Describe the purpose of this workorder..."
                value={woDesc}
                onChange={e => setWoDesc(e.target.value)}
                rows={3}
              />
            </label>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setCreateError(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateWorkorder}>Create</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  /* ─── Workorder Detail View ─── */
  const totalItems = selectedWo?.groups.reduce((sum, g) => sum + g.items.length, 0) || 0;
  const isEditable = selectedWo?.status === 'Draft';

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button className="breadcrumb-link" onClick={() => { setSelectedWoId(null); setSelectedGroupId(null); }}>
          ← Workorders
        </button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{selectedWo?.id}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{selectedWo?.name}</span>
      </div>

      {/* Header */}
      <div className="wo-detail-header">
        <div className="wo-detail-header-left">
          <div className="wo-detail-meta">
            <span className="wo-detail-id">{selectedWo?.id}</span>
            <StatusBadge status={selectedWo?.status} />
            {!isEditable && <span className="view-only-badge">View only</span>}
          </div>
          <h1 className="wo-detail-title">{selectedWo?.name}</h1>
          <p className="wo-detail-subtitle">Created by {selectedWo?.createdBy} · {selectedWo?.createdAt}</p>
        </div>
        <div className="wo-detail-header-right">
          <button className="btn btn-icon" onClick={() => setShowAuditModal(true)} title="View Audit Trail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Audit Log
          </button>
          {isEditable && (
            <>
              <button className="btn btn-icon" onClick={() => {
                const newId = duplicateWorkorder(selectedWoId);
                setSelectedWoId(newId);
                setSelectedGroupId(null);
              }} title="Duplicate">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Duplicate
              </button>
              <button className="btn btn-icon" onClick={handleSaveDraft} title="Save Draft">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-6-4z" />
                  <path d="M17 21v-8H7v8M7 3v5h8" />
                </svg>
                Save Draft
              </button>
              <button className="btn btn-icon btn-danger-outline" onClick={handleCancelWorkorder} title="Cancel Workorder">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Cancel Workorder
              </button>
              <button
                className="btn btn-primary btn-submit"
                onClick={handleSubmitForApproval}
                disabled={selectedWo?.groups.length === 0 || totalItems === 0}
                title={selectedWo?.groups.length === 0 ? 'Add at least one group with items' : ''}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                Send for Approval
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content: Groups + Items */}
      <div className="wo-detail-content">
        {/* Groups Panel */}
        <div className="groups-panel">
          <div className="groups-panel-header">
            <div>
              <span className="panel-label">GROUPS</span>
              <span className="panel-count">{selectedWo?.groups.length} total</span>
            </div>
            {isEditable && (
              <button className="btn btn-sm btn-outline" onClick={() => setShowAddGroup(true)}>
                + Add Group
              </button>
            )}
          </div>
          <div className="groups-list">
            {selectedWo?.groups.map((group, index) => (
              <button
                key={group.id}
                className={`group-item ${selectedGroupId === group.id ? 'active' : ''}`}
                onClick={() => setSelectedGroupId(group.id)}
              >
                <span className="group-index">{index + 1}</span>
                <span className="group-name">{group.name}</span>
                <span className="group-count">{group.items.length}</span>
              </button>
            ))}
            {selectedWo?.groups.length === 0 && (
              <div className="groups-empty">
                <p>No groups yet. Add a group to organize items.</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Panel */}
        <div className="items-panel">
          {selectedGroup ? (
            <>
              <div className="items-panel-header">
                <div>
                  <span className="panel-label">{selectedWo?.id} · {selectedGroup.name}</span>
                  <span className="panel-count">{selectedGroup.items.length} items in this group</span>
                </div>
                {isEditable && (
                  <button className="btn btn-sm btn-primary" onClick={() => setShowAddItem(true)}>
                    + Add Item
                  </button>
                )}
              </div>
              {selectedGroup.items.length > 0 ? (
                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Type</th>
                      {isEditable && <th style={{ width: '80px' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="item-index">{idx + 1}</td>
                        <td className="item-name-cell">{item.name}</td>
                        <td><span className="category-tag">{item.category}</span></td>
                        <td className="item-type-cell">
                          {item.type}
                          {item.type === 'Single Select' && item.options?.length > 0 && (
                            <span className="item-options-count"> ({item.options.length} options)</span>
                          )}
                          {item.type === 'Numeric' && item.lowerLimit != null && item.upperLimit != null && (
                            <span className="item-options-count"> ({item.lowerLimit} – {item.upperLimit})</span>
                          )}
                        </td>
                        {isEditable && (
                          <td>
                            <div className="item-actions">
                              <button
                                className="btn-icon-sm"
                                onClick={() => removeItemFromGroup(selectedWoId, selectedGroupId, item.id)}
                                title="Remove item"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a1 1 0 011-1h2a1 1 0 011 1v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="items-empty">
                  <p>No items in this group yet.</p>
                  {isEditable && (
                    <button className="btn btn-sm btn-outline" onClick={() => setShowAddItem(true)}>
                      Add first item
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="items-empty">
              <p>{selectedWo?.groups.length === 0 ? 'Create a group first to add items' : 'Select a group to view items'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      <Modal
        isOpen={showAddGroup}
        onClose={() => { setShowAddGroup(false); setGroupError(''); setGroupName(''); }}
        title="Add Group"
        subtitle="Groups organize related items in execution order"
        width="440px"
      >
        <div className="modal-form">
          <label className="form-label">
            Group name
            <input
              type="text"
              className={`form-input ${groupError ? 'input-error' : ''}`}
              placeholder="e.g. Pre-checks"
              value={groupName}
              onChange={e => { setGroupName(e.target.value); setGroupError(''); }}
              autoFocus
            />
            {groupError && <span className="form-error">{groupError}</span>}
          </label>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => { setShowAddGroup(false); setGroupError(''); setGroupName(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddGroup}>Add</button>
          </div>
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItem}
        onClose={() => { setShowAddItem(false); setItemError(''); setItemName(''); setItemCategory(''); setDropdownOptions([]); setOptionInput(''); setNumLower(''); setNumUpper(''); }}
        title="Add Item"
        subtitle={`Adding to group: ${selectedGroup?.name}`}
        width="520px"
      >
        <div className="modal-form">
          <label className="form-label">
            Item name
            <input
              type="text"
              className={`form-input ${itemError && !itemName.trim() ? 'input-error' : ''}`}
              placeholder="e.g. Isolate unit"
              value={itemName}
              onChange={e => { setItemName(e.target.value); setItemError(''); }}
              autoFocus
            />
          </label>
          <label className="form-label">
            Category
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Safety, Inspection"
              value={itemCategory}
              onChange={e => setItemCategory(e.target.value)}
            />
          </label>
          <label className="form-label">
            Type
            <select className="form-select" value={itemType} onChange={e => { setItemType(e.target.value); setItemError(''); }}>
              <option>Single Select</option>
              <option>Label/Code</option>
              <option>Text Input</option>
              <option>Checkbox</option>
              <option>Numeric</option>
            </select>
          </label>

          {/* Dropdown Options Builder — only for Single Select */}
          {itemType === 'Single Select' && (
            <div className="options-builder">
              <span className="form-label-text-sm">Dropdown options</span>
              <div className="options-input-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type an option and press Enter or click Add"
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={handleOptionKeyDown}
                />
                <button type="button" className="btn btn-sm btn-outline" onClick={handleAddOption} disabled={!optionInput.trim()}>
                  Add
                </button>
              </div>
              {dropdownOptions.length > 0 && (
                <div className="options-tags">
                  {dropdownOptions.map((opt, i) => (
                    <span key={i} className="option-tag">
                      {opt}
                      <button type="button" className="option-tag-remove" onClick={() => handleRemoveOption(opt)} aria-label={`Remove ${opt}`}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {dropdownOptions.length === 0 && (
                <p className="options-hint">Add values that will appear in the dropdown during execution.</p>
              )}
            </div>
          )}

          {itemType === 'Checkbox' && (
            <div className="type-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              A checkbox will be shown during execution. The executor will check or uncheck it.
            </div>
          )}

          {itemType === 'Numeric' && (
            <div className="numeric-limits-builder">
              <span className="form-label-text-sm">Acceptable range</span>
              <div className="numeric-limits-row">
                <label className="numeric-limit-field">
                  <span className="numeric-limit-label">Lower limit</span>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 0"
                    value={numLower}
                    onChange={e => { setNumLower(e.target.value); setItemError(''); }}
                  />
                </label>
                <span className="numeric-limit-separator">—</span>
                <label className="numeric-limit-field">
                  <span className="numeric-limit-label">Upper limit</span>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 100"
                    value={numUpper}
                    onChange={e => { setNumUpper(e.target.value); setItemError(''); }}
                  />
                </label>
              </div>
              <p className="options-hint">During execution, the value must be between the lower and upper limits.</p>
            </div>
          )}

          {itemError && <span className="form-error">{itemError}</span>}

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => { setShowAddItem(false); setItemError(''); setItemName(''); setItemCategory(''); setDropdownOptions([]); setOptionInput(''); setNumLower(''); setNumUpper(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddItem}>Add Item</button>
          </div>
        </div>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title="Audit Trail"
        subtitle={`History of ${selectedWo?.name}`}
        width="600px"
      >
        <div className="audit-log-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {selectedWo && (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1rem' }}>Workorder Report Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#9ca3af' }}>Created At:</span> <span style={{ color: '#fff' }}>{selectedWo.auditTrail?.find(a => a.action === 'Created Workorder' || a.action.startsWith('Duplicated'))?.timestamp || selectedWo.createdAt || 'Unknown'}</span></div>
                <div><span style={{ color: '#9ca3af' }}>Sent for Approval:</span> <span style={{ color: '#fff' }}>{selectedWo.auditTrail?.find(a => a.action === 'Submitted for Approval')?.timestamp || 'Not sent yet'}</span></div>
                <div><span style={{ color: '#9ca3af' }}>Execution Status:</span> <span style={{ color: '#fff' }}>
                  {(() => {
                    const st = selectedWo.status;
                    if (st === 'Draft') return 'Draft';
                    if (st === 'Pending Approval') return 'Pending Approval';
                    if (st === 'Approved') return 'Pending';
                    if (st === 'Pending Execution' || st === 'In Progress') return 'Started';
                    if (st === 'Completed' || st === 'Done') return 'Completed';
                    return st;
                  })()}
                </span></div>
                <div><span style={{ color: '#9ca3af' }}>Execution Started:</span> <span style={{ color: '#fff' }}>{selectedWo.auditTrail?.find(a => a.action === 'Started Execution')?.timestamp || 'Not started'}</span></div>
                {selectedWo.auditTrail?.find(a => a.action === 'Completed Workorder') && (
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#9ca3af' }}>Execution Completed:</span> <span style={{ color: '#10b981' }}>{selectedWo.auditTrail.find(a => a.action === 'Completed Workorder').timestamp}</span></div>
                )}
              </div>
            </div>
          )}

          {selectedWo?.auditTrail && selectedWo.auditTrail.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '10px' }}>
              {selectedWo.auditTrail.map((audit) => (
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
