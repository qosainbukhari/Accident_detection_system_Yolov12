import { useDropzone } from "react-dropzone";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

export default function DropZone({ onFile, accept, label, sublabel, className = "" }) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => files[0] && onFile(files[0]),
    accept,
    maxFiles: 1,
    noClick: true,
  });

  const types = accept ? Object.values(accept).flat().map(t => t.replace(".", "").toUpperCase()) : [];

  return (
    <div
      {...getRootProps()}
      onClick={open}
      className={`group relative flex flex-col items-center justify-center gap-5 px-6 py-16
        rounded-2xl border-2 border-dashed cursor-pointer select-none overflow-hidden
        transition-all duration-200
        ${isDragActive
          ? "border-brand-400 bg-brand-500/[0.06]"
          : "border-white/[0.1] hover:border-brand-400/50 hover:bg-white/[0.015]"
        } ${className}`}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-200
        ${isDragActive
          ? "bg-brand-500/20 border-brand-400/50 scale-110"
          : "bg-ink-800 border-white/[0.08] group-hover:border-brand-400/40 group-hover:-translate-y-1"}`}>
        <CloudArrowUpIcon className={`w-8 h-8 transition-colors
          ${isDragActive ? "text-brand-300" : "text-slate-400 group-hover:text-brand-300"}`} />
      </div>

      <div className="relative text-center">
        <p className="text-base font-semibold text-white">
          {isDragActive ? "Release to upload" : label}
        </p>
        <p className="text-sm text-slate-400 mt-1.5">
          Drag and drop, or <span className="text-brand-300 font-medium underline-offset-4 group-hover:underline">browse files</span>
        </p>
        {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
      </div>

      {types.length > 0 && (
        <div className="relative flex flex-wrap justify-center gap-1.5">
          {types.map(t => (
            <span key={t} className="text-[10px] font-semibold font-mono text-slate-400 bg-white/[0.04]
                                     border border-white/[0.07] px-2 py-0.5 rounded-md">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
