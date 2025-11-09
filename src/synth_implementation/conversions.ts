import {HERTZ_TO_ZERO_VOLT, SAMPLE_RATE} from "./constants";
import {ConstantNumber} from "../language/SynthStructure";

export function fromHertz(hz: number): number {
  return Math.log2(hz / HERTZ_TO_ZERO_VOLT);
}
export function toHertz(value: number): number {
  return HERTZ_TO_ZERO_VOLT * Math.pow(2, value);
}

export function fromDecibels(db: number): number {
  return Math.pow(10, db / 20);
}
export function toDecibels(value: number): number {
  return 20 * Math.log10(value);
}

export function fromCents(cents: number): number {
  return cents / 1200;
}
export function toCents(value: number): number {
  return 1200 * value;
}

export function fromSemitones(semitones: number): number {
  return fromCents(semitones * 100);
}
export function toSemitones(value: number): number {
  return toCents(value) / 100;
}

export function fromSeconds(seconds: number): number {
  return fromHertz(1 / seconds);
}
export function toSeconds(value: number): number {
  return 1 / toHertz(value);
}

export function fromMilliseconds(ms: number): number {
  return fromSeconds(ms / 1000);
}
export function toMilliseconds(value: number): number {
  return toSeconds(value) * 1000;
}
export function fromMinutes(minutes: number): number {
  return fromSeconds(minutes * 60);
}
export function toMinutes(value: number): number {
  return toSeconds(value) / 60;
}
export function fromHours(hours: number): number {
  return fromSeconds(hours * 3600);
}
export function toHours(value: number): number {
  return toSeconds(value) / 3600;
}

export function fromRateCoefficient(x: number) {
  return Math.log2(x);
}
export function toRateCoefficient(value: number) {
  return Math.pow(2, value);
}

export function convertConstant(constant: ConstantNumber) {
  switch (constant.unit) {
    case "": return constant.value;
    case "db": return fromDecibels(constant.value);
    case "hz": return fromHertz(constant.value);
    case "ms": return fromMilliseconds(constant.value);
    case "s": return fromSeconds(constant.value);
    case "m": return fromMinutes(constant.value);
    case "h": return fromHours(constant.value);
    case "semi": return fromSemitones(constant.value);
    case "cent": return fromCents(constant.value);
    case "x": return fromRateCoefficient(constant.value);
    default: {
      console.log(`Unknown unit: ${constant.unit}`); return constant.value;
    }
  }
}