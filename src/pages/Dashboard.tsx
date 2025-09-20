import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import CustomerDashboard from "@/components/dashboard/CustomerDashboard";
import RepairCenterDashboard from "@/components/dashboard/RepairCenterDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { user, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'admin':
        return <AdminDashboard />;
      case 'repair_center':
        return <RepairCenterDashboard />;
      case 'customer':
      default:
        return <CustomerDashboard />;
    }
  };

  return renderDashboard();
};

export default Dashboard;