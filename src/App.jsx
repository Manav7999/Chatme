import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import ProfileSettings from './components/ProfileSettings';
import { 
  Sparkles, Users, MessageSquare, Compass, Bell, Check, 
  ArrowRight, ShieldCheck, HelpCircle, Laptop, Settings, Lock,
  X, Mic, Phone, Video
} from 'lucide-react';

// Default Scaffold Data
const initialChats = [];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const socketRef = useRef(null);
  const [currentUser, setCurrentUser] = useState({
    name: 'Developer Agent',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
    isOnline: true
  });
  const [chats, setChats] = useState(initialChats);
  
  // Parse URL search parameters for profile link invitations
  const [inviteData, setInviteData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    const inviteName = params.get('name');
    return inviteId ? { id: inviteId, name: inviteName } : null;
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    return window.innerWidth < 768 ? null : 'evelyn';
  });
  const [activeTab, setActiveTab] = useState('chats');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  
  const [settings, setSettings] = useState({
    simulationSpeed: 'fast',
    soundEnabled: true,
    notificationsEnabled: false
  });
  
  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const [activeCall, setActiveCall] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  activeCallRef.current = activeCall;
  const ringtoneIntervalRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const incomingOfferRef = useRef(null);

  useEffect(() => {
    let timer;
    if (activeCall && activeCall.status === 'connected') {
      timer = setInterval(() => {
        setActiveCall(prev => {
          if (!prev) return null;
          return { ...prev, duration: prev.duration + 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCall?.status]);

  useEffect(() => {
    return () => {
      stopRingtoneLoop();
      stopLocalStream();
    };
  }, []);

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRingtoneLoop = (isOutgoing) => {
    stopRingtoneLoop();
    try {
      const playTone = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        if (isOutgoing) {
          osc1.frequency.setValueAtTime(440, ctx.currentTime);
          osc2.frequency.setValueAtTime(480, ctx.currentTime);
        } else {
          osc1.frequency.setValueAtTime(554.37, ctx.currentTime); // C#5
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        }
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
      };
      playTone();
      ringtoneIntervalRef.current = setInterval(playTone, 2000);
    } catch (e) {
      console.warn("Failed to play ringtone:", e);
    }
  };

  const stopRingtoneLoop = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  const playConnectTone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  };

  const playDisconnectTone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const startLocalStream = async (videoRequired) => {
    try {
      const constraints = {
        audio: true,
        video: videoRequired
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn("Failed to get local user media stream:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        return stream;
      } catch (audioErr) {
        console.warn("Failed to get audio stream:", audioErr);
        return null;
      }
    }
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  };

  const setupPeerConnection = (recipientId, stream) => {
    closePeerConnection();
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'call_ice_candidate',
          to: recipientId,
          candidate: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.streams[0]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
      // Also pipe to the remote video element for video calls
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }
  };

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const startCall = async (type) => {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;

    const newCall = {
      chat: { id: activeChat.id, name: activeChat.name, avatarUrl: activeChat.avatarUrl },
      type,
      direction: 'outgoing',
      status: 'ringing',
      isMuted: false,
      isVideoOff: false,
      duration: 0
    };
    setActiveCall(newCall);
    startRingtoneLoop(true);

    const stream = await startLocalStream(type === 'video');
    setupPeerConnection(activeChat.id, stream);

    const pc = peerConnectionRef.current;
    if (pc) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'call_invite',
            to: activeChat.id,
            callType: type,
            offer: offer
          }));
        }
      } catch (e) {
        console.warn("Failed to create WebRTC offer:", e);
      }
    }
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    stopRingtoneLoop();
    setActiveCall(prev => ({ ...prev, status: 'connected' }));

    const stream = await startLocalStream(activeCall.type === 'video');
    setupPeerConnection(activeCall.chat.id, stream);

    const pc = peerConnectionRef.current;
    if (pc && incomingOfferRef.current) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'call_accept',
            to: activeCall.chat.id,
            answer: answer
          }));
        }
      } catch (e) {
        console.warn("Failed to accept WebRTC session description:", e);
      }
    }
  };

  const declineCall = () => {
    if (!activeCall) return;
    stopRingtoneLoop();
    stopLocalStream();
    closePeerConnection();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'call_decline',
        to: activeCall.chat.id
      }));
    }
    setActiveCall(null);
    playDisconnectTone();
  };

  const endCall = () => {
    if (!activeCall) return;
    stopRingtoneLoop();
    stopLocalStream();
    closePeerConnection();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'call_end',
        to: activeCall.chat.id
      }));
    }
    setActiveCall(null);
    playDisconnectTone();
  };

  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const requestNotificationPermissionDirectly = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    Notification.requestPermission().then(permission => {
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setSettings(prev => {
          const updated = { ...prev, notificationsEnabled: true };
          saveToLocalStorage(chats, currentUser, updated);
          return updated;
        });
        try {
          new Notification('ChatMe Notifications', {
            body: 'Desktop notifications successfully enabled!',
            icon: '/chatmeappicon.png'
          });
        } catch (e) {
          console.warn('Failed to send test notification:', e);
        }
      }
    });
  };

  const triggerNotification = (senderName, text, avatarUrl, senderId) => {
    if (!settingsRef.current.notificationsEnabled || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    // Only show notification if page is hidden OR user is looking at a different chat/tab
    const isPageHidden = document.visibilityState === 'hidden';
    const isDifferentChat = activeChatIdRef.current !== senderId || activeTabRef.current !== 'chats';
    
    if (isPageHidden || isDifferentChat) {
      try {
        const notification = new Notification(senderName, {
          body: text,
          icon: avatarUrl || '/chatmeappicon.png',
          tag: senderId,
          renotify: true
        });
        
        notification.onclick = () => {
          window.focus();
          handleSelectChat(senderId);
          setActiveTab('chats');
          notification.close();
        };
      } catch (e) {
        console.warn('Failed to send desktop notification:', e);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Local Storage syncing
  useEffect(() => {
    const savedUser = localStorage.getItem('chatme_user');
    const savedChats = localStorage.getItem('chatme_chats');
    const savedSettings = localStorage.getItem('chatme_settings');
    const savedLogin = localStorage.getItem('chatme_loggedin');

    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedChats) setChats(JSON.parse(savedChats));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedLogin) setIsLoggedIn(JSON.parse(savedLogin));
  }, []);

  // WebSocket Connection Handler
  useEffect(() => {
    if (isLoggedIn) {
      connectWebSocket();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
      }
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isLoggedIn, currentUser.name, currentUser.avatarUrl]);

  const connectWebSocket = () => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let socketUrl;
    if (window.location.port === '5173') {
      socketUrl = `ws://${window.location.hostname}:5001`;
    } else {
      socketUrl = `${protocol}//${window.location.host}`;
    }

    console.log('Connecting to WebSocket server at:', socketUrl);

    const ws = new WebSocket(socketUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection opened successfully.');
      const userId = localStorage.getItem('chatme_user_id') || `real_${currentUser.name.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('chatme_user_id', userId);

      const registerPayload = {
        type: 'register',
        user: {
          id: userId,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl
        }
      };
      ws.send(JSON.stringify(registerPayload));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket payload received:', data);

        switch (data.type) {
          case 'register_ok':
            setCurrentUser(prev => {
              const updated = { ...prev, id: data.user.id };
              localStorage.setItem('chatme_user', JSON.stringify(updated));

              // If we arrived via an invite link, trigger a handshake with the inviter!
              if (inviteData && inviteData.id) {
                const handshakePayload = {
                  type: 'handshake',
                  to: inviteData.id,
                  user: {
                    id: data.user.id,
                    name: prev.name,
                    avatarUrl: prev.avatarUrl
                  }
                };
                ws.send(JSON.stringify(handshakePayload));
                console.log('Sent WebSocket handshake to inviter:', inviteData.id);

                // Add inviter to our own chats list and select them
                setChats(prevChats => {
                  if (prevChats.some(c => c.id === inviteData.id)) return prevChats;
                  const inviterObj = {
                    id: inviteData.id,
                    name: inviteData.name || 'Invited User',
                    role: 'ChatMe Connected Member',
                    avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${inviteData.id}`,
                    isOnline: true,
                    unreadCount: 0,
                    isTyping: false,
                    messages: []
                  };
                  const updatedChats = [inviterObj, ...prevChats];
                  saveToLocalStorage(updatedChats);
                  return updatedChats;
                });
                setActiveChatId(inviteData.id);
                setInviteData(null);
                window.history.replaceState({}, document.title, window.location.pathname);
              }

              return updated;
            });
            break;

          case 'handshake':
            setChats(prev => {
              const existingIdx = prev.findIndex(c => c.id === data.user.id);
              if (existingIdx !== -1) {
                return prev.map(c => c.id === data.user.id ? { ...c, isOnline: true } : c);
              }
              const newChatObj = {
                id: data.user.id,
                name: data.user.name,
                role: 'ChatMe Connected Member',
                avatarUrl: data.user.avatarUrl,
                isOnline: true,
                unreadCount: 0,
                isTyping: false,
                messages: []
              };
              const updated = [newChatObj, ...prev];
              saveToLocalStorage(updated);
              return updated;
            });
            playNotifySound();
            break;

          case 'roster_update':
            setChats(prev => {
              const otherOnlineUsers = data.users.filter(u => u.id !== currentUser.id);
              const botIds = ['liam', 'sienna', 'marcus', 'evelyn'];
              let updated = [...prev];

              otherOnlineUsers.forEach(onlineUser => {
                const existingIdx = updated.findIndex(c => c.id === onlineUser.id);
                if (existingIdx !== -1) {
                  updated[existingIdx] = {
                    ...updated[existingIdx],
                    isOnline: true
                  };
                } else {
                  updated.unshift({
                    id: onlineUser.id,
                    name: onlineUser.name,
                    role: 'ChatMe Connected Member',
                    avatarUrl: onlineUser.avatarUrl,
                    isOnline: true,
                    unreadCount: 0,
                    isTyping: false,
                    messages: []
                  });
                }
              });

              // Mark offline
              updated = updated.map(c => {
                if (botIds.includes(c.id)) return c;
                const isStillOnline = otherOnlineUsers.some(u => u.id === c.id);
                return { ...c, isOnline: isStillOnline };
              });

              saveToLocalStorage(updated);
              return updated;
            });
            break;

          case 'direct_message':
            setChats(prev => {
              const senderId = data.sender;
              const now = new Date();
              const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const newMsg = {
                id: data.id,
                sender: senderId,
                text: data.text,
                time: data.time || timeStr,
                status: 'read',
                type: data.msgType || 'text',
                mediaUrl: data.mediaUrl,
                size: data.size,
                duration: data.duration,
                waveform: data.waveform
              };

              const existingIdx = prev.findIndex(c => c.id === senderId);
              let updated = [...prev];

              if (existingIdx !== -1) {
                updated = prev.map(c => {
                  if (c.id === senderId) {
                    return {
                      ...c,
                      isOnline: true,
                      unreadCount: senderId === activeChatIdRef.current ? 0 : c.unreadCount + 1,
                      messages: [...c.messages, newMsg]
                    };
                  }
                  return c;
                });
              } else {
                updated.unshift({
                  id: senderId,
                  name: data.senderName,
                  role: 'ChatMe Connected Member',
                  avatarUrl: data.senderAvatar,
                  isOnline: true,
                  unreadCount: senderId === activeChatIdRef.current ? 0 : 1,
                  isTyping: false,
                  messages: [newMsg]
                });
              }

              triggerNotification(data.senderName, data.text, data.senderAvatar, senderId);
              playNotifySound();
              saveToLocalStorage(updated);
              return updated;
            });
            break;

          case 'typing_state':
            setChats(prev => {
              return prev.map(c => c.id === data.sender ? { ...c, isTyping: data.isTyping } : c);
            });
            break;

          case 'call_invite':
            if (activeCallRef.current) {
              ws.send(JSON.stringify({ type: 'call_decline', to: data.from }));
              break;
            }
            incomingOfferRef.current = data.offer; // save caller's offer
            setActiveCall({
              chat: { id: data.from, name: data.name, avatarUrl: data.avatarUrl },
              type: data.callType,
              direction: 'incoming',
              status: 'ringing',
              isMuted: false,
              isVideoOff: false,
              duration: 0
            });
            startRingtoneLoop(false);
            break;

          case 'call_accept':
            if (activeCallRef.current && activeCallRef.current.status === 'ringing') {
              stopRingtoneLoop();
              setActiveCall(prev => ({ ...prev, status: 'connected' }));
              playConnectTone();
              if (peerConnectionRef.current && data.answer) {
                try {
                  await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (err) {
                  console.warn("Failed to set remote description on caller:", err);
                }
              }
            }
            break;

          case 'call_decline':
            if (activeCallRef.current && activeCallRef.current.chat.id === data.from) {
              stopRingtoneLoop();
              stopLocalStream();
              closePeerConnection();
              setActiveCall(null);
              playDisconnectTone();
            }
            break;

          case 'call_end':
            if (activeCallRef.current && activeCallRef.current.chat.id === data.from) {
              stopRingtoneLoop();
              stopLocalStream();
              closePeerConnection();
              setActiveCall(null);
              playDisconnectTone();
            }
            break;

          case 'call_ice_candidate':
            if (peerConnectionRef.current && data.candidate) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (e) {
                console.warn("Error adding ICE candidate:", e);
              }
            }
            break;

          case 'message_ack':
            // Server tells us if the message was delivered to an online peer or just queued
            setChats(prev => prev.map(chat => ({
              ...chat,
              messages: chat.messages.map(msg =>
                msg.id === data.msgId
                  ? { ...msg, status: data.status === 'delivered' ? 'delivered' : 'sent' }
                  : msg
              )
            })));
            break;

          case 'messages_read':
            // The peer (data.by) has read all our messages — upgrade all to 'read'
            setChats(prev => prev.map(chat =>
              chat.id === data.by
                ? {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.sender === 'user' ? { ...msg, status: 'read' } : msg
                    )
                  }
                : chat
            ));
            break;

          default:
            console.warn('Unhandled WS message:', data.type);
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed. Attempting reconnect in 3s...');
      setTimeout(() => {
        if (isLoggedIn) connectWebSocket();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('WS error:', err);
    };
  };

  const saveToLocalStorage = (newChats, newUser = currentUser, newSettings = settings) => {
    localStorage.setItem('chatme_user', JSON.stringify(newUser));
    localStorage.setItem('chatme_chats', JSON.stringify(newChats));
    localStorage.setItem('chatme_settings', JSON.stringify(newSettings));
  };

  // Sound Synthesizer via Web Audio API (to play premium notify chimes without asset dependency)
  const playNotifySound = () => {
    if (!settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Dual tone chord (warm synth bell)
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Web Audio API not allowed or supported by browser policy", e);
    }
  };

  // Auto-replies logic based on contacts
  const triggerBotResponse = (chatId, userText) => {
    if (settings.simulationSpeed === 'none') return;
    
    const delay = settings.simulationSpeed === 'fast' ? 1000 : 3000;
    
    // Set isTyping to true
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, isTyping: true } : c);
      saveToLocalStorage(updated);
      return updated;
    });

    setTimeout(() => {
      setChats(prev => {
        const chat = prev.find(c => c.id === chatId);
        if (!chat) return prev;

        let responseText = "Thanks for your input! Let's schedule a call.";
        if (chatId === 'evelyn') {
          if (userText.toLowerCase().includes('color') || userText.toLowerCase().includes('theme')) {
            responseText = "Exactly! The high-contrast palette (#FCC105 on #000000) provides outstanding readability and fits the premium look we wanted.";
          } else {
            responseText = "I agree. Let's make sure the scrollbars and interactive states feel smooth on the dashboard view.";
          }
        } else if (chatId === 'marcus') {
          responseText = "Great! The build compiler is fully configured now. Vite HMR is running smoothly.";
        } else if (chatId === 'sienna') {
          responseText = "Wonderful! I'm preparing the press releases and layout mockups now. ChatMe branding is looking sharp.";
        } else if (chatId === 'liam') {
          responseText = `Hello! You said: "${userText}". As an AI agent, I recommend deploying this React build directly onto the server for immediate verification!`;
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newMsg = {
          id: `botmsg_${Date.now()}`,
          sender: chatId,
          text: responseText,
          time: timeStr,
          status: 'read'
        };

        const updated = prev.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              isTyping: false,
              unreadCount: chat.id === activeChatIdRef.current ? 0 : c.unreadCount + 1,
              messages: [...c.messages, newMsg]
            };
          }
          return c;
        });

        triggerNotification(chat.name, responseText, chat.avatarUrl, chatId);
        playNotifySound();
        saveToLocalStorage(updated);
        return updated;
      });
    }, delay);
  };

  const handleSendMessage = (text, type = 'text', extra = {}) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clientMsgId = `usrmsg_${Date.now()}`;

    const newMsg = {
      id: clientMsgId,
      sender: 'user',
      text,
      time: timeStr,
      status: 'sent',
      type,
      ...extra
    };

    const updatedChats = chats.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    });

    setChats(updatedChats);
    saveToLocalStorage(updatedChats);

    const botIds = ['liam', 'sienna', 'marcus', 'evelyn'];
    const isBot = botIds.includes(activeChatId);

    if (isBot) {
      triggerBotResponse(activeChatId, text);
    } else if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const sendPayload = {
        type: 'direct_message',
        clientMsgId,
        to: activeChatId,
        text,
        time: timeStr,
        msgType: type,
        mediaUrl: extra.mediaUrl,
        size: extra.size,
        duration: extra.duration,
        waveform: extra.waveform
      };
      socketRef.current.send(JSON.stringify(sendPayload));
    }
  };

  const handleSendMedia = (mediaObj) => {
    handleSendMessage(mediaObj.text, mediaObj.type, mediaObj);
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c);
      saveToLocalStorage(updated);
      return updated;
    });

    // Send read receipts to the peer: tell them we've read their messages
    const botIds = ['liam', 'sienna', 'marcus', 'evelyn'];
    if (!botIds.includes(chatId) && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message_read',
        from: chatId   // we are reading messages FROM this user
      }));
    }
  };

  const handleNewChat = () => {
    const names = ['Aria Miller', 'Dexter Payne', 'Cleo Sterling', 'Leo Martinez'];
    const roles = ['Product Manager', 'UX Designer', 'Growth Lead', 'Frontend Engineer'];
    const seeds = ['aria', 'dexter', 'cleo', 'leo'];
    
    const randomIdx = Math.floor(Math.random() * names.length);
    const id = `new_${Date.now()}`;
    
    const newChatObj = {
      id,
      name: names[randomIdx],
      role: roles[randomIdx],
      avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seeds[randomIdx]}`,
      isOnline: Math.random() > 0.3,
      unreadCount: 0,
      isTyping: false,
      messages: [
        { 
          id: `new_first_${Date.now()}`, 
          sender: id, 
          text: `Hey! I just joined ChatMe. I work as a ${roles[randomIdx]} and look forward to collaborating!`, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          status: 'read' 
        }
      ]
    };

    const updated = [newChatObj, ...chats];
    setChats(updated);
    setActiveChatId(id);
    saveToLocalStorage(updated);
  };

  const handleClearChat = () => {
    const updated = chats.map(c => c.id === activeChatId ? { ...c, messages: [] } : c);
    setChats(updated);
    saveToLocalStorage(updated);
  };

  const handleResetAllData = () => {
    localStorage.removeItem('chatme_user');
    localStorage.removeItem('chatme_chats');
    localStorage.removeItem('chatme_settings');
    setChats(initialChats);
    setActiveChatId('evelyn');
    setSettings({
      simulationSpeed: 'fast',
      soundEnabled: true,
      notificationsEnabled: false
    });
    setCurrentUser({
      name: 'Developer Agent',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
      isOnline: true
    });
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!currentUser.name.trim()) return;
    setIsLoggedIn(true);
    localStorage.setItem('chatme_loggedin', 'true');
    saveToLocalStorage(chats, currentUser, settings);
    playNotifySound();
  };

  // Render Splash Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 select-none">
        
        {/* Splash Card */}
        <div className="w-full max-w-md bg-[#000000] border border-[#2B2B2B] rounded-2xl p-8 relative overflow-hidden shadow-2xl">
          {/* Subtle brand border indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#FCC105]" />
          
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="/chatmeappicon.png" alt="ChatMe" className="w-16 h-16 object-contain" />
            </div>
            
            <h1 className="text-3xl font-display font-black text-[#FFFFFF] mt-5 tracking-tight">
              CHAT<span className="text-[#FCC105]">ME</span>
            </h1>
            <p className="text-sm text-[#8A8A8A] mt-1.5 max-w-[280px]">
              Secure Premium Messaging Application
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="mt-8 space-y-5">
            {/* Name Input */}
            <div className="space-y-2">
              <label htmlFor="login-name" className="text-xs font-semibold text-[#FFFFFF] block">
                Enter Username / Profile Name
              </label>
              <input
                id="login-name"
                type="text"
                value={currentUser.name}
                onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                placeholder="Developer"
                required
                className="w-full bg-[#111111] border border-[#2B2B2B] text-[#FFFFFF] placeholder-[#8A8A8A] px-4 py-3.5 rounded-xl text-sm focus:outline-none focus:border-[#FCC105] focus:ring-1 focus:ring-[#FCC105] transition-all"
              />
            </div>

            {/* Avatar Select inside login */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#FFFFFF] block">
                Select Identity Avatar
              </span>
              <div className="flex justify-between items-center bg-[#1A1A1A] p-3 rounded-xl border border-[#2B2B2B]">
                {[
                  'https://api.dicebear.com/7.x/bottts/svg?seed=user',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar1',
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar2'
                ].map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentUser({ ...currentUser, avatarUrl: url })}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 cursor-pointer ${
                      currentUser.avatarUrl === url ? 'border-[#FCC105]' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="option" className="w-full h-full bg-[#111111]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#FCC105] text-[#000000] font-bold text-sm hover:bg-[#FFD34D] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-lg shadow-[#FCC105]/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              Connect to ChatMe
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Core App Tech Pillars */}
          <div className="mt-8 pt-6 border-t border-[#2B2B2B]/60 flex items-center justify-around text-[10px] text-[#8A8A8A]">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#FCC105]" />
              <span>TLS Enforced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-[#FCC105]" />
              <span>Vite Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FCC105]" />
              <span>Tailwind v4</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Chats Workspace
  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-screen bg-[#000000] text-[#FFFFFF] overflow-hidden font-sans">
      
      {/* 1. Left Vertical Nav Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
      />

      {/* 2. Main Tab View Panels */}
      {activeTab === 'chats' && (
        <>
          {/* On mobile, if a chat is active, we hide the ChatList. Otherwise we show it. */}
          {(!isMobile || !activeChatId) && (
            <ChatList 
              chats={chats} 
              activeChatId={activeChatId} 
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              currentUser={currentUser}
            />
          )}
          {/* On mobile, if a chat is active, we show the ChatWindow. Otherwise we hide it. On desktop we show it always. */}
          {(!isMobile || activeChatId) && (
            <ChatWindow 
              chat={activeChat} 
              onSendMessage={handleSendMessage}
              onSendMedia={handleSendMedia}
              onClearChat={handleClearChat}
              onBack={() => setActiveChatId(null)}
              isMobile={isMobile}
              onStartCall={startCall}
            />
          )}
        </>
      )}

      {activeTab === 'contacts' && (
        <div className="flex-1 bg-[#000000] p-6 pb-24 md:pb-6 overflow-y-auto select-none">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-[#FCC105]" />
                Contacts Directory
              </h1>
              <p className="text-sm text-[#8A8A8A] mt-1">
                View all team members currently configured inside this sandbox workspace.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chats.map(contact => (
                <div 
                  key={contact.id}
                  className="bg-[#111111] border border-[#2B2B2B] rounded-2xl p-4 flex items-center justify-between hover:border-[#FCC105]/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-[#2B2B2B]">
                        <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                      </div>
                      {contact.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-[#111111] rounded-full" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{contact.name}</h3>
                      <p className="text-xs text-[#8A8A8A] mt-0.5">{contact.role}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      handleSelectChat(contact.id);
                      setActiveTab('chats');
                    }}
                    className="py-1.5 px-3.5 rounded-lg bg-[#FCC105] text-[#000000] text-xs font-bold hover:bg-[#FFD34D] transition-colors cursor-pointer"
                  >
                    Chat
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'discover' && (
        <div className="flex-1 bg-[#000000] p-6 pb-24 md:pb-6 overflow-y-auto select-none">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#FCC105]" />
                Public Channels
              </h1>
              <p className="text-sm text-[#8A8A8A] mt-1">
                Explore channels and public group discussions across the organization.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { name: '#general-announcements', desc: 'Company-wide updates and launch information', count: '14 active members' },
                { name: '#vite4-migration-specs', desc: 'Discussions related to compiler speeds, configurations and HMR', count: '4 active members' },
                { name: '#design-high-contrast', desc: 'Branding discussions on yellow accents, shadows and custom layouts', count: '6 active members' }
              ].map((room, idx) => (
                <div 
                  key={idx}
                  className="bg-[#111111] border border-[#2B2B2B] rounded-2xl p-5 flex items-center justify-between hover:border-[#FCC105]/40 transition-all duration-300"
                >
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{room.name}</h3>
                    <p className="text-xs text-[#8A8A8A] mt-1">{room.desc}</p>
                    <span className="text-[10px] text-[#FCC105] font-semibold block mt-2">{room.count}</span>
                  </div>
                  <button 
                    onClick={() => {
                      alert("Connecting to this public workspace channel... This simulated feature is in development!");
                    }}
                    className="py-2 px-4 rounded-xl border border-[#FCC105] text-[#FCC105] text-xs font-semibold hover:bg-[rgba(252,193,5,0.12)] transition-colors cursor-pointer shrink-0"
                  >
                    Join Channel
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="flex-1 bg-[#000000] p-6 pb-24 md:pb-6 overflow-y-auto select-none">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-[#FCC105]" />
                System Alerts
              </h1>
              <p className="text-sm text-[#8A8A8A] mt-1">
                Security notifications, logins, and connection logs.
              </p>
            </div>

            {('Notification' in window) && notificationPermission !== 'granted' && (
              <div className="bg-[#111111] border border-[#FCC105]/30 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex gap-3">
                  <Bell className="w-6 h-6 text-[#FCC105] shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Enable Device Notifications</h3>
                    <p className="text-xs text-[#8A8A8A] mt-1">
                      {notificationPermission === 'denied' 
                        ? 'Notifications are blocked by your browser. Please enable them in browser settings to receive chat alerts.' 
                        : 'Get real-time notification alerts on your device when you receive new direct messages.'}
                    </p>
                  </div>
                </div>
                {notificationPermission !== 'denied' && (
                  <button 
                    onClick={requestNotificationPermissionDirectly}
                    className="py-2 px-4 rounded-xl bg-[#FCC105] text-[#000000] text-xs font-bold hover:bg-[#FFD34D] transition-all cursor-pointer shrink-0"
                  >
                    Allow Alerts
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              {(() => {
                const systemAlerts = [];
                if (notificationPermission === 'granted' && settings.notificationsEnabled) {
                  systemAlerts.push({
                    title: 'Device Notifications Active',
                    time: 'Active',
                    desc: 'Real-time desktop alerts are fully configured and running.'
                  });
                }
                systemAlerts.push(
                  { title: 'Secure connection established', time: 'Just now', desc: 'End-to-end sandbox tunnel encrypted successfully.' },
                  { title: 'New chat simulated', time: '1 hour ago', desc: 'Liam Kincaid AI Assistant initialized for workspace debugging.' },
                  { title: 'Local database initialized', time: '3 hours ago', desc: 'Successfully created browser localstorage caching layers.' }
                );
                return systemAlerts.map((alert, idx) => (
                  <div key={idx} className="bg-[#111111] border border-[#2B2B2B] rounded-xl p-4 flex gap-3.5">
                    <div className="w-2.5 h-2.5 bg-[#FCC105] rounded-full mt-1.5 shrink-0 animate-ping" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-white">{alert.title}</h3>
                        <span className="text-[9px] text-[#8A8A8A] bg-[#1A1A1A] px-1.5 py-0.5 rounded border border-[#2B2B2B]">{alert.time}</span>
                      </div>
                      <p className="text-xs text-[#8A8A8A] mt-1">{alert.desc}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {(!isMobile || !activeChatId || activeTab !== 'chats') && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0A0A0A] border-t border-[#2B2B2B] flex items-center justify-around z-20 px-2 select-none">
          {/* Chats Tab */}
          <button
            onClick={() => {
              setActiveTab('chats');
              setActiveChatId(null);
            }}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'chats' ? 'text-[#FCC105]' : 'text-[#8A8A8A]'
            }`}
          >
            <MessageSquare className="w-5.5 h-5.5" />
            <span className="text-[9px] font-medium mt-1">Chats</span>
          </button>

          {/* Contacts Tab */}
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'contacts' ? 'text-[#FCC105]' : 'text-[#8A8A8A]'
            }`}
          >
            <Users className="w-5.5 h-5.5" />
            <span className="text-[9px] font-medium mt-1">Contacts</span>
          </button>

          {/* Discover Tab */}
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'discover' ? 'text-[#FCC105]' : 'text-[#8A8A8A]'
            }`}
          >
            <Compass className="w-5.5 h-5.5" />
            <span className="text-[9px] font-medium mt-1">Discover</span>
          </button>

          {/* Alerts Tab */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'notifications' ? 'text-[#FCC105]' : 'text-[#8A8A8A]'
            }`}
          >
            <Bell className="w-5.5 h-5.5" />
            <span className="text-[9px] font-medium mt-1">Alerts</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer text-[#8A8A8A]"
          >
            <Settings className="w-5.5 h-5.5" />
            <span className="text-[9px] font-medium mt-1">Settings</span>
          </button>
        </div>
      )}

      {/* 3. Modal Settings Drawer Overlay */}
      <ProfileSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('chatme_user', JSON.stringify(updatedUser));
        }}
        settings={settings}
        onUpdateSettings={(updatedSettings) => {
          setSettings(updatedSettings);
          localStorage.setItem('chatme_settings', JSON.stringify(updatedSettings));
        }}
        onResetAllData={handleResetAllData}
      />

      {/* Call Overlay View */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none animate-fade-in">
          <audio ref={remoteAudioRef} autoPlay />
          <div className="w-full max-w-md bg-[#000000] border border-[#2B2B2B] rounded-3xl p-8 flex flex-col items-center justify-between min-h-[500px] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FCC105]" />
            
            {/* Call Header / Info */}
            <div className="w-full flex flex-col items-center mt-4">
              <span className="text-[10px] text-[#FCC105] tracking-widest font-extrabold uppercase bg-[#FCC105]/10 px-3 py-1 rounded-full border border-[#FCC105]/20">
                {activeCall.type === 'video' ? 'Secure Video Session' : 'Secure Voice Session'}
              </span>
              
              <h2 className="text-2xl font-display font-black text-white mt-6 tracking-tight">
                {activeCall.chat.name}
              </h2>
              
              <div className="text-xs text-[#8A8A8A] mt-2 font-medium">
                {activeCall.status === 'ringing' ? (
                  activeCall.direction === 'incoming' ? 'Incoming call...' : 'Ringing...'
                ) : (
                  <span className="flex items-center gap-2 text-[#FCC105] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#FCC105] animate-ping" />
                    {formatCallDuration(activeCall.duration)}
                  </span>
                )}
              </div>
            </div>

            {/* Video stream container / Pulsing Ring */}
            <div className="relative w-full flex-1 flex items-center justify-center my-6 min-h-[220px]">
              {activeCall.type === 'video' && activeCall.status === 'connected' ? (
                <div className="relative w-full h-[240px] rounded-2xl border border-[#2B2B2B] bg-[#111111] overflow-hidden">
                  {/* Real Remote Video Stream */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Fallback avatar shown when remote video stream isn't yet active */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] pointer-events-none"
                    style={{ opacity: remoteVideoRef.current?.srcObject ? 0 : 1, transition: 'opacity 0.4s' }}>
                    <img src={activeCall.chat.avatarUrl} alt="Remote" className="w-20 h-20 rounded-full border border-[#2B2B2B]" />
                    <span className="text-xs text-[#8A8A8A] mt-3 font-semibold">Connecting stream...</span>
                  </div>
                  
                  {/* Local video PIP */}
                  {!activeCall.isVideoOff && (
                    <div className="absolute bottom-3 right-3 w-24 h-32 rounded-xl overflow-hidden border border-[#FCC105] shadow-2xl bg-black">
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Waveform / Ringing state layout */
                <div className="relative flex items-center justify-center">
                  {activeCall.status === 'ringing' && (
                    <>
                      <div className="absolute w-36 h-36 rounded-full border border-[#FCC105]/20 animate-ping duration-1000" />
                      <div className="absolute w-44 h-44 rounded-full border border-[#FCC105]/10 animate-ping duration-1000 delay-300" />
                    </>
                  )}
                  <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#FCC105] shadow-2xl relative z-10 bg-[#111111]">
                    <img 
                      src={activeCall.chat.avatarUrl} 
                      alt="avatar" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
              )}
            </div>


            {/* Bottom Controls */}
            <div className="w-full flex justify-center items-center gap-6 mt-4">
              {activeCall.status === 'ringing' && activeCall.direction === 'incoming' ? (
                /* Accept / Decline triggers */
                <>
                  <button
                    onClick={declineCall}
                    className="w-14 h-14 rounded-full bg-[#EF4444] text-white flex items-center justify-center hover:scale-105 hover:bg-[#F87171] transition-all cursor-pointer shadow-lg shadow-[#EF4444]/20"
                    title="Decline"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  <button
                    onClick={acceptCall}
                    className="w-14 h-14 rounded-full bg-[#22C55E] text-white flex items-center justify-center hover:scale-105 hover:bg-[#4ADE80] transition-all cursor-pointer shadow-lg shadow-[#22C55E]/20"
                    title="Accept"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                </>
              ) : (
                /* Active controls */
                <>
                  {/* Mute toggle */}
                  <button
                    onClick={() => {
                      const updatedMuted = !activeCall.isMuted;
                      setActiveCall(prev => ({ ...prev, isMuted: updatedMuted }));
                      if (localStreamRef.current) {
                        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !updatedMuted);
                      }
                    }}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center hover:scale-105 transition-all cursor-pointer ${
                      activeCall.isMuted 
                        ? 'bg-[#FCC105] border-[#FCC105] text-[#000000]' 
                        : 'border-[#2B2B2B] text-[#8A8A8A] hover:text-white hover:bg-[#111111]'
                    }`}
                    title={activeCall.isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {activeCall.isMuted ? <Mic className="w-5 h-5 text-black" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* End call */}
                  <button
                    onClick={endCall}
                    className="w-14 h-14 rounded-full bg-[#EF4444] text-white flex items-center justify-center hover:scale-105 hover:bg-[#F87171] transition-all cursor-pointer shadow-lg shadow-[#EF4444]/20"
                    title="End Call"
                  >
                    <Phone className="w-6 h-6 rotate-[135deg]" />
                  </button>

                  {/* Camera toggle (video calls only) */}
                  {activeCall.type === 'video' ? (
                    <button
                      onClick={() => {
                        const updatedVideoOff = !activeCall.isVideoOff;
                        setActiveCall(prev => ({ ...prev, isVideoOff: updatedVideoOff }));
                        if (localStreamRef.current) {
                          localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !updatedVideoOff);
                        }
                      }}
                      className={`w-12 h-12 rounded-full border flex items-center justify-center hover:scale-105 transition-all cursor-pointer ${
                        activeCall.isVideoOff 
                          ? 'bg-[#FCC105] border-[#FCC105] text-[#000000]' 
                          : 'border-[#2B2B2B] text-[#8A8A8A] hover:text-white hover:bg-[#111111]'
                      }`}
                      title={activeCall.isVideoOff ? "Turn Video On" : "Turn Video Off"}
                    >
                      {activeCall.isVideoOff ? <Video className="w-5 h-5 text-black" /> : <Video className="w-5 h-5" />}
                    </button>
                  ) : (
                    /* Dummy button to keep balance */
                    <div className="w-12 h-12" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
