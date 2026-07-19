import { useState } from "react";
import { Patient, InsertPatient } from "@shared/schema";
import { PotentialDuplicate } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DuplicatePatientAlertProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: InsertPatient;
  duplicates: PotentialDuplicate[];
  onContinue: () => void;
}

export default function DuplicatePatientAlert({
  isOpen,
  onClose,
  patientData,
  duplicates,
  onContinue,
}: DuplicatePatientAlertProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // Handle merging the patient with an existing one
  const handleMerge = async () => {
    if (!selectedPatientId) {
      toast({
        title: "No patient selected",
        description: "Please select a patient to merge with",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // First create the new patient to use as source for merge
      const createResponse = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patientData),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create patient");
      }

      const newPatient = await createResponse.json();

      // Then perform merge operation
      const mergeResponse = await fetch("/api/patients/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceId: newPatient.id,
          targetId: selectedPatientId,
        }),
      });

      if (!mergeResponse.ok) {
        throw new Error("Failed to merge patients");
      }

      const mergedPatient = await mergeResponse.json();

      toast({
        title: "Success",
        description: "Patient records successfully merged",
        variant: "default",
      });

      // Navigate to the merged patient's record
      navigate(`/patients/${mergedPatient.id}`);
    } catch (error) {
      console.error("Error during merge:", error);
      toast({
        title: "Merge failed",
        description: "Unable to merge patient records",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Potential Duplicate Patients Found
          </AlertDialogTitle>
          <AlertDialogDescription>
            We found {duplicates.length} potential duplicate{duplicates.length !== 1 ? "s" : ""} in the system. 
            {duplicates.some(d => d.score === 1.0) 
              ? " An exact match (all 4 fields) was found, which requires attention before proceeding." 
              : " There are partial matches. If you wish to proceed with creating a new patient record, click 'Continue with New Patient' below."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[400px] overflow-y-auto my-4 space-y-3 pr-1">
          {duplicates.map((duplicate) => (
            <Card
              key={duplicate.patient.id}
              className={`border-2 ${selectedPatientId === duplicate.patient.id ? "border-primary" : "border-border"}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between">
                  <div className="flex gap-2 items-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {duplicate.patient.firstName} {duplicate.patient.lastName}
                  </div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Match score: {Math.round(duplicate.score * 100)}%
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Patient ID:</span>{" "}
                    {duplicate.patient.patientId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Birth Certificate #:</span>{" "}
                    <span className={duplicate.matchedOn.includes('birthCertificateNumber') ? 'text-orange-500 font-semibold' : ''}>
                      {duplicate.patient.birthCertificateNumber || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">First Name:</span>{" "}
                    <span className={duplicate.matchedOn.includes('firstName') ? 'text-orange-500 font-semibold' : ''}>
                      {duplicate.patient.firstName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Name:</span>{" "}
                    <span className={duplicate.matchedOn.includes('lastName') ? 'text-orange-500 font-semibold' : ''}>
                      {duplicate.patient.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DOB:</span>{" "}
                    <span className={duplicate.matchedOn.includes('dateOfBirth') ? 'text-orange-500 font-semibold' : ''}>
                      {duplicate.patient.dateOfBirth}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {duplicate.patient.phone || "N/A"}
                  </div>
                </div>
                {duplicate.score === 1.0 ? (
                  <div className="text-xs bg-red-100 text-red-800 p-2 rounded mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> 
                    <span className="font-medium">Exact duplicate - all four key fields match</span>
                  </div>
                ) : (
                  <div className="text-xs bg-amber-100 text-amber-800 p-2 rounded mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> 
                    <span className="font-medium">Potential duplicate - some key fields match</span>
                  </div>
                )}
                <div className="text-xs bg-muted p-2 rounded">
                  <span className="font-medium">Matched on: </span>
                  {duplicate.matchedOn.map((field) => {
                    switch(field) {
                      case 'firstName': return 'first name';
                      case 'lastName': return 'last name';
                      case 'dateOfBirth': return 'date of birth';
                      case 'birthCertificateNumber': return 'birth certificate number';
                      default: return field;
                    }
                  }).join(", ")}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant={selectedPatientId === duplicate.patient.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPatientId(duplicate.patient.id)}
                    className="gap-1.5"
                  >
                    {selectedPatientId === duplicate.patient.id && (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {selectedPatientId === duplicate.patient.id
                      ? "Selected for Merge"
                      : "Select to Merge"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-3">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            disabled={!selectedPatientId || isProcessing}
            onClick={handleMerge}
            variant="outline"
            className="sm:ml-2"
          >
            Merge with Selected Patient
          </Button>
          {!duplicates.some(d => d.score === 1.0) && (
            <AlertDialogAction 
              onClick={onContinue}
              className="bg-primary hover:bg-primary/90 text-white font-medium"
            >
              Continue with New Patient
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}