import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import { Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const [fadeIntro, setFadeIntro] = useState(false);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show intro for 3 seconds, then start fading it out
    const timer1 = setTimeout(() => {
      setFadeIntro(true);
    }, 3000);

    const timer2 = setTimeout(() => {
      setShowIntro(false);
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ text: error.message || "OAuth connection failed", type: 'error' });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: "Registration successful! Please check your email for verification.", type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin();
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ text: "Please enter your email address first.", type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage({ text: "Password reset link sent to your email!", type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center flex-col" style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      
      {/* Intro Animation Layer */}
      {showIntro && (
        <div 
          className={`flex-center flex-col ${fadeIntro ? 'animate-fade-out' : ''}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--surface-low)', zIndex: 100 }}
        >
          <div className="intro-text-glow">ENDLESS<br/>RUNNER</div>
          <div style={{ color: 'var(--primary)', marginTop: '20px', letterSpacing: '0.2em' }}>TECH JOURNEY</div>
        </div>
      )}

      {/* Main Login Interface */}
      {!showIntro && (
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center', maxWidth: '440px', width: '90%' }}>
          
          <h1 className="neon-text-primary" style={{ marginBottom: '10px', fontSize: '2.5rem' }}>Endless Runner</h1>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '30px', fontSize: '0.9rem' }}>
            {isSignUp ? 'Initialize new neural signature' : 'Enter access credentials to sync state'}
          </p>

          {message && (
            <div className={`auth-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleEmailAuth}>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--on-surface-variant)' }} />
              <input 
                type="email" 
                placeholder="EMAIL_ADDRESS"
                className="neon-input"
                style={{ paddingLeft: '44px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--on-surface-variant)' }} />
              <input 
                type="password" 
                placeholder="ENCRYPTED_PASSWORD"
                className="neon-input"
                style={{ paddingLeft: '44px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {!isSignUp && (
              <span className="forgot-password-link" onClick={handleForgotPassword}>
                FORGOT_PASSWORD?
              </span>
            )}

            <button 
              type="submit"
              className="btn-primary" 
              style={{ width: '100%', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              disabled={loading}
            >
              {loading ? 'PROCESSING...' : (isSignUp ? <><UserPlus size={18}/> INITIALIZE_UPLINK</> : <><LogIn size={18}/> SECURE_LOGIN</>)}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--outline-variant)' }}>
            <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
            <span style={{ margin: '0 15px', fontSize: '0.7rem' }}>OR_OAUTH</span>
            <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: 'var(--on-surface)',
              border: '1px solid var(--outline-variant)',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            Sign in with Google
          </button>

          <div className="auth-toggle-container">
            {isSignUp ? "Already have a neural signature?" : "New to the grid?"}
            <span className="auth-link" onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}>
              {isSignUp ? 'ACCESS_ACCOUNT' : 'CREATE_UPLINK'}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
