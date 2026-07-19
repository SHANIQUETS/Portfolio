import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertAppointmentSchema, Patient, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import PatientLookup from "@/components/patient-lookup";

// Generate time slots based on increment minutes
const generateTimeSlots = (startHour: number, endHour: number, incrementMinutes: number) => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += incrementMinutes) {
      // Skip times past the end hour
      if (hour === endHour && minute > 0) continue;

      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      slots.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return slots;
};

// Default 30-minute increment time slots
const TIME_SLOTS_30MIN = generateTimeSlots(8, 17, 30);

// 15-minute increment time slots
const TIME_SLOTS_15MIN = generateTimeSlots(8, 17, 15);

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" }
];

// Status options
const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no-show", label: "No-show" }
];

// Reason for visit options
const REASON_OPTIONS = [
  { value: "checkup", label: "Regular Checkup" },
  { value: "follow-up", label: "Follow-up Visit" },
  { value: "consultation", label: "Initial Consultation" },
  { value: "illness", label: "Illness / Sick Visit" },
  { value: "injury", label: "Injury Treatment" },
  { value: "chronic", label: "Chronic Condition Management" },
  { value: "vaccination", label: "Vaccination / Immunization" },
  { value: "physical", label: "Annual Physical" },
  { value: "lab-review", label: "Lab Results Review" },
  { value: "prescription", label: "Prescription Refill" },
  { value: "screening", label: "Health Screening" },
  { value: "procedure", label: "Medical Procedure" },
  { value: "other", label: "Other" }
];

// Create a custom appointment schema based on the insertAppointmentSchema
// This ensures the form data is properly validated before submission
const appointmentFormSchema = z.object({
  patientId: z.coerce.number({
    required_error: "Please select a patient"
  }),
  doctorId: z.coerce.number({
    required_error: "Please select a doctor"
  }),
  appointmentDate: z.date({
    required_error: "Please select a date"
  }),
  appointmentTime: z.string({
    required_error: "Please select a time"
  }),
  duration: z.coerce.number(), // Use coerce to ensure duration is always a number
  reason: z.string().optional(),
  status: z.string().default("scheduled"),
  notes: z.string().optional()
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  patientId?: number;
}

export default function AppointmentForm({ patientId }: AppointmentFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // For patient lookup
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // State to track which time slots to display based on selected duration
  const [timeSlots, setTimeSlots] = useState<string[]>(TIME_SLOTS_30MIN);

  // Fetch doctors from the current clinic
  const { data: doctors, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['/api/users/doctors-by-clinic'],
    queryFn: async () => {
      console.log("Fetching doctors by clinic ID:", user?.clinicId);
      // Only fetch doctors from the current clinic for clinic users (based on user's clinicId)
      const response = await fetch('/api/users/doctors-by-clinic', {
        credentials: 'include' // Ensure cookies are sent with the request
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error fetching doctors:", errorData);
        throw new Error(`Failed to load doctors: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Received doctors from API:", data);
      return data as User[];
    },
    enabled: !!user && !!user.clinicId,
  });

  // Initialize the form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: patientId || 0,
      appointmentDate: new Date(),
      appointmentTime: "09:00",
      duration: 30,
      reason: "checkup", // Default to regular checkup
      status: "scheduled",
      notes: ""
    }
  });

  // If patientId is provided, fetch the patient details
  useEffect(() => {
    if (patientId) {
      console.log(`Fetching patient with ID: ${patientId} for appointment form`);

      const fetchPatient = async () => {
        try {
          // Use the API endpoint to get patient details
          const response = await fetch(`/api/patients/${patientId}`);

          if (!response.ok) {
            toast({
              title: "Error",
              description: "Failed to load patient information. Please try searching for the patient manually.",
              variant: "destructive"
            });
            return;
          }

          const patient = await response.json();
          console.log("Patient data loaded:", patient);

          // Set the patient as selected
          setSelectedPatient(patient);

          // Set the patient ID in the form
          form.setValue("patientId", patient.id);

          // Show a confirmation toast to improve UX
          toast({
            title: "Patient Selected",
            description: `${patient.firstName} ${patient.lastName} is pre-selected for this appointment.`
          });
        } catch (error) {
          console.error("Error fetching patient:", error);
          toast({
            title: "Error",
            description: "Failed to load patient information. Please try searching for the patient manually.",
            variant: "destructive"
          });
        }
      };

      fetchPatient();
    }
  }, [patientId, form, toast]);

  // Watch for duration changes and update time slots accordingly
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'duration' || name === undefined) {
        const duration = form.getValues('duration');
        if (duration === 15) {
          setTimeSlots(TIME_SLOTS_15MIN);
        } else {
          setTimeSlots(TIME_SLOTS_30MIN);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      // Ensure we have a valid Date object
      if (!(data.appointmentDate instanceof Date) || isNaN(data.appointmentDate.getTime())) {
        throw new Error("Invalid appointment date");
      }

      try {
        // Format the date properly for the server
        // The server schema expects a Date object or ISO string for appointmentDate
        const formattedData = {
          ...data,
          // Ensure we send a proper Date object, not a string
          appointmentDate: data.appointmentDate,
          // Ensure duration is a number (not a string)
          duration: Number(data.duration),
          // Ensure patientId is a number
          patientId: Number(data.patientId)
        };

        console.log("Sending appointment data:", {
          ...formattedData,
          // Show the ISO string in logs for debugging, but send actual Date object
          appointmentDateISOString: data.appointmentDate.toISOString()
        });

        const response = await apiRequest("POST", "/api/appointments", formattedData);
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Appointment creation error:", errorData);
          throw new Error(
            errorData.message || 
            (errorData.errors && errorData.errors.length > 0 ? 
              `Validation error: ${errorData.errors[0].message}` : 
              "Failed to create appointment")
          );
        }
        return response.json();
      } catch (error) {
        console.error("Error in appointment submission:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });

      // Invalidate queries to refetch appointments
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      if (selectedPatient) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/patients", selectedPatient.id, "appointments"] 
        });
      }

      // Navigate to appointments page
      navigate("/appointments");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create appointment: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Form submission handler
  const onSubmit = (data: AppointmentFormValues) => {
    // Only submit if a patient is selected
    if (!data.patientId) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive"
      });
      return;
    }

    // Log the data being submitted to help with debugging
    console.log("Form data before submission:", data);

    // Ensure all required fields are present and correctly formatted
    const formattedData = {
      ...data,
      // Ensure patientId is a number
      patientId: Number(data.patientId),
      // Format date properly
      appointmentDate: data.appointmentDate,
      // Ensure duration is a number
      duration: Number(data.duration)
    };

    console.log("Formatted data for submission:", formattedData);

    createAppointmentMutation.mutate(formattedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient lookup section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Patient Information</h3>
            <p className="text-sm text-muted-foreground">
              Search for an existing patient by name, ID, or phone number
            </p>
          </div>

          <PatientLookup 
            onSelectPatient={(patient) => {
              setSelectedPatient(patient);
              if (patient) {
                form.setValue("patientId", patient.id);
              } else {
                form.setValue("patientId", 0);
              }
            }}
            initialValue={selectedPatient}
          />

          {/* Hidden field for patientId */}
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Input {...field} type="hidden" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Doctor Selection */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Doctor Selection</h3>
            <p className="text-sm text-muted-foreground">
              Choose a doctor for this appointment
            </p>
          </div>

          <FormField
            control={form.control}
            name="doctorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingDoctors ? (
                      <div className="p-2 text-center">
                        <span className="text-sm">Loading doctors...</span>
                      </div>
                    ) : doctors && doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id.toString()}>
                          {doctor.fullName || doctor.username} {doctor.role === 'doctor' ? '(Doctor)' : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center">
                        <span className="text-sm">No doctors available</span>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Appointment date and time */}
        <div className="grid sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="appointmentDate"
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
                      disabled={(date) => date < new Date("1900-01-01")}
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
            name="appointmentTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeSlots.map((time: string) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration</FormLabel>
                <Select
                  onValueChange={(value) => {
                    const numValue = parseInt(value, 10);
                    field.onChange(numValue);

                    // Update time slots based on selected duration
                    if (numValue === 15) {
                      setTimeSlots(TIME_SLOTS_15MIN);
                    } else {
                      setTimeSlots(TIME_SLOTS_30MIN);
                    }
                  }}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
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
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Visit</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason for visit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {REASON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate("/appointments")}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createAppointmentMutation.isPending || !selectedPatient}
          >
            {createAppointmentMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Appointment"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}