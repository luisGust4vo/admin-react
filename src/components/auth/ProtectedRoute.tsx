import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { hasAuthToken } from "../../utils/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(hasAuthToken);

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(hasAuthToken());
    };

    syncAuthState();

    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);

    const intervalId = window.setInterval(syncAuthState, 1000);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
      window.clearInterval(intervalId);
    };
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
