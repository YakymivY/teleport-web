import { Navigate, Outlet, useLocation } from "react-router-dom";

export const PrivateRoute = () => {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

