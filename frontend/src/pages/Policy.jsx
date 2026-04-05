import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const PLANS = [
  {
    id: "basic", name: "Shield Basic", price: "\u20B929/wk", coverage: "\u20B950,000", color: "var(--text-secondary)",
    features: ["2 disrupted days cover", "Flood & Cyclone", "24/7 AI Support", "Claims in 3 days"],
  },
  {
    id: "standard", name: "Shield Plus", price: "\u20B949/wk", coverage: "\u20B91,50,000", color: "var(--primary)", badge: "RECOMMENDED",
    features: ["4 disrupted days cover", "All trigger events", "Priority Claims (1 day)", "Forecast Shield AI", "Earnings Protection"],
  },
  {
    id: "premium", name: "Shield Max", price: "\u20B979/wk", coverage: "\u20B95,00,000", color: "#7c3aed",
    features: ["Max disrupted days", "All Shield Plus features", "Instant Claims", "Dedicated Manager", "Family Cover"],
  },
];

const statusBadge = (s) => {
  const map = { active: "badge-green", expired: "badge-red", pending: "badge-orange" };
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
};

export default function Policy() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    API.get("/policy").then(res => setPolicy(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const buyPlan = async (planId) => {
    setBuying(planId);
    try {
      const res = await API.post("/policy/purchase", { plan_type: planId });
      setPolicy(res.data);
      setAlert({ type: "success", msg: `${PLANS.find(p => p.id === planId)?.name} activated!` });
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.detail || "Purchase failed." });
    } finally {
      setBuying(null);
    }
  };

  return (
    <>
      <div className="m-page">
        <div className="m-page-header">
          <p className="m-page-label">Insurance</p>
          <h1 className="m-page-title">My <span>Policy</span></h1>
          <div className="m-page-line" />
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === "error" ? "error" : "success"}`}
            style={{ cursor: "pointer" }} onClick={() => setAlert(null)}>
            {alert.msg}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><span className="spinner" /></div>
        ) : (
          <>
            {policy ? (
              <div className="m-card" style={{ marginBottom: 14 }}>
                <p className="m-card-title">Active Policy</p>
                {[
                  ["Policy #", policy.policy_number],
                  ["Plan", policy.plan_type],
                  ["Coverage", `\u20B9${policy.coverage_amount}`],
                  ["Premium", `\u20B9${policy.premium_amount}/mo`],
                  ["Start", new Date(policy.start_date).toLocaleDateString("en-IN")],
                  ["End", new Date(policy.end_date).toLocaleDateString("en-IN")],
                ].map(([label, value]) => (
                  <div className="m-detail-row" key={label}>
                    <span className="m-detail-label">{label}</span>
                    <span className="m-detail-value">{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Status:</span>
                  {statusBadge(policy.status)}
                </div>
              </div>
            ) : (
              <div className="m-info-box" style={{ marginBottom: 14 }}>
                <p className="m-info-box-title">No Active Policy</p>
                <p className="m-info-box-text">Choose a plan below to get protected.</p>
              </div>
            )}

            <p className="m-page-label" style={{ marginBottom: 8 }}>Available Plans</p>

            {PLANS.map(plan => (
              <div key={plan.id} className={`m-plan-card${plan.id === "standard" ? " featured" : ""}`}>
                {plan.badge && <span className="badge badge-blue m-plan-badge">{plan.badge}</span>}
                <p className="m-plan-name" style={{ color: plan.color }}>{plan.name}</p>
                <p className="m-plan-price" style={{ color: plan.color }}>{plan.price}</p>
                <p className="m-plan-coverage">Coverage up to <strong style={{ color: "var(--text-primary)" }}>{plan.coverage}</strong></p>
                <hr className="divider" />
                <ul className="m-plan-features">
                  {plan.features.map(f => (
                    <li key={f}><span className="m-plan-check">{"\u2713"}</span> {f}</li>
                  ))}
                </ul>
                <button
                  className={`btn ${plan.id === "standard" ? "btn-primary" : "btn-outline"} btn-full btn-sm`}
                  onClick={() => buyPlan(plan.id)}
                  disabled={buying === plan.id || policy?.status === "active"}>
                  {buying === plan.id ? <><span className="spinner" /> Processing...</> : policy?.status === "active" ? "Already Active" : "Get This Plan"}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
      <Navbar />
    </>
  );
}
