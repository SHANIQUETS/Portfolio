import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface PatientSearchProps {
  onSearch: (query: string) => void;
}

export default function PatientSearch({ onSearch }: PatientSearchProps) {
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <Input
            id="patient-search-input"
            type="search"
            placeholder="Search patients by name or ID..."
            className="pl-10 w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Button 
              type="submit" 
              variant="ghost" 
              size="sm" 
              className="h-7"
            >
              Search
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
