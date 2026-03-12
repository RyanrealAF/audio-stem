import { LucideIcon } from 'lucide-react';

interface ThresholdKnobProps {
  label: string;
  icon: LucideIcon;
  value: number;
  onChange: (val: number) => void;
}

export const ThresholdKnob = ({ label, icon: Icon, value, onChange }: ThresholdKnobProps) => {
  const rotation = (value / 1) * 270 - 135; 
  return (
    <div className="flex flex-col items-center gap-2" id={`threshold-${label.toLowerCase()}`}>
      <div className="relative w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
        <Icon size={14} className={value > 0.5 ? "text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "text-zinc-600"} />
        <div 
          className="absolute w-1 h-3 bg-zinc-700 rounded-full transition-transform duration-75 ease-out" 
          style={{ transform: `rotate(${rotation}deg) translateY(-14px)`, transformOrigin: 'bottom center' }} 
        />
        <input 
          type="range" min="0" max="1" step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-mono text-cyan-800">{(value * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};
