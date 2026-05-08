interface TabSwitcherProps {
  activeTab: "bookshelf" | "book";
  onTabChange: (tab: "bookshelf" | "book") => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="tab-switcher">
      <button
        className={`panel-btn${activeTab === "bookshelf" ? " active" : ""}`}
        onClick={() => onTabChange("bookshelf")}
      >
        Bookshelf
      </button>
      <button
        className={`panel-btn${activeTab === "book" ? " active" : ""}`}
        onClick={() => onTabChange("book")}
      >
        Book
      </button>
    </div>
  );
}
