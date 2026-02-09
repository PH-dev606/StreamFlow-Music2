
import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Check, Loader2 } from 'lucide-react';
import { MusicItem } from '../types';

interface RowProps {
  title: string;
  items: MusicItem[];
  onPlay: (item: MusicItem) => void;
  onArtistClick: (artistName: string) => void;
  onToggleDownload?: (item: MusicItem) => void;
  checkDownloaded?: (itemId: string) => boolean;
}

const Row: React.FC<RowProps> = ({ title, items, onPlay, onArtistClick, onToggleDownload, checkDownloaded }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleDownload = (e: React.MouseEvent, item: MusicItem) => {
    e.stopPropagation();
    if (!onToggleDownload || !checkDownloaded) return;
    
    if (!checkDownloaded(item.id)) {
      setDownloadingIds(prev => new Set(prev).add(item.id));
      onToggleDownload(item);
      setTimeout(() => {
        setDownloadingIds(prev => {
          const n = new Set(prev);
          n.delete(item.id);
          return n;
        });
      }, 2000);
    } else {
      onToggleDownload(item);
    }
  };

  return (
    <div className="space-y-4 mb-12 md:mb-16 group relative pl-4 md:pl-12">
      <h2 className="inline-block cursor-pointer text-xl md:text-2xl font-bold text-white transition duration-200 hover:text-gray-300 mb-2">
        {title}
      </h2>

      <div className="relative md:-ml-2">
        <div 
          className={`absolute top-0 bottom-16 left-2 z-40 m-auto h-2/3 w-12 cursor-pointer bg-[#0f0f0f]/80 rounded-full transition duration-200 hover:bg-[#2a2a2a] opacity-0 group-hover:opacity-100 items-center justify-center flex shadow-xl border border-gray-800 ${!isMoved && 'hidden'}`}
          onClick={() => handleClick('left')}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </div>

        <div ref={rowRef} className="flex items-start space-x-4 overflow-x-scroll no-scrollbar md:p-2 py-2">
          {items.map((item) => {
            const isDownloaded = checkDownloaded?.(item.id);
            const isDownloading = downloadingIds.has(item.id);
            
            return (
              <div key={item.id} className="relative min-w-[260px] md:min-w-[320px] cursor-pointer group/card">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-4 shadow-lg" onClick={() => onPlay(item)}>
                    <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover transition duration-300 group-hover/card:scale-105" />
                    
                    {/* Botão de Download Rápido */}
                    {onToggleDownload && (
                      <button 
                        onClick={(e) => handleDownload(e, item)}
                        className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover/card:opacity-100 ${isDownloaded ? 'bg-blue-600 text-white' : 'bg-black/60 text-white hover:bg-white/20'}`}
                      >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : isDownloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                      </button>
                    )}

                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                        {item.duration || '3:45'}
                    </div>
                </div>

                <div className="flex gap-3 px-1">
                    <div className="flex-shrink-0 cursor-pointer pt-0.5" onClick={(e) => { e.stopPropagation(); onArtistClick(item.artist); }}>
                         <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden hover:ring-2 hover:ring-white transition border border-white/5">
                            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.artist}`} className="w-full h-full object-cover" />
                         </div>
                    </div>
                    
                    <div className="flex flex-col flex-grow min-w-0" onClick={() => onPlay(item)}>
                        <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 leading-tight mb-1 group-hover/card:text-red-500 transition-colors">{item.title}</h3>
                        <div className="text-gray-500 text-[11px] md:text-xs flex items-center gap-1 font-medium">
                            <span className="hover:text-white transition" onClick={(e) => { e.stopPropagation(); onArtistClick(item.artist); }}>{item.artist}</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-gray-600"></span>
                            <span>{item.year || '2024'}</span>
                        </div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        <div 
          className="absolute top-0 bottom-16 right-2 z-40 m-auto h-2/3 w-12 cursor-pointer bg-[#0f0f0f]/80 rounded-full transition duration-200 hover:bg-[#2a2a2a] opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-xl border border-gray-800"
          onClick={() => handleClick('right')}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default Row;
