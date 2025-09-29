// types/editor.ts

export type ElementType =
  | 'section'
  | 'navbar'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'text-field'
  | 'blocks'
  | 'steps'
  | 'step-block'
  | 'step-connector';

export interface Element {
  id: string;
  type: ElementType;
  content?: string;
  styles?: { [key: string]: string };
  children?: Element[];
}

export type PageContent = Element[];

export interface PageStyles {
  fontFamily?: string;
  backgroundColor?: string;
  [key: string]: string | undefined;
}

export interface SiteData {
  id: string;
  ownerId: string;
  title: string;
  subdomain: string;
  content: PageContent;
  pageStyles: PageStyles;
  createdAt?: object;
  stats?: { views: number; posts: number };
  status?: string;
}