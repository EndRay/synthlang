import {useEffect, useMemo, useRef, useState} from "react";
import {Synth} from "./synth_implementation/Synth";
import {SynthCodeEditor} from "./components/SynthCodeEditor";
import {Lexer} from "./language/Lexer";
import {Parser} from "./language/Parser";
import {Resolver} from "./language/Resolver";
import {CLASSES_LIST} from "./language/classes";
import {IRBuilder} from "./language/IRBuilder";

import {registerSoundNode} from "./synth_implementation/SoundNode";
import {Sine} from "./synth_implementation/oscillators/Sine";
import {Square} from "./synth_implementation/oscillators/Square";
import {Triangle} from "./synth_implementation/oscillators/Triangle";
import {Saw} from "./synth_implementation/oscillators/Saw";
import {Mix} from "./synth_implementation/utilities/Mix";
import {StereoMix} from "./synth_implementation/utilities/StereoMix";
import {LowPass12db} from "./synth_implementation/filters/LowPass12db";
import {LowPass24db} from "./synth_implementation/filters/LowPass24db";
import {WhiteNoise} from "./synth_implementation/noises/WhiteNoise";
import {ADSRlin} from "./synth_implementation/envelopes/ADSRlin";
import {ADSRlog} from "./synth_implementation/envelopes/ADSRlog";
import "./App.css";
import {MusicKeyboard} from "./components/MusicKeyboard";
import {AudioPlayer, AudioPlayerHandle} from "./components/AudioPlayer";
import {MidiParser} from "./components/MidiParser";
import {ReactCodeMirrorRef} from "@uiw/react-codemirror";
import {Delay} from "./synth_implementation/effects/Delay";
import {PingPongDelay} from "./synth_implementation/effects/PingPongDelay";


export default function App() {
  const synthRef = useRef<Synth | null>(null);

  const editorRef = useRef<ReactCodeMirrorRef | null>(null);
  const musicKeyboardRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<AudioPlayerHandle | null>(null);

  function makeChunk(chunkFrames: number): Float32Array {
    const synth = synthRef.current;
    let chunk = new Float32Array(chunkFrames);
    if (synth) {
      chunk = synth.getSamples(chunkFrames);
    }
    return chunk;
  }

  const [synthCode, setSynthCode] = useState("");
  const [code, setCode] = useState(initialCode);

  // do once
  useEffect(() => {
    registerSoundNode(Mix.info, () => new Mix());
    registerSoundNode(StereoMix.info, () => new StereoMix());

    registerSoundNode(WhiteNoise.info, () => new WhiteNoise());

    registerSoundNode(Saw.info, () => new Saw());
    registerSoundNode(Square.info, () => new Square());
    registerSoundNode(Triangle.info, () => new Triangle());
    registerSoundNode(Sine.info, () => new Sine());

    registerSoundNode(LowPass12db.info, () => new LowPass12db());
    registerSoundNode(LowPass24db.info, () => new LowPass24db());

    registerSoundNode(ADSRlin.info, () => new ADSRlin());
    registerSoundNode(ADSRlog.info, () => new ADSRlog());

    registerSoundNode(Delay.info, () => new Delay());
    registerSoundNode(PingPongDelay.info, () => new PingPongDelay());
  }, []);

  const rebuildSynth = () => {
    const lexResult = new Lexer(code).lex();
    const parseResult = new Parser(lexResult).parse();
    const resolveResult = new Resolver(parseResult, CLASSES_LIST).resolve();

    const hasErrors =
      lexResult.lexicalErrors.length > 0 ||
      parseResult.syntaxErrors.length > 0 ||
      resolveResult.semanticErrors.length > 0;

    if (!hasErrors) {
      const interpretationResult = new IRBuilder(resolveResult).build();
      if (interpretationResult.interpretationErrors.length === 0) {
        const synthStructure = interpretationResult.structure!;
        console.log(synthStructure);
        synthRef.current = new Synth(synthStructure, 5);
        setSynthCode(code);
        audioPlayerRef.current?.start();
      }
    }
  }

  return (

    <div className="App-body">
      <AudioPlayer
        ref={audioPlayerRef}
        makeChunk={makeChunk}
      />
      {/*<MidiParser*/}
      {/*  onKeyDown={(note, velocity) => synthRef.current?.pressNote(note, velocity)}*/}
      {/*  onKeyUp={(note, releaseVelocity) => synthRef.current?.releaseNote(note, releaseVelocity)}*/}
      {/*/>*/}
      <MusicKeyboard
        ref={musicKeyboardRef}
        onKeyDown={note => synthRef.current?.pressNote(note, 1)}
        onKeyUp={note => synthRef.current?.releaseNote(note, 1)}
        onBlur={() => synthRef.current?.releaseAllNotes()}
        changeFocus={() => {
          editorRef.current?.view?.focus();
        }}
      />
      <SynthCodeEditor
        ref={editorRef}
        value={code}
        synthCode={synthCode}
        onChange={setCode}
        changeFocus={() => {
          musicKeyboardRef.current?.focus();
        }}
        rebuildSynth={rebuildSynth}
      />
    </div>
  );
}

const initialCode = `
PingPongDelay delay(400ms, 0.7)
Mix voiceMix()
startvoice
ADSRlog env(1ms, 1000ms, 0.4, 3000ms, .gate=gate)
oscMix = Saw osc(pitch) + Saw osc2(pitch + 12semi + 10cent)
LowPass12db filter(env [200hz, 7000hz])
oscMix => filter
          filter * env * 0.1 => voiceMix
endvoice
voiceMix => output
voiceMix => delay => output

`.trim()