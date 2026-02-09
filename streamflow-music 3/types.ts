
export interface MusicItem {
  id: string;
  title: string;
  artist: string;
  description: string;
  thumbnailUrl: string;
  backdropUrl: string;
  youtubeId: string;
  matchScore?: number;
  year?: string;
  duration?: string;
  genre?: string;
  lyricsSnippet?: string;
}

export interface SearchGroup {
  theme: string;
  items: MusicItem[];
}

export interface SearchResponse {
  id: string;
  title: string;
  groups: SearchGroup[];
  allGenres: string[];
}

export interface Playlist {
  id: string;
  name: string;
  items: MusicItem[];
  createdAt: number;
}

export interface Category {
  id: string;
  title: string;
  items: MusicItem[];
}

export interface Album {
  id: string;
  title: string;
  year: string;
  songs: MusicItem[];
}

export interface ArtistDetails {
  id: string;
  name: string;
  bio: string;
  backdropUrl: string;
  matchScore: number;
  tags: string[];
  albums: Album[];
}

export interface AppData {
  hero: MusicItem;
  categories: Category[];
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  isKid: boolean;
}

export interface WatchProgress {
  itemId: string;
  timestamp: number;
  lastWatched: number;
  item: MusicItem;
}
