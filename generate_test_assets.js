import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const outDir = './test_assets';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function generateMangaLineArt(w, h) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Black frame
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Panel dividers
  ctx.beginPath();
  ctx.moveTo(20, h * 0.35); ctx.lineTo(w - 20, h * 0.35);
  ctx.moveTo(w * 0.5, h * 0.35); ctx.lineTo(w * 0.5, h - 20);
  ctx.stroke();

  // Line art drawing elements
  ctx.lineWidth = 3;
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.arc(w * 0.25 + (i * 7) % 200, h * 0.15 + (i * 11) % 200, 30 + i * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Speed lines
  ctx.lineWidth = 2;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h * 0.18);
    ctx.lineTo(w * 0.25 + Math.cos(angle) * 300, h * 0.18 + Math.sin(angle) * 300);
    ctx.stroke();
  }

  // Speech bubble
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(w * 0.7, h * 0.15, 150, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MANGA LINE ART TEST', w * 0.7, h * 0.15);

  return canvas.toBuffer('image/png');
}

function generateScreentoneManga(w, h) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Screentone halftone dot patterns
  ctx.fillStyle = '#111111';
  const dotSpacing = 8;
  for (let y = 0; y < h; y += dotSpacing) {
    for (let x = 0; x < w; x += dotSpacing) {
      if (((x / dotSpacing) + (y / dotSpacing)) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Panels over screentone
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(50, 50, w - 100, h * 0.4);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.strokeRect(50, 50, w - 100, h * 0.4);

  // Character contour
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.25, 200, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.stroke();

  // Fine screentone gradient panel
  for (let y = Math.floor(h * 0.5); y < h - 50; y += 6) {
    const density = (y - h * 0.5) / (h * 0.5);
    for (let x = 50; x < w - 50; x += 6) {
      if (Math.random() < density) {
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }

  return canvas.toBuffer('image/png');
}

function generateSpeechBubbleText(w, h) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Multiple speech bubbles with small text
  for (let b = 0; b < 6; b++) {
    const bx = 100 + (b % 2) * (w / 2);
    const by = 100 + Math.floor(b / 2) * (h / 3);
    const bw = w / 2 - 150;
    const bh = h / 3 - 150;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 30);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Bubble #${b + 1} Speech text line 1: Hello World!`, bx + 20, by + 40);
    ctx.fillText(`Small text line 2: Crisp font details, reading dialog test.`, bx + 20, by + 70);
    ctx.fillText(`Line 3: 1234567890 !@#$%^&*()_+-=[]{}|;':",./<>?`, bx + 20, by + 100);
  }

  return canvas.toBuffer('image/png');
}

function generateColorWebtoon(w, h) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Gradient background webtoon style
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(0.3, '#16213e');
  grad.addColorStop(0.7, '#0f3460');
  grad.addColorStop(1, '#e94560');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Webtoon panel content
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('COLOR WEBTOON CHAPTER 1', w / 2, 100);

  // Panels
  ctx.fillStyle = '#ffde59';
  ctx.fillRect(100, 200, w - 200, 600);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(100, 200, w - 200, 600);

  ctx.fillStyle = '#ff914d';
  ctx.beginPath();
  ctx.arc(w / 2, 1200, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7ed957';
  ctx.fillRect(100, 1800, w - 200, 800);

  return canvas.toBuffer('image/png');
}

console.log('Generating test images...');

fs.writeFileSync(path.join(outDir, '01_manga_lineart.png'), generateMangaLineArt(1800, 2700));
fs.writeFileSync(path.join(outDir, '02_screentone_manga.png'), generateScreentoneManga(2800, 4200));
fs.writeFileSync(path.join(outDir, '03_speech_bubble_text.png'), generateSpeechBubbleText(1600, 2400));
fs.writeFileSync(path.join(outDir, '04_color_webtoon.png'), generateColorWebtoon(1200, 3600));

const multiDir = path.join(outDir, '05_multipage');
if (!fs.existsSync(multiDir)) fs.mkdirSync(multiDir, { recursive: true });

fs.writeFileSync(path.join(multiDir, 'page1.png'), generateMangaLineArt(1800, 2700));
fs.writeFileSync(path.join(multiDir, 'page2.png'), generateScreentoneManga(2800, 4200));
fs.writeFileSync(path.join(multiDir, 'page3.png'), generateSpeechBubbleText(1600, 2400));
fs.writeFileSync(path.join(multiDir, 'page4.png'), generateColorWebtoon(1200, 3600));
fs.writeFileSync(path.join(multiDir, 'page5.png'), generateMangaLineArt(2000, 3000));

console.log('Test images generated successfully in ./test_assets');
