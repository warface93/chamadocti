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
      equipment_inventory: {
        Row: {
          active: boolean
          brand: string
          created_at: string
          current_meeting_id: string | null
          id: string
          status: string
          tombamento: string | null
          total_quantity: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand: string
          created_at?: string
          current_meeting_id?: string | null
          id?: string
          status?: string
          tombamento?: string | null
          total_quantity?: number
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string
          created_at?: string
          current_meeting_id?: string | null
          id?: string
          status?: string
          tombamento?: string | null
          total_quantity?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inventory_current_meeting_id_fkey"
            columns: ["current_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_admin_items: {
        Row: {
          description: string
          equipment_id: string | null
          id: string
          loaned_at: string
          meeting_id: string
          quantity: number
          returned_at: string | null
          tombamento: string | null
        }
        Insert: {
          description: string
          equipment_id?: string | null
          id?: string
          loaned_at?: string
          meeting_id: string
          quantity?: number
          returned_at?: string | null
          tombamento?: string | null
        }
        Update: {
          description?: string
          equipment_id?: string | null
          id?: string
          loaned_at?: string
          meeting_id?: string
          quantity?: number
          returned_at?: string | null
          tombamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_admin_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_admin_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_equipment: {
        Row: {
          equipment: string
          id: string
          meeting_id: string
        }
        Insert: {
          equipment: string
          id?: string
          meeting_id: string
        }
        Update: {
          equipment?: string
          id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_equipment_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_by_name: string | null
          created_at: string
          end_time: string
          id: string
          link_creator: string | null
          link_platform: string | null
          location: string
          meeting_date: string
          off_hours_justification: string | null
          other_description: string | null
          ramal: string | null
          start_time: string
          status: string
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_name?: string | null
          created_at?: string
          end_time: string
          id?: string
          link_creator?: string | null
          link_platform?: string | null
          location: string
          meeting_date: string
          off_hours_justification?: string | null
          other_description?: string | null
          ramal?: string | null
          start_time: string
          status?: string
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_name?: string | null
          created_at?: string
          end_time?: string
          id?: string
          link_creator?: string | null
          link_platform?: string | null
          location?: string
          meeting_date?: string
          off_hours_justification?: string | null
          other_description?: string | null
          ramal?: string | null
          start_time?: string
          status?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          sector_id: string | null
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id: string
          name: string
          phone?: string | null
          sector_id?: string | null
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          sector_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_id: string | null
          admin_name: string | null
          admin_note: string | null
          created_at: string
          equipment_id: string | null
          id: string
          item_id: string
          meeting_id: string
          quantity: number
          reason: string
          requested_by: string
          requested_by_name: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_id?: string | null
          admin_name?: string | null
          admin_note?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          item_id: string
          meeting_id: string
          quantity: number
          reason: string
          requested_by?: string
          requested_by_name?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_id?: string | null
          admin_name?: string | null
          admin_note?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          item_id?: string
          meeting_id?: string
          quantity?: number
          reason?: string
          requested_by?: string
          requested_by_name?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "meeting_admin_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          active: boolean | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_history: {
        Row: {
          action: string
          actor_id: string
          actor_name: string | null
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
        }
        Insert: {
          action: string
          actor_id?: string
          actor_name?: string | null
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string | null
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          admin_last_read_at: string | null
          assigned_admin_id: string | null
          assigned_admin_name: string | null
          attachment_url: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_new: boolean | null
          rating: number | null
          resolution_note: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          title: string
          updated_at: string | null
          user_id: string
          user_last_read_at: string | null
        }
        Insert: {
          admin_last_read_at?: string | null
          assigned_admin_id?: string | null
          assigned_admin_name?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_new?: boolean | null
          rating?: number | null
          resolution_note?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          user_last_read_at?: string | null
        }
        Update: {
          admin_last_read_at?: string | null
          assigned_admin_id?: string | null
          assigned_admin_name?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_new?: boolean | null
          rating?: number | null
          resolution_note?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          user_last_read_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      add_meeting_equipment: {
        Args: { _items: string[]; _meeting_id: string }
        Returns: undefined
      }
      cancel_meeting:
        | { Args: { _meeting_id: string }; Returns: undefined }
        | {
            Args: { _meeting_id: string; _reason?: string }
            Returns: undefined
          }
      check_has_users: { Args: never; Returns: boolean }
      confirm_return_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      equipment_loaned_qty: { Args: { _equipment_id: string }; Returns: number }
      equipment_type_available: { Args: { _option: string }; Returns: number }
      get_email_by_username: { Args: { _username: string }; Returns: string }
      get_meeting_user_names: {
        Args: never
        Returns: {
          name: string
          user_id: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_ticket_owner: {
        Args: { _ticket_id: string; _user_id: string }
        Returns: boolean
      }
      loan_equipment: {
        Args: { _equipment_id: string; _meeting_id: string; _quantity: number }
        Returns: string
      }
      refresh_equipment_status: {
        Args: { _equipment_id: string }
        Returns: undefined
      }
      return_loan_item: {
        Args: { _item_id: string; _quantity?: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
