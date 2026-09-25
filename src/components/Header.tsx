import React from 'react';
import { ShieldCheck, FileImage, FileText, Archive } from 'lucide-react';
import type { ExportMode } from '../types';

interface HeaderProps {
  exportMode: ExportMode;
  onExportModeChange: (mode: ExportMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ exportMode, onExportModeChange }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <FileImage className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Img2PDF <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">HD</span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Fast, original-quality Image converter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Navigation [ PDF ] [ ZIP ] */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold">
            <button
              type="button"
              onClick={() => onExportModeChange('pdf')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                exportMode === 'pdf'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={() => onExportModeChange('zip')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                exportMode === 'zip'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>ZIP</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local & Private</span>
          </div>
        </div>
      </div>
    </header>
  );
};
