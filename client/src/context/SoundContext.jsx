import { createContext, useContext, useState, useRef, useCallback } from 'react';

const SoundContext = createContext(null);

// Sound URLs (using free sounds, in production replace with actual GTA-style sounds)
const DEFAULT_SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  cash: 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/1005/1005-preview.mp3',
  heist: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',
  powerup: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  levelUp: 'https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3',
  countdown: 'https://assets.mixkit.co/active_storage/sfx/1057/1057-preview.mp3',
  victory: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  defeat: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'
};

export function SoundProvider({ children }) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRefs = useRef({});
  const lastPlayRef = useRef({});

  const playSound = useCallback((soundName) => {
    if (isMuted || !DEFAULT_SOUNDS[soundName]) return;

    const now = Date.now();
    const lastPlayed = lastPlayRef.current[soundName] || 0;
    const minGapMs = soundName === 'levelUp' ? 2000 : 0;
    if (minGapMs && now - lastPlayed < minGapMs) return;
    lastPlayRef.current[soundName] = now;

    try {
      const rootStyles = getComputedStyle(document.documentElement);
      let cssUrl = rootStyles.getPropertyValue(`--sfx-${soundName}`).trim();
      // UX-02: Strip url() wrapper and quotes if CSS returns them
      if (cssUrl.startsWith('url(')) cssUrl = cssUrl.slice(4, -1);
      cssUrl = cssUrl.replace(/^['"]|['"]$/g, '');
      const url = cssUrl || DEFAULT_SOUNDS[soundName];
      // Create new audio instance each time for overlapping sounds
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch(err => {
        // Silently fail - browsers often block autoplay
        console.log('Audio play prevented:', err.message);
      });
    } catch (error) {
      console.log('Sound error:', error);
    }
  }, [isMuted, volume]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const adjustVolume = (newVolume) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  };

  const value = {
    playSound,
    toggleMute,
    adjustVolume,
    isMuted,
    volume
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
