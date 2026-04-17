import { useEffect } from 'react';
import { getSocket } from '../../../../api/socket';
import type { UserDeviceDto } from '../types/types';

export function useDeviceConnectedEvent(onConnected: (device: UserDeviceDto) => void) {
  useEffect(() => {
    const socket = getSocket();
    socket.on('device:connected', onConnected);
    return () => {
      socket.off('device:connected', onConnected);
    };
  }, [onConnected]);
}
