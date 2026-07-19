import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Shield, 
  User, 
  Plus, 
  Trash2, 
  Loader2, 
  RefreshCw,
  KeyRound,
  Info,
  Lock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import AdminLayout from "@/components/layouts/admin-layout";

type PlatformAdmin = {
  id: string;
  email: string;
  name: string | null;
  isPrimaryOwner: boolean;
  createdAt: string;
};

export default function PlatformAdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false);
  
  // Fetch platform admins
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("GET", "/api/admin/platform-admins");
      const data = await response.json();
      setAdmins(data);
      
      // Check if current user is primary owner
      const currentUserAdmin = data.find((admin: PlatformAdmin) => admin.id === user?.username);
      setIsPrimaryOwner(currentUserAdmin?.isPrimaryOwner || false);
    } catch (error) {
      console.error("Error fetching platform admins:", error);
      toast({
        title: "Error",
        description: "Failed to load platform administrators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new platform admin
  const addAdmin = async () => {
    if (!email) {
      toast({
        title: "Missing Information",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/admin/platform-admins", {
        email,
        name: name || undefined, // Only send name if it's provided
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Platform administrator added successfully",
        });
        setAddDialogOpen(false);
        setEmail("");
        setName("");
        fetchAdmins(); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to add platform administrator");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add platform administrator",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Delete a platform admin
  const deleteAdmin = async () => {
    if (!deleteTargetId) return;
    
    setSubmitting(true);
    try {
      const response = await apiRequest("DELETE", `/api/admin/platform-admins/${deleteTargetId}`);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Platform administrator removed successfully",
        });
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
        fetchAdmins(); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove platform administrator");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove platform administrator",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Prompt to delete an admin
  const handleDelete = (id: string) => {
    // Prevent self-deletion
    if (id === user?.username) {
      toast({
        title: "Action not allowed",
        description: "You cannot remove yourself from platform administrators",
        variant: "destructive",
      });
      return;
    }
    
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PP");
    } catch (e) {
      return "Unknown date";
    }
  };
  
  // Load admins on component mount
  useEffect(() => {
    fetchAdmins();
  }, []);
  
  return (
    <AdminLayout>
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Platform Administrators</h1>
              <p className="text-muted-foreground">
                Manage platform owners and administrators
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={fetchAdmins} variant="outline" size="sm" className="gap-1">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              
              {!isPrimaryOwner && (
                <div className="relative">
                  <Button disabled className="gap-1 opacity-60">
                    <Lock className="h-4 w-4" />
                    Add Administrator
                  </Button>
                  <div className="absolute top-full right-0 mt-1 w-48 p-2 bg-background border rounded-md shadow-md text-xs">
                    <div className="flex gap-1 items-center">
                      <Info className="h-3 w-3 text-amber-500" />
                      <span>Only the primary owner can add administrators</span>
                    </div>
                  </div>
                </div>
              )}
              
              {isPrimaryOwner && (
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add Administrator
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Platform Administrator</DialogTitle>
                      <DialogDescription>
                        Add a new platform administrator to manage the system.
                        Only the primary owner can add or remove platform administrators.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                        <Input
                          id="email"
                          placeholder="admin@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="Administrator Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          If not provided, the name will be extracted from the email.
                        </p>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addAdmin} disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Administrator"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Platform Administrators
              </CardTitle>
              <CardDescription>
                Platform administrators have system-wide access and can manage all clinics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>
                      {admins.length === 0 ? "No administrators found" : "List of platform administrators"}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Added On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              {admin.name || admin.email.split('@')[0]}
                            </div>
                          </TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            {admin.isPrimaryOwner ? (
                              <Badge className="bg-purple-500 hover:bg-purple-600 gap-1">
                                <KeyRound className="h-3 w-3" />
                                Primary Owner
                              </Badge>
                            ) : (
                              <Badge variant="outline">Administrator</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(admin.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            {admin.isPrimaryOwner ? (
                              <div className="text-xs text-muted-foreground italic">Primary owner cannot be removed</div>
                            ) : admin.id === user?.username ? (
                              <div className="text-xs text-muted-foreground italic">Cannot remove yourself</div>
                            ) : !isPrimaryOwner ? (
                              <div className="relative">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled
                                  className="gap-1 opacity-60"
                                >
                                  <Lock className="h-4 w-4" />
                                  Remove
                                </Button>
                                <div className="absolute bottom-full right-0 mb-1 w-48 p-2 bg-background border rounded-md shadow-md text-xs">
                                  <div className="flex gap-1 items-center">
                                    <Info className="h-3 w-3 text-amber-500" />
                                    <span>Only the primary owner can remove administrators</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(admin.id)}
                                className="gap-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {admins.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No platform administrators found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Important:</strong> Platform administrators have access to all system functionalities.
                  Only add trusted individuals to this role.
                </p>
              </div>
            </CardFooter>
          </Card>
          
          {/* Delete confirmation dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Administrator</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this platform administrator?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAdmin} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Remove"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    </AdminLayout>
  );
}