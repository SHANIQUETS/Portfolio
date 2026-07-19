import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PlusCircle, 
  Search, 
  AlertCircle, 
  Trash as TrashIcon,
  Paperclip as PaperclipIcon 
} from "lucide-react";
import { formatDateString } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PatientResultForm from "@/components/patient-result-form";
import PatientResultDetails from "@/components/patient-result-details";

// Define types for data
interface PatientResult {
  id: number;
  patientId: number;
  doctorId: number;
  testName: string;
  testDate: string;
  testType: string;
  status: string;
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Patient {
  id: number;
  patientId: string;
  firstName: string;
  lastName: string;
}

export default function PatientResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<number | null>(null);
  
  const { toast } = useToast();

  // Fetch all results
  const { data: results, isLoading: isResultsLoading } = useQuery<PatientResult[]>({
    queryKey: ["/api/results"],
  });

  // Fetch all patients to get names
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });
  
  // Get patient info by ID for display
  const getPatientById = (patientId: number) => {
    if (!patients) return null;
    return patients.find((patient) => patient.id === patientId);
  };

  // Filter results based on search
  const filteredResults = results ? results.filter((result) => {
    // Get the patient info to search by name as well
    const patient = getPatientById(result.patientId);
    
    return searchQuery === "" || 
      result.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(result.patientId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient && (
        patient.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      ));
  }) : [];

  const handleCloseForm = () => {
    setIsAddingNew(false);
    setSelectedPatientId(null);
  };

  const handleCloseDetails = () => {
    setSelectedResultId(null);
  };

  const handleRowClick = (resultId: number) => {
    setSelectedResultId(resultId);
    setIsAddingNew(false);
  };

  const handleAddNew = (patientId?: number) => {
    setIsAddingNew(true);
    setSelectedResultId(null);
    if (patientId) {
      setSelectedPatientId(patientId);
    }
  };
  
  // Delete result handler
  const handleDeleteResult = (resultId: number) => {
    setResultToDelete(resultId);
    setIsDeleteDialogOpen(true);
  };
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (resultId: number) => {
      const response = await apiRequest("DELETE", `/api/results/${resultId}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to delete result");
      }
      return resultId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      toast({
        title: "Result deleted",
        description: "The result has been deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirmDelete = () => {
    if (resultToDelete) {
      deleteMutation.mutate(resultToDelete);
    }
  };
  
  return (
    <Layout>
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test result
              and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patient Results</h1>
            <p className="text-muted-foreground">
              Manage and view laboratory, imaging, and other test results
            </p>
          </div>
          <Button onClick={() => handleAddNew()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Result
          </Button>
        </div>

        {isAddingNew ? (
          <Card>
            <CardContent className="pt-6">
              <PatientResultForm 
                patientId={selectedPatientId}
                onSubmitted={handleCloseForm}
              />
            </CardContent>
          </Card>
        ) : selectedResultId ? (
          <PatientResultDetails 
            resultId={selectedResultId}
            onClose={handleCloseDetails}
          />
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by test name, patient ID, or patient name..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isResultsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 border border-dashed rounded-lg p-6">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-lg font-medium">No results found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filters, or add a new result
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Test Name</TableHead>
                          <TableHead>Patient ID</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Attachment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((result) => {
                          const patient = getPatientById(result.patientId);
                          return (
                            <TableRow 
                              key={result.id}
                              className="hover:bg-muted transition-colors"
                            >
                              <TableCell 
                                className="font-medium cursor-pointer"
                                onClick={() => handleRowClick(result.id)}
                              >
                                {result.testName}
                              </TableCell>
                              <TableCell 
                                className="cursor-pointer"
                                onClick={() => handleRowClick(result.id)}
                              >
                                {patient?.patientId || `#${result.patientId}`}
                              </TableCell>
                              <TableCell 
                                className="cursor-pointer"
                                onClick={() => handleRowClick(result.id)}
                              >
                                {patient ? `${patient.firstName} ${patient.lastName}` : "-"}
                              </TableCell>
                              <TableCell 
                                className="cursor-pointer"
                                onClick={() => handleRowClick(result.id)}
                              >
                                {formatDateString(result.testDate)}
                              </TableCell>
                              <TableCell>
                                {result.attachmentUrl ? (
                                  <a 
                                    href={result.attachmentUrl.startsWith('/') ? result.attachmentUrl : `/${result.attachmentUrl}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 flex items-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <PaperclipIcon className="h-4 w-4 mr-1" />
                                    View
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  {/* Edit functionality removed per user request */}
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteResult(result.id);
                                    }}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}