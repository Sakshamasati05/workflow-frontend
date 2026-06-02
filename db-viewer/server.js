const express = require('express');
const path    = require('path');

const app  = express();
const PORT = 5002;

// Serve the static viewer UI
app.use(express.static(path.join(__dirname, 'public')));

// Fallback — always send index.html (SPA-style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ✅  DB Viewer running at  http://localhost:${PORT}`);
  console.log(`  🔗  API backend expected  at http://localhost:5001\n`);
});
