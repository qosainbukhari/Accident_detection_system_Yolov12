import { useDropzone } from "react-dropzone";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";

export default function DropZone({ onFile, accept, label, sublabel, className = "" }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && onFile(files[0]),
    accept,
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center gap-3
        p-12 rounded-2xl border-2 border-dashed cursor-pointer
        transition-all duration-200 select-none
        ${isDragActive
          ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]"
        } ${className}`}
    >
      <input {...getInputProps()} />

      <div className={`p-4 rounded-2xl transition-colors
        ${isDragActive ? "bg-indigo-500/15" : "bg-white/[0.04]"}`}>
        <ArrowUpTrayIcon className={`w-8 h-8 transition-colors
          ${isDragActive ? "text-indigo-400" : "text-slate-500"}`} />
      </div>

      <div className="text-center">
        <p className={`font-semibold transition-colors
          ${isDragActive ? "text-indigo-300" : "text-slate-300"}`}>
          {isDragActive ? "Drop file here" : label}
        </p>
        {sublabel && (
          <p className="text-xs text-slate-600 mt-1">{sublabel}</p>
        )}
        <p className="text-xs text-slate-600 mt-1">
          {accept ? Object.values(accept).flat().join(", ") : "Any file"}
        </p>
      </div>
    </div>
  );
}
