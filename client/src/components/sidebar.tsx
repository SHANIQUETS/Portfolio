import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Home, 
  Users, 
  FileText, 
  Calendar, 
  Menu, 
  LogOut, 
  Activity,
  Clipboard,
  ShieldAlert,
  Shield,
  Settings,
  UserCog,
  BarChart3,
  Building2,
  CreditCard,
  LifeBuoy,
  ClipboardList
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(true);

  // Base navigation items that all roles can see
  const baseNavItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: <Home className="h-5 w-5 mr-3" /> },
    { href: "/patients", label: "Patients", icon: <Users className="h-5 w-5 mr-3" /> },
    { href: "/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5 mr-3" /> },
    { href: "/patient-results", label: "Patient Results", icon: <Clipboard className="h-5 w-5 mr-3" /> },
  ];

  // Additional items based on role
  const nurseNavItems: NavItem[] = [
    { href: "/medical-records", label: "Medical Records", icon: <FileText className="h-5 w-5 mr-3" /> },
  ];

  const doctorNavItems: NavItem[] = [
    { href: "/medical-records", label: "Medical Records", icon: <FileText className="h-5 w-5 mr-3" /> },
    { href: "/patient-results", label: "Patient Results", icon: <Clipboard className="h-5 w-5 mr-3" /> },
  ];

  // Clinic Super Admin specific items (clinic-specific role)
  const clinicSuperAdminItems: NavItem[] = [
    { href: "/clinic-admin", label: "Clinic Admin", icon: <ShieldAlert className="h-5 w-5 mr-3" /> },
  ];

  // Platform Admin specific item (governance role)
  const platformAdminItems: NavItem[] = [
    { href: "/admin/platform-admins", label: "Platform Admins", icon: <UserCog className="h-5 w-5 mr-3" /> },
  ];

  // System Admin specific items (platform-wide role) - matches the new screenshot exactly
  const systemAdminItems: NavItem[] = [
    { href: "/admin", label: "Overview", icon: <Home className="h-5 w-5 mr-3" /> },
    { href: "/admin/platform-admins", label: "Platform Admins", icon: <UserCog className="h-5 w-5 mr-3" /> },
    { href: "/admin/clinics", label: "Clients", icon: <Building2 className="h-5 w-5 mr-3" /> },
    { href: "/admin/billing-management", label: "Billing", icon: <CreditCard className="h-5 w-5 mr-3" /> },
    { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5 mr-3" /> },
    { href: "/admin/support", label: "Support", icon: <LifeBuoy className="h-5 w-5 mr-3" /> },
    { href: "/admin/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-3" /> },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: <ClipboardList className="h-5 w-5 mr-3" /> },
  ];

  // Determine which nav items to show based on user role
  let navItems: NavItem[] = [...baseNavItems];

  if (user?.role === 'nurse') {
    navItems = [...baseNavItems, ...nurseNavItems];
  } else if (user?.role === 'doctor') {
    navItems = [...baseNavItems, ...doctorNavItems];
  } else if (user?.role === 'admin') {
    // System Admin has a completely different set of navigation items
    // This includes platform admin links on every admin page

    // For admin role, always use the full system admin menu, which includes Platform Admin
    navItems = systemAdminItems;

    // Don't include any of the base items for admin users
    // This ensures we're only showing the system admin specific links
  } else if (user?.role === 'super_admin') {
    // Clinic Super Admin (top-level user within a clinic)
    // Only show activity and clinic admin tabs
    navItems = [
      { href: "/activity", label: "Activity", icon: <Activity className="h-5 w-5 mr-3" /> },
      { href: "/clinic-admin", label: "Clinic Admin", icon: <ShieldAlert className="h-5 w-5 mr-3" /> }
    ];
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="w-full md:w-64 bg-white dark:bg-neutral-700 shadow-md md:flex md:flex-col">
      {/* Header */}
      <div className="flex items-center justify-between md:justify-center p-4 border-b border-neutral-200 dark:border-neutral-600">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <span className="text-lg font-semibold text-primary">
            {user?.role === 'admin' ? 'Vitalyst Admin' : 'Vitalyst'}
          </span>
        </div>
        <button 
          className="md:hidden flex items-center px-3 py-2 border rounded text-neutral-600 border-neutral-500 hover:text-primary hover:border-primary" 
          onClick={toggleMobileMenu}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <div 
        className={`
          transition-opacity duration-300 ease-in-out 
          md:opacity-100 md:max-h-screen md:flex md:flex-col md:flex-1
          ${mobileMenuOpen ? 'opacity-100 max-h-screen' : 'opacity-0 max-h-0 md:opacity-100 md:max-h-screen'}
        `}
      >
        <div className="px-2 py-4 flex-1">
          <nav className="space-y-1">
            {navItems.map((item) => {
              // Check if current route matches the nav item or is a sub-route
              const isActive = 
                // Exact match
                location === item.href || 
                // Special case for admin routes - handles all sub-routes
                (location.startsWith(item.href) && item.href !== '/') || 
                // Special case for admin platform - this should be active if we're in any platform admin page
                (item.href === '/admin/platform-admins' && location.includes('platform-admins')) ||
                // Use the active flag set in the component
                item.active === true;

              return (
                <div key={item.href} className="mb-1">
                  <Link href={item.href}>
                    <div
                      className={`
                        sidebar-link px-4 py-2.5 text-sm font-medium rounded-md 
                        ${isActive 
                          ? 'bg-primary text-white font-bold' 
                          : 'text-neutral-600 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-600'
                        }
                      `}
                    >
                      <div className="sidebar-icon">{item.icon}</div>
                      <span className="sidebar-text">{item.label}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {/* User profile section */}
        <div className="border-t border-neutral-200 dark:border-neutral-600 p-4">
          <div className="flex items-center">
            <Avatar>
              <AvatarFallback>
                {user?.fullName ? getInitials(user.fullName) : 'MD'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.fullName || user?.username}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {user?.role ? (
                  <span className="capitalize">{user.role}</span>
                ) : (
                  user?.specialization || 'Staff'
                )}
              </p>
            </div>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}