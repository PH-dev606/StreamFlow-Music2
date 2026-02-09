
import React, { useState, useEffect, useCallback } from 'react';
import { Play, WifiOff, AlertTriangle, Key, Music, CheckCircle2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Row from './components/Row';
import MusicPlayer from './components/MusicPlayer';
import ArtistView from './components/ArtistView';
import ProfileSelector from './components/ProfileSelector';
import PlaylistModal from './components/PlaylistModal';
import { fetchHomeData, searchMusic, fetchArtistDetails, fetchRecommendations } from './services/geminiService';
import { 
  getProfiles, getMyList, toggleMyList, isInMyList, 
  getContinueWatching, addToHistory, getPlaylists,
  getDownloads, toggleDownload, isDownloaded, getHistory
} from './services/storageService';
import { AppData, MusicItem, SearchResponse, ArtistDetails, Profile, Playlist } from './types';

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [myList, setMyList] = useState<MusicItem[]>([]);
  const [history, setHistory] = useState<MusicItem[]>([]);
  const [recommendations, setRecommendations] = useState<MusicItem[]>([]);
  const [downloads, setDownloads] = useState<MusicItem[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [continueWatching, setContinueWatching] = useState<MusicItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MusicItem | null>(null);
  const [itemForPlaylist, setItemForPlaylist] = useState<MusicItem | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [artistView, setArtistView] = useState<ArtistDetails | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showQuotaWarning, setShowQuotaWarning] = useState(false);

  const refreshProfiles = useCallback(() => {
    setProfiles(getProfiles());
  }, []);

  useEffect(() => {
    refreshProfiles();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshProfiles]);

  const refreshUserData = useCallback(() => {
    if (currentProfile) {
      setMyList(getMyList(currentProfile.id));
      setHistory(getHistory(currentProfile.id));
      setDownloads(getDownloads(currentProfile.id));
      setUserPlaylists(getPlaylists(currentProfile.id));
      const progress = getContinueWatching(currentProfile.id);
      setContinueWatching(progress.map(p => p.item));
    }
  }, [currentProfile]);

  const loadHomeData = async (kid: boolean) => {
    setInitialLoading(true);
    const result = await fetchHomeData(kid);
    setData(result);
    if ((window as any).GEMINI_QUOTA_EXCEEDED) {
      setShowQuotaWarning(true);
    }
    setInitialLoading(false);
  };

  useEffect(() => {
    if (currentProfile) {
      refreshUserData();
      loadHomeData(currentProfile.isKid);
    }
  }, [currentProfile, isOnline, refreshUserData]);

  const handlePlay = (item: MusicItem) => {
    if (!currentProfile) return;
    setSelectedItem(item);
    addToHistory(currentProfile.id, item);
    refreshUserData();
  };

  const handleToggleList = (item: MusicItem) => {
    if (currentProfile) {
      toggleMyList(currentProfile.id, item);
      refreshUserData();
    }
  };

  const handleToggleDownload = (item: MusicItem) => {
    if (currentProfile) {
      toggleDownload(currentProfile.id, item);
      refreshUserData();
    }
  };

  const goHome = () => {
    setSearchResults(null);
    setSelectedGenre(null);
    setArtistView(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    if (searchResults || artistView) {
      setSearchResults(null);
      setArtistView(null);
    }
    setTimeout(() => {
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const element = document.getElementById(id);
      if (element) {
        const offset = 90;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }, 150);
  };

  if (!currentProfile) return <ProfileSelector profiles={profiles} onSelect={setCurrentProfile} onRefreshProfiles={refreshProfiles} />;

  return (
    <div className="min-h-screen bg-[#141414] text-white overflow-x-hidden">
      <Navbar 
        onSearch={async (q) => {
          if (!isOnline) return;
          setSelectedGenre(null);
          setSearchResults(await searchMusic(q));
          window.scrollTo(0, 0);
        }} 
        onLogoClick={goHome} 
        onNavigate={scrollToSection}
      />

      {itemForPlaylist && (
        <PlaylistModal 
          item={itemForPlaylist} 
          profileId={currentProfile.id} 
          onClose={() => { setItemForPlaylist(null); refreshUserData(); }} 
        />
      )}

      {showQuotaWarning && isOnline && (
        <div className="fixed top-24 left-4 right-4 md:left-12 md:right-auto md:w-96 bg-red-600/90 backdrop-blur-md text-white p-4 z-[60] rounded-xl shadow-2xl flex flex-col gap-3 border border-white/10">
          <div className="flex items-start gap-3">
             <AlertTriangle className="w-6 h-6 flex-shrink-0" />
             <div>
               <h4 className="font-bold text-sm">IA em Limite</h4>
               <p className="text-xs text-white/80">Configure sua própria API Key para continuar.</p>
             </div>
          </div>
          <button 
            onClick={async () => (window as any).aistudio?.openSelectKey && await (window as any).aistudio.openSelectKey()}
            className="w-full bg-white text-black py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" /> CONFIGURAR CHAVE
          </button>
        </div>
      )}

      <main className="relative z-10">
        {artistView && isOnline ? (
          <ArtistView 
            artist={artistView} 
            onBack={() => setArtistView(null)} 
            onPlay={handlePlay} 
            onToggleList={handleToggleList} 
            onToggleDownload={handleToggleDownload}
            checkInList={(id) => isInMyList(currentProfile.id, id)} 
            checkDownloaded={(id) => isDownloaded(currentProfile.id, id)}
          />
        ) : searchResults && isOnline ? (
          <div className="pt-24 px-6 md:px-12 min-h-screen animate-in fade-in duration-500">
             <div className="mt-12 mb-8">
                <h2 className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mb-4">Busca Inteligente por Letras</h2>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-8">Resultados para: <span className="text-red-600 italic">"{searchResults.title}"</span></h1>
                
                {/* Genre Filter Bar (YouTube Style) */}
                {searchResults.allGenres.length > 0 && (
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-6 sticky top-20 z-40 bg-[#141414] py-4 -mx-6 px-6">
                    <button 
                      onClick={() => setSelectedGenre(null)}
                      className={`px-5 py-2 rounded-full text-[11px] font-black tracking-widest transition-all border ${!selectedGenre ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/10 text-white hover:bg-white/5 hover:border-white/30'}`}
                    >
                      TODOS
                    </button>
                    {searchResults.allGenres.map(genre => (
                      <button 
                        key={genre}
                        onClick={() => setSelectedGenre(genre)}
                        className={`px-5 py-2 rounded-full text-[11px] font-black tracking-widest transition-all border whitespace-nowrap ${selectedGenre === genre ? 'bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'border-white/10 text-white hover:bg-white/5 hover:border-white/30'}`}
                      >
                        {genre.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
             </div>

             {/* Grouped Search Results with Semantic Logic */}
             <div className="space-y-20 pb-32">
                {searchResults.groups.map((group, idx) => {
                   const filteredItems = selectedGenre 
                     ? group.items.filter(i => i.genre?.toLowerCase() === selectedGenre.toLowerCase())
                     : group.items;

                   if (filteredItems.length === 0) return null;

                   return (
                     <div key={idx} className="animate-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                        <div className="flex items-center gap-4 mb-8">
                           <div className="h-10 w-1.5 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,1)]"></div>
                           <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter">{group.theme}</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                           {filteredItems.map(item => (
                             <div key={item.id} onClick={() => handlePlay(item)} className="cursor-pointer group/card flex flex-col">
                                <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/5 transition-all duration-500 group-hover/card:shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
                                  <img src={item.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" alt={item.title} />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                                    <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 transform scale-50 group-hover/card:scale-100 transition-transform duration-500">
                                      <Play className="w-7 h-7 text-white fill-white ml-1" />
                                    </div>
                                  </div>
                                  {item.genre && (
                                    <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg border border-white/10">
                                      {item.genre}
                                    </div>
                                  )}
                                  <div className="absolute bottom-2 right-3 text-[10px] font-black text-white/80 drop-shadow-md">
                                    {item.duration || "4:20"}
                                  </div>
                                </div>
                                <h3 className="font-bold text-base md:text-lg truncate group-hover/card:text-red-500 transition-colors leading-tight">{item.title}</h3>
                                <div className="flex items-center gap-2 mb-3">
                                  <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{item.artist}</p>
                                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                </div>
                                
                                {item.lyricsSnippet && (
                                  <div className="relative">
                                    <p className="text-gray-400 text-[12px] line-clamp-2 italic bg-white/[0.03] p-3 rounded-xl border border-white/5 group-hover/card:bg-white/[0.07] group-hover/card:border-white/10 transition-all leading-relaxed">
                                      "{item.lyricsSnippet}..."
                                    </p>
                                    <Music className="absolute -top-2 -right-2 w-5 h-5 text-red-600/20 group-hover/card:text-red-600/40 transition-colors" />
                                  </div>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>
                   );
                })}

                {searchResults.groups.every(g => (selectedGenre ? g.items.filter(i => i.genre?.toLowerCase() === selectedGenre.toLowerCase()).length === 0 : g.items.length === 0)) && (
                   <div className="flex flex-col items-center justify-center py-32 text-gray-600 text-center">
                      <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Music className="w-10 h-10 opacity-30" />
                      </div>
                      <p className="text-2xl font-black uppercase tracking-tighter mb-2">Sem resultados para este filtro</p>
                      <p className="text-sm font-medium mb-8">Tente buscar por outras palavras da letra ou limpe os filtros.</p>
                      <button 
                        onClick={() => setSelectedGenre(null)} 
                        className="bg-white text-black px-8 py-3 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95"
                      >
                        LIMPAR TODOS OS FILTROS
                      </button>
                   </div>
                )}
             </div>
          </div>
        ) : (
          <>
            {(isOnline && data?.hero) ? (
              <Hero 
                item={data.hero} 
                onPlay={handlePlay} 
                onToggleList={handleToggleList} 
                onOpenPlaylist={(item) => setItemForPlaylist(item)}
                onToggleDownload={handleToggleDownload}
                isInList={isInMyList(currentProfile.id, data.hero.id)} 
                isDownloaded={isDownloaded(currentProfile.id, data.hero.id)}
              />
            ) : initialLoading ? (
              <div className="h-[80vh] w-full bg-[#0f0f0f] animate-pulse flex items-center justify-center">
                 <div className="text-neutral-800 font-black text-6xl italic tracking-tighter opacity-20">STREAMFLOW</div>
              </div>
            ) : null}

            <div className={`relative z-40 pb-24 ${isOnline ? '-mt-16 md:-mt-28' : 'pt-24'}`}>
              <div id="row-downloads" className="min-h-[1px]">
                {downloads.length > 0 && (
                  <Row title="Meus Downloads" items={downloads} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
                )}
              </div>
              <div id="row-continue" className="min-h-[1px]">
                {continueWatching.length > 0 && isOnline && (
                  <Row title="Continuar Ouvindo" items={continueWatching} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
                )}
              </div>
              <div id="row-mylist" className="min-h-[1px]">
                {myList.length > 0 && isOnline && (
                  <Row title="Minha Lista" items={myList} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
                )}
              </div>
              <div id="row-history" className="min-h-[1px]">
                {history.length > 0 && isOnline && (
                  <Row title="Recém Tocadas" items={history} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
                )}
              </div>
              {isOnline && recommendations.length > 0 && (
                  <Row title="Feito para você" items={recommendations} onPlay={handlePlay} onArtistClick={async n => setArtistView(await fetchArtistDetails(n))} />
              )}
              {isOnline && data?.categories.map((cat, idx) => (
                <div key={cat.id} id={`row-cat-${idx}`}>
                  <Row title={cat.title} items={cat.items} onPlay={handlePlay} onArtistClick={async n => (isOnline && setArtistView(await fetchArtistDetails(n)))} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      {selectedItem && (
        <MusicPlayer 
          item={selectedItem} 
          profileId={currentProfile.id} 
          isOnline={isOnline}
          onClose={() => { setSelectedItem(null); refreshUserData(); }} 
        />
      )}
    </div>
  );
};

export default App;
