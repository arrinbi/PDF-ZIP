import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Plus } from 'lucide-react';

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  isCompact?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, isCompact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImagesSelected(Array.from(e.target.files));
      e.target.value = ''; // Reset input to allow re-selection
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type.toLowerCase()) ||
        /\.(jpg|jpeg|png|webp)$/i.test(file.name)
      );
      if (validFiles.length > 0) {
        onImagesSelected(validFiles);
      }
    }
  };

  if (isCompact) {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/90 text-slate-700 font-medium text-xs sm:text-sm rounded-xl shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-700" />
          <span>Add More Images</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className="group relative border-2 border-dashed border-slate-200/90 hover:border-slate-400 bg-white hover:bg-slate-50/50 transition-all rounded-2xl p-8 sm:p-10 text-center cursor-pointer flex flex-col items-center justify-center min-h-[260px] shadow-2xs"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      <div className="w-14 h-14 mb-4 rounded-2xl bg-slate-100 text-slate-700 group-hover:scale-105 group-hover:bg-slate-200/80 transition-all flex items-center justify-center">
        <Upload className="w-7 h-7" />
      </div>

      <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
        Select or Drop Images
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 mb-5 max-w-sm">
        Choose multiple images to convert or archive in high quality.
      </p>

      <button
        type="button"
        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
      >
        <ImageIcon className="w-4 h-4" />
        <span>Browse Images</span>
      </button>

      <div className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <span>Formats:</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/60">JPG</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/60">PNG</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/60">WEBP</span>
      </div>
    </div>
  );
};
