import React, { useEffect, useMemo, useRef, useState } from "react";

export default function SineSynth() {
  const sampleRate = 44100;

  const [frequency, setFrequency] = useState(220);
  const [volIndex, setVolIndex] = useState(2); // 0->0%, 1->50%, 2->100%
  const volumes = useMemo(() => [0.0, 0.5, 1.0], []);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext>(null);
  const gainRef = useRef<GainNode>(null);
  const sourceRef = useRef<AudioBufferSourceNode>(null);

  // Create / ensure AudioContext + GainNode
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.AudioContext)({
        sampleRate,
      });
    }
    if (!gainRef.current) {
      const g = audioCtxRef.current.createGain();
      g.gain.value = volumes[volIndex];
      g.connect(audioCtxRef.current.destination);
      gainRef.current = g;
    }
  };

  // Make a loopable 1-cycle sine buffer for the target frequency
  const makeSineBuffer = (freq: number) => {
    const ctx = audioCtxRef.current!;
    // Choose an integer number of samples to complete one cycle to avoid loop clicks.
    // This slightly “rounds” the exact frequency, but is imperceptible for UI control.
    const periodSamples = Math.max(2, Math.round(sampleRate / freq));
    const buf = ctx.createBuffer(1, periodSamples, sampleRate);
    const ch = new Float32Array(periodSamples);
    for (let i = 0; i < periodSamples; i++) {
      ch[i] = Math.sin((2 * Math.PI * i) / periodSamples);
    }
    buf.copyToChannel(ch, 0);
    return buf;
  };

  const startSource = (freq: number) => {
    const ctx = audioCtxRef.current!;
    const src = ctx.createBufferSource();
    src.buffer = makeSineBuffer(freq);
    src.loop = true;
    src.connect(gainRef.current!);
    src.start();
    return src;
  };

  const stopSource = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
  };

  // Start/stop playback
  const togglePlay = async () => {
    ensureAudio();
    if (!isPlaying) {
      // iOS/Chrome autoplay policies: resume on user gesture
      if (audioCtxRef.current!.state === "suspended") {
        await audioCtxRef.current!.resume();
      }
      // fade in
      const now = audioCtxRef.current!.currentTime;
      gainRef.current!.gain.setTargetAtTime(0.0001, now, 0.001);
      stopSource();
      sourceRef.current = startSource(frequency);
      // ramp to target volume
      gainRef.current!.gain.setTargetAtTime(volumes[volIndex], now + 0.01, 0.01);
      setIsPlaying(true);
    } else {
      // fade out then stop
      const now = audioCtxRef.current!.currentTime;
      gainRef.current!.gain.cancelScheduledValues(now);
      gainRef.current!.gain.setTargetAtTime(0.0001, now, 0.01);
      setTimeout(() => {
        stopSource();
        setIsPlaying(false);
      }, 80);
    }
  };

  // Update frequency while playing (quick crossfade to avoid clicks)
  useEffect(() => {
    if (!isPlaying || !audioCtxRef.current || !gainRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    // brief dip to avoid click, swap buffer, bring volume back
    const targetVol = volumes[volIndex];
    gainRef.current.gain.setTargetAtTime(0.0001, now, 0.005);

    // swap source after ~15 ms
    const swapDelayMs = 15;
    const timer = setTimeout(() => {
      stopSource();
      sourceRef.current = startSource(frequency);
      gainRef.current!.gain.setTargetAtTime(targetVol, ctx.currentTime + 0.005, 0.01);
    }, swapDelayMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency]);

  // Update volume when button cycles
  useEffect(() => {
    if (!audioCtxRef.current || !gainRef.current) return;
    const now = audioCtxRef.current.currentTime;
    gainRef.current.gain.setTargetAtTime(volumes[volIndex], now, 0.02);
  }, [volIndex, volumes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSource();
      if (gainRef.current) {
        try { gainRef.current.disconnect(); } catch {}
        gainRef.current = null;
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
    };
  }, []);

  const cycleVolume = () => {
    setVolIndex((i) => (i + 1) % 3);
  };

  const volLabel = ["0%", "50%", "100%"][volIndex];

  return (
    <div style={{ display: "grid", gap: 12, alignItems: "center", justifyItems: "start" }}>
      <button onClick={togglePlay}>
        {isPlaying ? "Stop" : "Play"}
      </button>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Frequency: {frequency.toFixed(0)} Hz</span>
        <input
          type="range"
          min={110}
          max={440}
          step={1}
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
          style={{ width: 300 }}
        />
      </label>

      <button onClick={cycleVolume}>Volume: {volLabel}</button>
    </div>
  );
}
