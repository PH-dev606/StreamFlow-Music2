
import { GoogleGenAI, Type } from "@google/genai";
import { AppData, MusicItem, Category, ArtistDetails, SearchResponse } from "../types";

// Chave fornecida pelo usuário para o YouTube
const YOUTUBE_API_KEY = "AIzaSyDgOYCC_pel2Q_uyTLxp_NZjkvbGeWwKAs";

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
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

// Busca real no YouTube
const searchYouTube = async (query: string) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    return data.items || [];
  } catch (e) {
    console.error("YouTube API Error", e);
    return [];
  }
};

export const fetchHomeData = async (isKid: boolean = false): Promise<AppData> => {
  const model = "gemini-3-flash-preview";
  const prompt = isKid ? "Crie uma lista de música infantil (JSON)." : "Crie uma lista de música estilo Netflix (JSON).";

  try {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
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
      description: '', 
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
        description: '', 
        backdropUrl: '', 
        ...i, 
        id: `i-${idx}-${ii}`, 
        thumbnailUrl: getImageUrl(`${i.title} ${i.artist}`, 640, 360),
        matchScore: 90 + Math.floor(Math.random() * 10)
      }))
    }));

    return { hero, categories };
  } catch (error: any) {
    return { 
        hero: { id: 'f', title: 'StreamFlow', artist: 'Sua Música', description: 'Erro de conexão.', youtubeId: '', thumbnailUrl: '', backdropUrl: '', matchScore: 0 }, 
        categories: [] 
    };
  }
};

export const searchMusic = async (query: string): Promise<SearchResponse> => {
    try {
        // 1. Pegar resultados reais do YouTube
        const ytResults = await searchYouTube(query);
        const ytItemsSummary = ytResults.map((v: any) => ({
            id: v.id.videoId,
            title: v.snippet.title,
            channel: v.snippet.channelTitle
        }));

        // 2. Usar Gemini para organizar esses resultados reais
        const ai = createAiClient();
        const prompt = `Organize estes resultados do YouTube para a busca "${query}": ${JSON.stringify(ytItemsSummary)}. 
        Agrupe-os por "theme" (ex: Resultados Diretos, Covers, Relacionados) e identifique o gênero musical predominante.
        Retorne JSON com "groups" e "allGenres".`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
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
        return { id: 'err', title: query, groups: [], allGenres: [] };
    }
};

export const fetchArtistDetails = async (name: string): Promise<ArtistDetails> => {
    try {
        const ai = createAiClient();
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
        throw e;
    }
};

export const fetchRecommendations = async (history: MusicItem[]): Promise<MusicItem[]> => {
  if (history.length === 0) return [];
  try {
    const ai = createAiClient();
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
  } catch (e) { return []; }
};
