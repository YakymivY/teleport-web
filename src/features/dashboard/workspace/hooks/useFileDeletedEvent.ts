import { useEffect } from 'react';
import { getSocket } from '../../../../api/socket';

export function useFileDeletedEvent(onDeleted: (id: string) => void) {
  useEffect(() => {
    const socket = getSocket();
    const handler = ({ id }: { id: string }) => onDeleted(id);
    socket.on('file:deleted', handler);
    return () => {
      socket.off('file:deleted', handler);
    };
  }, [onDeleted]);
}
