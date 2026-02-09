
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X, Play, Pause, WifiOff, Download, RotateCcw, RotateCw, Shuffle, Repeat, Repeat1, Check, Loader2 } from 'lucide-react';
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

  // Inteligência de Download em Segundo Plano
  useEffect(() => {
    const checkBackgroundDownload = () => {
      const pending = getPendingDownloads(profileId);
      if (pending.includes(item.id) && !localDownloaded && downloadProgress === null) {
        startDownloadAnimation();
      }
    };
    checkBackgroundDownload();
    const interval = setInterval(checkBackgroundDownload, 5000);
    return () => clearInterval(interval);
  }, [item.id, localDownloaded]);

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

  const startDownloadAnimation = () => {
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev !== null && prev >= 100) {
          clearInterval(interval);
          completeDownload(profileId, item);
          setLocalDownloaded(true);
          return null;
        }
        return (prev || 0) + (Math.random() * 8 + 2);
      });
    }, 200);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localDownloaded) {
      // Já baixado
      return;
    }
    startDownloadAnimation();
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
    <div className={`fixed z-[100] transition-all duration-500 ease-in-out shadow-2xl overflow-hidden ${isExpanded ? 'inset-0 bg-[#0a0a0a] flex flex-col' : 'bottom-4 left-4 right-4 h-16 bg-[#1f1f1f]/90 rounded-xl border border-white/10 flex items-center px-4 backdrop-blur-2xl'}`} onClick={() => !isExpanded && setIsExpanded(true)}>
      {isExpanded ? (
        <>
          <div className="flex justify-between items-center px-6 py-6 md:p-8 z-10">
            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-2 btn-active bg-white/5 rounded-full hover:bg-white/10 transition">
              <ChevronDown className="w-6 h-6" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">StreamFlow Player</p>
              <h1 className="text-sm font-bold truncate max-w-[200px] md:max-w-md">{item.title}</h1>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 btn-active bg-white/5 rounded-full hover:bg-white/10 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 mb-8">
            {isOnline && mode === 'video' ? (
              <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative group">
                <div id="yt-player" className="w-full h-full pointer-events-none" />
                <div className="absolute inset-0 bg-transparent" onClick={togglePlay} />
              </div>
            ) : (
              <div className="text-center animate-in zoom-in-95 duration-500">
                <div className="relative mx-auto mb-8">
                  <img src={item.thumbnailUrl} className="w-64 h-64 md:w-80 md:h-80 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] object-cover border border-white/5" />
                  <button 
                    onClick={handleDownloadClick}
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg border-4 border-[#0a0a0a] transition btn-active ${localDownloaded ? 'bg-blue-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                  >
                    {downloadProgress !== null ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : localDownloaded ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <Download className="w-6 h-6 text-gray-300" />
                    )}
                  </button>
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">{item.title}</h2>
                <p className="text-gray-400 text-sm md:text-base font-medium mb-4">{item.artist}</p>
                {!isOnline && (
                  <div className="bg-amber-600/20 text-amber-500 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 mx-auto w-fit mb-6 border border-amber-600/30">
                    <WifiOff className="w-3.3 h-3.5" /> MODO OFFLINE ATIVO
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 md:px-12 pb-12 md:pb-16 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent">
            <div className="flex justify-center mb-8">
              <div className="flex bg-white/5 rounded-full p-1.5 backdrop-blur-md border border-white/10 shadow-xl">
                <button 
                  disabled={!isOnline} 
                  onClick={(e) => { e.stopPropagation(); setMode('video'); }} 
                  className={`px-8 py-2 rounded-full text-[10px] font-black transition-all ${mode === 'video' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'} ${!isOnline && 'opacity-20'}`}
                >
                  VÍDEO
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setMode('audio'); }} 
                  className={`px-8 py-2 rounded-full text-[10px] font-black transition-all ${mode === 'audio' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  ÁUDIO
                </button>
              </div>
            </div>

            <div className="mb-6 group/progress relative max-w-4xl mx-auto">
              <div 
                ref={progressBarRef}
                className="h-1.5 w-full bg-white/10 rounded-full cursor-pointer relative overflow-visible mb-3"
                onClick={handleProgressBarClick}
              >
                {/* Visual Download Overlay */}
                {downloadProgress !== null && (
                   <div 
                    className="absolute h-full bg-blue-600/40 rounded-full transition-all duration-300 z-0"
                    style={{ width: `${downloadProgress}%` }}
                   />
                )}
                <div 
                  className="absolute h-full bg-red-600 rounded-full transition-all duration-150 relative z-10"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
                </div>
              </div>
              <div className="flex justify-between text-[11px] font-black text-gray-500 tracking-tighter uppercase">
                <span>{formatTime(currentTime)}</span>
                <span className="flex items-center gap-3">
                   {downloadProgress !== null && (
                     <span className="text-blue-500 flex items-center gap-1.5 animate-pulse">
                       <Loader2 className="w-3 h-3 animate-spin" />
                       SMART SYNCING {Math.floor(downloadProgress)}%
                     </span>
                   )}
                   {formatTime(duration)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between max-w-lg mx-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); }}
                className={`p-3 transition-colors ${isShuffle ? 'text-red-600' : 'text-gray-400 hover:text-white'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-6 md:gap-10">
                <button onClick={(e) => { e.stopPropagation(); skip(-15); }} className="text-white hover:text-gray-300 transition btn-active relative group">
                  <RotateCcw className="w-8 h-8" />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black mt-1.5">15</span>
                </button>

                <button onClick={togglePlay} className="bg-white text-black p-6 rounded-full btn-active shadow-[0_0_40px_rgba(255,255,255,0.25)] transition active:scale-90 flex items-center justify-center">
                  {isPlaying ? <Pause className="w-9 h-9 fill-black" /> : <Play className="w-9 h-9 fill-black ml-1.5" />}
                </button>

                <button onClick={(e) => { e.stopPropagation(); skip(15); }} className="text-white hover:text-gray-300 transition btn-active relative">
                  <RotateCw className="w-8 h-8" />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black mt-1.5">15</span>
                </button>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none'); }}
                className={`p-3 transition-colors ${repeatMode !== 'none' ? 'text-red-600' : 'text-gray-400 hover:text-white'}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 h-1 bg-white/5 w-full overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <img src={item.thumbnailUrl} className="w-10 h-10 rounded-lg object-cover mr-4 shadow-lg border border-white/5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold truncate flex items-center gap-2">
              {item.title}
              {localDownloaded && <Check className="w-2.5 h-2.5 text-blue-500" />}
            </h4>
            <p className="text-[10px] text-gray-500 truncate font-bold uppercase tracking-widest">{item.artist}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2 btn-active">
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-gray-500 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MusicPlayer;
