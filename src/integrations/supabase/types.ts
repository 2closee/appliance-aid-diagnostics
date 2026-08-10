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
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          path: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string
          notes: string | null
          program_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          marked_by: string
          notes?: string | null
          program_id: string
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          notes?: string | null
          program_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      center_referral_rewards: {
        Row: {
          amount: number
          center_id: number
          created_at: string
          id: string
          paid_at: string | null
          referral_id: string
          reward_type: string
          status: string
        }
        Insert: {
          amount?: number
          center_id: number
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_id: string
          reward_type?: string
          status?: string
        }
        Update: {
          amount?: number
          center_id?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_id?: string
          reward_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_referral_rewards_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "center_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      center_referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_business_name: string
          referred_center_id: number | null
          referred_email: string
          referring_center_id: number
          reward_amount: number | null
          reward_paid_at: string | null
          reward_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_business_name: string
          referred_center_id?: number | null
          referred_email: string
          referring_center_id: number
          reward_amount?: number | null
          reward_paid_at?: string | null
          reward_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_business_name?: string
          referred_center_id?: number | null
          referred_email?: string
          referring_center_id?: number
          reward_amount?: number | null
          reward_paid_at?: string | null
          reward_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_referrals_referred_center_id_fkey"
            columns: ["referred_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_referrals_referring_center_id_fkey"
            columns: ["referring_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_courses: {
        Row: {
          certification_id: string
          id: string
          program_id: string
        }
        Insert: {
          certification_id: string
          id?: string
          program_id: string
        }
        Update: {
          certification_id?: string
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_courses_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          provider: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          provider?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          provider?: string | null
        }
        Relationships: []
      }
      cleanup_logs: {
        Row: {
          details: Json | null
          id: string
          ran_at: string
          records_deleted: number
        }
        Insert: {
          details?: Json | null
          id?: string
          ran_at?: string
          records_deleted?: number
        }
        Update: {
          details?: Json | null
          id?: string
          ran_at?: string
          records_deleted?: number
        }
        Relationships: []
      }
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
      course_batches: {
        Row: {
          batch_number: number
          created_at: string
          current_count: number
          id: string
          location_id: string
          max_students: number
          program_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          batch_number?: number
          created_at?: string
          current_count?: number
          id?: string
          location_id: string
          max_students?: number
          program_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          batch_number?: number
          created_at?: string
          current_count?: number
          id?: string
          location_id?: string
          max_students?: number
          program_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "training_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_batches_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          attended_sessions: number | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          id: string
          program_id: string
          started_at: string | null
          status: string
          student_id: string
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          attended_sessions?: number | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          program_id: string
          started_at?: string | null
          status?: string
          student_id: string
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          attended_sessions?: number | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          program_id?: string
          started_at?: string | null
          status?: string
          student_id?: string
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
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
      delivery_condition_photos: {
        Row: {
          created_at: string
          delivery_request_id: string
          id: string
          phase: string
          photo_url: string
          repair_job_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          delivery_request_id: string
          id?: string
          phase: string
          photo_url: string
          repair_job_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          delivery_request_id?: string
          id?: string
          phase?: string
          photo_url?: string
          repair_job_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_condition_photos_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_condition_photos_repair_job_id_fkey"
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
          failover_from: string | null
          id: string
          notes: string | null
          pickup_address: string
          pickup_otp: string | null
          pickup_otp_verified_at: string | null
          provider: string
          provider_name: string | null
          provider_order_id: string | null
          provider_response: Json | null
          repair_job_id: string | null
          return_otp: string | null
          return_otp_verified_at: string | null
          rider_name: string | null
          rider_phone: string | null
          rider_vehicle: string | null
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
          failover_from?: string | null
          id?: string
          notes?: string | null
          pickup_address: string
          pickup_otp?: string | null
          pickup_otp_verified_at?: string | null
          provider?: string
          provider_name?: string | null
          provider_order_id?: string | null
          provider_response?: Json | null
          repair_job_id?: string | null
          return_otp?: string | null
          return_otp_verified_at?: string | null
          rider_name?: string | null
          rider_phone?: string | null
          rider_vehicle?: string | null
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
          failover_from?: string | null
          id?: string
          notes?: string | null
          pickup_address?: string
          pickup_otp?: string | null
          pickup_otp_verified_at?: string | null
          provider?: string
          provider_name?: string | null
          provider_order_id?: string | null
          provider_response?: Json | null
          repair_job_id?: string | null
          return_otp?: string | null
          return_otp_verified_at?: string | null
          rider_name?: string | null
          rider_phone?: string | null
          rider_vehicle?: string | null
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
      enrollment_payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_provider: string | null
          payment_reference: string | null
          registration_id: string
          status: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_reference?: string | null
          registration_id: string
          status?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_reference?: string | null
          registration_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      geolocation_checkins: {
        Row: {
          check_in_time: string | null
          created_at: string | null
          device_info: Json | null
          distance_from_center_meters: number | null
          id: string
          ip_address: string | null
          is_within_geofence: boolean
          latitude: number
          longitude: number
          notes: string | null
          session_id: string
          student_id: string
          user_agent: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string | null
          device_info?: Json | null
          distance_from_center_meters?: number | null
          id?: string
          ip_address?: string | null
          is_within_geofence?: boolean
          latitude: number
          longitude: number
          notes?: string | null
          session_id: string
          student_id: string
          user_agent?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          check_in_time?: string | null
          created_at?: string | null
          device_info?: Json | null
          distance_from_center_meters?: number | null
          id?: string
          ip_address?: string | null
          is_within_geofence?: boolean
          latitude?: number
          longitude?: number
          notes?: string | null
          session_id?: string
          student_id?: string
          user_agent?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geolocation_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geolocation_checkins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
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
      location_programs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          program_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          program_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_programs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "training_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
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
      logistics_service_zones: {
        Row: {
          active: boolean
          center_lat: number | null
          center_lng: number | null
          city: string
          created_at: string
          id: string
          polygon_geojson: Json | null
          provider_priority: string[]
          radius_km: number | null
          updated_at: string
          zone_name: string
        }
        Insert: {
          active?: boolean
          center_lat?: number | null
          center_lng?: number | null
          city: string
          created_at?: string
          id?: string
          polygon_geojson?: Json | null
          provider_priority?: string[]
          radius_km?: number | null
          updated_at?: string
          zone_name: string
        }
        Update: {
          active?: boolean
          center_lat?: number | null
          center_lng?: number | null
          city?: string
          created_at?: string
          id?: string
          polygon_geojson?: Json | null
          provider_priority?: string[]
          radius_km?: number | null
          updated_at?: string
          zone_name?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          scheduled_for: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      overpass_pricing: {
        Row: {
          active: boolean
          after_hours_end: number
          after_hours_start: number
          after_hours_surcharge: number
          base_fare: number
          bulky_surcharge: number
          city: string
          commission_rate_company: number
          commission_rate_partner: number
          created_at: string
          currency: string
          id: string
          max_assignment_attempts: number
          max_radius_km: number
          min_fare: number
          offer_timeout_seconds: number
          per_km: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          after_hours_end?: number
          after_hours_start?: number
          after_hours_surcharge?: number
          base_fare?: number
          bulky_surcharge?: number
          city: string
          commission_rate_company?: number
          commission_rate_partner?: number
          created_at?: string
          currency?: string
          id?: string
          max_assignment_attempts?: number
          max_radius_km?: number
          min_fare?: number
          offer_timeout_seconds?: number
          per_km?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          after_hours_end?: number
          after_hours_start?: number
          after_hours_surcharge?: number
          base_fare?: number
          bulky_surcharge?: number
          city?: string
          commission_rate_company?: number
          commission_rate_partner?: number
          created_at?: string
          currency?: string
          id?: string
          max_assignment_attempts?: number
          max_radius_km?: number
          min_fare?: number
          offer_timeout_seconds?: number
          per_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      overpass_trips: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          assignment_attempts: number
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number | null
          commission_rate: number | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_name: string | null
          customer_phone: string | null
          delivery_request_id: string | null
          distance_km: number | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_otp: string | null
          dropoff_otp_verified_at: string | null
          fee: number | null
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_otp: string | null
          pickup_otp_verified_at: string | null
          repair_job_id: string
          rider_earning: number | null
          rider_id: string | null
          status: string
          trip_type: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assignment_attempts?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_request_id?: string | null
          distance_km?: number | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_otp?: string | null
          dropoff_otp_verified_at?: string | null
          fee?: number | null
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_otp?: string | null
          pickup_otp_verified_at?: string | null
          repair_job_id: string
          rider_earning?: number | null
          rider_id?: string | null
          status?: string
          trip_type?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assignment_attempts?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_request_id?: string | null
          distance_km?: number | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_otp?: string | null
          dropoff_otp_verified_at?: string | null
          fee?: number | null
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_otp?: string | null
          pickup_otp_verified_at?: string | null
          repair_job_id?: string
          rider_earning?: number | null
          rider_id?: string | null
          status?: string
          trip_type?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overpass_trips_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overpass_trips_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overpass_trips_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overpass_trips_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "logistics_service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_agreement_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string
          accepted_full_name: string
          agreement_version: string
          created_at: string
          id: string
          ip_address: string | null
          repair_center_id: number
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          accepted_full_name: string
          agreement_version: string
          created_at?: string
          id?: string
          ip_address?: string | null
          repair_center_id: number
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          accepted_full_name?: string
          agreement_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          repair_center_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_agreement_acceptances_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
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
      phone_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_suspended: boolean
          phone: string | null
          phone_verified_at: string | null
          specialization: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_suspended?: boolean
          phone?: string | null
          phone_verified_at?: string | null
          specialization?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          phone_verified_at?: string | null
          specialization?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      program_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          category: string
          created_at: string | null
          curriculum: Json | null
          description: string | null
          duration: string
          duration_unit: string
          id: string
          image_url: string | null
          is_active: boolean | null
          max_students: number | null
          name: string
          program_code: number | null
          registration_fee: number | null
          requirements: string[] | null
          start_date: string | null
          tuition_fee: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          curriculum?: Json | null
          description?: string | null
          duration: string
          duration_unit?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_students?: number | null
          name: string
          program_code?: number | null
          registration_fee?: number | null
          requirements?: string[] | null
          start_date?: string | null
          tuition_fee?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          curriculum?: Json | null
          description?: string | null
          duration?: string
          duration_unit?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_students?: number | null
          name?: string
          program_code?: number | null
          registration_fee?: number | null
          requirements?: string[] | null
          start_date?: string | null
          tuition_fee?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      protection_claims: {
        Row: {
          admin_notes: string | null
          center_responded_at: string | null
          center_response_notes: string | null
          created_at: string
          description: string | null
          evidence_urls: string[] | null
          id: string
          logistics_cost_paid: number
          pickup_delivery_id: string | null
          plan_id: string
          repair_center_id: number | null
          repair_job_id: string
          reported_fault: string
          resolved_at: string | null
          return_delivery_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          center_responded_at?: string | null
          center_response_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          logistics_cost_paid?: number
          pickup_delivery_id?: string | null
          plan_id: string
          repair_center_id?: number | null
          repair_job_id: string
          reported_fault: string
          resolved_at?: string | null
          return_delivery_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          center_responded_at?: string | null
          center_response_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          logistics_cost_paid?: number
          pickup_delivery_id?: string | null
          plan_id?: string
          repair_center_id?: number | null
          repair_job_id?: string
          reported_fault?: string
          resolved_at?: string | null
          return_delivery_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protection_claims_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "repair_protection_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protection_claims_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protection_claims_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      protection_ledger: {
        Row: {
          amount: number
          claim_id: string | null
          created_at: string
          entry_type: string
          id: string
          notes: string | null
          period: string | null
          plan_id: string | null
        }
        Insert: {
          amount: number
          claim_id?: string | null
          created_at?: string
          entry_type: string
          id?: string
          notes?: string | null
          period?: string | null
          plan_id?: string | null
        }
        Update: {
          amount?: number
          claim_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          notes?: string | null
          period?: string | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protection_ledger_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "protection_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protection_ledger_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "repair_protection_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      protection_pricing_tiers: {
        Row: {
          created_at: string
          fee_cap: number | null
          flat_fee: number | null
          id: string
          is_active: boolean
          max_repair_cost: number | null
          min_repair_cost: number
          percentage_rate: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_cap?: number | null
          flat_fee?: number | null
          id?: string
          is_active?: boolean
          max_repair_cost?: number | null
          min_repair_cost: number
          percentage_rate?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_cap?: number | null
          flat_fee?: number | null
          id?: string
          is_active?: boolean
          max_repair_cost?: number | null
          min_repair_cost?: number
          percentage_rate?: number | null
          sort_order?: number
          updated_at?: string
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
          referral_code: string | null
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
          referral_code?: string | null
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
          referral_code?: string | null
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
          logistics_category: string | null
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
          logistics_category?: string | null
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
          logistics_category?: string | null
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
      repair_protection_plans: {
        Row: {
          accepted_terms_version: string
          claims_used: number
          created_at: string
          device_category: string
          expires_at: string
          fee_amount: number
          id: string
          max_claims: number
          payment_reference: string | null
          repair_center_id: number | null
          repair_cost_at_purchase: number
          repair_job_id: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_terms_version?: string
          claims_used?: number
          created_at?: string
          device_category: string
          expires_at?: string
          fee_amount: number
          id?: string
          max_claims?: number
          payment_reference?: string | null
          repair_center_id?: number | null
          repair_cost_at_purchase: number
          repair_job_id: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_terms_version?: string
          claims_used?: number
          created_at?: string
          device_category?: string
          expires_at?: string
          fee_amount?: number
          id?: string
          max_claims?: number
          payment_reference?: string | null
          repair_center_id?: number | null
          repair_cost_at_purchase?: number
          repair_job_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_protection_plans_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "Repair Center"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_protection_plans_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: true
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_warranties: {
        Row: {
          claim_count: number
          covered_issues: string[] | null
          created_at: string
          id: string
          is_active: boolean
          max_claims: number
          repair_job_id: string
          terms_text: string | null
          updated_at: string
          warranty_end_date: string
          warranty_period_days: number
          warranty_start_date: string
          warranty_type: Database["public"]["Enums"]["warranty_type"]
        }
        Insert: {
          claim_count?: number
          covered_issues?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_claims?: number
          repair_job_id: string
          terms_text?: string | null
          updated_at?: string
          warranty_end_date: string
          warranty_period_days?: number
          warranty_start_date: string
          warranty_type?: Database["public"]["Enums"]["warranty_type"]
        }
        Update: {
          claim_count?: number
          covered_issues?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_claims?: number
          repair_job_id?: string
          terms_text?: string | null
          updated_at?: string
          warranty_end_date?: string
          warranty_period_days?: number
          warranty_start_date?: string
          warranty_type?: Database["public"]["Enums"]["warranty_type"]
        }
        Relationships: [
          {
            foreignKeyName: "repair_warranties_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: true
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          entry_type: string
          id: string
          rider_id: string
          settled: boolean
          settled_at: string | null
          settled_by: string | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type: string
          id?: string
          rider_id: string
          settled?: boolean
          settled_at?: string | null
          settled_by?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type?: string
          id?: string
          rider_id?: string
          settled?: boolean
          settled_at?: string | null
          settled_by?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_ledger_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_ledger_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "overpass_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_locations: {
        Row: {
          accuracy_m: number | null
          created_at: string
          id: string
          lat: number
          lng: number
          recorded_at: string
          rider_id: string
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          rider_id: string
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_locations_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_ratings: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string
          delivery_request_id: string
          id: string
          professionalism: number | null
          provider_name: string | null
          punctuality: number | null
          rating: number
          repair_job_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by: string
          delivery_request_id: string
          id?: string
          professionalism?: number | null
          provider_name?: string | null
          punctuality?: number | null
          rating: number
          repair_job_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string
          delivery_request_id?: string
          id?: string
          professionalism?: number | null
          provider_name?: string | null
          punctuality?: number | null
          rating?: number
          repair_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_ratings_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_ratings_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          average_rating: number | null
          bike_make: string | null
          bike_photo_url: string | null
          created_at: string
          email: string | null
          fleet_type: string
          full_name: string
          guarantor_name: string | null
          guarantor_phone: string | null
          home_zone_id: string | null
          id: string
          id_doc_url: string | null
          is_available: boolean
          is_online: boolean
          kyc_notes: string | null
          kyc_status: string
          last_lat: number | null
          last_lng: number | null
          last_ping_at: string | null
          phone: string
          phone_verified_at: string | null
          plate_number: string | null
          selfie_url: string | null
          total_trips: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          average_rating?: number | null
          bike_make?: string | null
          bike_photo_url?: string | null
          created_at?: string
          email?: string | null
          fleet_type?: string
          full_name: string
          guarantor_name?: string | null
          guarantor_phone?: string | null
          home_zone_id?: string | null
          id?: string
          id_doc_url?: string | null
          is_available?: boolean
          is_online?: boolean
          kyc_notes?: string | null
          kyc_status?: string
          last_lat?: number | null
          last_lng?: number | null
          last_ping_at?: string | null
          phone: string
          phone_verified_at?: string | null
          plate_number?: string | null
          selfie_url?: string | null
          total_trips?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          average_rating?: number | null
          bike_make?: string | null
          bike_photo_url?: string | null
          created_at?: string
          email?: string | null
          fleet_type?: string
          full_name?: string
          guarantor_name?: string | null
          guarantor_phone?: string | null
          home_zone_id?: string | null
          id?: string
          id_doc_url?: string | null
          is_available?: boolean
          is_online?: boolean
          kyc_notes?: string | null
          kyc_status?: string
          last_lat?: number | null
          last_lng?: number | null
          last_ping_at?: string | null
          phone?: string
          phone_verified_at?: string | null
          plate_number?: string | null
          selfie_url?: string | null
          total_trips?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riders_home_zone_id_fkey"
            columns: ["home_zone_id"]
            isOneToOne: false
            referencedRelation: "logistics_service_zones"
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
      session_enrollments: {
        Row: {
          enrolled_at: string | null
          id: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          enrolled_at?: string | null
          id?: string
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          enrolled_at?: string | null
          id?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key?: string
          value?: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      student_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_reference: string | null
          payment_type: string
          program_id: string
          recorded_by: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          payment_type?: string
          program_id: string
          recorded_by?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          payment_type?: string
          program_id?: string
          recorded_by?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_registrations: {
        Row: {
          account_created: boolean
          address: string | null
          alternative_phone: string | null
          batch_id: string | null
          can_attend_weekly: string | null
          city: string | null
          country: string | null
          created_at: string | null
          current_income: string | null
          date_of_birth: string | null
          education_level: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          guarantor_address: string | null
          guarantor_email: string | null
          guarantor_full_name: string | null
          guarantor_phone: string | null
          how_heard_about_us: string | null
          id: string
          is_pwd: string | null
          last_name: string
          lga: string | null
          matriculation_number: string | null
          middle_name: string | null
          notes: string | null
          payment_plan: string
          payment_status: string
          phone: string
          preferred_location_id: string | null
          previous_experience: string | null
          program_id: string | null
          projected_batch_number: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string | null
          terms_accepted: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_created?: boolean
          address?: string | null
          alternative_phone?: string | null
          batch_id?: string | null
          can_attend_weekly?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_income?: string | null
          date_of_birth?: string | null
          education_level?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          guarantor_address?: string | null
          guarantor_email?: string | null
          guarantor_full_name?: string | null
          guarantor_phone?: string | null
          how_heard_about_us?: string | null
          id?: string
          is_pwd?: string | null
          last_name: string
          lga?: string | null
          matriculation_number?: string | null
          middle_name?: string | null
          notes?: string | null
          payment_plan?: string
          payment_status?: string
          phone: string
          preferred_location_id?: string | null
          previous_experience?: string | null
          program_id?: string | null
          projected_batch_number?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_created?: boolean
          address?: string | null
          alternative_phone?: string | null
          batch_id?: string | null
          can_attend_weekly?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_income?: string | null
          date_of_birth?: string | null
          education_level?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          guarantor_address?: string | null
          guarantor_email?: string | null
          guarantor_full_name?: string | null
          guarantor_phone?: string | null
          how_heard_about_us?: string | null
          id?: string
          is_pwd?: string | null
          last_name?: string
          lga?: string | null
          matriculation_number?: string | null
          middle_name?: string | null
          notes?: string | null
          payment_plan?: string
          payment_status?: string
          phone?: string
          preferred_location_id?: string | null
          previous_experience?: string | null
          program_id?: string | null
          projected_batch_number?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_registrations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "course_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_registrations_preferred_location_id_fkey"
            columns: ["preferred_location_id"]
            isOneToOne: false
            referencedRelation: "training_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_staff_response: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_staff_response?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_staff_response?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          experience_years: number | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_name: string
          phone: string
          qualification: string | null
          specialization: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          experience_years?: number | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          phone: string
          qualification?: string | null
          specialization: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          experience_years?: number | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string
          qualification?: string | null
          specialization?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      training_locations: {
        Row: {
          address: string
          city: string
          code: string
          created_at: string | null
          email: string | null
          geofence_radius_meters: number
          id: string
          is_active: boolean | null
          latitude: number
          location_code: number | null
          longitude: number
          name: string
          phone: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          code: string
          created_at?: string | null
          email?: string | null
          geofence_radius_meters?: number
          id?: string
          is_active?: boolean | null
          latitude: number
          location_code?: number | null
          longitude: number
          name: string
          phone?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          code?: string
          created_at?: string | null
          email?: string | null
          geofence_radius_meters?: number
          id?: string
          is_active?: boolean | null
          latitude?: number
          location_code?: number | null
          longitude?: number
          name?: string
          phone?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          cancellation_reason: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          instructor_id: string | null
          is_cancelled: boolean | null
          location_id: string
          max_attendees: number
          program_id: string
          session_date: string
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          instructor_id?: string | null
          is_cancelled?: boolean | null
          location_id: string
          max_attendees?: number
          program_id: string
          session_date: string
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_cancelled?: boolean | null
          location_id?: string
          max_attendees?: number
          program_id?: string
          session_date?: string
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "training_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_offers: {
        Row: {
          attempt_number: number
          created_at: string
          distance_to_pickup_km: number | null
          expires_at: string
          id: string
          offered_at: string
          responded_at: string | null
          rider_id: string
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          distance_to_pickup_km?: number | null
          expires_at?: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          rider_id: string
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          distance_to_pickup_km?: number | null
          expires_at?: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          rider_id?: string
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_offers_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_offers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "overpass_trips"
            referencedColumns: ["id"]
          },
        ]
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
      warranty_claims: {
        Row: {
          claim_description: string | null
          claim_reason: string
          claim_status: string
          created_at: string
          id: string
          repair_job_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
          warranty_id: string
        }
        Insert: {
          claim_description?: string | null
          claim_reason: string
          claim_status?: string
          created_at?: string
          id?: string
          repair_job_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          warranty_id: string
        }
        Update: {
          claim_description?: string | null
          claim_reason?: string
          claim_status?: string
          created_at?: string
          id?: string
          repair_job_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "repair_warranties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_matriculation_number: {
        Args: {
          p_batch_id: string
          p_batch_number: number
          p_location_id: string
          p_program_id: string
        }
        Returns: string
      }
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
      get_rider_id: { Args: { _user_id: string }; Returns: string }
      get_settlement_period: { Args: { date_input: string }; Returns: string }
      get_user_repair_center: { Args: { _user_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      is_staff_at_center: {
        Args: { _center_id: number; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      toggle_user_suspension: {
        Args: { suspend: boolean; target_user_id: string }
        Returns: undefined
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
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "teacher"
        | "student"
        | "super_admin"
        | "accountant"
        | "rider"
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
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      warranty_type: "standard" | "extended" | "premium"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "teacher",
        "student",
        "super_admin",
        "accountant",
        "rider",
      ],
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
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      warranty_type: ["standard", "extended", "premium"],
    },
  },
} as const
