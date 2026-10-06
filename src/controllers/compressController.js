const { execFile } = require('child_process');
const { cleanupFiles } = require('../utils/fileCleanup');

const ALLOWED_QUALITIES = ['screen', 'ebook', 'printer'];

exports.compressPdf = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file received.');
    }

    const inputPath = req.file.path;
    const outputPath = `${inputPath}_compressed.pdf`;
    const gsQuality = ALLOWED_QUALITIES.includes(req.body.quality) ? req.body.quality : 'ebook';

    const gsArgs = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=/${gsQuality}`,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${outputPath}`,
        inputPath
    ];

    execFile('gs', gsArgs, (error, stdout, stderr) => {
        if (error) {
            console.error('Ghostscript error:', stderr || error.message);
            cleanupFiles([inputPath]);
            return res.status(500).send('Error during compression.');
        }

        res.download(outputPath, 'Compressed_File.pdf', () => {
            cleanupFiles([inputPath, outputPath]);
        });
    });
};