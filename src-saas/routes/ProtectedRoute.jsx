import { Navigate } from "react-router-dom";
import { hasAnyPermission, hasPermission, hasRole } from "../lib/access";
import { useAppSession } from "../hooks/useAppSession";

function ProtectedRoute({
  children,
  roles = [],
  permissions = [],
  anyPermissions = [],
}) {
  const { isAuthenticated, session } = useAppSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !hasRole(session, ...roles)) {
    return <Navigate to="/" replace />;
  }

  if (
    permissions.length > 0 &&
    !permissions.every((permission) => hasPermission(session, permission))
  ) {
    return <Navigate to="/" replace />;
  }

  if (
    anyPermissions.length > 0 &&
    !hasAnyPermission(session, ...anyPermissions)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
