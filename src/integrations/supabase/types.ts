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
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          commission_percent: number
          created_at: string
          id: string
          kind: string
          paid_at: string | null
          payment_proof_url: string | null
          reference_date: string
          sale_amount: number
          sale_id: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          commission_percent: number
          created_at?: string
          id?: string
          kind?: string
          paid_at?: string | null
          payment_proof_url?: string | null
          reference_date?: string
          sale_amount: number
          sale_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          kind?: string
          paid_at?: string | null
          payment_proof_url?: string | null
          reference_date?: string
          sale_amount?: number
          sale_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "affiliate_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_sales: {
        Row: {
          affiliate_id: string
          amount_first: number
          amount_recurring: number
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          cancellation_reason: string | null
          commission_percent: number
          config: Json
          created_at: string
          id: string
          payment_id: string | null
          plan_label: string
          plan_slug: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount_first: number
          amount_recurring: number
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          cancellation_reason?: string | null
          commission_percent: number
          config?: Json
          created_at?: string
          id?: string
          payment_id?: string | null
          plan_label: string
          plan_slug: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount_first?: number
          amount_recurring?: number
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          cancellation_reason?: string | null
          commission_percent?: number
          config?: Json
          created_at?: string
          id?: string
          payment_id?: string | null
          plan_label?: string
          plan_slug?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sales_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          commission_percent: number
          commission_recurring: boolean
          created_at: string
          document: string | null
          email: string
          id: string
          name: string
          notes: string | null
          pix_key: string | null
          pix_key_type: string | null
          slug: string
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          commission_percent?: number
          commission_recurring?: boolean
          created_at?: string
          document?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          commission_percent?: number
          commission_recurring?: boolean
          created_at?: string
          document?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          current_uses: number
          discount_percent: number
          id: string
          max_uses: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          current_uses?: number
          discount_percent: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          current_uses?: number
          discount_percent?: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          plan: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          plan: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          plan?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          features: Json
          gradient: string
          icon: string
          id: string
          name: string
          popular: boolean
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          features?: Json
          gradient?: string
          icon?: string
          id?: string
          name: string
          popular?: boolean
          price: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          features?: Json
          gradient?: string
          icon?: string
          id?: string
          name?: string
          popular?: boolean
          price?: number
          slug?: string
          sort_order?: number
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
      users: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          bairro: string | null
          billing_name: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          data_expiracao: string | null
          email: string
          endereco: string | null
          estado: string | null
          id: string
          name: string
          numero: string | null
          plano_ativo: string | null
          status: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          bairro?: string | null
          billing_name?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          email: string
          endereco?: string | null
          estado?: string | null
          id?: string
          name: string
          numero?: string | null
          plano_ativo?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          bairro?: string | null
          billing_name?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          email?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          name?: string
          numero?: string | null
          plano_ativo?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp?: string | null
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
      app_role: "admin" | "user" | "affiliate"
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
      app_role: ["admin", "user", "affiliate"],
    },
  },
} as const
