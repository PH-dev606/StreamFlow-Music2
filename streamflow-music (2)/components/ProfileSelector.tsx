
import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { Plus, Key, Pencil, Check, X, Trash2, ChevronLeft } from 'lucide-react';
import { updateProfile, addProfile, deleteProfile, getProfiles } from '../services/storageService';

interface ProfileSelectorProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onRefreshProfiles: () => void;
}

const AVATAR_LIBRARY = [
  { name: 'Populares', urls: [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Scooter',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Casper'
  ]},
  { name: 'Séries e Filmes', urls: [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Walter',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Eleven',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luffy',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoro',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Nami',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Geralt'
  ]},
  { name: 'Infantil', urls: [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Simba',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Stitch',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Elsa',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Moana',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Woody',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Buzz'
  ]},
  { name: 'Abstratos', urls: [
    'https://api.dicebear.com/7.x/bottts/svg?seed=R2D2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=WallE',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Bender',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Mario',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Link',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Sonic'
  ]}
];

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profiles: appProfiles, onSelect, onRefreshProfiles }) => {
  const [profiles, setProfiles] = useState<Profile[]>(appProfiles);
  const [isManaging, setIsManaging] = useState(false);
  const [view, setView] = useState<'selection' | 'editor' | 'avatars'>('selection');
  const [editingProfile, setEditingProfile] = useState<Partial<Profile> | null>(null);

  useEffect(() => {
    setProfiles(appProfiles);
  }, [appProfiles]);

  const handleKeyConfig = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  const handleAddClick = () => {
    setEditingProfile({
      name: '',
      avatar: AVATAR_LIBRARY[0].urls[0],
      isKid: false
    });
    setView('editor');
  };

  const handleEditClick = (profile: Profile) => {
    setEditingProfile({ ...profile });
    setView('editor');
  };

  const saveProfile = () => {
    if (!editingProfile?.name?.trim()) return;
    
    let updated;
    if (editingProfile.id) {
      updated = updateProfile(editingProfile.id, editingProfile);
    } else {
      updated = addProfile(editingProfile as Omit<Profile, 'id'>);
    }
    
    setProfiles(updated);
    onRefreshProfiles();
    setEditingProfile(null);
    setView('selection');
    setIsManaging(false);
  };

  const handleDelete = () => {
    if (editingProfile?.id) {
      const updated = deleteProfile(editingProfile.id);
      setProfiles(updated);
      onRefreshProfiles();
      setEditingProfile(null);
      setView('selection');
      setIsManaging(false);
    }
  };

  if (view === 'avatars') {
    return (
      <div className="min-h-screen bg-[#141414] p-8 md:p-20 animate-in fade-in duration-300">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setView('editor')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 font-bold">
            <ChevronLeft className="w-6 h-6" /> Voltar
          </button>
          <h2 className="text-3xl font-bold mb-12">Escolha seu Avatar</h2>
          {AVATAR_LIBRARY.map(category => (
            <div key={category.name} className="mb-12">
              <h3 className="text-xl text-gray-500 font-bold mb-6">{category.name}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {category.urls.map(url => (
                  <button 
                    key={url}
                    onClick={() => {
                      setEditingProfile(prev => ({ ...prev, avatar: url }));
                      setView('editor');
                    }}
                    className={`aspect-square rounded-lg overflow-hidden border-4 transition ${editingProfile?.avatar === url ? 'border-white' : 'border-transparent hover:border-gray-500'}`}
                  >
                    <img src={url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'editor') {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
        <h1 className="text-4xl md:text-6xl text-white mb-12 font-medium">
          {editingProfile?.id ? 'Editar Perfil' : 'Adicionar Perfil'}
        </h1>
        
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center w-full max-w-2xl border-y border-gray-700 py-12">
          <div className="relative group cursor-pointer" onClick={() => setView('avatars')}>
             <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 border-transparent hover:border-white transition-all">
                <img src={editingProfile?.avatar} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Pencil className="w-8 h-8 text-white" />
                </div>
             </div>
          </div>

          <div className="flex-1 space-y-6 w-full">
            <input 
              autoFocus
              className="bg-[#666666] w-full px-4 py-3 text-lg outline-none text-white focus:bg-gray-500 transition rounded-sm placeholder-gray-400 border-none"
              placeholder="Nome do perfil"
              value={editingProfile?.name || ''}
              onChange={(e) => setEditingProfile(prev => ({ ...prev, name: e.target.value }))}
            />

            <div 
              className="flex items-center gap-4 cursor-pointer select-none group/kid" 
              onClick={() => setEditingProfile(prev => ({ ...prev, isKid: !prev?.isKid }))}
            >
               <div className={`w-7 h-7 border-2 flex items-center justify-center transition rounded ${editingProfile?.isKid ? 'bg-white border-white' : 'border-gray-500 group-hover/kid:border-white'}`}>
                 {editingProfile?.isKid && <Check className="w-5 h-5 text-black" />}
               </div>
               <div className="flex flex-col">
                 <span className="text-xl text-white font-medium">Perfil Kids?</span>
                 <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Apenas conteúdo adequado para crianças</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-12">
           <button 
             onClick={saveProfile} 
             className="px-10 py-2.5 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition active:scale-95"
           >
             Salvar
           </button>
           <button 
             onClick={() => { setView('selection'); setIsManaging(false); }} 
             className="px-10 py-2.5 border border-gray-500 text-gray-500 font-bold uppercase tracking-widest hover:border-white hover:text-white transition active:scale-95"
           >
             Cancelar
           </button>
           {editingProfile?.id && profiles.length > 1 && (
             <button 
               onClick={handleDelete} 
               className="px-10 py-2.5 border border-red-600 text-red-600 font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Excluir Perfil
             </button>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center animate-in fade-in duration-500 px-4">
      <h1 className="text-3xl md:text-6xl font-medium text-white mb-12 md:mb-16 tracking-tight text-center">
        {isManaging ? 'Gerenciar Perfis' : 'Quem está assistindo?'}
      </h1>
      
      <div className="flex flex-wrap justify-center gap-6 md:gap-12 max-w-5xl">
        {profiles.map((profile) => (
          <div 
            key={profile.id}
            className={`group flex flex-col items-center gap-4 cursor-pointer relative transition-transform duration-300 ${isManaging ? 'hover:scale-105' : 'hover:scale-110'}`}
            onClick={() => isManaging ? handleEditClick(profile) : onSelect(profile)}
          >
            <div className={`w-28 h-28 md:w-44 md:h-44 rounded bg-gray-800 overflow-hidden border-4 transition-all relative ${isManaging ? 'border-transparent' : 'border-transparent group-hover:border-white'}`}>
              <img src={profile.avatar} alt={profile.name} className={`w-full h-full object-cover transition-opacity ${isManaging ? 'opacity-50' : 'opacity-100'}`} />
              
              {profile.isKid && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-widest z-10">
                  Kids
                </div>
              )}

              {isManaging && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="p-3 bg-black/60 rounded-full border border-white/20 hover:bg-black/80 transition">
                    <Pencil className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
            </div>

            <span className="text-gray-400 group-hover:text-white text-lg md:text-xl transition font-medium">
              {profile.name}
            </span>
          </div>
        ))}

        {!isManaging && profiles.length < 5 && (
          <div 
            className="group flex flex-col items-center gap-4 cursor-pointer hover:scale-110 transition-transform duration-300"
            onClick={handleAddClick}
          >
             <div className="w-28 h-28 md:w-44 md:h-44 rounded flex items-center justify-center border-4 border-gray-600 group-hover:border-white hover:bg-white/10 transition-all">
               <Plus className="w-16 h-16 text-gray-400 group-hover:text-white" />
             </div>
             <span className="text-gray-400 group-hover:text-white text-lg md:text-xl transition font-medium">Adicionar</span>
          </div>
        )}
      </div>

      <div className="mt-20 flex flex-col md:flex-row gap-6 items-center">
        <button 
          onClick={() => setIsManaging(!isManaging)}
          className={`px-12 py-2.5 tracking-[0.2em] text-sm transition-all font-bold uppercase border-2 shadow-lg active:scale-95 ${
            isManaging 
            ? 'bg-white text-black border-white hover:bg-gray-200' 
            : 'border-gray-500 text-gray-500 hover:text-white hover:border-white'
          }`}
        >
          {isManaging ? 'Concluído' : 'Gerenciar Perfis'}
        </button>

        {!isManaging && (
          <button 
            onClick={handleKeyConfig}
            className="border-2 border-blue-600/50 text-blue-500 hover:bg-blue-600 hover:text-white px-12 py-2.5 tracking-[0.2em] text-sm transition-all font-bold uppercase flex items-center gap-3 shadow-lg active:scale-95"
          >
            <Key className="w-4 h-4" />
            Configurar Chave IA
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileSelector;
