import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { JAMAICA_PARISHES, JAMAICA_CITIES } from "@/lib/constants";
import {
  Activity,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings,
  RefreshCw,
  LogOut,
  Plus,
  Building,
  CloudUpload,
  Archive,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CreditCard,
  MessagesSquare,
  HelpCircle,
  Cog,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Power,
  Loader2,
  UserCog,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";

// Types for system statistics
interface SystemStats {
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
  clinicId?: string;
  clinicName?: string;
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

// Type for System Health
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

// Types for clinic tiers and plans
interface ClinicTier {
  name: string;
  description: string;
  limits: Record<string, number | string>;
  price: string;
}

interface ClinicTiers {
  [key: string]: ClinicTier;
}

// Clinic interface
interface Clinic {
  id: string;
  name: string;
  tier: string;
  address: string | null;
  status: string;
  createdAt: string;
  adminName?: string | null;
  adminRole?: string | null;
  entityType?: string; // "clinic" or "platform_admin" - defaults to "clinic" if missing
}

// Schema for clinic registration
const registerClinicSchema = z.object({
  name: z.string().min(2, "Clinic name must be at least 2 characters"),
  tier: z.string().min(1, "Please select a tier"),
  customPrice: z.coerce
    .number()
    .nonnegative("Price must be a positive number")
    .multipleOf(0.01, "Price must have at most 2 decimal places")
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true;
        return !isNaN(val) && val > 0;
      },
      { message: "Please enter a valid price" }
    ),
  addressLine1: z.string().min(2, "Address must be at least 2 characters"),
  parish: z.string().min(1, "Please select a parish"),
  city: z.string().min(1, "Please select a city"),
  trnNumber: z.string().min(2, "TRN number is required"),
  registrationNumber: z.string().min(2, "Registration number is required"),
  planStartDate: z.string().min(1, "Plan start date is required"),
  superAdminName: z.string().min(2, "Admin name must be at least 2 characters"),
  superAdminEmail: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterClinicFormValues = z.infer<typeof registerClinicSchema>;

/**
 * System Admin Dashboard for platform administrators
 * This dashboard focuses on system-wide management and multi-clinic oversight
 */
export default function SystemAdminDashboardPage() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [auditPage, setAuditPage] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [clinicSearch, setClinicSearch] = useState<string>("");
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [showClinicUsersDialog, setShowClinicUsersDialog] = useState(false);
  const [clinicUserRole, setClinicUserRole] = useState<string>("all");
  const [prevEntityTypeChanges, setPrevEntityTypeChanges] = useState<AuditLogEntry[]>([]);
  const [newLogEntries, setNewLogEntries] = useState<number[]>([]);
  
  // Get clinic data from the API
  const { data: clinics, isLoading: clinicsLoading, error: clinicsError, refetch: refetchClinics } = 
    useQuery<Clinic[]>({ 
      queryKey: ['/api/admin/clinics'],
      retry: false,
    });
  
  // Get overall system statistics
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = 
    useQuery<SystemStats>({ 
      queryKey: ['/api/admin/stats'],
      retry: false,
      refetchInterval: 60000, // Refresh every minute
    });
    
  // Get all system users
  const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = 
    useQuery<User[]>({ 
      queryKey: ['/api/admin/users'],
      retry: false,
    });
    
  // Get audit logs with pagination
  const { data: auditLogs, isLoading: auditLoading, error: auditError, refetch: refetchAudit } = 
    useQuery<AuditLogsResponse>({ 
      queryKey: ['/api/admin/audit-logs', { page: auditPage, limit: 10 }],
      retry: false,
    });
  
  // Get entity type change audit logs specifically
  const { data: entityTypeChanges, isLoading: entityTypeChangesLoading } = 
    useQuery<AuditLogsResponse>({ 
      queryKey: ['/api/admin/audit-logs', { page: 1, limit: 5, entityType: 'clinic', action: 'update' }],
      retry: false,
      select: (data) => ({
        ...data,
        logs: data.logs.filter(log => 
          log.details && log.details.includes('entityType') && log.details.includes('Changed')
        )
      }),
      refetchInterval: 30000 // Refresh every 30 seconds to get new entity type changes
    });
    
  // Effect to detect new audit entries for highlighting
  useEffect(() => {
    if (entityTypeChanges?.logs && entityTypeChanges.logs.length > 0) {
      // Compare with previous entries to find new ones
      const currentIds = entityTypeChanges.logs.map(log => log.id);
      const prevIds = prevEntityTypeChanges.map(log => log.id);
      
      // Find new entries (present in current but not in previous)
      const newIds = currentIds.filter(id => !prevIds.includes(id));
      
      if (newIds.length > 0) {
        // Set the new entries for highlighting
        setNewLogEntries(newIds);
        
        // Clear the highlight after animation duration (3 seconds)
        const timer = setTimeout(() => {
          setNewLogEntries([]);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
      
      // Update previous entries for next comparison
      setPrevEntityTypeChanges(entityTypeChanges.logs);
    }
  }, [entityTypeChanges]);
    
  // Get system health - useful for showing if system is working correctly
  const { data: health, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = 
    useQuery<SystemHealth>({ 
      queryKey: ['/api/admin/health'],
      retry: false,
      refetchInterval: 30000, // Refresh every 30 seconds
    });
    
  // Get available clinic tiers
  const { data: clinicTiers, isLoading: tiersLoading } = 
    useQuery<ClinicTiers>({ 
      queryKey: ['/api/clinic/tiers'],
      retry: false,
    });
  
  // Form to register a new clinic
  const form = useForm<RegisterClinicFormValues>({
    resolver: zodResolver(registerClinicSchema),
    defaultValues: {
      name: "",
      tier: "",
      addressLine1: "",
      parish: "",
      city: "",
      trnNumber: "",
      registrationNumber: "",
      planStartDate: format(new Date(), "yyyy-MM-dd"),
      superAdminName: "",
      superAdminEmail: "",
      password: "",
    },
  });
  
  // Mutation to create a new clinic
  const registerClinicMutation = useMutation({
    mutationFn: async (data: RegisterClinicFormValues) => {
      // Use the admin endpoint to allow setting entityType
      // Default to "clinic" for regular clinic registrations
      const postData = {
        ...data,
        entityType: "clinic" // Always create as a regular clinic via the UI
      };
      const res = await apiRequest("POST", "/api/admin/clinics", postData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Clinic created",
        description: "The clinic has been successfully registered",
      });
      form.reset();
      refetchUsers();
      refetchStats();
      refetchClinics(); // Refresh clinics list after creation
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating clinic",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update a user's role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "The user's role has been successfully updated",
      });
      refetchUsers();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update clinic status
  const updateClinicStatusMutation = useMutation({
    mutationFn: async ({ clinicId, status }: { clinicId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/clinics/${clinicId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Clinic status updated",
        description: "The clinic's status has been successfully updated",
      });
      refetchClinics();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating clinic status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update clinic entity type (restricted to system admin only)
  const updateClinicEntityTypeMutation = useMutation({
    mutationFn: async ({ clinicId, entityType }: { clinicId: string; entityType: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/clinics/${clinicId}/entity-type`, { entityType });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Entity type updated",
        description: "The clinic's entity type has been successfully updated",
      });
      // Refetch all related data to ensure consistency
      refetchClinics();
      // Force a refetch of entity type changes to show updated records with animation
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ['/api/admin/audit-logs', { page: 1, limit: 5, entityType: 'clinic', action: 'update' }]
        });
      }, 1000); // Small delay to ensure audit log is created in the database
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating entity type",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onRegisterClinic = (values: RegisterClinicFormValues) => {
    registerClinicMutation.mutate(values);
  };
  
  const onChangeRole = (userId: number, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };
  
  // Handle viewing clinic users
  const handleViewClinicUsers = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    setShowClinicUsersDialog(true);
  };
  
  // Handle clinic status changes
  const handleUpdateClinicStatus = (clinicId: string, status: string) => {
    updateClinicStatusMutation.mutate({ clinicId, status });
  };
  
  // Handle entity type changes - restricted to system admin
  const handleUpdateEntityType = (clinicId: string, entityType: string) => {
    // Show confirmation dialog with warnings first
    if (confirm(`WARNING: Changing entity type to "${entityType}" is a system-level operation that affects how this entity functions in the application. Are you sure you want to proceed?`)) {
      updateClinicEntityTypeMutation.mutate({ clinicId, entityType });
    }
  };
  
  // Get users for a specific clinic
  const getClinicUsers = () => {
    if (!selectedClinicId) return [];
    return users?.filter(user => user.clinicId === selectedClinicId) || [];
  };
  
  const filteredUsers = users && Array.isArray(users) 
    ? users.filter((user: User) => 
        selectedRole === "all" || !selectedRole || user.role.toLowerCase() === selectedRole.toLowerCase()
      )
    : [];
    
  // Filter clinics based on search input and entity type
  const filteredClinics = clinics && Array.isArray(clinics)
    ? clinics
        // Add entityType fallback - if missing, default to "clinic"
        .map(clinic => ({
          ...clinic, 
          entityType: clinic.entityType || "clinic"
        }))
        // Filter out platform_admin entities
        .filter(clinic => clinic.entityType !== "platform_admin")
        // Filter by search term
        .filter(clinic => 
          clinic.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
          clinic.id.toLowerCase().includes(clinicSearch.toLowerCase())
        )
        // Sort to show platform admin entries first, then regular clinics
        .sort((a, b) => {
          if (a.entityType === "platform_admin") return -1;
          if (b.entityType === "platform_admin") return 1;
          return 0;
        })
    : [];
  
  const formatUptime = (seconds: number): string => {
    if (!seconds) return "Unknown";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days ? days + 'd ' : ''}${hours ? hours + 'h ' : ''}${minutes}m`;
  };
  
  const formatMemory = (bytes: number): string => {
    if (!bytes) return "0 MB";
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };
  
  const refreshAll = () => {
    refetchStats();
    refetchUsers();
    refetchAudit();
    refetchHealth();
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
  
  if (statsLoading || usersLoading || auditLoading || healthLoading || tiersLoading || clinicsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Clinic Users Dialog */}
      <Dialog open={showClinicUsersDialog} onOpenChange={setShowClinicUsersDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedClinicId && clinics?.find(c => c.id === selectedClinicId)?.name} Users
            </DialogTitle>
            <DialogDescription>
              Manage users for this clinic account
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="filterRole">Filter by Role:</Label>
              <Select
                value={clinicUserRole}
                onValueChange={setClinicUserRole}
              >
                <SelectTrigger id="filterRole" className="w-[180px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="clerk">Clerk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getClinicUsers().length > 0 ? (
                  getClinicUsers()
                    .filter(user => clinicUserRole === "all" || user.role === clinicUserRole)
                    .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(user.name || user.username)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div>{user.name || user.username}</div>
                              <div className="text-xs text-muted-foreground">{user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.email || "—"}</TableCell>
                        <TableCell>{user.specialization || "—"}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No users found for this clinic
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowClinicUsersDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r bg-muted/10">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Vitalyst Admin
          </h2>
        </div>
        <nav className="flex-1 overflow-auto p-2">
          <div className="space-y-1">
            <Button 
              variant={activeTab === "overview" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("overview")}
            >
              <Activity className="mr-2 h-4 w-4" />
              Overview
            </Button>

            <Button 
              variant={activeTab === "platform-admins" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => window.location.href = "/admin/platform-admins"}
            >
              <UserCog className="mr-2 h-4 w-4" />
              Platform Admins
              <span className="ml-auto text-xs text-muted-foreground">Admin Management</span>
            </Button>
            <Button 
              variant={activeTab === "clinics" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("clinics")}
            >
              <Building className="mr-2 h-4 w-4" />
              Clients
              <span className="ml-auto text-xs text-muted-foreground">Clinics</span>
            </Button>
            <Button 
              variant={activeTab === "billing" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => window.location.href = "/admin/billing-management"}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
              <span className="ml-auto text-xs text-muted-foreground">Subscriptions</span>
            </Button>
            <Button 
              variant={activeTab === "analytics" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("analytics")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
              <span className="ml-auto text-xs text-muted-foreground">Stats</span>
            </Button>
            <Button 
              variant={activeTab === "support" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("support")}
            >
              <MessagesSquare className="mr-2 h-4 w-4" />
              Support
              <span className="ml-auto text-xs text-muted-foreground">Tickets</span>
            </Button>
            <Button 
              variant={activeTab === "settings" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("settings")}
            >
              <Cog className="mr-2 h-4 w-4" />
              Settings
              <span className="ml-auto text-xs text-muted-foreground">Config</span>
            </Button>
            <Button 
              variant={activeTab === "audit" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("audit")}
            >
              <Clock className="mr-2 h-4 w-4" />
              Audit Logs
            </Button>
          </div>
        </nav>
        <div className="p-4 border-t mt-auto">
          <Button 
            variant="outline" 
            className="w-full justify-start text-destructive"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
          <div className="md:hidden flex items-center">
            <h2 className="text-lg font-bold ml-2">Vitalyst Admin</h2>
          </div>
          <div className="flex items-center space-x-2">
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
            <Button
              onClick={() => logoutMutation.mutate()}
              variant="destructive"
              size="sm"
              className="md:hidden gap-1"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              {activeTab === "overview" && "System Overview"}

              {activeTab === "clinics" && "Clinic Management"}
              {activeTab === "billing" && "Billing & Subscriptions"}
              {activeTab === "analytics" && "Analytics & Reports"}
              {activeTab === "support" && "Support Tickets"}
              {activeTab === "settings" && "System Settings"}
              {activeTab === "audit" && "Audit Logs"}
            </h1>
            <p className="text-muted-foreground">
              {activeTab === "overview" && "System-wide metrics and health status"}

              {activeTab === "clinics" && "View and manage clinic accounts"}
              {activeTab === "billing" && "Manage invoices and subscription plans"}
              {activeTab === "analytics" && "View system usage statistics and reports"}
              {activeTab === "support" && "Internal messaging and support tickets"}
              {activeTab === "settings" && "Configure application settings and notifications"}
              {activeTab === "audit" && "Review system activity logs"}
            </p>
          </div>
          
          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clinics?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {health?.status === "ok" 
                        ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                        : "System needs attention"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Clinics</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {clinics?.filter(clinic => clinic.status === 'active').length || 0}
                    </div>
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
                    <div className="text-2xl font-bold">
                      {stats?.patients || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {health?.status === "ok" 
                        ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                        : "System needs attention"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Admins</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users?.filter(user => user.role === 'admin').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {health?.status === "ok" 
                        ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                        : "System needs attention"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users?.filter(user => user.role === 'super_admin').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {health?.status === "ok" 
                        ? `Updated ${stats?.lastUpdated ? formatTimestamp(stats.lastUpdated) : "recently"}`
                        : "System needs attention"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Clinics By Tier Card */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Clinics By Tier</CardTitle>
                  <CardDescription>Distribution of clinics across subscription tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clinicTiers && Object.keys(clinicTiers).map(tierKey => {
                      const tier = clinicTiers[tierKey];
                      const clinicsInTier = clinics?.filter(clinic => clinic.tier === tierKey) || [];
                      const percentage = clinics?.length ? Math.round((clinicsInTier.length / clinics.length) * 100) : 0;
                      
                      return (
                        <div key={tierKey} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{tier.name}</span>
                            <span className="text-sm">{clinicsInTier.length} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div 
                              className="bg-primary h-2.5 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
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
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-medium text-sm">Memory Usage</span>
                      <span>{formatMemory(health?.memory?.heapUsed || 0)} / {formatMemory(health?.memory?.heapTotal || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Last Check</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setActiveTab("clinics")}
                    >
                      <Building className="h-4 w-4 mr-2" />
                      Register New Clinic
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.location.href = "/admin/billing-management"}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Billing
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setActiveTab("audit")}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      View Audit Logs
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              {/* Entity Type Changes Activity Feed */}
              <Card>
                <CardHeader>
                  <CardTitle>Entity Type Changes</CardTitle>
                  <CardDescription>Recent changes to clinic entity types</CardDescription>
                </CardHeader>
                <CardContent>
                  {entityTypeChangesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : entityTypeChanges?.logs && entityTypeChanges.logs.length > 0 ? (
                    <div className="space-y-4">
                      {entityTypeChanges.logs.map((log) => (
                        <div 
                          key={log.id} 
                          className={`flex items-start gap-3 pb-3 border-b border-border rounded-md ${
                            newLogEntries.includes(log.id) ? 'highlight-new-entry' : ''
                          }`}
                        >
                          <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {log.username || `User #${log.userId || 'Unknown'}`}
                              <Badge className="ml-2 bg-amber-500" variant="secondary">
                                {log.action}
                              </Badge>
                            </p>
                            <p className="text-sm text-muted-foreground">{log.details || "Entity type changed"}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatTimestamp(log.timestamp)}</span>
                              <span className="text-muted">•</span>
                              <span>Entity: {log.entityType} {log.entityId ? `#${log.entityId}` : ''}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {entityTypeChanges.logs.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No entity type changes found</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No entity type changes found</p>
                  )}
                  
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("audit")}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      View All Audit Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}




          {/* Clinic Management Tab */}
          {activeTab === "clinics" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div className="relative flex-1">
                  <Input 
                    className="pl-10 w-full" 
                    placeholder="Search clinics..." 
                    value={clinicSearch}
                    onChange={(e) => setClinicSearch(e.target.value)}
                  />
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-search"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </span>
                </div>
                <Button
                  onClick={() => setActiveTab("new-clinic")}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Register New Clinic
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Clinics</CardTitle>
                  <CardDescription>View and manage healthcare facilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created Date</TableHead>
                          <TableHead>Plan Start Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClinics.length > 0 ? (
                          filteredClinics.map(clinic => (
                            <TableRow key={clinic.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{getInitials(clinic.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {clinic.name}
                                      {(clinic.entityType === "platform_admin") && (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                          Platform
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {clinic.id}
                                      {(clinic.entityType === "platform_admin") ? " (System)" : ""}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {clinic.adminName ? (
                                    <Badge className="bg-purple-500 hover:bg-purple-600 text-white text-xs">
                                      {clinic.adminName}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                      Not Assigned
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{clinic.tier}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    clinic.status === "active" 
                                      ? "bg-green-50 text-green-700 hover:bg-green-50 border-green-200" 
                                      : "bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200"
                                  }
                                >
                                  {clinic.status === "active" ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {clinic.createdAt ? formatTimestamp(clinic.createdAt) : "—"}
                              </TableCell>
                              <TableCell>
                                {/* Placeholder for Plan Start Date - to be added in backend */}
                                {formatTimestamp(clinic.createdAt) || "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleViewClinicUsers(clinic.id)}
                                  >
                                    <Users className="h-4 w-4 mr-1" />
                                    Users
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Settings className="h-4 w-4 mr-1" />
                                        Manage
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>
                                        {clinic.entityType === "platform_admin" ? "Platform Actions" : "Clinic Actions"}
                                      </DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {/* Only show status management options for regular clinics, not platform admin */}
                                      {clinic.entityType !== "platform_admin" && (
                                        <>
                                          {clinic.status === 'active' && (
                                            <DropdownMenuItem 
                                              className="text-amber-500 flex items-center gap-2"
                                              onClick={() => handleUpdateClinicStatus(clinic.id, 'suspended')}
                                            >
                                              <Ban className="h-4 w-4" />
                                              Suspend Account
                                            </DropdownMenuItem>
                                          )}
                                          {clinic.status === 'suspended' && (
                                            <DropdownMenuItem 
                                              className="text-green-500 flex items-center gap-2"
                                              onClick={() => handleUpdateClinicStatus(clinic.id, 'active')}
                                            >
                                              <ShieldCheck className="h-4 w-4" />
                                              Reactivate Account
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem 
                                            className="text-destructive flex items-center gap-2"
                                            onClick={() => handleUpdateClinicStatus(clinic.id, 'deactivated')}
                                          >
                                            <Power className="h-4 w-4" />
                                            Deactivate Account
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {/* Entity type management section */}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                                        Entity Type Management
                                      </DropdownMenuLabel>
                                      
                                      {/* 
                                        Platform admin type is now restricted for security reasons.
                                        This option has been removed as it can only be set during 
                                        initial system setup, not via the UI.
                                      */}
                                      
                                      {/* 
                                        Platform admin entities cannot be changed as they are system entities 
                                      */}
                                      
                                      {/* For platform admin, show additional options */}
                                      {clinic.entityType === "platform_admin" && (
                                        <DropdownMenuItem 
                                          className="text-blue-500 flex items-center gap-2"
                                        >
                                          <Settings className="h-4 w-4" />
                                          Platform Settings
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              {clinicSearch ? "No clinics match your search" : "No clinics found"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* New Clinic Tab */}
          {activeTab === "new-clinic" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("clinics")}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Clinics
                </Button>
              </div>
            
              <Card>
                <CardHeader>
                  <CardTitle>Register New Clinic</CardTitle>
                  <CardDescription>Create a new clinic account with a super admin user</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onRegisterClinic)} className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinic Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter clinic name" {...field} />
                              </FormControl>
                              <FormDescription>
                                The name of the healthcare facility
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="tier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subscription Tier</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // If tier is enterprise, show custom price field
                                  if (value === 'enterprise') {
                                    form.setValue('customPrice', 250); // Default suggestion
                                  } else {
                                    form.setValue('customPrice', undefined);
                                  }
                                }} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a tier" />
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
                                Determines feature access and user limits
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch('tier') === 'enterprise' && (
                          <FormField
                            control={form.control}
                            name="customPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Price (USD)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="Enter custom price" 
                                    {...field}
                                    min={0}
                                    step={0.01}
                                    inputMode="decimal"
                                    pattern="[0-9]+(\.[0-9]{1,2})?"
                                    onKeyDown={(e) => {
                                      // Allow numbers, backspace, tab, delete, arrows, decimal point
                                      if (!/[0-9]|\.|Backspace|Tab|Delete|ArrowLeft|ArrowRight/.test(e.key)) {
                                        e.preventDefault();
                                      }
                                      // Prevent multiple decimal points
                                      if (e.key === '.' && field.value?.toString().includes('.')) {
                                        e.preventDefault();
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Custom monthly price for enterprise tier
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="addressLine1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter street address" {...field} />
                              </FormControl>
                              <FormDescription>
                                First line of clinic address
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="parish"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parish</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a parish" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {JAMAICA_PARISHES.map((parish) => (
                                    <SelectItem key={parish.value} value={parish.value}>
                                      {parish.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Parish location
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City/Town</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a city/town" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {JAMAICA_CITIES.map((city) => (
                                    <SelectItem key={city.value} value={city.value}>
                                      {city.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                City or town location
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="planStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plan Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormDescription>
                                When the subscription starts
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="trnNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company TRN Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter TRN number" {...field} />
                              </FormControl>
                              <FormDescription>
                                Tax Registration Number
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="registrationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Registration Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter registration number" {...field} />
                              </FormControl>
                              <FormDescription>
                                Business registration number
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="superAdminName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter admin name" {...field} />
                              </FormControl>
                              <FormDescription>
                                Full name of the clinic's administrator
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="superAdminEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter admin email" {...field} type="email" />
                              </FormControl>
                              <FormDescription>
                                Email address for account access
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Password</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter password" {...field} type="password" />
                            </FormControl>
                            <FormDescription>
                              Temporary password for the admin account
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={registerClinicMutation.isPending}
                        className="w-full md:w-auto"
                      >
                        {registerClinicMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Register Clinic
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Management</CardTitle>
                  <CardDescription>Manage billing and subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Billing Module Coming Soon</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The billing management interface is currently under development. You'll be able to manage invoices, subscriptions, and payment processing here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Analytics</CardTitle>
                  <CardDescription>Usage statistics and reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Analytics Module Coming Soon</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The analytics dashboard is currently under development. You'll be able to view usage statistics, generate reports, and track platform metrics here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Support Tab */}
          {activeTab === "support" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Support Center</CardTitle>
                  <CardDescription>Internal messaging and support tickets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Support Module Coming Soon</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The support ticket management system is currently under development. You'll be able to handle client support requests, internal messaging, and track ticket statuses here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure application settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Cog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Settings Module Coming Soon</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The system settings interface is currently under development. You'll be able to configure notifications, customize appearance, and manage system-wide preferences here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                  <CardDescription>System activity records for security and compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs && auditLogs.logs && auditLogs.logs.length > 0 ? (
                          auditLogs.logs.map((log: AuditLogEntry) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {log.username || `User #${log.userId || 'Unknown'}`}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {log.entityType} {log.entityId ? `#${log.entityId}` : ''}
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate" title={log.details || ""}>
                                {log.details || "No details"}
                              </TableCell>
                              <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                              <TableCell>{log.ipAddress || "Unknown"}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              No audit logs found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {auditLogs && auditLogs.total > 0 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                              className={auditPage <= 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink isActive>{auditPage}</PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setAuditPage(p => p + 1)}
                              className={auditLogs.logs.length < 10 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}