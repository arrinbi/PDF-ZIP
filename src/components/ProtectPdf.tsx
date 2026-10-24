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
} from 'lucide-react';
import type { ProtectPdfResult } from '../types';
import { getPdfPageCount } from '../utils/pdfSplitter';
import { protectPdfWithPassword } from '../utils/pdfProtector';

export const ProtectPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [protectResult, setProtectResult] = useState<ProtectPdfResult | null>(null);
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
    setProtectResult(null);

    try {
      const count = await getPdfPageCount(file);
      setSelectedFile(file);
      setPageCount(count);

      const cleanName = file.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_protected`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to load PDF file. Ensure the file is valid and not already protected.');
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

  const handleProtect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMessage('Please upload a PDF file first.');
      return;
    }

    if (!password || password.trim().length === 0) {
      setErrorMessage('Password cannot be empty.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await protectPdfWithPassword(
        selectedFile,
        password,
        outputFilename || 'protected_document'
      );
      setProtectResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to apply password protection to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPageCount(0);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setOutputFilename('');
    setProtectResult(null);
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
    <div className="space-y-5">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
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

      {/* Result State */}
      {protectResult ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">PDF Protected Successfully!</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Your PDF is encrypted locally and requires a password to open in any standard PDF reader.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            <a
              href={protectResult.url}
              download={protectResult.filename}
              className="w-full py-2.5 px-5 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Protected PDF ({formatBytes(protectResult.sizeBytes)})</span>
            </a>
          </div>

          <div className="pt-2">
            <button
              onClick={handleReset}
              className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Protect Another PDF</span>
            </button>
          </div>
        </div>
      ) : !selectedFile ? (
        /* Dropzone State */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer shadow-2xs ${
            isDragOver
              ? 'border-slate-400 bg-slate-50/80'
              : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
            {isLoadingFile ? (
              <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {isLoadingFile ? 'Loading PDF Document...' : 'Upload PDF File to Protect'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Drag & drop a PDF document here, or click to browse from your device.
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>100% Local Encryption • Never Sent to External Servers</span>
          </div>
        </div>
      ) : (
        /* Password Form State */
        <form onSubmit={handleProtect} className="space-y-5">
          {/* File Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {formatBytes(selectedFile.size)} • {pageCount} page{pageCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="py-1.5 px-3 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Change File
            </button>
          </div>

          {/* Password Settings Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700" />
                <span>Password Protection Settings</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full px-3 py-1.5 pr-9 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-400 outline-hidden bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="w-full px-3 py-1.5 pr-9 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-400 outline-hidden bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Output Filename
              </label>
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="protected_document"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-400 outline-hidden bg-slate-50/50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="py-2.5 px-5 bg-slate-800 hover:bg-slate-900 active:scale-98 disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Encrypting PDF...' : 'Protect PDF'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
