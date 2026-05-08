import { useState } from "react";
import { BookSandboxViewer } from "./components/BookSandboxViewer";
import { BookshelfViewer } from "./components/BookshelfViewer";
import { TabSwitcher } from "./components/TabSwitcher";
import "./styles/panel.css";

export function App() {
  const [activeTab, setActiveTab] = useState<"bookshelf" | "book">("bookshelf");

  return (
    <>
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "bookshelf" && <BookshelfViewer />}
      {activeTab === "book" && <BookSandboxViewer />}
    </>
  );
}
