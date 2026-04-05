export default function Loader({ size = 20, color = "var(--orange)" }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(255,255,255,0.1)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.65s linear infinite",
      display: "inline-block",
      flexShrink: 0,
    }} />
  );
}

export function PageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", flexDirection: "column", gap: "1rem",
    }}>
      <div style={{
        width: 40, height: 40,
        border: "3px solid rgba(251,146,60,0.2)",
        borderTopColor: "var(--orange)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontFamily: "var(--font-mono)", letterSpacing: "2px" }}>
        LOADING...
      </p>
    </div>
  );
}