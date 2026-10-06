# PDF Local Suite

A private, self-hosted, offline-first PDF utility suite. Designed to run locally on a personal computer or on a home server (such as a Raspberry Pi) so that sensitive documents never leave your local environment.

---

## 1. Features

The application combines client-side browser manipulation (for speed and zero server load) with a lightweight Node.js backend that bridges system-level CLI tools for advanced operations.

| Feature | Execution | Underlying Tech | Description |
| :--- | :--- | :--- | :--- |
| **Merge PDF** | 100% Client (Browser) | `pdf-lib`, `SortableJS` | Combine multiple PDF files into a single document with drag-and-drop reordering. |
| **Split / Extract** | 100% Client (Browser) | `PDF.js`, `pdf-lib` | Preview pages visually and extract specific page ranges or individual pages. |
| **Images to PDF** | 100% Client (Browser) | `pdf-lib`, `SortableJS` | Convert and order JPG and PNG images into a single PDF document. |
| **Organize PDF** | 100% Client (Browser) | `PDF.js`, `pdf-lib`, `SortableJS` | Visually reorder pages, rotate pages in 90-degree increments, or delete unwanted pages. |
| **Compress PDF** | Server (`POST /api/compress`) | `Ghostscript` (`gs`) | Reduce PDF file size with three quality presets (Low/Screen, Medium/eBook, High/Printer). |
| **PDF Vault** | Server (`POST /api/encrypt`, `/decrypt`) | `QPDF` (`qpdf`) | Lock PDF files with AES 256-bit password encryption or permanently remove an existing password. |

### Privacy and Security
* **Local Execution:** Client-side tools process files entirely in your browser memory. Server-side tools process files inside your local container or host machine.
* **Zero Data Retention:** Files sent to the local backend for compression or encryption are stored in the system temporary directory (`os.tmpdir()`) and are immediately deleted (`fs.unlink`) once the download completes or fails.

---

## 2. Quick Start with Docker (Recommended)

A pre-built multi-architecture Docker image (`linux/amd64` and `linux/arm64` for Raspberry Pi / Apple Silicon) is available on GitHub Container Registry.

### Option A: Single Command (No Repository Clone Needed)

**1. On-Demand Usage (Run and Close):**
Run this command anywhere in your terminal to download and start the application:

```bash
docker run --rm --name pdf-tools -p 3000:3000 ghcr.io/amnyzix/pdf-tools:latest

```

* Open `http://localhost:3000` in your browser.
* Press `Ctrl + C` in the terminal (or run `docker stop pdf-tools`) to stop and automatically remove the container.

**2. Permanent Self-Hosting (Background Service):**

```bash
docker run -d --name pdf-tools --restart unless-stopped -p 3000:3000 ghcr.io/amnyzix/pdf-tools:latest

```

* **Stop:** `docker stop pdf-tools`
* **Start:** `docker start pdf-tools`
* **Update:** `docker pull ghcr.io/amnyzix/pdf-tools:latest && docker stop pdf-tools && docker rm pdf-tools` (then run the `docker run` command again).

### Option B: Using the Included Docker Compose File

If you have cloned the repository (or downloaded the included `docker-compose.yml` file), you can manage the application directly with Docker Compose:

* **Start in the background:**
```bash
docker compose up -d

```


* **Stop the application:**
```bash
docker compose down

```


* **Update to the latest image (if pulling from registry):**
```bash
docker compose pull && docker compose up -d

```



---

## 3. Manual Installation (Without Docker)

If you want to run or modify the source code directly on your host machine:

### 1. Install System Dependencies

The Compress and Vault tools require `ghostscript` and `qpdf` installed on your operating system (Ubuntu / Debian / WSL / Raspberry Pi OS):

```bash
sudo apt update && sudo apt install ghostscript qpdf -y

```

### 2. Clone and Start the Server

```bash
git clone [https://github.com/amnyzix/pdf-tools.git](https://github.com/amnyzix/pdf-tools.git)
cd pdf-tools
npm install
node server.js

```

Open `http://localhost:3000` in your browser.

---

## 4. Project Architecture

```text
pdf-tools/
├── Dockerfile                 # Multi-arch image definition (Node 20 + gs + qpdf)
├── docker-compose.yml         # Docker Compose configuration
├── package.json
├── server.js                  # Express entry point
├── src/                       # Backend (Server-side processing)
│   ├── middleware/
│   │   └── upload.js          # Multer configuration (os.tmpdir())
│   ├── routes/
│   │   └── pdfRoutes.js       # API endpoints (/api/compress, /api/encrypt, /api/decrypt)
│   ├── controllers/
│   │   ├── compressController.js # Ghostscript execution
│   │   └── vaultController.js    # QPDF execution (encrypt & decrypt)
│   └── utils/
│       └── fileCleanup.js     # Automatic deletion of temporary files
└── public/                    # Frontend (Static files & ES6 Modules)
    ├── index.html             # Single-page layout & views
    ├── css/
    │   └── styles.css         # Custom animations and selection states
    └── js/
        ├── main.js            # Frontend entry point
        ├── core/
        │   ├── navigation.js  # View switching (data-view) & file input triggers (data-file-trigger)
        │   ├── dragAndDrop.js # Global Drag & Drop handler
        │   └── utils.js       # Shared helpers (downloadPdf, downloadBlob, formatBytes)
        └── features/          # Isolated modules for each PDF tool
            ├── merge.js
            ├── split.js
            ├── compress.js
            ├── img2pdf.js
            ├── organize.js
            └── vault.js

```

---

## 5. Adding a New Feature

1. **HTML View (`public/index.html`):**
* Add a navigation button with `data-view="<feature>"` inside `<nav>`.
* Add a card with `data-view="<feature>"` inside `<section id="view-home">`.
* Add a new `<section id="view-<feature>" class="hidden animate-fadeIn">` before `</main>`. Use `data-file-trigger="<inputId>"` on the upload area to link it to its hidden `<input type="file" id="<inputId>">`.


2. **Drag & Drop (`public/js/core/dragAndDrop.js`):**
* Add `<inputId>` to the `standardInputs` array inside `initDragAndDrop()`.


3. **Feature Module (`public/js/features/<feature>.js`):**
* Create the module and export an `init<Feature>()` function.
* Note: When combining `PDF.js` and `pdf-lib`, always pass a cloned buffer (`rawData.slice(0)`) to `pdfjsLib.getDocument()` so the Web Worker does not detach the original `ArrayBuffer`.


4. **Register Module (`public/js/main.js`):**
* Import and call `init<Feature>()` inside the `DOMContentLoaded` listener.


5. **Backend Route (Optional):**
* If server-side CLI processing is required, create a controller in `src/controllers/` using `execFile` and `cleanupFiles()`, then register the route in `src/routes/pdfRoutes.js`.
