import { useEffect, useState } from "react";

export function LoadingDots () {

  const [dots, setDots] = useState('');
    
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500); // Change dot every 500ms

    return () => clearInterval(interval);
  }, []);

  return <span style={{ display: 'inline-block', width: '24px' }}>{dots}</span>;
    
}