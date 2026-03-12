import { Disc } from 'lucide-react';

interface OrbKnobProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  color?: "cyan" | "purple";
  active?: boolean;
}

export const OrbKnob = ({ label, value, onChange, color = "cyan", active = false }: OrbKnobProps) => {
  const rotation = (value / 1) * 270 - 135; 
  const glow = active ? (color === "cyan" ? "0 0 30px #06b6d4" : "0 0 30px #a855f7") : "none";
  const borderColor = active ? (color === "cyan" ? "#06b6d4" : "#a855f7") : "#27272a";
  
  const handleClick = () => {
    let newValue;
    if (value < 0.35) newValue = 0.5;
    else if (value < 0.65) newValue = 0.8;
    else newValue = 0.2;
    onChange(newValue);
  };

  return (
    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleClick} id={`orb-knob-${label.toLowerCase()}`}>
      <div 
        className="relative w-20 h-20 rounded-full bg-[#121214] border-2 flex items-center justify-center transition-all duration-300"
        style={{ boxShadow: glow, borderColor: borderColor }}
      >
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color === 'cyan' ? 'from-cyan-500/20 to-cyan-900/40' : 'from-purple-500/20 to-purple-900/40'} border border-white/5 flex items-center justify-center`}>
           <Disc size={20} className={active ? 'animate-spin-slow text-white' : 'text-zinc-700'} />
        </div>
        <div 
          className="absolute w-1 h-3 bg-white rounded-full transition-transform duration-75 ease-out" 
          style={{ transform: `rotate(${rotation}deg) translateY(-28px)`, transformOrigin: 'bottom center' }} 
        />
      </div>
      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className="text-[9px] font-mono text-cyan-800">{ (value * 100).toFixed(0) }%</span>
    </div>
  );
};
