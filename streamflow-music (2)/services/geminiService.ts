
import { GoogleGenAI, Type } from "@google/genai";
import { AppData, MusicItem, Category, ArtistDetails, SearchResponse } from "../types";

const YOUTUBE_API_KEY = "AIzaSyDgOYCC_pel2Q_uyTLxp_NZjkvbGeWwKAs";

const FALLBACK_DATA: AppData = {
  hero: {
    id: 'h-fallback',
    title: 'As Melhores de 2024',
    artist: 'StreamFlow Selection',
    description: 'Acompanhe os maiores sucessos que estão dominando as paradas globais em uma experiência imersiva e cinematográfica.',
    youtubeId: 'jgZkrA8E5do',
    thumbnailUrl: 'https://picsum.photos/seed/hero/1280/720',
    backdropUrl: 'https://picsum.photos/seed/concert/1920/1080',
    matchScore: 98,
    year: '2024'
  },
  categories: [
    {
      id: 'c-pop',
      title: 'Pop Hits Globais',
      items: [
        { id: 'p1', title: 'Blinding Lights', artist: 'The Weeknd', youtubeId: '4NRXx6U8ABQ', matchScore: 95, year: '2020', duration: '3:22', thumbnailUrl: 'https://picsum.photos/seed/weeknd/640/360', backdropUrl: '', description: '' },
        { id: 'p2', title: 'Levitating', artist: 'Dua Lipa', youtubeId: 'TUVcZfQe-Kw', matchScore: 92, year: '2020', duration: '3:23', thumbnailUrl: 'https://picsum.photos/seed/dua/640/360', backdropUrl: '', description: '' },
        { id: 'p3', title: 'Flowers', artist: 'Miley Cyrus', youtubeId: 'G7KNmW9a75Y', matchScore: 99, year: '2023', duration: '3:20', thumbnailUrl: 'https://picsum.photos/seed/miley/640/360', backdropUrl: '', description: '' }
      ]
    }
  ]
};

const getImageUrl = (keyword: string, width: number, height: number) => {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash) % 1000;
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
};

const createAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const handleGeminiError = (error: any) => {
  console.error("Gemini Error Handler:", error);
  // Detectar especificamente erro 429 (Quota Exceeded / Resource Exhausted)
  const isQuotaError = 
    error?.status === 429 || 
    error?.error?.code === 429 || 
    error?.message?.includes("429") ||
    error?.message?.includes("quota");

  if (isQuotaError) {
    (window as any).GEMINI_QUOTA_EXCEEDED = true;
    // Disparar evento para atualizar a UI imediatamente
    window.dispatchEvent(new CustomEvent('gemini_quota_error'));
  }
};

const searchYouTube = async (query: string) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    return data.items || [];
  } catch (e) {
    console.error("YouTube API Error", e);
    return [];
  }
};

export const fetchHomeData = async (isKid: boolean = false): Promise<AppData> => {
  const ai = createAiClient();
  if (!ai) return FALLBACK_DATA;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: isKid ? "Crie uma lista de música infantil estilo Netflix (JSON)." : "Crie uma lista de música atual estilo Netflix (JSON).",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hero: { 
              type: Type.OBJECT, 
              properties: { title: {type: Type.STRING}, artist: {type: Type.STRING}, youtubeId: {type: Type.STRING}, description: {type: Type.STRING} } 
            },
            categories: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  title: {type: Type.STRING}, 
                  items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, artist: {type: Type.STRING}, youtubeId: {type: Type.STRING}, description: {type: Type.STRING} } } } 
                } 
              } 
            }
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || '{}');
    const hero: MusicItem = {
      ...rawData.hero,
      id: 'h-ia',
      matchScore: 99,
      backdropUrl: getImageUrl(`${rawData.hero?.artist} concert`, 1920, 1080),
      thumbnailUrl: getImageUrl(`${rawData.hero?.title} cover`, 1280, 720)
    };

    const categories: Category[] = (rawData.categories || []).map((cat: any, idx: number) => ({
      id: `c-${idx}`,
      title: cat.title,
      items: (cat.items || []).map((i: any, ii: number) => ({
        ...i, 
        id: `i-${idx}-${ii}`, 
        thumbnailUrl: getImageUrl(`${i.title} ${i.artist}`, 640, 360),
        matchScore: 90 + Math.floor(Math.random() * 10)
      }))
    }));

    return { hero, categories };
  } catch (error) {
    handleGeminiError(error);
    return FALLBACK_DATA;
  }
};

export const searchMusic = async (query: string): Promise<SearchResponse> => {
    try {
        const ytResults = await searchYouTube(query);
        const ai = createAiClient();
        
        if (!ai) {
          return {
            id: 'search-simple',
            title: query,
            allGenres: ['YouTube'],
            groups: [{
              theme: 'Resultados da Web',
              items: ytResults.map((v: any, idx: number) => ({
                id: `yt-${idx}`,
                title: v.snippet.title,
                artist: v.snippet.channelTitle,
                youtubeId: v.id.videoId,
                thumbnailUrl: v.snippet.thumbnails.high.url,
                description: v.snippet.description,
                backdropUrl: '',
                matchScore: 98
              }))
            }]
          };
        }

        const ytItemsSummary = ytResults.map((v: any) => ({
            id: v.id.videoId,
            title: v.snippet.title,
            channel: v.snippet.channelTitle
        }));

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Organize estes resultados do YouTube: ${JSON.stringify(ytItemsSummary)}. Busca: "${query}". Retorne JSON com "groups" e "allGenres".`,
            config: { responseMimeType: "application/json" }
        });
        
        const data = JSON.parse(response.text || '{"groups":[]}');
        const processedGroups = (data.groups || []).map((group: any, gIdx: number) => ({
            theme: group.theme,
            items: (group.items || []).map((i: any, iIdx: number) => {
                const ytMatch = ytResults.find((v: any) => v.id.videoId === i.youtubeId || v.snippet.title.includes(i.title));
                return {
                    ...i,
                    id: `search-${gIdx}-${iIdx}`,
                    youtubeId: ytMatch?.id.videoId || i.youtubeId,
                    thumbnailUrl: ytMatch?.snippet.thumbnails.high.url || getImageUrl(i.title, 640, 360),
                    description: i.lyricsSnippet || ytMatch?.snippet.description || '',
                    backdropUrl: '',
                    matchScore: 98
                };
            })
        }));

        return {
            id: 'search-root',
            title: query,
            groups: processedGroups,
            allGenres: Array.from(new Set(data.allGenres || []))
        };
    } catch (e) {
        handleGeminiError(e);
        return { id: 'err', title: query, groups: [], allGenres: [] };
    }
};

export const fetchArtistDetails = async (name: string): Promise<ArtistDetails> => {
    const ai = createAiClient();
    if (!ai) {
        return {
            id: name, name, bio: 'Conecte sua API Key para ver biografias detalhadas geradas por IA.',
            backdropUrl: getImageUrl(`${name} stage`, 1920, 1080), matchScore: 99, tags: ["Pop", "Top"],
            albums: [{ id: 'a1', title: 'Greatest Hits', year: '2024', songs: [] }]
        };
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Biografia e discografia de "${name}" (JSON).`,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(response.text || '{}');
        return {
            id: name, name: data.name || name, bio: data.bio || 'Biografia...',
            backdropUrl: getImageUrl(`${name} live`, 1920, 1080), matchScore: 99, tags: data.tags || ["Artista"],
            albums: (data.albums || []).map((a:any, idx:number) => ({
                id: `a-${idx}`, title: a.title, year: a.year || "2024",
                songs: (a.songs || []).map((s:any, si:number) => ({
                    description: '', backdropUrl: '', ...s, id: `s-${idx}-${si}`, artist: name,
                    thumbnailUrl: getImageUrl(`${s.title} art`, 400, 225)
                }))
            }))
        };
    } catch (e) {
        handleGeminiError(e);
        throw e;
    }
};

export const fetchRecommendations = async (history: MusicItem[]): Promise<MusicItem[]> => {
  const ai = createAiClient();
  if (!ai || history.length === 0) return [];
  try {
    const prompt = `Sugira 10 músicas baseadas em: ${history.map(h => h.title).join(", ")}. JSON com lista "items": title, artist, youtubeId.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(response.text || '{"items":[]}');
    return (data.items || []).map((i: any, idx: number) => ({
      ...i, id: `rec-${idx}`, matchScore: 95,
      thumbnailUrl: getImageUrl(`${i.title}`, 640, 360),
      description: '', backdropUrl: ''
    }));
  } catch (e) { 
    handleGeminiError(e);
    return []; 
  }
};
