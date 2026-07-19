import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  AlertCircle,
  FilePlus,
  Filter,
  Search,
  FileText,
  Plus,
  Calendar,
  User,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MedicalRecord, Patient } from "@shared/schema";

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch all patients
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: !!user,
  });

  // Fetch all medical records
  const { data: medicalRecords = [], isLoading: isLoadingRecords } = useQuery<MedicalRecord[]>({
    queryKey: ["/api/records"],
    enabled: !!user,
  });

  const isLoading = isLoadingPatients || isLoadingRecords;

  // Get patient name by ID
  const getPatientName = (patientId: number): string => {
    const patient = patients.find((p: Patient) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : "Unknown Patient";
  };

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

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    // Search is handled directly in the filter function
  };

  // Enhanced records with patient names and record types
  const enhancedRecords = medicalRecords.map((record: MedicalRecord) => ({
    ...record,
    patientName: getPatientName(record.patientId),
    recordType: getRecordType(record.visitType),
    primaryDiagnosis: record.diagnosis || "No diagnosis"
  }));

  // Filter records based on search query and active tab
  const filteredRecords = enhancedRecords
    .filter((record: any) => {
      const matchesSearch =
        !searchQuery ||
        record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.diagnosis && record.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()));

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "recent" && new Date(record.visitDate) >= oneWeekAgo) ||
        (activeTab === "urgent" && record.visitType === "urgent");

      return matchesSearch && matchesTab;
    })
    // Sort records by date in descending order (newest first)
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
          <Button asChild>
            <Link href="/patient-record">
              <FilePlus className="mr-2 h-4 w-4" />
              New Medical Record
            </Link>
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Search Medical Records</CardTitle>
            <CardDescription>Search by patient name or diagnosis</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search medical records..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Records</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="urgent">Urgent</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Medical Records</CardTitle>
            <CardDescription>
              {activeTab === "all"
                ? "Viewing all patient medical records"
                : activeTab === "recent"
                ? "Viewing recently added medical records"
                : "Viewing urgent care records"}
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
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Record Type</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords && filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            {record.patientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            {record.visitDate ? format(new Date(record.visitDate), "PP") : "Unknown date"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.recordType}</Badge>
                        </TableCell>
                        <TableCell>
                          {record.visitType === "urgent" ? (
                            <div className="flex items-center">
                              <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                              {record.primaryDiagnosis}
                            </div>
                          ) : (
                            record.primaryDiagnosis
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 px-2 lg:px-3"
                          >
                            <Link href={`/patient-record/${record.patientId}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Record
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No medical records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}