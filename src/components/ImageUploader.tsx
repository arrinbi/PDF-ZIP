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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium text-sm rounded-xl shadow-xs hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 active:bg-slate-100 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-600" />
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
      className="group relative border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 transition-all rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center min-h-[260px]"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      <div className="w-16 h-16 mb-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-100 transition-all flex items-center justify-center">
        <Upload className="w-8 h-8" />
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-1">
        Select or Drop Images
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 mb-4 max-w-sm">
        Choose multiple images to combine into one compressed PDF.
      </p>

      <button
        type="button"
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
      >
        <ImageIcon className="w-4 h-4" />
        <span>Add Images</span>
      </button>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span>Supported:</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">JPG</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">PNG</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">WEBP</span>
      </div>
    </div>
  );
};
