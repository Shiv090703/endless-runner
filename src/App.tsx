import { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import { LogOut } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
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
                <span className="cyan">TECH</span>
                <span className="pink">JOURNEY</span>
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
