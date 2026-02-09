
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
        { id: 'p2', title: 'Levitating', artist: 'Dua Lipa', youtubeId: 'TUVcZfQe-Kw', matchScore: 92, year: '2020', duration: '3:23', thumbnailUrl: 'https://picsum.photos/seed/dua/640/360', backdropUrl: '', description: '' }
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
  console.error("Gemini Error:", error);
  const isQuotaError = error?.status === 429 || error?.message?.includes("429");
  if (isQuotaError) {
    (window as any).GEMINI_QUOTA_EXCEEDED = true;
    window.dispatchEvent(new CustomEvent('gemini_quota_error'));
  }
};

const searchYouTube = async (query: string) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    return data.items || [];
  } catch (e) {
    return [];
  }
};

export const fetchHomeData = async (isKid: boolean = false): Promise<AppData> => {
  const ai = createAiClient();
  if (!ai) return FALLBACK_DATA;

  try {
    const prompt = isKid 
      ? "Crie uma lista de música infantil (Disney, Galinha Pintadinha, etc) em JSON com 6 categorias bem separadas."
      : "Crie uma lista de música variada em JSON com 10 categorias separadas por títulos fortes: '🔥 Hits Globais', '🤠 Sertanejo Bruto', '🎸 Rock Eterno', '🇧🇷 MPB & Brasilidades', '🎧 Lo-fi para Focar', '⚡ Treino Monstro', '🕺 Funk & Hitmaker', '🍺 Pagode de Domingo', '🌈 Pop Brasil' e '🎻 Clássicos Relaxantes'.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hero: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, artist: {type: Type.STRING}, youtubeId: {type: Type.STRING}, description: {type: Type.STRING} } },
            categories: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, artist: {type: Type.STRING}, youtubeId: {type: Type.STRING} } } } } } }
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || '{}');
    const hero: MusicItem = {
      ...rawData.hero,
      id: 'h-ia',
      matchScore: 99,
      backdropUrl: getImageUrl(`${rawData.hero?.artist} concert photography`, 1920, 1080),
      thumbnailUrl: getImageUrl(`${rawData.hero?.title} album cover art`, 1280, 720)
    };

    const categories: Category[] = (rawData.categories || []).map((cat: any, idx: number) => ({
      id: `c-${idx}`,
      title: cat.title,
      items: (cat.items || []).map((i: any, ii: number) => ({
        ...i, 
        id: `i-${idx}-${ii}`, 
        thumbnailUrl: getImageUrl(`${i.title} ${i.artist} cover`, 640, 360),
        matchScore: 90 + Math.floor(Math.random() * 10),
        duration: "3:45",
        year: "2024",
        description: `Sucesso de ${i.artist}`
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
        
        // Prompt aprimorado para letras e artistas
        const prompt = `Você é um detetive musical. O usuário buscou: "${query}". 
        1. Se for um trecho de letra, identifique a música exata e coloque-a em primeiro. 
        2. Se for nome de artista, liste os maiores hits dele primeiro.
        Organize estes vídeos do YouTube: ${JSON.stringify(ytResults.map((v:any) => ({id: v.id.videoId, title: v.snippet.title})))}.
        Retorne JSON com 'groups' (ex: 'Melhor Correspondência', 'Vídeos Oficiais', 'Relacionados') e 'allGenres'.`;

        if (!ai) throw new Error("No AI");

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const data = JSON.parse(response.text || '{"groups":[]}');
        const processedGroups = (data.groups || []).map((group: any, gIdx: number) => ({
            theme: group.theme,
            items: (group.items || []).map((i: any, iIdx: number) => {
                const ytMatch = ytResults.find((v: any) => v.id.videoId === i.youtubeId || v.snippet.title.toLowerCase().includes(i.title.toLowerCase()));
                return {
                    artist: 'Artista Desconhecido',
                    ...i,
                    id: `search-${gIdx}-${iIdx}`,
                    youtubeId: ytMatch?.id.videoId || i.youtubeId,
                    thumbnailUrl: ytMatch?.snippet.thumbnails.high.url || getImageUrl(i.title, 640, 360),
                    description: i.lyricsSnippet || ytMatch?.snippet.description || '',
                    matchScore: 98,
                    duration: "4:00"
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
        const results = await searchYouTube(query);
        return {
          id: 'err', title: query, 
          allGenres: ['YouTube'],
          groups: [{
            theme: 'Principais Resultados',
            items: results.map((v:any, idx:number) => ({
              id: `yt-${idx}`, title: v.snippet.title, artist: v.snippet.channelTitle,
              youtubeId: v.id.videoId, thumbnailUrl: v.snippet.thumbnails.high.url,
              description: v.snippet.description, backdropUrl: '', matchScore: 95
            }))
          }]
        };
    }
};

export const fetchArtistDetails = async (name: string): Promise<ArtistDetails> => {
    const ai = createAiClient();
    if (!ai) throw new Error("Offline");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Forneça biografia, curiosidades e discografia de "${name}". JSON rigoroso com campos: name, bio, tags, albums[{title, year, songs[{title}]}]`,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(response.text || '{}');
        return {
            id: name, name: data.name || name, bio: data.bio || 'Biografia não disponível.',
            backdropUrl: getImageUrl(`${name} band stage`, 1920, 1080), matchScore: 99, tags: data.tags || ["Artista"],
            albums: (data.albums || []).map((a:any, idx:number) => ({
                id: `a-${idx}`, title: a.title, year: a.year || "2024",
                songs: (a.songs || []).map((s:any, si:number) => ({
                    ...s, id: `s-${idx}-${si}`, artist: name, duration: "3:30",
                    thumbnailUrl: getImageUrl(`${s.title} official album art`, 400, 225),
                    description: `Destaque do álbum ${a.title}`, backdropUrl: ''
                }))
            }))
        };
    } catch (e) {
        handleGeminiError(e);
        throw e;
    }
};
