import {MappingClass} from "../../language/classes";
import {SoundNode} from "../SoundNode";

export class Mapping implements SoundNode {
  static info = MappingClass;
  info = () => MappingClass;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const source = socketsValues[0];
    const from = socketsValues[1];
    const to = socketsValues[2];

    outputValues[indexToWrite] = source * (to - from) + from;
  }
}