/// <reference types="vite/client" />

interface Book {
  id: number;
  title: string;
  filepath: string;
  added_at: string;
  last_read_page: number;
  total_pages: number;
  last_read_at: string | null;
  cover_image: string | null;
  is_removed: number;
  author?: string;
  subject?: string;
  keywords?: string;
  is_favorite: number;
  tags?: string;
}

interface Window {
  merlin: {
    invoke(channel: 'get-library'): Promise<Book[]>;
    invoke(channel: 'add-book', filepath: string): Promise<void>;
    invoke(channel: 'scan-folder', folderPath: string): Promise<number>;
    invoke(channel: 'remove-book', id: number): Promise<void>;
    invoke(channel: 'update-progress', id: number, page: number): Promise<void>;
    invoke(channel: 'update-meta', id: number, totalPages: number): Promise<void>;
    invoke(channel: 'update-cover', id: number, coverImage: string): Promise<void>;
    invoke(channel: 'toggle-favorite', id: number): Promise<void>;
    invoke(channel: 'update-tags', id: number, tags: string): Promise<void>;
    invoke(channel: 'select-folder'): Promise<string | null>;
    on(channel: string, listener: (...args: any[]) => void): () => void;
    off(channel: string, listener: (...args: any[]) => void): void;
  }
}
