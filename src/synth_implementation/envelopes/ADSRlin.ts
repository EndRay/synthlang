import {SoundNode} from "../SoundNode";
import {toSeconds} from "../conversions";
import {SAMPLE_RATE} from "../constants";

const INFO = {
  className: "ADSRlin",
  classGroup: "Envelope",
  sockets: [
    ["gate"],
    ["trigger", "trig", "retrigger", "retrig"], // retrigger to restart the envelope, works without gate
    ["attack", "att", "a", "A"],
    ["decay", "dec", "d", "D"],
    ["sustain", "sus", "s", "S"],
    ["release", "rel", "r", "R"],
  ],
  outputs: ["output"],
  positionalArgs: ["attack", "decay", "sustain", "release"],
};

const STATE_IDLE = 0;
const STATE_ATTACK = 1;
const STATE_DECAY = 2;
const STATE_SUSTAIN = 3;
const STATE_RELEASE = 4;

export class ADSRlin implements SoundNode {
  static info = INFO;
  info = () => INFO;

  private state = STATE_IDLE;
  private output: number = 0;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const gate = socketsValues[0];
    const trigger = socketsValues[1];
    const attack = toSeconds(socketsValues[2]) * SAMPLE_RATE;
    const decay = toSeconds(socketsValues[3]) * SAMPLE_RATE;
    const sustain = socketsValues[4];
    const release = toSeconds(socketsValues[5]) * SAMPLE_RATE;

    const isGateOn = gate > 0.5; // unsure if this is the best way to handle gate
    const isTriggered = trigger > 0.5;
    if (isTriggered) {
      this.state = STATE_ATTACK;
    }
    if (isGateOn && (this.state === STATE_IDLE || this.state === STATE_RELEASE)) {
      this.state = STATE_ATTACK;
    }
    if (!isGateOn && (this.state === STATE_ATTACK || this.state === STATE_DECAY || this.state === STATE_SUSTAIN)) {
      this.state = STATE_RELEASE;
    }

    switch (this.state) {
      case STATE_IDLE: {
        this.output = 0;
        break;
      }
      case STATE_ATTACK: {
        if (attack <= 0) {
          this.output = 1;
          this.state = STATE_DECAY;
        } else {
          this.output += 1 / attack;
          if (this.output >= 1) {
            this.output = 1;
            this.state = STATE_DECAY;
          }
        }
        break;
      }
      case STATE_DECAY: {
        if (decay <= 0) {
          this.output = sustain;
          this.state = STATE_SUSTAIN;
        } else {
          this.output -= 1 / decay;
          if (this.output <= sustain) {
            this.output = sustain;
            this.state = STATE_SUSTAIN;
          }
        }
        break;
      }
      case STATE_SUSTAIN: {
        this.output = sustain;
        break;
      }
      case STATE_RELEASE: {
        if (release <= 0) {
          this.output = 0;
          this.state = STATE_IDLE;
        } else {
          this.output -= 1 / release;
          if (this.output <= 0) {
            this.output = 0;
            this.state = STATE_IDLE;
          }
        }
        break;
      }
    }

    outputValues[indexToWrite] = this.output;
  }
}