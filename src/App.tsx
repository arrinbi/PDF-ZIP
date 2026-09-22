import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ImageList } from './components/ImageList';
import { ProgressBar } from './components/ProgressBar';
import { PdfPreview } from './components/PdfPreview';
import type { GeneratedPdfResult, ImageItem, OutputFormat, PdfOptions, ProcessingProgress } from './types';
import { readImageData } from './utils/imageOptimizer';
import { generatePdfFromImages } from './utils/pdfGenerator';
import { FileText, Sparkles, Sliders, Info, Image as ImageIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const pageSize = 'fit';
  const [margin, setMargin] = useState<number>(0);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('JPG');
  const [quality, setQuality] = useState<number>(0.85); // Default 85%
  const [pdfFilename, setPdfFilename] = useState<string>('converted_images');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'idle',
    currentStep: 0,
    totalSteps: 0,
    message: '',
  });
  const [pdfResult, setPdfResult] = useState<GeneratedPdfResult | null>(null);
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
    } catch (err: any) {
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
    setPdfResult(null);
    setErrorMessage(null);
  };

  const handleCreatePdf = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const totalCount = images.length;

    try {
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

      setPdfResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during PDF generation.');
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
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View 1: Generated PDF Result */}
        {pdfResult ? (
          <PdfPreview
            pdfResult={pdfResult}
            originalTotalSize={totalOriginalSizeBytes}
            onReset={() => setPdfResult(null)}
          />
        ) : isProcessing ? (
          /* View 2: Processing Progress */
          <ProgressBar progress={progress} />
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
                <h3 className="text-sm font-semibold text-slate-900">Custom Quality & Format</h3>
                <p className="text-xs text-slate-500">
                  Choose JPG, PNG, or WEBP output and fine-tune image quality without altering page layout.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Auto Fitting</h3>
                <p className="text-xs text-slate-500">
                  Fits each image perfectly to PDF pages without cropping or distorting aspect ratios.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">100% On-Device</h3>
                <p className="text-xs text-slate-500">
                  Files stay on your phone or PC. No server uploads required.
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
                onClick={handleCreatePdf}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-sm sm:text-base rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create PDF ({images.length})</span>
              </button>
            </div>

            {/* PDF Layout & Image Options */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>PDF Options</span>
              </div>

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
                    <div className="grid grid-cols-3 gap-2">
                      {(['JPG', 'PNG', 'WEBP'] as OutputFormat[]).map((fmt) => (
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
                      min="0.50"
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
                      <span>50% (Smaller Size)</span>
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

            {/* Image List */}
            <ImageList
              images={images}
              onRemove={handleRemoveImage}
              onMove={handleMoveImage}
              onClearAll={handleClearAll}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
