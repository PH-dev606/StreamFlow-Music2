
import { MusicItem, Profile, WatchProgress, Playlist } from '../types';

const KEYS = {
  PROFILES: 'streamflow_profiles',
  MY_LIST: 'streamflow_mylist_',
  HISTORY: 'streamflow_history_',
  PROGRESS: 'streamflow_progress_',
  DOWNLOADS: 'streamflow_downloads_',
  PLAYLISTS: 'streamflow_playlists_',
  PENDING_DOWNLOADS: 'streamflow_pending_downloads_',
};

const safeParse = <T>(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

// --- Profiles ---
export const getProfiles = (): Profile[] => {
  const defaults: Profile[] = [
      { id: '1', name: 'Adulto', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', isKid: false },
      { id: '2', name: 'Crianças', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy', isKid: true },
  ];
  const stored = localStorage.getItem(KEYS.PROFILES);
  if (!stored) {
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(stored);
};

export const addProfile = (profile: Omit<Profile, 'id'>): Profile[] => {
  const profiles = getProfiles();
  const newProfile = { ...profile, id: `p-${Date.now()}` };
  const updated = [...profiles, newProfile];
  localStorage.setItem(KEYS.PROFILES, JSON.stringify(updated));
  return updated;
};

export const updateProfile = (profileId: string, updates: Partial<Profile>): Profile[] => {
  const profiles = getProfiles();
  const updated = profiles.map(p => p.id === profileId ? { ...p, ...updates } : p);
  localStorage.setItem(KEYS.PROFILES, JSON.stringify(updated));
  return updated;
};

export const deleteProfile = (profileId: string): Profile[] => {
  const profiles = getProfiles();
  const updated = profiles.filter(p => p.id !== profileId);
  localStorage.setItem(KEYS.PROFILES, JSON.stringify(updated));
  return updated;
};

// --- Playlists ---
export const getPlaylists = (profileId: string): Playlist[] => {
  return safeParse<Playlist[]>(`${KEYS.PLAYLISTS}${profileId}`, []);
};

export const createPlaylist = (profileId: string, name: string): Playlist => {
  const playlists = getPlaylists(profileId);
  const newPlaylist: Playlist = {
    id: `pl-${Date.now()}`,
    name,
    items: [],
    createdAt: Date.now()
  };
  localStorage.setItem(`${KEYS.PLAYLISTS}${profileId}`, JSON.stringify([...playlists, newPlaylist]));
  return newPlaylist;
};

export const addToPlaylist = (profileId: string, playlistId: string, item: MusicItem) => {
  const playlists = getPlaylists(profileId);
  const updated = playlists.map(pl => {
    if (pl.id === playlistId && !pl.items.find(i => i.id === item.id)) {
      return { ...pl, items: [item, ...pl.items] };
    }
    return pl;
  });
  localStorage.setItem(`${KEYS.PLAYLISTS}${profileId}`, JSON.stringify(updated));
  triggerBackgroundDownload(profileId, item, 2); // Prioridade média
};

// --- Downloads Avançados ---
export const getDownloads = (profileId: string): MusicItem[] => safeParse<MusicItem[]>(`${KEYS.DOWNLOADS}${profileId}`, []);

export const isDownloaded = (profileId: string, itemId: string) => !!getDownloads(profileId).find(i => i.id === itemId);

export const toggleDownload = (profileId: string, item: MusicItem) => {
  const downloads = getDownloads(profileId);
  const exists = downloads.find(i => i.id === item.id);
  const newDownloads = exists ? downloads.filter(i => i.id !== item.id) : [item, ...downloads];
  localStorage.setItem(`${KEYS.DOWNLOADS}${profileId}`, JSON.stringify(newDownloads));
  
  if (exists) {
    // Remove da fila de pendentes se existir
    const pending = getPendingDownloads(profileId);
    localStorage.setItem(`${KEYS.PENDING_DOWNLOADS}${profileId}`, JSON.stringify(pending.filter(id => id !== item.id)));
  }
};

// Sistema de Fila Inteligente (Priorizada)
export const triggerBackgroundDownload = (profileId: string, item: MusicItem, priority: number = 1) => {
  if (isDownloaded(profileId, item.id) || !navigator.onLine) return;
  
  const pending = safeParse<string[]>(`${KEYS.PENDING_DOWNLOADS}${profileId}`, []);
  
  // Se já está na fila, coloca no topo se a prioridade for alta
  if (pending.includes(item.id)) {
    if (priority > 1) {
      const filtered = pending.filter(id => id !== item.id);
      localStorage.setItem(`${KEYS.PENDING_DOWNLOADS}${profileId}`, JSON.stringify([item.id, ...filtered]));
    }
    return;
  }
  
  // Adiciona ao topo se for prioridade alta (Histórico/Lista manual), senão ao final
  const newList = priority > 1 ? [item.id, ...pending] : [...pending, item.id];
  localStorage.setItem(`${KEYS.PENDING_DOWNLOADS}${profileId}`, JSON.stringify(newList));
};

export const getPendingDownloads = (profileId: string): string[] => safeParse<string[]>(`${KEYS.PENDING_DOWNLOADS}${profileId}`, []);

export const completeDownload = (profileId: string, item: MusicItem) => {
  if (!isDownloaded(profileId, item.id)) {
    const downloads = getDownloads(profileId);
    localStorage.setItem(`${KEYS.DOWNLOADS}${profileId}`, JSON.stringify([item, ...downloads]));
  }
  const pending = getPendingDownloads(profileId);
  localStorage.setItem(`${KEYS.PENDING_DOWNLOADS}${profileId}`, JSON.stringify(pending.filter(id => id !== item.id)));
};

// --- My List & History ---
export const getMyList = (profileId: string): MusicItem[] => safeParse<MusicItem[]>(`${KEYS.MY_LIST}${profileId}`, []);

export const toggleMyList = (profileId: string, item: MusicItem) => {
  const list = getMyList(profileId);
  const exists = list.find(i => i.id === item.id);
  const newList = exists ? list.filter(i => i.id !== item.id) : [item, ...list];
  localStorage.setItem(`${KEYS.MY_LIST}${profileId}`, JSON.stringify(newList));
  
  if (!exists) {
    triggerBackgroundDownload(profileId, item, 3); // Prioridade máxima
  }
};

export const isInMyList = (profileId: string, itemId: string) => !!getMyList(profileId).find(i => i.id === itemId);

export const addToHistory = (profileId: string, item: MusicItem) => {
  const key = `${KEYS.HISTORY}${profileId}`;
  let history: MusicItem[] = safeParse(key, []);
  history = [item, ...history.filter(i => i.id !== item.id)].slice(0, 20);
  localStorage.setItem(key, JSON.stringify(history));
  
  // Histórico dispara download em segundo plano com prioridade média
  triggerBackgroundDownload(profileId, item, 2);
};

export const getHistory = (profileId: string): MusicItem[] => {
  return safeParse<MusicItem[]>(`${KEYS.HISTORY}${profileId}`, []);
};

export const saveProgress = (profileId: string, item: MusicItem, timestamp: number) => {
  if (timestamp < 5) return;
  const key = `${KEYS.PROGRESS}${profileId}`;
  let progressMap = safeParse<Record<string, WatchProgress>>(key, {});
  progressMap[item.id] = { itemId: item.id, timestamp, lastWatched: Date.now(), item };
  localStorage.setItem(key, JSON.stringify(progressMap));
};

export const getContinueWatching = (profileId: string): WatchProgress[] => {
  const map = safeParse<Record<string, WatchProgress>>(`${KEYS.PROGRESS}${profileId}`, {});
  return Object.values(map).sort((a, b) => b.lastWatched - a.lastWatched);
};

export const getProgressTime = (profileId: string, itemId: string): number => {
  const map = safeParse<Record<string, WatchProgress>>(`${KEYS.PROGRESS}${profileId}`, {});
  return map[itemId]?.timestamp || 0;
};
