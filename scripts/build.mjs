import { readFile, writeFile, mkdir, cp, mkdtemp, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { escapeHTML as esc, loadPosts, slugify } from './blog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const profile = JSON.parse(await readFile(path.join(root, 'data/profile.json'), 'utf8'));
const [siteStyles, siteScript] = await Promise.all([
  readFile(path.join(root, 'assets/css/site.css'), 'utf8'),
  readFile(path.join(root, 'static/js/site.js'), 'utf8'),
]);
const styleVersion = createHash('sha256').update(siteStyles).digest('hex').slice(0, 12);
const posts = await loadPosts(path.join(root, 'content/blog'), { includeDrafts: process.argv.includes('--drafts') });
const publishedPosts = posts.filter(post => !post.draft);
const destination = path.join(root, 'public');
// Build in isolation so removed or unpublished posts never survive in the output.
const output = await mkdtemp(path.join(root, '.site-build-'));
const siteURL = profile.website;
const plainDescription = 'Zhike Peng’s personal blog. Ph.D. student in computer science at Tsinghua University.';
const date = value => esc(value).replaceAll(' - ', '–');
const postDate = value => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
const author = value => value === profile.name ? `<strong>${esc(value)}</strong>` : esc(value);
const jsonLD = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const link = (url, label) => `<a href="${esc(url)}">${esc(label)}</a>`;

function head(title, route, { description = plainDescription, article = null, math = false } = {}) {
  const structured = article ? {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title,
    datePublished: article.date, url: siteURL + route,
    author: { '@type': 'Person', name: profile.name, url: `${siteURL}/about/` },
    description: article.description,
  } : {
    '@context': 'https://schema.org', '@type': route === '/blog/' ? 'Blog' : 'WebPage',
    name: title, url: siteURL + route, author: { '@type': 'Person', name: profile.name },
  };
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark"><meta name="theme-color" content="#f8f9f5">
<link rel="canonical" href="${siteURL}${route}"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/newsreader-5.3.0-latin-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/source-sans-3-5.3.1-latin-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="alternate" type="application/rss+xml" title="Zhike Peng" href="/index.xml">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${siteURL}${route}"><meta property="og:type" content="${article ? 'article' : 'website'}">
<meta property="og:image" content="${siteURL}/images/social-card.png">
${article ? `<meta property="article:published_time" content="${article.date}T00:00:00+08:00">` : ''}
<style id="site-styles" data-version="${styleVersion}">${siteStyles}</style>${math ? '<link rel="stylesheet" href="/vendor/katex/katex.min.css">' : ''}
<script>try{const t=localStorage.getItem('zp-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch{}</script>
<script type="application/ld+json">${jsonLD(structured)}</script>
</head><body><a class="skip-link" href="#main">Skip to content</a>`;
}

function header(current = '') {
  return `<header class="site-header"><a class="site-name" href="/">Zhike Peng</a>
<nav aria-label="Main navigation">${[['home', '/', 'Home'], ['blog', '/blog/', 'Blog'], ['research', '/research/', 'Research'], ['cv', '/cv/', 'CV']].map(([key, url, label]) => `<a href="${url}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></header>`;
}

const contactLinks = [
  { name: 'Email', url: `mailto:${profile.email}` },
  { name: 'GitHub', url: profile.github },
  ...(profile.socials || []),
];
const contactIcons = {
  Email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  GitHub: '<path fill="currentColor" stroke="none" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.07c-3.09.67-3.74-1.31-3.74-1.31-.5-1.29-1.24-1.63-1.24-1.63-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.92.1-.72.39-1.21.71-1.49-2.46-.28-5.05-1.23-5.05-5.49 0-1.21.43-2.2 1.14-2.98-.11-.28-.49-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.12-1.44 3.05-1.14 3.05-1.14.6 1.53.22 2.66.11 2.94.71.78 1.14 1.77 1.14 2.98 0 4.27-2.6 5.21-5.08 5.49.4.35.75 1.02.75 2.06v3.06c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/>',
  X: '<path d="m5 4 14 16M19 4 5 20M3 4h4l14 16h-4Z"/>',
  Instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
};
const socialIcons = () => contactLinks.map(item => `<a href="${esc(item.url)}" aria-label="${esc(item.name)}" title="${esc(item.name)}"><svg viewBox="0 0 24 24" aria-hidden="true">${contactIcons[item.name] || contactIcons.Email}</svg></a>`).join('');

function footer() {
  return `<footer class="site-footer"><span>© ${new Date().getUTCFullYear()} Zhike Peng</span><div>
${contactLinks.map(item => link(item.url, item.name)).join('')}<a href="/index.xml">RSS</a>
<button class="theme-toggle" aria-label="Switch to dark theme" hidden>Dark</button></div></footer>
<script id="site-script">${siteScript}</script></body></html>`;
}

function page(title, route, current, body, options = {}) {
  return `${head(title, route, options)}${header(current)}<main id="main" class="site-main ${options.className || ''}">${body}</main>${footer()}`;
}

function postList(items) {
  if (!items.length) return '<p class="empty-writing">No posts yet.</p>';
  return `<ol class="post-list">${items.map(post => `<li><time datetime="${post.date}">${postDate(post.date)}</time><div>
<h3><a href="${post.route}">${esc(post.title)}</a>${post.draft ? '<span class="draft-label">Draft</span>' : ''}</h3>
${post.description ? `<p>${esc(post.description)}</p>` : ''}</div></li>`).join('')}</ol>`;
}

function cvEntry(entry) {
  return `<article class="cv-entry"><div class="entry-heading"><h3>${esc(entry.title)}</h3><span>${date(entry.dates)}</span></div>
<p class="entry-meta">${esc(entry.organization)}${entry.role ? ` · ${esc(entry.role)}` : ''}</p><p>${esc(entry.description)}</p></article>`;
}

const home = page('Zhike Peng', '/', 'home', `
<div class="home-layout"><aside class="profile" aria-label="Profile">
<img class="profile-avatar" src="/images/personal-mark.jpg" alt="Zhike Peng's avatar" width="640" height="640" fetchpriority="high">
<h1>Zhike Peng</h1><p class="profile-role">Ph.D. student</p><p class="profile-affiliation"><a href="https://www.tsinghua.edu.cn/">Tsinghua University</a></p>
<p class="profile-location">Beijing, China</p><div class="social-links" aria-label="Contact and social profiles">${socialIcons()}</div>
<a class="profile-cv" href="/uploads/resume.pdf">Curriculum vitae <span>(PDF)</span></a></aside>
<div class="home-content"><section class="biography" id="about" aria-labelledby="about-title"><h2 id="about-title">About me</h2>
<p>${esc(profile.bio)}</p><p>${esc(profile.interests)}</p>
<p>I also serve as a student counselor at Wuqiong College, Tsinghua University.</p>
<p class="biography-contact" id="contact"><a href="mailto:${profile.email}">${profile.email}</a></p></section>
<section class="home-publications" id="publications" aria-labelledby="home-publications-title"><div class="section-title"><h2 id="home-publications-title">Selected publications</h2><a href="/research/">All publications</a></div>
<ol>${profile.publications.map(pub => `<li><span class="home-pub-year">${pub.year}</span><div><h3>${link(pub.links[0].url, pub.title)}</h3><p>${esc(pub.venue)} · ${esc(pub.status)}</p></div></li>`).join('')}</ol></section>
${posts.length ? `<section class="home-blog" aria-labelledby="home-blog-title"><div class="section-title"><h2 id="home-blog-title">From the blog</h2><a href="/blog/">All posts</a></div>${postList(posts.slice(0, 3))}</section>` : ''}</div></div>`, { className: 'home-page' });

const archive = page('Blog — Zhike Peng', '/blog/', 'blog', `<header class="page-heading"><h1>Blog</h1></header>${posts.length ? [...new Set(posts.map(post => post.date.slice(0, 4)))].map(year => `<section class="archive-year"><h2>${year}</h2>${postList(posts.filter(post => post.date.startsWith(year)))}</section>`).join('') : postList([])}`);

const research = page('Research — Zhike Peng', '/research/', 'research', `
<header class="page-heading"><h1>Research</h1><p>Mechanism design, game theory, and artificial intelligence.</p></header>
<section aria-labelledby="publications-title"><h2 id="publications-title">Publications</h2><ol class="publication-list">${profile.publications.map(pub => `<li id="${pub.id}">
<h3>${link(pub.links[0].url, pub.title)}</h3><p class="authors">${pub.authors.map(author).join(', ')}</p>
<p class="publication-venue">${esc(pub.venue)} · ${esc(pub.status)}</p>
<div class="publication-links">${pub.links.map(item => link(item.url, item.label)).join('')}<a href="/citations/${pub.id}.bib" download>BibTeX</a></div>
<details class="citation"><summary>Citation</summary><pre><code>${esc(pub.bibtex)}</code></pre><button class="copy-citation" hidden>Copy BibTeX</button></details></li>`).join('')}</ol></section>
<p class="closing-link"><a href="/cv/">Full curriculum vitae</a></p>`);

const about = page('About — Zhike Peng', '/about/', 'home', `
<header class="page-heading"><h1>About</h1></header><div class="prose"><p>${esc(profile.bio)}</p><p>${esc(profile.interests)}</p>
<p>I also support student affairs at Wuqiong College, Tsinghua University.</p></div>
<div class="about-links" id="contact"><a href="/cv/">Curriculum vitae</a><a href="/uploads/resume.pdf">PDF</a><a href="mailto:${profile.email}">Email</a></div>
<section class="about-section"><h2>Education</h2>${profile.education.map(entry => `<article class="about-entry"><div class="entry-heading"><h3>${esc(entry.institution)}</h3><span>${date(entry.dates)}</span></div><p>${esc(entry.degree)} · ${esc(entry.unit)}</p></article>`).join('')}</section>
<section class="about-section"><h2>Industry</h2>${profile.industry.map(entry => `<article class="about-entry"><div class="entry-heading"><h3>${esc(entry.organization)}</h3><span>${date(entry.dates)}</span></div><p>${esc(entry.title)}</p></article>`).join('')}</section>`);

const cv = page('Curriculum vitae — Zhike Peng', '/cv/', 'cv', `
<header class="page-heading cv-heading"><h1>Curriculum vitae</h1><a href="/uploads/resume.pdf">Download PDF ↓</a></header>
<div class="cv-identity"><h2>Zhike Peng</h2><p>${esc(profile.role)} · Tsinghua University</p><p><a href="mailto:${profile.email}">${profile.email}</a></p></div>
<p class="cv-interests">${esc(profile.interests)}</p>
<section class="cv-section"><h2>Education</h2>${profile.education.map(entry => `<article class="cv-entry"><div class="entry-heading"><h3>${esc(entry.institution)} · ${esc(entry.unit)}</h3><span>${date(entry.dates)}</span></div><p>${esc(entry.degree)}</p><p>${esc(entry.detail)}</p></article>`).join('')}</section>
<section class="cv-section"><h2>Publications</h2>${profile.publications.map(pub => `<article class="cv-entry"><h3>${link(pub.links[0].url, pub.title)}</h3><p>${pub.authors.map(author).join(', ')}</p><p>${esc(pub.venue)} · ${esc(pub.status)}</p></article>`).join('')}</section>
<section class="cv-section"><h2>Research experience</h2>${profile.research.map(cvEntry).join('')}</section>
<section class="cv-section"><h2>Industry experience</h2>${profile.industry.map(cvEntry).join('')}</section>
<section class="cv-section" id="honors"><h2>Honors & awards</h2><dl class="honors-list">${profile.honors.map(item => `<div><dt>${item.year}</dt><dd><strong>${esc(item.title)}</strong> · ${esc(item.detail)}</dd></div>`).join('')}</dl><p class="cv-scholarships">Tsinghua University: Comprehensive Excellence Scholarship (2024, 2025); Social Work Scholarship (2023).</p></section>
<section class="cv-section" id="service"><h2>Leadership & service</h2>${profile.service.map(cvEntry).join('')}</section>
<section class="cv-section"><h2>Community engagement</h2>${profile.outreach.map(entry => `<article class="cv-entry"><div class="entry-heading"><h3>${esc(entry.location)}</h3><span>${esc(entry.date)}</span></div><p>${esc(entry.text)}</p></article>`).join('')}</section>`, { className: 'cv-page' });

async function write(route, content) {
  const file = path.join(output, route);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

try {
  await cp(path.join(root, 'static'), output, { recursive: true });
  await Promise.all([
    write('index.html', home), write('blog/index.html', archive), write('research/index.html', research),
    write('about/index.html', about), write('cv/index.html', cv),
    write('404.html', page('Page not found — Zhike Peng', '/404.html', '', '<header class="page-heading"><h1>Page not found</h1></header><p>This page may have moved. <a href="/">Return to the homepage</a>.</p>')),
  ]);
  for (const pub of profile.publications) await write(`citations/${pub.id}.bib`, pub.bibtex + '\n');
  const tagNames = new Map();
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = slugify(tag);
      if (tagNames.has(key) && tagNames.get(key) !== tag) throw new Error(`Tags ${tagNames.get(key)} and ${tag} produce the same URL.`);
      tagNames.set(key, tag);
    }
    const html = page(`${post.title} — Zhike Peng`, post.route, 'blog', `
<a class="back-link" href="/blog/">← Blog</a><article class="post"><header class="post-heading">
<p class="post-date"><time datetime="${post.date}">${postDate(post.date)}</time><span>${post.minutes} min read</span>${post.draft ? '<span>Draft preview</span>' : ''}</p>
<h1>${esc(post.title)}</h1>${post.tags.length ? `<p class="post-tags">${post.tags.map(tag => `<a href="/tags/${slugify(tag)}/">${esc(tag)}</a>`).join('')}</p>` : ''}</header>
<div class="prose">${post.html}</div><footer class="post-footer"><a href="/blog/">All posts</a><a href="mailto:${profile.email}?subject=${encodeURIComponent(post.title)}">Respond by email</a></footer></article>`,
      { description: post.description || plainDescription, article: post, math: post.html.includes('class="katex'), className: 'article-page' });
    const postOutput = path.join(output, post.route.slice(1));
    if (post.assetsDirectory) await cp(post.assetsDirectory, postOutput, {
      recursive: true,
      filter: file => !path.basename(file).startsWith('.') && !file.endsWith('.md'),
    });
    await write(`${post.route.slice(1)}index.html`, html);
  }
  for (const [slug, tag] of tagNames) await write(`tags/${slug}/index.html`, page(`${tag} — Zhike Peng`, `/tags/${slug}/`, 'blog', `<header class="page-heading"><p class="page-label">Topic</p><h1>${esc(tag)}</h1></header>${postList(posts.filter(post => post.tags.includes(tag)))}`));
  if (posts.some(post => post.html.includes('class="katex'))) {
    await mkdir(path.join(output, 'vendor/katex'), { recursive: true });
    await cp(path.join(root, 'node_modules/katex/dist/katex.min.css'), path.join(output, 'vendor/katex/katex.min.css'));
    await cp(path.join(root, 'node_modules/katex/dist/fonts'), path.join(output, 'vendor/katex/fonts'), { recursive: true });
    await cp(path.join(root, 'node_modules/katex/LICENSE'), path.join(output, 'vendor/katex/LICENSE'));
  }
  // Preserve useful old entry points; /blog/ is now a real article archive.
  for (const [route, target] of [['uses', '/about/'], ['authors/admin', '/about/']]) {
    await write(`${route}/index.html`, `${head('Page moved — Zhike Peng', target)}<meta http-equiv="refresh" content="0;url=${target}"><main id="main"><p><a href="${target}">Continue to About</a>.</p></main></body></html>`);
  }
  const rssItems = publishedPosts.map(post => `<item><title>${esc(post.title)}</title><link>${siteURL}${post.route}</link><guid isPermaLink="true">${siteURL}${post.route}</guid><pubDate>${new Date(`${post.date}T00:00:00+08:00`).toUTCString()}</pubDate><description>${esc(post.description)}</description>${post.tags.map(tag => `<category>${esc(tag)}</category>`).join('')}</item>`).join('');
  const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Zhike Peng</title><link>${siteURL}/</link><description>${esc(plainDescription)}</description><language>en</language><atom:link href="${siteURL}/index.xml" rel="self" type="application/rss+xml"/>${rssItems}</channel></rss>`;
  await write('index.xml', rss);
  await write('blog/index.xml', rss);
  await write('post/index.xml', rss);
  const routes = ['/', '/blog/', '/about/', '/research/', '/cv/', ...publishedPosts.map(post => post.route), ...[...tagNames.keys()].filter(slug => publishedPosts.some(post => post.tags.some(tag => slugify(tag) === slug))).map(slug => `/tags/${slug}/`)];
  await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${esc(siteURL + route)}</loc></url>`).join('')}</urlset>`);
  await write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${siteURL}/sitemap.xml\n`);
  await write('.nojekyll', '');
  // Only replace the generated directory after the complete build succeeds.
  await rm(destination, { recursive: true, force: true });
  await rename(output, destination);
  console.log(`Built personal blog, ${publishedPosts.length} published posts, research, and CV${posts.some(post => post.draft) ? ' (including draft previews)' : ''}.`);
} catch (error) {
  await rm(output, { recursive: true, force: true });
  throw error;
}
