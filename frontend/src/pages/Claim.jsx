import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const CLAIM_TYPES = ["Heavy Rain / Flood", "Extreme Heat", "Severe Air Quality", "Civic Disruption", "Cyclone / Disaster", "Vehicle Damage", "Other"];

const STATUS_MAP = {
  approved: { badge: "badge-green", label: "Approved" },
  soft_flagged: { badge: "badge-orange", label: "Partial" },
  under_review: { badge: "badge-blue", label: "Review" },
  pending: { badge: "badge-orange", label: "Pending" },
  rejected: { badge: "badge-red", label: "Rejected" },
};

const statusBadge = (s) => {
  const info = STATUS_MAP[s] || { badge: "badge-gray", label: s };
  return <span className={`badge ${info.badge}`}>{info.label}</span>;
};

export default function Claim() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [expandedClaim, setExpandedClaim] = useState(null);
  const [form, setForm] = useState({ claim_type: "", amount_requested: "", description: "", document_url: "" });

  const fetchClaims = () => {
    API.get("/claims").then(res => setClaims(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchClaims(); }, []);

  const submitClaim = async () => {
    if (!form.claim_type || !form.amount_requested || !form.description) {
      setAlert({ type: "error", msg: "Please fill all required fields." }); return;
    }
    setSubmitting(true); setAiResult(null);
    try {
      const res = await API.post("/claims", form);
      setAiResult(res.data);
      setShowModal(false);
      setForm({ claim_type: "", amount_requested: "", description: "", document_url: "" });
      fetchClaims();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.detail || "Failed to submit claim." });
    } finally {
      setSubmitting(false);
    }
  };

  const BCS_COLORS = { auto_approve: "var(--green)", soft_flag: "var(--yellow)", hard_flag: "var(--red)" };

  return (
    <>
      <div className="m-page" style={{ position: "relative" }}>
        <div className="m-page-header">
          <p className="m-page-label">Insurance</p>
          <h1 className="m-page-title">My <span>Claims</span></h1>
          <div className="m-page-line" />
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === "error" ? "error" : "success"}`}
            style={{ cursor: "pointer" }} onClick={() => setAlert(null)}>
            {alert.msg}
          </div>
        )}

        {/* AI Result after submission */}
        {aiResult && (
          <div style={{
            background: aiResult.status === "approved" ? "rgba(16,185,129,0.06)" : aiResult.status === "soft_flagged" ? "rgba(245,158,11,0.06)" : "rgba(59,130,246,0.06)",
            border: `1px solid ${aiResult.status === "approved" ? "rgba(16,185,129,0.2)" : aiResult.status === "soft_flagged" ? "rgba(245,158,11,0.2)" : "rgba(59,130,246,0.2)"}`,
            borderRadius: "var(--radius-sm)", padding: "12px", marginBottom: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600,
                color: aiResult.status === "approved" ? "var(--green)" : aiResult.status === "soft_flagged" ? "var(--yellow)" : "var(--primary)" }}>
                AI Evaluation Complete
              </p>
              {statusBadge(aiResult.status)}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: BCS_COLORS[aiResult.bcs_action] || "var(--primary)" }}>
                  {aiResult.bcs_score}
                </p>
                <p style={{ fontSize: "0.48rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>BCS Score</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)" }}>
                  {Math.round(aiResult.ai_confidence * 100)}%
                </p>
                <p style={{ fontSize: "0.48rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Confidence</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--green)" }}>
                  {aiResult.payout_percentage}%
                </p>
                <p style={{ fontSize: "0.48rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Payout</p>
              </div>
            </div>
            {aiResult.amount_approved && (
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--green)", marginBottom: 4 }}>
                {"\u20B9"}{aiResult.amount_approved} approved
              </p>
            )}
            <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {aiResult.ai_review_note}
            </p>
            <button className="btn btn-outline btn-sm btn-full" style={{ marginTop: 8 }} onClick={() => setAiResult(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ File Claim</button>
        </div>

        <div className="m-card">
          <p className="m-card-title">All Claims</p>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20 }}><span className="spinner" /></div>
          ) : claims.length ? (
            claims.map(c => (
              <div key={c.id}>
                <div className="m-table-item" style={{ cursor: "pointer" }}
                  onClick={() => setExpandedClaim(expandedClaim === c.id ? null : c.id)}>
                  <div className="m-table-row">
                    <span className="m-table-primary">{c.claim_type}</span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="m-table-row">
                    <span className="m-table-mono">{c.claim_number}</span>
                    <span className="m-table-secondary">
                      {c.amount_approved ? `\u20B9${c.amount_approved}` : `\u20B9${c.amount_requested}`}
                    </span>
                  </div>
                  <div className="m-table-row">
                    <span className="m-table-mono" style={{ fontSize: "0.55rem" }}>
                      {c.filed_at ? new Date(c.filed_at).toLocaleDateString("en-IN") : ""}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {c.bcs_score != null && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem",
                          color: c.bcs_score >= 75 ? "var(--green)" : c.bcs_score >= 40 ? "var(--yellow)" : "var(--red)" }}>
                          BCS:{c.bcs_score}
                        </span>
                      )}
                      {c.ai_confidence != null && (
                        <span style={{ color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: "0.62rem" }}>
                          AI:{Math.round(c.ai_confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Expanded AI details */}
                {expandedClaim === c.id && c.ai_review_note && (
                  <div style={{
                    padding: "8px 10px", margin: "0 0 6px", borderRadius: 8,
                    background: "var(--primary-dim)", border: "1px solid var(--primary-border)",
                    fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.5,
                  }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--primary)", letterSpacing: 1, marginBottom: 3, textTransform: "uppercase" }}>
                      AI Review
                    </p>
                    {c.ai_review_note}
                    {c.payout_percentage != null && (
                      <p style={{ marginTop: 4, fontWeight: 600, color: "var(--text-primary)" }}>
                        Payout: {c.payout_percentage}%
                        {c.amount_approved ? ` (\u20B9${c.amount_approved})` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="m-empty">
              <div className="m-empty-icon">{"\u25CE"}</div>
              <p className="m-empty-text">No claims yet. File your first claim.</p>
            </div>
          )}
        </div>

        {showModal && (
          <div className="m-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="m-modal">
              <div className="m-modal-header">
                <h3 className="m-modal-title">File a Claim</h3>
                <button className="m-modal-close" onClick={() => setShowModal(false)}>{"\u2715"}</button>
              </div>
              <div className="field">
                <label className="field-label">Claim Type *</label>
                <select className="field-input" value={form.claim_type}
                  onChange={e => setForm(f => ({ ...f, claim_type: e.target.value }))}>
                  <option value="">Select type...</option>
                  {CLAIM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Amount ({"\u20B9"}) *</label>
                <input className="field-input" type="number" placeholder="e.g. 350"
                  value={form.amount_requested} onChange={e => setForm(f => ({ ...f, amount_requested: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">Description *</label>
                <textarea className="field-input" rows={3} placeholder="Describe the disruption event in detail..."
                  value={form.description} style={{ resize: "vertical" }}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">Document URL (optional)</label>
                <input className="field-input" type="url" placeholder="https://..."
                  value={form.document_url} onChange={e => setForm(f => ({ ...f, document_url: e.target.value }))} />
              </div>
              <div className="m-info-box" style={{ marginBottom: 10 }}>
                <p className="m-info-box-title">7-Stream AI Review</p>
                <p className="m-info-box-text">
                  Your claim is evaluated by our Behavioural Coherence Engine across 7 streams.
                  BCS {"\u2265"} 75 = auto-approved with full payout in 2 min.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-white" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={submitClaim} disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Analyzing...</> : "Submit Claim"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Navbar />
    </>
  );
}
