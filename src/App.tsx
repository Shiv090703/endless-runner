import { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import { LogOut, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { calculateSynergy } from './lib/synergyEngine';
import type { SynergyResult } from './lib/synergyEngine';

type ScreenState = 'login' | 'home' | 'game' | 'result';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('login');
  const [stats, setStats] = useState({ score: 0, aiNodes: 0, cloudTokens: 0, securityShields: 0, coins: 0 });
  const [synergy, setSynergy] = useState<SynergyResult>({ title: '', description: '' });
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  // Check auth loop
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user.email);
        setCurrentScreen('home');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserEmail(session.user.email);
        setCurrentScreen('home');
      } else {
        setUserEmail(undefined);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => setCurrentScreen('home');
  const handleStartGame = () => setCurrentScreen('game');
  
  const handleGameOver = async (finalStats: any) => {
    setStats(finalStats);
    
    // Calculate Synergy
    const computedSynergy = calculateSynergy(finalStats.aiNodes, finalStats.cloudTokens, finalStats.securityShields);
    setSynergy(computedSynergy);
    
    // Transition Screen immediately for perceived performance
    setCurrentScreen('result');

    // Asynchronously save to Database
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user ? user.id : null;
        
        const { error } = await supabase.from('runs').insert([{
            user_id: userId,
            score: finalStats.score,
            ai_nodes: finalStats.aiNodes,
            cloud_tokens: finalStats.cloudTokens,
            security_shields: finalStats.securityShields,
            coins: finalStats.coins || 0,
            synergy_focus: computedSynergy.title
        }]);

        if (error) {
            console.error("Failed to save run to Supabase.", error);
        } else {
            console.log("Run safely logged to Supabase.");
        }
    } catch (e) {
        console.error("Database error logic:", e);
    }
  };

  const handleRestart = () => setCurrentScreen('game');
  const handleNavigate = (screen: string) => setCurrentScreen(screen as ScreenState);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUserEmail(undefined);
      setCurrentScreen('login');
      console.log("Session terminated.");
    } catch (e) {
      console.error("Logout error:", e);
      setCurrentScreen('login');
    }
  };

  // Helper renderer
  const renderContent = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onStartGame={handleStartGame} />;
      case 'result':
        return <ResultScreen 
            score={stats.score}
            aiNodes={stats.aiNodes}
            cloudTokens={stats.cloudTokens}
            securityShields={stats.securityShields}
            coins={stats.coins}
            synergy={synergy}
            onRestart={handleRestart}
            onBackToMenu={() => handleNavigate('home')}
          />
      default:
        return null;
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex-center flex-col" style={{ height: '100vh', background: 'var(--surface-lowest)', color: 'var(--on-surface)', padding: '20px', textAlign: 'center' }}>
        <AlertTriangle size={64} color="#ff59e4" style={{ marginBottom: '20px' }} />
        <h1 className="neon-text-primary" style={{ fontSize: '2rem', marginBottom: '10px' }}>UPLINK_FAILURE</h1>
        <p style={{ maxWidth: '400px', opacity: 0.8, lineHeight: 1.6 }}>
          The Neural Interface could not establish a secure connection to the database. 
          Please ensure your <code style={{ color: 'var(--primary)' }}>VITE_SUPABASE_URL</code> and <code style={{ color: 'var(--primary)' }}>VITE_SUPABASE_ANON_KEY</code> are correctly set in your environment configuration.
        </p>
        <div style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.5 }}>ERROR: CONFIG_MISSING_OR_INVALID</div>
      </div>
    );
  }

  return (
    <>
      {currentScreen === 'login' && <LoginScreen onLogin={handleLogin} />}
      {currentScreen === 'game' && <GameScreen onGameOver={handleGameOver} userEmail={userEmail} />}
      
      {(currentScreen === 'home' || currentScreen === 'result') && (
        <div className="full-layout">
          {/* Minimalist Top Header */}
          <header className="app-header">
            <div className="header-left">
              <img src="/logo.png" alt="Logo" className="header-logo" />
              <div className="header-title">
                <span className="cyan">ENDLESS</span>
                <span className="pink">RUNNER</span>
              </div>
            </div>
            
            <div className="header-right">
              {userEmail && (
                <div className="header-pilot">
                  <span className="label">PILOT_ID</span>
                  <span className="name">{userEmail.split('@')[0].toUpperCase()}</span>
                </div>
              )}
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={16} /> 
                <span className="logout-text">LOGOUT</span>
              </button>
            </div>
          </header>

          <div className="main-content">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
