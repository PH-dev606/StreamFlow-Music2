
import React, { useState, useEffect } from 'react';
import { Search, Bell, Music, Menu, X, History, Download as DownloadIcon } from 'lucide-react';

interface NavbarProps {
  onSearch: (query: string) => void;
  onLogoClick?: () => void;
  onNavigate?: (id: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch, onLogoClick, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    onSearch(q);
    setIsSearchOpen(false);
  };

  const handleLogo = () => {
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setSearchInput('');
    onLogoClick?.();
  };

  const navLinks = [
    { name: 'Videoclipes', id: 'row-cat-0' },
    { name: 'Ao Vivo', id: 'row-cat-1' },
    { name: 'Mixes', id: 'row-cat-2' },
    { name: 'Download', id: 'row-downloads', icon: <DownloadIcon className="w-4 h-4" /> },
    { name: 'Histórico', id: 'row-history', icon: <History className="w-4 h-4" /> },
  ];

  const handleNavItemClick = (id: string) => {
    setIsMenuOpen(false);
    onNavigate?.(id);
  };

  return (
    <>
      <nav 
        className={`fixed w-full z-50 transition-colors duration-500 pt-[env(safe-area-inset-top)] ${isScrolled || isMenuOpen ? 'bg-[#0f0f0f]' : 'bg-gradient-to-b from-black/90 to-transparent'}`}
      >
        <div className="px-4 md:px-12 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-8">
            <button 
              type="button" 
              className="md:hidden p-2 text-white btn-active"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="w-7 h-7" />
            </button>

            <button
              type="button"
              className="flex items-center gap-2 text-red-600 font-bold text-2xl md:text-3xl cursor-pointer tracking-tighter btn-active"
              onClick={handleLogo}
            >
              <Music className="w-8 h-8" />
              <span className="hidden xs:inline">MUSIC</span>
            </button>

            <button 
              onClick={handleLogo}
              className="text-white font-medium text-sm md:text-base ml-2 md:ml-0 hover:text-gray-300 transition btn-active"
            >
              Início
            </button>

            <ul className="hidden lg:flex gap-6 text-sm font-medium text-gray-300">
              {navLinks.map((link) => (
                <li 
                  key={link.name} 
                  onClick={() => handleNavItemClick(link.id)}
                  className="cursor-pointer hover:text-white transition whitespace-nowrap flex items-center gap-1.5"
                >
                  {link.icon && link.icon}
                  {link.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4 md:gap-6 text-white">
            <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'bg-[#1f1f1f] border border-gray-600 rounded-full px-3 py-1 absolute left-4 right-12 z-10 md:static md:w-auto' : ''}`}>
              <button type="button" onClick={() => setIsSearchOpen((v) => !v)} className="btn-active p-1">
                <Search className="w-6 h-6 md:w-5 md:h-5 cursor-pointer" />
              </button>

              {isSearchOpen && (
                <form onSubmit={handleSearchSubmit} className="flex-1">
                  <input
                    type="text"
                    placeholder="Título, artista ou letra..."
                    className="bg-transparent border-none outline-none text-white text-base md:text-sm ml-2 w-full md:w-72 placeholder-gray-400"
                    autoFocus
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onBlur={() => !searchInput && setIsSearchOpen(false)}
                  />
                </form>
              )}
            </div>

            {!isSearchOpen && <Bell className="w-6 h-6 md:w-5 md:h-5 cursor-pointer hover:text-gray-300 transition btn-active" />}

            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold border border-transparent group-hover:border-white transition">
                J
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div 
        className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300 md:hidden ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      >
        <div 
          className={`absolute inset-y-0 left-0 w-72 bg-[#141414] shadow-2xl transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <span className="text-red-600 font-bold text-2xl tracking-tighter">MUSIC</span>
              <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 btn-active">
                <X className="w-7 h-7" />
              </button>
            </div>
            
            <ul className="flex flex-col gap-6 text-lg font-bold">
              <li 
                className="text-white flex items-center gap-3 cursor-pointer"
                onClick={handleLogo}
              >
                Início
              </li>
              {navLinks.map((link) => (
                <li 
                  key={link.name} 
                  className="text-gray-400 hover:text-white transition cursor-pointer flex items-center gap-3"
                  onClick={() => handleNavItemClick(link.id)}
                >
                  {link.icon && link.icon}
                  {link.name}
                </li>
              ))}
            </ul>

            <div className="mt-auto border-t border-gray-800 pt-6">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">J</div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">Usuário</span>
                  <span className="text-xs">Trocar Perfil</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
