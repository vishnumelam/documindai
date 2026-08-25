import {
  BrainCircuit,
  MessageSquare,
  Files,
  LayoutDashboard,
  Settings,
  Sparkles,
  ChevronRight,
} from "lucide-react";

function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "chat",
      label: "AI Workspace",
      icon: MessageSquare,
    },
    {
      id: "documents",
      label: "Documents",
      icon: Files,
    },
  ];

  return (
    <aside className="sidebar">

      <div className="brand">
        <div className="brand-icon">
          <BrainCircuit size={23} />
        </div>

        <div>
          <h1>DocuMind</h1>
          <span>AI DOCUMENT INTELLIGENCE</span>
        </div>
      </div>

      <div className="sidebar-section-title">
        WORKSPACE
      </div>

      <nav className="sidebar-nav">

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`nav-item ${
                activePage === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActivePage(item.id)
              }
            >
              <Icon size={19} />

              <span>
                {item.label}
              </span>

              {activePage === item.id && (
                <ChevronRight
                  size={16}
                  className="nav-arrow"
                />
              )}
            </button>
          );
        })}

      </nav>

      <div className="sidebar-bottom">

        <div className="ai-card">

          <div className="ai-card-icon">
            <Sparkles size={18} />
          </div>

          <div>
            <strong>RAG Engine</strong>
            <span>Ready for questions</span>
          </div>

          <div className="online-dot" />

        </div>

        <button
          className="settings-button"
          onClick={() =>
            setActivePage("settings")
          }
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;