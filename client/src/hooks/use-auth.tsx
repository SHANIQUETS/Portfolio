import { createContext, ReactNode, useContext } from "react";
import { useMutation, useQuery, UseMutationResult } from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginData = Pick<InsertUser, "username" | "password">;

interface AuthContextType {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
}

interface AuthProviderProps {
  children: ReactNode;
  clerkEnabled?: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const { toast } = useToast();
  const { data: user, isLoading, error } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation<SelectUser, Error, LoginData>({
    mutationFn: async (credentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return res.json();
    },
    onSuccess: (loggedInUser) => {
      queryClient.setQueryData(["/api/user"], loggedInUser);
      toast({ title: "Signed in", description: `Welcome, ${loggedInUser.fullName || loggedInUser.username}.` });
    },
    onError: (loginError) => {
      toast({ title: "Sign-in failed", description: loginError.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation<SelectUser, Error, InsertUser>({
    mutationFn: async (newUser) => {
      const res = await apiRequest("POST", "/api/register", newUser);
      return res.json();
    },
    onSuccess: (registeredUser) => {
      queryClient.setQueryData(["/api/user"], registeredUser);
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      window.location.href = "/auth";
    },
  });

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, error: error ?? null, loginMutation, logoutMutation, registerMutation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
