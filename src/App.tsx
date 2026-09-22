import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ImageList } from './components/ImageList';
import { ProgressBar } from './components/ProgressBar';
import { PdfPreview } from './components/PdfPreview';
import type { GeneratedPdfResult, ImageItem, PdfOptions, ProcessingProgress } from './types';
import {
  optimizeSingleImage,
  readImageData,
} from './utils/imageOptimizer';
import { generatePdfFromImages } from './utils/pdfGenerator';
import { FileText, Sparkles, Sliders, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'letter'>('fit');
  const [margin, setMargin] = useState<number>(0);
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
      // Step 1: Optimize images
      const optimizedImages: ImageItem[] = [];
      for (let i = 0; i < totalCount; i++) {
        const item = images[i];
        setProgress({
          stage: 'optimizing',
          currentStep: i + 1,
          totalSteps: totalCount,
          message: `Optimizing image ${i + 1} of ${totalCount}...`,
        });

        const opt = await optimizeSingleImage(item.previewUrl, item.width, item.height);
        optimizedImages.push({
          ...item,
          optimizedDataUrl: opt.dataUrl,
          optimizedWidth: opt.width,
          optimizedHeight: opt.height,
          optimizedSize: opt.sizeBytes,
          status: 'done',
        });
      }

      // Step 2: Generate PDF
      setProgress({
        stage: 'generating',
        currentStep: 0,
        totalSteps: totalCount,
        message: 'Building optimized PDF file...',
      });

      const options: PdfOptions = {
        pageSize,
        margin,
        filename: pdfFilename || 'converted_images',
      };

      const result = await generatePdfFromImages(optimizedImages, options, (curr, tot) => {
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
                <h3 className="text-sm font-semibold text-slate-900">HD & Sharp Quality</h3>
                <p className="text-xs text-slate-500">
                  Balanced Canvas compression preserves image text readability and visual fidelity.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Auto Fitting</h3>
                <p className="text-xs text-slate-500">
                  Fits each image perfectly to PDF pages without cropping or distoring aspect ratios.
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

            {/* PDF Layout Options */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
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
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="fit">Auto Fit (Match Image Dimensions)</option>
                    <option value="a4">Standard A4 Page</option>
                    <option value="letter">US Letter Page</option>
                  </select>
                </div>

                {pageSize !== 'fit' && (
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
                )}
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
