import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Diagnostic from "./pages/Diagnostic";
import RepairCenters from "./pages/RepairCenters";
import PickupRequest from "./pages/PickupRequest";
import RepairJobs from "./pages/RepairJobs";
import RepairJobDetail from "./pages/RepairJobDetail";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import RepairCenterApplication from "./pages/RepairCenterApplication";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/repair-centers" element={<RepairCenters />} />
            <Route path="/pickup-request" element={<PickupRequest />} />
            <Route path="/repair-jobs" element={<RepairJobs />} />
            <Route path="/repair-jobs/:id" element={<RepairJobDetail />} />
            <Route path="/revenue-analytics" element={<RevenueAnalytics />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/apply-repair-center" element={<RepairCenterApplication />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
