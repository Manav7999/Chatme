import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import ChannelWindow from './components/ChannelWindow';
import ProfileSettings from './components/ProfileSettings';
import {
  generateKeyPair, exportPublicKey, importPublicKey,
  deriveSharedKey, encryptMessage, decryptMessage,
  storeSharedKey, getSharedKey, hasSharedKey,
  exportPrivateKey, importPrivateKey, exportSharedKey, importSharedKey
} from './crypto.js';
import { 
  Sparkles, Users, MessageSquare, Compass, Bell, Check, Hash,
  ArrowRight, ShieldCheck, HelpCircle, Laptop, Settings, Lock,
  X, Mic, Phone, Video
} from 'lucide-react';

// Default Scaffold Data
const initialChats = [];

// Default channel definitions (synced with server)
const DEFAULT_CHANNEL_DEFS = [
  { id: 'general', name: '#general', description: 'Company-wide announcements and updates', memberCount: 0, messages: [] },
  { id: 'design', name: '#design', description: 'UI/UX branding and high-contrast design', memberCount: 0, messages: [] },
  { id: 'engineering', name: '#engineering', description: 'Vite, React, WebRTC and code discussions', memberCount: 0, messages: [] },
  { id: 'random', name: '#random', description: 'Off-topic fun and casual conversation', memberCount: 0, messages: [] }
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(() => {
    return typeof window !== 'undefined' && !!localStorage.getItem('chatme_jwt');
  });
  const socketRef = useRef(null);

  // E2EE: our key pair for this session
  const myKeyPairRef = useRef(null);     // { publicKey, privateKey }
  const [myPublicKeyB64, setMyPublicKeyB64] = useState(''); // base64 export of our public key

  const [currentUser, setCurrentUser] = useState({
    name: 'Developer Agent',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
    isOnline: true
  });
  const [chats, setChats] = useState(initialChats);

  // Auth state
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  
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
  
  // Channels state
  const [channelList, setChannelList] = useState(DEFAULT_CHANNEL_DEFS);
  const [joinedChannels, setJoinedChannels] = useState(new Set()); // channel IDs
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  
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
  const remoteStreamRef = useRef(null);
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
      remoteStreamRef.current = event.streams[0];
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
    remoteStreamRef.current = null;
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
    if (activeCall.direction === 'outgoing') {
      logCallMessage(activeCall.chat.id, activeCall.type, 'missed', 0);
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
    if (activeCall.direction === 'outgoing') {
      logCallMessage(activeCall.chat.id, activeCall.type, 'completed', activeCall.duration);
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
    
    const isPageHidden = document.visibilityState === 'hidden';
    const isDifferentChat = activeChatIdRef.current !== senderId || activeTabRef.current !== 'chats';
    
    if (isPageHidden || isDifferentChat) {
      try {
        // Prefer SW notification (works in background, mobile, etc.)
        if (swRegistrationRef.current) {
          swRegistrationRef.current.showNotification(senderName, {
            body: text.length > 80 ? text.slice(0, 80) + '…' : text,
            icon: avatarUrl || '/chatmeappicon.png',
            badge: '/favicon.svg',
            tag: senderId,
            renotify: true,
            vibrate: [200, 100, 200],
            data: { senderId }
          });
        } else {
          // Fallback to standard Notification API
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
        }
      } catch (e) {
        console.warn('Failed to send desktop notification:', e);
      }
    }
  };


  // Generate or load E2EE key pair and restore derived keys on mount
  useEffect(() => {
    const initE2EE = async () => {
      try {
        const storedPubB64 = localStorage.getItem('chatme_ecdh_public_b64');
        const storedPrivJwk = localStorage.getItem('chatme_ecdh_private_jwk');

        if (storedPubB64 && storedPrivJwk) {
          console.log('Loading existing E2EE keys from localStorage...');
          const pubKey = await importPublicKey(storedPubB64);
          const privKey = await importPrivateKey(storedPrivJwk);
          myKeyPairRef.current = { publicKey: pubKey, privateKey: privKey };
          setMyPublicKeyB64(storedPubB64);
          console.log('E2EE keys loaded successfully.');
        } else {
          console.log('Generating fresh E2EE key pair...');
          const kp = await generateKeyPair();
          myKeyPairRef.current = kp;
          
          const pubB64 = await exportPublicKey(kp.publicKey);
          const privJwk = await exportPrivateKey(kp.privateKey);
          
          localStorage.setItem('chatme_ecdh_public_b64', pubB64);
          localStorage.setItem('chatme_ecdh_private_jwk', privJwk);
          
          setMyPublicKeyB64(pubB64);
          console.log('Fresh E2EE key pair generated and persisted.');
        }

        // Restore derived shared keys from localStorage
        const keysToLoad = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('chatme_shared_key_')) {
            const peerId = key.replace('chatme_shared_key_', '');
            const b64 = localStorage.getItem(key);
            keysToLoad.push({ peerId, b64 });
          }
        }

        await Promise.all(keysToLoad.map(async ({ peerId, b64 }) => {
          try {
            const sharedKey = await importSharedKey(b64);
            storeSharedKey(peerId, sharedKey);
          } catch (e) {
            console.warn(`Failed to import stored shared key for ${peerId}:`, e);
          }
        }));
        console.log(`Loaded ${keysToLoad.length} E2EE shared keys from localStorage.`);
      } catch (err) {
        console.warn('E2EE initialization failed, generating fallback ephemeral key...', err);
        try {
          const kp = await generateKeyPair();
          myKeyPairRef.current = kp;
          const pubB64 = await exportPublicKey(kp.publicKey);
          setMyPublicKeyB64(pubB64);
        } catch (innerErr) {
          console.warn('Fallback E2EE keygen failed:', innerErr);
        }
      }
    };

    initE2EE();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, []);

  // Service Worker registration for background push notifications
  const swRegistrationRef = useRef(null);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          swRegistrationRef.current = reg;
          console.log('ChatMe Service Worker registered:', reg.scope);
        })
        .catch(err => console.warn('SW registration failed:', err));
    }
  }, []);


  // Local Storage syncing + JWT auto-login
  useEffect(() => {
    const savedChats = localStorage.getItem('chatme_chats');
    const savedSettings = localStorage.getItem('chatme_settings');
    const savedToken = localStorage.getItem('chatme_jwt');

    if (savedChats) {
      setChats(JSON.parse(savedChats));
      setIsLoadingChats(false);
    } else {
      setIsLoadingChats(true);
    }
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    // Auto-verify JWT token
    if (savedToken) {
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.user) {
            setCurrentUser({ ...data.user, isOnline: true });
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem('chatme_jwt');
          }
        })
        .catch(() => localStorage.removeItem('chatme_jwt'))
        .finally(() => setIsVerifyingToken(false));
    }
  }, []);


  // WebSocket Connection Handler
  useEffect(() => {
    if (isLoggedIn && myPublicKeyB64) {
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
  }, [isLoggedIn, currentUser.name, currentUser.avatarUrl, myPublicKeyB64]);

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
      // Use the authenticated user ID from JWT, falling back to a stable local ID
      const userId = currentUser.id || localStorage.getItem('chatme_user_id') || `real_${currentUser.name.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 1000)}`;
      if (!currentUser.id) localStorage.setItem('chatme_user_id', userId);


      const registerPayload = {
        type: 'register',
        user: {
          id: userId,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
          publicKey: myPublicKeyB64   // E2EE public key
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

                // E2EE: derive shared key with this peer if they have a publicKey
                const storedPeerPubKey = localStorage.getItem(`chatme_peer_pubkey_${onlineUser.id}`);
                const needsDerivation = !hasSharedKey(onlineUser.id) || storedPeerPubKey !== onlineUser.publicKey;

                if (onlineUser.publicKey && myKeyPairRef.current && needsDerivation) {
                  importPublicKey(onlineUser.publicKey).then(peerPub => {
                    return deriveSharedKey(myKeyPairRef.current.privateKey, peerPub);
                  }).then(sharedKey => {
                    storeSharedKey(onlineUser.id, sharedKey);
                    localStorage.setItem(`chatme_peer_pubkey_${onlineUser.id}`, onlineUser.publicKey);
                    console.log(`E2EE key established with ${onlineUser.name}`);
                  }).catch(err => console.warn('E2EE key derivation failed:', err));
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
            setIsLoadingChats(false);
            break;


          case 'direct_message': {
            const senderId = data.sender;
            const now2 = new Date();
            const timeStr2 = now2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Decrypt if message is encrypted
            let displayText = data.text;
            if (data.encrypted && data.iv && data.ciphertext) {
              const sharedKey = getSharedKey(senderId);
              if (sharedKey) {
                try {
                  displayText = await decryptMessage(sharedKey, { iv: data.iv, ciphertext: data.ciphertext });
                } catch {
                  displayText = '🔒 [Encrypted — key mismatch]';
                }
              } else {
                displayText = '🔒 [Encrypted — no key]';
              }
            }

            const newMsg = {
              id: data.id,
              sender: senderId,
              text: displayText,
              time: data.time || timeStr2,
              status: 'read',
              type: data.msgType || 'text',
              mediaUrl: data.mediaUrl,
              size: data.size,
              duration: data.duration,
              waveform: data.waveform,
              encrypted: !!data.encrypted
            };


            setChats(prev => {
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

              triggerNotification(data.senderName, displayText, data.senderAvatar, senderId);
              playNotifySound();
              saveToLocalStorage(updated);
              return updated;
            });
            break;
          }


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
              if (activeCallRef.current.direction === 'outgoing') {
                logCallMessage(activeCallRef.current.chat.id, activeCallRef.current.type, 'declined', 0);
              }
              setActiveCall(null);
              playDisconnectTone();
            }
            break;

          case 'call_end':
            if (activeCallRef.current && activeCallRef.current.chat.id === data.from) {
              stopRingtoneLoop();
              stopLocalStream();
              closePeerConnection();
              if (activeCallRef.current.direction === 'outgoing') {
                logCallMessage(activeCallRef.current.chat.id, activeCallRef.current.type, 'completed', activeCallRef.current.duration);
              }
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

          case 'message_deleted':
            setChats(prev => {
              const updated = prev.map(chat => {
                if (chat.id === data.senderId) {
                  return {
                    ...chat,
                    messages: chat.messages.filter(msg => msg.id !== data.messageId)
                  };
                }
                return chat;
              });
              saveToLocalStorage(updated);
              return updated;
            });
            break;

          case 'channel_message_deleted':
            setChannelList(prev => prev.map(ch => {
              if (ch.id === data.channelId) {
                return {
                  ...ch,
                  messages: ch.messages.filter(msg => msg.id !== data.messageId)
                };
              }
              return ch;
            }));
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

          case 'channel_joined':
            setJoinedChannels(prev => {
              const next = new Set(prev);
              next.add(data.channel);
              return next;
            });
            setChannelList(prev => prev.map(ch =>
              ch.id === data.channel ? { ...ch, memberCount: data.memberCount } : ch
            ));
            break;

          case 'channel_left':
            setJoinedChannels(prev => {
              const next = new Set(prev);
              next.delete(data.channel);
              return next;
            });
            if (activeChannelId === data.channel) setActiveChannelId(null);
            break;

          case 'channel_message': {
            const now2 = new Date();
            const timeStr2 = now2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const chanMsg = {
              id: data.id || `chanmsg_${Date.now()}`,
              sender: data.sender,
              senderName: data.senderName,
              senderAvatar: data.senderAvatar,
              text: data.text,
              time: data.time || timeStr2,
              type: data.msgType || 'text',
              mediaUrl: data.mediaUrl || null,
              size: data.size || null
            };
            setChannelList(prev => prev.map(ch =>
              ch.id === data.channel
                ? { ...ch, messages: [...(ch.messages || []), chanMsg] }
                : ch
            ));
            break;
          }

          case 'channel_roster':
            setChannelList(prev => prev.map(ch =>
              ch.id === data.channel ? { ...ch, memberCount: data.memberCount } : ch
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

  const handleSendMessage = async (text, type = 'text', extra = {}) => {

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
      // Encrypt if we have a shared key with the recipient
      const sharedKey = getSharedKey(activeChatId);
      let sendPayload;
      if (sharedKey && type === 'text') {
        try {
          const { iv, ciphertext } = await encryptMessage(sharedKey, text);
          sendPayload = {
            type: 'direct_message',
            clientMsgId,
            to: activeChatId,
            text: '🔒 Encrypted',    // placeholder visible in transit
            iv,
            ciphertext,
            time: timeStr,
            msgType: type,
            encrypted: true
          };
        } catch {
          sendPayload = { type: 'direct_message', clientMsgId, to: activeChatId, text, time: timeStr, msgType: type, mediaUrl: extra.mediaUrl, size: extra.size, duration: extra.duration, waveform: extra.waveform };
        }
      } else {
        sendPayload = {
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
      }
      socketRef.current.send(JSON.stringify(sendPayload));
    }

  };

  const logCallMessage = (peerId, callType, callStatus, durationSeconds) => {
    let callDuration = 'No answer';
    if (callStatus === 'completed') {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      callDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (callStatus === 'declined') {
      callDuration = 'Declined';
    }

    handleSendMessage(
      callType === 'video' ? 'Video call' : 'Voice call',
      'call_history',
      {
        callType,
        callStatus, // 'completed' | 'missed' | 'declined'
        callDuration
      }
    );
  };

  const handleSendMedia = (mediaObj) => {
    const targetChatId = activeChatId;
    if (!targetChatId) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clientMsgId = `usrmsg_${Date.now()}`;

    const uploadMsg = {
      id: clientMsgId,
      sender: 'user',
      text: mediaObj.text,
      time: timeStr,
      status: 'uploading',
      progress: 0,
      type: mediaObj.type,
      mediaUrl: mediaObj.mediaUrl,
      size: mediaObj.size
    };

    setChats(prev => {
      const updated = prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages, uploadMsg] };
        }
        return c;
      });
      saveToLocalStorage(updated);
      return updated;
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        setChats(prev => {
          const updated = prev.map(c => {
            if (c.id === targetChatId) {
              return {
                ...c,
                messages: c.messages.map(m => m.id === clientMsgId ? { ...m, status: 'sent', progress: 100 } : m)
              };
            }
            return c;
          });
          saveToLocalStorage(updated);
          return updated;
        });

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          const sendPayload = {
            type: 'direct_message',
            clientMsgId,
            to: targetChatId,
            text: mediaObj.text,
            time: timeStr,
            msgType: mediaObj.type,
            mediaUrl: mediaObj.mediaUrl,
            size: mediaObj.size
          };
          socketRef.current.send(JSON.stringify(sendPayload));
        }
      } else {
        setChats(prev => prev.map(c => {
          if (c.id === targetChatId) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === clientMsgId ? { ...m, progress } : m)
            };
          }
          return c;
        }));
      }
    }, 150);
  };

  const joinChannel = (channelId) => {
    if (joinedChannels.has(channelId)) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'join_channel', channel: channelId }));
    }
    setActiveChannelId(channelId);
  };

  const leaveChannel = (channelId) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'leave_channel', channel: channelId }));
    }
    setJoinedChannels(prev => { const n = new Set(prev); n.delete(channelId); return n; });
    if (activeChannelId === channelId) setActiveChannelId(null);
  };

  const handleChannelMessage = (channelId, text, type = 'text', extra = {}) => {
    if (!joinedChannels.has(channelId)) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localMsg = {
      id: `chanlocal_${Date.now()}`,
      sender: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      text,
      time: timeStr,
      type,
      mediaUrl: extra.mediaUrl || null,
      size: extra.size || null
    };
    // Optimistic local add
    setChannelList(prev => prev.map(ch =>
      ch.id === channelId
        ? { ...ch, messages: [...(ch.messages || []), localMsg] }
        : ch
    ));
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'channel_message',
        channel: channelId,
        text,
        time: timeStr,
        msgType: type,
        mediaUrl: extra.mediaUrl || null,
        size: extra.size || null
      }));
    }
  };

  const handleChannelSendMedia = (channelId, mediaObj) => {
    const targetChannelId = channelId;
    if (!joinedChannels.has(targetChannelId)) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clientMsgId = `chanlocal_${Date.now()}`;

    const uploadMsg = {
      id: clientMsgId,
      sender: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      text: mediaObj.text,
      time: timeStr,
      status: 'uploading',
      progress: 0,
      type: mediaObj.type,
      mediaUrl: mediaObj.mediaUrl,
      size: mediaObj.size
    };

    setChannelList(prev => prev.map(ch =>
      ch.id === targetChannelId
        ? { ...ch, messages: [...(ch.messages || []), uploadMsg] }
        : ch
    ));

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        setChannelList(prev => prev.map(ch => {
          if (ch.id === targetChannelId) {
            return {
              ...ch,
              messages: ch.messages.map(m => m.id === clientMsgId ? { ...m, status: 'sent', progress: 100 } : m)
            };
          }
          return ch;
        }));

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'channel_message',
            channel: targetChannelId,
            text: mediaObj.text,
            time: timeStr,
            msgType: mediaObj.type,
            mediaUrl: mediaObj.mediaUrl,
            size: mediaObj.size
          }));
        }
      } else {
        setChannelList(prev => prev.map(ch => {
          if (ch.id === targetChannelId) {
            return {
              ...ch,
              messages: ch.messages.map(m => m.id === clientMsgId ? { ...m, progress } : m)
            };
          }
          return ch;
        }));
      }
    }, 150);
  };


  const handleSelectChat = async (chatId) => {
    setActiveChatId(chatId);
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c);
      saveToLocalStorage(updated);
      return updated;
    });

    // Send read receipts to the peer
    const botIds = ['liam', 'sienna', 'marcus', 'evelyn'];
    if (!botIds.includes(chatId) && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message_read',
        from: chatId
      }));
    }

    // Fetch persistent message history from server for real users
    if (!botIds.includes(chatId) && currentUser.id) {
      const token = localStorage.getItem('chatme_jwt');
      if (!token) return;
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/messages/${currentUser.id}/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const history = await res.json();
        if (!Array.isArray(history) || history.length === 0) return;

        const chatObj = chats.find(c => c.id === chatId);
        const chatName = chatObj ? chatObj.name : 'Peer';
        const existingIds = new Set(chatObj?.messages.map(m => m.id) || []);

        const newMsgsPromises = history
          .filter(m => !existingIds.has(m.id))
          .map(async (m) => {
            let displayText = m.text;
            if (m.encrypted && m.iv && m.ciphertext) {
              const sharedKey = getSharedKey(chatId);
              if (sharedKey) {
                try {
                  displayText = await decryptMessage(sharedKey, { iv: m.iv, ciphertext: m.ciphertext });
                } catch {
                  displayText = '🔒 [Encrypted — key mismatch]';
                }
              } else {
                displayText = '🔒 [Encrypted — no key]';
              }
            }

            return {
              id: m.id,
              sender: m.sender === currentUser.id ? 'user' : m.sender,
              senderName: m.sender === currentUser.id ? currentUser.name : chatName,
              text: displayText,
              time: m.time,
              status: 'read',
              type: m.msgType || 'text',
              mediaUrl: m.mediaUrl,
              size: m.size || null,
              encrypted: !!m.encrypted,
              iv: m.iv || null,
              ciphertext: m.ciphertext || null
            };
          });

        const newMsgs = await Promise.all(newMsgsPromises);
        if (newMsgs.length === 0) return;

        setChats(prev => prev.map(c => {
          if (c.id !== chatId) return c;
          return { ...c, messages: [...newMsgs, ...c.messages.filter(m => !newMsgs.find(n => n.id === m.id))] };
        }));
      } catch (e) {
        console.warn('Could not fetch message history:', e);
      } finally {
        setIsLoadingHistory(false);
      }
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

  const handleDeleteChat = async (chatId) => {
    const updated = chats.filter(c => c.id !== chatId);
    setChats(updated);
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
    saveToLocalStorage(updated);

    const botIds = ['liam', 'sienna', 'marcus', 'evelyn'];
    if (!botIds.includes(chatId) && currentUser.id) {
      const token = localStorage.getItem('chatme_jwt');
      if (token) {
        try {
          await fetch(`/api/messages/${currentUser.id}/${chatId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn('Failed to delete messages on server:', e);
        }
      }
    }
  };

  const handleDeleteMessage = (messageId, isChannel) => {
    if (isChannel) {
      setChannelList(prev => prev.map(ch => {
        if (ch.id === activeChannelId) {
          return {
            ...ch,
            messages: (ch.messages || []).filter(m => m.id !== messageId)
          };
        }
        return ch;
      }));

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'delete_channel_message',
          messageId,
          channelId: activeChannelId
        }));
      }
    } else {
      const updated = chats.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: c.messages.filter(m => m.id !== messageId)
          };
        }
        return c;
      });
      setChats(updated);
      saveToLocalStorage(updated);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'delete_message',
          messageId,
          peerId: activeChatId
        }));
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chatme_jwt');
    localStorage.removeItem('chatme_chats');
    localStorage.removeItem('chatme_user');
    if (socketRef.current) socketRef.current.close();
    setIsLoggedIn(false);
    setChats(initialChats);
    setCurrentUser({ name: 'Developer Agent', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=user', isOnline: true });
    setAuthPassword('');
    setAuthError('');
  };

  const handleResetAllData = () => {
    localStorage.removeItem('chatme_user');
    localStorage.removeItem('chatme_chats');
    localStorage.removeItem('chatme_settings');
    localStorage.removeItem('chatme_jwt');
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


  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser.name.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all fields');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register'
        ? { username: currentUser.name.trim(), password: authPassword, avatarUrl: currentUser.avatarUrl }
        : { username: currentUser.name.trim(), password: authPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Something went wrong');
        setAuthLoading(false);
        return;
      }

      // Save JWT and user data
      localStorage.setItem('chatme_jwt', data.token);
      const updatedUser = { ...data.user, isOnline: true };
      setCurrentUser(updatedUser);
      saveToLocalStorage(chats, updatedUser, settings);
      setIsLoggedIn(true);
      playNotifySound();
    } catch {
      setAuthError('Network error — is the server running?');
    } finally {
      setAuthLoading(false);
    }
  };

  // Render Splash Loading Screen
  if (isVerifyingToken) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center">
            <img src="/chatmeappicon.png" alt="ChatMe" className="w-16 h-16 object-contain animate-pulse" />
          </div>
          <h1 className="text-3xl font-display font-black text-[#FFFFFF] mt-5 tracking-tight animate-pulse">
            CHAT<span className="text-[#FCC105]">ME</span>
          </h1>
          <div className="mt-4 flex items-center gap-2 text-xs text-[#8A8A8A] font-medium tracking-wider uppercase">
            <span className="w-1.5 h-1.5 bg-[#FCC105] rounded-full animate-ping" />
            Connecting Securely...
          </div>
        </div>
      </div>
    );
  }

  // Render Splash Login/Register Screen
  if (!isLoggedIn) {
    const avatarOptions = [
      'https://api.dicebear.com/7.x/bottts/svg?seed=user',
      'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar1',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar2',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=pixel5',
      'https://api.dicebear.com/7.x/bottts/svg?seed=robby'
    ];
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 select-none">
        {/* Splash Card */}
        <div className="w-full max-w-md bg-[#000000] border border-[#2B2B2B] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#FCC105]" />
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="/chatmeappicon.png" alt="ChatMe" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-display font-black text-[#FFFFFF] mt-5 tracking-tight">
              CHAT<span className="text-[#FCC105]">ME</span>
            </h1>
            <p className="text-sm text-[#8A8A8A] mt-1.5 max-w-[280px]">
              {authMode === 'register' ? 'Create your secure account' : 'Sign in to your account'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex mt-8 bg-[#111111] border border-[#2B2B2B] rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authMode === 'login' ? 'bg-[#FCC105] text-[#000000]' : 'text-[#8A8A8A] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authMode === 'register' ? 'bg-[#FCC105] text-[#000000]' : 'text-[#8A8A8A] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label htmlFor="login-name" className="text-xs font-semibold text-[#FFFFFF] block">
                Username
              </label>
              <input
                id="login-name"
                type="text"
                value={currentUser.name === 'Developer Agent' ? '' : currentUser.name}
                onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full bg-[#111111] border border-[#2B2B2B] text-[#FFFFFF] placeholder-[#8A8A8A] px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#FCC105] focus:ring-1 focus:ring-[#FCC105] transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-[#FFFFFF] block">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={authMode === 'register' ? 'Create a strong password' : 'Enter your password'}
                required
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                className="w-full bg-[#111111] border border-[#2B2B2B] text-[#FFFFFF] placeholder-[#8A8A8A] px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#FCC105] focus:ring-1 focus:ring-[#FCC105] transition-all"
              />
            </div>

            {/* Avatar Selection (only for registration) */}
            {authMode === 'register' && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#FFFFFF] block">Choose Avatar</span>
                <div className="flex flex-wrap gap-2 justify-center items-center bg-[#1A1A1A] p-2.5 rounded-xl border border-[#2B2B2B]">
                  {avatarOptions.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentUser({ ...currentUser, avatarUrl: url })}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all hover:scale-110 cursor-pointer ${
                        currentUser.avatarUrl === url ? 'border-[#FCC105] scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="avatar option" className="w-full h-full bg-[#111111]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {authError && (
              <div className="text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-2 rounded-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full shrink-0" />
                {authError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-xl bg-[#FCC105] text-[#000000] font-bold text-sm hover:bg-[#FFD34D] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-lg shadow-[#FCC105]/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? (
                <span className="w-4 h-4 border-2 border-[#000000]/30 border-t-[#000000] rounded-full animate-spin" />
              ) : (
                <>
                  {authMode === 'register' ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Core App Tech Pillars */}
          <div className="mt-6 pt-5 border-t border-[#2B2B2B]/60 flex items-center justify-around text-[10px] text-[#8A8A8A]">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#FCC105]" />
              <span>JWT Secured</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FCC105]" />
              <span>bcrypt Passwords</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-[#FCC105]" />
              <span>WebRTC P2P</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // Active Chats Workspace
  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex w-full max-w-full h-screen bg-[#000000] text-[#FFFFFF] overflow-hidden font-sans">
      
      {/* 1. Left Vertical Nav Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
      />

      {/* 2. Main Tab View Panels */}
      {activeTab === 'chats' && (
        <div className={`flex-1 flex h-full min-w-0 overflow-hidden ${isMobile && !activeChatId ? 'pb-16' : ''}`}>
          {/* On mobile, if a chat is active, we hide the ChatList. Otherwise we show it. */}
          {(!isMobile || !activeChatId) && (
            <ChatList 
              chats={chats} 
              activeChatId={activeChatId} 
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              currentUser={currentUser}
              isLoading={isLoadingChats}
              onDeleteChat={handleDeleteChat}
            />
          )}
          {/* On mobile, if a chat is active, we show the ChatWindow. Otherwise we hide it. On desktop we show it always. */}
          {(!isMobile || activeChatId) && (
            <ChatWindow 
              chat={activeChat} 
              onSendMessage={handleSendMessage}
              onSendMedia={handleSendMedia}
              onClearChat={handleClearChat}
              onDeleteChat={handleDeleteChat}
              onDeleteMessage={(msgId) => handleDeleteMessage(msgId, false)}
              onBack={() => setActiveChatId(null)}
              isMobile={isMobile}
              onStartCall={startCall}
              isEncrypted={!!activeChat && !['liam','sienna','marcus','evelyn'].includes(activeChat.id) && hasSharedKey(activeChat.id)}
              isLoadingHistory={isLoadingHistory}
            />
          )}
        </div>
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
        <div className={`flex-1 flex h-full min-w-0 overflow-hidden ${isMobile && !activeChannelId ? 'pb-16' : ''}`}>
          {/* Channel list panel */}
          {(!isMobile || !activeChannelId) && (
            <div className="w-full md:w-80 bg-[#000000] border-r border-[#2B2B2B] flex flex-col h-full">
              <div className="p-5 border-b border-[#2B2B2B]">
                <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#FCC105]" />
                  Channels
                </h1>
                <p className="text-xs text-[#8A8A8A] mt-1">Join a group channel to chat</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {channelList.map(ch => {
                  const isJoined = joinedChannels.has(ch.id);
                  const isActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        if (!isJoined) joinChannel(ch.id);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 cursor-pointer border ${
                        isActive
                          ? 'bg-[#FCC105]/10 border-[#FCC105]/40 text-white'
                          : 'bg-[#111111] border-[#2B2B2B] hover:border-[#FCC105]/30 hover:bg-[#111111]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-[#FCC105] text-black' : 'bg-[#1A1A1A] text-[#FCC105]'
                        }`}>
                          <Hash className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{ch.name}</span>
                            {isJoined && (
                              <span className="text-[9px] bg-[#22C55E]/20 text-[#22C55E] px-1.5 py-0.5 rounded-full border border-[#22C55E]/30 font-bold uppercase tracking-wider shrink-0">
                                Joined
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8A8A8A] truncate mt-0.5">{ch.description}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-[#8A8A8A]" />
                            <span className="text-[10px] text-[#8A8A8A]">{ch.memberCount || 0} online</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Channel Window (or placeholder) */}
          {(!isMobile || activeChannelId) && (
            <ChannelWindow
              channel={channelList.find(ch => ch.id === activeChannelId) || null}
              currentUser={currentUser}
              onSendMessage={handleChannelMessage}
              onSendMedia={handleChannelSendMedia}
              onBack={() => setActiveChannelId(null)}
              isMobile={isMobile}
              onDeleteMessage={(msgId) => handleDeleteMessage(msgId, true)}
            />
          )}
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
      {(!isMobile || (activeTab === 'chats' && !activeChatId) || (activeTab === 'discover' && !activeChannelId) || (activeTab !== 'chats' && activeTab !== 'discover')) && (
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
        onLogout={handleLogout}
      />


      {/* Call Overlay View */}
      {activeCall && (() => {
        const isFullScreenVideo = activeCall.type === 'video' && activeCall.status === 'connected';
        return (
          <div className="fixed inset-0 z-50 bg-[#000000]/95 backdrop-blur-xl flex flex-col items-center justify-center p-0 select-none animate-fade-in">
            <audio ref={remoteAudioRef} autoPlay />
            
            {isFullScreenVideo ? (
              /* Full Screen Video Call Layout */
              <div className="w-full h-full relative overflow-hidden bg-black flex flex-col justify-between">
                {/* Remote Video (Fills Screen) */}
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el && remoteStreamRef.current) {
                      el.srcObject = remoteStreamRef.current;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
                
                {/* Connecting fallback */}
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] pointer-events-none z-10 transition-opacity duration-300"
                  style={{ opacity: remoteStreamRef.current ? 0 : 1 }}
                >
                  <img src={activeCall.chat.avatarUrl} alt="Remote" className="w-24 h-24 rounded-full border-2 border-[#2B2B2B]" />
                  <span className="text-xs text-[#8A8A8A] mt-3 font-semibold">Connecting video stream...</span>
                </div>

                {/* Local Camera Floating PiP */}
                {!activeCall.isVideoOff && (
                  <div className="absolute top-24 right-4 w-28 h-36 rounded-2xl overflow-hidden border border-[#FCC105] shadow-2xl bg-black z-20">
                    <video 
                      ref={(el) => {
                        localVideoRef.current = el;
                        if (el && localStreamRef.current) {
                          el.srcObject = localStreamRef.current;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Floating Top Header (overlayed over video) */}
                <div className="absolute top-0 left-0 right-0 p-6 pt-10 flex flex-col items-center bg-gradient-to-b from-[#000000]/90 via-[#000000]/40 to-[#000000]/0 z-20">
                  <span className="text-[10px] text-[#FCC105] tracking-widest font-extrabold uppercase bg-[#FCC105]/15 px-3 py-1 rounded-full border border-[#FCC105]/20 backdrop-blur-md">
                    Secure Video Session
                  </span>
                  
                  <h2 className="text-2xl font-display font-black text-white mt-4 tracking-tight drop-shadow-md">
                    {activeCall.chat.name}
                  </h2>
                  
                  <div className="text-xs text-[#8A8A8A] mt-1.5 font-medium">
                    <span className="flex items-center gap-2 text-[#FCC105] font-bold drop-shadow">
                      <span className="w-2 h-2 rounded-full bg-[#FCC105] animate-ping" />
                      {formatCallDuration(activeCall.duration)}
                    </span>
                  </div>
                </div>

                {/* Floating Bottom Controls (overlayed over video) */}
                <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 flex justify-center items-center gap-6 bg-gradient-to-t from-[#000000]/90 via-[#000000]/40 to-[#000000]/0 z-20">
                  {/* Mute Mic */}
                  <button
                    onClick={() => {
                      const updatedMuted = !activeCall.isMuted;
                      setActiveCall(prev => ({ ...prev, isMuted: updatedMuted }));
                      if (localStreamRef.current) {
                        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !updatedMuted);
                      }
                    }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105 ${
                      activeCall.isMuted 
                        ? 'bg-[#FCC105] text-[#000000]' 
                        : 'bg-[#1A1A1A]/85 border border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]'
                    }`}
                    title={activeCall.isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {activeCall.isMuted ? <Mic className="w-5.5 h-5.5 text-black" /> : <Mic className="w-5.5 h-5.5" />}
                  </button>

                  {/* End call */}
                  <button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-[#EF4444] text-white flex items-center justify-center hover:scale-105 hover:bg-[#F87171] transition-all cursor-pointer shadow-lg shadow-[#EF4444]/30"
                    title="End Call"
                  >
                    <Phone className="w-6.5 h-6.5 rotate-[135deg]" />
                  </button>

                  {/* Toggle Camera */}
                  <button
                    onClick={() => {
                      const updatedVideoOff = !activeCall.isVideoOff;
                      setActiveCall(prev => ({ ...prev, isVideoOff: updatedVideoOff }));
                      if (localStreamRef.current) {
                        localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !updatedVideoOff);
                      }
                    }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105 ${
                      activeCall.isVideoOff 
                        ? 'bg-[#FCC105] text-[#000000]' 
                        : 'bg-[#1A1A1A]/85 border border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]'
                    }`}
                    title={activeCall.isVideoOff ? "Turn Video On" : "Turn Video Off"}
                  >
                    {activeCall.isVideoOff ? <Video className="w-5.5 h-5.5 text-black" /> : <Video className="w-5.5 h-5.5" />}
                  </button>
                </div>
              </div>
            ) : (
              /* Centered Card Call Layout (Ringing, incoming, or voice sessions) */
              <div className="w-full max-w-md bg-[#000000] border border-[#2B2B2B] rounded-3xl p-8 flex flex-col items-center justify-between min-h-[460px] sm:min-h-[500px] relative overflow-hidden shadow-2xl">
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

                {/* Avatar / Ringing state */}
                <div className="relative w-full flex-1 flex items-center justify-center my-6 min-h-[220px]">
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
                </div>

                {/* Bottom Controls */}
                <div className="w-full flex justify-center items-center gap-6 mt-4">
                  {activeCall.status === 'ringing' && activeCall.direction === 'incoming' ? (
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
                    <>
                      {/* Mute Mic */}
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
                        <div className="w-12 h-12" />
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
