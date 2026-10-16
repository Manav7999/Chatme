import React, { useState, useRef, useEffect } from 'react';
import { Send, Hash, Users, ChevronLeft, Smile, Paperclip, FileText, Image, Copy, Trash2, X, Download, Video, Film, Maximize2 } from 'lucide-react';

export default function ChannelWindow({ channel, currentUser, onSendMessage, onSendMedia, onDeleteMessage, onBack, isMobile }) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [downloadingStates, setDownloadingStates] = useState({}); // messageId -> progressPercentage
  const [previewMedia, setPreviewMedia] = useState(null); // { type: 'image' | 'video', url: string, name: string }

  const downloadFileToDevice = (mediaUrl, filename) => {
    if (!mediaUrl) return;
    try {
      const defaultName = filename || 'downloaded-file';
      if (mediaUrl.startsWith('data:')) {
        const parts = mediaUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } else {
        fetch(mediaUrl)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = defaultName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
          })
          .catch(() => {
            const link = document.createElement('a');
            link.href = mediaUrl;
            link.download = defaultName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
      }
    } catch (err) {
      console.error("Failed to download file:", err);
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownload = (e, msg) => {
    if (e && e.preventDefault) e.preventDefault();
    if (downloadingStates[msg.id] !== undefined) return;
    
    setDownloadingStates(prev => ({ ...prev, [msg.id]: 0 }));
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        downloadFileToDevice(msg.mediaUrl, msg.text);
        
        setTimeout(() => {
          setDownloadingStates(prev => {
            const next = { ...prev };
            delete next[msg.id];
            return next;
          });
        }, 800);
      }
      
      setDownloadingStates(prev => ({ ...prev, [msg.id]: progress }));
    }, 100);
  };

  const emojis = ['😊', '😂', '🔥', '👍', '🙌', '✨', '⚡', '💯', '💬', '🎉', '💻', '🚀'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channel?.messages]);

  if (!channel) {
    return (
      <div className="flex-1 bg-[#000000] flex flex-col items-center justify-center text-center p-8 select-none">
        <div className="w-16 h-16 rounded-2xl bg-[#111111] border border-[#2B2B2B] flex items-center justify-center mb-6">
          <Hash className="w-8 h-8 text-[#FCC105] opacity-50" />
        </div>
        <h2 className="text-lg font-bold text-white">Select a channel</h2>
        <p className="text-sm text-[#8A8A8A] mt-2 max-w-sm">Pick a channel from the list to start group conversation.</p>
      </div>
    );
  }

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(channel.id, inputText);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !onSendMedia) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const sizeStr = formatBytes(file.size);
      let type = 'file';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      }
      
      onSendMedia(channel.id, {
        type,
        text: file.name,
        mediaUrl: dataUrl,
        size: sizeStr
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 bg-[#000000] flex flex-col h-full min-w-0 w-full max-w-full relative">
      {/* Channel Header */}
      <div className="h-16 md:h-20 border-b border-[#2B2B2B] px-3 md:px-5 flex items-center justify-between bg-[#0A0A0A] select-none z-10">
        <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
          {isMobile && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded-lg text-[#FCC105] hover:bg-[#1A1A1A] cursor-pointer mr-0.5 shrink-0"
            >
              <ChevronLeft className="w-5.5 h-5.5" />
            </button>
          )}
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[#FCC105]/10 border border-[#FCC105]/30 flex items-center justify-center shrink-0">
            <Hash className="w-4.5 h-4.5 text-[#FCC105]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-white leading-tight truncate max-w-[85px] xs:max-w-[140px] sm:max-w-[200px]">{channel.name}</h2>
            <span className="text-[10px] text-[#8A8A8A] flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" />
              {channel.memberCount || 0} online
            </span>
          </div>
        </div>
        <div className="text-[9px] md:text-[10px] text-[#FCC105] bg-[#FCC105]/10 border border-[#FCC105]/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-bold uppercase tracking-wider shrink-0 hidden xs:block">
          Group Channel
        </div>
      </div>

      {/* Description Banner */}
      <div className="px-4 py-2 bg-[#0A0A0A] border-b border-[#2B2B2B]/50 text-[11px] text-[#8A8A8A] flex items-center gap-1.5">
        <Hash className="w-3 h-3 text-[#FCC105]" />
        {channel.description}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 bg-[#000000]">
        {(!channel.messages || channel.messages.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center select-none">
            <div className="w-14 h-14 rounded-full bg-[#111111] border border-[#2B2B2B] flex items-center justify-center mb-4">
              <Hash className="w-6 h-6 text-[#FCC105] opacity-60" />
            </div>
            <p className="text-sm font-bold text-white">Welcome to {channel.name}!</p>
            <p className="text-xs text-[#8A8A8A] mt-1">Be the first to send a message in this channel.</p>
          </div>
        ) : (
          channel.messages.map((msg) => {
            const isOwn = msg.sender === currentUser?.id;
            return (
              <div key={msg.id} className={`flex w-full gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} chat-fade-in`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#2B2B2B] shrink-0">
                  <img src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender}`} alt={msg.senderName} className="w-full h-full object-cover bg-[#1A1A1A]" />
                </div>
                {/* Bubble */}
                <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <span className="text-[10px] font-bold text-[#FCC105] mb-1 ml-1">{msg.senderName}</span>
                  )}
                  <div className="flex items-center gap-2 max-w-full group/msg">
                    {/* If own message, show actions on the left */}
                    {isOwn && (
                      <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 shrink-0 select-none">
                        {msg.type !== 'call_history' && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              alert("Copied message to clipboard!");
                            }}
                            className="p-1 rounded-lg text-[#8A8A8A] hover:text-[#FFFFFF] hover:bg-[#2B2B2B] transition-colors cursor-pointer"
                            title="Copy message text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this message?")) {
                              onDeleteMessage(msg.id);
                            }
                          }}
                          className="p-1 rounded-lg text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className={`rounded-2xl text-sm transition-all ${
                      msg.type === 'image' || msg.type === 'file' || msg.type === 'video'
                        ? 'p-0 bg-transparent border-0'
                        : `px-4 py-2.5 border shadow-sm ${
                            isOwn
                              ? 'bg-[#FCC105] text-[#000000] border-[#FCC105] rounded-tr-none'
                              : 'bg-[#1A1A1A] text-[#FFFFFF] border-[#2B2B2B] rounded-tl-none'
                          }`
                    }`}>
                      {/* Render Video Message */}
                      {msg.type === 'video' && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-[#2B2B2B] bg-black max-w-[320px] relative shadow-lg">
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            playsInline
                            preload="metadata"
                            className="w-full max-h-64 object-contain rounded-t-xl bg-black"
                          />
                          
                          {/* Video metadata footer with Direct Download Button */}
                          <div className="p-2.5 bg-[#111111] border-t border-[#2B2B2B] flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">{msg.text || 'Video file'}</p>
                              {msg.size && <span className="text-[10px] text-[#8A8A8A]">{msg.size}</span>}
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewMedia({ type: 'video', url: msg.mediaUrl, name: msg.text || 'video.mp4' })}
                                className="p-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#2B2B2B] text-white transition-all cursor-pointer"
                                title="Expand Video"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                type="button"
                                onClick={(e) => handleDownload(e, msg)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FCC105] text-black font-bold text-xs hover:bg-[#FFD34D] transition-all cursor-pointer shadow-md"
                                title="Download and save video to device"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>

                          {msg.status === 'uploading' && (
                            <div className="absolute inset-0 bg-[#000000]/75 flex flex-col items-center justify-center text-white p-3 z-10 select-none">
                              <span className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
                                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#FCC105]" />
                                Uploading Video...
                              </span>
                              <span className="text-xs font-black">{msg.progress || 0}%</span>
                              <div className="w-24 bg-white/20 rounded-full h-1 mt-1.5 overflow-hidden">
                                <div className="bg-[#FCC105] h-full" style={{ width: `${msg.progress || 0}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Render Image Message */}
                      {msg.type === 'image' && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-[#2B2B2B] bg-[#000000]/20 max-w-[280px] relative group shadow-md">
                          <img 
                            src={msg.mediaUrl} 
                            alt="attachment" 
                            className="w-full object-cover max-h-56 cursor-pointer hover:opacity-95 transition-opacity" 
                            onClick={() => setPreviewMedia({ type: 'image', url: msg.mediaUrl, name: msg.text || 'image.png' })}
                          />
                          
                          {/* Direct download button on image */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(e, msg);
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-[#FCC105] text-white hover:text-black transition-all cursor-pointer backdrop-blur-sm border border-white/10 shadow-lg"
                            title="Save image to device"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {msg.status === 'uploading' && (
                            <div className="absolute inset-0 bg-[#000000]/70 flex flex-col items-center justify-center text-white p-3 z-10 select-none">
                              <span className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
                                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                                Uploading...
                              </span>
                              <span className="text-xs font-black">{msg.progress || 0}%</span>
                              <div className="w-20 bg-white/20 rounded-full h-1 mt-1.5 overflow-hidden">
                                <div className="bg-[#FCC105] h-full" style={{ width: `${msg.progress || 0}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Render File Message */}
                      {msg.type === 'file' && (
                        <div className="relative mb-1.5">
                          <div 
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-all ${
                              msg.status === 'uploading' ? 'opacity-70' : ''
                            } ${
                              isOwn ? 'bg-[#FCC105]/10 border border-[#FCC105]/20' : 'bg-[#111111] border border-[#2B2B2B]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#1A1A1A] text-[#FCC105]`}>
                                {msg.status === 'uploading' ? (
                                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FCC105]" />
                                ) : downloadingStates[msg.id] !== undefined ? (
                                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FCC105]" />
                                ) : (
                                  <FileText className="w-4.5 h-4.5" />
                                )}
                              </div>
                              <div className="min-w-0 text-left flex-1">
                                <p className="text-xs font-semibold truncate max-w-[150px] text-[#FFFFFF]" title={msg.text}>
                                  {msg.text}
                                </p>
                                <span className="text-[10px] text-[#8A8A8A]">
                                  {msg.status === 'uploading' 
                                    ? `Uploading... ${msg.progress || 0}%` 
                                    : downloadingStates[msg.id] !== undefined 
                                      ? `Saving... ${downloadingStates[msg.id]}%` 
                                      : msg.size}
                                </span>
                                
                                {(msg.status === 'uploading' || downloadingStates[msg.id] !== undefined) && (
                                  <div className="w-full bg-[#000000]/10 rounded-full h-1 mt-1 overflow-hidden">
                                    <div 
                                      className="h-full transition-all duration-150" 
                                      style={{ 
                                        width: `${msg.status === 'uploading' ? (msg.progress || 0) : downloadingStates[msg.id]}%`,
                                        backgroundColor: '#FCC105'
                                      }} 
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Direct Download Action Button */}
                            {msg.status !== 'uploading' && (
                              <button
                                type="button"
                                onClick={(e) => handleDownload(e, msg)}
                                className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#FCC105] text-[#8A8A8A] hover:text-black transition-all cursor-pointer shrink-0 shadow-sm"
                                title="Download and save file to device"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Render Standard Text */}
                      {msg.type !== 'image' && msg.type !== 'file' && msg.type !== 'video' && (
                        <p className="whitespace-pre-wrap break-words font-medium leading-relaxed">{msg.text}</p>
                      )}
                    </div>

                    {/* If other's message, show actions on the right */}
                    {!isOwn && (
                      <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 shrink-0 select-none">
                        {msg.type !== 'call_history' && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              alert("Copied message to clipboard!");
                            }}
                            className="p-1 rounded-lg text-[#8A8A8A] hover:text-[#FFFFFF] hover:bg-[#2B2B2B] transition-colors cursor-pointer"
                            title="Copy message text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this message?")) {
                              onDeleteMessage(msg.id);
                            }
                          }}
                          className="p-1 rounded-lg text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold mt-1" style={{ color: isOwn ? '#4A3900' : '#8A8A8A' }}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Attachments Overlay Menu */}
      {showAttachMenu && (
        <div className="absolute bottom-20 left-3 right-3 sm:left-5 sm:right-auto bg-[#111111] border border-[#2B2B2B] rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 z-20 sm:w-48 chat-fade-in select-none">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#8A8A8A] tracking-wider uppercase border-b border-[#2B2B2B]/50 mb-1 select-none">
            File Sharing
          </div>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*';
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-[#1A1A1A] hover:text-[#FCC105] transition-all text-left cursor-pointer"
          >
            <Image className="w-4 h-4 text-[#FCC105]" />
            Upload Image
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'video/*';
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-[#1A1A1A] hover:text-[#FCC105] transition-all text-left cursor-pointer"
          >
            <Film className="w-4 h-4 text-[#FCC105]" />
            Upload Video
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              if (fileInputRef.current) {
                fileInputRef.current.accept = '*/*';
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-[#1A1A1A] hover:text-[#FCC105] transition-all text-left cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#FCC105]" />
            Upload Document
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-3 right-3 sm:left-5 sm:right-auto bg-[#111111] border border-[#2B2B2B] rounded-2xl shadow-2xl p-3 grid grid-cols-6 gap-2 z-20 sm:w-64 chat-fade-in select-none">
          {emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(prev => prev + emoji)}
              className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-[#1A1A1A] cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Panel */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-[#0A0A0A] border-t border-[#2B2B2B] flex items-center select-none z-10 w-full max-w-full gap-2.5 md:gap-2.5"
      >
        {/* Main Input Box (unified rectangular design on mobile, standard pill on desktop) */}
        <div className="flex-1 flex items-center bg-[#111111] border border-[#2B2B2B] focus-within:border-[#FCC105] focus-within:ring-1 focus-within:ring-[#FCC105] transition-all duration-200
          rounded-xl md:rounded-2xl overflow-hidden md:overflow-visible md:px-2.5 md:py-1 py-0 px-0"
        >
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className={`p-2 pl-3 md:pl-2 text-[#8A8A8A] hover:text-white transition-colors cursor-pointer shrink-0 ${
              showEmojiPicker ? 'text-[#FCC105]' : ''
            }`}
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            placeholder={`Message ${channel.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent border-0 text-white placeholder-[#8A8A8A] px-2 py-2 text-sm focus:outline-none focus:ring-0 min-w-0"
          />

          {/* Attachment menu trigger */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-2 pr-3 md:pr-2 text-[#8A8A8A] hover:text-white transition-colors cursor-pointer shrink-0 ${
              showAttachMenu ? 'text-[#FCC105]' : ''
            }`}
            title="Attachments"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attached Send Button (Mobile only) */}
          <button
            type="submit"
            className="md:hidden self-stretch px-4 bg-[#FCC105] text-[#000000] flex items-center justify-center hover:bg-[#FFD34D] transition-all duration-200 cursor-pointer shrink-0 focus:outline-none border-l border-[#2B2B2B]"
            title="Send message"
          >
            <Send className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Standalone Send Button (Desktop only) */}
        <button
          type="submit"
          className="hidden md:flex w-10 h-10 rounded-full bg-[#FCC105] text-[#000000] items-center justify-center hover:bg-[#FFD34D] transition-all duration-200 hover:scale-105 shadow-lg shadow-[#FCC105]/15 cursor-pointer shrink-0 focus:outline-none"
          title="Send message"
        >
          <Send className="w-4.5 h-4.5 fill-current" />
        </button>
      </form>
      {/* Media Preview Lightbox (Images & Videos) */}
      {previewMedia && (
        <div 
          className="fixed inset-0 bg-[#000000]/95 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 transition-opacity duration-300 chat-fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          {/* Top Bar with filename, download, and close button */}
          <div 
            className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between z-52 bg-[#111111]/90 backdrop-blur-md border border-[#2B2B2B] px-4 py-2.5 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              {previewMedia.type === 'video' ? (
                <Video className="w-4 h-4 text-[#FCC105] shrink-0" />
              ) : (
                <Image className="w-4 h-4 text-[#FCC105] shrink-0" />
              )}
              <span className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-md">
                {previewMedia.name}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadFileToDevice(previewMedia.url, previewMedia.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FCC105] text-black font-bold text-xs hover:bg-[#FFD34D] transition-all cursor-pointer shadow-lg shadow-[#FCC105]/20"
                title="Save file to your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Device</span>
              </button>

              <button 
                type="button"
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all cursor-pointer"
                onClick={() => setPreviewMedia(null)}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div 
            className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {previewMedia.type === 'video' ? (
              <video 
                src={previewMedia.url} 
                controls 
                autoPlay 
                playsInline
                className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl bg-black border border-[#2B2B2B]"
              />
            ) : (
              <img 
                src={previewMedia.url} 
                alt="Full size preview" 
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl select-none animate-zoom-in"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
