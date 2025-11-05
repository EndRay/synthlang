import {SoundNode} from "../SoundNode";
import {SoundNodeClassInfo} from "../../language/SoundNodeClassInfo";
import {SAMPLE_RATE} from "../constants";
import {toHertz} from "../conversions";

const INFO: SoundNodeClassInfo = {
  className: "Sine",
  classGroup: "Oscillator",
  sockets: [
    ["frequency", "freq", "f", "pitch"],
  ],
  outputs: ["output"],
  positionalArgs: ["frequency"],
}

export class Sine implements SoundNode {
  static info = INFO;
  info = () => INFO;

  private phase: number = 0;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const frequency = toHertz(socketsValues[0]);
    const increment = (2 * Math.PI * frequency) / SAMPLE_RATE;
    this.phase += increment;
    if (this.phase > 2 * Math.PI) {
      this.phase -= 2 * Math.PI;
    }
    outputValues[indexToWrite] = Math.sin(this.phase);
  }
}