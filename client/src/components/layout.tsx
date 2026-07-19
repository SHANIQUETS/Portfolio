import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, MoonIcon } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={`h-screen flex flex-col md:flex-row overflow-hidden ${darkMode ? 'dark' : ''}`}>
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-neutral-700 shadow">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex-1 flex">
              {/* App name - visible on mobile when sidebar is collapsed */}
              <div className="md:hidden flex items-center">
                <span className="text-lg font-semibold text-primary">Vitalyst</span>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Dark mode toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleDarkMode} 
                className="mx-1"
              >
                <MoonIcon className="h-5 w-5" />
              </Button>

              {/* Notification button */}
              <Button variant="ghost" size="icon" className="ml-1">
                <span className="sr-only">View notifications</span>
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-800 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
