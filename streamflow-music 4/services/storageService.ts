
import { MusicItem, Profile, WatchProgress, Playlist } from '../types';

const KEYS = {
  PROFILES: 'streamflow_profiles',
  MY_LIST: 'streamflow_mylist_',
  HISTORY: 'streamflow_history_',
  PROGRESS: 'streamflow_progress_',
  DOWNLOADS: 'streamflow_downloads_',
  PLAYLISTS: 'streamflow_playlists_',
  PENDING_DOWNLOADS: 'streamflow_pending_downloads_',
  STATS: 'streamflow_stats_', 
};

interface PendingDownload {
  id: string;
  item: MusicItem;
  priorityScore: number; 
  addedAt: number;
}

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

// --- Estatísticas de Frequência ---
const incrementPlayCount = (profileId: string, itemId: string) => {
  const key = `${KEYS.STATS}${profileId}`;
  const stats = safeParse<Record<string, number>>(key, {});
  stats[itemId] = (stats[itemId] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(stats));
};

const getPlayCount = (profileId: string, itemId: string): number => {
  const stats = safeParse<Record<string, number>>(`${KEYS.STATS}${profileId}`, {});
  return stats[itemId] || 0;
};

// --- Downloads Inteligentes ---
export const getDownloads = (profileId: string): MusicItem[] => safeParse<MusicItem[]>(`${KEYS.DOWNLOADS}${profileId}`, []);

export const isDownloaded = (profileId: string, itemId: string) => !!getDownloads(profileId).find(i => i.id === itemId);

export const getPendingDownloads = (profileId: string): PendingDownload[] => 
  safeParse<PendingDownload[]>(`${KEYS.PENDING_DOWNLOADS}${profileId}`, []);

/**
 * Sistema de Priorização Refinado
 * Score = (Base Priority * 100) + (Play Count * 20) + (Is In My List ? 50 : 0)
 */
export const triggerBackgroundDownload = (profileId: string, item: MusicItem, basePriority: number = 1) => {
  // 1. Verificação de Disponibilidade de Rede
  if (!navigator.onLine) {
    console.debug('[StreamFlow] Download ignorado: Dispositivo Offline');
    return;
  }

  // 2. Evitar duplicatas em downloads concluídos
  if (isDownloaded(profileId, item.id)) return;

  const pending = getPendingDownloads(profileId);
  const playCount = getPlayCount(profileId, item.id);
  const isStarred = isInMyList(profileId, item.id);
  
  // 3. Cálculo do Score de Importância
  const priorityScore = (basePriority * 100) + (playCount * 20) + (isStarred ? 50 : 0);

  const existingIndex = pending.findIndex(p => p.id === item.id);
  let updatedPending: PendingDownload[];

  if (existingIndex > -1) {
    updatedPending = [...pending];
    // Só atualiza se o novo score for maior
    if (priorityScore > updatedPending[existingIndex].priorityScore) {
      updatedPending[existingIndex].priorityScore = priorityScore;
      updatedPending[existingIndex].addedAt = Date.now();
    }
  } else {
    updatedPending = [...pending, {
      id: item.id,
      item,
      priorityScore,
      addedAt: Date.now()
    }];
  }

  // 4. Re-ordenar: Maior Score primeiro, mais recente como critério de desempate
  updatedPending.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.addedAt - a.addedAt;
  });

  localStorage.setItem(`${KEYS.PENDING_DOWNLOADS}${profileId}`, JSON.stringify(updatedPending));
};

export const completeDownload = (profileId: string, item: MusicItem) => {
  const pendingKey = `${KEYS.PENDING_DOWNLOADS}${profileId}`;
  const pending = getPendingDownloads(profileId);
  const existsInPending = pending.some(p => p.id === item.id);

  // Se o item foi removido da lista enquanto "baixava", cancelamos a operação
  if (!existsInPending) {
    console.debug(`[StreamFlow] Cancelando gravação de ${item.title}: Item removido da fila.`);
    return;
  }

  // Adiciona aos downloads finais se não estiver lá
  const downloads = getDownloads(profileId);
  if (!downloads.find(d => d.id === item.id)) {
    localStorage.setItem(`${KEYS.DOWNLOADS}${profileId}`, JSON.stringify([item, ...downloads]));
  }

  // Limpa da fila de pendentes
  const newPending = pending.filter(p => p.id !== item.id);
  localStorage.setItem(pendingKey, JSON.stringify(newPending));
};

export const toggleDownload = (profileId: string, item: MusicItem) => {
  const downloads = getDownloads(profileId);
  const exists = downloads.find(i => i.id === item.id);
  
  if (exists) {
    const newDownloads = downloads.filter(i => i.id !== item.id);
    localStorage.setItem(`${KEYS.DOWNLOADS}${profileId}`, JSON.stringify(newDownloads));
  } else {
    // Ação explícita do usuário = Prioridade Máxima
    triggerBackgroundDownload(profileId, item, 4);
    
    // Simulação de finalização de download em 2 segundos para o MVP
    setTimeout(() => completeDownload(profileId, item), 2000);
  }
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
  triggerBackgroundDownload(profileId, item, 3); 
};

// --- My List & History ---
export const getMyList = (profileId: string): MusicItem[] => safeParse<MusicItem[]>(`${KEYS.MY_LIST}${profileId}`, []);

export const toggleMyList = (profileId: string, item: MusicItem) => {
  const list = getMyList(profileId);
  const exists = list.find(i => i.id === item.id);
  const newList = exists ? list.filter(i => i.id !== item.id) : [item, ...list];
  localStorage.setItem(`${KEYS.MY_LIST}${profileId}`, JSON.stringify(newList));
  
  if (!exists) {
    triggerBackgroundDownload(profileId, item, 4); 
  } else {
    // Se removeu da lista, remove da fila de download pendente também (opcional, mas limpa o storage)
    const pending = getPendingDownloads(profileId);
    const newPending = pending.filter(p => p.id !== item.id);
    localStorage.setItem(`${KEYS.PENDING_DOWNLOADS}${profileId}`, JSON.stringify(newPending));
  }
};

export const isInMyList = (profileId: string, itemId: string) => !!getMyList(profileId).find(i => i.id === itemId);

export const addToHistory = (profileId: string, item: MusicItem) => {
  const key = `${KEYS.HISTORY}${profileId}`;
  let history: MusicItem[] = safeParse(key, []);
  
  incrementPlayCount(profileId, item.id);

  history = [item, ...history.filter(i => i.id !== item.id)].slice(0, 20);
  localStorage.setItem(key, JSON.stringify(history));
  
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
