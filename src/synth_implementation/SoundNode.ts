import {SoundNodeClassInfo} from "../language/SoundNodeClassInfo";
import {registerSoundNodeClass} from "../language/classes";
import {
  UserInput,
  UserStereoInput,
  UserOutput,
  UserStereoOutput,
} from "./user_interface/io";
import {Attenuator} from "./utilities/Attenuator";
import {Inverter} from "./utilities/Inverter";
import {Mapping} from "./utilities/Mapping";
import {BipolarMapping} from "./utilities/BipolarMapping";

export const CLASS_NAME_TO_SOUND_NODE_CONSTRUCTOR: { [className: string]: () => SoundNode } = {
  UserInput: () => new UserInput(),
  UserStereoInput: () => new UserStereoInput(),
  UserOutput: () => new UserOutput(),
  UserStereoOutput: () => new UserStereoOutput(),

  Inverter: () => new Inverter(),
  Attenuator: () => new Attenuator(),
  Mapping: () => new Mapping(),
  BipolarMapping: () => new BipolarMapping(),

  // Mandatory basic classes should be registered here separately
  // Dynamic classes can be registered using the registerSoundNode function
};

export interface SoundNode {
  info: () => SoundNodeClassInfo;

  calculateValue(socketsValues: number[], outputValues: number[], indexToWrite: number): void;
}

export function registerSoundNode(info: SoundNodeClassInfo, constructor: () => SoundNode): void {
  registerSoundNodeClass(info);
  CLASS_NAME_TO_SOUND_NODE_CONSTRUCTOR[info.className] = constructor;
}