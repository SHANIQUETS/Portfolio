
import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle } from "lucide-react";

type RequireRoleProps = {
  roles: string[];
  children: ReactNode;
};

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, isLoading } = useAuth();

  // Don't make role decisions while still loading
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"/>
    </div>;
  }

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center flex-col text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-xl font-semibold text-red-600">Access Denied</p>
        <p className="text-muted-foreground mt-1">You do not have permission to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
