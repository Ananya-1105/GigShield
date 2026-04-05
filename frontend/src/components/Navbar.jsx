import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");

  const workerTabs = [
    { label: "Home", path: "/dashboard", icon: "\u2302" },
    { label: "Policy", path: "/policy", icon: "\u25C8" },
    { label: "Claims", path: "/claims", icon: "\u25CE" },
    { label: "Profile", path: "/profile", icon: "\u25C7" },
  ];

  const adminTabs = [
    { label: "Panel", path: "/admin", icon: "\u2B21" },
    { label: "Profile", path: "/profile", icon: "\u25C7" },
  ];

  const tabs = role === "admin" ? adminTabs : workerTabs;

  return (
    <nav className="m-navbar">
      {tabs.map(({ label, path, icon }) => (
        <button
          key={path}
          className={`m-nav-item${location.pathname === path ? " active" : ""}`}
          onClick={() => navigate(path)}
        >
          <span className="m-nav-icon">{icon}</span>
          <span className="m-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
