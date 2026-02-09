
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X, Play, Pause, WifiOff, Download, RotateCcw, RotateCw, Shuffle, Repeat, Repeat1, Check, Loader2, ListMusic } from 'lucide-react';
import { MusicItem } from '../types';
import { saveProgress, getProgressTime, isDownloaded, completeDownload, getPendingDownloads } from '../services/storageService';

interface MusicPlayerProps {
  item: MusicItem;
  profileId: string;
  isOnline: boolean;
  onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ item, profileId, isOnline, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [isPlaying, setIsPlaying] = useState(isOnline);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const downloadAnimationRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [localDownloaded, setLocalDownloaded] = useState(isDownloaded(profileId, item.id));

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
  };

  const updateProgress = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      const current = playerRef.current.getCurrentTime();
      const total = playerRef.current.getDuration();
      setCurrentTime(current);
      setDuration(total);
      saveProgress(profileId, item, current);
    }
  }, [item, profileId]);

  // Inteligência de Sincronização em Segundo Plano
  useEffect(() => {
    const checkStatus = () => {
      const pending = getPendingDownloads(profileId);
      const downloaded = isDownloaded(profileId, item.id);
      
      setLocalDownloaded(downloaded);

      if (pending.includes(item.id) && !downloaded && downloadProgress === null) {
        startSmoothDownload();
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [item.id, profileId, downloadProgress]);

  const startSmoothDownload = () => {
    if (downloadProgress !== null) return;
    
    let progress = 0;
    const speed = (navigator as any).connection?.effectiveType === '4g' ? 0.8 : 0.3;
    
    setDownloadProgress(0);

    const animate = () => {
      progress += Math.random() * speed;
      if (progress >= 100) {
        setDownloadProgress(100);
        setTimeout(() => {
          completeDownload(profileId, item);
          setLocalDownloaded(true);
          setDownloadProgress(null);
        }, 500);
        return;
      }
      setDownloadProgress(progress);
      downloadAnimationRef.current = requestAnimationFrame(animate);
    };

    downloadAnimationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (downloadAnimationRef.current) cancelAnimationFrame(downloadAnimationRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPlaying && isOnline) {
      progressIntervalRef.current = window.setInterval(updateProgress, 1000);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [isPlaying, isOnline, updateProgress]);

  useEffect(() => {
    if (!isOnline) {
      setMode('audio');
      return;
    }

    const startTime = getProgressTime(profileId, item.id);
    const initPlayer = () => {
      if (playerRef.current?.loadVideoById) {
        playerRef.current.loadVideoById(item.youtubeId, startTime);
        return;
      }
      playerRef.current = new (window as any).YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: item.youtubeId,
        playerVars: { 
          autoplay: 1, 
          controls: 0,
          start: Math.floor(startTime), 
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          origin: window.location.origin
        },
        events: { 
          'onStateChange': (e: any) => {
            setIsPlaying(e.data === 1);
            if (e.data === 1) {
              setDuration(playerRef.current.getDuration());
            }
          }
        }
      });
    };

    const checkYT = setInterval(() => {
      if ((window as any).YT?.Player) { 
        clearInterval(checkYT); 
        initPlayer(); 
      }
    }, 100);
    return () => clearInterval(checkYT);
  }, [item.id, item.youtubeId, profileId, isOnline]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (isPlaying) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  };

  const skip = (seconds: number) => {
    if (!playerRef.current) return;
    const current = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(Math.max(0, Math.min(current + seconds, duration)), true);
    setCurrentTime(current + seconds);
  };

  const handleDownloadTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localDownloaded) return;
    startSmoothDownload();
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !playerRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedValue = (x / rect.width) * duration;
    playerRef.current.seekTo(clickedValue, true);
    setCurrentTime(clickedValue);
  };

  return (
    <div className={`fixed z-[100] transition-all duration-500 ease-in-out shadow-[0_-10px_40px_rgba(0,0,0,0.8)] overflow-hidden ${isExpanded ? 'inset-0 bg-[#0a0a0a] flex flex-col' : 'bottom-4 left-4 right-4 h-20 bg-[#1f1f1f]/95 rounded-2xl border border-white/10 flex items-center px-4 backdrop-blur-3xl'}`} onClick={() => !isExpanded && setIsExpanded(true)}>
      {isExpanded ? (
        <>
          <div className="flex justify-between items-center px-6 py-6 md:p-8 z-10">
            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-3 btn-active bg-white/5 rounded-full hover:bg-white/10 transition border border-white/5">
              <ChevronDown className="w-6 h-6" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-1 drop-shadow-sm">Now Playing</p>
              <h1 className="text-sm md:text-base font-bold truncate max-w-[200px] md:max-w-md">{item.title}</h1>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-3 btn-active bg-white/5 rounded-full hover:bg-white/10 transition border border-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 mb-8">
            {isOnline && mode === 'video' ? (
              <div className="w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] relative group border border-white/5">
                <div id="yt-player" className="w-full h-full pointer-events-none" />
                <div className="absolute inset-0 bg-transparent" onClick={togglePlay} />
                {!isPlaying && (
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <Play className="w-20 h-20 text-white opacity-60" />
                   </div>
                )}
              </div>
            ) : (
              <div className="text-center animate-in zoom-in-95 duration-700 flex flex-col items-center">
                <div className="relative mb-10">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-red-600/20 to-purple-600/20 blur-3xl opacity-50 rounded-full animate-pulse"></div>
                  <img src={item.thumbnailUrl} className="relative w-64 h-64 md:w-96 md:h-96 rounded-[3rem] shadow-[0_50px_80px_rgba(0,0,0,1)] object-cover border border-white/10" />
                  
                  {/* Floating Download Indicator */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                      <button 
                        onClick={handleDownloadTrigger}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full shadow-2xl transition-all btn-active border border-white/10 ${localDownloaded ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700 hover:text-white'}`}
                      >
                        {downloadProgress !== null ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[10px] font-black">{Math.floor(downloadProgress)}%</span>
                          </>
                        ) : localDownloaded ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase">Offline</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase">Baixar</span>
                          </>
                        )}
                      </button>
                  </div>
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter leading-none">{item.title}</h2>
                <p className="text-gray-400 text-base md:text-xl font-bold uppercase tracking-widest mb-6 opacity-60">{item.artist}</p>
                
                {!isOnline && (
                  <div className="bg-red-600/10 text-red-500 px-6 py-2 rounded-full text-[10px] font-black flex items-center gap-3 border border-red-600/20 tracking-widest">
                    <WifiOff className="w-4 h-4" /> MODO OFFLINE ATIVO
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 md:px-12 pb-12 md:pb-20 pt-4 bg-gradient-to-t from-[#050505] to-transparent">
            
            {/* Download Button inside controls for easier access */}
            <div className="max-w-4xl mx-auto flex justify-center mb-8 gap-4">
              <button 
                  onClick={handleDownloadTrigger}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all border shadow-lg ${localDownloaded ? 'border-blue-600/30 bg-blue-600/10 text-blue-500' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                  {downloadProgress !== null ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : localDownloaded ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadProgress !== null ? `${Math.floor(downloadProgress)}%` : localDownloaded ? 'Salvo' : 'Baixar Música'}
              </button>
              
              <div className="flex bg-white/5 rounded-2xl p-1 backdrop-blur-3xl border border-white/10 shadow-2xl">
                <button 
                  disabled={!isOnline} 
                  onClick={(e) => { e.stopPropagation(); setMode('video'); }} 
                  className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${mode === 'video' ? 'bg-white text-black shadow-inner' : 'text-gray-400 hover:text-white'} ${!isOnline && 'opacity-20'}`}
                >
                  VÍDEO
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setMode('audio'); }} 
                  className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${mode === 'audio' ? 'bg-white text-black shadow-inner' : 'text-gray-400 hover:text-white'}`}
                >
                  ÁUDIO
                </button>
              </div>
            </div>

            <div className="mb-10 group/progress relative max-w-4xl mx-auto">
              <div 
                ref={progressBarRef}
                className="h-2 w-full bg-white/5 rounded-full cursor-pointer relative overflow-hidden mb-4"
                onClick={handleProgressBarClick}
              >
                {/* Download Progress Bar Overlay */}
                {downloadProgress !== null && (
                   <div 
                    className="absolute h-full bg-blue-600/30 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                   />
                )}
                <div 
                  className="absolute h-full bg-red-600 rounded-full transition-all duration-150 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-black text-gray-500 tracking-[0.2em] uppercase">
                <span>{formatTime(currentTime)}</span>
                <span className="flex items-center gap-4">
                   {downloadProgress !== null && (
                     <span className="text-blue-500 flex items-center gap-2 animate-pulse">
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                       SYNCING {Math.floor(downloadProgress)}%
                     </span>
                   )}
                   {formatTime(duration)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between max-w-lg mx-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); }}
                className={`p-4 transition-all hover:scale-110 ${isShuffle ? 'text-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]' : 'text-gray-500 hover:text-white'}`}
              >
                <Shuffle className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-8 md:gap-14">
                <button onClick={(e) => { e.stopPropagation(); skip(-15); }} className="text-white hover:text-gray-400 transition btn-active relative group active:scale-90">
                  <RotateCcw className="w-9 h-9 opacity-80" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black mt-1 text-white">15</span>
                </button>

                <button onClick={togglePlay} className="bg-white text-black p-8 rounded-full btn-active shadow-[0_20px_50px_rgba(255,255,255,0.2)] transition active:scale-95 flex items-center justify-center border-4 border-white/10">
                  {isPlaying ? <Pause className="w-10 h-10 fill-black" /> : <Play className="w-10 h-10 fill-black ml-2" />}
                </button>

                <button onClick={(e) => { e.stopPropagation(); skip(15); }} className="text-white hover:text-gray-400 transition btn-active relative active:scale-90">
                  <RotateCw className="w-9 h-9 opacity-80" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black mt-1 text-white">15</span>
                </button>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none'); }}
                className={`p-4 transition-all hover:scale-110 ${repeatMode !== 'none' ? 'text-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]' : 'text-gray-500 hover:text-white'}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-6 h-6" /> : <Repeat className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 h-1 bg-white/5 w-full overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,1)]"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <img src={item.thumbnailUrl} className="w-12 h-12 rounded-xl object-cover mr-5 shadow-2xl border border-white/10" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold truncate flex items-center gap-2">
              {item.title}
              {localDownloaded && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,1)]"></div>}
            </h4>
            <p className="text-[10px] text-gray-500 truncate font-black uppercase tracking-widest">{item.artist}</p>
          </div>
          <div className="flex items-center gap-4 pr-2">
            {downloadProgress !== null && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
            <button onClick={togglePlay} className="p-2 btn-active">
              {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-gray-600 hover:text-white transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MusicPlayer;
