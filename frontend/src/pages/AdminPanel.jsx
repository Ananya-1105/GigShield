import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const statusBadge = (s) => {
  const map = { approved: "badge-green", pending: "badge-orange", rejected: "badge-red", active: "badge-green", expired: "badge-red", reviewing: "badge-blue" };
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
};

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    Promise.all([API.get("/admin/stats"), API.get("/admin/claims"), API.get("/admin/workers")])
      .then(([s, c, w]) => { setStats(s.data); setClaims(c.data || []); setWorkers(w.data || []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateClaim = async (id, status) => {
    setUpdating(id);
    try {
      await API.patch(`/admin/claims/${id}`, { status });
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      setAlert({ type: "success", msg: `Claim ${status} successfully.` });
    } catch {
      setAlert({ type: "error", msg: "Failed to update claim." });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <div className="m-page">
        <div className="m-page-header">
          <p className="m-page-label">Administration</p>
          <h1 className="m-page-title"><span>Admin</span> Panel</h1>
          <div className="m-page-line" />
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === "error" ? "error" : "success"}`}
            style={{ cursor: "pointer" }} onClick={() => setAlert(null)}>
            {alert.msg}
          </div>
        )}

        <div className="tabs" style={{ marginBottom: 14 }}>
          {[{ id: "overview", label: "Stats" }, { id: "claims", label: "Claims" }, { id: "workers", label: "Riders" }].map(t => (
            <button key={t.id} className={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><span className="spinner" /></div>
        ) : (
          <>
            {tab === "overview" && (
              <>
                <div className="m-grid-2">
                  <div className="m-stat-card">
                    <p className="m-stat-label">Riders</p>
                    <p className="m-stat-value">{stats?.totalWorkers ?? 0}</p>
                  </div>
                  <div className="m-stat-card">
                    <p className="m-stat-label">Active Policies</p>
                    <p className="m-stat-value blue">{stats?.activePolicies ?? 0}</p>
                  </div>
                  <div className="m-stat-card">
                    <p className="m-stat-label">Pending Claims</p>
                    <p className="m-stat-value blue">{stats?.pendingClaims ?? 0}</p>
                  </div>
                  <div className="m-stat-card">
                    <p className="m-stat-label">Total Paid</p>
                    <p className="m-stat-value green">{"\u20B9"}{stats?.totalPaidOut ?? 0}</p>
                  </div>
                </div>

                <div className="m-card">
                  <p className="m-card-title">Pending Claims</p>
                  {claims.filter(c => c.status === "pending").length > 0 ? (
                    claims.filter(c => c.status === "pending").slice(0, 5).map(c => (
                      <div className="m-table-item" key={c.id}>
                        <div className="m-table-row">
                          <span className="m-table-primary">{c.worker_name}</span>
                          {statusBadge(c.status)}
                        </div>
                        <div className="m-table-row">
                          <span className="m-table-secondary">{c.claim_type}</span>
                          <span className="m-table-secondary">{"\u20B9"}{c.amount_requested}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button className="btn btn-outline btn-sm" style={{ color: "var(--green)", borderColor: "rgba(16,185,129,0.3)", flex: 1 }}
                            disabled={updating === c.id} onClick={() => updateClaim(c.id, "approved")}>
                            {updating === c.id ? <span className="spinner" /> : "Approve"}
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                            disabled={updating === c.id} onClick={() => updateClaim(c.id, "rejected")}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="m-empty"><p className="m-empty-text">No pending claims</p></div>
                  )}
                </div>
              </>
            )}

            {tab === "claims" && (
              <div className="m-card">
                <p className="m-card-title">All Claims</p>
                {claims.length > 0 ? claims.map(c => (
                  <div className="m-table-item" key={c.id}>
                    <div className="m-table-row">
                      <span className="m-table-primary">{c.worker_name}</span>
                      {statusBadge(c.status)}
                    </div>
                    <div className="m-table-row">
                      <span className="m-table-mono">{c.claim_number}</span>
                      <span className="m-table-secondary">{"\u20B9"}{c.amount_requested}</span>
                    </div>
                    <div className="m-table-row">
                      <span className="m-table-secondary">{c.claim_type}</span>
                      {c.ai_confidence != null && (
                        <span style={{ color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: "0.65rem" }}>
                          AI: {Math.round(c.ai_confidence * 100)}%
                        </span>
                      )}
                    </div>
                    {c.status === "pending" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button className="btn btn-outline btn-sm" style={{ color: "var(--green)", borderColor: "rgba(16,185,129,0.3)", flex: 1 }}
                          disabled={updating === c.id} onClick={() => updateClaim(c.id, "approved")}>Approve</button>
                        <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                          disabled={updating === c.id} onClick={() => updateClaim(c.id, "rejected")}>Reject</button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="m-empty"><p className="m-empty-text">No claims found</p></div>
                )}
              </div>
            )}

            {tab === "workers" && (
              <div className="m-card">
                <p className="m-card-title">Registered Riders</p>
                {workers.length > 0 ? workers.map(w => (
                  <div className="m-table-item" key={w.id}>
                    <div className="m-table-row">
                      <span className="m-table-primary">{w.name}</span>
                      {w.policy_status ? statusBadge(w.policy_status) : <span className="badge badge-gray">No policy</span>}
                    </div>
                    <div className="m-table-row">
                      <span className="m-table-mono">{w.rider_id}</span>
                      <span className="m-table-secondary">{w.platform || "\u2014"}</span>
                    </div>
                    <div className="m-table-row">
                      <span className="m-table-secondary">
                        {w.zones?.length ? w.zones.map(z => z.name).join(", ") : "No zones"}
                      </span>
                      <span className="m-table-mono">{w.total_claims ?? 0} claims</span>
                    </div>
                  </div>
                )) : (
                  <div className="m-empty"><p className="m-empty-text">No riders found</p></div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Navbar />
    </>
  );
}
