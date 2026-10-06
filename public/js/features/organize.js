import { downloadPdf } from '../core/utils.js';

export function initOrganize() {
    let organizeFile = null;
    let organizeRawData = null;

    const organizeInput = document.getElementById('organizeInput');
    const organizeUploadZone = document.getElementById('organizeUploadZone');
    const organizeWorkspace = document.getElementById('organizeWorkspace');
    const organizeGrid = document.getElementById('organizeGrid');
    const organizePageCount = document.getElementById('organizePageCount');
    const btnOrganizeAction = document.getElementById('btnOrganizeAction');
    const btnOrganizeCancel = document.getElementById('btnOrganizeCancel');

    new Sortable(organizeGrid, {
        animation: 150,
        ghostClass: 'opacity-40'
    });

    btnOrganizeCancel.addEventListener('click', () => location.reload());

    organizeInput.addEventListener('change', async (e) => {
        if (e.target.files.length === 0) return;

        organizeFile = e.target.files[0];
        organizeRawData = await organizeFile.arrayBuffer();

        organizeUploadZone.classList.add('hidden');
        organizeWorkspace.classList.remove('hidden');
        organizePageCount.classList.remove('hidden');
        organizeGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Loading pages...</p>';

        const pdf = await pdfjsLib.getDocument(new Uint8Array(organizeRawData.slice(0))).promise;
        const totalPages = pdf.numPages;
        organizeGrid.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.4 });

            const card = document.createElement('div');
            card.className = 'organize-card relative group bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing flex flex-col items-center justify-between';
            card.dataset.originalIndex = i - 1;
            card.dataset.rotation = 0;

            const canvasWrapper = document.createElement('div');
            canvasWrapper.className = 'w-full aspect-[1/1.4] flex items-center justify-center overflow-hidden bg-gray-50 rounded mb-2';

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.className = 'max-w-full max-h-full object-contain transition-transform duration-200';
            canvasWrapper.appendChild(canvas);

            const overlay = document.createElement('div');
            overlay.className = 'absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-md shadow border border-gray-200 z-10';
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

            const badge = document.createElement('span');
            badge.className = 'text-xs font-semibold text-gray-600';
            badge.textContent = `Page ${i}`;

            card.appendChild(overlay);
            card.appendChild(canvasWrapper);
            card.appendChild(badge);
            organizeGrid.appendChild(card);

            page.render({ canvasContext: canvas.getContext('2d'), viewport });

            // Unbounded angle values prevent CSS transition spin-back glitches
            overlay.querySelector('.btn-rotate-left').addEventListener('click', (evt) => {
                evt.stopPropagation();
                const nextRot = parseInt(card.dataset.rotation, 10) - 90;
                card.dataset.rotation = nextRot;
                canvas.style.transform = `rotate(${nextRot}deg)`;
            });

            overlay.querySelector('.btn-rotate-right').addEventListener('click', (evt) => {
                evt.stopPropagation();
                const nextRot = parseInt(card.dataset.rotation, 10) + 90;
                card.dataset.rotation = nextRot;
                canvas.style.transform = `rotate(${nextRot}deg)`;
            });

            overlay.querySelector('.btn-delete-page').addEventListener('click', (evt) => {
                evt.stopPropagation();
                if (organizeGrid.querySelectorAll('.organize-card').length <= 1) {
                    return alert('You cannot delete the last remaining page of the document.');
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

    btnOrganizeAction.addEventListener('click', async () => {
        const cards = Array.from(organizeGrid.querySelectorAll('.organize-card'));
        if (cards.length === 0) return;

        try {
            btnOrganizeAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Saving...';
            btnOrganizeAction.disabled = true;
            lucide.createIcons();

            const { PDFDocument, degrees } = PDFLib;
            const sourcePdf = await PDFDocument.load(organizeRawData.slice(0));
            const newPdf = await PDFDocument.create();

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

            downloadPdf(await newPdf.save(), `Organized_${organizeFile.name}`);
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            console.error(err);
            alert('An error occurred while saving the organized PDF.');
        } finally {
            btnOrganizeAction.innerHTML = '<i data-lucide="save"></i> Save Organized PDF';
            btnOrganizeAction.disabled = false;
            lucide.createIcons();
        }
    });
}