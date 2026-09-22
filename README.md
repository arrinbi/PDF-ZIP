# Mobile-Friendly Image to PDF Web App

An optimized, mobile-first web application that converts multiple images (JPG, JPEG, PNG, WEBP) directly into a single compressed PDF file completely inside the user's browser.

## Features

- **Multi-Image Selection**: Select or drag & drop multiple JPG, JPEG, PNG, or WEBP files.
- **Thumbnail Management & Reordering**: Reorder pages easily with move controls or delete individual pages before generating.
- **Client-Side Optimization**: Automatically compresses images using a balanced HTML5 Canvas strategy (~0.82 JPEG quality, max 2400px dimension) to ensure sharp text readability and small PDF file size.
- **Auto-Fit PDF Rendering**: Automatically fits each image to PDF page dimensions preserving exact original aspect ratios without cropping.
- **100% Privacy & Security**: Processes files entirely on device using browser APIs. No images or files are uploaded to any external server.
- **Mobile-First Responsive Design**: Optimized UI built with Tailwind CSS v4 and Lucide Icons, works seamlessly on Android mobile browsers and desktop displays.
- **PDF File Size & Direct Download**: Displays final generated PDF size with a one-click download button and browser preview option.

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **PDF Generation**: jsPDF
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library + Playwright

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Running Tests

Run unit tests with Vitest:

```bash
npx vitest run
```

### Production Build

To compile and bundle the application for production deployment:

```bash
npm run build
```

The output artifacts will be created in the `dist/` directory.

To preview the built app locally:

```bash
npm run preview
```

## Architecture & Balanced Compression Strategy

1. **Image Ingestion**: Images selected via file picker or drag-and-drop are loaded into `FileReader` data URLs without server network requests.
2. **Balanced Optimization (`src/utils/imageOptimizer.ts`)**:
   - Caps max dimension to 2400px while maintaining original aspect ratios.
   - Encodes via HTML Canvas to JPEG format at ~0.82 quality setting.
   - Converts transparent PNG/WEBP backgrounds cleanly to white `#FFFFFF`.
   - Results in crisp document text and ~50–80% smaller file size before PDF construction.
3. **PDF Generation (`src/utils/pdfGenerator.ts`)**:
   - Constructs `jsPDF` instance locally.
   - Dynamically calculates page width/height to fit images without stretching, distortion, or cropping.
