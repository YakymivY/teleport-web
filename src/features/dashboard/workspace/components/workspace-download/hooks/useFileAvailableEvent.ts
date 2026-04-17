import { useEffect } from 'react';
import { getSocket } from '../../../../../../api/socket';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse';

export function useFileAvailableEvent(onFile: (file: FileTransferResponse) => void) {
  useEffect(() => {
    const socket = getSocket();
    socket.on('file:available', onFile);
    return () => {
      socket.off('file:available', onFile);
    };
  }, [onFile]);
}
