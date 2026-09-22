import React from 'react';
import { Trash2, ArrowLeft, ArrowRight, GripVertical } from 'lucide-react';
import type { ImageItem } from '../types';
import { formatFileSize } from '../utils/imageOptimizer';

interface ImageListProps {
  images: ImageItem[];
  onRemove: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onClearAll: () => void;
}

export const ImageList: React.FC<ImageListProps> = ({
  images,
  onRemove,
  onMove,
  onClearAll,
}) => {
  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Selected Images ({images.length})
          </h2>
          <p className="text-xs text-slate-500">Reorder pages or tap to remove</p>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {images.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === images.length - 1;

          return (
            <div
              key={item.id}
              className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
            >
              {/* Page Badge */}
              <div className="absolute top-2 left-2 z-10 bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Page {index + 1}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemove(item.id)}
                className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-xs transition-transform active:scale-90 cursor-pointer"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Image Preview Container */}
              <div className="relative aspect-4/3 sm:aspect-square bg-slate-100 flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain rounded-md"
                />
              </div>

              {/* File Info & Reorder Controls */}
              <div className="p-2.5 bg-white border-t border-slate-100 flex-1 flex flex-col justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatFileSize(item.size)} • {item.width}×{item.height}
                  </p>
                </div>

                {/* Move Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-500">
                  <button
                    disabled={isFirst}
                    onClick={() => onMove(index, index - 1)}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    title="Move Left / Up"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <GripVertical className="w-3.5 h-3.5 text-slate-300" />

                  <button
                    disabled={isLast}
                    onClick={() => onMove(index, index + 1)}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    title="Move Right / Down"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
