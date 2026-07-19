import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import CardStat from "@/components/ui/card-stat";
import PatientCard from "@/components/ui/patient-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, ClipboardList, UserPlus, Zap } from "lucide-react";
import { Patient } from "@shared/schema";
import { Link } from "wouter";
import { useMemo } from "react";

// Interface for the appointment data from API
interface Appointment {
  id: number;
  patientId: number;
  patientName?: string;
  doctorId: number;
  appointmentDate: string | Date;
  appointmentTime: string;
  duration: number;
  reason: string;
  status: string;
  notes: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: patients, isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Get today's appointments count
  const todaysAppointmentsCount = useMemo(() => {
    if (!appointments) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day
    
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      appointmentDate.setHours(0, 0, 0, 0); // Set to beginning of day
      
      return appointmentDate.getTime() === today.getTime();
    }).length;
  }, [appointments]);

  // Get only the first 5 patients for the recent patients list
  const recentPatients = patients ? patients.slice(0, 5) : [];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Welcome back, {user?.fullName || user?.username}. Here's an overview of your practice.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {user?.role === 'clerk' ? (
          <Card className="overflow-hidden">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 primary-lighter">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-300 truncate">Total Patients</dt>
                    <dd>
                      <div className="text-lg font-medium text-neutral-900 dark:text-white">{patients?.length?.toString() || "0"}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <CardStat 
            title="Total Patients"
            value={patients?.length?.toString() || "0"} 
            icon={<UserPlus className="h-6 w-6 text-white" />}
            linkUrl="/patients"
            linkText="View all"
            color="primary-lighter"
          />
        )}
        
        {user?.role === 'clerk' ? (
          <Card className="overflow-hidden">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-secondary">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-300 truncate">Today's Appointments</dt>
                    <dd>
                      <div className="text-lg font-medium text-neutral-900 dark:text-white">{todaysAppointmentsCount.toString()}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <CardStat 
            title="Today's Appointments"
            value={todaysAppointmentsCount.toString()}
            icon={<Calendar className="h-6 w-6 text-white" />}
            linkUrl="/appointments"
            linkText="View schedule"
            color="bg-secondary"
          />
        )}
        
        {user?.role !== 'clerk' && (
          <CardStat 
            title="Pending Reports"
            value="0" 
            icon={<ClipboardList className="h-6 w-6 text-white" />}
            linkUrl="#"
            linkText="Complete reports"
            color="bg-accent"
          />
        )}
        
        <CardStat 
          title="Urgent Cases"
          value="0" 
          icon={<Zap className="h-6 w-6 text-white" />}
          linkUrl="#"
          linkText="View all"
          color="bg-amber-400"
        />
      </div>

      {/* Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-100 mb-4">Today's Appointments</h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-600">
                {isLoadingAppointments ? (
                  // Loading skeleton
                  Array(3).fill(0).map((_, i) => (
                    <li key={i} className="p-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                    </li>
                  ))
                ) : appointments ? (
                  (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const todaysAppointments = appointments.filter(appointment => {
                      const appointmentDate = new Date(appointment.appointmentDate);
                      appointmentDate.setHours(0, 0, 0, 0);
                      return appointmentDate.getTime() === today.getTime();
                    });
                    
                    // Sort by time
                    todaysAppointments.sort((a, b) => {
                      const [hoursA, minutesA] = a.appointmentTime.split(':').map(Number);
                      const [hoursB, minutesB] = b.appointmentTime.split(':').map(Number);
                      
                      if (hoursA !== hoursB) return hoursA - hoursB;
                      return minutesA - minutesB;
                    });
                    
                    if (todaysAppointments.length > 0) {
                      return todaysAppointments.map(appointment => (
                        <li key={appointment.id} className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{appointment.patientName || `Patient #${appointment.patientId}`}</div>
                              <div className="text-sm text-muted-foreground">
                                {appointment.appointmentTime} - {appointment.reason}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div
                                className={`h-2 w-2 rounded-full mr-2 ${
                                  appointment.status === "scheduled" ? "bg-blue-500" :
                                  appointment.status === "confirmed" ? "bg-green-500" :
                                  appointment.status === "cancelled" ? "bg-red-500" :
                                  appointment.status === "completed" ? "bg-gray-500" :
                                  "bg-yellow-500"
                                }`}
                              />
                              <span className="text-sm capitalize">{appointment.status}</span>
                            </div>
                          </div>
                        </li>
                      ));
                    } else {
                      // If no appointments today, show upcoming appointments
                      const now = new Date();
                      const futureAppointments = appointments
                        .filter(appointment => {
                          const appointmentDate = new Date(appointment.appointmentDate);
                          return appointmentDate > now;
                        })
                        .sort((a, b) => {
                          // Sort by date
                          const dateA = new Date(a.appointmentDate);
                          const dateB = new Date(b.appointmentDate);
                          return dateA.getTime() - dateB.getTime();
                        })
                        .slice(0, 3); // Show only next 3 appointments
                      
                      if (futureAppointments.length > 0) {
                        return (
                          <>
                            <li className="p-4 bg-muted/30">
                              <div className="text-center">
                                <p className="text-neutral-500 dark:text-neutral-400">No appointments scheduled for today.</p>
                                <p className="text-neutral-600 dark:text-neutral-300 mt-1">
                                  Showing upcoming appointments:
                                </p>
                              </div>
                            </li>
                            {futureAppointments.map(appointment => (
                              <li key={appointment.id} className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">{appointment.patientName || `Patient #${appointment.patientId}`}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime} - {appointment.reason}
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <div
                                      className={`h-2 w-2 rounded-full mr-2 ${
                                        appointment.status === "scheduled" ? "bg-blue-500" :
                                        appointment.status === "confirmed" ? "bg-green-500" :
                                        appointment.status === "cancelled" ? "bg-red-500" :
                                        appointment.status === "completed" ? "bg-gray-500" :
                                        "bg-yellow-500"
                                      }`}
                                    />
                                    <span className="text-sm capitalize">{appointment.status}</span>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </>
                        );
                      } else {
                        return (
                          <li className="py-8">
                            <div className="text-center">
                              <p className="text-neutral-500 dark:text-neutral-400">No appointments scheduled.</p>
                              <Link href="/appointments/new" className="inline-block mt-2 text-sm text-primary font-medium hover:underline">
                                Schedule a new appointment
                              </Link>
                            </div>
                          </li>
                        );
                      }
                    }
                  })()
                ) : (
                  <li className="py-8">
                    <div className="text-center">
                      <p className="text-neutral-500 dark:text-neutral-400">No appointments data available.</p>
                    </div>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Patients */}
        <div>
          <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-100 mb-4">Recent Patients</h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-600">
                {isLoadingPatients ? (
                  // Loading skeleton
                  Array(3).fill(0).map((_, i) => (
                    <li key={i} className="p-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                    </li>
                  ))
                ) : recentPatients.length > 0 ? (
                  recentPatients.map((patient) => (
                    <PatientCard key={patient.id} patient={patient} />
                  ))
                ) : (
                  <li className="py-8">
                    <div className="text-center">
                      <p className="text-neutral-500 dark:text-neutral-400">No patients yet.</p>
                      <Link href="/patients" className="inline-block mt-2 text-sm text-primary font-medium hover:underline">
                        Add your first patient
                      </Link>
                    </div>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
