import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Role } from "../../types";

interface RoleRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

/**
 * Ensures a user has a specific role before accessing a route.
 * Must be wrapped inside <ProtectedRoute> to ensure profile exists.
 */
export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4FF]">
        <div className="w-8 h-8 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    // Redirect based on what role they *actually* have to their correct dashboard
    if (profile?.role === "system_admin" || profile?.role === "org_admin") {
      return <Navigate to="/admin" replace />;
    }
    if (profile?.role === "vendor_admin") {
      return <Navigate to="/vendor" replace />;
    }
    if (profile?.role === "vendor_technician") {
      return <Navigate to="/tech" replace />;
    }
    
    // Fallback if role is totally unknown or missing
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
