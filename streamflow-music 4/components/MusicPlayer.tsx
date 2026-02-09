
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X, Play, Pause, RotateCcw, RotateCw, Video, Music, Download, Check, Loader2, ListMusic } from 'lucide-react';
import { MusicItem } from '../types';
import { saveProgress, getProgressTime, toggleDownload, isDownloaded } from '../services/storageService';

interface MusicPlayerProps {
  item: MusicItem;
  profileId: string;
  isOnline: boolean;
  onClose: () => void;
  onToggleDownload?: (item: MusicItem) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ item, profileId, isOnline, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
  };

  const updateMediaSession = useCallback(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.artist,
        album: 'StreamFlow Music',
        artwork: [{ src: item.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => playerRef.current?.playVideo());
      navigator.mediaSession.setActionHandler('pause', () => playerRef.current?.pauseVideo());
      navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => skip(15));
    }
  }, [item]);

  const updateProgress = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      const current = playerRef.current.getCurrentTime();
      if (current >= 0) setCurrentTime(current);
      saveProgress(profileId, item, current);
    }
  }, [item, profileId]);

  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(updateProgress, 1000);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [isPlaying, updateProgress]);

  const initPlayer = useCallback(() => {
    if (!isOnline) {
      setMode('audio');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const startTime = getProgressTime(profileId, item.id);

    const setup = () => {
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try { playerRef.current.loadVideoById(item.youtubeId, startTime); } catch(e) {}
        return;
      }

      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-player-instance';
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(playerDiv);
      }

      playerRef.current = new (window as any).YT.Player('yt-player-instance', {
        height: '100%',
        width: '100%',
        videoId: item.youtubeId,
        playerVars: { 
          autoplay: 1, 
          controls: 0,
          start: Math.floor(startTime), 
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1
        },
        events: { 
          'onReady': (e: any) => {
            setIsLoading(false);
            setDuration(e.target.getDuration());
            e.target.playVideo();
            updateMediaSession();
          },
          'onStateChange': (e: any) => {
            const state = e.data;
            setIsPlaying(state === (window as any).YT.PlayerState.PLAYING);
            if (state === (window as any).YT.PlayerState.PLAYING) setIsLoading(false);
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = state === (window as any).YT.PlayerState.PLAYING ? 'playing' : 'paused';
            }
          },
          'onError': () => {
            setIsLoading(false);
            setError("Vídeo indisponível.");
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) setup();
  }, [item.id, item.youtubeId, profileId, isOnline, updateMediaSession]);

  useEffect(() => {
    initPlayer();
  }, [initPlayer]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPlaying) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  };

  const skip = (seconds: number) => {
    if (!playerRef.current) return;
    const current = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(Math.max(0, current + seconds), true);
  };

  const handleDownloadInPlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDownloaded(profileId, item.id)) {
      setIsDownloading(true);
      toggleDownload(profileId, item);
      setTimeout(() => setIsDownloading(false), 2000);
    } else {
      toggleDownload(profileId, item);
    }
  };

  const currentlyDownloaded = isDownloaded(profileId, item.id);

  return (
    <div 
      className={`fixed z-[100] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_-10px_60px_rgba(0,0,0,0.9)] overflow-hidden bg-[#0a0a0a] ${isExpanded ? 'inset-0' : 'bottom-4 left-4 right-4 h-20 rounded-2xl border border-white/10 flex items-center px-4 backdrop-blur-3xl'}`}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div 
        className={`fixed transition-all duration-700 pointer-events-none ${isExpanded && mode === 'video' ? 'inset-0 opacity-100' : 'opacity-0 scale-50'}`}
        style={{ zIndex: isExpanded ? 5 : -1 }}
      >
        <div ref={containerRef} className="w-full h-full pointer-events-auto" />
        <div className="absolute inset-0 bg-transparent pointer-events-auto" onClick={togglePlay} />
      </div>

      {isExpanded ? (
        <div className="relative z-10 h-full flex flex-col animate-in fade-in duration-500 bg-gradient-to-b from-black/60 to-black/90">
          {/* Header */}
          <div className="flex justify-between items-center p-6 md:p-8">
            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition border border-white/10">
              <ChevronDown className="w-6 h-6" />
            </button>
            <div className="text-center px-4 flex flex-col items-center">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-1">Tocando Agora</span>
              <h1 className="text-sm font-bold truncate max-w-[200px] md:max-w-md">{item.title}</h1>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition border border-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {mode === 'audio' ? (
              <div className="text-center animate-in zoom-in-95 duration-700 w-full max-w-lg">
                <div className="relative mb-8 group flex justify-center">
                  <div className={`absolute w-64 h-64 md:w-80 md:h-80 bg-red-600/30 blur-[120px] rounded-full transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />
                  <img src={item.thumbnailUrl} className={`w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] object-cover border border-white/10 transition-all duration-1000 ${isPlaying ? 'scale-105 shadow-red-900/20' : 'scale-100'}`} />
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-1 tracking-tight truncate px-4">{item.title}</h2>
                <p className="text-gray-500 text-sm md:text-base font-bold uppercase tracking-[0.2em] mb-8">{item.artist}</p>
                
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setMode('video')}
                    className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-full flex items-center gap-3 border border-white/10 transition group"
                  >
                    <Video className="w-4 h-4 text-red-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Vídeo</span>
                  </button>
                  <button 
                    onClick={handleDownloadInPlayer}
                    className={`px-6 py-3 rounded-full flex items-center gap-3 border transition group ${currentlyDownloaded ? 'bg-blue-600/20 border-blue-600 text-blue-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : currentlyDownloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{currentlyDownloaded ? 'Baixado' : 'Download'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center mb-8 pointer-events-none flex flex-col gap-4">
                 <button 
                  onClick={(e) => { e.stopPropagation(); setMode('audio'); }}
                  className="bg-black/60 backdrop-blur-3xl text-white px-8 py-4 rounded-full flex items-center gap-3 border border-white/20 pointer-events-auto hover:bg-black/80 transition shadow-2xl"
                >
                  <Music className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-black uppercase tracking-widest">Apenas Áudio</span>
                </button>
                <div className="flex justify-center gap-4 pointer-events-auto">
                   <button onClick={handleDownloadInPlayer} className={`p-3 rounded-full backdrop-blur-xl border border-white/20 shadow-xl transition-all ${currentlyDownloaded ? 'bg-blue-600 text-white' : 'bg-black/60 text-white hover:bg-white/10'}`}>
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : currentlyDownloaded ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls Footer */}
          <div className="px-6 md:px-12 pb-12">
            <div className="max-w-2xl mx-auto mb-8">
              <div 
                ref={progressBarRef}
                className="h-1.5 w-full bg-white/10 rounded-full cursor-pointer relative mb-3 group/bar"
                onClick={(e) => {
                  if (!progressBarRef.current) return;
                  const rect = progressBarRef.current.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  playerRef.current?.seekTo(percent * duration, true);
                }}
              >
                <div 
                  className="absolute h-full bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                  style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 md:gap-12 mb-8">
              <button onClick={() => skip(-15)} className="text-white/60 hover:text-white transition active:scale-90 p-2">
                <RotateCcw className="w-8 h-8" />
              </button>
              <button onClick={() => togglePlay()} className="bg-white text-black p-7 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition">
                {isPlaying ? <Pause className="w-9 h-9 fill-black" /> : <Play className="w-9 h-9 fill-black ml-1.5" />}
              </button>
              <button onClick={() => skip(15)} className="text-white/60 hover:text-white transition active:scale-90 p-2">
                <RotateCw className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex items-center animate-in slide-in-from-bottom-2 duration-300 h-full">
           <img src={item.thumbnailUrl} className="w-12 h-12 rounded-lg object-cover mr-4 shadow-lg border border-white/10" />
           <div className="flex-1 min-w-0">
             <h4 className="text-sm font-bold truncate leading-none mb-1">{item.title}</h4>
             <p className="text-[10px] text-gray-500 truncate font-black uppercase tracking-widest">{item.artist}</p>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-3 hover:bg-white/5 rounded-full transition">
               {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
             </button>
             <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-3 hover:bg-white/5 rounded-full transition text-gray-400">
               <X className="w-6 h-6" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;
