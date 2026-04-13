import { useEffect, useRef, useState } from 'react';
import { ThreeRunner } from '../game/ThreeRunner';
import type { GameStats } from '../game/ThreeRunner';

interface GameScreenProps {
  onGameOver: (stats: GameStats) => void;
  userEmail?: string;
}

export default function GameScreen({ onGameOver, userEmail }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runnerRef = useRef<ThreeRunner | null>(null);

  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [speed, setSpeed] = useState(12);
  const [multiplier, setMultiplier] = useState(1);
  const [magnetLevel, setMagnetLevel] = useState(0); // 0.0 to 1.0
  const [lives] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const runner = new ThreeRunner(
      canvas,
      (s, c, spd, mult, pw) => {
        setScore(s);
        setCoins(c);
        setSpeed(spd);
        setMultiplier(mult);
        if (pw) setMagnetLevel(pw.magnet);
      },
      (stats: GameStats) => onGameOver(stats)
    );
    runnerRef.current = runner;

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      runner.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      runner.destroy();
      runnerRef.current = null;
    };
  }, [onGameOver]);

  const pilotName = userEmail ? userEmail.split('@')[0].toUpperCase() : 'GHOST';
  const scoreDisplay = String(score).padStart(6, '0');

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>

      {/* Three.js Canvas */}
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* ════════════════════════════════
          TOP LEFT — Pause + Quit + Lives
      ════════════════════════════════ */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Pause button */}
          <div style={{
            width: 48, height: 48,
            background: 'rgba(0,10,30,0.85)',
            border: '2px solid rgba(0,242,255,0.5)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(0,242,255,0.3)',
          }}>
            <span style={{ color: '#00f2ff', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '2px' }}>⏸</span>
          </div>

          {/* Quit button */}
          <div 
            onClick={() => {
              if (window.confirm("Terminate current uplink session? Progress will be logged.")) {
                runnerRef.current?.triggerGameOver();
              }
            }}
            style={{
              width: 48, height: 48,
              background: 'rgba(30,0,0,0.85)',
              border: '2px solid rgba(255,0,0,0.5)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(255,0,0,0.3)',
            }}
          >
            <span style={{ color: '#ff4444', fontSize: '1.2rem', fontWeight: 900 }}>✕</span>
          </div>
        </div>

        {/* Lives */}
        <div style={{
          background: 'rgba(0,10,30,0.85)',
          border: '2px solid rgba(255,89,228,0.4)',
          borderRadius: 10,
          padding: '8px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: 48
        }}>
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} style={{ fontSize: '1.1rem' }}>❤️</span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════
          TOP CENTER — Multiplier + Score
      ════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 12,
      }}>
        {/* Multiplier */}
        <div style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 700,
          fontSize: multiplier > 1 ? '2.4rem' : '1.8rem',
          color: '#ffd500',
          textShadow: '0 0 18px #ffd500, 0 0 40px #ff9900',
          letterSpacing: '0.05em',
          lineHeight: 1,
          transition: 'font-size 0.2s',
        }}>
          ×{multiplier}
        </div>

        {/* Score */}
        <div style={{
          fontFamily: 'Space Grotesk, monospace',
          fontWeight: 700,
          fontSize: '2rem',
          color: '#fff',
          textShadow: '0 0 10px rgba(255,255,255,0.6)',
          letterSpacing: '0.12em',
        }}>
          {scoreDisplay}
        </div>
      </div>

      {/* ════════════════════════════════
          TOP RIGHT — Pilot + Coins
      ════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 16, right: 16, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      }}>
        {/* Avatar panel */}
        <div style={{
          background: 'rgba(0,10,30,0.85)',
          border: '2px solid rgba(213,117,255,0.4)',
          borderRadius: 12,
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          minWidth: 130,
          boxShadow: '0 0 16px rgba(213,117,255,0.2)',
        }}>
          {/* Avatar circle */}
          <div style={{
            width: 40, height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0011ff, #d575ff)',
            border: '2px solid #d575ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: '#fff',
            fontFamily: 'Space Grotesk, sans-serif',
            flexShrink: 0,
          }}>
            {pilotName.slice(0, 2)}
          </div>
          <div>
            <div style={{ color: 'rgba(213,117,255,0.7)', fontSize: '0.6rem', letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif' }}>PILOT</div>
            <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pilotName}
            </div>
          </div>
        </div>

        {/* Coins badge */}
        <div style={{
          background: 'rgba(0,10,30,0.85)',
          border: '2px solid rgba(255,213,0,0.5)',
          borderRadius: 10,
          padding: '6px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 0 14px rgba(255,213,0,0.25)',
        }}>
          <span style={{ fontSize: '1.2rem' }}>🪙</span>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700, fontSize: '1.3rem',
            color: '#ffd500',
            textShadow: '0 0 10px #ffd500',
          }}>
            {coins}
          </span>
        </div>
      </div>

      {/* ════════════════════════════════
          BOTTOM LEFT — Power-up Slots
      ════════════════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 20, left: 16, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* Magnet Slot */}
        <div style={{
          width: 64, height: 64,
          background: magnetLevel > 0 ? 'rgba(0,10,20,0.9)' : 'rgba(0,0,0,0.4)',
          border: magnetLevel > 0 ? '2px solid #00f2ff' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: magnetLevel > 0 ? '0 0 20px rgba(0,242,255,0.4)' : 'none',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <span style={{ fontSize: '1.8rem', filter: magnetLevel > 0 ? 'none' : 'grayscale(1) opacity(0.3)' }}>⚡</span>
          {magnetLevel > 0 && (
            <div style={{
              position: 'absolute', bottom: -10, left: 0, width: '100%', height: 4,
              background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden'
            }}>
              <div style={{
                width: `${magnetLevel * 100}%`, height: '100%',
                background: 'linear-gradient(90deg, #00f2ff, #0055ff)',
                boxShadow: '0 0 8px #00f2ff'
              }} />
            </div>
          )}
        </div>

        {/* Placeholder Slot */}
        <div style={{
          width: 54, height: 54,
          background: 'rgba(0,0,0,0.2)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.4
        }}>
          <span style={{ fontSize: '1.2rem', filter: 'grayscale(1)' }}>🛡️</span>
        </div>
      </div>

      {/* ════════════════════════════════
          BOTTOM CENTER — Controls Guide
      ════════════════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, display: 'flex', gap: 12, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {[
          { key: '◀', label: 'LEFT', color: '#d575ff' },
          { key: '▲', label: 'JUMP', color: '#00f2ff' },
          { key: '▼', label: 'SLIDE', color: '#ff59e4' },
          { key: '▶', label: 'RIGHT', color: '#d575ff' },
        ].map(({ key, label, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              background: 'rgba(0,5,20,0.75)',
              border: `1px solid ${color}55`,
              borderRadius: 8,
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', color,
              boxShadow: `0 0 8px ${color}44`,
            }}>{key}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.5rem', letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════
          BOTTOM RIGHT — Obstacle Legend
      ════════════════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 20,
        background: 'rgba(0,5,20,0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '10px 14px',
        pointerEvents: 'none',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.55rem', letterSpacing: '0.15em', marginBottom: 8, fontFamily: 'Space Grotesk, sans-serif' }}>HAZARDS</div>
        {[
          { emoji: '🧱', name: 'Barrier', action: 'JUMP ▲', color: '#ff0088' },
          { emoji: '⚡', name: 'Laser',   action: 'SLIDE ▼', color: '#00f2ff' },
          { emoji: '🐛', name: 'Bug',     action: 'DODGE ◀▶', color: '#ff59e4' },
        ].map(({ emoji, name, action, color }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: '0.9rem' }}>{emoji}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', minWidth: 44 }}>{name}</span>
            <span style={{ color, fontSize: '0.6rem', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.06em' }}>{action}</span>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════
          SPEED TRAIL INDICATOR (Left mid)
      ════════════════════════════════ */}
      <div style={{
        position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
        zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'none',
      }}>
        <span style={{ color: 'rgba(213,117,255,0.5)', fontSize: '0.5rem', letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SPEED</span>
        <div style={{ width: 5, height: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(213,117,255,0.2)', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
          <div style={{
            width: '100%',
            height: `${Math.min(100, ((speed - 12) / 30) * 100)}%`,
            background: 'linear-gradient(to top, #ff0088, #d575ff, #00f2ff)',
            boxShadow: '0 0 8px #d575ff',
            transition: 'height 0.4s',
            borderRadius: 2,
          }} />
        </div>
      </div>

    </div>
  );
}
