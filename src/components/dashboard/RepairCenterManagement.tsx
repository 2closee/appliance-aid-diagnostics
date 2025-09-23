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
  Users,
  Settings,
  Play
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RepairCenterManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCenter, setSelectedCenter] = useState<any>(null);

  // Fetch repair center applications (pending users) with center details
  const { data: pendingApplications, isLoading: loadingApplications } = useQuery({
    queryKey: ["pending-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_center_staff")
        .select(`
          *,
          repair_center:repair_center_id (
            id,
            name,
            address,
            phone,
            email,
            specialties,
            cac_name,
            cac_number,
            tax_id,
            years_of_experience,
            number_of_staff
          )
        `)
        .eq("is_active", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch all repair centers with staff
  const { data: allCenters, isLoading: loadingCenters } = useQuery({
    queryKey: ["all-centers"],
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

  // Filter centers based on their staff status
  const activeCenters = allCenters?.filter((center) => {
    const activeStaff = center.repair_center_staff?.filter((staff: any) => staff.is_active);
    return activeStaff && activeStaff.length > 0;
  }) || [];

  const suspendedCenters = allCenters?.filter((center) => {
    const activeStaff = center.repair_center_staff?.filter((staff: any) => staff.is_active);
    const hasStaff = center.repair_center_staff && center.repair_center_staff.length > 0;
    return hasStaff && (!activeStaff || activeStaff.length === 0);
  }) || [];

  // Approve repair center application
  const approveApplication = useMutation({
    mutationFn: async ({ staffId, centerId, email, name, centerName }: { 
      staffId: string, 
      centerId: number, 
      email: string, 
      name: string, 
      centerName: string 
    }) => {
      // Activate the staff member
      const { error } = await supabase
        .from("repair_center_staff")
        .update({ is_active: true, role: "admin" })
        .eq("id", staffId);

      if (error) throw error;

      // Send approval email
      try {
        await supabase.functions.invoke("send-confirmation-email", {
          body: {
            email,
            name,
            centerName,
            type: "approval"
          }
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the whole operation if email fails
      }

      return { staffId, centerId };
    },
    onSuccess: () => {
      toast({
        title: "Application Approved",
        description: "Repair center application has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
      queryClient.invalidateQueries({ queryKey: ["all-centers"] });
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
    mutationFn: async ({ staffId, centerId, email, name, centerName }: { 
      staffId: string, 
      centerId: number, 
      email: string, 
      name: string, 
      centerName: string 
    }) => {
      // Delete both the staff record and the repair center
      const { error: staffError } = await supabase
        .from("repair_center_staff")
        .delete()
        .eq("id", staffId);

      if (staffError) throw staffError;

      const { error: centerError } = await supabase
        .from("Repair Center")
        .delete()
        .eq("id", centerId);

      if (centerError) throw centerError;

      // Send rejection email
      try {
        await supabase.functions.invoke("send-confirmation-email", {
          body: {
            email,
            name,
            centerName,
            type: "rejection"
          }
        });
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
        // Don't fail the whole operation if email fails
      }

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
      queryClient.invalidateQueries({ queryKey: ["all-centers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update center status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete repair center permanently
  const deleteCenter = useMutation({
    mutationFn: async (centerId: number) => {
      // First delete all staff records
      const { error: staffError } = await supabase
        .from("repair_center_staff")
        .delete()
        .eq("repair_center_id", centerId);

      if (staffError) throw staffError;

      // Then delete the center
      const { error: centerError } = await supabase
        .from("Repair Center")
        .delete()
        .eq("id", centerId);

      if (centerError) throw centerError;

      return centerId;
    },
    onSuccess: () => {
      toast({
        title: "Center Deleted",
        description: "Repair center has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["all-centers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete center: ${error.message}`,
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
        <TabsList className="grid w-full grid-cols-3">
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
            {activeCenters.length > 0 && (
              <Badge variant="secondary">{activeCenters.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suspended" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Suspended Centers
            {suspendedCenters.length > 0 && (
              <Badge variant="destructive">{suspendedCenters.length}</Badge>
            )}
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
                              {application.repair_center?.name || `Application #${application.repair_center_id}`}
                            </h3>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending Review
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <p><strong>Business:</strong> {application.repair_center?.name}</p>
                            <p><strong>Email:</strong> {application.repair_center?.email}</p>
                            <p><strong>Phone:</strong> {application.repair_center?.phone}</p>
                            <p><strong>Address:</strong> {application.repair_center?.address}</p>
                            <p><strong>Specialties:</strong> {application.repair_center?.specialties}</p>
                            <p><strong>Applied:</strong> {new Date(application.created_at).toLocaleDateString()}</p>
                            <p><strong>Years Experience:</strong> {application.repair_center?.years_of_experience}</p>
                            <p><strong>Staff Count:</strong> {application.repair_center?.number_of_staff}</p>
                            <p><strong>CAC Number:</strong> {application.repair_center?.cac_number}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveApplication.mutate({
                              staffId: application.id,
                              centerId: application.repair_center_id,
                              email: application.repair_center?.email || '',
                              name: application.repair_center?.name || '',
                              centerName: application.repair_center?.name || ''
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
                            onClick={() => rejectApplication.mutate({
                              staffId: application.id,
                              centerId: application.repair_center_id,
                              email: application.repair_center?.email || '',
                              name: application.repair_center?.name || '',
                              centerName: application.repair_center?.name || ''
                            })}
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
              ) : activeCenters.length > 0 ? (
                <div className="space-y-4">
                  {activeCenters.map((center) => {
                    const activeStaff = center.repair_center_staff?.filter((staff: any) => staff.is_active);

                    return (
                      <div key={center.id} className="p-4 border rounded-lg">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{center.name}</h3>
                              <Badge variant="default">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
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
                              Manage
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => toggleCenterStatus.mutate({
                                centerId: center.id,
                                suspend: true
                              })}
                              disabled={toggleCenterStatus.isPending}
                              className="flex items-center gap-1"
                            >
                              <Pause className="h-4 w-4" />
                              Suspend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCenter.mutate(center.id)}
                              disabled={deleteCenter.isPending}
                              className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <XCircle className="h-4 w-4" />
                              Delete
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
                  <p className="text-muted-foreground">No active repair centers</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended">
          <Card>
            <CardHeader>
              <CardTitle>Suspended Repair Centers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCenters ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : suspendedCenters.length > 0 ? (
                <div className="space-y-4">
                  {suspendedCenters.map((center) => {
                    const suspendedStaff = center.repair_center_staff?.filter((staff: any) => !staff.is_active);

                    return (
                      <div key={center.id} className="p-4 border rounded-lg border-destructive/20 bg-destructive/5">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{center.name}</h3>
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Suspended
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                              <p><strong>Address:</strong> {center.address}</p>
                              <p><strong>Phone:</strong> {center.phone}</p>
                              <p><strong>Email:</strong> {center.email}</p>
                              <p>
                                <strong>Staff:</strong> 
                                <span className="flex items-center gap-1 ml-1 text-destructive">
                                  <Users className="h-3 w-3" />
                                  {suspendedStaff?.length || 0} suspended
                                </span>
                              </p>
                              <p><strong>Specialties:</strong> {center.specialties}</p>
                            </div>
                            <div className="mt-3 p-3 bg-destructive/10 rounded border border-destructive/20">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="font-medium text-destructive text-sm">Suspension Reason:</h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Non-compliance with service standards and repeated customer complaints. 
                                    Review pending for quality assurance violations.
                                  </p>
                                </div>
                              </div>
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
                              Manage
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => toggleCenterStatus.mutate({
                                centerId: center.id,
                                suspend: false
                              })}
                              disabled={toggleCenterStatus.isPending}
                              className="flex items-center gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Reactivate
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">No suspended repair centers</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manage Center Dialog */}
      {selectedCenter && (
        <Dialog open={!!selectedCenter} onOpenChange={() => setSelectedCenter(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manage {selectedCenter.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Center Details</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><strong>Name:</strong> {selectedCenter.name}</p>
                    <p><strong>Address:</strong> {selectedCenter.address}</p>
                    <p><strong>Phone:</strong> {selectedCenter.phone}</p>
                    <p><strong>Email:</strong> {selectedCenter.email}</p>
                    <p><strong>Hours:</strong> {selectedCenter.hours}</p>
                    <p><strong>Specialties:</strong> {selectedCenter.specialties}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Staff Information</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><strong>Active Staff:</strong> {selectedCenter.repair_center_staff?.filter((staff: any) => staff.is_active).length || 0}</p>
                    <p><strong>Total Staff:</strong> {selectedCenter.repair_center_staff?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Management Actions</h4>
                <div className="flex flex-wrap gap-3">
                  {activeCenters.some(center => center.id === selectedCenter.id) ? (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        toggleCenterStatus.mutate({
                          centerId: selectedCenter.id,
                          suspend: true
                        });
                        setSelectedCenter(null);
                      }}
                      disabled={toggleCenterStatus.isPending}
                      className="flex items-center gap-2"
                    >
                      <Pause className="h-4 w-4" />
                      Suspend Center
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={() => {
                        toggleCenterStatus.mutate({
                          centerId: selectedCenter.id,
                          suspend: false
                        });
                        setSelectedCenter(null);
                      }}
                      disabled={toggleCenterStatus.isPending}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Reactivate Center
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // TODO: Add review functionality
                      toast({
                        title: "Review Feature",
                        description: "Center review functionality will be implemented soon.",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Review Performance
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RepairCenterManagement;