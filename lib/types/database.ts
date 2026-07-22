// Hand-authored to mirror supabase/schema.sql. If the schema changes, update
// this alongside it (or regenerate with `supabase gen types typescript`).
//
// Every table needs a `Relationships` array (even if empty) — postgrest-js's
// generic select-query typing requires it to resolve `.select()` results at
// all, not just for embedded/joined selects.

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
      students: {
        Row: {
          id: string;
          email: string;
          name: string;
          grade: string | null;
          subjects: string[];
          created_at: string;
          // Rolling long-term memory for the AI help chatbot: a condensed
          // summary of older sessions, and the watermark (created_at of the
          // last chat_history message already folded into that summary).
          context_summary: string | null;
          context_summary_upto: string | null;
          // Gamification: lifetime XP (public-profile field) + avatar emoji.
          total_xp: number;
          avatar: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          grade?: string | null;
          subjects?: string[];
          created_at?: string;
          context_summary?: string | null;
          context_summary_upto?: string | null;
          total_xp?: number;
          avatar?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          subject: string;
          name: string;
          parent_topic_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject: string;
          name: string;
          parent_topic_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["topics"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "topics_parent_topic_id_fkey";
            columns: ["parent_topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      skill_profile: {
        Row: {
          id: string;
          student_id: string;
          topic_id: string;
          mastery_score: number;
          attempts_count: number;
          last_updated: string;
          // Lowest mastery this topic has ever had (for the Level Up badge).
          lowest_mastery: number | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          topic_id: string;
          mastery_score?: number;
          attempts_count?: number;
          last_updated?: string;
          lowest_mastery?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["skill_profile"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "skill_profile_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "skill_profile_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      materials: {
        Row: {
          id: string;
          student_id: string;
          title: string;
          subject: string;
          source_type: "pdf" | "text" | "pasted";
          content: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          title: string;
          subject: string;
          source_type: "pdf" | "text" | "pasted";
          content: string;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["materials"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "materials_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_content: {
        Row: {
          id: string;
          material_id: string | null;
          student_id: string;
          type: "quiz" | "test" | "flashcards";
          title: string;
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          material_id?: string | null;
          student_id: string;
          type: "quiz" | "test" | "flashcards";
          title: string;
          content: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["generated_content"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "generated_content_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_content_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          id: string;
          student_id: string;
          generated_content_id: string | null;
          subject: string;
          score: number;
          max_score: number;
          topic_breakdown: Json;
          answers: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          generated_content_id?: string | null;
          subject: string;
          score: number;
          max_score: number;
          topic_breakdown?: Json;
          answers?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attempts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_generated_content_id_fkey";
            columns: ["generated_content_id"];
            isOneToOne: false;
            referencedRelation: "generated_content";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          subject: string;
          name: string;
          match_reasoning: string;
          formed_at: string;
        };
        Insert: {
          id?: string;
          subject: string;
          name: string;
          match_reasoning?: string;
          formed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["groups"]["Insert"]>;
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          student_id: string;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          student_id: string;
          joined_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["group_members"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          group_id: string;
          agenda: Json;
          proposed_times: string[];
          scheduled_time: string | null;
          proposed_by: string | null;
          status: "proposed" | "confirmed" | "completed" | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          agenda?: Json;
          proposed_times?: string[];
          scheduled_time?: string | null;
          proposed_by?: string | null;
          status?: "proposed" | "confirmed" | "completed" | "cancelled";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sessions_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_proposed_by_fkey";
            columns: ["proposed_by"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      checkins: {
        Row: {
          id: string;
          student_id: string;
          session_id: string;
          topic_id: string | null;
          confidence_before: number;
          confidence_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          session_id: string;
          topic_id?: string | null;
          confidence_before: number;
          confidence_after: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checkins"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checkins_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          group_id: string;
          student_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          student_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_history: {
        Row: {
          id: string;
          student_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["chat_history"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "chat_history_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      xp_log: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          source_type: string;
          source_id: string | null;
          earned_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          source_type: string;
          source_id?: string | null;
          earned_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["xp_log"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "xp_log_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      streaks: {
        Row: {
          student_id: string;
          current_streak: number;
          longest_streak: number;
          last_active_date: string | null;
          last_freeze_date: string | null;
        };
        Insert: {
          student_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_active_date?: string | null;
          last_freeze_date?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["streaks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "streaks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: "streak" | "activity" | "mastery";
          tier: number;
          icon: string;
          xp_bonus: number;
          unlock_condition: Json;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          category: "streak" | "activity" | "mastery";
          tier?: number;
          icon: string;
          xp_bonus?: number;
          unlock_condition: Json;
        };
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
        Relationships: [];
      };
      student_badges: {
        Row: {
          student_id: string;
          badge_id: string;
          unlocked_at: string;
        };
        Insert: {
          student_id: string;
          badge_id: string;
          unlocked_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["student_badges"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "student_badges_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      student_xp_settings: {
        Row: {
          student_id: string;
          daily_goal: number;
        };
        Insert: {
          student_id: string;
          daily_goal?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["student_xp_settings"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "student_xp_settings_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      arcade_games: {
        Row: {
          id: string;
          student_id: string;
          game_type: "match_up" | "term_blaster" | "sort_it" | "fill_gap";
          theme: string;
          topic: string;
          subject: string;
          material_id: string | null;
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          game_type: "match_up" | "term_blaster" | "sort_it" | "fill_gap";
          theme?: string;
          topic: string;
          subject: string;
          material_id?: string | null;
          content: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["arcade_games"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "arcade_games_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "arcade_games_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      arcade_attempts: {
        Row: {
          id: string;
          student_id: string;
          game_id: string;
          score: number;
          accuracy: number;
          duration_seconds: number;
          details: Json;
          played_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          game_id: string;
          score: number;
          accuracy: number;
          duration_seconds: number;
          details?: Json;
          played_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["arcade_attempts"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "arcade_attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "arcade_attempts_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "arcade_games";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          student_id: string;
          name: string;
          subject: string;
          color: "lavender" | "blush" | "sage" | "butter";
          test_dates: Json;
          topics: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          name: string;
          subject: string;
          color?: "lavender" | "blush" | "sage" | "butter";
          test_dates?: Json;
          topics?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "projects_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      project_materials: {
        Row: {
          project_id: string;
          material_id: string;
        };
        Insert: {
          project_id: string;
          material_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_materials"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "project_materials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_materials_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      study_plan_nodes: {
        Row: {
          id: string;
          project_id: string;
          topic: string;
          activity_type: "quiz" | "flashcards" | "game" | "chat" | "review";
          description: string;
          scheduled_date: string | null;
          status: "locked" | "current" | "completed";
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          topic: string;
          activity_type: "quiz" | "flashcards" | "game" | "chat" | "review";
          description?: string;
          scheduled_date?: string | null;
          status?: "locked" | "current" | "completed";
          order_index: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["study_plan_nodes"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "study_plan_nodes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          student_id: string;
          title: string;
          date: string;
          time: string | null;
          description: string | null;
          project_id: string | null;
          color: "lavender" | "blush" | "sage" | "butter";
          type: "manual" | "auto";
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          title: string;
          date: string;
          time?: string | null;
          description?: string | null;
          project_id?: string | null;
          color?: "lavender" | "blush" | "sage" | "butter";
          type?: "manual" | "auto";
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["calendar_events"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "calendar_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      todos: {
        Row: {
          id: string;
          student_id: string;
          title: string;
          due_date: string | null;
          priority: "low" | "medium" | "high";
          project_id: string | null;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          title: string;
          due_date?: string | null;
          priority?: "low" | "medium" | "high";
          project_id?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["todos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "todos_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "todos_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      mini_lessons: {
        Row: {
          id: string;
          material_id: string;
          student_id: string;
          title: string;
          segments: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          material_id: string;
          student_id: string;
          title: string;
          segments: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mini_lessons"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "mini_lessons_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mini_lessons_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
