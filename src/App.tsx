import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Diagnostic from "./pages/Diagnostic";
import RepairCenters from "./pages/RepairCenters";
import PickupRequest from "./pages/PickupRequest";
import PickupSelection from "./pages/PickupSelection";
import RepairJobs from "./pages/RepairJobs";
import RepairJobDetail from "./pages/RepairJobDetail";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import RepairCenterApplication from "./pages/RepairCenterApplication";
import RepairCenterAdmin from "./pages/RepairCenterAdmin";
import RepairCenterChat from "./pages/RepairCenterChat";
import RepairCenterConversations from "./pages/RepairCenterConversations";
import CustomerConversations from "./pages/CustomerConversations";
import PickupSelection from "./pages/PickupSelection";
import PickupRequest from "./pages/PickupRequest";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import PayoutManagement from "./pages/PayoutManagement";
import CenterEarnings from "./pages/CenterEarnings";
import NotFound from "./pages/NotFound";
import EmailTest from "./pages/EmailTest";
import EmailVerification from "./pages/EmailVerification";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/repair-centers" element={<RepairCenters />} />
            <Route path="/pickup-selection" element={<PickupSelection />} />
            <Route path="/pickup-request" element={<PickupRequest />} />
            <Route path="/repair-jobs" element={<RepairJobs />} />
            <Route path="/repair-jobs/:id" element={<RepairJobDetail />} />
            <Route path="/revenue-analytics" element={<RevenueAnalytics />} />
            <Route path="/payout-management" element={<PayoutManagement />} />
            <Route path="/center-earnings" element={<CenterEarnings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/apply-repair-center" element={<RepairCenterApplication />} />
            <Route path="/repair-center-admin" element={<RepairCenterAdmin />} />
            <Route path="/repair-center-chat" element={<RepairCenterChat />} />
            <Route path="/repair-center-conversations" element={<RepairCenterConversations />} />
            <Route path="/customer-conversations" element={<CustomerConversations />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/email-test" element={<EmailTest />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
