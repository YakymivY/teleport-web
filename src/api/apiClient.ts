import axios, { type AxiosError } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

let isHandling401 = false;

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
    if (error.response?.status === 401 && !isHandling401) {
      isHandling401 = true;
      localStorage.removeItem('token');
      window.location.assign('/login');

      // In case navigation is blocked, allow handling again shortly after.
      window.setTimeout(() => {
        isHandling401 = false;
      }, 1000);
    }

    return Promise.reject(error);
  }
);

export { apiClient };

