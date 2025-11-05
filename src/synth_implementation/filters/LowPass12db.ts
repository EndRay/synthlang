import { SoundNode } from "../SoundNode";
import {SAMPLE_PERIOD} from "../constants";
import {toHertz} from "../conversions";

const INFO = {
  className: "LowPass12db",
  classGroup: "Filter",
  sockets: [
    "input",
    ["cutoff", "frequency", "freq", "f"],
    ["resonance", "res", "q"],
  ],
  outputs: ["output"],
  positionalArgs: ["cutoff", "resonance"],
};

export class LowPass12db implements SoundNode {
  static info = INFO;
  info = () => INFO;

  private buf0: number = 0;
  private buf1: number = 0;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const input = socketsValues[0];
    const cutoff = toHertz(socketsValues[1]);
    const resonance = socketsValues[2];

    const alphaTmp = 2 * Math.PI * SAMPLE_PERIOD * cutoff;
    const alpha = alphaTmp / (alphaTmp + 1);

    const feedback = resonance + resonance / (1 - alpha);

    this.buf0 += alpha * (input - this.buf0 + feedback * (this.buf0 - this.buf1));
    this.buf1 += alpha * (this.buf0 - this.buf1);
    outputValues[indexToWrite] = this.buf1;
  }
}