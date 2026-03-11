import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ isAuthenticated, user, requireAdmin, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
