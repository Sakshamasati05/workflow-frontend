import { createContext, useContext, useReducer, useEffect, useRef } from 'react';

const AppContext = createContext();
const API_BASE = 'http://localhost:5001/api';

const defaultState = { workorders: [], loading: true, error: null };

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_WORKORDERS':
      return { ...state, workorders: action.payload, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_WORKORDER':
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.id ? action.payload : wo
        ),
      };
    default:
      return state;
  }
}

async function apiRequest(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, defaultState);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    apiRequest('/workorders')
      .then(data => {
        if (mounted.current) dispatch({ type: 'SET_WORKORDERS', payload: data });
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem('workflow_app_data');
          const parsed = saved ? JSON.parse(saved) : null;
          dispatch({ type: 'SET_WORKORDERS', payload: parsed?.workorders || [] });
        } catch {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load workorders' });
        }
      });
    return () => { mounted.current = false; };
  }, []);

  const approveWorkorder = async (workorderId) => {
    const wo = state.workorders.find(w => w.id === workorderId);
    if (!wo) return;
    const updated = {
      ...wo,
      status: 'Approved',
      auditTrail: [...(wo.auditTrail || []), {
        id: 'AUD-' + Date.now(),
        timestamp: new Date().toLocaleString(),
        user: 'Saksham Asati',
        action: 'Approved Workorder',
        details: '',
      }],
    };
    dispatch({ type: 'UPDATE_WORKORDER', payload: updated });
    try { await apiRequest(`/workorders/${workorderId}`, 'PUT', updated); } catch {}
    localStorage.setItem('workflow_app_data', JSON.stringify({ workorders: state.workorders.map(w => w.id === workorderId ? updated : w) }));
  };

  const rejectWorkorder = async (workorderId, comment) => {
    const wo = state.workorders.find(w => w.id === workorderId);
    if (!wo) return;
    const updated = {
      ...wo,
      status: 'Rejected',
      rejectionComment: comment,
      auditTrail: [...(wo.auditTrail || []), {
        id: 'AUD-' + Date.now(),
        timestamp: new Date().toLocaleString(),
        user: 'Saksham Asati',
        action: 'Rejected Workorder',
        details: `Reason: ${comment}`,
      }],
    };
    dispatch({ type: 'UPDATE_WORKORDER', payload: updated });
    try { await apiRequest(`/workorders/${workorderId}`, 'PUT', updated); } catch {}
    localStorage.setItem('workflow_app_data', JSON.stringify({ workorders: state.workorders.map(w => w.id === workorderId ? updated : w) }));
  };

  const cancelWorkorder = async (workorderId, comment) => {
    const wo = state.workorders.find(w => w.id === workorderId);
    if (!wo) return;
    const updated = {
      ...wo,
      status: 'Cancelled',
      cancellationComment: comment || '',
      auditTrail: [...(wo.auditTrail || []), {
        id: 'AUD-' + Date.now(),
        timestamp: new Date().toLocaleString(),
        user: 'Saksham Asati',
        action: 'Cancelled Workorder',
        details: comment ? `Reason: ${comment}` : '',
      }],
    };
    dispatch({ type: 'UPDATE_WORKORDER', payload: updated });
    try { await apiRequest(`/workorders/${workorderId}`, 'PUT', updated); } catch {}
    localStorage.setItem('workflow_app_data', JSON.stringify({ workorders: state.workorders.map(w => w.id === workorderId ? updated : w) }));
  };

  return (
    <AppContext.Provider value={{ ...state, approveWorkorder, rejectWorkorder, cancelWorkorder }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
