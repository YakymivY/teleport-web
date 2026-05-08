import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SelectedDeviceStoreState {
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  selectedDeviceName: string | null;
  setSelectedDeviceName: (name: string | null) => void;
}

export const useSelectedDeviceStore = create<SelectedDeviceStoreState>()(
  persist(
    (set) => ({
      selectedDeviceId: null,
      setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),
      selectedDeviceName: null,
      setSelectedDeviceName: (name) => set({ selectedDeviceName: name }),
    }),
    { name: 'selected-device' },
  ),
);
