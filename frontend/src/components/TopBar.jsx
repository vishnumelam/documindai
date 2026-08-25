import {
  Bell,
  Search,
  Sun,
} from "lucide-react";

function TopBar({ title }) {
  return (
    <header className="topbar">

      <div className="topbar-title">
        <span className="breadcrumb">
          Workspace
        </span>

        <span className="breadcrumb-separator">
          /
        </span>

        <strong>{title}</strong>
      </div>

      <div className="topbar-actions">

        <div className="search-box">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search documents..."
          />

          <kbd>⌘ K</kbd>
        </div>

        <button className="icon-button">
          <Sun size={18} />
        </button>

        <button className="icon-button notification">
          <Bell size={18} />
          <span />
        </button>

        <div className="avatar">
          VM
        </div>

      </div>

    </header>
  );
}

export default TopBar;