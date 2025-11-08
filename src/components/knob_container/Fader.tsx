import "../../styles/fader.css";
import {useEffect, useRef, useState} from "react";
import {camelCaseToTitle, THROTTLE_INTERVAL} from "./utils";

interface FaderProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  width?: any;
}

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const STEP = 0.001;

export const Fader = ({label, value, onChange, width = "100%"}: FaderProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const faderControlRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<number>(value);
  const lastCallTimestampRef = useRef<number>(0);

  const visualizeValue = (val: number) => {
    if (thumbRef.current) {
      thumbRef.current.style.left = `${(val - MIN_VALUE) / (MAX_VALUE - MIN_VALUE) * 100}%`;
    }
  }

  const handleMousePosition = (e: {clientX: number, clientY: number}) => {
    if (faderControlRef.current && thumbRef.current) {
      const rect = faderControlRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      let newValue = relativeX / rect.width;
      newValue = Math.min(Math.max(newValue, MIN_VALUE), MAX_VALUE);
      newValue = Math.round(newValue / STEP) * STEP;
      visualizeValue(newValue);
      valueRef.current = newValue;

      const now = Date.now();
      if (now - lastCallTimestampRef.current > THROTTLE_INTERVAL) {
        lastCallTimestampRef.current = now;
        onChange(newValue);
      }
    }
  }

  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleMousePosition(e);
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
    visualizeValue(value);
  }, [value]);

  return (
    <div className="fader" style={{width: width}}>
      <div className="fader-label">{camelCaseToTitle(label)}</div>
      <div className="fader-control"
           onMouseDown={onDragStart}
           ref={faderControlRef}
      >
        <div className="fader-track"/>
        <div className="fader-thumb" ref={thumbRef}/>
      </div>
      <div className="fader-value">{value.toFixed(2)}</div>
    </div>
  );

}