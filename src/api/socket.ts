import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from './apiClient';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(getApiBaseUrl(), { auth: { token } });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
