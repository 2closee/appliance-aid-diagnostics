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
          email: string | null
          hours: string | null
          id: number
          name: string | null
          phone: string | null
          specialties: string | null
        }
        Insert: {
          address?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          specialties?: string | null
        }
        Update: {
          address?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          specialties?: string | null
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
