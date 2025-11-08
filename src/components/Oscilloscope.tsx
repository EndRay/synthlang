import React, {useRef, useEffect} from 'react';
import '../styles/oscilloscope.css';
import {SAMPLE_RATE} from "../synth_implementation/constants";
import {CHUNK_FRAMES} from "./AudioPlayer";

interface OscilloscopeProps {
  dataRef: React.RefObject<Float32Array>;
  isClippedRef?: React.RefObject<boolean>;
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundColor?: string;
  lineWidth?: number;
  internalMargin?: number;
  decay?: number; // per 100ms
  autoScale?: boolean;
}

export const OSCILLOSCOPE_DATA_SIZE = 4096;
const OSCILLOSCOPE_REFRESH_RATE = 60;

const LINE_WIDTH = 2;
const MAX_AMPLITUDE_SECONDS_WINDOW = 2;
const MAX_AMPLITUDE_CHUNKS_WINDOW = Math.ceil((MAX_AMPLITUDE_SECONDS_WINDOW * SAMPLE_RATE) / CHUNK_FRAMES);
const AMPLITUDE_EPSILON = 0.001;


// IDK how this works, I stole it from Gemini
function findFundamentalPeriod(data: Float32Array): number {
  const bufferSize = data.length;
  const nsdf = new Float32Array(bufferSize).fill(0);

  // --- 1. Autocorrelation and NSDF Calculation ---
  // (This part is computationally intensive but standard for MPM)
  let ac = 0;
  let m = 0;
  for (let i = 0; i < bufferSize; i++) {
    ac += data[i] * data[i];
  }

  for (let tau = 1; tau < bufferSize; tau++) {
    let xcorr = 0;
    m = 0;
    for (let i = 0; i < bufferSize - tau; i++) {
      xcorr += data[i] * data[i + tau];
      m += data[i] * data[i] + data[i + tau] * data[i + tau];
    }
    // Avoid division by zero
    nsdf[tau] = m > 0 ? (2 * xcorr) / m : 0;
  }

  // --- 2. Constrain the Search Range ---
  // Define a plausible musical frequency range to search within.
  const minFreq = 40; // Hz
  const maxFreq = 2000; // Hz
  const minPeriod = Math.floor(SAMPLE_RATE / maxFreq);
  const maxPeriod = Math.min(Math.floor(SAMPLE_RATE / minFreq), bufferSize - 1);

  // --- 3. Refined Peak Picking ---
  let peakIndex = 0;
  let maxVal = -1;

  // First, find the absolute maximum value within our constrained range.
  for (let i = minPeriod; i <= maxPeriod; i++) {
    if (nsdf[i] > maxVal) {
      maxVal = nsdf[i];
    }
  }

  // If no strong correlation is found, the signal is likely noise or silent.
  if (maxVal < 0.9) {
    return 0;
  }

  // Now, find the *first* peak that is close to the absolute maximum.
  // This prevents octave errors and latching onto sub-harmonics.
  const threshold = maxVal * 0.9;
  for (let i = minPeriod; i <= maxPeriod; i++) {
    // Check if it's a local maximum
    if (nsdf[i] > nsdf[i - 1] && nsdf[i] > nsdf[i + 1]) {
      if (nsdf[i] >= threshold) {
        peakIndex = i;
        break; // Found the first significant peak, we're done.
      }
    }
  }

  if (peakIndex === 0) {
    return 0; // No suitable peak found
  }

  // --- 4. Parabolic Interpolation for Sub-Sample Accuracy ---
  // Improves precision by fitting a parabola to the peak and finding its true maximum.
  const alpha = nsdf[peakIndex - 1];
  const beta = nsdf[peakIndex];
  const gamma = nsdf[peakIndex + 1];

  // Denominator can be zero if alpha, beta, gamma are equal.
  const denominator = alpha - 2 * beta + gamma;
  if (denominator === 0) {
    return peakIndex;
  }

  const p = 0.5 * (alpha - gamma) / denominator;
  return peakIndex + p;
}


const Oscilloscope: React.FC<OscilloscopeProps> = ({
                                                     dataRef,
                                                     isClippedRef = undefined,
                                                     width = 400,
                                                     height = 200,
                                                     strokeColor = '#1fffdb',       // aqua
                                                     // strokeColor = '#39ff14',           // neon green
                                                     backgroundColor = '#070708',
                                                     internalMargin = 12,
                                                     decay = 0.25,
                                                     autoScale = true,
                                                   }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const maxAmplitudesRef = useRef<number[]>([]);
  const lastPeriodRef = useRef<number>(1024);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  const draw = () => {
    let data = new Float32Array(dataRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    maxAmplitudesRef.current.push(Math.max(...data.map(Math.abs)));
    if (maxAmplitudesRef.current.length > MAX_AMPLITUDE_CHUNKS_WINDOW) {
      maxAmplitudesRef.current.shift();
    }
    let amplitudeScale = 1.0;
    if (autoScale) {
      const maxAmplitude = Math.max(Math.max(...maxAmplitudesRef.current), AMPLITUDE_EPSILON);
      if (maxAmplitude > 0) {
        amplitudeScale = 1.0 / maxAmplitude;
      }
    }
    for (let i = 0; i < data.length; i++) {
      data[i] = data[i] * amplitudeScale;
    }

    const period = findFundamentalPeriod(data.subarray(0, 1024)) || lastPeriodRef.current;
    lastPeriodRef.current = period;

    let triggerIndex = 0;
    const triggerLevel = 0.0;

    // STAGE 1: Find a preliminary, simple rising-edge trigger.
    let preliminaryTrigger = 0;
    const preliminarySearchEnd = Math.min(data.length, Math.ceil(2 * period));
    for (let i = 1; i < preliminarySearchEnd; i++) {
      if (data[i - 1] < triggerLevel && data[i] >= triggerLevel) {
        preliminaryTrigger = i;
        break;
      }
    }

    // STAGE 2: Define a "Window of Interest" based on the preliminary trigger.
    const windowStart = preliminaryTrigger;
    const windowEnd = Math.min(data.length, windowStart + Math.ceil(2 * period));

    // STAGE 3: Perform the qualified trigger logic *only within this window*.
    // a) Find the peak inside the window.
    let peakIndex = windowStart;
    let peakValue = -Infinity;
    for (let i = windowStart; i < windowEnd; i++) {
      if (data[i] > peakValue) {
        peakValue = data[i];
        peakIndex = i;
      }
    }

    // b) Search backwards from the peak to find the final, stable trigger point.
    triggerIndex = preliminaryTrigger; // Default to preliminary if no better is found
    for (let i = peakIndex; i > windowStart; i--) {
      if (data[i - 1] < triggerLevel && data[i] >= triggerLevel) {
        triggerIndex = i;
        break;
      }
    }

    const previousFrame = context.getImageData(0, 0, width, height);

    const alpha = 1 - Math.pow(decay, 1 / (OSCILLOSCOPE_REFRESH_RATE * 0.1));
    const backgroundR = parseInt(backgroundColor.slice(1, 3), 16);
    const backgroundG = parseInt(backgroundColor.slice(3, 5), 16);
    const backgroundB = parseInt(backgroundColor.slice(5, 7), 16);

    function signIndependentCeil(n: number) {
      return Math.sign(n) * Math.ceil(Math.abs(n));
    }

    let newFrame = context.getImageData(0, 0, width, height);
    for (let i = 0; i < newFrame.data.length; i += 4) {
      newFrame.data[i] = previousFrame.data[i] + signIndependentCeil((backgroundR - previousFrame.data[i]) * alpha);
      newFrame.data[i + 1] = previousFrame.data[i+1] + signIndependentCeil((backgroundG - previousFrame.data[i+1]) * alpha);
      newFrame.data[i + 2] = previousFrame.data[i+2] + signIndependentCeil((backgroundB - previousFrame.data[i+2]) * alpha);
      newFrame.data[i + 3] = 255;
    }
    context.putImageData(newFrame, 0, 0);
    // context.fillStyle = backgroundColor + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    // context.fillRect(0, 0, width, height);

    context.save();
    context.strokeStyle = strokeColor;
    context.lineWidth = LINE_WIDTH;

    context.shadowBlur = 10;
    context.shadowColor = strokeColor;

    context.beginPath();


    const effectiveWidth = width - 2 * internalMargin;
    const effectiveHeight = height - 2 * internalMargin;

    const waveformSlice = data.slice(triggerIndex, Math.min(triggerIndex + period, data.length));
    const step = effectiveWidth / (waveformSlice.length - 1);


    for (let i = 0; i < waveformSlice.length; i++) {
      const x = internalMargin + i * step;
      // Scale the amplitude to the canvas height
      const y = internalMargin + (waveformSlice[i] * effectiveHeight) / 2 + effectiveHeight / 2;

      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.stroke();
    context.restore();

    if(isClippedRef?.current) {
      // print text red warning "CLIPPED" in the top-left corner
      context.fillStyle = 'red';
      context.font = '16px Roboto Mono, monospace';
      context.textAlign = 'right';
      context.fillText('output is clipped', width-10, 20);

    }
  }

  useEffect(() => {
    clearCanvas();
    const interval = setInterval(() => {
      draw();
    }, 1000 / OSCILLOSCOPE_REFRESH_RATE);
    return () => {
      clearInterval(interval);
    }
  }, [dataRef, width, height, strokeColor, backgroundColor, internalMargin, decay, autoScale]);

  return <canvas ref={canvasRef} width={width} height={height} className="oscilloscope-canvas"/>;
};

export default Oscilloscope;