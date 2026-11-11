import React, { useState } from 'react';
import { 
  X, User, Shield, Volume2, Sparkles, AlertCircle, 
  Moon, Sun, RotateCcw, Bell, Palette, Image as ImageIcon, 
  Trash2, Check, Sliders, MessageSquare, Paintbrush, UploadCloud,
  Phone, Video, Send, Smile, Type
} from 'lucide-react';
import { 
  APP_THEME_PRESETS,
  TEXT_COLOR_PRESETS,
  BUBBLE_SHAPES, 
  OUTGOING_COLOR_PRESETS, 
  INCOMING_COLOR_PRESETS, 
  BACKGROUND_COLOR_PRESETS, 
  BACKGROUND_GRADIENT_PRESETS,
  getReadableTextColor,
  compressWallpaperImage,
  applyThemeToDocument,
  deriveHarmoniousAccentFromColor,
  derivePaletteFromGradient,
  extractPaletteFromImage,
  deriveAppThemeFromColor,
  deriveTextPalette
} from '../themeUtils.js';

export default function ProfileSettings({ 
  isOpen, 
  onClose, 
  currentUser, 
  onUpdateUser, 
  settings, 
  onUpdateSettings,
  onResetAllData,
  onLogout
}) {
  // Tabs: 'profile' | 'appearance' | 'system'
  const [activeTab, setActiveTab] = useState('appearance');

  // User Profile state
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [isOnline, setIsOnline] = useState(currentUser.isOnline);

  // System settings state
  const [simulationSpeed, setSimulationSpeed] = useState(settings.simulationSpeed || 'fast');
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled || false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Appearance / Customization state
  const [theme, setTheme] = useState(settings.theme || 'dark');
  const [appThemeColor, setAppThemeColor] = useState(settings.appThemeColor || '#000000');
  const [textColorMode, setTextColorMode] = useState(settings.textColorMode || 'match');
  const [textColor, setTextColor] = useState(settings.textColor || 'auto');
  const [chatBackground, setChatBackground] = useState(() => ({
    type: settings.chatBackground?.type || 'default',
    color: settings.chatBackground?.color || '#000000',
    gradient: settings.chatBackground?.gradient || BACKGROUND_GRADIENT_PRESETS[0].gradient,
    imageUrl: settings.chatBackground?.imageUrl || '',
    imageOpacity: settings.chatBackground?.imageOpacity ?? 0.85,
    imageBlur: settings.chatBackground?.imageBlur ?? 0,
    pattern: settings.chatBackground?.pattern ?? false
  }));

  const [bubbleStyle, setBubbleStyle] = useState(() => ({
    shape: settings.bubbleStyle?.shape || 'modern',
    outgoingBg: settings.bubbleStyle?.outgoingBg || '#FCC105',
    outgoingText: settings.bubbleStyle?.outgoingText || '#000000',
    incomingBg: settings.bubbleStyle?.incomingBg || '',
    incomingText: settings.bubbleStyle?.incomingText || '',
  }));

  const [accentColor, setAccentColor] = useState(
    settings.accentColor || settings.bubbleStyle?.outgoingBg || '#FCC105'
  );

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  if (!isOpen) return null;

  const avatarsList = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=user',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar1',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/bottts/svg?seed=robot2'
  ];

  const handleCustomAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDeviceWallpaperUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const compressedDataUrl = await compressWallpaperImage(file, 1600, 1200, 0.82);
      
      // Auto-extract signature vibrant accent from uploaded image
      const extractedAccent = await extractPaletteFromImage(compressedDataUrl);
      const autoText = getReadableTextColor(extractedAccent);

      setChatBackground(prev => ({
        ...prev,
        type: 'image',
        imageUrl: compressedDataUrl
      }));

      // When setting a device photo wallpaper, ensure theme is custom/dark and never light
      setTheme('custom');
      setAccentColor(extractedAccent);
      setBubbleStyle(prev => ({
        ...prev,
        outgoingBg: extractedAccent,
        outgoingText: autoText
      }));
    } catch (err) {
      console.error('Wallpaper processing failed:', err);
      alert('Failed to process image. Please choose another image file.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveWallpaperImage = () => {
    setChatBackground(prev => ({
      ...prev,
      type: 'default',
      imageUrl: ''
    }));
    setAccentColor('#FCC105');
    setBubbleStyle(prev => ({
      ...prev,
      outgoingBg: '#FCC105',
      outgoingText: '#000000'
    }));
  };

  const handleBackgroundColorChange = (color) => {
    if (!color) {
      setChatBackground(prev => ({ ...prev, type: 'default', color: '' }));
      setAccentColor('#FCC105');
      setBubbleStyle(prev => ({
        ...prev,
        outgoingBg: '#FCC105',
        outgoingText: '#000000'
      }));
      return;
    }
    const derived = deriveHarmoniousAccentFromColor(color);
    const autoText = getReadableTextColor(derived);
    setTheme('custom');
    setChatBackground(prev => ({
      ...prev,
      type: 'color',
      color: color,
      gradient: ''
    }));
    setAccentColor(derived);
    setBubbleStyle(prev => ({
      ...prev,
      outgoingBg: derived,
      outgoingText: autoText
    }));
  };

  const handleGradientChange = (g) => {
    const derived = g.accent || derivePaletteFromGradient(g.name || g.gradient);
    const autoText = getReadableTextColor(derived);
    setTheme('custom');
    setChatBackground(prev => ({
      ...prev,
      type: 'gradient',
      gradient: g.gradient,
      color: ''
    }));
    setAccentColor(derived);
    setBubbleStyle(prev => ({
      ...prev,
      outgoingBg: derived,
      outgoingText: autoText
    }));
  };

  const handleThemeSelect = (themeId) => {
    setTheme(themeId);
    let newAccent = accentColor;
    const preset = APP_THEME_PRESETS.find(p => p.id === themeId);
    if (preset) {
      newAccent = preset.accent;
      setAccentColor(preset.accent);
      setBubbleStyle(prev => ({
        ...prev,
        outgoingBg: preset.accent,
        outgoingText: getReadableTextColor(preset.accent)
      }));
    }
    const updated = {
      ...settings,
      theme: themeId,
      appThemeColor,
      textColorMode: 'match',
      textColor: 'auto',
      accentColor: newAccent,
      bubbleStyle: {
        ...bubbleStyle,
        shape: 'brutalist'
      }
    };
    applyThemeToDocument(updated);
  };

  const handleOutgoingBgChange = (color) => {
    const autoText = getReadableTextColor(color);
    setAccentColor(color);
    setBubbleStyle(prev => ({
      ...prev,
      outgoingBg: color,
      outgoingText: autoText
    }));
  };

  const handleIncomingBgChange = (color) => {
    const autoText = color ? getReadableTextColor(color) : '';
    setBubbleStyle(prev => ({
      ...prev,
      incomingBg: color,
      incomingText: autoText
    }));
  };

  const handleToggleNotifications = () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(!notificationsEnabled);
    } else if (Notification.permission === 'denied') {
      alert('Notifications are blocked by your browser settings. Please enable them in your browser configuration to receive alerts.');
    } else {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          try {
            new Notification('ChatMe Notifications', {
              body: 'Desktop notifications successfully enabled!',
              icon: '/chatmeappicon.png'
            });
          } catch (e) {
            console.warn('Failed to trigger test notification:', e);
          }
        } else {
          setNotificationsEnabled(false);
        }
      });
    }
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    onUpdateUser({ name, avatarUrl, isOnline });
    const isCustomWallpaperActive = Boolean(
      (chatBackground.type === 'image' && chatBackground.imageUrl) ||
      (chatBackground.type === 'color' && chatBackground.color && chatBackground.color !== '#FFFFFF' && chatBackground.color !== '#F8FAFC') ||
      chatBackground.type === 'gradient'
    );
    const finalTheme = (isCustomWallpaperActive && (theme === 'light' || theme === 'neo-brutalist')) ? 'custom' : (theme || 'dark');
    const updatedSettings = {
      ...settings,
      theme: finalTheme,
      appThemeColor,
      textColorMode: 'match',
      textColor: 'auto',
      accentColor,
      chatBackground,
      bubbleStyle: {
        ...bubbleStyle,
        shape: 'brutalist'
      },
      simulationSpeed,
      soundEnabled,
      notificationsEnabled
    };
    onUpdateSettings(updatedSettings);
    applyThemeToDocument(updatedSettings);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      onClose();
    }, 700);
  };

  // Preview styling calculations
  const activePreset = APP_THEME_PRESETS.find(p => p.id === theme);
  const activeThemePalette = activePreset || APP_THEME_PRESETS[1] || APP_THEME_PRESETS[0];
  const activeTextPalette = deriveTextPalette(
    textColorMode === 'match' ? 'auto' : textColor,
    activeThemePalette.isDark
  );

  const selectedShape = BUBBLE_SHAPES.find(s => s.id === bubbleStyle.shape) || BUBBLE_SHAPES[0];
  const previewOutgoingBg = bubbleStyle.outgoingBg || accentColor || '#FCC105';
  const previewOutgoingText = bubbleStyle.outgoingText || getReadableTextColor(previewOutgoingBg);

  const previewIncomingBg = bubbleStyle.incomingBg 
    ? bubbleStyle.incomingBg 
    : activeThemePalette.surfaceSecondary;
  const previewIncomingText = bubbleStyle.incomingText 
    ? bubbleStyle.incomingText 
    : (textColorMode === 'custom' && textColor && textColor !== 'auto'
        ? textColor
        : activeThemePalette.defaultTextColor);

  // Preview container background
  let previewBgStyle;
  if (chatBackground.type === 'color' && chatBackground.color) {
    previewBgStyle = { backgroundColor: chatBackground.color };
  } else if (chatBackground.type === 'gradient' && chatBackground.gradient) {
    previewBgStyle = { backgroundImage: chatBackground.gradient };
  } else if (chatBackground.type === 'image' && chatBackground.imageUrl) {
    previewBgStyle = {
      backgroundImage: `url(${chatBackground.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  } else {
    previewBgStyle = { backgroundColor: activeThemePalette.bg };
  }

  return (
    <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 select-none animate-fadeIn">
      {/* Modal Card - Neo-Brutalist Tactile Frame */}
      <div className="bg-[#111111] border-[3px] border-black rounded-2xl w-full max-w-2xl shadow-[8px_8px_0px_#000000] relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-black flex items-center justify-between shrink-0 bg-[#111111]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl border-2 border-black bg-[#FCC105] shadow-[2px_2px_0px_#000000] flex items-center justify-center text-black">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-black text-[#FFFFFF] uppercase tracking-tight">
                ChatMe Customization & Settings
              </h2>
              <p className="text-[11px] font-semibold text-[#8A8A8A] hidden sm:block">
                Neo-Brutalist Tactile themes, custom wallpaper, bubble colors, and user profile
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="tactile-btn p-1.5 rounded-xl bg-white text-black cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Navigation Bar - Tactile Keys */}
        <div className="flex items-center border-b-2 border-black bg-[#0A0A0A] px-3 sm:px-5 py-2.5 shrink-0 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`py-2 px-3.5 text-xs font-black uppercase rounded-xl flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'appearance'
                ? 'tactile-btn bg-[#FCC105] text-black'
                : 'border-2 border-transparent text-[#8A8A8A]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Theme & Chat Style</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-3.5 text-xs font-black uppercase rounded-xl flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'tactile-btn bg-[#FCC105] text-black'
                : 'border-2 border-transparent text-[#8A8A8A]'
            }`}
          >
            <User className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>User Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`py-2 px-3.5 text-xs font-black uppercase rounded-xl flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'system'
                ? 'tactile-btn bg-[#FCC105] text-black'
                : 'border-2 border-transparent text-[#8A8A8A]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>System Preferences</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: APPEARANCE & THEMES */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              
              {/* 1. Main App Theme Mode (Two Default Themes: White Mode & Black Mode) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
                      <Sun className="w-3.5 h-3.5 text-[#FCC105]" />
                      App Theme Mode
                    </label>
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[#8A8A8A] font-medium">
                      🛡️ Splash screen stays branded
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#FCC105]">
                    Active: {theme === 'light' ? 'White Mode' : 'Black Mode'}
                  </span>
                </div>

                {/* Two Default Themes: White Mode & Black Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* White Mode Option */}
                  <div
                    onClick={() => handleThemeSelect('light')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      theme === 'light'
                        ? 'border-[#FCC105] bg-white text-black shadow-md shadow-[#FCC105]/20'
                        : 'border-[#2B2B2B] bg-[#141414] text-white hover:border-[#8A8A8A]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl border-2 border-black bg-white flex items-center justify-center text-black shadow-[2px_2px_0px_#000000]">
                        <Sun className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${theme === 'light' ? 'text-black' : 'text-white'}`}>White Mode</span>
                          {theme === 'light' && (
                            <span className="text-[9px] bg-[#FCC105] text-black font-black px-1.5 py-0.5 rounded-md uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-semibold ${theme === 'light' ? 'text-neutral-700' : 'text-neutral-400'}`}>
                          Crisp light theme with bold tactile borders
                        </p>
                      </div>
                    </div>
                    {theme === 'light' && (
                      <span className="w-6 h-6 rounded-full bg-[#FCC105] text-black flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Black Mode Option */}
                  <div
                    onClick={() => handleThemeSelect('dark')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      theme !== 'light'
                        ? 'border-[#FCC105] bg-black text-white shadow-md shadow-[#FCC105]/20'
                        : 'border-[#2B2B2B] bg-[#141414] text-white hover:border-[#8A8A8A]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl border-2 border-white/20 bg-[#0A0A0A] flex items-center justify-center text-[#FCC105] shadow-[2px_2px_0px_#000000]">
                        <Moon className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">Black Mode</span>
                          {theme !== 'light' && (
                            <span className="text-[9px] bg-[#FCC105] text-black font-black px-1.5 py-0.5 rounded-md uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-neutral-400">
                          Signature pitch black with ChatMe Gold accent
                        </p>
                      </div>
                    </div>
                    {theme !== 'light' && (
                      <span className="w-6 h-6 rounded-full bg-[#FCC105] text-black flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Interactive Live Chat Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    Live Chat Appearance Preview
                  </label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold flex items-center gap-1">
                    ✨ Adaptive Theme Accents
                  </span>
                </div>

                <div 
                  className="rounded-2xl border border-[#2B2B2B] p-3.5 relative overflow-hidden transition-all duration-300 min-h-[220px] flex flex-col justify-between gap-3 shadow-inner"
                  style={previewBgStyle}
                >
                  {/* Image overlay with blur & opacity if set */}
                  {chatBackground.type === 'image' && chatBackground.imageUrl && (
                    <div 
                      className="absolute inset-0 pointer-events-none bg-cover bg-center transition-all duration-300"
                      style={{
                        backgroundImage: `url(${chatBackground.imageUrl})`,
                        opacity: chatBackground.imageOpacity ?? 0.85,
                        filter: chatBackground.imageBlur ? `blur(${chatBackground.imageBlur}px)` : 'none'
                      }}
                    />
                  )}

                  {/* Optional pattern */}
                  {chatBackground.pattern && (
                    <div className="absolute inset-0 pointer-events-none chat-wallpaper-doodles" />
                  )}

                  {/* Mini Chat Header Preview (Shows call/video icons & avatar adapting to wallpaper) */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10 relative z-10 select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden border-2" style={{ borderColor: accentColor }}>
                        <img 
                          src="https://api.dicebear.com/7.x/bottts/svg?seed=previewUser" 
                          alt="Contact" 
                          className="w-full h-full object-cover bg-black/40"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white block leading-none">Alex Morgan</span>
                          <span 
                            className="text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider"
                            style={{ 
                              color: accentColor, 
                              borderColor: `${accentColor}40`, 
                              backgroundColor: `${accentColor}15` 
                            }}
                          >
                            Member
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold mt-0.5 block" style={{ color: accentColor }}>
                          Typing...
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div 
                        className="p-1.5 rounded-lg bg-black/30 border border-white/10"
                        style={{ color: accentColor }}
                        title="Voice Call Icon"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div 
                        className="p-1.5 rounded-lg bg-black/30 border border-white/10"
                        style={{ color: accentColor }}
                        title="Video Call Icon"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Incoming sample message */}
                  <div className="flex items-start gap-2 max-w-[85%] relative z-10 animate-fadeIn">
                    <div
                      style={{
                        backgroundColor: previewIncomingBg,
                        color: previewIncomingText,
                      }}
                      className={`px-3 py-2 text-xs select-text font-semibold ${selectedShape.incomingClass}`}
                    >
                      <p className="leading-relaxed">Buttons, call icons, and bubbles adapt to this wallpaper! ✨</p>
                      <span className="text-[8px] opacity-70 mt-0.5 block">10:42 AM</span>
                    </div>
                  </div>

                  {/* Outgoing sample message */}
                  <div className="flex items-end justify-end max-w-[85%] self-end relative z-10 animate-fadeIn">
                    <div
                      style={{
                        backgroundColor: previewOutgoingBg,
                        color: previewOutgoingText,
                      }}
                      className={`px-3 py-2 text-xs select-text font-semibold ${selectedShape.outgoingClass}`}
                    >
                      <p className="leading-relaxed">Looks stunning & perfectly harmonious! 🚀</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5 text-[8px] opacity-80">
                        <span>10:43 AM</span>
                        <span>✓✓</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Type Bar Preview */}
                  <div className="pt-2 border-t border-white/10 flex items-center gap-2 relative z-10 select-none">
                    <div 
                      className="flex-1 rounded-xl px-3 py-1.5 text-xs text-white/50 bg-black/50 border flex items-center justify-between"
                      style={{ borderColor: accentColor }}
                    >
                      <div className="flex items-center gap-2">
                        <Smile className="w-3.5 h-3.5 text-white/50" />
                        <span className="text-[11px]">Type message...</span>
                      </div>
                    </div>
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-lg cursor-pointer"
                      style={{ 
                        backgroundColor: accentColor, 
                        color: getReadableTextColor(accentColor) 
                      }}
                    >
                      <Send className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Chat Page Background Customization */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    Chat Page Wallpaper & Background
                  </label>
                  {chatBackground.type !== 'default' && (
                    <button
                      type="button"
                      onClick={() => handleBackgroundColorChange('')}
                      className="text-[11px] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                      style={{ color: accentColor }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to Default
                    </button>
                  )}
                </div>

                {/* Local Device Storage Image Upload */}
                <div className="p-3.5 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#FFFFFF] flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4" style={{ color: accentColor }} />
                        Set Background Image From Device Storage
                      </p>
                      <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                        Pick any photo or wallpaper saved on your computer or phone (auto-matches theme colors)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label 
                        className="py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                        style={{ 
                          backgroundColor: accentColor, 
                          color: getReadableTextColor(accentColor) 
                        }}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{isUploadingImage ? 'Processing...' : 'Choose Device Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDeviceWallpaperUpload}
                          className="hidden"
                          disabled={isUploadingImage}
                        />
                      </label>

                      {chatBackground.imageUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveWallpaperImage}
                          className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-[#EF4444] hover:bg-red-500/20 cursor-pointer transition-colors"
                          title="Remove custom wallpaper image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Image tuning sliders if custom image is active */}
                  {chatBackground.type === 'image' && chatBackground.imageUrl && (
                    <div className="pt-2 border-t border-[#2B2B2B] grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Image Opacity / Dim */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#8A8A8A]">Wallpaper Opacity</span>
                          <span className="text-[#FFFFFF] font-bold">{Math.round((chatBackground.imageOpacity ?? 0.85) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="1.0"
                          step="0.05"
                          value={chatBackground.imageOpacity ?? 0.85}
                          onChange={(e) => setChatBackground(prev => ({ ...prev, imageOpacity: parseFloat(e.target.value) }))}
                          className="w-full cursor-pointer"
                          style={{ accentColor: accentColor }}
                        />
                      </div>

                      {/* Image Blur */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#8A8A8A]">Wallpaper Blur (Soft focus)</span>
                          <span className="text-[#FFFFFF] font-bold">{chatBackground.imageBlur ?? 0}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={chatBackground.imageBlur ?? 0}
                          onChange={(e) => setChatBackground(prev => ({ ...prev, imageBlur: parseInt(e.target.value) }))}
                          className="w-full cursor-pointer"
                          style={{ accentColor: accentColor }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Solid Colors & Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#FFFFFF] flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      Custom Background Colors
                    </span>
                    
                    {/* Native Hex Color Picker */}
                    <label 
                      className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:underline"
                      style={{ color: accentColor }}
                    >
                      <span>Custom Color:</span>
                      <input
                        type="color"
                        value={chatBackground.color || '#000000'}
                        onChange={(e) => handleBackgroundColorChange(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-[#2B2B2B] bg-transparent p-0"
                      />
                    </label>
                  </div>

                  {/* Swatches */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {BACKGROUND_COLOR_PRESETS.map((item, idx) => {
                      const isSelected = chatBackground.type === 'color' && chatBackground.color === item.color;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleBackgroundColorChange(item.color)}
                          className={`w-7 h-7 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center relative hover:scale-110 ${
                            isSelected ? 'scale-110' : 'border-[#2B2B2B] hover:border-[#8A8A8A]'
                          }`}
                          style={{ 
                            backgroundColor: item.color || (theme === 'light' ? '#F8FAFC' : '#000000'),
                            borderColor: isSelected ? accentColor : undefined
                          }}
                          title={item.name}
                        >
                          {isSelected && <span className="text-xs font-bold" style={{ color: accentColor }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gradient Presets */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-[#FFFFFF]">Modern Gradient Presets</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BACKGROUND_GRADIENT_PRESETS.map((g, idx) => {
                      const isSelected = chatBackground.type === 'gradient' && chatBackground.gradient === g.gradient;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleGradientChange(g)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-[#1A1A1A]'
                              : 'border-[#2B2B2B] hover:border-[#8A8A8A] text-[#8A8A8A]'
                          }`}
                          style={{
                            borderColor: isSelected ? accentColor : undefined,
                            color: isSelected ? accentColor : undefined
                          }}
                        >
                          <span 
                            className="w-5 h-5 rounded-md shrink-0 border border-white/20"
                            style={{ backgroundImage: g.gradient }}
                          />
                          <span className="text-[11px] font-medium truncate">{g.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Doodle Pattern Overlay Checkbox */}
                <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B]">
                  <div>
                    <p className="text-xs font-semibold text-[#FFFFFF]">Subtle Chat Pattern Overlay</p>
                    <span className="text-[10px] text-[#8A8A8A]">Adds elegant messaging texture over background</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatBackground(prev => ({ ...prev, pattern: !prev.pattern }))}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative cursor-pointer ${
                      chatBackground.pattern ? 'bg-[#FCC105]' : 'bg-[#2B2B2B]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-[#000000] shadow-md transform transition-transform duration-200 block ${
                      chatBackground.pattern ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

              </div>

              {/* 4. Chat Bubble Colors (Fixed Neo-Brutalist Tactile Shape) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#FCC105]" />
                    Chat Bubble Colors
                  </label>
                  <span className="text-[10px] bg-[#FCC105]/20 text-[#FCC105] font-bold px-2 py-0.5 rounded-md border border-[#FCC105]/40 uppercase tracking-wider">
                    Neo-Brutalist Tactile Shape
                  </span>
                </div>

                {/* Sent (Outgoing) Bubble Color */}
                <div className="space-y-2 p-3.5 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#FFFFFF]">Sent (Outgoing) Bubble Color</p>
                      <span className="text-[10px] text-[#8A8A8A]">Your own messages (contrasting text auto-calculated)</span>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-[#FCC105] font-semibold cursor-pointer hover:underline">
                      <span>Custom:</span>
                      <input
                        type="color"
                        value={bubbleStyle.outgoingBg || '#FCC105'}
                        onChange={(e) => handleOutgoingBgChange(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-[#2B2B2B] bg-transparent p-0"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    {OUTGOING_COLOR_PRESETS.map((item, idx) => {
                      const isSelected = bubbleStyle.outgoingBg === item.color;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleOutgoingBgChange(item.color)}
                          className={`w-7 h-7 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center relative hover:scale-110 ${
                            isSelected ? 'border-[#FCC105] scale-110 ring-2 ring-[#FCC105]/50' : 'border-[#2B2B2B] hover:border-[#8A8A8A]'
                          }`}
                          style={{ backgroundColor: item.color }}
                          title={item.name}
                        >
                          {isSelected && (
                            <span 
                              className="text-xs font-bold"
                              style={{ color: getReadableTextColor(item.color) }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Received (Incoming) Bubble Color */}
                <div className="space-y-2 p-3.5 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#FFFFFF]">Received (Incoming) Bubble Color</p>
                      <span className="text-[10px] text-[#8A8A8A]">Messages sent to you from contacts & channels</span>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-[#FCC105] font-semibold cursor-pointer hover:underline">
                      <span>Custom:</span>
                      <input
                        type="color"
                        value={bubbleStyle.incomingBg || (theme === 'light' ? '#FFFFFF' : '#1A1A1A')}
                        onChange={(e) => handleIncomingBgChange(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-[#2B2B2B] bg-transparent p-0"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    {INCOMING_COLOR_PRESETS.map((item, idx) => {
                      const isSelected = bubbleStyle.incomingBg === item.color;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleIncomingBgChange(item.color)}
                          className={`h-7 px-2.5 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-medium hover:scale-105 ${
                            isSelected 
                              ? 'border-[#FCC105] text-[#FCC105] bg-[#FCC105]/10 font-bold' 
                              : 'border-[#2B2B2B] text-[#8A8A8A] hover:border-[#8A8A8A]'
                          }`}
                          title={item.name}
                        >
                          {item.color && (
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" 
                              style={{ backgroundColor: item.color }} 
                            />
                          )}
                          <span>{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: USER PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#FCC105]" />
                  Your Profile Information
                </h3>
                
                {/* Avatar Select */}
                <div className="flex flex-col items-center gap-4 py-4 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B] p-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FCC105] shadow-lg shadow-[#FCC105]/15">
                      <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover bg-[#111111]" />
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-5 h-5 bg-[#22C55E] border-2 border-[#1A1A1A] rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5 justify-center items-center">
                    {avatarsList.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 hover:scale-105 transition-all cursor-pointer ${
                          avatarUrl === url ? 'border-[#FCC105]' : 'border-[#2B2B2B] hover:border-[#8A8A8A]'
                        }`}
                      >
                        <img src={url} alt={`Avatar option ${idx}`} className="w-full h-full bg-[#111111]" />
                      </button>
                    ))}
                    
                    {/* Upload Custom File button */}
                    <label className="w-10 h-10 rounded-full border-2 border-dashed border-[#8A8A8A] flex items-center justify-center hover:border-[#FCC105] hover:scale-105 transition-all cursor-pointer bg-[#111111] text-[#8A8A8A] hover:text-[#FCC105]" title="Upload custom photo">
                      <span className="text-lg font-bold font-sans">+</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCustomAvatarUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                {/* Username Input */}
                <div className="space-y-2">
                  <label htmlFor="settings-username" className="text-xs font-semibold text-[#FFFFFF]">
                    Display Name
                  </label>
                  <input
                    id="settings-username"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    required
                    className="w-full bg-[#111111] border border-[#2B2B2B] text-[#FFFFFF] placeholder-[#8A8A8A] px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#FCC105] focus:ring-1 focus:ring-[#FCC105] transition-all"
                  />
                </div>

                {/* Online Status Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B]">
                  <div>
                    <p className="text-xs font-semibold text-[#FFFFFF]">Online Presence</p>
                    <span className="text-[10px] text-[#8A8A8A]">Show green indicator dot to other users</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOnline(!isOnline)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative cursor-pointer ${
                      isOnline ? 'bg-[#FCC105]' : 'bg-[#2B2B2B]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-[#000000] shadow-md transform transition-transform duration-200 block ${
                      isOnline ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM PREFERENCES & DANGER ZONE */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#FCC105]" />
                  Notification & Performance Settings
                </h3>

                {/* Simulation Delay Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#FFFFFF]">
                    AI Reply Simulation Speed
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'fast', label: 'Fast (1s)' },
                      { value: 'normal', label: 'Standard (3s)' },
                      { value: 'none', label: 'Disabled' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSimulationSpeed(item.value)}
                        className={`py-2 px-3 text-xs rounded-xl font-semibold border transition-all cursor-pointer ${
                          simulationSpeed === item.value
                            ? 'bg-[#FCC105] text-[#000000] border-[#FCC105]'
                            : 'bg-transparent text-[#FCC105] border-[#FCC105] hover:bg-[rgba(252,193,5,0.12)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Notification Switch */}
                <div className="flex items-center justify-between p-3.5 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B]">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#8A8A8A]" />
                    <div>
                      <p className="text-xs font-semibold text-[#FFFFFF]">Sound Effects</p>
                      <span className="text-[10px] text-[#8A8A8A]">Play audio chime on incoming messages</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative cursor-pointer ${
                      soundEnabled ? 'bg-[#FCC105]' : 'bg-[#2B2B2B]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-[#000000] shadow-md transform transition-transform duration-200 block ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Desktop Notification Switch */}
                <div className="flex items-center justify-between p-3.5 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#8A8A8A]" />
                    <div>
                      <p className="text-xs font-semibold text-[#FFFFFF]">Device Notifications</p>
                      <span className="text-[10px] text-[#8A8A8A]">
                        {notificationPermission === 'granted' 
                          ? 'System notifications are active' 
                          : notificationPermission === 'denied' 
                          ? 'Blocked by browser. Enable in settings.' 
                          : 'Request permission to send alerts'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative cursor-pointer ${
                      notificationsEnabled && notificationPermission === 'granted' ? 'bg-[#FCC105]' : 'bg-[#2B2B2B]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-[#000000] shadow-md transform transition-transform duration-200 block ${
                      notificationsEnabled && notificationPermission === 'granted' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              <hr className="border-[#2B2B2B]" />

              {/* Maintenance Section */}
              <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl space-y-3">
                <div className="flex gap-2.5">
                  <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[#FFFFFF]">Danger Zone</h4>
                    <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                      Resetting will wipe all custom chat history and re-scaffold default mock content.
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all custom conversations and reset database?")) {
                      onResetAllData();
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#EF4444] text-[#EF4444] text-xs font-semibold hover:bg-red-500/10 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset & Clean Chat History
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0A0A0A] border-t-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Logout on the left */}
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Sign out of ChatMe?')) onLogout();
              }}
              className="tactile-btn w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#EF4444] text-white text-xs font-black uppercase text-center"
            >
              Sign Out
            </button>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="tactile-btn w-full sm:w-auto py-2.5 px-5 rounded-xl bg-white text-black text-xs font-black uppercase text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="tactile-btn w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#FCC105] text-[#000000] text-xs font-black uppercase shadow-[4px_4px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* Success Alert toast inside modal */}
        {showNotification && (
          <div className="absolute inset-0 bg-[#000000]/90 backdrop-blur-sm flex items-center justify-center gap-2.5 animate-fadeIn z-30">
            <Sparkles className="w-6 h-6 text-[#FCC105] animate-spin" />
            <span className="text-sm font-bold text-white">Saving and applying your theme changes...</span>
          </div>
        )}
      </div>
    </div>
  );
}
