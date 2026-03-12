import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Zap, 
  Disc,
  Settings,
  Waves,
  Mic2,
  Music,
  Activity as BassIcon,
  Play,
  Square,
  AlertCircle
} from 'lucide-react';
import { PipelineStage, TranscriptionResponse } from './types';
import { transcribeAudio } from './services/geminiService';
import { buildMidiFile } from './utils/midiBuilder';
import { WAVEncoder } from './utils/wavEncoder';

// --- VISUALIZATION ENGINE ---

const ImpactOscilloscope = ({ active, color, analyser }: { active: boolean, color: string, analyser: AnalyserNode | null }) => {
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

// --- COMPONENT PRIMITIVES ---

interface OrbKnobProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  color?: "cyan" | "purple";
  active?: boolean;
}

const OrbKnob = ({ label, value, onChange, color = "cyan", active = false }: OrbKnobProps) => {
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
    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleClick}>
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

interface ProFaderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  color?: "cyan" | "purple";
  level?: number;
}

const ProFader = ({ label, value, onChange, color = "cyan", level = 0 }: ProFaderProps) => {
  const height = value * 100;
  const meterHeight = level * 100;

  const glowClass = color === "cyan" ? "shadow-[0_0_10px_#06b6d4]" : "shadow-[0_0_10px_#a855f7]";
  const bgColorClass = color === "cyan" ? "bg-cyan-500" : "bg-purple-500";

  return (
    <div className="flex flex-col items-center gap-3">
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

interface ThresholdKnobProps {
  label: string;
  icon: React.ElementType;
  value: number;
  onChange: (val: number) => void;
}

const ThresholdKnob = ({ label, icon: Icon, value, onChange }: ThresholdKnobProps) => {
  const rotation = (value / 1) * 270 - 135;
  return (
    <div className="flex flex-col items-center gap-2">
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

const Screw = () => (
  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-900 border border-black flex items-center justify-center shadow-lg">
    <div className="w-full h-[1px] bg-zinc-950 rotate-45"></div>
  </div>
);

// --- MAIN APP ---

export default function App() {
  const [stage, setStage] = useState<PipelineStage>(PipelineStage.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [, setPlaybackTime] = useState(0);
  const [logs, setLogs] = useState<string[]>(['> CORE ENGINE INITIALIZED', '> WAITING FOR TRANSIENT INPUT']);
  const [isRecording, setIsRecording] = useState(false);

  const [levels, setLevels] = useState({ kick: 0.8, snare: 0.7, hats: 0.5, master: 0.8 });
  const [thresholds, setThresholds] = useState({ vocal: 0.6, bass: 0.4, melodic: 0.3 });
  const [meterLevels, setMeterLevels] = useState({ kick: 0, snare: 0, hats: 0, master: 0 });
  const [humanizationActive, setHumanizationActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const addLog = (msg: string) => setLogs(p => [...p.slice(-4), `> ${msg}`]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const updateMeters = useCallback(() => {
    if (!analyserRef.current || !isPlaying) {
      if (isPlaying) requestRef.current = requestAnimationFrame(updateMeters);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = (sum / dataArray.length) / 255;

    if (audioContextRef.current) {
      setPlaybackTime(audioContextRef.current.currentTime - startTimeRef.current);
    }

    setMeterLevels({
      master: average,
      kick: (dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255,
      snare: (dataArray.slice(20, 50).reduce((a, b) => a + b, 0) / 30) / 255,
      hats: (dataArray.slice(100, 200).reduce((a, b) => a + b, 0) / 100) / 255,
    });

    requestRef.current = requestAnimationFrame(updateMeters);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(updateMeters);
    else cancelAnimationFrame(requestRef.current);
  }, [isPlaying, updateMeters]);

  const initAudio = async (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    audioBufferRef.current = buffer;

    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 512;
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.gain.value = levels.master;

    gainNodeRef.current.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
  };

  const togglePlayback = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    if (isPlaying) {
      sourceNodeRef.current?.stop();
      setIsPlaying(false);
      setPlaybackTime(0);
      addLog("PLAYBACK TERMINATED.");
    } else {
      sourceNodeRef.current = audioContextRef.current.createBufferSource();
      sourceNodeRef.current.buffer = audioBufferRef.current;
      sourceNodeRef.current.connect(gainNodeRef.current!);
      startTimeRef.current = audioContextRef.current.currentTime;
      sourceNodeRef.current.start(0);
      sourceNodeRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };
      setIsPlaying(true);
      addLog("PLAYBACK INITIATED.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        await initAudio(arrayBuffer);
        setFileName("MIC_CAPTURE.WAV");
        setStage(PipelineStage.IDLE);
        addLog("MIC CAPTURE STABILIZED.");
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStage(PipelineStage.RECORDING);
      addLog("RECORDING SIGNAL...");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied.");
      addLog("ERROR: MIC ACCESS DENIED.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addLog("RECORDING STOPPED.");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStage(PipelineStage.UPLOADING);
    addLog(`INGESTING: ${file.name.toUpperCase()}`);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        await initAudio(arrayBuffer);
        addLog("SIGNAL STABILIZED. READY FOR ANALYSIS.");
        setStage(PipelineStage.IDLE);
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setError(err.message || "Unknown file ingestion error.");
      addLog("CRITICAL INGESTION ERROR.");
      setStage(PipelineStage.ERROR);
    }
  };

  const runTranscription = async () => {
    if (!audioBufferRef.current || !fileName) {
      setError("No audio signal loaded.");
      addLog("ERROR: NO AUDIO SIGNAL.");
      return;
    }
    setStage(PipelineStage.ANALYZING);
    addLog("MAPPING HARMONIC ONSETS...");
    setError(null);

    try {
      const audioData = audioBufferRef.current.getChannelData(0);
      const wavEncoder = new WAVEncoder(audioData, audioBufferRef.current.sampleRate);
      const wavBlob = wavEncoder.encode();

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await transcribeAudio(base64, 'audio/wav', thresholds);
        setTranscription(result);
        setStage(PipelineStage.COMPLETE);
        addLog("NEURAL RECONSTRUCTION SUCCESSFUL.");
      };
      reader.readAsDataURL(wavBlob);

    } catch (err: any) {
      setError(err.message || "Unknown transcription error.");
      setStage(PipelineStage.ERROR);
      addLog("TRANSCRIPTION KERNEL PANIC.");
    }
  };

  const downloadMidi = () => {
    if (!transcription) {
      setError("No MIDI data to export.");
      addLog("ERROR: NO MIDI DATA.");
      return;
    }
    const midiBytes = buildMidiFile(transcription.notes, transcription.bpm, humanizationActive);
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName?.split('.')[0] || 'transcription'}.mid`;
    a.click();
    addLog("MIDI BUNDLE EXPORTED.");
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-zinc-400 p-4 flex items-center justify-center font-sans selection:bg-cyan-500/30 overflow-hidden">
      <div className="w-full max-w-6xl bg-[#1a1a1e] border-4 border-zinc-800 rounded-lg shadow-[0_50px_100px_rgba(0,0,0,1)] relative overflow-hidden">
        
        <div className="absolute left-0 inset-y-0 w-12 bg-[#121214] border-r-2 border-black z-10 flex flex-col items-center py-10 justify-between">
          <Screw /><Screw /><Screw /><Screw />
        </div>
        <div className="absolute right-0 inset-y-0 w-12 bg-[#121214] border-l-2 border-black z-10 flex flex-col items-center py-10 justify-between">
          <Screw /><Screw /><Screw /><Screw />
        </div>

        <div className="relative z-10 px-16 h-20 bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1e] border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black italic text-white tracking-tighter uppercase">DRUM <span className="text-cyan-500">Magic</span></h1>
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.4em]">Neural Transient Processor v2.5</span>
            </div>
            <div className="h-8 w-[2px] bg-black shadow-[1px_0_0_rgba(255,255,255,0.05)]"></div>
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-zinc-500 hover:text-white cursor-pointer transition-colors uppercase tracking-widest mono">{stage}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
               <span className="text-[8px] font-black text-zinc-600 uppercase">Input Clock</span>
               <span className="text-[10px] text-cyan-500 font-mono tracking-tighter italic">{transcription?.bpm || '--'} BPM</span>
             </div>
             <div className="flex gap-2">
               <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-10 h-10 rounded-full border border-black shadow-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  title={isRecording ? "Stop Recording" : "Record from Mic"}
               >
                 <Mic2 size={16} className={isRecording ? 'text-white' : 'text-cyan-500'} />
               </button>
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-zinc-900 border border-zinc-700 rounded text-[10px] font-black tracking-[0.3em] text-cyan-500 shadow-xl active:translate-y-1 transition-all hover:bg-zinc-800"
               >
                 UPLOAD SIGNAL
               </button>
             </div>
             <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="audio/*" />
          </div>
        </div>

        <div className="relative z-10 px-6 md:px-16 py-8 grid grid-cols-12 gap-6 md:gap-10 min-h-[520px]">
          
          <div className="col-span-12 md:col-span-3 space-y-8">
            <div className="p-5 bg-black/40 border border-zinc-800 rounded-lg space-y-6">
               <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                 <Settings size={12} className="text-zinc-600" />
                 <h3 className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">THRESHOLD_MATRIX</h3>
               </div>
               
               <div className="flex flex-col gap-8 py-4">
                 <ThresholdKnob 
                    label="VOCAL_ONSET" 
                    icon={Mic2} 
                    value={thresholds.vocal} 
                    onChange={v => setThresholds(t => ({...t, vocal: v}))} 
                 />
                 <ThresholdKnob 
                    label="BASS_TRIGGER" 
                    icon={BassIcon} 
                    value={thresholds.bass} 
                    onChange={v => setThresholds(t => ({...t, bass: v}))} 
                 />
                 <ThresholdKnob 
                    label="MELODIC_PEAK" 
                    icon={Music} 
                    value={thresholds.melodic} 
                    onChange={v => setThresholds(t => ({...t, melodic: v}))} 
                 />
               </div>
            </div>

            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded flex items-center justify-between">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">OUTPUT STATUS</span>
                 <span className={`text-[10px] font-mono ${isPlaying ? 'text-green-500' : 'text-red-500'}`}>{isPlaying ? 'LIVE_EMISSION' : 'STANDBY'}</span>
               </div>
               <button 
                  onClick={togglePlayback}
                  disabled={!audioBufferRef.current}
                  className={`w-10 h-10 rounded-full border border-black shadow-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isPlaying ? 'bg-red-600' : 'bg-cyan-600'}`}
               >
                  {isPlaying ? <Square size={14} fill="white" className="text-white" /> : <Play size={14} fill="black" className="text-black ml-1" />}
               </button>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded flex items-center justify-between">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">HUMANIZATION</span>
                 <span className="text-[10px] font-mono text-cyan-500">{humanizationActive ? 'ACTIVE' : 'INACTIVE'}</span>
               </div>
               <div 
                  className={`w-10 h-6 rounded-full relative p-0.5 border border-black shadow-inner cursor-pointer transition-colors ${humanizationActive ? 'bg-cyan-700' : 'bg-zinc-800'}`}
                  onClick={() => setHumanizationActive(!humanizationActive)}
               >
                 <div className={`w-4 h-4 rounded-full shadow-lg transition-transform ${humanizationActive ? 'bg-cyan-400 translate-x-4' : 'bg-zinc-600 translate-x-0'}`} />
               </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 flex flex-col items-center justify-center pt-4">
             <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-10">
                <OrbKnob label="KICK" value={levels.kick} active={isPlaying && meterLevels.kick > 0.4} color="cyan" onChange={v => setLevels(l => ({...l, kick: v}))} />
                <OrbKnob label="SNARE" value={levels.snare} active={isPlaying && meterLevels.snare > 0.3} color="purple" onChange={v => setLevels(l => ({...l, snare: v}))} />
                <OrbKnob label="HATS" value={levels.hats} active={isPlaying && meterLevels.hats > 0.3} color="cyan" onChange={v => setLevels(l => ({...l, hats: v}))} />
             </div>
             
             <div className="w-full h-32 bg-black border-2 border-zinc-800 rounded shadow-[inset_0_2px_15px_rgba(0,0,0,1)] relative overflow-hidden">
               <div className="absolute top-2 left-2 flex items-center gap-2 z-20">
                 <Waves size={10} className="text-cyan-500" />
                 <span className="text-[8px] font-mono text-zinc-700 tracking-[0.2em] uppercase">IMPACT_OSCILLOSCOPE_V2</span>
               </div>
               {isRecording && (
                 <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[8px] font-mono text-red-500 tracking-[0.2em] uppercase">RECORDING_SIGNAL</span>
                 </div>
               )}
               <ImpactOscilloscope active={isPlaying || isRecording} color="#06b6d4" analyser={analyserRef.current} />
             </div>

             <div className="mt-8 flex gap-4 w-full">
               <div className="flex-1 bg-zinc-900 border border-zinc-800 p-3 rounded flex flex-col justify-center">
                 <span className="text-[7px] font-black text-zinc-600 tracking-widest uppercase">SESSION_TAG</span>
                 <span className="text-xs font-mono text-white truncate">{fileName || 'NO_SIGNAL'}</span>
               </div>
               <button 
                onClick={stage === PipelineStage.COMPLETE ? downloadMidi : runTranscription}
                disabled={!fileName || stage === PipelineStage.ANALYZING || stage === PipelineStage.UPLOADING}
                className="flex-[2] bg-gradient-to-b from-cyan-600 to-cyan-900 border border-cyan-400/50 rounded text-[10px] font-black tracking-[0.4em] text-white shadow-xl hover:brightness-110 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {stage === PipelineStage.ANALYZING ? 'MAPPING TRANSIENTS...' : stage === PipelineStage.COMPLETE ? 'EXPORT MIDI' : 'GENERATE MIDI'}
               </button>
             </div>
          </div>

          <div className="col-span-12 md:col-span-3 flex flex-col gap-6">
            <div className="p-4 bg-black/60 border border-zinc-800 rounded-lg flex-1 flex flex-col">
               <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-6">
                 <Zap size={12} className="text-purple-500" />
                 <h3 className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">CHANNEL_MIX</h3>
               </div>
               <div className="flex justify-between gap-2 h-full">
                 <ProFader label="KICK" value={levels.kick} level={meterLevels.kick} color="cyan" onChange={v => setLevels(s => ({...s, kick: v}))} />
                 <ProFader label="SNARE" value={levels.snare} level={meterLevels.snare} color="cyan" onChange={v => setLevels(s => ({...s, snare: v}))} />
                 <ProFader label="HATS" value={levels.hats} level={meterLevels.hats} color="purple" onChange={v => setLevels(s => ({...s, hats: v}))} />
                 <ProFader label="MASTER" value={levels.master} level={meterLevels.master} color="purple" onChange={v => setLevels(s => ({...s, master: v}))} />
               </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded flex items-center gap-2 animate-pulse">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <span className="text-[9px] text-red-400 mono uppercase truncate">{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 px-16 h-24 bg-black border-t-2 border-zinc-800 flex items-center justify-between font-mono">
          <div className="space-y-1">
             {logs.map((log, i) => (
               <div key={i} className="text-[9px] flex gap-4">
                 <span className="text-zinc-800">[{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                 <span className={log.includes('SUCCESS') || log.includes('READY') ? 'text-cyan-400' : log.includes('ERROR') ? 'text-red-500' : 'text-zinc-600'}>{log}</span>
               </div>
             ))}
          </div>
          <div className="flex items-center gap-12">
             <div className="flex flex-col items-end">
                <span className="text-[8px] text-zinc-600 uppercase tracking-tighter">ENGINE_LOAD</span>
                <span className={`text-xs font-bold tracking-widest ${stage === PipelineStage.ANALYZING ? 'text-red-500' : 'text-emerald-500'}`}>
                  {stage === PipelineStage.ANALYZING ? (90 + Math.random() * 8).toFixed(1) : (10 + Math.random() * 5).toFixed(1)}% NOMINAL
                </span>
             </div>
             <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-white font-black italic">BUILDWHILE</span>
                  <span className="text-[8px] text-zinc-700">© 2025 NEURAL_OS</span>
                </div>
                <div className={`w-8 h-8 rounded-full border border-white/5 flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
                   <Disc size={16} className={isPlaying ? 'text-cyan-500' : 'text-zinc-800'} />
                </div>
             </div>
          </div>
        </div>

      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
