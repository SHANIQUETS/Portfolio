import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatStandardDate, formatDateForStorage, parseStandardDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema with validation
const formSchema = z.object({
  patientId: z.number(),
  testDate: z.string().min(1, "Test date is required"),
  testName: z.string().min(1, "Test name is required"),
  testType: z.string().default("other"),
  status: z.string().default("pending"),
  // Keep result_summary since it's required in the database
  resultSummary: z.string().default("No summary provided"),
});

type FormData = z.infer<typeof formSchema>;

// Type for patient result data
interface PatientResult {
  id: number;
  patientId: number;
  doctorId: number;
  testDate: string;
  testName: string;
  testType: string;
  status: string;
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PatientResultFormProps {
  resultId?: number;
  patientId?: number | null;
  onSubmitted: () => void;
}

export default function PatientResultForm({
  resultId,
  patientId,
  onSubmitted,
}: PatientResultFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNew, setIsNew] = useState(!resultId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Type for patient data
  interface Patient {
    id: number;
    firstName: string;
    lastName: string;
    patientId: string;
  }

  // Fetch patients for the dropdown
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });
  
  // Fetch result data if editing an existing result
  const { data: result, isLoading: isResultLoading } = useQuery<PatientResult>({
    queryKey: ["/api/results", resultId],
    enabled: !!resultId,
  });
  
  console.log("PatientResultForm rendered with:", { resultId, patientId, result });
  
  // Setup form with default values
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: patientId || 0,
      testDate: formatStandardDate(new Date()),
      testName: "",
      testType: "other",
      status: "pending",
      resultSummary: "No summary provided",
    },
  });
  
  // Set form values when editing an existing result
  useEffect(() => {
    if (result) {
      form.reset({
        patientId: result.patientId,
        testDate: formatStandardDate(result.testDate),
        testName: result.testName,
        testType: result.testType || "other",
        status: result.status || "pending",
        resultSummary: "No summary provided", // Add default value
      });
    }
  }, [result, form]);
  
  // Handle file selection with validation
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB. Please select a smaller file.",
          variant: "destructive",
        });
        
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      // Validate file type
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Only JPG, PNG, and PDF files are allowed.",
          variant: "destructive",
        });
        
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      console.log(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB, type: ${file.type})`);
      setSelectedFile(file);
      
      toast({
        title: "File selected",
        description: `${file.name} will be uploaded when you save the form.`,
        variant: "default",
      });
    }
  };
  
  // Clear selected file
  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    console.log("File selection cleared");
  };
  
  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        // Make sure patient ID is a number to avoid validation errors
        const patientIdValue = parseInt(data.patientId.toString(), 10);
        if (isNaN(patientIdValue)) {
          throw new Error("Invalid patient ID. Please select a valid patient.");
        }
        
        // Prepare data as direct JSON for API call
        const jsonData = {
          patientId: patientIdValue,
          testDate: formatDateForStorage(data.testDate),
          testName: data.testName,
          testType: data.testType || "other",
          status: data.status || "pending",
          resultSummary: data.resultSummary || "No summary provided", // Include required field
          doctorId: 3 // Current user ID (Nurse Ishmael)
        };
        
        console.log("Submitting patient result data:", jsonData);
        
        // Use regular JSON API call first (without the file)
        let response;
        
        if (isNew) {
          // Create new result
          response = await apiRequest("POST", "/api/results", jsonData);
        } else {
          // Update existing result
          response = await apiRequest("PATCH", `/api/results/${resultId}`, jsonData);
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || `Failed to ${isNew ? 'create' : 'update'} test result`);
          } catch (e) {
            throw new Error(errorText || `Failed to ${isNew ? 'create' : 'update'} test result`);
          }
        }
        
        const resultData = await response.json();
        
        // If we have a file to upload, handle it separately
        if (selectedFile) {
          try {
            // Upload file as separate operation
            console.log("Uploading file:", selectedFile.name);
            const formData = new FormData();
            formData.append("attachment", selectedFile);
            
            const fileUploadResponse = await fetch(`/api/results/${resultData.id}/attachment`, {
              method: "POST",
              body: formData,
              credentials: 'include' // Include credentials for authentication
            });
            
            if (!fileUploadResponse.ok) {
              const errorText = await fileUploadResponse.text();
              console.error("File upload failed:", errorText);
              toast({
                title: "Warning",
                description: "Test result saved but file attachment failed to upload.",
                variant: "destructive",
              });
            } else {
              console.log("File uploaded successfully");
              const updatedResult = await fileUploadResponse.json();
              console.log("Updated result with attachment:", updatedResult);
              // Update the resultData with the attachment URL
              Object.assign(resultData, { attachmentUrl: updatedResult.attachmentUrl });
            }
          } catch (uploadError) {
            console.error("File upload error:", uploadError);
            toast({
              title: "Warning",
              description: "Test result saved but file attachment failed to upload. Please try again.",
              variant: "destructive",
            });
          }
        }
        
        return resultData;
      } catch (error) {
        console.error("Mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/results"],
      });
      toast({
        title: `Patient result ${isNew ? "created" : "updated"} successfully`,
        variant: "default",
      });
      onSubmitted();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (isResultLoading && !isNew) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading result data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{isNew ? "Add New Test Result" : "Edit Test Result"}</h2>
        <p className="text-muted-foreground">
          {isNew ? "Record a new test or procedure for the patient" : "Update test result information"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient ID */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <Select
                    disabled={!!patientId || !!resultId}
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients?.map((patient: Patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.firstName} {patient.lastName} ({patient.patientId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Date */}
            <FormField
              control={form.control}
              name="testDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Test Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            field.value
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
                        selected={parseStandardDate(field.value)}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(formatStandardDate(date));
                          }
                        }}
                        disabled={(date) => 
                          // Disable future dates
                          date > new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Test date in DD/MM/YYYY format
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Name */}
            <FormField
              control={form.control}
              name="testName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Complete Blood Count (CBC), X-Ray, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Attachment</h3>
              
              {/* Show existing attachment when editing */}
              {!isNew && result?.attachmentUrl && !selectedFile && (
                <div className="mb-4 p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">Current attachment:</span>
                      <a 
                        href={result.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        View file
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a new file to replace this attachment
                    </p>
                  </div>
                  
                  {/* Preview for images */}
                  {result.attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i) && (
                    <div className="mt-2">
                      <img 
                        src={result.attachmentUrl}
                        alt="Current attachment" 
                        className="max-h-[100px] object-contain rounded"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {!isNew && result?.attachmentUrl ? "Replace File" : "Upload File"}
                  </Button>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      {selectedFile.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Upload test result document, image, or scan (PDF, JPG, PNG)
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSubmitted}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}