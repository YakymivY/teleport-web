import { useEffect } from 'react';
import { getSocket, disconnectSocket } from '../../../api/socket';

export function useSocketConnection() {
  useEffect(() => {
    getSocket();
    return () => {
      disconnectSocket();
    };
  }, []);
}
