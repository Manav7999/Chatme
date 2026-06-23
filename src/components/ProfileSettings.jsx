import React, { useState } from 'react';
import { X, User, Shield, Volume2, Sparkles, AlertCircle, Moon, RotateCcw, Bell } from 'lucide-react';

export default function ProfileSettings({ 
  isOpen, 
  onClose, 
  currentUser, 
  onUpdateUser, 
  settings, 
  onUpdateSettings,
  onResetAllData 
}) {
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [isOnline, setIsOnline] = useState(currentUser.isOnline);
  const [simulationSpeed, setSimulationSpeed] = useState(settings.simulationSpeed);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled || false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [showNotification, setShowNotification] = useState(false);

  const handleCustomAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const avatarsList = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=user',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar1',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/bottts/svg?seed=robot2'
  ];

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
    e.preventDefault();
    onUpdateUser({ name, avatarUrl, isOnline });
    onUpdateSettings({ simulationSpeed, soundEnabled, notificationsEnabled });
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      {/* Modal Card */}
      <div className="bg-[#000000] border border-[#2B2B2B] rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#2B2B2B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FCC105]" />
            <h2 className="text-lg font-display font-bold text-[#FFFFFF]">
              ChatMe Settings & Profile
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1A1A1A] text-[#8A8A8A] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* User Profile Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#FCC105]" />
              User Profile
            </h3>
            
            {/* Avatar Select */}
            <div className="flex flex-col items-center gap-4 py-3 bg-[#1A1A1A] rounded-xl border border-[#2B2B2B] p-4">
              <div className="relative">
                <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-[#FCC105] shadow-lg shadow-[#FCC105]/10">
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover bg-[#111111]" />
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-[#22C55E] border-2 border-[#1A1A1A] rounded-full" />
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
              <label htmlFor="username" className="text-xs font-semibold text-[#FFFFFF]">
                Your Name
              </label>
              <input
                id="username"
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

          <hr className="border-[#2B2B2B]" />

          {/* System Settings Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#FCC105]" />
              System Preference
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
                  <span className="text-[10px] text-[#8A8A8A]">Play audio ping on new messages</span>
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
              className="w-full py-2 px-3 rounded-xl border border-[#EF4444] text-[#EF4444] text-xs font-semibold hover:bg-red-500/10 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset & Clean Chat History
            </button>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-[#000000] border-t border-[#2B2B2B] flex items-center justify-end gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl border border-[#FCC105] text-[#FCC105] text-xs font-semibold hover:bg-[rgba(252,193,5,0.12)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-[#FCC105] text-[#000000] text-xs font-bold hover:bg-[#FFD34D] transition-all cursor-pointer shadow-lg shadow-[#FCC105]/10"
          >
            Save Configuration
          </button>
        </div>

        {/* Success Alert toast inside modal */}
        {showNotification && (
          <div className="absolute inset-0 bg-[#000000]/90 flex items-center justify-center gap-2 animate-fadeIn z-30">
            <Sparkles className="w-6 h-6 text-[#FCC105] animate-spin" />
            <span className="text-sm font-semibold text-white">Saving changes...</span>
          </div>
        )}
      </div>
    </div>
  );
}
