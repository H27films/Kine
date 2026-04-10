import React, { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [logoVisible, setLogoVisible] = useState(false);

  useEffect(() => {
    // Trigger logo fade-in after a short delay
    setTimeout(() => setLogoVisible(true), 200);

    // Show splash for 2.0s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 400); // wait for fade out
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Logo with smooth fade-in */}
      <div style={{ opacity: logoVisible ? 1 : 0, transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <img src="/KineLogo.svg" alt="Kine" style={{ width: 100, height: 100 }} />
      </div>

      {/* Spinner - container stays fixed, dots pulse in sequence */}
      <div style={{ marginTop: 32, position: 'relative', width: 24, height: 24 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 60}deg) translate(10px, 0)`,
              animation: `dotChase 0.8s ease-in-out ${i * 0.08}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dotChase {
          0% { opacity: 0.1; }
          50% { opacity: 1; }
          100% { opacity: 0.1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
