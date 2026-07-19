import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import Layout from "@/components/layout";
import MedicalHistoryForm from "@/components/medical-history-form";
import PatientResultList from "@/components/patient-result-list";
import { Patient, MedicalRecord } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FilePenLine, 
  Printer, 
  Share2, 
  Mail, 
  FileText, 
  Calendar, 
  Clock,
  User,
  FileBarChart,
  FlaskConical,
  Loader2,
  Edit,
  Save,
  X
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function PatientRecordPage() {
  const { id } = useParams<{ id?: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editableRecord, setEditableRecord] = useState<MedicalRecord | null>(null);
  
  // Check if user has permission to view medical records
  const canViewMedicalRecords = user?.role === 'nurse' || user?.role === 'doctor';
  
  // Check for query parameters (for creating a new medical record for existing patient)
  const searchParams = new URLSearchParams(window.location.search);
  const patientIdFromQuery = searchParams.get('patientId');
  
  // Determine if this is a new patient or new medical record for existing patient
  const isNewPatient = !id && !patientIdFromQuery;
  const isNewMedicalRecord = !!patientIdFromQuery;
  
  // Get the actual patient ID to use (either from route params or query params)
  const patientIdToUse = id || patientIdFromQuery;

  const { data: patient, isLoading, error } = useQuery<Patient>({
    queryKey: [`/api/patients/${patientIdToUse}`],
    enabled: !!patientIdToUse,
  });

  const { data: medicalRecords = [], isLoading: isLoadingRecords } = useQuery<MedicalRecord[]>({
    queryKey: [`/api/patients/${patientIdToUse}/records`],
    enabled: !!patientIdToUse,
  });

  // Handle error - if patient not found, redirect to patients page
  useEffect(() => {
    if (error) {
      navigate("/patients");
    }
  }, [error, navigate]);

  // Email appointment reminder mutation
  const emailReminderMutation = useMutation({
    mutationFn: async (recordId: number) => {
      const res = await apiRequest("POST", `/api/records/${recordId}/email-reminder`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "An appointment reminder has been sent to the patient.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send reminder",
        description: "There was an error sending the reminder. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Print record mutation
  const printRecordMutation = useMutation({
    mutationFn: async (recordId: number) => {
      const res = await apiRequest("GET", `/api/records/${recordId}/print`);
      return await res.json();
    },
    onSuccess: () => {
      // In a real app, this would open a print dialog with a formatted PDF
      window.print();
      toast({
        title: "Record printed",
        description: "The medical record has been sent to the printer.",
      });
    },
    onError: () => {
      toast({
        title: "Print failed",
        description: "There was an error printing the record. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation to update medical record
  const updateMedicalRecordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<MedicalRecord> }) => {
      const res = await apiRequest("PATCH", `/api/records/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Medical record updated",
        description: "The medical record has been updated successfully.",
      });
      
      // Invalidate queries to update the data
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      if (patient) {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}/records`] });
      }
      
      // Close the dialog and reset editing state
      setSelectedRecordId(null);
      setIsEditing(false);
      setEditableRecord(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating medical record",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // State for physical measurements editing
  const [isEditingPhysicalMeasurements, setIsEditingPhysicalMeasurements] = useState(false);
  const [physicalMeasurements, setPhysicalMeasurements] = useState<{
    height: string;
    weight: string;
    bloodType: string | null;
    organDonorStatus: string | null;
  }>({
    height: "",
    weight: "",
    bloodType: null,
    organDonorStatus: null,
  });
  
  // Update physical measurements state when patient data loads
  useEffect(() => {
    if (patient) {
      setPhysicalMeasurements({
        height: patient.height || "",
        weight: patient.weight || "",
        bloodType: patient.bloodType,
        organDonorStatus: patient.organDonorStatus,
      });
    }
  }, [patient]);
  
  // Handle physical measurement input changes
  const handlePhysicalMeasurementChange = (field: string, value: string) => {
    setPhysicalMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Mutation to update patient data (for physical measurements)
  const updatePatientMutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      const res = await apiRequest("PATCH", `/api/patients/${patientIdToUse}`, data);
      return res.json();
    },
    onSuccess: (updatedPatient) => {
      toast({
        title: "Physical measurements updated",
        description: "Patient's physical measurements have been updated successfully.",
      });
      
      // Invalidate queries to update the data
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      if (patient) {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}`] });
      }
      
      // Exit editing mode
      setIsEditingPhysicalMeasurements(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating physical measurements",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to handle viewing a specific record
  const handleViewRecord = (recordId: number) => {
    setSelectedRecordId(recordId);
    setIsEditing(false);
    setEditableRecord(null);
  };
  
  // Function to start editing a record
  const handleEditRecord = () => {
    if (selectedRecord) {
      setIsEditing(true);
      setEditableRecord({...selectedRecord});
    }
  };
  
  // Function to handle input change when editing
  const handleEditChange = (field: string, value: string) => {
    if (editableRecord) {
      setEditableRecord({
        ...editableRecord,
        [field]: value
      });
    }
  };
  
  // Type-safe event handler for textarea changes
  const handleTextareaChange = (field: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleEditChange(field, e.target.value);
  };
  
  // Function to save edited record
  const handleSaveRecord = () => {
    if (editableRecord && selectedRecordId) {
      updateMedicalRecordMutation.mutate({
        id: selectedRecordId,
        data: editableRecord
      });
    }
  };

  // Get the selected medical record
  const selectedRecord = selectedRecordId 
    ? medicalRecords.find(record => record.id === selectedRecordId)
    : null;

  // Get record type based on visit type
  const getRecordType = (visitType: string): string => {
    switch (visitType) {
      case "checkup":
        return "Regular Checkup";
      case "specialist":
        return "Specialist Consultation";
      case "urgent":
        return "Urgent Care";
      case "follow_up":
        return "Follow-up Visit";
      default:
        return "Medical Visit";
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
          {isNewPatient ? "New Patient" : "Medical History"}
        </h1>
        {!isNewPatient && !isLoading && patient && (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Record medical history for {patient.firstName} {patient.lastName} (ID: {patient.patientId})
          </p>
        )}
        {isLoading && (
          <Skeleton className="h-5 w-64 mt-1" />
        )}
      </div>

      {!isNewPatient && patient && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Medical Records</CardTitle>
              <CardDescription>View and manage patient medical records</CardDescription>
            </CardHeader>
            <CardContent>
              {!canViewMedicalRecords ? (
                // Clerks can't view medical records content, only see basic info
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Medical Records Access Restricted</h3>
                  <p className="text-muted-foreground">You don't have permission to view detailed medical records. Please contact a nurse or doctor.</p>
                </div>
              ) : (
                <Tabs defaultValue="medical-records" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="medical-records" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Medical Records
                    </TabsTrigger>
                    <TabsTrigger value="test-results" className="flex items-center">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Test Results
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Medical Records Tab */}
                  <TabsContent value="medical-records">
                    {isLoadingRecords ? (
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : medicalRecords.length > 0 ? (
                      <div className="space-y-4">
                        {/* Sort records by date in descending order (newest first) */}
                        {[...medicalRecords]
                          .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
                          .map((record) => (
                          <div key={record.id} className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer" onClick={() => handleViewRecord(record.id)}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="text-sm font-medium">{format(new Date(record.visitDate), "PPP")}</span>
                              </div>
                              <Badge variant={record.visitType === "urgent" ? "destructive" : "outline"}>
                                {getRecordType(record.visitType)}
                              </Badge>
                            </div>
                            <h3 className="font-medium">{record.diagnosis || "No diagnosis"}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {record.examinationNotes || "No examination notes"}
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                              <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleViewRecord(record.id);
                              }}>
                                <FileText className="h-4 w-4 mr-2" /> View
                              </Button>
                              <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                printRecordMutation.mutate(record.id);
                              }}>
                                <Printer className="h-4 w-4 mr-2" /> Print
                              </Button>
                              <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                emailReminderMutation.mutate(record.id);
                              }}>
                                <Mail className="h-4 w-4 mr-2" /> Email Medical Record
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Medical Records</h3>
                        <p className="text-muted-foreground">This patient doesn't have any medical records yet.</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Test Results Tab */}
                  <TabsContent value="test-results">
                    {patient && patient.id && (
                      <PatientResultList patientId={patient.id} />
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Patient details and quick actions</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingPhysicalMeasurements(false)} className={isEditingPhysicalMeasurements ? "visible" : "invisible"}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Patient ID</h3>
                  <p>{patient.patientId}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Full Name</h3>
                  <p>{patient.firstName} {patient.lastName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Date of Birth</h3>
                  <p>{patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy") : "Not available"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Contact</h3>
                  <p>{patient.phone}</p>
                  <p className="text-sm">{patient.email}</p>
                </div>
                
                {/* Physical Measurements Section - Hide for clerks */}
                {user?.role !== 'clerk' && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium mb-0">Physical Measurements</h3>
                      {canViewMedicalRecords && !isEditingPhysicalMeasurements && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setIsEditingPhysicalMeasurements(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                
                  
                  {isEditingPhysicalMeasurements && canViewMedicalRecords ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Height (cm)</label>
                          <input 
                            type="text" 
                            value={physicalMeasurements.height} 
                            onChange={(e) => handlePhysicalMeasurementChange('height', e.target.value)}
                            className="w-full p-2 border rounded-md mt-1"
                            placeholder="e.g. 175"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Weight (kg)</label>
                          <input 
                            type="text" 
                            value={physicalMeasurements.weight} 
                            onChange={(e) => handlePhysicalMeasurementChange('weight', e.target.value)}
                            className="w-full p-2 border rounded-md mt-1"
                            placeholder="e.g. 70"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Blood Type</label>
                          <select 
                            value={physicalMeasurements.bloodType || ''} 
                            onChange={(e) => handlePhysicalMeasurementChange('bloodType', e.target.value)}
                            className="w-full p-2 border rounded-md mt-1"
                          >
                            <option value="">Unknown</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Organ Donor Status</label>
                          <select 
                            value={physicalMeasurements.organDonorStatus || ''} 
                            onChange={(e) => handlePhysicalMeasurementChange('organDonorStatus', e.target.value)}
                            className="w-full p-2 border rounded-md mt-1"
                          >
                            <option value="">Unknown</option>
                            <option value="donor">Donor</option>
                            <option value="non-donor">Non-Donor</option>
                          </select>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full mt-2"
                        onClick={() => updatePatientMutation.mutate(physicalMeasurements)}
                        disabled={updatePatientMutation.isPending}
                      >
                        {updatePatientMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Measurements
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Height</p>
                        <p>{patient.height ? `${patient.height} cm` : 'Not recorded'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Weight</p>
                        <p>{patient.weight ? `${patient.weight} kg` : 'Not recorded'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Blood Type</p>
                        <p>{patient.bloodType || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Organ Donor</p>
                        <p>{patient.organDonorStatus ? (patient.organDonorStatus === 'donor' ? 'Yes' : 'No') : 'Unknown'}</p>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/patients/${patient.id}/edit`}>
                  <FilePenLine className="h-4 w-4 mr-2" /> Edit Patient
                </Link>
              </Button>
              {canViewMedicalRecords && (
                <>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/patient-record?patientId=${patient.id}`}>
                      <FileText className="h-4 w-4 mr-2" /> New Medical Record
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/patient-results/new?patientId=${patient.id}`}>
                      <FlaskConical className="h-4 w-4 mr-2" /> New Test Result
                    </Link>
                  </Button>
                </>
              )}
              {!canViewMedicalRecords && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/appointments/new?patientId=${patient.id}`}>
                    <Calendar className="h-4 w-4 mr-2" /> Schedule Appointment
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Medical Record Viewer Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecordId} onOpenChange={(open) => {
          if (!open) setSelectedRecordId(null);
        }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Medical Record Details</DialogTitle>
              <DialogDescription>
                Visit on {selectedRecord.visitDate ? format(new Date(selectedRecord.visitDate), "PPP") : "Unknown date"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isEditing ? (
                <>
                  <div>
                    <h3 className="font-medium mb-2">Visit Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Visit Type:</span>
                        <Badge variant="outline" className="ml-2">{getRecordType(selectedRecord.visitType)}</Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Patient Type:</span>
                        <Badge variant="outline" className="ml-2">{selectedRecord.patientType || "Not specified"}</Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Chief Complaint:</span>
                        <p>{selectedRecord.chiefComplaint || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Diagnosis:</span>
                        <p>{selectedRecord.diagnosis || "No diagnosis"}</p>
                      </div>
                    </div>

                    <h3 className="font-medium mt-4 mb-2">Vitals</h3>
                    {selectedRecord.vitals ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(JSON.parse(selectedRecord.vitals)).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-sm font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <p>{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No vitals recorded</p>
                    )}
                    
                    <h3 className="font-medium mt-4 mb-2">Medical History</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Allergies:</span>
                        <p className="whitespace-pre-line">{selectedRecord.allergies || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Current Medications:</span>
                        <p className="whitespace-pre-line">{selectedRecord.currentMedications || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Chronic Conditions:</span>
                        <p className="whitespace-pre-line">{selectedRecord.chronicConditions || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Past Surgeries:</span>
                        <p className="whitespace-pre-line">{selectedRecord.pastSurgeries || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Family History:</span>
                        <p className="whitespace-pre-line">{selectedRecord.familyHistory || "None recorded"}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Examination & Treatment</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Examination Notes:</span>
                        <p className="whitespace-pre-line">{selectedRecord.examinationNotes || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Treatment Plan:</span>
                        <p className="whitespace-pre-line">{selectedRecord.treatmentPlan || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Follow-up Plan:</span>
                        <p className="whitespace-pre-line">{selectedRecord.followUpPlan || "No follow-up scheduled"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Social History:</span>
                        <p className="whitespace-pre-line">{selectedRecord.socialHistory || "None recorded"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Preventive Care:</span>
                        <p className="whitespace-pre-line">{selectedRecord.preventiveCare || "None recorded"}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-medium mb-2">Visit Information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground block mb-2">Visit Type:</label>
                          <select 
                            value={editableRecord?.visitType || "consultation"} 
                            onChange={(e) => handleEditChange('visitType', e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="checkup">Regular Checkup</option>
                            <option value="consultation">Consultation</option>
                            <option value="urgent">Urgent Care</option>
                            <option value="follow_up">Follow-up</option>
                            <option value="physical">Physical Exam</option>
                            <option value="specialist">Specialist Visit</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground block mb-2">Patient Type:</label>
                          <select 
                            value={editableRecord?.patientType || "returning"} 
                            onChange={(e) => handleEditChange('patientType', e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="new">New Patient</option>
                            <option value="returning">Returning Patient</option>
                            <option value="referral">Referral</option>
                          </select>
                        </div>
                      </div>
                      
                      <h4 className="font-medium mt-2 mb-2">Patient Vitals</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {editableRecord?.vitals ? (
                          <>
                            {Object.entries(JSON.parse(editableRecord.vitals)).map(([key, value]) => (
                              <div key={key}>
                                <label className="text-sm font-medium text-muted-foreground block mb-2 capitalize">
                                  {key === 'bloodPressure' ? 'Blood Pressure' : 
                                   key === 'heartRate' ? 'Heart Rate' : 
                                   key === 'respiratoryRate' ? 'Respiratory Rate' : 
                                   key === 'oxygenSaturation' ? 'Oxygen Saturation' : key}:
                                </label>
                                <input
                                  type="text"
                                  value={value as string}
                                  onChange={(e) => {
                                    const currentVitals = JSON.parse(editableRecord.vitals || '{}');
                                    const updatedVitals = {
                                      ...currentVitals,
                                      [key]: e.target.value
                                    };
                                    handleEditChange('vitals', JSON.stringify(updatedVitals));
                                  }}
                                  className="w-full p-2 border rounded-md"
                                />
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground block mb-2">Temperature:</label>
                              <input
                                type="text"
                                placeholder="36.5"
                                className="w-full p-2 border rounded-md"
                                onChange={(e) => {
                                  const vitals = {
                                    temperature: e.target.value,
                                    bloodPressure: "",
                                    heartRate: "",
                                    respiratoryRate: "",
                                    oxygenSaturation: ""
                                  };
                                  handleEditChange('vitals', JSON.stringify(vitals));
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground block mb-2">Blood Pressure:</label>
                              <input
                                type="text"
                                placeholder="120/80"
                                className="w-full p-2 border rounded-md"
                                onChange={(e) => {
                                  const vitals = JSON.parse(editableRecord?.vitals || '{"temperature":"", "heartRate":"", "respiratoryRate":"", "oxygenSaturation":""}');
                                  vitals.bloodPressure = e.target.value;
                                  handleEditChange('vitals', JSON.stringify(vitals));
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground block mb-2">Heart Rate:</label>
                              <input
                                type="text"
                                placeholder="72"
                                className="w-full p-2 border rounded-md"
                                onChange={(e) => {
                                  const vitals = JSON.parse(editableRecord?.vitals || '{"temperature":"", "bloodPressure":"", "respiratoryRate":"", "oxygenSaturation":""}');
                                  vitals.heartRate = e.target.value;
                                  handleEditChange('vitals', JSON.stringify(vitals));
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground block mb-2">Respiratory Rate:</label>
                              <input
                                type="text"
                                placeholder="16"
                                className="w-full p-2 border rounded-md"
                                onChange={(e) => {
                                  const vitals = JSON.parse(editableRecord?.vitals || '{"temperature":"", "bloodPressure":"", "heartRate":"", "oxygenSaturation":""}');
                                  vitals.respiratoryRate = e.target.value;
                                  handleEditChange('vitals', JSON.stringify(vitals));
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground block mb-2">Oxygen Saturation:</label>
                              <input
                                type="text"
                                placeholder="98%"
                                className="w-full p-2 border rounded-md"
                                onChange={(e) => {
                                  const vitals = JSON.parse(editableRecord?.vitals || '{"temperature":"", "bloodPressure":"", "heartRate":"", "respiratoryRate":""}');
                                  vitals.oxygenSaturation = e.target.value;
                                  handleEditChange('vitals', JSON.stringify(vitals));
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Chief Complaint:</label>
                        <Textarea 
                          value={editableRecord?.chiefComplaint || ""}
                          onChange={handleTextareaChange('chiefComplaint')}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Diagnosis:</label>
                        <Textarea 
                          value={editableRecord?.diagnosis || ""} 
                          onChange={handleTextareaChange('diagnosis')}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>

                    <h3 className="font-medium mt-4 mb-2">Medical History</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Allergies:</label>
                        <Textarea 
                          value={editableRecord?.allergies || ""} 
                          onChange={handleTextareaChange('allergies')}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Current Medications:</label>
                        <Textarea 
                          value={editableRecord?.currentMedications || ""} 
                          onChange={handleTextareaChange('currentMedications')}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Chronic Conditions:</label>
                        <Textarea 
                          value={editableRecord?.chronicConditions || ""} 
                          onChange={handleTextareaChange('chronicConditions')}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Past Surgeries:</label>
                        <Textarea 
                          value={editableRecord?.pastSurgeries || ""} 
                          onChange={handleTextareaChange('pastSurgeries')}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Family History:</label>
                        <Textarea 
                          value={editableRecord?.familyHistory || ""} 
                          onChange={handleTextareaChange('familyHistory')}
                          className="min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Examination & Treatment</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Examination Notes:</label>
                        <Textarea 
                          value={editableRecord?.examinationNotes || ""} 
                          onChange={handleTextareaChange('examinationNotes')}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Treatment Plan:</label>
                        <Textarea 
                          value={editableRecord?.treatmentPlan || ""} 
                          onChange={handleTextareaChange('treatmentPlan')}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Follow-up Plan:</label>
                        <Textarea 
                          value={editableRecord?.followUpPlan || ""} 
                          onChange={handleTextareaChange('followUpPlan')}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Social History:</label>
                        <Textarea 
                          value={editableRecord?.socialHistory || ""} 
                          onChange={handleTextareaChange('socialHistory')}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Preventive Care:</label>
                        <Textarea 
                          value={editableRecord?.preventiveCare || ""} 
                          onChange={handleTextareaChange('preventiveCare')}
                          className="min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
              <div className="flex space-x-2">
                {!isEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => printRecordMutation.mutate(selectedRecord.id)}>
                      <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => emailReminderMutation.mutate(selectedRecord.id)}>
                      <Mail className="h-4 w-4 mr-2" /> Email Medical Record
                    </Button>
                    {canViewMedicalRecords && (
                      <Button variant="outline" size="sm" onClick={handleEditRecord}>
                        <FilePenLine className="h-4 w-4 mr-2" /> Edit Record
                      </Button>
                    )}
                  </>
                )}
                {isEditing && (
                  <>
                    <Button variant="default" size="sm" onClick={handleSaveRecord} disabled={updateMedicalRecordMutation.isPending}>
                      {updateMedicalRecordMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" /> Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsEditing(false);
                      setEditableRecord(null);
                    }}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              {!isEditing && (
                <DialogClose asChild>
                  <Button variant="secondary">Close</Button>
                </DialogClose>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Show medical form for both new patients and when creating a new record for existing patient */}
      {(isNewPatient || isNewMedicalRecord) && (
        <MedicalHistoryForm 
          patient={patient} 
          isNewPatient={isNewPatient}
          medicalRecords={medicalRecords} 
        />
      )}
    </Layout>
  );
}
