import {useEffect, useRef, useState} from "react";
import {Synth} from "./synth_implementation/Synth";
import {SynthCodeEditor} from "./components/SynthCodeEditor";
import {Lexer} from "./language/Lexer";
import {Parser} from "./language/Parser";
import {Resolver} from "./language/Resolver";
import {classesList, registerSoundNodeClassAlias} from "./language/classes";
import {IRBuilder} from "./language/IRBuilder";

import {registerSoundNode} from "./synth_implementation/SoundNode";
import {Sine} from "./synth_implementation/oscillators/Sine";
import {Square} from "./synth_implementation/oscillators/Square";
import {Triangle} from "./synth_implementation/oscillators/Triangle";
import {Sawtooth} from "./synth_implementation/oscillators/Saw";
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
import {ReactCodeMirrorRef} from "@uiw/react-codemirror";
import {Delay} from "./synth_implementation/effects/Delay";
import {PingPongDelay} from "./synth_implementation/effects/PingPongDelay";
import Oscilloscope, {OSCILLOSCOPE_DATA_SIZE} from "./components/Oscilloscope";
import {KnobContainer} from "./components/knob_container/KnobContainer";
import {Help} from "./components/help/Help";
import "./styles/groupColors.css"


export default function App() {
  const synthRef = useRef<Synth | null>(null);

  const editorRef = useRef<ReactCodeMirrorRef | null>(null);
  const musicKeyboardRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<AudioPlayerHandle | null>(null);

  const [knobValues, setKnobValues] = useState<Map<string, number>>(new Map());
  const knobValuesChangesRef = useRef<Map<string, number>>(new Map());

  const monoDataRef = useRef<Float32Array>(new Float32Array(OSCILLOSCOPE_DATA_SIZE));
  const isClippedRef = useRef<boolean>(false);

  function makeChunk(chunkFrames: number): Float32Array {
    const synth = synthRef.current;

    let chunk = new Float32Array(2 * chunkFrames);
    if (synth) {
      for (const [knobName, knobValue] of knobValuesChangesRef.current) {
        synth?.setKnobValue(knobName, knobValue);
      }
      knobValuesChangesRef.current = new Map();
      chunk = synth.getSamples(chunkFrames);

      const isClipped = chunk.some(sample => sample > 1 || sample < -1);
      chunk = chunk.map(sample => Math.max(-1, Math.min(1, sample)));

      const leftChunk = new Float32Array(chunkFrames);
      const rightChunk = new Float32Array(chunkFrames);
      const monoChunk = new Float32Array(chunkFrames);
      for (let i = 0; i < chunkFrames; i++) {
        leftChunk[i] = chunk[i * 2];
        rightChunk[i] = chunk[i * 2 + 1];
        monoChunk[i] = (leftChunk[i] + rightChunk[i]) / 2;
      }

      const prev = monoDataRef.current;
      let currentData = new Float32Array(OSCILLOSCOPE_DATA_SIZE);

      for (let i = 0; i < prev.length - monoChunk.length; i++) {
        currentData[i] = prev[i + monoChunk.length];
      }
      for (let i = 0; i < monoChunk.length; i++) {
        currentData[i + prev.length - monoChunk.length] = monoChunk[i];
      }
      monoDataRef.current = currentData;
      isClippedRef.current = isClipped;
    }
    return chunk;
  }

  const [synthCode, setSynthCode] = useState("");
  const [code, setCode] = useState(localStorage.getItem("synthCode") || "");

  const changeCode = (newCode: string) => {
    setCode(newCode);
    localStorage.setItem("synthCode", newCode);
  }

  useEffect(() => {
    registerSoundNode(Mix.info, () => new Mix());
    registerSoundNode(StereoMix.info, () => new StereoMix());

    registerSoundNode(WhiteNoise.info, () => new WhiteNoise());

    registerSoundNode(Sawtooth.info, () => new Sawtooth());
    registerSoundNode(Square.info, () => new Square());
    registerSoundNode(Triangle.info, () => new Triangle());
    registerSoundNode(Sine.info, () => new Sine());

    registerSoundNode(LowPass12db.info, () => new LowPass12db());
    registerSoundNode(LowPass24db.info, () => new LowPass24db());

    registerSoundNode(ADSRlin.info, () => new ADSRlin());
    registerSoundNode(ADSRlog.info, () => new ADSRlog());

    registerSoundNode(Delay.info, () => new Delay());
    registerSoundNode(PingPongDelay.info, () => new PingPongDelay());

    registerSoundNodeClassAlias("Sqr", "Square");
    registerSoundNodeClassAlias("Tri", "Triangle");
    registerSoundNodeClassAlias("Sin", "Sine");
    registerSoundNodeClassAlias("Saw", "Sawtooth");
    registerSoundNodeClassAlias("ADSR", "ADSRlog");
  }, []);

  const rebuildSynth = (tryStartAudio=true) => {
    const lexResult = new Lexer(code).lex();
    const parseResult = new Parser(lexResult).parse();
    const resolveResult = new Resolver(parseResult, classesList).resolve();

    const hasErrors =
      lexResult.lexicalErrors.length > 0 ||
      parseResult.syntaxErrors.length > 0 ||
      resolveResult.semanticErrors.length > 0;

    if (!hasErrors) {
      const interpretationResult = new IRBuilder(resolveResult).build();
      if (interpretationResult.interpretationErrors.length === 0) {
        const synthStructure = interpretationResult.structure!;
        console.log(synthStructure);
        const synth = new Synth(synthStructure, 5);
        synthRef.current = synth;
        const newKnobValues = new Map<string, number>();
        for (const knobName of synth.knobNames) {
          const oldValue = knobValues.get(knobName);
          const value = oldValue ?? 0.5;
          newKnobValues.set(knobName, value);
          synthRef.current!.setKnobValue(knobName, value);
        }
        setKnobValues(newKnobValues);
        setSynthCode(code);
        if (tryStartAudio) {
          audioPlayerRef.current?.start();
        }
      }
    }
  }

  const setKnobValue = (knobName: string, knobValue: number) => {
    setKnobValues(prev => {
      const newMap = new Map(prev);
      newMap.set(knobName, knobValue);
      return newMap;
    });
    knobValuesChangesRef.current.set(knobName, knobValue);
  }

  useEffect(() => {
    // workaround for autoplay policy
    rebuildSynth(false);
    synthRef.current = null;
    setSynthCode("");
  }, []);

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
      <div style={{
        display: "grid",
        gap: "20px 10px",
        gridTemplateRows: "auto 600px",
        gridTemplateColumns: "800px 600px",
        height: "100%",
        padding: "10px",
        boxSizing: "border-box",
        justifyItems: "center",
      }}>
        <KnobContainer
          knobValues={knobValues}
          setKnobValue={setKnobValue}
        />
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          justifyContent: "space-around"
        }}>
          <Oscilloscope
            dataRef={monoDataRef}
            isClippedRef={isClippedRef}
            width={400}
            height={300}
          />
          <MusicKeyboard
            ref={musicKeyboardRef}
            onKeyDown={note => synthRef.current?.pressNote(note, 1)}
            onKeyUp={note => synthRef.current?.releaseNote(note, 1)}
            onBlur={() => synthRef.current?.releaseAllNotes()}
            onFocus={rebuildSynth}
            changeFocus={() => {
              editorRef.current?.view?.focus();
            }}
          />
        </div>
        <SynthCodeEditor
          ref={editorRef}
          value={code}
          synthCode={synthCode}
          onChange={changeCode}
          changeFocus={() => {
            musicKeyboardRef.current?.focus();
          }}
          rebuildSynth={rebuildSynth}
        />
        <Help
          setCode={changeCode}
        />
      </div>
    </div>
  )
    ;
}