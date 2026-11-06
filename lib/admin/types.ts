export type AdminSection = 'overview' | 'projects' | 'inbox' | 'settings';

export interface AdminImage {
  id: string;
  src: string;
  alt: string;
  sortOrder: number;
}

export interface AdminProject {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  published: boolean;
  featured: boolean;
  sortOrder: number;
  images: AdminImage[];
}

export interface AdminInquiry {
  id: string;
  name: string;
  email: string;
  service: string;
  message: string;
  status: 'new' | 'contacted' | 'archived';
  createdAt: string;
}

export interface AdminData {
  preview: boolean;
  email: string | null;
  projects: AdminProject[];
  inquiries: AdminInquiry[];
  error?: string;
  realtime?: {
    url: string;
    userId: string;
    sealedQuery: import('@neon/realtime/client').SealedLiveQuery<
      import('../neon/realtime').LiveInquiry
    >;
  };
  liveState?: 'live' | 'connecting' | 'error';
}

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };
