import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { JAMAICA_PARISHES, MARITAL_STATUSES, GENDERS } from "@/lib/constants";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Patient, insertPatientSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

const editPatientSchema = insertPatientSchema.extend({});
type EditPatientFormValues = z.infer<typeof editPatientSchema>;

export default function EditPatientPage() {
  const { id } = useParams<{ id?: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch patient data
  const { data: patient } = useQuery<Patient>({
    queryKey: [`/api/patients/${id}`],
    enabled: !!id,
  });

  // Form for patient information
  const form = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      patientId: "",
      birthCertificateNumber: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "male",
      occupation: "",
      maritalStatus: "",
      primaryPhysicianName: "",
      email: "",
      phone: "",
      addressLine1: "",
      city: "",
      parish: "",
      // Physical measurements
      height: "",
      weight: "",
      bloodType: "",
      organDonorStatus: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
      insuranceGroupNumber: "",
      insuranceContactNumber: "",
    },
  });

  // Update form values when patient data loads
  useEffect(() => {
    if (patient) {
      form.reset({
        patientId: patient.patientId,
        birthCertificateNumber: patient.birthCertificateNumber || "",
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        occupation: patient.occupation || "",
        maritalStatus: patient.maritalStatus || "",
        primaryPhysicianName: patient.primaryPhysicianName || "",
        email: patient.email || "",
        phone: patient.phone || "",
        addressLine1: patient.addressLine1 || "",
        city: patient.city || "",
        parish: patient.parish || "",
        // Physical measurements
        height: patient.height || "",
        weight: patient.weight || "",
        bloodType: patient.bloodType || "",
        organDonorStatus: patient.organDonorStatus || "",
        emergencyContactName: patient.emergencyContactName || "",
        emergencyContactRelationship: patient.emergencyContactRelationship || "",
        emergencyContactPhone: patient.emergencyContactPhone || "",
        insuranceProvider: patient.insuranceProvider || "",
        insurancePolicyNumber: patient.insurancePolicyNumber || "",
        insuranceGroupNumber: patient.insuranceGroupNumber || "",
        insuranceContactNumber: patient.insuranceContactNumber || "",
      });
      setIsLoading(false);
    }
  }, [patient, form]);

  // Mutation to update patient
  const updatePatientMutation = useMutation({
    mutationFn: async (data: EditPatientFormValues) => {
      const res = await apiRequest("PATCH", `/api/patients/${id}`, data);
      return res.json();
    },
    onSuccess: (updatedPatient) => {
      toast({
        title: "Patient updated",
        description: `Patient ${updatedPatient.firstName} ${updatedPatient.lastName} has been updated.`,
      });
      
      // Invalidate queries to update the dashboard and patients list
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${id}`] });
      
      // Navigate back to patient record page
      navigate(`/patient-record/${id}`);
    },
    onError: (error) => {
      toast({
        title: "Error updating patient",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPatientFormValues) => {
    updatePatientMutation.mutate(data);
  };

  if (isLoading) {
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
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Edit Patient</h1>
        <div className="bg-white dark:bg-neutral-700 shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 dark:border-neutral-600">
            <h3 className="text-lg leading-6 font-medium text-neutral-800 dark:text-neutral-100">Patient Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-300">Update personal details and basic information.</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Patient ID</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                  <FormField
                    control={form.control}
                    name="birthCertificateNumber"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Birth Certificate Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="occupation"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Occupation</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Date of birth (DD/MM/YYYY)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="DD/MM/YYYY" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Gender</FormLabel>
                        <Select
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
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Marital Status</FormLabel>
                        <Select
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
                    control={form.control}
                    name="primaryPhysicianName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Primary Physician Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  


                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Phone number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="sm:col-span-6 border p-4 rounded-md border-neutral-200 dark:border-neutral-600 mt-2 mb-2">
                    <h4 className="text-md font-medium mb-3">Address Information</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="addressLine1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Line Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Town</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
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
                            <Select
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
                    </div>
                  </div>

                  <div className="sm:col-span-6 border p-4 rounded-md border-neutral-200 dark:border-neutral-600 mt-2 mb-2">
                    <h4 className="text-md font-medium mb-3">Emergency Contact</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emergencyContactRelationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-6 border p-4 rounded-md border-neutral-200 dark:border-neutral-600 mt-2 mb-2">
                    <h4 className="text-md font-medium mb-3">Physical Measurements</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. 175" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. 70" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
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
                        control={form.control}
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

                  <div className="sm:col-span-6 border p-4 rounded-md border-neutral-200 dark:border-neutral-600 mt-2 mb-2">
                    <h4 className="text-md font-medium mb-3">Insurance Information</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="insuranceProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurance Provider</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="insuranceContactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider Contact Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="insurancePolicyNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Policy Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="insuranceGroupNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Number</FormLabel>
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

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline" 
                    onClick={() => navigate(`/patient-record/${id}`)}
                    disabled={updatePatientMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updatePatientMutation.isPending}
                  >
                    {updatePatientMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Update Patient'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </Layout>
  );
}