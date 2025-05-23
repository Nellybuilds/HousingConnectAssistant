import { 
  Home, Info, File, ScrollText, FileStack, CalendarCheck, 
  Link as LinkIcon, FileDown, HeadphonesIcon, BarChart2
} from "lucide-react";
import { Link } from "wouter";

export default function Sidebar() {
  return (
    <div className="hidden md:flex md:w-72 lg:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white">
              <Home className="h-4 w-4" />
            </div>
            <h1 className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">Housing Connect</h1>
          </div>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Quick Links</h2>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2">
            <ul className="space-y-1">
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Ask Questions</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Info className="h-4 w-4 mr-2" />
                  <span>About Housing Connect</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <File className="h-4 w-4 mr-2" />
                  <span>Eligibility Criteria</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ScrollText className="h-4 w-4 mr-2" />
                  <span>How to Apply</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <FileStack className="h-4 w-4 mr-2" />
                  <span>Required Documents</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  <span>Application Timeline</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="px-4 py-3 mt-4 bg-gray-50 dark:bg-gray-800">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Resources</h2>
          </div>
          
          <div className="px-4 py-2">
            <ul className="space-y-1">
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  <span>Housing Connect Website</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <FileDown className="h-4 w-4 mr-2" />
                  <span>Download Forms</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <HeadphonesIcon className="h-4 w-4 mr-2" />
                  <span>Contact Support</span>
                </a>
              </li>
              <li>
                <Link href="/admin" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  <span>Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Need more help? Contact the Housing Connect support team at:</p>
            <p className="text-sm font-medium mt-1 text-gray-800 dark:text-gray-200">support@housingconnect.gov</p>
          </div>
        </div>
      </div>
    </div>
  );
}
