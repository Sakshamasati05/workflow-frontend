import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext();

const generateId = () => 'WO-' + String(Math.floor(1000 + Math.random() * 9000));
const generateItemId = () => 'ITM-' + String(Math.floor(10000 + Math.random() * 90000));

const initialState = {
  workorders: [],
  currentUser: 'Alex Morgan',
};

function appReducer(state, action) {
  switch (action.type) {
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
      };
      return { ...state, workorders: [...state.workorders, newWO] };
    }

    case 'ADD_GROUP': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? {
                ...wo,
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
                groups: wo.groups.map(g =>
                  g.id === action.payload.groupId
                    ? {
                        ...g,
                        items: [
                          ...g.items,
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
            ? { ...wo, status: 'Pending Approval' }
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
            ? { ...wo, status: 'Approved' }
            : wo
        ),
      };
    }

    case 'REJECT_WORKORDER': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Rejected', rejectionComment: action.payload.comment }
            : wo
        ),
      };
    }

    case 'CANCEL_WORKORDER': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Cancelled', cancellationComment: action.payload.comment || '' }
            : wo
        ),
      };
    }

    case 'START_EXECUTION': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Pending Execution' }
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
            ? { ...wo, status: 'Completed' }
            : wo
        ),
      };
    }

    case 'MARK_NOT_EXECUTED': {
      return {
        ...state,
        workorders: state.workorders.map(wo =>
          wo.id === action.payload.workorderId
            ? { ...wo, status: 'Not Executed' }
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

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const createWorkorder = useCallback((name, description) => {
    dispatch({ type: 'CREATE_WORKORDER', payload: { name, description } });
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
