
export type AliasList = string[];

export interface SoundNodeClassInfo {
  className: string;

  sockets: (string | AliasList)[];
  outputs: (string | AliasList)[];

  positionalArgs?: string[]; // for positional arguments in constructor

  classGroup?: string; // e.g. "Oscillator", "Filter", "Effect"
}

export function getSocket(cls: SoundNodeClassInfo, socket: string): string | null {
  for (const s of cls.sockets) {
    if (typeof s === "string") {
      if (s === socket) return socket;
    } else {
      if (s.includes(socket)) return s[0];
    }
  }
  return null;
}

export function getOutput(cls: SoundNodeClassInfo, output: string): string | null {
  for (const o of cls.outputs) {
    if (typeof o === "string") {
      if (o === output) return o;
    } else {
      if (o.includes(output)) return o[0];
    }
  }
  return null;
}

export function canBeInput(cls: SoundNodeClassInfo | null): boolean {
  if (cls === null) return false;
  return getSocket(cls, "input") !== null ||
         getSocket(cls, "left") !== null && getSocket(cls, "right") !== null;
}

export function canBeOutput(cls: SoundNodeClassInfo | null): boolean {
  if (cls === null) return false;
  return getOutput(cls, "output") !== null ||
         getOutput(cls, "left") !== null && getOutput(cls, "right") !== null;
}