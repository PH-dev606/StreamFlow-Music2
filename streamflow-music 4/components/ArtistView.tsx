
import React, { useState } from 'react';
import { ArrowLeft, Play, Plus, Check, Download, Loader2 } from 'lucide-react';
import { ArtistDetails, MusicItem } from '../types';

interface ArtistViewProps {
  artist: ArtistDetails;
  onBack: () => void;
  onPlay: (item: MusicItem) => void;
  onToggleList: (item: MusicItem) => void;
  onToggleDownload: (item: MusicItem) => void;
  checkInList: (itemId: string) => boolean;
  checkDownloaded: (itemId: string) => boolean;
}

const ArtistView: React.FC<ArtistViewProps> = ({ 
  artist, onBack, onPlay, onToggleList, onToggleDownload, checkInList, checkDownloaded 
}) => {
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const currentAlbum = artist.albums[selectedSeason];

  const handleDownload = (e: React.MouseEvent, song: MusicItem) => {
    e.stopPropagation();
    const isDownloaded = checkDownloaded(song.id);
    if (!isDownloaded) {
      setDownloadingIds(prev => new Set(prev).add(song.id));
      setTimeout(() => {
        setDownloadingIds(prev => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
        onToggleDownload(song);
      }, 1200);
    } else {
      onToggleDownload(song);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white z-40 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <button 
        onClick={onBack}
        className="fixed top-20 left-4 md:left-12 z-50 bg-black/50 hover:bg-black/80 p-2 rounded-full backdrop-blur-md transition btn-active border border-white/10"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="relative h-[60vh] w-full">
        <div className="absolute inset-0">
          <img src={artist.backdropUrl} alt={artist.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent"></div>
        </div>

        <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-12">
            <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter drop-shadow-2xl">{artist.name}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-8 text-xs md:text-sm font-bold text-gray-200">
                <span className="text-green-500">{artist.matchScore}% relevante</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] border border-white/20 uppercase tracking-widest">ARTISTA VERIFICADO</span>
                <div className="flex gap-3">
                    {artist.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-gray-400 font-medium">• {tag}</span>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button 
                    onClick={() => currentAlbum?.songs[0] && onPlay(currentAlbum.songs[0])}
                    className="bg-white text-black px-10 py-3.5 rounded-md font-black flex items-center gap-3 hover:bg-gray-200 transition btn-active shadow-2xl text-base"
                >
                    <Play className="w-5 h-5 fill-black" />
                    Reproduzir
                </button>
            </div>
        </div>
      </div>

      <div className="px-4 md:px-12 pb-24 -mt-4 relative z-10">
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
            <h3 className="text-xl font-black uppercase tracking-widest">Faixas</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Filtrar por</span>
              <select 
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="bg-[#1f1f1f] text-white border border-white/10 rounded-md px-4 py-2 text-xs font-bold outline-none cursor-pointer hover:bg-[#2a2a2a] transition shadow-lg"
              >
                  {artist.albums.map((album, idx) => (
                      <option key={album.id} value={idx}>{album.title}</option>
                  ))}
              </select>
            </div>
        </div>

        <div className="space-y-4 max-w-6xl mx-auto">
            {currentAlbum?.songs.map((song, idx) => {
                const inList = checkInList(song.id);
                const isDownloaded = checkDownloaded(song.id);
                const isDownloading = downloadingIds.has(song.id);
                return (
                <div 
                    key={song.id} 
                    className="flex flex-col md:flex-row items-start md:items-center gap-4 group p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
                    onClick={() => onPlay(song)}
                >
                    <div className="flex-shrink-0 text-gray-700 font-black text-lg w-8 hidden md:block group-hover:text-white transition-colors">{idx + 1}</div>
                    
                    <div className="relative flex-shrink-0 w-full md:w-44 aspect-video rounded-lg overflow-hidden shadow-xl border border-white/5">
                        <img src={song.thumbnailUrl} alt={song.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                             <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                             </div>
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 bg-black/90 px-1.5 py-0.5 rounded text-[10px] font-black text-white">{song.duration}</div>
                    </div>

                    <div className="flex-grow flex flex-col gap-1">
                        <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-base md:text-lg group-hover:text-red-600 transition-colors leading-tight">{song.title}</h4>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleList(song); }}
                                    className="text-gray-500 hover:text-white transition-all p-2 bg-white/5 rounded-full"
                                >
                                    {inList ? <Check className="w-5 h-5 text-green-500" /> : <Plus className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={(e) => handleDownload(e, song)}
                                    className={`transition-all p-2 bg-white/5 rounded-full ${isDownloaded ? 'text-blue-500' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-500 text-xs md:text-sm line-clamp-2 leading-relaxed max-w-2xl font-medium">{song.description}</p>
                    </div>
                </div>
            )})}
        </div>
      </div>
    </div>
  );
};

export default ArtistView;
