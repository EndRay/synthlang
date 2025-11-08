import "../styles/musicKeyboard.css";
import {forwardRef, useRef, useState} from "react";
import {
  checkHotkey,
  HOTKEY_CHANGE_FOCUS, HOTKEY_CHANGE_FOCUS_FROM_MUSIC_KEYBOARD,
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
  onFocus?: () => void;
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
                                                                               onBlur = () => {
                                                                               },
                                                                               changeFocus = () => {
                                                                               },
                                                                               onFocus = () => {
                                                                               }
                                                                             }, ref) => {
  const [currentLowestNote, setCurrentLowestNote] = useState(48) // C3
  const pressedKeyToNoteMapRef = useRef(new Map<string, number>());

  return <>
    <div ref={ref} tabIndex={-1}
         className={"music-keyboard"}
         onKeyDown={(e) => {
           if (e.repeat) return;
           console.log("Key down:", e.code, e.ctrlKey || e.metaKey, e.shiftKey, e.altKey);
           if (checkHotkey(e, HOTKEY_CHANGE_FOCUS) || checkHotkey(e, HOTKEY_CHANGE_FOCUS_FROM_MUSIC_KEYBOARD)) {
             changeFocus();
             e.preventDefault();
             return;
           }
           if (checkHotkey(e, MK_OCTAVE_DOWN)) {
             setCurrentLowestNote(n => n - 12);
             e.preventDefault();
             return;
           }
           if (checkHotkey(e, MK_OCTAVE_UP)) {
             setCurrentLowestNote(n => n + 12);
             e.preventDefault();
             return;
           }
           const key = e.key.toLowerCase();
           if (key in KEY_TO_NOTE_OFFSET) {
             const noteOffset = KEY_TO_NOTE_OFFSET[key];
             const note = currentLowestNote + noteOffset;
             pressedKeyToNoteMapRef.current.set(key, note);
             onKeyDown(note);
             e.preventDefault();
           }
         }} onKeyUp={(e) => {
      e.preventDefault();
      console.log("Key up:", e.code, e.ctrlKey || e.metaKey, e.shiftKey, e.altKey);
      const key = e.key.toLowerCase();
      if (pressedKeyToNoteMapRef.current.has(key)) {
        if (pressedKeyToNoteMapRef.current.has(key)) {
          onKeyUp(pressedKeyToNoteMapRef.current.get(key)!);
          pressedKeyToNoteMapRef.current.delete(key);
        }
      }
    }} onBlur={onBlur} onFocus={onFocus}>
      Music Keyboard
    </div>
  </>
});