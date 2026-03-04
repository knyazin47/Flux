export default function TopicBadge({ label }) {
    return (
      <span
        className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "#FFF7ED", color: "#F97316", border: "1px solid #FDBA74" }}
      >
        {label}
      </span>
    );
  }