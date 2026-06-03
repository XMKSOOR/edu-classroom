import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><i className="ti ti-loader" aria-hidden="true"></i></div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
