import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, symlink, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadPosts, renderMarkdown } from '../scripts/blog.mjs';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const post = (title, date, extra = '') => `---\ntitle: ${title}\ndate: ${date}\n${extra}---\n\n## A section\n\nAn equation: $x^2$.\n`;
async function temporary(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zhike-blog-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('only current published articles enter the public list; dates sort newest first', async t => {
  const dir = await temporary(t);
  await writeFile(path.join(dir, 'old.md'), post('Old', '2026-01-01'));
  await writeFile(path.join(dir, 'new.md'), post('New', '2026-10-01', 'tags: [Theory, Notes]\n'));
  await writeFile(path.join(dir, 'draft.md'), post('Draft', '2026-10-02', 'draft: true\n'));
  await writeFile(path.join(dir, 'future.md'), post('Future', '2099-01-01'));
  const publicPosts = await loadPosts(dir, { currentDate: '2026-10-28' });
  assert.deepEqual(publicPosts.map(p => p.title), ['New', 'Old']);
  const preview = await loadPosts(dir, { currentDate: '2026-10-28', includeDrafts: true });
  assert.equal(preview.filter(p => p.draft).length, 2);
});

test('invalid publication dates and duplicate URLs stop the build', async t => {
  const dir = await temporary(t);
  const file = path.join(dir, 'first.md');
  await writeFile(file, post('Bad date', '2026-02-30'));
  await assert.rejects(loadPosts(dir), /valid YYYY-MM-DD/);
  await writeFile(file, post('First', '2026-01-01', 'slug: same-url\n'));
  await writeFile(path.join(dir, 'second.md'), post('Second', '2026-01-02', 'slug: same-url\n'));
  await assert.rejects(loadPosts(dir), /duplicate post slug/);
});

test('Markdown handles math, code, tables, and stable repeated heading links', () => {
  const html = renderMarkdown('## Heading\n\n$x^2$\n\n## Heading\n\n```js\nconst price = "$20";\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  assert.match(html, /id="heading"/);
  assert.match(html, /id="heading-2"/);
  assert.match(html, /class="katex"/);
  assert.match(html, /const price = &quot;\$20&quot;/);
  assert.match(html, /<table>/);
});

test('real build emits article pages and feeds, copies assets, and removes unpublished pages', async t => {
  const dir = await temporary(t);
  await Promise.all([
    cp(path.join(root, 'scripts'), path.join(dir, 'scripts'), { recursive: true }),
    cp(path.join(root, 'static'), path.join(dir, 'static'), { recursive: true }),
    cp(path.join(root, 'data'), path.join(dir, 'data'), { recursive: true }),
    mkdir(path.join(dir, 'content/blog/article'), { recursive: true }),
    symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir'),
  ]);
  const source = path.join(dir, 'content/blog/article/index.md');
  await writeFile(source, post('A & B', '2026-01-01', 'tags: [Theory]\ndescription: A short note\n'));
  await writeFile(path.join(dir, 'content/blog/article/figure.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(path.join(dir, 'content/blog/private.md'), post('PRIVATE-DRAFT', '2026-01-02', 'draft: true\n'));
  await run(process.execPath, ['scripts/build.mjs'], { cwd: dir });
  const output = path.join(dir, 'public');
  const home = await readFile(path.join(output, 'index.html'), 'utf8');
  const article = await readFile(path.join(output, 'blog/article/index.html'), 'utf8');
  const feed = await readFile(path.join(output, 'index.xml'), 'utf8');
  const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
  assert.match(home, /A &amp; B/);
  assert.doesNotMatch(home + feed + sitemap, /PRIVATE-DRAFT|\/private\//);
  assert.match(article, /<h1>A &amp; B<\/h1>/);
  assert.match(article, /vendor\/katex\/katex.min.css/);
  assert.match(feed, /<item><title>A &amp; B<\/title>/);
  await access(path.join(output, 'blog/article/figure.svg'));
  await access(path.join(output, 'tags/theory/index.html'));
  await writeFile(source, post('A & B', '2026-01-01', 'draft: true\n'));
  await run(process.execPath, ['scripts/build.mjs'], { cwd: dir });
  await assert.rejects(access(path.join(output, 'blog/article/index.html')));
  await assert.rejects(access(path.join(output, 'tags/theory/index.html')));
  assert.doesNotMatch(await readFile(path.join(output, 'index.xml'), 'utf8'), /<item>/);
  assert.match(await readFile(path.join(output, 'index.html'), 'utf8'), /No posts yet/);
});
