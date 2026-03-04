import axios from "axios";
import toast from "react-hot-toast";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import './CodeField.css';

export function CodeField() {
  const navigate = useNavigate();
  const codeInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [isPairing, setIsPairing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleCodeChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    const lastChar = value.slice(-1).toUpperCase();
    e.target.value = lastChar;
    if (lastChar && index < 5) {
      codeInputsRef.current[index + 1]?.focus();
    }
  };

  const clearCodeInputs = () => {
    codeInputsRef.current.forEach((el) => {
      if (el) el.value = '';
    });
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
      codeInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePair = async () => {
    // validate code
    const enteredCode = codeInputsRef.current
      .map((el) => (el?.value ?? '').trim())
      .join('')
      .toUpperCase();

    if (enteredCode.length !== 6) {
      toast.error('Please enter the 6-character pairing code.');
      return;
    }

    try {
      setIsPairing(true);
      const response = await axios.post(`${API_URL}/devices/pairing/verify`, { code: enteredCode });

      // get token from response and save it
      const deviceToken = response.data?.deviceToken;
      if (!deviceToken) {
        throw new Error('Missing device token in response');
      }
      localStorage.setItem('token', deviceToken);

      clearCodeInputs();

      toast.success('Device paired successfully.');
      navigate('/');
    } catch {
      clearCodeInputs();

      setIsPairing(false);
      toast.error('Pairing failed. Please check the code and try again.');
    }
  };

  return (
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
      <button
        className="login-button login-button-code"
        type="button"
        onClick={handlePair}
        disabled={isPairing}
      >
        pair
      </button>
    </div>
  )
}