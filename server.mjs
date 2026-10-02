// Minimal static server for the reel player / video export page (reel.html). The site itself runs on Vite.
// Module scripts and @font-face don't load from file:// URLs.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };

export function serve(port) {
  const server = http.createServer(async (req, res) => {
    let rel;
    try {
      rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
    } catch {
      return res.writeHead(400).end(); // malformed percent-encoding
    }
    const file = join(ROOT, rel || 'reel.html');
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await serve(5178);
  console.log('Reel player: http://127.0.0.1:5178');
}
