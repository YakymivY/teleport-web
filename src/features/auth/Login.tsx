import { EmailField } from './components/email-button/EmailField';
import { CodeField } from './components/code-button/CodeField';
import './Login.css';

export function Login() {
  return (
    <div className="login-container">
      <div className="login-content">
        <EmailField />
        <p className="login-or">- or -</p>
        <CodeField />
      </div>
    </div>
  );
}