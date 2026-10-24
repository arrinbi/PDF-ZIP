import React from 'react';
import { ShieldCheck, FileImage, FileText, Archive, Scissors, Lock } from 'lucide-react';
import type { ExportMode } from '../types';

interface HeaderProps {
  exportMode: ExportMode;
  onExportModeChange: (mode: ExportMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ exportMode, onExportModeChange }) => {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-xs">
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                  PDF-ZIP
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                Fast & secure browser-based document toolkit
              </p>
            </div>
          </div>

          <div className="sm:hidden flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium">
            <ShieldCheck className="w-3 h-3 text-slate-600" />
            <span>Local</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          {/* Main Navigation [ PDF ] [ ZIP ] [ Split PDF ] [ Protect PDF ] */}
          <nav className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 text-xs font-medium max-w-full overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => onExportModeChange('pdf')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                exportMode === 'pdf'
                  ? 'bg-slate-800 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={() => onExportModeChange('zip')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                exportMode === 'zip'
                  ? 'bg-slate-800 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>ZIP</span>
            </button>
            <button
              type="button"
              onClick={() => onExportModeChange('split')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                exportMode === 'split'
                  ? 'bg-slate-800 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split PDF</span>
            </button>
            <button
              type="button"
              onClick={() => onExportModeChange('protect')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                exportMode === 'protect'
                  ? 'bg-slate-800 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Protect PDF</span>
            </button>
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>Local & Private</span>
          </div>
        </div>
      </div>
    </header>
  );
};
