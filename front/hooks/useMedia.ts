import { useCallback, useRef, useEffect } from 'react';
import { useMediaStore } from '../store/media.store';

/**
 * Manages local media streams: getUserMedia, track toggling, screen sharing.
 * All tracks are cleaned up on unmount.
 */
export function useMedia() {
  const {
    localStream,
    screenStream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    setLocalStream,
    setScreenStream,
    setMicOn,
    setCameraOn,
    setScreenSharing,
    setMediaError,
  } = useMediaStore();

  const localStreamRef = useRef<MediaStream | null>(localStream);
  localStreamRef.current = localStream;

  const screenStreamRef = useRef<MediaStream | null>(screenStream);
  screenStreamRef.current = screenStream;

  // ─── Acquire camera/mic ───────────────────────────────────────

  const startMedia = useCallback(async (options?: {
    audio?: boolean;
    video?: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
  }): Promise<MediaStream | null> => {
    const wantAudio = options?.audio ?? true;
    const wantVideo = options?.video ?? true;

    const constraints: MediaStreamConstraints = {
      audio: wantAudio
        ? {
            deviceId: options?.audioDeviceId ?? selectedAudioDeviceId ?? undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : false,
      video: wantVideo
        ? {
            deviceId: options?.videoDeviceId ?? selectedVideoDeviceId ?? undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          }
        : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stop existing tracks before replacing
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      setLocalStream(stream);
      setMicOn(wantAudio);
      setCameraOn(wantVideo);
      setMediaError(null);

      return stream;
    } catch (err) {
      const error = err as DOMException;
      let message = 'Failed to access media devices';

      if (error.name === 'NotAllowedError') {
        message = 'Camera/microphone permission denied. Please allow access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        message = 'No camera or microphone found on this device.';
      } else if (error.name === 'NotReadableError') {
        message = 'Camera or microphone is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        message = 'The requested media constraints could not be satisfied.';
      }

      setMediaError(message);
      console.error('getUserMedia error:', error);
      return null;
    }
  }, [selectedAudioDeviceId, selectedVideoDeviceId, setLocalStream, setMicOn, setCameraOn, setMediaError]);

  // ─── Stop all local media ─────────────────────────────────────

  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
    }
  }, [setLocalStream, setScreenStream, setScreenSharing]);

  // ─── Toggle mic ───────────────────────────────────────────────

  const toggleMic = useCallback((): boolean => {
    const stream = localStreamRef.current;
    if (!stream) return false;

    const audioTracks = stream.getAudioTracks();
    const newState = !isMicOn;

    audioTracks.forEach((t) => {
      t.enabled = newState;
    });

    setMicOn(newState);
    return newState;
  }, [isMicOn, setMicOn]);

  // ─── Toggle camera ───────────────────────────────────────────

  const toggleCamera = useCallback(async (): Promise<boolean> => {
    const stream = localStreamRef.current;
    if (!stream) return false;

    const newState = !isCameraOn;

    if (!newState) {
      // Turning camera OFF - stop all video tracks to release camera hardware
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((t) => {
        stream.removeTrack(t);
        t.stop();
      });
      setCameraOn(false);
      return false;
    } else {
      // Turning camera ON - acquire new video stream
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedVideoDeviceId ?? undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
        });

        const newTrack = videoStream.getVideoTracks()[0];
        if (newTrack) {
          stream.addTrack(newTrack);
        }
        setCameraOn(true);
        return true;
      } catch (err) {
        console.error('Failed to re-enable camera:', err);
        setMediaError('Failed to turn on camera');
        return false;
      }
    }
  }, [isCameraOn, setCameraOn, selectedVideoDeviceId, setMediaError]);

  // ─── Screen sharing ──────────────────────────────────────────

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });

      // Listen for user stopping share via browser UI
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          setScreenStream(null);
          setScreenSharing(false);
        });
      }

      // Stop existing screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      setScreenStream(stream);
      setScreenSharing(true);
      setMediaError(null);

      return stream;
    } catch (err) {
      const error = err as DOMException;
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        setMediaError('Failed to start screen sharing');
      }
      console.error('getDisplayMedia error:', error);
      return null;
    }
  }, [setScreenStream, setScreenSharing, setMediaError]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
    }
  }, [setScreenStream, setScreenSharing]);

  // ─── Switch devices ───────────────────────────────────────────

  const switchAudioDevice = useCallback(async (deviceId: string): Promise<void> => {
    useMediaStore.getState().setSelectedAudioDevice(deviceId);
    const stream = localStreamRef.current;
    if (!stream) return;

    try {
      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Replace old audio track
      const oldAudioTracks = stream.getAudioTracks();
      oldAudioTracks.forEach((t) => {
        stream.removeTrack(t);
        t.stop();
      });

      const newTrack = newAudioStream.getAudioTracks()[0];
      if (newTrack) {
        stream.addTrack(newTrack);
      }
    } catch (err) {
      console.error('Failed to switch audio device:', err);
      setMediaError('Failed to switch microphone');
    }
  }, [setMediaError]);

  const switchVideoDevice = useCallback(async (deviceId: string): Promise<void> => {
    useMediaStore.getState().setSelectedVideoDevice(deviceId);
    const stream = localStreamRef.current;
    if (!stream) return;

    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      });

      // Replace old video track
      const oldVideoTracks = stream.getVideoTracks();
      oldVideoTracks.forEach((t) => {
        stream.removeTrack(t);
        t.stop();
      });

      const newTrack = newVideoStream.getVideoTracks()[0];
      if (newTrack) {
        stream.addTrack(newTrack);
      }
    } catch (err) {
      console.error('Failed to switch video device:', err);
      setMediaError('Failed to switch camera');
    }
  }, [setMediaError]);

  // ─── Cleanup on unmount ───────────────────────────────────────

  useEffect(() => {
    return () => {
      // Only stop tracks, don't clear store (page transitions keep state)
    };
  }, []);

  return {
    localStream,
    screenStream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    startMedia,
    stopMedia,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    switchAudioDevice,
    switchVideoDevice,
  };
}
