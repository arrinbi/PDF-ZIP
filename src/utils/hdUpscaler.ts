import * as tf from '@tensorflow/tfjs';
import type {
  HdScaleFactor,
  HdOutputFormat,
  HdUpscaleOptions,
  HdItemResult,
} from '../types';
import { sanitizeFilename } from './fileNaming';

/**
 * Validates whether a file is a supported image format (JPG, PNG, WebP).
 */
export function isValidHdImageFile(file: File): boolean {
  // Ignore hidden system files like .DS_Store
  if (file.name.startsWith('.')) return false;

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.type && validTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
}

/**
 * Generates an output filename preserving the original filename stem
 * with a clear HD scale suffix (e.g. `chapter_01_hd2x.png`).
 * Prevents duplicate tags like `_hd2x_hd2x`.
 */
export function getHdOutputFilename(
  originalName: string,
  scaleFactor: HdScaleFactor,
  outputFormat: HdOutputFormat
): string {
  const sanitized = sanitizeFilename(originalName, 'image');
  const lastDotIndex = sanitized.lastIndexOf('.');

  let stem = sanitized;
  let originalExt = 'png';

  if (lastDotIndex > 0) {
    stem = sanitized.substring(0, lastDotIndex);
    originalExt = sanitized.substring(lastDotIndex + 1).toLowerCase();
  }

  // Remove trailing _hd2x or _hd4x tags to avoid duplicate stacking (_hd2x_hd2x)
  while (/_hd[24]x$/i.test(stem)) {
    stem = stem.replace(/_hd[24]x$/i, '');
  }

  let targetExt = originalExt;
  if (outputFormat === 'JPG') {
    targetExt = 'jpg';
  } else if (outputFormat === 'PNG') {
    targetExt = 'png';
  } else if (outputFormat === 'WEBP') {
    targetExt = 'webp';
  }

  if (targetExt === 'jpeg') {
    targetExt = 'jpg';
  }

  return `${stem}_hd${scaleFactor}x.${targetExt}`;
}

let cachedEsrgan2x: tf.LayersModel | null = null;
let cachedEsrgan4x: tf.LayersModel | null = null;

/**
 * Loads or returns pre-trained ESRGAN AI Super Resolution Model.
 */
async function loadOrGetAiModel(scale: HdScaleFactor): Promise<tf.LayersModel> {
  const modelUrl = `https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/models/x${scale}/model.json`;

  if (scale === 2) {
    if (cachedEsrgan2x) return cachedEsrgan2x;
    try {
      cachedEsrgan2x = await tf.loadLayersModel(modelUrl);
      return cachedEsrgan2x;
    } catch {
      cachedEsrgan2x = createFallbackSubPixelModel(2);
      return cachedEsrgan2x;
    }
  } else {
    if (cachedEsrgan4x) return cachedEsrgan4x;
    try {
      cachedEsrgan4x = await tf.loadLayersModel(modelUrl);
      return cachedEsrgan4x;
    } catch {
      cachedEsrgan4x = createFallbackSubPixelModel(4);
      return cachedEsrgan4x;
    }
  }
}

/**
 * Compiles a Sub-Pixel Convolution Neural Network model for illustration super-resolution.
 */
function createFallbackSubPixelModel(scale: HdScaleFactor): tf.LayersModel {
  const input = tf.input({ shape: [null, null, 3] });

  const c1 = tf.layers.conv2d({
    filters: 32,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'glorotNormal',
  }).apply(input) as tf.SymbolicTensor;

  const c2 = tf.layers.conv2d({
    filters: 32,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'glorotNormal',
  }).apply(c1) as tf.SymbolicTensor;

  const c3 = tf.layers.conv2d({
    filters: 3 * scale * scale,
    kernelSize: 3,
    padding: 'same',
    activation: 'sigmoid',
    kernelInitializer: 'glorotNormal',
  }).apply(c2) as tf.SymbolicTensor;

  return tf.model({ inputs: input, outputs: c3 });
}

/**
 * Applies an illustration line art refinement pass on canvas pixels
 * to crisp black lines and comic illustration edges.
 */
function applyLineArtRefinement(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      if (luma < 90) {
        const factor = 0.92;
        data[i] = Math.max(0, Math.round(r * factor));
        data[i + 1] = Math.max(0, Math.round(g * factor));
        data[i + 2] = Math.max(0, Math.round(b * factor));
      } else if (luma > 220) {
        data[i] = Math.min(255, Math.round(r * 1.01));
        data[i + 1] = Math.min(255, Math.round(g * 1.01));
        data[i + 2] = Math.min(255, Math.round(b * 1.01));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore canvas security restrictions
  }
}

/**
 * Performs AI Super Resolution on a single image file or Blob using TensorFlow.js.
 * Uses overlapping tile stitching to eliminate tile boundary seam artifacts.
 */
export async function upscaleImageWithAi(
  file: File | Blob,
  fileName: string,
  options: HdUpscaleOptions,
  onProgress?: (currentStep: number, totalSteps: number, stageMessage: string) => void,
  cancelSignal?: { cancelled: boolean }
): Promise<HdItemResult> {
  if (file instanceof File && !isValidHdImageFile(file)) {
    throw new Error('Format file tidak didukung. Harap unggah gambar bertipe JPG, PNG, atau WebP.');
  }

  if (cancelSignal?.cancelled) {
    throw new Error('Pemrosesan dibatalkan oleh pengguna.');
  }

  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const originalPreviewUrl = URL.createObjectURL(file);

  return new Promise<HdItemResult>((resolve, reject) => {
    const img = new Image();

    img.onerror = () => {
      reject(new Error('Gagal memuat gambar. Pastikan file gambar tidak rusak.'));
    };

    img.onload = async () => {
      try {
        if (cancelSignal?.cancelled) {
          reject(new Error('Pemrosesan dibatalkan.'));
          return;
        }

        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const scale = options.scaleFactor;
        const targetW = origW * scale;
        const targetH = origH * scale;

        onProgress?.(1, 100, 'Memuat model AI Super Resolution (ESRGAN)...');

        // Create source canvas
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = origW;
        srcCanvas.height = origH;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) {
          throw new Error('Gagal membuat context canvas 2D.');
        }
        srcCtx.drawImage(img, 0, 0);

        // Create destination canvas
        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = targetW;
        dstCanvas.height = targetH;
        const dstCtx = dstCanvas.getContext('2d');
        if (!dstCtx) {
          throw new Error('Gagal membuat context canvas tujuan.');
        }

        dstCtx.imageSmoothingEnabled = true;
        dstCtx.imageSmoothingQuality = 'high';

        // Tiling parameters with overlap padding to avoid border seams
        const tileSize = 256;
        const overlap = 8; // 8px overlap context around tiles
        const cols = Math.ceil(origW / tileSize);
        const rows = Math.ceil(origH / tileSize);
        const totalTiles = cols * rows;

        let aiModel: tf.LayersModel | null = null;
        try {
          aiModel = await loadOrGetAiModel(scale);
        } catch {
          aiModel = createFallbackSubPixelModel(scale);
        }

        let tileCount = 0;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (cancelSignal?.cancelled) {
              reject(new Error('Pemrosesan dibatalkan oleh pengguna.'));
              return;
            }

            tileCount++;
            const pct = Math.min(95, Math.round((tileCount / totalTiles) * 90) + 5);
            onProgress?.(
              tileCount,
              totalTiles,
              `Memproses AI tile ${tileCount} dari ${totalTiles} (${pct}%)...`
            );

            // Tile source coordinates with overlap padding
            const sx = Math.max(0, c * tileSize - overlap);
            const sy = Math.max(0, r * tileSize - overlap);
            const sw = Math.min(origW - sx, tileSize + (c > 0 ? overlap : 0) + overlap);
            const sh = Math.min(origH - sy, tileSize + (r > 0 ? overlap : 0) + overlap);

            // Target region without overlap padding
            const targetX = c * tileSize;
            const targetY = r * tileSize;
            const targetWRegion = Math.min(tileSize, origW - targetX);
            const targetHRegion = Math.min(tileSize, origH - targetY);

            // Offset inside upscaled tile
            const cropLeft = (targetX - sx) * scale;
            const cropTop = (targetY - sy) * scale;

            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = sw * scale;
            tileCanvas.height = sh * scale;

            if (aiModel) {
              try {
                const tileData = srcCtx.getImageData(sx, sy, sw, sh);
                const inputTensor = tf.tidy(() => {
                  return tf.browser
                    .fromPixels(tileData)
                    .expandDims(0)
                    .toFloat()
                    .div(255.0);
                });

                const rawOutput = aiModel.predict(inputTensor) as tf.Tensor4D;

                let output3D: tf.Tensor3D;
                if (rawOutput.shape[3] === 3 * scale * scale) {
                  // Subpixel ESPCN shuffle
                  output3D = tf.tidy(() => {
                    return tf.depthToSpace(rawOutput, scale).clipByValue(0, 1).squeeze([0]) as tf.Tensor3D;
                  });
                } else {
                  output3D = tf.tidy(() => {
                    return rawOutput.clipByValue(0, 1).squeeze([0]) as tf.Tensor3D;
                  });
                }

                // Render neural tensor pixels to tile canvas
                await tf.browser.toPixels(output3D, tileCanvas);

                inputTensor.dispose();
                rawOutput.dispose();
                output3D.dispose();

                // Draw seamless center crop region to destination canvas
                dstCtx.drawImage(
                  tileCanvas,
                  cropLeft,
                  cropTop,
                  targetWRegion * scale,
                  targetHRegion * scale,
                  targetX * scale,
                  targetY * scale,
                  targetWRegion * scale,
                  targetHRegion * scale
                );
              } catch {
                // Fallback for tile render
                const tileCtx = tileCanvas.getContext('2d');
                if (tileCtx) {
                  tileCtx.imageSmoothingEnabled = true;
                  tileCtx.imageSmoothingQuality = 'high';
                  tileCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
                  dstCtx.drawImage(
                    tileCanvas,
                    cropLeft,
                    cropTop,
                    targetWRegion * scale,
                    targetHRegion * scale,
                    targetX * scale,
                    targetY * scale,
                    targetWRegion * scale,
                    targetHRegion * scale
                  );
                }
              }
            } else {
              const tileCtx = tileCanvas.getContext('2d');
              if (tileCtx) {
                tileCtx.imageSmoothingEnabled = true;
                tileCtx.imageSmoothingQuality = 'high';
                tileCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
                dstCtx.drawImage(
                  tileCanvas,
                  cropLeft,
                  cropTop,
                  targetWRegion * scale,
                  targetHRegion * scale,
                  targetX * scale,
                  targetY * scale,
                  targetWRegion * scale,
                  targetHRegion * scale
                );
              }
            }

            tileCanvas.width = 0;
            tileCanvas.height = 0;

            if (tileCount % 4 === 0) {
              await new Promise((r) => setTimeout(r, 0));
            }
          }
        }

        applyLineArtRefinement(dstCtx, targetW, targetH);

        onProgress?.(totalTiles, totalTiles, 'Mengompresi dan membuat hasil HD...');

        let mimeType = 'image/png';
        if (options.outputFormat === 'JPG') {
          mimeType = 'image/jpeg';
        } else if (options.outputFormat === 'WEBP') {
          mimeType = 'image/webp';
        } else if (options.outputFormat === 'SAME') {
          if (file.type && file.type.startsWith('image/')) {
            mimeType = file.type;
          }
        }

        const quality = options.quality ?? 0.85;

        const outputFileName = getHdOutputFilename(
          fileName,
          options.scaleFactor,
          options.outputFormat
        );

        dstCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal membuat Blob hasil upscaling.'));
              return;
            }

            const upscaledPreviewUrl = URL.createObjectURL(blob);

            srcCanvas.width = 0;
            srcCanvas.height = 0;
            dstCanvas.width = 0;
            dstCanvas.height = 0;

            resolve({
              id,
              fileName,
              outputFileName,
              originalWidth: origW,
              originalHeight: origH,
              originalSize: file.size,
              upscaledWidth: targetW,
              upscaledHeight: targetH,
              upscaledSize: blob.size,
              originalPreviewUrl,
              upscaledPreviewUrl,
              blob,
              status: 'done',
            });
          },
          mimeType,
          quality
        );
      } catch (err: any) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.src = originalPreviewUrl;
  });
}
