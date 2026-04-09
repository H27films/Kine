import React, { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Show splash for at least 1.5s to feel intentional
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 400); // wait for fade out
    }, 1500);
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
      {/* Logo */}
      <h1
        style={{
          fontSize: '3rem',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: '#000000',
          margin: 0,
          lineHeight: 1,
        }}
      >
        KINE
      </h1>

      {/* 3-dot bounce animation */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#000000',
              animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.3;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
