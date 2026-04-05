export function StatCard({ label, value, sub, color = "" }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className={`stat-value ${color}`}>{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

export function ContentCard({ title, children, action }) {
  return (
    <div className="table-card">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        {title && <p className="table-title">{title}</p>}
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Card({ children, style = {} }) {
  return (
    <div className="card" style={style}>
      {children}
    </div>
  );
}