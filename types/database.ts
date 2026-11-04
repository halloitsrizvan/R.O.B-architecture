// Mirrors the checked-in migration. Regenerate from Supabase after connecting a hosted project.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProjectRow = {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  facts: Json;
  sort_order: number;
  featured: boolean;
  published: boolean;
  created_at: string;
};

export type ProjectImageRow = {
  id: string;
  project_slug: string;
  src: string;
  alt: string;
  src_set: string | null;
  sizes: string | null;
  sort_order: number;
};

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  service: string;
  message: string;
  status: string;
  request_hash: string;
  created_at: string;
};

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Insert>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      projects: Table<ProjectRow, Omit<ProjectRow, 'created_at'> & { created_at?: string }>;
      project_images: Table<ProjectImageRow, Omit<ProjectImageRow, 'id'> & { id?: string }>;
      contact_inquiries: Table<
        InquiryRow,
        Omit<InquiryRow, 'id' | 'created_at' | 'status'> & {
          id?: string;
          created_at?: string;
          status?: string;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      submit_contact_inquiry: {
        Args: {
          p_name: string;
          p_email: string;
          p_service: string;
          p_message: string;
          p_request_hash: string;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
