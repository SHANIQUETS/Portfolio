import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PatientList from "@/components/patient-list";
import PatientSearch from "@/components/patient-search";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Filter, PlusIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Patient } from "@shared/schema";

export default function PatientsPage() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get user role to determine permissions
  const { user } = useAuth();
  const isClerkRole = user?.role === 'clerk';

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });
  
  // Set default filter to active patients when page loads for clerk role
  useEffect(() => {
    if (isClerkRole && patients && patients.length > 0) {
      setStatusFilter('active');
    }
  }, [isClerkRole, patients]);

  const { data: searchResults, isLoading: isSearchLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients/search", searchQuery],
    queryFn: () => fetch(`/api/patients/search?query=${encodeURIComponent(searchQuery)}`).then(res => res.json()),
    enabled: searchQuery.length > 0,
  });

  // Apply filters and get final list of patients to display
  const getFilteredPatients = () => {
    const patientsToFilter = searchQuery ? (searchResults || []) : (patients || []);
    
    // Apply status filter
    const statusFiltered = statusFilter === 'all' 
      ? patientsToFilter 
      : patientsToFilter.filter(patient => patient.status === statusFilter);
    
    // We don't currently have a patient type field, so type filter isn't applied
    // This could be implemented later when that field is added
    return statusFiltered;
  };

  const filteredPatients = getFilteredPatients();
  
  // Define permissions based on user role
  const canAccessMedicalRecords = user?.role === 'nurse' || user?.role === 'doctor';
  
  const handleAddPatient = () => {
    // All roles can create a new patient
    navigate("/patient-record");
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">Patients</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Manage your patient records and information.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={handleAddPatient}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-700 p-4 shadow rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
              <div className="flex items-center mb-2 sm:mb-0">
                <span className="text-sm text-neutral-600 dark:text-neutral-300 mr-2">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Hide type filter for clerk role - they only need status filter */}
              {!isClerkRole && (
                <div className="flex items-center mb-2 sm:mb-0">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300 mr-2">Type:</span>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="regular">Regular Checkup</SelectItem>
                      <SelectItem value="urgent">Urgent Care</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex sm:mt-0 sm:ml-4">
            {/* Filter button functionality is already handled by the Select components 
                which trigger filtering on value change, so this button can be removed 
                or used for something else like clearing filters */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // For clerk role, only reset status filter since type filter is hidden
                setStatusFilter('all');
                if (!isClerkRole) {
                  setTypeFilter('all');
                }
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              {isClerkRole ? 'Show All Patients' : 'Clear Filters'}
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <PatientSearch onSearch={setSearchQuery} />

      {/* Patient List */}
      <PatientList 
        patients={filteredPatients} 
        isLoading={isLoading || isSearchLoading} 
      />
    </Layout>
  );
}
