import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import AppointmentForm from "@/components/appointment-form";
import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";

export default function NewAppointmentPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Check if patient ID is provided in the URL query params
  const urlSearchParams = new URLSearchParams(window.location.search);
  const patientId = urlSearchParams.get("patientId") ? parseInt(urlSearchParams.get("patientId")!, 10) : undefined;
  
  return (
    <Layout>
      <div className="mx-auto max-w-5xl py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">New Appointment</h1>
            <p className="text-muted-foreground">
              Schedule a new appointment for a patient
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
          >
            Back
          </Button>
        </div>
        
        <div className="bg-card border rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary/10 p-2 rounded-full">
              <CalendarRange className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Appointment Details</h2>
          </div>
          
          <AppointmentForm patientId={patientId} />
        </div>
      </div>
    </Layout>
  );
}