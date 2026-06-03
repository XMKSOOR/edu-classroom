import { useNotify } from '../contexts/NotificationContext';

export default function Notification() {
  const { notifications } = useNotify();
  if (!notifications.length) return null;
  return (
    <div id="notification" className="notification" role="alert" aria-live="polite">
      {notifications.map(n => (
        <div key={n.id}><i className="ti ti-info-circle" aria-hidden="true"></i> {n.msg}</div>
      ))}
    </div>
  );
}
