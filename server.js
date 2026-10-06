const express = require('express');
const path = require('path');
const pdfRoutes = require('./src/routes/pdfRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', pdfRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});