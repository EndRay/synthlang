import {SoundNode} from "../SoundNode";
import {SoundNodeClassInfo} from "../../language/SoundNodeClassInfo";
import {toHertz} from "../conversions";
import {SAMPLE_RATE} from "../constants";

const INFO: SoundNodeClassInfo = {
  className: "Saw",
  classGroup: "Oscillator",
  sockets: [
    ["frequency", "freq", "f", "pitch"],
  ],
  outputs: ["output"],
  positionalArgs: ["frequency"],
}

export class Saw implements SoundNode {
  static info = INFO;
  info = () => INFO;

  private phase: number = 0;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const frequency = toHertz(socketsValues[0]);
    this.phase += frequency / SAMPLE_RATE;
    if (this.phase >= 1)
      this.phase -= 1;
    outputValues[indexToWrite] = 2 * this.phase - 1;
  }
}