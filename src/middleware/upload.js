const multer = require('multer');
const os = require('os');

const upload = multer({ dest: os.tmpdir() });

module.exports = upload;