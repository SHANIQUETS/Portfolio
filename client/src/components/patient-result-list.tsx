import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDateString } from "@/lib/utils";
import PatientResultDetails from "./patient-result-details";

interface PatientResultListProps {
  patientId: number;
}

export default function PatientResultList({ patientId }: PatientResultListProps) {
  const { toast } = useToast();
  const [selectedResult, setSelectedResult] = useState<number | null>(null);

  // Fetch results for this patient
  const { data: results, isLoading, error } = useQuery({
    queryKey: ["/api/results/patient", patientId],
    queryFn: async () => {
      const response = await fetch(`/api/results/patient/${patientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch patient results");
      }
      return response.json();
    },
    enabled: !!patientId,
  });

  const handleViewDetails = (resultId: number) => {
    setSelectedResult(resultId);
  };

  const handleCloseDetails = () => {
    setSelectedResult(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Loading patient results...</span>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error loading patient results</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center p-4 bg-accent/50 rounded-md">
        <p className="text-muted-foreground">No test results available for this patient</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedResult ? (
        <PatientResultDetails 
          resultId={selectedResult} 
          onClose={handleCloseDetails} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((result: any) => (
            <Card key={result.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>{result.testName}</span>
                  <Badge 
                    variant={
                      result.status === 'completed' ? 'default' :
                      result.status === 'pending' ? 'secondary' : 
                      result.status === 'ordered' ? 'outline' : 'destructive'
                    }
                  >
                    {result.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Date: </span>
                    <span>{formatDateString(result.testDate)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Type: </span>
                    <span className="capitalize">{result.testType}</span>
                  </div>
                  {result.abnormalFlag && (
                    <div className="text-destructive text-sm flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>Abnormal result</span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleViewDetails(result.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" /> View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}