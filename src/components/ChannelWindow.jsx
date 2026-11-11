import React, { useState, useRef, useEffect } from 'react';
import { Send, Hash, Users, ChevronLeft, Smile, Paperclip, FileText, Image, Copy, Trash2, X, Download, Video, Film, Maximize2 } from 'lucide-react';
import { BUBBLE_SHAPES, getReadableTextColor } from '../themeUtils.js';

export default function ChannelWindow({ channel, currentUser, onSendMessage, onSendMedia, onDeleteMessage, onBack, isMobile, settings }) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [downloadingStates, setDownloadingStates] = useState({}); // messageId -> progressPercentage
  const [previewMedia, setPreviewMedia] = useState(null); // { type: 'image' | 'video', url: string, name: string }
  const [activeMsgMenu, setActiveMsgMenu] = useState(null); // { msg, isOwn, x, y, isMobileSheet }
  const msgTouchTimerRef = useRef(null);
  const msgTouchStartPosRef = useRef({ x: 0, y: 0 });
  const isMsgLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (msgTouchTimerRef.current) clearTimeout(msgTouchTimerRef.current);
    };
  }, []);

  const handleMsgTouchStart = (msg, isOwn, e) => {
    isMsgLongPressTriggeredRef.current = false;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    msgTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (msgTouchTimerRef.current) clearTimeout(msgTouchTimerRef.current);
    msgTouchTimerRef.current = setTimeout(() => {
      isMsgLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(45); } catch (_) {}
      }
      setActiveMsgMenu({
        msg,
        isOwn,
        isMobileSheet: true,
        x: touch.clientX,
        y: touch.clientY
      });
    }, 450);
  };

  const handleMsgTouchMove = (e) => {
    if (!msgTouchTimerRef.current) return;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(msgTouchTimerRef.current);
      msgTouchTimerRef.current = null;
    }
  };

  const handleMsgTouchEnd = () => {
    if (msgTouchTimerRef.current) {
      clearTimeout(msgTouchTimerRef.current);
      msgTouchTimerRef.current = null;
    }
  };

  const handleMsgContextMenu = (e, msg, isOwn) => {
    e.preventDefault();
    e.stopPropagation();
    if (msgTouchTimerRef.current) clearTimeout(msgTouchTimerRef.current);

    const menuWidth = 190;
    const menuHeight = 100;
    const clampedX = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const clampedY = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setActiveMsgMenu({
      msg,
      isOwn,
      isMobileSheet: false,
      x: Math.max(10, clampedX),
      y: Math.max(10, clampedY)
    });
  };

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

  const [isInputFocused, setIsInputFocused] = useState(false);

  const theme = settings?.theme || 'neo-brutalist';
  const chatBackground = settings?.chatBackground || { type: 'default' };
  const bubbleStyle = settings?.bubbleStyle || { shape: 'brutalist', outgoingBg: '#FCC105', incomingBg: '#FFFFFF' };
  const effectiveAccent = settings?.accentColor || bubbleStyle.outgoingBg || '#FCC105';
  const resolvedShapeId = (bubbleStyle.shape && bubbleStyle.shape !== 'modern') ? bubbleStyle.shape : 'brutalist';
  const currentShape = BUBBLE_SHAPES.find(s => s.id === resolvedShapeId) || BUBBLE_SHAPES[0];
  const isLight = theme === 'light';

  const hasCustomWallpaper = Boolean(
    (chatBackground.type === 'image' && chatBackground.imageUrl) ||
    (chatBackground.type === 'color' && chatBackground.color && chatBackground.color !== '#FFFFFF' && chatBackground.color !== '#F8FAFC') ||
    chatBackground.type === 'gradient'
  );

  const outgoingBg = bubbleStyle.outgoingBg || effectiveAccent;
  const outgoingText = bubbleStyle.outgoingText || getReadableTextColor(outgoingBg);
  const incomingBg = bubbleStyle.incomingBg || (theme === 'dark' ? '#1A1A1A' : '#FFFFFF');
  const incomingText = bubbleStyle.incomingText || getReadableTextColor(incomingBg);

  // Background calculation
  let chatBgStyle;
  if (chatBackground.type === 'color' && chatBackground.color) {
    chatBgStyle = { backgroundColor: chatBackground.color };
  } else if (chatBackground.type === 'gradient' && chatBackground.gradient) {
    chatBgStyle = { backgroundImage: chatBackground.gradient };
  } else if (chatBackground.type === 'image' && chatBackground.imageUrl) {
    chatBgStyle = { backgroundColor: '#000000' };
  } else {
    chatBgStyle = { backgroundColor: isLight ? '#F8FAFC' : '#000000' };
  }

  return (
    <div className="flex-1 bg-[#000000] flex flex-col h-full min-w-0 w-full max-w-full relative overflow-hidden">
      {/* FIXED WALLPAPER LAYER (Stationary full-bleed, extends behind Header, Messages & Input Bar!) */}
      <div 
        className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden"
        style={chatBgStyle}
      >
        {/* Custom Image Wallpaper from Device Storage */}
        {chatBackground.type === 'image' && chatBackground.imageUrl && (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-300"
            style={{
              backgroundImage: `url(${chatBackground.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: chatBackground.imageOpacity ?? 0.85,
              filter: chatBackground.imageBlur ? `blur(${chatBackground.imageBlur}px)` : 'none',
            }}
          />
        )}

        {/* Subtle Doodle pattern overlay if enabled */}
        {chatBackground.pattern && (
          <div className="absolute inset-0 pointer-events-none chat-wallpaper-doodles" />
        )}
      </div>

      {/* Channel Header with Frosted Glass Transparency & Adaptive Accents */}
      <div className={`h-16 md:h-20 px-3 md:px-5 flex items-center justify-between select-none z-20 backdrop-blur-md shrink-0 transition-all duration-200 ${
        hasCustomWallpaper 
          ? 'bg-black/40 border-b border-white/15 shadow-md' 
          : isLight 
            ? 'bg-white/75 border-b-2 border-black shadow-sm' 
            : 'bg-black/60 border-b border-white/10 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {isMobile && (
            <button
              type="button"
              onClick={onBack}
              className={`tactile-btn p-1.5 rounded-xl cursor-pointer mr-0.5 shrink-0 border-2 shadow-[2px_2px_0px_#000000] ${
                hasCustomWallpaper ? 'bg-black/50 text-white border-white/30' : 'bg-white text-black border-black'
              }`}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
          <div 
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-center shrink-0"
            style={{ 
              backgroundColor: effectiveAccent, 
              color: getReadableTextColor(effectiveAccent) 
            }}
          >
            <Hash className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h2 className={`text-xs sm:text-base font-black leading-tight truncate max-w-[85px] xs:max-w-[140px] sm:max-w-[200px] ${
              hasCustomWallpaper || !isLight ? 'text-white' : 'text-black'
            }`}>{channel.name}</h2>
            <span 
              className="text-[10px] flex items-center gap-1 mt-0.5 font-bold"
              style={{ color: hasCustomWallpaper || !isLight ? 'rgba(255,255,255,0.7)' : '#8A8A8A' }}
            >
              <Users className="w-3.5 h-3.5" style={{ color: effectiveAccent }} />
              {channel.memberCount || 0} online
            </span>
          </div>
        </div>
        <div 
          className="tactile-badge text-[8px] md:text-[9px] px-2.5 py-1 rounded-md shrink-0 hidden xs:block font-bold uppercase tracking-wider border"
          style={{ 
            color: hasCustomWallpaper ? effectiveAccent : '#000000', 
            borderColor: hasCustomWallpaper ? `${effectiveAccent}80` : '#000000', 
            backgroundColor: hasCustomWallpaper ? `${effectiveAccent}20` : '#FCC105' 
          }}
        >
          Group Channel
        </div>
      </div>

      {/* Description Banner with Tactile Strip */}
      <div className={`px-4 py-2 border-b text-xs font-bold flex items-center gap-2 select-none z-20 shrink-0 backdrop-blur-md ${
        hasCustomWallpaper 
          ? 'bg-black/30 border-white/10 text-white/80' 
          : 'bg-[#FCC105]/15 border-b-2 border-black text-black'
      }`}>
        <Hash className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: effectiveAccent }} />
        <span className="truncate">{channel.description}</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-3 md:p-5 space-y-4 relative z-10 bg-transparent min-h-0">
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
                  const bubbleBg = isOwn ? outgoingBg : incomingBg;
                  const bubbleText = isOwn ? outgoingText : incomingText;
                  const bubbleBorder = isOwn ? outgoingBg : (isLight ? '#E2E8F0' : '#2B2B2B');
                  const shapeClass = isOwn ? currentShape.outgoingClass : currentShape.incomingClass;

                  return (
                    <div key={msg.id} className={`flex w-full gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} chat-fade-in`}>
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[#2B2B2B] shrink-0">
                        <img src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender}`} alt={msg.senderName} className="w-full h-full object-cover bg-[#1A1A1A]" />
                      </div>
                      {/* Bubble */}
                      <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        {!isOwn && (
                          <span className="text-[10px] font-bold mb-1 ml-1" style={{ color: effectiveAccent }}>{msg.senderName}</span>
                        )}
                        <div className="flex items-center gap-2 max-w-full">
                          <div 
                            onContextMenu={(e) => handleMsgContextMenu(e, msg, isOwn)}
                            onTouchStart={(e) => handleMsgTouchStart(msg, isOwn, e)}
                            onTouchMove={handleMsgTouchMove}
                            onTouchEnd={handleMsgTouchEnd}
                            onTouchCancel={handleMsgTouchEnd}
                            style={
                              msg.type === 'image' || msg.type === 'file' || msg.type === 'video'
                                ? {}
                                : {
                                    backgroundColor: bubbleBg,
                                    color: bubbleText,
                                  }
                            }
                            className={`text-sm select-text cursor-pointer ${shapeClass} ${
                              msg.type === 'image' || msg.type === 'file' || msg.type === 'video'
                                ? 'p-0 bg-transparent border-0 shadow-none'
                                : 'px-4 py-2.5'
                            }`}
                          >
                      {/* Render Video Message */}
                      {msg.type === 'video' && (
                        <div className="mb-2 rounded-xl overflow-hidden border-2 border-black shadow-[3.5px_3.5px_0px_#000000] bg-black max-w-[320px] relative">
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
                        <div className="mb-2 rounded-xl overflow-hidden border-2 border-black shadow-[3.5px_3.5px_0px_#000000] bg-white max-w-[280px] relative group">
                          <img 
                            src={msg.mediaUrl} 
                            alt="attachment" 
                            className="w-full object-cover max-h-56 cursor-pointer" 
                            onClick={() => setPreviewMedia({ type: 'image', url: msg.mediaUrl, name: msg.text || 'image.png' })}
                          />
                          
                          {/* Direct download button on image */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(e, msg);
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black text-white hover:text-[#FCC105] cursor-pointer border-2 border-black shadow-[2px_2px_0px_#000000]"
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
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-black shadow-[3.5px_3.5px_0px_#000000] ${
                              msg.status === 'uploading' ? 'opacity-70' : ''
                            } ${
                              isOwn ? 'bg-[#FCC105] text-black font-semibold' : 'bg-white text-black font-semibold'
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
                  </div>
                  <span 
                    className="text-[10px] font-semibold mt-1" 
                    style={{ 
                      color: isOwn 
                        ? (outgoingText === '#000000' ? '#4A3900' : 'rgba(255, 255, 255, 0.75)') 
                        : (isLight ? '#64748B' : '#8A8A8A') 
                    }}
                  >
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
        <div className={`absolute bottom-20 left-3 right-3 sm:left-5 sm:right-auto border rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 z-30 sm:w-48 chat-fade-in select-none backdrop-blur-xl ${
          isLight ? 'bg-white/90 border-black/10' : 'bg-[#111111]/90 border-white/10'
        }`}>
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#8A8A8A] tracking-wider uppercase border-b border-white/10 mb-1 select-none">
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
              isLight ? 'text-slate-900 hover:bg-black/5' : 'text-white hover:bg-white/10'
            }`}
          >
            <Image className="w-4 h-4 shrink-0" style={{ color: effectiveAccent }} />
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
              isLight ? 'text-slate-900 hover:bg-black/5' : 'text-white hover:bg-white/10'
            }`}
          >
            <Film className="w-4 h-4 shrink-0" style={{ color: effectiveAccent }} />
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
              isLight ? 'text-slate-900 hover:bg-black/5' : 'text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" style={{ color: effectiveAccent }} />
            Upload Document
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className={`absolute bottom-20 left-3 right-3 sm:left-5 sm:right-auto border rounded-2xl shadow-2xl p-3 grid grid-cols-6 gap-2 z-30 sm:w-64 chat-fade-in select-none backdrop-blur-xl ${
          isLight ? 'bg-white/90 border-black/10' : 'bg-[#111111]/90 border-white/10'
        }`}>
          {emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(prev => prev + emoji)}
              className="text-2xl p-1.5 rounded-lg cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Panel with Frosted Glass Transparency & Adaptive Accents */}
      <form
        onSubmit={handleSend}
        className={`p-3 flex items-center select-none z-20 w-full max-w-full gap-2.5 md:gap-3 backdrop-blur-md shrink-0 transition-all duration-200 ${
          hasCustomWallpaper 
            ? 'bg-black/35 border-t border-white/10' 
            : isLight 
              ? 'bg-white/75 border-t-2 border-black' 
              : 'bg-black/60 border-t border-white/10'
        }`}
      >
        {/* Main Input Box (Tactile Border & 3D Shadow with Frosted Transparency) */}
        <div 
          className="flex-1 flex items-center rounded-2xl md:rounded-full overflow-hidden md:px-2.5 md:py-1 py-0 px-0 transition-all duration-150 backdrop-blur-md"
          style={{
            backgroundColor: hasCustomWallpaper ? 'rgba(0, 0, 0, 0.5)' : (isLight ? '#FFFFFF' : 'rgba(20, 20, 20, 0.7)'),
            borderColor: hasCustomWallpaper ? effectiveAccent : '#000000',
            borderWidth: '2px',
            borderStyle: 'solid',
            boxShadow: hasCustomWallpaper
              ? (isInputFocused ? `0 0 15px ${effectiveAccent}60, 3px 3px 0px #000000` : `3px 3px 0px #000000`)
              : '4px 4px 0px #000000'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className={`p-2 pl-3 md:pl-2 cursor-pointer shrink-0 transition-colors ${
              hasCustomWallpaper ? 'text-white/80 hover:text-white' : 'text-black'
            }`}
            title="Emojis"
          >
            <Smile className="w-5 h-5 stroke-[2.2]" />
          </button>

          <input
            type="text"
            placeholder={`Message ${channel.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className={`flex-1 bg-transparent border-0 px-2 py-2 text-sm font-semibold focus:outline-none focus:ring-0 min-w-0 ${
              hasCustomWallpaper || !isLight 
                ? 'text-white placeholder-white/50' 
                : 'text-black placeholder-neutral-500'
            }`}
          />

          {/* Attachment menu trigger */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-2 pr-3 md:pr-2 cursor-pointer shrink-0 transition-colors ${
              hasCustomWallpaper ? 'text-white/80 hover:text-white' : 'text-black'
            }`}
            title="Attachments"
          >
            <Paperclip className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Attached Send Button (Mobile only) */}
          <button
            type="submit"
            className="md:hidden self-stretch px-4 flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none border-l-2 active:translate-x-0.5 active:translate-y-0.5"
            style={{ 
              backgroundColor: effectiveAccent, 
              color: getReadableTextColor(effectiveAccent),
              borderColor: hasCustomWallpaper ? effectiveAccent : '#000000'
            }}
            title="Send message"
          >
            <Send className="w-4.5 h-4.5 fill-current stroke-[2]" />
          </button>
        </div>

        {/* Standalone Send Button (Desktop only) */}
        <button
          type="submit"
          className="hidden md:flex w-11 h-11 rounded-full items-center justify-center transition-all tactile-btn cursor-pointer shrink-0 focus:outline-none"
          style={{ 
            backgroundColor: effectiveAccent, 
            color: getReadableTextColor(effectiveAccent),
            border: '2px solid #000000',
            boxShadow: `3px 3px 0px #000000, 0 0 14px ${effectiveAccent}50`
          }}
          title="Send message"
        >
          <Send className="w-5 h-5 fill-current" />
        </button>
      </form>
      {/* Message Context Menu for Desktop (Right-click) */}
      {activeMsgMenu && !activeMsgMenu.isMobileSheet && (
        <div 
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setActiveMsgMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setActiveMsgMenu(null);
          }}
        >
          <div 
            className="fixed z-50 bg-white text-black border-2 border-black rounded-xl shadow-[4px_4px_0px_#000000] p-1.5 w-48 select-none"
            style={{ left: activeMsgMenu.x, top: activeMsgMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeMsgMenu.msg.type !== 'call_history' && activeMsgMenu.msg.text && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeMsgMenu.msg.text);
                  setActiveMsgMenu(null);
                  alert("Copied message to clipboard!");
                }}
                className="w-full text-left px-3 py-2 text-xs font-black uppercase text-black rounded-lg active:bg-neutral-100 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="w-4 h-4 stroke-[2.2]" />
                <span>Copy Text</span>
              </button>
            )}

            {onDeleteMessage && (
              <button
                type="button"
                onClick={() => {
                  const targetId = activeMsgMenu.msg.id;
                  setActiveMsgMenu(null);
                  if (window.confirm("Are you sure you want to delete this message?")) {
                    onDeleteMessage(targetId);
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs font-black uppercase text-[#EF4444] rounded-lg active:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Delete Message</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Mobile Action Sheet (Long-press) */}
      {activeMsgMenu && activeMsgMenu.isMobileSheet && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setActiveMsgMenu(null)}
        >
          <div 
            className="w-full sm:max-w-xs bg-white text-black border-t-2 sm:border-2 border-black rounded-t-2xl sm:rounded-2xl p-4 shadow-[0_-4px_0px_#000000] sm:shadow-[4px_4px_0px_#000000] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-3">
              <h3 className="font-black text-sm text-black">Message Options</h3>
              <button
                type="button"
                onClick={() => setActiveMsgMenu(null)}
                className="tactile-btn p-1.5 rounded-lg bg-neutral-100 text-black"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-2">
              {activeMsgMenu.msg.type !== 'call_history' && activeMsgMenu.msg.text && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeMsgMenu.msg.text);
                    setActiveMsgMenu(null);
                    alert("Copied message to clipboard!");
                  }}
                  className="tactile-btn w-full py-2.5 px-3 rounded-xl bg-white text-black font-black text-xs uppercase flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4 stroke-[2.2]" />
                  <span>Copy Text</span>
                </button>
              )}

              {onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => {
                    const targetId = activeMsgMenu.msg.id;
                    setActiveMsgMenu(null);
                    if (window.confirm("Are you sure you want to delete this message?")) {
                      onDeleteMessage(targetId);
                    }
                  }}
                  className="tactile-btn w-full py-2.5 px-3 rounded-xl bg-[#EF4444] text-white font-black text-xs uppercase flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Delete Message</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveMsgMenu(null)}
                className="tactile-btn w-full py-2 px-3 rounded-xl bg-neutral-100 text-neutral-700 font-bold text-xs uppercase flex items-center justify-center mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Lightbox (Images & Videos) */}
      {previewMedia && (
        <div 
          className="fixed inset-0 bg-[#000000]/95 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 transition-opacity duration-300 chat-fade-in dark-call-screen keep-dark"
          onClick={() => setPreviewMedia(null)}
        >
          {/* Top Bar with filename, download, and close button */}
          <div 
            className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between z-52 bg-[#111111]/90 backdrop-blur-md border border-[#2B2B2B] px-4 py-2.5 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              {previewMedia.type === 'video' ? (
                <Video className="w-4 h-4 shrink-0" style={{ color: effectiveAccent }} />
              ) : (
                <Image className="w-4 h-4 shrink-0" style={{ color: effectiveAccent }} />
              )}
              <span className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-md">
                {previewMedia.name}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadFileToDevice(previewMedia.url, previewMedia.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg"
                style={{ 
                  backgroundColor: effectiveAccent, 
                  color: getReadableTextColor(effectiveAccent),
                  boxShadow: `0 8px 20px ${effectiveAccent}30`
                }}
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
