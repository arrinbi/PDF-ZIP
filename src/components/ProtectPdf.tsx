import React, { useState, useRef } from 'react';
import {
  FileText,
  Lock,
  Eye,
  EyeOff,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ProtectPdfResult } from '../types';
import { getPdfPageCount } from '../utils/pdfSplitter';
import { protectPdfWithPassword } from '../utils/pdfProtector';

export interface ProtectPdfItem {
  id: string;
  file: File;
  pageCount: number;
  password: string;
  confirmPassword: string;
  outputFilename: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  result?: ProtectPdfResult;
}

export const ProtectPdf: React.FC = () => {
  const [items, setItems] = useState<ProtectPdfItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isProcessed, setIsProcessed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilesSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (fileArray.length === 0) {
      setErrorMessage('Please select valid PDF file(s).');
      return;
    }

    setErrorMessage(null);
    setIsLoadingFiles(true);

    try {
      const newItems: ProtectPdfItem[] = [];
      for (const file of fileArray) {
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        let count = 0;
        try {
          count = await getPdfPageCount(file);
        } catch {
          count = 1;
        }
        const cleanName = file.name.replace(/\.pdf$/i, '');
        newItems.push({
          id,
          file,
          pageCount: count,
          password: '',
          confirmPassword: '',
          outputFilename: `${cleanName}_protected`,
          status: 'idle',
        });
      }

      setItems((prev) => [...prev, ...newItems]);
      setIsProcessed(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to load PDF file(s). Ensure files are valid and not password-protected.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemPasswordChange = (id: string, val: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, password: val, errorMessage: undefined, status: 'idle' }
          : item
      )
    );
  };

  const handleItemConfirmPasswordChange = (id: string, val: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, confirmPassword: val, errorMessage: undefined, status: 'idle' }
          : item
      )
    );
  };

  const handleItemOutputFilenameChange = (id: string, val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, outputFilename: val } : item))
    );
  };

  const triggerDownload = (url: string, filename: string) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    const successfulItems = items.filter((item) => item.status === 'success' && item.result);
    successfulItems.forEach((item, index) => {
      setTimeout(() => {
        triggerDownload(item.result!.url, item.result!.filename);
      }, index * 250);
    });
  };

  const handleProtectAll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setErrorMessage('Please upload at least one PDF file.');
      return;
    }

    // Step 1: Validate each item
    let hasValidationError = false;
    const updatedItems = items.map((item) => {
      const pwd = item.password.trim();
      const confirmPwd = item.confirmPassword.trim();

      if (!pwd) {
        hasValidationError = true;
        return {
          ...item,
          status: 'error' as const,
          errorMessage: 'Password cannot be empty.',
        };
      }
      if (!confirmPwd) {
        hasValidationError = true;
        return {
          ...item,
          status: 'error' as const,
          errorMessage: 'Please confirm the password.',
        };
      }
      if (item.password !== item.confirmPassword) {
        hasValidationError = true;
        return {
          ...item,
          status: 'error' as const,
          errorMessage: 'Passwords do not match.',
        };
      }

      return {
        ...item,
        status: 'idle' as const,
        errorMessage: undefined,
      };
    });

    setItems(updatedItems);

    if (hasValidationError) {
      setErrorMessage('Validation failed for one or more files. Please review password settings.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Step 2: Process validated files independently
    const finalItems: ProtectPdfItem[] = [...updatedItems];

    for (let i = 0; i < finalItems.length; i++) {
      const item = finalItems[i];
      finalItems[i] = { ...item, status: 'processing' };
      setItems([...finalItems]);

      try {
        const result = await protectPdfWithPassword(
          item.file,
          item.password,
          item.outputFilename || 'protected_document'
        );
        finalItems[i] = {
          ...item,
          status: 'success',
          result,
        };
      } catch (err: any) {
        console.error(err);
        finalItems[i] = {
          ...item,
          status: 'error',
          errorMessage: err.message || 'Failed to apply password protection.',
        };
      }
      setItems([...finalItems]);
    }

    setIsProcessing(false);
    setIsProcessed(true);
  };

  const handleReset = () => {
    setItems([]);
    setShowPassword(false);
    setIsProcessed(false);
    setErrorMessage(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const successfulCount = items.filter((item) => item.status === 'success').length;
  const errorCount = items.filter((item) => item.status === 'error').length;

  return (
    <div className="space-y-6">
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
        accept="application/pdf,.pdf"
        multiple
        onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
        className="hidden"
      />
      <input
        ref={addMoreInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
        className="hidden"
      />

      {/* View 1: Result State after Processing */}
      {isProcessed && !isProcessing ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  PDF Protection Complete!
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Processed {items.length} file{items.length === 1 ? '' : 's'} (
                  <span className="font-semibold text-emerald-600">
                    {successfulCount} protected
                  </span>
                  {errorCount > 0 ? `, ${errorCount} failed` : ''})
                </p>
              </div>
            </div>

            {successfulCount > 1 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download All ({successfulCount})</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between border rounded-2xl p-4 text-sm transition-all ${
                  item.status === 'success'
                    ? 'bg-slate-50/60 border-slate-200/90 hover:bg-slate-50'
                    : 'bg-red-50/50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.status === 'success'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {item.result?.filename || item.outputFilename || item.file.name}
                    </p>
                    {item.status === 'success' && item.result ? (
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-emerald-600">Encrypted PDF ready</span>
                        <span>•</span>
                        <span>{formatBytes(item.result.sizeBytes)}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-red-600 font-semibold mt-0.5">
                        {item.errorMessage || 'Failed to protect PDF.'}
                      </p>
                    )}
                  </div>
                </div>

                {item.status === 'success' && item.result && (
                  <button
                    type="button"
                    onClick={() => triggerDownload(item.result!.url, item.result!.filename)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProcessed(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Back to Selection</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              Protect New PDFs
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        /* View 2: Empty Dropzone State */
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
            {isLoadingFiles ? (
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
            {isLoadingFiles ? 'Loading PDF Document(s)...' : 'Upload PDF Files to Protect'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Drag & drop one or multiple PDF documents here, or click to browse from your device.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Local Encryption • Never Sent to External Servers</span>
          </div>
        </div>
      ) : (
        /* View 3: Multi-File Selection & Independent Password Configuration Form */
        <form onSubmit={handleProtectAll} className="space-y-6 max-w-4xl mx-auto">
          {/* Header Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Selected PDF Files ({items.length})
              </h3>
              <p className="text-xs text-slate-500">
                Set an independent password and output name for each PDF file.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                className="py-2 px-3 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More PDFs</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-2 px-3 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`bg-white border rounded-3xl p-5 space-y-4 shadow-2xs transition-all ${
                  item.errorMessage ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                }`}
              >
                {/* File Title Bar */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {index + 1}. {item.file.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatBytes(item.file.size)} • {item.pageCount} page
                        {item.pageCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* File Validation Error Message */}
                {item.errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{item.errorMessage}</span>
                  </div>
                )}

                {/* Per-file Password & Filename Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={item.password}
                        onChange={(e) => handleItemPasswordChange(item.id, e.target.value)}
                        placeholder="Enter password"
                        className="w-full px-3.5 py-2 pr-9 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white text-slate-900 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? 'Hide passwords' : 'Show passwords'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={item.confirmPassword}
                        onChange={(e) => handleItemConfirmPasswordChange(item.id, e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-3.5 py-2 pr-9 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white text-slate-900 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? 'Hide passwords' : 'Show passwords'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Output Filename
                    </label>
                    <input
                      type="text"
                      value={item.outputFilename}
                      onChange={(e) => handleItemOutputFilenameChange(item.id, e.target.value)}
                      placeholder="protected_document"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white text-slate-900 font-medium"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>
                {isProcessing
                  ? 'Encrypting PDFs...'
                  : `Protect ${items.length} PDF${items.length === 1 ? '' : 's'}`}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
