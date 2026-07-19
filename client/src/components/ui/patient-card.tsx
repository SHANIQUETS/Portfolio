import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Patient } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface PatientCardProps {
  patient: Patient;
}

export default function PatientCard({ patient }: PatientCardProps) {
  const { user } = useAuth();
  const isClerkRole = user?.role === 'clerk';
  
  const getInitials = (firstName: string, lastName: string) => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const renderVisitType = () => {
    // Only show visit type badge for non-clerk roles
    if (isClerkRole) return null;
    
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100">
        Regular Checkup
      </Badge>
    );
  };

  return (
    <li className="block hover:bg-neutral-50 dark:hover:bg-neutral-600">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar>
              <AvatarFallback>
                {getInitials(patient.firstName, patient.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <div className="text-sm font-medium text-primary">{patient.firstName} {patient.lastName}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-300">ID: {patient.patientId}</div>
            </div>
          </div>
          <div className="ml-2 flex-shrink-0 flex">
            {renderVisitType()}
          </div>
        </div>
        <div className="mt-2 sm:flex sm:justify-between">
          <div className="sm:flex">
            <div className="mt-2 flex items-center text-sm text-neutral-500 dark:text-neutral-300 sm:mt-0">
              <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400 dark:text-neutral-400" />
              Last visit: Unknown
            </div>
          </div>
          {!isClerkRole && (
            <div className="mt-2 flex items-center text-sm text-neutral-500 dark:text-neutral-300 sm:mt-0">
              <Link href={`/patient-record/${patient.id}`}>
                <Button size="sm">
                  View Record
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
