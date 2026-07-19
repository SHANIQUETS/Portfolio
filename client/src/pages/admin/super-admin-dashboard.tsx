import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Layout from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types for clinic statistics
interface ClinicStats {
  users: number;
  patients: number;
  appointments: number;
  medicalRecords: number;
  lastUpdated: string;
}

// Types for user management
interface User {
  id: number;
  username: string;
  name?: string;
  role: string;
  email?: string;
  specialization?: string;
  is_primary?: boolean;
  created_at?: string;
}

// Types for audit logs
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

// Types for clinic information
interface ClinicInfo {
  id: string;
  name: string;
  tier: string;
  address?: string;
  userCounts: Record<string, number>;
  available: Record<string, number | string>;
  user_limits: Record<string, number | string>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Super Admin Dashboard specifically for clinic administrators
 * This dashboard focuses on clinic-specific management
 */
// Form schema for creating a new user
const createUserSchema = z.object({
  username: z.string().email({ message: "Must be a valid email address" }),
  fullName: z.string().min(3, { message: "Name must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.string().refine((val) => ['super_admin', 'doctor', 'nurse', 'clerk'].includes(val), {
    message: "Invalid role selected"
  }),
  specialization: z.string().optional(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

function SuperAdminDashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [auditPage, setAuditPage] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState<boolean>(false);
  
  // Form setup for creating a new user
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
      role: "doctor",
      specialization: "",
    },
  });
  
  // Mutation to create a new user
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormValues) => {
      // Format the data to match backend expectations
      const userData = {
        username: data.username,
        email: data.username, // Using the same email as username
        name: data.fullName,
        password: data.password,
        role: data.role,
        specialization: data.specialization || ""
      };
      const res = await apiRequest("POST", "/api/clinic/users", userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been successfully created",
      });
      setCreateUserDialogOpen(false);
      form.reset();
      refetchUsers();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onCreateUser = (values: CreateUserFormValues) => {
    createUserMutation.mutate(values);
  };
  
  // Get overall system statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = 
    useQuery<ClinicStats>({ 
      queryKey: ['/api/admin/stats'],
      retry: false,
      refetchInterval: 60000, // Refresh every minute
    });
    
  // Get clinic information
  const { data: clinicInfo, isLoading: clinicLoading, refetch: refetchClinic } = 
    useQuery<ClinicInfo>({ 
      queryKey: ['/api/clinic'],
      retry: false,
      refetchInterval: 60000, // Refresh every minute
    });

  // Get clinic users
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = 
    useQuery<User[]>({ 
      queryKey: ['/api/clinic/users'],
      retry: false,
    });
    
  // Get audit logs with pagination
  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAudit } = 
    useQuery<AuditLogsResponse>({ 
      queryKey: ['/api/admin/audit-logs', { page: auditPage, limit: 10 }],
      retry: false,
    });
    
  // Get system health - useful for showing if system is working correctly
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = 
    useQuery<{ status: string; uptime: number; }>({ 
      queryKey: ['/api/admin/health'],
      retry: false,
      refetchInterval: 30000, // Refresh every 30 seconds
    });
    
  const filteredUsers = users?.filter(user => 
    selectedRole === "all" || user.role.toLowerCase() === selectedRole.toLowerCase()
  );
  
  const formatUptime = (seconds: number): string => {
    if (!seconds) return "Unknown";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days ? days + 'd ' : ''}${hours ? hours + 'h ' : ''}${minutes}m`;
  };
  
  const refreshAll = () => {
    refetchStats();
    refetchUsers();
    refetchAudit();
    refetchHealth();
    refetchClinic();
    toast({
      title: "Refreshed",
      description: "Dashboard data has been refreshed",
    });
  };
  
  // Generate initials from a username or name
  const getInitials = (name: string = "") => {
    if (!name) return "?";
    return name.split(" ")
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };
  
  // Role colors for badges
  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: "bg-red-500 hover:bg-red-600",
      super_admin: "bg-purple-500 hover:bg-purple-600",
      doctor: "bg-blue-500 hover:bg-blue-600",
      nurse: "bg-green-500 hover:bg-green-600",
      clerk: "bg-gray-500 hover:bg-gray-600",
    };
    
    return roleColors[role.toLowerCase()] || "bg-slate-500 hover:bg-slate-600";
  };
  
  // Format audit log timestamps
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return "Unknown date";
    }
  };
  
  if (statsLoading || usersLoading || auditLoading || healthLoading || clinicLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container px-4 md:px-6 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your clinic resources and monitor system health
            </p>
          </div>
        
          <div className="flex items-center gap-2">
            <Badge variant={health?.status === "ok" ? "outline" : "destructive"} className="gap-1 text-sm py-1">
              {health?.status === "ok" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              System Status: {health?.status === "ok" ? "Healthy" : "Issues Detected"}
            </Badge>
            <Button onClick={refreshAll} size="sm" variant="outline" className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {clinicInfo && (
          <Card className="mb-8">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-xl">Clinic Information</CardTitle>
              <CardDescription>
                {clinicInfo.name} - {clinicInfo.tier} Plan
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="text-muted-foreground mb-1 text-sm">Clinic ID</div>
                  <div className="text-base font-medium truncate">{clinicInfo.id}</div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="text-muted-foreground mb-1 text-sm">Address</div>
                  <div className="text-base font-medium">{clinicInfo.address || "Not set"}</div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="text-muted-foreground mb-1 text-sm">Created</div>
                  <div className="text-base font-medium">
                    {clinicInfo.created_at ? formatTimestamp(clinicInfo.created_at) : "Unknown"}
                  </div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="text-muted-foreground mb-1 text-sm">Last Updated</div>
                  <div className="text-base font-medium">
                    {clinicInfo.updated_at ? formatTimestamp(clinicInfo.updated_at) : "Unknown"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-1 md:grid-cols-3 h-auto gap-2 md:gap-4">
            <TabsTrigger value="overview" className="py-2">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="py-2">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="audit" className="py-2">
              <Clock className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clinicInfo?.userCounts?.total || stats?.users || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {health?.status === "ok" 
                      ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                      : "System needs attention"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.patients || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {health?.status === "ok" 
                      ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                      : "System needs attention"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.appointments || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {health?.status === "ok" 
                      ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                      : "System needs attention"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medical Records</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.medicalRecords || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {health?.status === "ok" 
                      ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                      : "System needs attention"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health and resource utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium text-sm">Status</span>
                    <Badge variant={health?.status === "ok" ? "outline" : "destructive"}>
                      {health?.status === "ok" ? "Healthy" : "Issues Detected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium text-sm">Uptime</span>
                    <span>{formatUptime(health?.uptime || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Last Check</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>User Allocations</CardTitle>
                  <CardDescription>User limits based on your clinic plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clinicInfo && ["doctor", "nurse", "clerk", "super_admin"].map(role => (
                    <div key={role} className="flex items-center justify-between border-b pb-2">
                      <span className="font-medium text-sm capitalize">{role.replace('_', ' ')}s</span>
                      <div className="flex items-center gap-2">
                        <span>{clinicInfo.userCounts[role] || 0}</span>
                        <span className="text-muted-foreground">/</span>
                        <span>{clinicInfo.user_limits[role] || 0}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage users and their roles within your clinic</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="default" 
                      className="gap-2"
                      onClick={() => setCreateUserDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Add New User
                    </Button>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="clerk">Clerk</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => refetchUsers()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{getInitials(user.name || user.username)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.name || user.username}</div>
                                  <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email || user.username}</TableCell>
                            <TableCell>
                              <Badge className={`${getRoleColor(user.role)} text-white`}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.is_primary ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                                  Primary
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  Standard
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>Track user activities across the system</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => refetchAudit()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs && auditLogs.logs && auditLogs.logs.length > 0 ? (
                        auditLogs.logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell>
                              {log.username || `User ${log.userId || "Unknown"}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="capitalize">{log.entityType.replace('_', ' ')}</div>
                              {log.entityId && (
                                <div className="text-xs text-muted-foreground">ID: {log.entityId}</div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {log.details || "No details available"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {auditLogs && auditLogs.total > 0 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                            disabled={auditPage === 1}
                          >
                            Previous
                          </Button>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink>{auditPage}</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setAuditPage(p => p + 1)}
                            disabled={!auditLogs || auditLogs.logs.length < 10}
                          >
                            Next
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog for creating a new user */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for your clinic. The user will receive an email with login instructions.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="user@example.com" 
                        {...field} 
                        autoComplete="off" 
                      />
                    </FormControl>
                    <FormDescription>
                      This will be used as the username for login
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Dr. Jane Smith" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="•••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 6 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="clerk">Clerk</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This determines what actions the user can perform
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Cardiology" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional field for doctors
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateUserDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default SuperAdminDashboardPage;