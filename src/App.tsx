import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Diagnostic from "./pages/Diagnostic";
import RepairCenters from "./pages/RepairCenters";
import PickupRequest from "./pages/PickupRequest";
import Admin from "./pages/Admin";
import RepairCenterApplication from "./pages/RepairCenterApplication";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/diagnostic" element={<Diagnostic />} />
          <Route path="/repair-centers" element={<RepairCenters />} />
          <Route path="/pickup-request" element={<PickupRequest />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/apply-repair-center" element={<RepairCenterApplication />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
