import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles = ['clerk', 'nurse', 'doctor', 'admin', 'super_admin'],
}: {
  path: string;
  component: React.ComponentType<any>;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Show loader while checking auth state
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Don't make any routing decisions while loading
  if (isLoading) {
    return null;
  }

  // Don't redirect if we're already on the auth page
  if (!user && path !== '/auth' && !isLoading) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Special handling for super_admin - redirect to clinic admin dashboard
  if (user?.role === 'super_admin' && path === '/' && location === '/' && location !== '/clinic-admin') {
    return (
      <Route path={path}>
        <Redirect to="/clinic-admin" />
      </Route>
    );
  }
  
  // Special handling for system admin - redirect to admin overview dashboard
  if (user?.role === 'admin' && path === '/' && location === '/' && location !== '/admin') {
    return (
      <Route path={path}>
        <Redirect to="/admin" />
      </Route>
    );
  }

  // Check if the user's role is in the allowed roles
  if (user && user.role && !allowedRoles.includes(user.role)) {
    // Special handling for patient results - allow clerks
    if (path === '/patient-results' && user.role === 'clerk') {
      return (
        <Route path={path}>
          {(params) => <Component {...params} />}
        </Route>
      );
    }
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // The component must be rendered within the Route to get route params
  return (
    <Route path={path}>
      {(params) => <Component {...params} />}
    </Route>
  );
}
