import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Building, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Eye,
  AlertTriangle,
  Clock,
  Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RepairCenterManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCenter, setSelectedCenter] = useState<any>(null);

  // Fetch repair center applications (pending users)
  const { data: pendingApplications, isLoading: loadingApplications } = useQuery({
    queryKey: ["pending-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_center_staff")
        .select("*")
        .eq("is_active", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch active repair centers with staff
  const { data: activeCenters, isLoading: loadingCenters } = useQuery({
    queryKey: ["active-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Repair Center")
        .select(`
          *,
          repair_center_staff(*)
        `)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Approve repair center application
  const approveApplication = useMutation({
    mutationFn: async ({ staffId, centerId }: { staffId: string, centerId: number }) => {
      // First, create the repair center if it doesn't exist
      const { data: centerData, error: centerError } = await supabase
        .from("Repair Center")
        .select("id")
        .eq("id", centerId)
        .maybeSingle();

      if (centerError) throw centerError;

      if (!centerData) {
        // Create repair center from staff application metadata
        const { data: staffData, error: staffError } = await supabase
          .from("repair_center_staff")
          .select("*")
          .eq("id", staffId)
          .single();

        if (staffError) throw staffError;

        const { error: createCenterError } = await supabase
          .from("Repair Center")
          .insert({
            id: centerId,
            name: "New Repair Center", // This should come from application data
            address: "TBD",
            phone: "TBD",
            email: "TBD",
            hours: "Mon-Sat: 8AM-6PM",
            specialties: "General repairs"
          });

        if (createCenterError) throw createCenterError;
      }

      // Activate the staff member
      const { error } = await supabase
        .from("repair_center_staff")
        .update({ is_active: true, role: "admin" })
        .eq("id", staffId);

      if (error) throw error;
      return { staffId, centerId };
    },
    onSuccess: () => {
      toast({
        title: "Application Approved",
        description: "Repair center application has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
      queryClient.invalidateQueries({ queryKey: ["active-centers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to approve application: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reject repair center application
  const rejectApplication = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from("repair_center_staff")
        .delete()
        .eq("id", staffId);

      if (error) throw error;
      return staffId;
    },
    onSuccess: () => {
      toast({
        title: "Application Rejected",
        description: "Repair center application has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reject application: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Suspend/Unsuspend repair center
  const toggleCenterStatus = useMutation({
    mutationFn: async ({ centerId, suspend }: { centerId: number, suspend: boolean }) => {
      const { error } = await supabase
        .from("repair_center_staff")
        .update({ is_active: !suspend })
        .eq("repair_center_id", centerId);

      if (error) throw error;
      return { centerId, suspend };
    },
    onSuccess: (data) => {
      toast({
        title: data.suspend ? "Center Suspended" : "Center Activated",
        description: `Repair center has been ${data.suspend ? 'suspended' : 'activated'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["active-centers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update center status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building className="h-8 w-8 text-primary" />
        <h2 className="text-2xl font-bold">Repair Center Management</h2>
      </div>

      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Applications
            {pendingApplications && pendingApplications.length > 0 && (
              <Badge variant="secondary">{pendingApplications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="centers" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Active Centers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Pending Repair Center Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingApplications ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : pendingApplications && pendingApplications.length > 0 ? (
                <div className="space-y-4">
                  {pendingApplications.map((application) => (
                    <div key={application.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              Repair Center Application #{application.repair_center_id}
                            </h3>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending Review
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>Role:</strong> {application.role}</p>
                            <p><strong>Applied:</strong> {new Date(application.created_at).toLocaleDateString()}</p>
                            <p><strong>Center ID:</strong> #{application.repair_center_id}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveApplication.mutate({
                              staffId: application.id,
                              centerId: application.repair_center_id
                            })}
                            disabled={approveApplication.isPending}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectApplication.mutate(application.id)}
                            disabled={rejectApplication.isPending}
                            className="flex items-center gap-1"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">No pending applications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <CardTitle>Active Repair Centers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCenters ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : activeCenters && activeCenters.length > 0 ? (
                <div className="space-y-4">
                  {activeCenters.map((center) => {
                    const activeStaff = center.repair_center_staff?.filter((staff: any) => staff.is_active);
                    const suspendedStaff = center.repair_center_staff?.filter((staff: any) => !staff.is_active);
                    const isActive = activeStaff && activeStaff.length > 0;

                    return (
                      <div key={center.id} className="p-4 border rounded-lg">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{center.name}</h3>
                              <Badge variant={isActive ? "default" : "secondary"}>
                                {isActive ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <Pause className="h-3 w-3 mr-1" />
                                    Suspended
                                  </>
                                )}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                              <p><strong>Address:</strong> {center.address}</p>
                              <p><strong>Phone:</strong> {center.phone}</p>
                              <p><strong>Email:</strong> {center.email}</p>
                              <p>
                                <strong>Staff:</strong> 
                                <span className="flex items-center gap-1 ml-1">
                                  <Users className="h-3 w-3" />
                                  {activeStaff?.length || 0} active
                                  {suspendedStaff && suspendedStaff.length > 0 && (
                                    <span className="text-red-500">
                                      , {suspendedStaff.length} suspended
                                    </span>
                                  )}
                                </span>
                              </p>
                              <p><strong>Specialties:</strong> {center.specialties}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCenter(center)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant={isActive ? "destructive" : "default"}
                              onClick={() => toggleCenterStatus.mutate({
                                centerId: center.id,
                                suspend: isActive
                              })}
                              disabled={toggleCenterStatus.isPending}
                              className="flex items-center gap-1"
                            >
                              {isActive ? (
                                <>
                                  <Pause className="h-4 w-4" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No repair centers registered yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RepairCenterManagement;