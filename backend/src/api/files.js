const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// GET /api/files/list - List files in a directory
router.get('/list', async (req, res) => {
  try {
    const dirPath = req.query.path || process.cwd();
    
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ success: false, error: 'Directory not found' });
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Path is not a directory' });
    }

    const entries = fs.readdirSync(dirPath).map((name) => {
      const fullPath = path.join(dirPath, name);
      const stats = fs.statSync(fullPath);
      return {
        name,
        path: fullPath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modified: stats.mtimeMs,
      };
    });

    // Sort: directories first, then by name
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: { path: dirPath, entries } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/read - Read file content
router.post('/read', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Cannot read directory as file' });
    }

    // Only read text files under 5MB
    if (stat.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File too large (>5MB)' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({
      success: true,
      data: {
        path: filePath,
        name: path.basename(filePath),
        size: stat.size,
        modified: stat.mtimeMs,
        content,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/write - Write file
router.post('/write', async (req, res) => {
  try {
    const { filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ success: false, error: 'filePath and content are required' });
    }

    // Create parent directories
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true, data: { path: filePath }, message: 'File written' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/delete - Delete file/directory
router.post('/delete', async (req, res) => {
  try {
    const { paths } = req.body;

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ success: false, error: 'No paths provided' });
    }

    for (const p of paths) {
      if (fs.existsSync(p)) {
        fs.rmSync(p, { recursive: true, force: true });
      }
    }

    res.json({ success: true, message: `Deleted ${paths.length} items` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;