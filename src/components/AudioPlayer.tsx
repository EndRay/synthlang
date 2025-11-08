// src/components/AudioPlayer.tsx

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { getAudioContext } from '../audioContext'; // Assuming you have this singleton

// --- Configuration Constants ---
const PREFILL_CHUNKS = 5;
export const CHUNK_FRAMES = 256; // Standard buffer size for audio worklets

// --- Type Definitions ---

// The internal state of the audio player
type AudioStatus = 'stopped' | 'starting' | 'started' | 'error';

// The props required by this headless component
interface AudioPlayerProps {
  makeChunk: (chunkFrames: number) => Float32Array;
  // Callback for the parent to receive status updates
  onStatusChange?: (status: AudioStatus) => void;
}

// The API that this component exposes to its parent via a ref
export interface AudioPlayerHandle {
  start: () => Promise<void>;
  stop: () => void;
}

// --- Helper Function ---
const pushChunk = (node: AudioWorkletNode, chunk: Float32Array) => {
  // Transfer the buffer for performance. The worklet now owns this memory.
  node.port.postMessage({ type: "push", buffer: chunk.buffer }, [chunk.buffer]);
};


// --- The Component ---
export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({ makeChunk, onStatusChange }, ref) => {
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('stopped');
  const nodeRef = useRef<AudioWorkletNode | null>(null);

  // When the internal audioStatus changes, notify the parent component.
  useEffect(() => {
    onStatusChange?.(audioStatus);
  }, [audioStatus, onStatusChange]);

  const handleStartAudio = async () => {
    if (audioStatus === 'started' || audioStatus === 'starting') return;
    setAudioStatus('starting');

    try {
      const ctx = getAudioContext();

      // This must be called after a user interaction
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      await ctx.audioWorklet.addModule('/worklets/queue-player.js');

      const node = new AudioWorkletNode(ctx, 'queue-player', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });

      node.connect(ctx.destination);
      nodeRef.current = node;

      // Prefill the buffer to prevent stuttering on start
      for (let i = 0; i < PREFILL_CHUNKS; i++) {
        pushChunk(node, makeChunk(CHUNK_FRAMES));
      }

      // Set up the listener to request more audio data
      node.port.onmessage = (e) => {
        if (nodeRef.current && e.data?.type === 'lowWater') {
          pushChunk(nodeRef.current, makeChunk(CHUNK_FRAMES));
        }
      };

      console.log('Audio started successfully.');
      setAudioStatus('started');
    } catch (err) {
      console.error('Failed to start audio:', err);
      setAudioStatus('error');
    }
  };

  const handleStopAudio = () => {
    if (nodeRef.current) {
      console.log("Stopping audio...");
      // Tell the worklet to clear its internal queue
      nodeRef.current.port.postMessage({ type: "clear" });
      nodeRef.current.port.onmessage = null;
      nodeRef.current.disconnect();
      nodeRef.current = null;
      setAudioStatus('stopped');
    }
  };

  // Expose the public API (`start` and `stop`) to the parent component.
  useImperativeHandle(ref, () => ({
    start: handleStartAudio,
    stop: handleStopAudio,
  }));

  // This effect handles cleanup when the component is unmounted.
  useEffect(() => {
    return () => {
      if (nodeRef.current) {
        console.log('Cleaning up audio node on component unmount...');
        nodeRef.current.disconnect();
        nodeRef.current = null;
      }
    };
  }, []); // Empty array ensures this runs only once on unmount.

  // This component renders no UI. It is a logic-only component.
  return null;
});