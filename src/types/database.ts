// Hand-written to match supabase/migrations/0001_init.sql exactly.
// Once the real Supabase project exists, this can be regenerated with
// `supabase gen types typescript` and diffed against this file.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = "student" | "admin";
export type ProfileStatus = "active" | "disabled";
export type AttendanceSessionStatus = "draft" | "open" | "closed";
export type NotificationAudience = "all" | "selected";
export type NotificationStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export interface NotificationStats {
  recipients?: number;
  sent?: number;
  failed?: number;
  delivered?: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          student_number: string | null;
          role: ProfileRole;
          status: ProfileStatus;
          must_set_pin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          student_number?: string | null;
          role?: ProfileRole;
          status?: ProfileStatus;
          must_set_pin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      attendance_sessions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          created_by: string | null;
          status: AttendanceSessionStatus;
          code_interval_seconds: number;
          session_secret: string;
          opened_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          created_by?: string | null;
          status?: AttendanceSessionStatus;
          code_interval_seconds?: number;
          opened_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance_sessions"]["Insert"]>;
        Relationships: [];
      };
      attendance_records: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          status: "present";
          marked_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          status?: "present";
          marked_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance_records"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          student_id: string;
          onesignal_subscription_id: string;
          device_type: string | null;
          browser: string | null;
          user_agent: string | null;
          is_active: boolean;
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          onesignal_subscription_id: string;
          device_type?: string | null;
          browser?: string | null;
          user_agent?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          deep_link: string | null;
          created_by: string | null;
          audience: NotificationAudience;
          status: NotificationStatus;
          scheduled_at: string | null;
          sent_at: string | null;
          onesignal_notification_id: string | null;
          stats: NotificationStats;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          deep_link?: string | null;
          created_by?: string | null;
          audience?: NotificationAudience;
          status?: NotificationStatus;
          scheduled_at?: string | null;
          sent_at?: string | null;
          onesignal_notification_id?: string | null;
          stats?: NotificationStats;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      notification_targets: {
        Row: {
          id: string;
          notification_id: string;
          student_id: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_targets"]["Insert"]>;
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          url: string | null;
          file_path: string | null;
          category: string | null;
          sort_order: number;
          is_visible: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          url?: string | null;
          file_path?: string | null;
          category?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resources"]["Insert"]>;
        Relationships: [];
      };
      student_import_log: {
        Row: {
          id: string;
          admin_id: string | null;
          filename: string | null;
          valid_count: number;
          invalid_count: number;
          inserted_count: number;
          updated_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          filename?: string | null;
          valid_count?: number;
          invalid_count?: number;
          inserted_count?: number;
          updated_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_import_log"]["Insert"]>;
        Relationships: [];
      };
      rate_limit_hits: {
        Row: {
          id: number;
          student_id: string;
          scope: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          student_id: string;
          scope: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rate_limit_hits"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      open_attendance_sessions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: AttendanceSessionStatus;
          opened_at: string | null;
          closed_at: string | null;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      complete_pin_setup: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
  };
}
