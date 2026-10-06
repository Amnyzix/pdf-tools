import { downloadPdf } from '../core/utils.js';

export function initSplit() {
    let splitFile = null;
    let splitRawData = null;
    let selectedPages = new Set();
    let maxPages = 0;

    const splitInput = document.getElementById('splitInput');
    const splitWorkspace = document.getElementById('splitWorkspace');
    const splitUploadZone = document.getElementById('splitUploadZone');
    const splitFileInfo = document.getElementById('splitFileInfo');
    const previewColumn = document.getElementById('previewColumn');
    const pagesToExtractInput = document.getElementById('pagesToExtract');
    const selectedPagesCount = document.getElementById('selectedPagesCount');
    const btnSplitAction = document.getElementById('btnSplitAction');

    splitInput.addEventListener('change', async (e) => {
        if (e.target.files.length === 0) return;

        splitFile = e.target.files[0];
        splitRawData = await splitFile.arrayBuffer();

        splitUploadZone.classList.add('hidden');
        splitWorkspace.classList.remove('hidden');
        previewColumn.innerHTML = '<p class="text-center text-gray-500 mt-10">Generating previews...</p>';
        selectedPages.clear();
        pagesToExtractInput.value = '';

        // Clone buffer to prevent PDF.js worker from detaching the original ArrayBuffer
        const pdf = await pdfjsLib.getDocument(new Uint8Array(splitRawData.slice(0))).promise;
        maxPages = pdf.numPages;
        splitFileInfo.textContent = `File: ${splitFile.name} (${maxPages} pages)`;
        previewColumn.innerHTML = '';

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.8 });

            const pageDiv = document.createElement('div');
            pageDiv.className = 'relative bg-white border-4 border-transparent shadow-lg cursor-pointer hover:shadow-xl transition-all rounded-md overflow-hidden max-w-full';
            pageDiv.id = `page-preview-${i}`;

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.className = 'block';

            const checkDiv = document.createElement('div');
            checkDiv.className = 'check-icon hidden absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg';
            checkDiv.innerHTML = '<i data-lucide="check" class="w-6 h-6"></i>';

            const badge = document.createElement('div');
            badge.className = 'absolute bottom-0 w-full bg-black bg-opacity-70 text-white text-center text-sm py-2 font-semibold tracking-wide';
            badge.textContent = `PAGE ${i}`;

            pageDiv.appendChild(canvas);
            pageDiv.appendChild(checkDiv);
            pageDiv.appendChild(badge);
            previewColumn.appendChild(pageDiv);

            page.render({ canvasContext: canvas.getContext('2d'), viewport });

            pageDiv.addEventListener('click', () => {
                if (selectedPages.has(i)) selectedPages.delete(i);
                else selectedPages.add(i);

                updateVisualHighlights();
                updateTextInputFromSelection();
            });
        }
        lucide.createIcons();
    });

    pagesToExtractInput.addEventListener('input', () => {
        selectedPages = new Set(parsePageRange(pagesToExtractInput.value, maxPages));
        updateVisualHighlights();
    });

    function updateVisualHighlights() {
        for (let i = 1; i <= maxPages; i++) {
            const pageDiv = document.getElementById(`page-preview-${i}`);
            if (pageDiv) pageDiv.classList.toggle('page-selected', selectedPages.has(i));
        }

        const isEmpty = selectedPages.size === 0;
        selectedPagesCount.textContent = selectedPages.size;
        btnSplitAction.disabled = isEmpty;
        btnSplitAction.classList.toggle('opacity-50', isEmpty);
        btnSplitAction.classList.toggle('cursor-not-allowed', isEmpty);
    }

    function updateTextInputFromSelection() {
        if (selectedPages.size === 0) {
            pagesToExtractInput.value = '';
            return;
        }

        const pages = Array.from(selectedPages).sort((a, b) => a - b);
        const ranges = [];
        let start = pages[0];
        let end = pages[0];

        for (let i = 1; i < pages.length; i++) {
            if (pages[i] === end + 1) {
                end = pages[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = pages[i];
                end = pages[i];
            }
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        pagesToExtractInput.value = ranges.join(', ');
    }

    btnSplitAction.addEventListener('click', async () => {
        if (selectedPages.size === 0) return;

        try {
            btnSplitAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processing...';
            btnSplitAction.disabled = true;
            lucide.createIcons();

            const { PDFDocument } = PDFLib;
            const sourcePdf = await PDFDocument.load(splitRawData.slice(0));
            const newPdf = await PDFDocument.create();

            const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
            const copiedPages = await newPdf.copyPages(sourcePdf, sortedPages.map((p) => p - 1));
            copiedPages.forEach((p) => newPdf.addPage(p));

            downloadPdf(await newPdf.save(), `Extracted_${splitFile.name}`);
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            console.error(err);
            alert('An error occurred during extraction.');
        }
    });
}

function parsePageRange(input, max) {
    const pages = new Set();
    input.replace(/\s+/g, '').split(',').forEach((part) => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                if (i > 0 && i <= max) pages.add(i);
            }
        } else {
            const p = Number(part);
            if (p > 0 && p <= max) pages.add(p);
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
}