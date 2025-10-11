export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          repair_center_id: number
          repair_job_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          repair_center_id: number
          repair_job_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          repair_center_id?: number
          repair_job_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_history: {
        Row: {
          changed_by: string | null
          id: string
          notes: string | null
          repair_job_id: string
          status: Database["public"]["Enums"]["job_status"]
          timestamp: string
        }
        Insert: {
          changed_by?: string | null
          id?: string
          notes?: string | null
          repair_job_id: string
          status: Database["public"]["Enums"]["job_status"]
          timestamp?: string
        }
        Update: {
          changed_by?: string | null
          id?: string
          notes?: string | null
          repair_job_id?: string
          status?: Database["public"]["Enums"]["job_status"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          app_owner_id: string | null
          commission_rate: number | null
          created_at: string
          currency: string
          id: string
          net_amount: number | null
          payment_date: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          repair_job_id: string
          stripe_checkout_session_id: string | null
          stripe_fee: number | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          app_owner_id?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string
          id?: string
          net_amount?: number | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          repair_job_id: string
          stripe_checkout_session_id?: string | null
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          app_owner_id?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string
          id?: string
          net_amount?: number | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          repair_job_id?: string
          stripe_checkout_session_id?: string | null
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      "Repair Center": {
        Row: {
          address: string | null
          cac_name: string | null
          cac_number: string | null
          email: string | null
          hours: string | null
          id: number
          name: string | null
          number_of_staff: number | null
          phone: string | null
          specialties: string | null
          status: string
          tax_id: string | null
          years_of_experience: number | null
        }
        Insert: {
          address?: string | null
          cac_name?: string | null
          cac_number?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          name?: string | null
          number_of_staff?: number | null
          phone?: string | null
          specialties?: string | null
          status?: string
          tax_id?: string | null
          years_of_experience?: number | null
        }
        Update: {
          address?: string | null
          cac_name?: string | null
          cac_number?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          name?: string | null
          number_of_staff?: number | null
          phone?: string | null
          specialties?: string | null
          status?: string
          tax_id?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      repair_center_applications: {
        Row: {
          address: string
          business_name: string
          cac_name: string
          cac_number: string
          certifications: string | null
          city: string
          created_at: string
          description: string | null
          email: string
          full_name: string
          id: string
          number_of_staff: number
          operating_hours: string
          phone: string
          specialties: string
          state: string
          status: string
          tax_id: string | null
          updated_at: string
          website: string | null
          years_in_business: number
          zip_code: string
        }
        Insert: {
          address: string
          business_name: string
          cac_name: string
          cac_number: string
          certifications?: string | null
          city: string
          created_at?: string
          description?: string | null
          email: string
          full_name: string
          id?: string
          number_of_staff?: number
          operating_hours: string
          phone: string
          specialties: string
          state: string
          status?: string
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          years_in_business?: number
          zip_code: string
        }
        Update: {
          address?: string
          business_name?: string
          cac_name?: string
          cac_number?: string
          certifications?: string | null
          city?: string
          created_at?: string
          description?: string | null
          email?: string
          full_name?: string
          id?: string
          number_of_staff?: number
          operating_hours?: string
          phone?: string
          specialties?: string
          state?: string
          status?: string
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          years_in_business?: number
          zip_code?: string
        }
        Relationships: []
      }
      repair_center_staff: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_owner: boolean | null
          repair_center_id: number
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_owner?: boolean | null
          repair_center_id: number
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_owner?: boolean | null
          repair_center_id?: number
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_center_staff_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_jobs: {
        Row: {
          app_commission: number | null
          appliance_brand: string | null
          appliance_model: string | null
          appliance_type: string
          completion_date: string | null
          created_at: string
          customer_confirmed: boolean | null
          customer_email: string
          customer_name: string
          customer_phone: string
          estimated_cost: number | null
          final_cost: number | null
          id: string
          issue_description: string
          job_status: Database["public"]["Enums"]["job_status"]
          notes: string | null
          pickup_address: string
          pickup_date: string | null
          repair_center_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_commission?: number | null
          appliance_brand?: string | null
          appliance_model?: string | null
          appliance_type: string
          completion_date?: string | null
          created_at?: string
          customer_confirmed?: boolean | null
          customer_email: string
          customer_name: string
          customer_phone: string
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          issue_description: string
          job_status?: Database["public"]["Enums"]["job_status"]
          notes?: string | null
          pickup_address: string
          pickup_date?: string | null
          repair_center_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_commission?: number | null
          appliance_brand?: string | null
          appliance_model?: string | null
          appliance_type?: string
          completion_date?: string | null
          created_at?: string
          customer_confirmed?: boolean | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          issue_description?: string
          job_status?: Database["public"]["Enums"]["job_status"]
          notes?: string | null
          pickup_address?: string
          pickup_date?: string | null
          repair_center_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_jobs_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key?: string
          value?: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_repair_centers: {
        Args: Record<PropertyKey, never>
        Returns: {
          general_location: string
          hours: string
          id: number
          name: string
          number_of_staff: number
          specialties: string
          years_of_experience: number
        }[]
      }
      get_repair_center_contact_for_customer: {
        Args: { _repair_center_id: number; _user_id: string }
        Returns: {
          address: string
          email: string
          hours: string
          id: number
          name: string
          phone: string
          specialties: string
        }[]
      }
      get_user_repair_center: {
        Args: { _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_repair_center_admin: {
        Args: { _repair_center_id: number; _user_id: string }
        Returns: boolean
      }
      user_is_center_owner: {
        Args: { _center_id: number; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      job_status:
        | "requested"
        | "pickup_scheduled"
        | "picked_up"
        | "in_repair"
        | "repair_completed"
        | "ready_for_return"
        | "returned"
        | "completed"
        | "cancelled"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
      payment_type: "repair_service" | "app_commission"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      job_status: [
        "requested",
        "pickup_scheduled",
        "picked_up",
        "in_repair",
        "repair_completed",
        "ready_for_return",
        "returned",
        "completed",
        "cancelled",
      ],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ],
      payment_type: ["repair_service", "app_commission"],
    },
  },
} as const
