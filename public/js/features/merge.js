import { downloadPdf } from '../core/utils.js';

export function initMerge() {
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
        mergeList.innerHTML = '';

        mergeFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-3 bg-white border border-gray-200 rounded-md shadow-sm group cursor-grab active:cursor-grabbing';
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <i data-lucide="file-text" class="text-blue-500 w-5 h-5"></i>
                    <span class="font-medium text-gray-700 truncate w-64">${file.name}</span>
                </div>
                <button type="button" class="btn-remove text-gray-400 hover:text-red-500 transition-colors p-1" title="Remove">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            `;

            li.querySelector('.btn-remove').addEventListener('click', () => {
                mergeFiles.splice(index, 1);
                renderMergeList();
            });

            mergeList.appendChild(li);
        });

        const isDisabled = mergeFiles.length < 2;
        btnMergeAction.disabled = isDisabled;
        btnMergeAction.classList.toggle('opacity-50', isDisabled);
        lucide.createIcons();
    }

    btnMergeAction.addEventListener('click', async () => {
        if (mergeFiles.length < 2) return;

        try {
            btnMergeAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Merging...';
            btnMergeAction.disabled = true;
            lucide.createIcons();

            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const file of mergeFiles) {
                const doc = await PDFDocument.load(await file.arrayBuffer());
                const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
                pages.forEach((p) => mergedPdf.addPage(p));
            }

            downloadPdf(await mergedPdf.save(), 'Merged_Document.pdf');
        } catch (err) {
            console.error(err);
            alert('An error occurred while merging the PDFs.');
        } finally {
            btnMergeAction.innerHTML = '<i data-lucide="download"></i> Merge and Download';
            btnMergeAction.disabled = mergeFiles.length < 2;
            lucide.createIcons();
        }
    });
}