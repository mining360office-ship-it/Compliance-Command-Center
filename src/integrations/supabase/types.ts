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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      authorities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      compliances: {
        Row: {
          approval_workflow: Json | null
          authority: string
          category: string | null
          completion_date: string | null
          created_at: string
          department: string | null
          documents: Json | null
          due_date: string | null
          id: string
          lease: string | null
          mine: string | null
          notes: string | null
          priority: string
          responsible_person: string | null
          sr_no: number
          status: string
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          approval_workflow?: Json | null
          authority: string
          category?: string | null
          completion_date?: string | null
          created_at?: string
          department?: string | null
          documents?: Json | null
          due_date?: string | null
          id?: string
          lease?: string | null
          mine?: string | null
          notes?: string | null
          priority?: string
          responsible_person?: string | null
          sr_no?: number
          status?: string
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          approval_workflow?: Json | null
          authority?: string
          category?: string | null
          completion_date?: string | null
          created_at?: string
          department?: string | null
          documents?: Json | null
          due_date?: string | null
          id?: string
          lease?: string | null
          mine?: string | null
          notes?: string | null
          priority?: string
          responsible_person?: string | null
          sr_no?: number
          status?: string
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          folder: string | null
          id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          upload_date: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          folder?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          folder?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      inspection_observations: {
        Row: {
          closed_date: string | null
          closure_status: string
          corrective_action: string | null
          created_at: string
          evidence: Json
          id: string
          inspection_id: string
          observation: string
          responsible_person: string | null
          severity: string
          sort_order: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          closed_date?: string | null
          closure_status?: string
          corrective_action?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          inspection_id: string
          observation: string
          responsible_person?: string | null
          severity?: string
          sort_order?: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          closed_date?: string | null
          closure_status?: string
          corrective_action?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          inspection_id?: string
          observation?: string
          responsible_person?: string | null
          severity?: string
          sort_order?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_observations_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          authority: string
          closed_date: string | null
          closure_status: string
          created_at: string
          department: string | null
          evidence: Json
          id: string
          inspection_date: string
          inspection_number: string | null
          inspection_type: string | null
          mine: string | null
          officer: string | null
          overall_severity: string
          responsible_person: string | null
          scope: string | null
          summary: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          authority: string
          closed_date?: string | null
          closure_status?: string
          created_at?: string
          department?: string | null
          evidence?: Json
          id?: string
          inspection_date: string
          inspection_number?: string | null
          inspection_type?: string | null
          mine?: string | null
          officer?: string | null
          overall_severity?: string
          responsible_person?: string | null
          scope?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          authority?: string
          closed_date?: string | null
          closure_status?: string
          created_at?: string
          department?: string | null
          evidence?: Json
          id?: string
          inspection_date?: string
          inspection_number?: string | null
          inspection_type?: string | null
          mine?: string | null
          officer?: string | null
          overall_severity?: string
          responsible_person?: string | null
          scope?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      leases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          authority: string | null
          created_at: string
          documents: Json
          expiry_date: string | null
          id: string
          issue_date: string | null
          license_name: string
          license_number: string | null
          mine: string | null
          notes: string | null
          renewal_date: string | null
          responsible_person: string | null
          status: string
          updated_at: string
        }
        Insert: {
          authority?: string | null
          created_at?: string
          documents?: Json
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          license_name: string
          license_number?: string | null
          mine?: string | null
          notes?: string | null
          renewal_date?: string | null
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          authority?: string | null
          created_at?: string
          documents?: Json
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          license_name?: string
          license_number?: string | null
          mine?: string | null
          notes?: string | null
          renewal_date?: string | null
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          authority: string
          closed_date: string | null
          created_at: string
          department: string | null
          documents: Json
          id: string
          legal_remarks: string | null
          mine: string | null
          notice_number: string
          received_date: string
          reminder_dates: string[]
          reminder_days: number[]
          reply_due_date: string
          reply_period_days: number
          responsible_person: string | null
          risk_level: string
          status: string
          subject: string
          tags: string[] | null
          timeline: Json
          updated_at: string
        }
        Insert: {
          authority: string
          closed_date?: string | null
          created_at?: string
          department?: string | null
          documents?: Json
          id?: string
          legal_remarks?: string | null
          mine?: string | null
          notice_number: string
          received_date: string
          reminder_dates?: string[]
          reminder_days?: number[]
          reply_due_date: string
          reply_period_days?: number
          responsible_person?: string | null
          risk_level?: string
          status?: string
          subject: string
          tags?: string[] | null
          timeline?: Json
          updated_at?: string
        }
        Update: {
          authority?: string
          closed_date?: string | null
          created_at?: string
          department?: string | null
          documents?: Json
          id?: string
          legal_remarks?: string | null
          mine?: string | null
          notice_number?: string
          received_date?: string
          reminder_dates?: string[]
          reminder_days?: number[]
          reply_due_date?: string
          reply_period_days?: number
          responsible_person?: string | null
          risk_level?: string
          status?: string
          subject?: string
          tags?: string[] | null
          timeline?: Json
          updated_at?: string
        }
        Relationships: []
      }
      priorities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      responsible_persons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      statuses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login: string | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          role?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          role?: string
          status?: string
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
    Enums: {},
  },
} as const
