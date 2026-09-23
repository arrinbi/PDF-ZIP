import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ImageList } from './components/ImageList';
import { ProgressBar } from './components/ProgressBar';
import { PdfPreview } from './components/PdfPreview';
import { BatchProcessing } from './components/BatchProcessing';
import type {
  ExportMode,
  ExportResult,
  ImageItem,
  OutputFormat,
  PdfOptions,
  ProcessingProgress,
  ZipOutputFormat,
} from './types';
import { readImageData } from './utils/imageOptimizer';
import { generatePdfFromImages } from './utils/pdfGenerator';
import { generateZipFromImages } from './utils/zipGenerator';
import { FileText, Sparkles, Sliders, Info, Image as ImageIcon, Archive } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [exportMode, setExportMode] = useState<ExportMode>('pdf');
  const pageSize = 'fit';
  const [margin, setMargin] = useState<number>(0);
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
          pageSize,
          margin,
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {activeTab === 'batch' ? (
          <BatchProcessing />
        ) : (
          <>
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold underline ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View 1: Generated Export Result */}
        {exportResult ? (
          <PdfPreview
            exportResult={exportResult}
            originalTotalSize={totalOriginalSizeBytes}
            onReset={() => setExportResult(null)}
          />
        ) : isProcessing ? (
          /* View 2: Processing Progress */
          <ProgressBar
            progress={progress}
            title={exportMode === 'zip' ? 'Creating ZIP Archive...' : 'Generating PDF Document...'}
          />
        ) : images.length === 0 ? (
          /* View 3: Empty State / Initial File Dropzone */
          <div className="space-y-6">
            <ImageUploader onImagesSelected={handleImagesSelected} />

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">PDF & ZIP Export</h3>
                <p className="text-xs text-slate-500">
                  Convert images to custom PDF documents or export original image files as a ordered ZIP archive.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">
                  <Archive className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Original Quality ZIP</h3>
                <p className="text-xs text-slate-500">
                  ZIP export keeps original uploaded files byte-for-byte without compression, resizing, or conversion.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">100% On-Device</h3>
                <p className="text-xs text-slate-500">
                  Files stay on your device. All processing happens entirely inside your web browser.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* View 4: Selected Images List & Options */
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
              <ImageUploader onImagesSelected={handleImagesSelected} isCompact />
              <button
                onClick={handleExport}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-sm sm:text-base rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                {exportMode === 'zip' ? <Archive className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>
                  {exportMode === 'zip'
                    ? `Export ZIP (${images.length})`
                    : `Create PDF (${images.length})`}
                </span>
              </button>
            </div>

            {/* Layout & Export Options Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              {/* Header with Export Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Export Options</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Export as:</span>
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
                /* PDF Options */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        PDF Document Name
                      </label>
                      <input
                        type="text"
                        value={pdfFilename}
                        onChange={(e) => setPdfFilename(e.target.value)}
                        placeholder="my-converted-pdf"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Page Sizing
                      </label>
                      <select
                        value={pageSize}
                        disabled
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-100 text-slate-600 cursor-not-allowed outline-hidden"
                      >
                        <option value="fit">Fit to Image</option>
                      </select>
                    </div>

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
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-3">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Image Output & Compression</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Format Selector */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Output Format
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['JPG', 'PNG'] as OutputFormat[]).map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => setOutputFormat(fmt)}
                              className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
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

                      {/* Quality Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-slate-600">
                            Image Quality
                          </label>
                          <span className="text-xs font-bold text-indigo-600">
                            {Math.round(quality * 100)}%
                          </span>
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

                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>80% (Smaller Size)</span>
                          <span>100% (Best Quality)</span>
                        </div>

                        {outputFormat === 'PNG' && (
                          <p className="text-[11px] text-indigo-600 mt-1">
                            PNG uses lossless format. Original crispness is retained.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ZIP Options */
                <div className="space-y-4">
                  <div className="max-w-xs">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ZIP Archive Name
                    </label>
                    <input
                      type="text"
                      value={zipFilename}
                      onChange={(e) => setZipFilename(e.target.value)}
                      placeholder="images"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-3">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ZIP Format & Quality</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Format Selector */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          ZIP Format
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['ORIGINAL', 'JPG', 'PNG', 'WEBP'] as ZipOutputFormat[]).map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => setZipOutputFormat(fmt)}
                              className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
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

                      {/* Quality Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-slate-600">
                            Image Quality
                          </label>
                          <span className="text-xs font-bold text-indigo-600">
                            {Math.round(quality * 100)}%
                          </span>
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

                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>80% (Smaller Size)</span>
                          <span>100% (Best Quality)</span>
                        </div>

                        {(zipOutputFormat === 'ORIGINAL' || zipOutputFormat === 'PNG') && (
                          <p className="text-[11px] text-indigo-600 mt-1">
                            {zipOutputFormat === 'ORIGINAL'
                              ? 'Original files will be archived byte-for-byte without recompressing.'
                              : 'PNG uses lossless format. Original crispness is retained.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      {zipOutputFormat === 'ORIGINAL' &&
                        'Original uploaded files will be archived byte-for-byte in your current preview order (01, 02, 03...) without any compression, resizing, or quality loss.'}
                      {zipOutputFormat === 'JPG' &&
                        `Images will be converted to JPG at ${Math.round(
                          quality * 100
                        )}% quality in sequential order (01.jpg, 02.jpg...).`}
                      {zipOutputFormat === 'PNG' &&
                        'Images will be converted to lossless PNG in sequential order (01.png, 02.png...).'}
                      {zipOutputFormat === 'WEBP' &&
                        `Images will be converted to WEBP at ${Math.round(
                          quality * 100
                        )}% quality in sequential order (01.webp, 02.webp...).`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Image List */}
            <ImageList
              images={images}
              onRemove={handleRemoveImage}
              onMove={handleMoveImage}
              onClearAll={handleClearAll}
            />
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
