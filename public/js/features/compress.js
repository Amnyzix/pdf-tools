import { downloadBlob, formatBytes } from '../core/utils.js';

export function initCompress() {
    let compressFile = null;
    const compressInput = document.getElementById('compressInput');
    const compressUploadZone = document.getElementById('compressUploadZone');
    const compressControls = document.getElementById('compressControls');
    const compressFileInfo = document.getElementById('compressFileInfo');
    const compressOriginalSize = document.getElementById('compressOriginalSize');
    const compressSlider = document.getElementById('compressSlider');
    const compressQualityLabel = document.getElementById('compressQualityLabel');
    const btnCompressAction = document.getElementById('btnCompressAction');

    compressInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        compressFile = e.target.files[0];

        compressFileInfo.textContent = compressFile.name;
        compressOriginalSize.textContent = formatBytes(compressFile.size);

        compressUploadZone.classList.add('hidden');
        compressControls.classList.remove('hidden');
        lucide.createIcons();
    });

    compressSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (val <= 0.3) compressQualityLabel.textContent = 'Low quality';
        else if (val <= 0.6) compressQualityLabel.textContent = 'Medium quality';
        else compressQualityLabel.textContent = 'High quality';
    });

    btnCompressAction.addEventListener('click', async () => {
        if (!compressFile) return;

        try {
            btnCompressAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Compressing...';
            btnCompressAction.disabled = true;
            lucide.createIcons();

            const val = parseFloat(compressSlider.value);
            let gsQuality = 'ebook';
            if (val <= 0.3) gsQuality = 'screen';
            else if (val >= 0.7) gsQuality = 'printer';

            const formData = new FormData();
            formData.append('pdf', compressFile);
            formData.append('quality', gsQuality);

            const response = await fetch('/api/compress', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Server compression failed.');

            const compressedBlob = await response.blob();
            downloadBlob(compressedBlob, `Compressed_${compressFile.name}`);

            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            console.error(err);
            alert('An error occurred during compression.');
        } finally {
            btnCompressAction.innerHTML = '<i data-lucide="minimize"></i> Start compression';
            btnCompressAction.disabled = false;
            lucide.createIcons();
        }
    });
}