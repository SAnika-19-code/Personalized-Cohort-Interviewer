"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileJson, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  label: string;
  accept?: string;
  onFileLoaded: (content: string, fileName: string) => void;
  onClear?: () => void;
  error?: string;
  loadedFileName?: string;
}

export function FileUpload({
  label,
  accept = ".json",
  onFileLoaded,
  onClear,
  error,
  loadedFileName,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileLoaded(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-accent bg-accent/10"
            : loadedFileName
              ? "border-success/50 bg-success/5"
              : "border-slate-600 bg-panel/50 hover:border-slate-500",
          error && "border-error/50"
        )}
      >
        {loadedFileName ? (
          <div className="flex items-center gap-3">
            <FileJson className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium text-white">{loadedFileName}</p>
              <p className="text-sm text-success">Loaded successfully</p>
            </div>
            {onClear && (
              <button
                onClick={onClear}
                className="ml-4 rounded-full p-1 hover:bg-slate-700"
                aria-label="Clear file"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-slate-400" />
            <p className="mb-1 text-sm text-slate-300">
              Drag & drop your JSON file here
            </p>
            <p className="mb-4 text-xs text-slate-500">or</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              Browse File
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
