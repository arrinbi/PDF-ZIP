import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileText,
  Scissors,
  Download,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { SplitMode, SplitPdfResult } from '../types';
import { getPdfPageCount, parsePageRanges, splitPdfByRanges } from '../utils/pdfSplitter';

// Configure pdfjs worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PageThumbnailProps {
  pdfFile: File;
  pageIndex: number; // 0-based
  isSelected: boolean;
  onToggleSelect: () => void;
}

const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pdfFile,
  pageIndex,
  isSelected,
  onToggleSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderStatus, setRenderStatus] = useState<'loading' | 'rendered' | 'error'>('loading');

  useEffect(() => {
    let isCancelled = false;

    async function renderThumbnail() {
      try {
        setRenderStatus('loading');
        const buffer = await pdfFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        if (isCancelled) return;

        const page = await pdfDoc.getPage(pageIndex + 1);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!isCancelled) {
          setRenderStatus('rendered');
        }
      } catch (err) {
        if (!isCancelled) {
          setRenderStatus('error');
        }
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [pdfFile, pageIndex]);

  return (
    <div
      onClick={onToggleSelect}
      className={`relative rounded-xl border-2 p-2 transition-all cursor-pointer select-none flex flex-col items-center justify-between ${
        isSelected
          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="w-full flex items-center justify-between text-xs font-semibold mb-1 px-1">
        <span className="text-slate-600">Page {pageIndex + 1}</span>
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-indigo-600" />
        ) : (
          <Square className="w-4 h-4 text-slate-400" />
        )}
      </div>

      <div className="w-full h-32 sm:h-36 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200/80 my-1">
        {renderStatus === 'loading' && (
          <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain ${
            renderStatus === 'rendered' ? 'block' : 'hidden'
          }`}
        />
        {renderStatus === 'error' && (
          <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
            <FileText className="w-6 h-6 text-slate-400" />
            <span>Page {pageIndex + 1}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const SplitPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [splitMode, setSplitMode] = useState<SplitMode>('select');
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 0-based page indices
  const [rangeInput, setRangeInput] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [splitResult, setSplitResult] = useState<SplitPdfResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setErrorMessage(null);
    setIsLoadingFile(true);
    setSplitResult(null);

    try {
      const count = await getPdfPageCount(file);
      setSelectedFile(file);
      setPageCount(count);

      // Default select all pages
      const allIndices = Array.from({ length: count }, (_, i) => i);
      setSelectedPages(allIndices);
      setRangeInput(count === 1 ? '1' : `1-${count}`);

      const cleanName = file.name.replace(/\.pdf$/i, '');
      setOutputFilename(cleanName);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to load PDF file. Ensure the file is not corrupted or password-protected.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const togglePageSelect = (pageIndex: number) => {
    setSelectedPages((prev) => {
      const exists = prev.includes(pageIndex);
      const updated = exists ? prev.filter((p) => p !== pageIndex) : [...prev, pageIndex].sort((a, b) => a - b);

      // Update range input text representation
      if (updated.length > 0) {
        const pageNums = updated.map((p) => p + 1);
        setRangeInput(pageNums.join(', '));
      } else {
        setRangeInput('');
      }

      return updated;
    });
  };

  const handleSelectAll = () => {
    const allIndices = Array.from({ length: pageCount }, (_, i) => i);
    setSelectedPages(allIndices);
    setRangeInput(pageCount === 1 ? '1' : `1-${pageCount}`);
  };

  const handleDeselectAll = () => {
    setSelectedPages([]);
    setRangeInput('');
  };

  const handleSplit = async () => {
    if (!selectedFile || pageCount === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let rangesToSplit: number[][] = [];

      if (splitMode === 'every_page') {
        // Split every single page into individual PDF
        rangesToSplit = Array.from({ length: pageCount }, (_, i) => [i]);
      } else if (splitMode === 'range') {
        rangesToSplit = parsePageRanges(rangeInput, pageCount);
      } else {
        // 'select' mode: extract selected pages as single PDF or individual pages
        if (selectedPages.length === 0) {
          throw new Error('Please select at least one page to split.');
        }
        rangesToSplit = [selectedPages];
      }

      const result = await splitPdfByRanges(selectedFile, rangesToSplit, outputFilename || 'split_pdf');
      setSplitResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while splitting the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPageCount(0);
    setSelectedPages([]);
    setRangeInput('');
    setOutputFilename('');
    setSplitResult(null);
    setErrorMessage(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline ml-2 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Result View */}
      {splitResult ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">PDF Split Successfully!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Generated {splitResult.files.length} split PDF file{splitResult.files.length > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            {/* If single PDF generated, show Download PDF button */}
            {splitResult.isSingle && splitResult.pdf && (
              <a
                href={splitResult.pdf.url}
                download={splitResult.pdf.filename}
                className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF ({formatBytes(splitResult.pdf.sizeBytes)})</span>
              </a>
            )}

            {/* ZIP download option available for both single and multiple PDF split results */}
            {splitResult.zip && (
              <a
                href={splitResult.zip.url}
                download={splitResult.zip.filename}
                className={`w-full py-3 px-5 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                  splitResult.isSingle
                    ? 'bg-slate-800 hover:bg-slate-900 shadow-md shadow-slate-200 active:scale-98'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-98'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Download ZIP Archive ({formatBytes(splitResult.zip.sizeBytes)})</span>
              </a>
            )}

            {/* List of generated split files */}
            {splitResult.files.length > 1 && (
              <div className="pt-4 border-t border-slate-100 text-left space-y-2">
                <h3 className="text-xs font-semibold text-slate-600">Individual Split Files:</h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {splitResult.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{file.filename}</span>
                        <span className="text-slate-400 shrink-0">({file.pagesLabel})</span>
                      </div>
                      <a
                        href={file.url}
                        download={file.filename}
                        className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer shrink-0"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={handleReset}
              className="py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Split Another PDF</span>
            </button>
          </div>
        </div>
      ) : !selectedFile ? (
        /* Empty Dropzone State */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            {isLoadingFile ? (
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Scissors className="w-6 h-6" />
            )}
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            {isLoadingFile ? 'Loading PDF Document...' : 'Upload PDF File to Split'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Drag & drop a PDF document here, or click to browse from your device.
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Preserves 100% Original Vector & Text Quality</span>
          </div>
        </div>
      ) : (
        /* PDF Options & Pages Grid State */
        <div className="space-y-6">
          {/* File Overview Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatBytes(selectedFile.size)} • {pageCount} page{pageCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="py-1.5 px-3 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Change File
            </button>
          </div>

          {/* Split Mode Selector & Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Split Mode</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSplitMode('select')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  splitMode === 'select'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">Extract Selected Pages</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Choose specific pages to extract into a single PDF.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('range')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  splitMode === 'range'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">Split by Page Ranges</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Define custom ranges (e.g. 1-3, 4-6, 7-10).
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('every_page')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  splitMode === 'every_page'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">Split Every Page</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Separates each page into its own 1-page PDF file.
                </div>
              </button>
            </div>

            {/* Inputs & Controls based on mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {splitMode === 'range' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Page Range Expression
                  </label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder={`e.g. 1-2, 3-${pageCount}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Separate ranges with commas (e.g., 1-5, 6-10).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Base Output Filename
                </label>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="split_document"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Pages Grid Header & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Pages ({selectedPages.length} of {pageCount} selected)
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] text-slate-500 hover:underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>

            <button
              onClick={handleSplit}
              disabled={isProcessing}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Scissors className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Processing PDF...' : 'Split PDF'}</span>
            </button>
          </div>

          {/* Page Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {Array.from({ length: pageCount }, (_, idx) => (
              <PageThumbnail
                key={idx}
                pdfFile={selectedFile}
                pageIndex={idx}
                isSelected={selectedPages.includes(idx)}
                onToggleSelect={() => togglePageSelect(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
