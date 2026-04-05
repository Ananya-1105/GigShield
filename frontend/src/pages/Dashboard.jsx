import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ZoneMap from "../components/ZoneMap";
import API from "../services/api";

const RISK_COLORS = { high: "#EF4444", medium: "#F59E0B", low: "#10B981" };

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/dashboard")
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s) => {
    const map = { approved: "badge-green", pending: "badge-orange", rejected: "badge-red", active: "badge-green" };
    return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
  };

  const name = data?.name || localStorage.getItem("name") || "Rider";

  if (loading) return (
    <>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:8 }}>
        <div className="spinner" style={{ width:28, height:28 }} />
        <p style={{ color:"var(--text-dim)", fontSize:"0.65rem", fontFamily:"var(--font-mono)", letterSpacing:2 }}>LOADING...</p>
      </div>
      <Navbar />
    </>
  );

  const zones = data?.zones || [];
  const mapZones = zones.map(z => ({
    name: z.location?.name || "",
    lat: z.location?.lat || 0,
    lng: z.location?.lng || 0,
    pin: `${z.location?.lat}`,
    risk_level: z.risk_level || "low",
    weather: z.weather,
    aqi: z.aqi,
    active_triggers: z.active_triggers?.length || 0,
  }));

  const allTriggers = zones.flatMap(z => (z.active_triggers || []).map(t => ({ ...t, zone: z.location?.name })));

  return (
    <>
      <div className="m-page">
        <div className="m-page-header">
          <p className="m-page-label">Overview</p>
          <h1 className="m-page-title">Hello, <span>{name.split(" ")[0]}</span></h1>
          <div className="m-page-line" />
        </div>

        {/* Live Map */}
        {mapZones.length > 0 && (
          <div className="m-card" style={{ padding:0, overflow:"hidden", marginBottom:10 }}>
            <div style={{ padding:"10px 14px 4px" }}>
              <p className="m-card-title">Live Zone Monitor</p>
            </div>
            <ZoneMap zones={mapZones} selectedPins={mapZones.map(z=>z.pin)} height={160} showWeather={true} />
          </div>
        )}

        {/* Active Triggers */}
        {allTriggers.length > 0 && (
          <div style={{
            background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)",
            borderRadius:"var(--radius-sm)", padding:"10px 12px", marginBottom:10,
          }}>
            <p style={{ fontFamily:"var(--font-mono)", fontSize:"0.52rem", letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:4, fontWeight:600 }}>
              Active Triggers
            </p>
            {allTriggers.map((t,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0",
                borderBottom: i < allTriggers.length-1 ? "1px solid rgba(239,68,68,0.1)" : "none" }}>
                <div>
                  <span style={{ fontSize:"0.78rem", color:"var(--text-primary)", fontWeight:500 }}>{t.name}</span>
                  <p style={{ fontSize:"0.58rem", color:"var(--text-secondary)" }}>{t.zone} — {t.details}</p>
                </div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", fontWeight:700, color:"var(--green)" }}>
                  {"\u20B9"}{t.payout}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Zone Weather Cards */}
        {zones.length > 0 && (
          <div className="m-card">
            <p className="m-card-title">Zone Weather — Live</p>
            {zones.map((z, i) => (
              <div key={i} className="m-table-item">
                <div className="m-table-row">
                  <span className="m-table-primary">{z.location?.name}</span>
                  <span className="badge" style={{
                    color: RISK_COLORS[z.risk_level] || "#F59E0B",
                    background: `${RISK_COLORS[z.risk_level] || "#F59E0B"}15`,
                    borderColor: `${RISK_COLORS[z.risk_level] || "#F59E0B"}40`,
                  }}>{z.risk_level} risk</span>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:3, flexWrap:"wrap" }}>
                  {[
                    [`${z.weather?.temperature}°C`, "Temp"],
                    [`${z.weather?.rain_mm}mm`, "Rain"],
                    [`${z.weather?.wind_kmh}km/h`, "Wind"],
                    [`${z.aqi?.us_aqi || 0}`, "AQI"],
                  ].map(([val,lab]) => (
                    <div key={lab} style={{ textAlign:"center" }}>
                      <p style={{ fontSize:"0.82rem", fontWeight:600, color:"var(--text-primary)", fontFamily:"var(--font-mono)" }}>{val}</p>
                      <p style={{ fontSize:"0.48rem", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:1 }}>{lab}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize:"0.62rem", color:"var(--text-secondary)", marginTop:2 }}>{z.weather?.condition}</p>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="m-grid-2">
          <div className="m-stat-card">
            <p className="m-stat-label">Active Policy</p>
            <p className="m-stat-value blue" style={{ fontSize:"0.85rem" }}>{data?.activePolicy || "\u2014"}</p>
          </div>
          <div className="m-stat-card">
            <p className="m-stat-label">Total Claims</p>
            <p className="m-stat-value">{data?.totalClaims ?? 0}</p>
          </div>
          <div className="m-stat-card">
            <p className="m-stat-label">Approved</p>
            <p className="m-stat-value green">{data?.approvedClaims ?? 0}</p>
          </div>
          <div className="m-stat-card">
            <p className="m-stat-label">Received</p>
            <p className="m-stat-value green">{"\u20B9"}{data?.amountReceived ?? 0}</p>
          </div>
        </div>

        {/* Shield Score */}
        {data?.riskScore !== undefined && (
          <div className="m-info-box">
            <p className="m-info-box-title">Shield Score</p>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--primary)" }}>
                {data.riskScore}<span style={{ fontSize:"0.65rem", color:"var(--text-secondary)" }}>/100</span>
              </div>
              <p className="m-info-box-text" style={{ flex:1, fontSize:"0.68rem" }}>{data.riskMessage}</p>
            </div>
          </div>
        )}

        {/* Recent Claims */}
        <div className="m-card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <p className="m-card-title">Recent Claims</p>
            <button className="btn btn-outline btn-sm" onClick={()=>navigate("/claims")}>View All</button>
          </div>
          {data?.recentClaims?.length ? data.recentClaims.map(c => (
            <div className="m-table-item" key={c.id}>
              <div className="m-table-row">
                <span className="m-table-primary">{c.claim_type}</span>
                {statusBadge(c.status)}
              </div>
              <div className="m-table-row">
                <span className="m-table-mono">{c.claim_number}</span>
                <span className="m-table-secondary">{"\u20B9"}{c.amount_requested}</span>
              </div>
            </div>
          )) : (
            <div className="m-empty">
              <div className="m-empty-icon">{"\u25CE"}</div>
              <p className="m-empty-text">No claims yet</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop:8 }} onClick={()=>navigate("/claims")}>File a Claim</button>
            </div>
          )}
        </div>

        {/* Policy */}
        {data?.policy && (
          <div className="m-card">
            <p className="m-card-title">Current Policy</p>
            {[["Plan",data.policy.plan_type],["Coverage",`\u20B9${data.policy.coverage_amount}`],["Premium",`\u20B9${data.policy.premium_amount}/mo`],["Status",data.policy.status]].map(([l,v])=>(
              <div className="m-detail-row" key={l}><span className="m-detail-label">{l}</span><span className="m-detail-value">{v}</span></div>
            ))}
          </div>
        )}
      </div>
      <Navbar />
    </>
  );
}
