import { downloadBlob } from '../core/utils.js';

export function initVault() {
    const lockInput = document.getElementById('lockInput');
    const lockInputLabel = document.getElementById('lockInputLabel');
    const lockPassword = document.getElementById('lockPassword');
    const btnLockAction = document.getElementById('btnLockAction');

    const unlockInput = document.getElementById('unlockInput');
    const unlockInputLabel = document.getElementById('unlockInputLabel');
    const unlockPassword = document.getElementById('unlockPassword');
    const btnUnlockAction = document.getElementById('btnUnlockAction');

    const updateLabel = (input, label) => {
        label.textContent = input.files && input.files.length > 0 ? input.files[0].name : 'No file selected';
    };

    lockInput.addEventListener('change', () => updateLabel(lockInput, lockInputLabel));
    unlockInput.addEventListener('change', () => updateLabel(unlockInput, unlockInputLabel));

    btnLockAction.addEventListener('click', async () => {
        if (lockInput.files.length === 0 || !lockPassword.value) {
            return alert('Please choose a file and enter a password.');
        }

        try {
            btnLockAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Locking...';
            btnLockAction.disabled = true;
            lucide.createIcons();

            const file = lockInput.files[0];
            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('password', lockPassword.value);

            const response = await fetch('/api/encrypt', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Server error.');

            const lockedBlob = await response.blob();
            downloadBlob(lockedBlob, `Locked_${file.name}`);

            lockPassword.value = '';
            lockInput.value = '';
            updateLabel(lockInput, lockInputLabel);
        } catch (err) {
            alert('Error while locking the file.');
        } finally {
            btnLockAction.innerHTML = '<i data-lucide="shield"></i> Lock and Download';
            btnLockAction.disabled = false;
            lucide.createIcons();
        }
    });

    btnUnlockAction.addEventListener('click', async () => {
        if (unlockInput.files.length === 0 || !unlockPassword.value) {
            return alert('Please choose a file and enter its password.');
        }

        try {
            btnUnlockAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Unlocking...';
            btnUnlockAction.disabled = true;
            lucide.createIcons();

            const file = unlockInput.files[0];
            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('password', unlockPassword.value);

            const response = await fetch('/api/decrypt', { method: 'POST', body: formData });
            if (response.status === 401) {
                throw new Error('The entered password is incorrect.');
            } else if (!response.ok) {
                throw new Error('Error while unlocking on the server.');
            }

            const unlockedBlob = await response.blob();
            downloadBlob(unlockedBlob, `Unlocked_${file.name}`);

            unlockPassword.value = '';
            unlockInput.value = '';
            updateLabel(unlockInput, unlockInputLabel);
        } catch (err) {
            alert(err.message);
        } finally {
            btnUnlockAction.innerHTML = '<i data-lucide="key"></i> Remove password';
            btnUnlockAction.disabled = false;
            lucide.createIcons();
        }
    });
}