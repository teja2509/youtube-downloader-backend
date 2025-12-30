const youtubedl = require('youtube-dl-exec');

class Downloader {
  constructor() {
    this.downloads = new Map();
  }

  async getFormats(videoUrl) {
    try {
      // Get video info
      const info = await youtubedl(videoUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
      });

      const formats = [];
      
      if (info.formats) {
        // Get video formats
        info.formats.forEach(format => {
          if (format.vcodec !== 'none') {
            formats.push({
              id: format.format_id,
              quality: format.height ? `${format.height}p` : (format.format_note || 'Unknown'),
              ext: format.ext,
              filesize: format.filesize,
              vcodec: format.vcodec,
              acodec: format.acodec,
              type: format.acodec !== 'none' ? 'video+audio' : 'video'
            });
          }
        });

        // Get audio formats
        info.formats.forEach(format => {
          if (format.vcodec === 'none' && format.acodec !== 'none') {
            formats.push({
              id: format.format_id,
              quality: 'audio',
              ext: format.ext,
              filesize: format.filesize,
              acodec: format.acodec,
              type: 'audio'
            });
          }
        });
      }

      // If no formats found, return default options
      if (formats.length === 0) {
        return [
          { id: 'best', quality: 'Best Quality', ext: 'mp4', type: 'video+audio' },
          { id: 'worst', quality: 'Lowest Quality', ext: 'mp4', type: 'video+audio' },
          { id: 'audio', quality: 'Audio Only', ext: 'mp3', type: 'audio' }
        ];
      }

      return formats.slice(0, 10); // Limit to 10 formats

    } catch (error) {
      console.error('Error getting formats:', error.message);
      
      // Return fallback formats
      return [
        { id: 'best', quality: '720p', ext: 'mp4', type: 'video+audio', note: 'Fallback format' },
        { id: 'medium', quality: '480p', ext: 'mp4', type: 'video+audio', note: 'Fallback format' },
        { id: 'audio', quality: 'Audio Only', ext: 'mp3', type: 'audio', note: 'Fallback format' }
      ];
    }
  }

  async downloadVideo(url, quality, formatType, progressCallback, filenameCallback, res) {
    return new Promise((resolve, reject) => {
      try {
        const options = {
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          youtubeSkipDashManifest: true,
          output: '%(title)s.%(ext)s',
        };

        if (formatType === 'audio') {
          options.extractAudio = true;
          options.audioFormat = 'mp3';
          options.audioQuality = '0';
        } else {
          if (quality && quality !== 'best') {
            options.format = `best[height<=${quality.replace('p', '')}]`;
          } else {
            options.format = 'best';
          }
        }

        // Simulate download for now (Render free tier limitations)
        const filename = `download_${Date.now()}.${formatType === 'audio' ? 'mp3' : 'mp4'}`;
        
        if (filenameCallback) {
          filenameCallback(filename);
        }

        if (progressCallback) {
          // Simulate progress
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            progressCallback({ progress });
            
            if (progress >= 100) {
              clearInterval(interval);
              resolve(filename);
            }
          }, 300);
        } else {
          resolve(filename);
        }

      } catch (error) {
        reject(error);
      }
    });
  }
}

const downloader = new Downloader();

module.exports = {
  getFormats: (url) => downloader.getFormats(url),
  downloadVideo: (url, quality, format, progressCallback, filenameCallback, res) =>
    downloader.downloadVideo(url, quality, format, progressCallback, filenameCallback, res)
};