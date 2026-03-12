
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResponse } from "../types";

const API_KEY = process.env.API_KEY || '';

export const transcribeAudio = async (
  base64Data: string, 
  mimeType: string, 
  thresholds: { vocal: number; bass: number; melodic: number }
): Promise<TranscriptionResponse> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    Transcribe this audio file into precise MIDI note data.
    Identify the main instruments (drums, bass, or melody).
    Focus specifically on rhythmic accuracy.
    
    Sensitivity Thresholds (0.0 to 1.0):
    - Vocal Onset Sensitivity: ${thresholds.vocal}
    - Bass Trigger Sensitivity: ${thresholds.bass}
    - Melodic Peak Sensitivity: ${thresholds.melodic}
    
    Use these thresholds to filter out background noise or less prominent notes. 
    A higher threshold means only the strongest transients should be transcribed.
    
    Return the data as a JSON object with:
    - bpm: estimated beats per minute
    - timeSignature: e.g. "4/4"
    - notes: an array of objects with { pitch, startTime, duration, velocity }.
    
    Pitch should be a MIDI number (0-127).
    startTime and duration should be in seconds.
    velocity should be 0-127.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bpm: { type: Type.NUMBER },
            timeSignature: { type: Type.STRING },
            notes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pitch: { type: Type.NUMBER },
                  startTime: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                  velocity: { type: Type.NUMBER }
                },
                required: ["pitch", "startTime", "duration", "velocity"]
              }
            }
          },
          required: ["bpm", "timeSignature", "notes"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as TranscriptionResponse;
  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw error;
  }
};
