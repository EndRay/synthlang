import React from "react";

export default function PlaySineButton() {
  const playSine = () => {
    const sampleRate = 44100;
    const duration = 2; // seconds
    const frequency = 220; // Hz
    const length = sampleRate * duration;

    // 1. Generate a Float32Array with sine samples
    const waveform = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      waveform[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    }

    // 2. Create an AudioContext and AudioBuffer
    const audioContext = new (window.AudioContext || window.AudioContext)({
      sampleRate,
    });

    const buffer = audioContext.createBuffer(1, waveform.length, sampleRate);
    buffer.copyToChannel(waveform, 0);

    // 3. Play it
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  };

  return <button onClick={playSine}>Play 220 Hz Sine</button>;
}
