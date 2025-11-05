import React, {forwardRef} from "react";
import CodeMirror, {Prec, ReactCodeMirrorRef} from "@uiw/react-codemirror";
import {EditorView} from "@codemirror/view";
import {myLanguageHighlight} from "../editor/myLanguageHighlight";
import {myLanguageLinter} from "../editor/myLanguageLinter";
import {lintGutter} from "@codemirror/lint";
import {openPanelOnGutterClick} from "../editor/openPanelOnGutterClick";
import {keymap} from "@codemirror/view";

import "../styles/myLanguageTheme.css";
import "../styles/myLinterTheme.css";
import "../styles/synthCodeEditor.css";
import {createCodeMirrorKey, HOTKEY_CHANGE_FOCUS, HOTKEY_REBUILD_SYNTH} from "../hotkeys";

interface SynthCodeEditorProps {
  value: string;
  synthCode?: string;
  onChange: (value: string) => void;
  rebuildSynth?: () => void;
  changeFocus?: () => void;
}

const keymapRebuildSynth = (func: () => void) => Prec.highest(keymap.of([
  {
    key: createCodeMirrorKey(HOTKEY_REBUILD_SYNTH),
    run: () => {
      func();
      return true;
    },
  },
]));

const keymapChangeFocus = (func: () => void) => Prec.highest(keymap.of([
  {
    key: createCodeMirrorKey(HOTKEY_CHANGE_FOCUS),
    run: () => {
      func();
      return true;
    },
  },
]));

const SYNTH_BUILT_EMOJI = "✅";
const SYNTH_CHANGED_EMOJI = "⚠️";
const SYNTH_ERROR_EMOJI = "❌";

export const SynthCodeEditor = forwardRef<ReactCodeMirrorRef, SynthCodeEditorProps>(({
                                                                                       value,
                                                                                       onChange,
                                                                                       synthCode,
                                                                                       rebuildSynth,
                                                                                       changeFocus
                                                                                     }, ref) => {
  return (
    <div style={{
      height: "600px",
      maxWidth: "800px",
      width: "100%",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{width: "100%", textAlign: "end", display: "flex", justifyContent: "flex-end", alignItems: "center"}}>
        {synthCode !== undefined ?
          <div style={{display: "flex", fontSize: 16}}>
            {
              synthCode === value ? (
                <span title="Synth is built and up to date" style={{marginRight: 8}}>
                  {SYNTH_BUILT_EMOJI}
                </span>
              ) : (
                <span title="Synth code has changed and needs to be rebuilt" style={{marginRight: 8}}>
                  {SYNTH_CHANGED_EMOJI}
                </span>
              )

            }
          </div> : <></>
        }
        <button
          className={`rebuild ${synthCode === value ? "ready" : "changed"}`}
          disabled={synthCode === value}
          onClick={rebuildSynth}>
          Rebuild Synth (Ctrl+Enter)
        </button>
      </div>
      <div style={{flexGrow: 1, minHeight: 0}}>
        <CodeMirror
          ref={ref}
          value={value}
          height={"100%"}
          onChange={(v) => onChange(v)}
          extensions={[
            keymapRebuildSynth(rebuildSynth ?? (() => {
            })),
            keymapChangeFocus(changeFocus ?? (() => {
            })),
            myLanguageHighlight,
            myLanguageLinter,
            EditorView.lineWrapping,
            lintGutter(),
            openPanelOnGutterClick,
          ]}
          basicSetup={{lineNumbers: true, highlightActiveLine: true}}
          theme="dark"
          style={{fontSize: 14, height: "100%"}}
        />
      </div>
    </div>
  );
});