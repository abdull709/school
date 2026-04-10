
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, userRole, initialLoading } = useAuth();
  const location = useLocation();

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins can access student, teacher, and parent dashboards for impersonation
  const isAdminBypass = userRole === 'admin' && [
    '/student-dashboard', 
    '/teacher-dashboard', 
    '/parent-dashboard'
  ].includes(location.pathname);

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole) && !isAdminBypass) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
