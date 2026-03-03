import axios from 'axios';
import toast from 'react-hot-toast';
import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Login.css';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const codeInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailError, setEmailError] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleCodeChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    const lastChar = value.slice(-1).toUpperCase();
    e.target.value = lastChar;
    if (lastChar && index < 5) {
      codeInputsRef.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
      codeInputsRef.current[index - 1]?.focus();
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(false);
    }
  };

  const handleEmailSend = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setEmailError(true);
      return;
    }

    try {
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
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setEmailError(true);
      } else {
        toast.error('An unexpected error occurred while sending the magic link.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-input-row">
          <input
            className={`login-input${emailError ? ' login-input-error' : ''}`}
            type="text"
            placeholder="email"
            autoComplete="off"
            value={email}
            onChange={handleEmailChange}
          />
          <button className="login-button" type="button" onClick={handleEmailSend}>
            send
          </button>
        </div>
        <p className="login-or">- or -</p>
        <div className="login-code-row">
          <div className="login-code-container">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                ref={(el) => {
                  codeInputsRef.current[index] = el;
                }}
                className="login-code-input"
                type="text"
                inputMode="text"
                maxLength={1}
                onChange={(e) => handleCodeChange(index, e)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
              />
            ))}
          </div>
          <button className="login-button login-button-code" type="button">
            verify
          </button>
        </div>
      </div>
    </div>
  );
}