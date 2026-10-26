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
 * Ensures TensorFlow.js backend is set to WebGL if available,
 * falling back gracefully to the default backend if unsupported.
 */
/**
 * Detects maximum WebGL texture size supported by the hardware/browser.
 * Defaults to 4096 if WebGL context is not available.
 */
export function getWebGLMaxTextureSize(): number {
  try {
    if (typeof document === 'undefined') return 4096;
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (gl) {
      const maxSize = (gl as WebGLRenderingContext).getParameter(
        (gl as WebGLRenderingContext).MAX_TEXTURE_SIZE
      );
      if (typeof maxSize === 'number' && maxSize > 0) {
        return maxSize;
      }
    }
  } catch (e) {
    console.warn('Failed to query WebGL MAX_TEXTURE_SIZE:', e);
  }
  return 4096;
}

/**
 * Calculates a safe tile size (in input image pixels) so that internal
 * model WebGL tensor textures (e.g., concatenated feature maps up to 640 channels)
 * remain comfortably below the browser/GPU MAX_TEXTURE_SIZE limit with safety margin.
 *
 * Internal tensor texture dimension formula for ESRGAN:
 * max_dim = ceil(sqrt(channels / 4)) * tile_input_dimension
 * For 640 channels: ceil(sqrt(160)) * input_dim = 13 * input_dim (or 13 to 20x depending on packed layout).
 * For 288px input (256px tile + 32px overlap), 19 * 288 = 5472 (exceeding 4096!).
 * For 160px input (128px tile + 32px overlap), 20 * 160 = 3200 (well below 4096!).
 */
export function calculateSafeTileSize(
  maxTextureSize: number = 4096,
  overlap: number = 16
): number {
  // Conservative internal expansion factor per spatial dimension:
  // ESRGAN Concatenate layer with 640 channels packs up to ~20 tiles across texture.
  // We want max_input_dim * 20 <= maxTextureSize - safety_margin (500px).
  const safetyMargin = 500;
  const maxSafeInputDim = Math.floor((maxTextureSize - safetyMargin) / 20); // ~179px for 4096
  const safeTileSize = maxSafeInputDim - overlap * 2; // ~147px -> snap down to 128px

  if (safeTileSize < 64) return 64;
  if (safeTileSize >= 256 && maxTextureSize >= 8192) return 256;
  return Math.min(128, Math.max(64, safeTileSize));
}

export async function ensureTfBackend(): Promise<string> {
  try {
    if (tf.getBackend() !== 'webgl') {
      await tf.setBackend('webgl');
      await tf.ready();
    }
    return tf.getBackend();
  } catch (err) {
    console.warn('WebGL backend set failed, using available backend:', tf.getBackend(), err);
    return tf.getBackend() || 'cpu';
  }
}

/**
 * Constructs local static and CDN URLs for a given model and scale factor.
 */
function getModelUrls(
  scale: HdScaleFactor,
  modelName: 'esrgan-medium' | 'esrgan-slim'
): string[] {
  const baseUrl = import.meta.env?.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const localUrl = `${cleanBase}models/${modelName}/x${scale}/model.json`;
  const cdnUrl = `https://cdn.jsdelivr.net/npm/@upscalerjs/${modelName}@1.0.0/models/x${scale}/model.json`;
  return [localUrl, cdnUrl];
}

/**
 * Loads or returns pre-trained ESRGAN AI Super Resolution Model with timeout, warmup, and caching.
 * Prioritizes ESRGAN Medium (Residual Dense Network with 10 dense blocks) for high-detail manhwa upscale.
 */
async function loadOrGetAiModel(scale: HdScaleFactor): Promise<tf.LayersModel> {
  if (scale === 2 && cachedEsrgan2x) return cachedEsrgan2x;
  if (scale === 4 && cachedEsrgan4x) return cachedEsrgan4x;

  const candidates = [
    ...getModelUrls(scale, 'esrgan-medium'),
    ...getModelUrls(scale, 'esrgan-slim'),
  ];

  let model: tf.LayersModel | null = null;
  let lastError: any = null;

  for (const url of candidates) {
    try {
      const loadPromise = tf.loadLayersModel(url);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Pemuatan model AI timeout.')), 8000)
      );

      model = await Promise.race([loadPromise, timeoutPromise]);
      if (model) break;
    } catch (err) {
      lastError = err;
      console.warn(`Gagal memuat model AI dari ${url}:`, err);
    }
  }

  if (!model) {
    throw new Error(
      `Gagal memuat model AI Super Resolution (${lastError?.message || 'Network error'}). Pastikan perangkat mendukung WebGL.`
    );
  }

  // Pre-warm model execution to compile WebGL shaders upfront
  tf.engine().startScope();
  try {
    const dummy = tf.zeros([1, 16, 16, 3]);
    const warmupResult = model.predict(dummy) as tf.Tensor;
    if (warmupResult) {
      await warmupResult.data();
    }
  } catch (warmupErr) {
    console.warn('Model warmup warning:', warmupErr);
  } finally {
    tf.engine().endScope();
  }

  if (scale === 2) cachedEsrgan2x = model;
  else cachedEsrgan4x = model;

  return model;
}

/**
 * Yields execution to the main thread so browser DOM updates can render.
 */
async function yieldToMainThread(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

/**
 * Safely loads image from blob URL into HTMLImageElement.
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('Gagal memuat gambar. Pastikan file gambar tidak rusak.'));
    img.src = url;
  });
}

/**
 * Converts a canvas element to Blob with safe mime fallback.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to PNG if selected format blob failed
            canvas.toBlob(
              (pngBlob) => {
                if (pngBlob) resolve(pngBlob);
                else
                  reject(
                    new Error(
                      'Gagal mengompresi hasil gambar. Ukuran canvas mungkin terlalu besar.'
                    )
                  );
              },
              'image/png'
            );
          }
        },
        mimeType,
        quality
      );
    } catch (err) {
      reject(
        err instanceof Error
          ? err
          : new Error('Terjadi kesalahan saat memproses hasil canvas.')
      );
    }
  });
}

/**
 * Performs AI Super Resolution on a single image file or Blob using TensorFlow.js.
 * Uses overlapping tile stitching with optimal 256px tile size and 16px overlap context.
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

  const startTime = performance.now();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const originalPreviewUrl = URL.createObjectURL(file);

  let srcCanvas: HTMLCanvasElement | null = null;
  let dstCanvas: HTMLCanvasElement | null = null;
  let tileCanvas: HTMLCanvasElement | null = null;

  try {
    const activeBackend = await ensureTfBackend();
    const backendLabel = activeBackend.toLowerCase() === 'webgl' ? 'WebGL (GPU)' : activeBackend.toUpperCase();

    const img = await loadImageFromUrl(originalPreviewUrl);

    if (cancelSignal?.cancelled) {
      throw new Error('Pemrosesan dibatalkan oleh pengguna.');
    }

    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    if (!origW || !origH) {
      throw new Error('Dimensi gambar tidak valid.');
    }

    const scale = options.scaleFactor;
    const targetW = origW * scale;
    const targetH = origH * scale;

    onProgress?.(1, 100, `[${backendLabel}] Memuat model AI Super Resolution (ESRGAN)...`);
    await yieldToMainThread();

    const modelLoadStart = performance.now();

    // Create source canvas
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = origW;
    srcCanvas.height = origH;
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) {
      throw new Error('Gagal membuat context canvas 2D.');
    }
    srcCtx.drawImage(img, 0, 0);

    // Create destination canvas
    dstCanvas = document.createElement('canvas');
    dstCanvas.width = targetW;
    dstCanvas.height = targetH;
    const dstCtx = dstCanvas.getContext('2d');
    if (!dstCtx) {
      throw new Error('Gagal membuat context canvas tujuan.');
    }

    dstCtx.imageSmoothingEnabled = true;
    dstCtx.imageSmoothingQuality = 'high';

    // Tiling parameters: Safe tile size dynamically determined from WebGL MAX_TEXTURE_SIZE
    const maxTextureSize = activeBackend.toLowerCase() === 'webgl' ? getWebGLMaxTextureSize() : 8192;
    const overlap = 16;
    let tileSize = calculateSafeTileSize(maxTextureSize, overlap);
    let cols = Math.ceil(origW / tileSize);
    let rows = Math.ceil(origH / tileSize);
    let totalTiles = cols * rows;

    const aiModel = await loadOrGetAiModel(scale);

    const modelLoadDuration = performance.now() - modelLoadStart;

    const inferenceStart = performance.now();

    // Instantiate a single tile canvas instance and reuse it across iterations
    tileCanvas = document.createElement('canvas');

    const runTileInferenceLoop = async (
      currentTileSize: number,
      currentBackendLabel: string
    ): Promise<void> => {
      const cCols = Math.ceil(origW / currentTileSize);
      const cRows = Math.ceil(origH / currentTileSize);
      const cTotal = cCols * cRows;
      let count = 0;

      for (let r = 0; r < cRows; r++) {
        for (let c = 0; c < cCols; c++) {
          if (cancelSignal?.cancelled) {
            throw new Error('Pemrosesan dibatalkan oleh pengguna.');
          }

          count++;
          const pct = Math.min(95, Math.round((count / cTotal) * 90) + 5);
          onProgress?.(
            count,
            cTotal,
            `[${currentBackendLabel}] Memproses AI tile ${count} dari ${cTotal} (${pct}%)...`
          );
          await yieldToMainThread();

          // Tile source coordinates with overlap padding
          const sx = Math.max(0, c * currentTileSize - overlap);
          const sy = Math.max(0, r * currentTileSize - overlap);
          const sw = Math.min(origW - sx, currentTileSize + (c > 0 ? overlap : 0) + overlap);
          const sh = Math.min(origH - sy, currentTileSize + (r > 0 ? overlap : 0) + overlap);

          // Target region without overlap padding
          const targetX = c * currentTileSize;
          const targetY = r * currentTileSize;
          const targetWRegion = Math.min(currentTileSize, origW - targetX);
          const targetHRegion = Math.min(currentTileSize, origH - targetY);

          // Offset inside upscaled tile
          const cropLeft = (targetX - sx) * scale;
          const cropTop = (targetY - sy) * scale;

          tileCanvas!.width = sw * scale;
          tileCanvas!.height = sh * scale;

          tf.engine().startScope();
          try {
            const tileData = srcCtx.getImageData(sx, sy, sw, sh);
            const inputTensor = tf.browser
              .fromPixels(tileData)
              .expandDims(0)
              .toFloat()
              .div(255.0);

            const rawOutput = aiModel.predict(inputTensor) as tf.Tensor;

            let output3D: tf.Tensor3D;
            if (rawOutput.shape.length === 4 && rawOutput.shape[3] === 3 * scale * scale) {
              output3D = tf.depthToSpace(rawOutput as tf.Tensor4D, scale).clipByValue(0, 1).squeeze([0]) as tf.Tensor3D;
            } else if (rawOutput.shape.length === 4) {
              output3D = (rawOutput as tf.Tensor4D).clipByValue(0, 1).squeeze([0]) as tf.Tensor3D;
            } else {
              output3D = (rawOutput as tf.Tensor3D).clipByValue(0, 1) as tf.Tensor3D;
            }

            // Render neural tensor pixels to tile canvas
            await tf.browser.toPixels(output3D, tileCanvas!);

            // Draw seamless center crop region to destination canvas
            dstCtx.drawImage(
              tileCanvas!,
              cropLeft,
              cropTop,
              targetWRegion * scale,
              targetHRegion * scale,
              targetX * scale,
              targetY * scale,
              targetWRegion * scale,
              targetHRegion * scale
            );
          } catch (tileErr: any) {
            console.error(`Gagal AI inference tile ${count}:`, tileErr);
            throw tileErr;
          } finally {
            tf.engine().endScope();
          }
        }
      }
    };

    try {
      await runTileInferenceLoop(tileSize, backendLabel);
    } catch (firstErr: any) {
      // If WebGL texture size error occurs and CPU backend is supported, attempt fallback gracefully
      const isTextureError =
        firstErr?.message?.includes('greater than WebGL maximum') ||
        firstErr?.message?.includes('texture size') ||
        firstErr?.message?.includes('WebGL');

      if (isTextureError && tf.getBackend() === 'webgl') {
        console.warn('WebGL texture size exceeded during tile inference. Falling back to CPU backend...');
        try {
          await tf.setBackend('cpu');
          await tf.ready();
          // Reset destination canvas context
          dstCtx.clearRect(0, 0, targetW, targetH);
          await runTileInferenceLoop(tileSize, 'CPU (Fallback)');
        } catch (cpuErr: any) {
          throw new Error(
            `Gagal memproses AI tile: Ukuran tekstur melebihi batas WebGL (${maxTextureSize}px) dan CPU fallback gagal.`
          );
        }
      } else {
        throw new Error(
          `Gagal memproses AI tile: ${firstErr?.message || 'Memori GPU tidak mencukupi'}`
        );
      }
    }

    const inferenceDuration = performance.now() - inferenceStart;

    onProgress?.(totalTiles, totalTiles, `[${backendLabel}] Mengompresi dan membuat hasil HD...`);
    await yieldToMainThread();

    const compressStart = performance.now();

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

    const blob = await canvasToBlob(dstCanvas, mimeType, quality);
    const upscaledPreviewUrl = URL.createObjectURL(blob);

    const compressDuration = performance.now() - compressStart;
    const totalDuration = performance.now() - startTime;

    console.log(
      `[HD AI Upscale] Total: ${totalDuration.toFixed(0)}ms | Backend: ${backendLabel} | Model Load: ${modelLoadDuration.toFixed(0)}ms | Tile Inference (${totalTiles} tiles): ${inferenceDuration.toFixed(0)}ms (avg ${(inferenceDuration / Math.max(1, totalTiles)).toFixed(1)}ms/tile) | Compression: ${compressDuration.toFixed(0)}ms`
    );

    return {
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
    };
  } catch (err: any) {
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    if (srcCanvas) {
      srcCanvas.width = 0;
      srcCanvas.height = 0;
    }
    if (dstCanvas) {
      dstCanvas.width = 0;
      dstCanvas.height = 0;
    }
    if (tileCanvas) {
      tileCanvas.width = 0;
      tileCanvas.height = 0;
    }
  }
}
