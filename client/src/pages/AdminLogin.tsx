import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, login } = useAdminAuth();
  const { toast } = useToast();

  // If already authenticated, redirect to admin dashboard
  if (isAuthenticated) {
    return <Redirect to="/admin" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a slight delay for UX
    setTimeout(() => {
      const success = login(password);
      
      if (!success) {
        toast({
          title: "Authentication Failed",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
      
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Admin Access</h1>
          <p className="mb-6 text-center text-gray-600">
            Enter your password to access the admin dashboard
          </p>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Login"}
            </button>
          </form>
          
          <div className="mt-6">
            <p className="text-center text-xs text-gray-500">
              This is a protected area. Only administrators should access this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}