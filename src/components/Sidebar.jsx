import React from 'react';
import { MessageSquare, Users, Settings, Bell, Compass, LogOut } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenSettings, currentUser }) {
  const navItems = [
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'contacts', icon: Users, label: 'Contacts' },
    { id: 'discover', icon: Compass, label: 'Discover' },
    { id: 'notifications', icon: Bell, label: 'Alerts' },
  ];

  return (
    <aside className="hidden md:flex w-20 bg-[#0A0A0A] border-r border-[#2B2B2B] flex-col items-center py-6 justify-between h-full select-none">
      {/* Brand Logo */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:scale-105 transition-transform duration-200 cursor-pointer">
          <img src="/chatmeappicon.png" alt="ChatMe" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
        </div>
        <span className="text-[10px] font-display font-bold text-[#FCC105] tracking-wider mt-1.5 hidden md:inline">
          CHATME
        </span>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex flex-col gap-6 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative group flex flex-col items-center justify-center py-3 w-full rounded-xl transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'text-[#FCC105] bg-[#FCC105]/10' 
                  : 'text-[#8A8A8A] hover:text-[#FFFFFF] hover:bg-[#111111]'
              }`}
              title={item.label}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#FCC105] rounded-r-md" />
              )}
              
              <Icon className="w-5 h-5 md:w-6 md:h-6 transition-transform duration-200 group-hover:scale-105" />
              <span className="text-[9px] mt-1.5 font-medium hidden md:inline transition-colors duration-200">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Profile & Settings Trigger */}
      <div className="flex flex-col items-center gap-5 w-full px-2">
        <button
          onClick={onOpenSettings}
          className={`relative group flex flex-col items-center justify-center py-3 w-full rounded-xl transition-all duration-300 text-[#8A8A8A] hover:text-[#FFFFFF] hover:bg-[#111111] cursor-pointer`}
          title="Settings"
        >
          <Settings className="w-5 h-5 md:w-6 md:h-6 transition-transform duration-200 group-hover:rotate-45" />
          <span className="text-[9px] mt-1.5 font-medium hidden md:inline">
            Settings
          </span>
        </button>

        <div className="relative cursor-pointer group" onClick={onOpenSettings}>
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border border-[#2B2B2B] group-hover:border-[#FCC105] transition-colors duration-300">
            <img 
              src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=user"} 
              alt={currentUser.name} 
              className="w-full h-full object-cover bg-[#1A1A1A]"
            />
          </div>
          {currentUser.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-[#000000] rounded-full shadow-md" />
          )}
        </div>
      </div>
    </aside>
  );
}
