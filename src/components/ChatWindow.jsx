import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Smile, MoreVertical, 
  Phone, Video, Mic, Check, CheckCheck, 
  Image, FileText, X, ChevronRight, ChevronLeft, Play, Pause
} from 'lucide-react';

const MessageSkeleton = () => (
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

export default function ChatWindow({ chat, onSendMessage, onSendMedia, onClearChat, onBack, isMobile, onStartCall, isEncrypted, isLoadingHistory }) {

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState(null); // id of playing audio
  const messagesEndRef = useRef(null);

  const fileInputRef = useRef(null);
  const [downloadingStates, setDownloadingStates] = useState({}); // messageId -> progressPercentage

  const handleDownload = (e, msg) => {
    e.preventDefault();
    if (downloadingStates[msg.id] !== undefined) return;
    
    setDownloadingStates(prev => ({ ...prev, [msg.id]: 0 }));
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        const link = document.createElement('a');
        link.href = msg.mediaUrl;
        link.download = msg.text;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          setDownloadingStates(prev => {
            const next = { ...prev };
            delete next[msg.id];
            return next;
          });
        }, 1000);
      }
      
      setDownloadingStates(prev => ({ ...prev, [msg.id]: progress }));
    }, 150);
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
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      
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
    <div className="flex-1 bg-[#000000] flex flex-col h-full min-w-0 w-full max-w-full relative">
      {/* Chat Window Header */}
      <div className="h-16 md:h-20 border-b border-[#2B2B2B] px-3 md:px-5 flex items-center justify-between bg-[#0A0A0A] select-none z-10">
        <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
          {/* Back Button on Mobile */}
          {isMobile && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded-lg text-[#8A8A8A] hover:text-[#FFFFFF] hover:bg-[#1A1A1A] cursor-pointer mr-0.5 flex items-center justify-center shrink-0"
              title="Back to conversations"
            >
              <ChevronLeft className="w-5.5 h-5.5 text-[#FCC105]" />
            </button>
          )}
          
          {/* Contact Avatar */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 md:w-11 md:h-11 rounded-full overflow-hidden border border-[#FCC105]">
              <img
                src={chat.avatarUrl}
                alt={chat.name}
                className="w-full h-full object-cover bg-[#1A1A1A]"
              />
            </div>
            {chat.isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22C55E] border-2 border-[#0A0A0A] rounded-full" />
            )}
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <h2 className="text-xs sm:text-base font-bold text-[#FFFFFF] leading-tight truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[200px]">
                {chat.name}
              </h2>
              {!['liam', 'sienna', 'marcus', 'evelyn'].includes(chat.id) && (
                <span className="text-[7px] md:text-[8px] bg-[#FCC105]/10 text-[#FCC105] px-1 rounded border border-[#FCC105]/20 font-bold uppercase tracking-wider scale-90 shrink-0 select-none hidden xs:inline-block">
                  Peer
                </span>
              )}
              {isEncrypted && (
                <span title="End-to-end encrypted" className="text-[7px] md:text-[8px] bg-[#22C55E]/10 text-[#22C55E] px-1 py-0.5 rounded border border-[#22C55E]/20 font-bold uppercase tracking-wider shrink-0 select-none flex items-center gap-0.5">
                  🔒 <span className="hidden xs:inline">E2EE</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#8A8A8A] flex items-center gap-1 mt-0.5">
              {chat.isTyping ? (
                <span className="text-[#FCC105] font-medium animate-pulse">Typing...</span>
              ) : chat.isOnline ? (
                <>
                  <span className="w-1 h-1 bg-[#22C55E] rounded-full" />
                  Active
                </>
              ) : (
                'Offline'
              )}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 text-[#8A8A8A] shrink-0">
          <button 
            onClick={() => onStartCall('audio')}
            className="p-1.5 sm:p-2 rounded-lg hover:text-[#FFFFFF] hover:bg-[#111111] transition-all cursor-pointer text-[#FCC105]"
            title="Voice Call"
          >
            <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <button 
            onClick={() => onStartCall('video')}
            className="p-1.5 sm:p-2 rounded-lg hover:text-[#FFFFFF] hover:bg-[#111111] transition-all cursor-pointer text-[#FCC105]"
            title="Video Call"
          >
            <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <div className="relative group">
            <button className="p-1.5 sm:p-2 rounded-lg hover:text-[#FFFFFF] hover:bg-[#111111] transition-all cursor-pointer">
              <MoreVertical className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
            <div className="hidden group-hover:block absolute right-0 top-8 bg-[#111111] border border-[#2B2B2B] rounded-lg shadow-xl py-1.5 w-40 z-20">
              <button 
                onClick={onClearChat} 
                className="w-full px-4 py-2 text-left text-xs text-[#EF4444] hover:bg-[#1A1A1A] transition-colors"
              >
                Clear Conversation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 bg-[#000000]">
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
            
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'} chat-fade-in`}
              >
                <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
                  {/* Bubble Container */}
                  <div
                    className={`rounded-2xl px-4 py-3 border text-sm shadow-sm transition-all select-text ${
                      isOutgoing
                        ? 'bg-[#FCC105] text-[#000000] border-[#FCC105] rounded-tr-none'
                        : 'bg-[#1A1A1A] text-[#FFFFFF] border-[#2B2B2B] rounded-tl-none'
                    }`}
                  >
                    {/* Render Image Message */}
                    {msg.type === 'image' && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-[#2B2B2B]/20 bg-[#000000]/10 max-w-[280px] relative">
                        <img src={msg.mediaUrl} alt="attachment" className="w-full object-cover max-h-48" />
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
                      <div className="relative">
                        <a 
                          href={msg.status === 'uploading' ? 'javascript:void(0)' : (msg.mediaUrl || '#')} 
                          download={msg.status === 'uploading' ? undefined : msg.text}
                          onClick={(e) => {
                            if (msg.status === 'uploading') return;
                            handleDownload(e, msg);
                          }}
                          className={`flex items-center gap-2.5 p-2 rounded-xl mb-1.5 transition-all ${
                            msg.status === 'uploading' ? 'opacity-70 cursor-default' : 'cursor-pointer hover:opacity-90'
                          } ${
                            isOutgoing ? 'bg-[#C99600]/30 border border-[#000000]/10' : 'bg-[#111111] border border-[#2B2B2B]'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isOutgoing ? 'bg-[#000000] text-[#FCC105]' : 'bg-[#1A1A1A] text-[#FCC105]'
                          }`}>
                            {msg.status === 'uploading' ? (
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FCC105]" />
                            ) : downloadingStates[msg.id] !== undefined ? (
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FCC105]" />
                            ) : (
                              <FileText className="w-4.5 h-4.5" />
                            )}
                          </div>
                          <div className="min-w-0 text-left flex-1">
                            <p className={`text-xs font-semibold truncate max-w-[150px] ${
                              isOutgoing ? 'text-[#000000]' : 'text-[#FFFFFF]'
                            }`}>
                              {msg.text}
                            </p>
                            <span className={`text-[10px] ${isOutgoing ? 'text-[#4A3900]' : 'text-[#8A8A8A]'}`}>
                              {msg.status === 'uploading' 
                                ? `Uploading... ${msg.progress || 0}%` 
                                : downloadingStates[msg.id] !== undefined 
                                  ? `Downloading... ${downloadingStates[msg.id]}%` 
                                  : msg.size}
                            </span>
                            
                            {(msg.status === 'uploading' || downloadingStates[msg.id] !== undefined) && (
                              <div className="w-full bg-[#000000]/10 rounded-full h-1 mt-1 overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-150" 
                                  style={{ 
                                    width: `${msg.status === 'uploading' ? (msg.progress || 0) : downloadingStates[msg.id]}%`,
                                    backgroundColor: isOutgoing ? '#000000' : '#FCC105'
                                  }} 
                                />
                              </div>
                            )}
                          </div>
                        </a>
                      </div>
                    )}

                    {/* Render Audio Wave Message */}
                    {msg.type === 'audio' && (
                      <div className="flex items-center gap-3.5 py-1 min-w-[220px]">
                        <button 
                          onClick={() => handlePlayAudio(msg)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
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
                        <span className={`text-[10px] font-medium ${isOutgoing ? 'text-[#4A3900]' : 'text-[#8A8A8A]'}`}>
                          {msg.duration}
                        </span>
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
                    {msg.type !== 'audio' && msg.type !== 'call_history' && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed select-text font-medium">
                        {msg.text}
                      </p>
                    )}
                  </div>

                  {/* Message Timestamp & Receipt Container */}
                  <div className="flex items-center gap-1.5 mt-1 select-none">
                    {msg.encrypted && (
                      <span title="End-to-end encrypted" className="text-[10px] opacity-50">🔒</span>
                    )}
                    <span 
                      className="text-[10px] font-semibold"
                      style={{ color: isOutgoing ? '#4A3900' : '#8A8A8A' }}
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
                          <CheckCheck className="w-3.5 h-3.5 text-[#000000]/50" />
                        ) : (
                          /* Single gray tick = sent/sending */
                          <Check className="w-3.5 h-3.5 text-[#000000]/40" />
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
              <div className="rounded-2xl px-4 py-3 bg-[#1A1A1A] border border-[#2B2B2B] rounded-tl-none flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 bg-[#FCC105] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#FCC105] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#FCC105] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
        <div className="absolute bottom-22 left-4 sm:left-5 bg-[#111111] border border-[#2B2B2B] rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 z-20 min-w-[180px] max-w-[calc(100vw-2rem)] chat-fade-in">
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
                fileInputRef.current.accept = '*/*';
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-[#1A1A1A] hover:text-[#FCC105] transition-all text-left cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#FCC105]" />
            Upload Document
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              startRecording();
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#FFFFFF] hover:bg-[#1A1A1A] hover:text-[#FCC105] transition-all text-left cursor-pointer"
          >
            <Mic className="w-4 h-4 text-[#FCC105]" />
            Record Voice Note
          </button>
        </div>
      )}

      {/* Emoji Picker Overlay */}
      {showEmojiPicker && (
        <div className="absolute bottom-22 left-4 sm:left-16 bg-[#111111] border border-[#2B2B2B] rounded-2xl shadow-2xl p-3 grid grid-cols-6 gap-2 z-20 w-[calc(100vw-2rem)] sm:w-64 chat-fade-in select-none">
          {emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-[#1A1A1A] cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Form Input Panel */}
      {isRecording ? (
        <div className="p-2.5 md:p-4 bg-[#0A0A0A] border-t border-[#2B2B2B] flex items-center justify-between gap-2 select-none z-10 chat-fade-in w-full max-w-full">
          <div className="flex items-center gap-1.5 md:gap-3 text-[#EF4444] font-bold text-xs md:text-sm min-w-0">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-[#EF4444] rounded-full animate-ping shrink-0" />
            <span className="truncate">Recording...</span>
            <span className="text-[#8A8A8A] font-semibold shrink-0">({Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')})</span>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="px-2.5 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] rounded-xl hover:bg-[#EF4444]/20 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              className="px-2.5 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold bg-[#FCC105] text-[#000000] rounded-xl hover:bg-[#FFD34D] transition-all cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <form 
          onSubmit={handleSend}
          className="p-3 bg-[#0A0A0A] border-t border-[#2B2B2B] flex items-center select-none z-10 w-full max-w-full gap-2.5 md:gap-2.5"
        >
          {/* Main Input Box (unified rectangular design on mobile, standard pill on desktop) */}
          <div className="flex-1 flex items-center bg-[#111111] border border-[#2B2B2B] focus-within:border-[#FCC105] focus-within:ring-1 focus-within:ring-[#FCC105] transition-all duration-200
            rounded-xl md:rounded-2xl overflow-hidden md:overflow-visible md:px-2.5 md:py-1 py-0 px-0"
          >
            {/* Emoji selector trigger */}
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

            {/* Message Input Text Area */}
            <input
              type="text"
              placeholder="Type your message here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent border-0 text-[#FFFFFF] placeholder-[#8A8A8A] px-2 py-2 text-sm focus:outline-none focus:ring-0 min-w-0"
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
      )}
    </div>
  );
}
