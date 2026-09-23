import React from 'react';
import { ShieldCheck, FileImage } from 'lucide-react';

interface HeaderProps {
  activeTab?: 'single' | 'batch';
  onTabChange?: (tab: 'single' | 'batch') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab = 'single', onTabChange }) => {
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
              Fast, original-quality Image to PDF converter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onTabChange && (
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => onTabChange('single')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'single'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => onTabChange('batch')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'batch'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Batch Mode</span>
                <span className="px-1.5 py-0.2 text-[10px] bg-indigo-100 text-indigo-800 rounded-full font-bold">
                  NEW
                </span>
              </button>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local & Private</span>
          </div>
        </div>
      </div>
    </header>
  );
};
