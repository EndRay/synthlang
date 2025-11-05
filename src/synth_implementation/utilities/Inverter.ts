import {InverterClass} from "../../language/classes";
import {SoundNode} from "../SoundNode";

export class Inverter implements SoundNode {
  static info = InverterClass;
  info = () => InverterClass;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    outputValues[indexToWrite] = -socketsValues[0];
  }
}