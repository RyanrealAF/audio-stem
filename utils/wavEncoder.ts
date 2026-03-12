// Utility class to encode AudioBuffer to WAV format
export class WAVEncoder {
  private sampleRate: number;
  private numChannels: number;
  private interleaved: Float32Array;

  constructor(audioData: Float32Array, sampleRate: number, numChannels: number = 1) {
    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    this.interleaved = audioData; // Assuming single channel for now
  }

  private writeString(view: DataView, offset: number, s: string): number {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
    return offset + s.length;
  }

  private writeUint16(view: DataView, offset: number, value: number): number {
    view.setUint16(offset, value, true); // Little endian
    return offset + 2;
  }

  private writeUint32(view: DataView, offset: number, value: number): number {
    view.setUint32(offset, value, true); // Little endian
    return offset + 4;
  }

  public encode(): Blob {
    const dataLength = this.interleaved.length * 2; // 16-bit PCM
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    let offset = 0;
    
    // RIFF chunk
    offset = this.writeString(view, offset, 'RIFF');
    offset = this.writeUint32(view, offset, 36 + dataLength); // file size
    offset = this.writeString(view, offset, 'WAVE');

    // FMT chunk
    offset = this.writeString(view, offset, 'fmt ');
    offset = this.writeUint32(view, offset, 16); // chunk size
    offset = this.writeUint16(view, offset, 1); // audio format (1 = PCM)
    offset = this.writeUint16(view, offset, this.numChannels);
    offset = this.writeUint32(view, offset, this.sampleRate);
    offset = this.writeUint32(view, offset, this.sampleRate * this.numChannels * 2); // byte rate
    offset = this.writeUint16(view, offset, this.numChannels * 2); // block align
    offset = this.writeUint16(view, offset, 16); // bits per sample

    // DATA chunk
    offset = this.writeString(view, offset, 'data');
    offset = this.writeUint32(view, offset, dataLength);

    // Write PCM data
    for (let i = 0; i < this.interleaved.length; i++) {
      let s = Math.max(-1, Math.min(1, this.interleaved[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF; // Convert to 16-bit signed int
      view.setInt16(offset + i * 2, s, true); // Little endian
    }

    return new Blob([view], { type: 'audio/wav' });
  }
}
