import './StatusBadge.css';

const statusConfig = {
  'Pending Approval': { className: 'status-pending',    icon: '●' },
  'Approved':         { className: 'status-approved',   icon: '✓' },
  'Rejected':         { className: 'status-rejected',   icon: '✕' },
  'Cancelled':        { className: 'status-cancelled',  icon: '—' },
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
