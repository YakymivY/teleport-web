import axios, { type AxiosError } from 'axios';
import toast from 'react-hot-toast';

// In dev, VITE_API_URL contains "localhost" which resolves to the machine running
// the code — correct in a browser, wrong inside the Android emulator where
// "localhost" means the emulator itself.  Swap it for the actual hostname the
// page was loaded from so the emulator (10.0.2.2) and physical devices (LAN IP)
// can reach the backend running on the dev machine.
export function getApiBaseUrl(): string {
  const configured: string = import.meta.env.VITE_API_URL ?? '';
  const pageHost = window.location.hostname;
  if (pageHost !== 'localhost' && configured.includes('localhost') && !('electronS3' in window)) {
    return configured.replace('localhost', pageHost);
  }
  return configured;
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
});

let isHandling401 = false;

function getErrorMessage(status: number) {
  switch (status) {
    case 400:
      return 'Bad request. Please check your input.';
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return 'You do not have permission for this action.';
    case 404:
      return 'Requested resource was not found.';
    case 429:
      return 'Too many requests. Please try again shortly.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service is temporarily unavailable.';
    default:
      return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const errorMessage = status ? getErrorMessage(status) : null;

    if (status === 401 && !isHandling401 && window.location.pathname !== '/login') {
      isHandling401 = true;
      if (errorMessage) {
        toast.error(errorMessage);
      }
      localStorage.removeItem('token');
      window.location.assign('/login');

      // In case navigation is blocked, allow handling again shortly after.
      window.setTimeout(() => {
        isHandling401 = false;
      }, 1000);
    } else if (errorMessage) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export { apiClient };

