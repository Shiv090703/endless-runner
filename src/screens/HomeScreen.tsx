import { useEffect, useState } from 'react';

export default function HomeScreen({ onStartGame }: { onStartGame: () => void }) {
  const [stars, setStars] = useState<{ x: number; y: number; size: number; opacity: number }[]>([]);

  useEffect(() => {
    setStars(Array.from({ length: 60 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.3,
    })));
  }, []);

  return (
    <div style={{
      width: '100%', minHeight: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at 50% 70%, #0a0a2a 0%, #000008 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      overflowX: 'hidden',
    }}>

      {/* Star field */}
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: '#fff', opacity: s.opacity, pointerEvents: 'none',
        }} />
      ))}

      {/* === LOGO === */}
      <div style={{
        position: 'relative', marginBottom: '36px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <img
          src="/logo.png"
          alt="Endless Runner"
          style={{
            width: 'min(480px, 90vw)',
            height: 'auto',
            borderRadius: '18px',
            boxShadow: `
              0 0 30px rgba(0,242,255,0.3),
              0 0 60px rgba(213,117,255,0.2),
              0 0 100px rgba(0,0,255,0.15)
            `,
            filter: 'drop-shadow(0 0 20px #00f2ff44)',
          }}
          draggable={false}
        />
        {/* Glow reflection under logo */}
        <div style={{
          width: 'min(400px, 80vw)', height: '6px',
          marginTop: '8px',
          background: 'radial-gradient(ellipse, rgba(0,242,255,0.35) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }} />
      </div>

      {/* === START BUTTON === */}
      <button
        onClick={onStartGame}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: '1.4rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#000',
          background: 'linear-gradient(90deg, #00f2ff, #00aaff, #00f2ff)',
          backgroundSize: '200%',
          border: 'none',
          borderRadius: '8px',
          padding: '18px 56px',
          cursor: 'pointer',
          boxShadow: '0 0 20px rgba(0,242,255,0.6), 0 0 40px rgba(0,242,255,0.3)',
          animation: 'btn-pulse 2.5s ease-in-out infinite',
          marginBottom: '32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        ▶ &nbsp; START RUN
      </button>

      {/* === CONTROLS GRID === */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '12px',
        marginBottom: '28px',
      }}>
        {[
          { key: '◀', label: 'Lane Left',  color: '#d575ff' },
          { key: '▲', label: 'Jump',        color: '#00f2ff' },
          { key: '▼', label: 'Slide',       color: '#ff59e4' },
          { key: '▶', label: 'Lane Right',  color: '#d575ff' },
        ].map(({ key, label, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'rgba(0,5,30,0.8)',
              border: `2px solid ${color}66`,
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', color,
              boxShadow: `0 0 10px ${color}44`,
              fontFamily: 'monospace',
            }}>
              {key}
            </div>
            <span style={{
              color: 'rgba(255,255,255,0.45)', fontSize: '0.58rem',
              letterSpacing: '0.08em', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase',
            }}>{label}</span>
          </div>
        ))}
      </div>

      {/* === TOKEN LEGEND === */}
      <div style={{
        display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: '500px',
      }}>
        {[
          { color: '#ffd500', label: 'Coin',     emoji: '🪙', tip: '+300' },
          { color: '#0078d4', label: 'Azure',     emoji: '🔷', tip: '+1000' },
          { color: '#00b4d8', label: 'Cloud',     emoji: '☁️' , tip: '+1000' },
          { color: '#3fcf8e', label: 'Supabase',  emoji: '💎', tip: '+1000' },
          { color: '#512bd4', label: '.NET',       emoji: '🟣', tip: '+1000' },
        ].map(({ color, label, emoji, tip }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: `${color}11`,
            border: `1px solid ${color}44`,
            borderRadius: '8px',
            padding: '6px 10px',
          }}>
            <span style={{ fontSize: '1rem' }}>{emoji}</span>
            <div>
              <div style={{ color, fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>{label}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', fontFamily: 'Space Grotesk, sans-serif' }}>{tip}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Animation keyframe injected via style tag */}
      <style>{`
        @keyframes btn-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0,242,255,0.6), 0 0 40px rgba(0,242,255,0.3); }
          50% { box-shadow: 0 0 30px rgba(0,242,255,0.9), 0 0 60px rgba(0,242,255,0.5), 0 0 80px rgba(0,100,255,0.3); }
        }
      `}</style>
    </div>
  );
}
