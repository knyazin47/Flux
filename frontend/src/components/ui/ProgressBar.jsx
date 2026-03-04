export default function ProgressBar({ value = 0, max = 100, className = "" }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div className={`w-full h-2 rounded-full ${className}`} style={{ background: "var(--border)" }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "#F97316" }}
        />
      </div>
    );
  }