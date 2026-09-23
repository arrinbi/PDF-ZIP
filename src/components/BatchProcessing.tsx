import React, { useRef, useState } from 'react';
import type { BatchFolder, ExportMode, OutputFormat, ZipOutputFormat } from '../types';
import { createBatchFolderFromFiles, processBatchFolder } from '../utils/batchProcessor';
import { formatFileSize } from '../utils/imageOptimizer';
import {
  FolderPlus,
  Trash2,
  Play,
  CheckCircle2,
  Folder,
  FileText,
  Archive,
  Sliders,
  Image as ImageIcon,
  AlertCircle,
  Download,
  RotateCcw,
} from 'lucide-react';

interface BatchProcessingProps {
  onBackToSingle?: () => void;
}

export const BatchProcessing: React.FC<BatchProcessingProps> = () => {
  const [batches, setBatches] = useState<BatchFolder[]>([]);
  const [exportMode, setExportMode] = useState<ExportMode>('pdf');
  const [margin, setMargin] = useState<number>(0);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('JPG');
  const [zipOutputFormat, setZipOutputFormat] = useState<ZipOutputFormat>('ORIGINAL');
  const [quality, setQuality] = useState<number>(0.85);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [currentProgressText, setCurrentProgressText] = useState<string>('');
  const [completedResults, setCompletedResults] = useState<{ folderName: string; downloadUrl: string; filename: string; sizeBytes: number }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setErrorMessage(null);

    const filesArray = Array.from(e.target.files);
    // Group files by top-level webkitRelativePath directory or relative folder
    const groups: Map<string, File[]> = new Map();

    for (const file of filesArray) {
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');
      const folderName = parts.length > 1 ? parts[0] : 'Selected Folder';
      if (!groups.has(folderName)) {
        groups.set(folderName, []);
      }
      groups.get(folderName)!.push(file);
    }

    const newBatches: BatchFolder[] = [];
    for (const [fName, files] of groups.entries()) {
      const newBatch = await createBatchFolderFromFiles(files, fName);
      if (newBatch && newBatch.images.length > 0) {
        newBatches.push(newBatch);
      }
    }

    if (newBatches.length === 0) {
      setErrorMessage('No valid JPG, PNG, or WEBP images found in the selected folder.');
    } else {
      setBatches((prev) => [...prev, ...newBatches]);
    }

    e.target.value = ''; // reset input
  };

  const handleRemoveBatch = (id: string) => {
    setBatches((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearAll = () => {
    setBatches([]);
    setCompletedResults([]);
    setErrorMessage(null);
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartBatchProcessing = async () => {
    if (batches.length === 0) {
      setErrorMessage('Please add at least one folder before starting batch processing.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setCompletedResults([]);

    const resultsList: { folderName: string; downloadUrl: string; filename: string; sizeBytes: number }[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setCurrentProcessingIndex(i);
        setCurrentProgressText(`Processing folder ${i + 1} of ${batches.length}: "${batch.folderName}" (${batch.images.length} images)...`);

        const res = await processBatchFolder(
          batch,
          exportMode,
          {
            pdfOptions: { margin, outputFormat, quality },
            zipOptions: { outputFormat: zipOutputFormat, quality },
          },
          (curr, tot) => {
            setCurrentProgressText(
              `Processing "${batch.folderName}": ${curr}/${tot} images...`
            );
          }
        );

        let downloadUrl = '';
        let filename = '';
        let sizeBytes = 0;

        if (res.mode === 'pdf') {
          downloadUrl = res.pdf.url;
          filename = res.pdf.filename;
          sizeBytes = res.pdf.sizeBytes;
        } else {
          downloadUrl = res.zip.url;
          filename = res.zip.filename;
          sizeBytes = res.zip.sizeBytes;
        }

        resultsList.push({
          folderName: batch.folderName,
          downloadUrl,
          filename,
          sizeBytes,
        });

        // Trigger immediate browser download
        triggerDownload(downloadUrl, filename);
      }

      setCompletedResults(resultsList);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during batch processing.');
    } finally {
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
    }
  };

  const totalImagesAcrossBatches = batches.reduce((acc, b) => acc + b.images.length, 0);

  return (
    <div className="space-y-6">
      {/* Hidden webkitdirectory file input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in HTML input but non-standard TS attribute
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderSelect}
      />

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Completed Batch View */}
      {completedResults.length > 0 && !isProcessing ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Batch Processing Complete!
              </h2>
              <p className="text-xs text-slate-500">
                Processed {completedResults.length} folders successfully. Downloads started automatically.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {completedResults.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="font-semibold text-slate-800">{item.filename}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(item.sizeBytes)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerDownload(item.downloadUrl, item.filename)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Again</span>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCompletedResults([])}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Process Another Batch</span>
            </button>
          </div>
        </div>
      ) : isProcessing ? (
        /* Progress View */
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center animate-pulse">
            <Play className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800">Batch Processing in Progress</h3>
            <p className="text-sm text-slate-600">{currentProgressText}</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden max-w-md mx-auto">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${
                  batches.length > 0 && currentProcessingIndex >= 0
                    ? Math.round(((currentProcessingIndex + 1) / batches.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      ) : (
        /* Main Batch Selection View */
        <div className="space-y-6">
          {/* Top Actions & Options Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-600" />
                  Batch Folder Selection
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select specific folders one by one. Each folder will be processed into an independent {exportMode.toUpperCase()} file.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Add Folder</span>
                </button>
              </div>
            </div>

            {/* Export Format Settings */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Batch Output Settings</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Output format:</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExportMode('pdf')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        exportMode === 'pdf'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportMode('zip')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        exportMode === 'zip'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>ZIP</span>
                    </button>
                  </div>
                </div>
              </div>

              {exportMode === 'pdf' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Page Margin
                    </label>
                    <select
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    >
                      <option value={0}>No Margin (Full Bleed)</option>
                      <option value={5}>Small (5mm)</option>
                      <option value={10}>Standard (10mm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Image Output
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['JPG', 'PNG'] as OutputFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setOutputFormat(fmt)}
                          className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                            outputFormat === fmt
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-slate-600">Quality</label>
                      <span className="text-xs font-bold text-indigo-600">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.80"
                      max="1.00"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      disabled={outputFormat === 'PNG'}
                      className={`w-full accent-indigo-600 ${
                        outputFormat === 'PNG' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ZIP Format
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['ORIGINAL', 'JPG', 'PNG', 'WEBP'] as ZipOutputFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setZipOutputFormat(fmt)}
                          className={`py-1.5 px-1 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                            zipOutputFormat === fmt
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {fmt === 'ORIGINAL' ? 'Original' : fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-slate-600">Quality</label>
                      <span className="text-xs font-bold text-indigo-600">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.80"
                      max="1.00"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      disabled={zipOutputFormat === 'ORIGINAL' || zipOutputFormat === 'PNG'}
                      className={`w-full accent-indigo-600 ${
                        zipOutputFormat === 'ORIGINAL' || zipOutputFormat === 'PNG'
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Batches List */}
          {batches.length === 0 ? (
            <div
              onClick={() => folderInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 transition-all rounded-2xl p-10 text-center cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
            >
              <div className="w-14 h-14 mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FolderPlus className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                No Folders Selected Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-4 max-w-md">
                Click here or use the "Add Folder" button above to select individual folders for batch processing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Selected Folders ({batches.length}) • Total Images ({totalImagesAcrossBatches})
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                >
                  Clear All Folders
                </button>
              </div>

              <div className="space-y-2">
                {batches.map((b, index) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <Folder className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{b.folderName}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <ImageIcon className="w-3 h-3 text-slate-400" />
                          <span>
                            {b.images.length} valid images (JPG/PNG/WEBP)
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBatch(b.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleStartBatchProcessing}
                  className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    Process All Batches ({batches.length} {exportMode === 'pdf' ? 'PDFs' : 'ZIPs'})
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
