import "../../styles/examples.css";

interface ExamplesProps {
  setCode: (newCode: string) => void;
}

export const Examples = ({setCode}: ExamplesProps) => {

  return <div className={"examples-container"}>
    {EXAMPLES.map(([name, code]) =>
      <div className={"example-name"} key={name} onClick={() => setCode(code)}>
        {name}
      </div>
    )}
  </div>
}

const CODE_VIBRATO_EXAMPLE = `
Knob vibratoSpeed()
Knob vibratoDepth()

Knob volume()
Knob frequency()

Sine lfo(vibratoSpeed [10s, 10hz])
Sine osc(frequency [110hz, 440hz] + (lfo * vibratoDepth) * 12semi)
osc * volume => output
`.trim()

const CODE_WAVEFORMS_MIX = `
Knob sawtoothMix()
Knob squareMix()
Knob triangleMix()
Knob sineMix()

Knob volume()
Knob frequency()

f = frequency [110hz, 440hz]

oscSum = 
  Saw _(f) * sawtoothMix + 
  Sqr _(f) * squareMix +
  Tri _(f) * triangleMix +
  Sin _(f) * sineMix

oscSum * 0.25 * volume => output
`.trim()

const CODE_HARMONIC_SERIES = `
Knob harm1()
Knob harm2()
Knob harm3()
Knob harm4()
Knob harm5()
Knob harm6()
Knob harm7()
Knob harm8()

Knob volume()
Knob frequency()

f = frequency [110hz, 440hz]

oscSum = 
  harm1 * Sin _(f) + 
  harm2 * Sin _(f + 2x) + 
  harm3 * Sin _(f + 3x) + 
  harm4 * Sin _(f + 4x) + 
  harm5 * Sin _(f + 5x) + 
  harm6 * Sin _(f + 6x) + 
  harm7 * Sin _(f + 7x) + 
  harm8 * Sin _(f + 8x)

oscSum * 0.125 * volume => output
`.trim()

const CODE_SIMPLE_SYNTH = `
Knob attack()
Knob decay()
Knob sustain()
Knob release()

Knob filterEnvAmt()

Knob filterCutoff()
Knob filterResonance()

Mix voiceMix()
startvoice
Saw osc(pitch)
LowPass12db filter(.resonance=filterResonance)
ADSR env(
  attack  [10ms, 10s],
  decay   [10ms, 10s],
  sustain,
  release [10ms, 10s],
  .gate = gate
)
filter.cutoff <= (filterCutoff + env * filterEnvAmt [-1, 1]) [20hz, 10000hz]

osc * env => filter => voiceMix
endvoice
voiceMix * 0.2 => output
`.trim()

const EXAMPLES: [name: string, code: string][] = [
  ["vibrato example", CODE_VIBRATO_EXAMPLE],
  ["waveforms mix", CODE_WAVEFORMS_MIX],
  ["harmonic series", CODE_HARMONIC_SERIES],
  ["simple synth", CODE_SIMPLE_SYNTH],
]