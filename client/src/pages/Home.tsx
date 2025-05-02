import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import TutorialButton from "@/components/tutorial/TutorialButton";
import { Home as HomeIcon, Menu } from "lucide-react";

export default function Home() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Desktop Sidebar */}
      <div className="sidebar">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center px-4 py-3 md:py-4">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="md:hidden text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Title - only shown on mobile */}
            <div className="md:hidden flex items-center">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white">
                <HomeIcon className="h-4 w-4" />
              </div>
              <h1 className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">Housing Connect</h1>
            </div>

            {/* Title - desktop */}
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Housing Connect Helper</h1>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-2">
              {/* Tutorial button */}
              <TutorialButton />
              
              {/* Theme toggle */}
              <div className="theme-toggle">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <ChatInterface />
      </div>

      {/* Mobile menu overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden" 
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={closeMobileSidebar} 
      />
    </div>
  );
}
