// Database row types for the Neon PostgreSQL migration.
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
