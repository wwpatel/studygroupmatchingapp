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
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          grade?: string | null;
          subjects?: string[];
          created_at?: string;
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
        };
        Insert: {
          id?: string;
          student_id: string;
          topic_id: string;
          mastery_score?: number;
          attempts_count?: number;
          last_updated?: string;
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
          material_id: string;
          student_id: string;
          type: "quiz" | "test" | "flashcards";
          title: string;
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          material_id: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
