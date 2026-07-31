export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      bulletin_knowledge: {
        Row: {
          bulletin_type: string;
          category: string | null;
          content: string;
          context: string | null;
          created_at: string;
          id: string;
          keywords: string | null;
          occurrence_address: string | null;
          owner_id: string;
          search_tsv: unknown;
          source_bulletin_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          bulletin_type: string;
          category?: string | null;
          content: string;
          context?: string | null;
          created_at?: string;
          id?: string;
          keywords?: string | null;
          occurrence_address?: string | null;
          owner_id: string;
          search_tsv?: unknown;
          source_bulletin_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          bulletin_type?: string;
          category?: string | null;
          content?: string;
          context?: string | null;
          created_at?: string;
          id?: string;
          keywords?: string | null;
          occurrence_address?: string | null;
          owner_id?: string;
          search_tsv?: unknown;
          source_bulletin_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bulletin_knowledge_source_bulletin_id_fkey";
            columns: ["source_bulletin_id"];
            isOneToOne: true;
            referencedRelation: "bulletins";
            referencedColumns: ["id"];
          },
        ];
      };
      bulletin_templates: {
        Row: {
          bulletin_type: string;
          category: string | null;
          content: string;
          context: string | null;
          created_at: string;
          id: string;
          keywords: string | null;
          occurrence_address: string | null;
          search_tsv: unknown;
          title: string;
          updated_at: string;
        };
        Insert: {
          bulletin_type: string;
          category?: string | null;
          content: string;
          context?: string | null;
          created_at?: string;
          id?: string;
          keywords?: string | null;
          occurrence_address?: string | null;
          search_tsv?: unknown;
          title: string;
          updated_at?: string;
        };
        Update: {
          bulletin_type?: string;
          category?: string | null;
          content?: string;
          context?: string | null;
          created_at?: string;
          id?: string;
          keywords?: string | null;
          occurrence_address?: string | null;
          search_tsv?: unknown;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bulletins: {
        Row: {
          bulletin_type: string;
          category: string | null;
          content: string;
          context: string | null;
          created_at: string;
          crew_address: string | null;
          crew_composition: string | null;
          crew_lat: number | null;
          crew_lng: number | null;
          deleted_at: string | null;
          id: string;
          is_favorite: boolean;
          keywords: string | null;
          occurrence_address: string | null;
          occurrence_at: string | null;
          occurrence_lat: number | null;
          occurrence_lng: number | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
          vehicle_prefix: string | null;
        };
        Insert: {
          bulletin_type: string;
          category?: string | null;
          content?: string;
          context?: string | null;
          created_at?: string;
          crew_address?: string | null;
          crew_composition?: string | null;
          crew_lat?: number | null;
          crew_lng?: number | null;
          deleted_at?: string | null;
          id?: string;
          is_favorite?: boolean;
          keywords?: string | null;
          occurrence_address?: string | null;
          occurrence_at?: string | null;
          occurrence_lat?: number | null;
          occurrence_lng?: number | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
          vehicle_prefix?: string | null;
        };
        Update: {
          bulletin_type?: string;
          category?: string | null;
          content?: string;
          context?: string | null;
          created_at?: string;
          crew_address?: string | null;
          crew_composition?: string | null;
          crew_lat?: number | null;
          crew_lng?: number | null;
          deleted_at?: string | null;
          id?: string;
          is_favorite?: boolean;
          keywords?: string | null;
          occurrence_address?: string | null;
          occurrence_at?: string | null;
          occurrence_lat?: number | null;
          occurrence_lng?: number | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          vehicle_prefix?: string | null;
        };
        Relationships: [];
      };
      community_knowledge: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          bulletin_type: string;
          category: string | null;
          content: string;
          content_hash: string;
          context: string | null;
          created_at: string;
          id: string;
          keywords: string | null;
          search_tsv: unknown;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          bulletin_type: string;
          category?: string | null;
          content: string;
          content_hash: string;
          context?: string | null;
          created_at?: string;
          id?: string;
          keywords?: string | null;
          search_tsv?: unknown;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          bulletin_type?: string;
          category?: string | null;
          content?: string;
          content_hash?: string;
          context?: string | null;
          created_at?: string;
          id?: string;
          keywords?: string | null;
          search_tsv?: unknown;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          coupon_id: string;
          id: string;
          redeemed_at: string;
          subscription_id: string | null;
          user_id: string;
        };
        Insert: {
          coupon_id: string;
          id?: string;
          redeemed_at?: string;
          subscription_id?: string | null;
          user_id: string;
        };
        Update: {
          coupon_id?: string;
          id?: string;
          redeemed_at?: string;
          subscription_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string;
          duration_months: number;
          expires_at: string | null;
          grants_lifetime: boolean;
          id: string;
          max_uses: number;
          note: string | null;
          updated_at: string;
          used_count: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          created_by: string;
          duration_months: number;
          expires_at?: string | null;
          grants_lifetime?: boolean;
          id?: string;
          max_uses?: number;
          note?: string | null;
          updated_at?: string;
          used_count?: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string;
          duration_months?: number;
          expires_at?: string | null;
          grants_lifetime?: boolean;
          id?: string;
          max_uses?: number;
          note?: string | null;
          updated_at?: string;
          used_count?: number;
        };
        Relationships: [];
      };
      error_logs: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          ip_hash: string | null;
          message: string;
          metadata: Json;
          resolved: boolean;
          route: string | null;
          severity: string;
          stack: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          message: string;
          metadata?: Json;
          resolved?: boolean;
          route?: string | null;
          severity?: string;
          stack?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          message?: string;
          metadata?: Json;
          resolved?: boolean;
          route?: string | null;
          severity?: string;
          stack?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notification_reads: {
        Row: {
          notification_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          notification_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          notification_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          audience: string;
          body: string;
          category: string;
          created_at: string;
          created_by: string | null;
          id: string;
          target_user_id: string | null;
          title: string;
        };
        Insert: {
          audience?: string;
          body: string;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          target_user_id?: string | null;
          title: string;
        };
        Update: {
          audience?: string;
          body?: string;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          target_user_id?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          external_id: string | null;
          external_payment_method_id: string | null;
          id: string;
          paid_at: string | null;
          payment_method: string | null;
          pix_copy_paste: string | null;
          pix_expiration: string | null;
          pix_qr_code: string | null;
          plan: string;
          status: string;
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          external_id?: string | null;
          external_payment_method_id?: string | null;
          id?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          pix_copy_paste?: string | null;
          pix_expiration?: string | null;
          pix_qr_code?: string | null;
          plan: string;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          external_id?: string | null;
          external_payment_method_id?: string | null;
          id?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          pix_copy_paste?: string | null;
          pix_expiration?: string | null;
          pix_qr_code?: string | null;
          plan?: string;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      pix_payment_requests: {
        Row: {
          admin_note: string | null;
          amount_brl: number;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          plan: string;
          status: string;
          updated_at: string;
          user_email: string | null;
          user_id: string;
          user_note: string | null;
        };
        Insert: {
          admin_note?: string | null;
          amount_brl: number;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          plan: string;
          status?: string;
          updated_at?: string;
          user_email?: string | null;
          user_id: string;
          user_note?: string | null;
        };
        Update: {
          admin_note?: string | null;
          amount_brl?: number;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          updated_at?: string;
          user_email?: string | null;
          user_id?: string;
          user_note?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          functional_id: string | null;
          id: string;
          last_seen_at: string | null;
          phone: string | null;
          rank: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          functional_id?: string | null;
          id: string;
          last_seen_at?: string | null;
          phone?: string | null;
          rank?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          functional_id?: string | null;
          id?: string;
          last_seen_at?: string | null;
          phone?: string | null;
          rank?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          canceled_at: string | null;
          created_at: string;
          current_period_end: string;
          current_period_start: string;
          environment: string;
          external_id: string | null;
          id: string;
          paddle_customer_id: string | null;
          paddle_subscription_id: string | null;
          payment_method: string | null;
          plan: string;
          status: string;
          trial_ends_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string;
          current_period_start?: string;
          environment?: string;
          external_id?: string | null;
          id?: string;
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          payment_method?: string | null;
          plan?: string;
          status?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string;
          current_period_start?: string;
          environment?: string;
          external_id?: string | null;
          id?: string;
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          payment_method?: string | null;
          plan?: string;
          status?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      anonymize_bulletin_text: { Args: { _txt: string }; Returns: string };
      approve_pix_payment_request: {
        Args: { _request_id: string };
        Returns: Json;
      };
      backfill_community_knowledge: { Args: { _limit?: number }; Returns: Json };
      cancel_pix_payment_request: {
        Args: { _request_id: string; _user_id: string };
        Returns: Json;
      };
      create_pix_payment_request: {
        Args: { _plan: string; _user_id: string };
        Returns: Json;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_coupon_valid: { Args: { _code: string }; Returns: boolean };
      is_premium_user: { Args: { _user_id: string }; Returns: boolean };
      match_bulletin_knowledge: {
        Args: { _bulletin_type?: string; _limit?: number; _query: string };
        Returns: {
          bulletin_type: string;
          category: string;
          content: string;
          id: string;
          occurrence_address: string;
          rank: number;
          title: string;
        }[];
      };
      match_bulletin_templates: {
        Args: { _bulletin_type?: string; _limit?: number; _query: string };
        Returns: {
          bulletin_type: string;
          category: string;
          content: string;
          id: string;
          occurrence_address: string;
          rank: number;
          title: string;
        }[];
      };
      match_community_knowledge: {
        Args: { _bulletin_type?: string; _limit?: number; _query: string };
        Returns: {
          bulletin_type: string;
          category: string;
          content: string;
          id: string;
          occurrence_address: string;
          rank: number;
          title: string;
        }[];
      };
      redeem_coupon: {
        Args: { _code: string; _user_id: string };
        Returns: Json;
      };
      reject_pix_payment_request: {
        Args: { _reason?: string; _request_id: string };
        Returns: Json;
      };
      review_community_knowledge: {
        Args: { _decision: string; _id: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "fundador" | "admin" | "usuario";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["fundador", "admin", "usuario"],
    },
  },
} as const;
