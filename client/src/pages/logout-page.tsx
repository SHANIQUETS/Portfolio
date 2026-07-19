import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Redirect } from "wouter";

export default function LogoutPage() {
  const { logoutMutation, user } = useAuth();
  const [hasTriggeredLogout, setHasTriggeredLogout] = useState(false);
  const [forceRedirect, setForceRedirect] = useState(false);

  useEffect(() => {
    // Immediately clear all auth tokens to prevent authenticated requests
    localStorage.removeItem('directLoginToken');
    localStorage.removeItem('directLoginUser');
    localStorage.removeItem('lastLoginMethod');
    localStorage.removeItem('loginTime');
    
    // Trigger logout mutation if user exists and haven't tried yet
    if (!hasTriggeredLogout) {
      setHasTriggeredLogout(true);
      logoutMutation.mutate();
    }
    
    // Force redirect after a short delay regardless of mutation state
    const redirectTimer = setTimeout(() => {
      setForceRedirect(true);
      window.location.href = "/auth"; // Force hard navigation to clear any state
    }, 1000);
    
    // Clean up timer if component unmounts
    return () => clearTimeout(redirectTimer);
  }, [logoutMutation, hasTriggeredLogout]);

  // Only redirect when we're sure about the state
  // Don't redirect while mutation is in progress
  if ((logoutMutation.isSuccess || !user || forceRedirect) && !logoutMutation.isLoading) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
      <h1 className="text-2xl font-semibold">Logging out...</h1>
      <p className="text-muted-foreground mt-2">You will be redirected shortly.</p>
    </div>
  );
}