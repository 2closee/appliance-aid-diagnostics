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
  Play,
  BarChart3
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CenterPerformance from "./CenterPerformance";

const RepairCenterManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [performanceCenter, setPerformanceCenter] = useState<any>(null);

  // Fetch repair center applications (pending users) from repair_center_applications table
  const { data: pendingApplications, isLoading: loadingApplications } = useQuery({
    queryKey: ["pending-applications"],
    queryFn: async () => {
      console.log('Fetching pending applications...');
      const { data, error } = await supabase
        .from("repair_center_applications")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching pending applications:', error);
        throw error;
      }
      
      console.log('Pending applications found:', data?.length || 0);
      return data || [];
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

  // Approve repair center application - create account with temp password
  const approveApplication = useMutation({
    mutationFn: async ({ applicationId, email, fullName, businessName }: { 
      applicationId: string,
      email: string, 
      fullName: string, 
      businessName: string 
    }) => {
      console.log('Approving application:', applicationId);
      
      // Call edge function to approve application and send credentials
      const { data, error } = await supabase.functions.invoke("approve-repair-center-application", {
        body: {
          applicationId,
          email,
          fullName,
          businessName
        }
      });

      if (error) {
        console.error('Approval error:', error);
        throw error;
      }

      console.log('Application approved successfully');
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Application Approved",
        description: "Repair center application has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
      queryClient.invalidateQueries({ queryKey: ["all-centers"] });
    },
    onError: (error: any) => {
      console.error('Approval error:', error);
      toast({
        title: "Error",
        description: `Failed to approve application: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reject repair center application
  const rejectApplication = useMutation({
    mutationFn: async ({ applicationId, email, fullName, businessName }: { 
      applicationId: string,
      email: string, 
      fullName: string, 
      businessName: string 
    }) => {
      console.log('Rejecting application:', applicationId);
      
      // Update application status to rejected
      const { error } = await supabase
        .from("repair_center_applications")
        .update({ status: 'rejected' })
        .eq("id", applicationId);

      if (error) {
        console.error('Rejection error:', error);
        throw error;
      }

      // Send rejection email
      try {
        console.log('Sending rejection email to:', email);
        const { error: emailError } = await supabase.functions.invoke("send-confirmation-email", {
          body: {
            to: email,
            type: "rejection",
            data: {
              name: fullName,
              businessName: businessName
            }
          }
        });

        if (emailError) {
          console.error("Rejection email failed:", emailError);
        }
      } catch (emailError) {
        console.error("Email function error:", emailError);
      }

      return applicationId;
    },
    onSuccess: () => {
      toast({
        title: "Application Rejected",
        description: "Repair center application has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
      queryClient.invalidateQueries({ queryKey: ["all-centers"] });
    },
    onError: (error: any) => {
      console.error('Rejection error:', error);
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
                              {application.business_name}
                            </h3>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending Review
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <p><strong>Contact:</strong> {application.full_name}</p>
                            <p><strong>Email:</strong> {application.email}</p>
                            <p><strong>Phone:</strong> {application.phone}</p>
                            <p><strong>Address:</strong> {application.address}, {application.city}, {application.state}</p>
                            <p><strong>Specialties:</strong> {application.specialties}</p>
                            <p><strong>Applied:</strong> {new Date(application.created_at).toLocaleDateString()}</p>
                            <p><strong>Years in Business:</strong> {application.years_in_business}</p>
                            <p><strong>Staff Count:</strong> {application.number_of_staff}</p>
                            <p><strong>CAC Number:</strong> {application.cac_number}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveApplication.mutate({
                              applicationId: application.id,
                              email: application.email,
                              fullName: application.full_name,
                              businessName: application.business_name
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
                              applicationId: application.id,
                              email: application.email,
                              fullName: application.full_name,
                              businessName: application.business_name
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
                      setPerformanceCenter(selectedCenter);
                      setSelectedCenter(null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Performance
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Performance Analytics Dialog */}
      {performanceCenter && (
        <Dialog open={!!performanceCenter} onOpenChange={() => setPerformanceCenter(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Center Performance Analytics
              </DialogTitle>
            </DialogHeader>
            <CenterPerformance 
              centerId={performanceCenter.id} 
              centerName={performanceCenter.name} 
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RepairCenterManagement;