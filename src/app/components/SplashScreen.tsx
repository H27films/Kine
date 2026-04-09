import React, { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => {
    // Trigger logo animation after a short delay
    setTimeout(() => setLogoReady(true), 100);

    // Show splash for 2.5s to feel intentional
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 400); // wait for fade out
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Logo with scale animation */}
      <img
        src="/KineLogo.svg"
        alt="Kine"
        style={{
          width: logoReady ? 100 : 80,
          height: logoReady ? 100 : 80,
          transition: 'width 2s cubic-bezier(0.22, 1, 0.36, 1), height 2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Circular dot spinner - faster */}
      <div style={{ marginTop: 32, position: 'relative', width: 40, height: 40 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#000000',
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 60}deg) translate(16px, 0)`,
              opacity: 0,
              animation: `dotPulse 0.8s ease-in-out ${i * 0.13}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
