import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import { parse } from 'yaml';

export const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export const slugify = value => String(value).normalize('NFKC').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

export const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export function renderMarkdown(source) {
  const headings = new Map();
  const markdown = new Marked({ gfm: true });
  markdown.use(markedKatex({ throwOnError: true, trust: false }));
  markdown.use({ renderer: {
    heading({ tokens, depth }) {
      const content = this.parser.parseInline(tokens);
      const base = slugify(content.replace(/<[^>]*>/g, '')) || 'section';
      const count = headings.get(base) || 0;
      headings.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      const level = Math.max(2, depth);
      return `<h${level} id="${escapeHTML(id)}">${content}</h${level}>\n`;
    },
  } });
  return markdown.parse(source);
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.filter(e => !e.name.startsWith('.')).map(async entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md' ? [fullPath] : [];
  }));
  return files.flat();
}

export async function loadPosts(directory, { includeDrafts = false, currentDate = today() } = {}) {
  const posts = [];
  const slugs = new Set();
  for (const file of await markdownFiles(directory)) {
    const source = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!frontmatter) throw new Error(`${file}: YAML frontmatter is required.`);
    const meta = parse(frontmatter[1]);
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error(`${file}: invalid frontmatter.`);
    if (meta.draft !== undefined && typeof meta.draft !== 'boolean') throw new Error(`${file}: draft must be true or false.`);
    if (meta.draft && !includeDrafts) continue;
    const date = String(meta.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
      throw new Error(`${file}: date must be a valid YYYY-MM-DD date.`);
    }
    if (date > currentDate && !includeDrafts) continue;
    if (typeof meta.title !== 'string' || !meta.title.trim()) throw new Error(`${file}: title is required.`);
    const fallbackSlug = path.basename(file) === 'index.md' ? path.basename(path.dirname(file)) : path.basename(file, '.md');
    const slug = meta.slug ?? fallbackSlug;
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`${file}: use a lowercase, hyphen-separated slug.`);
    }
    if (slugs.has(slug)) throw new Error(`${file}: duplicate post slug ${slug}.`);
    slugs.add(slug);
    if (meta.tags !== undefined && (!Array.isArray(meta.tags) || meta.tags.some(t => typeof t !== 'string' || !slugify(t)))) {
      throw new Error(`${file}: tags must be a list of non-empty strings.`);
    }
    const body = source.slice(frontmatter[0].length);
    if (!body.trim()) throw new Error(`${file}: the post body is empty.`);
    const description = meta.description ?? meta.summary ?? '';
    if (typeof description !== 'string') throw new Error(`${file}: description must be text.`);
    const words = body.replace(/```[\s\S]*?```/g, '').match(/[\p{L}\p{N}]+/gu)?.length || 0;
    posts.push({
      title: meta.title.trim(), date, slug, description,
      tags: [...new Set(meta.tags || [])], draft: Boolean(meta.draft || date > currentDate),
      html: renderMarkdown(body), minutes: Math.max(1, Math.ceil(words / 220)),
      route: `/blog/${slug}/`, file,
      assetsDirectory: path.basename(file) === 'index.md' ? path.dirname(file) : null,
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
