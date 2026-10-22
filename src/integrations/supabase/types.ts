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
      catering_orders: {
        Row: {
          contact: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          event_date: string
          event_time: string | null
          headcount: number | null
          id: string
          location: string | null
          notes: string | null
          restaurant_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          event_date: string
          event_time?: string | null
          headcount?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          restaurant_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          event_date?: string
          event_time?: string | null
          headcount?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          restaurant_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catering_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          method: string
          note: string | null
          order_id: string
          paid_at: string
          restaurant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id: string
          paid_at?: string
          restaurant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id?: string
          paid_at?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catering_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "catering_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "copilot_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_threads: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_threads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      day_issues: {
        Row: {
          amount: number
          business_date: string
          category: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          description: string
          external_id: string | null
          id: string
          platform: string | null
          restaurant_id: string
        }
        Insert: {
          amount?: number
          business_date: string
          category: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description: string
          external_id?: string | null
          id?: string
          platform?: string | null
          restaurant_id: string
        }
        Update: {
          amount?: number
          business_date?: string
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string
          external_id?: string | null
          id?: string
          platform?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_issues_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          address: string | null
          area: string
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number
          id: string
          notes: string | null
          pay_method: string
          phone: string | null
          position: string | null
          restaurant_id: string
          tip_eligible: boolean
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          area?: string
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number
          id?: string
          notes?: string | null
          pay_method?: string
          phone?: string | null
          position?: string | null
          restaurant_id: string
          tip_eligible?: boolean
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          area?: string
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number
          id?: string
          notes?: string | null
          pay_method?: string
          phone?: string | null
          position?: string | null
          restaurant_id?: string
          tip_eligible?: boolean
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_lines: {
        Row: {
          count_id: string
          created_at: string
          id: string
          inventory_item_id: string
          location_id: string
          quantity: number
          restaurant_id: string
          unit_cost: number
        }
        Insert: {
          count_id: string
          created_at?: string
          id?: string
          inventory_item_id: string
          location_id: string
          quantity?: number
          restaurant_id: string
          unit_cost?: number
        }
        Update: {
          count_id?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          location_id?: string
          quantity?: number
          restaurant_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          completed_at: string | null
          counted_by: string | null
          counted_by_email: string | null
          created_at: string
          id: string
          location_id: string | null
          note: string | null
          restaurant_id: string
          status: string
          total_value: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          counted_by?: string | null
          counted_by_email?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          note?: string | null
          restaurant_id: string
          status?: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          counted_by?: string | null
          counted_by_email?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          note?: string | null
          restaurant_id?: string
          status?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          cost_per_unit: number
          created_at: string
          current_stock: number
          id: string
          last_ordered_at: string | null
          last_ordered_quantity: number | null
          name: string
          notes: string | null
          par_level: number
          quality_rating: number | null
          reorder_interval_days: number
          reorder_level: number
          restaurant_id: string
          storage_area: string
          unit: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          last_ordered_at?: string | null
          last_ordered_quantity?: number | null
          name: string
          notes?: string | null
          par_level?: number
          quality_rating?: number | null
          reorder_interval_days?: number
          reorder_level?: number
          restaurant_id: string
          storage_area?: string
          unit: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          last_ordered_at?: string | null
          last_ordered_quantity?: number | null
          name?: string
          notes?: string | null
          par_level?: number
          quality_rating?: number | null
          reorder_interval_days?: number
          reorder_level?: number
          restaurant_id?: string
          storage_area?: string
          unit?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          quantity: number
          reason: string | null
          restaurant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          quantity: number
          reason?: string | null
          restaurant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          quantity?: number
          reason?: string | null
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_locations: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          location_id: string
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          location_id: string
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          location_id?: string
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_locations_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_outages: {
        Row: {
          back_at: string | null
          created_at: string
          id: string
          item_name: string
          note: string | null
          outage_date: string
          platform: string
          reported_by: string | null
          reported_by_email: string | null
          restaurant_id: string
        }
        Insert: {
          back_at?: string | null
          created_at?: string
          id?: string
          item_name: string
          note?: string | null
          outage_date?: string
          platform?: string
          reported_by?: string | null
          reported_by_email?: string | null
          restaurant_id: string
        }
        Update: {
          back_at?: string | null
          created_at?: string
          id?: string
          item_name?: string
          note?: string | null
          outage_date?: string
          platform?: string
          reported_by?: string | null
          reported_by_email?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_outages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_messages: {
        Row: {
          author_id: string
          author_name: string | null
          body: string
          created_at: string
          from_manager: boolean
          id: string
          thread_id: string
        }
        Insert: {
          author_id?: string
          author_name?: string | null
          body: string
          created_at?: string
          from_manager?: boolean
          id?: string
          thread_id: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          body?: string
          created_at?: string
          from_manager?: boolean
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "manager_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_notes: {
        Row: {
          author_id: string
          author_name: string | null
          body: string
          category: string
          created_at: string
          id: string
          restaurant_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          author_id?: string
          author_name?: string | null
          body: string
          category?: string
          created_at?: string
          id?: string
          restaurant_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          restaurant_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_notes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_tasks: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          completed_at: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          details: string | null
          due_date: string | null
          id: string
          restaurant_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          due_date?: string | null
          id?: string
          restaurant_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          due_date?: string | null
          id?: string
          restaurant_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_threads: {
        Row: {
          created_at: string
          id: string
          kind: string
          member_name: string | null
          member_user_id: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          member_name?: string | null
          member_user_id?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          member_name?: string | null
          member_user_id?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_threads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_lines: {
        Row: {
          acknowledged_at: string | null
          adjustments: number
          created_at: string
          employee_id: string
          hourly_rate: number
          hours: number
          id: string
          note: string | null
          paid: boolean
          paid_at: string | null
          paid_by: string | null
          pay_method: string
          period_id: string
          restaurant_id: string
          tips: number
          total: number
          updated_at: string
          wages: number
        }
        Insert: {
          acknowledged_at?: string | null
          adjustments?: number
          created_at?: string
          employee_id: string
          hourly_rate?: number
          hours?: number
          id?: string
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          paid_by?: string | null
          pay_method?: string
          period_id: string
          restaurant_id: string
          tips?: number
          total?: number
          updated_at?: string
          wages?: number
        }
        Update: {
          acknowledged_at?: string | null
          adjustments?: number
          created_at?: string
          employee_id?: string
          hourly_rate?: number
          hours?: number
          id?: string
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          paid_by?: string | null
          pay_method?: string
          period_id?: string
          restaurant_id?: string
          tips?: number
          total?: number
          updated_at?: string
          wages?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          note: string | null
          paid_at: string | null
          restaurant_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          note?: string | null
          paid_at?: string | null
          restaurant_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          restaurant_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connection_secrets: {
        Row: {
          connection_id: string
          created_at: string
          credentials: Json
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          credentials?: Json
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          credentials?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connection_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          account_label: string | null
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          platform: string
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          platform: string
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          platform?: string
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_payouts: {
        Row: {
          created_at: string
          fees: number
          id: string
          order_count: number
          other: number
          payout_date: string | null
          platform: string
          promotions: number
          reference_id: string
          refunds: number
          restaurant_id: string
          sales: number
          total_payout: number
        }
        Insert: {
          created_at?: string
          fees?: number
          id?: string
          order_count?: number
          other?: number
          payout_date?: string | null
          platform: string
          promotions?: number
          reference_id: string
          refunds?: number
          restaurant_id: string
          sales?: number
          total_payout?: number
        }
        Update: {
          created_at?: string
          fees?: number
          id?: string
          order_count?: number
          other?: number
          payout_date?: string | null
          platform?: string
          promotions?: number
          reference_id?: string
          refunds?: number
          restaurant_id?: string
          sales?: number
          total_payout?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_payouts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          item_name: string
          order_id: string
          platform: string
          rating_date: string | null
          rating_value: number | null
          restaurant_id: string
          tags: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          item_name?: string
          order_id: string
          platform: string
          rating_date?: string | null
          rating_value?: number | null
          restaurant_id: string
          tags?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          item_name?: string
          order_id?: string
          platform?: string
          rating_date?: string | null
          rating_value?: number | null
          restaurant_id?: string
          tags?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_ratings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_staff: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pos_sales_summaries: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          end_date: string
          id: string
          platform: string
          restaurant_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          end_date: string
          id?: string
          platform?: string
          restaurant_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          end_date?: string
          id?: string
          platform?: string
          restaurant_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_summaries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_restaurant_id: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          restaurant_name: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_restaurant_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          restaurant_name?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_restaurant_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          restaurant_name?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_restaurant_id_fkey"
            columns: ["active_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          restaurant_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          invited_by: string | null
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          invited_by?: string | null
          restaurant_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          invited_by?: string | null
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          owner_id: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          owner_id?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          owner_id?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          external_id: string | null
          fee_breakdown: Json | null
          fees: number | null
          fulfillment: string | null
          id: string
          order_number: string | null
          payout: number | null
          payout_date: string | null
          platform: string
          promotions: number | null
          restaurant_id: string
          status: string
          tax: number
          tip: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          fee_breakdown?: Json | null
          fees?: number | null
          fulfillment?: string | null
          id?: string
          order_number?: string | null
          payout?: number | null
          payout_date?: string | null
          platform: string
          promotions?: number | null
          restaurant_id: string
          status?: string
          tax?: number
          tip?: number
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          fee_breakdown?: Json | null
          fees?: number | null
          fulfillment?: string | null
          id?: string
          order_number?: string | null
          payout?: number | null
          payout_date?: string | null
          platform?: string
          promotions?: number | null
          restaurant_id?: string
          status?: string
          tax?: number
          tip?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_task_completions: {
        Row: {
          completed_at: string
          completed_by: string | null
          completed_by_email: string | null
          id: string
          note: string | null
          photo_path: string | null
          restaurant_id: string
          task_date: string
          task_id: string
          value: string | null
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          completed_by_email?: string | null
          id?: string
          note?: string | null
          photo_path?: string | null
          restaurant_id: string
          task_date?: string
          task_id: string
          value?: string | null
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          completed_by_email?: string | null
          id?: string
          note?: string | null
          photo_path?: string | null
          restaurant_id?: string
          task_date?: string
          task_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_task_completions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shift_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_task_notes: {
        Row: {
          author_email: string | null
          author_id: string | null
          created_at: string
          id: string
          note: string
          restaurant_id: string
          task_date: string
          task_id: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          created_at?: string
          id?: string
          note: string
          restaurant_id: string
          task_date: string
          task_id: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          created_at?: string
          id?: string
          note?: string
          restaurant_id?: string
          task_date?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_task_notes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shift_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_tasks: {
        Row: {
          active: boolean
          area: string
          created_at: string
          details: string | null
          id: string
          input_label: string | null
          input_type: string
          input_unit: string | null
          restaurant_id: string
          shift: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          created_at?: string
          details?: string | null
          id?: string
          input_label?: string | null
          input_type?: string
          input_unit?: string | null
          restaurant_id: string
          shift: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          created_at?: string
          details?: string | null
          id?: string
          input_label?: string | null
          input_type?: string
          input_unit?: string | null
          restaurant_id?: string
          shift?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          area: string
          created_at: string
          created_by: string | null
          employee_id: string
          end_time: string | null
          id: string
          note: string | null
          restaurant_id: string
          shift: string
          shift_date: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          area?: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_time?: string | null
          id?: string
          note?: string | null
          restaurant_id: string
          shift?: string
          shift_date: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_time?: string | null
          id?: string
          note?: string | null
          restaurant_id?: string
          shift?: string
          shift_date?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string
          entered_by: string | null
          id: string
          minutes: number
          note: string | null
          restaurant_id: string
          source: string
          updated_at: string
          work_date: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id: string
          entered_by?: string | null
          id?: string
          minutes?: number
          note?: string | null
          restaurant_id: string
          source?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          entered_by?: string | null
          id?: string
          minutes?: number
          note?: string | null
          restaurant_id?: string
          source?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_pools: {
        Row: {
          amount: number
          area: string
          created_at: string
          id: string
          note: string | null
          pool_date: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          area?: string
          created_at?: string
          id?: string
          note?: string | null
          pool_date: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          area?: string
          created_at?: string
          id?: string
          note?: string | null
          pool_date?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_pools_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          id: string
          inventory_item_id: string
          logged_at: string
          quantity: number
          restaurant_id: string
          sale_id: string | null
        }
        Insert: {
          id?: string
          inventory_item_id: string
          logged_at?: string
          quantity: number
          restaurant_id: string
          sale_id?: string | null
        }
        Update: {
          id?: string
          inventory_item_id?: string
          logged_at?: string
          quantity?: number
          restaurant_id?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_credentials: {
        Row: {
          created_at: string
          credentials: Json
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_credentials_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_order_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          name: string
          quantity: number
          restaurant_id: string
          unit_price: number
          vendor_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name: string
          quantity?: number
          restaurant_id: string
          unit_price?: number
          vendor_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name?: string
          quantity?: number
          restaurant_id?: string
          unit_price?: number
          vendor_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_order_items_vendor_order_id_fkey"
            columns: ["vendor_order_id"]
            isOneToOne: false
            referencedRelation: "vendor_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_orders: {
        Row: {
          created_at: string
          external_order_id: string | null
          id: string
          ordered_at: string
          restaurant_id: string
          source: string
          status: string
          total: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          ordered_at?: string
          restaurant_id: string
          source?: string
          status?: string
          total?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          ordered_at?: string
          restaurant_id?: string
          source?: string
          status?: string
          total?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          auto_sync: boolean
          contact_email: string | null
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          login_url: string | null
          name: string
          notes: string | null
          order_cadence_days: number
          order_days: number[]
          orders_url: string | null
          portal_type: string
          restaurant_id: string
          sync_status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          auto_sync?: boolean
          contact_email?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          login_url?: string | null
          name: string
          notes?: string | null
          order_cadence_days?: number
          order_days?: number[]
          orders_url?: string | null
          portal_type?: string
          restaurant_id: string
          sync_status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          auto_sync?: boolean
          contact_email?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          login_url?: string | null
          name?: string
          notes?: string | null
          order_cadence_days?: number
          order_days?: number[]
          orders_url?: string | null
          portal_type?: string
          restaurant_id?: string
          sync_status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_restaurant: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
      can_see_manager_thread: { Args: { _thread_id: string }; Returns: boolean }
      is_platform_staff: { Args: never; Returns: boolean }
      is_restaurant_member: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
      my_employee_ids: { Args: never; Returns: string[] }
      restaurant_role: {
        Args: { _restaurant_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "manager", "staff"],
    },
  },
} as const
