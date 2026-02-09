
import React, { useState } from 'react';
import { Play, Plus, Check, Download, Loader2, ListMusic } from 'lucide-react';
import { MusicItem } from '../types';

interface HeroProps {
  item: MusicItem;
  onPlay: (item: MusicItem) => void;
  onToggleList: (item: MusicItem) => void;
  onOpenPlaylist: (item: MusicItem) => void;
  onToggleDownload: (item: MusicItem) => void;
  isInList: boolean;
  isDownloaded: boolean;
}

const Hero: React.FC<HeroProps> = ({ item, onPlay, onToggleList, onOpenPlaylist, onToggleDownload, isInList, isDownloaded }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDownloaded) {
      setIsDownloading(true);
      setTimeout(() => {
        setIsDownloading(false);
        onToggleDownload(item);
      }, 1500);
    } else {
      onToggleDownload(item);
    }
  };

  return (
    <div className="relative h-[85vh] md:h-[95vh] w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={item.backdropUrl} 
          alt={item.title} 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent"></div>
      </div>

      <div className="absolute bottom-[25%] left-0 w-full px-6 md:px-12 z-30">
        <div className="max-w-2xl hero-content-wrapper flex flex-col items-start pointer-events-none">
          <h1 className="text-4xl md:text-7xl font-black mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-tight tracking-tighter pointer-events-auto">
            {item.title}
          </h1>
          
          <div className="flex items-center gap-4 mb-4 text-xs md:text-sm font-bold pointer-events-auto">
            <span className="text-green-500">{item.matchScore}% relevante</span>
            <span className="text-gray-300">{item.year}</span>
            <span className="border border-gray-600 px-2 py-0.5 rounded text-[10px] uppercase">HD</span>
          </div>

          <p className="text-lg md:text-2xl font-bold mb-2 text-white/95 pointer-events-auto">{item.artist}</p>
          <p className="text-sm md:text-lg text-gray-300 mb-8 line-clamp-2 md:line-clamp-3 max-w-lg leading-relaxed drop-shadow-md pointer-events-auto">
            {item.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2 pointer-events-auto">
            <button 
              onClick={() => onPlay(item)}
              className="bg-white text-black px-8 py-3.5 rounded-md flex items-center gap-3 font-black text-sm md:text-lg hover:bg-white/90 transition btn-active shadow-2xl"
            >
              <Play className="w-6 h-6 fill-black" />
              Assistir
            </button>
            
            <button 
              onClick={() => onToggleList(item)}
              className="bg-gray-500/40 text-white px-6 py-3.5 rounded-md flex items-center gap-3 font-bold text-sm md:text-lg hover:bg-gray-500/60 transition btn-active backdrop-blur-xl border border-white/10"
            >
              {isInList ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              Lista
            </button>

            <button 
              onClick={() => onOpenPlaylist(item)}
              className="bg-gray-500/40 text-white px-6 py-3.5 rounded-md flex items-center gap-3 font-bold text-sm md:text-lg hover:bg-gray-500/60 transition btn-active backdrop-blur-xl border border-white/10"
            >
              <ListMusic className="w-6 h-6" />
              Playlist
            </button>

            <button 
              onClick={handleDownload}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition btn-active backdrop-blur-xl border border-white/10 shadow-lg ${isDownloaded ? 'bg-blue-600/60 text-white' : 'bg-gray-500/20 text-gray-300 hover:text-white'}`}
            >
              {isDownloading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : isDownloaded ? (
                <Check className="w-6 h-6" />
              ) : (
                <Download className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
