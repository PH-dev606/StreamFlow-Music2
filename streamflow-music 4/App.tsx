
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Row from './components/Row';
import MusicPlayer from './components/MusicPlayer';
import ArtistView from './components/ArtistView';
import ProfileSelector from './components/ProfileSelector';
import PlaylistModal from './components/PlaylistModal';
import { fetchHomeData, searchMusic, fetchArtistDetails } from './services/geminiService';
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
  const [downloads, setDownloads] = useState<MusicItem[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [continueWatching, setContinueWatching] = useState<MusicItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MusicItem | null>(null);
  const [itemForPlaylist, setItemForPlaylist] = useState<MusicItem | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [artistView, setArtistView] = useState<ArtistDetails | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const handleToggleDownload = (item: MusicItem) => {
    if (currentProfile) {
      toggleDownload(currentProfile.id, item);
      refreshUserData();
    }
  };

  const scrollToSection = (id: string) => {
    setSearchResults(null);
    setArtistView(null);
    setTimeout(() => {
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const element = document.getElementById(id);
        if (element) {
          const offset = 90;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = element.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }
    }, 150);
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
        onLogoClick={() => scrollToSection('top')} 
        onNavigate={scrollToSection}
      />

      <main className="relative z-10">
        {artistView && isOnline ? (
          <ArtistView 
            artist={artistView} 
            onBack={() => setArtistView(null)} 
            onPlay={handlePlay} 
            onToggleList={item => toggleMyList(currentProfile.id, item)} 
            onToggleDownload={handleToggleDownload}
            checkInList={(id) => isInMyList(currentProfile.id, id)} 
            checkDownloaded={(id) => isDownloaded(currentProfile.id, id)}
          />
        ) : searchResults ? (
          <div className="pt-28 px-6 md:px-12 min-h-screen pb-32">
             <h1 className="text-3xl font-black mb-12 uppercase tracking-tighter italic">Resultados para: {searchResults.title}</h1>
             {searchResults.groups.map((group, idx) => (
               <Row 
                  key={idx} 
                  title={group.theme} 
                  items={group.items} 
                  onPlay={handlePlay} 
                  onArtistClick={async n => setArtistView(await fetchArtistDetails(n))} 
                  onToggleDownload={handleToggleDownload}
                  checkDownloaded={id => isDownloaded(currentProfile.id, id)}
               />
             ))}
          </div>
        ) : (
          <>
            {initialLoading ? (
               <div className="h-screen w-full flex items-center justify-center bg-[#141414]">
                 <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                    <span className="text-xs font-black uppercase tracking-[0.4em] animate-pulse">StreamFlow IA está preparando seu palco...</span>
                 </div>
               </div>
            ) : (
              <>
                {data?.hero && (
                  <Hero 
                    item={data.hero} 
                    onPlay={handlePlay} 
                    onToggleList={item => { toggleMyList(currentProfile.id, item); refreshUserData(); }} 
                    onOpenPlaylist={item => setItemForPlaylist(item)}
                    onToggleDownload={handleToggleDownload}
                    isInList={isInMyList(currentProfile.id, data.hero.id)} 
                    isDownloaded={isDownloaded(currentProfile.id, data.hero.id)}
                  />
                )}

                <div className="relative z-40 pb-24 -mt-16 md:-mt-28">
                  {downloads.length > 0 && (
                    <div id="row-downloads">
                      <Row title="Downloads Concluídos" items={downloads} onPlay={handlePlay} onArtistClick={async n => setArtistView(await fetchArtistDetails(n))} onToggleDownload={handleToggleDownload} checkDownloaded={id => isDownloaded(currentProfile.id, id)} />
                    </div>
                  )}
                  {continueWatching.length > 0 && (
                    <div id="row-continue">
                      <Row title="Continue Ouvindo" items={continueWatching} onPlay={handlePlay} onArtistClick={async n => setArtistView(await fetchArtistDetails(n))} onToggleDownload={handleToggleDownload} checkDownloaded={id => isDownloaded(currentProfile.id, id)} />
                    </div>
                  )}
                  {myList.length > 0 && (
                    <div id="row-mylist">
                      <Row title="Sua Lista" items={myList} onPlay={handlePlay} onArtistClick={async n => setArtistView(await fetchArtistDetails(n))} onToggleDownload={handleToggleDownload} checkDownloaded={id => isDownloaded(currentProfile.id, id)} />
                    </div>
                  )}
                  {history.length > 0 && (
                    <div id="row-history">
                      <Row title="Histórico de Execução" items={history} onPlay={handlePlay} onArtistClick={async n => setArtistView(await fetchArtistDetails(n))} onToggleDownload={handleToggleDownload} checkDownloaded={id => isDownloaded(currentProfile.id, id)} />
                    </div>
                  )}
                  {data?.categories.map((cat, idx) => (
                    <div key={cat.id} id={`row-cat-${idx}`}>
                      <Row title={cat.title} items={cat.items} onPlay={handlePlay} onArtistClick={async n => setArtistView(await fetchArtistDetails(n))} onToggleDownload={handleToggleDownload} checkDownloaded={id => isDownloaded(currentProfile.id, id)} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {itemForPlaylist && <PlaylistModal item={itemForPlaylist} profileId={currentProfile.id} onClose={() => setItemForPlaylist(null)} />}
      
      {selectedItem && (
        <MusicPlayer 
          item={selectedItem} 
          profileId={currentProfile.id} 
          isOnline={isOnline}
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};

export default App;
