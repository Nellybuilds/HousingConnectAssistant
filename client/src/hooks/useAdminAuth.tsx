import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

// Create the context with default values
const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
});

// Admin authentication provider component
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  // Use state to track authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if already authenticated from localStorage
  useEffect(() => {
    const storedAuth = localStorage.getItem("admin_authenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Simple login function with hardcoded password
  // In a real app, you would validate against a backend API
  const login = (password: string): boolean => {
    // Admin password: housingconnect_admin
    // In a real app, this should be a secure backend API call
    const isValid = password === "housingconnect_admin";
    
    if (isValid) {
      setIsAuthenticated(true);
      localStorage.setItem("admin_authenticated", "true");
    }
    
    return isValid;
  };

  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_authenticated");
  };

  // Provide the authentication context to children
  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}