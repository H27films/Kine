import React, { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [dots, setDots] = useState<{ x: number; y: number; opacity: number }[]>([]);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [logoScale, setLogoScale] = useState(0.5);
  const [fadeOut, setFadeOut] = useState(false);

  const dotCount = 8;

  useEffect(() => {
    // Animate dots converging - 1.5s duration
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const progress = Math.min(1, frame / 90);
      const eased = 1 - Math.pow(1 - progress, 3);

      const newDots = [];
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2 + frame * 0.06;
        const radius = 120 * (1 - eased);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const opacity = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1;
        newDots.push({ x, y, opacity });
      }
      setDots(newDots);

      // Logo appears at 1.3s, intertwined with spiral ending
      if (frame >= 78 && logoOpacity === 0) {
        setLogoOpacity(1);
        setLogoScale(1);
      }

      if (frame >= 90) {
        clearInterval(interval);
        // Logo holds longer on screen
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onComplete, 500);
        }, 1200);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: fadeOut ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Spiral dot convergence */}
      <div style={{ position: 'relative', width: 0, height: 0 }}>
        {dots.map((dot, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: i < 4 ? 5 : 3,
              height: i < 4 ? 5 : 3,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              left: dot.x,
              top: dot.y,
              transform: 'translate(-50%, -50%)',
              opacity: dot.opacity,
              boxShadow: `0 0 ${4 + dot.x * 0.1}px rgba(255,255,255,0.4)`,
            }}
          />
        ))}
      </div>

      {/* Kine logo - appears intertwined with spiral ending */}
      <div
        style={{
          position: 'absolute',
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'opacity, transform',
        }}
      >
        <img
          src="/KineLogo.svg"
          alt="Kine"
          style={{
            width: 160,
            height: 160,
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.12))',
          }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
