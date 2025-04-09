import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { Home as HomeIcon, Menu, Settings } from "lucide-react";

export default function Home() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex justify-between items-center px-4 py-3 md:py-4">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="md:hidden text-gray-700 focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Title - only shown on mobile */}
            <div className="md:hidden flex items-center">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white">
                <HomeIcon className="h-4 w-4" />
              </div>
              <h1 className="ml-2 text-lg font-semibold text-gray-900">Housing Connect</h1>
            </div>

            {/* Title - desktop */}
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-gray-900">Housing Connect Helper</h1>
            </div>

            {/* Settings/Options button */}
            <button type="button" className="text-gray-700 hover:text-gray-900 focus:outline-none">
              <Settings className="h-6 w-6" />
            </button>
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
