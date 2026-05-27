import { Navigate } from "react-router-dom";
import { hasAnyModule, hasModule, hasRole } from "../lib/access";
import { useAppSession } from "../hooks/useAppSession";

function ModuleRoute({ children, moduleCode, moduleCodes = [], roles = [] }) {
  const { session } = useAppSession();

  const hasRequiredModule =
    (moduleCode && hasModule(session, moduleCode)) ||
    (!moduleCode &&
      (moduleCodes.length === 0 || hasAnyModule(session, ...moduleCodes))) ||
    (moduleCode && moduleCodes.length > 0 && hasAnyModule(session, moduleCode, ...moduleCodes));

  if (!hasRequiredModule) {
    return <Navigate to="/" replace />;
  }

  if (roles.length > 0 && !hasRole(session, ...roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ModuleRoute;
