import { useNavigate, useLocation } from "react-router-dom";

const workerNav = [
  { section: "MAIN" },
  { label: "Dashboard", path: "/dashboard", icon: "⬡" },
  { label: "My Policy",  path: "/policy",   icon: "◈" },
  { label: "My Claims",  path: "/claims",   icon: "◎" },
  { section: "ACCOUNT" },
  { label: "Profile",    path: "/profile",  icon: "◇" },
];

const adminNav = [
  { section: "ADMIN" },
  { label: "Panel", path: "/admin", icon: "⬡" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role     = localStorage.getItem("role");
  const items    = role === "admin" ? adminNav : workerNav;

  return (
    <aside className="sidebar">
      {items.map((item, i) =>
        item.section ? (
          <p key={i} className="sidebar-section">{item.section}</p>
        ) : (
          <button key={item.path} className={`sidebar-item${location.pathname === item.path ? " active" : ""}`} onClick={() => navigate(item.path)}>
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </aside>
  );
}