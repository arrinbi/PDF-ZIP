import React from 'react';
import { Download, CheckCircle2, FileCheck, ArrowLeft, Archive } from 'lucide-react';
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md max-w-xl mx-auto space-y-6 text-center animate-fade-in">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
        {isZip ? <Archive className="w-10 h-10 text-emerald-600" /> : <CheckCircle2 className="w-10 h-10" />}
      </div>

      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          {isZip ? 'Your ZIP Archive is Ready!' : 'Your PDF is Ready!'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          {isZip
            ? 'Original uploaded files archived locally in your current preview order.'
            : 'Generated locally on your device with your selected format and quality.'}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 text-left">
        <div>
          <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {isZip ? 'Final ZIP Size' : 'Final PDF Size'}
          </span>
          <span className="text-base font-bold text-slate-900">
            {formatFileSize(sizeBytes)}
          </span>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {isZip ? 'Images' : 'Pages'}
          </span>
          <span className="text-base font-bold text-slate-900">
            {count} {isZip ? (count === 1 ? 'Image' : 'Images') : (count === 1 ? 'Page' : 'Pages')}
          </span>
        </div>
      </div>

      {/* Main Download Action */}
      <div className="space-y-3 pt-2">
        <a
          href={url}
          download={filename}
          className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-base rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>Download {isZip ? 'ZIP' : 'PDF'} ({formatFileSize(sizeBytes)})</span>
        </a>

        <div className={`flex items-center ${isZip ? 'justify-center sm:justify-between' : 'justify-between'} pt-2`}>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isZip ? 'Create Another Export' : 'Create Another PDF'}</span>
          </button>

          {!isZip && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Preview in Browser</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
