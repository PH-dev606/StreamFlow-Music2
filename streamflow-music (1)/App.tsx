
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, WifiOff, Download, AlertTriangle, Key } from 'lucide-react';
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
import { AppData, MusicItem, Category, ArtistDetails, Profile, Playlist } from './types';

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
  const [searchResults, setSearchResults] = useState<Category | null>(null);
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
      const currentHistory = getHistory(currentProfile.id);
      setMyList(getMyList(currentProfile.id));
      setHistory(currentHistory);
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

  const loadRecommendations = useCallback(async () => {
    if (currentProfile && history.length > 0 && isOnline) {
      const recs = await fetchRecommendations(history, currentProfile.isKid);
      setRecommendations(recs);
    }
  }, [currentProfile, history, isOnline]);

  useEffect(() => {
    if (currentProfile) {
      refreshUserData();
      loadHomeData(currentProfile.isKid);
    }
  }, [currentProfile, isOnline, refreshUserData]);

  useEffect(() => {
    if (history.length > 0) {
      loadRecommendations();
    }
  }, [history, loadRecommendations]);

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        window.location.reload(); 
    }
  };

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
    setArtistView(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    setSearchResults(null);
    setArtistView(null);
    
    // Timeout pequeno para garantir que a home renderizou antes do scroll
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const offset = 100; // Espaço para a Navbar
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  if (!currentProfile) return <ProfileSelector profiles={profiles} onSelect={setCurrentProfile} onRefreshProfiles={refreshProfiles} />;

  return (
    <div className="min-h-screen bg-[#141414] text-white overflow-x-hidden">
      <Navbar 
        onSearch={async (q) => {
          if (!isOnline) return;
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
        <div className="fixed top-24 left-4 right-4 md:left-12 md:right-auto md:w-96 bg-red-600/90 backdrop-blur-md text-white p-4 z-[60] rounded-xl shadow-2xl flex flex-col gap-3 animate-in slide-in-from-left duration-500 border border-white/10">
          <div className="flex items-start gap-3">
             <AlertTriangle className="w-6 h-6 flex-shrink-0" />
             <div>
               <h4 className="font-bold text-sm">IA Limitada</h4>
               <p className="text-xs text-white/80 leading-relaxed">Troque sua chave para continuar explorando.</p>
             </div>
          </div>
          <button 
            onClick={handleOpenKeySelector}
            className="w-full bg-white text-black py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            CONFIGURAR MINHA CHAVE
          </button>
        </div>
      )}

      {!isOnline && (
        <div className="fixed top-16 left-0 w-full bg-amber-600/90 text-white py-1.5 px-4 z-[45] flex items-center justify-center gap-2 text-xs font-bold shadow-lg">
          <WifiOff className="w-4 h-4" />
          VOCÊ ESTÁ OFFLINE • MOSTRANDO DOWNLOADS
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
          <div className="pt-24 px-6 md:px-12 min-h-screen">
             <h2 className="text-xl font-bold mb-6 mt-10">{searchResults.title}</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.items.map(item => (
                  <div key={item.id} onClick={() => handlePlay(item)} className="cursor-pointer group">
                     <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                       <img src={item.thumbnailUrl} className="w-full h-full object-cover transition group-hover:scale-105" />
                       <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                         <Play className="w-8 h-8 text-white fill-white" />
                       </div>
                     </div>
                     <h3 className="font-bold text-xs md:text-sm truncate">{item.title}</h3>
                     <p className="text-gray-500 text-[10px] md:text-xs">{item.artist}</p>
                  </div>
                ))}
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
              <div className="h-[80vh] w-full bg-neutral-900 animate-pulse flex items-center justify-center">
                 <div className="text-neutral-800 font-black text-6xl italic">STREAMFLOW</div>
              </div>
            ) : null}

            <div className={`relative z-40 pb-24 ${isOnline ? '-mt-16 md:-mt-28' : 'pt-24'}`}>
              <div id="row-downloads">
                {downloads.length > 0 && (
                  <Row title="Meus Downloads" items={downloads} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
                )}
              </div>
              
              {continueWatching.length > 0 && isOnline && (
                <Row title="Continuar Ouvindo" items={continueWatching} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
              )}

              <div id="row-mylist">
                {myList.length > 0 && isOnline && (
                  <Row title="Minha Lista" items={myList} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
                )}
              </div>

              {recommendations.length > 0 && isOnline && (
                <Row title="Recomendado para você" items={recommendations} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
              )}

              {userPlaylists.length > 0 && isOnline && userPlaylists.map(pl => pl.items.length > 0 && (
                <Row key={pl.id} title={pl.name} items={pl.items} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
              ))}

              <div id="row-history">
                {history.length > 0 && isOnline && (
                  <Row title="Histórico de Reprodução" items={history} onPlay={handlePlay} onArtistClick={async n => isOnline && setArtistView(await fetchArtistDetails(n))} />
                )}
              </div>
              
              {initialLoading ? (
                <div className="px-12 space-y-12">
                   {[1,2].map(i => (
                     <div key={i} className="space-y-4">
                        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
                     </div>
                   ))}
                </div>
              ) : isOnline && (
                <>
                  {data?.categories.map((cat, idx) => (
                    <div key={cat.id} id={`row-cat-${idx}`}>
                      <Row title={cat.title} items={cat.items} onPlay={handlePlay} onArtistClick={async n => (isOnline && setArtistView(await fetchArtistDetails(n)))} />
                    </div>
                  ))}
                </>
              )}
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
