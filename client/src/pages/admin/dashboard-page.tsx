import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Check, Users, Calendar, ClipboardList, FileText, Activity, Shield, LogOut, Building, Plus, Hospital } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SystemStats {
  users: number;
  patients: number;
  appointments: number;
  medicalRecords: number;
  lastUpdated: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
  specialization?: string;
  clinicId?: string;
}

interface AuditLogEntry {
  id: number;
  userId: number | null;
  username?: string;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
}

interface SystemHealth {
  status: string;
  uptime: number;
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

interface ClinicTier {
  name: string;
  description: string;
  limits: Record<string, number | string>;
  price: string;
}

interface ClinicTiers {
  [key: string]: ClinicTier;
}

// Define validation schema for clinic registration
const registerClinicSchema = z.object({
  name: z.string().min(3, { message: "Clinic name must be at least 3 characters" }),
  tier: z.string().min(1, { message: "Please select a clinic tier" }),
  superAdminName: z.string().min(2, { message: "Admin name must be at least 2 characters" }),
  superAdminEmail: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type RegisterClinicFormValues = z.infer<typeof registerClinicSchema>;

function AdminDashboardPage() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Create form for clinic registration
  const clinicForm = useForm<RegisterClinicFormValues>({
    resolver: zodResolver(registerClinicSchema),
    defaultValues: {
      name: "",
      tier: "",
      superAdminName: "",
      superAdminEmail: "",
      password: ""
    }
  });
  
  // Determine admin type for conditional rendering
  const isSystemAdmin = user?.role === 'admin';
  const isClinicSuperAdmin = user?.role === 'super_admin';

  // Redirect if not admin or super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin" && user.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  // Fetch system statistics
  const { 
    data: stats, 
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats
  } = useQuery<SystemStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch all users
  const { 
    data: users, 
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers 
  } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: activeTab === "users"
  });

  // Fetch audit logs with pagination
  const { 
    data: auditLogs, 
    isLoading: logsLoading,
    isError: logsError,
    refetch: refetchLogs
  } = useQuery<AuditLogsResponse>({
    queryKey: ['/api/admin/audit-logs', { page, limit: 50 }],
    enabled: activeTab === "audit"
  });

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get health status
  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch available clinic tiers
  const { 
    data: clinicTiers, 
    isLoading: tiersLoading 
  } = useQuery<ClinicTiers>({
    queryKey: ['/api/clinic/tiers'],
    enabled: activeTab === "clinics"
  });
  
  // Create new clinic mutation
  const createClinicMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      tier: string;
      superAdminName: string;
      superAdminEmail: string;
      password: string;
    }) => {
      const res = await apiRequest("POST", "/api/clinic/register", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Clinic Created",
        description: "New clinic has been successfully registered",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to handle clinic registration form submission
  const onRegisterClinic = (values: RegisterClinicFormValues) => {
    createClinicMutation.mutate(values, {
      onSuccess: () => {
        clinicForm.reset();
      }
    });
  };

  const handleChangeRole = (userId: number, newRole: string) => {
    updateUserRole.mutate({ userId, role: newRole });
  };

  const nextPage = () => {
    if (auditLogs && page * 50 < auditLogs.total) {
      setPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500';
      case 'admin':
        return 'bg-orange-500';
      case 'doctor':
        return 'bg-blue-500';
      case 'nurse':
        return 'bg-green-500';
      case 'clerk':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500';
      case 'update':
        return 'bg-blue-500';
      case 'delete':
        return 'bg-red-500';
      case 'view':
        return 'bg-gray-500';
      case 'merge':
        return 'bg-purple-500';
      case 'activate':
        return 'bg-green-500';
      case 'deactivate':
        return 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h1 className="ml-4 text-2xl font-bold">Access Denied</h1>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isSystemAdmin 
              ? "System Administration" 
              : "Clinic Administration"}
          </h1>
          <p className="text-muted-foreground">
            {isSystemAdmin 
              ? "Manage platform-wide settings, clinics, and system configuration" 
              : "Manage clinic settings, users, and view audit logs"}
          </p>
        </div>
        <div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => {
              logoutMutation.mutate();
              setLocation("/auth");
            }}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {isSystemAdmin ? (
          // System Admin Tabs (Administrator)
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="clinics">Clinic Management</TabsTrigger>
            <TabsTrigger value="audit">System Audit Logs</TabsTrigger>
          </TabsList>
        ) : (
          // Clinic Admin Tabs (Super Admin)
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Clinic Overview</TabsTrigger>
            <TabsTrigger value="users">Clinic Staff</TabsTrigger>
            <TabsTrigger value="audit">Activity Logs</TabsTrigger>
          </TabsList>
        )}

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* System Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : statsError ? (
                  <span className="text-sm text-red-500">Error loading data</span>
                ) : (
                  <div className="text-2xl font-bold">{stats?.users || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : statsError ? (
                  <span className="text-sm text-red-500">Error loading data</span>
                ) : (
                  <div className="text-2xl font-bold">{stats?.patients || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : statsError ? (
                  <span className="text-sm text-red-500">Error loading data</span>
                ) : (
                  <div className="text-2xl font-bold">{stats?.appointments || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medical Records</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : statsError ? (
                  <span className="text-sm text-red-500">Error loading data</span>
                ) : (
                  <div className="text-2xl font-bold">{stats?.medicalRecords || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* System Health Card */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>
                  Current status of the server resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                {health ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Operational
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Uptime:</span>
                      <span className="text-sm font-medium">
                        {health && 'uptime' in health ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'Unknown'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Memory Usage:</span>
                      <span className="text-sm font-medium">
                        {health && 'memory' in health && health.memory ? 
                          `${Math.round(health.memory.heapUsed / 1024 / 1024)} MB / ${Math.round(health.memory.heapTotal / 1024 / 1024)} MB` 
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest system actions and events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs && auditLogs.logs.length > 0 ? (
                  <div className="space-y-4">
                    {auditLogs.logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-start gap-3">
                        <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {log.username || `User ID: ${log.userId}`}
                            <Badge className={`ml-2 ${getActionColor(log.action)}`} variant="secondary">
                              {log.action}
                            </Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">{log.details}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : 'Unknown time'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20">
                    <p className="text-sm text-muted-foreground">No recent activity found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab - With different permissions for System Admin vs Clinic Super Admin */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                {isSystemAdmin 
                  ? "Manage platform users and their permissions" 
                  : "Manage clinic staff and their roles"} 
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : usersError ? (
                <div className="flex justify-center items-center h-32 text-red-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Error loading users. Please try again.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Clinic</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && users.length > 0 ? (
                        users.map((tableUser) => (
                          <TableRow key={tableUser.id}>
                            <TableCell>{tableUser.id}</TableCell>
                            <TableCell className="font-medium">{tableUser.username}</TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(tableUser.role)}>
                                {tableUser.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{tableUser.email || '-'}</TableCell>
                            <TableCell>
                              {tableUser.clinicId ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                  {tableUser.clinicId === 'system' ? 'System' : tableUser.clinicId}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{tableUser.specialization || '-'}</TableCell>
                            <TableCell>
                              {/* Different role options based on admin type */}
                              <select
                                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                                value={tableUser.role}
                                onChange={(e) => handleChangeRole(tableUser.id, e.target.value)}
                                disabled={
                                  updateUserRole.isPending || 
                                  // Clinic Super Admins cannot modify System Admins
                                  (isClinicSuperAdmin && tableUser.role === 'admin') ||
                                  // No one can modify their own role
                                  (user && user.id === tableUser.id) ||
                                  // System-wide admin users can only be modified by other system admins
                                  (tableUser.clinicId === 'system' && !isSystemAdmin)
                                }
                              >
                                <option value="clerk">Clerk</option>
                                <option value="nurse">Nurse</option>
                                <option value="doctor">Doctor</option>
                                {/* Only system admins can create other system admins */}
                                {isSystemAdmin && <option value="admin">System Admin</option>}
                                {/* Only system admins or clinic super admins can create super admins */}
                                {(isSystemAdmin || isClinicSuperAdmin) && 
                                  <option value="super_admin">Clinic Super Admin</option>}
                              </select>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinic Management Tab - Only for System Admins */}
        <TabsContent value="clinics" className="space-y-4">
          {!isSystemAdmin ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Shield className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                <p className="text-muted-foreground text-center">
                  Only System Administrators can access clinic management features.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Register New Clinic */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hospital className="h-5 w-5" /> 
                    Register New Clinic
                  </CardTitle>
                  <CardDescription>
                    Create a new clinic and assign a super admin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tiersLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Form {...clinicForm}>
                      <form onSubmit={clinicForm.handleSubmit(onRegisterClinic)} className="space-y-6">
                        <FormField
                          control={clinicForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinic Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter clinic name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={clinicForm.control}
                          name="tier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinic Tier</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a clinic tier" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clinicTiers && Object.entries(clinicTiers).map(([key, tier]) => (
                                    <SelectItem key={key} value={key}>
                                      {tier.name} - {tier.price}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Each tier has different user limits and features
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Separator className="my-4" />
                        <h3 className="text-lg font-medium mb-4">Super Admin Account</h3>
                        
                        <FormField
                          control={clinicForm.control}
                          name="superAdminName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter admin username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={clinicForm.control}
                          name="superAdminEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Enter admin email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={clinicForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Create a secure password" {...field} />
                              </FormControl>
                              <FormDescription>
                                Must be at least 8 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createClinicMutation.isPending}
                        >
                          {createClinicMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Register Clinic
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
              
              {/* Clinic Tiers Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Clinic Tiers
                  </CardTitle>
                  <CardDescription>
                    Available tiers and their features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tiersLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : clinicTiers ? (
                    <div className="space-y-6">
                      {Object.entries(clinicTiers).map(([key, tier]) => (
                        <div key={key} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg">{tier.name}</h3>
                            <Badge>{tier.price}</Badge>
                          </div>
                          <p className="text-muted-foreground mb-4">{tier.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(tier.limits).map(([role, limit]) => (
                              <div key={role} className="flex items-center justify-between">
                                <span className="capitalize">{role}s:</span>
                                <Badge variant="outline">{limit}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-32 text-red-500">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Error loading clinic tiers
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Review all system activity and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : logsError ? (
                <div className="flex justify-center items-center h-32 text-red-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Error loading audit logs. Please try again.
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity Type</TableHead>
                          <TableHead>Entity ID</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs && auditLogs.logs.length > 0 ? (
                          auditLogs.logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>{log.id}</TableCell>
                              <TableCell>{log.username || `ID: ${log.userId}`}</TableCell>
                              <TableCell>
                                <Badge className={getActionColor(log.action)}>
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.entityType}</TableCell>
                              <TableCell>{log.entityId || '-'}</TableCell>
                              <TableCell>
                                <div className="max-w-xs truncate">
                                  {log.details || '-'}
                                </div>
                              </TableCell>
                              <TableCell>{log.ipAddress || '-'}</TableCell>
                              <TableCell>
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center h-24">
                              No audit logs found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {auditLogs && auditLogs.total > 0 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, auditLogs.total)} of {auditLogs.total} entries
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={prevPage}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={nextPage}
                          disabled={page * 50 >= auditLogs.total}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminDashboardPage;