import {BipolarMappingClass} from "../../language/classes";
import {SoundNode} from "../SoundNode";

export class BipolarMapping implements SoundNode {
  static info = BipolarMappingClass;
  info = () => BipolarMappingClass;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const source = socketsValues[0];
    const from = socketsValues[1];
    const to = socketsValues[2];

    outputValues[indexToWrite] = ((source + 1) / 2) * (to - from) + from;
  }
}