import React from 'react';
import { Loader2 } from 'lucide-react';
import type { ProcessingProgress } from '../types';

interface ProgressBarProps {
  progress: ProcessingProgress;
  title?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, title }) => {
  const percentage =
    progress.totalSteps > 0
      ? Math.min(100, Math.round((progress.currentStep / progress.totalSteps) * 100))
      : 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs max-w-md mx-auto text-center space-y-4 my-8">
      <div className="flex items-center justify-center gap-2.5">
        <Loader2 className="w-5 h-5 text-slate-800 animate-spin" />
        <h3 className="text-base font-bold text-slate-900">
          {title || 'Processing...'}
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span className="truncate pr-2">{progress.message}</span>
          <span className="font-semibold text-slate-700">{percentage}%</span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
          <div
            className="h-full bg-slate-800 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Processing 100% locally in your browser for privacy & speed.
      </p>
    </div>
  );
};
