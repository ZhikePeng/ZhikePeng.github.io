import './build.mjs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.pdf':'application/pdf', '.bib':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf' };
const port = Number(process.env.PORT || 4321);
createServer(async (req,res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file = path.resolve(root,'.'+urlPath);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    if ((await stat(file)).isDirectory()) {
      if (!urlPath.endsWith('/')) {res.writeHead(301,{Location:urlPath+'/'});res.end();return;}
      file = path.join(file,'index.html');
    }
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(data);
  } catch {
    res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    res.end(await readFile(path.join(root,'404.html')));
  }
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
