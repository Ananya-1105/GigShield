import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import ZoneMap from "../components/ZoneMap";

const PLANS = [
  { id: "basic", name: "Shield Basic", price: "\u20B929/wk", coverage: "Up to \u20B950,000", desc: "Covers 2 disrupted days. Part-time riders." },
  { id: "standard", name: "Shield Plus", price: "\u20B949/wk", coverage: "Up to \u20B91,50,000", desc: "4 days + Forecast AI. Recommended.", badge: "AI PICK" },
  { id: "premium", name: "Shield Max", price: "\u20B979/wk", coverage: "Up to \u20B95,00,000", desc: "Maximum protection. Instant claims + family." },
];

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", rider_id: "", password: "", platform: "Swiggy", role: "worker" });
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [selectedZones, setSelectedZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchLocation = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await API.get(`/weather/geocode?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addZone = (loc) => {
    if (selectedZones.length >= 3) return;
    if (selectedZones.find(z => z.lat === loc.lat && z.lng === loc.lng)) return;
    setSelectedZones(prev => [...prev, { name: loc.display || loc.name, lat: loc.lat, lng: loc.lng, admin1: loc.admin1 }]);
    setSearchResults([]);
    setSearchQuery("");
  };

  const removeZone = (idx) => setSelectedZones(prev => prev.filter((_, i) => i !== idx));

  const nextStep = async () => {
    setError("");
    if (step === 1) {
      if (!form.name || !form.phone || !form.rider_id || !form.password) { setError("Please fill all required fields."); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setLoading(true);
      try {
        const res = await API.post("/otp/send", { phone: form.phone });
        setOtpHint(res.data.sms_delivered ? "" : (res.data.dev_otp || ""));
        setStep(2);
      } catch (err) { setError(err.response?.data?.detail || "Failed to send OTP."); }
      finally { setLoading(false); }
    } else if (step === 2) {
      if (!otp || otp.length !== 6) { setError("Enter 6-digit OTP."); return; }
      setLoading(true);
      try {
        await API.post("/otp/verify", { phone: form.phone, otp });
        setStep(3);
      } catch (err) { setError(err.response?.data?.detail || "Invalid OTP."); }
      finally { setLoading(false); }
    } else if (step === 3) {
      if (selectedZones.length === 0) { setError("Add at least 1 delivery zone."); return; }
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const prevStep = () => { setError(""); setStep(s => Math.max(1, s - 1)); };

  const resendOtp = async () => {
    setLoading(true); setError("");
    try {
      const res = await API.post("/otp/send", { phone: form.phone });
      setOtpHint(res.data.sms_delivered ? "" : (res.data.dev_otp || ""));
    } catch { setError("Failed to resend."); }
    finally { setLoading(false); }
  };

  const completeSignup = async () => {
    setLoading(true); setError("");
    try {
      if (upiId) {
        try { await API.post("/upi/validate", { upi_id: upiId }); }
        catch (err) { setError(err.response?.data?.detail || "Invalid UPI ID."); setLoading(false); return; }
      }
      const payload = {
        ...form,
        zones: selectedZones.map(z => ({ name: z.name, lat: z.lat, lng: z.lng, admin1: z.admin1 })),
        upi_id: upiId || null,
      };
      const res = await API.post("/signup", payload);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role || "worker");
      localStorage.setItem("name", res.data.name || "");
      if (selectedPlan) { try { await API.post("/policy/purchase", { plan_type: selectedPlan }); } catch {} }
      if (upiId) { try { await API.post("/upi/setup", { upi_id: upiId }); } catch {} }
      navigate(res.data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed.");
      if (err.response?.data?.detail?.includes("Phone") || err.response?.data?.detail?.includes("Rider")) setStep(1);
    } finally { setLoading(false); }
  };

  const STEP_LABELS = ["Info", "OTP", "Zones", "Plan", "UPI"];

  return (
    <div className="m-auth">
      <p className="m-auth-brand" style={{ marginBottom: 4 }}>Gig<span>Shield</span></p>
      <div className="step-dots">
        {[1,2,3,4,5].map(s => <div key={s} className={`step-dot${step===s?" active":step>s?" done":""}`} />)}
      </div>
      <p style={{ textAlign:"center", fontSize:"0.52rem", color:"var(--text-dim)", fontFamily:"var(--font-mono)", letterSpacing:1, marginBottom:6 }}>
        STEP {step}/5 — {STEP_LABELS[step-1]}
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      {/* STEP 1: Info */}
      {step === 1 && (
        <div className="m-auth-form" style={{ animation:"fadeUp 0.3s ease both" }}>
          <h1 className="m-auth-hero" style={{ fontSize:"1.4rem", marginBottom:2 }}>Create your<br/><span>account</span></h1>
          <p className="m-auth-sub" style={{ marginBottom:8 }}>Join India's gig riders protected by GigShield</p>
          <div className="role-row">
            {[["worker","Rider"],["admin","Admin"]].map(([v,l])=>(
              <button key={v} className={`role-btn${form.role===v?" active":""}`} onClick={()=>setForm(f=>({...f,role:v}))}>{l}</button>
            ))}
          </div>
          {[
            {k:"name",l:"Full Name *",t:"text",p:"Rajesh Kumar"},
            {k:"phone",l:"Phone Number *",t:"tel",p:"+91 98765 43210"},
            {k:"rider_id",l:"Rider / Employee ID *",t:"text",p:"SWG-4821934"},
          ].map(({k,l,t,p})=>(
            <div className="field" key={k}>
              <label className="field-label">{l}</label>
              <input className="field-input" type={t} placeholder={p} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
            </div>
          ))}
          <div className="field">
            <label className="field-label">Platform</label>
            <select className="field-input" value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>
              {["Swiggy","Zomato","Dunzo","Zepto","Blinkit","Other"].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Password *</label>
            <input className="field-input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
          </div>
          <button className="btn btn-primary btn-full" onClick={nextStep} disabled={loading} style={{marginTop:2}}>
            {loading ? <><span className="spinner"/> Sending OTP...</> : "Next — Verify Phone"}
          </button>
          <p className="switch-text">Already registered? <span className="switch-link" onClick={()=>navigate("/")}>Sign In</span></p>
        </div>
      )}

      {/* STEP 2: OTP */}
      {step === 2 && (
        <div className="m-auth-form" style={{ animation:"fadeUp 0.3s ease both" }}>
          <h1 className="m-auth-hero" style={{ fontSize:"1.4rem", marginBottom:2 }}>Verify your<br/><span>phone number</span></h1>
          <p className="m-auth-sub" style={{ marginBottom:10 }}>Enter the 6-digit OTP sent to <strong>{form.phone}</strong></p>
          {otpHint && (
            <div className="m-info-box" style={{ marginBottom:10 }}>
              <p className="m-info-box-title">Dev Mode — SMS not configured</p>
              <p style={{ fontFamily:"var(--font-mono)", fontSize:"1rem", color:"var(--primary)", fontWeight:700, textAlign:"center", marginTop:2 }}>
                OTP: {otpHint}
              </p>
              <p className="m-info-box-text" style={{ fontSize:"0.58rem", marginTop:2 }}>Set FAST2SMS_API_KEY in backend .env for real SMS delivery.</p>
            </div>
          )}
          <div className="field">
            <label className="field-label">Enter OTP</label>
            <input className="field-input" type="text" placeholder="------" maxLength={6}
              value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))}
              onKeyDown={e=>e.key==="Enter"&&nextStep()}
              style={{ textAlign:"center", fontSize:"1.3rem", letterSpacing:10, fontFamily:"var(--font-mono)", fontWeight:700 }}/>
          </div>
          <button className="btn btn-primary btn-full" onClick={nextStep} disabled={loading}>
            {loading ? <><span className="spinner"/> Verifying...</> : "Verify OTP"}
          </button>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
            <button className="btn btn-outline btn-sm" onClick={prevStep}>Back</button>
            <button className="btn btn-outline btn-sm" onClick={resendOtp} disabled={loading}>Resend OTP</button>
          </div>
        </div>
      )}

      {/* STEP 3: Zone Selection — Search any Indian location */}
      {step === 3 && (
        <div className="m-auth-form" style={{ animation:"fadeUp 0.3s ease both" }}>
          <h1 className="m-auth-hero" style={{ fontSize:"1.3rem", marginBottom:2 }}>Add your<br/><span>delivery zones</span></h1>
          <p className="m-auth-sub" style={{ marginBottom:6 }}>Search any city or area in India. Add up to 3 zones.</p>

          {/* Search bar */}
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <input className="field-input" type="text" placeholder="Search city, area..."
              value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&searchLocation()}
              style={{ flex:1 }}/>
            <button className="btn btn-primary btn-sm" onClick={searchLocation} disabled={searching}
              style={{ whiteSpace:"nowrap" }}>
              {searching ? <span className="spinner"/> : "Search"}
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom:8, maxHeight:120, overflowY:"auto" }}>
              {searchResults.map((r,i) => (
                <div key={i} onClick={() => addZone(r)} style={{
                  padding:"8px 10px", borderBottom:"1px solid var(--border)", cursor:"pointer",
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  background: "var(--bg-card)", fontSize: "0.78rem",
                }}>
                  <div>
                    <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{r.name}</span>
                    <span style={{ color:"var(--text-secondary)", marginLeft:4 }}>{r.admin1}</span>
                  </div>
                  <span style={{ color:"var(--primary)", fontSize:"0.65rem", fontWeight:600 }}>+ Add</span>
                </div>
              ))}
            </div>
          )}

          {/* Map with selected zones */}
          {selectedZones.length > 0 && (
            <ZoneMap
              zones={selectedZones.map(z => ({ ...z, pin: `${z.lat}`, risk_level: "medium" }))}
              selectedPins={selectedZones.map(z => `${z.lat}`)}
              height={150}
              showWeather={false}
            />
          )}

          {/* Selected zones chips */}
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:8 }}>
            {selectedZones.map((z, i) => (
              <div key={i} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"8px 10px", borderRadius:8,
                background:"var(--primary-dim)", border:"1px solid var(--primary-border)",
              }}>
                <div>
                  <span style={{ fontSize:"0.78rem", fontWeight:600, color:"var(--primary)" }}>{z.name}</span>
                  <span style={{ fontSize:"0.6rem", color:"var(--text-dim)", marginLeft:6, fontFamily:"var(--font-mono)" }}>
                    {z.lat.toFixed(2)}, {z.lng.toFixed(2)}
                  </span>
                </div>
                <button onClick={()=>removeZone(i)} style={{
                  background:"none", border:"none", color:"var(--red)", cursor:"pointer",
                  fontSize:"0.8rem", fontWeight:600, padding:"2px 6px",
                }}>{"\u2715"}</button>
              </div>
            ))}
          </div>

          <p style={{ fontSize:"0.58rem", color:"var(--text-dim)", marginBottom:6, textAlign:"center" }}>
            {selectedZones.length}/3 zones added
          </p>

          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-white" style={{ flex:1 }} onClick={prevStep}>Back</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={nextStep}>Next — Choose Plan</button>
          </div>
        </div>
      )}

      {/* STEP 4: Plan */}
      {step === 4 && (
        <div className="m-auth-form" style={{ animation:"fadeUp 0.3s ease both" }}>
          <h1 className="m-auth-hero" style={{ fontSize:"1.3rem", marginBottom:2 }}>Choose your<br/><span>shield plan</span></h1>
          <p className="m-auth-sub" style={{ marginBottom:8 }}>Weekly protection. Auto-pays within 2 min of disruption.</p>
          {PLANS.map(plan=>(
            <div key={plan.id} className={`onboard-plan${selectedPlan===plan.id?" selected":""}`}
              onClick={()=>setSelectedPlan(plan.id)}>
              <div className="onboard-plan-row">
                <div>
                  <span className="onboard-plan-name">{plan.name}</span>
                  {plan.badge && <span className="onboard-plan-badge">{plan.badge}</span>}
                </div>
                <span className="onboard-plan-price">{plan.price}</span>
              </div>
              <p className="onboard-plan-desc">{plan.coverage} — {plan.desc}</p>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:6 }}>
            <button className="btn btn-white" style={{ flex:1 }} onClick={prevStep}>Back</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={nextStep}>Next — UPI Setup</button>
          </div>
        </div>
      )}

      {/* STEP 5: UPI */}
      {step === 5 && (
        <div className="m-auth-form" style={{ animation:"fadeUp 0.3s ease both" }}>
          <h1 className="m-auth-hero" style={{ fontSize:"1.3rem", marginBottom:2 }}>Setup your<br/><span>UPI payout</span></h1>
          <p className="m-auth-sub" style={{ marginBottom:10 }}>When disruption triggers, GigShield pays directly to your UPI within 2 minutes.</p>
          <div className="field">
            <label className="field-label">UPI ID (VPA)</label>
            <input className="field-input" type="text" placeholder="yourname@upi"
              value={upiId} onChange={e=>setUpiId(e.target.value.toLowerCase().trim())}
              style={{ fontFamily:"var(--font-mono)" }}/>
          </div>
          <div className="m-info-box" style={{ marginBottom:10 }}>
            <p className="m-info-box-title">Supported Apps</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:3 }}>
              {["Google Pay","PhonePe","Paytm","BHIM","Amazon Pay"].map(a=>(
                <span key={a} style={{ padding:"2px 7px", borderRadius:6, background:"var(--bg-input)", border:"1px solid var(--border)", fontSize:"0.6rem", color:"var(--text-secondary)" }}>{a}</span>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-white" style={{ flex:1 }} onClick={prevStep}>Back</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={completeSignup} disabled={loading}>
              {loading ? <><span className="spinner"/> Creating...</> : "Complete Signup"}
            </button>
          </div>
          <button className="btn btn-outline btn-full btn-sm" onClick={completeSignup} disabled={loading}
            style={{ marginTop:6, fontSize:"0.62rem" }}>Skip UPI — set up later</button>
        </div>
      )}
    </div>
  );
}
