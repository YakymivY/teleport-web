import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { SsePayload } from "../types/sse-payload";
import './WaitingScreen.css';

export function WaitingScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Waiting for email confirmation...');

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL;

    // get the session ID from local storage
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return () => {
      toast.error('Session ID not found. Please try again.');
      navigate('/login');
    };

    // create an SSE connection to the backend
    const eventSource = new EventSource(`${API_URL}/auth-sse/sse-verify/${sessionId}`);
    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data) as SsePayload;

      if (parsedData.status === 'verified' && parsedData.token) {
        setStatus('Verified. Redirecting...');

        localStorage.setItem('token', parsedData.token);

        // navigate to main page on success
        setTimeout(() => {
          eventSource.close();
          navigate('/');
        }, 2000)
      } else {
        // close the SSE connection and show an error toast
        setStatus('Verification failed. Please try again.');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setStatus('Connection failed. Please try again.');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [navigate]);

  return (
    <div className="waiting-container">
      <div className="waiting-content">
        <h1 className="waiting-title">{status}</h1>
        <button
          type="button"
          className="waiting-button"
          onClick={() => navigate('/login')}
        >
          back to login
        </button>
      </div>
    </div>
  );
}