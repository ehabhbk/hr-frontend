/**
 * Jawda HR Frontend Service
 * يعمل كسيرفر ثابت للملفات المبنية مع تحديث API URL تلقائياً
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// تحميل الإعدادات من test.js
const config = require('./test.js');
const PORT = config.server.port;
const BUILD_PATH = config.build.outputPath;

// MIME types للملفات
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip'
};

// استبدال API URL في الملفات
function processContent(filePath, content, contentType) {
  if (contentType === 'text/html' || contentType === 'text/javascript') {
    // تحديث API URL في الملفات
    content = content.replace(/http:\/\/localhost:8000/g, config.api.url);
  }
  return content;
}

const server = http.createServer((req, res) => {
  // إزالة الـ query string و الـ hash
  let filePath = req.url.split('?')[0].split('#')[0];
  
  // تحويل المسار
  if (filePath === '/') {
    filePath = '/index.html';
  }

  const fullPath = path.join(BUILD_PATH, filePath);
  const ext = path.extname(fullPath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // قراءة وإرسال الملف
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // الملف غير موجود - أرسل index.html
        fs.readFile(path.join(BUILD_PATH, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end('خطأ في السيرفر');
          } else {
            content = processContent(fullPath, content, 'text/html');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
          }
        });
      } else {
        res.writeHead(500);
        res.end('خطأ في السيرفر: ' + err.code);
      }
    } else {
      content = processContent(fullPath, content, contentType);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎉 ${config.server.name.padEnd(45)}║
║   ${config.server.description.padEnd(45)}   ║
║                                                           ║
║   ✅ السيرفر يعمل على: http://localhost:${String(PORT).padEnd(27)}║
║   🌐 API URL: ${config.api.url.padEnd(39)}  ║
║   📁 ملفات البناء: ${BUILD_PATH.padEnd(35)}  ║
║                                                           ║
║   للتوقف: Ctrl + C                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// معالجة الإيقاف
process.on('SIGINT', () => {
  console.log('\n\n⛔ تم إيقاف السيرفر');
  process.exit();
});
