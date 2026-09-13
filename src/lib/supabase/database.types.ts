/* TypeScript Database Types for Supabase */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          nickname: string;
          profile_image: string | null;
          total_bonus_points: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          nickname: string;
          profile_image?: string | null;
          total_bonus_points?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          nickname?: string;
          profile_image?: string | null;
          total_bonus_points?: number;
          created_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          invite_code: string;
          weekly_target_count: number;
          penalty_amount: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          invite_code: string;
          weekly_target_count?: number;
          penalty_amount?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          invite_code?: string;
          weekly_target_count?: number;
          penalty_amount?: number;
          created_by?: string;
          created_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: "ADMIN" | "MEMBER";
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: "ADMIN" | "MEMBER";
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: "ADMIN" | "MEMBER";
          joined_at?: string;
        };
      };
      workout_records: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          record_date: string;
          image_url: string | null;
          storage_path: string | null;
          workout_type: string;
          memo: string | null;
          photo_expires_at: string | null;
          is_photo_deleted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          record_date?: string;
          image_url?: string | null;
          storage_path?: string | null;
          workout_type?: string;
          memo?: string | null;
          photo_expires_at?: string | null;
          is_photo_deleted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          record_date?: string;
          image_url?: string | null;
          storage_path?: string | null;
          workout_type?: string;
          memo?: string | null;
          photo_expires_at?: string | null;
          is_photo_deleted?: boolean;
          created_at?: string;
        };
      };
      weekly_settlements: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          year_week: string;
          completed_count: number;
          target_count: number;
          penalty_amount: number;
          bonus_points_earned: number;
          is_penalty_paid: boolean;
          settled_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          year_week: string;
          completed_count?: number;
          target_count?: number;
          penalty_amount?: number;
          bonus_points_earned?: number;
          is_penalty_paid?: boolean;
          settled_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          year_week?: string;
          completed_count?: number;
          target_count?: number;
          penalty_amount?: number;
          bonus_points_earned?: number;
          is_penalty_paid?: boolean;
          settled_at?: string;
        };
      };
      point_histories: {
        Row: {
          id: string;
          user_id: string;
          group_id: string | null;
          points_change: number;
          reason: string;
          year_week: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id?: string | null;
          points_change: number;
          reason: string;
          year_week?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          group_id?: string | null;
          points_change?: number;
          reason?: string;
          year_week?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
