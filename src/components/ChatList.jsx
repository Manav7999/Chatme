import React, { useState } from 'react';
import { Search, Plus, MessageSquarePlus, UserCheck, Sparkles, Share2, Trash2 } from 'lucide-react';

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

export default function ChatList({ chats, activeChatId, onSelectChat, onNewChat, currentUser, isLoading, onDeleteChat }) {
  const [searchQuery, setSearchQuery] = useState('');

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
          {/* Copy Invite Link */}
          <button
            onClick={() => {
              const inviteLink = window.location.origin + '/?invite=' + currentUser.id + '&name=' + encodeURIComponent(currentUser.name);
              navigator.clipboard.writeText(inviteLink);
              alert("Copied your ChatMe Profile Link!\nSend it to another person so they can start a real chat with you.");
            }}
            className="tactile-btn w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center hover:bg-[#FFFDF5]"
            title="Copy Chat Invite Link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={onNewChat}
            className="tactile-btn w-9 h-9 rounded-xl bg-[#FCC105] text-black flex items-center justify-center hover:bg-[#FFD34D]"
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
                onClick={() => onSelectChat(chat.id)}
                className={`relative group flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-2 border-black bg-[#FCC105]/20 shadow-[3.5px_3.5px_0px_#000000] -translate-y-0.5'
                    : 'border-2 border-transparent hover:border-black/50 hover:bg-black/5 hover:shadow-[2.5px_2.5px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
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
                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete your conversation with ${chat.name}? This will permanently delete all messages.`)) {
                      onDeleteChat(chat.id);
                    }
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[#2A1215] text-[#FF4D4D] border border-[#FF4D4D]/50 opacity-90 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:bg-[#EF4444] hover:text-[#FFFFFF] cursor-pointer shadow-lg z-10"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
