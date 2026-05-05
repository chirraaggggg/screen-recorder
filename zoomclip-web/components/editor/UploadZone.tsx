"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes("video")) {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex items-center justify-center w-full h-full p-8"
      >
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full max-w-2xl h-80 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-[var(--zoom-accent)] bg-[var(--zoom-accent)]/10 drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              : "border-[var(--zoom-border)] bg-[var(--zoom-surface)] hover:border-[var(--zoom-text-secondary)]"
          }`}
        >
          <svg
            className={`w-16 h-16 mb-4 ${
              isDragging ? "text-[var(--zoom-accent)]" : "text-[var(--zoom-text-secondary)]"
            } transition-colors`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="text-xl font-medium text-[var(--zoom-text-primary)] mb-2">
            Drop your screen recording here
          </p>
          <p className="text-sm text-[var(--zoom-text-secondary)]">
            Supports .mp4, .webm (or use the Chrome Extension)
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept="video/mp4,video/webm"
            className="hidden"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
