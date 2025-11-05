import {useEffect, useState} from "react";
import MIDIInput = WebMidi.MIDIInput;
import MIDIMessageEvent = WebMidi.MIDIMessageEvent;

interface MidiParserProps {
  onKeyDown: (note: number, velocity: number) => void;
  onKeyUp: (note: number, releaseVelocity: number) => void;
}

export function MidiParser({onKeyDown, onKeyUp}: MidiParserProps) {
  const [inputs, setInputs] = useState<MIDIInput[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>('');

  useEffect(() => {
    const setupMIDI = async () => {
      try {
        const midiAccess = await navigator.requestMIDIAccess();
        const midiInputs = Array.from(midiAccess.inputs.values());
        setInputs(midiInputs);

        // Set the first available input as the default
        if (midiInputs.length > 0) {
          setSelectedInputId(midiInputs[0].id);
        }

        // Listen for changes in MIDI device connections
        midiAccess.onstatechange = () => {
          const updatedInputs = Array.from(midiAccess.inputs.values());
          setInputs(updatedInputs);
        };

      } catch (error) {
        console.error('Failed to get MIDI access.', error);
        alert('Could not access your MIDI devices. Please ensure you are using a compatible browser like Chrome and have granted permission.');
      }
    };

    setupMIDI();
  }, []);

    useEffect(() => {
      const selectedInput = inputs.find(input => input.id === selectedInputId);

      if (!selectedInput) {
        return;
      }

      const onMIDIMessage = (event: MIDIMessageEvent) => {
        console.log(event);
        const data = event.data
        const command = data[0] >> 4;
        const channel = data[0] & 0xf;
        const noteNumber = data[1];
        const velocity = data[2];
        if (command === 9) {
          console.log(`Note On: ${noteNumber} Velocity: ${velocity} Channel: ${channel}`);
          onKeyDown(noteNumber, velocity / 127);
        } else if (command === 8) {
          console.log(`Note Off: ${noteNumber} Velocity: ${velocity} Channel: ${channel}`);
          onKeyUp(noteNumber, velocity / 127);
        }
      };
      console.log("SET")
      selectedInput.onmidimessage = onMIDIMessage;

      return () => {
        console.log("UNSET")
        selectedInput.onmidimessage = null!;
      };
    }, [selectedInputId, inputs]);


  return (
    <div style={{fontFamily: 'sans-serif', padding: '20px'}}>
      <h2>React TS Web MIDI Input</h2>
      <hr/>

      {inputs.length > 0 ? (
        <div>
          <label htmlFor="midi-select">Choose a MIDI Input: </label>
          <select
            id="midi-select"
            value={selectedInputId}
            onChange={(e) => setSelectedInputId(e.target.value)}
          >
            {inputs.map((input) => (
              <option key={input.id} value={input.id}>
                {input.name} ({input.manufacturer})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p>No MIDI input devices found. Please connect a device.</p>
      )}
    </div>
  );
};