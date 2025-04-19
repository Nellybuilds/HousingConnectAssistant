import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <Router />
        <Toaster />
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
