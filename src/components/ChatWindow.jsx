import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Smile, MoreVertical, 
  Phone, Video, Mic, Check, CheckCheck, 
  Image, FileText, X, ChevronRight, ChevronLeft, Play, Pause,
  Copy, Trash2, Download, Film, Maximize2
} from 'lucide-react';
import { BUBBLE_SHAPES, getReadableTextColor } from '../themeUtils.js';

const MessageSkeleton = () => (
  // ...
  <div className="flex flex-col space-y-4 w-full p-4 animate-pulse select-none">
    {/* Left (incoming) skeleton */}
    <div className="flex items-start gap-3 max-w-[70%]">
      <div className="w-8 h-8 rounded-full bg-[#2B2B2B] shrink-0" />
      <div className="flex flex-col gap-1 w-full flex-1">
        <div className="w-20 h-3 bg-[#2B2B2B] rounded" />
        <div className="w-48 h-10 bg-[#1A1A1A] border border-[#2B2B2B] rounded-2xl rounded-tl-none" />
      </div>
    </div>
    
    {/* Right (outgoing) skeleton */}
    <div className="flex items-end justify-end gap-3 w-full self-end">
      <div className="flex flex-col gap-1 items-end max-w-[70%] flex-1">
        <div className="w-56 h-12 bg-[#FCC105]/20 border border-[#FCC105]/30 rounded-2xl rounded-tr-none" />
      </div>
      <div className="w-8 h-8 rounded-full bg-[#FCC105]/10 shrink-0" />
    </div>

    {/* Left (incoming) skeleton */}
    <div className="flex items-start gap-3 max-w-[70%]">
      <div className="w-8 h-8 rounded-full bg-[#2B2B2B] shrink-0" />
      <div className="flex flex-col gap-1 w-full flex-1">
        <div className="w-24 h-3 bg-[#2B2B2B] rounded" />
        <div className="w-64 h-16 bg-[#1A1A1A] border border-[#2B2B2B] rounded-2xl rounded-tl-none" />
      </div>
    </div>

    {/* Right (outgoing) skeleton */}
    <div className="flex items-end justify-end gap-3 w-full self-end">
      <div className="flex flex-col gap-1 items-end max-w-[70%] flex-1">
        <div className="w-32 h-10 bg-[#FCC105]/20 border border-[#FCC105]/30 rounded-2xl rounded-tr-none" />
      </div>
      <div className="w-8 h-8 rounded-full bg-[#FCC105]/10 shrink-0" />
    </div>
  </div>
);

export default function ChatWindow({ chat, onSendMessage, onSendMedia, onClearChat, onDeleteChat, onDeleteMessage, onBack, isMobile, onStartCall, isEncrypted, isLoadingHistory, settings }) {

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const handleCopyConversation = () => {
    if (!chat || !chat.messages || chat.messages.length === 0) {
      alert("No messages in conversation to copy.");
      return;
    }
    const transcript = chat.messages
      .map(msg => {
        const sender = msg.sender === 'user' ? 'Me' : chat.name;
        return `[${msg.time}] ${sender}: ${msg.text || `[${msg.type} attachment]`}`;
      })
      .join('\n');
    navigator.clipboard.writeText(transcript);
    alert("Copied entire conversation transcript to clipboard!");
  };
  const [activeAudioPlaying, setActiveAudioPlaying] = useState(null); // id of playing audio
  const messagesEndRef = useRef(null);

  const fileInputRef = useRef(null);
  const [downloadingStates, setDownloadingStates] = useState({}); // messageId -> progressPercentage
  const [previewMedia, setPreviewMedia] = useState(null); // { type: 'image' | 'video', url: string, name: string }
  const [activeMsgMenu, setActiveMsgMenu] = useState(null); // { msg, isOutgoing, x, y, isMobileSheet }
  const msgTouchTimerRef = useRef(null);
  const msgTouchStartPosRef = useRef({ x: 0, y: 0 });
  const isMsgLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (msgTouchTimerRef.current) clearTimeout(msgTouchTimerRef.current);
    };
  }, []);

  const handleMsgTouchStart = (msg, isOutgoing, e) => {
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
        isOutgoing,
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

  const handleMsgContextMenu = (e, msg, isOutgoing) => {
    e.preventDefault();
    e.stopPropagation();
    if (msgTouchTimerRef.current) clearTimeout(msgTouchTimerRef.current);

    const menuWidth = 190;
    const menuHeight = 100;
    const clampedX = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const clampedY = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setActiveMsgMenu({
      msg,
      isOutgoing,
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
        // Fetch as blob to enforce download attribute on all origins/schemes
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
  const audioPlayerRef = useRef(new Audio());
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, chat?.isTyping]);

  useEffect(() => {
    audioPlayerRef.current.pause();
    setActiveAudioPlaying(null);
  }, [chat?.id]);

  const handlePlayAudio = (msg) => {
    if (activeAudioPlaying === msg.id) {
      audioPlayerRef.current.pause();
      setActiveAudioPlaying(null);
    } else {
      audioPlayerRef.current.src = msg.mediaUrl;
      audioPlayerRef.current.play().catch(e => console.warn(e));
      setActiveAudioPlaying(msg.id);
      audioPlayerRef.current.onended = () => {
        setActiveAudioPlaying(null);
      };
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
      
      onSendMedia({
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          const durationSec = recordTime;
          const durationStr = `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`;
          
          const waveform = [];
          const waveSize = 15;
          for (let i = 0; i < waveSize; i++) {
            waveform.push(Math.floor(Math.random() * 70) + 15);
          }

          onSendMedia({
            type: 'audio',
            text: 'Audio Message',
            mediaUrl: dataUrl,
            duration: durationStr,
            waveform
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
      setShowAttachMenu(false);
    } catch (err) {
      console.warn("Failed to start voice recording:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        };
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const [isInputFocused, setIsInputFocused] = useState(false);

  const theme = settings?.theme || 'dark';
  const chatBackground = settings?.chatBackground || { type: 'default' };
  const bubbleStyle = settings?.bubbleStyle || { shape: 'modern', outgoingBg: '#FCC105', incomingBg: '' };
  const effectiveAccent = settings?.accentColor || bubbleStyle.outgoingBg || '#FCC105';
  const currentShape = BUBBLE_SHAPES.find(s => s.id === bubbleStyle.shape) || BUBBLE_SHAPES[0];
  const isLight = theme === 'light';

  const outgoingBg = bubbleStyle.outgoingBg || effectiveAccent;
  const outgoingText = bubbleStyle.outgoingText || getReadableTextColor(outgoingBg);
  const incomingBg = bubbleStyle.incomingBg || (isLight ? '#FFFFFF' : '#1A1A1A');
  const incomingText = bubbleStyle.incomingText || (bubbleStyle.incomingBg ? getReadableTextColor(incomingBg) : (isLight ? '#0F172A' : '#FFFFFF'));

  // Background calculation
  let chatBgStyle;
  if (chatBackground.type === 'color' && chatBackground.color) {
    chatBgStyle = { backgroundColor: chatBackground.color };
  } else if (chatBackground.type === 'gradient' && chatBackground.gradient) {
    chatBgStyle = { backgroundImage: chatBackground.gradient };
  } else {
    chatBgStyle = { backgroundColor: isLight ? '#F8FAFC' : '#000000' };
  }

  if (!chat) {
    return (
      <div className="flex-1 bg-[#000000] flex flex-col items-center justify-center text-center p-8 select-none">
        <div className="w-20 h-20 rounded-2xl bg-[#111111] border border-[#2B2B2B] flex items-center justify-center mb-6 shadow-xl">
          <img src="/chatmeappicon.png" alt="ChatMe" className="w-12 h-12 object-contain opacity-40" />
        </div>
        <h2 className="text-xl font-display font-bold text-[#FFFFFF]">Select a conversation</h2>
        <p className="text-sm text-[#8A8A8A] mt-2 max-w-sm">
          Choose a conversation from the sidebar list or create a new contact to experience the brand-themed chat interface.
        </p>
      </div>
    );
  }

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji) => {
    setInputText(prev => prev + emoji);
  };

  const emojis = ['😊', '😂', '🔥', '👍', '🙌', '✨', '⚡', '💯', '💬', '🎉', '💻', '🚀'];

  const sendAttachment = (type) => {
    if (type === 'image') {
      onSendMedia({
        type: 'image',
        text: 'Sent a mock design screenshot.png',
        mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        size: '1.2 MB'
      });
    } else if (type === 'file') {
      onSendMedia({
        type: 'file',
        text: 'chatme_v4_branding_specs.pdf',
        size: '4.8 MB'
      });
    } else if (type === 'audio') {
      onSendMedia({
        type: 'audio',
        text: 'Audio Message',
        duration: '0:14',
        waveform: [20, 40, 15, 60, 80, 45, 30, 70, 95, 40, 20, 50, 70, 30, 15]
      });
    }
    setShowAttachMenu(false);
  };

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

      {/* Chat Window Header with Neo-Brutalist Tactile Styling */}
      <div className={`h-16 md:h-20 border-b-2 border-black px-3 md:px-5 flex items-center justify-between select-none z-20 backdrop-blur-md transition-all duration-200 shrink-0 ${
        isLight 
          ? 'bg-white/80 shadow-sm' 
          : 'bg-black/60 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Back Button on Mobile */}
          {isMobile && (
            <button
              type="button"
              onClick={onBack}
              className="tactile-btn p-1.5 rounded-xl bg-white text-black cursor-pointer mr-0.5 flex items-center justify-center shrink-0"
              title="Back to conversations"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
          
          {/* Contact Avatar */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-black shadow-[2px_2px_0px_#000000]">
              <img
                src={chat.avatarUrl}
                alt={chat.name}
                className="w-full h-full object-cover bg-white"
              />
            </div>
            {chat.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-black rounded-full shadow-[1px_1px_0px_#000000]" />
            )}
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className={`text-xs sm:text-base font-black leading-tight truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[200px] ${
                isLight ? 'text-black' : 'text-white'
              }`}>
                {chat.name}
              </h2>
              <span 
                className="tactile-badge text-[7px] md:text-[8px] px-1.5 py-0.5 rounded-md bg-[#FCC105] text-black shrink-0 hidden xs:inline-block"
              >
                Member
              </span>
              {isEncrypted && (
                <span title="End-to-end encrypted" className="tactile-badge text-[7px] md:text-[8px] bg-[#22C55E] text-black px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5">
                  🔒 <span className="hidden xs:inline">E2EE</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#8A8A8A] flex items-center gap-1 mt-0.5 font-bold">
              {chat.isTyping ? (
                <span className="animate-pulse text-[#FCC105]">Typing...</span>
              ) : chat.isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full border border-black" />
                  Active
                </>
              ) : (
                'Offline'
              )}
            </span>
          </div>
        </div>

        {/* Header Action Buttons (Tactile Mechanical Push Buttons) */}
        <div className="flex items-center gap-2 text-black shrink-0">
          <button 
            onClick={() => onStartCall('audio')}
            className="tactile-btn p-2 rounded-xl bg-white text-black"
            title="Voice Call"
          >
            <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <button 
            onClick={() => onStartCall('video')}
            className="tactile-btn p-2 rounded-xl bg-white text-black"
            title="Video Call"
          >
            <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <div className="relative group">
            <button className="tactile-btn p-2 rounded-xl bg-white text-black">
              <MoreVertical className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
            <div className="hidden group-hover:block absolute right-0 top-11 border-2 border-black rounded-xl shadow-[5px_5px_0px_#000000] py-2 w-52 z-30 overflow-hidden bg-white text-black font-semibold">
              <button 
                type="button"
                onClick={handleCopyConversation} 
                className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#FCC105]/20 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 shrink-0 text-black" />
                <span>Copy Conversation</span>
              </button>
              <button 
                type="button"
                onClick={onClearChat} 
                className="w-full px-4 py-2.5 text-left text-xs hover:bg-black/5 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-black shrink-0" />
                <span>Clear Conversation</span>
              </button>
              <div className="border-t-2 border-black my-1"></div>
              <button 
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to permanently delete all messages and remove your conversation with ${chat.name}?`)) {
                    onDeleteChat(chat.id);
                  }
                }} 
                className="w-full px-4 py-2.5 text-left text-xs text-[#FF4D4D] hover:bg-[#FF4D4D]/15 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-[#FF4D4D] shrink-0" />
                <span>Delete Conversation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE MESSAGES VIEWPORT (Scrolls smoothly above the fixed wallpaper) */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-3 md:p-5 space-y-4 relative z-10 bg-transparent min-h-0">
              {isLoadingHistory ? (
                <MessageSkeleton />
              ) : chat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center select-none">
                  <div className="w-12 h-12 rounded-full bg-[#111111] border border-[#2B2B2B] flex items-center justify-center text-[#8A8A8A] mb-3">
                    <Smile className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-[#8A8A8A]">No messages yet. Send a message to start chatting.</p>
                </div>
              ) : (
                chat.messages.map((msg) => {
                  const isOutgoing = msg.sender === 'user';
                  const bubbleBg = isOutgoing ? outgoingBg : incomingBg;
                  const bubbleText = isOutgoing ? outgoingText : incomingText;
                  const bubbleBorder = isOutgoing ? outgoingBg : (isLight ? '#E2E8F0' : '#2B2B2B');
                  const shapeClass = isOutgoing ? currentShape.outgoingClass : currentShape.incomingClass;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'} chat-fade-in`}
                    >
                      <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group/msg relative`}>
                        {/* Message Bubble wrapper */}
                        <div className="flex items-center gap-2 max-w-full">
                          {/* Bubble Container */}
                          <div
                            onContextMenu={(e) => handleMsgContextMenu(e, msg, isOutgoing)}
                            onTouchStart={(e) => handleMsgTouchStart(msg, isOutgoing, e)}
                            onTouchMove={handleMsgTouchMove}
                            onTouchEnd={handleMsgTouchEnd}
                            onTouchCancel={handleMsgTouchEnd}
                            style={
                              msg.type === 'image' || msg.type === 'file' || msg.type === 'video'
                                ? {}
                                : {
                                    backgroundColor: bubbleBg,
                                    color: bubbleText,
                                    borderColor: bubbleBorder,
                                  }
                            }
                            className={`text-sm transition-all select-text cursor-pointer ${shapeClass} ${
                              msg.type === 'image' || msg.type === 'file' || msg.type === 'video'
                                ? 'p-0 bg-transparent border-0'
                                : 'px-4 py-3 border shadow-sm'
                            }`}
                          >
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
                              isOutgoing ? 'bg-[#FCC105]/10 border border-[#FCC105]/20' : 'bg-[#111111] border border-[#2B2B2B]'
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

                      {/* Render Audio Wave Message */}
                      {msg.type === 'audio' && (
                        <div className="flex items-center gap-3 py-1 min-w-[220px]">
                          <button 
                            onClick={() => handlePlayAudio(msg)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shrink-0 ${
                              isOutgoing ? 'bg-[#000000] text-[#FCC105]' : 'bg-[#FCC105] text-[#000000]'
                            }`}
                          >
                            {activeAudioPlaying === msg.id ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                          
                          {/* Simulated Visual Waveform */}
                          <div className="flex-1 flex items-center gap-[3px] h-7">
                            {msg.waveform?.map((val, i) => {
                              const isPlaying = activeAudioPlaying === msg.id;
                              const isPast = isPlaying && (i / msg.waveform.length) < 0.6; // mock progress
                              return (
                                <span 
                                  key={i} 
                                  className="w-[3px] rounded-full transition-all"
                                  style={{ 
                                    height: `${val}%`, 
                                    backgroundColor: isOutgoing 
                                      ? (isPast ? '#000000' : 'rgba(0, 0, 0, 0.25)') 
                                      : (isPast ? '#FCC105' : '#8A8A8A'),
                                    animation: isPlaying ? `pulse 1.2s ease-in-out infinite alternate` : 'none',
                                    animationDelay: `${i * 0.05}s`
                                  }} 
                                />
                              );
                            })}
                          </div>
                          <span className={`text-[10px] font-medium shrink-0 ${isOutgoing ? 'text-[#4A3900]' : 'text-[#8A8A8A]'}`}>
                            {msg.duration}
                          </span>

                          {/* Direct download voice note */}
                          <button
                            type="button"
                            onClick={(e) => handleDownload(e, { id: msg.id, mediaUrl: msg.mediaUrl, text: msg.text || 'voice-note.webm' })}
                            className="p-1 rounded-md text-[#8A8A8A] hover:text-[#FCC105] hover:bg-[#1A1A1A] transition-colors cursor-pointer shrink-0"
                            title="Save voice note to device"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Render Call History Message */}
                      {msg.type === 'call_history' && (
                        <div className="flex items-center gap-3.5 py-1 min-w-[200px] select-none">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOutgoing ? 'bg-[#000000] text-[#FCC105]' : 'bg-[#FCC105]/15 text-[#FCC105]'
                          }`}>
                            {msg.callType === 'video' ? (
                              <Video className="w-4.5 h-4.5" />
                            ) : (
                              <Phone className="w-4.5 h-4.5" />
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-normal ${isOutgoing ? 'text-black font-extrabold' : 'text-white'}`}>
                              {(() => {
                                const callTypeName = msg.callType === 'video' ? 'Video Call' : 'Voice Call';
                                if (msg.callStatus === 'completed') {
                                  return isOutgoing ? `Outgoing ${callTypeName}` : `Incoming ${callTypeName}`;
                                } else if (msg.callStatus === 'declined') {
                                  return isOutgoing ? `Declined ${callTypeName}` : `Declined ${callTypeName}`;
                                } else {
                                  return isOutgoing ? `Cancelled ${callTypeName}` : `Missed ${callTypeName}`;
                                }
                              })()}
                            </p>
                            <span className={`text-[10px] font-medium leading-none mt-1 block ${isOutgoing ? 'text-[#4A3900]' : 'text-[#8A8A8A]'}`}>
                              {msg.callStatus === 'completed' ? `Duration: ${msg.callDuration}` : msg.callDuration}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Standard text message */}
                      {msg.type !== 'audio' && msg.type !== 'call_history' && msg.type !== 'image' && msg.type !== 'file' && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed select-text font-medium">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message Timestamp & Receipt Container */}
                  <div className="flex items-center gap-1.5 mt-1 select-none">
                    {msg.encrypted && (
                      <span title="End-to-end encrypted" className="text-[10px] opacity-50">🔒</span>
                    )}
                    <span 
                      className="text-[10px] font-semibold"
                      style={{ 
                        color: isOutgoing 
                          ? (outgoingText === '#000000' ? '#4A3900' : 'rgba(255, 255, 255, 0.75)') 
                          : (isLight ? '#64748B' : '#8A8A8A') 
                      }}
                    >
                      {msg.time}
                    </span>
                    {isOutgoing && (
                      <span className="flex items-center" title={msg.status}>
                        {msg.status === 'read' ? (
                          /* Double blue ticks = read */
                          <CheckCheck className="w-3.5 h-3.5 text-[#3B9EFF]" />
                        ) : msg.status === 'delivered' ? (
                          /* Double gray ticks = delivered */
                          <CheckCheck 
                            className="w-3.5 h-3.5" 
                            style={{ color: outgoingText === '#000000' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }} 
                          />
                        ) : (
                          /* Single gray tick = sent/sending */
                          <Check 
                            className="w-3.5 h-3.5" 
                            style={{ color: outgoingText === '#000000' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)' }} 
                          />
                        )}
                      </span>
                    )}
                  </div>


                </div>
              </div>
            );
          })
        )}

        {/* Loading / Typing Bubbles */}
        {chat.isTyping && (
          <div className="flex w-full justify-start chat-fade-in">
            <div className="flex flex-col items-start max-w-[70%]">
              <div className={`rounded-2xl px-4 py-3 border rounded-tl-none flex items-center gap-1.5 shadow-sm backdrop-blur-sm ${
                isLight ? 'bg-white/70 border-black/10' : 'bg-black/50 border-white/10'
              }`}>
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: effectiveAccent, animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: effectiveAccent, animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: effectiveAccent, animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
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
        <div className={`absolute bottom-22 left-3 right-3 sm:left-5 sm:right-auto border rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 z-30 sm:w-48 chat-fade-in backdrop-blur-md ${
          isLight ? 'bg-white/95 border-black/15' : 'bg-[#111111]/90 border-white/15'
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
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-white/10 transition-all text-left cursor-pointer"
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
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-white/10 transition-all text-left cursor-pointer"
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
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-white/10 transition-all text-left cursor-pointer"
          >
            <FileText className="w-4 h-4 shrink-0" style={{ color: effectiveAccent }} />
            Upload Document
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              startRecording();
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-white/10 transition-all text-left cursor-pointer"
          >
            <Mic className="w-4 h-4 shrink-0" style={{ color: effectiveAccent }} />
            Record Voice Note
          </button>
        </div>
      )}

      {/* Emoji Picker Overlay */}
      {showEmojiPicker && (
        <div className={`absolute bottom-22 left-3 right-3 sm:left-16 sm:right-auto border rounded-2xl shadow-2xl p-3 grid grid-cols-6 gap-2 z-30 sm:w-64 chat-fade-in select-none backdrop-blur-md ${
          isLight ? 'bg-white/95 border-black/15' : 'bg-[#111111]/90 border-white/15'
        }`}>
          {emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl p-1.5 rounded-lg cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Form Input Panel with Frosted Glass Transparency */}
      {isRecording ? (
        <div className={`p-2.5 md:p-4 border-t flex items-center justify-between gap-2 select-none z-20 chat-fade-in w-full max-w-full backdrop-blur-md shrink-0 ${
          isLight ? 'bg-white/60 border-black/10' : 'bg-black/40 border-white/10'
        }`}>
          <div className="flex items-center gap-1.5 md:gap-3 text-[#EF4444] font-bold text-xs md:text-sm min-w-0">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-[#EF4444] rounded-full animate-ping shrink-0" />
            <span className="truncate">Recording...</span>
            <span className="text-[#8A8A8A] font-semibold shrink-0">({Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')})</span>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="tactile-btn px-3 py-1.5 text-xs font-black bg-white text-black rounded-lg uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              className="tactile-btn px-3 py-1.5 text-xs font-black bg-[#FCC105] text-black rounded-lg uppercase"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <form 
          onSubmit={handleSend}
          className={`p-3 border-t-2 border-black flex items-center select-none z-20 w-full max-w-full gap-2.5 md:gap-3 backdrop-blur-md shrink-0 transition-all duration-200 ${
            isLight ? 'bg-white/80' : 'bg-black/60'
          }`}
        >
          {/* Main Input Box (Tactile Border & 3D Shadow) */}
          <div 
            className="flex-1 flex items-center border-2 border-black shadow-[4px_4px_0px_#000000] rounded-xl md:rounded-2xl overflow-hidden md:px-2.5 md:py-1 py-0 px-0 bg-white text-black"
          >
            {/* Emoji selector trigger */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachMenu(false);
              }}
              className="p-2 pl-3 md:pl-2 text-black cursor-pointer shrink-0"
              title="Emojis"
            >
              <Smile className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Message Input Text Area */}
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              className="flex-1 bg-transparent border-0 text-black placeholder-neutral-500 px-2 py-2 text-sm font-semibold focus:outline-none focus:ring-0 min-w-0"
            />

            {/* Attachment menu trigger */}
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(!showAttachMenu);
                setShowEmojiPicker(false);
              }}
              className="p-2 pr-3 md:pr-2 text-black cursor-pointer shrink-0"
              title="Attachments"
            >
              <Paperclip className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Attached Send Button (Mobile only) */}
            <button
              type="submit"
              className="md:hidden self-stretch px-4 flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none border-l-2 border-black bg-[#FCC105] text-black active:translate-x-0.5 active:translate-y-0.5"
              style={{ 
                backgroundColor: effectiveAccent, 
                color: getReadableTextColor(effectiveAccent) 
              }}
              title="Send message"
            >
              <Send className="w-4.5 h-4.5 fill-current stroke-[2]" />
            </button>
          </div>

          {/* Standalone Send Button (Desktop only) */}
          <button
            type="submit"
            className="hidden md:flex w-11 h-11 rounded-2xl items-center justify-center transition-all tactile-btn cursor-pointer shrink-0 focus:outline-none bg-[#FCC105] text-black"
            style={{ 
              backgroundColor: effectiveAccent, 
              color: getReadableTextColor(effectiveAccent),
            }}
            title="Send message"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        </form>
      )}
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
