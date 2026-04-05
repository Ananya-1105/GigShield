import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../services/api";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/dashboard")
      .then(res => setUser(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    navigate("/");
  };

  return (
    <>
      <div className="m-page">
        <div className="m-page-header">
          <p className="m-page-label">Account</p>
          <h1 className="m-page-title">My <span>Profile</span></h1>
          <div className="m-page-line" />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><span className="spinner" /></div>
        ) : (
          <>
            <div className="m-card">
              <p className="m-card-title">Rider Info</p>
              {[
                ["Name", user?.name || "\u2014"],
                ["Active Policy", user?.activePolicy || "No policy"],
                ["Total Claims", user?.totalClaims ?? 0],
                ["Approved", user?.approvedClaims ?? 0],
                ["Amount Received", `\u20B9${user?.amountReceived ?? 0}`],
              ].map(([label, value]) => (
                <div className="m-detail-row" key={label}>
                  <span className="m-detail-label">{label}</span>
                  <span className="m-detail-value">{value}</span>
                </div>
              ))}
            </div>

            {user?.riskScore !== undefined && (
              <div className="m-info-box">
                <p className="m-info-box-title">Shield Score</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>
                    {user.riskScore}<span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>/100</span>
                  </div>
                  <p className="m-info-box-text" style={{ flex: 1, fontSize: "0.7rem" }}>{user.riskMessage}</p>
                </div>
              </div>
            )}

            <button className="btn btn-danger btn-full" style={{ marginTop: 16 }} onClick={logout}>
              Logout
            </button>
          </>
        )}
      </div>
      <Navbar />
    </>
  );
}
