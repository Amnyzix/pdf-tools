import { downloadPdf } from '../core/utils.js';

export function initImg2Pdf() {
    let imgFiles = [];
    const imgInput = document.getElementById('imgInput');
    const imgList = document.getElementById('imgList');
    const btnImgAction = document.getElementById('btnImgAction');

    new Sortable(imgList, {
        animation: 150,
        ghostClass: 'opacity-50',
        onEnd: (evt) => {
            const item = imgFiles.splice(evt.oldIndex, 1)[0];
            imgFiles.splice(evt.newIndex, 0, item);
        }
    });

    imgInput.addEventListener('change', (e) => {
        imgFiles = [...imgFiles, ...Array.from(e.target.files)];
        renderImgList();
        imgInput.value = '';
    });

    function renderImgList() {
        imgList.innerHTML = '';

        imgFiles.forEach((file, index) => {
            const imgUrl = URL.createObjectURL(file);
            const div = document.createElement('div');
            div.className = 'relative group bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden cursor-grab active:cursor-grabbing aspect-square flex items-center justify-center';

            div.innerHTML = `
                <img src="${imgUrl}" class="object-cover w-full h-full" alt="thumbnail">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                    <button type="button" class="btn-remove-img text-white opacity-0 group-hover:opacity-100 hover:text-red-400 bg-black bg-opacity-50 rounded-full p-2 transition-all">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white text-[10px] truncate px-1 py-0.5 text-center">
                    ${file.name}
                </div>
            `;

            div.querySelector('.btn-remove-img').addEventListener('click', () => {
                URL.revokeObjectURL(imgUrl);
                imgFiles.splice(index, 1);
                renderImgList();
            });

            imgList.appendChild(div);
        });

        const isEmpty = imgFiles.length === 0;
        btnImgAction.disabled = isEmpty;
        btnImgAction.classList.toggle('opacity-50', isEmpty);
        btnImgAction.classList.toggle('cursor-not-allowed', isEmpty);
        lucide.createIcons();
    }

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

                if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                    pdfImage = await pdfDoc.embedJpg(imgBytes);
                } else if (file.type === 'image/png') {
                    pdfImage = await pdfDoc.embedPng(imgBytes);
                } else {
                    continue;
                }

                const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
                page.drawImage(pdfImage, {
                    x: 0,
                    y: 0,
                    width: pdfImage.width,
                    height: pdfImage.height
                });
            }

            downloadPdf(await pdfDoc.save(), 'Converted_Images.pdf');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            console.error(err);
            alert('Error while creating the PDF.');
        } finally {
            btnImgAction.innerHTML = '<i data-lucide="file-text"></i> Generate PDF';
            btnImgAction.disabled = false;
            lucide.createIcons();
        }
    });
}