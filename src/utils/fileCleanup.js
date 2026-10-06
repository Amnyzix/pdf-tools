const fs = require('fs');

function cleanupFiles(filePaths) {
    filePaths.forEach((filePath) => {
        if (filePath) {
            fs.unlink(filePath, () => {});
        }
    });
}

module.exports = { cleanupFiles };