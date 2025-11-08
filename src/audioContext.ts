import {SAMPLE_RATE} from "./synth_implementation/constants";

let audioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext({
      sampleRate: SAMPLE_RATE, // Or your desired sample rate
    });
  }
  return audioContext;
};