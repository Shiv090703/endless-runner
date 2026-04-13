import { useState, useEffect } from 'react';
import type { SynergyResult } from '../lib/synergyEngine';
import { fetchLiveNews } from '../lib/newsEngine';
import type { IntelArticle } from '../lib/newsEngine';
import { supabase } from '../lib/supabaseClient';

interface ResultProps {
  score: number;
  aiNodes: number;
  cloudTokens: number;
  securityShields: number;
  coins: number;
  synergy: SynergyResult;
  onRestart: () => void;
  onBackToMenu: () => void;
}

export default function ResultScreen({ score, aiNodes, cloudTokens, securityShields, coins, synergy, onRestart, onBackToMenu }: ResultProps) {
  const [intelFeed, setIntelFeed] = useState<IntelArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  // Lifetime Stats State
  const [lifetimeScore, setLifetimeScore] = useState<number>(score); // default to current run if guest
  const [careerHigh, setCareerHigh] = useState<number>(score);
  const [runsPlayed, setRunsPlayed] = useState<number>(1);
  const [pilotLevel, setPilotLevel] = useState<number>(1);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('runs')
            .select('score')
            .eq('user_id', user.id);
            
          if (!error && data && data.length > 0) {
            const total = data.reduce((acc, run) => acc + run.score, 0);
            const high = Math.max(...data.map(run => run.score));
            const count = data.length;
            const level = Math.floor(total / 5000) + 1;
            
            setLifetimeScore(total);
            setCareerHigh(high);
            setRunsPlayed(count);
            setPilotLevel(level);
          }
        }
      } catch (err) {
        console.error("Failed to load historical data", err);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    async function loadNews() {
      setLoadingNews(true);
      const news = await fetchLiveNews(synergy.title);
      setIntelFeed(news);
      setLoadingNews(false);
    }
    
    if (synergy.title) {
        loadNews();
    }
  }, [synergy.title]);

  const levelProgressStr = ((lifetimeScore % 5000) / 5000) * 100;

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div className="terminal-header">
        Mission_Result
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '40px' }}>
        
        {/* Left Col: Progression & Current Run */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* LIFETIME PROGRESSION PANEL */}
          <div className="glass-panel" style={{ padding: '30px', position: 'relative', overflow: 'hidden' }}>
            {loadingStats ? (
               <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)' }}>Synchronizing Database...</div>
            ) : (
              <>
                <h3 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  PILOT CAREER
                </h3>

                {/* Level Bar */}
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>LEVEL {pilotLevel}</span>
                    <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>{lifetimeScore.toLocaleString()} / {(pilotLevel * 5000).toLocaleString()} XP</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-high)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${levelProgressStr}%`, 
                      height: '100%', 
                      backgroundColor: 'var(--primary)',
                      boxShadow: '0 0 10px var(--primary)', 
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }} />
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                   <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', borderLeft: '2px solid var(--tertiary)' }}>
                     <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem', marginBottom: '4px' }}>CAREER HIGH SCORE</div>
                     <div style={{ color: 'var(--tertiary)', fontSize: '1.8rem', fontFamily: 'var(--font-display)' }}>{careerHigh.toLocaleString()}</div>
                   </div>
                   <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', borderLeft: '2px solid var(--secondary)' }}>
                     <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem', marginBottom: '4px' }}>TOTAL UPLINKS</div>
                     <div style={{ color: 'var(--secondary)', fontSize: '1.8rem', fontFamily: 'var(--font-display)' }}>{runsPlayed}</div>
                   </div>
                </div>
              </>
            )}
          </div>

          {/* THIS RUN ANALYSIS */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h3 style={{ color: 'var(--secondary)', marginBottom: '20px', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              CURRENT_UPLINK STATUS
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
              <div>
                <div className="neon-text-primary" style={{ fontSize: '2.5rem', lineHeight: '1' }}>{score.toLocaleString()} <span style={{fontSize: '0.8rem', color:'var(--on-surface-variant)'}}>PTS</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1, backgroundColor: 'rgba(213, 117, 255, 0.1)', border: '1px solid var(--secondary)', borderRadius: '4px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>{aiNodes}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', marginTop: '4px' }}>AI</div>
              </div>
              <div style={{ flex: 1, backgroundColor: 'rgba(0, 242, 255, 0.1)', border: '1px solid var(--primary)', borderRadius: '4px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>{cloudTokens}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', marginTop: '4px' }}>CLOUD</div>
              </div>
              <div style={{ flex: 1, backgroundColor: 'rgba(255, 89, 228, 0.1)', border: '1px solid var(--tertiary)', borderRadius: '4px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>{securityShields}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--tertiary)', marginTop: '4px' }}>SHIELDS</div>
              </div>
              <div style={{ flex: 1, backgroundColor: 'rgba(255, 213, 0, 0.1)', border: '1px solid #ffd500', borderRadius: '4px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>{coins}</div>
                <div style={{ fontSize: '0.65rem', color: '#ffd500', marginTop: '4px' }}>COINS</div>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '4px', borderLeft: '3px solid var(--primary)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '4px', fontSize: '0.9rem', letterSpacing: '0.05em' }}>{synergy.title}</h4>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                {synergy.description}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
              <button 
                className="btn-primary" 
                onClick={onRestart}
                style={{ flex: 2, padding: '14px' }}
              >
                REBOOT_SEQUENCE
              </button>
              <button 
                className="btn-secondary" 
                onClick={onBackToMenu}
                style={{ flex: 1, padding: '14px', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}
              >
                RETURN_TO_HUB
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Intel Feed */}
        <div>
          <h3 style={{ color: 'var(--on-surface)', marginBottom: '20px', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            INTEL_FEED // <span style={{color: 'var(--primary)'}}>LATEST_UPLOADS</span>
          </h3>
          
          {loadingNews ? (
             <div style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic', padding: '20px', borderLeft: '2px solid var(--outline-variant)' }}>
                Establishing secure connection to global news arrays...
             </div>
          ) : (
            intelFeed.map((article, idx) => (
              <a key={idx} href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div className="intel-card" style={{ marginBottom: '15px' }}>
                  <h4>{article.title}</h4>
                  <p>{article.description}</p>
                </div>
              </a>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
