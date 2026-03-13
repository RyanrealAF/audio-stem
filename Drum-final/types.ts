
export interface MidiNote {
  pitch: number;
  startTime: number;
  duration: number;
  velocity: number;
  instrument?: string;
}

export interface TranscriptionResponse {
  notes: MidiNote[];
  bpm: number;
  timeSignature: string;
}

export enum PipelineStage {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  CONVERTING = 'CONVERTING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
