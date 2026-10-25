import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ImageList } from './components/ImageList';
import { ProgressBar } from './components/ProgressBar';
import { PdfPreview } from './components/PdfPreview';
import { BatchProcessing } from './components/BatchProcessing';
import { SplitPdf } from './components/SplitPdf';
import { ProtectPdf } from './components/ProtectPdf';
import type {
  ExportMode,
  ExportResult,
  ImageItem,
  OutputFormat,
  PdfOptions,
  ProcessingProgress,
  ZipOutputFormat,
} from './types';
import { readImageData, formatFileSize } from './utils/imageOptimizer';
import { generatePdfFromImages } from './utils/pdfGenerator';
import { generateZipFromImages } from './utils/zipGenerator';
import {
  Sparkles,
  Sliders,
  Archive,
  FileText,
  Scissors,
  Lock,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export const App: React.FC = () => {
  const [exportMode, setExportMode] = useState<ExportMode>('pdf');
  const [modeType, setModeType] = useState<'standard' | 'batch'>('standard');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('JPG');
  const [zipOutputFormat, setZipOutputFormat] = useState<ZipOutputFormat>('ORIGINAL');
  const [quality, setQuality] = useState<number>(0.85); // Default 85%
  const [pdfFilename, setPdfFilename] = useState<string>('converted_images');
  const [zipFilename, setZipFilename] = useState<string>('images');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'idle',
    currentStep: 0,
    totalSteps: 0,
    message: '',
  });
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImagesSelected = async (files: File[]) => {
    setErrorMessage(null);
    try {
      const newItems: ImageItem[] = [];
      for (const file of files) {
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const { previewUrl, width, height } = await readImageData(file);
        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl,
          width,
          height,
          status: 'idle',
        });
      }
      setImages((prev) => [...prev, ...newItems]);
    } catch {
      setErrorMessage('Failed to read selected images. Please try valid JPG, PNG, or WEBP images.');
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleClearAll = () => {
    setImages([]);
    setExportResult(null);
    setErrorMessage(null);
  };

  const handleExport = async () => {
    if (images.length === 0) {
      setErrorMessage('Please upload at least one image before exporting.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const totalCount = images.length;

    try {
      if (exportMode === 'pdf') {
        setProgress({
          stage: 'generating',
          currentStep: 0,
          totalSteps: totalCount,
          message: 'Building PDF document...',
        });

        const options: PdfOptions = {
          pageSize: 'fit',
          margin: 0,
          filename: pdfFilename || 'converted_images',
          outputFormat,
          quality,
        };

        const result = await generatePdfFromImages(images, options, (curr, tot) => {
          setProgress({
            stage: 'generating',
            currentStep: curr,
            totalSteps: tot,
            message: `Adding page ${curr} of ${tot} to PDF...`,
          });
        });

        setExportResult({ mode: 'pdf', pdf: result });
      } else {
        setProgress({
          stage: 'generating',
          currentStep: 0,
          totalSteps: totalCount,
          message: 'Creating ZIP archive...',
        });

        const result = await generateZipFromImages(
          images,
          {
            filename: zipFilename || 'images',
            outputFormat: zipOutputFormat,
            quality: quality,
          },
          (curr, tot) => {
            setProgress({
              stage: 'generating',
              currentStep: curr,
              totalSteps: tot,
              message: `Adding file ${curr} of ${tot} to ZIP...`,
            });
          }
        );

        setExportResult({ mode: 'zip', zip: result });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during export.');
    } finally {
      setIsProcessing(false);
      setProgress({
        stage: 'complete',
        currentStep: 0,
        totalSteps: 0,
        message: '',
      });
    }
  };

  const totalOriginalSizeBytes = images.reduce((acc, curr) => acc + curr.size, 0);

  const qualityOptions = [0.80, 0.85, 0.90, 0.95, 1.00];

  const mainFeatures = [
    {
      id: 'pdf' as ExportMode,
      title: 'PDF',
      label: 'PDF Document',
      description: 'Convert images into clean PDF document',
      icon: FileText,
      badge: 'Images to PDF',
    },
    {
      id: 'zip' as ExportMode,
      title: 'ZIP',
      label: 'ZIP Archive',
      description: 'Export images as an ordered ZIP archive',
      icon: Archive,
      badge: 'Original Quality',
    },
    {
      id: 'split' as ExportMode,
      title: 'Split PDF',
      label: 'Split PDF',
      description: 'Extract or separate PDF pages',
      icon: Scissors,
      badge: 'PDF Tool',
    },
    {
      id: 'protect' as ExportMode,
      title: 'Protect PDF',
      label: 'Protect PDF',
      description: 'Encrypt PDF with password protection',
      icon: Lock,
      badge: 'Local Security',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Step 1: Main Feature Navigation Cards */}
        <section aria-label="Main Feature Selector">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {mainFeatures.map((feature) => {
              const Icon = feature.icon;
              const isSelected = exportMode === feature.id;

              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => setExportMode(feature.id)}
                  className={`group relative text-left p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'bg-white border-2 border-indigo-600 shadow-md ring-4 ring-indigo-500/10'
                      : 'bg-white/80 hover:bg-white border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-sm'
                  }`}
                >
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between w-full mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:border-slate-300'
                      }`}
                    >
                      {feature.badge}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span>{feature.title}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 inline" />
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Feature Views */}
        {exportMode === 'split' ? (
          <SplitPdf />
        ) : exportMode === 'protect' ? (
          <ProtectPdf />
        ) : (
          <div className="space-y-6">
            {/* Secondary Navigation: [ Standard Mode ] [ Batch Mode ] */}
            <div className="flex justify-center">
              <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60 text-xs sm:text-sm font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setModeType('standard')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    modeType === 'standard'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard Mode
                </button>
                <button
                  type="button"
                  onClick={() => setModeType('batch')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    modeType === 'batch'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Batch Mode</span>
                  <span className="px-1.5 py-0.2 text-[10px] bg-indigo-100 text-indigo-800 rounded-full font-bold">
                    NEW
                  </span>
                </button>
              </div>
            </div>

            {modeType === 'batch' ? (
              <BatchProcessing exportMode={exportMode} />
            ) : (
              <>
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
                    <span>{errorMessage}</span>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="text-xs font-semibold underline ml-2 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* View 1: Export Result State */}
                {exportResult ? (
                  <PdfPreview
                    exportResult={exportResult}
                    originalTotalSize={totalOriginalSizeBytes}
                    onReset={() => setExportResult(null)}
                  />
                ) : isProcessing ? (
                  /* View 2: Progress State */
                  <ProgressBar
                    progress={progress}
                    title={
                      exportMode === 'zip'
                        ? 'Creating ZIP Archive...'
                        : 'Generating PDF Document...'
                    }
                  />
                ) : images.length === 0 ? (
                  /* View 3: Empty State Landing Dropzone */
                  <div className="space-y-6">
                    <ImageUploader onImagesSelected={handleImagesSelected} />

                    {/* Feature Highlight Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-1">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">PDF & ZIP Export</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Combine images into tailored PDF documents or package original files as a sorted ZIP archive.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-1">
                          <Archive className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Original Quality ZIP</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Export retains original byte streams with zero loss, compression, or format changes.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-1">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">100% On-Device</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Your files never leave your browser. All conversion logic runs locally on your machine.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View 4: Standard Workspace Layout (2 Columns on Desktop) */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Image List & Management */}
                    <div className="lg:col-span-8 space-y-4">
                      {/* Top Action Bar */}
                      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
                        <ImageUploader onImagesSelected={handleImagesSelected} isCompact />
                        <span className="text-xs text-slate-500 font-medium">
                          {images.length} image{images.length === 1 ? '' : 's'} added ({formatFileSize(totalOriginalSizeBytes)})
                        </span>
                      </div>

                      {/* Image List Component */}
                      <ImageList
                        images={images}
                        onRemove={handleRemoveImage}
                        onMove={handleMoveImage}
                        onClearAll={handleClearAll}
                      />
                    </div>

                    {/* Right Column: Settings Panel & Main Processing Action */}
                    <div className="lg:col-span-4 sticky top-20 space-y-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-2xs">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
                          <Sliders className="w-4 h-4 text-indigo-600" />
                          <span>{exportMode === 'pdf' ? 'PDF Options' : 'ZIP Options'}</span>
                        </div>

                        {exportMode === 'pdf' ? (
                          /* PDF Options Form */
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                PDF Document Name
                              </label>
                              <input
                                type="text"
                                value={pdfFilename}
                                onChange={(e) => setPdfFilename(e.target.value)}
                                placeholder="my-converted-pdf"
                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white transition-all text-slate-900"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Image Output
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {(['JPG', 'PNG'] as OutputFormat[]).map((fmt) => (
                                  <button
                                    key={fmt}
                                    type="button"
                                    onClick={() => setOutputFormat(fmt)}
                                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                                      outputFormat === fmt
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {fmt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Quality
                              </label>
                              <select
                                value={quality}
                                onChange={(e) => setQuality(parseFloat(e.target.value))}
                                disabled={outputFormat === 'PNG'}
                                className={`w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                                  outputFormat === 'PNG'
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                    : 'bg-slate-50/50 focus:bg-white text-slate-900'
                                }`}
                              >
                                {qualityOptions.map((q) => (
                                  <option key={q} value={q}>
                                    {Math.round(q * 100)}%
                                  </option>
                                ))}
                              </select>
                              {outputFormat === 'PNG' && (
                                <p className="text-[10px] text-indigo-600 font-medium mt-1">
                                  PNG is lossless (quality disabled).
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* ZIP Options Form */
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                ZIP Document Name
                              </label>
                              <input
                                type="text"
                                value={zipFilename}
                                onChange={(e) => setZipFilename(e.target.value)}
                                placeholder="images"
                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white transition-all text-slate-900"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Image Output
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                {(['ORIGINAL', 'JPG', 'PNG', 'WEBP'] as ZipOutputFormat[]).map(
                                  (fmt) => (
                                    <button
                                      key={fmt}
                                      type="button"
                                      onClick={() => setZipOutputFormat(fmt)}
                                      className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                                        zipOutputFormat === fmt
                                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      {fmt === 'ORIGINAL' ? 'Original' : fmt}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Quality
                              </label>
                              <select
                                value={quality}
                                onChange={(e) => setQuality(parseFloat(e.target.value))}
                                disabled={zipOutputFormat === 'ORIGINAL' || zipOutputFormat === 'PNG'}
                                className={`w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                                  zipOutputFormat === 'ORIGINAL' || zipOutputFormat === 'PNG'
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                    : 'bg-slate-50/50 focus:bg-white text-slate-900'
                                }`}
                              >
                                {qualityOptions.map((q) => (
                                  <option key={q} value={q}>
                                    {Math.round(q * 100)}%
                                  </option>
                                ))}
                              </select>
                              {(zipOutputFormat === 'ORIGINAL' || zipOutputFormat === 'PNG') && (
                                <p className="text-[10px] text-indigo-600 font-medium mt-1">
                                  {zipOutputFormat === 'ORIGINAL'
                                    ? 'Original byte-for-byte.'
                                    : 'PNG is lossless.'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Summary & Action Button */}
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>Ready to Process:</span>
                            <span className="font-bold text-slate-900">
                              {images.length} file{images.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          <button
                            onClick={handleExport}
                            className="w-full py-3 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {exportMode === 'zip' ? (
                              <Archive className="w-5 h-5" />
                            ) : (
                              <Sparkles className="w-5 h-5" />
                            )}
                            <span>
                              {exportMode === 'zip'
                                ? `Export ZIP (${images.length})`
                                : `Create PDF (${images.length})`}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
