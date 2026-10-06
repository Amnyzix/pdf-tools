const { execFile } = require('child_process');
const { cleanupFiles } = require('../utils/fileCleanup');

exports.encryptPdf = (req, res) => {
    if (!req.file || !req.body.password) {
        if (req.file) cleanupFiles([req.file.path]);
        return res.status(400).send('File or password missing.');
    }

    const inputPath = req.file.path;
    const outputPath = `${inputPath}_locked.pdf`;
    const password = req.body.password;

    // AES 256-bit encryption
    const qpdfArgs = ['--encrypt', password, password, '256', '--', inputPath, outputPath];

    execFile('qpdf', qpdfArgs, (error, stdout, stderr) => {
        if (error) {
            console.error('QPDF encrypt error:', stderr || error.message);
            cleanupFiles([inputPath]);
            return res.status(500).send('Error while locking the file.');
        }

        res.download(outputPath, 'Locked_File.pdf', () => {
            cleanupFiles([inputPath, outputPath]);
        });
    });
};

exports.decryptPdf = (req, res) => {
    if (!req.file || !req.body.password) {
        if (req.file) cleanupFiles([req.file.path]);
        return res.status(400).send('File or password missing.');
    }

    const inputPath = req.file.path;
    const outputPath = `${inputPath}_unlocked.pdf`;
    const password = req.body.password;

    const qpdfArgs = [`--password=${password}`, '--decrypt', inputPath, outputPath];

    execFile('qpdf', qpdfArgs, (error, stdout, stderr) => {
        if (error) {
            console.error('QPDF decrypt error:', stderr || error.message);
            cleanupFiles([inputPath]);
            const status = stderr && stderr.includes('invalid password') ? 401 : 500;
            return res.status(status).send('Incorrect password or technical error.');
        }

        res.download(outputPath, 'Unlocked_File.pdf', () => {
            cleanupFiles([inputPath, outputPath]);
        });
    });
};