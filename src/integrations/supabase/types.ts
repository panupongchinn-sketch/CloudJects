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
      admin_audit_logs: {
        Row: {
          action: string
          created_at: string
          detail_json: Json | null
          id: string
          ip_address: string | null
          organization_id: string | null
          platform_admin_id: string | null
          ref_id: string | null
          ref_type: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail_json?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          platform_admin_id?: string | null
          ref_id?: string | null
          ref_type?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail_json?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          platform_admin_id?: string | null
          ref_id?: string | null
          ref_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_platform_admin_id_fkey"
            columns: ["platform_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approver_id: string | null
          created_at: string
          decided_at: string | null
          id: string
          note: string | null
          project_id: string
          ref_id: string | null
          ref_type: Database["public"]["Enums"]["approval_ref_type"]
          requester_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          project_id: string
          ref_id?: string | null
          ref_type: Database["public"]["Enums"]["approval_ref_type"]
          requester_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          project_id?: string
          ref_id?: string | null
          ref_type?: Database["public"]["Enums"]["approval_ref_type"]
          requester_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string | null
          created_at: string
          image_path: string | null
          id: string
          project_id: string
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          image_path?: string | null
          id?: string
          project_id: string
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          image_path?: string | null
          id?: string
          project_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          assignee_id: string | null
          created_at: string
          done: boolean
          id: string
          ordering: number
          project_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          done?: boolean
          id?: string
          ordering?: number
          project_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          done?: boolean
          id?: string
          ordering?: number
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string
          phone?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          created_at: string
          id: string
          project_id: string
          report_date: string
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          summary: string | null
          updated_at: string
          weather: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          report_date: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          summary?: string | null
          updated_at?: string
          weather?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          report_date?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          summary?: string | null
          updated_at?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approval_logs: {
        Row: {
          acted_at: string
          acted_by: string | null
          action: string
          approval_id: string | null
          comment: string | null
          created_at: string
          document_id: string
          id: string
          new_status: string | null
          old_status: string | null
          organization_id: string
        }
        Insert: {
          acted_at?: string
          acted_by?: string | null
          action: string
          approval_id?: string | null
          comment?: string | null
          created_at?: string
          document_id: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          organization_id: string
        }
        Update: {
          acted_at?: string
          acted_by?: string | null
          action?: string
          approval_id?: string | null
          comment?: string | null
          created_at?: string
          document_id?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_approval_logs_acted_by_fkey"
            columns: ["acted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approval_logs_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "document_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approval_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          document_id: string
          document_version_id: string | null
          id: string
          organization_id: string
          project_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          requested_at: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_note: string | null
          status: Database["public"]["Enums"]["document_approval_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_id: string
          document_version_id?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_note?: string | null
          status?: Database["public"]["Enums"]["document_approval_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_id?: string
          document_version_id?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_note?: string | null
          status?: Database["public"]["Enums"]["document_approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_audit_logs: {
        Row: {
          action: string
          created_at: string
          detail_json: Json | null
          document_id: string | null
          document_version_id: string | null
          id: string
          ip_address: string | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail_json?: Json | null
          document_id?: string | null
          document_version_id?: string | null
          id?: string
          ip_address?: string | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail_json?: Json | null
          document_id?: string | null
          document_version_id?: string | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_audit_logs_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_shares: {
        Row: {
          can_download: boolean
          can_view: boolean
          created_at: string
          document_id: string
          expires_at: string | null
          id: string
          organization_id: string
          shared_by: string | null
          shared_with_role: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          can_download?: boolean
          can_view?: boolean
          created_at?: string
          document_id: string
          expires_at?: string | null
          id?: string
          organization_id: string
          shared_by?: string | null
          shared_with_role?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          can_download?: boolean
          can_view?: boolean
          created_at?: string
          document_id?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          shared_by?: string | null
          shared_with_role?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          body_html: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          document_category_id: string | null
          document_type_id: string | null
          fields_json: Json
          id: string
          is_active: boolean
          name: string
          organization_id: string
          orientation: string
          paper_size: string
          requires_approval: boolean
          template_type: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_category_id?: string | null
          document_type_id?: string | null
          fields_json?: Json
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          orientation?: string
          paper_size?: string
          requires_approval?: boolean
          template_type?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_category_id?: string | null
          document_type_id?: string | null
          fields_json?: Json
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          orientation?: string
          paper_size?: string
          requires_approval?: boolean
          template_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          allow_client_view: boolean
          category_id: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_confidential: boolean
          name: string
          organization_id: string
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          allow_client_view?: boolean
          category_id?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_confidential?: boolean
          name: string
          organization_id?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          allow_client_view?: boolean
          category_id?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_confidential?: boolean
          name?: string
          organization_id?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_note: string | null
          created_at: string
          document_id: string
          file_extension: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          file_url: string | null
          id: string
          is_current: boolean
          organization_id: string
          status: Database["public"]["Enums"]["document_status"]
          uploaded_at: string
          uploaded_by: string | null
          version_no: string
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          document_id: string
          file_extension?: string | null
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_current?: boolean
          organization_id: string
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_at?: string
          uploaded_by?: string | null
          version_no: string
        }
        Update: {
          change_note?: string | null
          created_at?: string
          document_id?: string
          file_extension?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_current?: boolean
          organization_id?: string
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_at?: string
          uploaded_by?: string | null
          version_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          document_category_id: string | null
          document_name: string
          document_no: string | null
          document_type_id: string | null
          expiry_date: string | null
          id: string
          is_confidential: boolean
          organization_id: string
          project_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          report_id: string | null
          revision_note: string | null
          share_to_client: boolean
          status: Database["public"]["Enums"]["document_status"]
          submitted_at: string | null
          submitted_by: string | null
          tags: string[] | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          document_category_id?: string | null
          document_name: string
          document_no?: string | null
          document_type_id?: string | null
          expiry_date?: string | null
          id?: string
          is_confidential?: boolean
          organization_id: string
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          report_id?: string | null
          revision_note?: string | null
          share_to_client?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tags?: string[] | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          document_category_id?: string | null
          document_name?: string
          document_no?: string | null
          document_type_id?: string | null
          expiry_date?: string | null
          id?: string
          is_confidential?: boolean
          organization_id?: string
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          report_id?: string | null
          revision_note?: string | null
          share_to_client?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tags?: string[] | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_category_id_fkey"
            columns: ["document_category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string
          document_id: string | null
          file_path: string | null
          file_url: string | null
          generated_at: string
          generated_by: string | null
          generated_type: string
          id: string
          organization_id: string
          project_id: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          file_path?: string | null
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          generated_type: string
          id?: string
          organization_id: string
          project_id?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          file_path?: string | null
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          generated_type?: string
          id?: string
          organization_id?: string
          project_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          billing_month: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_no: string
          invoice_url: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_month?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_no: string
          invoice_url?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_month?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_no?: string
          invoice_url?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at: string | null
          created_at: string
          end_date: string | null
          id: string
          monthly_price: number
          next_billing_date: string | null
          organization_id: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_price?: number
          next_billing_date?: string | null
          organization_id: string
          plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_price?: number
          next_billing_date?: string | null
          organization_id?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          note: string | null
          organization_id: string
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          organization_id: string
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          project_id: string
          storage_path: string
          taken_at: string | null
          task_id: string | null
          uploader_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          project_id: string
          storage_path: string
          taken_at?: string | null
          task_id?: string | null
          uploader_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          project_id?: string
          storage_path?: string
          taken_at?: string | null
          task_id?: string | null
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      login_advertisements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_path: string
          is_active: boolean
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path: string
          is_active?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string
          is_active?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          code: string
          created_at: string
          created_by: string | null
          end_date: string | null
          header_background: string | null
          id: string
          location: string | null
          manager_id: string | null
          name: string
          organization_id: string
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          header_background?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          organization_id?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          header_background?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          organization_id?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          can_use_advanced_approval: boolean
          can_use_api: boolean
          can_use_client_portal: boolean
          can_use_custom_form: boolean
          can_use_gantt: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_projects: number
          max_storage_gb: number
          max_users: number
          monthly_price: number
          name: string
          sort_order: number
          updated_at: string
          yearly_price: number | null
        }
        Insert: {
          can_use_advanced_approval?: boolean
          can_use_api?: boolean
          can_use_client_portal?: boolean
          can_use_custom_form?: boolean
          can_use_gantt?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_projects?: number
          max_storage_gb?: number
          max_users?: number
          monthly_price?: number
          name: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number | null
        }
        Update: {
          can_use_advanced_approval?: boolean
          can_use_api?: boolean
          can_use_client_portal?: boolean
          can_use_custom_form?: boolean
          can_use_gantt?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_projects?: number
          max_storage_gb?: number
          max_users?: number
          monthly_price?: number
          name?: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number | null
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          calculated_at: string
          created_at: string
          documents_count: number
          id: string
          organization_id: string
          photos_count: number
          projects_count: number
          reports_count: number
          storage_used_mb: number
          subscription_id: string | null
          tasks_count: number
          usage_month: string | null
          users_count: number
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          documents_count?: number
          id?: string
          organization_id: string
          photos_count?: number
          projects_count?: number
          reports_count?: number
          storage_used_mb?: number
          subscription_id?: string | null
          tasks_count?: number
          usage_month?: string | null
          users_count?: number
        }
        Update: {
          calculated_at?: string
          created_at?: string
          documents_count?: number
          id?: string
          organization_id?: string
          photos_count?: number
          projects_count?: number
          reports_count?: number
          storage_used_mb?: number
          subscription_id?: string | null
          tasks_count?: number
          usage_month?: string | null
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          parent_id: string | null
          priority: Database["public"]["Enums"]["priority"]
          progress: number
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          progress?: number
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          progress?: number
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve_document: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      can_delete_document: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_project: { Args: { _user_id: string }; Returns: boolean }
      can_update_document: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      can_upload_document: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_document: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      get_my_organization_id: { Args: { _user_id: string }; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_company_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      same_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "company_admin"
        | "project_manager"
        | "site_engineer"
        | "foreman"
        | "client"
        | "viewer"
      approval_ref_type:
        | "Daily Report"
        | "Document"
        | "Checklist"
        | "Change Request"
        | "Task Completion"
        | "Defect Close"
      approval_status: "Pending" | "Approved" | "Rejected" | "Cancelled"
      billing_cycle: "monthly" | "yearly"
      document_approval_status:
        | "Pending"
        | "Reviewing"
        | "Approved"
        | "Rejected"
        | "Revision Required"
        | "Cancelled"
      document_status:
        | "Draft"
        | "Submitted"
        | "Waiting Review"
        | "Waiting Approval"
        | "Approved"
        | "Rejected"
        | "Revision Required"
        | "Archived"
        | "Cancelled"
      invoice_status: "paid" | "pending" | "overdue" | "cancelled"
      org_status: "active" | "trial" | "suspended" | "cancelled" | "expired"
      payment_status: "paid" | "pending" | "failed" | "overdue"
      priority: "Low" | "Medium" | "High" | "Urgent"
      project_status:
        | "Planning"
        | "In Progress"
        | "On Hold"
        | "Completed"
        | "Cancelled"
      report_status: "Draft" | "Submitted" | "Approved" | "Rejected"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "suspended"
        | "cancelled"
        | "expired"
      task_status:
        | "To Do"
        | "In Progress"
        | "Waiting Review"
        | "Waiting Approval"
        | "Completed"
        | "Rejected"
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
      app_role: [
        "super_admin",
        "company_admin",
        "project_manager",
        "site_engineer",
        "foreman",
        "client",
        "viewer",
      ],
      approval_ref_type: [
        "Daily Report",
        "Document",
        "Checklist",
        "Change Request",
        "Task Completion",
        "Defect Close",
      ],
      approval_status: ["Pending", "Approved", "Rejected", "Cancelled"],
      billing_cycle: ["monthly", "yearly"],
      document_approval_status: [
        "Pending",
        "Reviewing",
        "Approved",
        "Rejected",
        "Revision Required",
        "Cancelled",
      ],
      document_status: [
        "Draft",
        "Submitted",
        "Waiting Review",
        "Waiting Approval",
        "Approved",
        "Rejected",
        "Revision Required",
        "Archived",
        "Cancelled",
      ],
      invoice_status: ["paid", "pending", "overdue", "cancelled"],
      org_status: ["active", "trial", "suspended", "cancelled", "expired"],
      payment_status: ["paid", "pending", "failed", "overdue"],
      priority: ["Low", "Medium", "High", "Urgent"],
      project_status: [
        "Planning",
        "In Progress",
        "On Hold",
        "Completed",
        "Cancelled",
      ],
      report_status: ["Draft", "Submitted", "Approved", "Rejected"],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "suspended",
        "cancelled",
        "expired",
      ],
      task_status: [
        "To Do",
        "In Progress",
        "Waiting Review",
        "Waiting Approval",
        "Completed",
        "Rejected",
      ],
    },
  },
} as const
