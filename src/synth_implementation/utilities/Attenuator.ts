import {AttenuatorClass} from "../../language/classes";
import {SoundNode} from "../SoundNode";

export class Attenuator implements SoundNode {
  static info = AttenuatorClass;
  info = () => AttenuatorClass;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const input = socketsValues[0];
    const gain = socketsValues[1];
    outputValues[indexToWrite] = input * gain;
  }
}