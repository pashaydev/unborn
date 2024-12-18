export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      commands: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          once: boolean | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          once?: boolean | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          once?: boolean | null
        }
        Relationships: []
      }
      history: {
        Row: {
          bot_response: string | null
          created_at: string
          id: number
          user_id: string | null
          user_input: string | null
        }
        Insert: {
          bot_response?: string | null
          created_at?: string
          id?: number
          user_id?: string | null
          user_input?: string | null
        }
        Update: {
          bot_response?: string | null
          created_at?: string
          id?: number
          user_id?: string | null
          user_input?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      interactions: {
        Row: {
          action_name: string
          count: number | null
          created_at: string
          id: number
          tokens: number | null
          user_id: string | null
        }
        Insert: {
          action_name: string
          count?: number | null
          created_at?: string
          id?: number
          tokens?: number | null
          user_id?: string | null
        }
        Update: {
          action_name?: string
          count?: number | null
          created_at?: string
          id?: number
          tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_action_name_fkey"
            columns: ["action_name"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scrapper_results: {
        Row: {
          action_name: string | null
          created_at: string
          id: number
          query: string | null
          results: string | null
          user_id: string | null
        }
        Insert: {
          action_name?: string | null
          created_at?: string
          id?: number
          query?: string | null
          results?: string | null
          user_id?: string | null
        }
        Update: {
          action_name?: string | null
          created_at?: string
          id?: number
          query?: string | null
          results?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrapper_results_action_name_fkey"
            columns: ["action_name"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "scrapper_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string
          description: string | null
          file_link: string | null
          id: number
          server_address: string
          server_name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_link?: string | null
          id?: number
          server_address: string
          server_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_link?: string | null
          id?: number
          server_address?: string
          server_name?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          active_command: string | null
          chat_id: string
          created_at: string
          email: string | null
          from: string | null
          hash_pass: string | null
          id: number
          ip: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          active_command?: string | null
          chat_id: string
          created_at?: string
          email?: string | null
          from?: string | null
          hash_pass?: string | null
          id?: number
          ip?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          active_command?: string | null
          chat_id?: string
          created_at?: string
          email?: string | null
          from?: string | null
          hash_pass?: string | null
          id?: number
          ip?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
