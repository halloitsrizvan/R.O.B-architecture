import rawProjects from './projects.json';

export interface ProjectImage {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
}

export interface ProjectDetailsData {
  title: string;
  label: string;
  description: string;
  facts: { label: string; value: string }[];
  inquiryUrl: string;
  images: ProjectImage[];
  previous: { href: string; title: string };
  next: { href: string; title: string };
}

export type ProjectSlug = keyof typeof rawProjects;
export const projects: Record<ProjectSlug, ProjectDetailsData> = rawProjects;
