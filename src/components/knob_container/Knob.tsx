import "../../styles/knob.css";
import {useEffect, useRef, useState} from "react";
import {camelCaseToTitle, THROTTLE_INTERVAL} from "./utils";

interface KnobProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  width?: number;
  height?: number;
}

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const STEP = 0.001;

const VALUE_CHANGE_SPEED = 0.001;

export const Knob = ({label, value, onChange, width = 110, height = 150}: KnobProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const knobControlRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const lastMousePosRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  const valueRef = useRef<number>(value);
  const lastCallTimestampRef = useRef<number>(0);

  const visualizeValue = (val: number) => {
    if (circleRef.current) {
      const angle = (val - MIN_VALUE) / (MAX_VALUE - MIN_VALUE) * 270 - 135; // from -135 to 135 degrees
      circleRef.current.style.transform = `rotate(${angle}deg)`;
    }
  }

  const handleMousePosition = (e: {clientX: number, clientY: number}) => {
    if (knobControlRef.current) {
      const deltaY = e.clientY - lastMousePosRef.current.y;
      const deltaValue = -deltaY * VALUE_CHANGE_SPEED;
      let newValue = valueRef.current + deltaValue;
      newValue = Math.min(Math.max(newValue, MIN_VALUE), MAX_VALUE);
      newValue = Math.round(newValue / STEP) * STEP;
      valueRef.current = newValue;
      visualizeValue(newValue);

      const now = Date.now();
      if (now - lastCallTimestampRef.current > THROTTLE_INTERVAL) {
        lastCallTimestampRef.current = now;
        onChange(newValue);
      }
    }
    lastMousePosRef.current = {x: e.clientX, y: e.clientY};
  }

  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    lastMousePosRef.current = {x: e.clientX, y: e.clientY};
  }

  useEffect(() => {
    const handleDrag = (e: MouseEvent) => {
      handleMousePosition(e);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, onChange]);

  useEffect(() => {
    if(!isDragging) {
      valueRef.current = value;
      visualizeValue(value);
    }
  }, [value]);

  return (
    <div className="knob" style={{width: width, height: height}}>
      <div className="knob-control"
           onMouseDown={onDragStart}
           ref={knobControlRef}
      >
        <div className="knob-circle" ref={circleRef}>
          <div className="knob-line"/>
        </div>
      </div>
      <div className="knob-label">{camelCaseToTitle(label)}</div>
    </div>
  );

}