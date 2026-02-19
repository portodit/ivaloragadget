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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_email: string | null
          target_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_email?: string | null
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_email?: string | null
          target_id?: string | null
        }
        Relationships: []
      }
      catalog_discount_codes: {
        Row: {
          catalog_product_id: string
          created_at: string
          discount_code_id: string
          id: string
        }
        Insert: {
          catalog_product_id: string
          created_at?: string
          discount_code_id: string
          id?: string
        }
        Update: {
          catalog_product_id?: string
          created_at?: string
          discount_code_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_discount_codes_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_discount_codes_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          catalog_status: Database["public"]["Enums"]["catalog_status"]
          created_at: string
          created_by: string | null
          display_name: string
          full_description: string | null
          gallery_urls: string[] | null
          highlight_product: boolean
          id: string
          override_display_price: number | null
          price_strategy: Database["public"]["Enums"]["price_strategy"]
          product_id: string
          promo_label: string | null
          publish_to_marketplace: boolean
          publish_to_pos: boolean
          publish_to_web: boolean
          short_description: string | null
          show_condition_breakdown: boolean
          slug: string | null
          thumbnail_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          catalog_status?: Database["public"]["Enums"]["catalog_status"]
          created_at?: string
          created_by?: string | null
          display_name: string
          full_description?: string | null
          gallery_urls?: string[] | null
          highlight_product?: boolean
          id?: string
          override_display_price?: number | null
          price_strategy?: Database["public"]["Enums"]["price_strategy"]
          product_id: string
          promo_label?: string | null
          publish_to_marketplace?: boolean
          publish_to_pos?: boolean
          publish_to_web?: boolean
          short_description?: string | null
          show_condition_breakdown?: boolean
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          catalog_status?: Database["public"]["Enums"]["catalog_status"]
          created_at?: string
          created_by?: string | null
          display_name?: string
          full_description?: string | null
          gallery_urls?: string[] | null
          highlight_product?: boolean
          id?: string
          override_display_price?: number | null
          price_strategy?: Database["public"]["Enums"]["price_strategy"]
          product_id?: string
          promo_label?: string | null
          publish_to_marketplace?: boolean
          publish_to_pos?: boolean
          publish_to_web?: boolean
          short_description?: string | null
          show_condition_breakdown?: boolean
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "master_products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applicable_product_ids: Json | null
          applies_to_all: boolean
          buy_quantity: number | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          get_quantity: number | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase_amount: number | null
          name: string
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_product_ids?: Json | null
          applies_to_all?: boolean
          buy_quantity?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          get_quantity?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          name: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_product_ids?: Json | null
          applies_to_all?: boolean
          buy_quantity?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          get_quantity?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          name?: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      master_products: {
        Row: {
          base_price: number | null
          category: Database["public"]["Enums"]["product_category"]
          color: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          series: string
          storage_gb: number
          updated_at: string
          warranty_type: Database["public"]["Enums"]["warranty_type"]
        }
        Insert: {
          base_price?: number | null
          category: Database["public"]["Enums"]["product_category"]
          color: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          series: string
          storage_gb: number
          updated_at?: string
          warranty_type: Database["public"]["Enums"]["warranty_type"]
        }
        Update: {
          base_price?: number | null
          category?: Database["public"]["Enums"]["product_category"]
          color?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          series?: string
          storage_gb?: number
          updated_at?: string
          warranty_type?: Database["public"]["Enums"]["warranty_type"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opname_scanned_items: {
        Row: {
          action_notes: string | null
          action_taken: string | null
          id: string
          imei: string
          scan_result: string
          scanned_at: string
          scanned_by: string | null
          session_id: string
        }
        Insert: {
          action_notes?: string | null
          action_taken?: string | null
          id?: string
          imei: string
          scan_result: string
          scanned_at?: string
          scanned_by?: string | null
          session_id: string
        }
        Update: {
          action_notes?: string | null
          action_taken?: string | null
          id?: string
          imei?: string
          scan_result?: string
          scanned_at?: string
          scanned_by?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opname_scanned_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "opname_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      opname_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          cron_time: string
          id: string
          is_active: boolean
          notes: string | null
          schedule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron_time: string
          id?: string
          is_active?: boolean
          notes?: string | null
          schedule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron_time?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          schedule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      opname_session_assignments: {
        Row: {
          admin_id: string
          assigned_at: string
          assigned_by: string | null
          id: string
          session_id: string
        }
        Insert: {
          admin_id: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          session_id: string
        }
        Update: {
          admin_id?: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opname_session_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "opname_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      opname_sessions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          locked_at: string | null
          notes: string | null
          session_status: string
          session_type: string
          started_at: string
          total_expected: number
          total_match: number
          total_missing: number
          total_scanned: number
          total_unregistered: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          session_status?: string
          session_type: string
          started_at?: string
          total_expected?: number
          total_match?: number
          total_missing?: number
          total_scanned?: number
          total_unregistered?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          session_status?: string
          session_type?: string
          started_at?: string
          total_expected?: number
          total_match?: number
          total_missing?: number
          total_scanned?: number
          total_unregistered?: number
          updated_at?: string
        }
        Relationships: []
      }
      opname_snapshot_items: {
        Row: {
          action_notes: string | null
          action_taken: string | null
          cost_price: number | null
          created_at: string
          id: string
          imei: string
          product_label: string
          scan_result: string | null
          selling_price: number | null
          session_id: string
          sold_reference_id: string | null
          stock_status: string
          unit_id: string
        }
        Insert: {
          action_notes?: string | null
          action_taken?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          imei: string
          product_label: string
          scan_result?: string | null
          selling_price?: number | null
          session_id: string
          sold_reference_id?: string | null
          stock_status: string
          unit_id: string
        }
        Update: {
          action_notes?: string | null
          action_taken?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          imei?: string
          product_label?: string
          scan_result?: string | null
          selling_price?: number | null
          session_id?: string
          sold_reference_id?: string | null
          stock_status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opname_snapshot_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "opname_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opname_snapshot_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opname_snapshot_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units_sales_view"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_unit_logs: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          unit_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          unit_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_unit_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_unit_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units_sales_view"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_units: {
        Row: {
          batch_code: string | null
          condition_status: Database["public"]["Enums"]["condition_status"]
          cost_price: number | null
          created_at: string
          id: string
          imei: string
          minus_description: string | null
          notes: string | null
          product_id: string
          received_at: string
          reserved_at: string | null
          selling_price: number | null
          sold_at: string | null
          sold_channel: Database["public"]["Enums"]["sold_channel"] | null
          sold_reference_id: string | null
          status_changed_at: string
          stock_status: Database["public"]["Enums"]["stock_status"]
          supplier: string | null
          updated_at: string
        }
        Insert: {
          batch_code?: string | null
          condition_status?: Database["public"]["Enums"]["condition_status"]
          cost_price?: number | null
          created_at?: string
          id?: string
          imei: string
          minus_description?: string | null
          notes?: string | null
          product_id: string
          received_at?: string
          reserved_at?: string | null
          selling_price?: number | null
          sold_at?: string | null
          sold_channel?: Database["public"]["Enums"]["sold_channel"] | null
          sold_reference_id?: string | null
          status_changed_at?: string
          stock_status?: Database["public"]["Enums"]["stock_status"]
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          batch_code?: string | null
          condition_status?: Database["public"]["Enums"]["condition_status"]
          cost_price?: number | null
          created_at?: string
          id?: string
          imei?: string
          minus_description?: string | null
          notes?: string | null
          product_id?: string
          received_at?: string
          reserved_at?: string | null
          selling_price?: number | null
          sold_at?: string | null
          sold_channel?: Database["public"]["Enums"]["sold_channel"] | null
          sold_reference_id?: string | null
          status_changed_at?: string
          stock_status?: Database["public"]["Enums"]["stock_status"]
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "master_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
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
      warranty_labels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      stock_units_sales_view: {
        Row: {
          condition_status:
            | Database["public"]["Enums"]["condition_status"]
            | null
          id: string | null
          notes: string | null
          product_id: string | null
          received_at: string | null
          selling_price: number | null
          status_changed_at: string | null
          stock_status: Database["public"]["Enums"]["stock_status"] | null
        }
        Insert: {
          condition_status?:
            | Database["public"]["Enums"]["condition_status"]
            | null
          id?: string | null
          notes?: string | null
          product_id?: string | null
          received_at?: string | null
          selling_price?: number | null
          status_changed_at?: string | null
          stock_status?: Database["public"]["Enums"]["stock_status"] | null
        }
        Update: {
          condition_status?:
            | Database["public"]["Enums"]["condition_status"]
            | null
          id?: string | null
          notes?: string | null
          product_id?: string | null
          received_at?: string | null
          selling_price?: number | null
          status_changed_at?: string | null
          stock_status?: Database["public"]["Enums"]["stock_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "master_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      custom_email_hook: { Args: { event: Json }; Returns: undefined }
      get_my_status: {
        Args: never
        Returns: Database["public"]["Enums"]["account_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended" | "rejected"
      app_role: "super_admin" | "admin"
      catalog_status: "draft" | "published" | "unpublished"
      condition_status: "no_minus" | "minus"
      discount_type:
        | "percentage"
        | "fixed_amount"
        | "buy_x_get_y"
        | "min_purchase"
        | "flash_sale"
      price_strategy: "min_price" | "avg_price" | "fixed"
      product_category: "iphone" | "ipad" | "accessory"
      sold_channel: "pos" | "ecommerce" | "manual"
      stock_status:
        | "available"
        | "reserved"
        | "coming_soon"
        | "service"
        | "sold"
        | "return"
        | "lost"
      warranty_type: "resmi_bc" | "ibox" | "inter" | "whitelist" | "digimap"
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
      account_status: ["pending", "active", "suspended", "rejected"],
      app_role: ["super_admin", "admin"],
      catalog_status: ["draft", "published", "unpublished"],
      condition_status: ["no_minus", "minus"],
      discount_type: [
        "percentage",
        "fixed_amount",
        "buy_x_get_y",
        "min_purchase",
        "flash_sale",
      ],
      price_strategy: ["min_price", "avg_price", "fixed"],
      product_category: ["iphone", "ipad", "accessory"],
      sold_channel: ["pos", "ecommerce", "manual"],
      stock_status: [
        "available",
        "reserved",
        "coming_soon",
        "service",
        "sold",
        "return",
        "lost",
      ],
      warranty_type: ["resmi_bc", "ibox", "inter", "whitelist", "digimap"],
    },
  },
} as const
