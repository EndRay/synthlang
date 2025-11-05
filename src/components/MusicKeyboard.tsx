import "../styles/magicKeyboard.css";
import {forwardRef, useState} from "react";
import {
  checkHotkey,
  HOTKEY_CHANGE_FOCUS,
  MK_HIGH_KEYS_IN_ORDER,
  MK_LOW_KEYS_IN_ORDER,
  MK_OCTAVE_DOWN,
  MK_OCTAVE_UP
} from "../hotkeys";

interface MagicKeyboardProps {
  onKeyDown: (note: number) => void;
  onKeyUp: (note: number) => void;
  onBlur?: () => void;
  changeFocus?: () => void;
}

const KEY_TO_NOTE_OFFSET: { [key: string]: number } = {};
for (let i = 0; i < MK_LOW_KEYS_IN_ORDER.length; i++) {
  KEY_TO_NOTE_OFFSET[MK_LOW_KEYS_IN_ORDER[i]] = i;
}
for (let i = 0; i < MK_HIGH_KEYS_IN_ORDER.length; i++) {
  KEY_TO_NOTE_OFFSET[MK_HIGH_KEYS_IN_ORDER[i]] = i + 12;
}
export const MusicKeyboard = forwardRef<HTMLDivElement, MagicKeyboardProps>(({
                                                                               onKeyDown,
                                                                               onKeyUp,
                                                                               onBlur,
                                                                               changeFocus
                                                                             }, ref) => {
  const [currentLowestNote, setCurrentLowestNote] = useState(48) // C3

  return <>
    <div ref={ref} tabIndex={-1}
         className={"music-keyboard"}
         onKeyDown={(e) => {
           e.preventDefault();
           if (e.repeat) return;
           console.log("Key down:", e.code, e.ctrlKey || e.metaKey, e.shiftKey, e.altKey);
           if (checkHotkey(e, HOTKEY_CHANGE_FOCUS)) {
             changeFocus?.();
             return;
           }
           if (checkHotkey(e, MK_OCTAVE_DOWN)) {
             setCurrentLowestNote(n => n - 12);
             return;
           }
           if (checkHotkey(e, MK_OCTAVE_UP)) {
             setCurrentLowestNote(n => n + 12);
             return;
           }
           const key = e.key.toLowerCase();
           if (key in KEY_TO_NOTE_OFFSET) {
             const noteOffset = KEY_TO_NOTE_OFFSET[key];
             const note = currentLowestNote + noteOffset;
             onKeyDown(note);
           }
         }} onKeyUp={(e) => {
      e.preventDefault();
      console.log("Key up:", e.code, e.ctrlKey || e.metaKey, e.shiftKey, e.altKey);
      const key = e.key.toLowerCase();
      if (key in KEY_TO_NOTE_OFFSET) {
        const noteOffset = KEY_TO_NOTE_OFFSET[key];
        const note = currentLowestNote + noteOffset;
        onKeyUp(note);
      }
    }} onBlur={() => {
      onBlur?.();
    }}>
      Music Keyboard
    </div>
  </>
});