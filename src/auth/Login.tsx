import React, { useRef } from 'react';
import './Login.css';

export function Login() {
  const codeInputsRef = useRef<Array<HTMLInputElement | null>>([]);

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

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-input-row">
          <input className="login-input" type="text" placeholder="email" autoComplete="off" />
          <button className="login-button" type="button">
            Send
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
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}