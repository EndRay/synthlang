import { KeyboardEvent } from 'react';
import { KeyBinding } from '@codemirror/view';

export interface HotkeyDefinition {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export const HOTKEY_REBUILD_SYNTH: HotkeyDefinition = {
  key: 'Enter',
  mod: true,
};

export const HOTKEY_CHANGE_FOCUS: HotkeyDefinition = {
  key: 'q',
  mod: true,
};

export const MK_OCTAVE_DOWN: HotkeyDefinition = { key: "[" };
export const MK_OCTAVE_UP: HotkeyDefinition = { key: "]" };
export const MK_LOW_KEYS_IN_ORDER = "zsxdcvgbhnjm,l.;/"
export const MK_HIGH_KEYS_IN_ORDER = "q2w3er5t6y7ui9o0p"

export function checkHotkey(event: KeyboardEvent | globalThis.KeyboardEvent, hotkey: HotkeyDefinition): boolean {
  return (
    event.key.toLowerCase() === hotkey.key.toLowerCase() &&
    ((event.ctrlKey || event.metaKey) === (hotkey.mod ?? false)) &&
    (event.shiftKey === (hotkey.shift ?? false)) &&
    (event.altKey === (hotkey.alt ?? false))
  );
}

export function createCodeMirrorKey(hotkey: HotkeyDefinition): string {
  const parts: string[] = [];
  if (hotkey.mod) parts.push('Mod');
  if (hotkey.alt) parts.push('Alt');
  if (hotkey.shift) parts.push('Shift');

  parts.push(hotkey.key);

  return parts.join('-');
}