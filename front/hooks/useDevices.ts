import { useCallback, useEffect, useRef } from 'react';
import { useMediaStore } from '../store/media.store';

/**
 * Enumerates available media devices.
 * Re-enumerates on devicechange events.
 */
export function useDevices() {
  const setAvailableDevices = useMediaStore((s) => s.setAvailableDevices);
  const availableDevices = useMediaStore((s) => s.availableDevices);
  const isMountedRef = useRef(true);

  const enumerate = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (isMountedRef.current) {
        setAvailableDevices(devices);
      }
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }, [setAvailableDevices]);

  useEffect(() => {
    isMountedRef.current = true;
    void enumerate();

    const handler = () => void enumerate();
    navigator.mediaDevices.addEventListener('devicechange', handler);

    return () => {
      isMountedRef.current = false;
      navigator.mediaDevices.removeEventListener('devicechange', handler);
    };
  }, [enumerate]);

  const audioInputs = availableDevices.filter((d) => d.kind === 'audioinput');
  const videoInputs = availableDevices.filter((d) => d.kind === 'videoinput');
  const audioOutputs = availableDevices.filter((d) => d.kind === 'audiooutput');

  return {
    audioInputs,
    videoInputs,
    audioOutputs,
    enumerate,
  };
}
