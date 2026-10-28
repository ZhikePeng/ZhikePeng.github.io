import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { today } from './blog.mjs';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: npm run new-post -- my-post-title');
  process.exit(1);
}
const directory = fileURLToPath(new URL(`../content/blog/${slug}/`, import.meta.url));
await mkdir(directory, { recursive: true });
const file = path.join(directory, 'index.md');
await writeFile(file, `---\ntitle: "${slug.replaceAll('-', ' ')}"\ndate: ${today()}\ndescription: ""\ntags: []\ndraft: true\n---\n\nWrite here.\n`, { flag: 'wx' });
console.log(`Created content/blog/${slug}/index.md as a draft.`);
