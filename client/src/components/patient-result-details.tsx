import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateString } from "@/lib/utils";
import { Edit, FileText, Trash2, PaperclipIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PatientResultDetailsProps {
  resultId: number;
  onClose?: () => void;
}

export default function PatientResultDetails({
  resultId,
  onClose,
}: PatientResultDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Define types for our data
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

  interface Doctor {
    id: number;
    username: string;
  }

  // Fetch the result data
  const { data: result, isLoading: isResultLoading } = useQuery<PatientResult>({
    queryKey: ["/api/results", resultId],
    enabled: !!resultId,
  });

  // Fetch patient data for the result
  const { data: patient, isLoading: isPatientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", result?.patientId],
    enabled: !!result?.patientId,
  });

  // Fetch doctor data for the result using the specific user endpoint
  const { data: doctor, isLoading: isDoctorLoading } = useQuery<Doctor>({
    queryKey: ["/api/users", result?.doctorId],
    enabled: !!result?.doctorId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/results/${resultId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/results"],
      });
      toast({
        title: "Result deleted",
        description: "The test result has been deleted successfully",
        variant: "default",
      });
      setDeleteDialogOpen(false);
      if (onClose) onClose(); // Close the detail view after deletion
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting result",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // No longer need status badges as we removed status field

  if (isResultLoading || isPatientLoading || isDoctorLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Result Not Found</CardTitle>
          <CardDescription>The requested test result could not be found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${result.patientId}`;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{result.testName}</CardTitle>
              <CardDescription>
                Test Date: {formatDateString(result.testDate)}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              {/* Edit functionality removed per user request */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              {onClose && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onClose()}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Patient</h3>
            <p className="text-base">{patientName}</p>
          </div>

          {/* Attachment section */}
          {result.attachmentUrl && (
            <div className="mt-4 p-4 border rounded-md">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="flex-1 justify-start"
                >
                  <a 
                    href={result.attachmentUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-primary"
                  >
                    <PaperclipIcon className="h-5 w-5 mr-2 text-primary" />
                    <span className="font-medium">View Attachment</span>
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                >
                  <a 
                    href={result.attachmentUrl.startsWith('http') ? result.attachmentUrl : result.attachmentUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-primary"
                    download
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
              {result.attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i) && (
                <div className="mt-3 flex justify-center">
                  <img 
                    src={result.attachmentUrl.startsWith('http') ? result.attachmentUrl : result.attachmentUrl}
                    alt="Test result" 
                    className="max-w-full max-h-[300px] object-contain rounded-md"
                  />
                </div>
              )}
              {result.attachmentUrl.match(/\.pdf$/i) && (
                <div className="mt-3 p-4 bg-muted rounded-md text-center">
                  <p className="text-sm">PDF document attached</p>
                  <Button 
                    variant="link" 
                    className="mt-1 p-0"
                    asChild
                  >
                    <a href={result.attachmentUrl.startsWith('http') ? result.attachmentUrl : `/${result.attachmentUrl.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer">
                      View PDF
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Result summary removed per user request */}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <div className="flex flex-col space-y-1 w-full">
            <div className="flex items-center">
              <FileText className="h-3 w-3 mr-1" />
              <span>
                Created: {result.createdAt ? formatDateString(result.createdAt) : "Unknown"}
              </span>
            </div>
            {doctor && (
              <div className="flex items-center">
                <span>
                  Created by: {doctor.username || "Unknown"}
                </span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this test result? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}