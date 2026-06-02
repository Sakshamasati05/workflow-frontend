import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext();

const API_URL = 'http://localhost:5001/api';

const createAudit = (user, action, details = '') => ({
  id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
  timestamp: new Date().toLocaleString(),
  user,
  action,
  details,
});

export function AppProvider({ children }) {
  const [workorders, setWorkorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = 'Saksham Asati';

  // Fetch all workorders
  const fetchWorkorders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/workorders`);
      const data = await res.json();
      setWorkorders(data);
    } catch (error) {
      console.error('Failed to fetch workorders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkorders();
  }, [fetchWorkorders]);

  // Approve
  const approveWorkorder = async (workorderId) => {
    try {
      const auditEvent = createAudit(currentUser, 'Approved Workorder');
      const res = await fetch(`${API_URL}/workorders/${workorderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved', auditEvent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkorders(prev => prev.map(w => w.id === workorderId ? updated : w));
      }
    } catch (error) {
      console.error('Failed to approve workorder:', error);
    }
  };

  // Reject
  const rejectWorkorder = async (workorderId, comment) => {
    try {
      const auditEvent = createAudit(currentUser, 'Rejected Workorder', `Reason: ${comment}`);
      const res = await fetch(`${API_URL}/workorders/${workorderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', rejectionComment: comment, auditEvent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkorders(prev => prev.map(w => w.id === workorderId ? updated : w));
      }
    } catch (error) {
      console.error('Failed to reject workorder:', error);
    }
  };

  // Cancel
  const cancelWorkorder = async (workorderId) => {
    try {
      const auditEvent = createAudit(currentUser, 'Cancelled Workorder');
      const res = await fetch(`${API_URL}/workorders/${workorderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled', auditEvent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkorders(prev => prev.map(w => w.id === workorderId ? updated : w));
      }
    } catch (error) {
      console.error('Failed to cancel workorder:', error);
    }
  };

  // Reset Demo
  const resetDemo = async () => {
    try {
      const res = await fetch(`${API_URL}/reset`, { method: 'POST' });
      if (res.ok) {
        const { data } = await res.json();
        setWorkorders(data);
      }
    } catch (error) {
      console.error('Failed to reset demo:', error);
    }
  };

  const value = {
    workorders,
    currentUser,
    loading,
    approveWorkorder,
    rejectWorkorder,
    cancelWorkorder,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
