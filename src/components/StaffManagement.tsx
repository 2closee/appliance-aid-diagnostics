import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Shield, User, Wrench, Crown } from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  repair_center_id: number;
  role: string;
  is_active: boolean;
  is_owner: boolean;
  created_at: string;
}

interface InviteStaffForm {
  email: string;
  role: string;
  tempPassword: string;
}

export const StaffManagement: React.FC = () => {
  const { user, repairCenterId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteStaffForm>({
    email: '',
    role: 'staff',
    tempPassword: ''
  });

  // Fetch staff members for the repair center
  const { data: staffMembers, isLoading } = useQuery({
    queryKey: ['repair-center-staff', repairCenterId],
    queryFn: async () => {
      if (!repairCenterId) return [];
      
      const { data, error } = await supabase
        .from('repair_center_staff')
        .select('*')
        .eq('repair_center_id', repairCenterId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!repairCenterId,
  });

  // Invite staff member mutation
  const inviteStaffMutation = useMutation({
    mutationFn: async (formData: InviteStaffForm) => {
      console.log('Inviting staff member:', formData.email);
      
      // Step 1: Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/repair-center-admin`,
        },
      });

      if (authError) {
        console.error('Auth error during staff invite:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Step 2: Create staff record
      const { error: staffError } = await supabase
        .from('repair_center_staff')
        .insert({
          user_id: authData.user.id,
          repair_center_id: repairCenterId,
          role: formData.role,
          is_active: true,
          is_owner: false,
        });

      if (staffError) {
        console.error('Staff record creation error:', staffError);
        throw staffError;
      }

      // Step 3: Send invitation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-confirmation-email', {
          body: {
            to: formData.email,
            type: 'custom',
            data: {
              subject: 'Welcome to Our Repair Center Team',
              message: `You have been invited to join our repair center as a ${formData.role}. Your temporary password is: ${formData.tempPassword}. Please log in and change your password immediately.`,
              name: formData.email
            }
          }
        });

        if (emailError) {
          console.error('Invitation email failed:', emailError);
        }
      } catch (emailError) {
        console.error('Email function error:', emailError);
      }
    },
    onSuccess: () => {
      toast({
        title: "Staff Member Invited",
        description: "The staff member has been successfully invited and will receive an email with login details.",
      });
      queryClient.invalidateQueries({ queryKey: ['repair-center-staff'] });
      setIsInviteDialogOpen(false);
      setInviteForm({ email: '', role: 'staff', tempPassword: '' });
    },
    onError: (error: any) => {
      console.error('Staff invitation error:', error);
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to invite staff member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update staff role mutation
  const updateStaffRoleMutation = useMutation({
    mutationFn: async ({ staffId, newRole }: { staffId: string; newRole: string }) => {
      const { error } = await supabase
        .from('repair_center_staff')
        .update({ role: newRole })
        .eq('id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Staff member role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['repair-center-staff'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deactivate staff member mutation
  const deactivateStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from('repair_center_staff')
        .update({ is_active: false })
        .eq('id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Staff Deactivated",
        description: "Staff member has been deactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['repair-center-staff'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deactivation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInviteForm({ ...inviteForm, tempPassword: password });
  };

  const getRoleIcon = (role: string, isOwner: boolean) => {
    if (isOwner) return <Crown className="h-4 w-4 text-yellow-500" />;
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'technician':
        return <Wrench className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string, isOwner: boolean) => {
    if (isOwner) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Owner</Badge>;
    
    const roleConfig = {
      admin: { variant: "default" as const, color: "bg-blue-50 text-blue-700 border-blue-200" },
      technician: { variant: "outline" as const, color: "bg-green-50 text-green-700 border-green-200" },
      staff: { variant: "secondary" as const, color: "bg-gray-50 text-gray-700 border-gray-200" }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.staff;
    return <Badge variant={config.variant} className={config.color}>{role}</Badge>;
  };

  if (!repairCenterId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">You need to be associated with a repair center to manage staff.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">Manage your repair center team members and their roles.</p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Staff Member</DialogTitle>
              <DialogDescription>
                Send an invitation to a new team member to join your repair center.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="tempPassword">Temporary Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="tempPassword"
                    type="text"
                    value={inviteForm.tempPassword}
                    onChange={(e) => setInviteForm({ ...inviteForm, tempPassword: e.target.value })}
                    placeholder="Enter temporary password"
                  />
                  <Button type="button" variant="outline" onClick={generateTempPassword}>
                    Generate
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  The staff member should change this password after first login.
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => inviteStaffMutation.mutate(inviteForm)}
                  disabled={inviteStaffMutation.isPending || !inviteForm.email || !inviteForm.tempPassword}
                >
                  {inviteStaffMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage roles and permissions for your repair center staff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading staff members...</p>
          ) : staffMembers?.length === 0 ? (
            <p className="text-muted-foreground">No staff members found. Invite your first team member to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers?.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(staff.role, staff.is_owner)}
                        <span>{staff.user_id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(staff.role, staff.is_owner)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={staff.is_active ? "default" : "secondary"}>
                        {staff.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(staff.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!staff.is_owner && (
                          <>
                            <Select
                              value={staff.role}
                              onValueChange={(newRole) => 
                                updateStaffRoleMutation.mutate({ staffId: staff.id, newRole })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="technician">Technician</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivateStaffMutation.mutate(staff.id)}
                              disabled={deactivateStaffMutation.isPending}
                            >
                              Deactivate
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};