import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=phone+pass, 2=otp
  const [form, setForm] = useState({ phone: "", password: "" });
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    if (!form.phone || !form.password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    try {
      // Validate credentials first
      await API.post("/login", form);
      // If valid, send OTP
      const otpRes = await API.post("/otp/send", { phone: form.phone });
      setDemoOtp(otpRes.data.sms_delivered ? "" : (otpRes.data.dev_otp || ""));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async () => {
    if (!otp || otp.length !== 6) { setError("Enter 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      await API.post("/otp/verify", { phone: form.phone, otp });
      const res = await API.post("/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role || "worker");
      localStorage.setItem("name", res.data.name || "");
      if (res.data.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="m-auth">
      <div style={{ marginBottom: 8 }}>
        <p className="m-auth-brand">Gig<span>Shield</span></p>
      </div>

      <h1 className="m-auth-hero">Welcome<br />Back.</h1>
      <p className="m-auth-sub">AI-powered parametric income protection for India's gig riders.</p>

      <div className="m-auth-stats">
        {[["5M+", "Riders"], ["\u20B92.4Cr", "Paid Out"], ["<2min", "Payouts"]].map(([val, lab]) => (
          <div key={lab} className="m-auth-stat">
            <p className="m-auth-stat-val">{val}</p>
            <p className="m-auth-stat-lab">{lab}</p>
          </div>
        ))}
      </div>

      <div className="m-auth-form">
        <div className="tabs">
          <button className="tab active">Sign In</button>
          <button className="tab" onClick={() => navigate("/signup")}>Sign Up</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <>
            <div className="field">
              <label className="field-label">Phone Number</label>
              <input className="field-input" type="tel" placeholder="+91 98765 43210"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && sendOtp()} />
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="Enter your password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && sendOtp()} />
            </div>
            <button className="btn btn-primary btn-full" onClick={sendOtp} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><span className="spinner" /> Sending OTP...</> : "Send OTP & Login"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="m-info-box" style={{ marginBottom: 10 }}>
              <p className="m-info-box-title">OTP Sent</p>
              <p className="m-info-box-text">
                Enter the 6-digit code sent to <strong>{form.phone}</strong>
              </p>
              {demoOtp && (
                <div style={{ marginTop: 4 }}>
                  <p style={{ fontSize: "0.55rem", color: "var(--text-dim)" }}>Dev mode — SMS not configured:</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "var(--primary)", fontWeight: 700 }}>
                    OTP: {demoOtp}
                  </p>
                </div>
              )}
            </div>
            <div className="field">
              <label className="field-label">Enter OTP</label>
              <input className="field-input" type="text" placeholder="------" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && verifyAndLogin()}
                style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: 8, fontFamily: "var(--font-mono)" }} />
            </div>
            <button className="btn btn-primary btn-full" onClick={verifyAndLogin} disabled={loading}>
              {loading ? <><span className="spinner" /> Verifying...</> : "Verify & Login"}
            </button>
            <button className="btn btn-outline btn-full" onClick={() => { setStep(1); setError(""); }} style={{ marginTop: 6 }}>
              Back
            </button>
          </>
        )}

        <p className="switch-text">
          Don't have an account?{" "}
          <span className="switch-link" onClick={() => navigate("/signup")}>Sign Up</span>
        </p>
      </div>
    </div>
  );
}
