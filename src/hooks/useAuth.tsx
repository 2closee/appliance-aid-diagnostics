import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isRepairCenterStaff: boolean;
  repairCenterId: number | null;
  userRole: 'admin' | 'repair_center' | 'customer' | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAdmin: false,
  isRepairCenterStaff: false,
  repairCenterId: null,
  userRole: null,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRepairCenterStaff, setIsRepairCenterStaff] = useState(false);
  const [repairCenterId, setRepairCenterId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'repair_center' | 'customer' | null>(null);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check user roles when user changes
        if (session?.user) {
          setTimeout(() => {
            if (mounted) {
              checkUserRoles(session.user.id);
            }
          }, 0);
        } else {
          resetUserRoles();
        }
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (error.message.includes('refresh_token_not_found')) {
            // Clear invalid session
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            resetUserRoles();
          }
        } else if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setTimeout(() => {
              if (mounted) {
                checkUserRoles(session.user.id);
              }
            }, 0);
          }
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setIsLoading(false);
          resetUserRoles();
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRoles = async (userId: string) => {
    try {
      console.log('Checking user roles for:', userId);
      
      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (adminError && !adminError.message.includes('JSON object requested')) {
        console.error("Error checking admin status:", adminError);
      }

      const isAdminUser = !!adminData;
      console.log('Is admin:', isAdminUser);
      setIsAdmin(isAdminUser);

      // Check if user is repair center staff
      const { data: staffData, error: staffError } = await supabase
        .from("repair_center_staff")
        .select("repair_center_id, role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (staffError && !staffError.message.includes('JSON object requested')) {
        console.error("Error checking repair center staff status:", staffError);
      }

      const isStaff = !!staffData;
      console.log('Is repair center staff:', isStaff, staffData);
      setIsRepairCenterStaff(isStaff);
      setRepairCenterId(staffData?.repair_center_id || null);

      // Determine primary user role
      if (isAdminUser) {
        setUserRole('admin');
      } else if (isStaff) {
        setUserRole('repair_center');
      } else {
        setUserRole('customer');
      }
      
      console.log('Final user role:', isAdminUser ? 'admin' : (isStaff ? 'repair_center' : 'customer'));
    } catch (error) {
      console.error("Error checking user roles:", error);
      resetUserRoles();
    }
  };

  const resetUserRoles = () => {
    setIsAdmin(false);
    setIsRepairCenterStaff(false);
    setRepairCenterId(null);
    setUserRole(null);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear all state immediately
      setSession(null);
      setUser(null);
      resetUserRoles();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear state even if signOut fails
      setSession(null);
      setUser(null);
      resetUserRoles();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      isAdmin, 
      isRepairCenterStaff, 
      repairCenterId, 
      userRole, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};