import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();

  // State variables to manage Clerk authentication (will be populated based on context)
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [clerkUser, setClerkUser] = useState<any>(null);
  const [signIn, setSignIn] = useState<any>(null);
  const [signInLoaded, setSignInLoaded] = useState(false);
  const [setSignInActive, setSignInActiveFunction] = useState<any>(null);
  const [signUp, setSignUp] = useState<any>(null);
  const [signUpLoaded, setSignUpLoaded] = useState(false);
  const [setSignUpActive, setSignUpActiveFunction] = useState<any>(null);
  const [isClerkLoading, setIsClerkLoading] = useState(false);
  const [clerkError, setClerkError] = useState<string | null>(null);

  // Check if Clerk is available in the current context
  const [isClerkAvailable, setIsClerkAvailable] = useState(false);

  useEffect(() => {
    // Try to detect if Clerk is available in the window object
    // We need this safety check before attempting to use any Clerk features
    try {
      if (typeof window !== 'undefined') {
        // Check if the window.Clerk object exists with expected properties
        // @ts-ignore - Safely check for Clerk presence without TypeScript errors
        const clerkInstance = window.Clerk;

        if (clerkInstance && typeof clerkInstance === 'object') {
          // Verify it has expected methods that indicate it's properly initialized
          const hasExpectedMethods = 
            typeof clerkInstance.load === 'function' &&
            typeof clerkInstance.client === 'object';

          setIsClerkAvailable(hasExpectedMethods);

          if (!hasExpectedMethods) {
            console.info("Clerk found but appears to be incompletely initialized.");
          }
        } else {
          console.info("Clerk is not initialized in the window context.");
          setIsClerkAvailable(false);
        }
      } else {
        // Non-browser environment
        console.info("Not in browser environment, Clerk unavailable.");
        setIsClerkAvailable(false);
      }
    } catch (error) {
      console.warn("Error detecting Clerk availability:", error);
      setIsClerkAvailable(false);
    }
  }, []);

  // Unified redirect logic for both Clerk and legacy auth
  useEffect(() => {
    const getTargetPath = (role?: string) => {
      switch (role) {
        case "super_admin": return "/clinic-admin";
        case "admin": return "/admin";
        case "doctor":
        case "nurse": return "/patients";
        default: return "/";
      }
    };

    if (user) {
      const targetPath = getTargetPath(user.role);

      if (!location.startsWith(targetPath)) {
        setLocation(targetPath);
      }
      return;
    }

    if (isSignedIn && clerkUser) {
      const role = clerkUser.unsafeMetadata?.role || "clerk";
      const clinicId = clerkUser.unsafeMetadata?.clinicId;

      if (!clinicId && !["admin", "super_admin"].includes(role)) {
        console.warn("No clinicId for Clerk user:", role);
        return;
      }

      const targetPath = getTargetPath(role);

      if (!location.startsWith(targetPath)) {
        setLocation(targetPath);
      }
    }
  }, [user, isSignedIn, clerkUser, location, setLocation]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "clerk", // Default role is clerk
      specialization: "",
      email: "",
    },
  });

  async function onLoginSubmit(data: LoginFormValues) {
    setClerkError(null);

    try {
      // First check if Clerk is available and enabled
      if (isClerkAvailable && signIn && signInLoaded) {
        setIsClerkLoading(true);

        // In Clerk, we use the email as the identifier - if username looks like an email
        const identifier = data.username.includes('@') ? data.username : `${data.username}@vitalyst.com`;

        try {
          const result = await signIn.create({
            identifier,
            password: data.password,
          });

          if (result && result.status === "complete" && setSignInActive) {
            // Set this session as active
            await setSignInActive({ session: result.createdSessionId });
            return; // Successfully signed in with Clerk
          }
        } catch (err: any) {
          console.log("Clerk sign-in failed, falling back to legacy auth", err);
          // Continue to legacy auth if Clerk fails
        }
      } else {
        console.log("Clerk not available, using legacy auth system");
      }

      console.log("Using regular login flow");
      // Fall back to legacy auth system
      loginMutation.mutate({
        username: data.username,
        password: data.password,
      });

    } catch (error: any) {
      setClerkError(error.message || "Authentication failed");
    } finally {
      setIsClerkLoading(false);
    }
  }

  async function onRegisterSubmit(data: RegisterFormValues) {
    setClerkError(null);

    try {
      // Get the current logged-in user (super admin)
      const creator = user; // from useAuth()

      // Check if the creator has a clinicId — if not, abort
      if (!creator?.clinicId) {
        setClerkError("Cannot create users without a clinic assignment.");
        console.error("Super admin has no clinicId — cannot assign to new user.");
        return;
      }

      if (isClerkAvailable && signUp && signUpLoaded) {
        setIsClerkLoading(true);

        try {
          const result = await signUp.create({
            emailAddress: data.email || `${data.username}@vitalyst.com`,
            password: data.password,
            username: data.username,
            unsafeMetadata: {
              fullName: data.fullName,
              specialization: data.specialization || '',
              role: data.role,
              clinicId: creator.clinicId, // ✅ Pass clinic ID from the creator
              isPrimary: false,
            },
          });

          if (result && result.status === "complete" && setSignUpActive) {
            await setSignUpActive({ session: result.createdSessionId });
            return;
          }

        } catch (err: any) {
          console.log("Clerk registration failed, falling back to legacy registration", err);
          // Continue to legacy registration if Clerk fails
        }
      } else {
        console.log("Clerk not available, using legacy registration system");
      }

      // Fall back to legacy registration system
      const { confirmPassword, ...userInfo } = data;
      registerMutation.mutate({
        ...userInfo,
        clinicId: creator.clinicId, // ✅ Pass along in legacy too
      });

    } catch (error: any) {
      setClerkError(error.message || "Registration failed");
    } finally {
      setIsClerkLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-neutral-50 dark:bg-neutral-800">
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold text-center text-primary">Vitalyst</CardTitle>
              <CardDescription className="text-center">
                Healthcare Professional Portal
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="doctor@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center justify-between">
                        <FormField
                          control={loginForm.control}
                          name="rememberMe"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">Remember me</FormLabel>
                            </FormItem>
                          )}
                        />
                        <a href="#" className="text-sm text-primary hover:underline">
                          Forgot password?
                        </a>
                      </div>
                      {clerkError && (
                        <div className="p-3 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10 mb-2">
                          {clerkError}
                        </div>
                      )}
                      <Button type="submit" className="w-full" disabled={loginMutation.isPending || isClerkLoading}>
                        {(loginMutation.isPending || isClerkLoading) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Sign in
                      </Button>
                    </form>
                  </Form>
            </CardContent>
          </Card>
        </div>
        <div className="hidden md:flex flex-col justify-center">
          <div className="bg-gradient-to-br from-primary to-blue-500 text-white rounded-lg p-8 shadow-lg">
            <h2 className="text-3xl font-bold mb-4">Vitalyst Healthcare Portal</h2>
            <p className="text-lg mb-6">A secure platform for medical professionals to manage patient records and medical history.</p>
            <ul className="space-y-4">
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Secure patient data management</span>
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Comprehensive medical history forms</span>
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Efficient patient record searching</span>
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Professional healthcare dashboard</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}