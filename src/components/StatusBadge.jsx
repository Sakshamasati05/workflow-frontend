import './StatusBadge.css';

const statusConfig = {
  'Draft': { className: 'status-draft', icon: '○' },
  'Pending Approval': { className: 'status-pending', icon: '●' },
  'Approved': { className: 'status-approved', icon: '✓' },
  'Rejected': { className: 'status-rejected', icon: '✕' },
  'Cancelled': { className: 'status-cancelled', icon: '—' },
  'Pending Execution': { className: 'status-execution', icon: '●' },
  'In Progress': { className: 'status-in-progress', icon: '◒' },
  'Completed': { className: 'status-completed', icon: '✓' },
  'Not Executed': { className: 'status-not-executed', icon: '✕' },
  'Pending': { className: 'status-item-pending', icon: '○' },
  'Done': { className: 'status-item-done', icon: '✓' },
  'Undone': { className: 'status-item-undone', icon: '↩' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { className: 'status-default', icon: '○' };
  return (
    <span className={`status-badge ${config.className}`}>
      <span className="status-icon">{config.icon}</span>
      {status}
    </span>
  );
}
