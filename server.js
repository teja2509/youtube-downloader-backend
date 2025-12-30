const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { downloadVideo, getFormats } = require('./downloader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Get available formats for a video
app.post('/api/formats', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const formats = await getFormats(url);
    res.json({ formats });
  } catch (error) {
    console.error('Error getting formats:', error);
    res.status(500).json({ error: 'Failed to get video formats' });
  }
});

// Download video endpoint
app.get('/api/download', async (req, res) => {
  try {
    const { url, quality, format } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Create SSE endpoint for progress updates
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      // Send initial connection message
      res.write('event: connected\ndata: Connected to download server\n\n');
      
      // Start download with progress updates
      await downloadVideo(url, quality, format, (progress) => {
        res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
      }, (filename) => {
        res.write(`event: filename\ndata: ${JSON.stringify({ filename })}\n\n`);
      });
      
      res.write('event: complete\ndata: Download completed\n\n');
      res.end();
    } else {
      // Regular download
      const filename = await downloadVideo(url, quality, format, null, null, res);
      res.end();
    }
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed' });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});