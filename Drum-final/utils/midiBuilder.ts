
import { MidiNote } from '../types';

/**
 * A minimal MIDI File builder
 * Generates a Standard MIDI File (SMF) Type 0
 */
export const buildMidiFile = (notes: MidiNote[], bpm: number = 120, humanize: boolean = false): Uint8Array => {
  const ticksPerBeat = 480;
  const tempo = Math.round(60000000 / bpm); // microseconds per beat

  // Header Chunk
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Length
    0x00, 0x00,             // Type 0
    0x00, 0x01,             // 1 track
    (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
  ];

  const trackEvents: number[] = [];
  
  // Set Tempo Meta Event
  trackEvents.push(0x00, 0xFF, 0x51, 0x03, (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);

  // Convert notes to sorted events (time, type, pitch, velocity)
  const events: { time: number; type: 'on' | 'off'; pitch: number; velocity: number }[] = [];
  notes.forEach(n => {
    // Apply humanization if active
    const timeOffset = humanize ? (Math.random() - 0.5) * 0.02 : 0; // +/- 10ms
    const velocityOffset = humanize ? Math.floor((Math.random() - 0.5) * 10) : 0; // +/- 5 velocity
    
    const startTime = Math.max(0, n.startTime + timeOffset);
    const velocity = Math.max(1, Math.min(127, n.velocity + velocityOffset));

    events.push({ time: startTime, type: 'on', pitch: n.pitch, velocity: velocity });
    events.push({ time: startTime + n.duration, type: 'off', pitch: n.pitch, velocity: 0 });
  });

  events.sort((a, b) => a.time - b.time);

  let lastTick = 0;
  events.forEach(e => {
    const currentTick = Math.round(e.time * bpm * ticksPerBeat / 60);
    const delta = currentTick - lastTick;
    lastTick = currentTick;

    // Write Delta Time as Variable Length Quantity
    writeVarLen(trackEvents, delta);

    // Write Event
    if (e.type === 'on') {
      trackEvents.push(0x90, e.pitch, e.velocity);
    } else {
      trackEvents.push(0x80, e.pitch, 0x00);
    }
  });

  // End of track
  trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackEvents.length >> 24) & 0xFF,
    (trackEvents.length >> 16) & 0xFF,
    (trackEvents.length >> 8) & 0xFF,
    trackEvents.length & 0xFF
  ];

  return new Uint8Array([...header, ...trackHeader, ...trackEvents]);
};

function writeVarLen(arr: number[], value: number) {
  let buffer = value & 0x7F;
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= 0x80;
    buffer |= (value & 0x7F);
  }
  while (true) {
    arr.push(buffer & 0xFF);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
}
