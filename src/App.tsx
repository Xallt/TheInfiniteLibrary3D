import React, { useState } from "react";
import { BookshelfViewer } from "./components/BookshelfViewer";
import { BookDesignStudio } from "./components/BookDesignStudio";
import "./styles/panel.css";

type Tab = "bookshelf" | "design";

export function App() {
  const [tab, setTab] = useState<Tab>("bookshelf");

  return (
    <>
      {tab === "bookshelf" ? <BookshelfViewer /> : <BookDesignStudio />}
      <div className="tab-switcher">
        <button
          className={`panel-btn ${tab === "bookshelf" ? "active" : ""}`}
          onClick={() => setTab("bookshelf")}
        >
          Bookshelf
        </button>
        <button
          className={`panel-btn ${tab === "design" ? "active" : ""}`}
          onClick={() => setTab("design")}
        >
          Book Design
        </button>
      </div>
    </>
  );
}
