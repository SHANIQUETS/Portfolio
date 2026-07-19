import { useState, useEffect } from "react";
import { Patient } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2, User, Search } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface PatientLookupProps {
  onSelectPatient: (patient: Patient | null) => void;
  initialValue?: Patient | null;
}

export default function PatientLookup({ onSelectPatient, initialValue }: PatientLookupProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialValue || null);

  // Generate formatted options for the combobox
  const patientOptions: ComboboxItem[] = searchResults ? searchResults.map((patient: Patient) => ({
    value: patient.id.toString(),
    label: `${patient.firstName} ${patient.lastName} (${patient.patientId})`
  })) : [];

  // Handle option selection
  const handleSelect = (value: string) => {
    if (!value) {
      setSelectedPatient(null);
      onSelectPatient(null);
      return;
    }

    const selectedPatient = searchResults ? searchResults.find((p: Patient) => p.id.toString() === value) : null;
    if (selectedPatient) {
      setSelectedPatient(selectedPatient);
      onSelectPatient(selectedPatient);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (query.length < 3) {
      toast({
        title: "Search query too short",
        description: "Please enter at least 3 characters to search",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      // Try the fuzzy search first for more flexible matching
      const fuzzyResponse = await fetch(`/api/patients/fuzzy-search?query=${encodeURIComponent(query)}`);
      
      if (fuzzyResponse.ok) {
        const fuzzyData = await fuzzyResponse.json();
        
        // If fuzzy search returns results, use them
        if (fuzzyData.length > 0) {
          setSearchResults(fuzzyData);
          setIsSearching(false);
          return;
        }
      }
      
      // If fuzzy search fails or returns no results, fall back to standard lookup
      const response = await fetch(`/api/patients/lookup?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error("Failed to search patients");
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching patients:", error);
      toast({
        title: "Error",
        description: "Failed to search for patients",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto search when query is updated after debounce
  useEffect(() => {
    if (query.length >= 3) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query]);

  return (
    <div className="space-y-4">
      {selectedPatient ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 rounded-full p-2">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                  <p className="text-sm text-muted-foreground">ID: {selectedPatient.patientId}</p>
                  {selectedPatient.phone && (
                    <p className="text-sm text-muted-foreground">Phone: {selectedPatient.phone}</p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedPatient(null);
                  onSelectPatient(null);
                }}
              >
                Change Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or phone number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isSearching || query.length < 3}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          
          {patientOptions.length > 0 && (
            <Combobox
              items={patientOptions}
              value={selectedPatient ? selectedPatient.id.toString() : ""}
              onChange={handleSelect}
              placeholder="Select a patient"
              emptyText="No patients found"
              isLoading={isSearching}
            />
          )}
          
          {query.length > 2 && searchResults.length === 0 && !isSearching && (
            <div className="p-4 text-center text-muted-foreground border rounded-md">
              No patients found matching "{query}". Try a different search or create a new patient.
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => navigate("/patient-record")}
            >
              Create New Patient
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}