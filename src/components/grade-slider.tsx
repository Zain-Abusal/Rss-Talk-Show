"use client";
import { useState } from "react";
export function GradeSlider({
  id = "grade",
  name = "grade",
  invalid = false,
  describedBy,
  initial = 1,
}: {
  id?: string;
  name?: string;
  invalid?: boolean;
  describedBy?: string;
  initial?: number;
}) {
  const [grade, setGrade] = useState(initial);
  return (
    <div className="grade-slider">
      <div className="grade-slider-heading">
        <span>Choose your grade</span>
        <output htmlFor={id}>Grade {grade}</output>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={1}
        max={12}
        step={1}
        value={grade}
        onChange={(e) => setGrade(Number(e.target.value))}
        aria-valuetext={`Grade ${grade}`}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <div className="grade-slider-limits" aria-hidden="true">
        <span>Grade 1</span>
        <span>Grade 12</span>
      </div>
    </div>
  );
}
