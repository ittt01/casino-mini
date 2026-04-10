'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';

const BGM_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3';
const BGM_VOLUME = 0.2;
const STORAGE_KEY = 'casino_bgm_muted';

interface BGMContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  isReady: boolean;
}

const BGMContext = createContext<BGMContextValue>({
  isMuted: false,
  toggleMute: () => {},
  isReady: false,
});

export const useBGM = () => useContext(BGMContext);

export const BGMProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteracted = useRef(false);

  // Read initial muted state from localStorage (default: not muted)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [isReady, setIsReady] = useState(false);

  // Initialize audio element once on mount
  useEffect(() => {
    const audio = new Audio(BGM_URL);
    audio.loop = true;
    audio.volume = BGM_VOLUME;
    audio.preload = 'auto';
    audio.muted = isMuted;

    audio.addEventListener('canplaythrough', () => setIsReady(true), {
      once: true,
    });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start BGM on first user interaction (browser autoplay policy)
  useEffect(() => {
    const tryPlay = () => {
      if (hasInteracted.current || !audioRef.current) return;
      hasInteracted.current = true;

      if (!isMuted) {
        audioRef.current.play().catch(() => {
          // Silently ignore — user may have blocked autoplay
        });
      }
    };

    window.addEventListener('click', tryPlay, { once: true });
    window.addEventListener('keydown', tryPlay, { once: true });
    window.addEventListener('touchstart', tryPlay, { once: true });

    return () => {
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('keydown', tryPlay);
      window.removeEventListener('touchstart', tryPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));

      const audio = audioRef.current;
      if (!audio) return next;

      audio.muted = next;

      if (!next) {
        // Un-muting — ensure playback is running
        if (!hasInteracted.current) hasInteracted.current = true;
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      }

      return next;
    });
  }, []);

  return (
    <BGMContext.Provider value={{ isMuted, toggleMute, isReady }}>
      {children}
    </BGMContext.Provider>
  );
};
