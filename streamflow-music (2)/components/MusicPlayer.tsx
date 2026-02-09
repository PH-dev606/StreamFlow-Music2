
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X, Play, Pause, WifiOff, RotateCcw, RotateCw, Shuffle, Repeat, Repeat1, Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { MusicItem } from '../types';
import { saveProgress, getProgressTime, isDownloaded } from '../services/storageService';

interface MusicPlayerProps {
  item: MusicItem;
  profileId: string;
  isOnline: boolean;
  onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ item, profileId, isOnline, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
  };

  const updateProgress = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      try {
        const current = playerRef.current.getCurrentTime();
        const total = playerRef.current.getDuration();
        if (current >= 0) setCurrentTime(current);
        if (total > 0) setDuration(total);
        saveProgress(profileId, item, current);
      } catch (e) {}
    }
  }, [item, profileId]);

  useEffect(() => {
    if (isPlaying && isOnline) {
      progressIntervalRef.current = window.setInterval(updateProgress, 1000);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [isPlaying, isOnline, updateProgress]);

  // Inicialização do Player com tratamento de erro robusto
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
      // Limpar player anterior se existir para evitar conflitos de ID
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null;
      }

      // Criar novo elemento para o player para garantir que o DOM esteja limpo
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
          enablejsapi: 1,
          showinfo: 0,
          iv_load_policy: 3
        },
        events: { 
          'onReady': (e: any) => {
            setIsLoading(false);
            setDuration(e.target.getDuration());
            e.target.playVideo();
          },
          'onStateChange': (e: any) => {
            setIsPlaying(e.data === (window as any).YT.PlayerState.PLAYING);
            if (e.data === (window as any).YT.PlayerState.PLAYING) {
              setIsLoading(false);
            }
          },
          'onError': (e: any) => {
            const errorCode = e.data;
            console.error("Erro YouTube:", errorCode);
            setIsLoading(false);
            
            if (errorCode === 101 || errorCode === 150 || errorCode === 153) {
              setError("Este vídeo tem restrições de exibição. Mudando para modo áudio...");
              setTimeout(() => setMode('audio'), 3000);
            } else {
              setError("Não foi possível carregar o vídeo. Tente o modo áudio.");
            }
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setup();
    } else {
      // Caso a API ainda esteja carregando
      const checkInterval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkInterval);
          setup();
        }
      }, 200);
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  }, [item.id, item.youtubeId, profileId, isOnline]);

  useEffect(() => {
    initPlayer();
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }
    };
  }, [initPlayer]);

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
            <div className="text-center px-4 overflow-hidden">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-1 drop-shadow-sm">Tocando Agora</p>
              <h1 className="text-sm md:text-base font-bold truncate max-w-[200px] md:max-w-md">{item.title}</h1>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-3 btn-active bg-white/5 rounded-full hover:bg-white/10 transition border border-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 mb-8 relative">
            {/* Área do Player */}
            <div className={`w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] relative group border border-white/5 transition-all duration-500 ${mode === 'video' && isOnline ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'}`}>
              
              <div ref={containerRef} className="w-full h-full" />
              
              <div className="absolute inset-0 bg-transparent" onClick={togglePlay} />

              {/* Estados de Interface do Player */}
              {isLoading && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                  <p className="text-xs font-black tracking-widest text-gray-500 uppercase">Sincronizando Stream...</p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center gap-4 backdrop-blur-md">
                  <AlertCircle className="w-16 h-16 text-red-600 mb-2" />
                  <h3 className="text-xl font-bold">Problema no Player</h3>
                  <p className="text-sm text-gray-400 max-w-xs">{error}</p>
                  <div className="flex gap-4 mt-4">
                    <button onClick={(e) => { e.stopPropagation(); initPlayer(); }} className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">
                      <RefreshCw className="w-4 h-4" /> Tentar Novamente
                    </button>
                    <a href={`https://youtube.com/watch?v=${item.youtubeId}`} target="_blank" className="flex items-center gap-2 bg-white/10 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-white/10">
                      <ExternalLink className="w-4 h-4" /> Ver no YouTube
                    </a>
                  </div>
                </div>
              )}

              {!isPlaying && !isLoading && !error && (
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none group-hover:bg-black/60 transition-all">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20">
                      <Play className="w-10 h-10 text-white fill-white ml-2" />
                    </div>
                 </div>
              )}
            </div>

            {/* Interface de Áudio (Exibida se modo áudio ou offline ou se houver erro) */}
            {(mode === 'audio' || !isOnline) && (
              <div className="text-center animate-in zoom-in-95 duration-700 flex flex-col items-center max-w-full">
                <div className="relative mb-8 md:mb-12">
                  <div className="absolute -inset-8 bg-gradient-to-tr from-red-600/30 to-purple-600/30 blur-[80px] opacity-40 rounded-full animate-pulse"></div>
                  <img 
                    src={item.thumbnailUrl} 
                    className={`relative w-64 h-64 md:w-96 md:h-96 rounded-[3rem] shadow-[0_50px_80px_rgba(0,0,0,1)] object-cover border border-white/10 transition-transform duration-1000 ${isPlaying ? 'scale-105' : 'scale-100'}`} 
                  />
                  {isPlaying && (
                    <div className="absolute -bottom-4 -right-4 bg-red-600 p-4 rounded-2xl shadow-2xl animate-bounce">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter leading-none px-4 truncate w-full max-w-2xl">{item.title}</h2>
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
            
            <div className="max-w-4xl mx-auto flex justify-center mb-8 gap-4">
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
                className="h-2 w-full bg-white/5 rounded-full cursor-pointer relative overflow-hidden mb-4 group-hover/progress:h-3 transition-all"
                onClick={handleProgressBarClick}
              >
                <div 
                  className="absolute h-full bg-red-600 rounded-full transition-all duration-150 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-black text-gray-500 tracking-[0.2em] uppercase">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between max-w-lg mx-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); }}
                className={`p-4 transition-all hover:scale-110 ${isShuffle ? 'text-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]' : 'text-gray-500 hover:text-white'}`}
              >
                <Shuffle className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-6 md:gap-14">
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
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <img src={item.thumbnailUrl} className="w-12 h-12 rounded-xl object-cover mr-5 shadow-2xl border border-white/10" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold truncate">{item.title}</h4>
            <p className="text-[10px] text-gray-500 truncate font-black uppercase tracking-widest">{item.artist}</p>
          </div>
          <div className="flex items-center gap-4 pr-2">
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
