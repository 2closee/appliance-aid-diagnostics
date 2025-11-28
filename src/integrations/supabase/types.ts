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
      completion_feedback_notifications: {
        Row: {
          id: string
          notification_data: Json | null
          notification_type: string
          recipient_id: string | null
          repair_job_id: string
          sent_at: string | null
          sent_to: string
        }
        Insert: {
          id?: string
          notification_data?: Json | null
          notification_type: string
          recipient_id?: string | null
          repair_job_id: string
          sent_at?: string | null
          sent_to: string
        }
        Update: {
          id?: string
          notification_data?: Json | null
          notification_type?: string
          recipient_id?: string | null
          repair_job_id?: string
          sent_at?: string | null
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "completion_feedback_notifications_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          diagnostic_conversation_id: string | null
          diagnostic_summary: string | null
          id: string
          repair_center_id: number
          repair_job_id: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          diagnostic_conversation_id?: string | null
          diagnostic_summary?: string | null
          id?: string
          repair_center_id: number
          repair_job_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          diagnostic_conversation_id?: string | null
          diagnostic_summary?: string | null
          id?: string
          repair_center_id?: number
          repair_job_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_diagnostic_conversation_id_fkey"
            columns: ["diagnostic_conversation_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_conversations"
            referencedColumns: ["id"]
          },
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
      delivery_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          delivery_cost: number
          delivery_request_id: string
          id: string
          notes: string | null
          repair_job_id: string | null
          settlement_date: string | null
          settlement_reference: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          commission_amount: number
          commission_rate?: number
          created_at?: string | null
          delivery_cost: number
          delivery_request_id: string
          id?: string
          notes?: string | null
          repair_job_id?: string | null
          settlement_date?: string | null
          settlement_reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          delivery_cost?: number
          delivery_request_id?: string
          id?: string
          notes?: string | null
          repair_job_id?: string | null
          settlement_date?: string | null
          settlement_reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_commissions_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: true
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_commissions_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_requests: {
        Row: {
          actual_cost: number | null
          actual_delivery_time: string | null
          actual_pickup_time: string | null
          app_delivery_commission: number | null
          cash_payment_confirmed_at: string | null
          cash_payment_confirmed_by: string | null
          cash_payment_status: string | null
          created_at: string | null
          currency: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_status: string | null
          delivery_type: string
          driver_name: string | null
          driver_phone: string | null
          estimated_cost: number
          estimated_delivery_time: string | null
          id: string
          notes: string | null
          pickup_address: string
          provider: string
          provider_order_id: string | null
          provider_response: Json | null
          repair_job_id: string | null
          scheduled_pickup_time: string | null
          tracking_url: string | null
          updated_at: string | null
          vehicle_details: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          app_delivery_commission?: number | null
          cash_payment_confirmed_at?: string | null
          cash_payment_confirmed_by?: string | null
          cash_payment_status?: string | null
          created_at?: string | null
          currency?: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_status?: string | null
          delivery_type: string
          driver_name?: string | null
          driver_phone?: string | null
          estimated_cost?: number
          estimated_delivery_time?: string | null
          id?: string
          notes?: string | null
          pickup_address: string
          provider?: string
          provider_order_id?: string | null
          provider_response?: Json | null
          repair_job_id?: string | null
          scheduled_pickup_time?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          vehicle_details?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          app_delivery_commission?: number | null
          cash_payment_confirmed_at?: string | null
          cash_payment_confirmed_by?: string | null
          cash_payment_status?: string | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string
          delivery_status?: string | null
          delivery_type?: string
          driver_name?: string | null
          driver_phone?: string | null
          estimated_cost?: number
          estimated_delivery_time?: string | null
          id?: string
          notes?: string | null
          pickup_address?: string
          provider?: string
          provider_order_id?: string | null
          provider_response?: Json | null
          repair_job_id?: string | null
          scheduled_pickup_time?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          vehicle_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_history: {
        Row: {
          changed_at: string | null
          delivery_request_id: string | null
          id: string
          location: Json | null
          notes: string | null
          status: string
        }
        Insert: {
          changed_at?: string | null
          delivery_request_id?: string | null
          id?: string
          location?: Json | null
          notes?: string | null
          status: string
        }
        Update: {
          changed_at?: string | null
          delivery_request_id?: string | null
          id?: string
          location?: Json | null
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_conversations: {
        Row: {
          appliance_brand: string | null
          appliance_model: string | null
          appliance_type: string
          confidence_score: number | null
          created_at: string | null
          final_diagnosis: string | null
          id: string
          initial_diagnosis: string
          language: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appliance_brand?: string | null
          appliance_model?: string | null
          appliance_type: string
          confidence_score?: number | null
          created_at?: string | null
          final_diagnosis?: string | null
          id?: string
          initial_diagnosis: string
          language?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appliance_brand?: string | null
          appliance_model?: string | null
          appliance_type?: string
          confidence_score?: number | null
          created_at?: string | null
          final_diagnosis?: string | null
          id?: string
          initial_diagnosis?: string
          language?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      diagnostic_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_reports: {
        Row: {
          conversation_id: string
          created_at: string | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          id: string
          recommended_parts: Json | null
          repair_urgency: string | null
          report_data: Json
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          recommended_parts?: Json | null
          repair_urgency?: string | null
          report_data: Json
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          recommended_parts?: Json | null
          repair_urgency?: string | null
          report_data?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          repair_job_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          repair_job_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          repair_job_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_repair_job_id_fkey"
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
      logistics_provider_settings: {
        Row: {
          auto_assign: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          preferred_vehicle_type: string | null
          provider: string
          repair_center_id: number | null
          updated_at: string | null
        }
        Insert: {
          auto_assign?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          preferred_vehicle_type?: string | null
          provider: string
          repair_center_id?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_assign?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          preferred_vehicle_type?: string | null
          provider?: string
          repair_center_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_provider_settings_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
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
          is_auto_reply: boolean | null
          is_read: boolean
          priority: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_auto_reply?: boolean | null
          is_read?: boolean
          priority?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_auto_reply?: boolean | null
          is_read?: boolean
          priority?: string | null
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
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_transaction_id: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          repair_job_id: string
          stripe_fee: number | null
          updated_at: string
          webhook_received_at: string | null
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
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_transaction_id?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          repair_job_id: string
          stripe_fee?: number | null
          updated_at?: string
          webhook_received_at?: string | null
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
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_transaction_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          repair_job_id?: string
          stripe_fee?: number | null
          updated_at?: string
          webhook_received_at?: string | null
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
      payout_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      "Repair Center": {
        Row: {
          address: string | null
          address_updated_at: string | null
          average_rating: number | null
          cac_name: string | null
          cac_number: string | null
          cover_image_updated_at: string | null
          cover_image_url: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          hours: string | null
          id: number
          logo_updated_at: string | null
          logo_url: string | null
          name: string | null
          number_of_staff: number | null
          phone: string | null
          specialties: string | null
          status: string
          tax_id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          total_reviews: number | null
          years_of_experience: number | null
        }
        Insert: {
          address?: string | null
          address_updated_at?: string | null
          average_rating?: number | null
          cac_name?: string | null
          cac_number?: string | null
          cover_image_updated_at?: string | null
          cover_image_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          logo_updated_at?: string | null
          logo_url?: string | null
          name?: string | null
          number_of_staff?: number | null
          phone?: string | null
          specialties?: string | null
          status?: string
          tax_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          total_reviews?: number | null
          years_of_experience?: number | null
        }
        Update: {
          address?: string | null
          address_updated_at?: string | null
          average_rating?: number | null
          cac_name?: string | null
          cac_number?: string | null
          cover_image_updated_at?: string | null
          cover_image_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          logo_updated_at?: string | null
          logo_url?: string | null
          name?: string | null
          number_of_staff?: number | null
          phone?: string | null
          specialties?: string | null
          status?: string
          tax_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          total_reviews?: number | null
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
      repair_center_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          is_active: boolean
          last_updated_at: string
          repair_center_id: number
          updated_at: string
          whitelisted_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_updated_at?: string
          repair_center_id: number
          updated_at?: string
          whitelisted_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_updated_at?: string
          repair_center_id?: number
          updated_at?: string
          whitelisted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_center_bank_accounts_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_center_payouts: {
        Row: {
          commission_amount: number
          created_at: string
          currency: string
          dispute_notes: string | null
          dispute_reason: string | null
          dispute_status: Database["public"]["Enums"]["dispute_status"] | null
          disputed_at: string | null
          disputed_by: string | null
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          payment_id: string
          payout_date: string | null
          payout_method: string | null
          payout_reference: string | null
          payout_status: string
          repair_center_id: number
          repair_job_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          settlement_period: string | null
          updated_at: string
        }
        Insert: {
          commission_amount: number
          created_at?: string
          currency?: string
          dispute_notes?: string | null
          dispute_reason?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_status"] | null
          disputed_at?: string | null
          disputed_by?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          notes?: string | null
          payment_id: string
          payout_date?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          payout_status?: string
          repair_center_id: number
          repair_job_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          settlement_period?: string | null
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          currency?: string
          dispute_notes?: string | null
          dispute_reason?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_status"] | null
          disputed_at?: string | null
          disputed_by?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payment_id?: string
          payout_date?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          payout_status?: string
          repair_center_id?: number
          repair_job_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          settlement_period?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_center_payouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_center_payouts_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_center_payouts_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_center_recommendations: {
        Row: {
          center_name: string
          contact_info: string | null
          created_at: string
          id: string
          location: string
          notes: string | null
          recommended_by_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          center_name: string
          contact_info?: string | null
          created_at?: string
          id?: string
          location: string
          notes?: string | null
          recommended_by_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          center_name?: string
          contact_info?: string | null
          created_at?: string
          id?: string
          location?: string
          notes?: string | null
          recommended_by_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      repair_center_reviews: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          is_verified: boolean | null
          rating: number
          repair_center_id: number
          repair_job_id: string
          response_date: string | null
          response_text: string | null
          review_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          is_verified?: boolean | null
          rating: number
          repair_center_id: number
          repair_job_id: string
          response_date?: string | null
          response_text?: string | null
          review_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          is_verified?: boolean | null
          rating?: number
          repair_center_id?: number
          repair_job_id?: string
          response_date?: string | null
          response_text?: string | null
          review_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_center_reviews_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_center_reviews_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_center_settings: {
        Row: {
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          business_hours: Json | null
          created_at: string | null
          id: string
          is_online: boolean | null
          last_activity_at: string | null
          repair_center_id: number
          updated_at: string | null
        }
        Insert: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          last_activity_at?: string | null
          repair_center_id: number
          updated_at?: string | null
        }
        Update: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          last_activity_at?: string | null
          repair_center_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_center_settings_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: true
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
        ]
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
          ai_confidence_score: number | null
          ai_diagnosis_summary: string | null
          ai_estimated_cost_max: number | null
          ai_estimated_cost_min: number | null
          app_commission: number | null
          appliance_brand: string | null
          appliance_model: string | null
          appliance_type: string
          completion_date: string | null
          cost_adjustment_approved: boolean | null
          cost_adjustment_reason: string | null
          created_at: string
          customer_confirmed: boolean | null
          customer_email: string
          customer_name: string
          customer_phone: string
          deposit_amount: number | null
          deposit_required: boolean | null
          device_returned_confirmed: boolean | null
          device_returned_confirmed_at: string | null
          diagnostic_attachments: Json | null
          diagnostic_conversation_id: string | null
          estimated_cost: number | null
          final_cost: number | null
          id: string
          issue_description: string
          job_status: Database["public"]["Enums"]["job_status"]
          notes: string | null
          payment_deadline: string | null
          pickup_address: string
          pickup_date: string | null
          quote_accepted_at: string | null
          quote_expires_at: string | null
          quote_notes: string | null
          quote_provided_at: string | null
          quote_response_deadline: string | null
          quoted_cost: number | null
          repair_center_id: number
          repair_satisfaction_confirmed: boolean | null
          repair_satisfaction_confirmed_at: string | null
          satisfaction_feedback: string | null
          satisfaction_rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_diagnosis_summary?: string | null
          ai_estimated_cost_max?: number | null
          ai_estimated_cost_min?: number | null
          app_commission?: number | null
          appliance_brand?: string | null
          appliance_model?: string | null
          appliance_type: string
          completion_date?: string | null
          cost_adjustment_approved?: boolean | null
          cost_adjustment_reason?: string | null
          created_at?: string
          customer_confirmed?: boolean | null
          customer_email: string
          customer_name: string
          customer_phone: string
          deposit_amount?: number | null
          deposit_required?: boolean | null
          device_returned_confirmed?: boolean | null
          device_returned_confirmed_at?: string | null
          diagnostic_attachments?: Json | null
          diagnostic_conversation_id?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          issue_description: string
          job_status?: Database["public"]["Enums"]["job_status"]
          notes?: string | null
          payment_deadline?: string | null
          pickup_address: string
          pickup_date?: string | null
          quote_accepted_at?: string | null
          quote_expires_at?: string | null
          quote_notes?: string | null
          quote_provided_at?: string | null
          quote_response_deadline?: string | null
          quoted_cost?: number | null
          repair_center_id: number
          repair_satisfaction_confirmed?: boolean | null
          repair_satisfaction_confirmed_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence_score?: number | null
          ai_diagnosis_summary?: string | null
          ai_estimated_cost_max?: number | null
          ai_estimated_cost_min?: number | null
          app_commission?: number | null
          appliance_brand?: string | null
          appliance_model?: string | null
          appliance_type?: string
          completion_date?: string | null
          cost_adjustment_approved?: boolean | null
          cost_adjustment_reason?: string | null
          created_at?: string
          customer_confirmed?: boolean | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          deposit_amount?: number | null
          deposit_required?: boolean | null
          device_returned_confirmed?: boolean | null
          device_returned_confirmed_at?: string | null
          diagnostic_attachments?: Json | null
          diagnostic_conversation_id?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          issue_description?: string
          job_status?: Database["public"]["Enums"]["job_status"]
          notes?: string | null
          payment_deadline?: string | null
          pickup_address?: string
          pickup_date?: string | null
          quote_accepted_at?: string | null
          quote_expires_at?: string | null
          quote_notes?: string | null
          quote_provided_at?: string | null
          quote_response_deadline?: string | null
          quoted_cost?: number | null
          repair_center_id?: number
          repair_satisfaction_confirmed?: boolean | null
          repair_satisfaction_confirmed_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_jobs_diagnostic_conversation_id_fkey"
            columns: ["diagnostic_conversation_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string | null
          state: string
          updated_at: string | null
          user_id: string
          zip_code: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          state: string
          updated_at?: string | null
          user_id: string
          zip_code: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          state?: string
          updated_at?: string | null
          user_id?: string
          zip_code?: string
        }
        Relationships: []
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
        Args: never
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
      get_repair_center_address: {
        Args: { _center_id: number }
        Returns: string
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
      get_settlement_period: { Args: { date_input: string }; Returns: string }
      get_user_repair_center: { Args: { _user_id: string }; Returns: number }
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
      is_staff_at_center: {
        Args: { _center_id: number; _user_id: string }
        Returns: boolean
      }
      update_repair_center_branding: {
        Args: { _center_id: number; _cover_url?: string; _logo_url?: string }
        Returns: undefined
      }
      user_is_center_owner: {
        Args: { _center_id: number; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      dispute_status: "open" | "under_review" | "resolved" | "rejected"
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
        | "quote_requested"
        | "quote_pending_review"
        | "quote_accepted"
        | "quote_rejected"
        | "quote_negotiating"
        | "quote_expired"
        | "cost_adjustment_pending"
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
      dispute_status: ["open", "under_review", "resolved", "rejected"],
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
        "quote_requested",
        "quote_pending_review",
        "quote_accepted",
        "quote_rejected",
        "quote_negotiating",
        "quote_expired",
        "cost_adjustment_pending",
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
