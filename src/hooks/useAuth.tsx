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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check user roles when user changes
        if (session?.user) {
          checkUserRoles(session.user.id);
        } else {
          resetUserRoles();
        }
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRoles(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoles = async (userId: string) => {
    try {
      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (adminError) {
        console.error("Error checking admin status:", adminError);
      }

      const isAdminUser = !!adminData;
      setIsAdmin(isAdminUser);

      // Check if user is repair center staff
      const { data: staffData, error: staffError } = await supabase
        .from("repair_center_staff")
        .select("repair_center_id, role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (staffError) {
        console.error("Error checking repair center staff status:", staffError);
      }

      const isStaff = !!staffData;
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
    await supabase.auth.signOut();
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