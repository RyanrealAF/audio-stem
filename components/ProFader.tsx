
interface ProFaderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  color?: "cyan" | "purple";
  level?: number;
}

export const ProFader = ({ label, value, onChange, color = "cyan", level = 0 }: ProFaderProps) => {
  const height = value * 100;
  const meterHeight = level * 100;

  const glowClass = color === "cyan" ? "shadow-[0_0_10px_#06b6d4]" : "shadow-[0_0_10px_#a855f7]";
  const bgColorClass = color === "cyan" ? "bg-cyan-500" : "bg-purple-500";

  return (
    <div className="flex flex-col items-center gap-3" id={`fader-${label.toLowerCase()}`}>
      <div className="h-44 w-12 bg-[#08080a] border border-zinc-800 rounded shadow-inner relative flex justify-center py-2">
        <div className="absolute left-1 inset-y-2 w-1.5 bg-zinc-900 rounded-full flex flex-col-reverse overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`w-full h-1/8 transition-colors duration-75 
                ${meterHeight > (i / 8) * 100 ? (i > 6 ? 'bg-red-500' : i > 4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-transparent'}`
            }></div>
          ))}
        </div>

        <div className="w-[4px] h-full bg-zinc-900 rounded-full overflow-hidden relative">
          <div className={`absolute bottom-0 w-full ${bgColorClass} ${glowClass}`} style={{ height: `${height}%` }} />
        </div>

        <div 
          className="absolute left-1/2 -translate-x-1/2 w-10 h-7 bg-zinc-200 rounded-sm border-b-4 border-zinc-400 cursor-ns-resize shadow-xl z-20 flex items-center justify-center"
          style={{ bottom: `calc(${height}% - 14px)` }} 
        >
          <div className="w-full h-1 bg-zinc-800 mt-0.5"></div> 
        </div>
        
        <input 
          type="range" min="0" max="1" step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
          style={{ appearance: 'slider-vertical' as any }} 
        />
      </div>
      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{label}</span>
      <span className="text-[9px] font-mono text-white/50">{ (20 * Math.log10(value + 0.0001)).toFixed(1) } dB</span>
    </div>
  );
};
