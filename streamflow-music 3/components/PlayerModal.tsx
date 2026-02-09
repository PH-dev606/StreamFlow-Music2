import React from 'react';
import { X } from 'lucide-react';
import { MusicItem } from '../types';

interface PlayerModalProps {
  item: MusicItem;
  onClose: () => void;
}

const PlayerModal: React.FC<PlayerModalProps> = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-300">
      <div className="absolute top-4 right-4 z-[101]">
        <button 
          onClick={onClose}
          className="bg-black/50 hover:bg-black/80 rounded-full p-2 text-white transition border border-white/20"
        >
          <X className="w-8 h-8" />
        </button>
      </div>

      <div className="w-full h-full md:w-[90%] md:h-[90%] bg-black relative shadow-2xl overflow-hidden">
        {/* YouTube Embed */}
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1`}
          title={item.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
      </div>
      
      {/* Mobile Title Overlay (fades out) */}
      <div className="absolute bottom-10 left-0 w-full text-center pointer-events-none md:hidden">
         <h2 className="text-white font-bold text-lg drop-shadow-md">{item.title}</h2>
         <p className="text-gray-300 text-sm drop-shadow-md">{item.artist}</p>
      </div>
    </div>
  );
};

export default PlayerModal;