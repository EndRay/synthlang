import {SoundNode} from "../SoundNode";
import {SoundNodeClassInfo} from "../../language/SoundNodeClassInfo";
import {SAMPLE_RATE} from "../constants";
import {toSeconds} from "../conversions";

const INFO: SoundNodeClassInfo = {
  className: "PingPongDelay",
  classGroup: "Effect",
  sockets: [
    "input",
    ["time", "t"],
    ["feedback", "fb"]
  ],
  outputs: [
    "left",
    "right"
  ],
  positionalArgs: ["time", "feedback"],
}

const TAPE_LENGTH = SAMPLE_RATE * 5; // 5 seconds max delay

export class PingPongDelay implements SoundNode {
  static info = INFO;
  private readonly leftTape: Float32Array = new Float32Array(TAPE_LENGTH);
  private readonly rightTape: Float32Array = new Float32Array(TAPE_LENGTH);
  private writePosition: number = 0;

  info = () => INFO;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number) {
    const input = socketsValues[0];
    const time = toSeconds(socketsValues[1]) * SAMPLE_RATE;
    const feedback = socketsValues[2];

    const readPosition = (this.writePosition - Math.floor(time) + TAPE_LENGTH) % TAPE_LENGTH;
    const delayedSampleLeft = this.leftTape[readPosition];
    const delayedSampleRight = this.rightTape[readPosition];
    const outputLeft = delayedSampleLeft;
    const outputRight = delayedSampleRight;
    this.leftTape[this.writePosition] = input + delayedSampleRight * feedback;
    this.rightTape[this.writePosition] = delayedSampleLeft * feedback;
    this.writePosition = (this.writePosition + 1) % TAPE_LENGTH;

    outputValues[indexToWrite] = outputLeft;
    outputValues[indexToWrite + 1] = outputRight;
  }
}