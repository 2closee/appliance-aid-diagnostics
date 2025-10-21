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

interface CreateStaffForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export const StaffManagement: React.FC = () => {
  const { user, repairCenterId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStaffForm>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'staff'
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

  // Create new staff account mutation
  const createStaffMutation = useMutation({
    mutationFn: async (formData: CreateStaffForm) => {
      console.log('Creating new staff account:', formData.email);
      
      // Step 1: Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'repair_center_staff'
          }
        },
      });

      if (authError) {
        console.error('Auth error during staff creation:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Staff account creation failed');
      }

      // Step 2: Create staff record in repair_center_staff table
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

      // Step 3: Send welcome email with credentials
      try {
        const { error: emailError } = await supabase.functions.invoke('send-confirmation-email', {
          body: {
            to: formData.email,
            type: 'staff_welcome',
            data: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              role: formData.role,
              tempPassword: formData.password,
              loginUrl: `${window.location.origin}/auth`
            }
          }
        });

        if (emailError) {
          console.error('Welcome email failed:', emailError);
        }
      } catch (emailError) {
        console.error('Email function error:', emailError);
      }
    },
    onSuccess: () => {
      toast({
        title: "Staff Account Created",
        description: "New staff account has been created successfully. They will receive login details via email.",
      });
      queryClient.invalidateQueries({ queryKey: ['repair-center-staff'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', role: 'staff' });
    },
    onError: (error: any) => {
      console.error('Staff creation error:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create staff account. Please try again.",
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm({ ...createForm, password });
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
          <p className="text-muted-foreground">Create and manage staff accounts for your repair center team.</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Staff Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Staff Account</DialogTitle>
              <DialogDescription>
                Create a new account for a staff member to join your repair center team.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value })}>
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
                <Label htmlFor="password">Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter password"
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Staff member should change this password after first login.
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createStaffMutation.mutate(createForm)}
                  disabled={createStaffMutation.isPending || !createForm.email || !createForm.password || !createForm.firstName}
                >
                  {createStaffMutation.isPending ? "Creating..." : "Create Account"}
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
            <p className="text-muted-foreground">No staff members found. Create your first team member to get started.</p>
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