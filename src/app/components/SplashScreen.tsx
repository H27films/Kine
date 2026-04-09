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
      <img
        src="/KineLogo.svg"
        alt="Kine"
        style={{
          width: 100,
          height: 100,
        }}
      />

      {/* Circular dot spinner - dots fade in sequence */}
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
              animation: `dotPulse 1.5s ease-in-out ${i * 0.25}s infinite`,
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
