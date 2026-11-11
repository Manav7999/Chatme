import React from 'react';
import { MessageSquare, Users, Settings, Bell, Compass, Sun, Moon } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenSettings, currentUser, theme = 'dark', onToggleTheme }) {
  const navItems = [
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'contacts', icon: Users, label: 'Contacts' },
    { id: 'discover', icon: Compass, label: 'Discover' },
    { id: 'notifications', icon: Bell, label: 'Alerts' },
  ];

  return (
    <aside className="hidden md:flex w-20 bg-[#0A0A0A] border-r-2 border-black flex-col items-center py-5 justify-between h-full select-none shrink-0 transition-colors duration-200">
      {/* Brand Logo Sticker */}
      <div className="flex flex-col items-center gap-1.5">
        <div 
          className="w-11 h-11 rounded-xl border-2 border-black bg-[#FCC105] shadow-[2.5px_2.5px_0px_#000000] flex items-center justify-center cursor-pointer hover:shadow-[3.5px_3.5px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150"
          style={{ backgroundColor: 'var(--theme-accent, #FCC105)' }}
        >
          <img src="/chatmeappicon.png" alt="ChatMe" className="w-7 h-7 object-contain" />
        </div>
        <span 
          className="text-[9px] font-display font-black text-black px-1.5 py-0.2 rounded border border-black/40 shadow-[1px_1px_0px_#000000] uppercase tracking-wider hidden md:inline bg-white"
          style={{ 
            color: 'var(--theme-text-primary, #000000)'
          }}
        >
          CHATME
        </span>
      </div>

      {/* Navigation Tabs - Tactile Keys */}
      <nav className="flex flex-col gap-4 w-full px-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative group flex flex-col items-center justify-center py-2.5 w-full rounded-xl transition-all duration-150 cursor-pointer ${
                isActive 
                  ? 'border-2 border-black shadow-[3px_3px_0px_#000000] font-black' 
                  : 'border-2 border-transparent text-[#8A8A8A] hover:border-black hover:text-[#000000] hover:bg-black/5 hover:shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
              }`}
              style={isActive ? {
                backgroundColor: 'var(--theme-accent, #FCC105)',
                color: 'var(--theme-accent-text, #000000)'
              } : {}}
              title={item.label}
            >
              <Icon className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" />
              <span className="text-[9px] mt-1 font-bold hidden md:inline uppercase tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Profile & Settings Trigger */}
      <div className="flex flex-col items-center gap-3 w-full px-2.5">
        
        {/* Quick Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="tactile-btn flex flex-col items-center justify-center py-2 w-full rounded-xl text-black bg-white hover:bg-[#FFFDF5] cursor-pointer"
            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === 'light' ? (
              <Sun className="w-4.5 h-4.5 text-black" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-black" />
            )}
            <span className="text-[8px] mt-0.5 font-black uppercase">
              {theme === 'light' ? 'Light' : 'Dark'}
            </span>
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="tactile-btn flex flex-col items-center justify-center py-2 w-full rounded-xl text-black bg-white hover:bg-[#FFFDF5] cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4.5 h-4.5 text-black group-hover:rotate-45 transition-transform" />
          <span className="text-[8px] mt-0.5 font-black uppercase">
            Settings
          </span>
        </button>

        <div className="relative cursor-pointer group pt-1" onClick={onOpenSettings} title="Profile Settings">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-black shadow-[2.5px_2.5px_0px_#000000] group-hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150">
            <img 
              src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=user"} 
              alt={currentUser.name} 
              className="w-full h-full object-cover bg-white"
            />
          </div>
          {currentUser.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-black rounded-full shadow-[1px_1px_0px_#000000]" />
          )}
        </div>
      </div>
    </aside>
  );
}
