import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProfileTopicPreference } from "./onboarding";

type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          dev_mode: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          dev_mode?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          dev_mode?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          topics: ProfileTopicPreference[];
          overview: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          topics?: ProfileTopicPreference[];
          overview?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          topics?: ProfileTopicPreference[];
          overview?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      briefs: {
        Row: {
          id: string;
          user_id: string | null;
          content: unknown;
          generated_at: string | null;
          date: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          content: unknown;
          generated_at?: string | null;
          date: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          content?: unknown;
          generated_at?: string | null;
          date?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

let supabaseServiceClient: SupabaseClient<Database, "public"> | null = null;

export function getSupabaseServiceClient() {
  if (supabaseServiceClient) return supabaseServiceClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  supabaseServiceClient = createClient<Database, "public">(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseServiceClient;
}
