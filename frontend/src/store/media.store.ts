import { create } from 'zustand';

interface MediaState {
  /** Local audio/video stream from getUserMedia */
  localStream: MediaStream | null;
  /** Screen share stream */
  screenStream: MediaStream | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  selectedAudioDeviceId: string | null;
  selectedVideoDeviceId: string | null;
  availableDevices: MediaDeviceInfo[];
  mediaError: string | null;
}

interface MediaActions {
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setMicOn: (on: boolean) => void;
  setCameraOn: (on: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  setSelectedAudioDevice: (deviceId: string) => void;
  setSelectedVideoDevice: (deviceId: string) => void;
  setAvailableDevices: (devices: MediaDeviceInfo[]) => void;
  setMediaError: (error: string | null) => void;
  reset: () => void;
}

const initialState: MediaState = {
  localStream: null,
  screenStream: null,
  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,
  selectedAudioDeviceId: null,
  selectedVideoDeviceId: null,
  availableDevices: [],
  mediaError: null,
};

export const useMediaStore = create<MediaState & MediaActions>((set) => ({
  ...initialState,

  setLocalStream: (stream) => set({ localStream: stream }),
  setScreenStream: (stream) => set({ screenStream: stream }),
  setMicOn: (on) => set({ isMicOn: on }),
  setCameraOn: (on) => set({ isCameraOn: on }),
  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
  setSelectedAudioDevice: (deviceId) => set({ selectedAudioDeviceId: deviceId }),
  setSelectedVideoDevice: (deviceId) => set({ selectedVideoDeviceId: deviceId }),
  setAvailableDevices: (devices) => set({ availableDevices: devices }),
  setMediaError: (error) => set({ mediaError: error }),
  reset: () => set(initialState),
}));
