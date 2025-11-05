import {UserInput, UserStereoInput, UserStereoOutput} from "./classes";
import {SoundNodeClassInfo} from "./SoundNodeClassInfo";

export const GLOBAL_BUILTIN: Map<string, SoundNodeClassInfo> = new Map([
  ["trigger", UserInput],
  ["gate", UserInput],
  ["pitch", UserInput],
  ["velocity", UserInput],
  ["output", UserStereoOutput],
]);

export const VOICE_BUILTIN: Map<string, SoundNodeClassInfo> = new Map([
  ["trigger", UserInput],
  ["gate", UserInput],
  ["pitch", UserInput],
  ["velocity", UserInput],
  ["voiceT", UserInput],
]);