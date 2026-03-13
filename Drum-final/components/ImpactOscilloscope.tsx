import { useRef, useEffect } from 'react';

interface ImpactOscilloscopeProps {
  active: boolean;
  color: string;
  analyser: AnalyserNode | null;
}

export const ImpactOscilloscope = ({ active, color, analyser }: ImpactOscilloscopeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const dataArray = analyser ? new Uint8Array(analyser.fftSize) : null;

    const render = () => {
      ctx.fillStyle = '#0a0a0c'; 
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      ctx.strokeStyle = '#1a1a1e'; 
      ctx.lineWidth = 0.5; 
      for (let y = 0; y < rect.height; y += rect.height / 8) { 
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
      }
      for (let x = 0; x < rect.width; x += rect.width / 16) { 
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
      }

      if (active && analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray); 
        
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 10; 
        ctx.shadowColor = color;
        
        const midY = rect.height / 2;
        const sliceWidth = rect.width * 1.0 / dataArray.length; 
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0; 
          const y = (v - 1) * midY * 0.9 + midY; 

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0; 
      }
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [active, color, analyser]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};
