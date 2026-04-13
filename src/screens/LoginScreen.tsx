import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; 

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const [fadeIntro, setFadeIntro] = useState(false);

  useEffect(() => {
    // Show intro for 3 seconds, then start fading it out
    const timer1 = setTimeout(() => {
      setFadeIntro(true);
    }, 3000);

    // After fade-out animation completes, remove intro from DOM
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
      });
      if (error) throw error;
      // Note: Supabase will redirect the page to Google, and back to this app with a session
    } catch (error) {
      console.error("Auth error:", error);
      // Fallback for development if OAuth is not configured on Supabase Dashboard yet
      console.warn("Falling back to Guest Mode.");
      onLogin(); 
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

      {/* Main Login Interface (appears after intro fades) */}
      {!showIntro && (
        <div className="glass-panel animate-fade-in" style={{ padding: '50px 40px', textAlign: 'center', maxWidth: '420px', width: '90%' }}>
          
          <h1 className="neon-text-primary" style={{ marginBottom: '15px', fontSize: '2.5rem' }}>Tech Journey</h1>
          
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '40px', lineHeight: '1.6' }}>
            Initialize your neural interface to access the main sequence protocol.
          </p>
          
          {/* Real Google Login Button connecting to Supabase */}
          <button 
            onClick={handleGoogleLogin}
            style={{ 
              width: '100%', 
              marginBottom: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              backgroundColor: '#ffffff',
              color: '#3c4043',
              border: '1px solid #dadce0',
              padding: '12px 16px',
              borderRadius: '8px',
              fontFamily: '"Google Sans", var(--font-body)',
              fontWeight: 500,
              letterSpacing: 'normal',
              textTransform: 'none',
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3)'
            }}
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            Sign in with Google
          </button>

          {/* Guest Mode Fallback */}
          <button 
            className="btn-primary"
            onClick={onLogin}
            style={{ 
              width: '100%', 
              padding: '16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--outline-variant)',
              color: 'var(--on-surface-variant)'
            }}
          >
            PROCEED_AS_GUEST // NO_UPLINK
          </button>

          <div style={{ marginTop: '30px', fontSize: '0.85rem', color: 'var(--outline-variant)' }}>
            <span style={{ cursor: 'pointer', margin: '0 10px' }}>Privacy</span> | 
            <span style={{ cursor: 'pointer', margin: '0 10px' }}>Terms</span> | 
            <span style={{ cursor: 'pointer', margin: '0 10px' }}>Changelog</span>
          </div>

        </div>
      )}
    </div>
  );
}
