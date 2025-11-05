import { SoundNode } from "../SoundNode";

const INFO = {
  className: "WhiteNoise",
  classGroup: "Noise",
  sockets: [],
  outputs: ["output"],
  positionalArgs: [],
};

export class WhiteNoise implements SoundNode {
  static info = INFO;
  info = () => INFO;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    outputValues[indexToWrite] = Math.random() * 2 - 1; // Generate white noise
  }
}