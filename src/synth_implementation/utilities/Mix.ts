import {SoundNode} from "../SoundNode";

const INFO = {
  className: "Mix",
  classGroup: "Utility",
  sockets: ["input"],
  outputs: ["output"],
  positionalArgs: ["input"],
}

export class Mix implements SoundNode {
  static info = INFO;
  info = () => INFO;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    outputValues[indexToWrite] = socketsValues[0]; // because of socket mixing logic, this is already the mixed input
  }
}