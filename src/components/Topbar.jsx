import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../firebase/auth';

const COLORS = ['#1a73e8', '#e8710a', '#0d652d', '#9334e6', '#c5221f', '#f9ab00'];

export default function Topbar() {
  const { user } = useAuth();
  const loc = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'الرئيسية', icon: 'ti ti-home' },
    { to: '/calendar', label: 'التقويم', icon: 'ti ti-calendar' },
    { to: '/grades', label: 'الدرجات', icon: 'ti ti-chart-bar' },
  ];

  return (
    <header className="topbar">
      <Link to="/dashboard" className="logo">
        <i className="ti ti-school" aria-hidden="true"></i><span>المدرسة النظامية</span>
      </Link>
      <nav className="topbar-center" aria-label="التنقل الرئيسي">
        {navLinks.map(l => (
          <Link key={l.to} to={l.to} className={`nav-tab${loc.pathname === l.to ? ' active' : ''}`}>
            <i className={l.icon} aria-hidden="true"></i><span> {l.label}</span>
          </Link>
        ))}
      </nav>
      <div className="topbar-left">
        <button className="btn-icon" aria-label="الإشعارات"><i className="ti ti-bell" aria-hidden="true"></i></button>
        <Link to="/profile" className="user-btn">
          <div className="avatar" aria-hidden="true" style={{ background: COLORS[(user?.name?.length || 0) % COLORS.length] }}>
            {user?.name?.substring(0, 2) || '?'}
          </div>
          <span>{user?.name || 'جاري التحميل...'}</span>
        </Link>
        <button className="btn-icon" onClick={() => { logout(); localStorage.removeItem('edu_user'); }} title="تسجيل الخروج" aria-label="تسجيل الخروج">
          <i className="ti ti-logout" aria-hidden="true"></i>
        </button>
      </div>
    </header>
  );
}
