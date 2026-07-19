import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JAMAICA_PARISHES, BLOOD_TYPES, MARITAL_STATUSES, GENDERS, ORGAN_DONOR_STATUSES, VISIT_TYPES, PATIENT_TYPES } from "@/lib/constants";
import { 
  insertPatientSchema, 
  insertMedicalRecordSchema,
  insertAppointmentSchema,
  Patient,
  MedicalRecord,
  InsertPatient
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import DuplicatePatientAlert from "@/components/duplicate-patient-alert";
import { PotentialDuplicate } from "@shared/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const patientFormSchema = insertPatientSchema.extend({});

const medicalRecordFormSchema = insertMedicalRecordSchema.extend({
  patientType: z.string().optional(),
  historyOfPresentingComplaint: z.string().optional(),
  bloodType: z.string().optional(),
  organDonorStatus: z.string().optional(),
});

// Create a simplified appointment schema for the embedded form
const appointmentFormSchema = z.object({
  patientId: z.number().optional(),
  appointmentDate: z.date(),
  appointmentTime: z.string(),
  duration: z.number().default(30),
  reasonForVisit: z.string(),
  status: z.string().default("scheduled"),
  notes: z.string().optional(),
  doctorId: z.number().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;
type MedicalRecordFormValues = z.infer<typeof medicalRecordFormSchema>;
type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface MedicalHistoryFormProps {
  patient?: Patient;
  isNewPatient: boolean;
  medicalRecords?: MedicalRecord[];
}

export default function MedicalHistoryForm({ 
  patient, 
  isNewPatient, 
  medicalRecords 
}: MedicalHistoryFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const [showDuplicatesAlert, setShowDuplicatesAlert] = useState(false);
  const [pendingPatientData, setPendingPatientData] = useState<InsertPatient | null>(null);
  const [duplicateFields, setDuplicateFields] = useState<string[]>([]);
  const [bookAppointment, setBookAppointment] = useState<boolean>(false);
  const [doctors, setDoctors] = useState<any[]>([]); //Added state for doctors
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true); //Added state for loading


  // Form for patient information
  const patientForm = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      patientId: `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      birthCertificateNumber: patient?.birthCertificateNumber || "",
      firstName: patient?.firstName || "",
      middleName: patient?.middleName || "",
      lastName: patient?.lastName || "",
      dateOfBirth: patient?.dateOfBirth || "",
      gender: patient?.gender || "male",
      occupation: patient?.occupation || "",
      maritalStatus: patient?.maritalStatus || "",
      primaryPhysicianName: patient?.primaryPhysicianName || "",

      // Contact information
      email: patient?.email || "",
      phone: patient?.phone || "",

      // Address fields
      addressLine1: patient?.addressLine1 || "",
      city: patient?.city || "",
      parish: patient?.parish || "",

      // Physical measurements
      height: patient?.height || "",
      weight: patient?.weight || "",

      // Emergency contact
      emergencyContactName: patient?.emergencyContactName || "",
      emergencyContactRelationship: patient?.emergencyContactRelationship || "",
      emergencyContactPhone: patient?.emergencyContactPhone || "",

      // Insurance information
      insuranceProvider: patient?.insuranceProvider || "",
      insurancePolicyNumber: patient?.insurancePolicyNumber || "",
      insuranceGroupNumber: patient?.insuranceGroupNumber || "",
      insuranceContactNumber: patient?.insuranceContactNumber || "",
    },
  });

  // Form for medical record
  const medicalRecordForm = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordFormSchema),
    defaultValues: {
      patientId: patient?.id || 0,
      doctorId: user?.id || 0,
      visitDate: new Date().toISOString().split('T')[0],
      visitType: "checkup",
      patientType: "new",
      chiefComplaint: "",
      historyOfPresentingComplaint: "",
      allergies: "",
      currentMedications: "",
      chronicConditions: "",
      pastSurgeries: "",
      familyHistory: "",
      socialHistory: "",
      sexualHistory: "",
      preventiveCare: "",
      vitals: JSON.stringify({
        temperature: "",
        bloodPressure: "",
        heartRate: "",
        respiratoryRate: "",
        oxygenSaturation: "",
      }),
      bloodType: "unknown",
      organDonorStatus: "unknown",
      examinationNotes: "",
      diagnosis: "",
      treatmentPlan: "",
      followUpPlan: "",
    },
  });

  // Generate time slots
  const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8; // Start from 8:00 AM
    const minute = (i % 2) * 30; // 0 or 30 minutes
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  // Form for appointment booking
  const appointmentForm = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: patient?.id,
      appointmentDate: new Date(),
      appointmentTime: "09:00", // Default to 9 AM
      duration: 30, // Default to 30 min
      reasonForVisit: "checkup",
      status: "scheduled",
      notes: "",
      doctorId: 1, // Default doctor ID
    },
  });

  //Fetch doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await apiRequest("GET", "/api/doctors");
        const data = await response.json();
        setDoctors(data);
      } catch (error) {
        console.error("Error fetching doctors:", error);
        // Handle error appropriately, e.g., show an error message
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, []);


  // Update form values when patient data loads
  useEffect(() => {
    if (patient && !isNewPatient) {
      // Update patient form with patient information
      patientForm.reset({
        patientId: patient.patientId,
        birthCertificateNumber: patient.birthCertificateNumber || "",
        firstName: patient.firstName,
        middleName: patient.middleName || "",
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        occupation: patient.occupation || "",
        maritalStatus: patient.maritalStatus || "",
        primaryPhysicianName: patient.primaryPhysicianName || "",

        // Contact information
        email: patient.email || "",
        phone: patient.phone || "",

        // Address fields
        addressLine1: patient.addressLine1 || "",
        city: patient.city || "",
        parish: patient.parish || "",

        // Physical measurements
        height: patient.height || "",
        weight: patient.weight || "",

        // Emergency contact
        emergencyContactName: patient.emergencyContactName || "",
        emergencyContactRelationship: patient.emergencyContactRelationship || "",
        emergencyContactPhone: patient.emergencyContactPhone || "",

        // Insurance information
        insuranceProvider: patient.insuranceProvider || "",
        insurancePolicyNumber: patient.insurancePolicyNumber || "",
        insuranceGroupNumber: patient.insuranceGroupNumber || "",
        insuranceContactNumber: patient.insuranceContactNumber || "",
      });

      // Set the patient ID for the new medical record
      medicalRecordForm.setValue("patientId", patient.id);

      // Calculate and display age for existing patient
      setTimeout(() => {
        const dobValue = patient.dateOfBirth;
        if (dobValue && dobValue.length === 10) {
          try {
            // Parse date in DD/MM/YYYY format
            const [day, month, year] = dobValue.split('/').map(Number);
            const birthDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date

            // Check if valid date
            if (!isNaN(birthDate.getTime())) {
              // Calculate age based on the difference between today and birth date
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();

              // Adjust age if birthday hasn't occurred yet this year
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }

              // Display age
              const ageElement = document.getElementById('age-calculation');
              if (ageElement) {
                ageElement.textContent = age.toString();
              }
            }
          } catch (err) {
            console.error("Error calculating age:", err);
          }
        }
      }, 500);

      // Calculate and display BMI for existing patient
      setTimeout(() => {
        const height = parseFloat(patient.height?.toString() || "0");
        const weightInPounds = parseFloat(patient.weight?.toString() || "0");

        if (height > 0 && weightInPounds > 0) {
          const weightInKg = weightInPounds * 0.453592; // Convert lbs to kg
          const heightInMeters = height / 100;
          const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);

          const bmiElement = document.getElementById('bmi-calculation');
          if (bmiElement) {
            bmiElement.textContent = bmi;
          }
        }
      }, 500);

      // If there are existing medical records, use the most recent one's medical history data
      if (medicalRecords && medicalRecords.length > 0) {
        // Sort records to get the most recent one first
        const sortedRecords = [...medicalRecords].sort((a, b) => {
          return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
        });

        const latestRecord = sortedRecords[0];

        // Transfer medical history data from the latest record
        // Only populate medical history, not current visit data
        medicalRecordForm.setValue("allergies", latestRecord.allergies || "");
        medicalRecordForm.setValue("currentMedications", latestRecord.currentMedications || "");
        medicalRecordForm.setValue("chronicConditions", latestRecord.chronicConditions || "");
        medicalRecordForm.setValue("pastSurgeries", latestRecord.pastSurgeries || "");
        medicalRecordForm.setValue("familyHistory", latestRecord.familyHistory || "");
        medicalRecordForm.setValue("socialHistory", latestRecord.socialHistory || "");
        medicalRecordForm.setValue("sexualHistory", latestRecord.sexualHistory || "");
        medicalRecordForm.setValue("preventiveCare", latestRecord.preventiveCare || "");

        // Leave current visit section blank for the new record
        // visitDate is already set to today
        // visitType defaults to "checkup"
        // chiefComplaint remains blank
        // vitals remain blank
        // examinationNotes remain blank
        // diagnosis remains blank
        // treatmentPlan remains blank
        // followUpPlan remains blank
      }
    }
  }, [patient, isNewPatient, patientForm, medicalRecordForm, medicalRecords]);

  // Mutation to create patient
  const patientMutation = useMutation({
    mutationFn: async (data: PatientFormValues) => {
      const res = await apiRequest("POST", "/api/patients", data);
      return res.json();
    },
    onSuccess: (newPatient) => {
      toast({
        title: "Patient created",
        description: `Patient ${newPatient.firstName} ${newPatient.lastName} has been created.`,
      });

      // Update the medical record form with the new patient ID
      medicalRecordForm.setValue("patientId", newPatient.id);


      // If this is a new patient, also create a medical record
      if (isNewPatient && medicalRecordForm.getValues("chiefComplaint")) {
        const medicalRecordData = medicalRecordForm.getValues();
        medicalRecordData.patientId = newPatient.id;
        medicalRecordMutation.mutate(medicalRecordData);
      } else {
        // Just invalidate the patients query to update the dashboard and patients list
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        navigate("/patients");
      }
    },
    onError: (error) => {
      toast({
        title: "Error creating patient",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to create medical record
  const medicalRecordMutation = useMutation({
    mutationFn: async (data: MedicalRecordFormValues) => {
      const res = await apiRequest("POST", "/api/records", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Medical record saved",
        description: "The medical record has been saved successfully.",
      });

      // Invalidate queries to update the dashboard and patient details
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      if (patient) {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}/records`] });
      }

      navigate("/patients");
    },
    onError: (error) => {
      toast({
        title: "Error saving medical record",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  // Mutation to check for duplicate patients
  const checkDuplicatesMutation = useMutation({
    mutationFn: async (data: PatientFormValues) => {
      const res = await apiRequest("POST", "/api/patients/check-duplicates", data);
      return res.json();
    },
    onSuccess: (duplicatesData: PotentialDuplicate[]) => {
      if (duplicatesData.length > 0) {
        // Found potential duplicates, show alert
        setDuplicates(duplicatesData);
        setShowDuplicatesAlert(true);

        // Identify which fields matched to highlight them
        const matchedFields: string[] = [];
        duplicatesData.forEach(duplicate => {
          duplicate.matchedOn.forEach(field => {
            if (!matchedFields.includes(field)) {
              matchedFields.push(field);
            }
          });
        });

        // Set the matched fields to show validation errors
        setDuplicateFields(matchedFields);

        // Check if we have an exact match (all four fields)
        const hasExactMatch = duplicatesData.some(duplicate => duplicate.score === 1.0);

        // Display appropriate error message based on match type
        if (hasExactMatch) {
          toast({
            title: "Exact duplicate patient found",
            description: "A patient with identical first name, last name, date of birth, and birth certificate number already exists. Please review before proceeding.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Potential duplicate patient",
            description: "A similar patient was found with some matching fields. To proceed with creating a new patient, click 'Continue with New Patient' in the alert dialog.",
            variant: "default",
          });
        }
      } else {
        // No duplicates found, proceed with creating the patient
        setDuplicateFields([]);
        patientMutation.mutate(pendingPatientData as PatientFormValues);
      }
    },
    onError: (error) => {
      toast({
        title: "Error checking for duplicates",
        description: error.message,
        variant: "destructive",
      });
      // Proceed with creating the patient anyway
      patientMutation.mutate(pendingPatientData as PatientFormValues);
    },
  });

  const onSubmit = () => {
    // Determine what data to submit based on user role
    if (isNewPatient) {
      // Store the patient data for later use
      const patientData = patientForm.getValues();
      setPendingPatientData(patientData);

      // Check for potential duplicates first
      checkDuplicatesMutation.mutate(patientData);
    } else if (patient) {
      // For existing patient, just create the medical record
      // Build record data based on user role permissions
      const data = medicalRecordForm.getValues();

      // Only include data based on user role
      if (user?.role === 'clerk') {
        // Clerks can only update basic patient info, not medical records
        toast({
          title: "Permission limited",
          description: "As a clerk, you can only update basic patient information. Medical records require a nurse or doctor.",
        });
        return;
      } else if (user?.role === 'nurse') {
        // Nurses can update basic info and vital signs/measurements
        // but not diagnostic/treatment data
        const vitalsData = data.vitals ? JSON.parse(data.vitals) : {};
        if (!vitalsData.temperature || !vitalsData.bloodPressure) {
          toast({
            title: "Missing vital signs",
            description: "Please complete patient vitals before submitting",
            variant: "destructive",
          });
          return;
        }
      }

      // If we got here, we can submit the record
      medicalRecordMutation.mutate(data);
    }
  };

  // Handle continuing with creating a new patient after viewing duplicates
  const handleContinueWithNewPatient = () => {
    setShowDuplicatesAlert(false);
    if (pendingPatientData) {
      patientMutation.mutate(pendingPatientData as PatientFormValues);
    }
  };

  const isSubmitting = patientMutation.isPending || medicalRecordMutation.isPending;

  // Helper function to check if a field is in the duplicateFields array
  const isDuplicateField = (fieldName: string) => {
    return duplicateFields.includes(fieldName);
  };

  // Conditionally render the DuplicatePatientAlert outside the return statement
  // Determine access based on user role
  const canEditBasicInfo = user?.role === 'clerk' || user?.role === 'nurse' || user?.role === 'doctor';
  const canEditNurseInfo = user?.role === 'nurse' || user?.role === 'doctor';
  const canEditMedicalInfo = user?.role === 'doctor';

  const renderDuplicateAlert = () => {
    if (showDuplicatesAlert && pendingPatientData) {
      return (
        <DuplicatePatientAlert
          isOpen={showDuplicatesAlert}
          onClose={() => setShowDuplicatesAlert(false)}
          patientData={pendingPatientData}
          duplicates={duplicates}
          onContinue={handleContinueWithNewPatient}
        />
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Patient Information Section - Only show for new patients */}
      {isNewPatient && (
        <div className="bg-white dark:bg-neutral-700 shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 dark:border-neutral-600">
            <h3 className="text-lg leading-6 font-medium text-neutral-800 dark:text-neutral-100">Patient Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-300">Personal details and basic information.</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <Form {...patientForm}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <FormField
                  control={patientForm.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Patient ID</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={patientForm.control}
                name="birthCertificateNumber"
                render={({ field }) => (
                  <FormItem className={`sm:col-span-2 ${isDuplicateField("birthCertificateNumber") ? "border border-red-500 rounded p-2" : ""}`}>
                    <FormLabel>Birth Certificate Number</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        readOnly={!isNewPatient} 
                        className={isDuplicateField("birthCertificateNumber") ? "border-red-500" : ""}
                      />
                    </FormControl>
                    <FormMessage>
                      {isDuplicateField("birthCertificateNumber") && 
                        <span className="text-red-500">This ID may be a duplicate in our records.</span>
                      }
                    </FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={patientForm.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Occupation</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!isNewPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={patientForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className={`sm:col-span-2 ${isDuplicateField("firstName") ? "border border-red-500 rounded p-2" : ""}`}>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        readOnly={!isNewPatient} 
                        className={isDuplicateField("firstName") ? "border-red-500" : ""}
                      />
                    </FormControl>
                    <FormMessage>
                      {isDuplicateField("firstName") && 
                        <span className="text-red-500">This name may be a duplicate in our records.</span>
                      }
                    </FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={patientForm.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Middle name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        readOnly={!isNewPatient}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={patientForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className={`sm:col-span-2 ${isDuplicateField("lastName") ? "border border-red-500 rounded p-2" : ""}`}>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        readOnly={!isNewPatient} 
                        className={isDuplicateField("lastName") ? "border-red-500" : ""}
                      />
                    </FormControl>
                    <FormMessage>
                      {isDuplicateField("lastName") && 
                        <span className="text-red-500">This name may be a duplicate in our records.</span>
                      }
                    </FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={patientForm.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className={`sm:col-span-2 ${isDuplicateField("dateOfBirth") ? "border border-red-500 rounded p-2" : ""}`}>
                    <FormLabel>Date of birth (DD/MM/YYYY)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="DD/MM/YYYY" 
                        {...field} 
                        readOnly={!isNewPatient} 
                        className={isDuplicateField("dateOfBirth") ? "border-red-500" : ""}
                        onChange={(e) => {
                          // Format date with auto slashes (DD/MM/YYYY)
                          let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          if (value.length > 0) {
                            // Add first slash after 2 digits (DD/)
                            if (value.length > 2) {
                              value = value.substring(0, 2) + '/' + value.substring(2);
                            }
                            // Add second slash after 5 characters (DD/MM/)
                            if (value.length > 5) {
                              value = value.substring(0, 5) + '/' + value.substring(5);
                            }
                            // Limit to 10 characters (DD/MM/YYYY)
                            value = value.substring(0, 10);
                          }

                          // Update the field with formatted value
                          e.target.value = value;
                          field.onChange(e);

                          // Calculate age when date of birth has full format (DD/MM/YYYY)
                          if (value && value.length === 10) {
                            try {
                              // Parse date in DD/MM/YYYY format
                              const [day, month, year] = value.split('/').map(Number);
                              const birthDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date

                              // Check if valid date
                              if (isNaN(birthDate.getTime())) return;

                              // Calculate age based on the difference between today and birth date
                              const today = new Date();
                              let age = today.getFullYear() - birthDate.getFullYear();

                              // Adjust age if birthday hasn't occurred yet this year
                              const monthDiff = today.getMonth() - birthDate.getMonth();
                              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                              }

                              // Display age
                              document.getElementById('age-calculation')!.textContent = age.toString();
                            } catch (err) {
                              console.error("Error calculating age:", err);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormMessage>
                        {isDuplicateField("dateOfBirth") && 
                          <span className="text-red-500">This date of birth may be a duplicate in our records.</span>
                        }
                      </FormMessage>
                      <div className="text-sm text-muted-foreground">
                        Age: <span id="age-calculation" className="font-medium">-</span>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={patientForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Gender</FormLabel>
                    <Select
                      disabled={!isNewPatient}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <FormField
                control={patientForm.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Marital Status</FormLabel>
                    <Select
                      disabled={!isNewPatient}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <FormField
                control={patientForm.control}
                name="primaryPhysicianName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Primary Physician Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!isNewPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Physical Measurements section moved to the top, above Vital Signs */}

              <FormField
                control={patientForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        {...field} 
                        readOnly={!isNewPatient}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={patientForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        readOnly={!isNewPatient}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-6 border p-4 rounded-md border-neutral-200 dark:border-neutral-600 mt-2 mb-2">
                <h4 className="text-md font-medium mb-3">Address Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={patientForm.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Line Address</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Town</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="parish"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parish</FormLabel>
                        <Select
                          disabled={!isNewPatient}
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parish" />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select
                          disabled={!isNewPatient}
                          onValueChange={field.onChange}
                          defaultValue={field.value || "jamaica"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="jamaica">Jamaica</SelectItem>
                            <SelectItem value="usa">United States</SelectItem>
                            <SelectItem value="canada">Canada</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="bahamas">Bahamas</SelectItem>
                            <SelectItem value="barbados">Barbados</SelectItem>
                            <SelectItem value="trinidad">Trinidad and Tobago</SelectItem>
                            <SelectItem value="other">Other</SelectItem>                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="sm:col-span-6 border p-4 rounded-md border-neutral-200 dark:border-neutral-600">
                <h4 className="text-md font-medium mb-3">Emergency Contact Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={patientForm.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={patientForm.control}
                    name="emergencyContactRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={patientForm.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="sm:col-span-6 border p-4 rounded-md border-neutral-200 dark:border-neutral-600 mt-2 mb-2">
                <h4 className="text-md font-medium mb-3">Insurance Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={patientForm.control}
                    name="insuranceProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Provider</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="insuranceContactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Contact Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="insurancePolicyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="insuranceGroupNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isNewPatient} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </Form>
        </div>
      </div>
      )}

      {/* Medical History Section - Only show for existing patients */}
      <Form {...medicalRecordForm}>
        {!isNewPatient && (
          <div className="bg-white dark:bg-neutral-700 shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 dark:border-neutral-600">
              <h3 className="text-lg leading-6 font-medium text-neutral-800 dark:text-neutral-100">Medical History</h3>
              <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-300">Current conditions and past medical events.</p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <FormField
                control={medicalRecordForm.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Allergies</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="List known allergies" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={medicalRecordForm.control}
                name="currentMedications"
                render={({ field }) => (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Current Medications</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="List current medications and dosages" 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={medicalRecordForm.control}
                name="chronicConditions"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Chronic Conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="List chronic conditions" 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={medicalRecordForm.control}
                name="pastSurgeries"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Past Surgeries</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="List past surgeries and dates" 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={medicalRecordForm.control}
                name="familyHistory"
                render={({ field }) => (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Family History</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Relevant family medical history" 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={medicalRecordForm.control}
                name="socialHistory"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Social History</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Smoking, alcohol, exercise habits" 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={medicalRecordForm.control}
                name="sexualHistory"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Sexual History</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Sexual activity, contraception, STI history" 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={medicalRecordForm.control}
                name="preventiveCare"
                render={({ field }) => (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Preventive Care</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Vaccinations, screenings, etc." 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        )}

        {/* Patient Chart (combined Vital Signs and Physical Measurements) */}
        {user?.role !== 'clerk' && (
          <div className="bg-white dark:bg-neutral-700 shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 dark:border-neutral-600">
              <h3 className="text-lg leading-6 font-medium text-neutral-800 dark:text-neutral-100">Patient Chart</h3>
              <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-300">Record patient's measurements and vital signs.</p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {/* Vital Signs */}
              <h4 className="font-medium text-neutral-600 dark:text-neutral-200 mb-4">Vital Signs</h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
                <div>
                  <FormLabel>Temperature (°C)</FormLabel>
                  <Input 
                    type="number"
                    step="0.1"
                    onChange={(e) => {
                      const vitals = JSON.parse(medicalRecordForm.getValues("vitals") || "{}");
                      vitals.temperature = e.target.value;
                      medicalRecordForm.setValue("vitals", JSON.stringify(vitals));
                    }}
                  />
                </div>
                <div>
                  <FormLabel>Blood Pressure</FormLabel>
                  <Input 
                    placeholder="e.g. 120/80"
                    onChange={(e) => {
                      const vitals = JSON.parse(medicalRecordForm.getValues("vitals") || "{}");
                      vitals.bloodPressure = e.target.value;
                      medicalRecordForm.setValue("vitals", JSON.stringify(vitals));
                    }}
                  />
                </div>
                <div>
                  <FormLabel>Heart Rate (BPM)</FormLabel>
                  <Input 
                    type="number"
                    onChange={(e) => {
                      const vitals = JSON.parse(medicalRecordForm.getValues("vitals") || "{}");
                      vitals.heartRate = e.target.value;
                      medicalRecordForm.setValue("vitals", JSON.stringify(vitals));
                    }}
                  />
                </div>
                <div>
                  <FormLabel>Respiratory Rate</FormLabel>
                  <Input 
                    type="number"
                    placeholder="breaths/min"
                    onChange={(e) => {
                      const vitals = JSON.parse(medicalRecordForm.getValues("vitals") || "{}");
                      vitals.respiratoryRate = e.target.value;
                      medicalRecordForm.setValue("vitals", JSON.stringify(vitals));
                    }}
                  />
                </div>
                <div>
                  <FormLabel>Oxygen Saturation (%)</FormLabel>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    onChange={(e) => {
                      const vitals = JSON.parse(medicalRecordForm.getValues("vitals") || "{}");
                      vitals.oxygenSaturation = e.target.value;
                      medicalRecordForm.setValue("vitals", JSON.stringify(vitals));
                    }}
                  />
                </div>
              </div>

              {/* Physical Measurements */}
              <h4 className="font-medium text-neutral-600 dark:text-neutral-200 mb-4">Physical Measurements</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <FormField
                  control={patientForm.control}
                  name="height"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.1" 
                            readOnly={!isNewPatient}
                            onChange={(e) => {
                              field.onChange(e);
                              // Calculate BMI when height or weight changes
                              const height = parseFloat(e.target.value);
                              const weight = parseFloat(patientForm.getValues("weight") || "0");
                              if (height > 0 && weight > 0) {
                                // BMI = weight(kg) / height(m)²
                                const heightInMeters = height / 100;
                                const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
                                document.getElementById('bmi-calculation')!.textContent = bmi;
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  control={patientForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (lbs)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.1" 
                          readOnly={!isNewPatient}
                          onChange={(e) => {
                            field.onChange(e);
                            // Calculate BMI when height or weight changes
                            // Convert pounds to kg for BMI calculation
                            const weightInPounds = parseFloat(e.target.value);
                            const weightInKg = weightInPounds * 0.453592; // Convert lbs to kg
                            const height = parseFloat(patientForm.getValues("height") || "0");
                            if (height > 0 && weightInKg > 0) {
                              // BMI = weight(kg) / height(m)²
                              const heightInMeters = height / 100;
                              const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
                              document.getElementById('bmi-calculation')!.textContent = bmi;
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>BMI (Calculated)</FormLabel>
                  <div className="h-10 border border-input bg-background px-3 py-2 text-sm rounded-md flex items-center">
                    <span id="bmi-calculation">-</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
                </div>

                <FormField
                  control={medicalRecordForm.control}
                  name="bloodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="organDonorStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organ Donor Status</FormLabel>
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
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Current Visit Section - hidden for clerks */}
        {user?.role !== 'clerk' && (
          <div className="bg-white dark:bg-neutral-700 shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 dark:border-neutral-600">
              <h3 className="text-lg leading-6 font-medium text-neutral-800 dark:text-neutral-100">Current Visit</h3>
              <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-300">Details of today's appointment.</p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <FormField
                  control={medicalRecordForm.control}
                  name="visitType"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Visit Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visit type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VISIT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="visitDate"
                  render={({ field }) => {
                    // Convert ISO date to DD/MM/YYYY for display
                    const displayValue = field.value ? 
                      new Date(field.value).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : '';

                    return (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            max={new Date().toISOString().split('T')[0]}
                            // This shows the date picker in YYYY-MM-DD format as required by HTML
                            // But we show the display value elsewhere in DD/MM/YYYY
                            placeholder={displayValue}
                          />
                        </FormControl>
                        <FormDescription>
                          {displayValue ? `Format: ${displayValue}` : 'Format: DD/MM/YYYY'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="patientType"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Patient Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select patient type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PATIENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="chiefComplaint"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Presenting Complaint</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Patient's main symptoms or reason for visit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="historyOfPresentingComplaint"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>History of Presenting Complaint</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Details about the progression, duration, and context of the symptoms" 
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="examinationNotes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Examination Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Diagnosis</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="treatmentPlan"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Treatment Plan</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={medicalRecordForm.control}
                  name="followUpPlan"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Follow-up Plan</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Appointment booking section removed */}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline" 
            onClick={() => navigate("/patients")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Record'
            )}
          </Button>
        </div>
      </Form>
    </div>
  );

  // Render the duplicate alert outside return statement
  {renderDuplicateAlert()}
}