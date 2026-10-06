const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { compressPdf } = require('../controllers/compressController');
const { encryptPdf, decryptPdf } = require('../controllers/vaultController');

router.post('/compress', upload.single('pdf'), compressPdf);
router.post('/encrypt', upload.single('pdf'), encryptPdf);
router.post('/decrypt', upload.single('pdf'), decryptPdf);

module.exports = router;