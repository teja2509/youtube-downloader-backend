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
  res.status(200).json({ 
    status: 'OK', 
    message: 'YouTube Downloader Backend is running',
    timestamp: new Date().toISOString()
  });
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
    console.error('Error getting formats:', error.message);
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

    // Send progress via SSE if requested
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      res.write('event: connected\ndata: Connected to download server\n\n');
      
      // Simulate progress for now
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        res.write(`event: progress\ndata: ${JSON.stringify({ progress })}\n\n`);
        
        if (progress >= 100) {
          clearInterval(interval);
          res.write(`event: filename\ndata: ${JSON.stringify({ filename: 'video.mp4' })}\n\n`);
          res.write('event: complete\ndata: Download completed\n\n');
          res.end();
        }
      }, 500);
      
      return;
    }
    
    // Regular download - redirect to direct YouTube download for now
    res.json({
      message: 'Download endpoint',
      note: 'In production, this would stream the video',
      directUrl: url,
      quality,
      format
    });
    
  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Static info endpoint
app.get('/info', (req, res) => {
  res.json({
    name: 'YouTube Downloader Backend',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'POST /api/formats',
      'GET /api/download?url=YOUTUBE_URL&quality=QUALITY&format=FORMAT'
    ],
    status: 'operational'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to YouTube Downloader API',
    documentation: 'Use /info for endpoint details',
    health: '/health',
    note: 'Frontend should be hosted separately on GitHub Pages'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Info: http://localhost:${PORT}/info`);
});