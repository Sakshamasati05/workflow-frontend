import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';

const AppContext = createContext();

const API_BASE = 'http://localhost:5001/api';

const generateId = () => 'WO-' + String(Math.floor(1000 + Math.random() * 9000));
const generateItemId = () => 'ITM-' + String(Math.floor(10000 + Math.random() * 90000));
const createAudit = (user, action, details = '') => ({
  id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
  timestamp: new Date().toLocaleString(),
  user,
  action,
  details
});

const defaultState = {
  workorders: [],
  currentUser: 'Saksham Asati',
  loading: true,
  error: null,
};


function appReducer(state, action) {
  switch (action.type) {
    case 'SET_WORKORDERS':
      return { ...state, workorders: action.payload, loading: false, error: null };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'CREATE_WORKORDER': {
      const newWO = {
        id: generateId(),
        name: action.payload.name,
        description: action.payload.description,
        status: 'Draft',
        createdBy: state.currentUser,
        createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        groups: [],
        rejectionComment: '',
        cancellationComment: '',
        auditTrail: [createAudit(state.currentUser, `Created Workorder '${action.payload.name}'`)]
      };
      return { ...state, workorders: [newWO, ...state.workorders] };
    }

    case 'DUPLICATE_WORKORDER': {
      const sourceWo = state.workorders.find(w => w.id === action.payload.workorderId);
      if (!sourceWo) return state;

      const match = sourceWo.name.match(/\s*v(\d+)\s*$/i);
      let baseName = sourceWo.name;
      let currentVersion = 0;

      if (match) {
        currentVersion = parseInt(match[1], 10);
        baseName = sourceWo.name.substring(0, match.index).trim();
      }

      // Find maximum version globally for this baseName
      let maxVersion = currentVersion;
      state.workorders.forEach(w => {
        const wMatch = w.name.match(/\s*v(\d+)\s*$/i);
        let wBaseName = w.name.trim();
        let wVersion = 0;
        
        if (wMatch) {
          wVersion = parseInt(wMatch[1], 10);
          wBaseName = w.name.substring(0, wMatch.index).trim();
        } else if (w.name.trim().toLowerCase() === baseName.toLowerCase()) {
          wVersion = 1;
        }

        if (wBaseName.toLowerCase() === baseName.toLowerCase() && wVersion > maxVersion) {
          maxVersion = wVersion;
        }
      });

      const oldVersion = currentVersion === 0 ? 1 : currentVersion;
      const newVersion = maxVersion > 0 ? maxVersion + 1 : 2;

      const newWO = {
        ...sourceWo,
        id: action.payload.newId,
        name: `${baseName} v${newVersion}`,
        status: 'Draft',
        createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        groups: [],
        auditTrail: [createAudit(state.currentUser, `Duplicated from ${sourceWo.id}`)]
      };

      const updatedWorkorders = state.workorders.map(wo => {
        if (wo.id === sourceWo.id) {
          return { ...wo, name: `${baseName} v${oldVersion}` };
        }
        return wo;
      });

      return { ...state, workorders: [newWO, ...updatedWorkorders] };
    }

    case 'ADD_GROUP': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
              ...wo,
              auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, `Added Group '${action.payload.groupName}'`)],
              groups: [
                ...wo.groups,
                {
                  id: 'GRP-' + Date.now(),
                  name: action.payload.groupName,
                  items: [],
                },
              ],
            }
            : wo
        ),
      };
    }

    case 'ADD_ITEM_TO_GROUP': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
              ...wo,
              auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, `Added Task: '${action.payload.itemName}'`, `Type: ${action.payload.type || 'Single Select'} | Group: ${wo.groups.find(g => g.id === action.payload.groupId)?.name || action.payload.groupId}`)],
              groups: wo.groups.map(g =>
                g.id === action.payload.groupId
                  ? {
                    ...g,
                    items: [
                      {
                        id: generateItemId(),
                        name: action.payload.itemName,
                        category: action.payload.category || 'General',
                        type: action.payload.type || 'Single Select',
                        options: action.payload.options || [],
                        lowerLimit: action.payload.lowerLimit ?? null,
                        upperLimit: action.payload.upperLimit ?? null,
                        status: 'Pending',
                        value: action.payload.type === 'Checkbox' ? false : '',
                        executionStatus: 'Pending',
                      },
                      ...g.items,
                    ],
                  }
                  : g
              ),
            }
            : wo
        ),
      };
    }

    case 'REMOVE_ITEM_FROM_GROUP': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
              ...wo,
              groups: wo.groups.map(g =>
                g.id === action.payload.groupId
                  ? { ...g, items: g.items.filter(item => item.id !== action.payload.itemId) }
                  : g
              ),
            }
            : wo
        ),
      };
    }

    case 'SUBMIT_FOR_APPROVAL': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Pending Approval', auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Submitted for Approval')] }
            : wo
        ),
      };
    }

    case 'SAVE_DRAFT': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Draft' }
            : wo
        ),
      };
    }

    case 'APPROVE_WORKORDER': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Approved', auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Approved Workorder')] }
            : wo
        ),
      };
    }

    case 'REJECT_WORKORDER': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Rejected', rejectionComment: action.payload.comment, auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Rejected Workorder', `Reason: ${action.payload.comment}`)] }
            : wo
        ),
      };
    }

    case 'CANCEL_WORKORDER': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Cancelled', cancellationComment: action.payload.comment || '', auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Cancelled Workorder', action.payload.comment ? `Reason: ${action.payload.comment}` : '')] }
            : wo
        ),
      };
    }

    case 'START_EXECUTION': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Pending Execution', auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Started Execution')] }
            : wo
        ),
      };
    }

    case 'MARK_ITEM_DONE': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
              ...wo,
              status: wo.status === 'Pending Execution' ? 'In Progress' : wo.status,
              auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Marked Item Done')],
              groups: wo.groups.map(g =>
                g.id === action.payload.groupId
                  ? {
                    ...g,
                    items: g.items.map(item =>
                      item.id === action.payload.itemId
                        ? { ...item, executionStatus: 'Done', value: action.payload.value || item.value }
                        : item
                    ),
                  }
                  : g
              ),
            }
            : wo
        ),
      };
    }

    case 'MARK_ITEM_UNDONE': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
              ...wo,
              status: wo.status === 'Pending Execution' ? 'In Progress' : wo.status,
              auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Marked Item Undone', `Reason: ${action.payload.comment}`)],
              groups: wo.groups.map(g =>
                g.id === action.payload.groupId
                  ? {
                    ...g,
                    items: g.items.map(item =>
                      item.id === action.payload.itemId
                        ? { ...item, executionStatus: 'Undone', undoneComment: action.payload.comment }
                        : item
                    ),
                  }
                  : g
              ),
            }
            : wo
        ),
      };
    }

    case 'CANCEL_ITEM': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
              ...wo,
              auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Cancelled Item')],
              groups: wo.groups.map(g =>
                g.id === action.payload.groupId
                  ? {
                    ...g,
                    items: g.items.map(item =>
                      item.id === action.payload.itemId
                        ? { ...item, executionStatus: 'Cancelled' }
                        : item
                    ),
                  }
                  : g
              ),
            }
            : wo
        ),
      };
    }

    case 'COMPLETE_WORKORDER': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Completed', auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Completed Workorder')] }
            : wo
        ),
      };
    }

    case 'MARK_NOT_EXECUTED': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Not Executed', auditTrail: [...(wo.auditTrail || []), createAudit(state.currentUser, 'Marked Workorder as Not Executed')] }
            : wo
        ),
      };
    }

    case 'UPDATE_ITEM_VALUE': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
              ...wo,
              groups: wo.groups.map(g =>
                g.id === action.payload.groupId
                  ? {
                    ...g,
                    items: g.items.map(item =>
                      item.id === action.payload.itemId
                        ? { ...item, value: action.payload.value }
                        : item
                    ),
                  }
                  : g
              ),
            }
            : wo
        ),
      };
    }

    default:
      return state;
  }
}

// ─── API helper ────────────────────────────────────────────────────────────────

async function apiRequest(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, defaultState);
  const syncTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Load workorders from backend on mount
  useEffect(() => {
    isMountedRef.current = true;
    apiRequest('/workorders')
      .then(data => {
        if (isMountedRef.current) {
          dispatch({ type: 'SET_WORKORDERS', payload: data });
        }
      })
      .catch(err => {
        console.error('Failed to load workorders from backend:', err);
        // Fallback: try localStorage
        try {
          const saved = localStorage.getItem('workflow_app_data');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (isMountedRef.current) {
              dispatch({ type: 'SET_WORKORDERS', payload: parsed.workorders || [] });
            }
          } else {
            if (isMountedRef.current) {
              dispatch({ type: 'SET_WORKORDERS', payload: [] });
            }
          }
        } catch {
          if (isMountedRef.current) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load workorders' });
          }
        }
      });

    return () => { isMountedRef.current = false; };
  }, []);

  // Debounced sync to backend whenever workorders change
  useEffect(() => {
    if (state.loading) return; // Don't sync during initial load

    // Also keep localStorage as fallback
    localStorage.setItem('workflow_app_data', JSON.stringify({ workorders: state.workorders, currentUser: state.currentUser }));

    // Debounce backend sync to avoid rapid-fire writes
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncToBackend(state.workorders);
    }, 500);
  }, [state.workorders, state.loading, state.currentUser]);

  // Sync all workorders to backend
  async function syncToBackend(workorders) {
    try {
      // Get current backend state
      const backendWOs = await apiRequest('/workorders');
      const backendIds = new Set(backendWOs.map(w => w.id));
      const frontendIds = new Set(workorders.map(w => w.id));

      // Delete workorders removed from frontend
      for (const bwo of backendWOs) {
        if (!frontendIds.has(bwo.id)) {
          await apiRequest(`/workorders/${bwo.id}`, 'DELETE');
        }
      }

      // Upsert each workorder
      for (const wo of workorders) {
        if (backendIds.has(wo.id)) {
          await apiRequest(`/workorders/${wo.id}`, 'PUT', wo);
        } else {
          await apiRequest('/workorders', 'POST', wo);
        }
      }
    } catch (err) {
      console.error('Backend sync failed (data is safe in localStorage):', err);
    }
  }

  const createWorkorder = useCallback((name, description) => {
    dispatch({ type: 'CREATE_WORKORDER', payload: { name, description } });
  }, []);

  const duplicateWorkorder = useCallback((workorderId) => {
    const newId = generateId();
    dispatch({ type: 'DUPLICATE_WORKORDER', payload: { workorderId, newId } });
    return newId;
  }, []);

  const addGroup = useCallback((workorderId, groupName) => {
    dispatch({ type: 'ADD_GROUP', payload: { workorderId, groupName } });
  }, []);

  const addItemToGroup = useCallback((workorderId, groupId, itemName, category, type, options, lowerLimit, upperLimit) => {
    dispatch({ type: 'ADD_ITEM_TO_GROUP', payload: { workorderId, groupId, itemName, category, type, options, lowerLimit, upperLimit } });
  }, []);

  const removeItemFromGroup = useCallback((workorderId, groupId, itemId) => {
    dispatch({ type: 'REMOVE_ITEM_FROM_GROUP', payload: { workorderId, groupId, itemId } });
  }, []);

  const submitForApproval = useCallback((workorderId) => {
    dispatch({ type: 'SUBMIT_FOR_APPROVAL', payload: { workorderId } });
  }, []);

  const saveDraft = useCallback((workorderId) => {
    dispatch({ type: 'SAVE_DRAFT', payload: { workorderId } });
  }, []);

  const approveWorkorder = useCallback((workorderId) => {
    dispatch({ type: 'APPROVE_WORKORDER', payload: { workorderId } });
  }, []);

  const rejectWorkorder = useCallback((workorderId, comment) => {
    dispatch({ type: 'REJECT_WORKORDER', payload: { workorderId, comment } });
  }, []);

  const cancelWorkorder = useCallback((workorderId, comment) => {
    dispatch({ type: 'CANCEL_WORKORDER', payload: { workorderId, comment } });
  }, []);

  const startExecution = useCallback((workorderId) => {
    dispatch({ type: 'START_EXECUTION', payload: { workorderId } });
  }, []);

  const markItemDone = useCallback((workorderId, groupId, itemId, value) => {
    dispatch({ type: 'MARK_ITEM_DONE', payload: { workorderId, groupId, itemId, value } });
  }, []);

  const markItemUndone = useCallback((workorderId, groupId, itemId, comment) => {
    dispatch({ type: 'MARK_ITEM_UNDONE', payload: { workorderId, groupId, itemId, comment } });
  }, []);

  const cancelItem = useCallback((workorderId, groupId, itemId) => {
    dispatch({ type: 'CANCEL_ITEM', payload: { workorderId, groupId, itemId } });
  }, []);

  const completeWorkorder = useCallback((workorderId) => {
    dispatch({ type: 'COMPLETE_WORKORDER', payload: { workorderId } });
  }, []);

  const markNotExecuted = useCallback((workorderId) => {
    dispatch({ type: 'MARK_NOT_EXECUTED', payload: { workorderId } });
  }, []);

  const updateItemValue = useCallback((workorderId, groupId, itemId, value) => {
    dispatch({ type: 'UPDATE_ITEM_VALUE', payload: { workorderId, groupId, itemId, value } });
  }, []);

  const value = {
    ...state,
    createWorkorder,
    addGroup,
    addItemToGroup,
    removeItemFromGroup,
    submitForApproval,
    saveDraft,
    approveWorkorder,
    rejectWorkorder,
    cancelWorkorder,
    startExecution,
    markItemDone,
    markItemUndone,
    cancelItem,
    completeWorkorder,
    markNotExecuted,
    updateItemValue,
    duplicateWorkorder,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
