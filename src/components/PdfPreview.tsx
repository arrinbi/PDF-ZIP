import React from 'react';
import { Download, CheckCircle2, ArrowLeft, Archive } from 'lucide-react';
import type { ExportResult, GeneratedPdfResult, GeneratedZipResult } from '../types';
import { formatFileSize } from '../utils/imageOptimizer';

interface PdfPreviewProps {
  exportResult?: ExportResult | null;
  pdfResult?: GeneratedPdfResult | null;
  zipResult?: GeneratedZipResult | null;
  originalTotalSize?: number;
  onReset: () => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  exportResult,
  pdfResult,
  zipResult,
  onReset,
}) => {
  let isZip = false;
  let filename = '';
  let url = '';
  let sizeBytes = 0;
  let count = 0;

  if (exportResult) {
    if (exportResult.mode === 'zip') {
      isZip = true;
      filename = exportResult.zip.filename;
      url = exportResult.zip.url;
      sizeBytes = exportResult.zip.sizeBytes;
      count = exportResult.zip.fileCount;
    } else {
      isZip = false;
      filename = exportResult.pdf.filename;
      url = exportResult.pdf.url;
      sizeBytes = exportResult.pdf.sizeBytes;
      count = exportResult.pdf.pageCount;
    }
  } else if (zipResult) {
    isZip = true;
    filename = zipResult.filename;
    url = zipResult.url;
    sizeBytes = zipResult.sizeBytes;
    count = zipResult.fileCount;
  } else if (pdfResult) {
    isZip = false;
    filename = pdfResult.filename;
    url = pdfResult.url;
    sizeBytes = pdfResult.sizeBytes;
    count = pdfResult.pageCount;
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs max-w-md mx-auto space-y-6 text-center animate-fade-in">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
        {isZip ? <Archive className="w-7 h-7 text-slate-800" /> : <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
      </div>

      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">
          {isZip ? 'Your ZIP Archive is Ready!' : 'Your PDF is Ready!'}
        </h2>
        <p className="text-xs text-slate-500">
          {isZip
            ? 'Original uploaded files archived locally in your current preview order.'
            : 'Generated locally on your device with your selected format and quality.'}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-left">
        <div>
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isZip ? 'Final ZIP Size' : 'Final PDF Size'}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-900">
            {formatFileSize(sizeBytes)}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isZip ? 'Images' : 'Pages'}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-900">
            {count} {isZip ? (count === 1 ? 'Image' : 'Images') : (count === 1 ? 'Page' : 'Pages')}
          </span>
        </div>
      </div>

      {/* Main Download Action */}
      <div className="space-y-3 pt-1">
        <a
          href={url}
          download={filename}
          className="w-full py-3 px-5 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download {isZip ? 'ZIP' : 'PDF'} ({formatFileSize(sizeBytes)})</span>
        </a>

        <div className="flex items-center justify-center pt-1">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isZip ? 'Create Another Export' : 'Create Another PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
