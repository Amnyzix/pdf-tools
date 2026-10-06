// --- NAVIGATION ---
function showView(viewName) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
}

// --- DOWNLOAD UTILITY ---
function downloadPdf(bytes, name) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    
    // Simulate a click to trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clear memory
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}


// --- GLOBAL DRAG & DROP SETUP ---
function initDragAndDrop() {
    // 1. Select the 4 dotted-zone inputs
    const fileInputs = ['mergeInput', 'splitInput', 'compressInput', 'imgInput', 'organizeInput', 'lockInput', 'unlockInput'];

    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        // The dotted zone is the direct parent div of the input
        const dropZone = input.parentElement;

        // Prevent the browser from opening the file in a new tab
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Visual effect when hovering the zone with a file
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-blue-500', 'bg-blue-50', 'scale-[1.01]');
            });
        });

        // Remove the visual effect when leaving the zone or dropping the file
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'scale-[1.01]');
            });
        });

        // Handle file drop
        dropZone.addEventListener('drop', (e) => {
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles.length === 0) return;

            // Create a DataTransfer object to filter and inject files
            const dataTransfer = new DataTransfer();
            const accept = input.getAttribute('accept') || '';

            Array.from(droppedFiles).forEach(file => {
                // Check whether the dropped item is a PDF or image based on the tool
                const isPdf = accept.includes('pdf') && file.type === 'application/pdf';
                const isImg = accept.includes('image') && (file.type === 'image/jpeg' || file.type === 'image/png');

                if (isPdf || isImg) {
                    // If the input accepts only one file (Split, Compress), keep the first one only
                    if (!input.multiple && dataTransfer.items.length > 0) return;
                    dataTransfer.items.add(file);
                }
            });

            if (dataTransfer.files.length === 0) {
                alert("Unsupported file format for this tool.");
                return;
            }

            // Assign the files to the input and trigger the 'change' event
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event('change'));
        });
    });

    // 2. Bonus: also allow drag-and-drop on the 2 cards in the vault
    ['lockInput', 'unlockInput'].forEach(inputId => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const card = input.parentElement; // The red or green card

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            card.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            card.addEventListener(eventName, () => card.classList.add('ring-2', 'ring-blue-500'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            card.addEventListener(eventName, () => card.classList.remove('ring-2', 'ring-blue-500'));
        });

        card.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change'));
            } else {
                alert("Please drop a valid PDF file.");
            }
        });
    });
}

// Start initialization
initDragAndDrop();




// --- MERGE LOGIC (Optimized version) ---
let mergeFiles = [];
const mergeInput = document.getElementById('mergeInput');
const mergeList = document.getElementById('mergeList');
const btnMergeAction = document.getElementById('btnMergeAction');

new Sortable(mergeList, {
    animation: 150,
    onEnd: (evt) => {
        const item = mergeFiles.splice(evt.oldIndex, 1)[0];
        mergeFiles.splice(evt.newIndex, 0, item);
    }
});

mergeInput.addEventListener('change', (e) => {
    mergeFiles = [...mergeFiles, ...Array.from(e.target.files)];
    renderMergeList();
    mergeInput.value = '';
});

function renderMergeList() {
    mergeList.innerHTML = mergeFiles.map((f, i) => `
        <li class="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-md shadow-sm group">
            <div class="flex items-center gap-3">
                <i data-lucide="file-text" class="text-blue-500 w-5 h-5"></i>
                <span class="font-medium text-gray-700 truncate w-64">${f.name}</span>
            </div>
            <button onclick="removeMergeFile(${i})" class="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remove">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
        </li>
    `).join('');
    
    btnMergeAction.disabled = mergeFiles.length < 2;
    btnMergeAction.classList.toggle('opacity-50', mergeFiles.length < 2);
    
    // Important: tell Lucide to turn the new <i> tags into real SVG icons
    lucide.createIcons(); 
}

window.removeMergeFile = (i) => { mergeFiles.splice(i, 1); renderMergeList(); };

btnMergeAction.addEventListener('click', async () => {
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();
    for (const f of mergeFiles) {
        const doc = await PDFDocument.load(await f.arrayBuffer());
        const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
    }
    downloadPdf(await mergedPdf.save(), "fusion.pdf");
});


// --- LOGIQUE SPLIT (TEXTE + VISUEL EN COLONNE) ---
let splitFile = null;
let splitRawData = null; 
let selectedPages = new Set(); 
let maxPages = 0; // Prevent exceeding the limit when typing on the keyboard

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

    const pdf = await pdfjsLib.getDocument(new Uint8Array(splitRawData.slice(0))).promise;
    maxPages = pdf.numPages;
    splitFileInfo.textContent = `File: ${splitFile.name} (${maxPages} pages)`;

    previewColumn.innerHTML = ''; 

    // Generate larger page previews (scale 1.0 or 0.8)
    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 }); 
        
        const pageDiv = document.createElement('div');
        // Design for a single column: more margins, stronger shadow
        pageDiv.className = "relative bg-white border-4 border-transparent shadow-lg cursor-pointer hover:shadow-xl transition-all rounded-md overflow-hidden max-w-full";
        pageDiv.id = `page-preview-${i}`; // ID unique pour retrouver la page facilement
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "block";
        
        const checkDiv = document.createElement('div');
        checkDiv.className = "check-icon hidden absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg";
        checkDiv.innerHTML = `<i data-lucide="check" class="w-6 h-6"></i>`;

        const badge = document.createElement('div');
        badge.className = "absolute bottom-0 w-full bg-black bg-opacity-70 text-white text-center text-sm py-2 font-semibold tracking-wide";
        badge.textContent = `PAGE ${i}`;

        pageDiv.appendChild(canvas);
        pageDiv.appendChild(checkDiv);
        pageDiv.appendChild(badge);
        previewColumn.appendChild(pageDiv);

        const ctx = canvas.getContext('2d');
        page.render({ canvasContext: ctx, viewport: viewport });

        // Action : Clic sur la vignette
        pageDiv.addEventListener('click', () => {
            if (selectedPages.has(i)) {
                selectedPages.delete(i);
            } else {
                selectedPages.add(i);
            }
            // When clicked, we update both the visual selection and the text field
            updateVisualHighlights();
            updateTextInputFromSelection();
        });
    }
    lucide.createIcons();
});

// Action : L'utilisateur tape dans le champ texte
pagesToExtractInput.addEventListener('input', () => {
    // 1. Convert the text to a set of pages ("1-3" becomes {1, 2, 3})
    const newSelectionArr = parsePageRange(pagesToExtractInput.value, maxPages);
    selectedPages = new Set(newSelectionArr);
    
    // 2. Update the green borders
    updateVisualHighlights();
});

// Update the visual borders by reading the Set `selectedPages`
function updateVisualHighlights() {
    for (let i = 1; i <= maxPages; i++) {
        const pageDiv = document.getElementById(`page-preview-${i}`);
        if (!pageDiv) continue;
        
        if (selectedPages.has(i)) {
            pageDiv.classList.add('page-selected');
        } else {
            pageDiv.classList.remove('page-selected');
        }
    }
    
    selectedPagesCount.textContent = selectedPages.size;
    btnSplitAction.disabled = selectedPages.size === 0;
    btnSplitAction.classList.toggle('opacity-50', selectedPages.size === 0);
    btnSplitAction.classList.toggle('cursor-not-allowed', selectedPages.size === 0);
}

// Convertit le Set {1, 2, 3, 5} en texte "1-3, 5" pour le champ input
function updateTextInputFromSelection() {
    if (selectedPages.size === 0) {
        pagesToExtractInput.value = '';
        return;
    }
    
    const pages = Array.from(selectedPages).sort((a, b) => a - b);
    let ranges = [];
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

// Final extraction action (unchanged)
btnSplitAction.addEventListener('click', async () => {
    if (selectedPages.size === 0) return;
    try {
        btnSplitAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processing...';
        btnSplitAction.disabled = true;
        lucide.createIcons();

        const { PDFDocument } = PDFLib;
        const freshData = await splitFile.arrayBuffer();
        const sourcePdf = await PDFDocument.load(freshData);
        const newPdf = await PDFDocument.create();

        const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
        const copiedPages = await newPdf.copyPages(sourcePdf, sortedPages.map(p => p - 1));
        copiedPages.forEach(p => newPdf.addPage(p));

        downloadPdf(await newPdf.save(), `extrait_${splitFile.name}`);
        setTimeout(() => { location.reload(); }, 1000);
    } catch (err) {
        console.error(err);
        alert("An error occurred during extraction.");
    }
});

// Parse utility (kept as it was before)
function parsePageRange(input, max) {
    const pages = new Set();
    input.replace(/\s+/g, '').split(',').forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) if (i > 0 && i <= max) pages.add(i);
        } else {
            const p = Number(part);
            if (p > 0 && p <= max) pages.add(p);
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
}


// --- LOGIQUE COMPRESSION ---
let compressFile = null;
const compressInput = document.getElementById('compressInput');
const compressUploadZone = document.getElementById('compressUploadZone');
const compressControls = document.getElementById('compressControls');
const compressFileInfo = document.getElementById('compressFileInfo');
const compressOriginalSize = document.getElementById('compressOriginalSize');
const compressSlider = document.getElementById('compressSlider');
const compressQualityLabel = document.getElementById('compressQualityLabel');
const btnCompressAction = document.getElementById('btnCompressAction');

// Utilitaire pour formater la taille en Mo
const formatBytes = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' Mo';

compressInput.addEventListener('change', (e) => {
    if (e.target.files.length === 0) return;
    compressFile = e.target.files[0];
    
    compressFileInfo.textContent = compressFile.name;
    compressOriginalSize.textContent = formatBytes(compressFile.size);
    
    compressUploadZone.classList.add('hidden');
    compressControls.classList.remove('hidden');
    lucide.createIcons();
});

// Update the slider label text
compressSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val <= 0.3) compressQualityLabel.textContent = "Low quality";
    else if (val <= 0.6) compressQualityLabel.textContent = "Medium quality";
    else compressQualityLabel.textContent = "High quality";
});

btnCompressAction.addEventListener('click', async () => {
    if (!compressFile) return;

    try {
        btnCompressAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Server compression in progress...';
        btnCompressAction.disabled = true;
        lucide.createIcons();

        // 1. Determine the Ghostscript setting based on the slider
        const val = parseFloat(compressSlider.value);
        let gsQuality = 'ebook'; // Default medium
        if (val <= 0.3) gsQuality = 'screen'; // Low quality / max compression
        else if (val >= 0.7) gsQuality = 'printer'; // High quality / minimal compression

        // 2. Prepare the payload to send to the server
        const formData = new FormData();
        formData.append('pdf', compressFile);
        formData.append('quality', gsQuality);

        // 3. Send the request to the Node.js server
        const response = await fetch('/api/compress', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("The server returned an error.");

        // 4. Retrieve the result as a file blob
        const compressedBlob = await response.blob();

        // 5. Download the file
        const url = URL.createObjectURL(compressedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `compresse_${compressFile.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Reset the view
        setTimeout(() => { location.reload(); }, 1500);

    } catch (err) {
        console.error(err);
        alert("An error occurred during compression.");
    } finally {
        btnCompressAction.innerHTML = '<i data-lucide="minimize"></i> Start compression';
        btnCompressAction.disabled = false;
        lucide.createIcons();
    }
});

// --- LOGIQUE IMAGES VERS PDF ---
let imgFiles = [];
const imgInput = document.getElementById('imgInput');
const imgList = document.getElementById('imgList');
const btnImgAction = document.getElementById('btnImgAction');

// Use SortableJS in grid mode
new Sortable(imgList, {
    animation: 150,
    ghostClass: 'opacity-50',
    onEnd: (evt) => {
        const item = imgFiles.splice(evt.oldIndex, 1)[0];
        imgFiles.splice(evt.newIndex, 0, item);
    }
});

imgInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files);
    imgFiles = [...imgFiles, ...newFiles];
    renderImgList();
    imgInput.value = ''; // Reset l'input
});

function renderImgList() {
    imgList.innerHTML = '';
    
    imgFiles.forEach((f, i) => {
        // Create a temporary URL to display the image
        const imgUrl = URL.createObjectURL(f);
        
        const div = document.createElement('div');
        div.className = "relative group bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden cursor-grab active:cursor-grabbing aspect-square flex items-center justify-center";
        
        div.innerHTML = `
            <img src="${imgUrl}" class="object-cover w-full h-full" alt="thumbnail">
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                <button onclick="removeImgFile(${i})" class="text-white opacity-0 group-hover:opacity-100 hover:text-red-400 bg-black bg-opacity-50 rounded-full p-2 transition-all">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white text-[10px] truncate px-1 py-0.5 text-center">
                ${f.name}
            </div>
        `;
        imgList.appendChild(div);
    });

    btnImgAction.disabled = imgFiles.length === 0;
    btnImgAction.classList.toggle('opacity-50', imgFiles.length === 0);
    btnImgAction.classList.toggle('cursor-not-allowed', imgFiles.length === 0);
    lucide.createIcons();
}

window.removeImgFile = (i) => { 
    imgFiles.splice(i, 1); 
    renderImgList(); 
};

btnImgAction.addEventListener('click', async () => {
    if (imgFiles.length === 0) return;

    try {
        btnImgAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Creating PDF...';
        btnImgAction.disabled = true;
        lucide.createIcons();

        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();

        for (const file of imgFiles) {
            const imgBytes = await file.arrayBuffer();
            let pdfImage;
            
            // pdf-lib handles JPG and PNG differently
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                pdfImage = await pdfDoc.embedJpg(imgBytes);
            } else if (file.type === 'image/png') {
                pdfImage = await pdfDoc.embedPng(imgBytes);
            } else {
                continue; // Ignore unsupported formats
            }

            // Create a page with the exact image dimensions
            const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
            
            // Dessine l'image pour qu'elle remplisse toute la page
            page.drawImage(pdfImage, {
                x: 0,
                y: 0,
                width: pdfImage.width,
                height: pdfImage.height,
            });
        }

        const pdfBytes = await pdfDoc.save();
        downloadPdf(pdfBytes, "Images_Converties.pdf");
        
        // Nettoyage et retour
        setTimeout(() => { location.reload(); }, 1500);

    } catch (err) {
        console.error(err);
        alert("Error while creating the PDF.");
    } finally {
        btnImgAction.innerHTML = '<i data-lucide="file-text"></i> Generate PDF';
        btnImgAction.disabled = false;
        lucide.createIcons();
    }
});


// --- LOGIQUE COFFRE-FORT ---
function updateVaultFileLabel(input, label) {
    if (!input || !label) return;
    label.textContent = input.files && input.files.length > 0 ? input.files[0].name : 'No file selected';
}

function initVaultFilePicker(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const trigger = document.querySelector(`[data-file-trigger="${inputId}"]`);

    if (!input || !label) return;

    const refresh = () => updateVaultFileLabel(input, label);

    input.addEventListener('change', refresh);
    trigger?.addEventListener('click', () => input.click());
    refresh();
}

const lockInput = document.getElementById('lockInput');
const lockPassword = document.getElementById('lockPassword');
const btnLockAction = document.getElementById('btnLockAction');

const unlockInput = document.getElementById('unlockInput');
const unlockPassword = document.getElementById('unlockPassword');
const btnUnlockAction = document.getElementById('btnUnlockAction');

initVaultFilePicker('lockInput', 'lockInputLabel');
initVaultFilePicker('unlockInput', 'unlockInputLabel');

// 1. ACTION : VERROUILLER (Via Ghostscript sur Serveur)
btnLockAction.addEventListener('click', async () => {
    if (lockInput.files.length === 0 || !lockPassword.value) {
        return alert("Please choose a file and enter a password.");
    }

    try {
        btnLockAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Locking...';
        btnLockAction.disabled = true;
        lucide.createIcons();

        const formData = new FormData();
        formData.append('pdf', lockInput.files[0]);
        formData.append('password', lockPassword.value);

        const response = await fetch('/api/encrypt', { method: 'POST', body: formData });
        
        if (!response.ok) throw new Error("Server error.");

        const lockedBlob = await response.blob();
        const url = URL.createObjectURL(lockedBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Locked_${lockInput.files[0].name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        lockPassword.value = ''; // Clear the password
        lockInput.value = '';
        updateVaultFileLabel(lockInput, document.getElementById('lockInputLabel'));

    } catch (err) {
        alert("Error while locking the file.");
    } finally {
        btnLockAction.innerHTML = '<i data-lucide="shield"></i> Lock and Download';
        btnLockAction.disabled = false;
        lucide.createIcons();
    }
});

btnUnlockAction.addEventListener('click', async () => {
    if (unlockInput.files.length === 0 || !unlockPassword.value) {
        return alert("Please choose a file and enter its password.");
    }

    try {
        btnUnlockAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Unlocking...';
        btnUnlockAction.disabled = true;
        lucide.createIcons();

        const formData = new FormData();
        formData.append('pdf', unlockInput.files[0]);
        formData.append('password', unlockPassword.value);

        const response = await fetch('/api/decrypt', {
            method: 'POST',
            body: formData
        });

        if (response.status === 401) {
            throw new Error("The entered password is incorrect.");
        } else if (!response.ok) {
            throw new Error("Error while unlocking on the server.");
        }

        const unlockedBlob = await response.blob();
        const url = URL.createObjectURL(unlockedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Unlocked_${unlockInput.files[0].name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        unlockPassword.value = '';
        unlockInput.value = '';
        updateVaultFileLabel(unlockInput, document.getElementById('unlockInputLabel'));
        alert("Success! The password has been removed.");

    } catch (err) {
        alert("❌ " + err.message);
    } finally {
        btnUnlockAction.innerHTML = '<i data-lucide="key"></i> Remove password';
        btnUnlockAction.disabled = false;
        lucide.createIcons();
    }
});


// --- LOGIQUE ORGANISATEUR VISUEL (ROTATION, ORDRE, SUPPRESSION) ---
let organizeFile = null;
let organizeRawData = null;

const organizeInput = document.getElementById('organizeInput');
const organizeUploadZone = document.getElementById('organizeUploadZone');
const organizeWorkspace = document.getElementById('organizeWorkspace');
const organizeGrid = document.getElementById('organizeGrid');
const organizePageCount = document.getElementById('organizePageCount');
const btnOrganizeAction = document.getElementById('btnOrganizeAction');

// Initialize drag-and-drop on the page grid
new Sortable(organizeGrid, {
    animation: 150,
    ghostClass: 'opacity-40'
});

organizeInput.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;

    organizeFile = e.target.files[0];
    organizeRawData = await organizeFile.arrayBuffer();

    organizeUploadZone.classList.add('hidden');
    organizeWorkspace.classList.remove('hidden');
    organizePageCount.classList.remove('hidden');
    organizeGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Loading pages...</p>';

    // .slice(0) protects organizeRawData for the final save with pdf-lib
    const pdf = await pdfjsLib.getDocument(new Uint8Array(organizeRawData.slice(0))).promise;
    const totalPages = pdf.numPages;

    organizeGrid.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });

        // Create the page card
        const card = document.createElement('div');
        card.className = "organize-card relative group bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing flex flex-col items-center justify-between";
        // Store the original index (0-based for pdf-lib) and the chosen rotation
        card.dataset.originalIndex = i - 1;
        card.dataset.rotation = 0;

        // Canvas wrapper to handle CSS rotation cleanly
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = "w-full aspect-[1/1.4] flex items-center justify-center overflow-hidden bg-gray-50 rounded mb-2";

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "max-w-full max-h-full object-contain transition-transform duration-200";

        canvasWrapper.appendChild(canvas);

        // Hover toolbar (Rotate Left, Rotate Right, Delete)
        const overlay = document.createElement('div');
        overlay.className = `
            absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity
            bg-white/90 p-1 rounded-md shadow border border-gray-200 z-10
        `;
        overlay.innerHTML = `
            <button type="button" class="btn-rotate-left p-1.5 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Rotate Left">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            </button>
            <button type="button" class="btn-rotate-right p-1.5 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Rotate Right">
                <i data-lucide="rotate-cw" class="w-4 h-4"></i>
            </button>
            <button type="button" class="btn-delete-page p-1.5 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded" title="Delete Page">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        // Original page number badge
        const badge = document.createElement('span');
        badge.className = "text-xs font-semibold text-gray-600";
        badge.textContent = `Page ${i}`;

        card.appendChild(overlay);
        card.appendChild(canvasWrapper);
        card.appendChild(badge);
        organizeGrid.appendChild(card);

        // Rendu visuel PDF.js
        const ctx = canvas.getContext('2d');
        page.render({ canvasContext: ctx, viewport: viewport });

        // Event: rotate left (-90°)
        overlay.querySelector('.btn-rotate-left').addEventListener('click', (evt) => {
            evt.stopPropagation();
            let currentRot = parseInt(card.dataset.rotation, 10);
            currentRot -= 90; // Simply subtract 90 without modulo!
            card.dataset.rotation = currentRot;
            canvas.style.transform = `rotate(${currentRot}deg)`;
        });

        // Event: rotate right (+90°)
        overlay.querySelector('.btn-rotate-right').addEventListener('click', (evt) => {
            evt.stopPropagation();
            let currentRot = parseInt(card.dataset.rotation, 10);
            currentRot += 90; // Simply add 90 without modulo!
            card.dataset.rotation = currentRot;
            canvas.style.transform = `rotate(${currentRot}deg)`;
        });

        // Event: delete page
        overlay.querySelector('.btn-delete-page').addEventListener('click', (evt) => {
            evt.stopPropagation();
            if (organizeGrid.querySelectorAll('.organize-card').length <= 1) {
                return alert("You cannot delete the last remaining page of the document.");
            }
            card.remove();
            updateOrganizeCount();
        });
    }

    updateOrganizeCount();
    lucide.createIcons();
});

function updateOrganizeCount() {
    const remaining = organizeGrid.querySelectorAll('.organize-card').length;
    organizePageCount.textContent = `${remaining} page(s) remaining`;
}

// Save the newly organized PDF
btnOrganizeAction.addEventListener('click', async () => {
    const cards = Array.from(organizeGrid.querySelectorAll('.organize-card'));
    if (cards.length === 0) return;

    try {
        btnOrganizeAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Saving...';
        btnOrganizeAction.disabled = true;
        lucide.createIcons();

        const { PDFDocument, degrees } = PDFLib;
        // Read a fresh copy to avoid memory detachment issues
        const sourcePdf = await PDFDocument.load(organizeRawData.slice(0));
        const newPdf = await PDFDocument.create();

        // Iterate through the cards in their NEW visual order in the DOM
        for (const card of cards) {
            const origIndex = parseInt(card.dataset.originalIndex, 10);
            const addedRotation = parseInt(card.dataset.rotation, 10);

            const [copiedPage] = await newPdf.copyPages(sourcePdf, [origIndex]);

            const normalizedRotation = ((addedRotation % 360) + 360) % 360;

            if (normalizedRotation !== 0) {
                const currentRotation = copiedPage.getRotation().angle;
                copiedPage.setRotation(degrees((currentRotation + normalizedRotation) % 360));
            }

            newPdf.addPage(copiedPage);
        }

        const pdfBytes = await newPdf.save();
        downloadPdf(pdfBytes, `organized_${organizeFile.name}`);

        setTimeout(() => { location.reload(); }, 1500);
    } catch (err) {
        console.error(err);
        alert("An error occurred while saving the organized PDF.");
    } finally {
        btnOrganizeAction.innerHTML = '<i data-lucide="save"></i> Save Organized PDF';
        btnOrganizeAction.disabled = false;
        lucide.createIcons();
    }
});