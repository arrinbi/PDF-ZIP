import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Sliders,
  Archive,
  Zap,
  XCircle,
  Layers,
  FileImage,
  RefreshCw,
} from 'lucide-react';
import type {
  HdScaleFactor,
  HdOutputFormat,
  HdUpscaleOptions,
  HdItemResult,
  HdBatchSummary,
} from '../types';
import {
  isValidHdImageFile,
  getHdOutputFilename,
  upscaleImageWithAi,
} from '../utils/hdUpscaler';
import { formatFileSize, readImageData } from '../utils/imageOptimizer';

export interface SingleHdImageItem {
  file: File;
  name: string;
  size: number;
  width: number;
  height: number;
  previewUrl: string;
}

export const HdRaw: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single Image State
  const [singleItem, setSingleItem] = useState<SingleHdImageItem | null>(null);
  const [singleResult, setSingleResult] = useState<HdItemResult | null>(null);

  // Batch Image State
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchZipName, setBatchZipName] = useState<string>('hd_upscaled_images');
  const [batchSummary, setBatchSummary] = useState<HdBatchSummary | null>(null);

  // Options State
  const [scaleFactor, setScaleFactor] = useState<HdScaleFactor>(2);
  const [outputFormat, setOutputFormat] = useState<HdOutputFormat>('SAME');
  const [quality, setQuality] = useState<number>(0.85);

  // Processing & Progress State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [batchProgressText, setBatchProgressText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Preview tab for single result comparison
  const [previewTab, setPreviewTab] = useState<'upscaled' | 'original'>('upscaled');

  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  const qualityOptions = [0.80, 0.85, 0.90, 0.95, 1.00];

  const handleModeChange = (newMode: 'single' | 'batch') => {
    if (newMode === mode) return;
    setMode(newMode);
    setErrorMessage(null);
  };

  const handleSingleFileSelect = async (file: File) => {
    if (!isValidHdImageFile(file)) {
      setErrorMessage('Format file tidak didukung. Harap unggah gambar JPG, PNG, atau WebP.');
      return;
    }
    setErrorMessage(null);
    setSingleResult(null);

    try {
      const { previewUrl, width, height } = await readImageData(file);
      setSingleItem({
        file,
        name: file.name,
        size: file.size,
        width,
        height,
        previewUrl,
      });
    } catch {
      setErrorMessage('Gagal memuat file gambar.');
    }
  };

  const handleBatchFilesSelect = (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => isValidHdImageFile(f));

    if (valid.length === 0) {
      setErrorMessage('Harap pilih sekurang-kurangnya satu file gambar yang valid (JPG, PNG, WebP).');
      return;
    }

    setErrorMessage(null);
    setBatchFiles((prev) => [...prev, ...valid]);
    setBatchSummary(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (mode === 'single') {
        handleSingleFileSelect(e.dataTransfer.files[0]);
      } else {
        handleBatchFilesSelect(e.dataTransfer.files);
      }
    }
  };

  const handleRemoveBatchFile = (index: number) => {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearBatchFiles = () => {
    setBatchFiles([]);
    setBatchSummary(null);
    setErrorMessage(null);
  };

  const handleCancel = () => {
    cancelRef.current.cancelled = true;
    setIsProcessing(false);
    setProgressMessage('Pemrosesan dibatalkan.');
    setErrorMessage('Pemrosesan dibatalkan oleh pengguna.');
  };

  const handleProcessSingle = async () => {
    if (!singleItem) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(0);
    setProgressMessage('Memulai AI Super Resolution...');
    cancelRef.current = { cancelled: false };

    try {
      const options: HdUpscaleOptions = {
        scaleFactor,
        outputFormat,
        quality,
      };

      const result = await upscaleImageWithAi(
        singleItem.file,
        singleItem.name,
        options,
        (currStep, totalSteps, stageMsg) => {
          const pct = Math.min(100, Math.round((currStep / totalSteps) * 100));
          setProgressPercent(pct);
          setProgressMessage(stageMsg);
        },
        cancelRef.current
      );

      setSingleResult(result);
    } catch (err: any) {
      if (!cancelRef.current.cancelled) {
        setErrorMessage(err.message || 'Gagal memproses AI Super Resolution.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessBatch = async () => {
    if (batchFiles.length === 0) {
      setErrorMessage('Harap pilih minimal satu file gambar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(0);
    cancelRef.current = { cancelled: false };

    const totalCount = batchFiles.length;
    const results: HdItemResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    const options: HdUpscaleOptions = {
      scaleFactor,
      outputFormat,
      quality,
    };

    for (let i = 0; i < totalCount; i++) {
      if (cancelRef.current.cancelled) {
        break;
      }

      const file = batchFiles[i];
      const overallPct = Math.round((i / totalCount) * 100);
      setProgressPercent(overallPct);
      setBatchProgressText(`Memproses gambar ${i + 1} dari ${totalCount}...`);

      try {
        const itemResult = await upscaleImageWithAi(
          file,
          file.name,
          options,
          (_curr, _tot, stageMsg) => {
            setProgressMessage(stageMsg);
          },
          cancelRef.current
        );

        results.push(itemResult);
        successCount++;
      } catch (err: any) {
        if (cancelRef.current.cancelled) {
          break;
        }

        errorCount++;
        const outputFileName = getHdOutputFilename(file.name, scaleFactor, outputFormat);
        results.push({
          id: `${Date.now()}-${i}`,
          fileName: file.name,
          outputFileName,
          originalWidth: 0,
          originalHeight: 0,
          originalSize: file.size,
          upscaledWidth: 0,
          upscaledHeight: 0,
          upscaledSize: 0,
          originalPreviewUrl: '',
          upscaledPreviewUrl: '',
          blob: new Blob(),
          status: 'error',
          errorMessage: err.message || 'Gagal memproses gambar ini.',
        });
      }
    }

    if (cancelRef.current.cancelled) {
      setIsProcessing(false);
      setErrorMessage('Pemrosesan batch dibatalkan.');
      return;
    }

    setProgressPercent(95);
    setBatchProgressText('Membuat arsip ZIP...');
    setProgressMessage('Mengompresi hasil batch ke ZIP...');

    let zipBlob: Blob | undefined;
    let zipUrl: string | undefined;
    const zipCleanName = (batchZipName.trim() || 'hd_upscaled_images').replace(/\.zip$/i, '');
    const zipFileName = `${zipCleanName}.zip`;

    if (successCount > 0) {
      try {
        const zip = new JSZip();
        results.forEach((res) => {
          if (res.status === 'done' && res.blob) {
            zip.file(res.outputFileName, res.blob);
          }
        });
        zipBlob = await zip.generateAsync({ type: 'blob' });
        zipUrl = URL.createObjectURL(zipBlob);
      } catch (err) {
        console.error('Gagal membuat ZIP batch:', err);
      }
    }

    setBatchSummary({
      totalFiles: totalCount,
      successCount,
      errorCount,
      results,
      zipBlob,
      zipUrl,
      zipFileName,
    });

    setProgressPercent(100);
    setIsProcessing(false);
  };

  const handleResetSingle = () => {
    setSingleItem(null);
    setSingleResult(null);
    setErrorMessage(null);
  };

  const handleResetBatch = () => {
    setBatchFiles([]);
    setBatchSummary(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Mode Selector Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60 text-xs sm:text-sm font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => handleModeChange('single')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'single'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileImage className="w-4 h-4" />
            <span>Single Image</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('batch')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'batch'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Batch / ZIP Mode</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
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

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple={mode === 'batch'}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            if (mode === 'single') {
              handleSingleFileSelect(e.target.files[0]);
            } else {
              handleBatchFilesSelect(e.target.files);
            }
          }
        }}
        className="hidden"
      />
      <input
        ref={addMoreInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchFilesSelect(e.target.files);
          }
        }}
        className="hidden"
      />

      {/* Progress State Overlay */}
      {isProcessing && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs animate-pulse">
            <Zap className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              {mode === 'batch' ? batchProgressText || 'Memproses Batch AI Upscaling...' : 'Meningkatkan Kualitas Gambar dengan AI...'}
            </h3>
            <p className="text-xs font-medium text-indigo-600 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-100 mt-2 inline-block">
              {progressMessage}
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/80">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>Progres AI</span>
              <span>{progressPercent}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-700 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Batal</span>
          </button>
        </div>
      )}

      {/* Single Mode View */}
      {!isProcessing && mode === 'single' && (
        <>
          {singleResult ? (
            /* Single Result Display View */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 max-w-3xl mx-auto text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">HD AI Upscale Selesai!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gambar telah berhasil ditingkatkan kualitasnya hingga {scaleFactor}x.
                </p>
              </div>

              {/* Stats Comparison Card */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs">
                <div className="space-y-1 text-left border-r border-slate-200 pr-3">
                  <span className="text-slate-400 font-medium">Original</span>
                  <p className="font-bold text-slate-800 truncate">{singleResult.fileName}</p>
                  <p className="text-slate-600">
                    {singleResult.originalWidth} × {singleResult.originalHeight} px
                  </p>
                  <p className="text-slate-500">{formatFileSize(singleResult.originalSize)}</p>
                </div>

                <div className="space-y-1 text-left pl-1">
                  <span className="text-indigo-600 font-bold">HD AI Upscaled ({scaleFactor}x)</span>
                  <p className="font-bold text-slate-800 truncate">{singleResult.outputFileName}</p>
                  <p className="text-indigo-700 font-semibold">
                    {singleResult.upscaledWidth} × {singleResult.upscaledHeight} px
                  </p>
                  <p className="text-slate-500">{formatFileSize(singleResult.upscaledSize)}</p>
                </div>
              </div>

              {/* Preview Comparison Switcher */}
              <div className="space-y-3">
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('upscaled')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      previewTab === 'upscaled'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Hasil HD ({singleResult.upscaledWidth}×{singleResult.upscaledHeight})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('original')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      previewTab === 'original'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Original ({singleResult.originalWidth}×{singleResult.originalHeight})
                  </button>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-2 max-h-96 flex items-center justify-center overflow-hidden border border-slate-800">
                  <img
                    src={
                      previewTab === 'upscaled'
                        ? singleResult.upscaledPreviewUrl
                        : singleResult.originalPreviewUrl
                    }
                    alt={singleResult.outputFileName}
                    className="max-h-88 object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Download & Reset Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={singleResult.upscaledPreviewUrl}
                  download={singleResult.outputFileName}
                  className="py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Gambar HD ({formatFileSize(singleResult.upscaledSize)})</span>
                </a>

                <button
                  type="button"
                  onClick={handleResetSingle}
                  className="py-3 px-5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Proses Gambar Lain</span>
                </button>
              </div>
            </div>
          ) : !singleItem ? (
            /* Single Image Empty Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer shadow-2xs ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/10'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <Sparkles className="w-7 h-7" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                Unggah Gambar Manhwa / Komik
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                Seret & lepas gambar di sini, atau klik untuk memilih file dari perangkat Anda (JPG, PNG, WebP).
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Super Resolution 2x & 4x untuk Komik & Line Art</span>
              </div>
            </div>
          ) : (
            /* Single Image Configuration Panel */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileImage className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                      {singleItem.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {singleItem.width} × {singleItem.height} px • {formatFileSize(singleItem.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetSingle}
                  className="py-2 px-3 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                >
                  Ganti Gambar
                </button>
              </div>

              {/* Options Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5">
                {/* Scale Factor */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>Faktor Skala AI</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScaleFactor(2)}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        scaleFactor === 2
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Skala 2x
                    </button>
                    <button
                      type="button"
                      onClick={() => setScaleFactor(4)}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        scaleFactor === 4
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Skala 4x
                    </button>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Format Output
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['SAME', 'JPG', 'PNG', 'WEBP'] as HdOutputFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setOutputFormat(fmt)}
                        className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                          outputFormat === fmt
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {fmt === 'SAME' ? 'Sama' : fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Kualitas Kompresi
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    disabled={outputFormat === 'PNG'}
                    className={`w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                      outputFormat === 'PNG'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                        : 'bg-white text-slate-900'
                    }`}
                  >
                    {qualityOptions.map((q) => (
                      <option key={q} value={q}>
                        {Math.round(q * 100)}%
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleProcessSingle}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Sparkles className="w-5 h-5" />
                <span>Tingkatkan Kualitas Gambar ({scaleFactor}x)</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Batch Mode View */}
      {!isProcessing && mode === 'batch' && (
        <>
          {batchSummary ? (
            /* Batch Result Summary View */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 max-w-4xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Batch AI Upscaling Selesai!
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Berhasil memproses {batchSummary.successCount} dari {batchSummary.totalFiles} file
                      {batchSummary.errorCount > 0 ? `, ${batchSummary.errorCount} gagal` : ''}.
                    </p>
                  </div>
                </div>

                {batchSummary.zipUrl && (
                  <a
                    href={batchSummary.zipUrl}
                    download={batchSummary.zipFileName}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Unduh Arsip ZIP Batch ({formatFileSize(batchSummary.zipBlob?.size || 0)})</span>
                  </a>
                )}
              </div>

              {/* Individual Results List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700">Hasil Setiap File:</h3>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {batchSummary.results.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs"
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <FileImage className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="truncate">
                          <p className="font-bold text-slate-800 truncate">{item.outputFileName}</p>
                          <p className="text-slate-500 text-[11px]">
                            {item.status === 'done'
                              ? `${item.upscaledWidth}×${item.upscaledHeight} px • ${formatFileSize(item.upscaledSize)}`
                              : item.errorMessage || 'Gagal'}
                          </p>
                        </div>
                      </div>

                      {item.status === 'done' && (
                        <a
                          href={item.upscaledPreviewUrl}
                          download={item.outputFileName}
                          className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl cursor-pointer shrink-0 transition-colors"
                          title="Unduh file ini"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetBatch}
                  className="py-2.5 px-5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Proses Batch Baru</span>
                </button>
              </div>
            </div>
          ) : batchFiles.length === 0 ? (
            /* Batch Empty Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer shadow-2xs ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/10'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <Layers className="w-7 h-7" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                Unggah Beberapa Gambar (Batch)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                Seret & lepas beberapa file gambar di sini, atau klik untuk memilih file dari perangkat Anda.
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                <Archive className="w-3.5 h-3.5 text-indigo-600" />
                <span>Otomatis Mengunduh Hasil Sebagai Arsip ZIP</span>
              </div>
            </div>
          ) : (
            /* Batch Configuration & File List Form */
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    File Gambar Batch ({batchFiles.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Setel parameter skala dan format output untuk semua file.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addMoreInputRef.current?.click()}
                    className="py-2 px-3 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah File</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBatchFiles}
                    className="py-2 px-3 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                  >
                    Bersihkan
                  </button>
                </div>
              </div>

              {/* Batch Options Bar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama File ZIP Output
                    </label>
                    <input
                      type="text"
                      value={batchZipName}
                      onChange={(e) => setBatchZipName(e.target.value)}
                      placeholder="hd_upscaled_images"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Faktor Skala AI
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setScaleFactor(2)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          scaleFactor === 2
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Skala 2x
                      </button>
                      <button
                        type="button"
                        onClick={() => setScaleFactor(4)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          scaleFactor === 4
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Skala 4x
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Format Output
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['SAME', 'JPG', 'PNG', 'WEBP'] as HdOutputFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setOutputFormat(fmt)}
                          className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                            outputFormat === fmt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {fmt === 'SAME' ? 'Sama' : fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Files List */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-2xs max-h-64 overflow-y-auto">
                {batchFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs"
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <FileImage className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">{f.name}</span>
                      <span className="text-slate-400 shrink-0">({formatFileSize(f.size)})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBatchFile(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Hapus file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleProcessBatch}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Sparkles className="w-5 h-5" />
                <span>Mulai AI Upscaling ({batchFiles.length} File)</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
