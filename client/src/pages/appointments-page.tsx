import React, { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Clock, Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Define the appointment schema
const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  patientName: z.string().min(1, "Patient name is required"),
  date: z.date({
    required_error: "Appointment date is required",
  }),
  time: z.string().min(1, "Appointment time is required"),
  duration: z.string().min(1, "Duration is required"),
  appointmentType: z.string().min(1, "Appointment type is required"),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// Interfaces for the API data and the processed display data
interface ApiAppointment {
  id: number;
  patientId: number;
  patientName?: string;
  doctorId: number;
  appointmentDate: string | Date;
  appointmentTime: string;
  duration: number;
  reason: string;
  status: string;
  notes: string;
}

interface DisplayAppointment {
  id: number;
  patientId: string | number;
  patientName: string;
  date: Date;
  time: string;
  duration: string;
  appointmentType: string;
  status: string;
  notes: string;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<DisplayAppointment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Initialize form with react-hook-form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      patientName: "",
      date: undefined,
      time: "",
      duration: "30 minutes",
      appointmentType: "Checkup",
      status: "Scheduled",
      notes: "",
    },
  });

  // Fetch appointments from API
  const { data: rawAppointments, isLoading } = useQuery<ApiAppointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Process appointments to ensure date is a proper Date object and sort them
  const appointments: DisplayAppointment[] = useMemo(() => {
    if (!rawAppointments) return [];
    
    const processedAppointments = rawAppointments.map((appointment: ApiAppointment): DisplayAppointment => ({
      id: appointment.id,
      patientId: appointment.patientId,
      // Use a fallback for patientName if it's not provided
      patientName: appointment.patientName || `Patient #${appointment.patientId}`,
      // Convert date string to Date object if needed
      date: appointment.appointmentDate instanceof Date 
        ? appointment.appointmentDate
        : new Date(appointment.appointmentDate),
      // Map time from appointmentTime field
      time: appointment.appointmentTime,
      // Format duration for display
      duration: `${appointment.duration} minutes`,
      // Map reason to appointmentType
      appointmentType: appointment.reason || 'Appointment',
      // Use the status
      status: appointment.status,
      // Notes
      notes: appointment.notes || ''
    }));
    
    // Sort appointments by date (ascending) and then by time (ascending)
    return processedAppointments.sort((a, b) => {
      // First compare dates
      const dateCompare = a.date.getTime() - b.date.getTime();
      
      // If dates are different, return date comparison result
      if (dateCompare !== 0) {
        return dateCompare;
      }
      
      // If dates are the same, compare times
      // Parse time strings (HH:MM format) to compare
      const [hoursA, minutesA] = a.time.split(':').map(Number);
      const [hoursB, minutesB] = b.time.split(':').map(Number);
      
      // Compare hours first
      if (hoursA !== hoursB) {
        return hoursA - hoursB;
      }
      
      // If hours are the same, compare minutes
      return minutesA - minutesB;
    });
  }, [rawAppointments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // This would search appointments based on patient name or ID
  };

  // Handler for editing an appointment
  const handleEditAppointment = (appointment: DisplayAppointment) => {
    setCurrentAppointment(appointment);
    
    // Convert duration string like "30 minutes" to just the number "30"
    const durationValue = parseInt(appointment.duration.split(' ')[0]);
    
    // Set form values with the current appointment data
    form.reset({
      patientId: String(appointment.patientId),
      patientName: appointment.patientName,
      date: appointment.date,
      time: appointment.time,
      duration: String(durationValue),
      appointmentType: appointment.appointmentType,
      status: appointment.status,
      notes: appointment.notes
    });
    
    setIsEditingAppointment(true);
  };
  
  // Mutation for updating appointments
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!currentAppointment) return null;
      
      // Format the data for the API
      const apiData = {
        patientId: Number(data.patientId),
        appointmentDate: data.date,
        appointmentTime: data.time,
        duration: Number(data.duration),
        reason: data.appointmentType,
        status: data.status,
        notes: data.notes
      };
      
      const response = await apiRequest(
        'PATCH', 
        `/api/appointments/${currentAppointment.id}`, 
        apiData
      );
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
      setIsEditingAppointment(false);
      // Refetch appointments to update the list
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (data: AppointmentFormValues) => {
    if (isEditingAppointment && currentAppointment) {
      // Update existing appointment
      updateAppointmentMutation.mutate(data);
    } else {
      // Create new appointment (this is just the placeholder from the template)
      console.log("Creating appointment:", data);
      toast({
        title: "Appointment Created",
        description: `Appointment scheduled for ${data.patientName} on ${format(data.date, "PP")} at ${data.time}`,
      });
      setIsCreatingAppointment(false);
    }
    form.reset();
  };

  const filteredAppointments = appointments.filter((appointment: DisplayAppointment) => {
    if (!searchQuery) return true;
    
    const patientIdStr = String(appointment.patientId);
    const patientNameStr = String(appointment.patientName || '');
    
    return (
      patientNameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patientIdStr.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <Button onClick={() => navigate("/appointments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Search Appointments</CardTitle>
            <CardDescription>Search by patient name or ID</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search appointments..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              Displaying your schedule for the coming days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments && filteredAppointments.length > 0 ? (
                    filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {appointment.patientName}
                          <div className="text-sm text-muted-foreground">
                            ID: {appointment.patientId}
                          </div>
                        </TableCell>
                        <TableCell>{format(appointment.date, "PP")}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            {appointment.time}
                            <span className="ml-2 text-muted-foreground text-sm">
                              ({appointment.duration})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{appointment.appointmentType}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full mr-2",
                                appointment.status === "Scheduled" && "bg-blue-500",
                                appointment.status === "Confirmed" && "bg-green-500",
                                appointment.status === "Cancelled" && "bg-red-500",
                                appointment.status === "Completed" && "bg-gray-500",
                                appointment.status === "No-show" && "bg-yellow-500"
                              )}
                            />
                            {appointment.status}
                          </div>
                        </TableCell>
                        <TableCell className="truncate max-w-xs">
                          {appointment.notes}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditAppointment(appointment)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditingAppointment} onOpenChange={(open) => !open && setIsEditingAppointment(false)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update the appointment details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                {/* Patient information (read-only) */}
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        Patient cannot be changed. Create a new appointment instead.
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                {/* Date and Time */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, hour) => (
                              <React.Fragment key={hour}>
                                <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>
                                  {`${hour.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                                <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>
                                  {`${hour.toString().padStart(2, '0')}:30`}
                                </SelectItem>
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Duration and Status */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="no-show">No-show</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Appointment Type */}
                <FormField
                  control={form.control}
                  name="appointmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="checkup">Regular Checkup</SelectItem>
                          <SelectItem value="follow-up">Follow-up Visit</SelectItem>
                          <SelectItem value="consultation">Initial Consultation</SelectItem>
                          <SelectItem value="illness">Illness / Sick Visit</SelectItem>
                          <SelectItem value="injury">Injury Treatment</SelectItem>
                          <SelectItem value="chronic">Chronic Condition Management</SelectItem>
                          <SelectItem value="vaccination">Vaccination / Immunization</SelectItem>
                          <SelectItem value="physical">Annual Physical</SelectItem>
                          <SelectItem value="lab-review">Lab Results Review</SelectItem>
                          <SelectItem value="prescription">Prescription Refill</SelectItem>
                          <SelectItem value="screening">Health Screening</SelectItem>
                          <SelectItem value="procedure">Medical Procedure</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditingAppointment(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateAppointmentMutation.isPending}
                >
                  {updateAppointmentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}