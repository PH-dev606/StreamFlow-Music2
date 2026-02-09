
import { GoogleGenAI, Type } from "@google/genai";
import { AppData, MusicItem, Category, ArtistDetails, SearchResponse } from "../types";

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

export const fetchHomeData = async (isKid: boolean = false): Promise<AppData> => {
  const model = "gemini-3-flash-preview";
  const prompt = isKid ? "API de música INFANTIL (JSON)." : "API de música estilo Netflix (JSON).";

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
              properties: { 
                title: {type: Type.STRING}, 
                artist: {type: Type.STRING}, 
                youtubeId: {type: Type.STRING}, 
                description: {type: Type.STRING},
                year: {type: Type.STRING}
              }, 
              required: ["title", "artist", "youtubeId", "description"] 
            },
            categories: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  title: {type: Type.STRING}, 
                  items: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT, 
                      properties: { 
                        title: {type: Type.STRING}, 
                        artist: {type: Type.STRING}, 
                        youtubeId: {type: Type.STRING}, 
                        description: {type: Type.STRING},
                        duration: {type: Type.STRING},
                        year: {type: Type.STRING}
                      } 
                    } 
                  } 
                } 
              } 
            }
          },
          required: ["hero", "categories"]
        }
      }
    });

    const rawData = JSON.parse(response.text || '{}');
    const hero: MusicItem = {
      description: '', 
      ...rawData.hero,
      id: 'h-ia',
      matchScore: 99,
      backdropUrl: getImageUrl(`${rawData.hero?.artist || 'music'} concert`, 1920, 1080),
      thumbnailUrl: getImageUrl(`${rawData.hero?.title || 'music'} cover`, 1280, 720)
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
    if (error?.message?.includes('429')) {
        (window as any).GEMINI_QUOTA_EXCEEDED = true;
    }
    return { 
        hero: { id: 'f', title: 'StreamFlow', artist: 'Sua Música', description: 'IA Offline.', youtubeId: '', thumbnailUrl: '', backdropUrl: '', matchScore: 0 }, 
        categories: [] 
    };
  }
};

export const searchMusic = async (query: string): Promise<SearchResponse> => {
    try {
        const ai = createAiClient();
        const prompt = `Analise a busca: "${query}". 
        1. Identifique se é um nome de música ou um trecho de letra.
        2. Agrupe os resultados por temas semânticos (ex: "Temas de Saudade", "Músicas para Treinar", "Resultados Diretos").
        3. Identifique o gênero de cada música.
        4. Retorne um JSON com "groups" (theme, items[]) e "allGenres" (string[]).
        Cada item deve ter: title, artist, youtubeId, genre, lyricsSnippet (o trecho da letra que combina).`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        groups: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    theme: { type: Type.STRING },
                                    items: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                title: { type: Type.STRING },
                                                artist: { type: Type.STRING },
                                                youtubeId: { type: Type.STRING },
                                                genre: { type: Type.STRING },
                                                lyricsSnippet: { type: Type.STRING },
                                                duration: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        allGenres: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        
        const data = JSON.parse(response.text || '{"groups":[], "allGenres":[]}');
        
        const processedGroups = (data.groups || []).map((group: any, gIdx: number) => ({
            theme: group.theme,
            items: (group.items || []).map((i: any, iIdx: number) => ({
                ...i,
                id: `search-${gIdx}-${iIdx}`,
                description: i.lyricsSnippet || '',
                thumbnailUrl: getImageUrl(`${i.title} ${i.artist}`, 640, 360),
                backdropUrl: '',
                matchScore: 98
            }))
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
            contents: `Biografia detalhada de "${name}", discografia e curiosidades (JSON).`,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(response.text || '{}');
        return {
            id: name, name: data.name || name, bio: data.bio || 'Carregando biografia...',
            backdropUrl: getImageUrl(`${name} live backdrop`, 1920, 1080), matchScore: 99, tags: data.tags || ["Artista"],
            albums: (data.albums || []).map((a:any, idx:number) => ({
                id: `a-${idx}`, title: a.title, year: a.year || "2024",
                songs: (a.songs || []).map((s:any, si:number) => ({
                    description: s.description || '', 
                    backdropUrl: '', 
                    ...s, 
                    id: `s-${idx}-${si}`, artist: name,
                    thumbnailUrl: getImageUrl(`${s.title} album art`, 400, 225)
                }))
            }))
        };
    } catch (e) {
        throw e;
    }
};

export const fetchRecommendations = async (history: MusicItem[], isKid: boolean): Promise<MusicItem[]> => {
  if (history.length === 0) return [];
  try {
    const ai = createAiClient();
    const historySummary = history.slice(0, 3).map(h => `${h.title} - ${h.artist}`).join(", ");
    const prompt = `Sugira 10 músicas baseadas em: [${historySummary}]. JSON com lista "items": title, artist, youtubeId, genre.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(response.text || '{"items":[]}');
    return (data.items || []).map((i: any, idx: number) => ({
      ...i, 
      id: `rec-${idx}`, 
      matchScore: 95 + Math.floor(Math.random() * 5),
      thumbnailUrl: getImageUrl(`${i.title} ${i.artist}`, 640, 360),
      description: '', 
      backdropUrl: ''
    }));
  } catch (e) { return []; }
};
