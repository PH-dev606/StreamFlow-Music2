
import { GoogleGenAI, Type } from "@google/genai";
import { AppData, MusicItem, Category, ArtistDetails } from "../types";

const getImageUrl = (keyword: string, width: number, height: number) => {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash) % 1000;
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
};

// Dados de Fallback (Caso a IA atinja o limite de quota)
const FALLBACK_HERO: MusicItem = {
  id: 'f-hero',
  title: 'Future Nostalgia Tour',
  artist: 'Dua Lipa',
  description: 'Assista aos maiores sucessos de Dua Lipa em uma performance eletrizante gravada ao vivo.',
  youtubeId: 'qN4ooNx77u0',
  matchScore: 98,
  year: '2024',
  duration: '1:24:00',
  thumbnailUrl: getImageUrl('Dua Lipa', 1280, 720),
  backdropUrl: getImageUrl('Dua Lipa concert stage', 1920, 1080)
};

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: 'f-cat-1',
    title: 'Top Hits Brasil',
    items: [
      { id: 'f1', title: 'Houdini', artist: 'Dua Lipa', description: 'O hit eletrizante de Dua Lipa.', youtubeId: 'ns06GOUH9p4', duration: '3:05', thumbnailUrl: getImageUrl('Houdini', 640, 360), backdropUrl: '', matchScore: 99 },
      { id: 'f2', title: 'Blinding Lights', artist: 'The Weeknd', description: 'Um clássico moderno do synth-pop.', youtubeId: '4NRXx6U8ABQ', duration: '3:22', thumbnailUrl: getImageUrl('The Weeknd', 640, 360), backdropUrl: '', matchScore: 95 },
      { id: 'f3', title: 'Flowers', artist: 'Miley Cyrus', description: 'Hino de independência e amor próprio.', youtubeId: 'G7KNmW9a75Y', duration: '3:21', thumbnailUrl: getImageUrl('Miley Cyrus', 640, 360), backdropUrl: '', matchScore: 92 }
    ]
  },
  {
    id: 'f-cat-2',
    title: 'Explorar Gêneros',
    items: [
      { id: 'f4', title: 'Cruel Summer', artist: 'Taylor Swift', description: 'O sucesso viral de Taylor Swift.', youtubeId: 'ic8j13piAhQ', duration: '3:35', thumbnailUrl: getImageUrl('Taylor Swift', 640, 360), backdropUrl: '', matchScore: 98 },
      { id: 'f5', title: 'Greedy', artist: 'Tate McRae', description: 'Pop viciante com batidas modernas.', youtubeId: 'TdrL3QxjyVw', duration: '2:12', thumbnailUrl: getImageUrl('Tate McRae', 640, 360), backdropUrl: '', matchScore: 90 }
    ]
  }
];

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
            hero: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, artist: {type: Type.STRING}, youtubeId: {type: Type.STRING}, description: {type: Type.STRING} }, required: ["title", "artist", "youtubeId", "description"] },
            categories: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, artist: {type: Type.STRING}, youtubeId: {type: Type.STRING}, description: {type: Type.STRING} } } } } } }
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
      backdropUrl: getImageUrl(`${rawData.hero?.artist || 'music'} live`, 1920, 1080),
      thumbnailUrl: getImageUrl(`${rawData.hero?.title || 'music'}`, 1280, 720)
    };

    const categories: Category[] = (rawData.categories || []).map((cat: any, idx: number) => ({
      id: `c-${idx}`,
      title: cat.title,
      items: (cat.items || []).map((i: any, ii: number) => ({
        description: '', 
        backdropUrl: '', 
        ...i, id: `i-${idx}-${ii}`, 
        thumbnailUrl: getImageUrl(`${i.title} ${i.artist}`, 640, 360),
        matchScore: 90 + Math.floor(Math.random() * 10)
      }))
    }));

    return { hero, categories };
  } catch (error: any) {
    console.warn("Gemini Quota/Network issue, using Fallback Data", error);
    if (error?.message?.includes('429')) {
        (window as any).GEMINI_QUOTA_EXCEEDED = true;
    }
    return { hero: FALLBACK_HERO, categories: FALLBACK_CATEGORIES };
  }
};

export const fetchRecommendations = async (history: MusicItem[], isKid: boolean): Promise<MusicItem[]> => {
  if (history.length === 0) return [];
  
  try {
    const ai = createAiClient();
    const historySummary = history.slice(0, 5).map(h => `${h.title} (${h.artist})`).join(", ");
    const prompt = `Baseado neste histórico de músicas: [${historySummary}]. Sugira 10 músicas similares ${isKid ? 'infantis' : ''}. Retorne apenas um JSON com um campo "items" contendo title, artist, youtubeId e description.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  youtubeId: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "artist", "youtubeId", "description"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    const rawData = JSON.parse(response.text || '{"items":[]}');
    return (rawData.items || []).map((i: any, idx: number) => ({
      ...i,
      id: `rec-${idx}`,
      matchScore: 95 + Math.floor(Math.random() * 5),
      thumbnailUrl: getImageUrl(`${i.title} ${i.artist}`, 640, 360),
      backdropUrl: getImageUrl(`${i.artist} music`, 1920, 1080)
    }));
  } catch (e) {
    console.error("Erro ao buscar recomendações", e);
    return [];
  }
};

export const searchMusic = async (query: string): Promise<Category> => {
    try {
        const ai = createAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Busca musical para: "${query}". Retorne JSON com 8 itens (title, artist, youtubeId, description).`,
            config: { responseMimeType: "application/json" }
        });
        const items = JSON.parse(response.text || '{"items":[]}').items || [];
        return {
            id: 'search',
            title: `Resultados para: ${query}`,
            items: items.map((i:any, idx:number) => ({
                description: '', 
                backdropUrl: '', 
                ...i, id: `s-${idx}`, 
                thumbnailUrl: getImageUrl(`${i.title} ${i.artist}`, 640, 360),
                matchScore: 95
            }))
        };
    } catch (e) {
        return { id: 'err', title: 'Resultados limitados (Modo Offline)', items: FALLBACK_CATEGORIES[0].items };
    }
};

export const fetchArtistDetails = async (name: string): Promise<ArtistDetails> => {
    try {
        const ai = createAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Detalhes de "${name}" (JSON). Inclua albums com músicas que tenham title, duration e description.`,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(response.text || '{}');
        return {
            id: name, name: data.name || name, bio: data.bio || 'Carregando biografia...',
            backdropUrl: getImageUrl(name, 1920, 1080), matchScore: 99, tags: ["Pop"],
            albums: (data.albums || []).map((a:any, idx:number) => ({
                id: `a-${idx}`, title: a.title, year: "2024",
                songs: (a.songs || []).map((s:any, si:number) => ({
                    description: '', 
                    backdropUrl: '', 
                    ...s, id: `s-${idx}-${si}`, artist: name,
                    thumbnailUrl: getImageUrl(s.title, 400, 225)
                }))
            }))
        };
    } catch (e) {
        throw e;
    }
};
