import {SoundNode} from "../SoundNode";
import {SoundNodeClassInfo} from "../../language/SoundNodeClassInfo";
import {SAMPLE_PERIOD, SAMPLE_RATE} from "../constants";
import {read} from "node:fs";
import {toSeconds} from "../conversions";

const INFO: SoundNodeClassInfo = {
  className: "Delay",
  classGroup: "Effect",
  sockets: [
    "input",
    ["time", "t"],
    ["feedback", "fb"]
  ],
  outputs: [
    "output"
  ],
  positionalArgs: ["time", "feedback"],
}

const TAPE_LENGTH = SAMPLE_RATE * 5; // 5 seconds max delay

export class Delay implements SoundNode {
  static info = INFO;
  info = () => INFO;

  private readonly tape: Float32Array = new Float32Array(TAPE_LENGTH);
  private writePosition: number = 0;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number) {
    const input = socketsValues[0];
    const time = toSeconds(socketsValues[1]) * SAMPLE_RATE;
    const feedback = socketsValues[2];

    const readPosition = (this.writePosition - Math.floor(time) + TAPE_LENGTH) % TAPE_LENGTH;
    const delayedSample = this.tape[readPosition];
    const output = input + delayedSample;
    this.tape[this.writePosition] = input + delayedSample * feedback;
    this.writePosition = (this.writePosition + 1) % TAPE_LENGTH;

    outputValues[indexToWrite] = output;
  }
}