
import React, { useState } from 'react';
import { X, Plus, ListMusic, Check } from 'lucide-react';
import { MusicItem, Playlist } from '../types';
import { getPlaylists, createPlaylist, addToPlaylist } from '../services/storageService';

interface PlaylistModalProps {
  item: MusicItem;
  profileId: string;
  onClose: () => void;
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({ item, profileId, onClose }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>(getPlaylists(profileId));
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addedTo, setAddedTo] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const pl = createPlaylist(profileId, newPlaylistName);
    setPlaylists([...playlists, pl]);
    setNewPlaylistName('');
    setIsCreating(false);
  };

  const handleAdd = (plId: string) => {
    addToPlaylist(profileId, plId, item);
    setAddedTo(plId);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#181818] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-red-600" />
            Salvar em...
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto no-scrollbar">
          {playlists.length === 0 && !isCreating && (
            <p className="text-center text-gray-500 py-8 text-sm">Você ainda não tem playlists.</p>
          )}

          <div className="space-y-2">
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition group text-left"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center">
                      <ListMusic className="w-5 h-5 text-gray-400" />
                   </div>
                   <div>
                     <p className="font-bold text-sm">{pl.name}</p>
                     <p className="text-[10px] text-gray-500 font-bold uppercase">{pl.items.length} músicas</p>
                   </div>
                </div>
                {addedTo === pl.id ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Plus className="w-5 h-5 text-gray-600 opacity-0 group-hover:opacity-100 transition" />
                )}
              </button>
            ))}
          </div>

          {isCreating ? (
            <form onSubmit={handleCreate} className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-bottom-2">
              <input
                autoFocus
                type="text"
                placeholder="Nome da playlist"
                className="bg-transparent w-full border-none outline-none text-white font-bold mb-4"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-white text-black py-2 rounded-lg font-black text-xs uppercase">Criar</button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition">Cancelar</button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-4 p-4 mt-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition border border-dashed border-white/10"
            >
              <Plus className="w-5 h-5" />
              <span className="font-bold text-sm">Nova Playlist</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;
