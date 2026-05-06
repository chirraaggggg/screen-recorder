'use client';

import { useState, useRef } from 'react';
import { useEditorStore } from '@/store/editor-store';

export function UploadZone() {
  const { setVideo } = useEditorStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndLoadFile = (file: File) => {
    const validTypes = ['video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a .webm or .mp4 file');
      return;
    }

    const url = URL.createObjectURL(file);

    // Create video element to get dimensions
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      setVideo(file, url, video.duration, video.videoWidth, video.videoHeight);
      video.remove();
    };

    video.onerror = () => {
      alert('Failed to load video file');
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.src = url;
  };

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
      validateAndLoadFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndLoadFile(e.target.files[0]);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 32,
      }}
    >
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 672,
          height: 320,
          borderRadius: 16,
          border: `2px dashed ${isDragging ? 'var(--green)' : 'var(--border)'}`,
          backgroundColor: isDragging ? 'rgba(52,211,116,0.04)' : 'var(--panel)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <svg
          width={48}
          height={48}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          style={{
            marginBottom: 16,
            color: isDragging ? 'var(--green)' : 'var(--muted)',
            transition: 'color 0.2s ease',
          }}
        >
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>

        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: 8,
          }}
        >
          Drop your screen recording here
        </p>

        <p
          style={{
            fontSize: 13,
            color: 'var(--muted)',
            marginBottom: 20,
          }}
        >
          Supports .webm and .mp4 files
        </p>

        <button
          style={{
            padding: '10px 20px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--green)';
            e.currentTarget.style.color = 'var(--green)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text)';
          }}
        >
          Browse files
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="video/mp4,video/webm"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
