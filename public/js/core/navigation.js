export function showView(viewName) {
    document.querySelectorAll('main > section').forEach((section) => {
        section.classList.add('hidden');
    });
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');
}

export function initNavigation() {
    document.querySelectorAll('[data-view]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            showView(trigger.dataset.view);
        });
    });

    document.querySelectorAll('[data-file-trigger]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const input = document.getElementById(trigger.dataset.fileTrigger);
            if (input) input.click();
        });
    });
}