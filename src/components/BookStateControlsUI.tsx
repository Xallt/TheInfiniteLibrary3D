import React from "react";
import {
  BookOpeningState,
  PageSelectedState,
  UniformlyOpenedState,
  buildPageSelectedState,
  buildUniformlyOpenedState,
} from "./Bookshelf/Book";

interface Props {
  openingState: BookOpeningState;
  numPages: number;
  onChange: (s: BookOpeningState) => void;
}

export function BookStateControlsViewerUI({ openingState, numPages, onChange }: Props) {
  if (openingState.stateType === "pageSelected") {
    const s = openingState as PageSelectedState;
    return (
      <div className="book-controls-panel panel">
        <div className="page-controls">
          <button
            className="panel-btn"
            onClick={() => onChange(buildPageSelectedState(Math.max(s.selectedPageIndex - 1, 0)))}
          >
            ←
          </button>
          <button
            className="panel-btn"
            onClick={() =>
              onChange(buildPageSelectedState(Math.min(s.selectedPageIndex + 1, numPages)))
            }
          >
            →
          </button>
          <button
            className="panel-btn"
            onClick={() => onChange(buildUniformlyOpenedState(Math.PI / 2))}
          >
            Uniform Open
          </button>
        </div>
      </div>
    );
  }

  const s = openingState as UniformlyOpenedState;
  return (
    <div className="book-controls-panel panel">
      <input
        type="range"
        min={0}
        max={Math.PI / 2}
        step={0.01}
        value={s.angle}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(buildUniformlyOpenedState(parseFloat(e.target.value)))
        }
        className="angle-slider"
      />
      <button className="panel-btn" onClick={() => onChange(buildPageSelectedState(0))}>
        Read Book
      </button>
    </div>
  );
}
