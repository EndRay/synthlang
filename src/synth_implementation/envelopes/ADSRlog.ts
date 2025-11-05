import {SoundNode} from "../SoundNode";
import {toSeconds} from "../conversions";
import {SAMPLE_RATE} from "../constants";

const INFO = {
  className: "ADSRlog", // Changed name to reflect exponential nature
  classGroup: "Envelope",
  sockets: [
    ["gate"],
    ["trigger", "trig", "retrigger", "retrig"],
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

const MIN_VALUE = 0.01;

export class ADSRlog implements SoundNode {
  static info = INFO;
  info = () => INFO;

  private state = STATE_IDLE;
  private output: number = 0.0;

  // --- Pre-calculated multipliers for each stage ---
  private attackMultiplier: number = 1.0;
  private decayMultiplier: number = 1.0;
  private releaseMultiplier: number = 1.0;
  private sustainLevel: number = 1.0;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    const gate = socketsValues[0];
    const trigger = socketsValues[1];
    const attackSamples = toSeconds(socketsValues[2]) * SAMPLE_RATE;
    const decaySamples = toSeconds(socketsValues[3]) * SAMPLE_RATE;
    const sustain = socketsValues[4];
    const releaseSamples = toSeconds(socketsValues[5]) * SAMPLE_RATE;

    const isGateOn = gate > 0.5;
    const isTriggered = trigger > 0.5;

    if (isTriggered || (isGateOn && (this.state === STATE_IDLE || this.state === STATE_RELEASE))) {
      this.state = STATE_ATTACK;
      this.attackMultiplier = Math.pow(MIN_VALUE, 1/attackSamples);
    } else if (!isGateOn && (this.state === STATE_ATTACK || this.state === STATE_DECAY || this.state === STATE_SUSTAIN)) {
      this.state = STATE_RELEASE;
      this.releaseMultiplier = Math.pow(MIN_VALUE, 1/releaseSamples);
    }

    switch (this.state) {
      case STATE_IDLE: {
        this.output = 0.0;
        break;
      }
      case STATE_ATTACK: {
        if (attackSamples <= 0) {
          this.output = 1.0;
        } else {
          this.output = 1 - (1 - this.output) * this.attackMultiplier;
        }

        if (this.output >= 1.0 - MIN_VALUE) {
          this.output = 1.0;
          this.state = STATE_DECAY;
          this.sustainLevel = Math.max(sustain, MIN_VALUE);
          this.decayMultiplier = Math.pow(MIN_VALUE, 1/decaySamples);
        }
        break;
      }
      case STATE_DECAY: {
        if (decaySamples <= 0) {
          this.output = this.sustainLevel;
        } else {
          this.output *= this.decayMultiplier;
        }

        if (this.output <= this.sustainLevel + MIN_VALUE) {
          this.output = this.sustainLevel;
          this.state = STATE_SUSTAIN;
        }
        break;
      }
      case STATE_SUSTAIN: {
        this.output = this.sustainLevel;
        break;
      }
      case STATE_RELEASE: {
        if (releaseSamples <= 0) {
          this.output = 0.0;
        } else {
          this.output *= this.releaseMultiplier;
        }

        if (this.output <= MIN_VALUE) {
          this.output = 0.0;
          this.state = STATE_IDLE;
        }
        break;
      }
    }

    outputValues[indexToWrite] = this.output;
  }
}