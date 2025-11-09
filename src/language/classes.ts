import {SoundNodeClassInfo} from "./SoundNodeClassInfo";

export const UserOutput: SoundNodeClassInfo = {
  className: "UserOutput",
  classGroup: "UserInterface",
  sockets: ["input"],
  outputs: [],
  positionalArgs: [],
}

export const UserStereoOutput: SoundNodeClassInfo = {
  className: "UserStereoOutput",
  classGroup: "UserInterface",
  sockets: ["left", "right"],
  outputs: [],
  positionalArgs: [],
}

export const UserInput: SoundNodeClassInfo = {
  className: "UserInput",
  classGroup: "UserInterface",
  sockets: [],
  outputs: ["output"],
  positionalArgs: [],
}

export const UserStereoInput: SoundNodeClassInfo = {
  className: "UserInput",
  classGroup: "UserInterface",
  sockets: [],
  outputs: ["left", "right"],
  positionalArgs: [],
}

export const InverterClass: SoundNodeClassInfo = {
  className: "Inverter",
  classGroup: "Utility",
  sockets: [
    "input"
  ],
  outputs: ["output"],
}

export const AttenuatorClass: SoundNodeClassInfo = {
  className: "Attenuator",
  classGroup: "Utility",
  sockets: [
    ["amount", "amt", "a", "gain", "g"],
    "input"
  ],
  outputs: ["output"],
}

export const MappingClass: SoundNodeClassInfo = {
  className: "Mapping",
  classGroup: "Utility",
  sockets: [
    "source",
    "from",
    "to"
  ],
  outputs: ["output"],
}

export const BipolarMappingClass: SoundNodeClassInfo = {
  className: "BipolarMapping",
  classGroup: "Utility",
  sockets: [
    "source",
    "from",
    "to"
  ],
  outputs: ["output"],
}

export const KnobClass: SoundNodeClassInfo = {
  className: "Knob",
    classGroup: "UserInterface",
  sockets: [],
  outputs: ["output"],
}

export const BASIC_CLASSES: SoundNodeClassInfo[] = [
  InverterClass,
  AttenuatorClass,
  MappingClass,
  KnobClass,
] // Classes necessary for basic functionality

export const classesList: SoundNodeClassInfo[] = [
  ...BASIC_CLASSES,
]

export const classesAlias: Map<string, SoundNodeClassInfo> = new Map();

export function registerSoundNodeClass(cls: SoundNodeClassInfo) {
  if (classesList.find(existingCls => existingCls.className === cls.className)) {
    return;
  }
  classesList.push(cls);
}

export function registerSoundNodeClassAlias(alias: string, className: string) {
  classesAlias.set(alias, classesList.find(cls => cls.className === className)!);
}