import { create } from 'zustand';

interface SelectedDeviceStoreState {
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
}

export const useSelectedDeviceStore = create<SelectedDeviceStoreState>((set) => ({
  selectedDeviceId: null,
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),
}));
