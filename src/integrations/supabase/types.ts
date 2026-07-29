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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_attempts: {
        Row: {
          answer: string | null
          case_content: Json
          case_title: string
          case_type: string | null
          category: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_t"]
          duration_minutes: number
          feedback: Json | null
          id: string
          interview_type: string | null
          notes: string | null
          score: number | null
          status: Database["public"]["Enums"]["attempt_status_t"]
          time_taken_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          case_content?: Json
          case_title: string
          case_type?: string | null
          category: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_t"]
          duration_minutes?: number
          feedback?: Json | null
          id?: string
          interview_type?: string | null
          notes?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["attempt_status_t"]
          time_taken_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          case_content?: Json
          case_title?: string
          case_type?: string | null
          category?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_t"]
          duration_minutes?: number
          feedback?: Json | null
          id?: string
          interview_type?: string | null
          notes?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["attempt_status_t"]
          time_taken_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          description: string
          icon: string
          name: string
        }
        Insert: {
          code: string
          description: string
          icon?: string
          name: string
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          name?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          attempt_id: string | null
          created_at: string
          file_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ai_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_comments: {
        Row: {
          content: string
          created_at: string
          file_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_comments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_likes: {
        Row: {
          created_at: string
          file_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_likes_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_ratings: {
        Row: {
          created_at: string
          file_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_ratings_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          category: string | null
          company: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_t"] | null
          download_count: number
          file_name: string | null
          file_type: string | null
          folder_id: string | null
          framework: string | null
          id: string
          interview_round: string | null
          is_archived: boolean
          is_removed: boolean
          is_trashed: boolean
          like_count: number
          owner_id: string
          rating_avg: number
          rating_count: number
          size_bytes: number | null
          storage_path: string | null
          tags: string[]
          title: string
          topic: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_t"]
        }
        Insert: {
          category?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_t"] | null
          download_count?: number
          file_name?: string | null
          file_type?: string | null
          folder_id?: string | null
          framework?: string | null
          id?: string
          interview_round?: string | null
          is_archived?: boolean
          is_removed?: boolean
          is_trashed?: boolean
          like_count?: number
          owner_id: string
          rating_avg?: number
          rating_count?: number
          size_bytes?: number | null
          storage_path?: string | null
          tags?: string[]
          title: string
          topic?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_t"]
        }
        Update: {
          category?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_t"] | null
          download_count?: number
          file_name?: string | null
          file_type?: string | null
          folder_id?: string | null
          framework?: string | null
          id?: string
          interview_round?: string | null
          is_archived?: boolean
          is_removed?: boolean
          is_trashed?: boolean
          like_count?: number
          owner_id?: string
          rating_avg?: number
          rating_count?: number
          size_bytes?: number | null
          storage_path?: string | null
          tags?: string[]
          title?: string
          topic?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_t"]
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      prep_sessions: {
        Row: {
          capacity: number
          category: string
          created_at: string
          description: string | null
          duration_minutes: number
          host_id: string
          id: string
          meeting_link: string | null
          prerequisites: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["session_visibility_t"]
        }
        Insert: {
          capacity?: number
          category: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id: string
          id?: string
          meeting_link?: string | null
          prerequisites?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["session_visibility_t"]
        }
        Update: {
          capacity?: number
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id?: string
          id?: string
          meeting_link?: string | null
          prerequisites?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["session_visibility_t"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batch: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          last_active_date: string | null
          linkedin_url: string | null
          preferred_domains: string[]
          resume_url: string | null
          skills: string[]
          specialization: string | null
          streak: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          batch?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_banned?: boolean
          last_active_date?: string | null
          linkedin_url?: string | null
          preferred_domains?: string[]
          resume_url?: string | null
          skills?: string[]
          specialization?: string | null
          streak?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          batch?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          last_active_date?: string | null
          linkedin_url?: string | null
          preferred_domains?: string[]
          resume_url?: string | null
          skills?: string[]
          specialization?: string | null
          streak?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          file_id: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          pinned: boolean
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prep_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          content: string
          session_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "prep_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          created_at: string
          feedback: string | null
          hand_raised: boolean
          id: string
          rating: number | null
          session_id: string
          status: Database["public"]["Enums"]["participant_status_t"]
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          hand_raised?: boolean
          id?: string
          rating?: number | null
          session_id: string
          status?: Database["public"]["Enums"]["participant_status_t"]
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          hand_raised?: boolean
          id?: string
          rating?: number | null
          session_id?: string
          status?: Database["public"]["Enums"]["participant_status_t"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prep_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      app_role: "student" | "admin"
      attempt_status_t: "in_progress" | "submitted" | "evaluated"
      difficulty_t: "easy" | "medium" | "hard"
      participant_status_t: "booked" | "waitlist" | "cancelled"
      session_visibility_t: "public" | "invite" | "private"
      visibility_t: "private" | "public" | "shared"
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
      app_role: ["student", "admin"],
      attempt_status_t: ["in_progress", "submitted", "evaluated"],
      difficulty_t: ["easy", "medium", "hard"],
      participant_status_t: ["booked", "waitlist", "cancelled"],
      session_visibility_t: ["public", "invite", "private"],
      visibility_t: ["private", "public", "shared"],
    },
  },
} as const
