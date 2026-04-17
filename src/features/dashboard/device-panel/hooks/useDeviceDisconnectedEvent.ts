import { useEffect } from 'react';
import { getSocket } from '../../../../api/socket';

export function useDeviceDisconnectedEvent(onDisconnected: (id: string) => void) {
  useEffect(() => {
    const socket = getSocket();
    const handler = ({ id }: { id: string }) => onDisconnected(id);
    socket.on('device:disconnected', handler);
    return () => {
      socket.off('device:disconnected', handler);
    };
  }, [onDisconnected]);
}
