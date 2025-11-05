import { SoundNode } from "../SoundNode";
import { SAMPLE_PERIOD } from "../constants";
import { toHertz } from "../conversions";

const INFO = {
  className: "LowPass24db",
  classGroup: "Filter",
  sockets: [
    "input",
    ["cutoff", "frequency", "freq", "f"],
    ["resonance", "res", "q"],
  ],
  outputs: ["output"],
  positionalArgs: ["cutoff", "resonance"],
};

export class LowPass24db implements SoundNode {
  static info = INFO;
  info = () => INFO;

  // 4-pole filter requires 4 buffers
  private buf0: number = 0;
  private buf1: number = 0;
  private buf2: number = 0;
  private buf3: number = 0;


  // Gemini gave me this:
  // Standard Moog-style 4-pole filters self-oscillate at a feedback of 4.0.
  // We scale the 0-1 input resonance to 0-4 for useful range.
  // clamped slightly below 4.0 to prevent unintentional runaway feedback.

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const input = socketsValues[0];
    const cutoff = toHertz(socketsValues[1]);
    let resonance = socketsValues[2];
    if (resonance < 0) resonance = 0; // unsure if this is necessary
    if (resonance > 1) resonance = 1; // unsure if this is necessary
    const feedback = resonance * 3.95;

    const alphaTmp = 2 * Math.PI * SAMPLE_PERIOD * cutoff;
    // Gemini suggested clamping to 0.99 to improve stability at high frequencies
    const alpha = Math.min(alphaTmp / (alphaTmp + 1), 0.99);

    const feedbackSignal = this.buf3 * feedback;
    const compensatedInput = input - feedbackSignal;

    this.buf0 += alpha * (compensatedInput - this.buf0);
    this.buf1 += alpha * (this.buf0 - this.buf1);
    this.buf2 += alpha * (this.buf1 - this.buf2);
    this.buf3 += alpha * (this.buf2 - this.buf3);

    outputValues[indexToWrite] = this.buf3;
  }
}