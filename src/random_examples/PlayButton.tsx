import React from "react";

export default function PlayButton({ waveform }: { waveform: Float32Array }) {
  const playAudio = () => {
    // 1. Create an audio context
    const audioContext = new (window.AudioContext || window.AudioContext)({
      sampleRate: 44100, // match your data’s sample rate
    });

    // 2. Create an empty AudioBuffer
    const buffer = audioContext.createBuffer(
      1, // number of channels (mono)
      waveform.length,
      44100
    );

    // 3. Copy your Float32Array samples into the buffer
    buffer.copyToChannel(waveform, 0);

    // 4. Create a buffer source and connect it
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    // 5. Play it!
    source.start(0);
  };

  return <button onClick={playAudio}>▶️ Play</button>;
}
