import axios from "axios";
import toast from "react-hot-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import './EmailField.css';

export function EmailField() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(false);
    }
  };

  const handleEmailSend = async () => {
    // validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setEmailError(true);
      return;
    }

    try {
      setIsSending(true);

      // generate a new session ID if one doesn't exist and save it
      const sessionId = localStorage.getItem('sessionId') || uuidv4();
      localStorage.setItem('sessionId', sessionId);

      const response = await axios.post(`${API_URL}/auth/magic-link`, { email: trimmedEmail, sessionId });
      if (response.status === 201) {
        toast.success('Magic link has been sent to your email.');
        setEmail('');
        navigate('/waiting');
      }
    } catch (error) {
      setIsSending(false);
      setEmail('');
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setEmailError(true);
      } else {
        toast.error('An unexpected error occurred while sending the magic link.');
      }
    }
  };

  return (
    <div className="login-input-row">
      <input
        className={`login-input${emailError ? ' login-input-error' : ''}`}
        type="text"
        placeholder="email"
        autoComplete="off"
        value={email}
        onChange={handleEmailChange}
      />
      <button
        className="login-button"
        type="button"
        onClick={handleEmailSend}
        disabled={isSending}
      >
        send
      </button>
    </div>
  )
}