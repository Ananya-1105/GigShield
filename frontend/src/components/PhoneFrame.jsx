export default function PhoneFrame({ children }) {
  return (
    <div className="phone-viewport">
      <div className="phone-frame">
        <div className="phone-notch">
          <div className="phone-notch-cam" />
        </div>
        <div className="phone-status-bar">
          <span>9:41</span>
          <span className="phone-status-icons">
            <span style={{ fontSize: "0.55rem" }}>4G</span>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" style={{ opacity: 0.6 }}>
              <rect x="0" y="7" width="2" height="3" rx="0.5" fill="#64748B"/>
              <rect x="3" y="5" width="2" height="5" rx="0.5" fill="#64748B"/>
              <rect x="6" y="3" width="2" height="7" rx="0.5" fill="#64748B"/>
              <rect x="9" y="0" width="2" height="10" rx="0.5" fill="#64748B"/>
            </svg>
            <svg width="16" height="9" viewBox="0 0 16 9" fill="none" style={{ opacity: 0.6 }}>
              <rect x="0.5" y="0.5" width="13" height="8" rx="1.5" stroke="#64748B"/>
              <rect x="14" y="2.5" width="1.5" height="4" rx="0.5" fill="#64748B"/>
              <rect x="1.5" y="1.5" width="8" height="6" rx="1" fill="#64748B"/>
            </svg>
          </span>
        </div>
        <div className="phone-content">
          {children}
        </div>
        <div className="phone-home-bar">
          <div className="phone-home-indicator" />
        </div>
      </div>
    </div>
  );
}
