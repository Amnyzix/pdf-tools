export function initDragAndDrop() {
    const standardInputs = ['mergeInput', 'splitInput', 'compressInput', 'imgInput', 'organizeInput'];

    standardInputs.forEach((inputId) => {
        const input = document.getElementById(inputId);
        if (!input) return;

        const dropZone = input.parentElement;
        setupDropZone(dropZone, input, ['border-blue-500', 'bg-blue-50', 'scale-[1.01]']);
    });

    const vaultZones = [
        { inputId: 'lockInput', cardId: 'lockCard' },
        { inputId: 'unlockInput', cardId: 'unlockCard' }
    ];

    vaultZones.forEach(({ inputId, cardId }) => {
        const input = document.getElementById(inputId);
        const card = document.getElementById(cardId);
        if (!input || !card) return;

        setupDropZone(card, input, ['ring-2', 'ring-blue-500']);
    });
}

function setupDropZone(zone, input, activeClasses) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
        zone.addEventListener(eventName, () => zone.classList.add(...activeClasses));
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        zone.addEventListener(eventName, () => zone.classList.remove(...activeClasses));
    });

    zone.addEventListener('drop', (e) => {
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length === 0) return;

        const dataTransfer = new DataTransfer();
        const accept = input.getAttribute('accept') || '';

        Array.from(droppedFiles).forEach((file) => {
            const isPdf = accept.includes('pdf') && file.type === 'application/pdf';
            const isImg = accept.includes('image') && (file.type === 'image/jpeg' || file.type === 'image/png');

            if (isPdf || isImg) {
                if (!input.multiple && dataTransfer.items.length > 0) return;
                dataTransfer.items.add(file);
            }
        });

        if (dataTransfer.files.length === 0) {
            alert('Unsupported file format for this tool.');
            return;
        }

        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change'));
    });
}