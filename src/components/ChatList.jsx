import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, MessageSquarePlus, UserCheck, Sparkles, Share2, Trash2, X, Sun, Moon } from 'lucide-react';

const ChatListSkeleton = () => (
  // ...
  <div className="flex flex-col space-y-1 w-full animate-pulse select-none">
    {[1, 2, 3, 4].map(idx => (
      <div key={idx} className="flex items-center gap-3.5 p-3.5 rounded-xl border-l-4 border-transparent">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#1A1A1A] border border-[#2B2B2B] shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="w-24 h-3.5 bg-[#1A1A1A] rounded" />
            <div className="w-8 h-2 bg-[#1A1A1A] rounded" />
          </div>
          <div className="w-36 h-3 bg-[#1A1A1A] rounded" />
        </div>
      </div>
    ))}
  </div>
);

export default function ChatList({ 
  chats, 
  activeChatId, 
  onSelectChat, 
  onNewChat, 
  currentUser, 
  isLoading, 
  onDeleteChat,
  theme = 'dark',
  onToggleTheme
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContextMenu, setActiveContextMenu] = useState(null); // { chat, x, y, isMobileSheet }
  const touchTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const handleTouchStart = (chat, e) => {
    isLongPressTriggeredRef.current = false;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(45); } catch (_) {}
      }
      setActiveContextMenu({
        chat,
        isMobileSheet: true,
        x: touch.clientX,
        y: touch.clientY
      });
    }, 450);
  };

  const handleTouchMove = (e) => {
    if (!touchTimerRef.current) return;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    const menuWidth = 220;
    const menuHeight = 120;
    const clampedX = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const clampedY = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setActiveContextMenu({
      chat,
      isMobileSheet: false,
      x: Math.max(10, clampedX),
      y: Math.max(10, clampedY)
    });
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages[chat.messages.length - 1]?.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-96 bg-[#111111] border-r-2 border-black flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-4 pb-2 md:p-5 md:pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-black text-[#FFFFFF] tracking-tight uppercase">
            Messages
          </h1>
          <div className="inline-block mt-1">
            <span className="tactile-badge px-2 py-0.5 rounded-md text-[9px] bg-[#FCC105] text-black">
              {chats.filter(c => c.unreadCount > 0).length} Unread Chats
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Theme Mode Toggle (White / Black) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="tactile-btn w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center cursor-pointer"
              title={theme === 'light' ? "Switch to Black Mode" : "Switch to White Mode"}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-black stroke-[2.2]" />
              ) : (
                <Sun className="w-4.5 h-4.5 text-black stroke-[2.2]" />
              )}
            </button>
          )}

          {/* Copy Invite Link */}
          <button
            onClick={() => {
              const inviteLink = window.location.origin + '/?invite=' + currentUser.id + '&name=' + encodeURIComponent(currentUser.name);
              navigator.clipboard.writeText(inviteLink);
              alert("Copied your ChatMe Profile Link!\nSend it to another person so they can start a real chat with you.");
            }}
            className="tactile-btn w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center"
            title="Copy Chat Invite Link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={onNewChat}
            className="tactile-btn w-9 h-9 rounded-xl bg-[#FCC105] text-black flex items-center justify-center"
            style={{
              backgroundColor: 'var(--theme-accent, #FCC105)',
              color: 'var(--theme-accent-text, #000000)'
            }}
            title="New Conversation"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 pb-3 md:px-5 md:pb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tactile-input w-full bg-[#1A1A1A] text-[#FFFFFF] placeholder-[#8A8A8A] pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#8A8A8A]" />
        </div>
      </div>

      {/* Chat List Items */}
      <div className="flex-1 overflow-y-auto px-2.5 space-y-2 pb-4">
        {isLoading ? (
          <ChatListSkeleton />
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
            const isSelected = chat.id === activeChatId;
            const lastMsg = chat.messages[chat.messages.length - 1];
            
            return (
              <div
                key={chat.id}
                onClick={(e) => {
                  if (isLongPressTriggeredRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    isLongPressTriggeredRef.current = false;
                    return;
                  }
                  onSelectChat(chat.id);
                }}
                onContextMenu={(e) => handleContextMenu(e, chat)}
                onTouchStart={(e) => handleTouchStart(chat, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className={`relative group flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'border-2 border-black bg-[#FCC105]/20 shadow-[3.5px_3.5px_0px_#000000]'
                    : 'border-2 border-transparent active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                }`}
                style={isSelected ? {
                  backgroundColor: 'rgba(var(--theme-accent-rgb, 252, 193, 5), 0.22)',
                  borderColor: '#000000'
                } : {}}
              >
                {/* Avatar with bold tactile border */}
                <div className="relative">
                  <div 
                    className="w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors duration-150"
                  >
                    <img
                      src={chat.avatarUrl}
                      alt={chat.name}
                      className="w-full h-full object-cover bg-white"
                    />
                  </div>
                  {chat.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#22C55E] border-2 border-black rounded-full shadow-[1px_1px_0px_#000000]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#FFFFFF] truncate">
                      {chat.name}
                    </h2>
                    <span className="text-[10px] font-semibold text-[#8A8A8A]">
                      {lastMsg ? lastMsg.time : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs truncate pr-2 ${
                      chat.unreadCount > 0 ? 'text-[#FFFFFF] font-bold' : 'text-[#8A8A8A]'
                    }`}>
                      {chat.isTyping ? (
                        <span className="text-[#FCC105] font-bold flex items-center gap-1">
                          <span className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 bg-[#FCC105] rounded-full animate-bounce delay-75" />
                            <span className="w-1.5 h-1.5 bg-[#FCC105] rounded-full animate-bounce delay-150" />
                            <span className="w-1.5 h-1.5 bg-[#FCC105] rounded-full animate-bounce delay-225" />
                          </span>
                          typing...
                        </span>
                      ) : (
                        lastMsg ? lastMsg.text : chat.role
                      )}
                    </p>
                    
                    {/* Unread Counter Badge */}
                    {chat.unreadCount > 0 && (
                      <span 
                        className="tactile-badge min-w-[20px] h-[20px] bg-[#FCC105] text-[#000000] text-[10px] rounded-full flex items-center justify-center px-1 shrink-0"
                        style={{
                          backgroundColor: 'var(--theme-accent, #FCC105)',
                          color: 'var(--theme-accent-text, #000000)'
                        }}
                      >
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#2B2B2B] text-[#8A8A8A] mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-[#FFFFFF]">No chats found</h3>
            <p className="text-xs text-[#8A8A8A] mt-1 max-w-[200px]">
              Try searching for a different contact name or start a new conversation.
            </p>
          </div>
        )}
      </div>

      {/* Context Menu for Desktop (Right-click) */}
      {activeContextMenu && !activeContextMenu.isMobileSheet && (
        <div 
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setActiveContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setActiveContextMenu(null);
          }}
        >
          <div 
            className="fixed z-50 bg-white text-black border-2 border-black rounded-xl shadow-[4px_4px_0px_#000000] p-1.5 w-52 select-none"
            style={{ left: activeContextMenu.x, top: activeContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-black/15 mb-1 flex items-center gap-2">
              <img 
                src={activeContextMenu.chat.avatarUrl} 
                alt={activeContextMenu.chat.name} 
                className="w-5 h-5 rounded-full border border-black object-cover shrink-0"
              />
              <span className="font-black text-xs text-black truncate">{activeContextMenu.chat.name}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                const target = activeContextMenu.chat;
                setActiveContextMenu(null);
                if (window.confirm(`Delete conversation with ${target.name}? All messages will be permanently removed.`)) {
                  onDeleteChat(target.id);
                }
              }}
              className="w-full text-left px-3 py-2 text-xs font-black uppercase text-[#EF4444] rounded-lg active:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>Delete Conversation</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectChat(activeContextMenu.chat.id);
                setActiveContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-black uppercase text-black rounded-lg active:bg-neutral-100 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4 stroke-[2.2]" />
              <span>Open Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Action Sheet (Long-press) */}
      {activeContextMenu && activeContextMenu.isMobileSheet && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setActiveContextMenu(null)}
        >
          <div 
            className="w-full sm:max-w-xs bg-white text-black border-t-2 sm:border-2 border-black rounded-t-2xl sm:rounded-2xl p-4 shadow-[0_-4px_0px_#000000] sm:shadow-[4px_4px_0px_#000000] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="flex items-center gap-3 pb-3 border-b-2 border-black mb-3.5">
              <img 
                src={activeContextMenu.chat.avatarUrl} 
                alt={activeContextMenu.chat.name} 
                className="w-10 h-10 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_#000000] object-cover bg-white shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-sm text-black truncate">{activeContextMenu.chat.name}</h3>
                <p className="text-[11px] font-semibold text-neutral-600 truncate">Conversation Options</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveContextMenu(null)}
                className="tactile-btn p-1.5 rounded-lg bg-neutral-100 text-black shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const target = activeContextMenu.chat;
                  setActiveContextMenu(null);
                  if (window.confirm(`Delete conversation with ${target.name}? All messages will be permanently removed.`)) {
                    onDeleteChat(target.id);
                  }
                }}
                className="tactile-btn w-full py-2.5 px-3 rounded-xl bg-[#EF4444] text-white font-black text-xs uppercase flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Delete Conversation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectChat(activeContextMenu.chat.id);
                  setActiveContextMenu(null);
                }}
                className="tactile-btn w-full py-2.5 px-3 rounded-xl bg-white text-black font-black text-xs uppercase flex items-center justify-center gap-2"
              >
                <MessageSquarePlus className="w-4 h-4 stroke-[2.2]" />
                <span>Open Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveContextMenu(null)}
                className="tactile-btn w-full py-2 px-3 rounded-xl bg-neutral-100 text-neutral-700 font-bold text-xs uppercase flex items-center justify-center mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 bg-[#0A0A0A] border-t border-[#2B2B2B] flex items-center justify-between text-xs text-[#8A8A8A]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FCC105]" style={{ color: 'var(--theme-accent, #FCC105)' }} />
          <span>System: Active</span>
        </div>
        <span className="text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded-full border border-[#2B2B2B]">
          v1.0.0
        </span>
      </div>
    </div>
  );
}
