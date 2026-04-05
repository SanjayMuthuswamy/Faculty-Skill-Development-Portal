import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { Role } from '../../lib/types';
import { LoadingState } from '../../components/ui/LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState label="Checking access" fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate dashboard if unauthorized for this specific route
    const destination = user.role === 'admin' ? '/admin/dashboard' : '/faculty/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}
