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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_secrets: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          path: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          path?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          path?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          asaas_payment_id: string | null
          commission_amount: number
          commission_percent: number
          created_at: string | null
          id: string
          is_recurring: boolean | null
          kind: string
          paid_at: string | null
          payment_proof_url: string | null
          reference_date: string | null
          sale_amount: number
          sale_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          affiliate_id: string
          asaas_payment_id?: string | null
          commission_amount: number
          commission_percent: number
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          kind: string
          paid_at?: string | null
          payment_proof_url?: string | null
          reference_date?: string | null
          sale_amount: number
          sale_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          affiliate_id?: string
          asaas_payment_id?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          kind?: string
          paid_at?: string | null
          payment_proof_url?: string | null
          reference_date?: string | null
          sale_amount?: number
          sale_id?: string
          status?: string
          updated_at?: string | null
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
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          cancellation_reason: string | null
          commission_percent: number
          config: Json
          created_at: string | null
          id: string
          payment_id: string | null
          plan_label: string
          plan_slug: string
          status: string
          tracking_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount_first: number
          amount_recurring: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          cancellation_reason?: string | null
          commission_percent: number
          config?: Json
          created_at?: string | null
          id?: string
          payment_id?: string | null
          plan_label: string
          plan_slug: string
          status?: string
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount_first?: number
          amount_recurring?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          cancellation_reason?: string | null
          commission_percent?: number
          config?: Json
          created_at?: string | null
          id?: string
          payment_id?: string | null
          plan_label?: string
          plan_slug?: string
          status?: string
          tracking_id?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "affiliate_sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          created_at: string | null
          document: string | null
          email: string
          id: string
          name: string
          notes: string | null
          pix_key: string | null
          pix_key_type: string | null
          slug: string
          status: string
          updated_at: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          commission_percent?: number
          commission_recurring?: boolean
          created_at?: string | null
          document?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          commission_percent?: number
          commission_recurring?: boolean
          created_at?: string | null
          document?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      asaas_webhooks: {
        Row: {
          created_at: string | null
          event_id: string | null
          event_type: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bivvo_config_change_logs: {
        Row: {
          action: string
          asaas_value_after: number | null
          asaas_value_before: number | null
          asaas_value_changed: boolean
          bivvo_relevant_changed: boolean
          changed_by: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          changed_fields: string[] | null
          config_after: Json | null
          config_before: Json | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          action: string
          asaas_value_after?: number | null
          asaas_value_before?: number | null
          asaas_value_changed?: boolean
          bivvo_relevant_changed?: boolean
          changed_by?: string | null
          changed_by_email?: string | null
          changed_by_name?: string | null
          changed_fields?: string[] | null
          config_after?: Json | null
          config_before?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          action?: string
          asaas_value_after?: number | null
          asaas_value_before?: number | null
          asaas_value_changed?: boolean
          bivvo_relevant_changed?: boolean
          changed_by?: string | null
          changed_by_email?: string | null
          changed_by_name?: string | null
          changed_fields?: string[] | null
          config_after?: Json | null
          config_before?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bivvo_config_change_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          active: boolean | null
          created_at: string | null
          emoji: string | null
          icon_url: string | null
          id: string
          included: number
          label: string
          slug: string
          sort_order: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          included?: number
          label: string
          slug: string
          sort_order?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          included?: number
          label?: string
          slug?: string
          sort_order?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          installment_number: number | null
          installments_total: number | null
          is_automatic: boolean | null
          metadata: Json | null
          parent_id: string | null
          payment_method: string | null
          recurring_interval: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          installment_number?: number | null
          installments_total?: number | null
          is_automatic?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          payment_method?: string | null
          recurring_interval?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          installment_number?: number | null
          installments_total?: number | null
          is_automatic?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          payment_method?: string | null
          recurring_interval?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_daily_snapshots: {
        Row: {
          active_subscriptions: number
          affiliate_commissions_paid: number
          chargebacks: number
          created_at: string
          date: string
          expenses_total: number
          gross_revenue: number
          id: string
          net_profit: number
          net_revenue: number
          overdue_value: number
          refunds: number
          updated_at: string
        }
        Insert: {
          active_subscriptions?: number
          affiliate_commissions_paid?: number
          chargebacks?: number
          created_at?: string
          date: string
          expenses_total?: number
          gross_revenue?: number
          id?: string
          net_profit?: number
          net_revenue?: number
          overdue_value?: number
          refunds?: number
          updated_at?: string
        }
        Update: {
          active_subscriptions?: number
          affiliate_commissions_paid?: number
          chargebacks?: number
          created_at?: string
          date?: string
          expenses_total?: number
          gross_revenue?: number
          id?: string
          net_profit?: number
          net_revenue?: number
          overdue_value?: number
          refunds?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_events: {
        Row: {
          amount: number
          created_at: string
          event_type: string
          id: string
          metadata: Json
          net_amount: number | null
          occurred_at: string
          reference_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          net_amount?: number | null
          occurred_at?: string
          reference_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          net_amount?: number | null
          occurred_at?: string
          reference_id?: string | null
        }
        Relationships: []
      }
      marketing_materials: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          preview_url: string | null
          title: string
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          preview_url?: string | null
          title: string
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          preview_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      official_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          name?: string
          updated_at?: string
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
          active: boolean | null
          created_at: string | null
          description: string | null
          features: Json
          gradient: string | null
          icon: string | null
          id: string
          name: string
          popular: boolean | null
          price: number
          price_recurring: number
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          features?: Json
          gradient?: string | null
          icon?: string | null
          id?: string
          name: string
          popular?: boolean | null
          price: number
          price_recurring?: number
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          features?: Json
          gradient?: string | null
          icon?: string | null
          id?: string
          name?: string
          popular?: boolean | null
          price?: number
          price_recurring?: number
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          account_created: boolean
          channels_config: Json
          channels_discount: number
          created_at: string
          customer_id: string
          has_telefonia: boolean
          id: string
          is_protagonista: boolean
          plan_slug: string
          status: string
          updated_at: string
          users_count: number
        }
        Insert: {
          account_created?: boolean
          channels_config?: Json
          channels_discount?: number
          created_at?: string
          customer_id: string
          has_telefonia?: boolean
          id?: string
          is_protagonista?: boolean
          plan_slug: string
          status?: string
          updated_at?: string
          users_count?: number
        }
        Update: {
          account_created?: boolean
          channels_config?: Json
          channels_discount?: number
          created_at?: string
          customer_id?: string
          has_telefonia?: boolean
          id?: string
          is_protagonista?: boolean
          plan_slug?: string
          status?: string
          updated_at?: string
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          source: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message: string
          source: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          subtasks: Json
          title: string
          updated_at: string
          waiting_third_party: boolean
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          subtasks?: Json
          title: string
          updated_at?: string
          waiting_third_party?: boolean
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          subtasks?: Json
          title?: string
          updated_at?: string
          waiting_third_party?: boolean
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
          bivvo_config: Json | null
          bivvo_config_previous: Json | null
          bivvo_config_synced_asaas_at: string | null
          bivvo_config_synced_asaas_value: number | null
          bivvo_config_synced_bivvo: Json | null
          bivvo_config_synced_bivvo_at: string | null
          bivvo_config_updated_at: string | null
          bivvo_status: string | null
          bivvo_status_checked_at: string | null
          bivvo_tenant_id: string | null
          cep: string | null
          cidade: string | null
          company_name: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          data_expiracao: string | null
          email: string
          endereco: string | null
          estado: string | null
          id: string
          inactivated_at: string | null
          name: string
          numero: string | null
          overdue_since: string | null
          person_type: string | null
          plano_ativo: string | null
          status: string | null
          tenant_provision_error: string | null
          tenant_provisioned_at: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          bairro?: string | null
          billing_name?: string | null
          bivvo_config?: Json | null
          bivvo_config_previous?: Json | null
          bivvo_config_synced_asaas_at?: string | null
          bivvo_config_synced_asaas_value?: number | null
          bivvo_config_synced_bivvo?: Json | null
          bivvo_config_synced_bivvo_at?: string | null
          bivvo_config_updated_at?: string | null
          bivvo_status?: string | null
          bivvo_status_checked_at?: string | null
          bivvo_tenant_id?: string | null
          cep?: string | null
          cidade?: string | null
          company_name?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          email: string
          endereco?: string | null
          estado?: string | null
          id?: string
          inactivated_at?: string | null
          name: string
          numero?: string | null
          overdue_since?: string | null
          person_type?: string | null
          plano_ativo?: string | null
          status?: string | null
          tenant_provision_error?: string | null
          tenant_provisioned_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          bairro?: string | null
          billing_name?: string | null
          bivvo_config?: Json | null
          bivvo_config_previous?: Json | null
          bivvo_config_synced_asaas_at?: string | null
          bivvo_config_synced_asaas_value?: number | null
          bivvo_config_synced_bivvo?: Json | null
          bivvo_config_synced_bivvo_at?: string | null
          bivvo_config_updated_at?: string | null
          bivvo_status?: string | null
          bivvo_status_checked_at?: string | null
          bivvo_tenant_id?: string | null
          cep?: string | null
          cidade?: string | null
          company_name?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          email?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          inactivated_at?: string | null
          name?: string
          numero?: string | null
          overdue_since?: string | null
          person_type?: string | null
          plano_ativo?: string | null
          status?: string | null
          tenant_provision_error?: string | null
          tenant_provisioned_at?: string | null
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
      is_admin: { Args: never; Returns: boolean }
      track_affiliate_click: {
        Args: {
          p_affiliate_slug: string
          p_ip: string
          p_path: string
          p_ref: string
          p_ua: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "affiliate"
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
      app_role: ["admin", "affiliate"],
    },
  },
} as const
