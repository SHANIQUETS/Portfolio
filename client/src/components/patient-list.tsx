import { useLocation } from "wouter";
import { Patient } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, PencilIcon, Phone, Calendar, Mail, User, MapPin, UserX, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { JAMAICA_PARISHES } from "@/lib/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface PatientListProps {
  patients: Patient[] | undefined;
  isLoading: boolean;
}

export default function PatientList({ patients, isLoading }: PatientListProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [patientToUpdate, setPatientToUpdate] = useState<Patient | null>(null);
  const [inactiveReason, setInactiveReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mutation for updating patient status
  const updatePatientStatusMutation = useMutation({
    mutationFn: async ({ id, status, inactiveReason }: { id: number; status: string; inactiveReason?: string }) => {
      const res = await apiRequest('PATCH', `/api/patients/${id}/status`, { status, inactiveReason });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate the patients query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      
      // Show success message
      toast({
        title: patientToUpdate?.status === 'active' ? 'Patient marked as inactive' : 'Patient activated',
        description: patientToUpdate?.status === 'active' 
          ? `${patientToUpdate.firstName} ${patientToUpdate.lastName} has been marked as inactive.`
          : `${patientToUpdate?.firstName} ${patientToUpdate?.lastName} has been activated.`,
        variant: 'default',
      });
      
      // Close dialog and reset state
      setDialogOpen(false);
      setInactiveReason('');
      setPatientToUpdate(null);
    },
    onError: (error) => {
      toast({
        title: 'Error updating patient status',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleViewRecord = (id: number) => {
    // Only navigate to patient record if user is a nurse or doctor
    if (user?.role === 'nurse' || user?.role === 'doctor') {
      navigate(`/patient-record/${id}`);
    }
  };
  
  const handleNameClick = (id: number) => {
    // Clerks can edit patient information, while nurses/doctors view records
    if (user?.role === 'clerk') {
      navigate(`/patients/${id}/edit`);
    } else if (user?.role === 'nurse' || user?.role === 'doctor') {
      navigate(`/patient-record/${id}`);
    }
  };
  
  const handleNewAppointment = (patientId: number) => {
    navigate(`/appointments/new?patientId=${patientId}`);
  };
  
  const handleStatusChange = (patient: Patient) => {
    setPatientToUpdate(patient);
    
    if (patient.status === 'active') {
      // If setting to inactive, open dialog to get reason
      setDialogOpen(true);
    } else {
      // If setting to active, just confirm
      updatePatientStatusMutation.mutate({ 
        id: patient.id, 
        status: 'active' 
      });
    }
  };
  
  const handleConfirmStatusChange = () => {
    if (!patientToUpdate) return;
    
    updatePatientStatusMutation.mutate({
      id: patientToUpdate.id,
      status: 'inactive',
      inactiveReason: inactiveReason
    });
  };
  
  // Check if user can access medical records (nurse or doctor)
  const canAccessMedicalRecords = user?.role === 'nurse' || user?.role === 'doctor';

  if (isLoading) {
    return <PatientListSkeleton />;
  }

  if (!patients || patients.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">No patients found.</p>
          <Button 
            onClick={() => navigate("/patient-record")}
            variant="outline" 
            className="mt-4"
          >
            Add a new patient
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-600">
        {patients.map((patient) => (
          <li key={patient.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar>
                    <AvatarFallback>
                      {patient.firstName.charAt(0) + patient.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4">
                    <div 
                      className="text-sm font-medium text-primary hover:underline cursor-pointer" 
                      onClick={() => handleNameClick(patient.id)}
                    >
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-300">
                      {patient.gender === 'male' ? 'Male' : 'Female'} • ID: {patient.patientId}
                    </div>
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0 flex items-center">
                  {patient.status === 'active' ? (
                    <Badge 
                      variant="outline" 
                      className="mr-2 bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100 flex items-center gap-1 cursor-pointer" 
                      onClick={() => handleStatusChange(patient)}
                    >
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      Active
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className="mr-2 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 flex items-center gap-1 cursor-pointer" 
                      onClick={() => handleStatusChange(patient)}
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      Inactive
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange(patient)}
                    title={patient.status === 'active' ? 'Mark as inactive' : 'Mark as active'}
                  >
                    {patient.status === 'active' ? (
                      <UserX className="h-4 w-4 text-red-500" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  {canAccessMedicalRecords && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewRecord(patient.id)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="mt-2 flex items-center text-sm text-neutral-500 dark:text-neutral-300 sm:mt-0">
                  <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400 dark:text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Date of Birth: {patient.dateOfBirth}
                </div>
                <div className="mt-2 flex items-center text-sm text-neutral-500 dark:text-neutral-300 sm:mt-0">
                  <div className="flex space-x-2">
                    {canAccessMedicalRecords ? (
                      <Button 
                        size="sm"
                        onClick={() => handleViewRecord(patient.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Medical Record
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleNewAppointment(patient.id)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule Appointment
                      </Button>
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          size="sm"
                          variant="outline"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium leading-none mb-3 flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            Contact Information
                          </h4>
                          
                          <div className="grid gap-2">
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              <a 
                                href={`tel:${patient.phone}`}
                                className="text-sm hover:underline text-blue-600 dark:text-blue-400"
                              >
                                {patient.phone}
                              </a>
                            </div>
                            
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              <a 
                                href={`mailto:${patient.email}`}
                                className="text-sm hover:underline text-blue-600 dark:text-blue-400"
                              >
                                {patient.email}
                              </a>
                            </div>
                            
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div className="text-sm">
                                <p>{patient.addressLine1}</p>
                                <p>{patient.city}, {
                                  JAMAICA_PARISHES.find(p => p.value === patient.parish)?.label || patient.parish
                                }</p>
                                <p>{patient.country}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Dialog for patient inactivation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark patient as inactive</DialogTitle>
            <DialogDescription>
              You are about to mark {patientToUpdate?.firstName} {patientToUpdate?.lastName} as inactive. 
              Please provide a reason for this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inactiveReason">Reason for marking as inactive</Label>
              <Textarea
                id="inactiveReason"
                placeholder="Enter reason for marking this patient as inactive"
                value={inactiveReason}
                onChange={(e) => setInactiveReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmStatusChange} 
              disabled={!inactiveReason.trim() || updatePatientStatusMutation.isPending}
            >
              {updatePatientStatusMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      <div className="bg-white dark:bg-neutral-700 px-4 py-3 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-600 sm:px-6">
        <div className="hidden sm:block">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{patients.length}</span> of <span className="font-medium">{patients.length}</span> results
          </p>
        </div>
        <div className="flex-1 flex justify-between sm:justify-end">
          <Button variant="outline" disabled>
            Previous
          </Button>
          <Button variant="outline" className="ml-3" disabled>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PatientListSkeleton() {
  return (
    <Card>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-600">
        {Array(5).fill(0).map((_, i) => (
          <li key={i} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="ml-4 space-y-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="mt-2 flex justify-between">
              <Skeleton className="h-4 w-[180px]" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-[100px] rounded-md" />
                <Skeleton className="h-8 w-[100px] rounded-md" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
