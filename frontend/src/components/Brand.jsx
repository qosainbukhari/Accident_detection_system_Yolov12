export function BrandMark({ className = "w-9 h-9" }) {
  return (
    <div className={`${className} rounded-xl bg-gradient-to-br from-brand-400 to-brand-700
                     flex items-center justify-center shadow-brand shrink-0`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-[58%] h-[58%]">
        <path d="M12 2.5 4.5 5.3v6.1c0 4.6 3.1 8.6 7.5 10.1 4.4-1.5 7.5-5.5 7.5-10.1V5.3L12 2.5Z"
              fill="white" fillOpacity=".95" />
        <path d="M12 7.5v5.2" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1.3" fill="#0369a1" />
      </svg>
    </div>
  );
}

export default function Brand({ subtitle = "Emergency Response" }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div className="leading-tight">
        <p className="text-[15px] font-bold text-white tracking-tight">AccidentAI</p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}
