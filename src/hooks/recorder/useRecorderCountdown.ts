import { useState, useRef, useEffect } from 'react';

interface UseRecorderCountdownProps {
  isDrawingModeRef: React.MutableRefObject<boolean>;
}

export function useRecorderCountdown({ isDrawingModeRef }: UseRecorderCountdownProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  const startCountdown = (onComplete: () => void) => {
    let count = 3;
    setCountdown(3);

    try {
      import('@tauri-apps/api/event').then(({ emit }) => {
        emit('countdown-tick', { count: 3 }).catch((err) => {
          console.debug('[Recorder] countdown-tick emit failed:', err);
        });
      });
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('show_overlay').catch((err) => {
          console.debug('[Recorder] show_overlay invoke failed:', err);
        });
      });
    } catch (err) {
      console.debug('[Recorder] Tauri API unavailable for countdown overlay:', err);
    }

    countdownTimerRef.current = window.setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        try {
          import('@tauri-apps/api/event').then(({ emit }) => {
            emit('countdown-tick', { count }).catch((err) => {
              console.debug('[Recorder] countdown-tick emit failed:', err);
            });
          });
        } catch (err) {
          console.debug('[Recorder] countdown-tick error:', err);
        }
      } else {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);

        // 1. Immediately hide the overlay so it is NEVER captured in the video stream
        try {
          import('@tauri-apps/api/event').then(({ emit }) => {
            emit('countdown-end', {}).catch((err) => {
              console.debug('[Recorder] countdown-end emit failed:', err);
            });
          });
          if (!isDrawingModeRef.current) {
            import('@tauri-apps/api/core').then(({ invoke }) => {
              invoke('hide_overlay').catch((err) => {
                console.debug('[Recorder] hide_overlay invoke failed:', err);
              });
            });
          }
        } catch (err) {
          console.debug('[Recorder] hide_overlay error on countdown end:', err);
        }

        // 2. Wait 250ms for Windows Desktop Window Manager to completely flush the overlay
        setTimeout(() => {
          onComplete();
        }, 250);
      }
    }, 1000);
  };

  return {
    countdown,
    setCountdown,
    countdownRef,
    countdownTimerRef,
    startCountdown,
    cancelCountdown
  };
}
