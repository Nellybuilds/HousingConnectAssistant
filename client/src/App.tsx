import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { TutorialProvider } from "@/hooks/useTutorial";
import Tutorial from "@/components/tutorial/Tutorial";

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
      <ThemeProvider>
        <AdminAuthProvider>
          <TutorialProvider>
            <Router />
            <Tutorial />
            <Toaster />
          </TutorialProvider>
        </AdminAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
