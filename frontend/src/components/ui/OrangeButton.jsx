export default function OrangeButton({ children, onClick, disabled, className = "", type = "button" }) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        style={{ background: disabled ? "#FDBA74" : "#F97316" }}
      >
        {children}
      </button>
    );
  }