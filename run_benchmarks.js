import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import jspdfModule from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { PNG } from 'pngjs';
import { execSync } from 'child_process';

const jsPDF = jspdfModule.jsPDF || jspdfModule;

const testDir = './test_assets';
const outDir = './benchmark_results';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function calculateTargetDimensions(origWidth, origHeight, maxDimension = 2400) {
  const maxOriginal = Math.max(origWidth, origHeight);
  if (maxOriginal <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }
  const scaleFactor = maxDimension / maxOriginal;
  return {
    width: Math.round(origWidth * scaleFactor),
    height: Math.round(origHeight * scaleFactor),
  };
}

// -------------------------------------------------------------
// PIPELINE A: Baseline jsPDF Pipeline
// -------------------------------------------------------------
async function runPipelineA(imagePaths, maxDimension = 2400) {
  const startTime = Date.now();
  let pdf = null;
  let totalProcessedImageBytes = 0;
  let pageCount = imagePaths.length;
  let firstPageDims = '';

  for (let i = 0; i < imagePaths.length; i++) {
    const imgPath = imagePaths[i];
    const img = await loadImage(imgPath);
    const origW = img.width;
    const origH = img.height;

    const targetDims = calculateTargetDimensions(origW, origH, maxDimension);
    const canvas = createCanvas(targetDims.width, targetDims.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetDims.width, targetDims.height);
    ctx.drawImage(img, 0, 0, targetDims.width, targetDims.height);

    const dataUrl = canvas.toDataURL('image/png');
    const base64Str = dataUrl.split(',')[1] || '';
    const imgBytes = Math.round((base64Str.length * 3) / 4);
    totalProcessedImageBytes += imgBytes;

    const baseWidthMm = 210;
    const imgAspect = targetDims.width / targetDims.height;
    const drawW = baseWidthMm;
    const drawH = drawW / imgAspect;
    const pageWidth = baseWidthMm;
    const pageHeight = drawH;
    const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';

    if (i === 0) {
      firstPageDims = `${pageWidth.toFixed(1)}mm x ${pageHeight.toFixed(1)}mm (${targetDims.width}x${targetDims.height}px)`;
      pdf = new jsPDF({ orientation, unit: 'mm', format: [pageWidth, pageHeight] });
    } else {
      pdf.addPage([pageWidth, pageHeight], orientation);
    }

    pdf.addImage(dataUrl, 'PNG', 0, 0, drawW, drawH, undefined, 'MEDIUM');
  }

  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
  const durationMs = Date.now() - startTime;

  return {
    pipeline: 'Pipeline A (jsPDF baseline)',
    pdfBuffer,
    pdfSize: pdfBuffer.length,
    processedImageBytes: totalProcessedImageBytes,
    pageCount,
    firstPageDims,
    durationMs,
  };
}

// -------------------------------------------------------------
// PIPELINE B: pdf-lib with Standard Canvas PNG
// -------------------------------------------------------------
async function runPipelineB(imagePaths, maxDimension = 2400) {
  const startTime = Date.now();
  const pdfDoc = await PDFDocument.create();
  let totalProcessedImageBytes = 0;
  let pageCount = imagePaths.length;
  let firstPageDims = '';

  for (let i = 0; i < imagePaths.length; i++) {
    const imgPath = imagePaths[i];
    const img = await loadImage(imgPath);
    const origW = img.width;
    const origH = img.height;

    const targetDims = calculateTargetDimensions(origW, origH, maxDimension);
    const canvas = createCanvas(targetDims.width, targetDims.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetDims.width, targetDims.height);
    ctx.drawImage(img, 0, 0, targetDims.width, targetDims.height);

    const pngBuffer = canvas.toBuffer('image/png');
    totalProcessedImageBytes += pngBuffer.length;

    const embeddedPng = await pdfDoc.embedPng(pngBuffer);
    const { width, height } = embeddedPng.scale(1);

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedPng, { x: 0, y: 0, width, height });

    if (i === 0) {
      firstPageDims = `${(width * 25.4 / 72).toFixed(1)}mm x ${(height * 25.4 / 72).toFixed(1)}mm (${targetDims.width}x${targetDims.height}px)`;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const durationMs = Date.now() - startTime;

  return {
    pipeline: 'Pipeline B (pdf-lib Canvas PNG)',
    pdfBuffer,
    pdfSize: pdfBuffer.length,
    processedImageBytes: totalProcessedImageBytes,
    pageCount,
    firstPageDims,
    durationMs,
  };
}

// -------------------------------------------------------------
// PIPELINE C: 8-bit Grayscale PNG + pdf-lib
// -------------------------------------------------------------
async function runPipelineC(imagePaths, maxDimension = 2400) {
  const startTime = Date.now();
  const pdfDoc = await PDFDocument.create();
  let totalProcessedImageBytes = 0;
  let pageCount = imagePaths.length;
  let firstPageDims = '';

  for (let i = 0; i < imagePaths.length; i++) {
    const imgPath = imagePaths[i];
    const img = await loadImage(imgPath);
    const origW = img.width;
    const origH = img.height;

    const targetDims = calculateTargetDimensions(origW, origH, maxDimension);
    const canvas = createCanvas(targetDims.width, targetDims.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetDims.width, targetDims.height);
    ctx.drawImage(img, 0, 0, targetDims.width, targetDims.height);

    const rawRgba = ctx.getImageData(0, 0, targetDims.width, targetDims.height).data;
    const png = new PNG({ width: targetDims.width, height: targetDims.height, colorType: 0 }); // colorType 0 = Grayscale
    for (let y = 0; y < targetDims.height; y++) {
      for (let x = 0; x < targetDims.width; x++) {
        const srcIdx = (y * targetDims.width + x) * 4;
        const dstIdx = y * targetDims.width + x;
        const r = rawRgba[srcIdx];
        const g = rawRgba[srcIdx + 1];
        const b = rawRgba[srcIdx + 2];
        png.data[dstIdx] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
    }

    const pngBuffer = PNG.sync.write(png, { deflateLevel: 9 });
    totalProcessedImageBytes += pngBuffer.length;

    const embeddedPng = await pdfDoc.embedPng(pngBuffer);
    const { width, height } = embeddedPng.scale(1);

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedPng, { x: 0, y: 0, width, height });

    if (i === 0) {
      firstPageDims = `${(width * 25.4 / 72).toFixed(1)}mm x ${(height * 25.4 / 72).toFixed(1)}mm (${targetDims.width}x${targetDims.height}px)`;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const durationMs = Date.now() - startTime;

  return {
    pipeline: 'Pipeline C (Grayscale 8-bit PNG + pdf-lib)',
    pdfBuffer,
    pdfSize: pdfBuffer.length,
    processedImageBytes: totalProcessedImageBytes,
    pageCount,
    firstPageDims,
    durationMs,
  };
}

// -------------------------------------------------------------
// MAIN BENCHMARK EXECUTION
// -------------------------------------------------------------
async function runAllBenchmarks() {
  const testCases = [
    { name: '1. Manga Line Art', files: [path.join(testDir, '01_manga_lineart.png')] },
    { name: '2. Screentone Manga', files: [path.join(testDir, '02_screentone_manga.png')] },
    { name: '3. Speech Bubble Text', files: [path.join(testDir, '03_speech_bubble_text.png')] },
    { name: '4. Color Webtoon', files: [path.join(testDir, '04_color_webtoon.png')] },
    {
      name: '5. Multi-page Document (5 pages)',
      files: [
        path.join(testDir, '05_multipage', 'page1.png'),
        path.join(testDir, '05_multipage', 'page2.png'),
        path.join(testDir, '05_multipage', 'page3.png'),
        path.join(testDir, '05_multipage', 'page4.png'),
        path.join(testDir, '05_multipage', 'page5.png'),
      ],
    },
  ];

  console.log('================================================================================');
  console.log('           BENCHMARK: PDF GENERATION PIPELINES FOR MANGA/MANHWA IMAGES           ');
  console.log('================================================================================\n');

  for (const tc of testCases) {
    console.log(`>>> TEST CASE: ${tc.name}`);
    let originalSizeBytes = 0;
    for (const f of tc.files) {
      originalSizeBytes += fs.statSync(f).size;
    }
    console.log(`Original Source Size: ${formatBytes(originalSizeBytes)} (${tc.files.length} file(s))`);

    const resA = await runPipelineA(tc.files);
    const resB = await runPipelineB(tc.files);
    const resC = await runPipelineC(tc.files);

    const safeName = tc.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    fs.writeFileSync(path.join(outDir, `${safeName}_pipelineA.pdf`), resA.pdfBuffer);
    fs.writeFileSync(path.join(outDir, `${safeName}_pipelineB.pdf`), resB.pdfBuffer);
    fs.writeFileSync(path.join(outDir, `${safeName}_pipelineC.pdf`), resC.pdfBuffer);

    console.log(`\nRESULTS FOR ${tc.name}:`);
    console.log(`| Pipeline                               | Processed Image Size | Final PDF Size | PDF vs Src % | Time (ms) | Page Dims |`);
    console.log(`|----------------------------------------|----------------------|----------------|--------------|-----------|-----------|`);

    for (const res of [resA, resB, resC]) {
      const pct = ((res.pdfSize / originalSizeBytes) * 100).toFixed(1) + '%';
      console.log(
        `| ${res.pipeline.padEnd(38)} | ${formatBytes(res.processedImageBytes).padEnd(20)} | ${formatBytes(res.pdfSize).padEnd(14)} | ${pct.padEnd(12)} | ${res.durationMs.toString().padEnd(9)} | ${res.firstPageDims} |`
      );
    }

    console.log('\n--- Structural PDF Stream Analysis ---');
    console.log('[Pipeline A Analysis]');
    execSync(`python3 /home/jules/self_created_tools/pdf_analyzer.py ${path.join(outDir, `${safeName}_pipelineA.pdf`)}`, { stdio: 'inherit' });
    console.log('[Pipeline B Analysis]');
    execSync(`python3 /home/jules/self_created_tools/pdf_analyzer.py ${path.join(outDir, `${safeName}_pipelineB.pdf`)}`, { stdio: 'inherit' });
    console.log('[Pipeline C Analysis]');
    execSync(`python3 /home/jules/self_created_tools/pdf_analyzer.py ${path.join(outDir, `${safeName}_pipelineC.pdf`)}`, { stdio: 'inherit' });

    console.log('--------------------------------------------------------------------------------\n');
  }
}

runAllBenchmarks().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
