import { initNavigation } from './core/navigation.js';
import { initDragAndDrop } from './core/dragAndDrop.js';
import { initMerge } from './features/merge.js';
import { initSplit } from './features/split.js';
import { initCompress } from './features/compress.js';
import { initImg2Pdf } from './features/img2pdf.js';
import { initOrganize } from './features/organize.js';
import { initVault } from './features/vault.js';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDragAndDrop();
    initMerge();
    initSplit();
    initCompress();
    initImg2Pdf();
    initOrganize();
    initVault();
    lucide.createIcons();
});