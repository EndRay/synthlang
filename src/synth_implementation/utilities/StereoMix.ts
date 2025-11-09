import { SoundNode } from "../SoundNode";

const INFO = {
  className: "StereoMix",
  classGroup: "Utility",
  sockets: ["left", "right"],
  outputs: ["left", "right"],
  positionalArgs: ["left", "right"],
};

export class StereoMix implements SoundNode {
  static info = INFO;
  info = () => INFO;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    outputValues[indexToWrite]   = socketsValues[0];
    outputValues[indexToWrite+1] = socketsValues[1];
  }
}