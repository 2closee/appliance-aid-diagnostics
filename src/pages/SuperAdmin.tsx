import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import {
  Shield,
  Users,
  Building2,
  BarChart3,
  MessageSquare,
  CreditCard,
  Target,
  Mail,
  Search,
  Ban,
  CheckCircle,
  UserCog,
  Activity,
  AlertTriangle,
  Wrench,
  TrendingUp,
  FileText,
} from "lucide-react";

const SuperAdmin = () => {
  const { toast } = useToast();
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (userRole !== "admin") {
        toast({
          title: "Access Denied",
          description: "Super Admin privileges required.",
          variant: "destructive",
        });
        navigate("/");
      }
    }
  }, [user, userRole, isLoading, navigate, toast]);

  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalCenters },
        { count: activeJobs },
        { count: pendingApplications },
        { count: totalPayments },
        { count: openConversations },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("Repair Center").select("*", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
        supabase.from("repair_jobs").select("*", { count: "exact", head: true }).in("job_status", ["requested", "pickup_scheduled", "picked_up", "in_repair"]),
        supabase.from("repair_center_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("payment_status", "completed"),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      return {
        totalUsers: totalUsers || 0,
        totalCenters: totalCenters || 0,
        activeJobs: activeJobs || 0,
        pendingApplications: pendingApplications || 0,
        totalPayments: totalPayments || 0,
        openConversations: openConversations || 0,
      };
    },
    enabled: userRole === "admin",
  });

  // Fetch users list
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ["super-admin-users", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, is_suspended, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: userRole === "admin",
  });

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ["super-admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return data || [];
    },
    enabled: userRole === "admin",
  });

  const getUserRole = (userId: string) => {
    const role = userRoles?.find((r) => r.user_id === userId);
    return role?.role || "customer";
  };

  const handleToggleSuspend = async (userId: string, currentlySuspended: boolean) => {
    try {
      const { error } = await supabase.rpc("toggle_user_suspension", {
        target_user_id: userId,
        suspend: !currentlySuspended,
      });
      if (error) throw error;
      toast({
        title: currentlySuspended ? "User Unsuspended" : "User Suspended",
        description: currentlySuspended
          ? "User account has been reactivated."
          : "User account has been suspended.",
      });
      refetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Verifying super admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== "admin") return null;

  const overviewCards = [
    { label: "Total Users", value: stats?.totalUsers ?? "—", icon: Users, color: "text-blue-500" },
    { label: "Active Centers", value: stats?.totalCenters ?? "—", icon: Building2, color: "text-emerald-500" },
    { label: "Active Jobs", value: stats?.activeJobs ?? "—", icon: Wrench, color: "text-amber-500" },
    { label: "Pending Applications", value: stats?.pendingApplications ?? "—", icon: AlertTriangle, color: "text-red-500" },
    { label: "Completed Payments", value: stats?.totalPayments ?? "—", icon: CreditCard, color: "text-violet-500" },
    { label: "Open Conversations", value: stats?.openConversations ?? "—", icon: MessageSquare, color: "text-cyan-500" },
  ];

  const quickLinks = [
    { label: "Admin Panel", path: "/admin", icon: Shield, desc: "Legacy admin settings" },
    { label: "Strategic Analytics", path: "/strategic-analytics", icon: Target, desc: "Signup & geographic insights" },
    { label: "Revenue Analytics", path: "/revenue-analytics", icon: TrendingUp, desc: "Revenue & commission tracking" },
    { label: "Payout Management", path: "/payout-management", icon: CreditCard, desc: "Manage repair center payouts" },
    { label: "All Conversations", path: "/admin-conversations", icon: MessageSquare, desc: "Investigative conversation view" },
    { label: "Support Tickets", path: "/admin/support-tickets", icon: Mail, desc: "Manage customer support tickets" },
    { label: "Repair Center Admin", path: "/repair-center-admin", icon: Building2, desc: "Center management portal" },
    { label: "Email Testing", path: "/email-test", icon: FileText, desc: "Test email templates" },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin": return "destructive";
      case "admin": return "destructive";
      case "repair_center": return "default";
      case "teacher": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-destructive/10">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Super Admin Control Center</h1>
            <p className="text-muted-foreground">Full platform oversight and management</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {overviewCards.map((card) => (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-4 text-center">
                <card.icon className={`h-6 w-6 mx-auto mb-2 ${card.color}`} />
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Access
            </CardTitle>
            <CardDescription>Navigate to all management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickLinks.map((link) => (
                <Button
                  key={link.path}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start gap-1 text-left"
                  onClick={() => navigate(link.path)}
                >
                  <div className="flex items-center gap-2">
                    <link.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{link.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{link.desc}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Search, view roles, and suspend/unsuspend users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Joined</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((u) => {
                      const role = getUserRole(u.id);
                      return (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{u.full_name || "No name"}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant={getRoleBadgeVariant(role)}>{role}</Badge>
                          </td>
                          <td className="p-3">
                            {u.is_suspended ? (
                              <Badge variant="destructive" className="gap-1">
                                <Ban className="h-3 w-3" /> Suspended
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                                <CheckCircle className="h-3 w-3" /> Active
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="p-3 text-right">
                            {role !== "super_admin" && (
                              <Button
                                size="sm"
                                variant={u.is_suspended ? "outline" : "destructive"}
                                onClick={() => handleToggleSuspend(u.id, u.is_suspended)}
                              >
                                {u.is_suspended ? "Unsuspend" : "Suspend"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {(!users || users.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdmin;
