import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LogoutPage from "@/pages/logout-page";
import DashboardPage from "@/pages/dashboard-page";
import PatientsPage from "@/pages/patients-page";
import PatientRecordPage from "@/pages/patient-record-page";
import EditPatientPage from "@/pages/edit-patient-page";
import AppointmentsPage from "@/pages/appointments-page";
import NewAppointmentPage from "@/pages/new-appointment-page";
import MedicalRecordsPage from "@/pages/medical-records-page";
import PatientResultsPage from "@/pages/patient-results-page";
import ActivityPage from "@/pages/activity-page";
import SystemAdminDashboardPage from "@/pages/admin/system-admin-dashboard";
import SuperAdminDashboardPage from "@/pages/admin/super-admin-dashboard";
import BillingManagementPage from "@/pages/admin/billing-management";
import PlatformAdminDashboard from "@/pages/admin/platform-admin-dashboard";

function Router() {
  return (
    <Switch>
      {/* Routes accessible to all roles */}
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/patients" component={PatientsPage} />
      <ProtectedRoute path="/appointments" component={AppointmentsPage} />
      <ProtectedRoute path="/appointments/new" component={NewAppointmentPage} />

      {/* Patient creation is accessible to all, but viewing medical history is restricted */}
      <ProtectedRoute 
        path="/patient-record" 
        component={PatientRecordPage} 
      />
      <ProtectedRoute 
        path="/patient-record/:id" 
        component={PatientRecordPage} 
        allowedRoles={['nurse', 'doctor']} 
      />
      <ProtectedRoute 
        path="/patients/:id/edit" 
        component={EditPatientPage} 
        allowedRoles={['clerk', 'nurse', 'doctor']} 
      />
      <ProtectedRoute 
        path="/medical-records" 
        component={MedicalRecordsPage} 
        allowedRoles={['nurse', 'doctor']} 
      />
      <ProtectedRoute 
        path="/patient-results" 
        component={PatientResultsPage} 
        allowedRoles={['nurse', 'doctor']} 
      />

      {/* Routes accessible to admins and super admins */}
      <ProtectedRoute 
        path="/activity" 
        component={ActivityPage} 
        allowedRoles={['admin', 'super_admin']} 
      />

      {/* System Admin dashboard pages */}
      <ProtectedRoute 
        path="/admin" 
        component={SystemAdminDashboardPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/users" 
        component={SystemAdminDashboardPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/platform-admins" 
        component={PlatformAdminDashboard} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/clinics" 
        component={SystemAdminDashboardPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/billing-management" 
        component={BillingManagementPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/analytics" 
        component={SystemAdminDashboardPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/support" 
        component={SystemAdminDashboardPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/settings" 
        component={SystemAdminDashboardPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/admin/audit-logs" 
        component={SystemAdminDashboardPage} 
        allowedRoles={['admin']} 
      />
      <ProtectedRoute 
        path="/clinic-admin" 
        component={SuperAdminDashboardPage} 
        allowedRoles={['super_admin']} 
      />

      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/logout" component={LogoutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

interface AppProps {
  clerkEnabled?: boolean;
}

function App({ clerkEnabled = false }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider clerkEnabled={clerkEnabled}>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;