import {Knob} from "./Knob";
import "../../styles/knobContainer.css";
import {Fader} from "./Fader";
import {useEffect, useRef, useState} from "react";

interface KnobsContainerProps {
  knobValues: Map<string, number>;
  setKnobValue: (knobId: string, value: number) => void;
  width?: number;
  height?: number;
}

export const KnobContainer = ({knobValues, setKnobValue, width=700, height=400}: KnobsContainerProps) => {

  const [type, setType] = useState<"knobs" | "faders">("knobs");

  const selectorBubbleRef = useRef<HTMLDivElement>(null);
  const knobsTypeSelectButtonRef = useRef<HTMLDivElement>(null);
  const fadersTypeSelectButtonRef = useRef<HTMLDivElement>(null);

  const updateTypeSelectorBubblePosition = () => {
    const bubble = selectorBubbleRef.current;
    if (bubble && knobsTypeSelectButtonRef.current && fadersTypeSelectButtonRef.current) {
      const targetButton = type === "knobs" ? knobsTypeSelectButtonRef.current : fadersTypeSelectButtonRef.current;
      const rect = targetButton.getBoundingClientRect();
      const parentRect = bubble.parentElement!.getBoundingClientRect();
      bubble.style.width = `${rect.width}px`;
      bubble.style.transform = `translateX(${rect.left - parentRect.left}px)`;
    }
  }

  useEffect(() => {
    updateTypeSelectorBubblePosition();
  }, [type]);

  return <div className="knob-container-wrapper" style={{width, height}} onMouseDown={e => e.preventDefault()}>
    <div className="knob-container-header">
      {/* type selector */}
      <div className="knob-container-type-selector">
        <div className={`knob-container-type ${type === "knobs" ? "active" : ""}`}
             ref={knobsTypeSelectButtonRef} onMouseDown={() => setType("knobs")}> Knobs
        </div>
        <div className={`knob-container-type ${type === "faders" ? "active" : ""}`}
             ref={fadersTypeSelectButtonRef} onMouseDown={() => setType("faders")}> Faders
        </div>
        <div className="knob-container-type-selector-bubble" ref={selectorBubbleRef}/>
      </div>
    </div>
    <div className={type == "knobs" ? "knob-container" : "fader-container"}>
      {[...knobValues.entries()].map(([knobName, knobValue]) => <>
        {type === "knobs" ?
          <Knob
            label={knobName}
            value={knobValue}
            onChange={val => setKnobValue(knobName, val)}
          /> : <Fader
            label={knobName}
            value={knobValue}
            onChange={val => setKnobValue(knobName, val)}/>
        }</>
      )}
    </div>
  </div>
}