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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-lg mx-auto text-center space-y-4 my-8">
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <h3 className="text-base font-semibold text-slate-800">
          {title || 'Processing...'}
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>{progress.message}</span>
          <span>{percentage}%</span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Processing locally in your browser for privacy & speed.
      </p>
    </div>
  );
};
